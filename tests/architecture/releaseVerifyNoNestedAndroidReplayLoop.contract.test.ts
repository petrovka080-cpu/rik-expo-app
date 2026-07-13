import fs from "node:fs";
import path from "node:path";

function read(filePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
}

describe("release verify Android frozen APK topology", () => {
  it("uses the frozen APK verifier instead of nesting Android replay or build loops", () => {
    const verifier = read("scripts/release/android/verifyProof.ts");
    const timingRunner = read("scripts/release/runReleaseVerifyWithStepTiming.ts");
    const releaseGuard = read("scripts/release/releaseGuard.shared.ts");

    expect(releaseGuard).toContain("scripts/release/android/verifyProof.ts");
    expect(releaseGuard).not.toContain("runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding.ts --mode=verify");
    expect(timingRunner).toContain("REQUIRED_RELEASE_GATES");
    expect(timingRunner).not.toMatch(/spawn\([^)]*runAndroidApi34CanonicalReplayB2cExpandedEstimateBinding\.ts/s);
    expect(verifier).not.toMatch(/assembleRelease|adb install|buildProofApk|installProofApk|runAppRootSmoke/);
    expect(verifier).toContain("readAndroidJson");
    expect(verifier).toContain("writeAndroidJson");
  });
});
