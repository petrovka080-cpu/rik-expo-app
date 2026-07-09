import { runAiEstimateCoreBenchmark } from "../../scripts/estimate/benchmarkAiEstimateCore";

describe("AI estimate core benchmark", () => {
  it("keeps 100 critical cases across 5 iterations within SLO and memory budgets", () => {
    const benchmark = runAiEstimateCoreBenchmark({
      casesLimit: 100,
      iterations: 5,
      writeLedger: false,
      writeSummary: false,
      sourceSha: "test-source-sha",
    }).artifact;

    expect(benchmark.core_benchmark_created).toBe(true);
    expect(benchmark.benchmark_cases_total).toBeGreaterThanOrEqual(100);
    expect(benchmark.benchmark_iterations).toBeGreaterThanOrEqual(5);
    expect(benchmark.benchmark_operations_total).toBeGreaterThanOrEqual(1000);
    expect(benchmark.all_core_operations_within_slo).toBe(true);
    expect(benchmark.memory_budget_violations_count).toBe(0);
    expect(benchmark.final_status).toBe("GREEN_AI_ESTIMATE_CORE_BENCHMARK");
  });
});
