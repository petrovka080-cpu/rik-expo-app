import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF totals", () => {
  it("contains materials, labor, tax, and grand totals", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain(estimate.totals.displayMaterialsTotal);
    expect(pdf.validation.text).toContain(estimate.totals.displayLaborTotal);
    expect(pdf.validation.text).toContain(estimate.totals.displayTaxTotal);
    expect(pdf.validation.text).toContain(estimate.totals.displayGrandTotal);
  });
});
