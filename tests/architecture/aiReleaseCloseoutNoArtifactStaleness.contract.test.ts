import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

it("does not allow stale green wave artifacts", () => {
  const report = buildAiEnterpriseReleaseCloseoutReport();
  expect(report.matrix.artifact_freshness_passed).toBe(true);
  expect(report.matrix.stale_green_artifacts_found).toBe(0);
});
