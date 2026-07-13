import { expectFileToContain } from "./releasePipelineContractUtils";

describe("release proof lineage", () => {
  it("uses source fingerprints instead of current HEAD equality only", () => {
    expectFileToContain("scripts/release/computeReleaseFingerprints.ts", "candidateHash");
    expectFileToContain("scripts/release/android/verifyProof.ts", "candidateHash");
    expectFileToContain("scripts/release/assertSourceFrozen.ts", "computeReleaseFingerprints");
  });
});
