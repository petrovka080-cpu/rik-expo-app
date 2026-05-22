import { getAllScreensReport } from "./allScreensRuntimeTestHarness";

describe("AI chat estimate PDF runtime contract", () => {
  it("requires backend-backed estimate payload before showing PDF generation", () => {
    const report = getAllScreensReport();
    expect(report.matrix.chat_screen_ready).toBe(true);
    expect(report.matrix.ai_estimate_to_pdf_ready).toBe(true);
    expect(report.backend.frontend_price_tax_calculation_found).toBe(false);
  });
});
