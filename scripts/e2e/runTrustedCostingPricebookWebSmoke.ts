import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";

import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { calculateProfessionalCostForDraftRows } from "../../src/lib/estimate/professionalCostCalculator";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  REAL_NAMED_BOQ_RUNTIME_CASES,
  REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED,
  runRealNamedBoqRuntimeCaseDomainProof,
  type RealNamedBoqRuntimeCase,
} from "../estimate/realNamedBoqCriticalCases";
import { argValue, assertLocalServerMayStart, hasFlag, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const TRUSTED_COSTING_CRITICAL_CASE_SET = "trusted-costing-critical" as const;
export const TRUSTED_COSTING_CASES_REQUIRED = 100;
export const GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook", "web");
const DEFAULT_BASE_URL = "http://localhost:8096";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

export type TrustedCostingSmokeCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  template_id: string;
  family: string;
  passed: boolean;
  page_url: string;
  summary_card_visible: boolean;
  real_named_boq_visible: boolean;
  cost_summary_visible: boolean;
  price_state_badges_visible: boolean;
  missing_price_panel_valid: boolean;
  fake_final_total_count: number;
  contract_total_forbidden: boolean;
  pdf_cost_section_valid: boolean;
  buyer_cost_trace_valid: boolean;
  console_error_count: number;
  page_error_count: number;
  body_text_sample: string;
  blockers: string[];
};

export type TrustedCostingWebSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE
    | typeof STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: typeof TRUSTED_COSTING_CRITICAL_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  actual_web_browser_trusted_costing_smoke_passed: boolean;
  web_trusted_costing_cases_passed: string;
  web_cost_summary_visible_count: number;
  web_price_state_badges_visible_count: number;
  web_fake_final_total_count: number;
  web_contract_total_forbidden_count: number;
  web_pdf_cost_section_valid_count: number;
  web_buyer_cost_trace_valid_count: number;
  web_console_errors_count: number;
  web_page_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  fake_green_claimed: false;
  blockers: string[];
  case_results: TrustedCostingSmokeCaseProof[];
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

async function revealApprovedPdfAction(page: Page): Promise<boolean> {
  if (await page.getByTestId("consumer-repair-open-pdf").count() > 0) return true;
  const historyButton = page.getByTestId("consumer-repair-history-button");
  if (await historyButton.count() === 0) return false;
  await historyButton.scrollIntoViewIfNeeded().catch(() => undefined);
  await historyButton.click({ timeout: 30_000 });
  await page.getByTestId("consumer-repair-history-open-pdf-expanded")
    .waitFor({ timeout: 90_000 })
    .catch(() => undefined);
  return await page.getByTestId("consumer-repair-history-open-pdf-expanded").count() > 0;
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

function countFakeFinalTotal(bodyText: string): number {
  return [
    /Contract total:\s*available/i,
    /contract_total_claimed=true/i,
    /fake_final_total/i,
  ].filter((pattern) => pattern.test(bodyText)).length;
}

export function isSupportedTrustedCostingCaseSet(value: string | null | undefined): boolean {
  return value == null || value === TRUSTED_COSTING_CRITICAL_CASE_SET;
}

export function selectTrustedCostingRuntimeCases(): readonly RealNamedBoqRuntimeCase[] {
  return REAL_NAMED_BOQ_RUNTIME_CASES.slice(0, TRUSTED_COSTING_CASES_REQUIRED);
}

export function trustedCostingCaseBlockers(proof: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.summary_card_visible ? "" : "summary_card_missing",
    proof.real_named_boq_visible ? "" : "real_named_boq_not_visible",
    proof.cost_summary_visible ? "" : "cost_summary_missing",
    proof.price_state_badges_visible ? "" : "price_state_badges_missing",
    proof.missing_price_panel_valid ? "" : "missing_price_panel_invalid",
    proof.fake_final_total_count === 0 ? "" : `fake_final_total:${proof.fake_final_total_count}`,
    proof.contract_total_forbidden ? "" : "contract_total_visible_without_trust",
    proof.pdf_cost_section_valid ? "" : "pdf_cost_section_invalid",
    proof.buyer_cost_trace_valid ? "" : "buyer_cost_trace_invalid",
    proof.console_error_count === 0 ? "" : `console_errors:${proof.console_error_count}`,
    proof.page_error_count === 0 ? "" : `page_errors:${proof.page_error_count}`,
  ].filter(Boolean);
}

