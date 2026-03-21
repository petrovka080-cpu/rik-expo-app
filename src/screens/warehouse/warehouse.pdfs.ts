import { useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPdfFlowErrorMessage } from "../../lib/documents/pdfDocumentActions";
import {
  exportWarehouseIncomingFormPdfContract,
  prepareWarehouseIncomingFormPdf,
  type WarehouseIncomingHeadLike,
  type WarehouseIncomingLineLike,
} from "./warehouse.incomingForm.pdf.service";
import {
  createWarehousePdfFileName,
  type WarehousePdfBusyLike,
  useWarehousePdfPreviewBoundary,
} from "./warehouse.pdf.boundary";

const logWarehousePdfDebug = (...args: unknown[]) => {
  if (__DEV__) console.info(...args);
};

type ReportsUiLike = {
  ensureIncomingLines?: (incomingId: string) => Promise<WarehouseIncomingLineLike[] | null | undefined> | WarehouseIncomingLineLike[] | null | undefined;
  buildIssueHtml: (docId: number) => Promise<string>;
  buildIncomingRegisterHtml: () => Promise<string>;
  buildRegisterHtml: () => Promise<string>;
  buildIncomingMaterialsReportPdf: () => Promise<string>;
  buildMaterialsReportPdf: () => Promise<string>;
  buildObjectWorkReportPdf: () => Promise<string>;
  buildDayIncomingRegisterPdf: (dayLabel: string) => Promise<string>;
  buildDayRegisterPdf: (dayLabel: string) => Promise<string>;
  buildDayIncomingMaterialsReportPdf: (dayLabel: string) => Promise<string>;
  buildDayMaterialsReportPdf: (dayLabel: string) => Promise<string>;
};

type UseWarehousePdfArgs = {
  busy: WarehousePdfBusyLike;
  supabase: SupabaseClient;
  reportsUi: ReportsUiLike;
  reportsMode: "choice" | "issue" | "incoming";
  repIncoming: WarehouseIncomingHeadLike[];
  periodFrom: string;
  periodTo: string;
  warehousemanFio: string;
  matNameByCode: Record<string, string>;
  notifyError: (title: string, message?: string) => void;
  orgName: string;
  warehouseName?: string;
};

