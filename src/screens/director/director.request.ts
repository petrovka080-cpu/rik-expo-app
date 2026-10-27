import type React from "react";
import { useCallback, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { generateRequestPdfDocument } from "../../lib/catalog_api";
import { exportRequestPdfFromModel } from "../../lib/api/pdf_request";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { getPdfFlowErrorMessage } from "../../lib/documents/pdfDocumentActions";
import { exportAoaWorkbookWeb } from "../../lib/exports/xlsxExport";
import { buildGeneratedPdfDescriptor, createModalAwarePdfOpener } from "../../lib/pdf/pdf.runner";
import type { RequestPdfModel } from "../../lib/pdf/pdf.model";
import {
  buildRequestContextMetaFields,
  buildRequestContextView,
  parseRequestContextFromNotes,
} from "../../features/office/requestContextView";
import { officeHumanLabel, officeUomLabel } from "../../shared/i18n/officeRussianDisplay";
import { toFilterId } from "./director.helpers";
import {
  runDirectorRequestApproveAction,
  runDirectorRequestRejectAllAction,
  runDirectorRequestRejectItemAction,
} from "./director.request.boundary";
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

const formatSnapshotQty = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed)
    ? parsed.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
    : raw;
};

const buildDirectorRequestSnapshotPdfDescriptor = async (
  g: Group,
  title: string,
  rid: string,
  fileName: string,
) => {
  const rows = Array.isArray(g.items) ? g.items : [];
  const requestMeta = g.requestMeta ?? null;
  const noteContext = parseRequestContextFromNotes([
    requestMeta?.note,
    requestMeta?.comment,
    ...rows.map((row) => row.note),
  ]);
  const context = buildRequestContextView(
    {
      requestId: rid,
      requestNo: requestMeta?.request_no,
      displayNo: requestMeta?.display_no,
      displayLabel: title,
      objectName: requestMeta?.object_name,
      object: requestMeta?.object,
      siteAddress: requestMeta?.site_address_snapshot,
      levelCode: requestMeta?.level_code,
      systemCode: requestMeta?.system_code,
      zoneCode: requestMeta?.zone_code,
      status: requestMeta?.status ?? "submitted",
      createdAt: requestMeta?.created_at,
      submittedAt: requestMeta?.submitted_at,
      neededBy: requestMeta?.need_by,
    },
    noteContext,
  );
  const model: RequestPdfModel = {
    requestLabel: title || `Заявка ${rid}`,
    generatedAt: new Date().toLocaleString("ru-RU"),
    comment: "",
    foremanName: "",
    metaFields: [
      ...buildRequestContextMetaFields(context),
      { label: "ID заявки", value: rid || "—" },
    ],
    rows: rows.map((row) => ({
      name: officeHumanLabel(
        row.name_human,
        String(row.item_kind ?? "").toLowerCase().includes("work") ? "Работа" : "Материал",
      ),
      uom: officeUomLabel(row.uom, ""),
      qtyText: formatSnapshotQty(row.qty),
      status: "На утверждении",
      note: String(row.note ?? "").trim(),
    })),
  };

  return buildGeneratedPdfDescriptor({
    getUri: () => exportRequestPdfFromModel(model, "director_request_sheet_snapshot"),
    title: model.requestLabel,
    fileName,
    documentType: "request",
    originModule: "director",
    entityId: rid,
  });
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

    const data: (string | number)[][] = [];
    data.push(["№", "Наименование", "Кол-во", "Ед. изм.", "Применение", "Примечание"]);

    rows.forEach((it, idx) => {
      data.push([
        idx + 1,
        safe(it.name_human),
        safe(it.qty),
        safe(officeUomLabel(it.uom, "")),
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
      const title = labelForRequest(g.request_id) || `Заявка ${rid}`;
      const fileName = buildPdfFileName({
        documentType: "request",
        title,
        entityId: rid,
      });
      const hasSnapshotRows = Array.isArray(g.items) && g.items.length > 0;

      await pdfOpener.prepareAndPreviewFromDescriptorFactory({
        busy,
        supabase,
        key: `pdf:req:${rid}`,
        label: "Открываю PDF…",
        createDescriptor: async () => {
          try {
            const template = await buildDirectorRequestSnapshotPdfDescriptor(g, title, rid, fileName);
            return {
              ...template,
              title,
              fileName,
            };
          } catch (snapshotError) {
            if (__DEV__) {
              console.warn("[director.request.pdf.snapshot]", (snapshotError as Error)?.message ?? snapshotError);
            }
            if (hasSnapshotRows) throw snapshotError;
            const template = await generateRequestPdfDocument(rid);
            return {
              ...template,
              title,
              fileName,
            };
          }
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
      await runDirectorRequestRejectItemAction({
        supabase,
        requestItemId: it.request_item_id,
      });

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

      await runDirectorRequestRejectAllAction({
        supabase,
        requestId: String(reqId),
      });

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

      await runDirectorRequestApproveAction({
        supabase,
        requestId: reqIdStr,
      });

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
