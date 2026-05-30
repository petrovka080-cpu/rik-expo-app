import { evaluateCanaryRolloutDecision } from "../../src/lib/ai/productionCanary";

const realUsage = {
  total_sessions: 2000,
  successful_estimates: 2000,
  failed_estimates: 0,
  template_gap_for_parsable_work_count: 0,
  object_misclassification_count: 0,
  weak_generic_rows_count: 0,
  pdf_failures: 0,
  pdf_mojibake_count: 0,
  regulated_safety_missing_count: 0,
  telemetry_missing_count: 0,
  feedback_capture_failures: 0,
  p95_latency: 100,
  p99_latency: 200,
  passed: true,
  issues: [],
};

const feedback = {
  feedback_total: 2000,
  negative_feedback_total: 0,
  negative_feedback_rate: 0,
  top_failure_categories: [],
  affected_domains: [],
  affected_entrypoints: [],
  sample_runtimeTraceIds: [],
  recommended_action: "GO_LIMITED_PUBLIC_BETA" as const,
  passed: true,
  issues: [],
};

const manualReview = {
  sample_total: 300,
  acceptable_total: 300,
  minor_clarification_total: 0,
  not_acceptable_total: 0,
  acceptable_rate: 1,
  wrong_work_count: 0,
  pdf_bad_count: 0,
  unsafe_count: 0,
  passed: true,
  issues: [],
};

test("rollout decision requires error budget pass", () => {
  expect(evaluateCanaryRolloutDecision({
    all_prerequisites_green: true,
    evidence_ledger_passed: true,
    real_usage: realUsage,
    feedback,
    manual_review: manualReview,
    rollback_redrill_passed: true,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    limited_public_beta_ready: true,
    max_public_beta_percent_lte_0_5: true,
    telemetry_secrets_found: false,
    personal_data_leak_found: false,
  }).decision).toBe("GO_LIMITED_PUBLIC_BETA");

  expect(evaluateCanaryRolloutDecision({
    all_prerequisites_green: true,
    evidence_ledger_passed: true,
    real_usage: { ...realUsage, passed: false, issues: ["WEAK_GENERIC_ROWS_FOUND"] },
    feedback,
    manual_review: manualReview,
    rollback_redrill_passed: true,
    production_rollout_enabled: false,
    public_beta_enabled: false,
    limited_public_beta_ready: true,
    max_public_beta_percent_lte_0_5: true,
    telemetry_secrets_found: false,
    personal_data_leak_found: false,
  }).decision).toBe("NO_GO_ERROR_BUDGET_EXCEEDED");
});
