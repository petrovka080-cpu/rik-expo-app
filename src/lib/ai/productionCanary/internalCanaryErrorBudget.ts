export type AiEstimateInternalCanaryErrorBudgetMetrics = {
  estimatesTotal: number;
  estimatesSucceeded: number;
  pdfTotal: number;
  pdfSucceeded: number;
  pdfMojibakeFound: number;
  objectMisclassified: number;
  templateGapForParsableWork: number;
  weakGenericRowsFound: number;
  regulatedSafetyMissing: number;
  telemetryMissing: number;
  feedbackCaptureFailures: number;
  p95VisibleEstimateLatencyMs: number;
};

export type AiEstimateInternalCanaryErrorBudgetThresholds = {
  minEstimateSuccessRate: number;
  minPdfSuccessRate: number;
  maxPdfMojibakeRate: number;
  maxObjectMisclassificationRate: number;
  maxTemplateGapForParsableWorkRate: number;
  maxWeakGenericRowsRate: number;
  maxRegulatedSafetyMissingRate: number;
  maxTelemetryMissingRate: number;
  maxFeedbackCaptureFailureRate: number;
  maxP95VisibleEstimateLatencyMs: number;
};

export const AI_ESTIMATE_INTERNAL_CANARY_ERROR_BUDGET_THRESHOLDS: AiEstimateInternalCanaryErrorBudgetThresholds =
  Object.freeze({
    minEstimateSuccessRate: 0.995,
    minPdfSuccessRate: 0.99,
    maxPdfMojibakeRate: 0,
    maxObjectMisclassificationRate: 0,
    maxTemplateGapForParsableWorkRate: 0,
    maxWeakGenericRowsRate: 0,
    maxRegulatedSafetyMissingRate: 0,
    maxTelemetryMissingRate: 0,
    maxFeedbackCaptureFailureRate: 0,
    maxP95VisibleEstimateLatencyMs: 3000,
  });

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function buildAiEstimateInternalCanaryErrorBudgetMetrics(
  metrics: AiEstimateInternalCanaryErrorBudgetMetrics,
) {
  return {
    ...metrics,
    estimateSuccessRate: rate(metrics.estimatesSucceeded, metrics.estimatesTotal),
    pdfSuccessRate: rate(metrics.pdfSucceeded, metrics.pdfTotal),
    pdfMojibakeRate: rate(metrics.pdfMojibakeFound, Math.max(metrics.pdfTotal, 1)),
    objectMisclassificationRate: rate(metrics.objectMisclassified, Math.max(metrics.estimatesTotal, 1)),
    templateGapForParsableWorkRate: rate(metrics.templateGapForParsableWork, Math.max(metrics.estimatesTotal, 1)),
    weakGenericRowsRate: rate(metrics.weakGenericRowsFound, Math.max(metrics.estimatesTotal, 1)),
    regulatedSafetyMissingRate: rate(metrics.regulatedSafetyMissing, Math.max(metrics.estimatesTotal, 1)),
    telemetryMissingRate: rate(metrics.telemetryMissing, Math.max(metrics.estimatesTotal, 1)),
    feedbackCaptureFailureRate: rate(metrics.feedbackCaptureFailures, Math.max(metrics.estimatesTotal, 1)),
  };
}
