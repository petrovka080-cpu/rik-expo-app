import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { generateDirectorProductionReportPdfViaBackend } from "../../lib/api/directorProductionReportPdfBackend.service";
import { generateDirectorSubcontractReportPdfViaBackend } from "../../lib/api/directorSubcontractReportPdfBackend.service";

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
      const backend = await generateDirectorSubcontractReportPdfViaBackend({
        version: "v1",
        companyName: args.companyName ?? null,
        generatedBy: args.generatedBy ?? null,
        periodFrom: args.periodFrom,
        periodTo: args.periodTo,
        objectName: args.objectName ?? null,
      });
      return backend.source;
    },
  });
}
