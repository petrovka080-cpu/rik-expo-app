import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  isSupportedRealNamedBoqCaseSet,
  REAL_NAMED_BOQ_CRITICAL_CASE_SET,
  REAL_NAMED_BOQ_RUNTIME_CASES,
  REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
  runRealNamedBoqRuntimeCaseDomainProof,
  type RealNamedBoqRuntimeCase,
  type RealNamedBoqRuntimeDomainProof,
} from "../estimate/realNamedBoqCriticalCases";
import { argValue, assertLocalServerMayStart, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE_FAILED" as const;

const WEB_ROOT = path.join(".release-runtime", "ai-estimate-real-named-boq-line-items", "web");
const DEFAULT_BASE_URL = "http://localhost:8094";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

export type RealNamedWebCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  passed: boolean;
  page_url: string;
  summary_card_visible: boolean;
  grouped_boq_visible: boolean;
  details_drawer_visible: boolean;
  work_rows_visible: boolean;
  material_rows_visible: boolean;
  service_or_equipment_rows_visible: boolean;
  assumptions_visible: boolean;
  quantity_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  refusal_visible: boolean;
  drawings_required_stop_visible: boolean;
  raw_dump_visible: boolean;
  route_marker_only: boolean;
  runtime_marker_only: boolean;
  console_error_count: number;
  page_error_count: number;
  body_text_sample: string;
  domain: RealNamedBoqRuntimeDomainProof;
  blockers: string[];
};

export type RealNamedWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE
    | typeof STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: typeof REAL_NAMED_BOQ_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  actual_web_browser_real_named_boq_smoke_passed: boolean;
  actual_web_browser_wave2c_expanded_smoke_passed: false;
  real_named_boq_line_items_web_smoke_passed: boolean;
  web_real_named_cases_passed: string;
  web_real_named_cases_total: number;
  web_cases_total: number;
  web_cases_passed_count: number;
  web_cases_failed_count: number;
  web_generic_line_names_count: number;
  web_template_only_line_names_count: number;
  web_raw_dump_ui_count: number;
  web_main_ui_ungrouped_rows_over_limit_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
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
    real_named_summary: string;
  };
  blockers: string[];
  case_results: RealNamedWebCaseProof[];
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

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
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

function bodyHas(bodyText: string, marker: string | null): boolean {
  return Boolean(marker && bodyText.includes(marker));
}

function caseBlockers(proof: Omit<RealNamedWebCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.summary_card_visible ? "" : "summary_card_missing",
    proof.grouped_boq_visible ? "" : "grouped_boq_missing",
    proof.details_drawer_visible ? "" : "details_drawer_missing",
    proof.work_rows_visible ? "" : "work_rows_not_visible",
    proof.material_rows_visible ? "" : "material_rows_not_visible",
    proof.domain.service_rows_count + proof.domain.equipment_rows_count === 0 || proof.service_or_equipment_rows_visible
      ? ""
      : "service_or_equipment_rows_not_visible",
    proof.assumptions_visible ? "" : "assumptions_missing",
    proof.quantity_inputs > 0 ? "" : "quantity_inputs_missing",
    proof.remove_buttons > 0 ? "" : "remove_buttons_missing",
    proof.pdf_button_visible_after_confirm ? "" : "pdf_button_missing_after_confirm",
    !proof.positions_empty_after_prompt ? "" : "positions_empty_after_prompt",
    !proof.refusal_visible ? "" : "refusal_visible",
    !proof.drawings_required_stop_visible ? "" : "drawings_required_stop_visible",
    !proof.raw_dump_visible ? "" : "raw_dump_visible",
    !proof.route_marker_only ? "" : "route_marker_only_smoke_rejected",
    !proof.runtime_marker_only ? "" : "runtime_marker_only_smoke_rejected",
    proof.console_error_count === 0 ? "" : `console_errors:${proof.console_error_count}`,
    proof.page_error_count === 0 ? "" : `page_errors:${proof.page_error_count}`,
    ...proof.domain.blocking_reasons.map((reason) => `domain:${reason}`),
  ].filter(Boolean);
}

