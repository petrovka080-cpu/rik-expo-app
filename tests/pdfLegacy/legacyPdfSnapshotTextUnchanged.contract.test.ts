import { buildLegacyPdfProof } from "../aiEstimatePdf/aiEstimatePdfSafeIntegrationTestHelpers";

describe("legacy PDF text snapshot", () => {
  it("preserves the old text-table shape for legacy estimates", () => {
    const { extraction, estimate } = buildLegacyPdfProof();
    expect(extraction.text).toContain(estimate.totals.displayGrandTotal);
    expect(extraction.text).toContain("|");
  });
});
