import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate rollback required", () => {
  it("requires flag rollback, readable history and old flow continuity", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const rollback = report.rollback;
    expect(rollback.rollback_steps.length).toBeGreaterThanOrEqual(10);
    expect(rollback.disabling_flags_hides_new_actions).toBe(true);
    if (!rollback.old_screens_still_open) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(rollback.old_screens_still_open).toBe(true);
  });
});