async function runBrowserCase(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  testCase: RealNamedBoqRuntimeCase,
): Promise<RealNamedWebCaseProof> {
  const domain = runRealNamedBoqRuntimeCaseDomainProof(testCase);
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
    const targetUrl = `${baseUrl.replace(/\/+$/, "")}/request`;
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
    await page.evaluate((key) => window.localStorage.removeItem(key as string), DURABLE_REQUEST_STORE_KEY);
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-city-input", "Bishkek", { verifyValue: false });
    await setInputText(page, "consumer-repair-address-input", "real-named-redacted-address", { verifyValue: false });
    await setInputText(page, "consumer-repair-time-input", "today", { verifyValue: false });
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-phone-input", "0700000", { verifyValue: false });
    await setInputText(page, "consumer-repair-problem-input", testCase.prompt);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    if (await page.getByTestId("request-estimate-details-toggle").count()) {
      await page.getByTestId("request-estimate-details-toggle").click();
      await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 45_000 });
    }
    const groupedSectionCount = await count(page, "[data-testid^='request-estimate-section-']");
    const quantityInputs = await count(page, "[data-testid^='consumer-repair-item-quantity-input-']");
    const removeButtons = await count(page, "[data-testid^='consumer-repair-item-remove-']");
    let bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const rawDumpBeforeApprove = /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(bodyText);
    await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
    await page.getByTestId("consumer-repair-approve").click();
    await page.getByTestId("consumer-repair-open-pdf").waitFor({ timeout: 90_000 });
    bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const proofWithoutPass = {
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      expected_family_id: testCase.expected_family,
      matched_family_id: domain.matched_family_id,
      page_url: page.url(),
      summary_card_visible: await page.getByTestId("request-estimate-summary-card").count() > 0,
      grouped_boq_visible: groupedSectionCount > 0 && quantityInputs > 0 && !domain.main_ui_ungrouped_rows_over_limit,
      details_drawer_visible: await page.getByTestId("request-estimate-details-panel").count() > 0,
      work_rows_visible: bodyHas(bodyText, domain.first_work_title),
      material_rows_visible: bodyHas(bodyText, domain.first_material_title),
      service_or_equipment_rows_visible: bodyHas(bodyText, domain.first_service_or_equipment_title),
      assumptions_visible: await page.getByTestId("request-estimate-assumptions").count() > 0 || domain.assumptions_visible_contract,
      quantity_inputs: quantityInputs,
      remove_buttons: removeButtons,
      pdf_button_visible_after_confirm: await page.getByTestId("consumer-repair-open-pdf").count() > 0,
      positions_empty_after_prompt: /positions empty|позиции пока пустые/i.test(bodyText),
      refusal_visible: /dangerous|заявка специалисту|опасно/i.test(bodyText),
      drawings_required_stop_visible: /drawings_required_stop|чертежи обязательны/i.test(bodyText),
      raw_dump_visible: rawDumpBeforeApprove || /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(bodyText),
      route_marker_only: bodyText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
      runtime_marker_only: bodyText.trim() === "ROUTE_PROOF_APP_ROOT_READY",
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      body_text_sample: bodyText.slice(0, 5000),
      domain,
    };
    const blockers = caseBlockers(proofWithoutPass);
    return {
      ...proofWithoutPass,
      passed: blockers.length === 0,
      blockers,
    };
  } catch (error) {
    const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const proofWithoutPass = {
      case_id: testCase.case_id,
      prompt: testCase.prompt,
      expected_family_id: testCase.expected_family,
      matched_family_id: domain.matched_family_id,
      page_url: page.url(),
      summary_card_visible: false,
      grouped_boq_visible: false,
      details_drawer_visible: false,
      work_rows_visible: false,
      material_rows_visible: false,
      service_or_equipment_rows_visible: false,
      assumptions_visible: false,
      quantity_inputs: 0,
      remove_buttons: 0,
      pdf_button_visible_after_confirm: false,
      positions_empty_after_prompt: /positions empty|позиции пока пустые/i.test(bodyText),
      refusal_visible: /dangerous|заявка специалисту|опасно/i.test(bodyText),
      drawings_required_stop_visible: /drawings_required_stop|чертежи обязательны/i.test(bodyText),
      raw_dump_visible: /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(bodyText),
      route_marker_only: bodyText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
      runtime_marker_only: bodyText.trim() === "ROUTE_PROOF_APP_ROOT_READY",
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      body_text_sample: `ERROR: ${errorMessage}\n${bodyText}`.slice(0, 5000),
      domain,
    };
    const blockers = [`browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`, ...caseBlockers(proofWithoutPass)];
    return {
      ...proofWithoutPass,
      passed: false,
      blockers,
    };
  } finally {
    await context.close();
  }
}

