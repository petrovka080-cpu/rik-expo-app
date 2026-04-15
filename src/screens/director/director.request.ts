import type React from "react";
import { useCallback, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { generateRequestPdfDocument } from "../../lib/catalog_api";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { getPdfFlowErrorMessage } from "../../lib/documents/pdfDocumentActions";
import { exportAoaWorkbookWeb } from "../../lib/exports/xlsxExport";
import { createModalAwarePdfOpener } from "../../lib/pdf/pdf.runner";
import { toFilterId } from "./director.helpers";
import type { Group, PendingRow } from "./director.types";

type BusyLike = {
  isBusy: (key: string) => boolean;
  run?: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T | null>;
  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
};

type Deps = {
  busy: BusyLike;
  supabase: any;
  screenLock: boolean;
  reqDeleteId: number | string | null;
  reqSendId: number | string | null;
  labelForRequest: (rid: number | string | null | undefined, fallbackDocNo?: string | null) => string;
  setRows: React.Dispatch<React.SetStateAction<PendingRow[]>>;
  setActingId: React.Dispatch<React.SetStateAction<string | null>>;
  setReqDeleteId: React.Dispatch<React.SetStateAction<number | string | null>>;
  setReqSendId: React.Dispatch<React.SetStateAction<number | string | null>>;
  fetchRows: (force?: boolean) => Promise<void>;
  fetchProps: (force?: boolean) => Promise<void>;
  closeSheet: () => void;
  showSuccess: (msg: string) => void;
};

export function useDirectorRequestActions({
  busy,
  supabase,
  screenLock,
  reqDeleteId,
  reqSendId,
  labelForRequest,
  setRows,
  setActingId,
  setReqDeleteId,
  setReqSendId,
  fetchRows,
  fetchProps,
  closeSheet,
  showSuccess,
}: Deps) {
  const router = useRouter();
  // D-MODAL-PDF: Stabilize the opener — avoid recreating on every render.
  const pdfOpener = useMemo(() => createModalAwarePdfOpener(closeSheet), [closeSheet]);
  const exportRequestExcel = useCallback(async (g: Group) => {
    const rows = g.items;
    if (!rows.length) {
      Alert.alert("Экспорт", "Нет позиций для выгрузки.");
      return;
    }

    const safe = (v: any) =>
      v === null || v === undefined ? "" : String(v).replace(/[\r\n]+/g, " ").trim();

    const title = labelForRequest(g.request_id);
    const sheetName =
      title.replace(/[^\w\u0400-\u04FF0-9]/g, "_").slice(0, 31) || "Заявка";

    const data: Array<Array<string | number>> = [];
    data.push(["№", "Наименование", "Кол-во", "Ед. изм.", "Применение", "Примечание"]);

    rows.forEach((it, idx) => {
      data.push([
        idx + 1,
        safe(it.name_human),
        safe(it.qty),
        safe(it.uom),
        safe(it.app_code),
        safe(it.note),
      ]);
    });

    try {
      if (Platform.OS === "web") {
        await exportAoaWorkbookWeb({
          data,
          sheetName,
          downloadName: `request-${title}.xlsx`,
          columns: [
            { wch: 4 },
            { wch: 40 },
            { wch: 10 },
            { wch: 10 },
            { wch: 18 },
            { wch: 60 },
          ],
        });
      } else {
        Alert.alert(
          "Экспорт",
          "XLSX экспорт сейчас доступен только в web-версии.",
        );
      }
    } catch (e: unknown) {
      if (__DEV__) console.error("[exportRequestExcel]", (e as Error)?.message ?? e);
      Alert.alert("Не удалось сформировать Excel-файл", (e as Error)?.message ?? "Попробуйте еще раз.");
    }
  }, [labelForRequest]);

  const openRequestPdf = useCallback(async (g: Group) => {
    const rid = String(g?.request_id ?? "").trim();
    if (!rid) return;
    try {
      const title = labelForRequest(g.request_id) || `Request ${rid}`;
      const template = await generateRequestPdfDocument(rid);
      await pdfOpener.prepareAndPreview({
        busy,
        supabase,
        key: `pdf:req:${rid}`,
        label: "Открываю PDF…",
        descriptor: {
          ...template,
          title,
          fileName: buildPdfFileName({
            documentType: "request",
            title,
            entityId: rid,
          }),
        },
        router,
      });
    } catch (error) {
      Alert.alert("Не удалось открыть PDF", getPdfFlowErrorMessage(error, "Попробуйте еще раз."));
    }
  }, [busy, supabase, labelForRequest, router, pdfOpener]);

  const isRequestPdfBusy = useCallback((g: Group) => {
    const rid = String(g?.request_id ?? "").trim();
    return rid ? busy.isBusy(`pdf:req:${rid}`) : false;
  }, [busy]);

  const rejectRequestItem = useCallback(async (it: PendingRow) => {
    if (!it.request_item_id) return;
    setActingId(it.request_item_id);
    try {
      const { error } = await supabase.rpc("reject_request_item", {
        request_item_id: it.request_item_id,
        reason: null,
      });
      if (error) throw error;

      setRows((prev) => prev.filter((r) => r.request_item_id !== it.request_item_id));
    } catch (e: unknown) {
      Alert.alert("Не удалось отклонить позицию", (e as Error)?.message ?? "Попробуйте еще раз.");
    } finally {
      setActingId(null);
    }
  }, [setActingId, setRows, supabase]);

  const deleteRequestAll = useCallback(async (g: Group) => {
    setReqDeleteId(g.request_id);
    try {
      const reqId = toFilterId(g.request_id);
      if (reqId == null) throw new Error("request_id пустой");

      const { error } = await supabase.rpc("reject_request_all", {
        p_request_id: String(reqId),
        p_reason: null,
      });
      if (error) throw error;

      setRows((prev) => prev.filter((r) => r.request_id !== g.request_id));
      closeSheet();
    } catch (e: unknown) {
      Alert.alert("Не удалось отклонить все позиции", (e as Error)?.message ?? "Попробуйте еще раз.");
    } finally {
      setReqDeleteId(null);
    }
  }, [supabase, setReqDeleteId, setRows, closeSheet]);

  const approveRequestAndSend = useCallback(async (g: Group) => {
    const disabled =
      screenLock ||
      reqDeleteId === g.request_id ||
      reqSendId === g.request_id ||
      (g.items?.length ?? 0) === 0;
    if (disabled) return;

    setReqSendId(g.request_id);
    try {
      const reqId = toFilterId(g.request_id);
      if (reqId == null) throw new Error("request_id пустой");

      const reqIdStr = String(reqId);

      const updItems = await supabase
        .from("request_items")
        .update({ status: "К закупке" })
        .eq("request_id", reqIdStr)
        .neq("status", "Отклонено");
      if (updItems.error) throw updItems.error;

      const updReq = await supabase
        .from("requests")
        .update({ status: "К закупке" })
        .eq("id", reqIdStr);
      if (updReq.error) throw updReq.error;

      const reqIdCmp = String(g.request_id ?? "");
      setRows((prev) => prev.filter((r) => String(r.request_id ?? "") !== reqIdCmp));
      await fetchProps(true);
      await fetchRows(true);
      setRows((prev) => prev.filter((r) => String(r.request_id ?? "") !== reqIdCmp));

      closeSheet();
      showSuccess(`Заявка ${labelForRequest(g.request_id)} утверждена и отправлена снабженцу`);
    } catch (e: unknown) {
      Alert.alert("Не удалось утвердить и отправить заявку", (e as Error)?.message ?? "Попробуйте еще раз.");
    } finally {
      setReqSendId(null);
    }
  }, [screenLock, reqDeleteId, reqSendId, supabase, setReqSendId, setRows, fetchRows, fetchProps, closeSheet, showSuccess, labelForRequest]);

  return {
    exportRequestExcel,
    openRequestPdf,
    isRequestPdfBusy,
    rejectRequestItem,
    deleteRequestAll,
    approveRequestAndSend,
  };
}
