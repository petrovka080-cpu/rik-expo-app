import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate rollback required", () => {
  it("requires flag rollback, readable history and old flow continuity", () => {
    const rollback = getEnterpriseReleaseCandidateReport().rollback;
    expect(rollback.rollback_steps.length).toBeGreaterThanOrEqual(10);
    expect(rollback.disabling_flags_hides_new_actions).toBe(true);
    expect(rollback.old_screens_still_open).toBe(true);
  });
});

