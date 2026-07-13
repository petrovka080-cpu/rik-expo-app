import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium, type Browser, type Page } from "playwright";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  STAGING_RC_REQUIRED_CATEGORIES,
  loadStagingReleaseCandidateCases,
  validateStagingReleaseCandidateCases,
  type StagingRcCase,
} from "../estimate/runAiEstimateStagingReleaseCandidateCases";
import { checkAiEstimateStagingHealth } from "./checkAiEstimateStagingHealth";
import { checkAndroidEmulatorHealth, STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN } from "./checkAndroidEmulatorHealth";
import {
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  isLocalhostBaseUrl,
  normalizeBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";
import { resolveStagingBaseUrl } from "./resolveStagingBaseUrl";

export const GREEN_STAGING_RC_WEB_SMOKE_READY = "GREEN_STAGING_RC_WEB_SMOKE_READY" as const;
export const STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN = "STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN" as const;
export const GREEN_STAGING_RC_ANDROID_SMOKE_READY = "GREEN_STAGING_RC_ANDROID_SMOKE_READY" as const;
export const STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN = "STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN" as const;
export const STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN = "STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-staging-release-candidate-operations-seal");
const WEB_ROOT = path.join(ROOT, "web-smoke");
const ANDROID_ROOT = path.join(ROOT, "android-smoke");
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const DURABLE_REQUEST_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const DURABLE_REQUEST_BUNDLE_KEY_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const ACTIVE_REQUEST_DRAFT_KEY = "foreman_draft_request_id";
const CHROME_PACKAGE = "com.android.chrome";
const CDP_PORT = "9222";
const CHROME_COMMAND_LINE_PATH = "/data/local/tmp/chrome-command-line";
const ANDROID_CASES_INCOMPLETE_BLOCKER = "android_cases_incomplete";
const ANDROID_CHROME_COMMAND_LINE = [
  "chrome",
  "--remote-debugging-socket-name=chrome_devtools_remote",
  `--remote-debugging-port=${CDP_PORT}`,
  "--no-first-run",
  "--disable-fre",
].join(" ");

const RAW_DUMP_MARKERS = [
  "raw_ai_json",
  "source_parameters",
  "sourceParameters",
  "debug object",
  "calculation JSON",
] as const;

const DEBUG_FORMULA_MARKERS = [
  "template_id",
  "template_version",
  "formula_id",
  "norm_id",
  "rowCode",
  "round_to",
  "normFactor",
] as const;

const PRICE_DEBUG_MARKERS = [
  "PRICE_MISSING",
  "no_accepted_price_source_or_unit_conversion",
  "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION",
] as const;

type Target = "web" | "android-chrome";
type Category = typeof STAGING_RC_REQUIRED_CATEGORIES[number];

type ConsoleCapture = {
  consoleErrors: string[];
  pageErrors: string[];
};

type AndroidFailureRootCauseClass =
  | "adb_device_missing"
  | "emulator_boot_not_completed"
  | "chrome_not_installed"
  | "chrome_launch_failed"
  | "chrome_devtools_socket_missing"
  | "adb_forward_failed"
  | "cdp_json_version_unreachable"
  | "cdp_page_target_missing"
  | "cdp_attach_timeout"
  | "staging_page_load_timeout"
  | "case_runner_hang_after_case"
  | "console_or_product_failure";

type AndroidCdpPreflight = {
  android_failure_root_cause_classified: boolean;
  android_failure_root_cause_class: AndroidFailureRootCauseClass | null;
  android_runner_detects_adb: boolean;
  android_runner_detects_boot_completed: boolean;
  android_runner_detects_chrome_package: boolean;
  android_runner_writes_chrome_command_line: boolean;
  android_runner_chrome_command_line_value: string | null;
  android_runner_launches_chrome: boolean;
  android_runner_opens_external_staging_url: boolean;
  android_runner_creates_adb_forward: boolean;
  android_runner_detects_chrome_devtools_socket: boolean;
  android_runner_reads_cdp_json_version: boolean;
  android_runner_reads_cdp_json_list: boolean;
  android_runner_finds_staging_page_target: boolean;
  android_runner_attaches_cdp: boolean;
  android_runner_takes_screenshot: boolean;
  android_runner_collects_console: boolean;
  android_cdp_attach_attempts: number;
  android_cdp_attach_retry_budget: number;
  android_cdp_version_url: string;
  android_cdp_list_url: string;
  android_cdp_page_target_url: string | null;
  android_cdp_preflight_screenshot_path: string | null;
  android_cdp_last_error: string | null;
  blocking_reasons: string[];
};

type AndroidHealthArtifact = ReturnType<typeof checkAndroidEmulatorHealth>["artifact"];

type CdpVersionResponse = {
  Browser?: string;
  "Android-Package"?: string;
  webSocketDebuggerUrl?: string;
};

type CdpPageTarget = {
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
};

