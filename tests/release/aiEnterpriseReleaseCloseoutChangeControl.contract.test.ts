import {
  AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE,
  buildAiEnterpriseReleaseCloseoutReport,
} from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout change control", () => {
  it("collects dirty inventory and classifies every changed file", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport();

    expect(report.inventory.wave).toBe(AI_ENTERPRISE_RELEASE_CLOSEOUT_WAVE);
    expect(report.inventory.dirtyFiles.length).toBeGreaterThan(0);
    expect(report.ownership.length).toBeGreaterThanOrEqual(report.inventory.dirtyFiles.length);
    expect(report.commitPlan.explicitAddFiles).not.toContain(".");
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
