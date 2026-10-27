import { buildAiEstimateTelemetryEvent } from "./buildAiEstimateTelemetryEvent";
import type { AiEstimateTelemetryEvent, AiEstimateTelemetryInput } from "./aiEstimateTelemetryTypes";

export type AiEstimateCanaryTelemetryInput = AiEstimateTelemetryInput & {
  fallbackMode?: string;
};

export function buildAiEstimateCanaryTelemetry(
  input: AiEstimateCanaryTelemetryInput,
): AiEstimateTelemetryEvent & { fallbackMode?: string } {
  return {
    ...buildAiEstimateTelemetryEvent(input),
    fallbackMode: input.fallbackMode,
  };
}
