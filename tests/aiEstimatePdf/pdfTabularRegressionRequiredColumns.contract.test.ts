import { buildPdfTabularRegressionPdf } from "./pdfTabularRegressionTestHelpers";

describe("AI estimate PDF tabular regression required columns", () => {
  it("contains the release-grade table columns", () => {
    const { pdf } = buildPdfTabularRegressionPdf();
    for (const column of ["#", "Наименование", "Категория", "Кол-во", "Ед.", "Цена", "Сумма"]) {
      expect(pdf.validation.text).toContain(column);
    }
    expect(pdf.validation.details.requiredColumnsPresent).toBe(true);
  });
});
