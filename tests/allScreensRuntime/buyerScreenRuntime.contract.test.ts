import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("buyer screen runtime contract", () => {
  it("keeps Buyer route and procurement proof flow present", () => {
    expect(getAllScreensReport().matrix.buyer_screen_ready).toBe(true);
  });
});