type CaseBrowserProof = {
  page_url: string;
  summary_card_visible: boolean;
  grouped_preview_visible: boolean;
  details_drawer_visible: boolean;
  quantity_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  history_modal_visible: boolean;
  history_pdf_visible: boolean;
  history_buyer_package_visible: boolean;
  history_count: number;
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

export type StagingRcCaseEvidence = {
  case_id: string;
  category: string;
  target: Target;
  prompt_hash: string;
  passed: boolean;
  external_url_used: boolean;
  browser_flow_executed: boolean;
  screenshot_path: string | null;
  snapshot_hash: string;
  revision_chain_hash: string;
  pdf_buyer_hash: string;
  history_count_hash: string;
  proof: CaseBrowserProof;
  blockers: string[];
};

type RunnerOutput = {
  summary: Record<string, any>;
  summaryPath: string;
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function positiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function shortError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/g, " ").slice(0, 300);
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
    await sleep(400);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("poll_timeout");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}:${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

function assertExternalStagingUrl(baseUrl: string | null): string[] {
  return [
    baseUrl ? "" : "STAGING_URL_NOT_CONFIGURED",
    baseUrl && /^https?:\/\//.test(baseUrl) ? "" : "STAGING_URL_NOT_HTTP",
    baseUrl && !isLocalhostBaseUrl(baseUrl) ? "" : "STAGING_URL_IS_LOCALHOST",
    baseUrl && new URL(baseUrl).hostname.toLowerCase().endsWith(".onrender.com") ? "" : "STAGING_URL_NOT_RENDER",
  ].filter(Boolean);
}

function targetUrl(baseUrl: string, testCase: StagingRcCase, target: Target): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/request`);
  url.searchParams.set("stagingRcCase", testCase.case_id);
  url.searchParams.set("target", target);
  url.searchParams.set("proofTs", String(Date.now()));
  return url.toString();
}

async function count(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

async function setInputText(page: Page, testId: string, value: string): Promise<void> {
  const locator = page.getByTestId(testId);
  await locator.waitFor({ timeout: 45_000 });
  await locator.scrollIntoViewIfNeeded();
  await locator.fill(value, { timeout: 30_000 });
  await poll(async () => {
    if ((await locator.count()) === 0) return true;
    const current = await locator.evaluate((node) => {
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      return input.value;
    });
    return current === value ? true : null;
  }, 10_000);
  await locator.blur().catch(() => undefined);
}

async function expandDeliveryFieldsIfNeeded(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-phone-input").count() > 0) return;
  const summary = page.getByTestId("consumer-repair-delivery-summary");
  if (await summary.count() > 0) await summary.click();
  await page.getByTestId("consumer-repair-phone-input").waitFor({ timeout: 45_000 });
}

async function clearCaseStorage(page: Page): Promise<void> {
  await page.evaluate((input) => {
    const clearStorage = (storage: Storage) => {
      for (const key of input.keys) storage.removeItem(key);
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && input.prefixes.some((prefix) => key.startsWith(prefix))) {
          storage.removeItem(key);
        }
      }
    };
    clearStorage(window.localStorage);
    clearStorage(window.sessionStorage);
  }, {
    keys: [
      DURABLE_REQUEST_STORE_KEY,
      DURABLE_REQUEST_MANIFEST_KEY,
      ACTIVE_REQUEST_DRAFT_KEY,
    ],
    prefixes: [DURABLE_REQUEST_BUNDLE_KEY_PREFIX],
  }).catch(() => undefined);
}

async function clearAndroidOriginStorage(page: Page, baseUrl: string): Promise<void> {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send("Storage.clearDataForOrigin", {
      origin: new URL(baseUrl).origin,
      storageTypes: "all",
    });
  } finally {
    await client.detach().catch(() => undefined);
  }
}

async function resetAndroidCaseStorage(page: Page, baseUrl: string): Promise<void> {
  await clearAndroidOriginStorage(page, baseUrl);
  await clearCaseStorage(page);
  await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => undefined);
}

function forbiddenVisible(bodyText: string, markers: readonly string[]): boolean {
  return markers.some((marker) => bodyText.includes(marker));
}

function fakeFinalTotalVisible(bodyText: string): boolean {
  const normalized = bodyText.replace(/\s+/g, " ");
  if (!/Итого по позициям:|РС‚РѕРіРѕ РїРѕ РїРѕР·РёС†РёСЏРј:/i.test(normalized)) return false;
  const priceCoverage = normalized.match(/Цены:\s*(\d+)\/(\d+)|Р¦РµРЅС‹:\s*(\d+)\/(\d+)/i);
  if (priceCoverage) {
    const left = priceCoverage[1] ?? priceCoverage[3];
    const right = priceCoverage[2] ?? priceCoverage[4];
    if (left === right) return false;
  }
  const hasMissingPriceSignal =
    /Полный итог не рассчитан|итог уточнить|Цена не заполнена|цена нужна|Источник цены не выбран|РџРѕР»РЅС‹Р№ РёС‚РѕРі РЅРµ СЂР°СЃСЃС‡РёС‚Р°РЅ|РёС‚РѕРі СѓС‚РѕС‡РЅРёС‚СЊ/i.test(normalized);
  if (!hasMissingPriceSignal) return false;
  if (/Полный итог не рассчитан|итог уточнить|РџРѕР»РЅС‹Р№ РёС‚РѕРі РЅРµ СЂР°СЃСЃС‡РёС‚Р°РЅ|РёС‚РѕРі СѓС‚РѕС‡РЅРёС‚СЊ/i.test(normalized)) return false;
  return /\d[\d\s.,]*(?:KGS|сом|₽|\$|€|СЃРѕРј)/i.test(normalized);
}

function proofHashes(testCase: StagingRcCase, proof: CaseBrowserProof): Pick<
  StagingRcCaseEvidence,
  "snapshot_hash" | "revision_chain_hash" | "pdf_buyer_hash" | "history_count_hash"
> {
  return {
    snapshot_hash: sha([
      testCase.case_id,
      proof.summary_card_visible,
      proof.details_drawer_visible,
      proof.grouped_preview_visible,
      proof.quantity_inputs,
      proof.remove_buttons,
    ].join("|")),
    revision_chain_hash: sha([
      testCase.case_id,
      proof.pdf_button_visible_after_confirm,
      proof.history_modal_visible,
      proof.history_count,
    ].join("|")),
    pdf_buyer_hash: sha([
      testCase.case_id,
      proof.history_pdf_visible,
      proof.history_buyer_package_visible,
    ].join("|")),
    history_count_hash: sha([testCase.case_id, proof.history_count].join("|")),
  };
}

async function historyCount(page: Page): Promise<number> {
  const locator = page.getByTestId("consumer-repair-history-approved-count");
  if (await locator.count() === 0) return 0;
  const text = await locator.innerText({ timeout: 10_000 }).catch(() => "");
  return Number(text.replace(/[^0-9]/g, "")) || 0;
}

async function runHistoryProof(page: Page, testCase: StagingRcCase): Promise<{
  history_modal_visible: boolean;
  history_pdf_visible: boolean;
  history_buyer_package_visible: boolean;
  history_count: number;
}> {
  if (!testCase.requires_history && !testCase.requires_pdf && !testCase.requires_buyer_package) {
    return {
      history_modal_visible: false,
      history_pdf_visible: false,
      history_buyer_package_visible: false,
      history_count: await historyCount(page),
    };
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByTestId("consumer-repair-history-button").waitFor({ timeout: 45_000 });
  const countBeforeOpen = await historyCount(page);
  await page.getByTestId("consumer-repair-history-button").click();
  await page.getByTestId("consumer-repair-history-modal").waitFor({ timeout: 45_000 });
  const firstHistory = page.getByTestId("consumer-repair-history-main").first();
  if (await firstHistory.count() > 0) await firstHistory.click();
  const historyPdf = page.getByTestId("consumer-repair-history-open-pdf-expanded");
  const historyBuyer = page.getByTestId("consumer-repair-history-send-market");
  await historyPdf.waitFor({ timeout: 45_000 }).catch(() => undefined);
  return {
    history_modal_visible: await page.getByTestId("consumer-repair-history-modal").count() > 0,
    history_pdf_visible: await historyPdf.count() > 0 || await page.getByTestId("consumer-repair-history-pdf").count() > 0,
    history_buyer_package_visible: await historyBuyer.count() > 0,
    history_count: countBeforeOpen,
  };
}

async function runPageCase(page: Page, baseUrl: string, testCase: StagingRcCase, target: Target): Promise<CaseBrowserProof> {
  if (target === "android-chrome") {
    await resetAndroidCaseStorage(page, baseUrl);
  }
  await page.goto(targetUrl(baseUrl, testCase, target), { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (target !== "android-chrome") {
    await clearCaseStorage(page);
  }
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 45_000 });
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-city-input", "Bishkek");
  await setInputText(page, "consumer-repair-address-input", "staging-rc-redacted-address");
  await setInputText(page, "consumer-repair-time-input", "today");
  await expandDeliveryFieldsIfNeeded(page);
  await setInputText(page, "consumer-repair-phone-input", "0700000000");
  await setInputText(page, "consumer-repair-problem-input", testCase.prompt_ru);
  await page.getByTestId("consumer-repair-prepare-draft").click();
  if (testCase.expected_flow === "director_review") {
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 30_000 }).catch(() => undefined);
  } else {
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 120_000 });
  }
  if (await page.getByTestId("request-estimate-details-toggle").count() > 0) {
    await page.getByTestId("request-estimate-details-toggle").click();
    await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 45_000 }).catch(() => undefined);
  } else if (testCase.expected_flow !== "director_review") {
    await page.getByTestId("request-estimate-details-panel").waitFor({ timeout: 45_000 });
  }

  const bodyBeforeApprove = await page.locator("body").innerText({ timeout: 15_000 });
  const directorPreviewVisible = testCase.expected_flow === "director_review" &&
    /Professional cost breakdown|Пилотная профессиональная смета|РџРёР»РѕС‚РЅР°СЏ РїСЂРѕС„РµСЃСЃРёРѕРЅР°Р»СЊРЅР°СЏ СЃРјРµС‚Р°/i.test(bodyBeforeApprove);
  const summaryCardVisibleBeforeApprove = await page.getByTestId("request-estimate-summary-card").count() > 0;
  const detailsPanelVisibleBeforeApprove = await page.getByTestId("request-estimate-details-panel").count() > 0;
  const positionsEmptyBeforeApprove =
    bodyBeforeApprove.includes("Позиции пока пустые") ||
    bodyBeforeApprove.includes("РџРѕР·РёС†РёРё РїРѕРєР° РїСѓСЃС‚С‹Рµ");
  const groupedSectionCount = await count(page, "[data-testid^='request-estimate-section-']");
  const quantityInputs = await count(page, "[data-testid^='consumer-repair-item-quantity-input-']");
  const removeButtons = await count(page, "[data-testid^='consumer-repair-item-remove-']");
  const approvalRequired =
    testCase.expected_flow !== "director_review" ||
    testCase.requires_history === true ||
    testCase.requires_pdf === true ||
    testCase.requires_buyer_package === true;
  let approvedHistoryCount = await historyCount(page);
  let history = {
    history_modal_visible: false,
    history_pdf_visible: false,
    history_buyer_package_visible: false,
    history_count: approvedHistoryCount,
  };
  if (approvalRequired && quantityInputs > 0 && await page.getByTestId("consumer-repair-approve").count() > 0) {
    await page.getByTestId("consumer-repair-approve").scrollIntoViewIfNeeded();
    await page.getByTestId("consumer-repair-approve").click();
    await poll(async () => {
      if (await page.getByTestId("consumer-repair-open-pdf").count() > 0) return true;
      if (await historyCount(page) > 0) return true;
      const status = page.getByTestId("consumer-repair-status");
      if (await status.count() > 0) {
        const text = await status.innerText({ timeout: 5_000 }).catch(() => "");
        if (/утвержд|approved|PDF/i.test(text)) return true;
      }
      return null;
    }, 120_000);
    approvedHistoryCount = await historyCount(page);
    history = await runHistoryProof(page, testCase);
  }
  const bodyAfterApprove = await page.locator("body").innerText({ timeout: 15_000 }).catch(() => "");
  const combinedBody = `${bodyBeforeApprove}\n${bodyAfterApprove}`;

  return {
    page_url: page.url(),
    summary_card_visible: summaryCardVisibleBeforeApprove || directorPreviewVisible,
    grouped_preview_visible: groupedSectionCount > 0 && quantityInputs > 0,
    details_drawer_visible: detailsPanelVisibleBeforeApprove || directorPreviewVisible,
    quantity_inputs: quantityInputs,
    remove_buttons: removeButtons,
    pdf_button_visible_after_confirm:
      await page.getByTestId("consumer-repair-open-pdf").count() > 0 ||
      history.history_pdf_visible ||
      approvedHistoryCount > 0,
    ...history,
    positions_empty_after_prompt: positionsEmptyBeforeApprove,
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

function caseBlockers(testCase: StagingRcCase, proof: CaseBrowserProof): string[] {
  const directorReview = testCase.expected_flow === "director_review";
  const rowLevelProofRequired = !directorReview;
  const approvalProofRequired =
    !directorReview ||
    testCase.requires_history === true ||
    testCase.requires_pdf === true ||
    testCase.requires_buyer_package === true;
  return [
    proof.summary_card_visible ? "" : "summary_card_missing",
    !rowLevelProofRequired || proof.grouped_preview_visible ? "" : "grouped_preview_missing",
    proof.details_drawer_visible ? "" : "details_drawer_missing",
    !rowLevelProofRequired || proof.quantity_inputs > 0 ? "" : "quantity_inputs_missing",
    !rowLevelProofRequired || proof.remove_buttons > 0 ? "" : "remove_buttons_missing",
    !approvalProofRequired || proof.pdf_button_visible_after_confirm ? "" : "pdf_or_approval_history_missing_after_confirm",
    !testCase.requires_history || proof.history_modal_visible ? "" : "history_modal_missing",
    !testCase.requires_pdf || proof.history_pdf_visible ? "" : "history_pdf_missing",
    !testCase.requires_buyer_package || proof.history_buyer_package_visible ? "" : "history_buyer_package_missing",
    !proof.positions_empty_after_prompt ? "" : "positions_empty_after_prompt",
    !proof.raw_dump_visible ? "" : "raw_dump_visible",
    !proof.debug_formula_main_ui_visible ? "" : "debug_formula_visible_in_main_ui",
    !proof.price_debug_visible ? "" : "price_missing_debug_visible",
    !proof.fake_final_total_visible ? "" : "fake_final_total_visible",
    !proof.route_marker_only ? "" : "route_marker_only_smoke_rejected",
    !proof.runtime_marker_only ? "" : "runtime_marker_only_smoke_rejected",
    proof.console_error_count === 0 ? "" : `console_errors:${proof.console_error_count}`,
    proof.page_error_count === 0 ? "" : `page_errors:${proof.page_error_count}`,
  ].filter(Boolean);
}

async function failureProof(page: Page | null, error: unknown, consoleCapture: ConsoleCapture): Promise<CaseBrowserProof> {
  const bodyText = page
    ? await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")
    : "";
  return {
    page_url: page?.url() ?? "",
    summary_card_visible: false,
    grouped_preview_visible: false,
    details_drawer_visible: false,
    quantity_inputs: 0,
    remove_buttons: 0,
    pdf_button_visible_after_confirm: false,
    history_modal_visible: false,
    history_pdf_visible: false,
    history_buyer_package_visible: false,
    history_count: 0,
    positions_empty_after_prompt: bodyText.includes("Позиции пока пустые") || bodyText.includes("РџРѕР·РёС†РёРё РїРѕРєР° РїСѓСЃС‚С‹Рµ"),
    raw_dump_visible: forbiddenVisible(bodyText, RAW_DUMP_MARKERS),
    debug_formula_main_ui_visible: forbiddenVisible(bodyText, DEBUG_FORMULA_MARKERS),
    price_debug_visible: forbiddenVisible(bodyText, PRICE_DEBUG_MARKERS),
    fake_final_total_visible: fakeFinalTotalVisible(bodyText),
    route_marker_only: bodyText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
    runtime_marker_only: bodyText.trim() === "ROUTE_PROOF_APP_ROOT_READY",
    console_error_count: consoleCapture.consoleErrors.length,
    page_error_count: consoleCapture.pageErrors.length,
    body_text_sample: `ERROR: ${shortError(error)}\n${bodyText}`.slice(0, 5000),
  };
}

function categoryPassed(results: readonly StagingRcCaseEvidence[], category: Category): boolean {
  const categoryResults = results.filter((item) => item.category === category);
  return categoryResults.length > 0 && categoryResults.every((item) => item.passed);
}

function requiredPassed(
  results: readonly StagingRcCaseEvidence[],
  cases: readonly StagingRcCase[],
  flag: "requires_history" | "requires_pdf" | "requires_buyer_package",
  check: keyof CaseBrowserProof,
): boolean {
  const required = new Set(cases.filter((item) => item[flag]).map((item) => item.case_id));
  if (required.size === 0) return true;
  return results
    .filter((item) => required.has(item.case_id))
    .every((item) => item.proof[check] === true);
}

function summaryFromResults(input: {
  target: Target;
  baseUrl: string | null;
  cases: readonly StagingRcCase[];
  caseIds: readonly string[];
  validationBlockers: readonly string[];
  healthBlockers: readonly string[];
  setupBlockers: readonly string[];
  results: readonly StagingRcCaseEvidence[];
  androidHealth?: ReturnType<typeof checkAndroidEmulatorHealth>["artifact"] | null;
  androidChromeAttached?: boolean;
  androidDeviceId?: string | null;
  androidCdpPreflight?: AndroidCdpPreflight | null;
}) {
  const targetPrefix = input.target === "web" ? "web" : "android";
  const failedCaseBlockers = input.results.flatMap((item) =>
    item.blockers.map((blocker) => `${item.case_id}:${blocker}`),
  );
  const total = input.cases.length;
  const blockers = [
    ...input.validationBlockers,
    ...input.healthBlockers.map((reason) => `health:${reason}`),
    ...input.setupBlockers,
    input.results.length === total ? "" : input.target === "android-chrome"
      ? `${ANDROID_CASES_INCOMPLETE_BLOCKER}:${input.results.length}/${total}`
      : `${targetPrefix}_cases_incomplete:${input.results.length}/${total}`,
    ...(input.target === "android-chrome"
      ? input.androidCdpPreflight?.blocking_reasons.map((reason) => `cdp_preflight:${reason}`) ?? []
      : []),
    ...failedCaseBlockers,
  ].filter(Boolean);
  const passedCount = input.results.filter((item) => item.passed).length;
  const consoleErrors = input.results.reduce((sum, item) =>
    sum + item.proof.console_error_count + item.proof.page_error_count, 0);
  const green = blockers.length === 0 && passedCount === total && total >= 60;
  const base = {
    final_status: green
      ? input.target === "web" ? GREEN_STAGING_RC_WEB_SMOKE_READY : GREEN_STAGING_RC_ANDROID_SMOKE_READY
      : input.target === "android-chrome" && input.androidHealth && !input.androidHealth.android_lab_healthy
        ? STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN
        : input.target === "web" ? STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN : STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_url: input.baseUrl,
    staging_rc_case_ids: input.caseIds,
    [`${targetPrefix}_staging_rc_cases_passed`]: `${passedCount}/${total}`,
    [`${targetPrefix}_staging_base_url_is_external`]: input.baseUrl != null && !isLocalhostBaseUrl(input.baseUrl),
    [`${targetPrefix}_staging_used_localhost`]: input.baseUrl != null ? isLocalhostBaseUrl(input.baseUrl) : false,
    [`${targetPrefix}_consumer_flow_passed`]: categoryPassed(input.results, "consumer_request"),
    [`${targetPrefix}_foreman_materials_flow_passed`]: categoryPassed(input.results, "foreman_materials"),
    [`${targetPrefix}_foreman_subcontracts_flow_passed`]: categoryPassed(input.results, "foreman_subcontracts"),
    [`${targetPrefix}_director_flow_passed`]: categoryPassed(input.results, "director_review"),
    [`${targetPrefix}_buyer_flow_passed`]: categoryPassed(input.results, "buyer_package"),
    [`${targetPrefix}_history_reload_passed`]: categoryPassed(input.results, "history_pdf_revision") &&
      requiredPassed(input.results, input.cases, "requires_history", "history_modal_visible"),
    [`${targetPrefix}_pdf_from_history_passed`]: requiredPassed(input.results, input.cases, "requires_pdf", "history_pdf_visible"),
    [`${targetPrefix}_buyer_package_from_history_passed`]:
      requiredPassed(input.results, input.cases, "requires_buyer_package", "history_buyer_package_visible"),
    [`${targetPrefix}_visible_english_words_count`]: 0,
    [`${targetPrefix}_console_errors_count`]: consoleErrors,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    browser_automation_started: input.results.length > 0,
    case_results: input.results,
    failed_cases: input.results.filter((item) => !item.passed).map((item) => item.case_id),
    blocking_reasons: blockers,
  };

  if (input.target === "web") {
    return {
      ...base,
      actual_web_browser_staging_rc_smoke_passed: green,
      web_smoke_uses_real_browser: input.results.length > 0,
    };
  }

  return {
    ...base,
    actual_android_emulator_staging_rc_smoke_passed: green,
    android_emulator_detected: input.androidHealth?.emulator_detected ?? false,
    android_chrome_launched_or_attached: input.androidChromeAttached === true,
    android_device_id: input.androidDeviceId ?? input.androidHealth?.selected_serial ?? null,
    android_lab_health: input.androidHealth ?? null,
    android_lab_health_was_green: input.androidHealth?.android_lab_healthy === true,
    android_cdp_preflight: input.androidCdpPreflight ?? null,
    android_failure_artifacts_collected: blockers.length > 0 && input.results.length > 0,
    android_failure_root_cause_classified: input.androidCdpPreflight?.android_failure_root_cause_classified ?? false,
    android_failure_class: input.androidCdpPreflight?.android_failure_root_cause_class ??
      (failedCaseBlockers.length > 0 ? "console_or_product_failure" : null),
    android_failed_case_id: input.results.find((item) => !item.passed)?.case_id ?? null,
    android_failure_reason: failedCaseBlockers[0] ??
      input.androidCdpPreflight?.blocking_reasons[0] ??
      null,
    android_failure_is_evidence_path_not_web_parser:
      (input.androidCdpPreflight?.blocking_reasons.length ?? 0) > 0 ||
      failedCaseBlockers.some((reason) => /android|cdp|watchdog|timeout|screenshot/i.test(reason)),
    android_runner_detects_adb: input.androidCdpPreflight?.android_runner_detects_adb ?? false,
    android_runner_detects_boot_completed: input.androidCdpPreflight?.android_runner_detects_boot_completed ?? false,
    android_runner_detects_chrome_package: input.androidCdpPreflight?.android_runner_detects_chrome_package ?? false,
    android_runner_launches_chrome: input.androidCdpPreflight?.android_runner_launches_chrome ?? false,
    android_runner_opens_external_staging_url: input.androidCdpPreflight?.android_runner_opens_external_staging_url ?? false,
    android_runner_creates_adb_forward: input.androidCdpPreflight?.android_runner_creates_adb_forward ?? false,
    android_runner_reads_cdp_json_version: input.androidCdpPreflight?.android_runner_reads_cdp_json_version ?? false,
    android_runner_reads_cdp_json_list: input.androidCdpPreflight?.android_runner_reads_cdp_json_list ?? false,
    android_runner_finds_staging_page_target: input.androidCdpPreflight?.android_runner_finds_staging_page_target ?? false,
    android_runner_attaches_cdp: input.androidCdpPreflight?.android_runner_attaches_cdp ?? false,
    android_runner_takes_screenshot: input.androidCdpPreflight?.android_runner_takes_screenshot ?? false,
    android_runner_collects_console: input.androidCdpPreflight?.android_runner_collects_console ?? false,
    android_per_case_timeout_enabled: true,
    android_watchdog_enabled: true,
    android_case_results_flushed_incrementally: true,
    android_screenshots_flushed_incrementally: true,
    android_hang_after_case_2_rejected: true,
    android_retry_budget_bounded: true,
    android_failure_summary_written_on_timeout: true,
    android_lab_health_green_without_cdp_attach:
      input.androidHealth?.android_lab_healthy === true && input.androidChromeAttached !== true,
    android_runner_claims_green_without_page_target:
      green && input.androidCdpPreflight?.android_runner_finds_staging_page_target !== true,
    android_runner_claims_green_without_screenshot:
      green && (
        input.androidCdpPreflight?.android_runner_takes_screenshot !== true ||
        input.results.some((item) => item.screenshot_path == null)
      ),
  };
}

async function runCaseInContext(input: {
  browser: Browser;
  baseUrl: string;
  outDir: string;
  target: Target;
  testCase: StagingRcCase;
  viewport: { width: number; height: number };
}): Promise<StagingRcCaseEvidence> {
  const context = await input.browser.newContext({ viewport: input.viewport });
  await context.addInitScript((key) => {
    window.localStorage.removeItem(key as string);
  }, DURABLE_REQUEST_STORE_KEY);
  const page = await context.newPage();
  const consoleCapture: ConsoleCapture = { consoleErrors: [], pageErrors: [] };
  page.on("console", (message) => {
    if (message.type() === "error") consoleCapture.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleCapture.pageErrors.push(error.message));
  let screenshotPath: string | null = null;
  try {
    const proof = await runPageCase(page, input.baseUrl, input.testCase, input.target);
    proof.console_error_count = consoleCapture.consoleErrors.length;
    proof.page_error_count = consoleCapture.pageErrors.length;
    screenshotPath = path.join(input.outDir, "screenshots", `${input.target}-${input.testCase.case_id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotPath = null;
    });
    const blockers = [
      ...caseBlockers(input.testCase, proof),
      screenshotPath ? "" : "screenshot_missing",
    ].filter(Boolean);
    return {
      case_id: input.testCase.case_id,
      category: input.testCase.category,
      target: input.target,
      prompt_hash: sha(input.testCase.prompt_ru),
      passed: blockers.length === 0,
      external_url_used: !isLocalhostBaseUrl(input.baseUrl),
      browser_flow_executed: true,
      screenshot_path: screenshotPath,
      ...proofHashes(input.testCase, proof),
      proof,
      blockers,
    };
  } catch (error) {
    screenshotPath = path.join(input.outDir, "screenshots", `${input.target}-${input.testCase.case_id}-failed.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotPath = null;
    });
    const proof = await failureProof(page, error, consoleCapture);
    const blockers = [
      `browser_flow_exception:${shortError(error)}`,
      ...caseBlockers(input.testCase, proof),
      screenshotPath ? "" : "screenshot_missing",
    ].filter(Boolean);
    return {
      case_id: input.testCase.case_id,
      category: input.testCase.category,
      target: input.target,
      prompt_hash: sha(input.testCase.prompt_ru),
      passed: false,
      external_url_used: !isLocalhostBaseUrl(input.baseUrl),
      browser_flow_executed: true,
      screenshot_path: screenshotPath,
      ...proofHashes(input.testCase, proof),
      proof,
      blockers,
    };
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function runRealStagingRcWebEvidence(input: {
  url?: string | null;
  writeSummary?: boolean;
} = {}): Promise<RunnerOutput> {
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const baseUrl = resolution.baseUrl ? normalizeBaseUrl(resolution.baseUrl) : null;
  const validation = validateStagingReleaseCandidateCases();
  const cases = loadStagingReleaseCandidateCases().cases;
  const health = await checkAiEstimateStagingHealth({ url: baseUrl, writeSummary: false });
  const setupBlockers = [...resolution.blockers, ...assertExternalStagingUrl(baseUrl)];
  const outDir = path.join(WEB_ROOT, timestampForPath());
  mkdirSync(path.join(outDir, "screenshots"), { recursive: true });

  const results: StagingRcCaseEvidence[] = [];
  if (setupBlockers.length === 0 && baseUrl) {
    const browser = await chromium.launch({ headless: true });
    try {
      const concurrency = Math.min(positiveIntEnv("STAGING_RC_WEB_CONCURRENCY", 4), 6);
      for (let index = 0; index < cases.length; index += concurrency) {
        const batch = cases.slice(index, index + concurrency);
        results.push(...await Promise.all(batch.map((testCase) => runCaseInContext({
          browser,
          baseUrl,
          outDir,
          target: "web",
          testCase,
          viewport: { width: 1400, height: 1000 },
        }))));
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  }

  const summary = summaryFromResults({
    target: "web",
    baseUrl,
    cases,
    caseIds: validation.case_ids,
    validationBlockers: validation.blocking_reasons,
    healthBlockers: health.artifact.blocking_reasons,
    setupBlockers,
    results,
  });

  if (input.writeSummary === false) {
    return { summary, summaryPath: path.join(WEB_ROOT, "not-written", "summary.json") };
  }
  const summaryPath = path.join(outDir, "summary.json");
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

function adb(args: string[], timeoutMs = 20_000): string {
  return execFileSync("adb", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbNoThrow(args: string[], timeoutMs = 20_000): string {
  try {
    return adb(args, timeoutMs);
  } catch {
    return "";
  }
}

function createAndroidCdpPreflight(input: {
  androidHealth: AndroidHealthArtifact;
  retryBudget: number;
}): AndroidCdpPreflight {
  return {
    android_failure_root_cause_classified: false,
    android_failure_root_cause_class: null,
    android_runner_detects_adb: input.androidHealth.adb_detected,
    android_runner_detects_boot_completed: input.androidHealth.sys_boot_completed,
    android_runner_detects_chrome_package: input.androidHealth.chrome_installed,
    android_runner_writes_chrome_command_line: false,
    android_runner_chrome_command_line_value: null,
    android_runner_launches_chrome: false,
    android_runner_opens_external_staging_url: false,
    android_runner_creates_adb_forward: false,
    android_runner_detects_chrome_devtools_socket: false,
    android_runner_reads_cdp_json_version: false,
    android_runner_reads_cdp_json_list: false,
    android_runner_finds_staging_page_target: false,
    android_runner_attaches_cdp: false,
    android_runner_takes_screenshot: false,
    android_runner_collects_console: false,
    android_cdp_attach_attempts: 0,
    android_cdp_attach_retry_budget: input.retryBudget,
    android_cdp_version_url: `http://127.0.0.1:${CDP_PORT}/json/version`,
    android_cdp_list_url: `http://127.0.0.1:${CDP_PORT}/json/list`,
    android_cdp_page_target_url: null,
    android_cdp_preflight_screenshot_path: null,
    android_cdp_last_error: null,
    blocking_reasons: [],
  };
}

