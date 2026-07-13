import { readFileSync } from "node:fs";

describe("role based UAT Android smoke", () => {
  const source = readFileSync("scripts/e2e/runRoleBasedUatAndroidEmulatorSmoke.ts", "utf8");

  it("requires adb, Android Chrome CDP and full flow checks", () => {
    expect(source).toContain("STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_ROLE_BASED_UAT_NO_GREEN");
    expect(source).toContain("adb([\"devices\", \"-l\"])");
    expect(source).toContain("localabstract:chrome_devtools_remote");
    expect(source).toContain("com.android.chrome/com.google.android.apps.chrome.Main");
    expect(source).toContain("request-estimate-summary-card");
    expect(source).toContain("request-estimate-details-panel");
    expect(source).toContain("consumer-repair-approve");
    expect(source).toContain("consumer-repair-open-pdf");
    expect(source).toContain("android_uat_role_views_not_verified");
    expect(source).toContain("env_browser_green_rejected");
  });
});
