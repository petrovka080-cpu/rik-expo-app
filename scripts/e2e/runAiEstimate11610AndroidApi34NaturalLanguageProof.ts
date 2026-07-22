import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { ConsoleMessage, Page } from "playwright";

import {
  buildAiEstimate11610NaturalLanguagePromptForPassport,
} from "../estimate/runAiEstimate11610NaturalLanguageIngressReplay";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import type { ProfessionalWorkPassport } from "../../src/lib/estimate/workPassportContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
  type AndroidApi34DeviceReadyResult,
} from "./ensureAndroidApi34DeviceReady";
import { checkAndroidEmulatorHealth, type AndroidEmulatorHealthResult } from "./checkAndroidEmulatorHealth";
import { acquireAndroidProofRuntimeLock, type AndroidProofRuntimeLockHandle } from "./androidProofRuntimeLock";
import { findFreshLocalhostBaseUrl } from "./renderStagingAcceptanceCore";
import {
  ensureProductionGradeWebServer,
  probeProductionGradeWebServer,
  type ProductionGradeWebServerHandle,
} from "./runProductionGradeEstimateWebSmoke";
import {
  adbNoThrow,
  adbOutputNoThrow,
  ANDROID_CHROME_PACKAGE,
  dismissAndroidChromeBlockingSurfaces,
  openAndroidChromeCdpSession,
  sleep,
  type AndroidChromeCdpSession,
  type AndroidChromeCdpVersion,
} from "./androidChromeCdpHarness";

export const AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA =
  "ai-estimate-11610-android-api34-natural-language-proof-v1" as const;
export const GREEN_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_BLOCKED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_ANDROID_API34_PASSED_PDF_OPEN_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_ANDROID_API34_PASSED_PDF_OPEN_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-android-api34-natural-language-replay");
const DURABLE_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const DURABLE_BUNDLE_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const LEGACY_DURABLE_KEY = "rik.consumer_repair.request_bundles.v1";
const ANDROID_CASE_TIMEOUT_MS = 180_000;
const ANDROID_CASE_MAX_ATTEMPTS = 2;
const ANDROID_SESSION_OPEN_TIMEOUT_MS = 180_000;
const ANDROID_SESSION_CLOSE_TIMEOUT_MS = 15_000;
const ANDROID_PAGE_CREATE_TIMEOUT_MS = 75_000;

type AndroidFailureDomain =
  | "PASSED"
  | "ANDROID_LAB_BOOTSTRAP_FAILURE"
  | "ANDROID_CDP_ATTACH_FAILURE"
  | "PRODUCTION_UI_INGRESS_FAILURE"
  | "ESTIMATE_RUNTIME_FAILURE"
  | "BOQ_TRUTH_FAILURE";

type AndroidLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA;
  case_id: string;
  template_id: string;
  prompt_hash: string;
  page_url: string;
  android_device_id: string | null;
  android_sdk: number | null;
  selected_template_id: string | null;
  selected_work_key: string | null;
  item_count: number;
  expected_row_count: number;
  boq_revision_row_count: number;
  passport_backed_item_count: number;
  passport_backed_revision_row_count: number;
  summary_card_visible: boolean;
  section_count: number;
  quantity_input_count: number;
  raw_dump_visible: boolean;
  console_error_count: number;
  page_error_count: number;
  duration_ms: number;
  heap_used_mb: number;
  failure_domain: AndroidFailureDomain;
  failure_codes: string[];
  first_attempt_passed?: boolean;
  recovered?: boolean;
  retry_count?: number;
  initial_failure_codes?: string[];
  passed: boolean;
};

type BrowserBundleEvidence = {
  bundleFound: boolean;
  selectedTemplateId: string | null;
  selectedWorkKey: string | null;
  itemCount: number;
  passportBackedItemCount: number;
  passportBackedRevisionRowCount: number;
  currentRevisionRowCount: number | null;
  durableRecordCount: number;
};

type AndroidAutomationRecoveryEvent = {
  at: string;
  template_id: string | null;
  attempt: number | null;
  reason: string;
  sad_tab_visible: boolean | null;
  action: string;
};

function classifyAndroidFailureCodes(failureCodes: string[]): AndroidFailureDomain {
  if (failureCodes.length === 0) return "PASSED";
  if (failureCodes.some((code) =>
    code.startsWith("android_api34_device_not_ready") ||
    code.startsWith("android_sdk_not_34") ||
    code.startsWith("android_lab_not_healthy") ||
    code.startsWith("chrome_not_") ||
    code.startsWith("android_health_")
  )) {
    return "ANDROID_LAB_BOOTSTRAP_FAILURE";
  }
  if (failureCodes.some((code) =>
    code.startsWith("WEB_SERVER_") ||
    code.startsWith("ANDROID_INGRESS_FAILED") ||
    code.includes("ERR_EMPTY_RESPONSE") ||
    code.includes("net::ERR_") ||
    code.startsWith("android_web_server_preflight_failed")
  )) {
    return "PRODUCTION_UI_INGRESS_FAILURE";
  }
  if (failureCodes.some((code) =>
    code.includes("ANDROID_CHROME_CDP") ||
    code.includes("ANDROID_CHROME_DEVTOOLS") ||
    code.includes("CDP") ||
    code.includes("DEVTOOLS_SOCKET") ||
    code.startsWith("android_chrome_sad_tab_visible") ||
    code.startsWith("android_case_timeout") ||
    code.startsWith("android_browser_exception:android_page_create_timeout") ||
    code.startsWith("android_browser_exception:android_case_timeout") ||
    code.startsWith("android_cdp_session")
  )) {
    return "ANDROID_CDP_ATTACH_FAILURE";
  }
  if (failureCodes.some((code) =>
    code.startsWith("durable_bundle_missing") ||
    code.startsWith("android_sections_missing") ||
    code.startsWith("android_quantity_inputs_missing") ||
    code.startsWith("raw_internal_dump_visible") ||
    code.startsWith("console_errors") ||
    code.startsWith("page_errors")
  )) {
    return "PRODUCTION_UI_INGRESS_FAILURE";
  }
  if (failureCodes.some((code) =>
    code.startsWith("selected_template_mismatch") ||
    code.startsWith("passport_backed_revision_rows_mismatch") ||
    code.startsWith("android_browser_exception")
  )) {
    return "ESTIMATE_RUNTIME_FAILURE";
  }
  return "BOQ_TRUTH_FAILURE";
}

