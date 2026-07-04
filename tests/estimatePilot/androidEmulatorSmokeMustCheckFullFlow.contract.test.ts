import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("controlled pilot Android emulator smoke", () => {
  it("requires adb, Android Chrome CDP, and the full browser flow", () => {
    const android = source("scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts");
    expect(android).toContain("STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN");
    expect(android).toContain("adb([\"devices\", \"-l\"])");
    expect(android).toContain("localabstract:chrome_devtools_remote");
    expect(android).toContain("com.android.chrome/com.google.android.apps.chrome.Main");
    expect(android).toContain("Runtime.evaluate");
    expect(android).toContain("consumer-repair-problem-input");
    expect(android).toContain("consumer-repair-prepare-draft");
    expect(android).toContain("request-estimate-summary-card");
    expect(android).toContain("request-estimate-details-panel");
    expect(android).toContain("consumer-repair-approve");
    expect(android).toContain("consumer-repair-open-pdf");
    expect(android).toContain("android_flow_checks_pdf_from_snapshot: true");
    expect(android).toContain("android_flow_checks_buyer_handoff: true");
    expect(android).toContain("route_equivalent_smoke_passed: false");
    expect(android).toContain("env_browser_green_rejected: true");
  });
});
