import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate canary plan", () => {
  it("locks internal-first rollout phases and stop conditions", () => {
    const canary = getEnterpriseReleaseCandidateReport().canary;
    expect(canary.canary_plan_ready).toBe(true);
    expect(canary.phases.map((phase) => phase.percentage)).toEqual([0, 5, 25, 100]);
    expect(canary.stop_conditions).toContain("rls_security_alert");
  });
});

