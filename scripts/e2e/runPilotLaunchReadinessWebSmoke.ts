import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  PILOT_LAUNCH_WEB_ROOT,
  buildPilotCaseDomainProof,
  gitOutput,
  loadPilotLaunchCases,
  timestampForPath,
  writeJson,
  type PilotLaunchCase,
} from "../estimate/buildPilotDefectBurndown";
import { assertLocalServerMayStart, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_FAILED" as const;

const DEFAULT_BASE_URL = "http://localhost:8081";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";

const RAW_DUMP_MARKERS = ["raw_ai_json", "source_parameters", "sourceParameters", "debug object", "calculation JSON"];
const DEBUG_FORMULA_MARKERS = ["template_id", "template_version", "formula_id", "norm_id", "rowCode", "round_to", "normFactor"];
const PRICE_DEBUG_MARKERS = ["PRICE_MISSING", "no_accepted_price_source_or_unit_conversion", "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION"];

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

type PilotBrowserProof = {
  page_url: string;
  summary_card_visible: boolean;
  grouped_preview_visible: boolean;
  details_drawer_visible: boolean;
  quantity_inputs: number;
  price_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  raw_dump_visible: boolean;
  debug_formula_main_ui_visible: boolean;
  price_debug_visible: boolean;
  fake_final_total_visible: boolean;
  route_marker_only: boolean;
  runtime_marker_only: boolean;
  console_error_count: number;
  page_error_count: number;
  body_text_sample: string;
};

type PilotWebCaseResult = {
  case_id: string;
  source_controlled_pilot_case_id: string;
  work_family_id: string;
  target: "web";
  passed: boolean;
  browser_flow_executed: true;
  browser: PilotBrowserProof;
  pilot_proof: ReturnType<typeof buildPilotCaseDomainProof>;
  trust_level_verified: boolean;
  estimate_level_verified: boolean;
  support_package_exported: boolean;
  telemetry_events_recorded: boolean;
  blockers: string[];
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 120_000): Promise<T> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("poll_timeout");
}

