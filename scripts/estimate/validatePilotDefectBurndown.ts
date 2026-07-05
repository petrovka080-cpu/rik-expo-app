import {
  buildPilotGoNoGoDecision,
  buildPilotLaunchReadinessSummary,
  gitOutput,
  latestSummary,
  loadPilotDefectBurndown,
  loadPilotGoNoGoPolicy,
  loadPilotLaunchCases,
  validatePilotDefectBurndown,
  writeJson,
  PILOT_LAUNCH_RUNTIME_ROOT,
  STOP_AI_ESTIMATE_PILOT_LAUNCH_READINESS_FAILED_NO_GREEN,
  GREEN_AI_ESTIMATE_PILOT_LAUNCH_READY_FOR_OWNER_GO_NO_GO_COMMITTED_NO_BUILDS,
} from "./buildPilotDefectBurndown";
import path from "node:path";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function validatePilotLaunchPreconditions() {
  const summary = buildPilotLaunchReadinessSummary({
    requireRuntimeEvidence: false,
    requireGitClean: false,
    writeRuntime: false,
  });
  const blockers = [
    summary.role_based_uat_precondition_passed ? "" : "role_based_uat_precondition_failed",
    summary.layered_acceptance_precondition_passed ? "" : "layered_acceptance_precondition_failed",
    summary.controlled_pilot_web_android_precondition_passed ? "" : "controlled_pilot_precondition_failed",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_LAUNCH_PRECONDITIONS"
      : "STOP_AI_ESTIMATE_PILOT_LAUNCH_PRECONDITIONS_FAILED",
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    role_based_uat_precondition_passed: summary.role_based_uat_precondition_passed,
    layered_acceptance_precondition_passed: summary.layered_acceptance_precondition_passed,
    controlled_pilot_web_android_precondition_passed: summary.controlled_pilot_web_android_precondition_passed,
    blockers,
  };
}

export function validatePilotGoNoGoPolicyOnly() {
  const policy = loadPilotGoNoGoPolicy() as Record<string, any>;
  const decision = buildPilotGoNoGoDecision({
    p0_defects_count: 0,
    p1_defects_count: 0,
    web_passed: true,
    android_passed: true,
    daily_regression_passed: true,
    support_secret_scan_passed: true,
    kill_switch_rehearsal_passed: true,
    rollback_rehearsal_passed: true,
    artifact_lineage_audit_passed: true,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
  });
  const p0Rejected = buildPilotGoNoGoDecision({
    p0_defects_count: 1,
    p1_defects_count: 0,
    web_passed: true,
    android_passed: true,
    daily_regression_passed: true,
    support_secret_scan_passed: true,
    kill_switch_rehearsal_passed: true,
    rollback_rehearsal_passed: true,
    artifact_lineage_audit_passed: true,
    owner_go_no_go_status: "PENDING_OWNER_REVIEW",
  });
  const blockers = [
    policy.acceptance?.go_no_go_policy_created === true ? "" : "go_no_go_policy_acceptance_missing",
    policy.owner_controls?.owner_approval_must_not_be_faked === true ? "" : "owner_approval_fake_guard_missing",
    decision.technical_go_ready ? "" : "go_no_go_positive_case_failed",
    p0Rejected.technical_go_ready === false ? "" : "p0_go_not_rejected",
    decision.owner_approval_not_faked ? "" : "owner_approval_faked",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_GO_NO_GO_POLICY"
      : "STOP_AI_ESTIMATE_PILOT_GO_NO_GO_POLICY_FAILED",
    go_no_go_policy_created: policy.acceptance?.go_no_go_policy_created === true,
    p0_blocks_go: p0Rejected.technical_go_ready === false,
    owner_approval_not_faked: decision.owner_approval_not_faked,
    blockers,
  };
}

