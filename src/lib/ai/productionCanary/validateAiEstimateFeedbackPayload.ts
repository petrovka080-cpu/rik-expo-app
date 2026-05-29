import {
  AI_ESTIMATE_FEEDBACK_REASON_LABELS_RU,
  type AiEstimateFeedbackPayload,
} from "./aiEstimateFeedbackTypes";

const HIDDEN_DEBUG_PATTERN = /(semanticFrame|ConstructionWorkPlan|GlobalEstimateResult|debug|raw enum|__DEV__)/i;
const PRIVATE_PATTERN = /(token|secret|authorization|service_role|password|supplier credential)/i;

export function validateAiEstimateFeedbackPayload(payload: AiEstimateFeedbackPayload): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!payload.runtimeTraceId.trim()) issues.push("RUNTIME_TRACE_ID_MISSING");
  if (!payload.visibleWorkTitle.trim()) issues.push("VISIBLE_WORK_TITLE_MISSING");
  if (!Number.isInteger(payload.rowCount) || payload.rowCount < 0) issues.push("ROW_COUNT_INVALID");
  if (!(payload.reason in AI_ESTIMATE_FEEDBACK_REASON_LABELS_RU)) issues.push("REASON_INVALID");
  const serialized = JSON.stringify(payload);
  if (HIDDEN_DEBUG_PATTERN.test(payload.visibleWorkTitle) || HIDDEN_DEBUG_PATTERN.test(payload.optionalUserComment ?? "")) {
    issues.push("HIDDEN_DEBUG_TEXT_IN_UI");
  }
  if (PRIVATE_PATTERN.test(serialized)) issues.push("PRIVATE_OR_SECRET_TEXT_FOUND");
  return {
    valid: issues.length === 0,
    issues,
  };
}
