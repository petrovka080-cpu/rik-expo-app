import { computeReleaseFingerprints } from "../../scripts/release/computeReleaseFingerprints";

describe("release pipeline source tree hash", () => {
  it("is deterministic for the same source tree", () => {
    const first = computeReleaseFingerprints();
    const second = computeReleaseFingerprints();
    expect(first.sourceTreeHash).toBe(second.sourceTreeHash);
    expect(first.nativeBuildFingerprint).toBe(second.nativeBuildFingerprint);
    expect(first.jsBundleFingerprint).toBe(second.jsBundleFingerprint);
    expect(first.proofHarnessFingerprint).toBe(second.proofHarnessFingerprint);
  });
});
