import { buildLimitedPublicBetaDailyMonitorArtifact } from "../../scripts/e2e/aiEstimateLimitedPublicBetaExecutionCore";

test("limited public beta daily monitor blocks when error budget evidence is missing", () => {
  const monitor = buildLimitedPublicBetaDailyMonitorArtifact({
    sessions_total: 0,
    successful_estimates: 0,
    failed_estimates: 0,
    template_gap_for_parsable_work_count: 0,
    object_misclassification_count: 0,
    weak_generic_rows_count: 0,
    short_complex_estimate_count: 0,
    pdf_generated_count: 0,
    pdf_failed_count: 0,
    pdf_mojibake_count: 0,
    feedback_total: 0,
    negative_feedback_rate: 0,
    p95_latency: 0,
    p99_latency: 0,
    catalog_binding_failure_count: 0,
    source_evidence_missing_count: 0,
    regulated_safety_missing_count: 0,
    kill_switch_events: 0,
    rollback_events: 0,
  });
  expect(monitor.final_status).toBe("AUTO_NO_GO_AND_DISABLE_PUBLIC_BETA");
  expect(monitor.daily_monitor_ready).toBe(false);
  expect(monitor.failures).toContain("ESTIMATE_SUCCESS_RATE_LT_99_5");
});
