import { createEstimateRevisionFromSnapshot } from "./estimateRevisionStore";
import { getEstimateRevisionById } from "./estimateRevisionConcurrency";
import type { EstimateRevisionState } from "./estimateRevisionTypes";

export function restoreEstimateRevisionAsNewRevision(input: {
  state: EstimateRevisionState;
  source_revision_id: string;
  actor_id?: string;
  created_at?: string;
}): EstimateRevisionState {
  const source = getEstimateRevisionById(input.state, input.source_revision_id);
  return createEstimateRevisionFromSnapshot(input.state, {
    base_revision_id: input.state.current_revision_id,
    editable_estimate_snapshot: source.editable_estimate_snapshot,
    source: "RESTORED_FROM_REVISION",
    status: "RESTORED",
    actor: "user",
    actor_id: input.actor_id,
    event_type: "REVISION_RESTORED",
    before_value: { current_revision_id: input.state.current_revision_id },
    after_value: { restored_from_revision_id: input.source_revision_id },
    reason_ru: "\u0421\u043c\u0435\u0442\u0430 \u0432\u0435\u0440\u043d\u0443\u0442\u0430 \u0438\u0437 \u043f\u0440\u043e\u0448\u043b\u043e\u0439 \u0440\u0435\u0432\u0438\u0437\u0438\u0438.",
    created_at: input.created_at,
  });
}
