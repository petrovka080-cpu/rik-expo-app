import {
  AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY,
  evaluateAiEstimateEnterpriseLoadPerformanceCost,
  type AiEstimateEnterpriseCostProfile,
  type AiEstimateEnterpriseLoadProfile,
  type AiEstimateEnterpriseLoadSample,
  type AiEstimateEnterpriseStaticScan,
} from "../../src/lib/ai/globalEstimate";

function sample(id: number, latencyMs: number): AiEstimateEnterpriseLoadSample {
  return {
    id: `sample_${id}`,
    route: id % 2 === 0 ? "/request" : "/ai?context=foreman",
    prompt: `estimate flooring ${id}`,
    domain: "flooring",
    workKey: "floor_covering_installation",
    latencyMs,
    rowCount: 18,
    pdfBytes: 120_000,
    answerChars: 2500,
    runtimeTraceId: `trace_${id}`,
    providerCalls: 0,
    networkCalls: 0,
    estimatedProviderCostUsd: 0,
  };
}

function profile(samples: AiEstimateEnterpriseLoadSample[]): AiEstimateEnterpriseLoadProfile {
  return {
    samples,
    startedAt: "2026-05-29T00:00:00.000Z",
    finishedAt: "2026-05-29T00:00:01.000Z",
    heapStartBytes: 1000,
    heapEndBytes: 2000,
    heapDeltaBytes: 1000,
  };
}

const zeroCost: AiEstimateEnterpriseCostProfile = {
  providerCalls: 0,
  networkCalls: 0,
  estimatedProviderCostUsd: 0,
  providerCostPolicy: "local_deterministic_estimate_pipeline",
};

const cleanScan: AiEstimateEnterpriseStaticScan = {
  provider_or_network_findings: [],
  unbounded_loop_findings: [],
  forbidden_findings_total: 0,
};

describe("AI estimate enterprise load performance cost policy", () => {
  it("requires a meaningful two-route sample and zero external provider cost", () => {
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.minSamples).toBeGreaterThanOrEqual(80);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.requiredRoutes).toEqual([
      "/request",
      "/ai?context=foreman",
    ]);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.providerCallsAllowed).toBe(0);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.networkCallsAllowed).toBe(0);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.estimatedProviderCostUsdAllowed).toBe(0);
  });

  it("passes when the deterministic estimate pipeline stays inside policy", () => {
    const samples = Array.from(
      { length: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.minSamples },
      (_value, index) => sample(index, 50 + (index % 10)),
    );
    const evaluation = evaluateAiEstimateEnterpriseLoadPerformanceCost({
      loadProfile: profile(samples),
      costProfile: zeroCost,
      staticScan: cleanScan,
    });

    expect(evaluation.passed).toBe(true);
    expect(evaluation.failures).toEqual([]);
    expect(evaluation.summary.providerCalls).toBe(0);
    expect(evaluation.summary.networkCalls).toBe(0);
  });

  it("blocks latency, network, provider, heap, and static-scan regressions", () => {
    const samples = Array.from(
      { length: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.minSamples },
      (_value, index) => sample(index, AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.maxLatencyBudgetMs + 100),
    );
    const evaluation = evaluateAiEstimateEnterpriseLoadPerformanceCost({
      loadProfile: {
        ...profile(samples),
        heapDeltaBytes: AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.heapDeltaBudgetBytes + 1,
      },
      costProfile: {
        ...zeroCost,
        providerCalls: 1,
        networkCalls: 1,
        estimatedProviderCostUsd: 0.01,
      },
      staticScan: {
        provider_or_network_findings: ["src/lib/ai/builtInAi/example.ts:fetch"],
        unbounded_loop_findings: [],
        forbidden_findings_total: 1,
      },
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.failures).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^p95_latency_budget_exceeded:/),
        expect.stringMatching(/^max_latency_budget_exceeded:/),
        expect.stringMatching(/^average_latency_budget_exceeded:/),
        expect.stringMatching(/^heap_delta_budget_exceeded:/),
        "provider_calls_not_zero:1",
        "network_calls_not_zero:1",
        "provider_cost_not_zero:0.01",
        "static_forbidden_findings:1",
      ]),
    );
  });
});
