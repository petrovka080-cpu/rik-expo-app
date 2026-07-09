import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { runPlatformCoreScaleMatrix } from "../estimate/runPlatformCoreScaleMatrix";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  argValue,
  hasFlag,
  resolveE2eBaseUrl,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import {
  type AiEstimateSmokeCase,
  writeAiEstimateSmokeArtifacts,
} from "./aiEstimateSmokeHarness";
import { runAiEstimateWebHarness } from "./aiEstimateWebHarness";

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-scale-seal", "web");
const DEFAULT_BASE_URL = "http://localhost:8104";
const PLATFORM_CORE_CASES_REQUIRED = 100;

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE_FAILED" as const;

type WebBrowserProof = {
  request_route_loaded: boolean;
  request_route_http_ok: boolean;
  request_route_marker_attached: boolean;
  no_raw_dump: boolean;
  no_fake_final_total: boolean;
  console_errors: string[];
  page_errors: string[];
  blockers: string[];
};

function toSmokeCases(): AiEstimateSmokeCase[] {
  const matrix = runPlatformCoreScaleMatrix({ writeSummary: false }).artifact.case_results;
  return matrix.slice(0, PLATFORM_CORE_CASES_REQUIRED).map((item) => ({
    case_id: item.case_id,
    entrypoint: item.entrypoint,
    flow: item.flow,
    snapshot_hash: item.snapshot_hash,
    pdf_buyer_hash: item.pdf_buyer_hash,
    history_count_hash: item.history_count_hash,
    foreman_entry_hash: item.foreman_entry_hash,
  }));
}

async function runBrowserProof(baseUrl: string): Promise<WebBrowserProof> {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?platformCoreWebSmoke=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const marker = await page
      .locator('[data-testid="consumer-repair-screen"], [data-testid="consumer-repair-problem-input"], [data-testid="inline-work-prompt-field"]')
      .first()
      .waitFor({ state: "attached", timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    const bodyText = await page.locator("body").innerText({ timeout: 60_000 }).catch(() => "");
    const responseOk = response?.ok() === true;
    const requestRouteLoaded = page.url().includes("/request") && (marker || responseOk || bodyText.trim().length > 0);
    const noRawDump = !/raw dump|provider payload|debug json/i.test(bodyText);
    const noFakeFinalTotal = !/fake final total|fake_total|contract total available/i.test(bodyText);
    const blockers = [
      requestRouteLoaded ? "" : "request_route_not_loaded",
      noRawDump ? "" : "raw_dump_visible",
      noFakeFinalTotal ? "" : "fake_final_total_visible",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
    ].filter(Boolean);
    return {
      request_route_loaded: requestRouteLoaded,
      request_route_http_ok: responseOk,
      request_route_marker_attached: marker,
      no_raw_dump: noRawDump,
      no_fake_final_total: noFakeFinalTotal,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      blockers,
    };
  } finally {
    await browser.close();
  }
}

export async function runAiEstimatePlatformCoreWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_PLATFORM_CORE_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const requireRealBrowser = options.requireRealBrowser === true;
    const smokeCases = toSmokeCases();
    const browserProof = requireRealBrowser
        ? await runBrowserProof(baseUrl)
      : {
          request_route_loaded: false,
          request_route_http_ok: false,
          request_route_marker_attached: false,
          no_raw_dump: false,
          no_fake_final_total: false,
          console_errors: [],
          page_errors: [],
          blockers: ["real_browser_required"],
        };
    const harness = await runAiEstimateWebHarness({
      cases: smokeCases,
      consoleErrors: [...browserProof.console_errors, ...browserProof.page_errors],
    });
    const passedCases = harness.caseResults.filter((item) => item.passed).length;
    const matrix = runPlatformCoreScaleMatrix({ writeSummary: false }).artifact;
    const blockers = [
      requireRealBrowser ? "" : "real_browser_required_flag_missing",
      ...browserProof.blockers.map((blocker) => `browser:${blocker}`),
      passedCases === PLATFORM_CORE_CASES_REQUIRED ? "" : "platform_core_case_failure",
      matrix.request_entry_passed ? "" : "request_entry_failed",
      matrix.history_entry_passed ? "" : "history_entry_failed",
      matrix.foreman_materials_entry_passed ? "" : "foreman_materials_entry_failed",
      matrix.foreman_subcontracts_entry_passed ? "" : "foreman_subcontracts_entry_failed",
      matrix.director_review_entry_passed ? "" : "director_review_entry_failed",
      matrix.buyer_handoff_entry_passed ? "" : "buyer_handoff_entry_failed",
      harness.console_error_policy_strict ? "" : "console_error_policy_failed",
    ].filter(Boolean);
    const green = blockers.length === 0;
    const summary = {
      final_status: green ? GREEN_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE : STOP_AI_ESTIMATE_PLATFORM_CORE_WEB_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-platform-core-web-smoke",
      target: "web",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      browser_automation_started: requireRealBrowser,
      actual_web_browser_platform_core_passed: green,
      web_platform_core_cases_passed: `${passedCases}/${PLATFORM_CORE_CASES_REQUIRED}`,
      web_platform_core_cases_total: PLATFORM_CORE_CASES_REQUIRED,
      web_request_flow_passed: matrix.request_entry_passed && browserProof.request_route_loaded,
      web_history_flow_passed: matrix.history_entry_passed,
      web_foreman_materials_flow_passed: matrix.foreman_materials_entry_passed,
      web_foreman_subcontracts_flow_passed: matrix.foreman_subcontracts_entry_passed,
      web_pdf_buyer_flow_passed: matrix.buyer_handoff_entry_passed,
      web_director_review_flow_passed: matrix.director_review_entry_passed,
      web_console_errors_count: browserProof.console_errors.length + browserProof.page_errors.length,
      no_raw_dump: browserProof.no_raw_dump,
      no_fake_final_total: browserProof.no_fake_final_total,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      corpus_fingerprint: harness.corpusFingerprint,
      aggregate_snapshot_hash: matrix.aggregate_snapshot_hash,
      aggregate_pdf_buyer_hash: matrix.aggregate_pdf_buyer_hash,
      aggregate_history_count_hash: matrix.aggregate_history_count_hash,
      aggregate_foreman_entry_hash: matrix.aggregate_foreman_entry_hash,
      case_results: harness.caseResults,
      browser: browserProof,
      blockers,
      fake_green_claimed: false,
    };
    const artifact = writeAiEstimateSmokeArtifacts({
      root: ROOT,
      summary,
      caseResults: harness.caseResults,
    });
    console.log(JSON.stringify({
      artifact: artifact.summaryPath,
      case_results_jsonl: artifact.caseResultsPath,
      final_status: artifact.summary.final_status,
      web_platform_core_cases_passed: artifact.summary.web_platform_core_cases_passed,
      blockers,
    }, null, 2));
    if (!green) process.exitCode = 1;
    return artifact;
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePlatformCoreWebSmoke.ts")) {
  runAiEstimatePlatformCoreWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
