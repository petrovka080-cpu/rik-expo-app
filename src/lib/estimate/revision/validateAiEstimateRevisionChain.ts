import type { EstimateDraftRevisionState } from "../estimateDraftRevisionContract";
import type { AiEstimateRevisionChainValidation } from "./AiEstimateRevisionEngine";

export function validateAiEstimateRevisionChain(state: EstimateDraftRevisionState): AiEstimateRevisionChainValidation {
  const ids = new Set<string>();
  let chainPreserved = state.revisions.length > 0 && state.currentRevisionId === state.revisions.at(-1)?.revisionId;
  for (const [index, revision] of state.revisions.entries()) {
    if (ids.has(revision.revisionId)) chainPreserved = false;
    ids.add(revision.revisionId);
    if (index === 0 && revision.previousRevisionId !== null) chainPreserved = false;
    if (index > 0 && revision.previousRevisionId !== state.revisions[index - 1]?.revisionId) chainPreserved = false;
  }
  const approvedHistoryUsesRevisionIds = state.revisions.every((revision) => Boolean(revision.revisionId));
  const blockingReasons = [
    chainPreserved ? "" : "revision_chain_not_preserved",
    approvedHistoryUsesRevisionIds ? "" : "revision_id_missing",
  ].filter(Boolean);
  return {
    ok: blockingReasons.length === 0,
    revisionChainPreserved: chainPreserved,
    approvedHistoryUsesRevisionIds,
    blockingReasons,
  };
}
