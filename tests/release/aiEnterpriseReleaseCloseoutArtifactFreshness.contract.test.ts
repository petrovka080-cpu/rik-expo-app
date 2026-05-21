import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout artifact freshness", () => {
  it("requires every wave matrix to exist and be green", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport();

    expect(report.artifactFreshness.every((artifact) => artifact.present)).toBe(true);
    expect(report.artifactFreshness.every((artifact) => artifact.green)).toBe(true);
    expect(report.matrix.artifact_freshness_passed).toBe(true);
    expect(report.matrix.stale_green_artifacts_found).toBe(0);
  });
});
