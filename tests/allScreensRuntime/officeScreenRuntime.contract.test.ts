import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("office screen runtime contract", () => {
  it("keeps Office route present, guarded, and separate from consumer estimate data", () => {
    const report = getAllScreensReport();
    const officeRoute = report.routeMatrix.routes.find((route) => route.route === "/office");
    expect(officeRoute).toMatchObject({ file_exists: true, error_boundary_wrapped: true });
    expect(report.matrix.office_screen_ready).toBe(true);
    expect(report.matrix.consumer_office_leak_found).toBe(false);
  });
});
