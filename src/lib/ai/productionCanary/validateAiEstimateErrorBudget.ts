import {
  AI_ESTIMATE_CANARY_ERROR_BUDGET_THRESHOLDS,
  buildAiEstimateCanaryErrorBudgetMetrics,
  type AiEstimateCanaryErrorBudgetMetrics,
  type AiEstimateCanaryErrorBudgetThresholds,
} from "./aiEstimateErrorBudget";

export function validateAiEstimateErrorBudget(
  metrics: AiEstimateCanaryErrorBudgetMetrics,
  thresholds: AiEstimateCanaryErrorBudgetThresholds = AI_ESTIMATE_CANARY_ERROR_BUDGET_THRESHOLDS,
) {
  const derived = buildAiEstimateCanaryErrorBudgetMetrics(metrics);
  const failures: string[] = [];

  if (derived.estimateSuccessRate < thresholds.minEstimateSuccessRate) failures.push("ESTIMATE_SUCCESS_RATE_BELOW_99");
  if (derived.pdfSuccessRate < thresholds.minPdfSuccessRate) failures.push("PDF_SUCCESS_RATE_BELOW_98");
  if (derived.pdfMojibakeRate > thresholds.maxPdfMojibakeRate) failures.push("PDF_MOJIBAKE_RATE_NON_ZERO");
  if (derived.objectMisclassificationRate > thresholds.maxObjectMisclassificationRate) failures.push("OBJECT_MISCLASSIFICATION_RATE_NON_ZERO");
  if (derived.weakGenericRowsRate > thresholds.maxWeakGenericRowsRate) failures.push("WEAK_GENERIC_ROWS_RATE_NON_ZERO");
  if (derived.templateGapForParsableWorkRate > thresholds.maxTemplateGapForParsableWorkRate) failures.push("TEMPLATE_GAP_FOR_PARSABLE_WORK_RATE_NON_ZERO");
  if (derived.regulatedSafetyMissingRate > thresholds.maxRegulatedSafetyMissingRate) failures.push("REGULATED_SAFETY_MISSING_RATE_NON_ZERO");
  if (derived.p95VisibleEstimateLatencyMs > thresholds.maxP95VisibleEstimateLatencyMs) failures.push("P95_VISIBLE_ESTIMATE_LATENCY_EXCEEDED");

  return {
    decision: failures.length === 0 ? "GO_INTERNAL_CANARY_ONLY" : "NO_GO_INTERNAL_CANARY",
    error_budget_passed: failures.length === 0,
    estimate_success_rate_gte_99: derived.estimateSuccessRate >= thresholds.minEstimateSuccessRate,
    pdf_success_rate_gte_98: derived.pdfSuccessRate >= thresholds.minPdfSuccessRate,
    pdf_mojibake_rate_zero: derived.pdfMojibakeRate === 0,
    object_misclassification_rate_zero: derived.objectMisclassificationRate === 0,
    weak_generic_rows_rate_zero: derived.weakGenericRowsRate === 0,
    template_gap_for_parsable_work_rate_zero: derived.templateGapForParsableWorkRate === 0,
    regulated_safety_missing_rate_zero: derived.regulatedSafetyMissingRate === 0,
    p95_visible_estimate_latency_lte_budget: derived.p95VisibleEstimateLatencyMs <= thresholds.maxP95VisibleEstimateLatencyMs,
    failures,
    metrics: derived,
    thresholds,
  };
}
