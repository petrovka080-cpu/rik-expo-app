import {
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY,
  type AiEstimateEnterpriseCostProfile,
  type AiEstimateEnterpriseLoadProfile,
  type AiEstimateEnterpriseStaticScan,
} from "./estimatePerformanceCostPolicy";

export type AiEstimateEnterpriseLoadPerformanceCostEvaluation = {
  passed: boolean;
  failures: string[];
  summary: {
    samplesTotal: number;
    routesCovered: string[];
    p95LatencyMs: number;
    maxLatencyMs: number;
    averageLatencyMs: number;
    maxRowsPerEstimate: number;
    maxPdfBytes: number;
    maxAnswerChars: number;
    heapDeltaBytes: number;
    providerCalls: number;
    networkCalls: number;
    estimatedProviderCostUsd: number;
  };
};

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return sorted[Math.max(0, index)] ?? 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function evaluateAiEstimateEnterpriseLoadPerformanceCost(params: {
  loadProfile: AiEstimateEnterpriseLoadProfile;
  costProfile: AiEstimateEnterpriseCostProfile;
  staticScan: AiEstimateEnterpriseStaticScan;
}): AiEstimateEnterpriseLoadPerformanceCostEvaluation {
  const policy = AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY;
  const samples = params.loadProfile.samples;
  const latencies = samples.map((sample) => sample.latencyMs);
  const rows = samples.map((sample) => sample.rowCount);
  const pdfBytes = samples.map((sample) => sample.pdfBytes);
  const answerChars = samples.map((sample) => sample.answerChars);
  const routesCovered = Array.from(new Set(samples.map((sample) => sample.route))).sort();
  const summary = {
    samplesTotal: samples.length,
    routesCovered,
    p95LatencyMs: roundMetric(percentile(latencies, 0.95)),
    maxLatencyMs: roundMetric(Math.max(0, ...latencies)),
    averageLatencyMs: roundMetric(latencies.length > 0 ? sum(latencies) / latencies.length : 0),
    maxRowsPerEstimate: Math.max(0, ...rows),
    maxPdfBytes: Math.max(0, ...pdfBytes),
    maxAnswerChars: Math.max(0, ...answerChars),
    heapDeltaBytes: params.loadProfile.heapDeltaBytes,
    providerCalls: params.costProfile.providerCalls,
    networkCalls: params.costProfile.networkCalls,
    estimatedProviderCostUsd: params.costProfile.estimatedProviderCostUsd,
  };
  const failures: string[] = [];

  if (samples.length < policy.minSamples) {
    failures.push(`samples_total_below_policy:${samples.length}<${policy.minSamples}`);
  }

  for (const route of policy.requiredRoutes) {
    if (!routesCovered.includes(route)) {
      failures.push(`route_missing:${route}`);
    }
  }

  if (summary.p95LatencyMs > policy.p95LatencyBudgetMs) {
    failures.push(`p95_latency_budget_exceeded:${summary.p95LatencyMs}>${policy.p95LatencyBudgetMs}`);
  }

  if (summary.maxLatencyMs > policy.maxLatencyBudgetMs) {
    failures.push(`max_latency_budget_exceeded:${summary.maxLatencyMs}>${policy.maxLatencyBudgetMs}`);
  }

  if (summary.averageLatencyMs > policy.averageLatencyBudgetMs) {
    failures.push(`average_latency_budget_exceeded:${summary.averageLatencyMs}>${policy.averageLatencyBudgetMs}`);
  }

  if (summary.heapDeltaBytes > policy.heapDeltaBudgetBytes) {
    failures.push(`heap_delta_budget_exceeded:${summary.heapDeltaBytes}>${policy.heapDeltaBudgetBytes}`);
  }

  if (summary.maxRowsPerEstimate > policy.maxRowsPerEstimate) {
    failures.push(`row_budget_exceeded:${summary.maxRowsPerEstimate}>${policy.maxRowsPerEstimate}`);
  }

  if (summary.maxPdfBytes > policy.maxPdfBytes) {
    failures.push(`pdf_size_budget_exceeded:${summary.maxPdfBytes}>${policy.maxPdfBytes}`);
  }

  if (summary.maxAnswerChars > policy.maxAnswerChars) {
    failures.push(`answer_size_budget_exceeded:${summary.maxAnswerChars}>${policy.maxAnswerChars}`);
  }

  if (summary.providerCalls !== policy.providerCallsAllowed) {
    failures.push(`provider_calls_not_zero:${summary.providerCalls}`);
  }

  if (summary.networkCalls !== policy.networkCallsAllowed) {
    failures.push(`network_calls_not_zero:${summary.networkCalls}`);
  }

  if (summary.estimatedProviderCostUsd !== policy.estimatedProviderCostUsdAllowed) {
    failures.push(`provider_cost_not_zero:${summary.estimatedProviderCostUsd}`);
  }

  if (params.staticScan.forbidden_findings_total > policy.maxStaticForbiddenFindings) {
    failures.push(`static_forbidden_findings:${params.staticScan.forbidden_findings_total}`);
  }

  return {
    passed: failures.length === 0,
    failures,
    summary,
  };
}
