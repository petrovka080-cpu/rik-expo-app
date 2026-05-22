import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("contractor screen runtime contract", () => {
  it("keeps Contractor route and evidence/PDF proof flows present", () => {
    expect(getAllScreensReport().matrix.contractor_screen_ready).toBe(true);
    expect(getAllScreensReport().noOverlap.contractor_media_inside_expanded_work).toBe(true);
  });
});
