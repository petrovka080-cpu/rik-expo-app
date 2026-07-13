import { readRestoreProofJson } from "../restoreProductProof/restoreProofTestHelpers";

describe("estimate PDF text extractable", () => {
  it("extracts text from every binary PDF proof case", () => {
    const extract = readRestoreProofJson("pdf_text_extract.json");
    expect(extract.all_text_extractable).toBe(true);
    expect(extract.all_cyrillic_readable).toBe(true);
    expect(extract.mojibake_found).toBe(false);
  });
});
