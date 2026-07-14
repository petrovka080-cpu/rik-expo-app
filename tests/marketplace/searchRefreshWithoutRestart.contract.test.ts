import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("marketplace search refresh without restart", () => {
  it("keeps request-to-market handoff explicit instead of requiring app restart", () => {
    const matrix = readRestoreProofJson("product_ui_restore_matrix.json");
    expect(matrix.search_refresh_without_restart).toBe(true);
  });
});
