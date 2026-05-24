import { buildSafeIntegrationPdf } from "./aiEstimatePdfSafeIntegrationTestHelpers";

describe("AI estimate PDF header", () => {
  it("contains document title, number, status, and date", () => {
    const { pdf } = buildSafeIntegrationPdf();
    expect(pdf.validation.text).toContain("Сметное предложение / Смета работ");
    expect(pdf.validation.text).toContain("Номер документа");
    expect(pdf.validation.text).toContain("Статус");
    expect(pdf.validation.text).toContain("Дата формирования");
  });
});
