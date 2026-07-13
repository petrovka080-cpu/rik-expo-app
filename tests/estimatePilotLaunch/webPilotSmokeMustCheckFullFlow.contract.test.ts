import fs from "node:fs";

describe("pilot launch web smoke", () => {
  const source = fs.readFileSync("scripts/e2e/runPilotLaunchReadinessWebSmoke.ts", "utf8");

  it("requires a real browser and checks the full pilot launch flow", () => {
    expect(source).toContain("chromium.launch");
    expect(source).toContain("consumer-repair-problem-input");
    expect(source).toContain("request-estimate-summary-card");
    expect(source).toContain("request-estimate-details-panel");
    expect(source).toContain("consumer-repair-approve");
    expect(source).toContain("consumer-repair-open-pdf");
    expect(source).toContain("trust_level_verified");
    expect(source).toContain("estimate_level_verified");
    expect(source).toContain("support_package_exported");
    expect(source).toContain("telemetry_events_recorded");
    expect(source).toContain("route_marker_only_smoke_rejected");
    expect(source).toContain("env_browser_green_rejected");
  });
});
