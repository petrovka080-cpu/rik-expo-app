import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("all screens debug payload leak contract", () => {
  it("does not expose debug payloads, service role keys, or raw signed URL internals", () => {
    const report = getAllScreensReport();
    expect(report.matrix.debug_payload_leak_found).toBe(false);
    expect(report.pdfOpen.raw_signed_url_visible_to_user).toBe(false);
  });
});
