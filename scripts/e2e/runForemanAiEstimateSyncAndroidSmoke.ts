import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";

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
import {
  checkAndroidEmulatorHealth,
  STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
} from "./checkAndroidEmulatorHealth";
import { ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";
import { runForemanAiEstimateSyncDomainProof } from "../estimate/foremanAiEstimateSyncProof";

const ROOT = path.join(".release-runtime", "ai-estimate-foreman-materials-subcontracts-sync", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8103";
const LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY = "rik.office.localDeveloperFullAccess";
const CDP_CONNECT_TIMEOUT_MS = 15_000;
const CDP_SESSION_DEADLINE_MS = 120_000;
const CDP_STORAGE_TIMEOUT_MS = 5_000;
const BROWSER_CLOSE_TIMEOUT_MS = 5_000;

export const GREEN_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE =
  "GREEN_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE" as const;
export const STOP_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE_FAILED =
  "STOP_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE_FAILED" as const;

type AndroidBrowserProof = {
  android_chrome_launched_or_attached: boolean;
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
  bad_responses: string[];
  buyer_debug?: {
    url: string;
    body_sample: string;
    test_ids: string[];
  } | null;
  blockers: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function logAndroidSmokeStep(step: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({
    android_smoke_step: step,
    at: new Date().toISOString(),
    ...extra,
  }));
}

function failedAndroidBrowserProof(error: unknown): AndroidBrowserProof {
  const message = errorMessage(error);
  return {
    android_chrome_launched_or_attached: false,
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
    page_errors: [message],
    bad_responses: [],
    buyer_debug: null,
    blockers: [`android_browser_proof_error:${message}`],
  };
}

function adb(serial: string, args: string[], timeoutMs = 30_000): string {
  return execFileSync("adb", ["-s", serial, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbNoThrow(serial: string, args: string[], timeoutMs = 10_000): boolean {
  try {
    adb(serial, args, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_TIMEOUT:${timeoutMs}`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startAndroidChrome(serial: string): void {
  adb(serial, [
    "shell",
    "am",
    "start",
    "-n",
    "com.android.chrome/com.google.android.apps.chrome.Main",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "about:blank",
  ]);
}

async function closeBrowserNoThrow(browser: Browser | null): Promise<void> {
  if (!browser) return;
  await withTimeout(browser.close(), BROWSER_CLOSE_TIMEOUT_MS, "ANDROID_CHROME_BROWSER_CLOSE")
    .catch(() => undefined);
}

async function restartAndroidChromeForCdp(serial: string): Promise<void> {
  adbNoThrow(serial, ["shell", "am", "force-stop", "com.android.chrome"]);
  startAndroidChrome(serial);
  await sleep(3_000);
}

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

async function captureBuyerDebug(page: Page): Promise<AndroidBrowserProof["buyer_debug"]> {
  const body = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  const testIds = await page.locator("[data-testid]").evaluateAll((nodes) =>
    nodes
      .slice(0, 80)
      .map((node) => node.getAttribute("data-testid") ?? "")
      .filter(Boolean),
  ).catch(() => []);
  return {
    url: page.url(),
    body_sample: body.slice(0, 2_000),
    test_ids: testIds,
  };
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

function isSameHostUrl(urlValue: string, baseUrl: string): boolean {
  try {
    return new URL(urlValue).host === new URL(baseUrl).host;
  } catch {
    return false;
  }
}

async function activeChromePage(serial: string, baseUrl: string): Promise<Page> {
  adb(serial, ["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  const deadline = Date.now() + CDP_SESSION_DEADLINE_MS;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    let browser: Browser | null = null;
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9222", {
        timeout: CDP_CONNECT_TIMEOUT_MS,
      });
      for (const context of browser.contexts()) {
        const staleOriginPages = context.pages().filter((item) => isSameHostUrl(item.url(), baseUrl));
        if (staleOriginPages.length > 0) {
          await Promise.all(staleOriginPages.map((item) => item.close().catch(() => undefined)));
        }
        return await context.newPage();
      }
    } catch (error) {
      lastError = error;
    }
    await closeBrowserNoThrow(browser);
    await restartAndroidChromeForCdp(serial);
    await sleep(1_000);
  }
  throw new Error(`ANDROID_CHROME_PAGE_NOT_FOUND:${lastError instanceof Error ? lastError.message : "devtools_not_ready"}`);
}

async function resetAndroidChromeOrigin(page: Page, baseUrl: string): Promise<void> {
  const origin = new URL(baseUrl).origin;
  const cdp = await withTimeout(
    page.context().newCDPSession(page),
    CDP_STORAGE_TIMEOUT_MS,
    "ANDROID_CHROME_CDP_SESSION",
  ).catch(() => null);
  if (!cdp) return;
  try {
    await withTimeout(
      cdp.send("Network.clearBrowserCache"),
      CDP_STORAGE_TIMEOUT_MS,
      "ANDROID_CHROME_CLEAR_CACHE",
    ).catch(() => undefined);
    await withTimeout(
      cdp.send("Storage.clearDataForOrigin", {
        origin,
        storageTypes: "all",
      }),
      CDP_STORAGE_TIMEOUT_MS,
      "ANDROID_CHROME_CLEAR_STORAGE",
    ).catch(() => undefined);
  } finally {
    await withTimeout(cdp.detach(), CDP_STORAGE_TIMEOUT_MS, "ANDROID_CHROME_CDP_DETACH")
      .catch(() => undefined);
  }
}

async function openOfficeRouteOnAndroid(input: {
  page: Page;
  serial: string;
  baseUrl: string;
  routePath: "/office/foreman" | "/office/director" | "/office/buyer";
  queryKey: string;
  resetOrigin?: boolean;
}) {
  const route = `${input.baseUrl.replace(/\/+$/, "")}${input.routePath}?${input.queryKey}=${Date.now()}`;
  await input.page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
  if (input.resetOrigin !== false) {
    await resetAndroidChromeOrigin(input.page, input.baseUrl);
  }
  await input.page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key as string, "1");
    } catch {
      // about:blank can reject localStorage before the app origin is loaded.
    }
  }, LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
  await input.page.goto(route, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await input.page.evaluate((key) => window.localStorage.setItem(key as string, "1"), LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
}

async function openForemanOnAndroid(input: {
  page: Page;
  serial: string;
  baseUrl: string;
}) {
  await openOfficeRouteOnAndroid({
    ...input,
    routePath: "/office/foreman",
    queryKey: "foremanAiEstimateSyncAndroid",
    resetOrigin: true,
  });
}

async function runAndroidBrowserProof(input: {
  serial: string;
  baseUrl: string;
}): Promise<AndroidBrowserProof> {
  const blockers: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const badResponses: string[] = [];
  const port = resolvePort(input.baseUrl);
  logAndroidSmokeStep("android_browser_proof_start", { baseUrl: input.baseUrl });
  adb(input.serial, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  adb(input.serial, [
    "shell",
    "printf '%s\\n' 'chrome --remote-debugging-socket-name=chrome_devtools_remote --remote-debugging-port=9222' > /data/local/tmp/chrome-command-line && chmod 644 /data/local/tmp/chrome-command-line",
  ]);
  adb(input.serial, ["shell", "am", "force-stop", "com.android.chrome"]);
  startAndroidChrome(input.serial);
  await sleep(5000);
  logAndroidSmokeStep("android_chrome_started");
  const page = await activeChromePage(input.serial, input.baseUrl);
  logAndroidSmokeStep("android_cdp_page_ready", { url: page.url() });
  const browser = page.context().browser();
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()}:${response.url()}`);
  });
  try {
    logAndroidSmokeStep("open_materials_route");
    await openForemanOnAndroid({ page, serial: input.serial, baseUrl: input.baseUrl });
    const materialsMain = await waitVisible(page, "foreman-main-materials-open");
    if (materialsMain) await clickTestId(page, "foreman-main-materials-open");
    const materialsButton = await waitVisible(page, "foreman-materials-estimate-open");
    const materialsComposer = materialsButton ? await openForemanMaterialsEstimateComposer(page) : false;
    const materialsMode = await waitAttached(page, "foreman-ai-estimate-mode-materials_procurement_focus", 10_000);
    logAndroidSmokeStep("materials_flow_checked", {
      materialsMain,
      materialsButton,
      materialsComposer,
      materialsMode,
    });

    logAndroidSmokeStep("open_subcontracts_route");
    await openForemanOnAndroid({ page, serial: input.serial, baseUrl: input.baseUrl });
    const subcontractsMain = await waitVisible(page, "foreman-main-subcontracts-open");
    if (subcontractsMain) await clickTestId(page, "foreman-main-subcontracts-open");
    if (subcontractsMain) await completeForemanFioIfVisible(page);
    const subcontractsButton = await waitVisible(page, "foreman-subcontracts-estimate-open");
    if (subcontractsButton) await clickTestId(page, "foreman-subcontracts-estimate-open");
    const subcontractsComposer = await waitVisible(page, "professional-estimate-composer");
    const subcontractsMode = await waitAttached(page, "foreman-ai-estimate-mode-subcontract_work_package_focus", 10_000);
    logAndroidSmokeStep("subcontracts_flow_checked", {
      subcontractsMain,
      subcontractsButton,
      subcontractsComposer,
      subcontractsMode,
    });

    logAndroidSmokeStep("open_director_route");
    await openOfficeRouteOnAndroid({
      page,
      serial: input.serial,
      baseUrl: input.baseUrl,
      routePath: "/office/director",
      queryKey: "foremanAiEstimateSyncDirectorAndroid",
      resetOrigin: false,
    });
    const directorRoute = await waitVisible(page, "office-role-auth-context-director", 30_000)
      || await waitVisible(page, "director-top-tab-requests", 30_000);
    logAndroidSmokeStep("director_route_checked", { directorRoute, url: page.url() });
    logAndroidSmokeStep("open_buyer_route");
    const buyerPage = await page.context().newPage();
    buyerPage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    buyerPage.on("pageerror", (error) => pageErrors.push(error.message));
    buyerPage.on("response", (response) => {
      if (response.status() >= 400) badResponses.push(`${response.status()}:${response.url()}`);
    });
    logAndroidSmokeStep("buyer_fresh_page_ready", { url: buyerPage.url() });
    await openOfficeRouteOnAndroid({
      page: buyerPage,
      serial: input.serial,
      baseUrl: input.baseUrl,
      routePath: "/office/buyer",
      queryKey: "foremanAiEstimateSyncBuyerAndroid",
      resetOrigin: false,
    });
    const buyerRoute = await waitAttached(buyerPage, "office-role-auth-context-buyer", 60_000)
      || await waitVisible(buyerPage, "buyer-tab-inbox", 60_000);
    const buyerDebug = buyerRoute ? null : await captureBuyerDebug(buyerPage);
    logAndroidSmokeStep("buyer_route_checked", { buyerRoute, url: buyerPage.url() });

    const proof: AndroidBrowserProof = {
      android_chrome_launched_or_attached: true,
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
      bad_responses: badResponses,
      buyer_debug: buyerDebug,
      blockers,
    };
    for (const [key, value] of Object.entries(proof)) {
      if (typeof value === "boolean" && !value) blockers.push(key);
    }
    if (consoleErrors.length > 0) blockers.push(`android_console_errors:${consoleErrors.length}`);
    if (pageErrors.length > 0) blockers.push(`android_page_errors:${pageErrors.length}`);
    if (badResponses.length > 0) blockers.push(`android_bad_responses:${badResponses.length}`);
    logAndroidSmokeStep("android_browser_proof_complete", { blockers });
    return { ...proof, blockers };
  } catch (error) {
    const overlayText = await page.locator("#error-overlay").innerText({ timeout: 2_000 }).catch(() => "");
    if (overlayText) {
      console.error(JSON.stringify({ android_error_overlay_text: overlayText.slice(0, 3000) }, null, 2));
    }
    await page.screenshot({ path: path.join(ROOT, "latest-error-overlay.png"), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    logAndroidSmokeStep("android_browser_cleanup_start");
    adbNoThrow(input.serial, ["shell", "am", "force-stop", "com.android.chrome"]);
    await closeBrowserNoThrow(browser ?? null);
    logAndroidSmokeStep("android_browser_cleanup_done");
  }
}

async function main() {
  const target = argValue("target") ?? "android-chrome";
  if (target !== "android-chrome") throw new Error(`UNSUPPORTED_TARGET:${target}`);
  const requireRealBrowser = hasFlag("require-real-browser");
  const requireEmulator = hasFlag("require-emulator");
  const writeSummary = hasFlag("write-summary");
  const baseUrl = resolveE2eBaseUrl({
    explicit: argValue("base-url"),
    scriptEnvKeys: ["FOREMAN_AI_ESTIMATE_SYNC_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const health = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    writeArtifact: true,
  }).artifact;
  if (!health.android_lab_healthy || !health.selected_serial) {
    const summary = {
      final_status: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      android_emulator_detected: health.emulator_detected,
      android_chrome_launched_or_attached: false,
      actual_android_emulator_foreman_ai_estimate_sync_passed: false,
      android_foreman_materials_flow_passed: false,
      android_foreman_subcontracts_flow_passed: false,
      android_director_visibility_passed: false,
      android_buyer_procurement_handoff_passed: false,
      android_console_errors_count: 0,
      android_emulator_health_degraded: true,
      browser: null,
      health,
      blockers: health.blocking_reasons,
      native_build_started: false,
      eas_started: false,
      release_started: false,
      fake_green_claimed: false,
    };
    const artifact = writeSummary ? writeRuntimeJson(ROOT, summary) : { artifactPath: path.join(outDir, "summary.json"), artifact: summary };
    console.log(JSON.stringify({ artifact: artifact.artifactPath, final_status: summary.final_status, blockers: summary.blockers }, null, 2));
    process.exitCode = 1;
    return;
  }

  const server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
  try {
    const domain = runForemanAiEstimateSyncDomainProof();
    const browser = requireRealBrowser
      ? await runAndroidBrowserProof({ serial: health.selected_serial, baseUrl })
        .catch((error) => {
          console.error(JSON.stringify({ android_browser_proof_error: errorMessage(error) }, null, 2));
          return failedAndroidBrowserProof(error);
        })
      : {
          android_chrome_launched_or_attached: false,
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
          bad_responses: [],
          buyer_debug: null,
          blockers: ["real_browser_required"],
        };
    const healthAfter = checkAndroidEmulatorHealth({
      requireEmulator,
      requireChrome: true,
      writeArtifact: true,
    }).artifact;
    const healthDegraded = !healthAfter.android_lab_healthy;
    const blockers = [
      ...domain.blockers.map((blocker) => `domain:${blocker}`),
      ...browser.blockers.map((blocker) => `browser:${blocker}`),
      domain.passed ? "" : "domain_proof_failed",
      healthDegraded ? "android_emulator_health_degraded" : "",
    ].filter(Boolean);
    const passed = blockers.length === 0;
    const summary = {
      final_status: passed ? GREEN_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE : STOP_FOREMAN_AI_ESTIMATE_SYNC_ANDROID_SMOKE_FAILED,
      source_sha: currentSourceSha(),
      branch: currentBranch(),
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      target: "android-chrome",
      base_url: baseUrl,
      require_real_browser: requireRealBrowser,
      require_emulator: requireEmulator,
      web_server_started_by_runner: server.started,
      android_emulator_detected: health.emulator_detected,
      android_chrome_launched_or_attached: browser.android_chrome_launched_or_attached,
      android_device_id: health.selected_serial,
      actual_android_emulator_foreman_ai_estimate_sync_passed: passed,
      android_foreman_materials_flow_passed:
        domain.foreman_materials_ai_estimate_opened &&
        browser.materials_main_button_visible &&
        browser.materials_estimate_button_visible &&
        browser.materials_composer_opened &&
        browser.materials_mode_marker_visible,
      android_foreman_subcontracts_flow_passed:
        domain.foreman_subcontracts_ai_estimate_opened &&
        browser.subcontracts_main_button_visible &&
        browser.subcontracts_estimate_button_visible &&
        browser.subcontracts_composer_opened &&
        browser.subcontracts_mode_marker_visible,
      android_director_visibility_passed:
        domain.director_foreman_materials_request_visible &&
        domain.director_foreman_subcontracts_request_visible &&
        browser.director_route_visible,
      android_buyer_procurement_handoff_passed:
        domain.buyer_foreman_materials_procurement_rows_visible &&
        domain.buyer_foreman_subcontracts_procurement_subset_valid &&
        browser.buyer_route_visible,
      android_console_errors_count: browser.console_errors.length + browser.page_errors.length,
      android_emulator_health_degraded: healthDegraded,
      domain,
      browser,
      health_before: health,
      health_after: healthAfter,
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
