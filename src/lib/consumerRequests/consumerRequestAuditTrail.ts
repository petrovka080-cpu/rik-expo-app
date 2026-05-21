import type { ConsumerRepairRequestEvent } from "./consumerRequestTypes";

const id = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function createConsumerRepairEvent(input: {
  requestDraftId: string;
  eventType: string;
  actorUserId?: string | null;
  actorType?: ConsumerRepairRequestEvent["actorType"];
  payload?: Record<string, unknown>;
}): ConsumerRepairRequestEvent {
  return {
    id: id("consumer_event"),
    requestDraftId: input.requestDraftId,
    eventType: input.eventType,
    actorUserId: input.actorUserId ?? null,
    actorType: input.actorType ?? "consumer",
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
}

export function auditConsumerRepairRequestEvent(input: {
  requestId: string;
  actorUserId?: string | null;
  eventType: string;
  actorType?: ConsumerRepairRequestEvent["actorType"];
  payload?: Record<string, unknown>;
}): ConsumerRepairRequestEvent {
  return createConsumerRepairEvent({
    requestDraftId: input.requestId,
    actorUserId: input.actorUserId,
    actorType: input.actorType,
    eventType: input.eventType,
    payload: input.payload,
  });
}
