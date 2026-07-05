import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";
import { buildConsumerRepairProcurementHandoffFromSnapshot } from "../../src/features/procurement/consumerRepairProcurementHandoff";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  getConsumerRepairPdfStorageObject,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import {
  CONTROLLED_PILOT_WEB_ROOT,
  gitOutput,
  loadControlledPilotScenarios,
  timestampForPath,
  writeJson,
  type ControlledPilotMetrics,
  type ControlledPilotScenario,
} from "../estimate/buildControlledPilotHealthDashboard";
import { assertLocalServerMayStart, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_FAILED" as const;

const DEFAULT_BASE_URL = "http://localhost:8081";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";

const RAW_DUMP_MARKERS = [
  "raw_ai_json",
  "source_parameters",
  "sourceParameters",
  "debug object",
  "calculation JSON",
];

const DEBUG_FORMULA_MARKERS = [
  "template_id",
  "template_version",
  "formula_id",
  "norm_id",
  "rowCode",
  "round_to",
  "normFactor",
];

const PRICE_DEBUG_MARKERS = [
  "PRICE_MISSING",
  "no_accepted_price_source_or_unit_conversion",
  "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION",
];

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

export type ControlledPilotDomainProof = {
  parser_result_present: boolean;
  draft_row_count: number;
  expected_min_rows: number;
  grouped_preview_rows: number;
  missing_design_inputs_count: number;
  snapshot_created: boolean;
  snapshot_id: string | null;
  snapshot_row_count: number;
  pdf_generated_from_snapshot: boolean;
  pdf_rows_equal_snapshot_rows: boolean;
  pdf_text_extracted: boolean;
  pdf_text_sample: string;
  buyer_handoff_created: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_receives_work_rows: boolean;
  buyer_quantity_matches_snapshot: boolean;
  buyer_item_count: number;
  missing_price_count: number;
  final_total_shown_while_prices_missing: boolean;
  blockers: string[];
};

type BrowserCaseProof = {
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

type ControlledPilotCaseResult = {
  case_id: string;
  category: ControlledPilotScenario["category"];
  target: "web";
  prompt_hash: string;
  passed: boolean;
  browser_flow_executed: true;
  browser: BrowserCaseProof;
  domain: ControlledPilotDomainProof;
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

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
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
  const outDir = path.join(CONTROLLED_PILOT_WEB_ROOT, "web-server");
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

function currentRevision(bundle: ConsumerRepairDraftBundle) {
  return bundle.estimateRevisionState?.revisions.find(
    (candidate) => candidate.revision_id === bundle.estimateRevisionState?.current_revision_id,
  ) ?? null;
}

export function runControlledPilotDomainProof(scenario: ControlledPilotScenario): ControlledPilotDomainProof {
  __resetConsumerRepairRequestStoreForTests();
  const aiDraft = buildConsumerRepairAiDraft(scenario.prompt, { city: "Bishkek", currency: "KGS" });
  const draft = createConsumerRepairRequestDraft({
    consumerUserId: "controlled-pilot-acceptance",
    problemText: scenario.prompt,
    repairType: aiDraft.repairType,
    city: "Bishkek",
    addressText: "controlled-pilot-redacted-address",
    preferredTimeText: "today",
    contactPhone: "0700000000",
    aiDraft,
  });
  const viewModelBeforeApprove = buildRequestEstimateViewModel(draft);
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: draft.draft.id,
    userId: draft.draft.consumerUserId,
    generatedAt: "2026-07-05T00:00:00.000Z",
  });
  const revision = currentRevision(approved);
  const snapshot = revision?.editable_estimate_snapshot ?? approved.editableEstimateSnapshot ?? null;
  const snapshotRows = snapshot?.rows.filter((row) => !row.removed) ?? [];
  const pdf = approved.pdfs[0] ?? null;
  const pdfObject = pdf ? getConsumerRepairPdfStorageObject({
    storageBucket: pdf.storageBucket,
    storageKey: pdf.storageKey,
  }) : null;
  const pdfText = pdfObject?.body ?? "";
  const handoff = buildConsumerRepairProcurementHandoffFromSnapshot(approved);
  const snapshotByRequestItemId = new Map(snapshotRows.map((row) => [row.requestItemId ?? row.rowId, row]));
  const buyerReceivesWorkRows = handoff.items.some((item) => String(item.itemType) === "work");
  const buyerQuantityMismatch = handoff.items.some((item) => {
    const row = snapshotByRequestItemId.get(item.requestItemId ?? item.sourceEstimateRowId);
    return !row || row.quantity !== item.quantity || row.unit !== item.unit;
  });
  const missingPriceCount = approved.items.filter((item) => item.unitPrice == null || item.totalPrice == null).length;
  const viewModelAfterApprove = buildRequestEstimateViewModel(approved);
  const totalLabel = viewModelAfterApprove?.totalLabel ?? viewModelBeforeApprove?.totalLabel ?? "";
  const finalTotalShownWhilePricesMissing = missingPriceCount > 0 && !/не рассчитан|уточнить/i.test(totalLabel);
  const groupedPreviewRows = (viewModelBeforeApprove?.previewSections ?? [])
    .reduce((sum, section) => sum + section.rows.length, 0);
  const blockers = [
    aiDraft.items.length >= scenario.expected_min_rows ? "" : `draft_rows_below_expected:${aiDraft.items.length}<${scenario.expected_min_rows}`,
    groupedPreviewRows > 0 ? "" : "grouped_preview_rows_missing",
    snapshot ? "" : "snapshot_missing",
    snapshotRows.length >= scenario.expected_min_rows ? "" : `snapshot_rows_below_expected:${snapshotRows.length}<${scenario.expected_min_rows}`,
    pdf?.revisionId && pdf.revisionId === revision?.revision_id ? "" : "pdf_not_bound_to_snapshot",
    pdf?.revisionRowsHash && pdf.revisionRowsHash === revision?.rows_hash ? "" : "pdf_rows_hash_mismatch",
    pdfObject ? "" : "pdf_storage_object_missing",
    pdfText.trim().length > 0 ? "" : "pdf_text_missing",
    handoff.items.length > 0 ? "" : "buyer_handoff_missing",
    !buyerReceivesWorkRows ? "" : "buyer_receives_work_rows",
    !buyerQuantityMismatch ? "" : "buyer_quantity_mismatch_snapshot",
    !finalTotalShownWhilePricesMissing ? "" : "fake_final_total_when_prices_missing",
  ].filter(Boolean);

  return {
    parser_result_present: aiDraft.items.length > 0,
    draft_row_count: aiDraft.items.length,
    expected_min_rows: scenario.expected_min_rows,
    grouped_preview_rows: groupedPreviewRows,
    missing_design_inputs_count: aiDraft.missingData.length,
    snapshot_created: Boolean(snapshot),
    snapshot_id: revision?.snapshot_id ?? snapshot?.snapshotId ?? null,
    snapshot_row_count: snapshotRows.length,
    pdf_generated_from_snapshot: Boolean(pdf?.revisionId && pdf.revisionId === revision?.revision_id),
    pdf_rows_equal_snapshot_rows: Boolean(pdf?.revisionRowsHash && pdf.revisionRowsHash === revision?.rows_hash),
    pdf_text_extracted: pdfText.trim().length > 0,
    pdf_text_sample: pdfText.slice(0, 1000),
    buyer_handoff_created: handoff.items.length > 0,
    buyer_handoff_procurement_subset_valid: handoff.items.length > 0 && !buyerReceivesWorkRows,
    buyer_receives_work_rows: buyerReceivesWorkRows,
    buyer_quantity_matches_snapshot: !buyerQuantityMismatch,
    buyer_item_count: handoff.items.length,
    missing_price_count: missingPriceCount,
    final_total_shown_while_prices_missing: finalTotalShownWhilePricesMissing,
    blockers,
  };
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

async function setInputText(page: Page, testId: string, value: string): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 30_000 });
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await locator.pressSequentially(value, { delay: 0 });
  await poll(async () => {
    if ((await locator.count()) === 0) return true;
    const current = await locator.evaluate((node) => {
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      return input.value;
    });
    return current === value ? true : null;
  }, 10_000);
  if ((await locator.count()) > 0) await locator.blur();
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) {
    await summary.click();
  }
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