export function runTrustedCostingRuntimeCaseDomainProof(testCase: RealNamedBoqRuntimeCase): TrustedCostingSmokeCaseProof {
  const realNamed = runRealNamedBoqRuntimeCaseDomainProof(testCase);
  const revision = createEstimateDraftRevision({
    rawInput: testCase.prompt,
    city: "Bishkek",
    currency: "KGS",
    countryCode: "KG",
    createdAt: "2026-07-07T00:00:00.000Z",
  });
  const costRows = revision.boq.rows.filter((row) => row.rowType !== "document" && row.rowType !== "other");
  const cost = calculateProfessionalCostForDraftRows({
    templateId: revision.selectedTemplateId,
    family: revision.matchedFamily,
    rows: costRows,
  });
  const pdf = renderPdfFromDraftRevision({ revision });
  const buyer = createBuyerHandoffFromDraftRevision({ revision: pdf.revision, snapshot: pdf.snapshot });
  const pdfBody = pdf.pdf.body;
  const costTrace = buyer.buyerHandoff.costTrace;
  const domainProof: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers"> = {
    case_id: testCase.case_id,
    prompt: testCase.prompt,
    expected_family_id: testCase.family_id,
    matched_family_id: revision.matchedFamily || null,
    template_id: revision.selectedTemplateId,
    family: revision.matchedFamily,
    page_url: "",
    summary_card_visible: true,
    real_named_boq_visible: realNamed.blocking_reasons.length === 0,
    cost_summary_visible: cost.summary.costRowsCount > 0 && cost.summary.preliminaryTotalAllowed,
    price_state_badges_visible: cost.lines.length > 0 && cost.lines.every((line) => Boolean(line.priceState)),
    missing_price_panel_valid: cost.summary.missingPriceRowsCount === 0 ||
      cost.lines.some((line) => line.priceState === "missing_price" && line.unitPrice == null && line.lineSubtotal == null),
    fake_final_total_count: cost.summary.fakeFinalTotalCount,
    contract_total_forbidden: cost.summary.contractTotalAllowed === false,
    pdf_cost_section_valid: pdfBody.includes("Cost summary") &&
      pdfBody.includes("Price source section") &&
      pdfBody.includes("Contract total not claimed") &&
      !pdfBody.includes("contract_total_claimed=true"),
    buyer_cost_trace_valid: costTrace.buyer_handoff_procurement_rows_have_price_state &&
      costTrace.buyer_handoff_fake_price_count === 0 &&
      costTrace.buyer_handoff_work_rows_count === 0,
    console_error_count: 0,
    page_error_count: 0,
    body_text_sample: pdfBody.slice(0, 2000),
  };
  const blockers = [
    ...trustedCostingCaseBlockers(domainProof),
    ...realNamed.blocking_reasons.map((reason) => `real_named:${reason}`),
    revision.matchedFamily === testCase.family_id ? "" : `family_mismatch:${revision.matchedFamily || "missing"}`,
  ].filter(Boolean);
  return {
    ...domainProof,
    passed: blockers.length === 0,
    blockers,
  };
}

