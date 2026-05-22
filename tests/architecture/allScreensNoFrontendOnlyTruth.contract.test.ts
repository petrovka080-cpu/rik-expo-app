import { getAllScreensReport } from "../allScreensRuntime/allScreensRuntimeTestHarness";

describe("all screens no frontend-only truth contract", () => {
  it("keeps estimate, PDF, marketplace, and role mutations behind backend/service boundaries", () => {
    const report = getAllScreensReport();
    expect(report.matrix.backend_calculates_estimates).toBe(true);
    expect(report.matrix.backend_generates_pdf).toBe(true);
    expect(report.matrix.backend_validates_marketplace_publish).toBe(true);
    expect(report.matrix.frontend_only_truth_found).toBe(false);
  });
});
