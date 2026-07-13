import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { newestSummary, currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";
import { GREEN_AI_ESTIMATE_CORE_BENCHMARK } from "./benchmarkAiEstimateCore";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "regression");
const BENCHMARK_ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "core-benchmark");
const BASELINE_PATH = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "baseline", "summary.json");

export const GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE = "GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE" as const;
export const STOP_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE_FAILED = "STOP_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE_FAILED" as const;

type BenchmarkSummary = {
  final_status?: string;
  source_sha?: string;
  all_core_operations_within_slo?: boolean;
  slo_records?: { operation: string; p95Ms: number }[];
};

function readBaseline(): BenchmarkSummary | null {
  if (!existsSync(BASELINE_PATH)) return null;
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as BenchmarkSummary;
}

export function auditAiEstimatePerformanceRegression() {
  const current = newestSummary<BenchmarkSummary>(
    BENCHMARK_ROOT,
    (summary) => summary.final_status === GREEN_AI_ESTIMATE_CORE_BENCHMARK,
  );
  const baseline = readBaseline();
  const currentRecords = current?.summary.slo_records ?? [];
  const baselineRecords = baseline?.slo_records ?? [];
  const regressionFindings = baselineRecords.flatMap((baselineRecord) => {
    const currentRecord = currentRecords.find((item) => item.operation === baselineRecord.operation);
    if (!currentRecord) return [`missing_current_record:${baselineRecord.operation}`];
    return currentRecord.p95Ms <= baselineRecord.p95Ms * 1.2
      ? []
      : [`performance_regression_over_20_percent:${baselineRecord.operation}:${currentRecord.p95Ms}/${baselineRecord.p95Ms}`];
  });
  const absoluteSloPassed = current?.summary.all_core_operations_within_slo === true;
  const baselineCreated = !baseline;
  const blockers = [
    current ? "" : "benchmark_summary_missing",
    absoluteSloPassed ? "" : "baseline_missing_and_absolute_slo_failed",
    ...regressionFindings,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE
      : STOP_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE_FAILED,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    performance_regression_gate_created: true,
    baseline_created: baselineCreated,
    regression_gate_status: baselineCreated ? "baseline_created" : "compared_to_baseline",
    absolute_slo_passed: absoluteSloPassed,
    regression_over_20_percent_count: regressionFindings.length,
    performance_regression_over_20_percent: regressionFindings.length > 0,
    baseline_missing_and_absolute_slo_failed: baselineCreated && !absoluteSloPassed,
    benchmark_summary_path: current?.path ?? null,
    blocking_reasons: blockers,
    fake_green_claimed: false,
  };
  const result = writeRuntimeJson(ROOT, summary);
  return { artifactPath: result.artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimatePerformanceRegression.ts")) {
  const result = auditAiEstimatePerformanceRegression();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    regression_over_20_percent_count: result.artifact.regression_over_20_percent_count,
    blocking_reasons: result.artifact.blocking_reasons,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PERFORMANCE_REGRESSION_GATE) process.exitCode = 1;
}