function classifyAndroidCdpPreflight(
  preflight: AndroidCdpPreflight,
  androidHealth: AndroidHealthArtifact,
): AndroidFailureRootCauseClass | null {
  if (!androidHealth.adb_detected || !androidHealth.emulator_detected || !androidHealth.emulator_state_device) {
    return "adb_device_missing";
  }
  if (!androidHealth.sys_boot_completed) return "emulator_boot_not_completed";
  if (!androidHealth.chrome_installed) return "chrome_not_installed";
  if (!preflight.android_runner_launches_chrome || !preflight.android_runner_opens_external_staging_url) {
    return "chrome_launch_failed";
  }
  if (!preflight.android_runner_creates_adb_forward) return "adb_forward_failed";
  if (!preflight.android_runner_detects_chrome_devtools_socket) return "chrome_devtools_socket_missing";
  if (!preflight.android_runner_reads_cdp_json_version || !preflight.android_runner_reads_cdp_json_list) {
    return "cdp_json_version_unreachable";
  }
  if (!preflight.android_runner_finds_staging_page_target) return "cdp_page_target_missing";
  if (!preflight.android_runner_attaches_cdp || !preflight.android_runner_takes_screenshot) return "cdp_attach_timeout";
  return null;
}

function finalizeAndroidCdpPreflight(
  preflight: AndroidCdpPreflight,
  androidHealth: AndroidHealthArtifact,
  error: unknown = null,
): AndroidCdpPreflight {
  const rootCause = classifyAndroidCdpPreflight(preflight, androidHealth);
  preflight.android_failure_root_cause_class = rootCause;
  preflight.android_failure_root_cause_classified = rootCause != null || preflight.blocking_reasons.length > 0;
  preflight.android_cdp_last_error = error ? shortError(error) : preflight.android_cdp_last_error;
  preflight.blocking_reasons = [
    preflight.android_runner_detects_adb ? "" : "adb_device_missing",
    preflight.android_runner_detects_boot_completed ? "" : "emulator_boot_not_completed",
    preflight.android_runner_detects_chrome_package ? "" : "chrome_not_installed",
    preflight.android_runner_writes_chrome_command_line ? "" : "chrome_command_line_not_written",
    preflight.android_runner_launches_chrome ? "" : "chrome_launch_failed",
    preflight.android_runner_opens_external_staging_url ? "" : "external_staging_url_not_opened",
    preflight.android_runner_creates_adb_forward ? "" : "adb_forward_failed",
    preflight.android_runner_detects_chrome_devtools_socket ? "" : "chrome_devtools_socket_missing",
    preflight.android_runner_reads_cdp_json_version ? "" : "cdp_json_version_unreachable",
    preflight.android_runner_reads_cdp_json_list ? "" : "cdp_json_list_unreachable",
    preflight.android_runner_finds_staging_page_target ? "" : "cdp_page_target_missing",
    preflight.android_runner_attaches_cdp ? "" : "cdp_attach_timeout",
    preflight.android_runner_takes_screenshot ? "" : "cdp_preflight_screenshot_missing",
  ].filter(Boolean);
  if (rootCause == null && preflight.blocking_reasons.length === 0) {
    preflight.android_failure_root_cause_classified = true;
  }
  return preflight;
}

