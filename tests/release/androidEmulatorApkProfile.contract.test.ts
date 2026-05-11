import fs from "fs";
import path from "path";

describe("Android emulator APK profile", () => {
  it("uses an installable APK and never direct-installs an AAB", () => {
    const eas = JSON.parse(fs.readFileSync(path.join(process.cwd(), "eas.json"), "utf8"));
    const runner = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts"),
      "utf8",
    );

    expect(eas.build.preview.android.buildType).toBe("apk");
    expect(runner).toContain("adb");
    expect(runner).toContain("install");
    expect(runner).not.toContain("eas submit --platform android");
    expect(runner).not.toContain("app-bundle direct install");
  });
});
