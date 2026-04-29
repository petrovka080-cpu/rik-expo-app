import type { CachePolicy } from "./cachePolicies";

export type CacheKeyResult =
  | {
      ok: true;
      key: string;
    }
  | {
      ok: false;
      reason: "forbidden_field" | "sensitive_value" | "invalid_policy";
    };

const MAX_CACHE_KEY_LENGTH = 160;
const FORBIDDEN_FIELD_PATTERN = /(?:email|phone|address|token|jwt|secret|password|bearer|signed)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){10,}/;
const TOKEN_PATTERN = /\b(?:bearer|token|jwt|apikey|api_key|secret|password)=?[A-Z0-9._~-]{8,}\b/i;
const ADDRESS_PATTERN = /\b\d{1,6}\s+[a-z0-9 .'-]+(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|boulevard|blvd\.?)\b/i;

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
};

const stableStringify = (value: unknown): string => {
  if (value == null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(String(value));
};

const hasForbiddenField = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenField);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, entry]) => FORBIDDEN_FIELD_PATTERN.test(key) || hasForbiddenField(entry),
  );
};

const hasSensitiveValue = (value: unknown): boolean => {
  if (typeof value === "string") {
    return (
      EMAIL_PATTERN.test(value) ||
      PHONE_PATTERN.test(value) ||
      TOKEN_PATTERN.test(value) ||
      ADDRESS_PATTERN.test(value)
    );
  }
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasSensitiveValue);
  return Object.values(value as Record<string, unknown>).some(hasSensitiveValue);
};

const resolveKeyPartValue = (input: Record<string, unknown>, keyPart: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(input, keyPart)) return input[keyPart];
  if (keyPart.endsWith("Hash")) {
    const baseKey = keyPart.slice(0, -"Hash".length);
    if (Object.prototype.hasOwnProperty.call(input, baseKey)) return input[baseKey];
  }
  return null;
};

export function buildSafeCacheKey(
  policy: CachePolicy | null | undefined,
  input: Record<string, unknown>,
): CacheKeyResult {
  if (!policy) return { ok: false, reason: "invalid_policy" };
  if (hasForbiddenField(input)) return { ok: false, reason: "forbidden_field" };
  if (hasSensitiveValue(input)) return { ok: false, reason: "sensitive_value" };

  const keyShape = policy.keyParts.map((part) => [
    part,
    fnv1a(stableStringify(resolveKeyPartValue(input, part))),
  ]);
  const digest = fnv1a(stableStringify(keyShape));
  const key = `cache:v1:${policy.route}:${digest}`;

  return {
    ok: true,
    key: key.slice(0, MAX_CACHE_KEY_LENGTH),
  };
}

export function assertCacheKeyIsBounded(key: string): boolean {
  return key.length > 0 && key.length <= MAX_CACHE_KEY_LENGTH;
}
