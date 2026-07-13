import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("marketplace estimate PDF opens", () => {
  it("validates the consumer request marketplace estimate PDF binary case", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.marketplace_estimate_pdf_opens).toBe(true);
  });
});
