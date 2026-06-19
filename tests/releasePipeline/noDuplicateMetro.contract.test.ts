import { expectFileToContain } from "./releasePipelineContractUtils";

describe("runtime locks Android Metro", () => {
  it("declares a fixed Metro runtime lock", () => {
    expectFileToContain("scripts/release/runtimeLock.ts", '"android-metro-8100"');
    expectFileToContain("scripts/release/runtimeLock.ts", ".tmp");
  });
});
