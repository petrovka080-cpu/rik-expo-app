import type { AiEstimateTelemetryEvent } from "./aiEstimateTelemetryTypes";

const SECRET_OR_PRIVATE_PATTERN =
  /(token|secret|service_role|password|authorization|supplier credential|private user data|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

export function validateAiEstimateTelemetryEvent(event: AiEstimateTelemetryEvent): {
  valid: boolean;
  forbiddenFieldFound: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const serialized = JSON.stringify(event)
    .replace(/\[redacted_(?:secret|email|phone|address)\]/g, "[redacted]");
  const forbiddenFieldFound = SECRET_OR_PRIVATE_PATTERN.test(serialized);

  if (!event.runtimeTraceId.trim()) issues.push("RUNTIME_TRACE_ID_MISSING");
  if (event.intent !== "estimate") issues.push("INTENT_NOT_ESTIMATE");
  if (!event.classification.trim()) issues.push("CLASSIFICATION_MISSING");
  if (!event.domain.trim() || !event.object.trim() || !event.operation.trim()) issues.push("SEMANTIC_FIELDS_MISSING");
  if (!Number.isFinite(event.latencyMs) || event.latencyMs < 0) issues.push("LATENCY_INVALID");
  if (!Number.isFinite(event.qualityScore) || event.qualityScore < 0 || event.qualityScore > 100) issues.push("QUALITY_SCORE_INVALID");
  if (forbiddenFieldFound) issues.push("TELEMETRY_PRIVATE_OR_SECRET_DATA_FOUND");

  return {
    valid: issues.length === 0,
    forbiddenFieldFound,
    issues,
  };
}
