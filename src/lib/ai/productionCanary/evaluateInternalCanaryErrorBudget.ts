import {
  AI_ESTIMATE_INTERNAL_CANARY_ERROR_BUDGET_THRESHOLDS,
  buildAiEstimateInternalCanaryErrorBudgetMetrics,
  type AiEstimateInternalCanaryErrorBudgetMetrics,
  type AiEstimateInternalCanaryErrorBudgetThresholds,
} from "./internalCanaryErrorBudget";

export function evaluateInternalCanaryErrorBudget(
  metrics: AiEstimateInternalCanaryErrorBudgetMetrics,
  thresholds: AiEstimateInternalCanaryErrorBudgetThresholds = AI_ESTIMATE_INTERNAL_CANARY_ERROR_BUDGET_THRESHOLDS,
) {
  const derived = buildAiEstimateInternalCanaryErrorBudgetMetrics(metrics);
  const failures: string[] = [];

  if (derived.estimateSuccessRate < thresholds.minEstimateSuccessRate) failures.push("ESTIMATE_SUCCESS_RATE_BELOW_99_5");
  if (derived.pdfSuccessRate < thresholds.minPdfSuccessRate) failures.push("PDF_SUCCESS_RATE_BELOW_99");
  if (derived.pdfMojibakeRate > thresholds.maxPdfMojibakeRate) failures.push("PDF_MOJIBAKE_RATE_NON_ZERO");
  if (derived.objectMisclassificationRate > thresholds.maxObjectMisclassificationRate) failures.push("OBJECT_MISCLASSIFICATION_RATE_NON_ZERO");
  if (derived.templateGapForParsableWorkRate > thresholds.maxTemplateGapForParsableWorkRate) failures.push("TEMPLATE_GAP_FOR_PARSABLE_WORK_RATE_NON_ZERO");
  if (derived.weakGenericRowsRate > thresholds.maxWeakGenericRowsRate) failures.push("WEAK_GENERIC_ROWS_RATE_NON_ZERO");
  if (derived.regulatedSafetyMissingRate > thresholds.maxRegulatedSafetyMissingRate) failures.push("REGULATED_SAFETY_MISSING_RATE_NON_ZERO");
  if (derived.telemetryMissingRate > thresholds.maxTelemetryMissingRate) failures.push("TELEMETRY_MISSING_RATE_NON_ZERO");
  if (derived.feedbackCaptureFailureRate > thresholds.maxFeedbackCaptureFailureRate) failures.push("FEEDBACK_CAPTURE_FAILURE_RATE_NON_ZERO");
  if (derived.p95VisibleEstimateLatencyMs > thresholds.maxP95VisibleEstimateLatencyMs) failures.push("P95_VISIBLE_ESTIMATE_LATENCY_EXCEEDED");

  return {
    decision: failures.length === 0 ? "GO_NEXT_INTERNAL_CANARY_STAGE" : "NO_GO_INTERNAL_CANARY_ERROR_BUDGET_EXCEEDED",
    error_budget_passed: failures.length === 0,
    estimate_success_rate_gte_99_5: derived.estimateSuccessRate >= thresholds.minEstimateSuccessRate,
    pdf_success_rate_gte_99: derived.pdfSuccessRate >= thresholds.minPdfSuccessRate,
    pdf_mojibake_rate_zero: derived.pdfMojibakeRate === 0,
    object_misclassification_rate_zero: derived.objectMisclassificationRate === 0,
    template_gap_for_parsable_work_rate_zero: derived.templateGapForParsableWorkRate === 0,
    weak_generic_rows_rate_zero: derived.weakGenericRowsRate === 0,
    regulated_safety_missing_rate_zero: derived.regulatedSafetyMissingRate === 0,
    telemetry_missing_rate_zero: derived.telemetryMissingRate === 0,
    feedback_capture_failure_rate_zero: derived.feedbackCaptureFailureRate === 0,
    p95_visible_estimate_latency_lte_budget: derived.p95VisibleEstimateLatencyMs <= thresholds.maxP95VisibleEstimateLatencyMs,
    failures,
    metrics: derived,
    thresholds,
  };
}
