import { redactAiEstimateTelemetryText } from "../observability/redactAiEstimateTelemetry";
import type { AiEstimateLimitedPublicBetaFeedbackPayload } from "./limitedPublicBetaFeedbackTypes";
import { validateLimitedPublicBetaFeedback } from "./validateLimitedPublicBetaFeedback";

export type AiEstimateRecordedLimitedPublicBetaFeedback =
  AiEstimateLimitedPublicBetaFeedbackPayload & {
    valid: boolean;
    issues: string[];
  };

export function recordLimitedPublicBetaFeedback(
  payload: AiEstimateLimitedPublicBetaFeedbackPayload,
): AiEstimateRecordedLimitedPublicBetaFeedback {
  const safePayload: AiEstimateLimitedPublicBetaFeedbackPayload = {
    ...payload,
    optionalComment: payload.optionalComment
      ? redactAiEstimateTelemetryText(payload.optionalComment)
      : undefined,
  };
  const validation = validateLimitedPublicBetaFeedback(safePayload);
  return {
    ...safePayload,
    valid: validation.valid,
    issues: validation.issues,
  };
}
