import fs from "node:fs";

import { RESTORE_PROOF_DIR } from "./restoreProofTestHelpers";

describe("restore proof canonical directory", () => {
  it("exists at the exact catalog-audit prerequisite path", () => {
    expect(fs.existsSync(RESTORE_PROOF_DIR)).toBe(true);
  });
});
