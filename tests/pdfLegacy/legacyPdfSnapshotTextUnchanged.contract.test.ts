import { buildLegacyPdfProof } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

function normalizePdfExtractedWhitespace(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

describe("legacy PDF text snapshot", () => {
  it("preserves the old text-table shape for legacy estimates", () => {
    const { extraction, pdf } = buildLegacyPdfProof();
    expect(normalizePdfExtractedWhitespace(extraction.text)).toContain(
      normalizePdfExtractedWhitespace(pdf.viewModel.totals.grand),
    );
    expect(extraction.text).toContain("|");
  });
});