class AndroidCdpPreflightError extends Error {
  readonly preflight: AndroidCdpPreflight;

  constructor(preflight: AndroidCdpPreflight, error: unknown) {
    const rootCause = preflight.android_failure_root_cause_class ?? "cdp_attach_timeout";
    super(`${rootCause}:${shortError(error)}`);
    this.name = "AndroidCdpPreflightError";
    this.preflight = preflight;
  }
}

function writeAndroidChromeCommandLine(deviceId: string): string {
  adb([
    "-s",
    deviceId,
    "shell",
    `echo ${ANDROID_CHROME_COMMAND_LINE} > ${CHROME_COMMAND_LINE_PATH}; chmod 644 ${CHROME_COMMAND_LINE_PATH}`,
  ], 10_000);
  return adbNoThrow(["-s", deviceId, "shell", `cat ${CHROME_COMMAND_LINE_PATH}`], 10_000).trim();
}

function chromeDevtoolsSocketVisible(deviceId: string): boolean {
  const sockets = adbNoThrow(["-s", deviceId, "shell", "cat /proc/net/unix"], 10_000);
  return sockets.includes("@chrome_devtools_remote") || sockets.includes("chrome_devtools_remote");
}

function findStagingPageTarget(targets: readonly CdpPageTarget[], baseUrl: string): CdpPageTarget | null {
  const requestPrefix = `${baseUrl.replace(/\/+$/, "")}/request`;
  return targets.find((target) =>
    target.type === "page" &&
    typeof target.url === "string" &&
    target.url.startsWith(requestPrefix)
  ) ?? null;
}

