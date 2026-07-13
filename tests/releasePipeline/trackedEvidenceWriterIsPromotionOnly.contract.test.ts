import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("tracked release evidence writer", () => {
  it("keeps tracked pipeline artifact writes in promotion only", () => {
    expectFileToContain("package.json", "promoteVerifiedArtifact.ts --pipeline");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "RELEASE_PIPELINE_ARTIFACT_DIR");
    expectFileNotToMatch("scripts/release/freezeReleaseSource.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\//);
    expectFileNotToMatch("scripts/release/runFrozenFullJest.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\//);
    expectFileNotToMatch("scripts/release/runReleasePipelineVerify.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\//);
  });
});
