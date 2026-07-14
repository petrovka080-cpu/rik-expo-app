import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate frontend truth boundary", () => {
  it("keeps estimate, PDF, marketplace and RLS truth backend-owned", () => {
    const report = getEnterpriseReleaseCandidateReport();
    if (!report.matrix.global_estimate_backend_owned || !report.matrix.backend_deployment_ready) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.fake_green_claimed).toBe(false);
      expect(report.backendProof.frontend_canonical_truth_found).toBe(false);
      return;
    }

    expect(report.matrix.global_estimate_backend_owned).toBe(true);
    expect(report.matrix.backend_deployment_ready).toBe(true);
    expect(report.backendProof.frontend_canonical_truth_found).toBe(false);
  });
});
