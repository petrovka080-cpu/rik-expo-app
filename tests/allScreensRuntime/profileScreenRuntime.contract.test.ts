import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("profile screen runtime contract", () => {
  it("keeps Profile route present without exposing debug payloads", () => {
    expect(getAllScreensReport().matrix.profile_screen_ready).toBe(true);
    expect(getAllScreensReport().matrix.debug_payload_leak_found).toBe(false);
  });
});
