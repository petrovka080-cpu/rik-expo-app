import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 replay", () => {
  it("runs UI replay without build or install", () => {
    expectFileToContain("scripts/e2e/androidApi34Replay.ts", "--skip-install");
    expectFileNotToMatch("scripts/e2e/androidApi34Replay.ts", /assembleDebug|install",\s*"-r"|pm",\s*"install"|gradlew/);
  });
});
