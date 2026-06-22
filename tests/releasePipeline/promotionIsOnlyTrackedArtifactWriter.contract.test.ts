import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("promotion is the only tracked release artifact writer", () => {
  it("keeps tracked release pipeline writes in promotion code only", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "RELEASE_PIPELINE_ARTIFACT_DIR");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "fs.renameSync(tempDir, RELEASE_PIPELINE_ARTIFACT_DIR)");
    expectFileNotToMatch("scripts/release/run-release-guard.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|S_RELEASE_PIPELINE_RECOVERY/);
    expectFileNotToMatch("scripts/release/runProductProofRuntimeGate.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\/S_RELEASE_PIPELINE_RECOVERY/);
    expectFileNotToMatch("scripts/release/runReleasePipelineVerify.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\/S_RELEASE_PIPELINE_RECOVERY/);
  });
});
