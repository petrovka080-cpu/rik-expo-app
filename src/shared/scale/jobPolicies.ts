import type { BffMutationOperation } from "./bffMutationHandlers";
import type { CacheInvalidationOperation } from "./cacheInvalidation";
import { getInvalidationTagsForOperation } from "./cacheInvalidation";
import type { IdempotentOperationKind } from "./idempotency";
import { getIdempotencyContract } from "./idempotency";
import {
  getIdempotencyPolicyForJobType,
  type IdempotencyPolicyOperation,
} from "./idempotencyPolicies";
import type { RateLimitedOperation } from "./rateLimits";
import { getRateLimitPolicy } from "./rateLimits";
import {
  getRateEnforcementPolicyForJobType,
  type RateLimitEnforcementOperation,
} from "./rateLimitPolicies";
import type { RetryClass, RetryPolicy } from "./retryPolicy";
import { getRetryPolicy } from "./retryPolicy";

export type JobType =
  | "proposal.submit.followup"
  | "warehouse.receive.postprocess"
  | "accountant.payment.postprocess"
  | "director.approval.postprocess"
  | "request.item.update.postprocess"
  | "pdf.document.generate"
  | "director.report.generate"
  | "notification.fanout"
  | "cache.readmodel.refresh"
  | "offline.replay.bridge";

export type JobPriority = "low" | "normal" | "high";

export type JobPiiPolicy = "reject_pii" | "redact_pii";

export type JobPolicy = {
  jobType: JobType;
  priority: JobPriority;
  maxAttempts: number;
  retryClass: RetryClass;
  retryPolicy: RetryPolicy;
  deadLetterPolicy: {
    enabled: true;
    rawPayloadStored: false;
    piiStored: false;
  };
  idempotencyOperation: IdempotentOperationKind;
  idempotencyRequired: true;
  idempotencyContractPresent: boolean;
  idempotencyPolicyOperation: IdempotencyPolicyOperation | null;
  idempotencyPolicyDefaultEnabled: false;
  idempotencyPersistenceEnabledByDefault: false;
  rateLimitOperation: RateLimitedOperation;
  rateLimitKey: string;
  rateLimitPolicyPresent: boolean;
  rateLimitEnforcementOperation: RateLimitEnforcementOperation | null;
  rateLimitEnforcementDefaultEnabled: false;
  rateLimitEnforcementEnabledByDefault: false;
  payloadMaxBytes: number;
  piiPolicy: JobPiiPolicy;
  defaultEnabled: false;
  cacheInvalidationTags: readonly string[];
};

const JOB_PAYLOAD_SMALL_BYTES = 8_192;
const JOB_PAYLOAD_MEDIUM_BYTES = 16_384;
const JOB_PAYLOAD_DOCUMENT_BYTES = 32_768;

const policy = (input: {
  jobType: JobType;
  priority: JobPriority;
  retryClass: RetryClass;
  idempotencyOperation: IdempotentOperationKind;
  rateLimitOperation: RateLimitedOperation;
  payloadMaxBytes: number;
  piiPolicy?: JobPiiPolicy;
  invalidationOperation?: CacheInvalidationOperation;
  invalidationTags?: readonly string[];
}): JobPolicy => ({
  jobType: input.jobType,
  priority: input.priority,
  maxAttempts: getRetryPolicy(input.retryClass).maxAttempts,
  retryClass: input.retryClass,
  retryPolicy: getRetryPolicy(input.retryClass),
  deadLetterPolicy: {
    enabled: true,
    rawPayloadStored: false,
    piiStored: false,
  },
  idempotencyOperation: input.idempotencyOperation,
  idempotencyRequired: true,
  idempotencyContractPresent: getIdempotencyContract(input.idempotencyOperation) !== null,
  idempotencyPolicyOperation: getIdempotencyPolicyForJobType(input.jobType)?.operation ?? null,
  idempotencyPolicyDefaultEnabled: false,
  idempotencyPersistenceEnabledByDefault: false,
  rateLimitOperation: input.rateLimitOperation,
  rateLimitKey: `${input.rateLimitOperation}:opaque-subject`,
  rateLimitPolicyPresent: getRateLimitPolicy(input.rateLimitOperation) !== null,
  rateLimitEnforcementOperation: getRateEnforcementPolicyForJobType(input.jobType)?.operation ?? null,
  rateLimitEnforcementDefaultEnabled: false,
  rateLimitEnforcementEnabledByDefault: false,
  payloadMaxBytes: input.payloadMaxBytes,
  piiPolicy: input.piiPolicy ?? "reject_pii",
  defaultEnabled: false,
  cacheInvalidationTags: input.invalidationTags ?? (input.invalidationOperation
    ? getInvalidationTagsForOperation(input.invalidationOperation)
    : []),
});

