import type { DeadLetterReason } from "./deadLetter";
import { buildDeadLetterRecord, validateDeadLetterRecord } from "./deadLetter";
import type { IdempotentOperationKind } from "./idempotency";
import type { RetryClass } from "./retryPolicy";
import { isRetryableClass } from "./retryPolicy";
import type { JobType } from "./jobPolicies";
import { getJobPolicy } from "./jobPolicies";
import { validateJobPayloadEnvelope } from "./jobPayloadSafety";

export type JobFailureClass =
  | RetryClass
  | "payload_rejected"
  | "retry_exhausted";

export type JobDeadLetterSummary = {
  jobType: JobType;
  operation: IdempotentOperationKind;
  reason: DeadLetterReason;
  retryable: boolean;
  rawPayloadStored: false;
  piiStored: false;
  payloadSummary: "redacted" | "invalid_payload";
};

const RETRY_CLASSES: readonly RetryClass[] = [
  "network",
  "rate_limit",
  "server_error",
  "external_timeout",
  "validation",
  "permission",
  "business_rule",
  "unknown",
];

const isRetryClass = (value: JobFailureClass): value is RetryClass =>
  RETRY_CLASSES.includes(value as RetryClass);

export function mapJobFailureToDeadLetterReason(failureClass: JobFailureClass): DeadLetterReason {
  switch (failureClass) {
    case "network":
    case "rate_limit":
    case "server_error":
    case "external_timeout":
    case "retry_exhausted":
      return "retry_exhausted";
    case "validation":
    case "payload_rejected":
      return "invalid_payload_shape";
    case "permission":
      return "permission_denied";
    case "business_rule":
      return "business_rule_rejected";
    case "unknown":
      return "unknown";
  }
}

export function buildJobDeadLetterSummary(input: {
  jobType: JobType;
  failureClass: JobFailureClass;
  attempts: number;
  payload: unknown;
  createdAtIso: string;
}): JobDeadLetterSummary | null {
  const policy = getJobPolicy(input.jobType);
  if (!policy) return null;
  const payload = validateJobPayloadEnvelope({
    jobType: input.jobType,
    payload: input.payload,
  });
  const reason = mapJobFailureToDeadLetterReason(input.failureClass);
  const retryable = isRetryClass(input.failureClass)
    ? isRetryableClass(input.failureClass)
    : false;

  const record = buildDeadLetterRecord({
    operation: policy.idempotencyOperation,
    reason,
    attempts: input.attempts,
    createdAtIso: input.createdAtIso,
    errorClass: input.failureClass,
    context: {
      operation: policy.idempotencyOperation,
      reason,
      retry_class: policy.retryClass,
      attempts: input.attempts,
      queue: input.jobType,
    },
  });
  if (!validateDeadLetterRecord(record)) return null;

  return {
    jobType: input.jobType,
    operation: policy.idempotencyOperation,
    reason,
    retryable,
    rawPayloadStored: false,
    piiStored: false,
    payloadSummary: payload.ok ? "redacted" : "invalid_payload",
  };
}
