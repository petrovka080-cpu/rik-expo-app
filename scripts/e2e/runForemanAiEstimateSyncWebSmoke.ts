import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  argValue,
  hasFlag,
  resolveE2eBaseUrl,
  timestampForPath,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import { runForemanAiEstimateSyncDomainProof } from "../estimate/foremanAiEstimateSyncProof";

const ROOT = path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync", "web");
const DEFAULT_BASE_URL = "http://localhost:8102";
const LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY = "rik.office.localDeveloperFullAccess";

export const GREEN_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE =
  "GREEN_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE" as const;
export const STOP_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE_FAILED =
  "STOP_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE_FAILED" as const;

type BrowserProof = {
  materials_main_button_visible: boolean;
  materials_estimate_button_visible: boolean;
  materials_composer_opened: boolean;
  materials_mode_marker_visible: boolean;
  subcontracts_main_button_visible: boolean;
  subcontracts_estimate_button_visible: boolean;
  subcontracts_composer_opened: boolean;
  subcontracts_mode_marker_visible: boolean;
  director_route_visible: boolean;
  buyer_route_visible: boolean;
  console_errors: string[];
  page_errors: string[];
  blockers: string[];
};

async function waitVisible(page: Page, testId: string, timeout = 60_000): Promise<boolean> {
  try {
    await page.getByTestId(testId).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function waitAttached(page: Page, testId: string, timeout = 60_000): Promise<boolean> {
  try {
    await page.getByTestId(testId).first().waitFor({ state: "attached", timeout });
    return true;
  } catch {
    return false;
  }
}

async function clickTestId(page: Page, testId: string): Promise<void> {
  const locator = page.getByTestId(testId).first();
  await locator.waitFor({ state: "visible", timeout: 60_000 });
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.click({ timeout: 30_000 });
}

async function completeForemanFioIfVisible(page: Page): Promise<boolean> {
  const input = page.getByTestId("warehouse-fio-input").first();
  const visible = await input.isVisible({ timeout: 5_000 }).catch(() => false);
  if (!visible) return false;
  await input.fill("Foreman Smoke Tester");
  await clickTestId(page, "warehouse-fio-confirm");
  await input.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);
  return true;
}

async function chooseFirstForemanDropdownOption(page: Page, fieldKey: string): Promise<boolean> {
  const option = page.locator(`[data-testid^="foreman-dropdown-option-${fieldKey}-"]`).first();
  const alreadyOpen = await option.isVisible({ timeout: 2_000 }).catch(() => false);
  if (!alreadyOpen) return false;
  await option.scrollIntoViewIfNeeded().catch(() => undefined);
  await option.click({ timeout: 30_000 });
  await option.waitFor({ state: "hidden", timeout: 30_000 }).catch(() => undefined);
  return true;
}

async function chooseOpenForemanHeaderDropdownOption(page: Page): Promise<boolean> {
  return await chooseFirstForemanDropdownOption(page, "foreman-object")
    || await chooseFirstForemanDropdownOption(page, "foreman-locator");
}

async function openForemanMaterialsEstimateComposer(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const fioCompleted = await completeForemanFioIfVisible(page);
    const dropdownSelectedBeforeClick = await chooseOpenForemanHeaderDropdownOption(page);
    if (await waitVisible(page, "professional-estimate-composer", 1_000)) return true;
    if (fioCompleted || dropdownSelectedBeforeClick) continue;
    if (await waitVisible(page, "foreman-materials-estimate-open", 10_000)) {
      await clickTestId(page, "foreman-materials-estimate-open");
    }
    const fioCompletedAfterClick = await completeForemanFioIfVisible(page);
    const dropdownSelectedAfterClick = await chooseOpenForemanHeaderDropdownOption(page);
    if (fioCompletedAfterClick || dropdownSelectedAfterClick) continue;
    if (await waitVisible(page, "professional-estimate-composer", 2_000)) return true;
  }
  return waitVisible(page, "professional-estimate-composer", 5_000);
}

