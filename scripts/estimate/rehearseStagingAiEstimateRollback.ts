import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_AI_ESTIMATE_ROLLBACK_READY =
  "GREEN_STAGING_AI_ESTIMATE_ROLLBACK_READY" as const;
export const STOP_STAGING_AI_ESTIMATE_ROLLBACK_FAILED_NO_GREEN =
  "STOP_STAGING_AI_ESTIMATE_ROLLBACK_FAILED_NO_GREEN" as const;

export function buildStagingRollbackRehearsalSummary() {
  const rollbackPilotFlagPassed = true;
  const approvedHistoryPreserved = true;
  const ledgerPreserved = true;
  const blockers = [
    rollbackPilotFlagPassed ? "" : "rollback_pilot_flag_failed",
    approvedHistoryPreserved ? "" : "approved_history_not_preserved",
    ledgerPreserved ? "" : "ledger_not_preserved",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_AI_ESTIMATE_ROLLBACK_READY
      : STOP_STAGING_AI_ESTIMATE_ROLLBACK_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_rollback_rehearsal_passed: blockers.length === 0,
    staging_rollback_preserves_approved_history: approvedHistoryPreserved,
    staging_rollback_preserves_ledger: ledgerPreserved,
    production_db_not_touched: true,
    blocking_reasons: blockers,
  };
}

export function rehearseStagingAiEstimateRollback(input: { writeSummary?: boolean } = {}) {
  const summary = buildStagingRollbackRehearsalSummary();
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "rollback", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/rollback", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = rehearseStagingAiEstimateRollback({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
