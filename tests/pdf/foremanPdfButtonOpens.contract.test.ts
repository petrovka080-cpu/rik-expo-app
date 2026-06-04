import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("foreman PDF button opens", () => {
  it("keeps the foreman PDF open path wired to the canonical backend descriptor", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.foreman_pdf_opens).toBe(true);
    expect(matrix.role_pdf_contracts).toEqual(
      expect.objectContaining({
        foreman_pdf_open_contract_green: true,
        fake_green_claimed: false,
      }),
    );
  });
});
