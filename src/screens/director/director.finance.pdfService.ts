import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { getDirectorFinancePdfSource } from "../../lib/api/directorPdfSource.service";
import {
  generateDirectorFinanceSupplierSummaryPdfViaBackend,
  type DirectorFinanceSupplierPdfBackendTelemetry,
} from "../../lib/api/directorFinanceSupplierPdfBackend.service";
import { createPdfSource } from "../../lib/pdfFileContract";
import {
  financeText,
  type FinanceRow,
  type FinSpendRow,
} from "./director.finance";
import { makeIsoInPeriod, pickIso10 } from "./director.helpers";

const DIRECTOR_SUPPLIER_SUMMARY_FALLBACK_MAX_ROWS = 240;
const DIRECTOR_SUPPLIER_SUMMARY_FALLBACK_MAX_HTML = 350_000;

type DirectorFinanceSupplierFallbackTelemetry = {
  documentKind: "director_finance_supplier_summary";
  sourceKind: "fallback-local";
  fetchSourceName: string;
  financeRows: number;
  spendRows: number;
  detailRows: number;
  kindRows: number;
  fetchDurationMs: null;
  renderDurationMs: null;
  totalDurationMs: null;
  htmlLengthEstimate: number;
  payloadSizeEstimate: number;
  fallbackUsed: true;
  openStrategy: "local-render";
  materializationStrategy: "viewer_generated";
};

const estimateSupplierSummaryPayloadSize = (financeRows: FinanceRow[], spendRows: FinSpendRow[]) =>
  financeRows.length * 240 + spendRows.length * 180;

const estimateSupplierSummaryHtmlLength = (financeRows: FinanceRow[], spendRows: FinSpendRow[]) =>
  4096 + financeRows.length * 320 + spendRows.length * 160;

const logSupplierSummaryTelemetry = (
  stage: string,
  telemetry: DirectorFinanceSupplierPdfBackendTelemetry | DirectorFinanceSupplierFallbackTelemetry,
) => {
  console.info(`[director.finance.pdf] ${stage} ${JSON.stringify(telemetry)}`);
};

async function resolveDirectorFinanceFallbackRows(args: {
  periodFrom: string | null;
  periodTo: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  financeRows?: FinanceRow[] | null;
  spendRows?: FinSpendRow[] | null;
  loadFallbackRows?: (() => Promise<{
    financeRows: FinanceRow[];
    spendRows: FinSpendRow[];
  }>) | null;
}): Promise<{
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
  fetchSourceName: string;
}> {
  const source = await getDirectorFinancePdfSource({
    periodFrom: args.periodFrom,
    periodTo: args.periodTo,
    dueDaysDefault: args.dueDaysDefault,
    criticalDays: args.criticalDays,
  });
  return {
    financeRows: source.financeRows,
    spendRows: source.spendRows,
    fetchSourceName: source.source,
  };
}

export async function buildDirectorManagementReportPdfDescriptor(args: {
  periodFrom: string | null;
  periodTo: string | null;
  financeRows?: FinanceRow[] | null;
  spendRows?: FinSpendRow[] | null;
  loadFallbackRows?: (() => Promise<{
    financeRows: FinanceRow[];
    spendRows: FinSpendRow[];
  }>) | null;
  dueDaysDefault: number;
  criticalDays: number;
}) {
  const title = "Финансовый управленческий отчёт";
  return generateDirectorPdfDocument({
    title,
    fileName: buildPdfFileName({
      documentType: "director_report",
      title,
      dateIso: args.periodTo ?? args.periodFrom ?? undefined,
    }),
    documentType: "director_report",
    getUri: async () => {
      const { exportDirectorManagementReportPdf } = await import("../../lib/api/pdf_director");
      return await exportDirectorManagementReportPdf({
        periodFrom: args.periodFrom,
        periodTo: args.periodTo,
        financeRows: args.financeRows,
        spendRows: args.spendRows,
        loadFallbackRows: args.loadFallbackRows,
        topN: 15,
        dueDaysDefault: args.dueDaysDefault,
        criticalDays: args.criticalDays,
      });
    },
  });
}

