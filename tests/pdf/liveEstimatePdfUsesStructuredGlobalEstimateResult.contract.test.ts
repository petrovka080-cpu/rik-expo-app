import { estimateFor, pdfFor, REQUEST_LINOLEUM_PROMPT } from "../entrypoints/liveB2cEstimateRealityTestHelpers";

describe("live estimate PDF structured payload", () => {
  it("uses GlobalEstimateResult as source of truth", () => {
    const estimate = estimateFor("/request", REQUEST_LINOLEUM_PROMPT);
    const pdf = pdfFor(estimate);
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
    expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
  });
});
