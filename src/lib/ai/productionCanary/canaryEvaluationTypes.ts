export const AI_ESTIMATE_CANARY_EVALUATION_WAVE =
  "S_AI_ESTIMATE_CANARY_EVALUATION_AND_PUBLIC_ROLLOUT_DECISION_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_CANARY_EVALUATION_PUBLIC_ROLLOUT_DECISION_READY";

export const AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_CANARY_EVALUATION";

export const AI_ESTIMATE_CANARY_EVALUATION_RELEASE_GUARD =
  "ai-estimate-canary-evaluation-public-rollout-decision-proof";

export const AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_INTERNAL_CANARY = {
  key: "internal_canary_execution",
  path: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/matrix.json",
  expectedStatus: "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY",
} as const;

export type AiEstimateCanaryEvaluationDecision =
  | "GO_NEXT_CONTROLLED_PUBLIC_CANARY_STAGE"
  | "NO_GO_INTERNAL_CANARY_NOT_GREEN"
  | "NO_GO_ERROR_BUDGET_EXCEEDED"
  | "NO_GO_TELEMETRY_OR_FEEDBACK_NOT_READY"
  | "NO_GO_PUBLIC_ROLLOUT_ENABLED"
  | "NO_GO_KILL_SWITCH_OR_ROLLBACK_NOT_READY"
  | "NO_GO_ANDROID_API34_MISSING"
  | "NO_GO_CANARY_EVALUATION";

export type AiEstimateCanaryEvaluationPolicy = {
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  public_rollout_authorized: boolean;
  controlled_public_canary_ready: boolean;
  manual_approval_required: boolean;
  public_staff_seed_required: boolean;
  external_users_allowed_by_default: boolean;
  max_public_canary_percent: number;
  kill_switch_required: boolean;
  rollback_required: boolean;
  observability_required: boolean;
  feedback_required: boolean;
};

export type AiEstimateCanaryEvaluationEvidenceSummary = {
  internal_canary_green: boolean;
  internal_canary_decision: string | null;
  replay_sessions_total: number;
  replay_sessions_passed: number;
  replay_sessions_failed: number;
  estimate_success_rate_gte_99_5: boolean;
  pdf_success_rate_gte_99: boolean;
  pdf_mojibake_rate_zero: boolean;
  object_misclassification_rate_zero: boolean;
  template_gap_for_parsable_work_rate_zero: boolean;
  weak_generic_rows_rate_zero: boolean;
  regulated_safety_missing_rate_zero: boolean;
  telemetry_missing_rate_zero: boolean;
  feedback_capture_failure_rate_zero: boolean;
  telemetry_ready: boolean;
  telemetry_redacted: boolean;
  telemetry_secrets_found: boolean;
  personal_data_leak_found: boolean;
  feedback_capture_ready: boolean;
  kill_switch_drill_passed: boolean;
  rollback_drill_passed: boolean;
  web_live_app_tested: boolean;
  web_flows_passed: boolean;
  android_api34_tested: boolean;
  android_api34_prompts_passed: number;
  api36_rejected: boolean;
  pdf_sample_passed: boolean;
  pdf_mojibake_found: boolean;
  production_rollout_enabled: boolean;
  public_canary_enabled: boolean;
  fake_green_claimed: boolean;
};
