import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("professional AI estimate smoke runner flags", () => {
  it("parses cases and target from CLI with env fallback only as launch configuration", () => {
    const source = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");

    expect(source).toContain('argValue("cases") ?? envString("ESTIMATE_SMOKE_CASES")');
    expect(source).toContain('argValue("target") ?? envString("ESTIMATE_SMOKE_TARGET")');
    expect(source).toContain('"wave2a"');
    expect(source).toContain('"functional-reality"');
    expect(source).toContain('"diamond-drilling"');
    expect(source).toContain('"profile-fence"');
    expect(source).toContain('"mansard-roof"');
    expect(source).toContain('"apartment54"');
    expect(source).toContain('"android-chrome"');
    expect(source).toContain("ESTIMATE_SMOKE_REQUIRE_REAL_BROWSER");
    expect(source).toContain("ESTIMATE_SMOKE_ALLOW_ROUTE_EQUIVALENT");
  });

  it("does not allow env flags to mark real browser automation as passed", () => {
    const source = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");

    expect(source).toContain("const actualAndroidChromeBrowserSmokePassed = androidChromeSummary.actualBrowserSmokePassed");
    expect(source).toContain("const actualWebBrowserSmokePassed = webSummary.actualBrowserSmokePassed");
    expect(source).toContain("PROFESSIONAL_ESTIMATE_WEB_SMOKE_ARTIFACT");
    expect(source).toContain("env_does_not_mark_browser_passed: true");
    expect(source).toContain("actual_android_chrome_browser_smoke_passed");
    expect(source).not.toContain("greenArtifactFlag");
    expect(source).not.toMatch(
      /actualAndroidChromeBrowserSmokePassed\s*=\s*envFlag\("PROFESSIONAL_AI_ESTIMATE_ANDROID_CHROME_SMOKE_PASSED"\)/,
    );
  });

  it("separates route-equivalent proof from required real browser proof", () => {
    const source = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");

    expect(source).toContain("route_equivalent_smoke_passed");
    expect(source).toContain("headless_route_equivalent_not_reported_as_browser");
    expect(source).toContain("ROUTE_EQUIVALENT_CANNOT_SATISFY_REQUIRE_REAL_BROWSER");
    expect(source).toContain("STOP_ANDROID_CHROME_BROWSER_NOT_AVAILABLE");
    expect(source).toContain("browser_evidence_written");
    expect(source).toContain("browser_automation_started_matches_reality");
    expect(source).toContain("WEB_SUMMARY_SOURCE_SHA_MISMATCH");
    expect(source).toContain("WEB_SUMMARY_FINAL_STATUS_NOT_CANONICAL");
  });

  it("rejects forbidden fake browser green env names", () => {
    const source = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");

    expect(source).toContain("ESTIMATE_FORCE_ANDROID_CHROME_PASSED");
    expect(source).toContain("ESTIMATE_ASSUME_ANDROID_CHROME_PASSED");
    expect(source).toContain("ESTIMATE_SKIP_BROWSER_PROOF");
    expect(source).toContain("ESTIMATE_FAKE_BROWSER_GREEN");
    expect(source).toContain("ESTIMATE_ACCEPT_ROUTE_AS_BROWSER");
    expect(source).toContain("FORBIDDEN_BROWSER_GREEN_ENV_FLAG_SET");
  });

  it("supports explicit no-marketplace scope without treating marketplace as passed", () => {
    const source = read("scripts/e2e/runProfessionalAiEstimateSmoke.ts");

    expect(source).toContain("PROFESSIONAL_AI_ESTIMATE_NO_MARKETPLACE_SCOPE");
    expect(source).toContain("no_marketplace_scope");
    expect(source).toContain("marketplace_touched: false");
  });
});
