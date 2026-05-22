import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate frontend truth boundary", () => {
  it("keeps estimate, PDF, marketplace and RLS truth backend-owned", () => {
    const report = getEnterpriseReleaseCandidateReport();
    expect(report.matrix.global_estimate_backend_owned).toBe(true);
    expect(report.matrix.backend_deployment_ready).toBe(true);
    expect(report.backendProof.frontend_canonical_truth_found).toBe(false);
  });
});

