import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("estimate PDF rows match UI", () => {
  it("keeps generated PDF rows aligned with the visible estimate source rows", () => {
    const parity = readRestoreProofJson("pdf_ui_parity.json");
    expect(parity.pdf_rows_match_ui_rows).toBe(true);
  });
});
