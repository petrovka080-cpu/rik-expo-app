import path from "node:path";

import { validateAiEstimatePerformanceScaleBudget } from "../../src/lib/platform/aiEstimateScaleBudget";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "scale-budget");

export const GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET = "GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET" as const;
export const STOP_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET_FAILED = "STOP_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET_FAILED" as const;

export function auditAiEstimateScaleBudget() {
  const validation = validateAiEstimatePerformanceScaleBudget();
  const summary = {
    final_status: validation.passed
      ? GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET
      : STOP_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET_FAILED,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...validation,
    fake_green_claimed: false,
  };
  return writeRuntimeJson(ROOT, summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditAiEstimateScaleBudget.ts")) {
  const result = auditAiEstimateScaleBudget();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    failures: result.artifact.failures,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_PERFORMANCE_SCALE_BUDGET) process.exitCode = 1;
}
