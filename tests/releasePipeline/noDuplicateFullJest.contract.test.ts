import { expectFileToContain } from "./releasePipelineContractUtils";

describe("runtime locks full Jest", () => {
  it("blocks duplicate full Jest processes", () => {
    expectFileToContain("scripts/release/runtimeLock.ts", '"full-jest"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "BLOCKED_DUPLICATE_FULL_JEST_PROCESS");
  });
});
