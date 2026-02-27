import type React from "react";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";
import * as XLSX from "xlsx";
import { runPdfTop } from "../../lib/pdfRunner";
import { exportRequestPdf } from "../../lib/catalog_api";
import { toFilterId } from "./director.helpers";
import type { Group, PendingRow } from "./director.types";

type BusyLike = { isBusy: (key: string) => boolean };

type Deps = {
  busy: BusyLike;
  supabase: any;
  screenLock: boolean;
  reqDeleteId: number | string | null;
  reqSendId: number | string | null;
  labelForRequest: (rid: number | string | null | undefined, fallbackDocNo?: string | null) => string;
  setRows: React.Dispatch<React.SetStateAction<PendingRow[]>>;
  setSheetRequest: React.Dispatch<React.SetStateAction<Group | null>>;
  setActingId: React.Dispatch<React.SetStateAction<string | null>>;
  setReqDeleteId: React.Dispatch<React.SetStateAction<number | string | null>>;
  setReqSendId: React.Dispatch<React.SetStateAction<number | string | null>>;
  fetchProps: () => Promise<void>;
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
  setSheetRequest,
  setActingId,
  setReqDeleteId,
  setReqSendId,
  fetchProps,
  closeSheet,
  showSuccess,
}: Deps) {
  const exportRequestExcel = useCallback((g: Group) => {
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

    const data: any[][] = [];
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
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);

      ws["!cols"] = [
        { wch: 4 },
        { wch: 40 },
        { wch: 10 },
        { wch: 10 },
        { wch: 18 },
        { wch: 60 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      if (Platform.OS === "web") {
        const blob = new Blob([wbout], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `request-${title}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        Alert.alert(
          "Экспорт",
          "XLSX экспорт сейчас реализован только для Web-версии.",
        );
      }
    } catch (e: any) {
      console.error("[exportRequestExcel]", e?.message ?? e);
      Alert.alert("Ошибка", e?.message ?? "Не удалось сформировать Excel-файл");
    }
  }, [labelForRequest]);

  const openRequestPdf = useCallback(async (g: Group) => {
    const rid = String(g?.request_id ?? "").trim();
    if (!rid) return;

    await runPdfTop({
      busy,
      supabase,
      key: `pdf:req:${rid}`,
      label: "Открываю PDF…",
      mode: "preview",
      fileName: `Заявка_${rid}`,
      getRemoteUrl: () => exportRequestPdf(rid, "preview"),
    });
  }, [busy, supabase]);

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
      setSheetRequest((prev) => prev
        ? ({ ...prev, items: prev.items.filter((x) => x.request_item_id !== it.request_item_id) })
        : prev
      );
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отклонить позицию");
    } finally {
      setActingId(null);
    }
  }, [supabase, setActingId, setRows, setSheetRequest]);

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
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось отклонить все позиции");
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

      setRows((prev) => prev.filter((r) => r.request_id !== g.request_id));
      await fetchProps();

      closeSheet();
      showSuccess(`Заявка ${labelForRequest(g.request_id)} утверждена и отправлена снабженцу`);
    } catch (e: any) {
      Alert.alert("Ошибка", e?.message ?? "Не удалось утвердить и отправить заявку");
    } finally {
      setReqSendId(null);
    }
  }, [screenLock, reqDeleteId, reqSendId, supabase, setReqSendId, setRows, fetchProps, closeSheet, showSuccess, labelForRequest]);

  return {
    exportRequestExcel,
    openRequestPdf,
    isRequestPdfBusy,
    rejectRequestItem,
    deleteRequestAll,
    approveRequestAndSend,
  };
}
