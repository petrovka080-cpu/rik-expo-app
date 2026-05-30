import {
  buildAiEstimatePublicRolloutDecision,
  type AiEstimateInternalCanaryEvidenceEvaluation,
} from "../../src/lib/ai/productionCanary";

function evaluationWithIssues(issues: string[]): AiEstimateInternalCanaryEvidenceEvaluation {
  return {
    valid: issues.length === 0,
    issues,
    summary: {
      all_prerequisites_green: true,
      internal_canary_green: true,
      internal_canary_decision: "GO_NEXT_INTERNAL_CANARY_STAGE",
      replay_sessions_total: 2000,
      replay_sessions_passed: 2000,
      replay_sessions_failed: 0,
      estimate_success_rate_gte_99_5: true,
      pdf_success_rate_gte_99: true,
      pdf_mojibake_rate_zero: true,
      object_misclassification_rate_zero: true,
      template_gap_for_parsable_work_rate_zero: true,
      weak_generic_rows_rate_zero: true,
      regulated_safety_missing_rate_zero: true,
      telemetry_missing_rate_zero: true,
      feedback_capture_failure_rate_zero: true,
      telemetry_ready: true,
      telemetry_redacted: true,
      telemetry_secrets_found: false,
      personal_data_leak_found: false,
      feedback_capture_ready: true,
      kill_switch_drill_passed: true,
      rollback_drill_passed: true,
      web_live_app_tested: true,
      web_flows_passed: true,
      android_api34_tested: true,
      android_api34_prompts_passed: 4,
      api36_rejected: true,
      pdf_sample_passed: true,
      pdf_mojibake_found: false,
      production_rollout_enabled: false,
      public_canary_enabled: false,
      fake_green_claimed: false,
    },
  };
}

test("canary evaluation blocks the next stage when error budget evidence fails", () => {
  expect(buildAiEstimatePublicRolloutDecision({ evidence: evaluationWithIssues([]) }).decision)
    .toBe("GO_LIMITED_PUBLIC_BETA");
  expect(buildAiEstimatePublicRolloutDecision({
    evidence: evaluationWithIssues(["WEAK_GENERIC_ROWS_RATE_NON_ZERO"]),
  }).decision).toBe("NO_GO_ROLLBACK_AND_FIX");
});
