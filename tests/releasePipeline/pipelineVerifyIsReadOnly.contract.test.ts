import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("release pipeline verify read-only contract", () => {
  it("checks status and tracked hashes before and after verification", () => {
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "trackedFileHashes()");
    expectFileToContain("scripts/release/runReleasePipelineVerify.ts", "VERIFY_MUTATED_WORKTREE");
    expectFileNotToMatch("scripts/release/runReleasePipelineVerify.ts", /assembleRelease|adbPath|install",\s*"-r"|artifacts\/S_RELEASE_PIPELINE_RECOVERY/);
  });
});
