import path from "node:path";

import { AI_RUNTIME_KERNEL_VERSION } from "../../src/lib/aiPlatform/kernel/AiRuntimeKernelContract";
import { runAiEvalCases, AI_EVAL_PROMPT_VERSION } from "../../src/lib/aiPlatform/eval/AiEvalRunner";
import { summarizeAiEvalResults } from "../../src/lib/aiPlatform/eval/AiEvalResult";
import { validateAiEvalCostLatency } from "../../src/lib/aiPlatform/eval/validateAiEvalCostLatency";
import {
  AI_ESTIMATE_GOLDEN_CASES_FIXTURE,
  AI_PLATFORM_EVALOPS_ROOT,
  currentGitState,
  loadAiEvalFixture,
  timestampForPath,
  writeJson,
} from "./evalOpsAuditUtils";

export const GREEN_AI_EVAL_COST_LATENCY = "GREEN_AI_EVAL_COST_LATENCY" as const;
export const STOP_AI_EVAL_COST_LATENCY_FAILED = "STOP_AI_EVAL_COST_LATENCY_FAILED" as const;

export async function benchmarkAiEvalCostLatency(input: { writeSummary?: boolean } = {}) {
  const git = currentGitState();
  const cases = loadAiEvalFixture(AI_ESTIMATE_GOLDEN_CASES_FIXTURE).cases.slice(0, 120);
  const evalRunId = `cost-latency-${timestampForPath()}`;
  const results = await runAiEvalCases(cases, {
    evalRunId,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
  });
  const runSummary = summarizeAiEvalResults({
    evalRunId,
    sourceSha: git.source_sha,
    runtimeVersion: AI_RUNTIME_KERNEL_VERSION,
    promptVersion: AI_EVAL_PROMPT_VERSION,
    providerKey: "eval_in_memory_provider",
    modelKey: "eval-contract-model",
    results,
  });
  const costLatency = validateAiEvalCostLatency(runSummary);
  const summary = {
    final_status: costLatency.ok ? GREEN_AI_EVAL_COST_LATENCY : STOP_AI_EVAL_COST_LATENCY_FAILED,
    ...git,
    generated_at: new Date().toISOString(),
    ...costLatency,
    p95_duration_ms: runSummary.p95DurationMs,
    blockers: costLatency.ok ? [] : ["cost_latency_failed"],
  };
  const summaryPath = path.join(AI_PLATFORM_EVALOPS_ROOT, "cost-latency", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  void benchmarkAiEvalCostLatency({ writeSummary: true }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_EVAL_COST_LATENCY) process.exitCode = 1;
  });
}
