import { expectFileToContain } from "./releasePipelineContractUtils";

describe("runtime locks web server", () => {
  it("declares a fixed web runtime lock", () => {
    expectFileToContain("scripts/release/runtimeLock.ts", '"web-8081"');
    expectFileToContain("scripts/release/runtimeLock.ts", "pidAlive");
  });
});
