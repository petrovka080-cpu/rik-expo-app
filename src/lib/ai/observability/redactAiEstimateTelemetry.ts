const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const SECRET_PATTERN = /\b(token|secret|service_role|password|authorization|supplier credential)\b(?:\s*[:=]|\s+)\s*[^,\s]+/gi;
const ADDRESS_PATTERN = /\b(?:street|address|apt|apartment|home|house)\b[^,.;]{0,80}/gi;

export function redactAiEstimateTelemetryText(value: string): string {
  return value
    .replace(SECRET_PATTERN, "[redacted_secret]")
    .replace(EMAIL_PATTERN, "[redacted_email]")
    .replace(PHONE_PATTERN, "[redacted_phone]")
    .replace(ADDRESS_PATTERN, "[redacted_address]");
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") return redactAiEstimateTelemetryText(value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, redactValue(entry)]),
    );
  }
  return value;
}

export function redactAiEstimateTelemetry<T extends Record<string, unknown>>(event: T): T {
  return redactValue(event) as T;
}
