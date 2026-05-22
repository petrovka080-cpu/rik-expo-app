import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("director screen runtime contract", () => {
  it("keeps Director route and backend approval proof flow present", () => {
    expect(getAllScreensReport().matrix.director_screen_ready).toBe(true);
  });
});
