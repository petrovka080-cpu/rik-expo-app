import path from "node:path";

import { validateAiPlatformCostBudget } from "../../src/lib/aiPlatform/operations/AiPlatformCostBudget";
import { validateAiPlatformRateLimitPolicy } from "../../src/lib/aiPlatform/operations/AiPlatformRateLimitPolicy";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_AI_RATE_LIMIT_READY =
  "GREEN_STAGING_AI_RATE_LIMIT_READY" as const;
export const STOP_STAGING_AI_RATE_LIMIT_FAILED_NO_GREEN =
  "STOP_STAGING_AI_RATE_LIMIT_FAILED_NO_GREEN" as const;

export function auditStagingAiRateLimits(input: { writeSummary?: boolean } = {}) {
  const rateLimit = validateAiPlatformRateLimitPolicy();
  const cost = validateAiPlatformCostBudget();
  const blockers = [...rateLimit.blocking_reasons, ...cost.blocking_reasons];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_STAGING_AI_RATE_LIMIT_READY
      : STOP_STAGING_AI_RATE_LIMIT_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...rateLimit,
    daily_cost_budget_enforced: cost.daily_cost_budget_enforced,
    large_prompt_budget_enforced: rateLimit.large_prompt_budget_enforced && cost.large_prompt_budget_enforced,
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "rate-limit", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/rate-limit", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = auditStagingAiRateLimits({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
