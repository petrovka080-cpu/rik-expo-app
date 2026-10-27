import type { AiEstimateTelemetryEvent } from "./aiEstimateObservabilityTypes";
import { validateAiEstimateTelemetryEvent } from "./validateAiEstimateTelemetryEvent";

const FORBIDDEN = /(token|secret|service_role|password|authorization|supplier credential|private user data)/i;

export function validateAiEstimateTelemetry(event: AiEstimateTelemetryEvent): {
  valid: boolean;
  forbiddenFieldFound: boolean;
} {
  const serialized = JSON.stringify(event)
    .replace(/\[redacted_(?:secret|email|phone|address)\]/g, "[redacted]");
  const forbiddenFieldFound = FORBIDDEN.test(serialized);
  const validation = validateAiEstimateTelemetryEvent(event);
  return {
    valid: !forbiddenFieldFound && validation.valid,
    forbiddenFieldFound: forbiddenFieldFound || validation.forbiddenFieldFound,
  };
}