function classifySetupFailure(value: string | null): AndroidFailureDomain | null {
  if (!value) return null;
  return classifyAndroidFailureCodes([value]);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function numericArg(name: string): number | null {
  const raw = argValue(name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function heapUsedMb(): number {
  return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function gitOutput(args: string[], fallback = ""): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

async function withTimeout<T>(label: string, timeoutMs: number, task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label}:${timeoutMs}`)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function withDiagnosticTimeout<T>(task: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      task.catch(() => fallback),
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function dismissChromeSurfacesNoThrow(deviceId: string | null): Promise<boolean> {
  if (!deviceId) return false;
  return withDiagnosticTimeout(
    dismissAndroidChromeBlockingSurfaces({ deviceId, attempts: 4, delayMs: 500 }),
    30_000,
    false,
  );
}

function normalizeAndroidLoopbackBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl.replace(/\/+$/, ""));
  if (parsed.hostname === "localhost") parsed.hostname = "127.0.0.1";
  return parsed.toString().replace(/\/+$/, "");
}

async function assertAndroidWebServerReady(baseUrl: string): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const probe = await probeProductionGradeWebServer(baseUrl);
      if (!probe.ready) throw new Error(`WEB_SERVER_READINESS_FAILED:${JSON.stringify(probe)}`);
      await sleep(500);
      continue;
    } catch (error) {
      lastError = error;
      throw new Error(
        `android_web_server_preflight_failed:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (lastError) {
    throw new Error(
      `android_web_server_preflight_failed:${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}

function androidSadTabVisible(deviceId: string | null): boolean | null {
  if (!deviceId) return null;
  const topActivity = adbOutputNoThrow(["-s", deviceId, "shell", "dumpsys", "activity", "top"], 10_000);
  if (!topActivity) return null;
  return topActivity.includes("SadTabView") || topActivity.includes("sad_tab_title");
}

function recoverableAndroidAutomationFailure(row: AndroidLedgerRow): boolean {
  return row.failure_codes.some((code) =>
    code.startsWith("android_browser_exception:android_case_timeout") ||
    code.startsWith("android_browser_exception:android_page_create_timeout") ||
    code.startsWith("android_browser_exception:Target page") ||
    code.startsWith("android_browser_exception:Protocol error") ||
    code.startsWith("android_browser_exception:Session closed") ||
    code.startsWith("android_browser_exception:browserContext") ||
    code.startsWith("android_browser_exception:android_cdp_session") ||
    code.startsWith("android_chrome_sad_tab_visible")
  );
}

async function resolveWebServer(input: {
  baseUrl?: string;
  outDir: string;
}): Promise<{ baseUrl: string; server: ProductionGradeWebServerHandle }> {
  if (input.baseUrl) {
    const baseUrl = normalizeAndroidLoopbackBaseUrl(input.baseUrl);
    await assertAndroidWebServerReady(baseUrl);
    return {
      baseUrl,
      server: { started: false, stop: () => undefined },
    };
  }
  const baseUrl = normalizeAndroidLoopbackBaseUrl(await findFreshLocalhostBaseUrl(8134));
  const server = await ensureProductionGradeWebServer(baseUrl, input.outDir, {
    requireOwned: true,
    readinessAttempts: 3,
  });
  await assertAndroidWebServerReady(baseUrl);
  return {
    baseUrl,
    server,
  };
}

async function clearDurableStorage(page: Page, baseUrl: string): Promise<void> {
  const origin = new URL(baseUrl).origin;
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Storage.clearDataForOrigin", {
      origin,
      storageTypes: "all",
    });
  } finally {
    await cdp.detach().catch(() => undefined);
  }
  if (page.url().startsWith(origin)) {
    await page.evaluate(({ manifestKey, bundlePrefix, legacyKey }) => {
      window.sessionStorage.clear();
      window.localStorage.removeItem(manifestKey);
      window.localStorage.removeItem(legacyKey);
      for (const key of Object.keys(window.localStorage)) {
        if (key.startsWith(bundlePrefix)) window.localStorage.removeItem(key);
      }
    }, {
      manifestKey: DURABLE_MANIFEST_KEY,
      bundlePrefix: DURABLE_BUNDLE_PREFIX,
      legacyKey: LEGACY_DURABLE_KEY,
    });
  }
}

async function readBundleEvidence(page: Page): Promise<BrowserBundleEvidence> {
  return page.evaluate<BrowserBundleEvidence>(`(() => {
    const manifestKey = ${JSON.stringify(DURABLE_MANIFEST_KEY)};
    const bundlePrefix = ${JSON.stringify(DURABLE_BUNDLE_PREFIX)};
    const legacyKey = ${JSON.stringify(LEGACY_DURABLE_KEY)};
    const parse = (value) => {
      try {
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    };
    const decodeItems = (bundle) => {
      if (Array.isArray(bundle?.items)) return bundle.items;
      const compact = bundle?.itemsCompactV1;
      if (compact?.schema !== "consumer_repair_bundle_compact_items_v1") return [];
      if (!Array.isArray(compact.fields) || !Array.isArray(compact.rows)) return [];
      return compact.rows
        .filter((row) => Array.isArray(row))
        .map((row) => {
          const item = { requestDraftId: compact.requestDraftId ?? bundle?.draft?.id ?? "" };
          compact.fields.forEach((field, index) => {
            if (typeof field === "string") item[field] = row[index] ?? null;
          });
          item.requestDraftId = compact.requestDraftId ?? bundle?.draft?.id ?? item.requestDraftId;
          return item;
        })
        .filter((item) => typeof item.id === "string" && item.id.length > 0);
    };
    const bundles = [];
    const manifest = parse(window.localStorage.getItem(manifestKey));
    const ids = Array.isArray(manifest?.bundleIds) ? manifest.bundleIds : [];
    for (const id of ids) {
      const raw = window.localStorage.getItem(bundlePrefix + encodeURIComponent(String(id)));
      const bundle = parse(raw);
      if (bundle?.draft?.id) bundles.push(bundle);
    }
    const legacy = parse(window.localStorage.getItem(legacyKey));
    if (Array.isArray(legacy)) {
      for (const bundle of legacy) {
        if (bundle?.draft?.id) bundles.push(bundle);
      }
    }
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith(bundlePrefix)) continue;
      const bundle = parse(window.localStorage.getItem(key));
      if (bundle?.draft?.id && !bundles.some((item) => item.draft.id === bundle.draft.id)) {
        bundles.push(bundle);
      }
    }
    bundles.sort((left, right) => String(right.draft?.createdAt ?? "").localeCompare(String(left.draft?.createdAt ?? "")));
    const bundle = bundles[0];
    const currentRevisionId = bundle?.estimateDraftRevisionState?.currentRevisionId;
    const currentRevision = Array.isArray(bundle?.estimateDraftRevisionState?.revisions)
      ? bundle.estimateDraftRevisionState.revisions.find((revision) => revision.revisionId === currentRevisionId) ??
        bundle.estimateDraftRevisionState.revisions[0]
      : null;
    const items = decodeItems(bundle);
    const rows = Array.isArray(currentRevision?.boq?.rows) ? currentRevision.boq.rows : [];
    return {
      bundleFound: Boolean(bundle?.draft?.id),
      selectedTemplateId: currentRevision?.selectedTemplateId ?? null,
      selectedWorkKey: bundle?.draft?.selectedWorkKey ?? null,
      itemCount: items.length,
      passportBackedItemCount: items.filter((item) =>
        item?.sourceParameters?.passportBackedNaturalLanguageIngress === true
      ).length,
      passportBackedRevisionRowCount: rows.filter((row) =>
        row?.sourceParameters?.passportBackedNaturalLanguageIngress === true
      ).length,
      currentRevisionRowCount: rows.length,
      durableRecordCount: bundles.length,
    };
  })()`);
}

async function ensureEstimatePositionsVisible(page: Page): Promise<void> {
  const sectionLocator = page.locator("[data-testid^='request-estimate-section-']");
  const positionsToggle = page.getByTestId("request-estimate-positions-toggle").first();

  const alreadyVisible = await sectionLocator.first().waitFor({ timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (alreadyVisible) return;

  if (await positionsToggle.count() > 0) await positionsToggle.click();
  await sectionLocator.first().waitFor({ timeout: 45_000 });
}

function missingPassportRow(input: {
  templateId: string;
  device: AndroidApi34DeviceReadyResult | null;
}): AndroidLedgerRow {
  const failureCodes = ["passport_missing"];
  return {
    schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
    case_id: `${input.templateId}:android_api34_natural_language`,
    template_id: input.templateId,
    prompt_hash: "passport_missing",
    page_url: "",
    android_device_id: input.device?.device_id ?? null,
    android_sdk: input.device?.android_sdk ?? null,
    selected_template_id: null,
    selected_work_key: null,
    item_count: 0,
    expected_row_count: 0,
    boq_revision_row_count: 0,
    passport_backed_item_count: 0,
    passport_backed_revision_row_count: 0,
    summary_card_visible: false,
    section_count: 0,
    quantity_input_count: 0,
    raw_dump_visible: false,
    console_error_count: 0,
    page_error_count: 0,
    duration_ms: 0,
    heap_used_mb: heapUsedMb(),
    failure_domain: classifyAndroidFailureCodes(failureCodes),
    failure_codes: failureCodes,
    passed: false,
  };
}

async function runAndroidBrowserCase(input: {
  page: Page;
  baseUrl: string;
  passport: ProfessionalWorkPassport;
  device: AndroidApi34DeviceReadyResult;
}): Promise<AndroidLedgerRow> {
  const started = performance.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);
  input.page.on("console", onConsole);
  input.page.on("pageerror", onPageError);
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(input.passport, "professional_full");
  try {
    await dismissChromeSurfacesNoThrow(input.device.device_id);
    await withTimeout("android_storage_cleanup_timeout", 75_000, clearDurableStorage(input.page, input.baseUrl));
    const pageUrl = `${input.baseUrl}/request?autoPrepare=1&prompt=${encodeURIComponent(prompt)}`;
    await withTimeout(
      "android_navigation_timeout",
      75_000,
      input.page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 }).then(() => undefined),
    );
    await dismissChromeSurfacesNoThrow(input.device.device_id);
    await withTimeout(
      "android_auto_prepare_summary_timeout",
      105_000,
      input.page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 }).then(() => undefined),
    );
    await withTimeout("android_positions_timeout", 60_000, ensureEstimatePositionsVisible(input.page));
    const bodyText = await withTimeout(
      "android_body_text_timeout",
      20_000,
      input.page.locator("body").innerText({ timeout: 15_000 }),
    );
    const evidence = await withTimeout("android_durable_revision_timeout", 30_000, readBundleEvidence(input.page));
    const rowCount = evidence.currentRevisionRowCount ?? evidence.itemCount;
    const sectionCount = await withTimeout(
      "android_boq_section_count_timeout",
      15_000,
      input.page.locator("[data-testid^='request-estimate-section-']").count(),
    );
    const quantityInputCount = await withTimeout(
      "android_quantity_input_count_timeout",
      15_000,
      input.page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count(),
    );
    const rawDumpVisible = /raw_ai_json|source_parameters|template_id|formula_id|normFactor|round_to/i.test(bodyText);
    const failureCodes = [
      input.device.final_status === API34_DEVICE_READY ? "" : `android_api34_device_not_ready:${input.device.final_status}`,
      input.device.android_sdk === 34 ? "" : `android_sdk_not_34:${input.device.android_sdk ?? "missing"}`,
      evidence.bundleFound ? "" : "durable_bundle_missing",
      evidence.selectedTemplateId === input.passport.templateId
        ? ""
        : `selected_template_mismatch:${evidence.selectedTemplateId ?? "missing"}:${input.passport.templateId}`,
      rowCount === input.passport.boqRecipe.rowCount
        ? ""
        : `row_count_mismatch:${rowCount}:${input.passport.boqRecipe.rowCount}`,
      evidence.itemCount > 0 ? "" : "items_empty",
      evidence.passportBackedRevisionRowCount === rowCount && rowCount > 0
        ? ""
        : `passport_backed_revision_rows_mismatch:${evidence.passportBackedRevisionRowCount}:${rowCount}`,
      sectionCount > 0 ? "" : "android_sections_missing",
      quantityInputCount > 0 ? "" : "android_quantity_inputs_missing",
      rawDumpVisible ? "raw_internal_dump_visible" : "",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}:${consoleErrors[0] ?? ""}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}:${pageErrors[0] ?? ""}`,
    ].filter(Boolean);
    const failureDomain = classifyAndroidFailureCodes(failureCodes);
    return {
      schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
      case_id: `${input.passport.templateId}:android_api34_natural_language`,
      template_id: input.passport.templateId,
      prompt_hash: hashText(prompt),
      page_url: input.page.url(),
      android_device_id: input.device.device_id,
      android_sdk: input.device.android_sdk,
      selected_template_id: evidence.selectedTemplateId,
      selected_work_key: evidence.selectedWorkKey,
      item_count: evidence.itemCount,
      expected_row_count: input.passport.boqRecipe.rowCount,
      boq_revision_row_count: rowCount,
      passport_backed_item_count: evidence.passportBackedItemCount,
      passport_backed_revision_row_count: evidence.passportBackedRevisionRowCount,
      summary_card_visible: await input.page.getByTestId("request-estimate-summary-card").count() > 0,
      section_count: sectionCount,
      quantity_input_count: quantityInputCount,
      raw_dump_visible: rawDumpVisible,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_domain: failureDomain,
      failure_codes: failureCodes,
      passed: failureCodes.length === 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ingressFailed = /ERR_EMPTY_RESPONSE|net::ERR_|page\.goto|android_navigation_timeout/i.test(message);
    const failureCodes = [
      input.device.final_status === API34_DEVICE_READY ? "" : `android_api34_device_not_ready:${input.device.final_status}`,
      input.device.android_sdk === 34 ? "" : `android_sdk_not_34:${input.device.android_sdk ?? "missing"}`,
      androidSadTabVisible(input.device.device_id) ? "android_chrome_sad_tab_visible" : "",
      /ERR_EMPTY_RESPONSE/i.test(message) ? "WEB_SERVER_EMPTY_RESPONSE" : "",
      ingressFailed ? "ANDROID_INGRESS_FAILED" : "",
      consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}:${consoleErrors[0] ?? ""}`,
      pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}:${pageErrors[0] ?? ""}`,
      `android_browser_exception:${message.replace(/\s+/g, " ").slice(0, 260)}`,
    ].filter(Boolean);
    const failureDomain = classifyAndroidFailureCodes(failureCodes);
    return {
      schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
      case_id: `${input.passport.templateId}:android_api34_natural_language`,
      template_id: input.passport.templateId,
      prompt_hash: hashText(prompt),
      page_url: input.page.url(),
      android_device_id: input.device.device_id,
      android_sdk: input.device.android_sdk,
      selected_template_id: null,
      selected_work_key: null,
      item_count: 0,
      expected_row_count: input.passport.boqRecipe.rowCount,
      boq_revision_row_count: 0,
      passport_backed_item_count: 0,
      passport_backed_revision_row_count: 0,
      summary_card_visible: false,
      section_count: 0,
      quantity_input_count: 0,
      raw_dump_visible: false,
      console_error_count: consoleErrors.length,
      page_error_count: pageErrors.length,
      duration_ms: Math.round((performance.now() - started) * 100) / 100,
      heap_used_mb: heapUsedMb(),
      failure_domain: failureDomain,
      failure_codes: failureCodes,
      passed: false,
    };
  } finally {
    input.page.off("console", onConsole);
    input.page.off("pageerror", onPageError);
  }
}

function androidBrowserTimeoutRow(input: {
  passport: ProfessionalWorkPassport;
  device: AndroidApi34DeviceReadyResult;
  pageUrl: string;
  started: number;
  message: string;
}): AndroidLedgerRow {
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(input.passport, "professional_full");
  const failureCodes = [
    input.device.final_status === API34_DEVICE_READY ? "" : `android_api34_device_not_ready:${input.device.final_status}`,
    input.device.android_sdk === 34 ? "" : `android_sdk_not_34:${input.device.android_sdk ?? "missing"}`,
    androidSadTabVisible(input.device.device_id) ? "android_chrome_sad_tab_visible" : "",
    `android_browser_exception:${input.message.replace(/\s+/g, " ").slice(0, 260)}`,
  ].filter(Boolean);
  return {
    schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
    case_id: `${input.passport.templateId}:android_api34_natural_language`,
    template_id: input.passport.templateId,
    prompt_hash: hashText(prompt),
    page_url: input.pageUrl,
    android_device_id: input.device.device_id,
    android_sdk: input.device.android_sdk,
    selected_template_id: null,
    selected_work_key: null,
    item_count: 0,
    expected_row_count: input.passport.boqRecipe.rowCount,
    boq_revision_row_count: 0,
    passport_backed_item_count: 0,
    passport_backed_revision_row_count: 0,
    summary_card_visible: false,
    section_count: 0,
    quantity_input_count: 0,
    raw_dump_visible: false,
    console_error_count: 0,
    page_error_count: 0,
    duration_ms: Math.round((performance.now() - input.started) * 100) / 100,
    heap_used_mb: heapUsedMb(),
    failure_domain: classifyAndroidFailureCodes(failureCodes),
    failure_codes: failureCodes,
    passed: false,
  };
}

function withAttemptMetadata(row: AndroidLedgerRow, input: {
  firstAttemptPassed: boolean;
  retryCount: number;
  initialFailureCodes: string[];
}): AndroidLedgerRow {
  return {
    ...row,
    first_attempt_passed: input.firstAttemptPassed,
    recovered: !input.firstAttemptPassed && row.passed,
    retry_count: input.retryCount,
    initial_failure_codes: input.initialFailureCodes,
  };
}

function sanitizeArtifactName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 160);
}