export function validatePilotArtifactLineageOnly() {
  const summary = buildPilotLaunchReadinessSummary({
    requireRuntimeEvidence: false,
    requireGitClean: false,
    writeRuntime: false,
  });
  const blockers = [
    summary.role_based_uat_precondition_passed ? "" : "role_based_uat_lineage_failed",
    summary.layered_acceptance_precondition_passed ? "" : "layered_lineage_failed",
    summary.controlled_pilot_web_android_precondition_passed ? "" : "controlled_lineage_failed",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PILOT_ARTIFACT_LINEAGE"
      : "STOP_AI_ESTIMATE_PILOT_ARTIFACT_LINEAGE_FAILED",
    source_sha: summary.source_sha,
    role_based_uat_summary_path: summary.role_based_uat_summary_path,
    layered_acceptance_summary_path: summary.layered_acceptance_summary_path,
    controlled_pilot_web_summary_path: summary.controlled_pilot_web_summary_path,
    blockers,
  };
}

export function validatePilotDefectsOnly() {
  const validation = validatePilotDefectBurndown({
    burndown: loadPilotDefectBurndown(),
  });
  return {
    final_status: validation.defect_burndown_validation_passed
      ? "GREEN_AI_ESTIMATE_PILOT_DEFECT_BURNDOWN_VALIDATED"
      : "STOP_AI_ESTIMATE_PILOT_DEFECT_BURNDOWN_FAILED",
    ...validation,
  };
}

export function validatePilotLaunchReadiness(options: {
  requireSourceGates?: boolean;
  sourceGatesPassed?: boolean;
  writeRuntime?: boolean;
} = {}) {
  return buildPilotLaunchReadinessSummary({
    requireRuntimeEvidence: true,
    requireGitClean: true,
    requireSourceGates: options.requireSourceGates,
    sourceGatesPassed: options.sourceGatesPassed,
    writeRuntime: options.writeRuntime,
  });
}

function writeValidationArtifact(name: string, summary: Record<string, unknown>) {
  const outPath = path.join(PILOT_LAUNCH_RUNTIME_ROOT, name, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return outPath;
}

if (require.main === module) {
  let summary: Record<string, any>;
  let outPath: string | null = null;

  if (hasFlag("verify-preconditions")) {
    summary = validatePilotLaunchPreconditions();
    outPath = writeValidationArtifact("preconditions", summary);
  } else if (hasFlag("verify-policy")) {
    summary = validatePilotGoNoGoPolicyOnly();
    outPath = writeValidationArtifact("go-no-go-policy", summary);
  } else if (hasFlag("verify-lineage")) {
    summary = validatePilotArtifactLineageOnly();
    outPath = writeValidationArtifact("artifact-lineage", summary);
  } else if (hasFlag("verify-readiness")) {
    summary = validatePilotLaunchReadiness({
      requireSourceGates: hasFlag("require-source-gates"),
      sourceGatesPassed: hasFlag("source-gates-passed"),
      writeRuntime: true,
    });
    outPath = String(summary.runtime_summary_path ?? "");
  } else {
    summary = validatePilotDefectsOnly();
    outPath = writeValidationArtifact("defect-burndown-validation", summary);
  }

  console.log(JSON.stringify({
    final_status: summary.final_status,
    source_sha: summary.source_sha,
    branch: summary.branch,
    cases_total: loadPilotLaunchCases().length,
    p0_defects_count: summary.p0_defects_count,
    p1_defects_count: summary.p1_defects_count,
    owner_go_no_go_status: summary.owner_go_no_go_status,
    blockers: (summary.blockers ?? summary.blocking_reasons ?? []).slice(0, 40),
    artifact: outPath,
  }, null, 2));

  const failed = summary.final_status === STOP_AI_ESTIMATE_PILOT_LAUNCH_READINESS_FAILED_NO_GREEN ||
    (hasFlag("verify-readiness") &&
      summary.final_status !== GREEN_AI_ESTIMATE_PILOT_LAUNCH_READY_FOR_OWNER_GO_NO_GO_COMMITTED_NO_BUILDS) ||
    (Array.isArray(summary.blockers) && summary.blockers.length > 0) ||
    (Array.isArray(summary.blocking_reasons) && summary.blocking_reasons.length > 0);
  if (failed) process.exitCode = 1;
}
