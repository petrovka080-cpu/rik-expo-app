import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  isSupportedMaterialQuantityCaseSet,
  MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
  MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES,
  MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
  runMaterialQuantityRuntimeCaseDomainProof,
  type MaterialQuantityRuntimeCase,
  type MaterialQuantityRuntimeDomainProof,
} from "../estimate/materialQuantityCriticalCases";
import { argValue, assertLocalServerMayStart, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE_FAILED" as const;

const WEB_ROOT = path.join(".release-runtime", "ai-estimate-material-quantity-accuracy", "web");
const DEFAULT_BASE_URL = "http://localhost:8100";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

export type MaterialQuantityWebCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  passed: boolean;
  page_url: string;
  material_quantity_panel_visible: boolean;
  material_waste_packaging_panel_visible: boolean;
  material_formula_drawer_visible: boolean;
  material_quantity_panel_has_rows: boolean;
  material_waste_panel_has_rounding: boolean;
  material_formula_drawer_has_params: boolean;
  pdf_button_visible_after_confirm: boolean;
  raw_dump_visible: boolean;
  console_error_count: number;
  page_error_count: number;
  panel_text_sample: string;
  body_text_sample: string;
  domain: MaterialQuantityRuntimeDomainProof;
  blockers: string[];
};

export type MaterialQuantityWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE
    | typeof STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: typeof MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  actual_web_browser_material_quantity_accuracy_smoke_passed: boolean;
  material_quantity_accuracy_web_smoke_passed: boolean;
  web_material_quantity_accuracy_cases_passed: string;
  web_material_quantity_accuracy_cases_total: number;
  web_cases_total: number;
  web_cases_passed_count: number;
  web_cases_failed_count: number;
  web_material_quantity_panel_missing_count: number;
  web_material_quantity_validation_failed_count: number;
  web_raw_dump_ui_count: number;
  web_console_errors_count: number;
  web_page_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  exact_artifact_paths: {
    material_quantity_accuracy_summary: string;
  };
  blockers: string[];
  case_results: MaterialQuantityWebCaseProof[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 240_000): Promise<T> {
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
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/request`);
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

async function ensureWebServer(baseUrl: string, outDir: string): Promise<ServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  assertLocalServerMayStart(baseUrl);
  const serverDir = path.join(outDir, "web-server");
  mkdirSync(serverDir, { recursive: true });
  const stdout = path.join(serverDir, "stdout.log");
  const stderr = path.join(serverDir, "stderr.log");
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
  });
  return { started: true, stop: () => stopProcessTree(child) };
}

async function setInputText(page: Page, testId: string, value: string, options: { verifyValue?: boolean } = {}): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 30_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await locator.pressSequentially(value, { delay: 0 });
  if (options.verifyValue !== false) {
    await poll(async () => {
      const current = await locator.evaluate((node) => {
        const input = node as HTMLInputElement | HTMLTextAreaElement;
        return input.value;
      });
      return current === value ? true : null;
    }, 10_000);
  }
  if (await locator.count() > 0) await locator.blur();
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

function rawDumpVisible(text: string): boolean {
  return /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(text);
}

function caseBlockers(proof: Omit<MaterialQuantityWebCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.material_quantity_panel_visible ? "" : "material_quantity_panel_missing",
    proof.material_waste_packaging_panel_visible ? "" : "material_waste_packaging_panel_missing",
    proof.material_formula_drawer_visible ? "" : "material_formula_drawer_missing",
    proof.material_quantity_panel_has_rows ? "" : "material_quantity_panel_rows_missing",
    proof.material_waste_panel_has_rounding ? "" : "material_waste_panel_rounding_missing",
    proof.material_formula_drawer_has_params ? "" : "material_formula_drawer_params_missing",
    proof.pdf_button_visible_after_confirm ? "" : "pdf_button_missing_after_confirm",
    !proof.raw_dump_visible ? "" : "raw_dump_visible",
    proof.console_error_count === 0 ? "" : `console_errors:${proof.console_error_count}`,
    proof.page_error_count === 0 ? "" : `page_errors:${proof.page_error_count}`,
    proof.domain.passed ? "" : "domain_material_quantity_failed",
    proof.domain.material_quantity_lines_count > 0 ? "" : "domain_material_quantity_lines_missing",
    proof.domain.procurement_quantity_less_than_gross_count === 0 ? "" : "domain_procurement_quantity_less_than_gross",
    proof.domain.gross_less_than_net_count === 0 ? "" : "domain_gross_less_than_net",
    ...proof.domain.blocking_reasons.map((reason) => `domain:${reason}`),
  ].filter(Boolean);
}

async function runBrowserCase(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  testCase: MaterialQuantityRuntimeCase,
): Promise<MaterialQuantityWebCaseProof> {
  const domain = runMaterialQuantityRuntimeCaseDomainProof(testCase);
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  await context.addInitScript((key) => {
    window.localStorage.removeItem(key as string);
  }, DURABLE_REQUEST_STORE_KEY);
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    await page.goto(`${baseUrl.replace(/\/+$/, "")}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    await page.evaluate((key) => window.localStorage.removeItem(key as string), DURABLE_REQUEST_STORE_KEY);
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-city-input", "Bishkek", { verifyValue: false });
    await setInputText(page, "consumer-repair-address-input", "material-quantity-redacted-address", { verifyValue: false });
    await setInputText(page, "consumer-repair-time-input", "today", { verifyValue: false });
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-phone-input", "0700000", { verifyValue: false });
    await setInputText(page, "consumer-repair-problem-input", testCase.prompt);

    await page.getByTestId("material-quantity-trace-panel").waitFor({ timeout: 90_000 });
    const quantityPanelVisibleBeforePrepare = await page.getByTestId("material-quantity-trace-panel").count() > 0;
    const wastePanelVisibleBeforePrepare = await page.getByTestId("material-waste-packaging-panel").count() > 0;
    const formulaDrawerVisibleBeforePrepare = await page.getByTestId("material-quantity-formula-drawer").count() > 0;
    const quantityPanelText = await page.getByTestId("material-quantity-trace-panel").innerText({ timeout: 15_000 });
    const wastePanelText = await page.getByTestId("material-waste-packaging-panel").innerText({ timeout: 15_000 });
    const formulaText = await page.getByTestId("material-quantity-formula-drawer").innerText({ timeout: 15_000 });
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    if (await page.getByTestId("consumer-repair-approve").count()) {
      await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
      await page.getByTestId("consumer-repair-approve").click();
      await page.getByTestId("consumer-repair-history-button").waitFor({ timeout: 90_000 });
      await page.getByTestId("consumer-repair-history-button").click();
      await page.getByTestId("consumer-repair-history-open-pdf-expanded").waitFor({ timeout: 90_000 });
    }
    const bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const proofWithoutPass: Omit<MaterialQuantityWebCaseProof, "passed" | "blockers"> = {
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      expected_family_id: testCase.expected_family,
      matched_family_id: domain.matched_family_id,
      page_url: page.url(),
      material_quantity_panel_visible: quantityPanelVisibleBeforePrepare,
      material_waste_packaging_panel_visible: wastePanelVisibleBeforePrepare,
      material_formula_drawer_visible: formulaDrawerVisibleBeforePrepare,
      material_quantity_panel_has_rows: /rows=\d+/.test(quantityPanelText) && /buy=/.test(quantityPanelText),
      material_waste_panel_has_rounding: /rounded=\d+\/\d+/.test(wastePanelText) && /package=/.test(wastePanelText),
      material_formula_drawer_has_params: /params=/.test(formulaText),
      pdf_button_visible_after_confirm: await page.getByTestId("consumer-repair-open-pdf").count() > 0 ||
        await page.getByTestId("consumer-repair-history-open-pdf-expanded").count() > 0,
      raw_dump_visible: rawDumpVisible(`${quantityPanelText}\n${wastePanelText}\n${formulaText}\n${bodyText}`),
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      panel_text_sample: `${quantityPanelText}\n${wastePanelText}\n${formulaText}`.slice(0, 3000),
      body_text_sample: bodyText.slice(0, 5000),
      domain,
    };
    const blockers = caseBlockers(proofWithoutPass);
    return { ...proofWithoutPass, passed: blockers.length === 0, blockers };
  } catch (error) {
    const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const proofWithoutPass: Omit<MaterialQuantityWebCaseProof, "passed" | "blockers"> = {
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      expected_family_id: testCase.expected_family,
      matched_family_id: domain.matched_family_id,
      page_url: page.url(),
      material_quantity_panel_visible: await page.getByTestId("material-quantity-trace-panel").count().catch(() => 0) > 0,
      material_waste_packaging_panel_visible: await page.getByTestId("material-waste-packaging-panel").count().catch(() => 0) > 0,
      material_formula_drawer_visible: await page.getByTestId("material-quantity-formula-drawer").count().catch(() => 0) > 0,
      material_quantity_panel_has_rows: false,
      material_waste_panel_has_rounding: false,
      material_formula_drawer_has_params: false,
      pdf_button_visible_after_confirm: false,
      raw_dump_visible: rawDumpVisible(bodyText),
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      panel_text_sample: `ERROR: ${errorMessage}`.slice(0, 3000),
      body_text_sample: bodyText.slice(0, 5000),
      domain,
    };
    return {
      ...proofWithoutPass,
      passed: false,
      blockers: [`browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`, ...caseBlockers(proofWithoutPass)],
    };
  } finally {
    await context.close();
  }
}

