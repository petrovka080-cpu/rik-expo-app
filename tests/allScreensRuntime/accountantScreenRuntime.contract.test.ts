import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("accountant screen runtime contract", () => {
  it("keeps Accountant route and payment proof flow present", () => {
    expect(getAllScreensReport().matrix.accountant_screen_ready).toBe(true);
  });
});
