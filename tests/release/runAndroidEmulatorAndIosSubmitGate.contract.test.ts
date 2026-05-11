import fs from "fs";
import path from "path";

describe("combined Android emulator and iOS submit release gate", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts"),
    "utf8",
  );

  it("keeps Android emulator smoke independent from AI role secrets", () => {
    expect(source).toContain("ensureAndroidEmulatorReady");
    expect(source).toContain("E2E_ALLOW_ANDROID_APK_BUILD");
    expect(source).toContain("preview");
    expect(source).toContain("resolveExplicitAiRoleAuthEnv");
    expect(source).toContain("BLOCKED_NO_E2E_ROLE_SECRETS");
  });

  it("runs iOS build before iOS submit and uses env approval gates", () => {
    expect(source).toContain("E2E_ALLOW_IOS_BUILD");
    expect(source).toContain("E2E_ALLOW_IOS_SUBMIT");
    expect(source.indexOf("E2E_ALLOW_IOS_BUILD")).toBeLessThan(source.indexOf("E2E_ALLOW_IOS_SUBMIT"));
    expect(source).toContain("production");
    expect(source).not.toContain("simulator: true");
  });

  it("does not contain forbidden release shortcuts", () => {
    expect(source).not.toContain("eas update --channel production");
    expect(source).not.toContain("listUsers");
    expect(source).not.toContain("auth.admin");
    expect(source).not.toContain("eas submit --platform android");
    expect(source).toContain("service_role_used: false");
  });
});
