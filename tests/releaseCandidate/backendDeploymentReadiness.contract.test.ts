import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate backend readiness", () => {
  it("keeps Edge Functions, PDF/storage, RLS, marketplace and estimate services ready", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const backend = report.backendProof;
    if (!backend.backend_deployment_ready || !backend.rls_live_proof_passed) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(backend.backend_deployment_ready).toBe(true);
    expect(backend.edge_functions_ready).toBe(true);
    expect(backend.storage_pdf_access_ready).toBe(true);
    expect(backend.rls_live_proof_passed).toBe(true);
  });
});
