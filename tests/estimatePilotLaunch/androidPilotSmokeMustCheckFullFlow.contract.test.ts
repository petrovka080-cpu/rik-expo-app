import fs from "node:fs";

describe("pilot launch Android smoke", () => {
  const wrapper = fs.readFileSync("scripts/e2e/runPilotLaunchReadinessAndroidSmoke.ts", "utf8");
  const controlled = fs.readFileSync("scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts", "utf8");

  it("requires emulator-backed Android Chrome and filters the pilot launch cases", () => {
    expect(wrapper).toContain("STOP_ANDROID_EMULATOR_NOT_AVAILABLE_FOR_PILOT_LAUNCH_NO_GREEN");
    expect(wrapper).toContain("runControlledPilotAndroidEmulatorSmoke");
    expect(wrapper).toContain("requireEmulator");
    expect(wrapper).toContain("android_chrome_flow_executed");
    expect(wrapper).toContain("android_pdf_snapshot_parity_failed");
    expect(wrapper).toContain("android_buyer_handoff_not_verified");
    expect(wrapper).toContain("telemetry_events_recorded");
    expect(wrapper).toContain("env_browser_green_rejected");
    expect(controlled).toContain("adb([\"devices\", \"-l\"])");
    expect(controlled).toContain("localabstract:chrome_devtools_remote");
    expect(controlled).toContain("com.android.chrome/com.google.android.apps.chrome.Main");
    expect(controlled).toContain("request-estimate-summary-card");
    expect(controlled).toContain("consumer-repair-open-pdf");
  });
});
