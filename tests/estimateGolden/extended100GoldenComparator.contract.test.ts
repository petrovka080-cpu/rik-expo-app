import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate golden comparator", () => {
  it("produces the green closeout contract without hidden blockers", () => {
    const summary = extended100CertificationSummary();

    expect(summary.target_final_status).toBe("GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS");
    expect(summary.final_status).toBe(summary.target_final_status);
    expect(summary.certification_scope).toBe("full_100_cases_plus_10000_templates");
    expect(summary.full_certification_green).toBe(true);
    expect(summary.smoke_only_green).toBe(false);
    expect(summary.full_certification_not_claimed_when_templates_skipped).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.smoke_execution_mode).toBe("headless_route_equivalent");
    expect(summary.browser_automation_started).toBe(false);
    expect(summary.smoke_claims_actual_browser_automation).toBe(false);
    expect(summary.all_10000_templates_extended_validation_executed).toBe(true);
    expect(summary.all_10000_templates_extended_validation_passed).toBe(true);
    expect(summary.templates_validated_count).toBe(10000);
    expect(summary.rows_validated_count).toBe(369000);
    expect(summary.production_db_touched).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.eas_started).toBe(false);
    expect(summary.release_started).toBe(false);
  });
});
