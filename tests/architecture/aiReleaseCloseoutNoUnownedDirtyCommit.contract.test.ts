import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

it("does not include unowned dirty files in the commit plan", () => {
  const report = buildAiEnterpriseReleaseCloseoutReport();
  expect(report.commitPlan.unownedDirtyFiles).toEqual([]);
  expect(report.matrix.unowned_dirty_files_found).toBe(0);
});
