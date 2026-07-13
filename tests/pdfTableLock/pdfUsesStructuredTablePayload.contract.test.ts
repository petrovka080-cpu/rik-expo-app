import { universalPdfFixture } from "./universalPdfTestHelpers";

describe("universal PDF structured payload lock", () => {
  it("uses the structured estimate table payload", () => {
    const { pdf } = universalPdfFixture();
    expect(pdf.validation.valid).toBe(true);
    expect(pdf.pdfTrace.pdf_uses_structured_global_estimate_result).toBe(true);
  });
});