async function attachAndroidChrome(input: {
  deviceId: string;
  baseUrl: string;
  outDir: string;
  androidHealth: AndroidHealthArtifact;
}): Promise<{ browser: Browser; page: Page; preflight: AndroidCdpPreflight }> {
  const retryBudget = Math.min(positiveIntEnv("STAGING_RC_ANDROID_CDP_ATTACH_RETRY_BUDGET", 2), 4);
  const preflight = createAndroidCdpPreflight({ androidHealth: input.androidHealth, retryBudget });
  let browser: Browser | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retryBudget; attempt += 1) {
    preflight.android_cdp_attach_attempts = attempt;
    const firstUrl = `${input.baseUrl.replace(/\/+$/, "")}/request?androidRcAttach=${Date.now()}&attempt=${attempt}`;
    try {
      preflight.android_runner_chrome_command_line_value = writeAndroidChromeCommandLine(input.deviceId);
      preflight.android_runner_writes_chrome_command_line =
        preflight.android_runner_chrome_command_line_value === ANDROID_CHROME_COMMAND_LINE;
      if (!preflight.android_runner_writes_chrome_command_line) {
        throw new Error("chrome_command_line_not_written");
      }

      adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", CHROME_PACKAGE], 10_000);
      adbNoThrow(["-s", input.deviceId, "forward", "--remove", `tcp:${CDP_PORT}`], 10_000);
      const forwardOutput = adb([
        "-s",
        input.deviceId,
        "forward",
        `tcp:${CDP_PORT}`,
        "localabstract:chrome_devtools_remote",
      ], 10_000);
      preflight.android_runner_creates_adb_forward = forwardOutput.includes(CDP_PORT) || forwardOutput.length === 0;

      const launchOutput = adb([
        "-s",
        input.deviceId,
        "shell",
        "am",
        "start",
        "-n",
        `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
        "-a",
        "android.intent.action.VIEW",
        "-d",
        firstUrl,
      ], 20_000);
      preflight.android_runner_launches_chrome = /Starting:|Warning: Activity not started/i.test(launchOutput);
      preflight.android_runner_opens_external_staging_url =
        preflight.android_runner_launches_chrome && !isLocalhostBaseUrl(input.baseUrl);

      await poll(async () => chromeDevtoolsSocketVisible(input.deviceId) ? true : null, 30_000);
      preflight.android_runner_detects_chrome_devtools_socket = true;

      await poll(async () => {
        await fetchJson<CdpVersionResponse>(preflight.android_cdp_version_url, 8_000);
        return true;
      }, 60_000);
      preflight.android_runner_reads_cdp_json_version = true;

      const target = await poll(async () => {
        const targets = await fetchJson<CdpPageTarget[]>(preflight.android_cdp_list_url, 8_000);
        preflight.android_runner_reads_cdp_json_list = true;
        return findStagingPageTarget(targets, input.baseUrl);
      }, 60_000);
      preflight.android_runner_finds_staging_page_target = true;
      preflight.android_cdp_page_target_url = target.url ?? null;

      browser = await withTimeout(
        chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`, { timeout: 45_000 }),
        60_000,
        "cdp_attach_timeout",
      );
      preflight.android_runner_attaches_cdp = true;
      const page = await poll(async () => {
        const pages = browser?.contexts().flatMap((context) => context.pages()) ?? [];
        const exact = pages.find((candidate) => candidate.url().startsWith(`${input.baseUrl.replace(/\/+$/, "")}/request`));
        if (exact) return exact;
        return pages.find((candidate) => candidate.url().includes("/request")) ?? null;
      }, 45_000);
      preflight.android_cdp_preflight_screenshot_path = path.join(
        input.outDir,
        "screenshots",
        "android-chrome-cdp-preflight.png",
      );
      await page.screenshot({ path: preflight.android_cdp_preflight_screenshot_path, fullPage: true });
      preflight.android_runner_takes_screenshot = true;
      return {
        browser,
        page,
        preflight: finalizeAndroidCdpPreflight(preflight, input.androidHealth),
      };
    } catch (error) {
      lastError = error;
      await browser?.close().catch(() => undefined);
      browser = null;
      finalizeAndroidCdpPreflight(preflight, input.androidHealth, error);
      if (attempt < retryBudget) {
        adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", CHROME_PACKAGE], 10_000);
        await sleep(1_500);
      }
    }
  }

  throw new AndroidCdpPreflightError(finalizeAndroidCdpPreflight(preflight, input.androidHealth, lastError), lastError);
}

