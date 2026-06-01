import { universalPdfFixture } from "./universalPdfTestHelpers";

describe("universal PDF UI parity", () => {
  it("keeps visible rows in the extracted PDF text", () => {
    const { extracted, rows } = universalPdfFixture();
    const pdfText = extracted.text.toLocaleLowerCase("ru-RU");
    const checkedRows = rows.slice(0, 12);
    expect(checkedRows.length).toBeGreaterThanOrEqual(10);
    for (const row of checkedRows) {
      expect(pdfText).toContain(row.name.toLocaleLowerCase("ru-RU"));
    }
  });
});
