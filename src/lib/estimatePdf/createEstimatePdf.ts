import { buildEstimatePdfViewModel } from "./buildEstimatePdfViewModel";
import { renderEstimatePdfDocument } from "./renderEstimatePdfDocument";
import type { EstimatePdfDocument, EstimatePdfInput } from "./estimatePdfTypes";
import { validateEstimatePdf } from "./validateEstimatePdf";

export type CreateEstimatePdfResult = EstimatePdfDocument & {
  validation: ReturnType<typeof validateEstimatePdf>;
  pdfTrace: {
    pdf_uses_structured_global_estimate_result: true;
    markdown_parsed_as_pdf_truth: false;
    pdf_binary_valid: boolean;
    pdf_text_extractable: boolean;
    pdf_cyrillic_readable: boolean;
    pdf_mojibake_found: boolean;
  };
};

export function createEstimatePdf(input: EstimatePdfInput): CreateEstimatePdfResult {
  if (!input.estimate || input.estimate.outputContract?.format !== "professional_boq") {
    throw new Error("Estimate PDF requires a structured GlobalEstimateResult.");
  }
  const viewModel = buildEstimatePdfViewModel(input);
  const pdf = renderEstimatePdfDocument(viewModel);
  const validation = validateEstimatePdf({
    pdf: pdf.bytes,
    knownWorkKey: input.estimate.work.workKey,
  });
  if (!validation.valid) {
    throw new Error(`Estimate PDF validation failed: ${validation.failures.join(", ")}`);
  }
  return {
    ...pdf,
    validation,
    pdfTrace: {
      pdf_uses_structured_global_estimate_result: true,
      markdown_parsed_as_pdf_truth: false,
      pdf_binary_valid: validation.details.binaryValid,
      pdf_text_extractable: validation.details.textExtractable,
      pdf_cyrillic_readable: validation.details.cyrillicReadable,
      pdf_mojibake_found: validation.details.mojibakeFound,
    },
  };
}
