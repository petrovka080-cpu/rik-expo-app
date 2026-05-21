import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout commit plan", () => {
  it("uses an explicit file list and blocks unowned files", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport();

    expect(report.commitPlan.explicitAddFiles.length).toBeGreaterThan(0);
    expect(report.commitPlan.explicitAddFiles).not.toContain(".");
    expect(report.commitPlan.commitMessage).toBe("Deliver enterprise AI core release closeout");
    expect(report.matrix.unrelated_dirty_files_committed).toBe(0);
  });
});
