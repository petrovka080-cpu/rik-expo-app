import type {
  EstimateRevisionConflict,
  EstimateRevisionSnapshot,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

export function getEstimateRevisionById(state: EstimateRevisionState, revisionId: string): EstimateRevisionSnapshot {
  const revision = state.revisions.find((candidate) => candidate.revision_id === revisionId);
  if (!revision) throw new Error(`ESTIMATE_REVISION_NOT_FOUND:${revisionId}`);
  return revision;
}

export function getCurrentEstimateRevision(state: EstimateRevisionState): EstimateRevisionSnapshot {
  return getEstimateRevisionById(state, state.current_revision_id);
}

export function detectEstimateRevisionConflict(
  state: EstimateRevisionState,
  baseRevisionId: string | null | undefined,
): EstimateRevisionConflict | null {
  if (!baseRevisionId || baseRevisionId === state.current_revision_id) return null;
  const stale = getEstimateRevisionById(state, baseRevisionId);
  const current = getCurrentEstimateRevision(state);
  return {
    status: "REVISION_CONFLICT",
    stale_base_revision: stale.version_number,
    stale_base_revision_id: stale.revision_id,
    current_revision: current.version_number,
    current_revision_id: current.revision_id,
    silent_overwrite: false,
    merge_or_reload_prompt_required: true,
    fake_green_claimed: false,
  };
}

export function assertEstimateRevisionCanWrite(
  state: EstimateRevisionState,
  baseRevisionId: string | null | undefined,
): void {
  const conflict = detectEstimateRevisionConflict(state, baseRevisionId);
  if (conflict) {
    throw new Error(`ESTIMATE_REVISION_CONFLICT:${conflict.stale_base_revision}->${conflict.current_revision}`);
  }
}
