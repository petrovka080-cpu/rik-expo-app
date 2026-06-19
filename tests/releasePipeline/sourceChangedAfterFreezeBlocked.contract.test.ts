import { expectFileToContain } from "./releasePipelineContractUtils";

describe("release source freeze", () => {
  it("blocks source changes after freeze", () => {
    expectFileToContain("scripts/release/assertSourceFrozen.ts", "BLOCKED_SOURCE_CHANGED_AFTER_FREEZE");
    expectFileToContain("scripts/release/freezeReleaseSource.ts", "BLOCKED_SOURCE_FREEZE_SOURCE_DIRTY");
  });
});
