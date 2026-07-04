import {
  runBlackboxAcceptance,
  validateBrowserEvidence,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";
import {
  SOURCE_GATE_ALL_TRUE,
  gitHead,
  passingBrowserEvidence,
  readRepoFile,
} from "./blackboxAcceptanceTestHelpers";

jest.setTimeout(240_000);

describe("blackbox browser evidence", () => {
  it("requires real web and Android Chrome evidence and rejects route/env substitutes", () => {
    const head = gitHead();
    const validWeb = passingBrowserEvidence("web");
    const validAndroid = passingBrowserEvidence("android");
    const routeEquivalentWeb = { ...validWeb, route_equivalent_smoke_passed: true };
    const fakeEnvWeb = { ...validWeb, browser_automation_started: false, actual_browser_smoke_passed: false };

    expect(validateBrowserEvidence(validWeb, "web", head).passed).toBe(true);
    expect(validateBrowserEvidence(validAndroid, "android", head).passed).toBe(true);
    expect(validateBrowserEvidence(routeEquivalentWeb, "web", head).passed).toBe(false);
    expect(validateBrowserEvidence(routeEquivalentWeb, "web", head).blockers).toContain(
      "web_route_equivalent_reported_as_browser",
    );

    const summary = runBlackboxAcceptance({
      requireBrowserEvidence: true,
      includeRenderedValidation: false,
      createHumanReviewPack: false,
      writeRuntime: false,
      webBrowserEvidence: fakeEnvWeb,
      androidBrowserEvidence: validAndroid,
      sourceGate: SOURCE_GATE_ALL_TRUE,
    });
    expect(summary.final_status).toBe("STOP_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_FAILED_NO_COMMIT");
    expect(summary.actual_web_browser_smoke_passed).toBe(false);
    expect(summary.blocking_reasons).toEqual(expect.arrayContaining([
      "web_browser_evidence_not_green",
      "web_browser_automation_not_started",
      "web_actual_browser_not_passed",
    ]));

    const webSmoke = readRepoFile("scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke.ts");
    expect(webSmoke).toContain("FORBIDDEN_BROWSER_GREEN_ENV_FLAGS");
    expect(webSmoke).toContain("ESTIMATE_FORCE_ANDROID_CHROME_PASSED");
    expect(webSmoke).toContain("ESTIMATE_ASSUME_ANDROID_CHROME_PASSED");
    expect(webSmoke).toContain("ESTIMATE_SKIP_BROWSER_PROOF");
    expect(webSmoke).toContain("route_equivalent_smoke_passed: false");
  });
});
