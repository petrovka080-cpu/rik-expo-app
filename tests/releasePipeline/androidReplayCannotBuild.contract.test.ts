import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 pipeline smoke", () => {
  it("checks app root without build, install, or business replay", () => {
    expectFileToContain("scripts/release/android/runAppRootSmoke.ts", "BUILD_IDENTITY");
    expectFileNotToMatch("scripts/release/android/runAppRootSmoke.ts", /assembleDebug|assembleRelease|install",\s*"-r"|pm",\s*"install"|gradlew|runAndroidApi34CanonicalReplay|B2C|business route/i);
  });
});
