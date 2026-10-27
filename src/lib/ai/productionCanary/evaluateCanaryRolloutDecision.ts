import type {
  AiEstimateCanaryEvaluationDecision,
} from "./canaryEvaluationTypes";
import type {
  AiEstimateCanaryRolloutDecisionInput,
  AiEstimateCanaryRolloutDecisionResult,
} from "./canaryEvaluationDecisionTypes";

function classify(issues: readonly string[]): AiEstimateCanaryEvaluationDecision {
  if (issues.includes("PREREQUISITE_NOT_GREEN")) return "NO_GO_PREREQUISITE_NOT_GREEN";
  if (issues.includes("EVIDENCE_LEDGER_FAILED")) return "NO_GO_EVIDENCE_MISSING";
  if (
    issues.includes("OBJECT_MISCLASSIFICATION_FOUND") ||
    issues.includes("PDF_MOJIBAKE_FOUND") ||
    issues.includes("REGULATED_SAFETY_MISSING") ||
    issues.includes("UNSAFE_MANUAL_REVIEW") ||
    issues.includes("WRONG_WORK_FEEDBACK_CONFIRMED")
  ) {
    return "NO_GO_ROLLBACK_AND_FIX";
  }
  if (
    issues.includes("REAL_USAGE_EVALUATION_FAILED") ||
    issues.includes("ROLLBACK_REDRILL_FAILED") ||
    issues.includes("LIMITED_PUBLIC_BETA_POLICY_FAILED")
  ) {
    return "NO_GO_ERROR_BUDGET_EXCEEDED";
  }
  if (issues.includes("MANUAL_REVIEW_FAILED")) return "NO_GO_MANUAL_REVIEW_FAILED";
  if (issues.includes("NEGATIVE_FEEDBACK_RATE_HIGH")) return "NO_GO_FEEDBACK_NEGATIVE_RATE_HIGH";
  if (issues.includes("PUBLIC_ROLLOUT_ENABLED_TOO_EARLY")) return "NO_GO_PUBLIC_ROLLOUT_ENABLED_TOO_EARLY";
  return issues.length === 0 ? "GO_LIMITED_PUBLIC_BETA" : "UNKNOWN_NEEDS_TRACE";
}

export function evaluateCanaryRolloutDecision(
  input: AiEstimateCanaryRolloutDecisionInput,
): AiEstimateCanaryRolloutDecisionResult {
  const issues: string[] = [];

  if (!input.all_prerequisites_green) issues.push("PREREQUISITE_NOT_GREEN");
  if (!input.evidence_ledger_passed) issues.push("EVIDENCE_LEDGER_FAILED");
  if (!input.real_usage.passed) issues.push("REAL_USAGE_EVALUATION_FAILED");
  if (!input.feedback.passed) issues.push("FEEDBACK_EVALUATION_FAILED");
  if (!input.manual_review.passed) issues.push("MANUAL_REVIEW_FAILED");
  if (!input.rollback_redrill_passed) issues.push("ROLLBACK_REDRILL_FAILED");
  if (input.production_rollout_enabled || input.public_beta_enabled) issues.push("PUBLIC_ROLLOUT_ENABLED_TOO_EARLY");
  if (!input.limited_public_beta_ready || !input.max_public_beta_percent_lte_0_5) issues.push("LIMITED_PUBLIC_BETA_POLICY_FAILED");
  if (input.telemetry_secrets_found || input.personal_data_leak_found) issues.push("TELEMETRY_PRIVACY_LEAK");
  if (input.real_usage.object_misclassification_count > 0) issues.push("OBJECT_MISCLASSIFICATION_FOUND");
  if (input.real_usage.pdf_mojibake_count > 0) issues.push("PDF_MOJIBAKE_FOUND");
  if (input.real_usage.regulated_safety_missing_count > 0) issues.push("REGULATED_SAFETY_MISSING");
  if (input.feedback.issues.includes("WRONG_WORK_FEEDBACK_CONFIRMED")) issues.push("WRONG_WORK_FEEDBACK_CONFIRMED");
  if (input.feedback.negative_feedback_rate > 0.02) issues.push("NEGATIVE_FEEDBACK_RATE_HIGH");
  if (input.manual_review.unsafe_count > 0) issues.push("UNSAFE_MANUAL_REVIEW");

  const decision = classify(issues);
  return {
    decision,
    ready: decision === "GO_LIMITED_PUBLIC_BETA",
    issues: [...new Set(issues)],
    all_prerequisites_green: input.all_prerequisites_green,
    evidence_ledger_passed: input.evidence_ledger_passed,
    real_usage_evaluation_passed: input.real_usage.passed,
    feedback_evaluation_passed: input.feedback.passed,
    manual_estimator_review_passed: input.manual_review.passed,
    rollback_redrill_passed: input.rollback_redrill_passed,
    production_rollout_enabled: input.production_rollout_enabled,
    public_beta_enabled: input.public_beta_enabled,
    limited_public_beta_ready: input.limited_public_beta_ready,
    max_public_beta_percent_lte_0_5: input.max_public_beta_percent_lte_0_5,
  };
}
