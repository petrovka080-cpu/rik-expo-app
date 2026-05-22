import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("PDF viewer runtime contract", () => {
  it("opens AI and consumer PDFs through the existing viewer boundary", () => {
    const report = getAllScreensReport();
    expect(report.matrix.pdf_viewer_ready).toBe(true);
    expect(report.matrix.pdf_open_ready).toBe(true);
    expect(report.pdfOpen.raw_signed_url_visible_to_user).toBe(false);
  });
});
