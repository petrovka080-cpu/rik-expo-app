import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("warehouse screen runtime contract", () => {
  it("keeps Warehouse route and stock issue/receive proof flow present", () => {
    expect(getAllScreensReport().matrix.warehouse_screen_ready).toBe(true);
  });
});
