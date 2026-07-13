import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("release source freeze amend discipline", () => {
  it("does not rely on amend loops", () => {
    expectFileToContain("scripts/release/releaseCandidateState.ts", "CANCELLED_SOURCE_CHANGED_AFTER_FREEZE");
    expectFileNotToMatch(".husky/pre-commit", /changedSince=HEAD~1|commit\s+--amend|--no-verify/);
  });
});
