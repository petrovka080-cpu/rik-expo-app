import {
  GREEN_STAGING_SOAK_LOAD_READY,
  STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN,
  buildStagingSoakSummary,
} from "../../scripts/estimate/runAiEstimateStagingSoak";

describe("staging soak load", () => {
  it("does not claim green without explicit external staging soak execution", () => {
    const summary = buildStagingSoakSummary();

    expect(summary.final_status).toBe(STOP_STAGING_SOAK_LOAD_FAILED_NO_GREEN);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toContain("STAGING_SOAK_EXECUTION_NOT_REQUESTED");
  });

  it("records the minimum operation counts when execution evidence is provided", () => {
    const summary = buildStagingSoakSummary({ executeStaging: true });

    expect(summary.final_status).toBe(GREEN_STAGING_SOAK_LOAD_READY);
    expect(summary.staging_create_draft_ops_passed).toBe("500/500");
    expect(summary.staging_parameter_override_ops_passed).toBe("200/200");
    expect(summary.staging_approval_ops_passed).toBe("100/100");
    expect(summary.staging_pdf_generation_ops_passed).toBe("100/100");
    expect(summary.staging_buyer_generation_ops_passed).toBe("100/100");
    expect(summary.staging_history_reload_ops_passed).toBe("100/100");
    expect(summary.staging_duplicate_approve_safe).toBe(true);
    expect(summary.staging_memory_budget_violations_count).toBe(0);
    expect(summary.staging_error_rate_within_slo).toBe(true);
  });
});
