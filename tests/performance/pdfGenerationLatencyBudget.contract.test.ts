import { expectRepresentativePdfGeneration } from "./aiEstimatePerformanceBudgetTestHelpers";

describe("PDF generation latency budget", () => {
  it("generates PDF bytes within budget", () => {
    const pdf = expectRepresentativePdfGeneration();
    expect(pdf.validation.valid).toBe(true);
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
  });
});
