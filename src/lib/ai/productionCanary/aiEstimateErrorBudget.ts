export type AiEstimateCanaryErrorBudgetMetrics = {
  estimatesTotal: number;
  estimatesSucceeded: number;
  pdfTotal: number;
  pdfSucceeded: number;
  pdfMojibakeFound: number;
  objectMisclassified: number;
  weakGenericRowsFound: number;
  templateGapForParsableWork: number;
  regulatedSafetyMissing: number;
  p95VisibleEstimateLatencyMs: number;
};

export type AiEstimateCanaryErrorBudgetThresholds = {
  minEstimateSuccessRate: number;
  minPdfSuccessRate: number;
  maxPdfMojibakeRate: number;
  maxObjectMisclassificationRate: number;
  maxWeakGenericRowsRate: number;
  maxTemplateGapForParsableWorkRate: number;
  maxRegulatedSafetyMissingRate: number;
  maxP95VisibleEstimateLatencyMs: number;
};

export const AI_ESTIMATE_CANARY_ERROR_BUDGET_THRESHOLDS: AiEstimateCanaryErrorBudgetThresholds = Object.freeze({
  minEstimateSuccessRate: 0.99,
  minPdfSuccessRate: 0.98,
  maxPdfMojibakeRate: 0,
  maxObjectMisclassificationRate: 0,
  maxWeakGenericRowsRate: 0,
  maxTemplateGapForParsableWorkRate: 0,
  maxRegulatedSafetyMissingRate: 0,
  maxP95VisibleEstimateLatencyMs: 3000,
});

function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function buildAiEstimateCanaryErrorBudgetMetrics(
  metrics: AiEstimateCanaryErrorBudgetMetrics,
) {
  return {
    ...metrics,
    estimateSuccessRate: rate(metrics.estimatesSucceeded, metrics.estimatesTotal),
    pdfSuccessRate: rate(metrics.pdfSucceeded, metrics.pdfTotal),
    pdfMojibakeRate: rate(metrics.pdfMojibakeFound, Math.max(metrics.pdfTotal, 1)),
    objectMisclassificationRate: rate(metrics.objectMisclassified, Math.max(metrics.estimatesTotal, 1)),
    weakGenericRowsRate: rate(metrics.weakGenericRowsFound, Math.max(metrics.estimatesTotal, 1)),
    templateGapForParsableWorkRate: rate(metrics.templateGapForParsableWork, Math.max(metrics.estimatesTotal, 1)),
    regulatedSafetyMissingRate: rate(metrics.regulatedSafetyMissing, Math.max(metrics.estimatesTotal, 1)),
  };
}