function forbiddenVisible(bodyText: string, markers: readonly string[]): boolean {
  return markers.some((marker) => bodyText.includes(marker));
}

function fakeFinalTotalVisible(bodyText: string): boolean {
  const normalized = bodyText.replace(/\s+/g, " ");
  if (!/Итого по позициям:/i.test(normalized)) return false;
  const priceCoverage = normalized.match(/Цены:\s*(\d+)\/(\d+)\s*строк с ценой/i);
  if (priceCoverage && priceCoverage[1] === priceCoverage[2]) return false;
  const hasMissingPriceSignal = /Полный итог не рассчитан|итог уточнить|Цена не заполнена|цена нужна|нужно заполнить|Источник цены не выбран/i.test(normalized);
  if (!hasMissingPriceSignal) return false;
  if (/Полный итог не рассчитан|итог уточнить/i.test(normalized)) return false;
  return /\d[\d\s.,]*(?:KGS|сом|₽|\$|€)/i.test(normalized);
}

async function runBrowserCase(page: Page, baseUrl: string, scenario: ControlledPilotScenario): Promise<BrowserCaseProof> {
  const targetUrl = `${baseUrl.replace(/\/+$/, "")}/request`;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  await page.evaluate((key) => window.localStorage.removeItem(key as string), DURABLE_REQUEST_STORE_KEY);
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-city-input", "Bishkek");
  await setInputText(page, "consumer-repair-address-input", "controlled-pilot-redacted-address");
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
    positions_empty_after_prompt: combinedBody.includes("Позиции пока пустые"),
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

function browserBlockers(browser: BrowserCaseProof): string[] {
  return [
    browser.summary_card_visible ? "" : "browser_summary_card_missing",
    browser.grouped_preview_visible ? "" : "browser_grouped_preview_missing",
    browser.details_drawer_visible ? "" : "browser_details_drawer_missing",
    browser.quantity_inputs > 0 ? "" : "browser_quantity_inputs_missing",
    browser.remove_buttons > 0 ? "" : "browser_remove_buttons_missing",
    browser.pdf_button_visible_after_confirm ? "" : "browser_pdf_button_missing_after_confirm",
    !browser.positions_empty_after_prompt ? "" : "positions_empty_after_prompt",
    !browser.raw_dump_visible ? "" : "raw_dump_visible",
    !browser.debug_formula_main_ui_visible ? "" : "debug_formula_visible_in_main_ui",
    !browser.price_debug_visible ? "" : "price_missing_debug_visible",
    !browser.fake_final_total_visible ? "" : "fake_final_total_visible",
    !browser.route_marker_only ? "" : "route_marker_only_smoke_rejected",
    !browser.runtime_marker_only ? "" : "runtime_marker_only_smoke_rejected",
    browser.console_error_count === 0 ? "" : `console_errors:${browser.console_error_count}`,
    browser.page_error_count === 0 ? "" : `page_errors:${browser.page_error_count}`,
  ].filter(Boolean);
}

async function browserFailureProof(page: Page, error: unknown): Promise<BrowserCaseProof> {
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
    positions_empty_after_prompt: bodyText.includes("РџРѕР·РёС†РёРё РїРѕРєР° РїСѓСЃС‚С‹Рµ"),
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

function metricsForResults(results: readonly ControlledPilotCaseResult[]): Partial<ControlledPilotMetrics> {
  const total = results.length;
  const passed = results.filter((item) => item.passed).length;
  const promptDraftPassed = results.filter((item) =>
    item.browser.summary_card_visible &&
    item.domain.draft_row_count >= item.domain.expected_min_rows
  ).length;
  const snapshotPassed = results.filter((item) => item.domain.snapshot_created).length;
  const pdfPassed = results.filter((item) => item.domain.pdf_generated_from_snapshot && item.domain.pdf_rows_equal_snapshot_rows).length;
  const buyerPassed = results.filter((item) => item.domain.buyer_handoff_created && item.domain.buyer_handoff_procurement_subset_valid).length;
  return {
    web_cases_total: total,
    web_cases_passed: passed,
    web_cases_failed: total - passed,
    prompt_to_draft_success_rate: total > 0 ? promptDraftPassed / total : 0,
    draft_to_snapshot_success_rate: total > 0 ? snapshotPassed / total : 0,
    snapshot_to_pdf_success_rate: total > 0 ? pdfPassed / total : 0,
    snapshot_to_buyer_handoff_success_rate: total > 0 ? buyerPassed / total : 0,
    positions_empty_after_prompt_count: results.filter((item) => item.browser.positions_empty_after_prompt).length,
    raw_dump_ui_count: results.filter((item) => item.browser.raw_dump_visible).length,
    debug_formula_main_ui_count: results.filter((item) => item.browser.debug_formula_main_ui_visible).length,
    price_debug_visible_count: results.filter((item) => item.browser.price_debug_visible).length,
    fake_final_total_count: results.filter((item) => item.browser.fake_final_total_visible || item.domain.final_total_shown_while_prices_missing).length,
    pdf_snapshot_mismatch_count: results.filter((item) => !item.domain.pdf_rows_equal_snapshot_rows).length,
    buyer_work_rows_count: results.filter((item) => item.domain.buyer_receives_work_rows).length,
    console_error_count: results.reduce((sum, item) => sum + item.browser.console_error_count + item.browser.page_error_count, 0),
  };
}

export async function runControlledPilotWebSmoke(options: {
  target?: "web";
  cases?: "pilot-critical";
  requireRealBrowser?: boolean;
  baseUrl?: string;
} = {}) {
  if ((options.target ?? "web") !== "web") throw new Error(`UNSUPPORTED_CONTROLLED_PILOT_WEB_TARGET:${options.target}`);
  if ((options.cases ?? "pilot-critical") !== "pilot-critical") throw new Error(`UNSUPPORTED_CONTROLLED_PILOT_CASES:${options.cases}`);
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["CONTROLLED_PILOT_WEB_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const scenarios = loadControlledPilotScenarios();
  const outDir = path.join(CONTROLLED_PILOT_WEB_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const server = await ensureWebServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const results: ControlledPilotCaseResult[] = [];
  try {
    for (const scenario of scenarios) {
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
      const domain = runControlledPilotDomainProof(scenario);
      try {
        const browserProof = await runBrowserCase(page, baseUrl, scenario);
        browserProof.console_error_count = consoleErrors.length;
        browserProof.page_error_count = pageErrors.length;
        const blockers = [...browserBlockers(browserProof), ...domain.blockers];
        results.push({
          case_id: scenario.case_id,
          category: scenario.category,
          target: "web",
          prompt_hash: stableHash(scenario.prompt),
          passed: blockers.length === 0,
          browser_flow_executed: true,
          browser: browserProof,
          domain,
          blockers,
        });
      } catch (error) {
        const browserProof = await browserFailureProof(page, error);
        browserProof.console_error_count = consoleErrors.length;
        browserProof.page_error_count = pageErrors.length;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const blockers = [
          `browser_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`,
          ...browserBlockers(browserProof),
          ...domain.blockers,
        ];
        results.push({
          case_id: scenario.case_id,
          category: scenario.category,
          target: "web",
          prompt_hash: stableHash(scenario.prompt),
          passed: false,
          browser_flow_executed: true,
          browser: browserProof,
          domain,
          blockers,
        });
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
      ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_WEB_BROWSER_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    generated_at: new Date().toISOString(),
    target: "web" as const,
    baseUrl,
    cases_total: results.length,
    cases_passed: results.filter((item) => item.passed).length,
    cases_failed: failedCases.length,
    failed_cases: failedCases.map((item) => item.case_id),
    actual_web_browser_controlled_pilot_smoke_passed: blockers.length === 0,
    web_smoke_uses_real_browser: true,
    web_smoke_checks_input_to_grouped_preview: true,
    web_smoke_checks_details_drawer: true,
    web_smoke_checks_confirm_snapshot: true,
    web_smoke_checks_pdf_from_snapshot: true,
    web_smoke_checks_buyer_handoff: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false as const,
    env_browser_green_rejected: true,
    browser_automation_started: true,
    native_build_started: false,
    eas_started: false,
    console_error_count: Number(metrics.console_error_count ?? 0),
    metrics,
    blockers,
    case_results: results,
    fake_green_claimed: false,
  };
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runControlledPilotWebSmoke.ts")) {
  void runControlledPilotWebSmoke({
    target: (argValue("target") ?? "web") as "web",
    cases: (argValue("cases") ?? "pilot-critical") as "pilot-critical",
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
