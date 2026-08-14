import type { EstimatePdfInput, EstimatePdfViewModel } from "./estimatePdfTypes";
import { buildStructuredEstimatePayload } from "../estimateStructuredPipeline/buildStructuredEstimatePayload";
import { buildStructuredEstimatePdfViewModel } from "../estimateStructuredPipeline/structuredEstimatePdfBinding";

export function buildEstimatePdfViewModel(input: EstimatePdfInput): EstimatePdfViewModel {
  return buildStructuredEstimatePdfViewModel(
    buildStructuredEstimatePayload(input.estimate),
    input,
  );
}
