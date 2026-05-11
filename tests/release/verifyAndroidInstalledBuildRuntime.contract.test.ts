import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("verifyAndroidInstalledBuildRuntime", () => {
  const source = read("scripts/release/verifyAndroidInstalledBuildRuntime.ts");

  it("verifies an installed APK on emulator without Android Play submit or physical device dependency", () => {
    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain('"pm", "path"');
    expect(source).toContain('"monkey"');
    expect(source).toContain("physical_device_required: false");
    expect(source).toContain("google_play_submit: false");
    expect(source).not.toContain("submit --platform android");
    expect(source).not.toContain('"--platform", "android", "submit"');
  });

  it("records real Core 01 build proof and does not claim fake runtime green", () => {
    expect(source).toContain("S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT");
    expect(source).toContain("coreAndroidPath");
    expect(source).toContain("BLOCKED_RELEASE_CORE_01_ARTIFACTS_MISSING");
    expect(source).toContain("BLOCKED_RELEASE_CORE_01_PENDING_ARTIFACTS");
    expect(source).toContain("fake_emulator_pass: false");
    expect(source).not.toMatch(/fake_emulator_pass:\s*true/);
  });
});
