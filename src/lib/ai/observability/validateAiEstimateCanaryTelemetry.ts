import type { AiEstimateTelemetryEvent } from "./aiEstimateTelemetryTypes";
import { validateAiEstimateTelemetryEvent } from "./validateAiEstimateTelemetryEvent";

export function validateAiEstimateCanaryTelemetry(event: AiEstimateTelemetryEvent): {
  valid: boolean;
  issues: string[];
  forbiddenFieldFound: boolean;
} {
  return validateAiEstimateTelemetryEvent(event);
}
