export const AI_ESTIMATE_CANARY_EVALUATION_WAVE =
  "S_AI_ESTIMATE_CANARY_EVALUATION_AND_CONTROLLED_PUBLIC_ROLLOUT_DECISION_POINT_OF_NO_RETURN";

export const AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS =
  "GREEN_AI_ESTIMATE_CANARY_EVALUATION_READY";

export const AI_ESTIMATE_CANARY_EVALUATION_ARTIFACT_DIR =
  "artifacts/S_AI_ESTIMATE_CANARY_EVALUATION";

export const AI_ESTIMATE_CANARY_EVALUATION_RELEASE_GUARD =
  "ai-estimate-canary-evaluation-rollout-decision-proof";

export type AiEstimateCanaryEvaluationPrerequisite = {
  key: string;
  path: string;
  expectedStatus: string;
};

export const AI_ESTIMATE_CANARY_EVALUATION_REQUIRED_PREREQUISITES: readonly AiEstimateCanaryEvaluationPrerequisite[] =
  Object.freeze([
    {
      key: "internal_canary_execution",
      path: "artifacts/S_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY",
    },
    {
      key: "production_canary_control_plane",
      path: "artifacts/S_AI_ESTIMATE_PRODUCTION_CANARY/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_PRODUCTION_CANARY_CONTROL_PLANE_READY",
    },
    {
      key: "real_10000_acceptance",
      path: "artifacts/S_REAL_10000_DIVERSE_CONSTRUCTION_WORKS/matrix.json",
      expectedStatus: "GREEN_REAL_10000_DIVERSE_CONSTRUCTION_WORKS_EXPANDED_ESTIMATE_READY",
    },
    {
      key: "performance_cost_guard",
      path: "artifacts/S_AI_ESTIMATE_PERFORMANCE/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_GUARD_READY",
    },
    {
      key: "global_local_platform",
      path: "artifacts/S_GLOBAL_LOCAL_ESTIMATE_PLATFORM/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY",
    },
    {
      key: "change_control",
      path: "artifacts/S_AI_ESTIMATE_CHANGE_CONTROL/matrix.json",
      expectedStatus: "GREEN_AI_ESTIMATE_TEMPLATE_RATE_CATALOG_ONTOLOGY_CHANGE_CONTROL_READY",
    },
    {
      key: "android_api34_canonical",
      path: "artifacts/S_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING/matrix.json",
      expectedStatus: "GREEN_ANDROID_API34_CANONICAL_REPLAY_B2C_EXPANDED_ESTIMATE_BINDING_READY",
    },
  ]);

export type AiEstimateCanaryEvaluationDecision =
  | "GO_LIMITED_PUBLIC_BETA"
  | "NO_GO_ROLLBACK_AND_FIX"
  | "NO_GO_MORE_INTERNAL_CANARY_REQUIRED"
  | "NO_GO_PREREQUISITE_NOT_GREEN"
  | "NO_GO_EVIDENCE_MISSING"
  | "NO_GO_ERROR_BUDGET_EXCEEDED"
  | "NO_GO_MANUAL_REVIEW_FAILED"
  | "NO_GO_FEEDBACK_NEGATIVE_RATE_HIGH"
  | "NO_GO_PUBLIC_ROLLOUT_ENABLED_TOO_EARLY"
  | "UNKNOWN_NEEDS_TRACE";

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
  all_prerequisites_green: boolean;
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

export type AiEstimateCanaryRealUsageEvaluation = {
  total_sessions: number;
  successful_estimates: number;
  failed_estimates: number;
  template_gap_for_parsable_work_count: number;
  object_misclassification_count: number;
  weak_generic_rows_count: number;
  pdf_failures: number;
  pdf_mojibake_count: number;
  regulated_safety_missing_count: number;
  telemetry_missing_count: number;
  feedback_capture_failures: number;
  p95_latency: number;
  p99_latency: number;
  passed: boolean;
  issues: string[];
};

export type AiEstimateCanaryFeedbackEvaluation = {
  feedback_total: number;
  negative_feedback_total: number;
  negative_feedback_rate: number;
  top_failure_categories: string[];
  affected_domains: string[];
  affected_entrypoints: string[];
  sample_runtimeTraceIds: string[];
  recommended_action: AiEstimateCanaryEvaluationDecision;
  passed: boolean;
  issues: string[];
};

export type AiEstimateCanaryManualReviewEvaluation = {
  sample_total: number;
  acceptable_total: number;
  minor_clarification_total: number;
  not_acceptable_total: number;
  acceptable_rate: number;
  wrong_work_count: number;
  pdf_bad_count: number;
  unsafe_count: number;
  passed: boolean;
  issues: string[];
};
