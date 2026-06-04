import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("PDF restore matrix", () => {
  it("proves binary PDF restore and role PDF wiring without mojibake", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.ai_estimate_pdf_opens).toBe(true);
    expect(matrix.marketplace_estimate_pdf_opens).toBe(true);
    expect(matrix.foreman_pdf_opens).toBe(true);
    expect(matrix.director_foreman_pdf_opens).toBe(true);
    expect(matrix.pdf_text_extractable).toBe(true);
    expect(matrix.pdf_no_mojibake).toBe(true);
    expect(matrix.pdf_rows_match_ui_rows).toBe(true);
    expectNoFakeGreen(matrix, "pdf_restore_matrix.json");
  });
});
