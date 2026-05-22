import { getAllScreensReport } from "../allScreensRuntime/allScreensRuntimeTestHarness";

describe("all screens no second PDF framework contract", () => {
  it("uses existing PDF lifecycle and viewer for generated estimate PDFs", () => {
    const report = getAllScreensReport();
    expect(report.backend.pdf_existing_pipeline_used).toBe(true);
    expect(report.backend.second_pdf_framework_found).toBe(false);
    expect(report.pdfOpen.viewer_route_exists).toBe(true);
  });
});