async function openForemanWithDevAccess(page: Page, baseUrl: string): Promise<void> {
  const route = `${baseUrl.replace(/\/+$/, "")}/office/foreman?foremanAiEstimateSyncSmoke=${Date.now()}`;
  await page.addInitScript((key) => window.localStorage.setItem(key as string, "1"), LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
  await page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate((key) => window.localStorage.setItem(key as string, "1"), LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
}

async function runBrowserProof(baseUrl: string): Promise<BrowserProof> {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const blockers: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await openForemanWithDevAccess(page, baseUrl);
    const materialsMain = await waitVisible(page, "foreman-main-materials-open");
    if (materialsMain) await clickTestId(page, "foreman-main-materials-open");
    const materialsButton = await waitVisible(page, "foreman-materials-estimate-open");
    const materialsComposer = materialsButton ? await openForemanMaterialsEstimateComposer(page) : false;
    const materialsMode = await waitAttached(page, "foreman-ai-estimate-mode-materials_procurement_focus", 10_000);

    await openForemanWithDevAccess(page, baseUrl);
    const subcontractsMain = await waitVisible(page, "foreman-main-subcontracts-open");
    if (subcontractsMain) await clickTestId(page, "foreman-main-subcontracts-open");
    if (subcontractsMain) await completeForemanFioIfVisible(page);
    const subcontractsButton = await waitVisible(page, "foreman-subcontracts-estimate-open");
    if (subcontractsButton) await clickTestId(page, "foreman-subcontracts-estimate-open");
    const subcontractsComposer = await waitVisible(page, "professional-estimate-composer");
    const subcontractsMode = await waitAttached(page, "foreman-ai-estimate-mode-subcontract_work_package_focus", 10_000);

    await page.goto(`${baseUrl.replace(/\/+$/, "")}/office/director`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const directorRoute = await waitVisible(page, "office-role-auth-context-director", 30_000)
      || await waitVisible(page, "director-top-tab-requests", 30_000);
    await page.goto(`${baseUrl.replace(/\/+$/, "")}/office/buyer`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const buyerRoute = await waitAttached(page, "office-role-auth-context-buyer", 60_000)
      || await waitVisible(page, "buyer-tab-inbox", 60_000);

    const proof: BrowserProof = {
      materials_main_button_visible: materialsMain,
      materials_estimate_button_visible: materialsButton,
      materials_composer_opened: materialsComposer,
      materials_mode_marker_visible: materialsMode,
      subcontracts_main_button_visible: subcontractsMain,
      subcontracts_estimate_button_visible: subcontractsButton,
      subcontracts_composer_opened: subcontractsComposer,
      subcontracts_mode_marker_visible: subcontractsMode,
      director_route_visible: directorRoute,
      buyer_route_visible: buyerRoute,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      blockers,
    };
    for (const [key, value] of Object.entries(proof)) {
      if (typeof value === "boolean" && !value) blockers.push(key);
    }
    if (consoleErrors.length > 0) blockers.push(`console_errors:${consoleErrors.length}`);
    if (pageErrors.length > 0) blockers.push(`page_errors:${pageErrors.length}`);
    return { ...proof, blockers };
  } finally {
    await browser.close();
  }
}

async function main() {
  const target = argValue("target") ?? "web";
  if (target !== "web") throw new Error(`UNSUPPORTED_TARGET:${target}`);
  const requireRealBrowser = hasFlag("require-real-browser");
  const writeSummary = hasFlag("write-summary");
  const baseUrl = resolveE2eBaseUrl({
    explicit: argValue("base-url"),
    scriptEnvKeys: ["FOREMAN_AI_ESTIMATE_SYNC_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const domain = runForemanAiEstimateSyncDomainProof();
    const browser = requireRealBrowser
      ? await runBrowserProof(baseUrl)
      : {
          materials_main_button_visible: false,
          materials_estimate_button_visible: false,
          materials_composer_opened: false,
          materials_mode_marker_visible: false,
          subcontracts_main_button_visible: false,
          subcontracts_estimate_button_visible: false,
          subcontracts_composer_opened: false,
          subcontracts_mode_marker_visible: false,
          director_route_visible: false,
          buyer_route_visible: false,
          console_errors: [],
          page_errors: [],
          blockers: ["real_browser_required"],
        };
    const blockers = [
      ...domain.blockers.map((blocker) => `domain:${blocker}`),
      ...browser.blockers.map((blocker) => `browser:${blocker}`),
      domain.passed ? "" : "domain_proof_failed",
    ].filter(Boolean);
    const passed = blockers.length === 0;
    const summary = {
      final_status: passed ? GREEN_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE : STOP_FOREMAN_AI_ESTIMATE_SYNC_WEB_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "web",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      browser_automation_started: requireRealBrowser,
      web_server_started_by_runner: server.started,
      actual_web_browser_foreman_ai_estimate_sync_passed: passed,
      web_foreman_materials_flow_passed:
        domain.foreman_materials_ai_estimate_opened &&
        browser.materials_main_button_visible &&
        browser.materials_estimate_button_visible &&
        browser.materials_composer_opened &&
        browser.materials_mode_marker_visible,
      web_foreman_subcontracts_flow_passed:
        domain.foreman_subcontracts_ai_estimate_opened &&
        browser.subcontracts_main_button_visible &&
        browser.subcontracts_estimate_button_visible &&
        browser.subcontracts_composer_opened &&
        browser.subcontracts_mode_marker_visible,
      web_director_visibility_passed:
        domain.director_foreman_materials_request_visible &&
        domain.director_foreman_subcontracts_request_visible &&
        browser.director_route_visible,
      web_buyer_procurement_handoff_passed:
        domain.buyer_foreman_materials_procurement_rows_visible &&
        domain.buyer_foreman_subcontracts_procurement_subset_valid &&
        browser.buyer_route_visible,
      web_console_errors_count: browser.console_errors.length + browser.page_errors.length,
      domain,
      browser,
      render_staging_started: false,
      owner_go_no_go_started: false,
      marketplace_touched: false,
      rfq_touched: false,
      warehouse_touched: false,
      payment_touched: false,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      production_db_touched: false,
      full_jest_started: false,
      fake_green_claimed: false,
      blockers,
    };
    const artifact = writeSummary ? writeRuntimeJson(ROOT, summary) : { artifactPath: path.join(outDir, "summary.json"), artifact: summary };
    console.log(JSON.stringify({ artifact: artifact.artifactPath, final_status: summary.final_status, blockers }, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
