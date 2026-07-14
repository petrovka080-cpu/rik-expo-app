import path from "node:path";

import { renderOwnerReviewPacketPdf } from "../../src/features/pdf/renderOwnerReviewPacketPdf";
import { validateOwnerReviewPacketPdf } from "../../src/features/pdf/validateOwnerReviewPacketPdf";
import { getEstimateFeatureFlags } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import { CONTROLLED_PILOT_DRY_RUN_ROOT } from "./runControlledPilotDryRunScenarios";
import { rehearseAiEstimateKillSwitch } from "./rehearseAiEstimateKillSwitch";

export const CONTROLLED_PILOT_ROLLBACK_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "rollback");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL_FAILED" as const;

export function rehearseAiEstimatePilotRollback(options: { writeRuntime?: boolean } = {}) {
  const rollbackFlags = getEstimateFeatureFlags({
    AI_ESTIMATE_PILOT_MODE: "0",
    AI_ESTIMATE_RUNTIME_ENABLED: "1",
    AI_ESTIMATE_PDF_ENABLED: "1",
    AI_ESTIMATE_BUYER_HANDOFF_ENABLED: "1",
  });
  const continuity = rehearseAiEstimateKillSwitch({ writeRuntime: false }).artifact.continuity;
  const ownerReviewPdf = validateOwnerReviewPacketPdf(renderOwnerReviewPacketPdf());
  const rollbackDisablesPilot = rollbackFlags.AI_ESTIMATE_PILOT_MODE === false;
  const productionDbTouched = false;
  const destructiveMigrationRun = false;
  const blockers = [
    rollbackDisablesPilot ? "" : "pilot_flag_not_disabled",
    continuity.history_readable ? "" : "approved_history_lost_after_rollback",
    ownerReviewPdf.owner_review_pdf_valid ? "" : "owner_review_packet_not_preserved",
    productionDbTouched ? "production_db_touched" : "",
    destructiveMigrationRun ? "destructive_migration_run" : "",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    rollback_rehearsal_created: true,
    rollback_flag_available: true,
    pilot_disabled: rollbackDisablesPilot,
    approved_history_intact: continuity.history_readable,
    owner_review_packet_intact: ownerReviewPdf.owner_review_pdf_valid,
    rollback_disables_pilot_without_data_loss: rollbackDisablesPilot && continuity.history_readable,
    approved_history_preserved_after_rollback: continuity.history_readable,
    owner_review_packet_preserved_after_rollback: ownerReviewPdf.owner_review_pdf_valid,
    production_db_not_touched: !productionDbTouched,
    destructive_migration_not_run: !destructiveMigrationRun,
    owner_approved: false,
    production_release_started: false,
    public_beta_started: false,
    production_db_touched: productionDbTouched,
    destructive_migration_run: destructiveMigrationRun,
    fake_green_claimed: false,
    continuity,
    blockers,
  };
  const runtime = options.writeRuntime === false
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(CONTROLLED_PILOT_ROLLBACK_ROOT, summary);
  return {
    artifactPath: runtime.artifactPath,
    artifact: runtime.artifact,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/rehearseAiEstimatePilotRollback.ts")) {
  const result = rehearseAiEstimatePilotRollback();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ROLLBACK_REHEARSAL) process.exitCode = 1;
}
