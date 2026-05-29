export type AiEstimateCostGuardAction =
  | "allow"
  | "deny"
  | "warn"
  | "defer"
  | "fallback_to_boq_without_price";

export type AiEstimateCostUsage = {
  estimateRequestsForSession: number;
  pdfGenerationsForSession: number;
  catalogLookupsForEstimate: number;
  localRateSourceLookupsForEstimate: number;
  retriesForFailedEstimate: number;
  repeatedFailedPrompts: number;
  concurrentPdfJobs: number;
  concurrentCatalogBindings: number;
  proofRunnerFixtureBatchSize: number;
};

export type AiEstimateCostGuardDecision = {
  key: keyof AiEstimateCostUsage;
  action: AiEstimateCostGuardAction;
  limit: number;
  observed: number;
  visibleMessageRu?: string;
};

export type AiEstimateRateLimitState = {
  key: string;
  count: number;
  limit: number;
};
