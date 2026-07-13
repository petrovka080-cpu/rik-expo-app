import {
  batchResolveRequestLabels,
  buildRequestPdfModel,
  resolveRequestLabel,
} from "../pdf/pdf.builder";
import { renderPdfHtmlToUri } from "../pdf/pdf.runner";
import { renderRequestPdfHtml } from "../pdf/pdf.template";
import type { RequestPdfModel } from "../pdf/pdf.model";

export { batchResolveRequestLabels, resolveRequestLabel };

export async function buildRequestPdfHtml(requestId: number | string): Promise<string> {
  const model = await buildRequestPdfModel(requestId);
  return renderRequestPdfHtml(model);
}

export async function exportRequestPdf(requestId: number | string) {
  const html = await buildRequestPdfHtml(requestId);
  return renderPdfHtmlToUri({
    html,
    documentType: "request",
    source: "request_pdf",
  });
}

export async function exportRequestPdfFromModel(
  model: RequestPdfModel,
  source = "request_pdf_snapshot",
) {
  const html = renderRequestPdfHtml(model);
  return renderPdfHtmlToUri({
    html,
    documentType: "request",
    source,
  });
}
