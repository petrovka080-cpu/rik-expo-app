import { createEstimateRevisionEvent } from "./estimateRevisionEvents";
import { getEstimateRevisionById } from "./estimateRevisionConcurrency";
import type {
  EstimateRevisionRequestBinding,
  EstimateRevisionState,
} from "./estimateRevisionTypes";

export function bindEstimateRevisionToRequestPayload(input: {
  state: EstimateRevisionState;
  revision_id?: string;
  request_payload_id: string;
  actor_id?: string;
  created_at?: string;
}): { state: EstimateRevisionState; binding: EstimateRevisionRequestBinding } {
  const revision = getEstimateRevisionById(input.state, input.revision_id ?? input.state.current_revision_id);
  const createdAt = input.created_at ?? new Date().toISOString();
  const binding: EstimateRevisionRequestBinding = {
    request_payload_id: input.request_payload_id,
    request_revision_id: revision.revision_id,
    request_snapshot_id: revision.snapshot_id,
    request_rows_hash: revision.rows_hash,
    request_totals_hash: revision.totals_hash,
    request_recalculated_separately: false,
    created_at: createdAt,
    fake_green_claimed: false,
  };
  return {
    binding,
    state: {
      ...input.state,
      request_bindings: [
        binding,
        ...input.state.request_bindings.filter((candidate) => candidate.request_payload_id !== input.request_payload_id),
      ],
      events: [
        ...input.state.events,
        createEstimateRevisionEvent({
          revision_id: revision.revision_id,
          estimate_id: revision.estimate_id,
          event_type: "REQUEST_SUBMITTED",
          event_index: input.state.events.length + 1,
          actor: "user",
          actor_id: input.actor_id,
          after_value: binding,
          reason_ru: "\u0417\u0430\u044f\u0432\u043a\u0430 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d\u0430 \u043a \u0440\u0435\u0432\u0438\u0437\u0438\u0438.",
          created_at: createdAt,
        }),
      ],
    },
  };
}
