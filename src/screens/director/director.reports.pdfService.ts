import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import { generateDirectorPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { generateDirectorProductionReportPdfViaBackend } from "../../lib/api/directorProductionReportPdfBackend.service";
import { generateDirectorSubcontractReportPdfViaBackend } from "../../lib/api/directorSubcontractReportPdfBackend.service";
import { hashString32 } from "../../lib/pdfFileContract";

function buildReportSourceFingerprint(repData: unknown, repDiscipline: unknown) {
  if (repData == null && repDiscipline == null) return null;
  try {
    return hashString32(JSON.stringify({ repData, repDiscipline }));
  } catch {
    return null;
  }
}

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
        clientSourceFingerprint: buildReportSourceFingerprint(args.repData, args.repDiscipline),
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
