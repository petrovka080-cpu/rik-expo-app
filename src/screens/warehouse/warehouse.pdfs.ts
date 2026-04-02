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
  buildWarehousePdfBusyKey,
  createWarehousePdfFileName,
  type WarehousePdfBusyLike,
  useWarehousePdfPreviewBoundary,
} from "./warehouse.pdf.boundary";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";

const logWarehousePdfDebug = (...args: unknown[]) => {
  if (__DEV__) console.info(...args);
};

const requireWarehousePdfDocId = (docId: string | number) => {
  const text = String(docId ?? "").trim();
  if (!text) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return null;
  return {
    text,
    numeric,
  };
};

const requireWarehousePdfDayLabel = (dayLabel: string) => {
  const text = String(dayLabel ?? "").trim();
  return text || null;
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
    const normalizedDocId = requireWarehousePdfDocId(docId);
    const pid = normalizedDocId?.text ?? "";
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
          key: buildWarehousePdfBusyKey({
            kind: "document",
            reportsMode: "incoming",
            docId: pid,
          }),
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
        recordCatchDiscipline({
          screen: "warehouse",
          surface: "warehouse_pdf_open",
          event: "warehouse_incoming_pdf_open_failed",
          kind: "critical_fail",
          error,
          category: "ui",
          sourceKind: "pdf:warehouse_incoming",
          errorStage: "prepare_or_open",
          extra: {
            docId: pid,
            reportsMode,
            reason,
          },
        });
        console.error(`INCOMING_PDF_FAIL pr_id=${pid} reason=${reason}`, {
          errorMessage: getPdfFlowErrorMessage(error, "Incoming PDF build failed"),
        });
        notifyError("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
      return;
    }

    await previewWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "document",
        reportsMode: "issue",
        docId: pid,
      }),
      label: "Готовлю расходную накладную...",
      title: `Расходная накладная ${pid}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_document",
        title: "warehouse_issue",
        entityId: pid,
      }),
      documentType: "warehouse_document",
      entityId: pid,
      getRemoteUrl: async () => reportsUi.buildIssueHtml(normalizedDocId?.numeric ?? Number.NaN),
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
      key: buildWarehousePdfBusyKey({
        kind: "register",
        reportsMode: isIncoming ? "incoming" : "issue",
        periodFrom,
        periodTo,
      }),
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
      key: buildWarehousePdfBusyKey({
        kind: "materials",
        reportsMode: isIncoming ? "incoming" : "issue",
        periodFrom,
        periodTo,
      }),
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
      key: buildWarehousePdfBusyKey({
        kind: "object-work",
        periodFrom,
        periodTo,
      }),
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
    const normalizedDayLabel = requireWarehousePdfDayLabel(dayLabel);
    if (!normalizedDayLabel) {
      notifyError("PDF", "Invalid report day.");
      return;
    }
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "day-register",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: normalizedDayLabel,
      }),
      label: "Готовлю дневной реестр...",
      title: isIncoming ? `Реестр прихода за ${dayLabel}` : `Реестр расхода за ${dayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_register",
        title: isIncoming ? "warehouse_incoming_day_register" : "warehouse_day_register",
        entityId: normalizedDayLabel.replace(/\s+/g, "_"),
      }),
      documentType: "warehouse_register",
      entityId: normalizedDayLabel,
      getRemoteUrl: async () =>
        isIncoming
          ? reportsUi.buildDayIncomingRegisterPdf(normalizedDayLabel)
          : reportsUi.buildDayRegisterPdf(normalizedDayLabel),
    });
  }, [notifyError, previewWarehousePdf, reportsMode, reportsUi]);

  const onPdfDayMaterials = useCallback(async (dayLabel: string) => {
    const normalizedDayLabel = requireWarehousePdfDayLabel(dayLabel);
    if (!normalizedDayLabel) {
      notifyError("PDF", "Invalid report day.");
      return;
    }
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: buildWarehousePdfBusyKey({
        kind: "day-materials",
        reportsMode: isIncoming ? "incoming" : "issue",
        dayLabel: normalizedDayLabel,
      }),
      label: "Готовлю дневной отчёт по материалам...",
      title: isIncoming ? `Материалы прихода за ${dayLabel}` : `Материалы расхода за ${dayLabel}`,
      fileName: createWarehousePdfFileName({
        documentType: "warehouse_materials",
        title: isIncoming ? "warehouse_incoming_day_materials" : "warehouse_day_materials",
        entityId: normalizedDayLabel.replace(/\s+/g, "_"),
      }),
      documentType: "warehouse_materials",
      entityId: normalizedDayLabel,
      getRemoteUrl: async () =>
        isIncoming
          ? reportsUi.buildDayIncomingMaterialsReportPdf(normalizedDayLabel)
          : reportsUi.buildDayMaterialsReportPdf(normalizedDayLabel),
    });
  }, [notifyError, previewWarehousePdf, reportsMode, reportsUi]);

  return {
    onPdfDocument,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
  };
}
