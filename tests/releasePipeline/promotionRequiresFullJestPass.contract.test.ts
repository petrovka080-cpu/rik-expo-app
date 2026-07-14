import { expectFileToContain } from "./releasePipelineContractUtils";

describe("pipeline promotion full Jest gate", () => {
  it("requires a successful frozen full Jest result", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", 'fullJest.success !== true && fullJest.passed !== true');
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "full-jest");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "result.json");
  });
});
