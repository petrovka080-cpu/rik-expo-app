import { execFileSync } from "node:child_process";

type BenchmarkArtifact = ReturnType<
  typeof import("../../scripts/estimate/benchmarkAiEstimateCore")["runAiEstimateCoreBenchmark"]
>["artifact"];

function runResidentBenchmarkOutsideJestTransform(): BenchmarkArtifact {
  const script = [
    "const benchmark = require('./scripts/estimate/benchmarkAiEstimateCore');",
    "const result = benchmark.runAiEstimateCoreBenchmark({ casesLimit: 100, iterations: 5, writeLedger: false, writeSummary: false, sourceSha: 'test-source-sha' });",
    "process.stdout.write(JSON.stringify(result.artifact));",
  ].join(" ");
  return JSON.parse(execFileSync(process.execPath, ["-r", "tsx/cjs", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 300_000,
  })) as BenchmarkArtifact;
}

describe("AI estimate core benchmark", () => {
  it("keeps 100 critical cases across 5 iterations within SLO and memory budgets", () => {
    const benchmark = runResidentBenchmarkOutsideJestTransform();

    expect(benchmark.core_benchmark_created).toBe(true);
    expect(benchmark.benchmark_cases_total).toBeGreaterThanOrEqual(100);
    expect(benchmark.benchmark_iterations).toBeGreaterThanOrEqual(5);
    expect(benchmark.benchmark_operations_total).toBeGreaterThanOrEqual(1000);
    expect(benchmark.benchmark_warmup_operations).toBe(1);
    expect(benchmark.measurement_profile).toBe("resident_catalog_after_explicit_warmup");
    expect(benchmark.all_core_operations_within_slo).toBe(true);
    expect(benchmark.memory_budget_violations_count).toBe(0);
    expect(benchmark.final_status).toBe("GREEN_AI_ESTIMATE_CORE_BENCHMARK");
  });
});
