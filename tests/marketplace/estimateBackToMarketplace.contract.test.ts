import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("estimate back to marketplace restore", () => {
  it("keeps the request screen wired back to the marketplace route", () => {
    const matrix = readRestoreProofJson("product_ui_restore_matrix.json");
    expect(matrix.estimate_back_to_marketplace_restored).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
