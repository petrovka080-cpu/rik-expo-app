import type { AiEstimateTelemetryEvent } from "./aiEstimateObservabilityTypes";

const FORBIDDEN = /(token|secret|service_role|password|authorization|supplier credential|private user data)/i;

export function validateAiEstimateTelemetry(event: AiEstimateTelemetryEvent): {
  valid: boolean;
  forbiddenFieldFound: boolean;
} {
  const serialized = JSON.stringify(event);
  const forbiddenFieldFound = FORBIDDEN.test(serialized);
  return {
    valid: !forbiddenFieldFound && Boolean(event.runtimeTraceId) && event.intent === "estimate",
    forbiddenFieldFound,
  };
}

