import { expectFileToContain } from "./releasePipelineContractUtils";

describe("full Jest artifact promotion", () => {
  it("blocks failed full Jest artifacts from promotion", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "BLOCKED_FAILED_ARTIFACT_NOT_PROMOTED");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "fake_green_claimed");
  });
});
