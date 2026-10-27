import { redactAiEstimateTelemetryText } from "../observability/redactAiEstimateTelemetry";
import type { AiEstimateFeedbackPayload } from "./aiEstimateFeedbackTypes";
import { validateAiEstimateFeedbackPayload } from "./validateAiEstimateFeedbackPayload";

export type AiEstimateRecordedFeedback = AiEstimateFeedbackPayload & {
  recordedAt: string;
  valid: boolean;
  issues: string[];
};

export function recordAiEstimateFeedback(
  payload: AiEstimateFeedbackPayload,
  recordedAt = "2026-05-30T00:00:00.000Z",
): AiEstimateRecordedFeedback {
  const safePayload: AiEstimateFeedbackPayload = {
    ...payload,
    optionalUserComment: payload.optionalUserComment
      ? redactAiEstimateTelemetryText(payload.optionalUserComment)
      : undefined,
  };
  const validation = validateAiEstimateFeedbackPayload(safePayload);
  return {
    ...safePayload,
    recordedAt,
    valid: validation.valid,
    issues: validation.issues,
  };
}
