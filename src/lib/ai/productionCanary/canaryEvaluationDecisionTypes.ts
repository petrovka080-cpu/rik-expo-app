import type {
  AiEstimateCanaryEvaluationDecision,
  AiEstimateCanaryFeedbackEvaluation,
  AiEstimateCanaryManualReviewEvaluation,
  AiEstimateCanaryRealUsageEvaluation,
} from "./canaryEvaluationTypes";

export type AiEstimateCanaryRolloutDecisionInput = {
  all_prerequisites_green: boolean;
  evidence_ledger_passed: boolean;
  real_usage: AiEstimateCanaryRealUsageEvaluation;
  feedback: AiEstimateCanaryFeedbackEvaluation;
  manual_review: AiEstimateCanaryManualReviewEvaluation;
  rollback_redrill_passed: boolean;
  production_rollout_enabled: boolean;
  public_beta_enabled: boolean;
  limited_public_beta_ready: boolean;
  max_public_beta_percent_lte_0_5: boolean;
  telemetry_secrets_found: boolean;
  personal_data_leak_found: boolean;
};

export type AiEstimateCanaryRolloutDecisionResult = {
  decision: AiEstimateCanaryEvaluationDecision;
  ready: boolean;
  issues: string[];
  all_prerequisites_green: boolean;
  evidence_ledger_passed: boolean;
  real_usage_evaluation_passed: boolean;
  feedback_evaluation_passed: boolean;
  manual_estimator_review_passed: boolean;
  rollback_redrill_passed: boolean;
  production_rollout_enabled: boolean;
  public_beta_enabled: boolean;
  limited_public_beta_ready: boolean;
  max_public_beta_percent_lte_0_5: boolean;
};
