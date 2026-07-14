import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS,
  type BlackboxBrowserEvidence,
  runBlackboxAcceptance,
} from "../../scripts/e2e/runEstimateBlackboxAcceptanceWebSmoke";

export const PROJECT_ROOT = path.resolve(__dirname, "../..");

export const SOURCE_GATE_ALL_TRUE = {
  focused_jest_passed: true,
  typecheck_passed: true,
  lint_passed: true,
  diff_check_passed: true,
  no_test_weakening_passed: true,
  web_public_smoke_passed: true,
  ci_office_market_passed: true,
  secret_scan_passed: true,
} as const;

export function gitHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

export function passingBrowserEvidence(kind: "web" | "android"): BlackboxBrowserEvidence {
  return {
    artifact_path: `.release-runtime/ai-estimate-10000-blackbox-acceptance/${kind}/test-summary.json`,
    final_status: kind === "web"
      ? "GREEN_AI_ESTIMATE_10000_BLACK_BOX_WEB_BROWSER_ACCEPTANCE_NO_BUILDS"
      : "GREEN_AI_ESTIMATE_10000_BLACK_BOX_ANDROID_CHROME_ACCEPTANCE_NO_BUILDS",
    source_sha: gitHead(),
    browser_automation_started: true,
    actual_browser_smoke_passed: true,
    route_equivalent_smoke_passed: false,
    browser_evidence_written: true,
    console_error_count: 0,
    fake_green_claimed: false,
    blockers: [],
  };
}

export function buildFastAcceptanceSummary() {
  return runBlackboxAcceptance({
    requireBrowserEvidence: false,
    includeRenderedValidation: false,
    createHumanReviewPack: false,
    writeRuntime: false,
    sourceGate: SOURCE_GATE_ALL_TRUE,
  });
}

export function expectFastAcceptanceGreen(): ReturnType<typeof buildFastAcceptanceSummary> {
  const summary = buildFastAcceptanceSummary();
  expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_BLACK_BOX_ACCEPTANCE_VERIFIED_COMMITTED_NO_BUILDS);
  expect(summary.blocking_reasons).toEqual([]);
  return summary;
}
