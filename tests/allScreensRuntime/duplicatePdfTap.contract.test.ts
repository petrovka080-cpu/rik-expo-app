import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("duplicate PDF tap contract", () => {
  it("dedupes repeated PDF generation taps through busy state and open boundary", () => {
    expect(getAllScreensReport().pdfOpen.repeated_tap_deduped).toBe(true);
  });
});
