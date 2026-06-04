import path from "node:path";

import { readRestoreProofJson, RESTORE_PROOF_DIR } from "./restoreProofTestHelpers";

describe("old nearby restore folder is not accepted as green", () => {
  it("uses the old folder only as reference, never as the canonical proof", () => {
    const baseline = readRestoreProofJson("baseline.json");
    const decision = readRestoreProofJson("repair_decision.json");
    expect(path.basename(RESTORE_PROOF_DIR)).toBe("S_RESTORE_PRODUCT_UI_PDF_LIVE_WEB_SOURCE_OF_TRUTH");
    expect(baseline.nearby_old_restore_folder_found).toBe(true);
    expect(baseline.nearby_old_restore_folder_used_as_green_without_revalidation).toBe(false);
    expect(decision.old_nearby_folder_used_only_as_reference).toBe(true);
  });
});
