import { buildLegacyPdfProof } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF text snapshot", () => {
  it("preserves the old text-table shape for legacy estimates", () => {
    const { extraction, estimate } = buildLegacyPdfProof();
    const normalizePdfWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();
    expect(normalizePdfWhitespace(extraction.text)).toContain(
      normalizePdfWhitespace(estimate.totals.displayGrandTotal),
    );
    expect(extraction.text).toContain("|");
  });
});
