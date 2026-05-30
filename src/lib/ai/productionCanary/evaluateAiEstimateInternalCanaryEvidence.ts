import {
  AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_PREREQUISITES,
  type AiEstimateCanaryEvaluationEvidenceSummary,
} from "./canaryEvaluationTypes";

type JsonRecord = Record<string, unknown>;

export type AiEstimateInternalCanaryEvidence = {
  matrix: JsonRecord | null;
  errorBudget: JsonRecord | null;
  telemetryAudit: JsonRecord | null;
  feedbackAudit: JsonRecord | null;
  killSwitchDrill: JsonRecord | null;
  rollbackDrill: JsonRecord | null;
  webResults: JsonRecord | null;
  androidApi34Results: JsonRecord | null;
  pdfTextExtract: JsonRecord | null;
};

export type AiEstimateInternalCanaryEvidenceEvaluation = {
  valid: boolean;
  issues: string[];
  summary: AiEstimateCanaryEvaluationEvidenceSummary;
};

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

export function evaluateAiEstimateInternalCanaryEvidence(
  evidence: AiEstimateInternalCanaryEvidence,
): AiEstimateInternalCanaryEvidenceEvaluation {
  const internalCanaryPrerequisite = AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_PREREQUISITES.find(
    (item) => item.key === "internal_canary_execution",
  );
  const summary: AiEstimateCanaryEvaluationEvidenceSummary = {
    all_prerequisites_green: false,
    internal_canary_green:
      str(evidence.matrix, "final_status") ===
      internalCanaryPrerequisite?.expectedStatus,
    internal_canary_decision: str(evidence.matrix, "decision"),
    replay_sessions_total: num(evidence.matrix, "replay_sessions_total"),
    replay_sessions_passed: num(evidence.matrix, "replay_sessions_passed"),
    replay_sessions_failed: num(evidence.matrix, "replay_sessions_failed"),
    estimate_success_rate_gte_99_5:
      bool(evidence.errorBudget, "estimate_success_rate_gte_99_5") ||
      bool(evidence.matrix, "estimate_success_rate_gte_99_5"),
    pdf_success_rate_gte_99:
      bool(evidence.errorBudget, "pdf_success_rate_gte_99") ||
      bool(evidence.matrix, "pdf_success_rate_gte_99"),
    pdf_mojibake_rate_zero:
      bool(evidence.errorBudget, "pdf_mojibake_rate_zero") ||
      bool(evidence.matrix, "pdf_mojibake_rate_zero"),
    object_misclassification_rate_zero:
      bool(evidence.errorBudget, "object_misclassification_rate_zero") ||
      bool(evidence.matrix, "object_misclassification_rate_zero"),
    template_gap_for_parsable_work_rate_zero:
      bool(evidence.errorBudget, "template_gap_for_parsable_work_rate_zero") ||
      bool(evidence.matrix, "template_gap_for_parsable_work_rate_zero"),
    weak_generic_rows_rate_zero:
      bool(evidence.errorBudget, "weak_generic_rows_rate_zero") ||
      bool(evidence.matrix, "weak_generic_rows_rate_zero"),
    regulated_safety_missing_rate_zero:
      bool(evidence.errorBudget, "regulated_safety_missing_rate_zero") ||
      bool(evidence.matrix, "regulated_safety_missing_rate_zero"),
    telemetry_missing_rate_zero:
      bool(evidence.errorBudget, "telemetry_missing_rate_zero") ||
      bool(evidence.matrix, "telemetry_missing_rate_zero"),
    feedback_capture_failure_rate_zero:
      bool(evidence.errorBudget, "feedback_capture_failure_rate_zero") ||
      bool(evidence.matrix, "feedback_capture_failure_rate_zero"),
    telemetry_ready:
      bool(evidence.telemetryAudit, "telemetry_ready") ||
      bool(evidence.matrix, "telemetry_ready"),
    telemetry_redacted:
      bool(evidence.telemetryAudit, "telemetry_redacted") ||
      bool(evidence.matrix, "telemetry_redacted"),
    telemetry_secrets_found:
      bool(evidence.telemetryAudit, "telemetry_secrets_found") ||
      bool(evidence.matrix, "telemetry_secrets_found"),
    personal_data_leak_found:
      bool(evidence.telemetryAudit, "personal_data_leak_found") ||
      bool(evidence.matrix, "personal_data_leak_found"),
    feedback_capture_ready:
      bool(evidence.feedbackAudit, "feedback_capture_ready") ||
      bool(evidence.matrix, "feedback_capture_ready"),
    kill_switch_drill_passed:
      bool(evidence.killSwitchDrill, "kill_switch_drill_passed") ||
      bool(evidence.matrix, "kill_switch_drill_passed"),
    rollback_drill_passed:
      bool(evidence.rollbackDrill, "rollback_drill_passed") ||
      bool(evidence.matrix, "rollback_drill_passed"),
    web_live_app_tested:
      bool(evidence.webResults, "web_live_app_tested") ||
      bool(evidence.matrix, "web_live_app_tested"),
    web_flows_passed:
      bool(evidence.webResults, "web_flows_passed") ||
      bool(evidence.matrix, "playwright_web_passed"),
    android_api34_tested:
      bool(evidence.androidApi34Results, "android_api34_tested") ||
      bool(evidence.matrix, "android_api34_tested"),
    android_api34_prompts_passed: num(evidence.androidApi34Results, "android_api34_prompts_passed"),
    api36_rejected:
      bool(evidence.androidApi34Results, "api36_rejected") ||
      bool(evidence.matrix, "api36_rejected"),
    pdf_sample_passed:
      bool(evidence.pdfTextExtract, "pdf_sample_passed") ||
      bool(evidence.matrix, "pdf_sample_passed"),
    pdf_mojibake_found:
      bool(evidence.pdfTextExtract, "pdf_mojibake_found") ||
      bool(evidence.matrix, "pdf_mojibake_found"),
    production_rollout_enabled: bool(evidence.matrix, "production_rollout_enabled"),
    public_canary_enabled: bool(evidence.matrix, "public_canary_enabled"),
    fake_green_claimed: bool(evidence.matrix, "fake_green_claimed"),
  };

  const issues: string[] = [];
  if (!evidence.matrix) issues.push("INTERNAL_CANARY_MATRIX_MISSING");
  if (!summary.internal_canary_green) issues.push("INTERNAL_CANARY_NOT_GREEN");
  if (summary.internal_canary_decision !== "GO_NEXT_INTERNAL_CANARY_STAGE") issues.push("INTERNAL_CANARY_DECISION_NOT_GO");
  if (summary.replay_sessions_total !== 2000 || summary.replay_sessions_passed !== 2000 || summary.replay_sessions_failed !== 0) issues.push("INTERNAL_CANARY_REPLAY_NOT_FULL_GREEN");
  if (!summary.estimate_success_rate_gte_99_5 || !summary.pdf_success_rate_gte_99) issues.push("INTERNAL_CANARY_SUCCESS_RATE_BUDGET_FAILED");
  if (!summary.pdf_mojibake_rate_zero || summary.pdf_mojibake_found) issues.push("PDF_MOJIBAKE_FOUND");
  if (!summary.object_misclassification_rate_zero) issues.push("OBJECT_MISCLASSIFICATION_RATE_NON_ZERO");
  if (!summary.template_gap_for_parsable_work_rate_zero) issues.push("TEMPLATE_GAP_FOR_PARSABLE_WORK_RATE_NON_ZERO");
  if (!summary.weak_generic_rows_rate_zero) issues.push("WEAK_GENERIC_ROWS_RATE_NON_ZERO");
  if (!summary.regulated_safety_missing_rate_zero) issues.push("REGULATED_SAFETY_MISSING_RATE_NON_ZERO");
  if (!summary.telemetry_missing_rate_zero || !summary.telemetry_ready || !summary.telemetry_redacted) issues.push("TELEMETRY_NOT_READY");
  if (summary.telemetry_secrets_found || summary.personal_data_leak_found) issues.push("TELEMETRY_LEAK_FOUND");
  if (!summary.feedback_capture_failure_rate_zero || !summary.feedback_capture_ready) issues.push("FEEDBACK_NOT_READY");
  if (!summary.kill_switch_drill_passed || !summary.rollback_drill_passed) issues.push("KILL_SWITCH_OR_ROLLBACK_NOT_READY");
  if (!summary.web_live_app_tested || !summary.web_flows_passed) issues.push("WEB_PROOF_MISSING");
  if (!summary.android_api34_tested || !summary.api36_rejected || summary.android_api34_prompts_passed < 4) issues.push("ANDROID_API34_PROOF_MISSING");
  if (!summary.pdf_sample_passed) issues.push("PDF_SAMPLE_MISSING");
  if (summary.production_rollout_enabled || summary.public_canary_enabled) issues.push("PUBLIC_ROLLOUT_ENABLED");
  if (summary.fake_green_claimed) issues.push("FAKE_GREEN_CLAIMED");

  return {
    valid: issues.length === 0,
    issues,
    summary,
  };
}
