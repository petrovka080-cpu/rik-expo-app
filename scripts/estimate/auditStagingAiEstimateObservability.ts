import path from "node:path";

import { validateAiPlatformCostBudget } from "../../src/lib/aiPlatform/operations/AiPlatformCostBudget";
import { validateAiPlatformOpsSloPolicy } from "../../src/lib/aiPlatform/operations/AiPlatformOpsSlo";
import { validateAiPlatformStagingTelemetryPolicy } from "../../src/lib/aiPlatform/operations/AiPlatformStagingTelemetryPolicy";
import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_AI_ESTIMATE_OBSERVABILITY_READY =
  "GREEN_STAGING_AI_ESTIMATE_OBSERVABILITY_READY" as const;
export const STOP_STAGING_AI_ESTIMATE_OBSERVABILITY_FAILED_NO_GREEN =
  "STOP_STAGING_AI_ESTIMATE_OBSERVABILITY_FAILED_NO_GREEN" as const;

export function auditStagingAiEstimateObservability(input: { writeSummary?: boolean } = {}) {
  const telemetry = validateAiPlatformStagingTelemetryPolicy();
  const cost = validateAiPlatformCostBudget();
  const slo = validateAiPlatformOpsSloPolicy();
  const blockers = [
    ...telemetry.blocking_reasons,
    ...cost.blocking_reasons,
    ...slo.blocking_reasons,
  ];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_STAGING_AI_ESTIMATE_OBSERVABILITY_READY
      : STOP_STAGING_AI_ESTIMATE_OBSERVABILITY_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    ...telemetry,
    staging_cost_budget_enforced: cost.staging_cost_budget_enforced,
    daily_cost_budget_enforced: cost.daily_cost_budget_enforced,
    staging_latency_slo_enforced: slo.staging_latency_slo_enforced,
    staging_alert_rules_created: slo.staging_alert_rules_created,
    staging_memory_budget_violations_count: slo.staging_memory_budget_violations_count,
    blocking_reasons: blockers,
  };
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "observability", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/observability", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = auditStagingAiEstimateObservability({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
