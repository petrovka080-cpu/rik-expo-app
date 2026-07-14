import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("old estimate placeholder regression", () => {
  it("keeps the old placeholder/chip source removed from the request estimate UI", () => {
    const matrix = readRestoreProofJson("product_ui_restore_matrix.json");
    expect(matrix.old_placeholder_removed).toBe(true);
    expect(matrix.single_active_placeholder_source).toBe(true);
    expect(matrix.draft_duplicate_removed).toBe(true);
  });
});
