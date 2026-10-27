import {
  buildSafeIdempotencyKey,
  type IdempotencyKeyInput,
  type SafeIdempotencyKeyResult,
} from "./idempotencyKeySafety";
import { getIdempotencyPolicy } from "./idempotencyPolicies";

export type OfflineReplayIdempotencyEnvelope = {
  actorId: string;
  requestId: string;
  replayMutationId: string;
  operationType: string;
  payload: unknown;
};

export const OFFLINE_REPLAY_IDEMPOTENCY_CONTRACT = Object.freeze({
  operation: "offline.replay.bridge",
  replayMutationIdRequired: true,
  actorIdRequired: true,
  operationTypeRequired: true,
  payloadHashRequired: true,
  duplicateReplayPolicy: "dedupe_by_replay_mutation_id_and_payload_hash",
  liveReplayBehaviorChanged: false,
  defaultEnabled: false,
});

export function buildOfflineReplayIdempotencyKeyInput(
  envelope: OfflineReplayIdempotencyEnvelope,
): IdempotencyKeyInput {
  return {
    actorId: envelope.actorId,
    requestId: envelope.requestId,
    replayMutationId: envelope.replayMutationId,
    operationType: envelope.operationType,
    payload: envelope.payload,
  };
}

export function buildOfflineReplayIdempotencyKey(
  envelope: OfflineReplayIdempotencyEnvelope,
): SafeIdempotencyKeyResult {
  const policy = getIdempotencyPolicy("offline.replay.bridge");
  if (!policy) return { ok: false, reason: "unknown_policy" };
  return buildSafeIdempotencyKey(policy, buildOfflineReplayIdempotencyKeyInput(envelope));
}
