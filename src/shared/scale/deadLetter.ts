import type { IdempotentOperationKind } from "./idempotency";
import { isKnownIdempotentOperationKind } from "./idempotency";
import { redactBffText } from "./bffSafety";

export type DeadLetterReason =
  | "retry_exhausted"
  | "invalid_payload_shape"
  | "external_dependency_failed"
  | "permission_denied"
  | "business_rule_rejected"
  | "unknown";

export type DeadLetterContext = Record<string, string | number | boolean | null | undefined>;

export type DeadLetterRecord = {
  operation: IdempotentOperationKind;
  reason: DeadLetterReason;
  attempts: number;
  createdAtIso: string;
  errorClass: string;
  redactedContext: Record<string, string | number | boolean | null>;
  rawPayloadStored: false;
  piiStored: false;
};

export type DeadLetterBoundaryConfig = {
  enabled: boolean;
  shadowMode?: boolean | null;
};

const DEAD_LETTER_REASONS: readonly DeadLetterReason[] = [
  "retry_exhausted",
  "invalid_payload_shape",
  "external_dependency_failed",
  "permission_denied",
  "business_rule_rejected",
  "unknown",
] as const;

const SAFE_CONTEXT_KEYS = new Set([
  "operation",
  "reason",
  "retry_class",
  "error_class",
  "attempts",
  "flow",
  "role",
  "queue",
  "cache_model",
  "dry_run",
]);

export function isDeadLetterBoundaryEnabled(config: DeadLetterBoundaryConfig): boolean {
  return config.enabled === true && config.shadowMode === true;
}

export function isKnownDeadLetterReason(value: unknown): value is DeadLetterReason {
  return DEAD_LETTER_REASONS.includes(value as DeadLetterReason);
}

export function sanitizeDeadLetterContext(context?: DeadLetterContext): Record<string, string | number | boolean | null> {
  const safe: Record<string, string | number | boolean | null> = {};
  if (!context) return safe;

  for (const [key, value] of Object.entries(context)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!SAFE_CONTEXT_KEYS.has(normalizedKey) || value === undefined) continue;
    safe[normalizedKey] = typeof value === "string" ? redactBffText(value) : value;
  }

  return safe;
}

export function buildDeadLetterRecord(input: {
  operation: IdempotentOperationKind;
  reason: DeadLetterReason;
  attempts: number;
  createdAtIso: string;
  errorClass: string;
  context?: DeadLetterContext;
}): DeadLetterRecord {
  if (!isKnownIdempotentOperationKind(input.operation)) {
    throw new Error("Unknown dead-letter operation");
  }
  if (!isKnownDeadLetterReason(input.reason)) {
    throw new Error("Unknown dead-letter reason");
  }
  const attempts = Math.max(1, Math.trunc(Number(input.attempts) || 1));
  const parsedDate = Date.parse(input.createdAtIso);
  if (!Number.isFinite(parsedDate)) {
    throw new Error("Invalid dead-letter timestamp");
  }

  return {
    operation: input.operation,
    reason: input.reason,
    attempts,
    createdAtIso: new Date(parsedDate).toISOString(),
    errorClass: redactBffText(input.errorClass).slice(0, 80) || "unknown",
    redactedContext: sanitizeDeadLetterContext(input.context),
    rawPayloadStored: false,
    piiStored: false,
  };
}

export function validateDeadLetterRecord(record: DeadLetterRecord): boolean {
  return (
    isKnownIdempotentOperationKind(record.operation) &&
    isKnownDeadLetterReason(record.reason) &&
    record.attempts > 0 &&
    Number.isFinite(Date.parse(record.createdAtIso)) &&
    record.rawPayloadStored === false &&
    record.piiStored === false
  );
}
