import { expectCoreRestoreMatrixReady } from "./restoreProofTestHelpers";

describe("restore matrix", () => {
  it("contains the source-of-truth restore gates expected by catalog audit", () => {
    const matrix = expectCoreRestoreMatrixReady();
    expect(matrix.blocked_catalog_audit_resolved).toBe(true);
    expect(matrix.previous_blocker).toBe("BLOCKED_PREVIOUS_RESTORE_PROOF_MISSING");
    expect(matrix.pdf_no_mojibake).toBe(true);
    expect(matrix.pdf_text_extractable).toBe(true);
    expect(matrix.api36_used_as_substitute).toBe(false);
  });
});
