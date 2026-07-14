import { validateStagingReleaseCandidateCases } from "../../scripts/estimate/runAiEstimateStagingReleaseCandidateCases";

describe("staging release candidate request flow corpus", () => {
  it("contains at least ten consumer request cases", () => {
    const summary = validateStagingReleaseCandidateCases();

    expect(summary.staging_rc_cases_created).toBe(true);
    expect(summary.staging_rc_cases_total).toBeGreaterThanOrEqual(60);
    expect(summary.consumer_cases_count).toBeGreaterThanOrEqual(10);
    expect(summary.critical_work_families_covered).toBe(true);
  });
});
