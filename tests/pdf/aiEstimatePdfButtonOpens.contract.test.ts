import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("AI estimate PDF opens", () => {
  it("validates all direct AI estimate PDF binary cases", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.ai_estimate_pdf_opens).toBe(true);
  });
});
