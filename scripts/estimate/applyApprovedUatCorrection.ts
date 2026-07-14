import path from "node:path";

import {
  loadUatFeedbackSchema,
  timestampForPath,
  writeJson,
} from "./buildRoleBasedUatDashboard";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-role-based-uat", "approved-correction");

export type ApprovedUatCorrection = {
  feedback_id: string;
  scenario_id: string;
  revision_id: string;
  approved_by_owner: boolean;
  changed_artifact: "formula" | "recipe" | "source" | "pricebook" | "ui_policy";
  previous_version: string;
  next_version: string;
  correction_reason: string;
  prompt_specific_hardcode: boolean;
  llm_quantity_correction: boolean;
  silent_correction: boolean;
};

function versionAdvanced(previousVersion: string, nextVersion: string): boolean {
  if (previousVersion === nextVersion) return false;
  const previous = previousVersion.split(".").map((part) => Number(part));
  const next = nextVersion.split(".").map((part) => Number(part));
  return next.some((part, index) => Number.isFinite(part) && part > (previous[index] ?? 0));
}

export function validateApprovedUatCorrection(correction: ApprovedUatCorrection) {
  const schema = loadUatFeedbackSchema();
  const blockers = [
    correction.feedback_id ? "" : "feedback_id_missing",
    correction.scenario_id ? "" : "scenario_id_missing",
    correction.revision_id ? "" : "revision_id_missing",
    correction.approved_by_owner ? "" : "owner_approval_missing",
    schema.approved_correction_requires.includes("version_bump") && versionAdvanced(correction.previous_version, correction.next_version)
      ? ""
      : "approved_correction_requires_version_bump",
    correction.changed_artifact ? "" : "changed_artifact_missing",
    correction.correction_reason ? "" : "correction_reason_missing",
    !correction.prompt_specific_hardcode ? "" : "prompt_specific_hardcode_rejected",
    !correction.llm_quantity_correction ? "" : "llm_quantity_correction_rejected",
    !correction.silent_correction ? "" : "silent_correction_rejected",
  ].filter(Boolean);
  return {
    approved_correction_valid: blockers.length === 0,
    approved_correction_requires_version_bump: true,
    no_silent_quantity_correction: !correction.silent_correction && !correction.llm_quantity_correction,
    no_prompt_specific_hardcode: !correction.prompt_specific_hardcode,
    blockers,
  };
}

export function runApprovedUatCorrectionDryRun() {
  const validCorrection: ApprovedUatCorrection = {
    feedback_id: "UAT-FB-P2-001",
    scenario_id: "UAT-CORE_REPAIR-001",
    revision_id: "uat-revision-redacted-001",
    approved_by_owner: true,
    changed_artifact: "recipe",
    previous_version: "1.0.0",
    next_version: "1.0.1",
    correction_reason: "Owner-approved UAT recipe clarification.",
    prompt_specific_hardcode: false,
    llm_quantity_correction: false,
    silent_correction: false,
  };
  const invalidCorrection: ApprovedUatCorrection = {
    ...validCorrection,
    next_version: "1.0.0",
    prompt_specific_hardcode: true,
    llm_quantity_correction: true,
    silent_correction: true,
  };
  const valid = validateApprovedUatCorrection(validCorrection);
  const invalid = validateApprovedUatCorrection(invalidCorrection);
  const blockers = [
    valid.approved_correction_valid ? "" : "valid_correction_rejected",
    !invalid.approved_correction_valid ? "" : "invalid_correction_accepted",
    invalid.blockers.includes("approved_correction_requires_version_bump") ? "" : "unversioned_feedback_fix_not_rejected",
    invalid.blockers.includes("prompt_specific_hardcode_rejected") ? "" : "prompt_specific_hardcode_not_rejected",
    invalid.blockers.includes("llm_quantity_correction_rejected") ? "" : "llm_quantity_correction_not_rejected",
    invalid.blockers.includes("silent_correction_rejected") ? "" : "silent_correction_not_rejected",
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_UAT_APPROVED_CORRECTION_GATE"
      : "STOP_AI_ESTIMATE_UAT_APPROVED_CORRECTION_GATE_FAILED",
    valid,
    invalid,
    blockers,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const { summary, outPath } = runApprovedUatCorrectionDryRun();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    blockers: summary.blockers,
    artifact: outPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
