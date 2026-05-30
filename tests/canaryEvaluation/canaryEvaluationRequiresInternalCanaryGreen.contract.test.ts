import { evaluateAiEstimateInternalCanaryEvidence } from "../../src/lib/ai/productionCanary";

function greenEvidence(overrides: Record<string, unknown> = {}) {
  return {
    matrix: {
      final_status: "GREEN_AI_ESTIMATE_INTERNAL_CANARY_EXECUTION_READY",
      decision: "GO_NEXT_INTERNAL_CANARY_STAGE",
      replay_sessions_total: 2000,
      replay_sessions_passed: 2000,
      replay_sessions_failed: 0,
      production_rollout_enabled: false,
      public_canary_enabled: false,
      fake_green_claimed: false,
      ...overrides,
    },
    errorBudget: {
      estimate_success_rate_gte_99_5: true,
      pdf_success_rate_gte_99: true,
      pdf_mojibake_rate_zero: true,
      object_misclassification_rate_zero: true,
      template_gap_for_parsable_work_rate_zero: true,
      weak_generic_rows_rate_zero: true,
      regulated_safety_missing_rate_zero: true,
      telemetry_missing_rate_zero: true,
      feedback_capture_failure_rate_zero: true,
    },
    telemetryAudit: {
      telemetry_ready: true,
      telemetry_redacted: true,
      telemetry_secrets_found: false,
      personal_data_leak_found: false,
    },
    feedbackAudit: { feedback_capture_ready: true },
    killSwitchDrill: { kill_switch_drill_passed: true },
    rollbackDrill: { rollback_drill_passed: true },
    webResults: { web_live_app_tested: true, web_flows_passed: true },
    androidApi34Results: {
      android_api34_tested: true,
      android_api34_prompts_passed: 4,
      api36_rejected: true,
    },
    pdfTextExtract: { pdf_sample_passed: true, pdf_mojibake_found: false },
  };
}

test("canary evaluation requires the internal canary execution matrix to be green", () => {
  expect(evaluateAiEstimateInternalCanaryEvidence(greenEvidence()).valid).toBe(true);
  expect(evaluateAiEstimateInternalCanaryEvidence(greenEvidence({ final_status: "NO_GO" })).issues)
    .toContain("INTERNAL_CANARY_NOT_GREEN");
});