export async function runMaterialQuantityAccuracyWebSmoke(options: {
  target?: "web";
  cases?: string;
  requireRealBrowser?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: MaterialQuantityWebSmokeSummary }> {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_MATERIAL_QUANTITY_WEB_TARGET:${options.target}`);
  if (!isSupportedMaterialQuantityCaseSet(options.cases)) throw new Error(`UNSUPPORTED_MATERIAL_QUANTITY_CASES:${options.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["MATERIAL_QUANTITY_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(WEB_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  let server: ServerHandle | null = null;
  const caseResults: MaterialQuantityWebCaseProof[] = [];
  let browserStarted = false;
  try {
    server = await ensureWebServer(baseUrl, outDir);
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      for (const testCase of MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES) {
        const result = await runBrowserCase(browser, baseUrl, testCase);
        caseResults.push(result);
        console.info(JSON.stringify({
          case_id: result.case_id,
          passed: result.passed,
          blockers_count: result.blockers.length,
          first_blockers: result.blockers.slice(0, 5),
          cases_done: caseResults.length,
          cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES.length,
        }));
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED}`,
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const passed = blockers.length === 0 && browserStarted && allCasesExecuted;
  const summary: MaterialQuantityWebSmokeSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE
      : STOP_AI_ESTIMATE_MATERIAL_QUANTITY_ACCURACY_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: MATERIAL_QUANTITY_ACCURACY_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: server?.started ?? false,
    actual_web_browser_material_quantity_accuracy_smoke_passed: passed,
    material_quantity_accuracy_web_smoke_passed: passed,
    web_material_quantity_accuracy_cases_passed: `${caseResults.filter((item) => item.passed).length}/${MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED}`,
    web_material_quantity_accuracy_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
    web_cases_total: MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED,
    web_cases_passed_count: caseResults.filter((item) => item.passed).length,
    web_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : MATERIAL_QUANTITY_ACCURACY_RUNTIME_CASES_REQUIRED - caseResults.length),
    web_material_quantity_panel_missing_count: caseResults.filter((item) =>
      !item.material_quantity_panel_visible ||
      !item.material_waste_packaging_panel_visible ||
      !item.material_formula_drawer_visible
    ).length,
    web_material_quantity_validation_failed_count: caseResults.filter((item) => !item.domain.passed).length,
    web_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible).length,
    web_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    web_page_errors_count: caseResults.reduce((sum, item) => sum + item.page_error_count, 0),
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    exact_artifact_paths: {
      material_quantity_accuracy_summary: artifactPath,
    },
    blockers,
    case_results: caseResults,
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runMaterialQuantityAccuracyWebSmoke.ts")) {
  void runMaterialQuantityAccuracyWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_material_quantity_accuracy_smoke_passed: result.artifact.actual_web_browser_material_quantity_accuracy_smoke_passed,
        web_material_quantity_accuracy_cases_passed: result.artifact.web_material_quantity_accuracy_cases_passed,
        web_material_quantity_panel_missing_count: result.artifact.web_material_quantity_panel_missing_count,
        web_material_quantity_validation_failed_count: result.artifact.web_material_quantity_validation_failed_count,
        web_raw_dump_ui_count: result.artifact.web_raw_dump_ui_count,
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
