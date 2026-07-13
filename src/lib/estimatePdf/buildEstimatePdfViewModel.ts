import type { EstimatePdfInput, EstimatePdfViewModel } from "./estimatePdfTypes";
import {
  buildStructuredEstimatePayload,
  buildStructuredEstimatePdfViewModel,
} from "../estimateStructuredPipeline";

export function buildEstimatePdfViewModel(input: EstimatePdfInput): EstimatePdfViewModel {
  return buildStructuredEstimatePdfViewModel(
    buildStructuredEstimatePayload(input.estimate),
    input,
  );
}
