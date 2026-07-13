import path from "node:path";

import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { runAiEvalCases, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import { summarizeAiEvalResults } from "../../src/lib/aiPlatform/eval/AiEvalResult";
import { validateAiEvalCostLatency } from "../../src/lib/aiPlatform/eval/validateAiEvalCostLatency";
import {
  AI_ESTIMATE_GOLDEN_CASES_FIXTURE,
  AI_PLATFORM_EVALOPS_ROOT,
  countCasesByTag,
  currentGitState,
  loadAiEvalFixture,
  timestampForPath,
  writeJson,
} from "./evalOpsAuditUtils";

export const GREEN_AI_ESTIMATE_GOLDEN_EVAL = "GREEN_AI_ESTIMATE_GOLDEN_EVAL" as const;
export const STOP_AI_ESTIMATE_GOLDEN_EVAL_FAILED = "STOP_AI_ESTIMATE_GOLDEN_EVAL_FAILED" as const;

const requiredFamilies = [
  "apartment_capital_renovation",
  "bathroom_renovation",
  "road_construction",
  "water_supply",
  "sewerage",
  "power_line",
  "substation",
  "ventilated_facade",
  "roofing",
  "drilling",
  "fence",
  "dam",
  "bridge",
  "boiler",
  "ventilation",
  "electric",
  "heating",
  "demolition",
  "concrete",
  "glazing",
] as const;

export async function runAiEstimateGoldenEval(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const fixture = loadAiEvalFixture(AI_ESTIMATE_GOLDEN_CASES_FIXTURE);
  const evalRunId = `estimate-golden-${timestampForPath()}`;
  const results = await runAiEvalCases(fixture.cases, {
    evalRunId,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey: "golden_eval_provider",
    modelKey: "golden-eval-model",
  });
  const runSummary = summarizeAiEvalResults({
    evalRunId,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey: "golden_eval_provider",
    modelKey: "golden-eval-model",
    results,
  });
  const costLatency = validateAiEvalCostLatency(runSummary);
  const familiesCovered = requiredFamilies.every((family) =>
    fixture.cases.some((testCase) => testCase.expected.workFamily === family)
  );
  const counts = {
    estimate_golden_cases_total: fixture.cases.length,
    critical_construction_cases_count: countCasesByTag(fixture.cases, "critical_construction"),
    unit_conflict_cases_count: countCasesByTag(fixture.cases, "unit_conflict"),
    missing_input_cases_count: countCasesByTag(fixture.cases, "missing_input"),
    parameter_override_cases_count: countCasesByTag(fixture.cases, "parameter_override"),
    pdf_buyer_parity_cases_count: countCasesByTag(fixture.cases, "pdf_buyer_parity"),
    negative_forbidden_cases_count: countCasesByTag(fixture.cases, "negative_forbidden"),
  };
  const blockers = [
    fixture.cases.length >= 700 ? "" : "estimate_golden_cases_below_700",
    counts.critical_construction_cases_count >= 100 ? "" : "critical_construction_below_100",
    counts.unit_conflict_cases_count >= 100 ? "" : "unit_conflict_below_100",
    counts.missing_input_cases_count >= 100 ? "" : "missing_input_below_100",
    counts.parameter_override_cases_count >= 100 ? "" : "parameter_override_below_100",
    counts.pdf_buyer_parity_cases_count >= 50 ? "" : "pdf_buyer_parity_below_50",
    counts.negative_forbidden_cases_count >= 50 ? "" : "negative_forbidden_below_50",
    familiesCovered ? "" : "critical_work_families_missing",
    runSummary.failed === 0 && runSummary.blocked === 0 ? "" : "golden_cases_failed",
    costLatency.ok ? "" : "cost_latency_failed",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0 ? GREEN_AI_ESTIMATE_GOLDEN_EVAL : STOP_AI_ESTIMATE_GOLDEN_EVAL_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    ai_estimate_golden_eval_corpus_created: true,
    ...counts,
    critical_work_families_covered: familiesCovered,
    eval_run_id: evalRunId,
    passed: runSummary.passed,
    failed: runSummary.failed,
    blocked: runSummary.blocked,
    min_score: runSummary.minScore,
    average_score: runSummary.averageScore,
    p95_duration_ms: runSummary.p95DurationMs,
    cost_latency: costLatency,
    blockers,
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "golden-eval", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath, runSummary };
}

if (require.main === module) {
  void runAiEstimateGoldenEval({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_ESTIMATE_GOLDEN_EVAL) process.exitCode = 1;
  });
}
