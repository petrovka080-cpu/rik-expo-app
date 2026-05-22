import { buildCoreProductGoldenPathsReport } from "../../scripts/e2e/coreProductGoldenPaths.shared";

describe("foreman to director golden path", () => {
  it("keeps draft actions available and service-backed through director approval", () => {
    const report = buildCoreProductGoldenPathsReport();

    expect(report.matrix.foreman_submit_director_flow_passed).toBe(true);
    expect(report.matrix.director_approval_flow_passed).toBe(true);
    expect(report.foreman_director.footer_actions_present).toBe(true);
    expect(report.foreman_director.submit_director_inside_draft).toBe(true);
    expect(report.foreman_director.submit_director_duplicate_found).toBe(false);
  });
});
