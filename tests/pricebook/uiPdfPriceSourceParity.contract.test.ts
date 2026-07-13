import {
  buildPricebookRoofEstimate,
  renderPricebookPdfText,
} from "./pricebookRatebookTestHelpers";

describe("UI/PDF price source parity contract", () => {
  it("renders the same governed source labels in UI rows and PDF rows", () => {
    const result = buildPricebookRoofEstimate();
    const pdfText = renderPricebookPdfText(result);

    expect(result.ui_model.rows.length).toBe(result.pdf_model.sections[0]?.rows.length);
    for (const row of result.ui_model.rows) {
      const pdfRow = result.pdf_model.sections[0]?.rows.find((item) => item.rowNumber === row.row_number);
      expect(pdfRow).toBeTruthy();
      expect(pdfRow?.sourceLabels).toEqual([row.source_label]);
      expect(pdfText).toContain(row.source_label.slice(0, 18));
    }
  });
});
