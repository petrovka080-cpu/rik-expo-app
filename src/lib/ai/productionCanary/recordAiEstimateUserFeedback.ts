import { redactAiEstimateTelemetryText } from "../observability/redactAiEstimateTelemetry";
import type { AiEstimateUserFeedbackPayload } from "./aiEstimateUserFeedbackTypes";
import { validateAiEstimateUserFeedback } from "./validateAiEstimateUserFeedback";

export type AiEstimateRecordedUserFeedback = AiEstimateUserFeedbackPayload & {
  recorded: boolean;
  valid: boolean;
  issues: string[];
};

export function recordAiEstimateUserFeedback(
  payload: AiEstimateUserFeedbackPayload,
): AiEstimateRecordedUserFeedback {
  const safePayload: AiEstimateUserFeedbackPayload = {
    ...payload,
    optionalComment: payload.optionalComment
      ? redactAiEstimateTelemetryText(payload.optionalComment)
      : undefined,
  };
  const validation = validateAiEstimateUserFeedback(safePayload);
  return {
    ...safePayload,
    recorded: validation.valid,
    valid: validation.valid,
    issues: validation.issues,
  };
}
