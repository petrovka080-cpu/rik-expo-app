import { getAllScreensReport } from "../allScreensRuntime/allScreensRuntimeTestHarness";

describe("all screens no bottom nav deletion contract", () => {
  it("preserves every required bottom tab and the marketplace add plus", () => {
    const report = getAllScreensReport();
    expect(report.bottomNav.labels_present).toBe(true);
    expect(report.bottomNav.marketplace_plus_after_market).toBe(true);
    expect(report.bottomNav.duplicate_plus_found).toBe(false);
  });
});
