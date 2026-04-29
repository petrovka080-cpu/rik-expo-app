import {
  getIdempotencyPolicy,
  type IdempotencyPolicy,
  type IdempotencyPolicyOperation,
} from "./idempotencyPolicies";

export type IdempotencyKeySafetyError =
  | "unknown_policy"
  | "missing_actor_id"
  | "missing_request_id"
  | "missing_replay_mutation_id"
  | "missing_operation_type"
  | "missing_payload_hash"
  | "forbidden_field"
  | "sensitive_value"
  | "key_too_long";

export type SafeIdempotencyKeyResult =
  | {
      ok: true;
      key: string;
      payloadHash: string;
      keyLength: number;
    }
  | {
      ok: false;
      reason: IdempotencyKeySafetyError;
    };

export type IdempotencyKeyInput = {
  actorId?: unknown;
  requestId?: unknown;
  replayMutationId?: unknown;
  operationType?: unknown;
  payload?: unknown;
  payloadHash?: unknown;
  extraKeyParts?: Record<string, unknown> | null;
};

export const IDEMPOTENCY_KEY_MAX_LENGTH = 180;

const FORBIDDEN_KEY_FIELDS = new Set([
  "email",
  "phone",
  "address",
  "fullName",
  "rawAccessToken",
  "refreshToken",
  "serviceRoleKey",
  "signedUrl",
  "rawPrompt",
  "rawAiResponse",
]);

const SENSITIVE_VALUE_PATTERN =
  /(@|Bearer\s+[a-z0-9._-]{8,}|token=|eyJ[a-zA-Z0-9_-]{8,}|https?:\/\/\S+(?:token|signature|signed|expires)=|\+?\d[\d\s().-]{7,}\d|\b(?:street|avenue|road|main st)\b)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hashString = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const containsForbiddenField = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsForbiddenField);
  if (!isRecord(value)) return false;

  return Object.entries(value).some(([key, entry]) =>
    FORBIDDEN_KEY_FIELDS.has(key) || containsForbiddenField(entry),
  );
};

const containsSensitiveValue = (value: unknown): boolean => {
  if (typeof value === "string") return SENSITIVE_VALUE_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (isRecord(value)) return Object.values(value).some(containsSensitiveValue);
  return false;
};

export function canonicalizeIdempotencyPayload(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeIdempotencyPayload(entry)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalizeIdempotencyPayload(value[key])}`)
      .join(",")}}`;
  }
  return "null";
}

export function buildIdempotencyPayloadHash(payload: unknown): SafeIdempotencyKeyResult {
  if (containsForbiddenField(payload)) return { ok: false, reason: "forbidden_field" };
  if (containsSensitiveValue(payload)) return { ok: false, reason: "sensitive_value" };

  return {
    ok: true,
    key: "",
    payloadHash: `payload:${hashString(canonicalizeIdempotencyPayload(payload))}`,
    keyLength: 0,
  };
}

const resolvePolicy = (
  policyOrOperation: IdempotencyPolicy | IdempotencyPolicyOperation,
): IdempotencyPolicy | null =>
  typeof policyOrOperation === "string" ? getIdempotencyPolicy(policyOrOperation) : policyOrOperation;

const hasSafeOpaquePart = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0 && !containsSensitiveValue(value);

export function buildSafeIdempotencyKey(
  policyOrOperation: IdempotencyPolicy | IdempotencyPolicyOperation,
  input: IdempotencyKeyInput,
): SafeIdempotencyKeyResult {
  const policy = resolvePolicy(policyOrOperation);
  if (!policy) return { ok: false, reason: "unknown_policy" };

  if (!hasSafeOpaquePart(input.actorId)) return { ok: false, reason: "missing_actor_id" };
  if (!hasSafeOpaquePart(input.requestId)) return { ok: false, reason: "missing_request_id" };
  if (policy.requiresReplayMutationId && !hasSafeOpaquePart(input.replayMutationId)) {
    return { ok: false, reason: "missing_replay_mutation_id" };
  }
  if (policy.requiresReplayMutationId && !hasSafeOpaquePart(input.operationType)) {
    return { ok: false, reason: "missing_operation_type" };
  }

  if (containsForbiddenField(input.extraKeyParts)) return { ok: false, reason: "forbidden_field" };
  if (containsSensitiveValue(input.extraKeyParts)) return { ok: false, reason: "sensitive_value" };

  let payloadHash: string | null = null;
  if (typeof input.payloadHash === "string" && input.payloadHash.trim()) {
    if (containsSensitiveValue(input.payloadHash)) return { ok: false, reason: "sensitive_value" };
    payloadHash = input.payloadHash.trim();
  } else if (Object.prototype.hasOwnProperty.call(input, "payload")) {
    const hash = buildIdempotencyPayloadHash(input.payload);
    if (!hash.ok) return hash;
    payloadHash = hash.payloadHash;
  }

  if (!payloadHash) return { ok: false, reason: "missing_payload_hash" };

  const fingerprintInput = {
    operation: policy.operation,
    actor: input.actorId,
    request: input.requestId,
    replayMutationId: policy.requiresReplayMutationId ? input.replayMutationId : null,
    operationType: policy.requiresReplayMutationId ? input.operationType : null,
    payloadHash,
    extra: input.extraKeyParts ?? null,
  };
  const key = `idem:v1:${policy.operation}:${hashString(canonicalizeIdempotencyPayload(fingerprintInput))}`;
  if (key.length > IDEMPOTENCY_KEY_MAX_LENGTH) return { ok: false, reason: "key_too_long" };

  return {
    ok: true,
    key,
    payloadHash,
    keyLength: key.length,
  };
}

export function assertIdempotencyKeyIsBounded(key: string): boolean {
  return key.length > 0 && key.length <= IDEMPOTENCY_KEY_MAX_LENGTH;
}
