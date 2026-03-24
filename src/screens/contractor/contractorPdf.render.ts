import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { createGeneratedPdfDocument } from "../../lib/documents/pdfDocumentGenerators";
import { buildContractorActPdfHtml } from "../../lib/pdf/pdf.contractor";
import { renderPdfHtmlToSource } from "../../lib/pdf/pdf.runner";
import type { ContractorActPdfData } from "./contractorPdf.data";

export async function renderContractorActPdfDocument(
  data: ContractorActPdfData,
): Promise<DocumentDescriptor> {
  const html = buildContractorActPdfHtml(data.work, data.materials, data.options);
  const fileSource = await renderPdfHtmlToSource({
    html,
    documentType: "contractor_act",
    source: "contractor_generate_work_pdf",
  });

  return createGeneratedPdfDocument({
    fileSource,
    title: data.title,
    fileName: data.fileName,
    documentType: "contractor_act",
    originModule: "contractor",
    entityId: data.work.progress_id || data.actNo,
  });
}
