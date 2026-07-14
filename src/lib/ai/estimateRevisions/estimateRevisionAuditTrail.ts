import type { EstimateRevisionEvent, EstimateRevisionState } from "./estimateRevisionTypes";

export function listEstimateRevisionAuditTrail(state: EstimateRevisionState, revisionId?: string): EstimateRevisionEvent[] {
  return state.events
    .filter((event) => !revisionId || event.revision_id === revisionId)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.event_id.localeCompare(b.event_id));
}

export function estimateRevisionAuditTrailComplete(state: EstimateRevisionState): boolean {
  const revisionIds = new Set(state.revisions.map((revision) => revision.revision_id));
  if (state.events.some((event) => !revisionIds.has(event.revision_id))) return false;
  for (const revision of state.revisions) {
    if (!state.events.some((event) => event.revision_id === revision.revision_id)) return false;
  }
  return state.fake_green_claimed === false && state.events.every((event) => event.created_at && event.actor);
}
