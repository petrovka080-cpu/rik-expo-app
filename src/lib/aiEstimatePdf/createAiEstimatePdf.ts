import { buildAiEstimatePdfViewModel } from "./buildAiEstimatePdfViewModel";
import { renderAiEstimatePdfDocument } from "./renderAiEstimatePdfDocument";
import type { AiEstimatePdfDocument, AiEstimatePdfInput } from "./aiEstimatePdfTypes";
import { validateAiEstimatePdf } from "./validateAiEstimatePdf";

export function createAiEstimatePdf(input: AiEstimatePdfInput): AiEstimatePdfDocument {
  const viewModel = buildAiEstimatePdfViewModel(input);
  const rendered = renderAiEstimatePdfDocument(viewModel);
  const validation = validateAiEstimatePdf({
    pdf: rendered.bytes,
    knownWorkKey: input.estimate.work.workKey,
    requiredText: [
      input.estimate.estimateId,
      input.estimate.work.title,
      input.estimate.totals.displayGrandTotal,
      input.estimate.tax.taxLabel,
      viewModel.runtimeTraceId,
    ],
  });
  if (!validation.valid) {
    throw new Error(`AI Estimate PDF validation failed: ${validation.failures.join(", ")}`);
  }
  return {
    ...rendered,
    viewModel,
    validation,
  };
}
