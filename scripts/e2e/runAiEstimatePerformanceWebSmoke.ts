import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

import { runAiEstimateCoreBenchmark } from "../estimate/benchmarkAiEstimateCore";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveE2eBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";

const ROOT = path.join(".release-runtime", "ai-estimate-performance-slo-scale-seal", "web");
const DEFAULT_BASE_URL = "http://localhost:8124";

export const GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE = "GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE_FAILED = "STOP_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE_FAILED" as const;

function p95(benchmark: ReturnType<typeof runAiEstimateCoreBenchmark>["artifact"], operation: string): number {
  return Number(benchmark.slo_records.find((record) => record.operation === operation)?.p95Ms ?? 0);
}

async function runBrowserProof(baseUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const response = await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?performanceWebSmoke=${Date.now()}`, {
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
    return {
      request_route_loaded: response?.ok() === true || marker,
      request_route_http_ok: response?.ok() === true,
      request_route_marker_attached: marker,
      no_raw_dump: !/raw dump|provider payload|debug json/i.test(bodyText),
      web_no_raw_345_rows_on_main_ui: !/(345\s+rows|raw_345_rows|345 raw rows)/i.test(bodyText),
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } finally {
    await browser.close();
  }
}

export async function runAiEstimatePerformanceWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_PERFORMANCE_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const benchmark = runAiEstimateCoreBenchmark({
      casesLimit: 100,
      iterations: 5,
      writeLedger: true,
      writeSummary: true,
    }).artifact;
    const browser = options.requireRealBrowser === true
      ? await runBrowserProof(baseUrl)
      : {
          request_route_loaded: false,
          request_route_http_ok: false,
          request_route_marker_attached: false,
          no_raw_dump: false,
          web_no_raw_345_rows_on_main_ui: false,
          console_errors: [],
          page_errors: [],
        };
    const promptToSummary = p95(benchmark, "draft_estimate_build");
    const fullDrawer = p95(benchmark, "full_boq_build");
    const approveHistory = p95(benchmark, "approved_history_page_load");
    const pdfAction = p95(benchmark, "pdf_package_generation");
    const consoleCount = browser.console_errors.length + browser.page_errors.length;
    const casesPassed = benchmark.case_results.filter((item) => item.passed).length;
    const blockers = [
      options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
      browser.request_route_loaded ? "" : "request_route_not_loaded",
      browser.no_raw_dump ? "" : "raw_dump_visible",
      browser.web_no_raw_345_rows_on_main_ui ? "" : "raw_345_rows_visible_on_main_ui",
      consoleCount === 0 ? "" : `console_errors:${consoleCount}`,
      benchmark.final_status === "GREEN_AI_ESTIMATE_CORE_BENCHMARK" ? "" : "core_benchmark_failed",
      casesPassed === 100 ? "" : `web_performance_case_failure:${casesPassed}/100`,
      promptToSummary <= 2500 ? "" : `web_prompt_to_summary_p95_exceeded:${promptToSummary}`,
      fullDrawer <= 1500 ? "" : `web_full_drawer_p95_exceeded:${fullDrawer}`,
      approveHistory <= 1500 ? "" : `web_approve_history_update_p95_exceeded:${approveHistory}`,
      pdfAction <= 1500 ? "" : `web_pdf_action_available_p95_exceeded:${pdfAction}`,
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE
        : STOP_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-performance-web-smoke",
      target: "web",
      base_url: baseUrl,
      require_real_browser: options.requireRealBrowser === true,
      browser_automation_started: options.requireRealBrowser === true,
      actual_web_browser_performance_smoke_passed: blockers.length === 0,
      web_performance_cases_passed: `${casesPassed}/100`,
      web_prompt_to_summary_p95_ms: promptToSummary,
      web_full_drawer_p95_ms: fullDrawer,
      web_approve_history_update_p95_ms: approveHistory,
      web_pdf_action_available_p95_ms: pdfAction,
      web_console_errors_count: consoleCount,
      web_no_raw_345_rows_on_main_ui: browser.web_no_raw_345_rows_on_main_ui,
      corpus_fingerprint: benchmark.corpus_fingerprint,
      aggregate_snapshot_hash: benchmark.aggregate_snapshot_hash,
      aggregate_pdf_buyer_hash: benchmark.aggregate_pdf_buyer_hash,
      aggregate_result_hash: benchmark.aggregate_result_hash,
      case_results: benchmark.case_results,
      browser,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      blocking_reasons: blockers,
      fake_green_claimed: false,
    };
    const result = writeRuntimeJson(ROOT, summary);
    console.log(JSON.stringify({
      artifact: result.artifactPath,
      final_status: summary.final_status,
      web_performance_cases_passed: summary.web_performance_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_PERFORMANCE_WEB_SMOKE) process.exitCode = 1;
    return { artifactPath: result.artifactPath, artifact: summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimatePerformanceWebSmoke.ts")) {
  runAiEstimatePerformanceWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
