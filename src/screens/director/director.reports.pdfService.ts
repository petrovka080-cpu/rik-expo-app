import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { generateDirectorProductionReportPdfViaBackend } from "../../lib/api/directorProductionReportPdfBackend.service";
import { generateDirectorSubcontractReportPdfViaBackend } from "../../lib/api/directorSubcontractReportPdfBackend.service";
import { createPdfSource } from "../../lib/pdfFileContract";

export async function buildDirectorProductionReportPdfDescriptor(args: {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  objectName?: string | null;
  repData?: unknown;
  repDiscipline?: unknown;
  preferPriceStage?: "base" | "priced";
}) {
  const title = "Производственный отчет";

  return generateDirectorPdfDocument({
    title,
    fileName: buildPdfFileName({
      documentType: "director_report",
      title,
      entityId: args.objectName ?? undefined,
      dateIso: args.periodTo ?? args.periodFrom ?? undefined,
    }),
    documentType: "director_report",
    entityId: args.objectName ?? undefined,
    getSource: async () => {
      try {
        const backend = await generateDirectorProductionReportPdfViaBackend({
          version: "v1",
          companyName: args.companyName ?? null,
          generatedBy: args.generatedBy ?? null,
          periodFrom: args.periodFrom,
          periodTo: args.periodTo,
          objectName: args.objectName ?? null,
          preferPriceStage: args.preferPriceStage ?? "priced",
        });
        return backend.source;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown backend pdf error");
        console.warn(
          `[director.reports.pdf] production backend fallback ${JSON.stringify({
            companyName: args.companyName ?? null,
            generatedBy: args.generatedBy ?? null,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            objectName: args.objectName ?? null,
            preferPriceStage: args.preferPriceStage ?? "priced",
            errorMessage: message,
          })}`,
        );

        const { exportDirectorProductionReportPdf } = await import("../../lib/api/pdf_director");
        return createPdfSource(
          await exportDirectorProductionReportPdf({
            companyName: args.companyName,
            generatedBy: args.generatedBy,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            objectName: args.objectName,
            repData: args.repData,
            repDiscipline: args.repDiscipline,
            preferPriceStage: args.preferPriceStage,
          }),
        );
      }
    },
  });
}

export async function buildDirectorSubcontractReportPdfDescriptor(args: {
  companyName?: string | null;
  generatedBy?: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  objectName?: string | null;
}) {
  const title = "Отчет по подрядам";

  return generateDirectorPdfDocument({
    title,
    fileName: buildPdfFileName({
      documentType: "director_report",
      title,
      entityId: args.objectName ?? undefined,
      dateIso: args.periodTo ?? args.periodFrom ?? undefined,
    }),
    documentType: "director_report",
    entityId: args.objectName ?? undefined,
    getSource: async () => {
      try {
        const backend = await generateDirectorSubcontractReportPdfViaBackend({
          version: "v1",
          companyName: args.companyName ?? null,
          generatedBy: args.generatedBy ?? null,
          periodFrom: args.periodFrom,
          periodTo: args.periodTo,
          objectName: args.objectName ?? null,
        });
        return backend.source;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown backend pdf error");
        console.warn(
          `[director.reports.pdf] subcontract backend fallback ${JSON.stringify({
            companyName: args.companyName ?? null,
            generatedBy: args.generatedBy ?? null,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            objectName: args.objectName ?? null,
            errorMessage: message,
          })}`,
        );

        const { exportDirectorSubcontractReportPdf } = await import("../../lib/api/pdf_director");
        return createPdfSource(
          await exportDirectorSubcontractReportPdf({
            companyName: args.companyName,
            generatedBy: args.generatedBy,
            periodFrom: args.periodFrom,
            periodTo: args.periodTo,
            objectName: args.objectName,
          }),
        );
      }
    },
  });
}
