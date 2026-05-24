import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF rows", () => {
  it("uses the exact rows from GlobalEstimateResult", () => {
    const { estimate, pdf } = buildSafeIntegrationPdf("gable_roof_installation", 100);
    for (const row of estimate.sections.flatMap((section) => section.rows).slice(0, 5)) {
      expect(pdf.validation.text).toContain(row.name);
    }
    expect(pdf.validation.text).not.toContain("Строительные работы\n");
  });
});
