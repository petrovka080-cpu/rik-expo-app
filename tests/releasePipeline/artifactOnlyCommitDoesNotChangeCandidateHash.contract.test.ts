import { computeReleaseFingerprints } from "../../scripts/release/computeReleaseFingerprints";

describe("artifact-only commit candidate hash", () => {
  it("does not include tracked artifacts in the candidate hash", () => {
    const fingerprints = computeReleaseFingerprints();
    expect(fingerprints.candidateHash).toBeTruthy();
    expect(fingerprints.productSourceHash).toBeTruthy();
    expect(fingerprints.proofHarnessHash).toBeTruthy();
    expect(fingerprints.nativeBuildHash).toBeTruthy();
  });
});
