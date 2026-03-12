// src/screens/warehouse/warehouse.pdf.ts
// Consolidates all 6 PDF generation callbacks into a single hook.
// Zero logic changes for PDF content; preview boundary is routed through the universal viewer.

import { useCallback } from "react";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildWarehouseIncomingFormHtml,
  exportWarehouseHtmlPdf,
} from "../../lib/api/pdf_warehouse";
import { apiFetchIncomingLines } from "./warehouse.api";
import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { getPdfFlowErrorMessage, preparePdfDocument, previewPdfDocument } from "../../lib/documents/pdfDocumentActions";
import { generateWarehousePdfDocument } from "../../lib/documents/pdfDocumentGenerators";

type BusyLike = {
  run?: <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T | null>;
  isBusy?: (key?: string) => boolean;
  show?: (key?: string, label?: string) => void;
  hide?: (key?: string) => void;
};

type IncomingHeadLike = {
  incoming_id?: string | number | null;
  id?: string | number | null;
  who?: string | null;
  warehouseman_fio?: string | null;
  event_dt?: string | null;
  display_no?: string | null;
};

type IncomingLineLike = Record<string, unknown>;

type ReportsUiLike = {
  ensureIncomingLines?: (incomingId: string) => Promise<IncomingLineLike[] | null | undefined> | IncomingLineLike[] | null | undefined;
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

const isMissingName = (v: unknown): boolean => {
  const s = String(v ?? "").trim();
  if (!s) return true;
  if (/^[-\u2014\u2013\u2212]+$/.test(s)) return true;
  const l = s.toLowerCase();
  if (l === "null" || l === "undefined" || l === "n/a") return true;
  if (l.includes("Р Р†РЎвЂ™")) return true;
  return false;
};

type UseWarehousePdfArgs = {
  busy: BusyLike;
  supabase: SupabaseClient;
  reportsUi: ReportsUiLike;
  reportsMode: "choice" | "issue" | "incoming";
  repIncoming: IncomingHeadLike[];
  periodFrom: string;
  periodTo: string;
  warehousemanFio: string;
  matNameByCode: Record<string, string>;
  notifyError: (title: string, message?: string) => void;
  orgName: string;
};

export function useWarehousePdf(args: UseWarehousePdfArgs) {
  const router = useRouter();
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
  } = args;

  const previewWarehousePdf = useCallback(
    async (params: {
      key: string;
      label: string;
      title: string;
      fileName: string;
      documentType: "warehouse_register" | "warehouse_materials" | "warehouse_document";
      entityId?: string;
      getRemoteUrl: () => Promise<string>;
    }) => {
      try {
        const template = await generateWarehousePdfDocument({
          title: params.title,
          fileName: params.fileName,
          documentType: params.documentType,
          entityId: params.entityId,
          getUri: params.getRemoteUrl,
        });
        const doc = await preparePdfDocument({
          busy,
          supabase,
          key: params.key,
          label: params.label,
          descriptor: template,
          getRemoteUrl: () => template.uri,
        });
        await previewPdfDocument(doc, { router });
      } catch (error) {
        notifyError("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [busy, notifyError, supabase, router],
  );

  const onPdfDocument = useCallback(
    async (docId: string | number) => {
      const pid = String(docId ?? "").trim();
      if (!pid) {
        notifyError("PDF", "Некорректный номер прихода.");
        return;
      }

      if (reportsMode === "incoming") {
        await previewWarehousePdf({
          key: `pdf: warehouse: incoming - form:${pid}`,
          label: "Готовлю приходный ордер...",
          title: `Приходный ордер ${pid}`,
          fileName: buildPdfFileName({
            documentType: "warehouse_document",
            title: "warehouse_incoming",
            entityId: pid,
          }),
          documentType: "warehouse_document",
          entityId: pid,
          getRemoteUrl: async () => {
            const t0 = Date.now();
            console.info(`INCOMING_PDF_START pr_id=${pid}`);
            let source: "main" | "fallback" = "main";
            try {
              const head = (repIncoming || []).find(
                (x) => String(x.incoming_id || "") === pid || String(x.id || "") === pid,
              );

              const who = String(head?.who ?? head?.warehouseman_fio ?? warehousemanFio ?? "").trim() || "—";

              let lines = await apiFetchIncomingLines(supabase, pid);
              if (!Array.isArray(lines) || lines.length === 0) {
                source = "fallback";
                const fallbackLines = await reportsUi.ensureIncomingLines?.(pid);
                if (Array.isArray(fallbackLines)) lines = fallbackLines;
              }

              if (!Array.isArray(lines) || lines.length === 0) {
                const err = new Error("Нет оприходованных позиций") as Error & { reason?: string };
                err.reason = "empty";
                throw err;
              }

              const linesForPdf = (lines || []).map((ln: IncomingLineLike) => {
                const code = String(ln?.code ?? "").trim().toUpperCase();
                const mapped = String(matNameByCode?.[code] ?? "").trim();
                const raw = String(ln?.name_ru ?? ln?.material_name ?? ln?.name ?? "").trim();
                const goodMapped = !isMissingName(mapped);
                const goodRaw = !isMissingName(raw);
                return {
                  ...ln,
                  material_name: goodMapped ? mapped : goodRaw ? raw : code,
                };
              });

              const incomingHead =
                head ??
                ({
                  incoming_id: pid,
                  event_dt: null,
                  display_no: `PR-${pid.slice(0, 8)}`,
                  warehouseman_fio: who,
                  who,
                } as IncomingHeadLike);

              const html = buildWarehouseIncomingFormHtml({
                incoming: incomingHead,
                lines: linesForPdf,
                orgName: orgName || "ООО «РИК»",
                warehouseName: "Главный склад",
              });

              const url = await exportWarehouseHtmlPdf({
                fileName: `Incoming_${pid}`,
                html,
              });

              console.info(`INCOMING_PDF_OK pr_id=${pid} ms=${Date.now() - t0} source=${source}`);
              return url;
            } catch (e: unknown) {
              const err = e as { message?: string; reason?: string };
              const msg = String(err?.message ?? "").toLowerCase();
              const reason = String(err?.reason ?? "").trim() || (msg.includes("timeout") ? "timeout" : "build_error");
              console.error(`INCOMING_PDF_FAIL pr_id=${pid} reason=${reason}`, {
                errorMessage: getPdfFlowErrorMessage(e, "Incoming PDF build failed"),
              });
              throw e;
            }
          },
        });
        return;
      }

      await previewWarehousePdf({
        key: `pdf: warehouse: issue - form:${pid}`,
        label: "Готовлю расходную накладную...",
        title: `Расходная накладная ${pid}`,
        fileName: buildPdfFileName({
          documentType: "warehouse_document",
          title: "warehouse_issue",
          entityId: pid,
        }),
        documentType: "warehouse_document",
        entityId: pid,
        getRemoteUrl: async () => reportsUi.buildIssueHtml(Number(docId)),
      });
    },
    [matNameByCode, notifyError, orgName, previewWarehousePdf, repIncoming, reportsMode, reportsUi, supabase, warehousemanFio],
  );

  const onPdfRegister = useCallback(async () => {
    const isIncoming = reportsMode === "incoming";
    await previewWarehousePdf({
      key: `pdf: warehouse: ${isIncoming ? "incoming" : "issues"} - register:${periodFrom || "all"}:${periodTo || "all"}`,
      label: "Готовлю реестр...",
      title: isIncoming ? "Реестр прихода" : "Реестр расхода",
      fileName: buildPdfFileName({
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
      fileName: buildPdfFileName({
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
      fileName: buildPdfFileName({
        documentType: "warehouse_materials",
        title: "warehouse_object_work",
        entityId: `${periodFrom || "all"}_${periodTo || "all"}`,
      }),
      documentType: "warehouse_materials",
      getRemoteUrl: async () => reportsUi.buildObjectWorkReportPdf(),
    });
  }, [periodFrom, periodTo, previewWarehousePdf, reportsUi]);

  const onPdfDayRegister = useCallback(
    async (dayLabel: string) => {
      const isIncoming = reportsMode === "incoming";
      await previewWarehousePdf({
        key: `pdf: warehouse: day - register:${isIncoming ? "incoming" : "issues"}:${dayLabel}`,
        label: "Готовлю дневной реестр...",
        title: isIncoming ? `Реестр прихода за ${dayLabel}` : `Реестр расхода за ${dayLabel}`,
        fileName: buildPdfFileName({
          documentType: "warehouse_register",
          title: isIncoming ? "warehouse_incoming_day_register" : "warehouse_day_register",
          entityId: String(dayLabel).trim().replace(/\s+/g, "_"),
        }),
        documentType: "warehouse_register",
        entityId: dayLabel,
        getRemoteUrl: async () =>
          isIncoming ? reportsUi.buildDayIncomingRegisterPdf(dayLabel) : reportsUi.buildDayRegisterPdf(dayLabel),
      });
    },
    [previewWarehousePdf, reportsMode, reportsUi],
  );

  const onPdfDayMaterials = useCallback(
    async (dayLabel: string) => {
      const isIncoming = reportsMode === "incoming";
      await previewWarehousePdf({
        key: `pdf: warehouse: day - materials:${isIncoming ? "incoming" : "issues"}:${dayLabel}`,
        label: "Готовлю дневной отчёт по материалам...",
        title: isIncoming ? `Материалы прихода за ${dayLabel}` : `Материалы расхода за ${dayLabel}`,
        fileName: buildPdfFileName({
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
    },
    [previewWarehousePdf, reportsMode, reportsUi],
  );

  return {
    onPdfDocument,
    onPdfRegister,
    onPdfMaterials,
    onPdfObjectWork,
    onPdfDayRegister,
    onPdfDayMaterials,
  };
}
