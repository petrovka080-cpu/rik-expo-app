import { redactBffText } from "./bffSafety";
import type { RateEnforcementPolicy } from "./rateLimitPolicies";

export type RateLimitKeyBuildReason =
  | "missing_policy"
  | "missing_actor_key"
  | "missing_company_key"
  | "missing_ip_or_device_key"
  | "missing_idempotency_key"
  | "forbidden_field"
  | "sensitive_value"
  | "key_too_long";

export type RateLimitKeyInput = {
  actorId?: unknown;
  companyId?: unknown;
  routeKey?: unknown;
  ipOrDeviceKey?: unknown;
  idempotencyKey?: unknown;
  payload?: unknown;
};

export type SafeRateLimitKeyResult =
  | {
      ok: true;
      key: string;
      keyLength: number;
      subjectHash: string;
      rawPiiInKey: false;
    }
  | {
      ok: false;
      reason: RateLimitKeyBuildReason;
    };

const MAX_RATE_LIMIT_KEY_LENGTH = 180;
const MAX_CANONICAL_INPUT_LENGTH = 2_048;

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

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const TOKEN_PATTERN = /\b(?:bearer|token|secret|jwt|apikey|api_key|signed)\b/i;
const PHONE_PATTERN = /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?){2}\d{3,4}/;
const ADDRESS_PATTERN = /\b\d{1,6}\s+[A-Za-z0-9 .'-]+\s(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b/i;

const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const hasForbiddenField = (value: unknown, depth = 0): boolean => {
  if (depth > 8 || value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => hasForbiddenField(entry, depth + 1));

  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_KEY_FIELDS.has(key)) return true;
    if (hasForbiddenField(entry, depth + 1)) return true;
  }
  return false;
};

export function containsSensitiveRateLimitValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed !== redactBffText(trimmed)) return true;
  if (JWT_PATTERN.test(trimmed)) return true;
  if (TOKEN_PATTERN.test(trimmed)) return true;
  if (PHONE_PATTERN.test(trimmed)) return true;
  if (ADDRESS_PATTERN.test(trimmed)) return true;
  return false;
}

const hasSensitiveValue = (value: unknown, depth = 0): boolean => {
  if (depth > 8 || value == null) return false;
  if (typeof value === "string") return containsSensitiveRateLimitValue(value);
  if (typeof value === "number" || typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.some((entry) => hasSensitiveValue(entry, depth + 1));
  if (typeof value === "object") return Object.values(value).some((entry) => hasSensitiveValue(entry, depth + 1));
  return true;
};

const canonicalize = (value: unknown): string => {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(null);
};

const stringOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export function assertRateLimitKeyIsBounded(key: string): boolean {
  return key.length > 0 && key.length <= MAX_RATE_LIMIT_KEY_LENGTH && key === redactBffText(key);
}

export function buildSafeRateLimitKey(
  policy: RateEnforcementPolicy | null,
  input: RateLimitKeyInput,
): SafeRateLimitKeyResult {
  if (!policy) return { ok: false, reason: "missing_policy" };
  if (hasForbiddenField(input)) return { ok: false, reason: "forbidden_field" };
  if (hasSensitiveValue(input)) return { ok: false, reason: "sensitive_value" };

  const actorId = stringOrNull(input.actorId);
  const companyId = stringOrNull(input.companyId);
  const ipOrDeviceKey = stringOrNull(input.ipOrDeviceKey);
  const idempotencyKey = stringOrNull(input.idempotencyKey);

  if (policy.actorKeyRequired && !actorId) return { ok: false, reason: "missing_actor_key" };
  if (policy.companyKeyRequired && !companyId) return { ok: false, reason: "missing_company_key" };
  if (policy.scope === "ip_or_device" && !ipOrDeviceKey) {
    return { ok: false, reason: "missing_ip_or_device_key" };
  }
  if (policy.idempotencyKeyRequiredForMutations && !idempotencyKey) {
    return { ok: false, reason: "missing_idempotency_key" };
  }

  const canonical = canonicalize({
    actorId: actorId ? hashString(actorId) : null,
    companyId: companyId ? hashString(companyId) : null,
    idempotencyKey: idempotencyKey ? hashString(idempotencyKey) : null,
    ipOrDeviceKey: ipOrDeviceKey ? hashString(ipOrDeviceKey) : null,
    operation: policy.operation,
    routeKey: input.routeKey ? hashString(canonicalize(input.routeKey).slice(0, MAX_CANONICAL_INPUT_LENGTH)) : null,
  }).slice(0, MAX_CANONICAL_INPUT_LENGTH);
  const subjectHash = hashString(canonical);
  const key = `rate:v1:${policy.operation}:${subjectHash}`;

  if (!assertRateLimitKeyIsBounded(key)) return { ok: false, reason: "key_too_long" };

  return {
    ok: true,
    key,
    keyLength: key.length,
    subjectHash,
    rawPiiInKey: false,
  };
}
