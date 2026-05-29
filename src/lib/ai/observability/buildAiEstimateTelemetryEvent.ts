import type { AiEstimateTelemetryEvent } from "./aiEstimateObservabilityTypes";

export function buildAiEstimateTelemetryEvent(
  event: AiEstimateTelemetryEvent,
): AiEstimateTelemetryEvent {
  return {
    ...event,
    runtimeTraceId: event.runtimeTraceId || "trace_missing_redacted",
  };
}