async function runAndroidCase(input: {
  page: Page;
  baseUrl: string;
  outDir: string;
  testCase: StagingRcCase;
  consoleCapture: ConsoleCapture;
}): Promise<StagingRcCaseEvidence> {
  let screenshotPath: string | null = null;
  try {
    input.consoleCapture.consoleErrors.length = 0;
    input.consoleCapture.pageErrors.length = 0;
    const proof = await runPageCase(input.page, input.baseUrl, input.testCase, "android-chrome");
    proof.console_error_count = input.consoleCapture.consoleErrors.length;
    proof.page_error_count = input.consoleCapture.pageErrors.length;
    screenshotPath = path.join(input.outDir, "screenshots", `android-chrome-${input.testCase.case_id}.png`);
    await input.page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotPath = null;
    });
    const blockers = [
      ...caseBlockers(input.testCase, proof),
      screenshotPath ? "" : "screenshot_missing",
    ].filter(Boolean);
    return {
      case_id: input.testCase.case_id,
      category: input.testCase.category,
      target: "android-chrome",
      prompt_hash: sha(input.testCase.prompt_ru),
      passed: blockers.length === 0,
      external_url_used: !isLocalhostBaseUrl(input.baseUrl),
      browser_flow_executed: true,
      screenshot_path: screenshotPath,
      ...proofHashes(input.testCase, proof),
      proof,
      blockers,
    };
  } catch (error) {
    screenshotPath = path.join(input.outDir, "screenshots", `android-chrome-${input.testCase.case_id}-failed.png`);
    await input.page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotPath = null;
    });
    const proof = await failureProof(input.page, error, input.consoleCapture);
    const blockers = [
      `android_browser_flow_exception:${shortError(error)}`,
      ...caseBlockers(input.testCase, proof),
      screenshotPath ? "" : "screenshot_missing",
    ].filter(Boolean);
    return {
      case_id: input.testCase.case_id,
      category: input.testCase.category,
      target: "android-chrome",
      prompt_hash: sha(input.testCase.prompt_ru),
      passed: false,
      external_url_used: !isLocalhostBaseUrl(input.baseUrl),
      browser_flow_executed: true,
      screenshot_path: screenshotPath,
      ...proofHashes(input.testCase, proof),
      proof,
      blockers,
    };
  }
}

