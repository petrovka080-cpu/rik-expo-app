import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 preflight", () => {
  it("does not build, install, or mutate app state", () => {
    expectFileToContain("scripts/e2e/androidApi34Preflight.ts", "GREEN_ANDROID_API34_PREFLIGHT_READY");
    expectFileNotToMatch("scripts/e2e/androidApi34Preflight.ts", /assembleDebug|install",\s*"-r"|pm",\s*"install"|emu",\s*"kill"|Start-Process/);
  });
});