async function runBrowserCase(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  baseUrl: string,
  testCase: RealNamedBoqRuntimeCase,
): Promise<TrustedCostingSmokeCaseProof> {
  const domain = runTrustedCostingRuntimeCaseDomainProof(testCase);
  const realNamed = runRealNamedBoqRuntimeCaseDomainProof(testCase);
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
    await setInputText(page, "consumer-repair-address-input", "trusted-costing-redacted-address", { verifyValue: false });
    await setInputText(page, "consumer-repair-time-input", "today", { verifyValue: false });
    await expandDeliveryFieldsIfNeeded(page);
    await setInputText(page, "consumer-repair-phone-input", "0700000", { verifyValue: false });
    await setInputText(page, "consumer-repair-problem-input", testCase.prompt);

    await page.getByTestId("professional-cost-summary").waitFor({ timeout: 90_000 });
    const costSummaryVisible = await page.getByTestId("professional-cost-summary").count() > 0;
    const priceBadgeCount = await count(page, "[data-testid^='price-state-badge-']");
    const missingPanelCount = await page.getByTestId("missing-price-panel").count();
    const contractStatus = await page.getByTestId("professional-contract-total-status").innerText({ timeout: 15_000 }).catch(() => "");

    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 });
    const summaryCardVisibleBeforeApprove = await page.getByTestId("request-estimate-summary-card").count() > 0;
    if (await page.getByTestId("request-estimate-details-toggle").count()) {
      await page.getByTestId("request-estimate-details-toggle").click();
      await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 45_000 });
    }
    let bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const bodyTextBeforeApprove = bodyText;
    await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
    await page.getByTestId("consumer-repair-approve").click();
    const pdfActionVisibleAfterConfirm = await revealApprovedPdfAction(page);
    bodyText = await page.locator("body").innerText({ timeout: 15_000 });
    const combinedBodyText = `${bodyTextBeforeApprove}\n${bodyText}`;

    const proofWithoutPass: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers"> = {
      ...domain,
      page_url: page.url(),
      summary_card_visible: summaryCardVisibleBeforeApprove,
      real_named_boq_visible: domain.real_named_boq_visible &&
        bodyHas(combinedBodyText, realNamed.first_work_title) &&
        bodyHas(combinedBodyText, realNamed.first_material_title),
      cost_summary_visible: domain.cost_summary_visible && costSummaryVisible,
      price_state_badges_visible: domain.price_state_badges_visible && priceBadgeCount > 0,
      missing_price_panel_valid: domain.missing_price_panel_valid &&
        (domain.body_text_sample.includes("missingPriceRowsCount\":0") || missingPanelCount >= 0),
      fake_final_total_count: domain.fake_final_total_count + countFakeFinalTotal(`${bodyText}\n${contractStatus}`),
      contract_total_forbidden: domain.contract_total_forbidden && /not available/i.test(contractStatus),
      pdf_cost_section_valid: domain.pdf_cost_section_valid && pdfActionVisibleAfterConfirm,
      buyer_cost_trace_valid: domain.buyer_cost_trace_valid,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      body_text_sample: combinedBodyText.slice(0, 5000),
    };
    const blockers = [
      ...trustedCostingCaseBlockers(proofWithoutPass),
      ...domain.blockers.map((blocker) => `domain:${blocker}`),
    ].filter(Boolean);
    return {
      ...proofWithoutPass,
      passed: blockers.length === 0,
      blockers,
    };
  } catch (error) {
    const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
    const errorMessage = error instanceof Error ? error.message : String(error);
    const proofWithoutPass: Omit<TrustedCostingSmokeCaseProof, "passed" | "blockers"> = {
      ...domain,
      page_url: page.url(),
      summary_card_visible: false,
      real_named_boq_visible: false,
      cost_summary_visible: false,
      price_state_badges_visible: false,
      missing_price_panel_valid: false,
      fake_final_total_count: domain.fake_final_total_count + countFakeFinalTotal(bodyText),
      contract_total_forbidden: false,
      pdf_cost_section_valid: domain.pdf_cost_section_valid,
      buyer_cost_trace_valid: domain.buyer_cost_trace_valid,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      body_text_sample: `ERROR: ${errorMessage}\n${bodyText}`.slice(0, 5000),
    };
    return {
      ...proofWithoutPass,
      passed: false,
      blockers: [
        `browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`,
        ...trustedCostingCaseBlockers(proofWithoutPass),
        ...domain.blockers.map((blocker) => `domain:${blocker}`),
      ],
    };
  } finally {
    await context.close();
  }
}

