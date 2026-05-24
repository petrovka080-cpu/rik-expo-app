import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF real table", () => {
  it("renders PDF rectangle borders and required table columns", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(pdf.body).toMatch(/\sre\sS/);
    for (const column of ["#", "Наименование", "Категория", "Кол-во", "Ед.", "Цена", "Сумма"]) {
      expect(pdf.validation.text).toContain(column);
    }
  });
});
