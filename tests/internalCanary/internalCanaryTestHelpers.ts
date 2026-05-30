import type { AiEstimateInternalCanaryErrorBudgetMetrics } from "../../src/lib/ai/productionCanary";

export function internalCanaryErrorBudgetMetrics(
  overrides: Partial<AiEstimateInternalCanaryErrorBudgetMetrics> = {},
): AiEstimateInternalCanaryErrorBudgetMetrics {
  return {
    estimatesTotal: 2000,
    estimatesSucceeded: 2000,
    pdfTotal: 200,
    pdfSucceeded: 200,
    pdfMojibakeFound: 0,
    objectMisclassified: 0,
    templateGapForParsableWork: 0,
    weakGenericRowsFound: 0,
    regulatedSafetyMissing: 0,
    telemetryMissing: 0,
    feedbackCaptureFailures: 0,
    p95VisibleEstimateLatencyMs: 1200,
    ...overrides,
  };
}
