import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF tax sources footer", () => {
  it("contains tax status, source evidence, confidence, and sign-off footer", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain(estimate.tax.taxLabel);
    expect(pdf.validation.text).toContain("Источники");
    expect(pdf.validation.text).toContain("Точность расчёта:");
    expect(pdf.validation.text).toContain("Подпись заказчика");
  });
});
