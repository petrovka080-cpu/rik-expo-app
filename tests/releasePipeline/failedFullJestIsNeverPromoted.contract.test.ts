import { expectFileToContain } from "./releasePipelineContractUtils";

describe("failed full Jest promotion", () => {
  it("requires zero exit code and zero failed tests before tracked promotion", () => {
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "FULL_JEST_EXIT_CODE_NOT_ZERO");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "FULL_JEST_FAILED_SUITES");
    expectFileToContain("scripts/release/promoteVerifiedArtifact.ts", "FULL_JEST_FAILED_TESTS");
  });
});
