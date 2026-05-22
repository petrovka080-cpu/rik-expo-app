import { getEnterpriseReleaseCandidateReport } from "./releaseCandidateTestHarness";

describe("enterprise release candidate feature flags", () => {
  it("keeps risky rollout flags default-off, canary-capable, and rollback-safe", () => {
    const report = getEnterpriseReleaseCandidateReport();
    expect(report.flags.feature_flags_ready).toBe(true);
    expect(report.flags.feature_flags_default_safe).toBe(true);
    expect(report.flags.canary_supported).toBe(true);
    expect(report.flags.rollback_supported).toBe(true);
  });
});

