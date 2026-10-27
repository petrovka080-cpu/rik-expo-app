import {
  AI_ESTIMATE_PERFORMANCE_EVENT_NAMES,
  type AiEstimatePerformanceEvent,
  type AiEstimatePerformanceEventName,
  type AiEstimatePerformanceEventValidation,
} from "./aiEstimatePerformanceEventSchema";
import type { AiEstimatePerformanceOperation } from "./aiEstimatePerformanceSloContract";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(?:\+?\d[\s-]?){7,}\d/g;

export function redactAiEstimatePerformancePrompt(prompt: string): string {
  return prompt
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .slice(0, 160);
}

export function createAiEstimatePerformanceEvent(input: {
  eventName: AiEstimatePerformanceEventName;
  operation: AiEstimatePerformanceOperation;
  durationMs: number;
  sourceSha: string;
  routeOrSurface: string;
  prompt?: string;
  rowsCount?: number;
  memoryMb?: number;
}): AiEstimatePerformanceEvent {
  return {
    eventName: input.eventName,
    operation: input.operation,
    durationMs: input.durationMs,
    sourceSha: input.sourceSha,
    routeOrSurface: input.routeOrSurface,
    promptRedacted: typeof input.prompt === "string"
      ? redactAiEstimatePerformancePrompt(input.prompt)
      : undefined,
    rowsCount: input.rowsCount,
    memoryMb: input.memoryMb,
  };
}

function containsPii(value: string): boolean {
  EMAIL_RE.lastIndex = 0;
  PHONE_RE.lastIndex = 0;
  return EMAIL_RE.test(value) || PHONE_RE.test(value);
}

export function validateAiEstimatePerformanceEvents(
  events: readonly AiEstimatePerformanceEvent[],
): AiEstimatePerformanceEventValidation {
  const eventNames = new Set(events.map((event) => event.eventName));
  const missingEvents = AI_ESTIMATE_PERFORMANCE_EVENT_NAMES.filter((eventName) => !eventNames.has(eventName));
  const withoutSourceSha = events.some((event) => !event.sourceSha);
  const withoutOperation = events.some((event) => !event.operation);
  const withoutDuration = events.some((event) => !Number.isFinite(event.durationMs));
  const pii = events.some((event) => containsPii(JSON.stringify(event)));
  const fullPrompt = events.some((event) =>
    typeof event.promptRedacted === "string" &&
    event.promptRedacted.length > 160 &&
    !event.promptRedacted.includes("[redacted")
  );
  const failures = [
    missingEvents.length === 0 ? "" : `performance_events_missing:${missingEvents.join(",")}`,
    withoutSourceSha ? "performance_event_without_source_sha" : "",
    withoutOperation ? "performance_event_without_operation" : "",
    withoutDuration ? "performance_event_without_duration" : "",
    pii ? "performance_event_contains_pii" : "",
    fullPrompt ? "performance_event_contains_full_prompt_unredacted" : "",
  ].filter(Boolean);
  return {
    performance_telemetry_schema_created: true,
    all_events_have_duration: !withoutDuration,
    all_events_have_source_sha: !withoutSourceSha,
    all_events_have_operation: !withoutOperation,
    pii_redaction_passed: !pii,
    full_prompt_not_logged_unredacted: !fullPrompt,
    performance_event_without_source_sha: withoutSourceSha,
    performance_event_without_operation: withoutOperation,
    performance_event_without_duration: withoutDuration,
    performance_event_contains_pii: pii,
    performance_event_contains_full_prompt_unredacted: fullPrompt,
    passed: failures.length === 0,
    failures,
  };
}
