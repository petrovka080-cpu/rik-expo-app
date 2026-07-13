import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate canary plan", () => {
  it("locks internal-first rollout phases and stop conditions", () => {
    const report = getEnterpriseReleaseCandidateReport();
    const canary = report.canary;
    expect(canary.phases.map((phase) => phase.percentage)).toEqual([0, 5, 25, 100]);
    expect(canary.stop_conditions).toContain("rls_security_alert");
    if (!canary.canary_plan_ready) {
      expect(report.matrix.final_status).toBe("BLOCKED_ENTERPRISE_RELEASE_CANDIDATE_NOT_READY");
      expect(report.matrix.blockers).toContain("release_candidate_proof_runner_not_green");
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(canary.canary_plan_ready).toBe(true);
  });
});