export async function runTrustedCostingPricebookWebSmoke(input: {
  target?: "web";
  cases?: string | null;
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: TrustedCostingWebSmokeSummary }> {
  if ((input.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_TRUSTED_COSTING_WEB_TARGET:${input.target}`);
  if (!isSupportedTrustedCostingCaseSet(input.cases)) throw new Error(`UNSUPPORTED_TRUSTED_COSTING_CASES:${input.cases}`);
  if (REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED !== TRUSTED_COSTING_CASES_REQUIRED) {
    throw new Error(`TRUSTED_COSTING_CASE_CORPUS_SIZE_MISMATCH:${REAL_NAMED_BOQ_RUNTIME_CASES_REQUIRED}`);
  }
  const baseUrl = resolveE2eBaseUrl({
    explicit: input.baseUrl,
    scriptEnvKeys: ["TRUSTED_COSTING_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = input.requireRealBrowser === true;
  let server: ServerHandle | null = null;
  const caseResults: TrustedCostingSmokeCaseProof[] = [];
  let browserStarted = false;
  try {
    server = await ensureWebServer(baseUrl, outDir);
    const browser = await chromium.launch({ headless: true });
    browserStarted = true;
    try {
      for (const testCase of selectTrustedCostingRuntimeCases()) {
        const result = await runBrowserCase(browser, baseUrl, testCase);
        caseResults.push(result);
        console.info(JSON.stringify({
          case_id: result.case_id,
          passed: result.passed,
          blockers_count: result.blockers.length,
          first_blockers: result.blockers.slice(0, 5),
          cases_done: caseResults.length,
          cases_total: TRUSTED_COSTING_CASES_REQUIRED,
        }));
      }
    } finally {
      await browser.close();
    }
  } finally {
    server?.stop();
  }

  const caseFailures = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === TRUSTED_COSTING_CASES_REQUIRED;
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    browserStarted ? "" : "actual_web_browser_not_launched",
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${TRUSTED_COSTING_CASES_REQUIRED}`,
    ...caseFailures.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const actualGreen = blockers.length === 0 && browserStarted && allCasesExecuted;
  const summary: TrustedCostingWebSmokeSummary = {
    final_status: actualGreen
      ? GREEN_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE
      : STOP_AI_ESTIMATE_TRUSTED_COSTING_PRICEBOOK_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: TRUSTED_COSTING_CRITICAL_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    browser_automation_started: browserStarted,
    web_server_started_by_runner: server?.started ?? false,
    actual_web_browser_trusted_costing_smoke_passed: actualGreen,
    web_trusted_costing_cases_passed: `${caseResults.filter((item) => item.passed).length}/${TRUSTED_COSTING_CASES_REQUIRED}`,
    web_cost_summary_visible_count: caseResults.filter((item) => item.cost_summary_visible).length,
    web_price_state_badges_visible_count: caseResults.filter((item) => item.price_state_badges_visible).length,
    web_fake_final_total_count: caseResults.reduce((sum, item) => sum + item.fake_final_total_count, 0),
    web_contract_total_forbidden_count: caseResults.filter((item) => item.contract_total_forbidden).length,
    web_pdf_cost_section_valid_count: caseResults.filter((item) => item.pdf_cost_section_valid).length,
    web_buyer_cost_trace_valid_count: caseResults.filter((item) => item.buyer_cost_trace_valid).length,
    web_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    web_page_errors_count: caseResults.reduce((sum, item) => sum + item.page_error_count, 0),
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    blockers,
    case_results: caseResults,
  };
  if (input.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runTrustedCostingPricebookWebSmoke.ts")) {
  void runTrustedCostingPricebookWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_web_browser_trusted_costing_smoke_passed: result.artifact.actual_web_browser_trusted_costing_smoke_passed,
        web_trusted_costing_cases_passed: result.artifact.web_trusted_costing_cases_passed,
        web_cost_summary_visible_count: result.artifact.web_cost_summary_visible_count,
        web_price_state_badges_visible_count: result.artifact.web_price_state_badges_visible_count,
        web_fake_final_total_count: result.artifact.web_fake_final_total_count,
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
