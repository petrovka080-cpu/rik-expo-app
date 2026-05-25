import { buildPdfTabularRegressionPdf } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression totals tax sources", () => {
  it("renders totals, tax status, source footer, and confidence in human labels", () => {
    const { estimate, pdf } = buildPdfTabularRegressionPdf();
    expect(pdf.validation.details.totalsPresent).toBe(true);
    expect(pdf.validation.details.taxSourcesFooterPresent).toBe(true);
    expect(pdf.validation.text).toContain(estimate.totals.displayGrandTotal);
    expect(pdf.validation.text).toContain(estimate.tax.taxLabel);
    expect(pdf.validation.text).toContain("Источники");
    expect(pdf.validation.text).toContain("Точность расчёта:");
  });
});
