export const SENSITIVE_REDACTION_MARKER = "[redacted]";

const SENSITIVE_QUERY_KEY_PATTERN =
  "(?:access_token|refresh_token|token|signature|sig|expires|expires_in|apikey|api_key|openToken|authorization|X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|X-Amz-Expires)";

const sensitiveQueryParamPattern = new RegExp(
  `([?&;]${SENSITIVE_QUERY_KEY_PATTERN}=)[^&#\\s"'<>]+`,
  "gi",
);

const bearerPattern = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const jwtLikePattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

const fullyRedactedKeys = new Set([
  "authorization",
  "bearer",
  "token",
  "accesstoken",
  "refreshtoken",
  "opentoken",
  "apikey",
  "servicekey",
  "servicerolekey",
  "anonkey",
  "signedurl",
]);

const normalizeKey = (key: string) => key.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

export function redactSensitiveText(value: unknown): string {
  return String(value ?? "")
    .replace(bearerPattern, `$1${SENSITIVE_REDACTION_MARKER}`)
    .replace(jwtLikePattern, SENSITIVE_REDACTION_MARKER)
    .replace(sensitiveQueryParamPattern, `$1${SENSITIVE_REDACTION_MARKER}`);
}

export function redactSensitiveValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value;
  if (typeof value === "string") return redactSensitiveText(value);
  if (typeof value !== "object") return value;

  if (value instanceof Error) {
    const redactedError = new Error(redactSensitiveText(value.message));
    redactedError.name = value.name;
    return redactedError;
  }

  if (seen.has(value)) return "[circular]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item, seen));
  }

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (fullyRedactedKeys.has(normalizeKey(key))) {
      redacted[key] = SENSITIVE_REDACTION_MARKER;
      continue;
    }
    redacted[key] = redactSensitiveValue(entry, seen);
  }
  return redacted;
}

export function redactSensitiveRecord<T extends Record<string, unknown>>(
  record: T | null | undefined,
): Record<string, unknown> | null | undefined {
  if (record == null) return record;
  const redacted = redactSensitiveValue(record);
  return redacted && typeof redacted === "object" && !Array.isArray(redacted)
    ? (redacted as Record<string, unknown>)
    : {};
}
