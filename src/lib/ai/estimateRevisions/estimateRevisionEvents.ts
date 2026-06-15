import type {
  EstimateRevisionActor,
  EstimateRevisionEvent,
  EstimateRevisionEventType,
} from "./estimateRevisionTypes";

export function createEstimateRevisionEvent(input: {
  revision_id: string;
  estimate_id: string;
  event_type: EstimateRevisionEventType;
  event_index: number;
  row_key?: string;
  before_value?: unknown;
  after_value?: unknown;
  actor: EstimateRevisionActor;
  actor_id?: string;
  reason_ru?: string;
  created_at?: string;
}): EstimateRevisionEvent {
  const createdAt = input.created_at ?? new Date().toISOString();
  return {
    event_id: `estimate_revision_event:${input.revision_id}:${input.event_index}`,
    revision_id: input.revision_id,
    estimate_id: input.estimate_id,
    event_type: input.event_type,
    row_key: input.row_key,
    before_value: input.before_value,
    after_value: input.after_value,
    actor: input.actor,
    actor_id: input.actor_id,
    reason_ru: input.reason_ru,
    created_at: createdAt,
  };
}
