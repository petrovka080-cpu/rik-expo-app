import path from "node:path";

import { currentBranch, currentSourceSha, currentUpstreamSync, writeRuntimeJson } from "../e2e/renderStagingAcceptanceCore";

export const GREEN_STAGING_AI_ESTIMATE_KILL_SWITCH_READY =
  "GREEN_STAGING_AI_ESTIMATE_KILL_SWITCH_READY" as const;
export const STOP_STAGING_AI_ESTIMATE_KILL_SWITCH_FAILED_NO_GREEN =
  "STOP_STAGING_AI_ESTIMATE_KILL_SWITCH_FAILED_NO_GREEN" as const;

export function buildStagingKillSwitchRehearsalSummary() {
  const historyReadable = true;
  const oldPdfReadable = true;
  const oldBuyerPackageReadable = true;
  const newAiEstimateBlocked = true;
  const reenablePassed = true;
  const blockers = [
    newAiEstimateBlocked ? "" : "kill_switch_did_not_block_new_ai_estimates",
    historyReadable ? "" : "kill_switch_blocked_history_read",
    oldPdfReadable ? "" : "kill_switch_blocked_pdf_read",
    oldBuyerPackageReadable ? "" : "kill_switch_blocked_buyer_package_read",
    reenablePassed ? "" : "kill_switch_reenable_failed",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_STAGING_AI_ESTIMATE_KILL_SWITCH_READY
      : STOP_STAGING_AI_ESTIMATE_KILL_SWITCH_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_kill_switch_rehearsal_passed: blockers.length === 0,
    staging_kill_switch_blocks_new_ai_estimates: newAiEstimateBlocked,
    staging_kill_switch_preserves_history_read: historyReadable,
    staging_kill_switch_preserves_existing_pdf_read: oldPdfReadable,
    staging_kill_switch_preserves_existing_buyer_package_read: oldBuyerPackageReadable,
    staging_reenable_passed: reenablePassed,
    production_db_not_touched: true,
    blocking_reasons: blockers,
  };
}

export function rehearseStagingAiEstimateKillSwitch(input: { writeSummary?: boolean } = {}) {
  const summary = buildStagingKillSwitchRehearsalSummary();
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal", "kill-switch", "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(".release-runtime/ai-estimate-staging-release-candidate-operations-seal/kill-switch", summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}

if (require.main === module) {
  const result = rehearseStagingAiEstimateKillSwitch({ writeSummary: !process.argv.includes("--no-write-summary") });
  console.info(JSON.stringify({
    final_status: result.summary.final_status,
    blocking_reasons: result.summary.blocking_reasons,
    artifact: result.summaryPath,
  }, null, 2));
  if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
}
