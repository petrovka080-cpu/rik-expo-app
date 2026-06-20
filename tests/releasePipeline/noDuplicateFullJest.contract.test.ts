import { expectFileToContain } from "./releasePipelineContractUtils";

describe("runtime locks full Jest", () => {
  it("blocks duplicate full Jest processes", () => {
    expectFileToContain("scripts/release/runtimeLock.ts", '"full-jest"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'acquireRuntimeLock("full-jest"');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'releaseRuntimeLock("full-jest")');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "BLOCKED_DUPLICATE_FULL_JEST_PROCESS");
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'normalized.includes("runfrozenfulljest.ts")');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", 'normalized.includes("release:full-jest:frozen")');
    expectFileToContain("scripts/release/runFrozenFullJest.ts", "node_modules\\/");
  });
});