function commandOutputNoThrow(command: string, args: string[], timeoutMs = 10_000): string {
  try {
    return execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    }).trim();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function fetchTextNoThrow(url: string, timeoutMs = 5_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.text();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timeout);
  }
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${value.replace(/\s+$/u, "")}\n`, "utf8");
}

function percentile(values: number[], percentileValue: number): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue / 100 * sorted.length) - 1));
  return Math.round(sorted[index] * 100) / 100;
}

function pageUrlNoThrow(page: Page | null): string | null {
  try {
    return page?.url() ?? null;
  } catch {
    return null;
  }
}

async function captureAndroidCaseFailureEvidence(input: {
  outDir: string;
  templateId: string;
  attempt: number;
  row: AndroidLedgerRow;
  session: AndroidChromeCdpSession | null;
  page: Page | null;
  device: AndroidApi34DeviceReadyResult;
  action: string;
}): Promise<string> {
  const evidenceDir = path.join(
    input.outDir,
    "case-failure-evidence",
    `${String(input.attempt).padStart(2, "0")}-${sanitizeArtifactName(input.templateId)}`,
  );
  fs.mkdirSync(evidenceDir, { recursive: true });
  const deviceId = input.device.device_id;
  writeJson(path.join(evidenceDir, "failure-row.json"), input.row);
  writeJson(path.join(evidenceDir, "failure-context.json"), {
    captured_at: new Date().toISOString(),
    template_id: input.templateId,
    attempt: input.attempt,
    action: input.action,
    failure_domain: input.row.failure_domain,
    failure_codes: input.row.failure_codes,
    chrome_sad_tab_visible: androidSadTabVisible(deviceId),
    page_url: pageUrlNoThrow(input.page) ?? pageUrlNoThrow(input.session?.page ?? null) ?? input.row.page_url,
    heap_used_mb: heapUsedMb(),
  });
  writeText(path.join(evidenceDir, "cdp-version.json"), await fetchTextNoThrow("http://127.0.0.1:9222/json/version"));
  writeText(path.join(evidenceDir, "cdp-pages.json"), await fetchTextNoThrow("http://127.0.0.1:9222/json/list"));
  if (!deviceId) {
    writeText(path.join(evidenceDir, "adb-device-missing.txt"), "android_device_id_missing");
  } else {
    writeText(path.join(evidenceDir, "adb-ps.txt"), adbOutputNoThrow(["-s", deviceId, "shell", "ps", "-A"], 10_000));
    writeText(path.join(evidenceDir, "adb-dumpsys-activity-top.txt"), adbOutputNoThrow([
      "-s",
      deviceId,
      "shell",
      "dumpsys",
      "activity",
      "top",
    ], 10_000));
    writeText(path.join(evidenceDir, "adb-chrome-meminfo.txt"), adbOutputNoThrow([
      "-s",
      deviceId,
      "shell",
      "dumpsys",
      "meminfo",
      ANDROID_CHROME_PACKAGE,
    ], 20_000));
    writeText(path.join(evidenceDir, "adb-logcat-tail.txt"), adbOutputNoThrow([
      "-s",
      deviceId,
      "logcat",
      "-d",
      "-t",
      "1200",
    ], 20_000));
  }
  writeText(path.join(evidenceDir, "host-memory.txt"), commandOutputNoThrow("wmic", [
    "OS",
    "get",
    "FreePhysicalMemory,TotalVisibleMemorySize",
    "/Value",
  ], 10_000));
  if (input.page) {
    await input.page.screenshot({ path: path.join(evidenceDir, "page.png"), timeout: 10_000, fullPage: true })
      .catch(() => undefined);
  }
  return evidenceDir;
}

async function closeBoundedAndroidPage(page: Page | null): Promise<void> {
  if (!page) return;
  await withTimeout("android_page_close_timeout", 15_000, page.close({ runBeforeUnload: false }))
    .catch(() => undefined);
}

async function createAndroidCasePage(session: AndroidChromeCdpSession): Promise<Page> {
  const page = await withTimeout("android_page_create_timeout", ANDROID_PAGE_CREATE_TIMEOUT_MS, session.context.newPage());
  page.setDefaultTimeout(45_000);
  page.setDefaultNavigationTimeout(60_000);
  return page;
}

async function openBoundedAndroidChromeSession(input: {
  deviceId: string;
  baseUrl: string;
}): Promise<AndroidChromeCdpSession> {
  return withTimeout(
    "android_cdp_session_open_timeout",
    ANDROID_SESSION_OPEN_TIMEOUT_MS,
    openAndroidChromeCdpSession({
      deviceId: input.deviceId,
      baseUrl: input.baseUrl,
      startUrl: `${input.baseUrl}/request?android11610Start=${Date.now()}`,
    }),
  );
}

async function closeBoundedAndroidChromeSession(session: AndroidChromeCdpSession | null): Promise<void> {
  if (!session) return;
  await withTimeout("android_cdp_session_close_timeout", ANDROID_SESSION_CLOSE_TIMEOUT_MS, session.close())
    .catch(() => undefined);
}

async function recoverAndroidChromeSession(input: {
  session: AndroidChromeCdpSession | null;
  deviceId: string;
  baseUrl: string;
}): Promise<AndroidChromeCdpSession> {
  await closeBoundedAndroidChromeSession(input.session);
  adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", ANDROID_CHROME_PACKAGE], 10_000);
  return openBoundedAndroidChromeSession({
    deviceId: input.deviceId,
    baseUrl: input.baseUrl,
  });
}

function compactHealth(health: AndroidEmulatorHealthResult | null) {
  return health
    ? {
      final_status: health.final_status,
      android_lab_healthy: health.android_lab_healthy,
      selected_serial: health.selected_serial,
      android_sdk: health.selected_serial ? 34 : null,
      chrome_version: health.chrome_version,
      chrome_installed: health.chrome_installed,
      chrome_launchable: health.chrome_launchable,
      chrome_process_visible_after_launch: health.chrome_process_visible_after_launch,
      blocking_reasons: health.blocking_reasons,
    }
    : null;
}

function selectAndroidTemplateIds(input: {
  allIds: string[];
  all?: boolean;
  limit?: number;
  startIndex: number;
  matrixSize?: number;
  matrixTake?: number;
  shardIndex?: number;
  shardCount?: number;
}): { selectedIds: string[]; selectionStrategy: string; shardIndex: number | null; shardCount: number | null } {
  const shardCount = input.shardCount && input.shardCount > 1 ? Math.floor(input.shardCount) : null;
  const shardIndex = shardCount == null ? null : Math.max(0, Math.min(shardCount - 1, Math.floor(input.shardIndex ?? 0)));
  const matrixSize = input.matrixSize && input.matrixSize > 0 ? Math.floor(input.matrixSize) : null;
  const ranged = matrixSize != null
    ? Array.from({ length: Math.min(matrixSize, input.allIds.length - input.startIndex) }, (_, index) => {
      const available = input.allIds.length - input.startIndex;
      const sourceIndex = input.startIndex + Math.floor(index * available / matrixSize);
      return { id: input.allIds[sourceIndex], index: sourceIndex };
    })
    : input.all
    ? input.allIds.map((id, index) => ({ id, index })).filter((item) => item.index >= input.startIndex)
    : input.allIds
      .map((id, index) => ({ id, index }))
      .slice(input.startIndex, input.startIndex + Math.max(0, Math.floor(input.limit ?? 10)));
  const sharded = shardCount == null
    ? ranged
    : ranged.filter((item) => item.index % shardCount === shardIndex);
  const take = input.matrixTake && input.matrixTake > 0 ? Math.floor(input.matrixTake) : null;
  const selected = take == null ? sharded : sharded.slice(0, take);
  return {
    selectedIds: selected.map((item) => item.id),
    selectionStrategy: matrixSize != null
      ? `evenly_spaced_android_matrix_${matrixSize}${take == null ? "" : `_take_${take}`}`
      : shardCount == null
        ? "contiguous_catalog_slice"
        : `deterministic_modulo_shard_${shardIndex}_of_${shardCount}`,
    shardIndex,
    shardCount,
  };
}

function readResumeLedger(input: {
  ledgerPath: string | null;
  selectedIds: string[];
}): { rows: AndroidLedgerRow[]; ledgerBody: string; duplicateRows: number } {
  if (!input.ledgerPath || !fs.existsSync(input.ledgerPath)) return { rows: [], ledgerBody: "", duplicateRows: 0 };
  const selected = new Set(input.selectedIds);
  const raw = fs.readFileSync(input.ledgerPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: AndroidLedgerRow[] = [];
  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Partial<AndroidLedgerRow>;
      if (typeof parsed.template_id !== "string" || !selected.has(parsed.template_id)) continue;
      if (seen.has(parsed.template_id)) duplicateRows += 1;
      seen.add(parsed.template_id);
      rows.push(parsed as AndroidLedgerRow);
    } catch {
      duplicateRows += 1;
    }
  }
  return {
    rows,
    ledgerBody: lines.map((line) => `${line}\n`).join(""),
    duplicateRows,
  };
}

function writeCheckpoint(input: {
  checkpointPath: string | null;
  runId: string;
  sourceSha: string;
  selectedTemplates: number;
  casesCompleted: number;
  casesPassed: number;
  casesRecovered: number;
  lastTemplateId: string | null;
  failureSamples: AndroidLedgerRow[];
  recoveryEvents: AndroidAutomationRecoveryEvent[];
}): void {
  if (!input.checkpointPath) return;
  writeJson(input.checkpointPath, {
    run_id: input.runId,
    schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
    source_sha: input.sourceSha,
    updated_at: new Date().toISOString(),
    selected_templates: input.selectedTemplates,
    cases_completed: input.casesCompleted,
    cases_passed: input.casesPassed,
    cases_recovered: input.casesRecovered,
    cases_failed: input.casesCompleted - input.casesPassed,
    last_template_id: input.lastTemplateId,
    recovery_events_count: input.recoveryEvents.length,
    recent_recovery_events: input.recoveryEvents.slice(-5),
    retained_failure_samples_count: input.failureSamples.length,
    failure_samples: input.failureSamples,
  });
}

export async function runAiEstimate11610AndroidApi34NaturalLanguageProof(input: {
  all?: boolean;
  limit?: number;
  startIndex?: number;
  baseUrl?: string;
  matrixSize?: number;
  matrixTake?: number;
  runId?: string;
  resume?: boolean;
  shardIndex?: number;
  shardCount?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const allIds = listProfessionalWorkPassportTemplateIds();
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const selection = selectAndroidTemplateIds({
    allIds,
    all: input.all,
    limit: input.limit,
    startIndex,
    matrixSize: input.matrixSize,
    matrixTake: input.matrixTake,
    shardIndex: input.shardIndex,
    shardCount: input.shardCount,
  });
  const selectedIds = selection.selectedIds;
  const runId = input.runId?.trim() || timestampForPath();
  const outDir = path.join(ROOT, runId);
  const summaryPath = input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  const checkpointPath = input.writeLedger || input.writeSummary ? path.join(outDir, "checkpoint.json") : null;
  const androidEnvironmentDir = path.join(outDir, "android-api34-environment");
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const resumeLedger = input.resume ? readResumeLedger({ ledgerPath, selectedIds }) : { rows: [], ledgerBody: "", duplicateRows: 0 };
  const resumedPassedRows = new Map(
    resumeLedger.rows
      .filter((row) => row.passed)
      .map((row) => [row.template_id, row] as const),
  );
  const pendingIds = selectedIds.filter((templateId) => !resumedPassedRows.has(templateId));
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, {
    encoding: "utf8",
    flags: input.resume ? "a" : "w",
  }) : null;
  const ledgerHasher = createHash("sha256");
  if (resumeLedger.ledgerBody) ledgerHasher.update(resumeLedger.ledgerBody);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const failureSamples: AndroidLedgerRow[] = [];
  const caseRows: AndroidLedgerRow[] = [...resumedPassedRows.values()];
  let maxHeapUsedMb = 0;
  let browserAutomationStarted = false;
  let androidChromeLaunchedOrAttached = false;
  let cdpVersion: AndroidChromeCdpVersion | null = null;
  let healthBefore: AndroidEmulatorHealthResult | null = null;
  let healthAfter: AndroidEmulatorHealthResult | null = null;
  let device: AndroidApi34DeviceReadyResult | null = null;
  let server: ProductionGradeWebServerHandle | null = null;
  let runtimeLock: AndroidProofRuntimeLockHandle | null = null;
  let baseUrl = input.baseUrl?.replace(/\/+$/, "") ?? null;
  let setupFailure: string | null = null;
  const recoveryEvents: AndroidAutomationRecoveryEvent[] = [];

  try {
    runtimeLock = acquireAndroidProofRuntimeLock({
      runId,
      kind: "android-api34-natural-language-proof",
      outDir,
    });
    device = await ensureAndroidApi34DeviceReady({
      artifactDir: androidEnvironmentDir,
      bootTimeoutMs: 240_000,
      allowCreateAvd: true,
    });
    const web = await resolveWebServer({ baseUrl: baseUrl ?? undefined, outDir });
    baseUrl = web.baseUrl;
    server = web.server;
    healthBefore = checkAndroidEmulatorHealth({
      requireEmulator: true,
      requireChrome: true,
      serial: device.device_id,
      baseUrl: `${baseUrl}/request?android11610HealthBefore=${Date.now()}`,
      writeArtifact: true,
    }).artifact;
    if (device.final_status !== API34_DEVICE_READY || !device.device_id) {
      setupFailure = `android_api34_device_not_ready:${device.final_status}`;
    } else if (!healthBefore.android_lab_healthy) {
      setupFailure = `android_lab_not_healthy:${healthBefore.blocking_reasons.join("|")}`;
    }

    if (!setupFailure && device.device_id) {
      let session: AndroidChromeCdpSession | null = await openBoundedAndroidChromeSession({
        deviceId: device.device_id,
        baseUrl,
      });
      cdpVersion = session.cdpVersion;
      browserAutomationStarted = true;
      androidChromeLaunchedOrAttached = true;
      try {
        await session.page.bringToFront().catch(() => undefined);
        for (const templateId of pendingIds) {
          const passport = buildProfessionalWorkPassport(templateId);
          let row: AndroidLedgerRow;
          let retryCount = 0;
          let initialFailureCodes: string[] = [];
          let firstAttemptPassed = false;
          if (!passport) {
            row = withAttemptMetadata(missingPassportRow({ templateId, device }), {
              firstAttemptPassed: false,
              retryCount: 0,
              initialFailureCodes: ["passport_missing"],
            });
          } else {
            row = missingPassportRow({ templateId, device });
            for (let attempt = 1; attempt <= ANDROID_CASE_MAX_ATTEMPTS; attempt += 1) {
              const caseStarted = performance.now();
              let casePage: Page | null = null;
              try {
                if (!session) {
                  throw new Error("android_cdp_session_missing");
                }
                casePage = await createAndroidCasePage(session);
                row = await withTimeout(
                  "android_case_timeout",
                  ANDROID_CASE_TIMEOUT_MS,
                  runAndroidBrowserCase({ page: casePage, baseUrl, passport, device }),
                );
              } catch (error) {
                row = androidBrowserTimeoutRow({
                  passport,
                  device,
                  pageUrl: pageUrlNoThrow(casePage) ?? pageUrlNoThrow(session?.page ?? null) ?? "",
                  started: caseStarted,
                  message: error instanceof Error ? error.message : String(error),
                });
              }
              if (attempt === 1) {
                firstAttemptPassed = row.passed;
                initialFailureCodes = [...row.failure_codes];
              }
              if (row.passed || !recoverableAndroidAutomationFailure(row) || attempt >= ANDROID_CASE_MAX_ATTEMPTS) {
                await closeBoundedAndroidPage(casePage);
                break;
              }
              const evidencePath = await captureAndroidCaseFailureEvidence({
                outDir,
                templateId,
                attempt,
                row,
                session,
                page: casePage,
                device,
                action: "recover_android_chrome_cdp_after_crash",
              });
              await closeBoundedAndroidPage(casePage);
              recoveryEvents.push({
                at: new Date().toISOString(),
                template_id: templateId,
                attempt,
                reason: row.failure_codes.join("|"),
                sad_tab_visible: androidSadTabVisible(device.device_id),
                action: "force_stop_chrome_and_reopen_cdp_session",
              });
              console.warn(JSON.stringify({
                android_recovery_event: "force_stop_chrome_and_reopen_cdp_session",
                template_id: templateId,
                attempt,
                evidence_path: evidencePath,
                failure_domain: row.failure_domain,
                failure_codes: row.failure_codes,
              }));
              retryCount = attempt;
              session = await recoverAndroidChromeSession({
                session,
                deviceId: device.device_id,
                baseUrl,
              });
              cdpVersion = cdpVersion ?? session.cdpVersion;
            }
          row = withAttemptMetadata(row, {
            firstAttemptPassed,
            retryCount,
            initialFailureCodes,
          });
          if (!row.passed) {
            await captureAndroidCaseFailureEvidence({
              outDir,
              templateId,
              attempt: Math.max(1, retryCount + 1),
              row,
              session,
              page: null,
              device,
              action: "final_android_case_failure",
            });
          }
        }
          caseRows.push(row);
          const serializedRow = JSON.stringify(row);
          ledgerHasher.update(`${serializedRow}\n`);
          ledgerStream?.write(`${serializedRow}\n`);
          maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
          if ((!row.passed || row.recovered === true) && failureSamples.length < 50) failureSamples.push(row);
          const passedSoFar = caseRows.filter((caseRow) => caseRow.passed).length;
          const recoveredSoFar = caseRows.filter((caseRow) => caseRow.recovered === true).length;
          writeCheckpoint({
            checkpointPath,
            runId,
            sourceSha: gitOutput(["rev-parse", "HEAD"]),
            selectedTemplates: selectedIds.length,
            casesCompleted: caseRows.length,
            casesPassed: passedSoFar,
            casesRecovered: recoveredSoFar,
            lastTemplateId: row.template_id,
            failureSamples,
            recoveryEvents,
          });
          console.info(JSON.stringify({
            case_id: row.case_id,
            passed: row.passed,
            first_attempt_passed: row.first_attempt_passed ?? row.passed,
            recovered: row.recovered === true,
            retry_count: row.retry_count ?? 0,
            failure_domain: row.failure_domain,
            blockers_count: row.failure_codes.length,
            cases_done: caseRows.length,
            cases_total: selectedIds.length,
            resume_skipped_passed_cases: resumedPassedRows.size,
          }));
          if (caseRows.length > 0 && caseRows.length % 50 === 0) clearProfessionalWorkPassportBuildCaches();
        }
      } finally {
        await closeBoundedAndroidChromeSession(session);
      }
    }
  } catch (error) {
    setupFailure = error instanceof Error ? error.message : String(error);
  } finally {
    ledgerStream?.end();
    clearProfessionalWorkPassportBuildCaches();
    if (device?.device_id && baseUrl) {
      healthAfter = checkAndroidEmulatorHealth({
        requireEmulator: true,
        requireChrome: true,
        serial: device.device_id,
        baseUrl: `${baseUrl}/request?android11610HealthAfter=${Date.now()}`,
        writeArtifact: true,
      }).artifact;
    }
    server?.stop();
    runtimeLock?.release();
  }

  const passed = caseRows.filter((row) => row.passed).length;
  const pendingCaseFailuresFromSetup = setupFailure ? selectedIds.length - passed : 0;
  const casesFailed = caseRows.length - passed + pendingCaseFailuresFromSetup;
  const recoveredCases = caseRows.filter((row) => row.recovered === true).length;
  const retryCount = caseRows.reduce((sum, row) => sum + (row.retry_count ?? 0), 0);
  const rendererCrashCount = caseRows.filter((row) =>
    row.failure_codes.some((code) => code.startsWith("android_chrome_sad_tab_visible")) ||
    row.initial_failure_codes?.some((code) => code.startsWith("android_chrome_sad_tab_visible"))
  ).length;
  const timeoutCount = caseRows.filter((row) =>
    row.failure_codes.some((code) => /timeout/i.test(code)) ||
    row.initial_failure_codes?.some((code) => /timeout/i.test(code))
  ).length;
  const cdpDisconnectCount = caseRows.filter((row) =>
    row.failure_codes.some((code) => /android_page_create_timeout|Target page|Protocol error|Session closed|browserContext/i.test(code)) ||
    row.initial_failure_codes?.some((code) => /android_page_create_timeout|Target page|Protocol error|Session closed|browserContext/i.test(code))
  ).length;
  const browserCrashCount = recoveryEvents.filter((event) => /chrome_process/i.test(event.reason)).length;
  const serverCrashCount =
    (setupFailure && /WEB_SERVER_EARLY_EXIT|web_server_exited/i.test(setupFailure) ? 1 : 0) +
    caseRows.filter((row) =>
      row.failure_codes.some((code) => /WEB_SERVER_EARLY_EXIT|web_server_exited/i.test(code)) ||
      row.initial_failure_codes?.some((code) => /WEB_SERVER_EARLY_EXIT|web_server_exited/i.test(code))
    ).length;
  const ingressFailureCount =
    (setupFailure && /WEB_SERVER_|ANDROID_INGRESS|ERR_EMPTY_RESPONSE|net::ERR_|android_web_server_preflight/i.test(setupFailure) ? 1 : 0) +
    caseRows.filter((row) =>
      row.failure_codes.some((code) => /WEB_SERVER_|ANDROID_INGRESS|ERR_EMPTY_RESPONSE|net::ERR_/i.test(code)) ||
      row.initial_failure_codes?.some((code) => /WEB_SERVER_|ANDROID_INGRESS|ERR_EMPTY_RESPONSE|net::ERR_/i.test(code))
    ).length;
  const orphanProcessCount = 0;
  const caseDurations = caseRows.map((row) => row.duration_ms);
  const peakBoqRows = caseRows.reduce((max, row) => Math.max(max, row.boq_revision_row_count), 0);
  const fullRunRequested =
    input.all === true &&
    startIndex === 0 &&
    selectedIds.length === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    selection.shardCount == null;
  const androidPassed =
    fullRunRequested &&
    passed === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    setupFailure == null &&
    browserAutomationStarted &&
    androidChromeLaunchedOrAttached &&
    device?.final_status === API34_DEVICE_READY &&
    device.android_sdk === 34 &&
    healthBefore?.android_lab_healthy === true &&
    healthAfter?.android_lab_healthy === true &&
    recoveredCases === 0 &&
    retryCount === 0 &&
    rendererCrashCount === 0 &&
    browserCrashCount === 0 &&
    serverCrashCount === 0 &&
    timeoutCount === 0 &&
    cdpDisconnectCount === 0 &&
    ingressFailureCount === 0 &&
    orphanProcessCount === 0;
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);
  const setupFailureDomain = classifySetupFailure(setupFailure);
  const setupBlockers = [
    setupFailure,
    device?.final_status === API34_DEVICE_READY ? "" : `android_api34_device_status:${device?.final_status ?? "missing"}`,
    device?.android_sdk === 34 ? "" : `android_sdk_not_34:${device?.android_sdk ?? "missing"}`,
    healthBefore?.android_lab_healthy === true ? "" : `android_health_before:${healthBefore?.blocking_reasons.join("|") ?? "missing"}`,
    healthAfter?.android_lab_healthy === true ? "" : `android_health_after:${healthAfter?.blocking_reasons.join("|") ?? "missing"}`,
    rendererCrashCount === 0 ? "" : `android_renderer_crashes:${rendererCrashCount}`,
    browserCrashCount === 0 ? "" : `android_browser_crashes:${browserCrashCount}`,
    serverCrashCount === 0 ? "" : `android_server_crashes:${serverCrashCount}`,
    ingressFailureCount === 0 ? "" : `android_ingress_failures:${ingressFailureCount}`,
    orphanProcessCount === 0 ? "" : `android_orphan_processes:${orphanProcessCount}`,
    timeoutCount === 0 ? "" : `android_timeouts:${timeoutCount}`,
    recoveredCases === 0 ? "" : `android_recovered_cases:${recoveredCases}`,
    cdpDisconnectCount === 0 ? "" : `android_cdp_disconnects:${cdpDisconnectCount}`,
  ].filter(Boolean);
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_PROOF_SCHEMA,
    final_status: androidPassed
      ? STOP_AI_ESTIMATE_11610_ANDROID_API34_PASSED_PDF_OPEN_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_BLOCKED_NO_RELEASE,
    android_status: androidPassed
      ? GREEN_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_ANDROID_API34_NATURAL_LANGUAGE_REPLAY_BLOCKED_NO_RELEASE,
    release_started: false,
    deploy_started: false,
    eas_started: false,
    native_build_started: false,
    generated_at: new Date().toISOString(),
    started_at: startedAt,
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    source_tree_clean: sourceTreeStatus.length === 0,
    source_tree_status: sourceTreeStatus,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    corpus_hash: hashText(JSON.stringify({
      selected_template_ids: selectedIds,
      start_index: startIndex,
      selection_strategy: selection.selectionStrategy,
      matrix_size: input.matrixSize ?? null,
      matrix_take: input.matrixTake ?? null,
      shard_index: selection.shardIndex,
      shard_count: selection.shardCount,
    })),
    ledger_sha256: ledgerHasher.digest("hex"),
    base_url: baseUrl,
    web_server_pid: server?.pid ?? null,
    web_server_port: server?.port ?? null,
    web_server_owned_by_current_run: server?.owned_by_current_run ?? null,
    web_server_stdout_path: server?.stdout_path ?? null,
    web_server_stderr_path: server?.stderr_path ?? null,
    runtime_lock_path: runtimeLock?.path ?? null,
    target: "android-chrome",
    android_api34_device_ready: device?.final_status === API34_DEVICE_READY,
    android_device_id: device?.device_id ?? null,
    android_sdk: device?.android_sdk ?? null,
    android_cpu_abi: device?.cpu_abi ?? null,
    android_avd_name: device?.avd_name ?? null,
    android_chrome_version: healthBefore?.chrome_version ?? healthAfter?.chrome_version ?? null,
    android_cdp_json_version_reachable: cdpVersion != null,
    android_cdp_browser: cdpVersion?.Browser ?? null,
    android_cdp_protocol_version: cdpVersion?.["Protocol-Version"] ?? null,
    android_chrome_launched_or_attached: androidChromeLaunchedOrAttached,
    browser_automation_started: browserAutomationStarted,
    health_before: compactHealth(healthBefore),
    health_after: compactHealth(healthAfter),
    android_environment_path: path.join(androidEnvironmentDir, "android_api34_environment.json"),
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selected_templates: selectedIds.length,
    selection_strategy: selection.selectionStrategy,
    matrix_size: input.matrixSize ?? null,
    matrix_take: input.matrixTake ?? null,
    start_index: startIndex,
    shard_index: selection.shardIndex,
    shard_count: selection.shardCount,
    resume_enabled: input.resume === true,
    resume_run_id: input.runId ?? null,
    resume_skipped_passed_cases: resumedPassedRows.size,
    resume_ledger_rows_seen: resumeLedger.rows.length,
    resume_ledger_duplicate_rows: resumeLedger.duplicateRows,
    checkpoint_path: checkpointPath,
    cases_completed: caseRows.length,
    cases_passed: passed,
    cases_failed: casesFailed,
    first_attempt_passed_cases: caseRows.filter((row) => row.first_attempt_passed === true || (row.first_attempt_passed == null && row.passed)).length,
    recovered_cases: recoveredCases,
    retry_count: retryCount,
    renderer_crash_count: rendererCrashCount,
    browser_crash_count: browserCrashCount,
    server_crash_count: serverCrashCount,
    cdp_disconnect_count: cdpDisconnectCount,
    timeout_count: timeoutCount,
    ingress_failure_count: ingressFailureCount,
    orphan_process_count: orphanProcessCount,
    recovery_events: recoveryEvents,
    case_duration_ms_p50: percentile(caseDurations, 50),
    case_duration_ms_p95: percentile(caseDurations, 95),
    case_duration_ms_p99: percentile(caseDurations, 99),
    peak_boq_rows: peakBoqRows,
    full_11610_android_api34_completed: caseRows.length === PROFESSIONAL_WORK_PASSPORT_TOTAL,
    full_11610_android_api34_passed: androidPassed,
    limited_smoke_only: !fullRunRequested,
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    retained_failure_samples_count: failureSamples.length,
    setup_failure_domain: setupFailureDomain,
    setup_blockers: setupBlockers,
    failure_samples: failureSamples,
    summary_path: summaryPath,
    ledger_path: ledgerPath,
    fake_green_claimed: false,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  void runAiEstimate11610AndroidApi34NaturalLanguageProof({
    all: hasFlag("all"),
    limit: numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    baseUrl: argValue("base-url") ?? undefined,
    matrixSize: numericArg("matrix-size") ?? undefined,
    matrixTake: numericArg("matrix-take") ?? undefined,
    runId: argValue("run-id") ?? undefined,
    resume: hasFlag("resume"),
    shardIndex: numericArg("shard-index") ?? undefined,
    shardCount: numericArg("shard-count") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    writeLedger: hasFlag("write-ledger") || hasFlag("all"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.summary.final_status,
        android_status: result.summary.android_status,
        android_device_id: result.summary.android_device_id,
        android_sdk: result.summary.android_sdk,
        android_chrome_version: result.summary.android_chrome_version,
        android_cdp_json_version_reachable: result.summary.android_cdp_json_version_reachable,
        selected_templates: result.summary.selected_templates,
        selection_strategy: result.summary.selection_strategy,
        matrix_size: result.summary.matrix_size,
        matrix_take: result.summary.matrix_take,
        shard_index: result.summary.shard_index,
        shard_count: result.summary.shard_count,
        resume_skipped_passed_cases: result.summary.resume_skipped_passed_cases,
        cases_completed: result.summary.cases_completed,
        cases_passed: result.summary.cases_passed,
        cases_failed: result.summary.cases_failed,
        first_attempt_passed_cases: result.summary.first_attempt_passed_cases,
        recovered_cases: result.summary.recovered_cases,
        retry_count: result.summary.retry_count,
        renderer_crash_count: result.summary.renderer_crash_count,
        browser_crash_count: result.summary.browser_crash_count,
        server_crash_count: result.summary.server_crash_count,
        cdp_disconnect_count: result.summary.cdp_disconnect_count,
        timeout_count: result.summary.timeout_count,
        ingress_failure_count: result.summary.ingress_failure_count,
        orphan_process_count: result.summary.orphan_process_count,
        case_duration_ms_p50: result.summary.case_duration_ms_p50,
        case_duration_ms_p95: result.summary.case_duration_ms_p95,
        case_duration_ms_p99: result.summary.case_duration_ms_p99,
        peak_boq_rows: result.summary.peak_boq_rows,
        full_11610_android_api34_passed: result.summary.full_11610_android_api34_passed,
        limited_smoke_only: result.summary.limited_smoke_only,
        base_url: result.summary.base_url,
        setup_failure_domain: result.summary.setup_failure_domain,
        setup_blockers: result.summary.setup_blockers,
        failure_samples: result.summary.failure_samples.slice(0, 5),
        summary_path: result.summary.summary_path,
        ledger_path: result.summary.ledger_path,
      }, null, 2));
      if (
        result.summary.cases_failed > 0 ||
        result.summary.recovered_cases > 0 ||
        result.summary.renderer_crash_count > 0 ||
        result.summary.browser_crash_count > 0 ||
        result.summary.server_crash_count > 0 ||
        result.summary.cdp_disconnect_count > 0 ||
        result.summary.timeout_count > 0 ||
        result.summary.ingress_failure_count > 0 ||
        result.summary.orphan_process_count > 0
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
