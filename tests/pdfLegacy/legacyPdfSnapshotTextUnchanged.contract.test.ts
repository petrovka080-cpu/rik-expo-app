import { buildLegacyPdfProof } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

function normalizePdfExtractedWhitespace(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

describe("legacy PDF text snapshot", () => {
  it("preserves the old text-table shape for legacy estimates", () => {
    const { extraction, estimate } = buildLegacyPdfProof();
    expect(normalizePdfExtractedWhitespace(extraction.text)).toContain(
      normalizePdfExtractedWhitespace(estimate.totals.displayGrandTotal),
    );
    expect(extraction.text).toContain("|");
  });
});