async function isReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/request`);
    return response.ok;
  } catch {
    return false;
  }
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

async function ensureWebServer(baseUrl: string): Promise<ServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  assertLocalServerMayStart(baseUrl);
  const outDir = path.join(PILOT_LAUNCH_WEB_ROOT, "web-server");
  mkdirSync(outDir, { recursive: true });
  const stdout = path.join(outDir, "stdout.log");
  const stderr = path.join(outDir, "stderr.log");
  writeFileSync(stdout, "", "utf8");
  writeFileSync(stderr, "", "utf8");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)]
      : ["expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, CI: process.env.CI ?? "1" },
    },
  );
  child.stdout.on("data", (chunk) => appendFileSync(stdout, String(chunk)));
  child.stderr.on("data", (chunk) => appendFileSync(stderr, String(chunk)));
  await poll(async () => {
    if (child.exitCode != null) throw new Error(`web_server_exited:${child.exitCode}`);
    return (await isReady(baseUrl)) ? true : null;
  }, 240_000);
  return { started: true, stop: () => stopProcessTree(child) };
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

async function setInputText(page: Page, testId: string, value: string): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.fill(value, { timeout: 30_000 });
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

function forbiddenVisible(bodyText: string, markers: readonly string[]): boolean {
  return markers.some((marker) => bodyText.includes(marker));
}

function fakeFinalTotalVisible(bodyText: string): boolean {
  const normalized = bodyText.replace(/\s+/g, " ");
  if (!/Итого по позициям:|РС‚РѕРіРѕ РїРѕ РїРѕР·РёС†РёСЏРј:/i.test(normalized)) return false;
  const hasMissingPriceSignal = /Полный итог не рассчитан|итог уточнить|Цена не заполнена|цена нужна|нужно заполнить|Источник цены не выбран|РџРѕР»РЅС‹Р№ РёС‚РѕРі РЅРµ СЂР°СЃСЃС‡РёС‚Р°РЅ|РёС‚РѕРі СѓС‚РѕС‡РЅРёС‚СЊ/i.test(normalized);
  if (!hasMissingPriceSignal) return false;
  if (/Полный итог не рассчитан|итог уточнить|РџРѕР»РЅС‹Р№ РёС‚РѕРі РЅРµ СЂР°СЃСЃС‡РёС‚Р°РЅ|РёС‚РѕРі СѓС‚РѕС‡РЅРёС‚СЊ/i.test(normalized)) return false;
  return /\d[\d\s.,]*(?:KGS|сом|₽|\$|€)/i.test(normalized);
}

async function runBrowserCase(page: Page, baseUrl: string, scenario: PilotLaunchCase): Promise<PilotBrowserProof> {
  const targetUrl = `${baseUrl.replace(/\/+$/, "")}/request`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  await page.evaluate((key) => window.localStorage.removeItem(key as string), DURABLE_REQUEST_STORE_KEY);
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-city-input", "Bishkek");
  await setInputText(page, "consumer-repair-address-input", "pilot-launch-redacted-address");
  await setInputText(page, "consumer-repair-time-input", "today");
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-phone-input", "0700000000");
  await setInputText(page, "consumer-repair-problem-input", scenario.prompt);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
  await page.getByTestId("request-estimate-details-toggle").click();
  await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 45_000 });
  const bodyBeforeApprove = await page.locator("body").innerText({ timeout: 15_000 });
  const groupedSectionCount = await count(page, "[data-testid^='request-estimate-section-']");
  const quantityInputs = await count(page, "[data-testid^='consumer-repair-item-quantity-input-']");
  const priceInputs = await count(page, "[data-testid^='consumer-repair-item-unit-price-input-']");
  const removeButtons = await count(page, "[data-testid^='consumer-repair-item-remove-']");
  await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
  await page.getByTestId("consumer-repair-approve").click();
  await page.getByTestId("consumer-repair-open-pdf").waitFor({ timeout: 90_000 });
  const bodyAfterApprove = await page.locator("body").innerText({ timeout: 15_000 });
  const combinedBody = `${bodyBeforeApprove}\n${bodyAfterApprove}`;
  return {
    page_url: page.url(),
    summary_card_visible: await page.getByTestId("request-estimate-summary-card").count() > 0,
    grouped_preview_visible: groupedSectionCount > 0 && quantityInputs > 0,
    details_drawer_visible: await page.getByTestId("request-estimate-details-panel").count() > 0,
    quantity_inputs: quantityInputs,
    price_inputs: priceInputs,
    remove_buttons: removeButtons,
    pdf_button_visible_after_confirm: await page.getByTestId("consumer-repair-open-pdf").count() > 0,
    positions_empty_after_prompt: combinedBody.includes("Позиции пока пустые") || combinedBody.includes("РџРѕР·РёС†РёРё РїРѕРєР° РїСѓСЃС‚С‹Рµ"),
    raw_dump_visible: forbiddenVisible(combinedBody, RAW_DUMP_MARKERS),
    debug_formula_main_ui_visible: forbiddenVisible(combinedBody, DEBUG_FORMULA_MARKERS),
    price_debug_visible: forbiddenVisible(combinedBody, PRICE_DEBUG_MARKERS),
    fake_final_total_visible: fakeFinalTotalVisible(combinedBody),
    route_marker_only: combinedBody.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
    runtime_marker_only: combinedBody.trim() === "ROUTE_PROOF_APP_ROOT_READY",
    console_error_count: 0,
    page_error_count: 0,
    body_text_sample: combinedBody.slice(0, 5000),
  };
}

function browserBlockers(browser: PilotBrowserProof): string[] {
  return [
    browser.summary_card_visible ? "" : "pilot_web_summary_card_missing",
    browser.grouped_preview_visible ? "" : "pilot_web_grouped_preview_missing",
    browser.details_drawer_visible ? "" : "pilot_web_details_drawer_missing",
    browser.quantity_inputs > 0 ? "" : "pilot_web_quantity_inputs_missing",
    browser.remove_buttons > 0 ? "" : "pilot_web_remove_buttons_missing",
    browser.pdf_button_visible_after_confirm ? "" : "pilot_web_pdf_button_missing_after_confirm",
    !browser.positions_empty_after_prompt ? "" : "positions_empty_after_prompt",
    !browser.raw_dump_visible ? "" : "raw_dump_visible",
    !browser.debug_formula_main_ui_visible ? "" : "debug_formula_visible_in_main_ui",
    !browser.price_debug_visible ? "" : "price_missing_debug_visible",
    !browser.fake_final_total_visible ? "" : "fake_final_total_visible",
    !browser.route_marker_only ? "" : "route_marker_only_smoke_rejected",
    !browser.runtime_marker_only ? "" : "runtime_marker_only_smoke_rejected",
    browser.console_error_count === 0 ? "" : `pilot_web_console_errors:${browser.console_error_count}`,
    browser.page_error_count === 0 ? "" : `pilot_web_page_errors:${browser.page_error_count}`,
  ].filter(Boolean);
}

async function browserFailureProof(page: Page, error: unknown): Promise<PilotBrowserProof> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  return {
    page_url: page.url(),
    summary_card_visible: false,
    grouped_preview_visible: false,
    details_drawer_visible: false,
    quantity_inputs: 0,
    price_inputs: 0,
    remove_buttons: 0,
    pdf_button_visible_after_confirm: false,
    positions_empty_after_prompt: bodyText.includes("Позиции пока пустые") || bodyText.includes("РџРѕР·РёС†РёРё РїРѕРєР° РїСѓСЃС‚С‹Рµ"),
    raw_dump_visible: forbiddenVisible(bodyText, RAW_DUMP_MARKERS),
    debug_formula_main_ui_visible: forbiddenVisible(bodyText, DEBUG_FORMULA_MARKERS),
    price_debug_visible: forbiddenVisible(bodyText, PRICE_DEBUG_MARKERS),
    fake_final_total_visible: fakeFinalTotalVisible(bodyText),
    route_marker_only: bodyText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
    runtime_marker_only: bodyText.trim() === "ROUTE_PROOF_APP_ROOT_READY",
    console_error_count: 0,
    page_error_count: 0,
    body_text_sample: `ERROR: ${errorMessage}\n${bodyText}`.slice(0, 5000),
  };
}

function metricsForResults(results: readonly PilotWebCaseResult[]) {
  const total = results.length;
  const passed = results.filter((item) => item.passed).length;
  return {
    web_pilot_cases_total: total,
    web_pilot_cases_passed: passed,
    web_pilot_cases_failed: total - passed,
    pdf_snapshot_mismatch_count: results.filter((item) => !item.pilot_proof.domain.pdf_rows_equal_snapshot_rows).length,
    buyer_work_rows_count: results.filter((item) => item.pilot_proof.domain.buyer_receives_work_rows).length,
    raw_dump_ui_count: results.filter((item) => item.browser.raw_dump_visible).length,
    empty_positions_after_prompt_count: results.filter((item) => item.browser.positions_empty_after_prompt).length,
    fake_final_total_count: results.filter((item) =>
      item.browser.fake_final_total_visible || item.pilot_proof.domain.final_total_shown_while_prices_missing
    ).length,
    console_error_count: results.reduce((sum, item) => sum + item.browser.console_error_count + item.browser.page_error_count, 0),
    procurement_package_count: results.filter((item) => item.pilot_proof.domain.buyer_handoff_procurement_subset_valid).length,
    support_package_count: results.filter((item) => item.pilot_proof.support_package_exported).length,
    telemetry_events_count: results.filter((item) => item.pilot_proof.telemetry_events_recorded).length,
  };
}

export async function runPilotLaunchReadinessWebSmoke(options: {
  target?: "web";
  cases?: "pilot-launch";
  requireRealBrowser?: boolean;
  baseUrl?: string;
} = {}) {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_PILOT_LAUNCH_WEB_TARGET:${options.target}`);
  if ((options.cases ?? "pilot-launch") !== "pilot-launch") throw new Error(`UNSUPPORTED_PILOT_LAUNCH_CASES:${options.cases}`);
  if (options.requireRealBrowser !== true && process.env.AI_ESTIMATE_PILOT_LAUNCH_WEB_GREEN === "true") {
    throw new Error("env_browser_green_rejected");
  }
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["PILOT_LAUNCH_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const scenarios = loadPilotLaunchCases();
  const outDir = path.join(PILOT_LAUNCH_WEB_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWebServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const results: PilotWebCaseResult[] = [];
  try {
    for (const [index, scenario] of scenarios.entries()) {
      console.log(`[pilot-launch-web] case_start ${index + 1}/${scenarios.length} ${scenario.case_id}`);
      const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
      await context.addInitScript((key) => window.localStorage.removeItem(key as string), DURABLE_REQUEST_STORE_KEY);
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      const pilotProof = buildPilotCaseDomainProof(scenario, "web");
      try {
        const browserProof = await runBrowserCase(page, baseUrl, scenario);
        browserProof.console_error_count = consoleErrors.length;
        browserProof.page_error_count = pageErrors.length;
        const blockers = [...browserBlockers(browserProof), ...pilotProof.blockers];
        results.push({
          case_id: scenario.case_id,
          source_controlled_pilot_case_id: scenario.source_controlled_pilot_case_id,
          work_family_id: scenario.work_family_id,
          target: "web",
          passed: blockers.length === 0,
          browser_flow_executed: true,
          browser: browserProof,
          pilot_proof: pilotProof,
          trust_level_verified: pilotProof.trust_level_verified,
          estimate_level_verified: pilotProof.estimate_level_verified,
          support_package_exported: pilotProof.support_package_exported,
          telemetry_events_recorded: pilotProof.telemetry_events_recorded,
          blockers,
        });
        console.log(`[pilot-launch-web] case_${blockers.length === 0 ? "pass" : "fail"} ${index + 1}/${scenarios.length} ${scenario.case_id}`);
      } catch (error) {
        const browserProof = await browserFailureProof(page, error);
        browserProof.console_error_count = consoleErrors.length;
        browserProof.page_error_count = pageErrors.length;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const blockers = [
          `pilot_web_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`,
          ...browserBlockers(browserProof),
          ...pilotProof.blockers,
        ];
        results.push({
          case_id: scenario.case_id,
          source_controlled_pilot_case_id: scenario.source_controlled_pilot_case_id,
          work_family_id: scenario.work_family_id,
          target: "web",
          passed: false,
              browser_flow_executed: true,
              browser: browserProof,
              pilot_proof: pilotProof,
              trust_level_verified: pilotProof.trust_level_verified,
              estimate_level_verified: pilotProof.estimate_level_verified,
              support_package_exported: pilotProof.support_package_exported,
              telemetry_events_recorded: pilotProof.telemetry_events_recorded,
              blockers,
            });
        console.log(`[pilot-launch-web] case_fail ${index + 1}/${scenarios.length} ${scenario.case_id} ${blockers.join("|")}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.stop();
  }
  const failedCases = results.filter((item) => !item.passed);
  const blockers = failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`));
  const metrics = metricsForResults(results);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_PILOT_LAUNCH_WEB_BROWSER_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    generated_at: new Date().toISOString(),
    target: "web" as const,
    baseUrl,
    cases_total: results.length,
    cases_passed: results.filter((item) => item.passed).length,
    cases_failed: failedCases.length,
    failed_cases: failedCases.map((item) => item.case_id),
    actual_web_browser_pilot_launch_smoke_passed: blockers.length === 0,
    web_pilot_cases_total: metrics.web_pilot_cases_total,
    web_pilot_cases_passed: metrics.web_pilot_cases_passed,
    web_pilot_checks_prompt_to_grouped_draft: true,
    web_pilot_checks_trust_level: true,
    web_pilot_checks_estimate_level: true,
    web_pilot_checks_confirm_snapshot: true,
    web_pilot_checks_pdf_from_snapshot: true,
    web_pilot_checks_procurement_package: true,
    web_pilot_checks_support_package: true,
    web_pilot_checks_telemetry_events: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false as const,
    env_browser_green_rejected: true,
    browser_automation_started: true,
    native_build_started: false,
    eas_started: false,
    console_error_count: metrics.console_error_count,
    pdf_snapshot_mismatch_count: metrics.pdf_snapshot_mismatch_count,
    buyer_work_rows_count: metrics.buyer_work_rows_count,
    raw_dump_ui_count: metrics.raw_dump_ui_count,
    empty_positions_after_prompt_count: metrics.empty_positions_after_prompt_count,
    fake_final_total_count: metrics.fake_final_total_count,
    procurement_package_passed: metrics.procurement_package_count === results.length,
    support_package_exported: metrics.support_package_count === results.length,
    telemetry_events_recorded: metrics.telemetry_events_count === results.length,
    metrics,
    blockers,
    case_results: results,
    fake_green_claimed: false,
  };
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runPilotLaunchReadinessWebSmoke.ts")) {
  void runPilotLaunchReadinessWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: (argValue("cases") ?? "pilot-launch") as "pilot-launch",
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        cases_total: result.artifact.cases_total,
        cases_passed: result.artifact.cases_passed,
        cases_failed: result.artifact.cases_failed,
        failed_cases: result.artifact.failed_cases,
        console_error_count: result.artifact.console_error_count,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
