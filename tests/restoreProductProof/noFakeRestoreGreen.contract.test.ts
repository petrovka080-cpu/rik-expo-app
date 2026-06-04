import fs from "node:fs";

import { readRestoreProofJson, RESTORE_PROOF_DIR } from "./restoreProofTestHelpers";

describe("no fake restore green", () => {
  it("keeps fake_green_claimed false in every restore proof JSON artifact", () => {
    const files = fs
      .readdirSync(RESTORE_PROOF_DIR)
      .filter((file) => file.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const file of files) {
      const parsed = readRestoreProofJson(file);
      if ("fake_green_claimed" in parsed) {
        expect(parsed.fake_green_claimed).toBe(false);
      }
    }
  });
});
