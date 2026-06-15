import { createEstimateRevisionEvent } from "./estimateRevisionEvents";
import { assertEstimateRevisionStateIntegrity } from "./estimateRevisionIntegrityGuard";
import { getEstimateRevisionById } from "./estimateRevisionConcurrency";
import type {
  EstimateRevisionApprovalFreeze,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

export function approveEstimateRevisionState(input: {
  state: EstimateRevisionState;
  revision_id?: string;
  actor_id?: string;
  created_at?: string;
}): EstimateRevisionState {
  const state = input.state;
  const revision = getEstimateRevisionById(state, input.revision_id ?? state.current_revision_id);
  const createdAt = input.created_at ?? new Date().toISOString();
  const approved = {
    ...revision,
    status: "APPROVED" as const,
    source: "APPROVED_FREEZE" as const,
    immutable: true,
  };
  const freeze: EstimateRevisionApprovalFreeze = {
    freeze_id: `estimate_revision_freeze:${approved.revision_id}`,
    approved_revision_id: approved.revision_id,
    approved_snapshot_id: approved.snapshot_id,
    approved_full_snapshot_hash: approved.full_snapshot_hash,
    approved_rows_hash: approved.rows_hash,
    approved_totals_hash: approved.totals_hash,
    actor_id: input.actor_id,
    created_at: createdAt,
    immutable: true,
    fake_green_claimed: false,
  };
  const next: EstimateRevisionState = {
    ...state,
    current_revision_id: approved.revision_id,
    revisions: state.revisions.map((candidate) =>
      candidate.revision_id === approved.revision_id ? approved : candidate,
    ),
    approval_freezes: [
      freeze,
      ...state.approval_freezes.filter((candidate) => candidate.approved_revision_id !== approved.revision_id),
    ],
    events: [
      ...state.events,
      createEstimateRevisionEvent({
        revision_id: approved.revision_id,
        estimate_id: approved.estimate_id,
        event_type: "APPROVED",
        event_index: state.events.length + 1,
        actor: "user",
        actor_id: input.actor_id,
        after_value: { approved_revision_id: approved.revision_id, immutable: true },
        reason_ru: "\u0421\u043c\u0435\u0442\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430 \u0438 \u0437\u0430\u043c\u043e\u0440\u043e\u0436\u0435\u043d\u0430.",
        created_at: createdAt,
      }),
    ],
  };
  assertEstimateRevisionStateIntegrity(next);
  return next;
}

export function isEstimateRevisionFrozen(state: EstimateRevisionState, revisionId: string): boolean {
  return state.approval_freezes.some((freeze) => freeze.approved_revision_id === revisionId);
}
