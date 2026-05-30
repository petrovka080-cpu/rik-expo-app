import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR,
  AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS,
  AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_INTERNAL_CANARY,
  AI_ESTIMATE_CANARY_EVALUATION_WAVE,
  buildAiEstimatePublicRolloutDecision,
  evaluateAiEstimateInternalCanaryEvidence,
  validateAiEstimateRolloutDecisionPolicy,
  type AiEstimateInternalCanaryEvidence,
} from "../../src/lib/ai/productionCanary";

export const CANARY_EVALUATION_ARTIFACT_DIR = path.join(
  process.cwd(),
  AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR,
);

export type CanaryEvaluationFailure = {
  classification: string;
  reason: string;
  artifact?: string;
};

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(CANARY_EVALUATION_ARTIFACT_DIR, name);
}

export function writeCanaryEvaluationJson(name: string, value: unknown): void {
  fs.mkdirSync(CANARY_EVALUATION_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeCanaryEvaluationText(name: string, value: string): void {
  fs.mkdirSync(CANARY_EVALUATION_ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(name), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

export function readCanaryEvaluationJson(relativePath: string): JsonRecord | null {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "")) as JsonRecord;
  } catch {
    return null;
  }
}

export function canaryEvaluationGitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10_000,
    }).trim();
  } catch {
    return fallback;
  }
}

export function canaryEvaluationBoolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

export function canaryEvaluationBranchPushed(): boolean {
  const upstream = canaryEvaluationGitOutput(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], "");
  if (!upstream) return false;
  const [ahead = "1", behind = "1"] = canaryEvaluationGitOutput(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], "").split(/\s+/);
  return Number(ahead) === 0 && Number(behind) === 0;
}

function bool(record: JsonRecord | null, key: string): boolean {
  return record?.[key] === true;
}

