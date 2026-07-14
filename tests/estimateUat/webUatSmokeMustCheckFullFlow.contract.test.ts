import { readFileSync } from "node:fs";

describe("role based UAT web smoke", () => {
  const source = readFileSync("scripts/e2e/runRoleBasedUatWebSmoke.ts", "utf8");

  it("requires a real browser and checks the full product and role flow", () => {
    expect(source).toContain("chromium.launch");
    expect(source).toContain("consumer-repair-problem-input");
    expect(source).toContain("request-estimate-summary-card");
    expect(source).toContain("request-estimate-details-panel");
    expect(source).toContain("consumer-repair-approve");
    expect(source).toContain("consumer-repair-open-pdf");
    expect(source).toContain("role_views_verified");
    expect(source).toContain("feedback_created");
    expect(source).toContain("support_package_exported");
    expect(source).toContain("route_marker_only_smoke_rejected");
    expect(source).toContain("env_browser_green_rejected");
  });
});
