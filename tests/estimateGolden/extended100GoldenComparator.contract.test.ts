import { extended100CertificationSummary } from "./extended100TestHelpers";

describe("extended professional estimate golden comparator", () => {
  it("produces the green closeout contract without hidden blockers", () => {
    const summary = extended100CertificationSummary();

    expect(summary.target_final_status).toBe("GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS");
    expect(summary.final_status).toBe(summary.target_final_status);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.production_db_touched).toBe(false);
    expect(summary.native_build_started).toBe(false);
    expect(summary.eas_started).toBe(false);
    expect(summary.release_started).toBe(false);
  });
});
