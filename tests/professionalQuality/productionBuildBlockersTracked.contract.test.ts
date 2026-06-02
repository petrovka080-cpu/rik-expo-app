import { buildAuditReport } from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("production build blockers", () => {
  it("tracks missing full Jest, release verify, Android, commit, push, and clean worktree evidence", () => {
    const report = buildAuditReport();

    expect(report.blockers).toContain("BLOCKED_FULL_JEST_TIMEOUT");
    expect(report.blockers).toContain("BLOCKED_RELEASE_VERIFY_FAILED");
    expect(report.blockers).toContain("BLOCKED_ANDROID_API34_PASSED");
    expect(report.blockers).toContain("BLOCKED_COMMIT_CREATED");
    expect(report.blockers).toContain("BLOCKED_BRANCH_PUSHED");
    expect(report.current_truth.no_eas_build_triggered).toBe(true);
  });
});
