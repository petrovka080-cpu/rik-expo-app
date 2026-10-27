import type {
  AiEstimateCanaryEvaluationDecision,
  AiEstimateCanaryEvaluationPolicy,
} from "./canaryEvaluationTypes";
import type { AiEstimateInternalCanaryEvidenceEvaluation } from "./evaluateAiEstimateInternalCanaryEvidence";
import {
  buildAiEstimateCanaryEvaluationPolicy,
  validateAiEstimateRolloutDecisionPolicy,
} from "./validateAiEstimateRolloutDecisionPolicy";

export type AiEstimatePublicRolloutDecision = {
  decision: AiEstimateCanaryEvaluationDecision;
  ready: boolean;
  issues: string[];
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  public_rollout_authorized: boolean;
  controlled_public_canary_ready: boolean;
  manual_approval_required: boolean;
  max_public_canary_percent_lte_1: boolean;
};

function classifyDecision(issues: readonly string[]): AiEstimateCanaryEvaluationDecision {
  if (issues.includes("INTERNAL_CANARY_NOT_GREEN") || issues.includes("INTERNAL_CANARY_MATRIX_MISSING")) {
    return "NO_GO_PREREQUISITE_NOT_GREEN";
  }
  if (
    issues.includes("INTERNAL_CANARY_SUCCESS_RATE_BUDGET_FAILED") ||
    issues.includes("PDF_MOJIBAKE_FOUND") ||
    issues.includes("OBJECT_MISCLASSIFICATION_RATE_NON_ZERO") ||
    issues.includes("TEMPLATE_GAP_FOR_PARSABLE_WORK_RATE_NON_ZERO") ||
    issues.includes("WEAK_GENERIC_ROWS_RATE_NON_ZERO") ||
    issues.includes("REGULATED_SAFETY_MISSING_RATE_NON_ZERO")
  ) {
    return "NO_GO_ROLLBACK_AND_FIX";
  }
  if (
    issues.includes("TELEMETRY_NOT_READY") ||
    issues.includes("TELEMETRY_LEAK_FOUND") ||
    issues.includes("FEEDBACK_NOT_READY")
  ) {
    return "NO_GO_MORE_INTERNAL_CANARY_REQUIRED";
  }
  if (
    issues.includes("PRODUCTION_ROLLOUT_ENABLED") ||
    issues.includes("PUBLIC_CANARY_ENABLED_BY_DEFAULT") ||
    issues.includes("PUBLIC_ROLLOUT_AUTHORIZED_TOO_EARLY") ||
    issues.includes("PUBLIC_ROLLOUT_ENABLED")
  ) {
    return "NO_GO_PUBLIC_ROLLOUT_ENABLED_TOO_EARLY";
  }
  if (
    issues.includes("KILL_SWITCH_OR_ROLLBACK_NOT_READY") ||
    issues.includes("KILL_SWITCH_NOT_REQUIRED") ||
    issues.includes("ROLLBACK_NOT_REQUIRED")
  ) {
    return "NO_GO_ERROR_BUDGET_EXCEEDED";
  }
  if (issues.includes("ANDROID_API34_PROOF_MISSING")) return "NO_GO_EVIDENCE_MISSING";
  return issues.length === 0 ? "GO_LIMITED_PUBLIC_BETA" : "UNKNOWN_NEEDS_TRACE";
}

export function buildAiEstimatePublicRolloutDecision(params: {
  evidence: AiEstimateInternalCanaryEvidenceEvaluation;
  policy?: Partial<AiEstimateCanaryEvaluationPolicy>;
}): AiEstimatePublicRolloutDecision {
  const policy = buildAiEstimateCanaryEvaluationPolicy(params.policy);
  const policyValidation = validateAiEstimateRolloutDecisionPolicy(policy);
  const issues = [...params.evidence.issues, ...policyValidation.issues];
  const decision = classifyDecision(issues);

  return {
    decision,
    ready: decision === "GO_LIMITED_PUBLIC_BETA",
    issues,
    production_rollout_enabled: policyValidation.production_rollout_enabled,
    public_canary_enabled: policyValidation.public_canary_enabled,
    public_rollout_authorized: policyValidation.public_rollout_authorized,
    controlled_public_canary_ready: policyValidation.controlled_public_canary_ready,
    manual_approval_required: policyValidation.manual_approval_required,
    max_public_canary_percent_lte_1: policyValidation.max_public_canary_percent_lte_1,
  };
}
