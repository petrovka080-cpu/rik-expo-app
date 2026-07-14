import { universalPdfFixture } from "./universalPdfTestHelpers";

describe("universal PDF markdown truth guard", () => {
  it("does not parse markdown as the PDF source of truth", () => {
    const { pdf } = universalPdfFixture();
    expect(pdf.pdfTrace.markdown_parsed_as_pdf_truth).toBe(false);
  });
});
