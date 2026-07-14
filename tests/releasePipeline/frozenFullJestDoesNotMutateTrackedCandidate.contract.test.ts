import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("frozen full Jest candidate isolation", () => {
  it("does not mutate tracked or runtime candidate state", () => {
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "loadReleaseCandidate");
    expectFileNotToMatch("scripts/release/runFrozenFullJest.ts", /writeReleaseCandidate|transitionReleaseCandidate|release_candidate\.json|candidate_state\.json/);
  });
});
