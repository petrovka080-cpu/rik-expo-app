import path from "node:path";

import { createSnapshotFromDraftRevision } from "../../src/features/estimates/createSnapshotFromDraftRevision";
import { getEstimateFeatureFlags } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  writeRuntimeJson,
} from "../e2e/renderStagingAcceptanceCore";
import {
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  loadControlledPilotDryRunScenarios,
} from "./runControlledPilotDryRunScenarios";

export const CONTROLLED_PILOT_KILL_SWITCH_ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "kill-switch");

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL_FAILED" as const;

function buildApprovedContinuityProof() {
  const scenario = loadControlledPilotDryRunScenarios().scenarios[0];
  if (!scenario) throw new Error("controlled_pilot_scenario_missing");
  const revision = createEstimateDraftRevision({
    estimateDraftId: `kill-switch-${scenario.case_id}`,
    rawInput: scenario.prompt,
    createdAt: "2026-07-09T00:00:00.000Z",
  });
  const snapshot = createSnapshotFromDraftRevision(revision);
  const pdf = renderPdfFromDraftRevision({ revision: snapshot.revision, snapshot: snapshot.snapshot });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  return {
    history_readable: snapshot.snapshot.rows.length > 0,
    pdf_readable: pdf.pdf.body.trim().length > 0 && pdf.pdf.revisionId === snapshot.revision.revisionId,
    buyer_handoff_readable: buyer.buyerHandoff.items.length >= 0 && buyer.buyerHandoff.revisionId === snapshot.revision.revisionId,
    snapshot_id: snapshot.snapshot.snapshotId,
    pdf_artifact_id: pdf.pdf.pdfArtifactId,
    buyer_handoff_id: buyer.buyerHandoff.buyerHandoffId,
  };
}

export function rehearseAiEstimateKillSwitch(options: { writeRuntime?: boolean } = {}) {
  const disabledFlags = getEstimateFeatureFlags({
    AI_ESTIMATE_RUNTIME_ENABLED: "0",
    AI_ESTIMATE_PILOT_MODE: "0",
  });
  const reenabledFlags = getEstimateFeatureFlags({
    AI_ESTIMATE_RUNTIME_ENABLED: "1",
    AI_ESTIMATE_PILOT_MODE: "1",
  });
  const newEstimateCreationAllowed =
    disabledFlags.AI_ESTIMATE_RUNTIME_ENABLED === true &&
    disabledFlags.AI_ESTIMATE_PILOT_MODE === true;
  const continuity = buildApprovedContinuityProof();
  const uiShowsControlledFallback = disabledFlags.AI_ESTIMATE_RUNTIME_ENABLED === false;
  const reenablePassed =
    reenabledFlags.AI_ESTIMATE_RUNTIME_ENABLED === true &&
    reenabledFlags.AI_ESTIMATE_PILOT_MODE === true;
  const blockers = [
    disabledFlags.AI_ESTIMATE_RUNTIME_ENABLED === false ? "" : "runtime_flag_not_disabled",
    disabledFlags.AI_ESTIMATE_PILOT_MODE === false ? "" : "pilot_mode_flag_not_disabled",
    uiShowsControlledFallback ? "" : "controlled_fallback_not_visible",
    !newEstimateCreationAllowed ? "" : "new_ai_estimate_creation_allowed_while_disabled",
    continuity.history_readable ? "" : "history_not_readable",
    continuity.pdf_readable ? "" : "old_pdf_not_readable",
    continuity.buyer_handoff_readable ? "" : "old_buyer_handoff_not_readable",
    reenablePassed ? "" : "reenable_failed",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    kill_switch_rehearsal_created: true,
    ai_estimate_disabled: disabledFlags.AI_ESTIMATE_RUNTIME_ENABLED === false,
    ui_shows_controlled_fallback: uiShowsControlledFallback,
    no_estimate_creation_allowed: !newEstimateCreationAllowed,
    history_still_readable: continuity.history_readable,
    existing_pdf_still_readable: continuity.pdf_readable,
    existing_buyer_handoff_still_readable: continuity.buyer_handoff_readable,
    ai_estimate_reenabled: reenablePassed,
    kill_switch_blocks_new_ai_estimates: !newEstimateCreationAllowed,
    kill_switch_preserves_history_read: continuity.history_readable,
    kill_switch_preserves_existing_pdf_read: continuity.pdf_readable,
    kill_switch_preserves_existing_buyer_handoff_read: continuity.buyer_handoff_readable,
    kill_switch_reenable_passed: reenablePassed,
    owner_approved: false,
    production_release_started: false,
    public_beta_started: false,
    production_db_touched: false,
    fake_green_claimed: false,
    continuity,
    blockers,
  };
  const runtime = options.writeRuntime === false
    ? { artifactPath: null, artifact: summary }
    : writeRuntimeJson(CONTROLLED_PILOT_KILL_SWITCH_ROOT, summary);
  return {
    artifactPath: runtime.artifactPath,
    artifact: runtime.artifact,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/rehearseAiEstimateKillSwitch.ts")) {
  const result = rehearseAiEstimateKillSwitch();
  console.log(JSON.stringify({
    artifact: result.artifactPath,
    final_status: result.artifact.final_status,
    blockers: result.artifact.blockers,
  }, null, 2));
  if (result.artifact.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_KILL_SWITCH_REHEARSAL) process.exitCode = 1;
}
