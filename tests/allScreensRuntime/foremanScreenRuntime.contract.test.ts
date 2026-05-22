import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("foreman screen runtime contract", () => {
  it("keeps Foreman route and critical draft-submit proof flow present", () => {
    expect(getAllScreensReport().matrix.foreman_screen_ready).toBe(true);
  });
});
