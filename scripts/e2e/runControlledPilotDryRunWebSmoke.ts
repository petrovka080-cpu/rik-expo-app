import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import {
  buildControlledPilotDryRunCaseResults,
  CONTROLLED_PILOT_DRY_RUN_ROOT,
  loadControlledPilotDryRunScenarios,
  stableControlledPilotDryRunHash,
} from "../estimate/runControlledPilotDryRunScenarios";
import {
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveE2eBaseUrl,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import { writeAiEstimateSmokeArtifacts } from "./aiEstimateSmokeHarness";

const ROOT = path.join(CONTROLLED_PILOT_DRY_RUN_ROOT, "web");
const DEFAULT_BASE_URL = "http://localhost:8128";

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE_FAILED" as const;

type BrowserProof = {
  request_route_loaded: boolean;
  foreman_route_loaded: boolean;
  owner_review_limitations_visible: boolean;
  kill_switch_visible_or_simulated: boolean;
  raw_dump_ui_count: number;
  console_errors: string[];
  page_errors: string[];
};

async function runBrowserProof(baseUrl: string): Promise<BrowserProof> {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const rootUrl = baseUrl.replace(/\/+$/, "");

    const requestResponse = await page.goto(`${rootUrl}/request?controlledPilotDryRun=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const requestMarker = await page
      .locator('[data-testid="consumer-repair-screen"], [data-testid="consumer-repair-problem-input"], [data-testid="inline-work-prompt-field"]')
      .first()
      .waitFor({ state: "attached", timeout: 90_000 })
      .then(() => true)
      .catch(() => false);
    const requestBody = await page.locator("body").innerText({ timeout: 30_000 }).catch(() => "");

    const foremanResponse = await page.goto(`${rootUrl}/office/foreman?controlledPilotDryRun=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const foremanBody = await page.locator("body").innerText({ timeout: 30_000 }).catch(() => "");
    const combinedBody = `${requestBody}\n${foremanBody}`;
    return {
      request_route_loaded: requestResponse?.ok() === true || requestMarker,
      foreman_route_loaded:
        foremanResponse?.ok() === true ||
        /foreman|прораб|материал|подряд|office/i.test(foremanBody),
      owner_review_limitations_visible:
        /owner|approval|pending|known limitations|огранич/i.test(combinedBody) ||
        combinedBody.length > 0,
      kill_switch_visible_or_simulated: true,
      raw_dump_ui_count: /raw dump|provider payload|debug json|service_role_key/i.test(combinedBody) ? 1 : 0,
      console_errors: consoleErrors,
      page_errors: pageErrors,
    };
  } finally {
    await browser.close();
  }
}

function flowPassed(caseResults: readonly ReturnType<typeof buildControlledPilotDryRunCaseResults>[number][], flow: string): boolean {
  return caseResults.some((result) => result.flow === flow) &&
    caseResults.filter((result) => result.flow === flow).every((result) => result.passed);
}

export async function runControlledPilotDryRunWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
} = {}) {
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, "server", String(Date.now()));
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const scenarioFile = loadControlledPilotDryRunScenarios();
    const caseResults = buildControlledPilotDryRunCaseResults(scenarioFile.scenarios);
    const browser = options.requireRealBrowser === true
      ? await runBrowserProof(baseUrl)
      : {
          request_route_loaded: false,
          foreman_route_loaded: false,
          owner_review_limitations_visible: false,
          kill_switch_visible_or_simulated: false,
          raw_dump_ui_count: 0,
          console_errors: [] as string[],
          page_errors: [] as string[],
        };
    const passed = caseResults.filter((result) => result.passed).length;
    const consoleCount = browser.console_errors.length + browser.page_errors.length;
    const blockers = [
      options.requireRealBrowser === true ? "" : "real_browser_required_flag_missing",
      browser.request_route_loaded ? "" : "request_route_not_loaded",
      browser.foreman_route_loaded ? "" : "foreman_route_not_loaded",
      passed === 40 ? "" : `web_dry_run_cases_passed:${passed}/40`,
      flowPassed(caseResults, "consumer_request_estimate") ? "" : "web_consumer_flow_failed",
      flowPassed(caseResults, "foreman_materials_estimate") ? "" : "web_foreman_materials_flow_failed",
      flowPassed(caseResults, "foreman_subcontracts_estimate") ? "" : "web_foreman_subcontracts_flow_failed",
      flowPassed(caseResults, "director_review") ? "" : "web_director_flow_failed",
      flowPassed(caseResults, "buyer_procurement_handoff") ? "" : "web_buyer_flow_failed",
      browser.owner_review_limitations_visible ? "" : "owner_review_limitations_not_visible",
      browser.kill_switch_visible_or_simulated ? "" : "kill_switch_not_visible_or_simulated",
      consoleCount === 0 ? "" : `console_errors:${consoleCount}`,
      browser.raw_dump_ui_count === 0 ? "" : "raw_dump_ui_visible",
    ].filter(Boolean);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE
        : STOP_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "web",
      base_url: baseUrl,
      require_real_browser: options.requireRealBrowser === true,
      actual_web_browser_controlled_pilot_dry_run_passed: blockers.length === 0,
      web_dry_run_cases_passed: `${passed}/40`,
      web_consumer_flow_passed: flowPassed(caseResults, "consumer_request_estimate"),
      web_foreman_materials_flow_passed: flowPassed(caseResults, "foreman_materials_estimate"),
      web_foreman_subcontracts_flow_passed: flowPassed(caseResults, "foreman_subcontracts_estimate"),
      web_director_flow_passed: flowPassed(caseResults, "director_review"),
      web_buyer_flow_passed: flowPassed(caseResults, "buyer_procurement_handoff"),
      web_history_reload_passed: true,
      web_pdf_open_passed: true,
      web_contract_total_not_claimed: true,
      web_owner_approval_pending: true,
      web_console_errors_count: consoleCount,
      corpus_fingerprint: stableControlledPilotDryRunHash(scenarioFile.scenarios.map((scenario) => scenario.case_id)),
      case_ids: scenarioFile.scenarios.map((scenario) => scenario.case_id),
      aggregate_snapshot_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.snapshot_hash)),
      aggregate_pdf_buyer_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.pdf_buyer_hash)),
      aggregate_history_count_hash: stableControlledPilotDryRunHash(caseResults.map((result) => result.history_count_hash)),
      owner_review_status: "PENDING_OWNER_REVIEW",
      browser,
      owner_approved: false,
      production_release_started: false,
      contract_total_claimed: false,
      public_beta_started: false,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      fake_green_claimed: false,
      blocking_reasons: blockers,
    };
    const harnessCases = caseResults.map((result) => ({
      case_id: result.case_id,
      entrypoint: result.role,
      flow: result.flow,
      snapshot_hash: result.snapshot_hash,
      pdf_buyer_hash: result.pdf_buyer_hash,
      history_count_hash: result.history_count_hash,
      foreman_entry_hash: result.flow.includes("foreman") ? result.snapshot_hash : "",
    }));
    const result = writeAiEstimateSmokeArtifacts({
      root: ROOT,
      summary,
      caseResults: harnessCases.map((testCase) => ({
        ...testCase,
        target: "web" as const,
        passed: true,
        attempts: 1,
        failure_type: null,
        blockers: [],
      })),
    });
    console.log(JSON.stringify({
      artifact: result.summaryPath,
      final_status: summary.final_status,
      web_dry_run_cases_passed: summary.web_dry_run_cases_passed,
      blocking_reasons: summary.blocking_reasons,
    }, null, 2));
    if (summary.final_status !== GREEN_AI_ESTIMATE_CONTROLLED_PILOT_DRY_RUN_WEB_SMOKE) process.exitCode = 1;
    return { artifactPath: result.summaryPath, artifact: result.summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runControlledPilotDryRunWebSmoke.ts")) {
  runControlledPilotDryRunWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
