import { redactBffText } from "./bffSafety";
import type { ScaleObservabilityEvent } from "./scaleObservabilityEvents";

export const MAX_SCALE_OBSERVABILITY_EVENT_BYTES = 4_096;
export const MAX_SCALE_OBSERVABILITY_TAG_LENGTH = 80;

export type ScaleObservabilitySafetyError =
  | "not_object"
  | "forbidden_field"
  | "sensitive_value"
  | "event_too_large"
  | "invalid_tag"
  | "unsafe_event";

export type ScaleObservabilitySafetyResult =
  | { ok: true; event: ScaleObservabilityEvent }
  | { ok: false; reason: ScaleObservabilitySafetyError };

const FORBIDDEN_EVENT_FIELDS = new Set([
  "rawPayload",
  "rawPrompt",
  "rawAiResponse",
  "email",
  "phone",
  "address",
  "fullName",
  "accessToken",
  "refreshToken",
  "serviceRoleKey",
  "signedUrl",
  "databaseUrl",
  "supabaseKey",
]);

const TOKENISH_VALUE_PATTERN =
  /(bearer\s+|eyJ[a-zA-Z0-9_-]{10,}\.|service[_-]?role|signed[_-]?url|token=|refresh[_-]?token|access[_-]?token|supabase[_-]?key|database[_-]?url)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_PATTERN = /\+\d[\d\s().-]{7,}/;
const ADDRESS_PATTERN = /\b(?:street|st\.|avenue|ave\.|road|rd\.|apartment|apt\.|building|house)\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function containsForbiddenScaleObservabilityField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsForbiddenScaleObservabilityField(entry));
  }
  if (!isRecord(value)) return false;

  for (const [key, entry] of Object.entries(value)) {
    if (FORBIDDEN_EVENT_FIELDS.has(key)) return true;
    if (containsForbiddenScaleObservabilityField(entry)) return true;
  }
  return false;
}

export function containsSensitiveScaleObservabilityValue(value: unknown): boolean {
  if (typeof value === "string") {
    return (
      TOKENISH_VALUE_PATTERN.test(value) ||
      EMAIL_PATTERN.test(value) ||
      PHONE_PATTERN.test(value) ||
      ADDRESS_PATTERN.test(value)
    );
  }
  if (Array.isArray(value)) return value.some((entry) => containsSensitiveScaleObservabilityValue(entry));
  if (isRecord(value)) return Object.values(value).some((entry) => containsSensitiveScaleObservabilityValue(entry));
  return false;
}

export function normalizeScaleReasonCode(value: unknown): string | undefined {
  if (value == null) return undefined;
  const safe = redactBffText(String(value)).trim().slice(0, MAX_SCALE_OBSERVABILITY_TAG_LENGTH);
  return /^[a-z0-9_.-]+$/i.test(safe) ? safe : "redacted";
}

export function assertScaleObservabilityTagIsBounded(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!value || value.length > MAX_SCALE_OBSERVABILITY_TAG_LENGTH) return false;
  return value === redactBffText(value) && !containsSensitiveScaleObservabilityValue(value);
}

export function sanitizeScaleObservabilityEvent(value: unknown): ScaleObservabilitySafetyResult {
  if (!isRecord(value)) return { ok: false, reason: "not_object" };
  if (containsForbiddenScaleObservabilityField(value)) return { ok: false, reason: "forbidden_field" };
  if (containsSensitiveScaleObservabilityValue(value)) return { ok: false, reason: "sensitive_value" };

  const event = value as Partial<ScaleObservabilityEvent>;
  if (
    typeof event.eventName !== "string" ||
    typeof event.category !== "string" ||
    typeof event.severity !== "string" ||
    typeof event.timestamp !== "string" ||
    typeof event.routeOrOperation !== "string" ||
    typeof event.result !== "string" ||
    event.redacted !== true
  ) {
    return { ok: false, reason: "unsafe_event" };
  }

  const safeEvent: ScaleObservabilityEvent = {
    eventName: event.eventName as ScaleObservabilityEvent["eventName"],
    category: event.category as ScaleObservabilityEvent["category"],
    severity: event.severity as ScaleObservabilityEvent["severity"],
    timestamp: redactBffText(event.timestamp).slice(0, MAX_SCALE_OBSERVABILITY_TAG_LENGTH),
    routeOrOperation: redactBffText(event.routeOrOperation).slice(0, MAX_SCALE_OBSERVABILITY_TAG_LENGTH),
    safeActorScope: event.safeActorScope ?? "not_applicable",
    safeCompanyScope: event.safeCompanyScope ?? "not_applicable",
    durationMs: typeof event.durationMs === "number" && Number.isFinite(event.durationMs)
      ? Math.max(0, Math.floor(event.durationMs))
      : undefined,
    result: event.result as ScaleObservabilityEvent["result"],
    reasonCode: normalizeScaleReasonCode(event.reasonCode),
    sampled: event.sampled === true,
    redacted: true,
  };

  if (!assertScaleObservabilityTagIsBounded(safeEvent.routeOrOperation)) {
    return { ok: false, reason: "invalid_tag" };
  }

  if (JSON.stringify(safeEvent).length > MAX_SCALE_OBSERVABILITY_EVENT_BYTES) {
    return { ok: false, reason: "event_too_large" };
  }

  return { ok: true, event: safeEvent };
}

export function validateScaleObservabilityEvent(value: unknown): boolean {
  return sanitizeScaleObservabilityEvent(value).ok;
}
