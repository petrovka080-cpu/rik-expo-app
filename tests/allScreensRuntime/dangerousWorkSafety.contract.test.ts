import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("dangerous work safety runtime contract", () => {
  it("keeps dangerous work in specialist estimate/request mode without DIY instructions", () => {
    expect(getAllScreensReport().matrix.dangerous_diy_instructions_found).toBe(false);
  });
});
