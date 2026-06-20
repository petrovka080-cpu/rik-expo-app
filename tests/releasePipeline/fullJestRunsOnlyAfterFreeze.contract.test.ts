import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest", () => {
  it("requires source freeze and a clean tracked worktree", () => {
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "assertSourceFrozen()");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "BLOCKED_FULL_JEST_REQUIRES_CLEAN_WORKTREE");
    expectFileNotToMatch("scripts/release/runFrozenFullJest.ts", /writeReleaseCandidate|RELEASE_PIPELINE_ARTIFACT_DIR/);
  });
});
