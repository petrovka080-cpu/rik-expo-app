import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { getDirectorFinancePdfSource } from "../../lib/api/directorPdfSource.service";
import {
  generateDirectorFinanceSupplierSummaryPdfViaBackend,
  type DirectorFinanceSupplierPdfBackendTelemetry,
} from "../../lib/api/directorFinanceSupplierPdfBackend.service";
import { financeText } from "./director.finance";

const logSupplierSummaryTelemetry = (
  stage: string,
  telemetry: DirectorFinanceSupplierPdfBackendTelemetry,
) => {
  if (!__DEV__) return;
  console.info(`[director.finance.pdf] ${stage} ${JSON.stringify(telemetry)}`);
};

export async function buildDirectorManagementReportPdfDescriptor(args: {
  periodFrom: string | null;
  periodTo: string | null;
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
    },
  });
}
