import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("estimate PDF tabular format", () => {
  it("keeps restored estimate PDFs in extractable table format", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.pdf_table_format).toBe(true);
    expect(matrix.pdf_not_image_only).toBe(true);
  });
});
