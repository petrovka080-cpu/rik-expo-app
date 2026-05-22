import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("marketplace plus add runtime contract", () => {
  it("keeps the plus button wired to add product and backend validation", () => {
    const report = getAllScreensReport();
    expect(report.matrix.marketplace_add_screen_ready).toBe(true);
    expect(report.matrix.backend_validates_marketplace_publish).toBe(true);
    expect(report.backend.marketplace_publish_direct_ui_found).toBe(false);
  });
});