export const JOB_POLICY_REGISTRY: readonly JobPolicy[] = Object.freeze([
  policy({
    jobType: "proposal.submit.followup",
    priority: "high",
    retryClass: "server_error",
    idempotencyOperation: "proposal.submit",
    rateLimitOperation: "proposal.submit",
    payloadMaxBytes: JOB_PAYLOAD_MEDIUM_BYTES,
    invalidationOperation: "proposal.submit",
  }),
  policy({
    jobType: "warehouse.receive.postprocess",
    priority: "high",
    retryClass: "server_error",
    idempotencyOperation: "warehouse.receive.apply",
    rateLimitOperation: "warehouse.receive.apply",
    payloadMaxBytes: JOB_PAYLOAD_MEDIUM_BYTES,
    invalidationOperation: "warehouse.receive.apply",
  }),
  policy({
    jobType: "accountant.payment.postprocess",
    priority: "high",
    retryClass: "external_timeout",
    idempotencyOperation: "accountant.payment.apply",
    rateLimitOperation: "accountant.payment.apply",
    payloadMaxBytes: JOB_PAYLOAD_SMALL_BYTES,
    invalidationOperation: "accountant.payment.apply",
  }),
  policy({
    jobType: "director.approval.postprocess",
    priority: "high",
    retryClass: "server_error",
    idempotencyOperation: "director.approval.apply",
    rateLimitOperation: "director.approval.apply",
    payloadMaxBytes: JOB_PAYLOAD_SMALL_BYTES,
    invalidationOperation: "director.approval.apply",
  }),
  policy({
    jobType: "request.item.update.postprocess",
    priority: "normal",
    retryClass: "server_error",
    idempotencyOperation: "request.item.update",
    rateLimitOperation: "request.item.update",
    payloadMaxBytes: JOB_PAYLOAD_SMALL_BYTES,
    invalidationOperation: "request.item.update",
  }),
  policy({
    jobType: "pdf.document.generate",
    priority: "normal",
    retryClass: "external_timeout",
    idempotencyOperation: "pdf.report.generate",
    rateLimitOperation: "pdf.report.generate",
    payloadMaxBytes: JOB_PAYLOAD_DOCUMENT_BYTES,
  }),
  policy({
    jobType: "director.report.generate",
    priority: "normal",
    retryClass: "server_error",
    idempotencyOperation: "pdf.report.generate",
    rateLimitOperation: "pdf.report.generate",
    payloadMaxBytes: JOB_PAYLOAD_DOCUMENT_BYTES,
  }),
  policy({
    jobType: "notification.fanout",
    priority: "low",
    retryClass: "rate_limit",
    idempotencyOperation: "notification.fanout",
    rateLimitOperation: "notification.fanout",
    payloadMaxBytes: JOB_PAYLOAD_SMALL_BYTES,
    piiPolicy: "redact_pii",
    invalidationOperation: "notification.fanout",
  }),
  policy({
    jobType: "cache.readmodel.refresh",
    priority: "low",
    retryClass: "server_error",
    idempotencyOperation: "cache.readModel.refresh",
    rateLimitOperation: "cache.readModel.refresh",
    payloadMaxBytes: JOB_PAYLOAD_MEDIUM_BYTES,
    invalidationTags: ["cache", "readmodel", "proposal", "marketplace", "warehouse", "accountant", "director"],
  }),
  policy({
    jobType: "offline.replay.bridge",
    priority: "high",
    retryClass: "network",
    idempotencyOperation: "offline.replay.bridge",
    rateLimitOperation: "offline.replay.bridge",
    payloadMaxBytes: JOB_PAYLOAD_MEDIUM_BYTES,
  }),
] as const);

export const BFF_MUTATION_JOB_POLICY_MAP: Record<BffMutationOperation, JobType> = Object.freeze({
  "proposal.submit": "proposal.submit.followup",
  "warehouse.receive.apply": "warehouse.receive.postprocess",
  "accountant.payment.apply": "accountant.payment.postprocess",
  "director.approval.apply": "director.approval.postprocess",
  "request.item.update": "request.item.update.postprocess",
});

export function getJobPolicy(jobType: JobType): JobPolicy | null {
  return JOB_POLICY_REGISTRY.find((entry) => entry.jobType === jobType) ?? null;
}

export function getJobPolicyForBffMutationOperation(
  operation: BffMutationOperation,
): JobPolicy | null {
  return getJobPolicy(BFF_MUTATION_JOB_POLICY_MAP[operation]);
}

export function validateJobPolicy(policyToValidate: JobPolicy): boolean {
  return (
    policyToValidate.defaultEnabled === false &&
    policyToValidate.idempotencyRequired === true &&
    policyToValidate.idempotencyContractPresent === true &&
    policyToValidate.idempotencyPolicyDefaultEnabled === false &&
    policyToValidate.idempotencyPersistenceEnabledByDefault === false &&
    policyToValidate.rateLimitPolicyPresent === true &&
    policyToValidate.rateLimitEnforcementDefaultEnabled === false &&
    policyToValidate.rateLimitEnforcementEnabledByDefault === false &&
    policyToValidate.deadLetterPolicy.enabled === true &&
    policyToValidate.deadLetterPolicy.rawPayloadStored === false &&
    policyToValidate.deadLetterPolicy.piiStored === false &&
    policyToValidate.payloadMaxBytes > 0 &&
    policyToValidate.payloadMaxBytes <= JOB_PAYLOAD_DOCUMENT_BYTES &&
    policyToValidate.maxAttempts === policyToValidate.retryPolicy.maxAttempts
  );
}
