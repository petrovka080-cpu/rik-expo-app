import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF procurement clone guard", () => {
  it("does not copy procurement semantics into estimate documents", () => {
    const { pdf } = buildSafeIntegrationPdf();
    for (const term of ["Снабженец", "Поставщики", "Заявка на закупку", "Утверждена", "Supplier", "Director Proposal"]) {
      expect(pdf.validation.text).not.toContain(term);
    }
  });
});
