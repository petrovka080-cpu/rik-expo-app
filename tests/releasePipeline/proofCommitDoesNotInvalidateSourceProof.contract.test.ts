import { expectFileToContain } from "./releasePipelineContractUtils";

describe("release proof lineage", () => {
  it("uses source fingerprints instead of current HEAD equality only", () => {
    expectFileToContain("scripts/release/computeReleaseFingerprints.ts", "sourceTreeHash");
    expectFileToContain("scripts/e2e/androidApi34Verify.ts", "source_tree_hash");
    expectFileToContain("scripts/release/assertSourceFrozen.ts", "computeReleaseFingerprints");
  });
});
