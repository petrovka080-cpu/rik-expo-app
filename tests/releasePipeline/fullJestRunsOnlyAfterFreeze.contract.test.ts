import { expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest", () => {
  it("requires focused green state and source freeze", () => {
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'assertReleaseCandidateState("FOCUSED_GREEN")');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "assertSourceFrozen()");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "BLOCKED_FULL_JEST_REQUIRES_CLEAN_WORKTREE");
  });
});
