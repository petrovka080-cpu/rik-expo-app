import type { IdempotentOperationKind, IdempotencyContract } from "./idempotency";
import { getIdempotencyContract } from "./idempotency";
import type { JobType } from "./jobPolicies";
import { getJobPolicy } from "./jobPolicies";

export type JobIdempotencyRequirement = {
  jobType: JobType;
  idempotencyOperation: IdempotentOperationKind;
  required: true;
  persistenceEnabledByDefault: false;
  contract: Pick<
    IdempotencyContract,
    "operation" | "scope" | "keySource" | "ttlSeconds" | "storesRawPayload" | "piiAllowedInKey"
  >;
};

export const JOB_IDEMPOTENCY_REQUIRED_TYPES: readonly JobType[] = Object.freeze([
  "proposal.submit.followup",
  "warehouse.receive.postprocess",
  "accountant.payment.postprocess",
  "director.approval.postprocess",
  "request.item.update.postprocess",
  "offline.replay.bridge",
] as const);

export function getJobIdempotencyRequirement(
  jobType: JobType,
): JobIdempotencyRequirement | null {
  const policy = getJobPolicy(jobType);
  if (!policy) return null;
  const contract = getIdempotencyContract(policy.idempotencyOperation);
  if (!contract) return null;

  return {
    jobType,
    idempotencyOperation: policy.idempotencyOperation,
    required: true,
    persistenceEnabledByDefault: false,
    contract: {
      operation: contract.operation,
      scope: contract.scope,
      keySource: contract.keySource,
      ttlSeconds: contract.ttlSeconds,
      storesRawPayload: contract.storesRawPayload,
      piiAllowedInKey: contract.piiAllowedInKey,
    },
  };
}

export function jobRequiresIdempotency(jobType: JobType): boolean {
  return getJobIdempotencyRequirement(jobType)?.required === true;
}
