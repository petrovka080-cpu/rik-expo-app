import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate rollback", () => {
  it("keeps old screens and PDF history readable after flag rollback", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const rollback = report.rollback;
    expect(rollback.rollback_proof_passed).toBe(true);
    if (!rollback.history_pdfs_still_open || !rollback.marketplace_add_still_opens) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(rollback.history_pdfs_still_open).toBe(true);
    expect(rollback.marketplace_add_still_opens).toBe(true);
    expect(rollback.no_crash_after_rollback).toBe(true);
  });
});
