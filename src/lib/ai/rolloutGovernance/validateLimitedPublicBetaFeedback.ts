import { AI_ESTIMATE_LIMITED_PUBLIC_BETA_FEEDBACK_LABELS_RU, type AiEstimateLimitedPublicBetaFeedbackPayload } from "./limitedPublicBetaFeedbackTypes";

const HIDDEN_DEBUG_PATTERN = /(semanticFrame|ConstructionWorkPlan|GlobalEstimateResult|raw enum|debug|__DEV__)/i;
const PRIVATE_PATTERN =
  /(token|secret|authorization|service_role|password|supplier credential|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+?\d[\d\s().-]{7,}\d)/i;

export function validateLimitedPublicBetaFeedback(
  payload: AiEstimateLimitedPublicBetaFeedbackPayload,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!payload.runtimeTraceId.trim()) issues.push("RUNTIME_TRACE_ID_MISSING");
  if (!payload.domain.trim()) issues.push("DOMAIN_MISSING");
  if (!payload.object.trim()) issues.push("OBJECT_MISSING");
  if (!payload.operation.trim()) issues.push("OPERATION_MISSING");
  if (!payload.workTitle.trim()) issues.push("WORK_TITLE_MISSING");
  if (!Number.isInteger(payload.rowCount) || payload.rowCount < 0) issues.push("ROW_COUNT_INVALID");
  if (!(payload.feedbackCategory in AI_ESTIMATE_LIMITED_PUBLIC_BETA_FEEDBACK_LABELS_RU)) {
    issues.push("FEEDBACK_CATEGORY_INVALID");
  }
  if (Number.isNaN(Date.parse(payload.createdAt))) issues.push("CREATED_AT_INVALID");

  const userVisibleText = [
    payload.workTitle,
    payload.optionalComment ?? "",
  ].join("\n");
  const serialized = JSON.stringify({
    ...payload,
    createdAt: "[timestamp]",
    rowCount: "[row_count]",
    pdfGenerated: "[pdf_generated]",
  });
  if (HIDDEN_DEBUG_PATTERN.test(userVisibleText)) issues.push("RAW_DEBUG_LABEL_VISIBLE_TO_USER");
  if (PRIVATE_PATTERN.test(serialized)) issues.push("PRIVATE_OR_SECRET_TEXT_FOUND");

  return {
    valid: issues.length === 0,
    issues,
  };
}
