import { expectFileToContain } from "./releasePipelineContractUtils";

describe("runtime locks API34 emulator", () => {
  it("declares a fixed API34 runtime lock", () => {
    expectFileToContain("scripts/release/runtimeLock.ts", '"android-api34"');
    expectFileToContain("scripts/e2e/androidApi34Preflight.ts", "duplicate_android_emulators");
  });
});