export async function runRealNamedBoqLineItemsWebSmoke(options: {
  target?: "web";
  cases?: string;
  requireRealBrowser?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: RealNamedWebSmokeSummary }> {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_REAL_NAMED_BOQ_WEB_TARGET:${options.target}`);
  if (!isSupportedRealNamedBoqCaseSet(options.cases)) throw new Error(`UNSUPPORTED_REAL_NAMED_BOQ_CASES:${options.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["REAL_NAMED_BOQ_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(WEB_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  let server: ServerHandle | null = null;
  const caseResults: RealNamedWebCaseProof[] = [];
  let browserStarted = false;
  try {
    server = await ensureWebServer(baseUrl, outDir);
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      for (const testCase of REAL_NAMED_BOQ_RUNTIME_CASES) {
        const result = await runBrowserCase(browser, baseUrl, testCase);
        caseResults.push(result);
        console.info(JSON.stringify({
          case_id: result.case_id,
          passed: result.passed,
          blockers_count: result.blockers.length,
          cases_done: caseResults.length,
          cases_total: REAL_NAMED_BOQ_RUNTIME_CASES.length,
        }));
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`,
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const summary: RealNamedWebSmokeSummary = {
    final_status: blockers.length === 0 && browserStarted && allCasesExecuted
      ? GREEN_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE
      : STOP_AI_ESTIMATE_REAL_NAMED_BOQ_LINE_ITEMS_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: REAL_NAMED_BOQ_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: server?.started ?? false,
    actual_web_browser_real_named_boq_smoke_passed: blockers.length === 0 && browserStarted && allCasesExecuted,
    actual_web_browser_wave2c_expanded_smoke_passed: false,
    real_named_boq_line_items_web_smoke_passed: blockers.length === 0 && browserStarted && allCasesExecuted,
    web_real_named_cases_passed: `${caseResults.filter((item) => item.passed).length}/${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`,
    web_real_named_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    web_cases_total: REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
    web_cases_passed_count: caseResults.filter((item) => item.passed).length,
    web_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED - caseResults.length),
    web_generic_line_names_count: caseResults.reduce((sum, item) => sum + item.domain.generic_line_names_count, 0),
    web_template_only_line_names_count: caseResults.reduce((sum, item) => sum + item.domain.template_only_line_names_count, 0),
    web_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible || !item.domain.no_raw_dump).length,
    web_main_ui_ungrouped_rows_over_limit_count: caseResults.filter((item) => item.domain.main_ui_ungrouped_rows_over_limit).length,
    web_pdf_missing_count: caseResults.filter((item) => !item.domain.pdf_generated_from_snapshot || !item.domain.pdf_rows_equal_snapshot_rows || !item.pdf_button_visible_after_confirm).length,
    web_buyer_handoff_missing_count: caseResults.filter((item) => !item.domain.buyer_handoff_created || !item.domain.buyer_handoff_procurement_subset_valid).length,
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
      real_named_summary: artifactPath,
    },
    blockers,
    case_results: caseResults,
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runRealNamedBoqLineItemsWebSmoke.ts")) {
  void runRealNamedBoqLineItemsWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases") ?? undefined,
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_real_named_boq_smoke_passed: result.artifact.actual_web_browser_real_named_boq_smoke_passed,
        web_real_named_cases_passed: result.artifact.web_real_named_cases_passed,
        web_generic_line_names_count: result.artifact.web_generic_line_names_count,
        web_template_only_line_names_count: result.artifact.web_template_only_line_names_count,
        web_raw_dump_ui_count: result.artifact.web_raw_dump_ui_count,
        web_console_errors_count: result.artifact.web_console_errors_count,
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
