import type { BffMutationOperation } from "./bffMutationHandlers";
import type { IdempotentOperationKind } from "./idempotency";
import type { JobType } from "./jobPolicies";

export type IdempotencyPolicyOperation =
  | BffMutationOperation
  | "offline.replay.bridge"
  | "proposal.submit.followup"
  | "warehouse.receive.postprocess"
  | "accountant.payment.postprocess"
  | "director.approval.postprocess";

export type IdempotencyPolicy = {
  operation: IdempotencyPolicyOperation;
  contractOperation: IdempotentOperationKind;
  keyParts: readonly string[];
  ttlMs: number;
  dedupeWindowMs: number;
  requiresActorId: true;
  requiresRequestId: true;
  requiresPayloadHash: true;
  requiresReplayMutationId: boolean;
  allowRetry: boolean;
  commitOnSuccess: true;
  failOnError: true;
  strict: boolean;
  defaultEnabled: false;
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

const strictPolicy = (input: {
  operation: IdempotencyPolicyOperation;
  contractOperation: IdempotentOperationKind;
  keyParts: readonly string[];
  ttlMs?: number;
  dedupeWindowMs?: number;
  requiresReplayMutationId?: boolean;
  allowRetry?: boolean;
}): IdempotencyPolicy => ({
  operation: input.operation,
  contractOperation: input.contractOperation,
  keyParts: input.keyParts,
  ttlMs: input.ttlMs ?? DAY_MS,
  dedupeWindowMs: input.dedupeWindowMs ?? DAY_MS,
  requiresActorId: true,
  requiresRequestId: true,
  requiresPayloadHash: true,
  requiresReplayMutationId: input.requiresReplayMutationId === true,
  allowRetry: input.allowRetry ?? true,
  commitOnSuccess: true,
  failOnError: true,
  strict: true,
  defaultEnabled: false,
});

export const IDEMPOTENCY_POLICY_REGISTRY: readonly IdempotencyPolicy[] = Object.freeze([
  strictPolicy({
    operation: "proposal.submit",
    contractOperation: "proposal.submit",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
  }),
  strictPolicy({
    operation: "warehouse.receive.apply",
    contractOperation: "warehouse.receive.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
  }),
  strictPolicy({
    operation: "accountant.payment.apply",
    contractOperation: "accountant.payment.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
  }),
  strictPolicy({
    operation: "director.approval.apply",
    contractOperation: "director.approval.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
  }),
  strictPolicy({
    operation: "request.item.update",
    contractOperation: "request.item.update",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
  }),
  strictPolicy({
    operation: "offline.replay.bridge",
    contractOperation: "offline.replay.bridge",
    keyParts: ["operation", "actorId", "requestId", "replayMutationId", "operationType", "payloadHash"],
    requiresReplayMutationId: true,
    ttlMs: DAY_MS * 2,
    dedupeWindowMs: DAY_MS,
  }),
  strictPolicy({
    operation: "proposal.submit.followup",
    contractOperation: "proposal.submit",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
    ttlMs: DAY_MS,
    dedupeWindowMs: HOUR_MS * 6,
  }),
  strictPolicy({
    operation: "warehouse.receive.postprocess",
    contractOperation: "warehouse.receive.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
    ttlMs: DAY_MS,
    dedupeWindowMs: HOUR_MS * 6,
  }),
  strictPolicy({
    operation: "accountant.payment.postprocess",
    contractOperation: "accountant.payment.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
    ttlMs: DAY_MS,
    dedupeWindowMs: HOUR_MS * 6,
  }),
  strictPolicy({
    operation: "director.approval.postprocess",
    contractOperation: "director.approval.apply",
    keyParts: ["operation", "actorId", "requestId", "payloadHash"],
    ttlMs: DAY_MS,
    dedupeWindowMs: HOUR_MS * 6,
  }),
] as const);

export const BFF_MUTATION_IDEMPOTENCY_POLICY_MAP: Record<
  BffMutationOperation,
  IdempotencyPolicyOperation
> = Object.freeze({
  "proposal.submit": "proposal.submit",
  "warehouse.receive.apply": "warehouse.receive.apply",
  "accountant.payment.apply": "accountant.payment.apply",
  "director.approval.apply": "director.approval.apply",
  "request.item.update": "request.item.update",
});

export const JOB_IDEMPOTENCY_POLICY_MAP: Partial<Record<JobType, IdempotencyPolicyOperation>> = Object.freeze({
  "proposal.submit.followup": "proposal.submit.followup",
  "warehouse.receive.postprocess": "warehouse.receive.postprocess",
  "accountant.payment.postprocess": "accountant.payment.postprocess",
  "director.approval.postprocess": "director.approval.postprocess",
  "offline.replay.bridge": "offline.replay.bridge",
});

export function getIdempotencyPolicy(
  operation: IdempotencyPolicyOperation,
): IdempotencyPolicy | null {
  return IDEMPOTENCY_POLICY_REGISTRY.find((policy) => policy.operation === operation) ?? null;
}

export function getIdempotencyPolicyForBffMutationOperation(
  operation: BffMutationOperation,
): IdempotencyPolicy | null {
  return getIdempotencyPolicy(BFF_MUTATION_IDEMPOTENCY_POLICY_MAP[operation]);
}

export function getIdempotencyPolicyForJobType(jobType: JobType): IdempotencyPolicy | null {
  const operation = JOB_IDEMPOTENCY_POLICY_MAP[jobType];
  return operation ? getIdempotencyPolicy(operation) : null;
}

export function validateIdempotencyPolicy(policy: IdempotencyPolicy): boolean {
  return (
    policy.defaultEnabled === false &&
    policy.strict === true &&
    policy.requiresActorId === true &&
    policy.requiresRequestId === true &&
    policy.requiresPayloadHash === true &&
    policy.commitOnSuccess === true &&
    policy.failOnError === true &&
    policy.ttlMs > 0 &&
    policy.dedupeWindowMs > 0 &&
    policy.dedupeWindowMs <= policy.ttlMs &&
    policy.keyParts.includes("operation") &&
    policy.keyParts.includes("actorId") &&
    policy.keyParts.includes("requestId") &&
    policy.keyParts.includes("payloadHash")
  );
}
