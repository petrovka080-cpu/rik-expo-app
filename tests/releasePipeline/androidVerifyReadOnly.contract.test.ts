import { expectFileNotToMatch, expectFileToContain } from "./releasePipelineContractUtils";

describe("Android API34 verify", () => {
  it("is read-only and fingerprint based", () => {
    expectFileToContain("scripts/e2e/androidApi34Verify.ts", "android_verify_read_only");
    expectFileToContain("scripts/e2e/androidApi34Verify.ts", "source_tree_hash");
    expectFileNotToMatch(
      "scripts/e2e/androidApi34Verify.ts",
      /node:child_process|execFileSync|spawnSync|adbPath|emulatorPath|gradlew|pm",\s*"install"|install",\s*"-r"|push",/,
    );
  });
});
