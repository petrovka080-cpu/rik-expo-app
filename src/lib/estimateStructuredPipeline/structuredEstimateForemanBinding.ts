import { buildAiEstimatePdfActions } from "../ai/estimatePdf/estimatePdfGuard";
import { buildAiEstimatePdfSourceFromGlobalEstimate } from "../ai/estimatePdf/estimatePdfGlobalResultAdapter";
import type { StructuredEstimatePayload } from "./structuredEstimateTypes";
import { buildEstimatePresentationViewModel } from "./buildEstimatePresentationViewModel";

export function buildStructuredEstimateForemanBinding(payload: StructuredEstimatePayload, userId?: string) {
  const presentation = buildEstimatePresentationViewModel(payload);
  const source = buildAiEstimatePdfSourceFromGlobalEstimate(payload.sourceEstimate, {
    userId,
    sourceType: "global_estimate_result",
  });
  return {
    payload,
    presentation,
    estimatePdfSource: source,
    actions: buildAiEstimatePdfActions(source),
    rows: presentation.rows,
    fakeGreenClaimed: false as const,
  };
}