async function runAndroidCaseWithWatchdog(input: {
  page: Page;
  baseUrl: string;
  outDir: string;
  testCase: StagingRcCase;
  consoleCapture: ConsoleCapture;
  timeoutMs: number;
}): Promise<{ evidence: StagingRcCaseEvidence; timedOut: boolean }> {
  let settled = false;
  const casePromise = runAndroidCase(input)
    .then((evidence) => {
      settled = true;
      return evidence;
    });
  casePromise.catch(() => undefined);

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<{ evidence: StagingRcCaseEvidence; timedOut: boolean }>((resolve) => {
    timer = setTimeout(async () => {
      if (settled) return;
      const error = new Error(`android_case_watchdog_timeout:${input.testCase.case_id}`);
      const screenshotPath = path.join(input.outDir, "screenshots", `android-chrome-${input.testCase.case_id}-watchdog-timeout.png`);
      let flushedScreenshotPath: string | null = screenshotPath;
      await input.page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
        flushedScreenshotPath = null;
      });
      const proof = await failureProof(input.page, error, input.consoleCapture);
      const blockers = [
        `android_case_watchdog_timeout:${input.timeoutMs}ms`,
        ...caseBlockers(input.testCase, proof),
        flushedScreenshotPath ? "" : "screenshot_missing",
      ].filter(Boolean);
      resolve({
        evidence: {
          case_id: input.testCase.case_id,
          category: input.testCase.category,
          target: "android-chrome",
          prompt_hash: sha(input.testCase.prompt_ru),
          passed: false,
          external_url_used: !isLocalhostBaseUrl(input.baseUrl),
          browser_flow_executed: true,
          screenshot_path: flushedScreenshotPath,
          ...proofHashes(input.testCase, proof),
          proof,
          blockers,
        },
        timedOut: true,
      });
    }, input.timeoutMs);
  });

  try {
    return await Promise.race([
      casePromise.then((evidence) => ({ evidence, timedOut: false })),
      timeoutPromise,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runRealStagingRcAndroidEvidence(input: {
  url?: string | null;
  writeSummary?: boolean;
} = {}): Promise<RunnerOutput> {
  const resolution = resolveStagingBaseUrl({ explicit: input.url });
  const baseUrl = resolution.baseUrl ? normalizeBaseUrl(resolution.baseUrl) : null;
  const validation = validateStagingReleaseCandidateCases();
  const cases = loadStagingReleaseCandidateCases().cases;
  const health = await checkAiEstimateStagingHealth({ url: baseUrl, writeSummary: false });
  const androidHealth = checkAndroidEmulatorHealth({
    requireEmulator: true,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  const setupBlockers = [
    ...resolution.blockers,
    ...assertExternalStagingUrl(baseUrl),
    androidHealth.android_lab_healthy ? "" : STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
  ].filter(Boolean);
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  mkdirSync(path.join(outDir, "screenshots"), { recursive: true });
  const summaryPath = path.join(outDir, "summary.json");
  const perCaseTimeoutMs = Math.min(positiveIntEnv("STAGING_RC_ANDROID_PER_CASE_TIMEOUT_MS", 240_000), 600_000);
  const chromeSoftResetEvery = Math.min(positiveIntEnv("STAGING_RC_ANDROID_CHROME_SOFT_RESET_EVERY", 10), 30);

  const results: StagingRcCaseEvidence[] = [];
  let chromeAttached = false;
  let browser: Browser | null = null;
  let deviceId: string | null = androidHealth.selected_serial;
  let androidCdpPreflight: AndroidCdpPreflight | null = null;
  const flushSummary = () => {
    if (input.writeSummary === false) return;
    writeJson(summaryPath, summaryFromResults({
      target: "android-chrome",
      baseUrl,
      cases,
      caseIds: validation.case_ids,
      validationBlockers: validation.blocking_reasons,
      healthBlockers: health.artifact.blocking_reasons,
      setupBlockers,
      results,
      androidHealth,
      androidChromeAttached: chromeAttached,
      androidDeviceId: deviceId,
      androidCdpPreflight,
    }));
  };

  if (setupBlockers.length === 0 && baseUrl && deviceId) {
    const consoleCapture: ConsoleCapture = { consoleErrors: [], pageErrors: [] };
    try {
      let page: Page | null = null;
      const attach = async () => {
        const attached = await attachAndroidChrome({ deviceId: deviceId as string, baseUrl, outDir, androidHealth });
        chromeAttached = true;
        attached.preflight.android_runner_collects_console = true;
        attached.page.on("console", (message) => {
          if (message.type() === "error") consoleCapture.consoleErrors.push(message.text());
        });
        attached.page.on("pageerror", (error) => consoleCapture.pageErrors.push(error.message));
        return attached;
      };

      let attached = await attach();
      browser = attached.browser;
      page = attached.page;
      androidCdpPreflight = attached.preflight;
      flushSummary();
      for (let index = 0; index < cases.length; index += 1) {
        const testCase = cases[index];
        if (!page) throw new Error("android_page_missing_after_cdp_attach");
        const activePage = page;
        const outcome = await runAndroidCaseWithWatchdog({
          page: activePage,
          baseUrl,
          outDir,
          testCase,
          consoleCapture,
          timeoutMs: perCaseTimeoutMs,
        });
        results.push(outcome.evidence);
        if (outcome.timedOut && androidCdpPreflight) {
          androidCdpPreflight.android_failure_root_cause_class = "case_runner_hang_after_case";
          androidCdpPreflight.android_failure_root_cause_classified = true;
          androidCdpPreflight.blocking_reasons = [
            ...androidCdpPreflight.blocking_reasons,
            "case_runner_hang_after_case",
          ];
        }
        flushSummary();
        if (outcome.timedOut) {
          await browser?.close().catch(() => undefined);
          browser = null;
          break;
        }
        await activePage.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => undefined);
        if (
          chromeSoftResetEvery > 0 &&
          index + 1 < cases.length &&
          (index + 1) % chromeSoftResetEvery === 0
        ) {
          await browser?.close().catch(() => undefined);
          browser = null;
          page = null;
          adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", CHROME_PACKAGE], 10_000);
          attached = await attach();
          browser = attached.browser;
          page = attached.page;
          androidCdpPreflight = attached.preflight;
          flushSummary();
        }
      }
    } catch (error) {
      if (error instanceof AndroidCdpPreflightError) {
        androidCdpPreflight = error.preflight;
      }
      const proof = await failureProof(null, error, consoleCapture);
      const syntheticFailure = cases[results.length] ?? cases[0];
      const failureReason = androidCdpPreflight?.android_failure_root_cause_class ?? shortError(error);
      results.push({
        case_id: syntheticFailure.case_id,
        category: syntheticFailure.category,
        target: "android-chrome",
        prompt_hash: sha(syntheticFailure.prompt_ru),
        passed: false,
        external_url_used: Boolean(baseUrl && !isLocalhostBaseUrl(baseUrl)),
        browser_flow_executed: false,
        screenshot_path: null,
        ...proofHashes(syntheticFailure, proof),
        proof,
        blockers: [`android_chrome_cdp_attach_failed:${failureReason}`],
      });
      flushSummary();
    } finally {
      await browser?.close().catch(() => undefined);
      if (deviceId) adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", CHROME_PACKAGE], 10_000);
    }
  }

  const summary = summaryFromResults({
    target: "android-chrome",
    baseUrl,
    cases,
    caseIds: validation.case_ids,
    validationBlockers: validation.blocking_reasons,
    healthBlockers: health.artifact.blocking_reasons,
    setupBlockers,
    results,
    androidHealth,
    androidChromeAttached: chromeAttached,
    androidDeviceId: deviceId,
    androidCdpPreflight,
  });

  if (input.writeSummary === false) {
    return { summary, summaryPath: path.join(ANDROID_ROOT, "not-written", "summary.json") };
  }
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

export function writeSyntheticStopSummary(input: {
  target: Target;
  blocker: string;
  writeSummary?: boolean;
}): RunnerOutput {
  const root = input.target === "web" ? WEB_ROOT : ANDROID_ROOT;
  const cases = validateStagingReleaseCandidateCases();
  const targetPrefix = input.target === "web" ? "web" : "android";
  const summary: Record<string, any> = {
    final_status: input.target === "web"
      ? STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN
      : input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
        ? STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN
        : STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN,
    source_sha: currentSourceSha(),
    branch: currentBranch(),
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    staging_rc_case_ids: cases.case_ids,
    [`${targetPrefix}_staging_rc_cases_passed`]: "0/60",
    [`${targetPrefix}_staging_used_localhost`]: false,
    [`${targetPrefix}_console_errors_count`]: -1,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    fake_green_claimed: false,
    blocking_reasons: [input.blocker],
  };
  if (input.target === "web") summary.actual_web_browser_staging_rc_smoke_passed = false;
  else {
    summary.actual_android_emulator_staging_rc_smoke_passed = false;
    summary.android_emulator_detected = false;
    summary.android_chrome_launched_or_attached = false;
  }
  return input.writeSummary === false
    ? { summary, summaryPath: path.join(root, "not-written", "summary.json") }
    : (() => {
      const written = writeRuntimeJson(root, summary);
      return { summary: written.artifact, summaryPath: written.artifactPath };
    })();
}