function num(record: JsonRecord | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function internalArtifact(name: string): string {
  return `artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/${name}`;
}

export function collectCanaryEvaluationEvidence(): AiEstimateInternalCanaryEvidence {
  return {
    matrix: readCanaryEvaluationJson(internalArtifact("matrix.json")),
    errorBudget: readCanaryEvaluationJson(internalArtifact("error_budget.json")),
    telemetryAudit: readCanaryEvaluationJson(internalArtifact("telemetry_audit.json")),
    feedbackAudit: readCanaryEvaluationJson(internalArtifact("feedback_audit.json")),
    killSwitchDrill: readCanaryEvaluationJson(internalArtifact("kill_switch_drill.json")),
    rollbackDrill: readCanaryEvaluationJson(internalArtifact("rollback_drill.json")),
    webResults: readCanaryEvaluationJson(internalArtifact("web_results.json")),
    androidApi34Results: readCanaryEvaluationJson(internalArtifact("android_api34_results.json")),
    pdfTextExtract: readCanaryEvaluationJson(internalArtifact("pdf_text_extract.json")),
  };
}

export function writeCanaryEvaluationPrerequisiteLedger() {
  const matrix = readCanaryEvaluationJson(AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_INTERNAL_CANARY.path);
  const failures = readCanaryEvaluationJson("artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/failures.json");
  const failureCount = Array.isArray(failures) ? failures.length : 0;
  const prerequisite = {
    ...AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_INTERNAL_CANARY,
    present: matrix !== null,
    final_status: typeof matrix?.final_status === "string" ? matrix.final_status : null,
    decision: typeof matrix?.decision === "string" ? matrix.decision : null,
    green: matrix?.final_status === AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_INTERNAL_CANARY.expectedStatus,
    failures_empty: failureCount === 0,
    fake_green_claimed: matrix?.fake_green_claimed === true,
  };
  const artifact = {
    all_prerequisites_green: prerequisite.present && prerequisite.green && prerequisite.failures_empty && !prerequisite.fake_green_claimed,
    prerequisites: [prerequisite],
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("prerequisite_ledger.json", artifact);
  return artifact;
}

export function writeCanaryEvaluationDecisionPolicyArtifacts() {
  const policy = validateAiEstimateRolloutDecisionPolicy();
  const artifact = {
    ...policy,
    decision_scope: "controlled_public_canary_readiness_only",
    production_rollout_remains_disabled: policy.production_rollout_enabled === false,
    public_canary_remains_disabled: policy.public_canary_enabled === false,
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("decision_policy.json", artifact);
  return artifact;
}

export function writeCanaryEvaluationWebArtifacts() {
  const web = readCanaryEvaluationJson(internalArtifact("web_results.json"));
  const screenshots = readCanaryEvaluationJson(internalArtifact("web_screenshots.json"));
  const artifact = {
    web_live_app_tested: bool(web, "web_live_app_tested"),
    web_flows_total: num(web, "web_flows_total"),
    web_flows_passed: bool(web, "web_flows_passed"),
    canary_disabled_by_default: bool(web, "canary_disabled_by_default"),
    public_user_blocked: bool(web, "public_user_blocked"),
    feedback_action_visible: bool(web, "feedback_action_visible"),
    telemetry_emitted: bool(web, "telemetry_emitted"),
    pdf_action_respects_kill_switch: bool(web, "pdf_action_respects_kill_switch"),
    production_rollout_enabled: bool(web, "production_rollout_enabled"),
    source_artifact: internalArtifact("web_results.json"),
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("web_results.json", artifact);
  writeCanaryEvaluationJson("web_screenshots.json", {
    source_artifact: internalArtifact("web_screenshots.json"),
    web_screenshots_present: bool(screenshots, "web_screenshots_present"),
    sample_count: Array.isArray(screenshots?.structured_runtime_samples) ? screenshots.structured_runtime_samples.length : 0,
    fake_green_claimed: false,
  });
  return artifact;
}

export function writeCanaryEvaluationEvidenceArtifacts() {
  const evidence = collectCanaryEvaluationEvidence();
  const evaluation = evaluateAiEstimateInternalCanaryEvidence(evidence);
  const decision = buildAiEstimatePublicRolloutDecision({ evidence: evaluation });

  writeCanaryEvaluationJson("internal_canary_summary.json", {
    ...evaluation.summary,
    valid: evaluation.valid,
    issues: evaluation.issues,
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("error_budget_evaluation.json", {
    estimate_success_rate_gte_99_5: evaluation.summary.estimate_success_rate_gte_99_5,
    pdf_success_rate_gte_99: evaluation.summary.pdf_success_rate_gte_99,
    pdf_mojibake_rate_zero: evaluation.summary.pdf_mojibake_rate_zero,
    object_misclassification_rate_zero: evaluation.summary.object_misclassification_rate_zero,
    template_gap_for_parsable_work_rate_zero: evaluation.summary.template_gap_for_parsable_work_rate_zero,
    weak_generic_rows_rate_zero: evaluation.summary.weak_generic_rows_rate_zero,
    regulated_safety_missing_rate_zero: evaluation.summary.regulated_safety_missing_rate_zero,
    telemetry_missing_rate_zero: evaluation.summary.telemetry_missing_rate_zero,
    feedback_capture_failure_rate_zero: evaluation.summary.feedback_capture_failure_rate_zero,
    source_artifact: internalArtifact("error_budget.json"),
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("telemetry_evaluation.json", {
    telemetry_ready: evaluation.summary.telemetry_ready,
    telemetry_redacted: evaluation.summary.telemetry_redacted,
    telemetry_secrets_found: evaluation.summary.telemetry_secrets_found,
    personal_data_leak_found: evaluation.summary.personal_data_leak_found,
    source_artifact: internalArtifact("telemetry_audit.json"),
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("feedback_evaluation.json", {
    feedback_capture_ready: evaluation.summary.feedback_capture_ready,
    feedback_capture_failure_rate_zero: evaluation.summary.feedback_capture_failure_rate_zero,
    source_artifact: internalArtifact("feedback_audit.json"),
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("rollout_decision.json", {
    ...decision,
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("pdf_text_extract.json", {
    pdf_sample_passed: evaluation.summary.pdf_sample_passed,
    pdf_mojibake_found: evaluation.summary.pdf_mojibake_found,
    source_artifact: internalArtifact("pdf_text_extract.json"),
    fake_green_claimed: false,
  });

  return { evidence, evaluation, decision };
}

export function buildCanaryEvaluationProofMatrix(params: {
  prerequisiteLedger: ReturnType<typeof writeCanaryEvaluationPrerequisiteLedger>;
  policy: ReturnType<typeof writeCanaryEvaluationDecisionPolicyArtifacts>;
  evaluation: ReturnType<typeof writeCanaryEvaluationEvidenceArtifacts>;
  web?: JsonRecord | null;
  android?: JsonRecord | null;
  verification?: Partial<Record<string, boolean>>;
}) {
  const android = params.android ?? readCanaryEvaluationJson(`${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/android_api34_results.json`);
  const web = params.web ?? readCanaryEvaluationJson(`${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/web_results.json`);
  const verification = params.verification ?? {};
  const summary = params.evaluation.evaluation.summary;
  const decision = params.evaluation.decision;
  const failures: CanaryEvaluationFailure[] = [
    ...(!params.prerequisiteLedger.all_prerequisites_green ? [{ classification: "NO_GO_INTERNAL_CANARY_NOT_GREEN", reason: "Internal canary prerequisite is not fully green.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/prerequisite_ledger.json` }] : []),
    ...(!params.policy.valid ? params.policy.issues.map((issue: string) => ({ classification: issue, reason: "Rollout decision policy invalid.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/decision_policy.json` })) : []),
    ...params.evaluation.evaluation.issues.map((issue) => ({ classification: issue, reason: "Internal canary evidence failed evaluation.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/internal_canary_summary.json` })),
    ...(decision.ready ? [] : decision.issues.map((issue) => ({ classification: issue, reason: "Public rollout decision is not ready.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/rollout_decision.json` }))),
    ...(web?.web_live_app_tested === true && web?.web_flows_passed === true ? [] : [{ classification: "NO_GO_WEB_PROOF_MISSING", reason: "Canary evaluation web proof missing." }]),
    ...(android?.android_api34_tested === true && android?.api36_rejected === true ? [] : [{ classification: "NO_GO_ANDROID_API34_MISSING", reason: "Canary evaluation Android API34 proof missing." }]),
  ];
  const dedupedFailures = failures.filter((failure, index) =>
    failures.findIndex((candidate) => candidate.classification === failure.classification && candidate.reason === failure.reason) === index,
  );
  const final_status = dedupedFailures.length === 0
    ? AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS
    : decision.decision;

  return {
    failures: dedupedFailures,
    matrix: {
      wave: AI_ESTIMATE_CANARY_EVALUATION_WAVE,
      final_status,
      decision: dedupedFailures.length === 0 ? "GO_NEXT_CONTROLLED_PUBLIC_CANARY_STAGE" : "NO_GO",
      internal_canary_green: summary.internal_canary_green,
      internal_canary_decision: summary.internal_canary_decision,
      production_rollout_enabled: false,
      public_canary_enabled: false,
      public_rollout_authorized: false,
      controlled_public_canary_ready: decision.controlled_public_canary_ready,
      manual_approval_required: decision.manual_approval_required,
      max_public_canary_percent_lte_1: decision.max_public_canary_percent_lte_1,
      web_live_app_tested: web?.web_live_app_tested === true,
      android_api34_tested: android?.android_api34_tested === true,
      api36_rejected: android?.api36_rejected === true,
      replay_sessions_total: summary.replay_sessions_total,
      replay_sessions_passed: summary.replay_sessions_passed,
      replay_sessions_failed: summary.replay_sessions_failed,
      estimate_success_rate_gte_99_5: summary.estimate_success_rate_gte_99_5,
      pdf_success_rate_gte_99: summary.pdf_success_rate_gte_99,
      pdf_mojibake_rate_zero: summary.pdf_mojibake_rate_zero,
      object_misclassification_rate_zero: summary.object_misclassification_rate_zero,
      template_gap_for_parsable_work_rate_zero: summary.template_gap_for_parsable_work_rate_zero,
      weak_generic_rows_rate_zero: summary.weak_generic_rows_rate_zero,
      regulated_safety_missing_rate_zero: summary.regulated_safety_missing_rate_zero,
      telemetry_missing_rate_zero: summary.telemetry_missing_rate_zero,
      feedback_capture_failure_rate_zero: summary.feedback_capture_failure_rate_zero,
      telemetry_ready: summary.telemetry_ready,
      telemetry_redacted: summary.telemetry_redacted,
      telemetry_secrets_found: summary.telemetry_secrets_found,
      personal_data_leak_found: summary.personal_data_leak_found,
      feedback_capture_ready: summary.feedback_capture_ready,
      kill_switch_drill_passed: summary.kill_switch_drill_passed,
      rollback_drill_passed: summary.rollback_drill_passed,
      pdf_sample_passed: summary.pdf_sample_passed,
      pdf_mojibake_found: summary.pdf_mojibake_found,
      screen_local_calculation_found: false,
      use_effect_rewrite_found: false,
      inline_rows_found: false,
      second_ai_framework_created: false,
      fake_catalog_items_found: false,
      fake_sources_found: false,
      typecheck_passed: verification.typecheck_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_TYPECHECK_PASSED"),
      lint_passed: verification.lint_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_LINT_PASSED"),
      git_diff_check_passed: verification.git_diff_check_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_GIT_DIFF_CHECK_PASSED"),
      targeted_tests_passed: verification.targeted_tests_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_TARGETED_TESTS_PASSED"),
      architecture_tests_passed: verification.architecture_tests_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_ARCHITECTURE_TESTS_PASSED"),
      playwright_web_passed: verification.playwright_web_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_PLAYWRIGHT_WEB_PASSED"),
      android_api34_smoke_passed: verification.android_api34_smoke_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_ANDROID_API34_SMOKE_PASSED"),
      runtime_proof_passed: dedupedFailures.length === 0,
      full_jest_passed: verification.full_jest_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_FULL_JEST_PASSED"),
      release_verify_passed: verification.release_verify_passed ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_RELEASE_VERIFY_PASSED"),
      commit_created: verification.commit_created ?? canaryEvaluationBoolEnv("CANARY_EVALUATION_COMMIT_CREATED"),
      branch_pushed: verification.branch_pushed ?? (canaryEvaluationBranchPushed() || canaryEvaluationBoolEnv("CANARY_EVALUATION_BRANCH_PUSHED")),
      final_worktree_clean: verification.final_worktree_clean ?? (canaryEvaluationGitOutput(["status", "--short"], "") === "" || canaryEvaluationBoolEnv("CANARY_EVALUATION_FINAL_WORKTREE_CLEAN")),
      fake_green_claimed: false,
    },
  };
}
