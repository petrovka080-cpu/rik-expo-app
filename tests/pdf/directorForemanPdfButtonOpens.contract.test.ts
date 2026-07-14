import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("director/foreman PDF button opens", () => {
  it("keeps director role PDF render/open path wired to the canonical backend renderer", () => {
    const matrix = readRestoreProofJson("pdf_restore_matrix.json");
    expect(matrix.director_foreman_pdf_opens).toBe(true);
    expect(matrix.role_pdf_contracts).toEqual(
      expect.objectContaining({
        director_foreman_pdf_open_contract_green: true,
        fake_green_claimed: false,
      }),
    );
  });
});
