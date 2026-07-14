import { expectFileNotToContain, expectFileToContain } from "./releasePipelineContractUtils";

describe("release verify tracked artifact strictness", () => {
  it("uses strict snapshots instead of artifact allowlists for read-only enforcement", () => {
    expectFileToContain("scripts/release/run-release-guard.ts", "releaseVerifyStrictSnapshot()");
    expectFileToContain("scripts/release/run-release-guard.ts", "diffReleaseVerifyStrictSnapshots");
    expectFileToContain("scripts/release/releasePipelineRuntime.ts", "VERIFY_MUTATED_WORKTREE");
    expectFileNotToContain("scripts/release/run-release-guard.ts", "releaseVerifyBlockingDirtyFiles");
    expectFileNotToContain("scripts/release/run-release-guard.ts", "proofArtifactAllowlist");
    expectFileNotToContain("scripts/release/run-release-guard.ts", "writeReleaseVerifyStepTimingArtifact");
  });
});
