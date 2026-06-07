import {
  buildAiEstimatePdfActions,
  buildAiEstimatePdfSourceFromGlobalEstimate,
} from "../ai/estimatePdf";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";

export function buildStructuredEstimateForemanBinding(payload: StructuredEstimatePayload, userId?: string) {
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(payload.sourceEstimate, {
    userId,
    sourceType: "global_estimate_result",
  });
  return {
    payload,
    presentation: payload.presentation,
    estimatePdfSource: source,
    actions: buildAiEstimatePdfActions(source),
    rows: payload.presentation.rows,
    fakeGreenClaimed: false as const,
  };
}
