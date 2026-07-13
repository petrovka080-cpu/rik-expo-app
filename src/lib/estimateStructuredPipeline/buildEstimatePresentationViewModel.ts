import type { EstimatePresentationViewModel } from "../ai/estimatePresentation";
import type { GlobalEstimateResult } from "../ai/globalEstimate/globalEstimateTypes";
import { buildStructuredEstimatePayload } from "./buildStructuredEstimatePayload";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";

function isStructuredEstimatePayload(input: GlobalEstimateResult | StructuredEstimatePayload): input is StructuredEstimatePayload {
  return (input as StructuredEstimatePayload).version === "structured-estimate-v1";
}

export function buildEstimatePresentationViewModel(
  input: GlobalEstimateResult | StructuredEstimatePayload,
): EstimatePresentationViewModel {
  if (isStructuredEstimatePayload(input)) {
    return input.presentation;
  }
  return buildStructuredEstimatePayload(input).presentation;
}

export function buildEstimatePresentationRows(input: GlobalEstimateResult | StructuredEstimatePayload) {
  return buildEstimatePresentationViewModel(input).rows;
}
