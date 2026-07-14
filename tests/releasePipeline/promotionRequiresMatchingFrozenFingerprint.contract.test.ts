import { expectFileToContain } from "./releasePipelineContractUtils";

describe("pipeline promotion fingerprint gate", () => {
  it("requires current source fingerprints to match the frozen candidate", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "CURRENT_FINGERPRINT_CANDIDATE_HASH_MISMATCH");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "assertSourceFrozen()");
  });
});
