import type { EstimateDraftRevision } from "../estimateDraftRevisionContract";
import { recalculateEstimateDraftRevision } from "../recalculateEstimateDraftRevision";
import type { UserParamPatch } from "../validateUserParamPatch";

export function applyAiEstimateRevisionPatch(input: {
  revision: EstimateDraftRevision;
  patch: UserParamPatch;
  createdAt?: string;
  revisionIndex?: number;
}) {
  const beforeJson = JSON.stringify(input.revision);
  const result = recalculateEstimateDraftRevision(input.revision, input.patch, {
    createdAt: input.createdAt,
    revisionIndex: input.revisionIndex,
  });
  if (JSON.stringify(input.revision) !== beforeJson) {
    throw new Error("AI_ESTIMATE_REVISION_MUTATED_IN_PLACE");
  }
  return result;
}
