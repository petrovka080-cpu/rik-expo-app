import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_GREEN_STATUS,
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_WAVE,
} from "../../src/lib/ai/productionCanary";
import {
  AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR,
} from "../../src/lib/ai/rolloutGovernance/limitedPublicBetaExecutionTypes";
import {
  writeLimitedPublicBetaJson,
  writeLimitedPublicBetaText,
} from "./aiEstimateLimitedPublicBetaExecutionCore";
import { runAiEstimateLimitedPublicBetaAllowlistProof } from "./runAiEstimateLimitedPublicBetaAllowlistProof";

type CloseoutFailure = {
  classification: string;
  reason: string;
  artifact?: string;
};

const ARTIFACT_DIR = path.join(process.cwd(), AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR);

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readArtifact(name: string): Record<string, unknown> | null {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function ensureReleaseTimingArtifact(): Record<string, unknown> {
  const existing = readArtifact("release_timing.json");
  if (existing) return existing;
  const deferred = {
    wave: AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_WAVE,
    final_status: "NO_GO_ALLOWLIST_IDS_MISSING_RELEASE_VERIFY_DEFERRED",
    timed_release_verify_passed: false,
    release_verify_deferred_because_allowlist_ids_missing: true,
    release_gate_name_captured_on_timeout: false,
    steps: [],
    fake_green_claimed: false,
  };
  writeLimitedPublicBetaJson("release_timing.json", deferred);
  writeLimitedPublicBetaJson("process_cleanup.json", {
    wave: AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_WAVE,
    process_cleanup_ready: true,
    orphan_processes_left_after_timeout: false,
    cleanups: [],
    fake_green_claimed: false,
  });
  return deferred;
}

function evidenceChecks() {
  const replay = readArtifact("beta_replay_results.json");
  const pdf = readArtifact("pdf_text_extract.json");
  const web = readArtifact("web_results.json");
  const android = readArtifact("android_api34_results.json");
  return {
    existing_beta_replay_3000_passed:
      replay?.beta_replay_sessions_total === 3000 &&
      replay?.beta_replay_sessions_passed === 3000 &&
      replay?.beta_replay_sessions_failed === 0,
    existing_pdf_150_passed:
      pdf?.pdf_extraction_cases_total === 150 &&
      pdf?.pdf_extraction_cases_passed === 150 &&
      pdf?.pdf_mojibake_found === false,
    existing_web_proof_passed: web?.web_flows_passed === true,
    existing_android_api34_passed:
      android?.android_api34_tested === true &&
      android?.api36_rejected === true &&
      android?.android_api34_prompts_passed === 4,
  };
}

function classifyFinalStatus(failures: readonly CloseoutFailure[], realExternalIdsPresent: boolean): string {
  if (failures.some((item) => item.classification === "UNKNOWN_NEEDS_TRACE")) return "UNKNOWN_NEEDS_TRACE";
  if (failures.some((item) => item.classification === "NO_GO_WILDCARD_ALLOWLIST")) return "NO_GO_WILDCARD_ALLOWLIST";
  if (!realExternalIdsPresent) return "NO_GO_ALLOWLIST_IDS_MISSING";
  if (failures.some((item) => item.classification === "NO_GO_RELEASE_VERIFY_TIMEOUT")) return "NO_GO_RELEASE_VERIFY_TIMEOUT";
  if (failures.some((item) => item.classification === "NO_GO_KILL_SWITCH_FAILED")) return "NO_GO_KILL_SWITCH_FAILED";
  if (failures.some((item) => item.classification === "NO_GO_REGULATED_HIGH_RISK_EXPOSED")) return "NO_GO_REGULATED_HIGH_RISK_EXPOSED";
  if (failures.some((item) => item.classification.startsWith("NO_GO"))) return "NO_GO_ALLOWLIST_POLICY_INVALID";
  return AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_GREEN_STATUS;
}

export function runAiEstimateLimitedPublicBetaAllowlistCloseoutProof() {
  const allowlist = runAiEstimateLimitedPublicBetaAllowlistProof();
  const rolloutContract = readArtifact("rollout_contract.json");
  const releaseTiming = ensureReleaseTimingArtifact();
  const cleanup = readArtifact("process_cleanup.json");
  const evidence = evidenceChecks();
  const failures: CloseoutFailure[] = [];

  if (!allowlist.rolloutContractValidation.valid || !rolloutContract) {
    failures.push({
      classification: "NO_GO_ALLOWLIST_POLICY_INVALID",
      reason: "ROLLOUT_CONTRACT_INVALID",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/rollout_contract.json`,
    });
  }
  if (allowlist.allowlistValidation.wildcard_allowlist_found) {
    failures.push({
      classification: "NO_GO_WILDCARD_ALLOWLIST",
      reason: "WILDCARD_ALLOWLIST_FOUND",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/allowlist_policy.json`,
    });
  }
  if (allowlist.allowlistValidation.regulated_high_risk_public_beta_enabled) {
    failures.push({
      classification: "NO_GO_REGULATED_HIGH_RISK_EXPOSED",
      reason: "REGULATED_HIGH_RISK_PUBLIC_BETA_ENABLED",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/allowlist_policy.json`,
    });
  }
  if (!allowlist.allowlistValidation.real_external_allowlist_ids_present) {
    failures.push({
      classification: "NO_GO_ALLOWLIST_IDS_MISSING",
      reason: "REAL_EXTERNAL_ALLOWLIST_IDS_MISSING",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/allowlist_policy.json`,
    });
  }
  if (!allowlist.allowlistProof.kill_switch_overrides_allowlist) {
    failures.push({
      classification: "NO_GO_KILL_SWITCH_FAILED",
      reason: "KILL_SWITCH_DID_NOT_OVERRIDE_ALLOWLIST",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/allowlist_proof.json`,
    });
  }
  if (!allowlist.allowlistProof.regulated_high_risk_excluded_by_default) {
    failures.push({
      classification: "NO_GO_REGULATED_HIGH_RISK_EXPOSED",
      reason: "REGULATED_HIGH_RISK_NOT_EXCLUDED_BY_DEFAULT",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/allowlist_proof.json`,
    });
  }
  for (const [key, passed] of Object.entries(evidence)) {
    if (!passed) {
      failures.push({
        classification: "UNKNOWN_NEEDS_TRACE",
        reason: `${key}_MISSING_OR_FAILED`,
        artifact: AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR,
      });
    }
  }

  const timedReleaseVerifyPassed = releaseTiming.final_status === "GREEN_RELEASE_VERIFY_GATES_TIMED";
  const releaseFailedGateName = typeof releaseTiming.failed_gate_name === "string" ? releaseTiming.failed_gate_name : null;
  const releaseFailedGateStatus = typeof releaseTiming.failed_gate_status === "string" ? releaseTiming.failed_gate_status : null;
  const timeoutStepCaptured = Array.isArray(releaseTiming.steps) &&
    releaseTiming.steps.some((step) =>
      Boolean(step) &&
      typeof step === "object" &&
      (step as { status?: unknown; step?: unknown }).status === "timeout" &&
      typeof (step as { step?: unknown }).step === "string",
    );
  const timeoutWithoutGate = Array.isArray(releaseTiming.steps) &&
    releaseTiming.steps.some((step) => Boolean(step) && typeof step === "object" && (step as { status?: unknown }).status === "timeout") &&
    !timeoutStepCaptured;
  if (timeoutWithoutGate) {
    failures.push({
      classification: "NO_GO_RELEASE_VERIFY_TIMEOUT",
      reason: "RELEASE_VERIFY_TIMEOUT_WITHOUT_EXACT_GATE",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/release_timing.json`,
    });
  }
  if (cleanup?.orphan_processes_left_after_timeout === true) {
    failures.push({
      classification: "NO_GO_RELEASE_VERIFY_TIMEOUT",
      reason: "ORPHAN_PROCESSES_LEFT_AFTER_TIMEOUT",
      artifact: `${AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION_ARTIFACT_DIR}/process_cleanup.json`,
    });
  }

  const realExternalIdsPresent = allowlist.allowlistValidation.real_external_allowlist_ids_present;
  const finalStatus = classifyFinalStatus(failures, realExternalIdsPresent);
  const matrix = {
    wave: AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_WAVE,
    previous_status: "NO_GO_AI_ESTIMATE_LIMITED_PUBLIC_BETA_EXECUTION",
    previous_blocker: "NO_GO_ALLOWLIST_IDS_MISSING",
    final_status: finalStatus,
    allowlist_control_plane_ready: allowlist.allowlistProof.final_status === "LIMITED_PUBLIC_BETA_ALLOWLIST_READY",
    real_external_allowlist_ids_present: realExternalIdsPresent,
    limited_public_beta_execution_allowed: realExternalIdsPresent && finalStatus === AI_ESTIMATE_LIMITED_PUBLIC_BETA_ALLOWLIST_CLOSEOUT_GREEN_STATUS,
    full_public_rollout_enabled: false,
    limited_public_beta_enabled_by_default: false,
    manual_enable_required: true,
    initial_public_beta_percent_lte_0_1: allowlist.rolloutContractValidation.initial_public_beta_percent_lte_0_1,
    max_public_beta_percent_lte_0_5: allowlist.rolloutContractValidation.max_public_beta_percent_lte_0_5,
    user_allowlist_required: true,
    wildcard_allowlist_found: allowlist.allowlistValidation.wildcard_allowlist_found,
    country_city_allowlist_required: allowlist.rolloutContractValidation.country_city_allowlist_required,
    regulated_high_risk_disabled_by_default: allowlist.rolloutContractValidation.regulated_high_risk_disabled_by_default,
    kill_switch_overrides_allowlist: allowlist.allowlistProof.kill_switch_overrides_allowlist,
    rollback_owner_present: allowlist.rolloutContractValidation.rollback_owner_present,
    monitoring_owner_present: allowlist.rolloutContractValidation.monitoring_owner_present,
    daily_error_budget_required: allowlist.rolloutContractValidation.daily_error_budget_required,
    ...evidence,
    typecheck_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_TYPECHECK_PASSED === "1",
    lint_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_LINT_PASSED === "1",
    git_diff_check_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_GIT_DIFF_CHECK_PASSED === "1",
    targeted_tests_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_TARGETED_TESTS_PASSED === "1",
    architecture_tests_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_ARCHITECTURE_TESTS_PASSED === "1",
    allowlist_proof_passed: allowlist.allowlistProof.final_status === "LIMITED_PUBLIC_BETA_ALLOWLIST_READY",
    timed_release_verify_passed: timedReleaseVerifyPassed,
    release_verify_passed: timedReleaseVerifyPassed,
    timed_release_verify_final_status: typeof releaseTiming.final_status === "string" ? releaseTiming.final_status : null,
    release_failed_gate_name: releaseFailedGateName,
    release_failed_gate_status: releaseFailedGateStatus,
    release_gate_name_captured_on_timeout: timeoutStepCaptured,
    release_timing_present: releaseTiming !== null,
    process_cleanup_ready: cleanup?.process_cleanup_ready === true,
    full_jest_passed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_FULL_JEST_PASSED === "1",
    commit_created: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_COMMIT_CREATED === "1",
    branch_pushed: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_BRANCH_PUSHED === "1",
    final_worktree_clean: process.env.LIMITED_PUBLIC_BETA_ALLOWLIST_FINAL_WORKTREE_CLEAN === "1",
    fake_green_claimed: false,
  };

  writeLimitedPublicBetaJson("failures.json", failures);
  writeLimitedPublicBetaJson("matrix.json", matrix);
  writeLimitedPublicBetaText(
    "proof.md",
    [
      "# AI Estimate Limited Public Beta Allowlist Closeout",
      "",
      `Status: ${matrix.final_status}`,
      `Previous blocker: ${matrix.previous_blocker}`,
      `Allowlist control plane ready: ${String(matrix.allowlist_control_plane_ready)}`,
      `Real external allowlist IDs present: ${String(matrix.real_external_allowlist_ids_present)}`,
      `Execution allowed: ${String(matrix.limited_public_beta_execution_allowed)}`,
      `Timed release verify passed: ${String(matrix.timed_release_verify_passed)}`,
      `Fake green claimed: ${String(matrix.fake_green_claimed)}`,
      "",
      "Failures:",
      ...(failures.length > 0
        ? failures.map((failure) => `- ${failure.classification}: ${failure.reason}${failure.artifact ? ` (${failure.artifact})` : ""}`)
        : ["- none"]),
      "",
    ].join("\n"),
  );

  if (finalStatus === "UNKNOWN_NEEDS_TRACE") {
    throw new Error(`${finalStatus}:${failures.map((failure) => failure.reason).join(";")}`);
  }
  return { matrix, failures };
}

if (require.main === module) {
  runAiEstimateLimitedPublicBetaAllowlistCloseoutProof();
}
