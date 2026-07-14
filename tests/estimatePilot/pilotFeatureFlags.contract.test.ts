import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function json<T>(relativePath: string): T {
  return JSON.parse(source(relativePath)) as T;
}

describe("controlled pilot browser proof policy", () => {
  it("rejects env and route-equivalent browser proof", () => {
    const policy = json<any>("data/estimate-pilot/pilot-acceptance-policy.json");
    const web = source("scripts/e2e/runControlledPilotWebSmoke.ts");
    const android = source("scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts");

    expect(policy.acceptance.web_smoke_uses_real_browser).toBe(true);
    expect(policy.acceptance.android_smoke_uses_real_android_chrome).toBe(true);
    expect(policy.acceptance.route_equivalent_not_reported_as_real_browser).toBe(true);
    expect(policy.acceptance.env_does_not_mark_browser_passed).toBe(true);
    expect(policy.forbidden_env_flags).toEqual(expect.arrayContaining([
      "ESTIMATE_FORCE_ANDROID_CHROME_PASSED",
      "ESTIMATE_ASSUME_ANDROID_CHROME_PASSED",
      "ESTIMATE_SKIP_BROWSER_PROOF",
    ]));
    for (const script of [web, android]) {
      expect(script).toContain("route_equivalent_not_reported_as_real_browser");
      expect(script).toContain("route_equivalent_smoke_passed: false");
      expect(script).toContain("env_browser_green_rejected: true");
      expect(script).not.toContain("ESTIMATE_FORCE_ANDROID_CHROME_PASSED");
      expect(script).not.toContain("ESTIMATE_ASSUME_ANDROID_CHROME_PASSED");
      expect(script).not.toContain("ESTIMATE_SKIP_BROWSER_PROOF");
    }
  });
});
