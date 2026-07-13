import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 verify", () => {
  it("is read-only and fingerprint based", () => {
    expectFileToContain("scripts/release/android/verifyProof.ts", "GREEN_ANDROID_API34_PIPELINE_READY");
    expectFileToContain("scripts/release/android/verifyProof.ts", "candidateHash");
    expectFileNotToMatch(
      "scripts/release/android/verifyProof.ts",
      /node:child_process|execFileSync|spawnSync|adbPath|emulatorPath|gradlew|pm",\s*"install"|install",\s*"-r"|push",/,
    );
  });
});
