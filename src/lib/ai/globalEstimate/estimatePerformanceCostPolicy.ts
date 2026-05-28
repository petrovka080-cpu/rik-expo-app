export const AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_WAVE =
  "S_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_READY";

export const AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY = {
  minSamples: 80,
  requiredRoutes: ["/request", "/ai?context=foreman"],
  p95LatencyBudgetMs: 1000,
  maxLatencyBudgetMs: 3000,
  averageLatencyBudgetMs: 500,
  heapDeltaBudgetBytes: 256 * 1024 * 1024,
  maxRowsPerEstimate: 120,
  maxPdfBytes: 750_000,
  maxAnswerChars: 16_000,
  providerCallsAllowed: 0,
  networkCallsAllowed: 0,
  estimatedProviderCostUsdAllowed: 0,
  maxStaticForbiddenFindings: 0,
} as const;

export type AiEstimateEnterpriseLoadRoute =
  (typeof AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.requiredRoutes)[number];

export type AiEstimateEnterpriseLoadSample = {
  id: string;
  route: AiEstimateEnterpriseLoadRoute;
  prompt: string;
  domain: string;
  workKey: string;
  latencyMs: number;
  rowCount: number;
  pdfBytes: number;
  answerChars: number;
  runtimeTraceId: string;
  providerCalls: number;
  networkCalls: number;
  estimatedProviderCostUsd: number;
};

export type AiEstimateEnterpriseLoadProfile = {
  samples: AiEstimateEnterpriseLoadSample[];
  startedAt: string;
  finishedAt: string;
  heapStartBytes: number;
  heapEndBytes: number;
  heapDeltaBytes: number;
};

export type AiEstimateEnterpriseCostProfile = {
  providerCalls: number;
  networkCalls: number;
  estimatedProviderCostUsd: number;
  providerCostPolicy: "local_deterministic_estimate_pipeline";
};

export type AiEstimateEnterpriseStaticScan = {
  provider_or_network_findings: string[];
  unbounded_loop_findings: string[];
  forbidden_findings_total: number;
};
