import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 preflight", () => {
  it("does not build, install, or mutate app state", () => {
    expectFileToContain("scripts/release/android/preflight.ts", "GREEN_ANDROID_API34_PIPELINE_PREFLIGHT_READY");
    expectFileNotToMatch("scripts/release/android/preflight.ts", /assembleDebug|assembleRelease|install",\s*"-r"|pm",\s*"install"|emu",\s*"kill"|Start-Process/);
  });
});
