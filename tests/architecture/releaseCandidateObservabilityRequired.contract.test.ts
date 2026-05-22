import { getEnterpriseReleaseCandidateReport } from "../releaseCandidate/releaseCandidateTestHarness";

describe("release candidate observability required", () => {
  it("requires operational events, metrics and redaction", () => {
    const report = getEnterpriseReleaseCandidateReport();
    expect(report.observability.observability_ready).toBe(true);
    expect(report.redaction.redaction_passed).toBe(true);
    expect(report.observability.metrics).toContain("android_logcat_fatal_count");
  });
});

