import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { runReplayableEstimateCoreAudit } from "../estimate/auditReplayableEstimateCore";
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

const ROOT = path.join(".release-runtime", "ai-estimate-replayable-core", "web");
const DEFAULT_BASE_URL = "http://localhost:8114";

export const GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE = "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE_FAILED = "STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE_FAILED" as const;

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
    const response = await page.goto(`${baseUrl.replace(/\/+$/, "")}/request?replayableCoreWebSmoke=${Date.now()}`, {
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
    const noRawDump = !/raw dump|provider payload|debug json/i.test(bodyText);
    const noFakeGreen = !/fake green|fake_green|route equivalent/i.test(bodyText);
    const blockers = [
      response?.ok() === true || marker ? "" : "request_route_not_loaded",
      noRawDump ? "" : "raw_dump_visible",
      noFakeGreen ? "" : "fake_green_marker_visible",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
    ].filter(Boolean);
    return {
      request_route_loaded: response?.ok() === true || marker,
      request_route_http_ok: response?.ok() === true,
      request_route_marker_attached: marker,
      no_raw_dump: noRawDump,
      no_fake_green: noFakeGreen,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      blockers,
    };
  } finally {
    await browser.close();
  }
}

export async function runReplayableCoreWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_REPLAYABLE_CORE_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const audit = runReplayableEstimateCoreAudit({ writeLedger: true }).artifact;
    const browser = options.requireRealBrowser === true
      ? await runBrowserProof(baseUrl)
      : {
          request_route_loaded: false,
          request_route_http_ok: false,
          request_route_marker_attached: false,
          no_raw_dump: false,
          no_fake_green: false,
          console_errors: [],
          page_errors: [],
          blockers: ["real_browser_required"],
        };
    const blockers = [
      options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
      ...browser.blockers.map((blocker) => `browser:${blocker}`),
      audit.final_status === "GREEN_AI_ESTIMATE_REPLAYABLE_CORE_AUDIT" ? "" : "replay_core_audit_failed",
      audit.replay_cases_passed === audit.replay_cases_total ? "" : "web_replay_case_failure",
      Number(audit.silent_drift_count) === 0 ? "" : "silent_drift_detected",
    ].filter(Boolean);
    const green = blockers.length === 0;
    const summary = {
      final_status: green
        ? GREEN_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE
        : STOP_AI_ESTIMATE_REPLAYABLE_CORE_WEB_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      summary_generated_by: "ai-estimate-replayable-core-web-smoke",
      target: "web",
      base_url: baseUrl,
      require_real_browser: options.requireRealBrowser === true,
      browser_automation_started: options.requireRealBrowser === true,
      actual_web_browser_replay_guard_passed: green,
      web_replay_cases_passed: audit.replay_cases_passed_label,
      web_replay_cases_total: audit.replay_cases_total,
      replay_core_contract_created: audit.replay_core_contract_created,
      all_hashes_match: audit.all_hashes_match,
      silent_drift_count: audit.silent_drift_count,
      silent_drift_rejected: audit.silent_drift_rejected,
      corpus_fingerprint: audit.corpus_fingerprint,
      aggregate_boq_hash: audit.aggregate_boq_hash,
      aggregate_material_quantity_hash: audit.aggregate_material_quantity_hash,
      aggregate_costing_hash: audit.aggregate_costing_hash,
      aggregate_pdf_package_hash: audit.aggregate_pdf_package_hash,
      aggregate_buyer_handoff_hash: audit.aggregate_buyer_handoff_hash,
      case_results: audit.case_results,
      browser,
      web_console_errors_count: browser.console_errors.length + browser.page_errors.length,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      env_browser_green_rejected: true,
      blockers,
      fake_green_claimed: false,
    };
    const result = writeRuntimeJson(ROOT, summary);
    console.log(JSON.stringify({
      artifact: result.artifactPath,
      final_status: summary.final_status,
      web_replay_cases_passed: summary.web_replay_cases_passed,
      blockers,
    }, null, 2));
    if (!green) process.exitCode = 1;
    return { artifactPath: result.artifactPath, artifact: summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runReplayableCoreWebSmoke.ts")) {
  runReplayableCoreWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
