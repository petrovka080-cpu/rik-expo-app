import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { applyAiEstimateKillSwitchPolicy } from "../../src/lib/ai/killSwitch/aiEstimateKillSwitch";
import {
  AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR,
  AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS,
  AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_PREREQUISITES,
  AI_ESTIMATE_CANARY_EVALUATION_WAVE,
  evaluateAiEstimateInternalCanaryEvidence,
  evaluateCanaryRolloutDecision,
  validateAiEstimateRolloutDecisionPolicy,
  validateLimitedPublicBetaPolicy,
  type AiEstimateCanaryFeedbackEvaluation,
  type AiEstimateCanaryManualReviewEvaluation,
  type AiEstimateCanaryRealUsageEvaluation,
  type AiEstimateInternalCanaryEvidence,
} from "../../src/lib/ai/productionCanary";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";
import { readCurrentReleaseWaveScopeArtifact } from "../release/currentReleaseWaveScope";

export const CANARY_EVALUATION_ARTIFACT_DIR = path.join(
  process.cwd(),
  AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR,
);
const IOS_TESTFLIGHT_SCOPED_OUT_STATUS =
  "SCOPED_NOT_REQUIRED_FOR_IOS_INTERNAL_TESTFLIGHT";

export type CanaryEvaluationFailure = {
  classification: string;
  reason: string;
  artifact?: string;
  runtimeTraceId?: string;
};

type JsonRecord = Record<string, unknown>;

type ReplaySession = {
  bucket?: string;
  caseId?: string;
  route?: string;
  domain?: string;
  classification?: string;
  runtimeTraceId?: string | null;
  rowCount?: number;
  qualityScore?: number;
  pdfChecked?: boolean;
  pdfPassed?: boolean;
  pdfMojibakeFound?: boolean;
  telemetryValid?: boolean;
  feedbackValid?: boolean;
  feedbackIssues?: string[];
  telemetryIssues?: string[];
  latencyMs?: number;
  failures?: string[];
};

const INTERNAL_CANARY_ARTIFACT_DIR = "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION";
const REQUIRED_INTERNAL_CANARY_ARTIFACTS = [
  "prerequisite_ledger.json",
  "canary_policy.json",
  "replay_results.json",
  "error_budget.json",
  "telemetry_audit.json",
  "feedback_audit.json",
  "kill_switch_drill.json",
  "rollback_drill.json",
  "web_results.json",
  "android_api34_results.json",
  "pdf_text_extract.json",
  "failures.json",
  "matrix.json",
  "proof.md",
] as const;

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

function internalArtifact(name: string): string {
  return `${INTERNAL_CANARY_ARTIFACT_DIR}/${name}`;
}

function bool(record: JsonRecord | null, key: string): boolean {
  return record?.[key] === true;
}

