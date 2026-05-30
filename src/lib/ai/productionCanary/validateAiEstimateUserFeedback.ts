import {
  AI_ESTIMATE_USER_FEEDBACK_LABELS_RU,
  type AiEstimateUserFeedbackPayload,
} from "./aiEstimateUserFeedbackTypes";

const HIDDEN_DEBUG_PATTERN = /(semanticFrame|ConstructionWorkPlan|GlobalEstimateResult|debug|raw enum|__DEV__)/i;
const SECRET_PATTERN = /(token|secret|authorization|service_role|password|supplier credential)/i;
const PRIVATE_COMMENT_PATTERN = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

export function validateAiEstimateUserFeedback(payload: AiEstimateUserFeedbackPayload): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (!payload.runtimeTraceId.trim()) issues.push("RUNTIME_TRACE_ID_MISSING");
  if (!payload.workTitle.trim()) issues.push("WORK_TITLE_MISSING");
  if (!payload.domain.trim() || !payload.object.trim() || !payload.operation.trim()) {
    issues.push("SEMANTIC_FIELDS_MISSING");
  }
  if (!Number.isInteger(payload.rowCount) || payload.rowCount < 0) issues.push("ROW_COUNT_INVALID");
  if (!(payload.userFeedbackCategory in AI_ESTIMATE_USER_FEEDBACK_LABELS_RU)) {
    issues.push("FEEDBACK_CATEGORY_INVALID");
  }
  if (HIDDEN_DEBUG_PATTERN.test(payload.workTitle) || HIDDEN_DEBUG_PATTERN.test(payload.optionalComment ?? "")) {
    issues.push("HIDDEN_DEBUG_TEXT_IN_UI");
  }
  const serialized = JSON.stringify(payload);
  if (SECRET_PATTERN.test(serialized) || PRIVATE_COMMENT_PATTERN.test(payload.optionalComment ?? "")) {
    issues.push("PRIVATE_OR_SECRET_TEXT_FOUND");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
