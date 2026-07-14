import {
  buildRoofExactEstimate,
  renderExactPdfText,
} from "../exactEstimate/exactEstimateTestHelpers";

describe("enterprise exact estimate UI/PDF parity", () => {
  it("renders the same exact material rows and price statuses in UI and PDF", () => {
    const result = buildRoofExactEstimate();
    const pdfText = renderExactPdfText(result);

    expect(pdfText).toContain(result.work.visible_name_ru);
    for (const row of result.ui_model.rows) {
      expect(pdfText).toContain(row.material_name);
      expect(pdfText).toContain(row.quantity);
      expect(pdfText).toContain(row.unit_price);
      expect(pdfText).toContain(row.line_total);
    }
  });
});