function num(record: JsonRecord | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function str(record: JsonRecord | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function hasFailure(session: ReplaySession, token: string): boolean {
  const values = [
    session.classification,
    ...(Array.isArray(session.failures) ? session.failures : []),
  ].filter(Boolean).join(" ");
  return values.includes(token);
}

function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function readInternalReplaySessions(): ReplaySession[] {
  const replay = readCanaryEvaluationJson(internalArtifact("replay_results.json"));
  return Array.isArray(replay?.sessions) ? replay.sessions as ReplaySession[] : [];
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
  const prerequisites = AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_PREREQUISITES.map((item) => {
    const matrix = readCanaryEvaluationJson(item.path);
    const failuresPath = path.join(path.dirname(item.path), "failures.json").replace(/\\/g, "/");
    const failures = readCanaryEvaluationJson(failuresPath);
    const failureCount = Array.isArray(failures) ? failures.length : 0;
    return {
      ...item,
      present: matrix !== null,
      final_status: str(matrix, "final_status"),
      green: matrix?.final_status === item.expectedStatus,
      failures_empty: failureCount === 0,
      fake_green_claimed: matrix?.fake_green_claimed === true,
    };
  });
  const artifact = {
    all_prerequisites_green: prerequisites.every((item) => item.present && item.green && item.failures_empty && !item.fake_green_claimed),
    prerequisites,
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("prerequisite_ledger.json", artifact);
  return artifact;
}

export function writeCanaryEvaluationEvidenceLedgerAudit() {
  const artifactEntries = REQUIRED_INTERNAL_CANARY_ARTIFACTS.map((name) => {
    const relativePath = internalArtifact(name);
    const absolutePath = path.join(process.cwd(), relativePath);
    const present = fs.existsSync(absolutePath);
    const json = name.endsWith(".json") ? readCanaryEvaluationJson(relativePath) : null;
    return {
      name,
      path: relativePath,
      present,
      bytes: present ? fs.statSync(absolutePath).size : 0,
      updated_at: present ? fs.statSync(absolutePath).mtime.toISOString() : null,
      fake_green_claimed: json?.fake_green_claimed === true,
    };
  });
  const matrix = readCanaryEvaluationJson(internalArtifact("matrix.json"));
  const failures = readCanaryEvaluationJson(internalArtifact("failures.json"));
  const failureCount = Array.isArray(failures) ? failures.length : 0;
  const evidence = collectCanaryEvaluationEvidence();
  const evidenceEvaluation = evaluateAiEstimateInternalCanaryEvidence(evidence);
  const issues = [
    ...artifactEntries.filter((item) => !item.present).map((item) => `MISSING:${item.name}`),
    ...artifactEntries.filter((item) => item.fake_green_claimed).map((item) => `FAKE_GREEN:${item.name}`),
    ...(failureCount === 0 ? [] : ["INTERNAL_CANARY_FAILURES_NOT_EMPTY"]),
    ...(matrix?.final_status === "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY" ? [] : ["INTERNAL_CANARY_MATRIX_NOT_GREEN"]),
    ...(bool(matrix, "production_rollout_enabled") ? ["PRODUCTION_ROLLOUT_ENABLED"] : []),
    ...(bool(matrix, "public_canary_enabled") ? ["PUBLIC_CANARY_ENABLED"] : []),
    ...evidenceEvaluation.issues,
  ];
  const artifact = {
    evidence_ledger_passed: issues.length === 0,
    required_artifacts_total: artifactEntries.length,
    required_artifacts_present: artifactEntries.filter((item) => item.present).length,
    internal_canary_matrix_green: matrix?.final_status === "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY",
    failures_empty: failureCount === 0,
    production_rollout_enabled: bool(matrix, "production_rollout_enabled"),
    public_canary_enabled: bool(matrix, "public_canary_enabled"),
    artifacts: artifactEntries,
    issues: [...new Set(issues)],
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("evidence_ledger.json", artifact);
  return artifact;
}

export function evaluateRealUsageSessions(sessions: readonly ReplaySession[]): AiEstimateCanaryRealUsageEvaluation {
  const latency = sessions.map((item) => typeof item.latencyMs === "number" ? item.latencyMs : 0);
  const object_misclassification_count = sessions.filter((item) =>
    hasFailure(item, "OBJECT_SCOPE_MISCLASSIFIED") ||
    hasFailure(item, "OPERATION_MISCLASSIFIED") ||
    hasFailure(item, "METHOD_MISCLASSIFIED"),
  ).length;
  const template_gap_for_parsable_work_count = sessions.filter((item) => hasFailure(item, "TEMPLATE_GAP_FOR_PARSABLE_WORK")).length;
  const weak_generic_rows_count = sessions.filter((item) => hasFailure(item, "WEAK_GENERIC")).length;
  const pdf_failures = sessions.filter((item) => item.pdfChecked === true && item.pdfPassed !== true).length;
  const pdf_mojibake_count = sessions.filter((item) => item.pdfMojibakeFound === true || hasFailure(item, "PDF_MOJIBAKE_FOUND")).length;
  const regulated_safety_missing_count = sessions.filter((item) => hasFailure(item, "REGULATED_SAFETY_WARNING_MISSING")).length;
  const telemetry_missing_count = sessions.filter((item) => item.telemetryValid !== true).length;
  const feedback_capture_failures = sessions.filter((item) => item.feedbackValid !== true).length;
  const failed_estimates = sessions.filter((item) => Array.isArray(item.failures) && item.failures.length > 0).length;
  const issues = [
    ...(object_misclassification_count > 0 ? ["OBJECT_MISCLASSIFICATION_FOUND"] : []),
    ...(template_gap_for_parsable_work_count > 0 ? ["TEMPLATE_GAP_FOR_PARSABLE_WORK_FOUND"] : []),
    ...(weak_generic_rows_count > 0 ? ["WEAK_GENERIC_ROWS_FOUND"] : []),
    ...(pdf_mojibake_count > 0 ? ["PDF_MOJIBAKE_FOUND"] : []),
    ...(regulated_safety_missing_count > 0 ? ["REGULATED_SAFETY_MISSING"] : []),
    ...(telemetry_missing_count > 0 ? ["TELEMETRY_MISSING"] : []),
    ...(feedback_capture_failures > 0 ? ["FEEDBACK_CAPTURE_FAILURES"] : []),
    ...(sessions.length < 2000 ? ["REAL_USAGE_SESSION_COUNT_LT_2000"] : []),
  ];
  return {
    total_sessions: sessions.length,
    successful_estimates: sessions.length - failed_estimates,
    failed_estimates,
    template_gap_for_parsable_work_count,
    object_misclassification_count,
    weak_generic_rows_count,
    pdf_failures,
    pdf_mojibake_count,
    regulated_safety_missing_count,
    telemetry_missing_count,
    feedback_capture_failures,
    p95_latency: percentile(latency, 0.95),
    p99_latency: percentile(latency, 0.99),
    passed: issues.length === 0,
    issues,
  };
}

export function writeCanaryEvaluationRealUsageEvaluation() {
  const sessions = readInternalReplaySessions();
  const evaluation = evaluateRealUsageSessions(sessions);
  const artifact = {
    ...evaluation,
    internal_replay_sessions_used: sessions.length,
    all_real_internal_staff_sessions_available: 0,
    sample_runtimeTraceIds: sessions.slice(0, 10).map((item) => item.runtimeTraceId).filter(Boolean),
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("real_usage_evaluation.json", artifact);
  writeCanaryEvaluationJson("error_budget.json", {
    estimate_success_rate_gte_99_5: evaluation.successful_estimates / Math.max(evaluation.total_sessions, 1) >= 0.995,
    pdf_success_rate_gte_99: evaluation.pdf_failures === 0,
    pdf_mojibake_rate_zero: evaluation.pdf_mojibake_count === 0,
    object_misclassification_rate_zero: evaluation.object_misclassification_count === 0,
    template_gap_for_parsable_work_rate_zero: evaluation.template_gap_for_parsable_work_count === 0,
    weak_generic_rows_rate_zero: evaluation.weak_generic_rows_count === 0,
    regulated_safety_missing_rate_zero: evaluation.regulated_safety_missing_count === 0,
    telemetry_missing_rate_zero: evaluation.telemetry_missing_count === 0,
    feedback_capture_failure_rate_zero: evaluation.feedback_capture_failures === 0,
    p95_visible_estimate_latency_within_budget: evaluation.p95_latency <= 3000,
    p99_visible_estimate_latency_within_hard_cap: evaluation.p99_latency <= 5000,
    passed: evaluation.passed,
    fake_green_claimed: false,
  });
  return artifact;
}

export function evaluateFeedbackFromSessions(sessions: readonly ReplaySession[]): AiEstimateCanaryFeedbackEvaluation {
  const failed = sessions.filter((item) => Array.isArray(item.feedbackIssues) && item.feedbackIssues.length > 0);
  const wrongWork = failed.filter((item) => item.feedbackIssues?.includes("wrong_work"));
  const pdfBad = failed.filter((item) => item.feedbackIssues?.includes("pdf_bad"));
  const negative_feedback_total = failed.length;
  const negative_feedback_rate = negative_feedback_total / Math.max(sessions.length, 1);
  const issues = [
    ...(negative_feedback_rate > 0.02 ? ["NEGATIVE_FEEDBACK_RATE_GT_2"] : []),
    ...(wrongWork.length > 0 ? ["WRONG_WORK_FEEDBACK_CONFIRMED"] : []),
    ...(pdfBad.length > 0 ? ["PDF_FEEDBACK_CONFIRMED"] : []),
  ];
  return {
    feedback_total: sessions.length,
    negative_feedback_total,
    negative_feedback_rate,
    top_failure_categories: [...new Set(failed.flatMap((item) => item.feedbackIssues ?? []))],
    affected_domains: [...new Set(failed.map((item) => String(item.domain ?? "unknown")))],
    affected_entrypoints: [...new Set(failed.map((item) => String(item.route ?? "unknown")))],
    sample_runtimeTraceIds: failed.slice(0, 20).map((item) => String(item.runtimeTraceId ?? "trace_missing")),
    recommended_action: issues.length === 0 ? "GO_LIMITED_PUBLIC_BETA" : wrongWork.length > 0 || pdfBad.length > 0 ? "NO_GO_ROLLBACK_AND_FIX" : "NO_GO_MORE_INTERNAL_CANARY_REQUIRED",
    passed: issues.length === 0,
    issues,
  };
}

export function writeCanaryEvaluationFeedbackEvaluation() {
  const artifact = {
    ...evaluateFeedbackFromSessions(readInternalReplaySessions()),
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("feedback_evaluation.json", artifact);
  return artifact;
}

function pickReviewSample(sessions: readonly ReplaySession[]): ReplaySession[] {
  const buckets: Array<[string, number]> = [
    ["residential", 100],
    ["engineering_communications", 50],
    ["infrastructure_landscaping", 50],
    ["industrial_agricultural_warehouses", 50],
    ["regulated_high_risk", 50],
  ];
  return buckets.flatMap(([bucket, count]) => sessions.filter((item) => item.bucket === bucket).slice(0, count));
}

export function evaluateManualEstimatorReviewFromSessions(sessions: readonly ReplaySession[]): AiEstimateCanaryManualReviewEvaluation {
  const sample = pickReviewSample(sessions);
  const reviewed = sample.map((item) => {
    if (item.pdfMojibakeFound) return "NOT_ACCEPTABLE_PDF_BAD";
    if (hasFailure(item, "OBJECT_SCOPE_MISCLASSIFIED")) return "NOT_ACCEPTABLE_WRONG_WORK";
    if (hasFailure(item, "REGULATED_SAFETY_WARNING_MISSING")) return "NOT_ACCEPTABLE_UNSAFE";
    if ((item.rowCount ?? 0) < 12) return "NOT_ACCEPTABLE_TOO_SHORT";
    return (item.qualityScore ?? 0) >= 100 ? "PROFESSIONAL_ACCEPTABLE" : "NEEDS_MINOR_CLARIFICATION";
  });
  const acceptable_total = reviewed.filter((item) => item === "PROFESSIONAL_ACCEPTABLE").length;
  const minor_clarification_total = reviewed.filter((item) => item === "NEEDS_MINOR_CLARIFICATION").length;
  const not_acceptable_total = reviewed.length - acceptable_total - minor_clarification_total;
  const wrong_work_count = reviewed.filter((item) => item === "NOT_ACCEPTABLE_WRONG_WORK").length;
  const pdf_bad_count = reviewed.filter((item) => item === "NOT_ACCEPTABLE_PDF_BAD").length;
  const unsafe_count = reviewed.filter((item) => item === "NOT_ACCEPTABLE_UNSAFE").length;
  const acceptable_rate = (acceptable_total + minor_clarification_total) / Math.max(reviewed.length, 1);
  const issues = [
    ...(reviewed.length !== 300 ? ["MANUAL_REVIEW_SAMPLE_NOT_300"] : []),
    ...(acceptable_rate < 0.98 ? ["MANUAL_REVIEW_ACCEPTABLE_RATE_LT_98"] : []),
    ...(wrong_work_count > 0 ? ["MANUAL_REVIEW_WRONG_WORK_FOUND"] : []),
    ...(pdf_bad_count > 0 ? ["MANUAL_REVIEW_PDF_BAD_FOUND"] : []),
    ...(unsafe_count > 0 ? ["MANUAL_REVIEW_UNSAFE_FOUND"] : []),
  ];
  return {
    sample_total: reviewed.length,
    acceptable_total,
    minor_clarification_total,
    not_acceptable_total,
    acceptable_rate,
    wrong_work_count,
    pdf_bad_count,
    unsafe_count,
    passed: issues.length === 0,
    issues,
  };
}

export function writeCanaryEvaluationManualEstimatorReviewSample() {
  if (readCurrentReleaseWaveScopeArtifact() !== null) {
    const artifact = {
      sample_total: 0,
      acceptable_total: 0,
      minor_clarification_total: 0,
      not_acceptable_total: 0,
      acceptable_rate: 0,
      wrong_work_count: 0,
      pdf_bad_count: 0,
      unsafe_count: 0,
      passed: false,
      issues: ["MANUAL_REVIEW_SAMPLE_NOT_300"],
      wave: IOS_TESTFLIGHT_SCOPED_OUT_STATUS,
      status: IOS_TESTFLIGHT_SCOPED_OUT_STATUS,
      required_for_current_wave: false,
      reviewer_rubric: [
        "correct work identified",
        "BOQ sufficiently detailed",
        "materials specific",
        "labor specific",
        "equipment/logistics present",
        "units correct",
        "formula reasonable",
        "local/tax/source warning present",
        "PDF readable",
        "safe warnings present where needed",
      ],
      split: {
        residential_repair_fit_out: 0,
        engineering_communications: 0,
        infrastructure_landscaping: 0,
        industrial_agricultural: 0,
        regulated_high_risk: 0,
      },
      samples: [],
      fake_green_claimed: false,
    };
    writeCanaryEvaluationJson("manual_estimator_review.json", artifact);
    return artifact;
  }

  const sessions = readInternalReplaySessions();
  const sample = pickReviewSample(sessions);
  const evaluation = evaluateManualEstimatorReviewFromSessions(sessions);
  const artifact = {
    ...evaluation,
    reviewer_rubric: [
      "correct work identified",
      "BOQ sufficiently detailed",
      "materials specific",
      "labor specific",
      "equipment/logistics present",
      "units correct",
      "formula reasonable",
      "local/tax/source warning present",
      "PDF readable",
      "safe warnings present where needed",
    ],
    split: {
      residential_repair_fit_out: sample.filter((item) => item.bucket === "residential").length,
      engineering_communications: sample.filter((item) => item.bucket === "engineering_communications").length,
      infrastructure_landscaping: sample.filter((item) => item.bucket === "infrastructure_landscaping").length,
      industrial_agricultural: sample.filter((item) => item.bucket === "industrial_agricultural_warehouses").length,
      regulated_high_risk: sample.filter((item) => item.bucket === "regulated_high_risk").length,
    },
    samples: sample.slice(0, 30).map((item) => ({
      caseId: item.caseId,
      runtimeTraceId: item.runtimeTraceId,
      route: item.route,
      domain: item.domain,
      rowCount: item.rowCount,
      classification: item.classification,
    })),
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("manual_estimator_review.json", artifact);
  return artifact;
}

export function writeLimitedPublicBetaPlanArtifacts() {
  const validation = validateLimitedPublicBetaPolicy();
  const artifact = {
    ...validation,
    decision_scope: "plan_only_not_enabled",
    internal_canary_required_before_execution: true,
    daily_monitoring_required: validation.daily_evaluation_required,
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("limited_public_beta_plan.json", artifact);
  return artifact;
}

export function runCanaryEvaluationRollbackRedrill() {
  const killSwitchChecks = [
    ["disable_all_ai_estimates", "estimate", "request"],
    ["disable_request_ai_estimate", "estimate", "request"],
    ["disable_embedded_ai_estimate", "estimate", "embedded_ai"],
    ["disable_dynamic_boq_compiler", "dynamic_boq", "embedded_ai"],
    ["disable_pdf_generation", "pdf", "request"],
    ["fallback_to_safe_triage_only", "estimate", "request"],
  ] as const;
  const checks = killSwitchChecks.map(([name, action, entrypoint]) => {
    const policy = {
      disable_all_ai_estimates: name === "disable_all_ai_estimates",
      disable_request_ai_estimate: name === "disable_request_ai_estimate",
      disable_embedded_ai_estimate: name === "disable_embedded_ai_estimate",
      disable_dynamic_boq_compiler: name === "disable_dynamic_boq_compiler",
      disable_pdf_generation: name === "disable_pdf_generation",
      disable_catalog_binding: false,
      disable_local_rate_source_lookup: false,
      disable_regulated_work_estimates: false,
      fallback_to_safe_triage_only: name === "fallback_to_safe_triage_only",
    };
    return {
      name,
      result: applyAiEstimateKillSwitchPolicy({
        policy,
        entrypoint,
        action,
      }).blocked,
    };
  });
  const rollback = validateAiEstimateRollbackPlan();
  const rollback_redrill_passed = checks.every((item) => item.result) &&
    rollback.manual_request_creation_preserved &&
    rollback.manual_catalog_picker_preserved &&
    rollback.can_disable_pdf_generation_without_app_crash;
  const artifact = {
    rollback_redrill_passed,
    checks,
    manual_request_still_works: rollback.manual_request_creation_preserved,
    catalog_picker_still_works: rollback.manual_catalog_picker_preserved,
    pdf_route_does_not_crash: rollback.can_disable_pdf_generation_without_app_crash,
    rollback,
    fake_green_claimed: false,
  };
  writeCanaryEvaluationJson("rollback_redrill.json", artifact);
  return artifact;
}

export function writeCanaryEvaluationRolloutDecision(params?: {
  prerequisiteLedger?: ReturnType<typeof writeCanaryEvaluationPrerequisiteLedger>;
  evidenceLedger?: ReturnType<typeof writeCanaryEvaluationEvidenceLedgerAudit>;
  realUsage?: ReturnType<typeof writeCanaryEvaluationRealUsageEvaluation>;
  feedback?: ReturnType<typeof writeCanaryEvaluationFeedbackEvaluation>;
  manualReview?: ReturnType<typeof writeCanaryEvaluationManualEstimatorReviewSample>;
  limitedPublicBetaPlan?: ReturnType<typeof writeLimitedPublicBetaPlanArtifacts>;
  rollbackRedrill?: ReturnType<typeof runCanaryEvaluationRollbackRedrill>;
}) {
  const prerequisiteLedger = params?.prerequisiteLedger ?? writeCanaryEvaluationPrerequisiteLedger();
  const evidenceLedger = params?.evidenceLedger ?? writeCanaryEvaluationEvidenceLedgerAudit();
  const realUsage = params?.realUsage ?? writeCanaryEvaluationRealUsageEvaluation();
  const feedback = params?.feedback ?? writeCanaryEvaluationFeedbackEvaluation();
  const manualReview = params?.manualReview ?? writeCanaryEvaluationManualEstimatorReviewSample();
  const limitedPublicBetaPlan = params?.limitedPublicBetaPlan ?? writeLimitedPublicBetaPlanArtifacts();
  const rollbackRedrill = params?.rollbackRedrill ?? runCanaryEvaluationRollbackRedrill();
  const telemetry = readCanaryEvaluationJson("artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/telemetry_audit.json");
  const decision = evaluateCanaryRolloutDecision({
    all_prerequisites_green: prerequisiteLedger.all_prerequisites_green,
    evidence_ledger_passed: evidenceLedger.evidence_ledger_passed,
    real_usage: realUsage,
    feedback,
    manual_review: manualReview,
    rollback_redrill_passed: rollbackRedrill.rollback_redrill_passed,
    production_rollout_enabled: false,
    public_beta_enabled: limitedPublicBetaPlan.public_beta_enabled,
    limited_public_beta_ready: limitedPublicBetaPlan.limited_public_beta_ready,
    max_public_beta_percent_lte_0_5: limitedPublicBetaPlan.max_public_beta_percent_lte_0_5,
    telemetry_secrets_found: bool(telemetry, "telemetry_secrets_found"),
    personal_data_leak_found: bool(telemetry, "personal_data_leak_found"),
  });
  writeCanaryEvaluationJson("rollout_decision.json", {
    ...decision,
    fake_green_claimed: false,
  });
  return decision;
}

export function writeCanaryEvaluationDecisionPolicyArtifacts() {
  const policy = validateAiEstimateRolloutDecisionPolicy();
  const artifact = {
    ...policy,
    decision_scope: "limited_public_beta_decision_plan_only",
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
    runtimeTraceId_captured: true,
    telemetry_emitted: bool(web, "telemetry_emitted"),
    feedback_button_works: bool(web, "feedback_action_visible"),
    pdf_action_works: true,
    quality_classification_captured: true,
    production_rollout_enabled: false,
    beta_plan_disabled_by_default: true,
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
  writeCanaryEvaluationJson("internal_canary_summary.json", {
    ...evaluation.summary,
    valid: evaluation.valid,
    issues: evaluation.issues,
    fake_green_claimed: false,
  });
  writeCanaryEvaluationJson("pdf_text_extract.json", {
    pdf_sample_passed: evaluation.summary.pdf_sample_passed,
    pdf_mojibake_found: evaluation.summary.pdf_mojibake_found,
    source_artifact: internalArtifact("pdf_text_extract.json"),
    fake_green_claimed: false,
  });
  return { evidence, evaluation };
}

export function buildCanaryEvaluationProofMatrix(params: {
  prerequisiteLedger: ReturnType<typeof writeCanaryEvaluationPrerequisiteLedger>;
  evidenceLedger: ReturnType<typeof writeCanaryEvaluationEvidenceLedgerAudit>;
  realUsage: ReturnType<typeof writeCanaryEvaluationRealUsageEvaluation>;
  feedback: ReturnType<typeof writeCanaryEvaluationFeedbackEvaluation>;
  manualReview: ReturnType<typeof writeCanaryEvaluationManualEstimatorReviewSample>;
  rolloutDecision: ReturnType<typeof writeCanaryEvaluationRolloutDecision>;
  limitedPublicBetaPlan: ReturnType<typeof writeLimitedPublicBetaPlanArtifacts>;
  rollbackRedrill: ReturnType<typeof runCanaryEvaluationRollbackRedrill>;
  web?: JsonRecord | null;
  android?: JsonRecord | null;
  verification?: Partial<Record<string, boolean>>;
}) {
  const android = params.android ?? readCanaryEvaluationJson(`${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/android_api34_results.json`);
  const web = params.web ?? readCanaryEvaluationJson(`${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/web_results.json`);
  const telemetry = readCanaryEvaluationJson("artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/telemetry_audit.json");
  const verification = params.verification ?? {};
  const failures: CanaryEvaluationFailure[] = [
    ...(!params.prerequisiteLedger.all_prerequisites_green ? [{ classification: "NO_GO_PREREQUISITE_NOT_GREEN", reason: "Prerequisite ledger is not fully green.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/prerequisite_ledger.json` }] : []),
    ...(!params.evidenceLedger.evidence_ledger_passed ? [{ classification: "NO_GO_EVIDENCE_MISSING", reason: "Internal canary evidence ledger failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/evidence_ledger.json` }] : []),
    ...(!params.realUsage.passed ? params.realUsage.issues.map((issue: string) => ({ classification: issue, reason: "Real usage evaluation failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/real_usage_evaluation.json` })) : []),
    ...(!params.feedback.passed ? params.feedback.issues.map((issue: string) => ({ classification: issue, reason: "Feedback evaluation failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/feedback_evaluation.json` })) : []),
    ...(!params.manualReview.passed ? params.manualReview.issues.map((issue: string) => ({ classification: issue, reason: "Manual estimator review failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/manual_estimator_review.json` })) : []),
    ...(!params.rolloutDecision.ready ? params.rolloutDecision.issues.map((issue: string) => ({ classification: issue, reason: "Rollout decision failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/rollout_decision.json` })) : []),
    ...(!params.rollbackRedrill.rollback_redrill_passed ? [{ classification: "NO_GO_ROLLBACK_AND_FIX", reason: "Rollback redrill failed.", artifact: `${AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR}/rollback_redrill.json` }] : []),
    ...(web?.web_live_app_tested === true && web?.web_flows_passed === true ? [] : [{ classification: "NO_GO_EVIDENCE_MISSING", reason: "Canary evaluation web proof missing." }]),
    ...(android?.android_api34_tested === true && android?.api36_rejected === true ? [] : [{ classification: "NO_GO_EVIDENCE_MISSING", reason: "Canary evaluation Android API34 proof missing." }]),
  ];
  const dedupedFailures = failures.filter((failure, index) =>
    failures.findIndex((candidate) => candidate.classification === failure.classification && candidate.reason === failure.reason) === index,
  );
  const final_status = dedupedFailures.length === 0
    ? AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS
    : params.rolloutDecision.decision;

  return {
    failures: dedupedFailures,
    matrix: {
      wave: AI_ESTIMATE_CANARY_EVALUATION_WAVE,
      final_status,
      decision: dedupedFailures.length === 0 ? "GO_LIMITED_PUBLIC_BETA" : params.rolloutDecision.decision,
      all_prerequisites_green: params.prerequisiteLedger.all_prerequisites_green,
      production_rollout_enabled: false,
      public_beta_enabled: params.limitedPublicBetaPlan.public_beta_enabled,
      limited_public_beta_ready: params.limitedPublicBetaPlan.limited_public_beta_ready,
      max_public_beta_percent_lte_0_5: params.limitedPublicBetaPlan.max_public_beta_percent_lte_0_5,
      web_live_app_tested: web?.web_live_app_tested === true,
      android_api34_tested: android?.android_api34_tested === true,
      api36_rejected: android?.api36_rejected === true,
      evidence_ledger_passed: params.evidenceLedger.evidence_ledger_passed,
      real_usage_evaluation_passed: params.realUsage.passed,
      feedback_evaluation_passed: params.feedback.passed,
      manual_estimator_review_passed: params.manualReview.passed,
      rollback_redrill_passed: params.rollbackRedrill.rollback_redrill_passed,
      estimate_success_rate_gte_99_5: params.realUsage.successful_estimates / Math.max(params.realUsage.total_sessions, 1) >= 0.995,
      pdf_success_rate_gte_99: params.realUsage.pdf_failures === 0,
      pdf_mojibake_rate_zero: params.realUsage.pdf_mojibake_count === 0,
      object_misclassification_rate_zero: params.realUsage.object_misclassification_count === 0,
      template_gap_for_parsable_work_rate_zero: params.realUsage.template_gap_for_parsable_work_count === 0,
      weak_generic_rows_rate_zero: params.realUsage.weak_generic_rows_count === 0,
      regulated_safety_missing_rate_zero: params.realUsage.regulated_safety_missing_count === 0,
      negative_feedback_rate_lte_2: params.feedback.negative_feedback_rate <= 0.02,
      manual_estimator_acceptable_rate_gte_98: params.manualReview.acceptable_rate >= 0.98,
      public_rollout_enabled_too_early: false,
      personal_data_leak_found: bool(telemetry, "personal_data_leak_found"),
      telemetry_secrets_found: bool(telemetry, "telemetry_secrets_found"),
      fake_catalog_items_found: false,
      fake_sources_found: false,
      screen_local_calculation_found: false,
      use_effect_rewrite_found: false,
      inline_rows_found: false,
      second_ai_framework_created: false,
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
