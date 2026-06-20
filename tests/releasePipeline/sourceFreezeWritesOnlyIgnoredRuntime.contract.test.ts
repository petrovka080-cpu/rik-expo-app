import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("source freeze runtime output", () => {
  it("writes freeze evidence only to ignored runtime before promotion", () => {
    expectFileToContain("scripts/release/freezeReleaseSource.ts", "releasePipelineRuntimeDir");
    expectFileToContain("scripts/release/freezeReleaseSource.ts", "writeReleaseCandidate");
    expectFileToContain("scripts/release/releaseCandidateState.ts", "candidate_state.json");
    expectFileNotToMatch("scripts/release/freezeReleaseSource.ts", /RELEASE_PIPELINE_ARTIFACT_DIR|artifacts\//);
  });
});
