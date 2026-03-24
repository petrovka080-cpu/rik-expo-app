import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { generateDirectorFinanceSupplierSummaryPdfViaBackend } from "../../lib/api/directorFinanceSupplierPdfBackend.service";
import { createPdfSource } from "../../lib/pdfFileContract";
import {
  financeText,
  type FinanceRow,
  type FinSpendRow,
} from "./director.finance";
import { makeIsoInPeriod, pickIso10 } from "./director.helpers";

export async function buildDirectorManagementReportPdfDescriptor(args: {
  periodFrom: string | null;
  periodTo: string | null;
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
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
  financeRows: FinanceRow[];
  spendRows: FinSpendRow[];
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

        const inFinancePeriod = makeIsoInPeriod(args.periodFrom, args.periodTo);
        const financeRows = (Array.isArray(args.financeRows) ? args.financeRows : [])
          .filter((row) => financeText(row?.supplier) === supplierName)
          .filter((row) =>
            inFinancePeriod(row?.approvedAtIso ?? row?.raw?.approved_at ?? row?.raw?.director_approved_at),
          );

        let spendRows = (Array.isArray(args.spendRows) ? args.spendRows : [])
          .filter((row) => financeText(row?.supplier) === supplierName)
          .filter((row) =>
            inFinancePeriod(pickIso10(row?.director_approved_at, row?.approved_at, row?.approvedAtIso)),
          );

        if (kindName) {
          spendRows = spendRows.filter((row) => financeText(row?.kind_name) === kindName);
        }

        spendRows = spendRows.filter((row) => financeText(row?.proposal_id));

        const { exportDirectorSupplierSummaryPdf } = await import("../../lib/api/pdf_director");
        return createPdfSource(await exportDirectorSupplierSummaryPdf({
            supplier: supplierName,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            financeRows,
            spendRows,
          }));
      }
    },
  });
}
