import type { AiEstimateTelemetryPayload } from "./AiEstimateTelemetry";

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
      .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
      .replace(/token[=:]\s*[^,\s]+/gi, "token=[redacted]")
      .slice(0, 500);
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !/prompt|raw_pdf|pdf_text|token|secret|phone|email/i.test(key))
        .map(([key, next]) => [key, redactValue(next)]),
    );
  }
  return value;
}

export function redactAiEstimateTelemetryPayload(payload: AiEstimateTelemetryPayload): AiEstimateTelemetryPayload {
  return {
    ...payload,
    metadata: payload.metadata ? redactValue(payload.metadata) as Record<string, unknown> : undefined,
  };
}
