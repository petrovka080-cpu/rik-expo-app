import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("marketplace screen runtime contract", () => {
  it("keeps marketplace route present without debug media/storage leakage", () => {
    const report = getAllScreensReport();
    expect(report.matrix.marketplace_screen_ready).toBe(true);
    expect(report.matrix.debug_payload_leak_found).toBe(false);
  });
});
