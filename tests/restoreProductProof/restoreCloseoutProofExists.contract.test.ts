import { expectNoFakeGreen, readRestoreProofJson } from "./restoreProofTestHelpers";

describe("restore closeout proof", () => {
  it("publishes the canonical closeout proof without fake green", () => {
    const proof = readRestoreProofJson("CLOSEOUT_PROOF.json");
    expect(proof.canonical_restore_proof_bundle_created).toBe(true);
    expect(proof.pdf_restore_green).toBe(true);
    expect(proof.android_api34_green).toBe(true);
    expectNoFakeGreen(proof, "CLOSEOUT_PROOF.json");
  });
});