export function useWarehousePdf(args: UseWarehousePdfArgs) {
  const {
    busy,
    supabase,
    reportsUi,
    reportsMode,
    repIncoming,
    periodFrom,
    periodTo,
    warehousemanFio,
    matNameByCode,
    notifyError,
    orgName,
    warehouseName,
  } = args;

  const previewWarehousePdf = useWarehousePdfPreviewBoundary({
    busy,
    supabase,
    notifyError,
  });

  const onPdfDocument = useCallback(async (docId: string | number) => {
    const pid = String(docId ?? "").trim();
    if (!pid) {
      notifyError("PDF", "Некорректный номер прихода.");
      return;
    }

    if (reportsMode === "incoming") {
      const startedAt = Date.now();
      logWarehousePdfDebug(`INCOMING_PDF_CONTRACT_START pr_id=${pid}`);

      try {
        const prepared = await prepareWarehouseIncomingFormPdf({
          incomingId: pid,
          supabase,
          repIncoming,
          warehousemanFio,
          matNameByCode,
          orgName,
          warehouseName,
          ensureIncomingLines: reportsUi.ensureIncomingLines,
        });

        await previewWarehousePdf({
          key: `pdf: warehouse: incoming - form:${pid}`,
          label: "Готовлю приходный ордер...",
          title: prepared.contract.title,
          fileName: prepared.contract.fileName,
          documentType: prepared.contract.documentType,
          entityId: prepared.contract.entityId,
          getRemoteUrl: async () => {
            const url = await exportWarehouseIncomingFormPdfContract(prepared.contract);
            logWarehousePdfDebug(
              `INCOMING_PDF_OK pr_id=${pid} ms=${Date.now() - startedAt} source=${prepared.source}`,
            );
            return url;
          },
        });
      } catch (error: unknown) {
        const err = error as { message?: string; reason?: string };
        const message = String(err?.message ?? "").toLowerCase();
        const reason =
          String(err?.reason ?? "").trim() || (message.includes("timeout") ? "timeout" : "build_error");
        console.error(`INCOMING_PDF_FAIL pr_id=${pid} reason=${reason}`, {
          errorMessage: getPdfFlowErrorMessage(error, "Incoming PDF build failed"),
        });
        notifyError("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
      return;
    }

    await previewWarehousePdf({
      key: `pdf: warehouse: issue - form:${pid}`,
      label: "Готовлю расходную накладную...",
      title: `Расходная накладная ${pid}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_document",
        title: "warehouse_issue",
        entityId: pid,
      }),
      documentType: "warehouse_document",
      entityId: pid,
      getRemoteUrl: async () => reportsUi.buildIssueHtml(Number(docId)),
    });
  }, [
    matNameByCode,
    notifyError,
    orgName,
    previewWarehousePdf,
    repIncoming,
    reportsMode,
    reportsUi,
    supabase,
    warehouseName,
    warehousemanFio,
  ]);

  const onPdfRegister = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: `pdf: warehouse: ${isIncoming ? "incoming" : "issues"} - register:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Готовлю реестр...",
      title: isIncoming ? "Реестр прихода" : "Реестр расхода",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_register",
        title: isIncoming ? "warehouse_incoming_register" : "warehouse_issue_register",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_register",
      getRemoteUrl: async () =>
        isIncoming ? reportsUi.buildIncomingRegisterHtml() : reportsUi.buildRegisterHtml(),
    });
  }, [periodFrom, periodTo, previewWarehousePdf, reportsMode, reportsUi]);

  const onPdfMaterials = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: `pdf: warehouse: materials:${isIncoming ? "incoming" : "issues"}:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Готовлю свод материалов...",
      title: isIncoming ? "Отчёт по приходу материалов" : "Отчёт по расходу материалов",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: isIncoming ? "warehouse_incoming_materials" : "warehouse_issued_materials",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_materials",
      getRemoteUrl: async () =>
        isIncoming ? reportsUi.buildIncomingMaterialsReportPdf() : reportsUi.buildMaterialsReportPdf(),
    });
  }, [periodFrom, periodTo, previewWarehousePdf, reportsMode, reportsUi]);

  const onPdfObjectWork = useCallback(async () => {
    await previewWarehousePdf({
      key: `pdf: warehouse: objwork:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Готовлю отчёт по объектам...",
      title: "Отчёт по объектам и работам",
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: "warehouse_object_work",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_materials",
      getRemoteUrl: async () => reportsUi.buildObjectWorkReportPdf(),
    });
  }, [periodFrom, periodTo, previewWarehousePdf, reportsUi]);

  const onPdfDayRegister = useCallback(async (dayLabel: string) => {
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: `pdf: warehouse: day - register:${isIncoming ? "incoming" : "issues"}:${dayLabel}`,
      label: "Готовлю дневной реестр...",
      title: isIncoming ? `Реестр прихода за ${dayLabel}` : `Реестр расхода за ${dayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_register",
        title: isIncoming ? "warehouse_incoming_day_register" : "warehouse_day_register",
        entityId: String(dayLabel).trim().replace(/\s+/g, "_"),
      }),
      documentType: "warehouse_register",
      entityId: dayLabel,
      getRemoteUrl: async () =>
        isIncoming ? reportsUi.buildDayIncomingRegisterPdf(dayLabel) : reportsUi.buildDayRegisterPdf(dayLabel),
    });
  }, [previewWarehousePdf, reportsMode, reportsUi]);

  const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: `pdf: warehouse: day - materials:${isIncoming ? "incoming" : "issues"}:${dayLabel}`,
      label: "Готовлю дневной отчёт по материалам...",
      title: isIncoming ? `Материалы прихода за ${dayLabel}` : `Материалы расхода за ${dayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: isIncoming ? "warehouse_incoming_day_materials" : "warehouse_day_materials",
        entityId: String(dayLabel).trim().replace(/\s+/g, "_"),
      }),
      documentType: "warehouse_materials",
      entityId: dayLabel,
      getRemoteUrl: async () =>
        isIncoming
          ? reportsUi.buildDayIncomingMaterialsReportPdf(dayLabel)
          : reportsUi.buildDayMaterialsReportPdf(dayLabel),
    });
  }, [previewWarehousePdf, reportsMode, reportsUi]);

  return {
    onPdfDocument,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
  };
}