export async function buildDirectorSupplierSummaryPdfDescriptor(args: {
  supplier: string;
  kindName?: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  dueDaysDefault?: number;
  criticalDays?: number;
  financeRows?: FinanceRow[] | null;
  spendRows?: FinSpendRow[] | null;
  loadFallbackRows?: (() => Promise<{
    financeRows: FinanceRow[];
    spendRows: FinSpendRow[];
  }>) | null;
}) {
  const supplierName = financeText(args.supplier);
  const kindName = financeText(args.kindName);
  const title = kindName
    ? `Сводка по поставщику: ${supplierName} (${kindName})`
    : `Сводка по поставщику: ${supplierName}`;

  return generateDirectorPdfDocument({
    title,
    fileName: buildPdfFileName({
      documentType: "supplier_summary",
      title: supplierName,
      entityId: supplierName,
      dateIso: args.periodTo ?? args.periodFrom ?? undefined,
    }),
    documentType: "supplier_summary",
    entityId: supplierName,
    getSource: async () => {
      try {
        const backend = await generateDirectorFinanceSupplierSummaryPdfViaBackend({
          version: "v1",
          supplier: supplierName,
          kindName: kindName || null,
          periodFrom: args.periodFrom,
          periodTo: args.periodTo,
          dueDaysDefault: args.dueDaysDefault ?? null,
          criticalDays: args.criticalDays ?? null,
        });
        if (backend.telemetry) {
          logSupplierSummaryTelemetry("supplier_backend_ready", backend.telemetry);
        }
        return backend.source;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown backend pdf error");
        console.warn(
          `[director.finance.pdf] supplier backend pilot fallback ${JSON.stringify({
            supplier: supplierName,
            kindName: kindName || null,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            errorMessage: message,
          })}`,
        );

        const fallbackSource = await resolveDirectorFinanceFallbackRows({
          periodFrom: args.periodFrom,
          periodTo: args.periodTo,
          dueDaysDefault: args.dueDaysDefault,
          criticalDays: args.criticalDays,
          financeRows: args.financeRows,
          spendRows: args.spendRows,
          loadFallbackRows: args.loadFallbackRows,
        });

        const inFinancePeriod = makeIsoInPeriod(args.periodFrom, args.periodTo);
        const financeRows = fallbackSource.financeRows
          .filter((row) => financeText(row?.supplier) === supplierName)
          .filter((row) =>
            inFinancePeriod(row?.approvedAtIso ?? row?.raw?.approved_at ?? row?.raw?.director_approved_at),
          );

        let spendRows = fallbackSource.spendRows
          .filter((row) => financeText(row?.supplier) === supplierName)
          .filter((row) =>
            inFinancePeriod(pickIso10(row?.director_approved_at, row?.approved_at, row?.approvedAtIso)),
          );

        if (kindName) {
          spendRows = spendRows.filter((row) => financeText(row?.kind_name) === kindName);
        }

        spendRows = spendRows.filter((row) => financeText(row?.proposal_id));

        const htmlLengthEstimate = estimateSupplierSummaryHtmlLength(financeRows, spendRows);
        const fallbackTelemetry: DirectorFinanceSupplierFallbackTelemetry = {
          documentKind: "director_finance_supplier_summary",
          sourceKind: "fallback-local",
          fetchSourceName: fallbackSource.fetchSourceName,
          financeRows: financeRows.length,
          spendRows: spendRows.length,
          detailRows: financeRows.length,
          kindRows: kindName ? 1 : 0,
          fetchDurationMs: null,
          renderDurationMs: null,
          totalDurationMs: null,
          htmlLengthEstimate,
          payloadSizeEstimate: estimateSupplierSummaryPayloadSize(financeRows, spendRows),
          fallbackUsed: true,
          openStrategy: "local-render",
          materializationStrategy: "viewer_generated",
        };
        logSupplierSummaryTelemetry("supplier_fallback_preflight", fallbackTelemetry);

        if (
          financeRows.length + spendRows.length > DIRECTOR_SUPPLIER_SUMMARY_FALLBACK_MAX_ROWS ||
          htmlLengthEstimate > DIRECTOR_SUPPLIER_SUMMARY_FALLBACK_MAX_HTML
        ) {
          throw new Error(
            "director finance supplier pdf fallback blocked by preflight guard",
          );
        }

        const { exportDirectorSupplierSummaryPdf } = await import("../../lib/api/pdf_director");
        const localUri = await exportDirectorSupplierSummaryPdf({
            supplier: supplierName,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            financeRows,
            spendRows,
          });
        logSupplierSummaryTelemetry("supplier_fallback_local_ready", fallbackTelemetry);
        return createPdfSource(localUri);
      }
    },
  });
}
