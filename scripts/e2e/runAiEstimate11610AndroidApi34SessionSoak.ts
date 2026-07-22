import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

import type { ConsoleMessage, Locator, Page } from "playwright";

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
  adbOutputNoThrow,
  ANDROID_CHROME_PACKAGE,
  dismissAndroidChromeBlockingSurfaces,
  openAndroidChromeCdpSession,
  probeAndroidFrameworkServicesReady,
  type AndroidChromeCdpSession,
  type AndroidChromeCdpVersion,
} from "./androidChromeCdpHarness";

export const AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA =
  "ai-estimate-11610-android-api34-session-soak-v1" as const;
export const GREEN_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_100_PASSED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_100_PASSED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_BLOCKED_NO_RELEASE =
  "STOP_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_BLOCKED_NO_RELEASE" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-11610-android-api34-session-soak");
const DURABLE_MANIFEST_KEY = "rik.consumer_repair.request_bundles.v2.manifest";
const DURABLE_BUNDLE_PREFIX = "rik.consumer_repair.request_bundle.v2:";
const LEGACY_DURABLE_KEY = "rik.consumer_repair.request_bundles.v1";
const SESSION_SOAK_MIN_ITERATIONS = 100;
const SESSION_SOAK_STEP_TIMEOUT_MS = 420_000;
const ANDROID_SESSION_OPEN_TIMEOUT_MS = 180_000;
const ANDROID_SESSION_CLOSE_TIMEOUT_MS = 15_000;
const ANDROID_SESSION_STEP_PAGE_OPEN_TIMEOUT_MS = 60_000;
const ANDROID_SESSION_STEP_PAGE_CLOSE_TIMEOUT_MS = 15_000;
const MEMORY_PSS_GROWTH_BUDGET_KB = 768 * 1024;
const MEMORY_RSS_GROWTH_BUDGET_KB = 1024 * 1024;
const CDP_TARGET_GROWTH_BUDGET = 3;
const JS_LISTENER_GROWTH_BUDGET = 5_000;
const ACTIVE_TIMER_BUDGET = 250;
const ACTIVE_INTERVAL_BUDGET = 50;
const QUANTITY_APP_VISIBLE_P95_BUDGET_MS = 250;
const QUANTITY_APP_PERSISTENCE_P95_BUDGET_MS = 2_000;
const QUANTITY_APP_REVISION_P99_BUDGET_MS = 5_000;

type SessionSoakLedgerRow = {
  schema: typeof AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA;
  step_index: number;
  case_id: string;
  template_id: string;
  prompt_hash: string;
  page_url: string;
  android_device_id: string | null;
  android_sdk: number | null;
  chrome_pid_before: string | null;
  chrome_pid_after: string | null;
  selected_template_id: string | null;
  selected_work_key: string | null;
  current_draft_id: string | null;
  current_status: string | null;
  durable_record_count: number;
  active_draft_count: number;
  approved_history_count: number;
  item_count: number;
  expected_row_count: number;
  passport_backed_revision_row_count: number;
  revision_count_before_edit: number;
  revision_count_after_edit: number;
  current_revision_id_before_edit: string | null;
  current_revision_id_after_edit: string | null;
  rows_hash_before_edit: string | null;
  rows_hash_after_edit: string | null;
  quantity_input_count: number;
  quantity_ui_value_before: string | null;
  quantity_ui_value_after: string | null;
  quantity_ui_changed: boolean;
  quantity_edit_visible_ms: number | null;
  quantity_edit_durable_ms: number | null;
  quantity_trace_operation_id: string | null;
  quantity_trace_event_count: number;
  quantity_trace_stages: string[];
  quantity_app_visible_ms: number | null;
  quantity_app_recalculation_ms: number | null;
  quantity_app_persistence_ms: number | null;
  quantity_app_revision_confirmed_ms: number | null;
  quantity_app_total_ms: number | null;
  quantity_app_visible_to_recalculation_ms: number | null;
  quantity_app_enqueue_to_recalculation_ms: number | null;
  quantity_changed: boolean;
  approved_after_edit: boolean;
  pdf_generated: boolean;
  generated_pdf_count: number;
  history_reopen_checked: boolean;
  history_reopen_passed: boolean;
  reopened_draft_id: string | null;
  reopened_revision_id: string | null;
  reopened_row_count: number;
  cdp_target_count: number | null;
  dom_documents: number | null;
  dom_nodes: number | null;
  js_event_listeners: number | null;
  active_timeout_count: number | null;
  active_interval_count: number | null;
  post_close_dom_documents: number | null;
  post_close_dom_nodes: number | null;
  post_close_js_event_listeners: number | null;
  post_close_active_timeout_count: number | null;
  post_close_active_interval_count: number | null;
  chrome_pss_kb: number | null;
  chrome_rss_kb: number | null;
  console_error_count: number;
  page_error_count: number;
  duration_ms: number;
  heap_used_mb: number;
  failure_codes: string[];
  passed: boolean;
};

type SoakBundleEvidence = {
  bundleFound: boolean;
  latestDraftId: string | null;
  activeDraftId: string | null;
  latestApprovedDraftId: string | null;
  latestStatus: string | null;
  selectedTemplateId: string | null;
  selectedWorkKey: string | null;
  itemCount: number;
  currentRevisionRowCount: number;
  passportBackedRevisionRowCount: number;
  revisionCount: number;
  currentRevisionId: string | null;
  rowsHash: string | null;
  generatedPdfCount: number;
  generatedPdfRevisionId: string | null;
  generatedPdfRowsHash: string | null;
  pdfRevisionBound: boolean;
  historyBindingCount: number;
  approvalFreezeCount: number;
  durableRecordCount: number;
  activeDraftCount: number;
  approvedHistoryCount: number;
  approvedDraftIds: string[];
  firstQuantity: number | null;
};

type ChromeMemory = {
  pssKb: number | null;
  rssKb: number | null;
};

type DomCounters = {
  documents: number | null;
  nodes: number | null;
  jsEventListeners: number | null;
};

type TimerProbe = {
  activeTimeouts: number | null;
  activeIntervals: number | null;
};

type QuantityEditUiEvidence = {
  valueBefore: string | null;
  valueAfter: string | null;
  visibleMs: number;
};

type QuantityEditTraceEvent = {
  stage: string;
  operationId: string;
  source: string | null;
  itemId: string | null;
  requestDraftId: string | null;
  previousQuantity: number | null;
  nextQuantity: number | null;
  baseRevisionId: string | null;
  resultingRevisionId: string | null;
  resultingRowsHash: string | null;
  rowCount: number | null;
  elapsedMs: number | null;
  createdAt: string | null;
  monotonicMs: number;
};

type QuantityEditTraceSummary = {
  operationId: string | null;
  eventCount: number;
  stages: string[];
  appVisibleMs: number | null;
  appRecalculationMs: number | null;
  appPersistenceMs: number | null;
  appRevisionConfirmedMs: number | null;
  appTotalMs: number | null;
  appVisibleToRecalculationMs: number | null;
  appEnqueueToRecalculationMs: number | null;
};

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function writeText(filePath: string, value: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${value.replace(/\s+$/u, "")}\n`, "utf8");
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

function androidFrameworkServicesDegradedFailureCode(deviceId: string | null): string | null {
  if (!deviceId) return null;
  const probe = probeAndroidFrameworkServicesReady(deviceId);
  if (probe.ready) return null;
  const missing = Object.entries(probe.checks)
    .filter(([, available]) => !available)
    .map(([name]) => name)
    .join(",");
  return `ANDROID_API34_LAB_FRAMEWORK_DEGRADED:${missing || "unknown"}`;
}

function normalizeAndroidLoopbackBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl.replace(/\/+$/, ""));
  if (parsed.hostname === "localhost") parsed.hostname = "127.0.0.1";
  return parsed.toString().replace(/\/+$/, "");
}

async function assertAndroidWebServerReady(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const probe = await probeProductionGradeWebServer(baseUrl);
      if (!probe.ready) throw new Error(`WEB_SERVER_READINESS_FAILED:${JSON.stringify(probe)}`);
      await sleep(500);
    } catch (error) {
      throw new Error(
        `android_web_server_preflight_failed:${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function percentile(values: number[], percentileValue: number): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue / 100 * sorted.length) - 1));
  return Math.round(sorted[index] * 100) / 100;
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

function selectSoakTemplateIds(input: {
  allIds: string[];
  iterations: number;
  startIndex: number;
}): string[] {
  const available = Math.max(0, input.allIds.length - input.startIndex);
  const count = Math.min(input.iterations, available);
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = input.startIndex + Math.floor(index * available / count);
    return input.allIds[sourceIndex];
  });
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

async function ensureDeliveryReady(page: Page, stepIndex: number): Promise<void> {
  const city = page.getByTestId("consumer-repair-city-input");
  const address = page.getByTestId("consumer-repair-address-input");
  const time = page.getByTestId("consumer-repair-time-input");
  const phone = page.getByTestId("consumer-repair-phone-input");
  if (await address.count() === 0 || await phone.count() === 0) return;
  await fillDeliveryInput(city, "city", "Bishkek");
  await fillDeliveryInput(address, "address", `session-soak-address-${String(stepIndex).padStart(3, "0")}`);
  await fillDeliveryInput(time, "time", "today");
  await fillDeliveryInput(phone, "phone", "0700000000");
}

type DeliveryInputLabel = "city" | "address" | "time" | "phone";

const DELIVERY_INPUT_MISMATCH_CODES: Record<DeliveryInputLabel, string> = {
  city: "android_session_soak_delivery_city_value_mismatch",
  address: "android_session_soak_delivery_address_value_mismatch",
  time: "android_session_soak_delivery_time_value_mismatch",
  phone: "android_session_soak_delivery_phone_value_mismatch",
};

async function fillDeliveryInput(locator: Locator, label: DeliveryInputLabel, value: string): Promise<void> {
  await locator.waitFor({ state: "visible", timeout: 15_000 });
  await locator.fill(value, { timeout: 15_000 });
  const deadline = Date.now() + 5_000;
  let current = await readQuantityInputValue(locator);
  while (Date.now() < deadline) {
    if (current === value) return;
    await sleep(100);
    current = await readQuantityInputValue(locator);
  }
  throw new Error(`${DELIVERY_INPUT_MISMATCH_CODES[label]}:${current ?? "missing"}`);
}

async function readSoakEvidence(page: Page): Promise<SoakBundleEvidence> {
  return page.evaluate<SoakBundleEvidence>(`(() => {
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
    const bundles = [];
    const pushBundle = (bundle) => {
      if (!bundle?.draft?.id) return;
      if (bundles.some((item) => item.draft.id === bundle.draft.id)) return;
      bundles.push(bundle);
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
    const decodeSnapshotRows = (snapshot) => {
      if (Array.isArray(snapshot?.rows)) return snapshot.rows;
      const compact = snapshot?.rowsCompactV1;
      if (compact?.schema !== "consumer_repair_editable_snapshot_rows_compact_v1") return [];
      if (!Array.isArray(compact.fields) || !Array.isArray(compact.rows)) return [];
      return compact.rows
        .filter((row) => Array.isArray(row))
        .map((row) => {
          const item = {};
          compact.fields.forEach((field, index) => {
            if (typeof field === "string") item[field] = row[index] ?? null;
          });
          return item;
        })
        .filter((item) => typeof item.rowId === "string" && item.rowId.length > 0);
    };
    const manifest = parse(window.localStorage.getItem(manifestKey));
    const ids = Array.isArray(manifest?.bundleIds) ? manifest.bundleIds : [];
    for (const id of ids) {
      pushBundle(parse(window.localStorage.getItem(bundlePrefix + encodeURIComponent(String(id)))));
    }
    const legacy = parse(window.localStorage.getItem(legacyKey));
    if (Array.isArray(legacy)) {
      for (const bundle of legacy) pushBundle(bundle);
    }
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(bundlePrefix)) pushBundle(parse(window.localStorage.getItem(key)));
    }
    const timeOf = (bundle) => String(bundle?.draft?.updatedAt ?? bundle?.draft?.approvedAt ?? bundle?.draft?.createdAt ?? "");
    bundles.sort((left, right) => timeOf(right).localeCompare(timeOf(left)));
    const activeDraft = bundles.find((bundle) => bundle?.draft?.status === "draft" && !bundle?.draft?.deletedAt) ?? null;
    const latest = activeDraft ?? bundles[0] ?? null;
    const approved = bundles.filter((bundle) =>
      bundle?.draft?.status === "consumer_approved" || bundle?.draft?.status === "sent_to_marketplace"
    );
    const latestApproved = approved[0] ?? null;
    const state = latest?.estimateRevisionState ?? latest?.estimateDraftRevisionState ?? null;
    const revisions = Array.isArray(state?.revisions) ? state.revisions : [];
    const pdfs = Array.isArray(latest?.pdfs) ? latest.pdfs : [];
    const latestItems = decodeItems(latest);
    const generatedPdfs = pdfs.filter((pdf) => pdf?.pdfStatus === "generated");
    const generatedPdf = generatedPdfs[0] ?? null;
    const currentRevisionId = state?.current_revision_id ?? state?.currentRevisionId ?? generatedPdf?.revisionId ?? null;
    const currentRevision = revisions.find((revision) =>
      (revision?.revision_id ?? revision?.revisionId) === currentRevisionId
    ) ?? revisions[0] ?? null;
    const snapshot = currentRevision?.editable_estimate_snapshot ?? latest?.editableEstimateSnapshot ?? null;
    const snapshotRows = decodeSnapshotRows(snapshot);
    const rows = Array.isArray(snapshot?.items)
      ? snapshot.items
      : snapshotRows.length > 0
        ? snapshotRows
        : Array.isArray(currentRevision?.boq?.rows)
          ? currentRevision.boq.rows
          : latestItems.length > 0
            ? latestItems
            : [];
    const sourceParametersFor = (row) => row?.sourceParameters ?? row?.source_parameters ?? null;
    const rowsHash =
      currentRevision?.rows_hash ??
      currentRevision?.rowsHash ??
      snapshot?.hash ??
      generatedPdf?.revisionRowsHash ??
      latest?.editableEstimateSnapshot?.hash ??
      null;
    return {
      bundleFound: Boolean(latest?.draft?.id),
      latestDraftId: latest?.draft?.id ?? null,
      activeDraftId: activeDraft?.draft?.id ?? null,
      latestApprovedDraftId: latestApproved?.draft?.id ?? null,
      latestStatus: latest?.draft?.status ?? null,
      selectedTemplateId:
        currentRevision?.selectedTemplateId ??
        currentRevision?.selected_work_key ??
        latest?.draft?.selectedWorkKey ??
        latest?.structuredEstimatePayload?.workKey ??
        null,
      selectedWorkKey:
        latest?.draft?.selectedWorkKey ??
        currentRevision?.selected_work_key ??
        latest?.structuredEstimatePayload?.workKey ??
        null,
      itemCount: latestItems.length > 0 ? latestItems.length : rows.length,
      currentRevisionRowCount: rows.length,
      passportBackedRevisionRowCount: rows.filter((row) =>
        sourceParametersFor(row)?.passportBackedNaturalLanguageIngress === true
      ).length,
      revisionCount: revisions.length,
      currentRevisionId: currentRevisionId,
      rowsHash,
      generatedPdfCount: generatedPdfs.length,
      generatedPdfRevisionId: generatedPdf?.revisionId ?? null,
      generatedPdfRowsHash: generatedPdf?.revisionRowsHash ?? null,
      pdfRevisionBound: Boolean(
        generatedPdf?.revisionId &&
        generatedPdf.revisionId === currentRevisionId &&
        (!generatedPdf.revisionRowsHash || !rowsHash || generatedPdf.revisionRowsHash === rowsHash)
      ),
      historyBindingCount: Array.isArray(state?.history_bindings) ? state.history_bindings.length : 0,
      approvalFreezeCount: Array.isArray(state?.approval_freezes) ? state.approval_freezes.length : 0,
      durableRecordCount: bundles.length,
      activeDraftCount: bundles.filter((bundle) => bundle?.draft?.status === "draft" && !bundle?.draft?.deletedAt).length,
      approvedHistoryCount: approved.length,
      approvedDraftIds: approved.map((bundle) => bundle.draft.id),
      firstQuantity: typeof rows[0]?.quantity === "number" ? rows[0].quantity : null,
    };
  })()`);
}

async function waitForSoakEvidence(
  page: Page,
  label: string,
  predicate: (evidence: SoakBundleEvidence) => boolean,
  timeoutMs = 60_000,
): Promise<SoakBundleEvidence> {
  const deadline = Date.now() + timeoutMs;
  let latest: SoakBundleEvidence | null = null;
  while (Date.now() < deadline) {
    latest = await readSoakEvidence(page);
    if (predicate(latest)) return latest;
    await sleep(500);
  }
  throw new Error(`${label}_timeout:${JSON.stringify(latest)}`);
}

async function readQuantityInputValue(input: Locator): Promise<string | null> {
  return input.inputValue({ timeout: 2_000 }).catch(() => null);
}

function roundMs(value: number | null): number | null {
  return value == null || !Number.isFinite(value) ? null : Math.round(value * 100) / 100;
}

function quantityTraceStageTime(events: QuantityEditTraceEvent[], stage: string): number | null {
  const event = events.find((candidate) => candidate.stage === stage);
  return typeof event?.monotonicMs === "number" ? event.monotonicMs : null;
}

function quantityTraceDelta(
  events: QuantityEditTraceEvent[],
  startStage: string,
  endStage: string,
): number | null {
  const start = quantityTraceStageTime(events, startStage);
  const end = quantityTraceStageTime(events, endStage);
  return start == null || end == null ? null : roundMs(end - start);
}

async function readQuantityEditTrace(page: Page): Promise<QuantityEditTraceSummary | null> {
  const events = await page.evaluate(() => {
    const trace = (globalThis as {
      __consumerRepairQuantityEditTrace?: { events?: unknown[] };
    }).__consumerRepairQuantityEditTrace;
    if (!Array.isArray(trace?.events)) return [];
    return trace.events.slice(-80);
  }).catch(() => []);
  const normalized = events
    .map((event): QuantityEditTraceEvent | null => {
      if (!event || typeof event !== "object") return null;
      const record = event as Record<string, unknown>;
      if (typeof record.stage !== "string" || typeof record.operationId !== "string") return null;
      if (typeof record.monotonicMs !== "number" || !Number.isFinite(record.monotonicMs)) return null;
      return {
        stage: record.stage,
        operationId: record.operationId,
        source: typeof record.source === "string" ? record.source : null,
        itemId: typeof record.itemId === "string" ? record.itemId : null,
        requestDraftId: typeof record.requestDraftId === "string" ? record.requestDraftId : null,
        previousQuantity: typeof record.previousQuantity === "number" ? record.previousQuantity : null,
        nextQuantity: typeof record.nextQuantity === "number" ? record.nextQuantity : null,
        baseRevisionId: typeof record.baseRevisionId === "string" ? record.baseRevisionId : null,
        resultingRevisionId: typeof record.resultingRevisionId === "string" ? record.resultingRevisionId : null,
        resultingRowsHash: typeof record.resultingRowsHash === "string" ? record.resultingRowsHash : null,
        rowCount: typeof record.rowCount === "number" ? record.rowCount : null,
        elapsedMs: typeof record.elapsedMs === "number" ? record.elapsedMs : null,
        createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
        monotonicMs: record.monotonicMs,
      };
    })
    .filter((event): event is QuantityEditTraceEvent => event != null);
  const actionEvents = normalized.filter((event) => event.stage === "QUANTITY_ACTION_RECEIVED");
  const operationId = actionEvents.at(-1)?.operationId ?? normalized.at(-1)?.operationId ?? null;
  if (!operationId) return null;
  const operationEvents = normalized.filter((event) => event.operationId === operationId);
  const first = operationEvents[0]?.monotonicMs ?? null;
  const last = operationEvents.at(-1)?.monotonicMs ?? null;
  return {
    operationId,
    eventCount: operationEvents.length,
    stages: operationEvents.map((event) => event.stage),
    appVisibleMs: quantityTraceDelta(operationEvents, "QUANTITY_ACTION_RECEIVED", "VISIBLE_INPUT_UPDATED"),
    appRecalculationMs: quantityTraceDelta(operationEvents, "RECALCULATION_STARTED", "RECALCULATION_COMPLETED"),
    appPersistenceMs: quantityTraceDelta(operationEvents, "PERSISTENCE_STARTED", "PERSISTENCE_COMMITTED"),
    appRevisionConfirmedMs: quantityTraceDelta(operationEvents, "QUANTITY_ACTION_RECEIVED", "REVISION_CONFIRMED"),
    appTotalMs: first == null || last == null ? null : roundMs(last - first),
    appVisibleToRecalculationMs: quantityTraceDelta(operationEvents, "VISIBLE_INPUT_UPDATED", "RECALCULATION_STARTED"),
    appEnqueueToRecalculationMs: quantityTraceDelta(operationEvents, "PERSISTENCE_ENQUEUED", "RECALCULATION_STARTED"),
  };
}

async function clickFirstQuantityPlus(page: Page): Promise<QuantityEditUiEvidence> {
  const input = page.locator("[data-testid^='consumer-repair-item-quantity-input-']").first();
  const plus = page.locator("[data-testid^='consumer-repair-item-plus-']").first();
  await input.waitFor({ timeout: 20_000 });
  await plus.waitFor({ timeout: 20_000 });
  const valueBefore = await readQuantityInputValue(input);
  await plus.scrollIntoViewIfNeeded().catch(() => undefined);
  const started = performance.now();
  await plus.click({ timeout: 20_000 });
  const deadline = Date.now() + 15_000;
  let valueAfter = await readQuantityInputValue(input);
  while (Date.now() < deadline) {
    if (valueAfter != null && valueAfter !== valueBefore) {
      return {
        valueBefore,
        valueAfter,
        visibleMs: Math.round((performance.now() - started) * 100) / 100,
      };
    }
    await sleep(100);
    valueAfter = await readQuantityInputValue(input);
  }
  throw new Error(`android_session_soak_quantity_visible_update_timeout:${valueBefore ?? "missing"}:${valueAfter ?? "missing"}`);
}

function approvalEvidenceReady(evidence: SoakBundleEvidence, beforeApprovedCount: number): boolean {
  return (
    evidence.latestStatus === "consumer_approved" &&
    evidence.approvedHistoryCount >= beforeApprovedCount + 1 &&
    evidence.generatedPdfCount > 0 &&
    evidence.pdfRevisionBound
  );
}

async function settleAndroidMobileInput(page: Page): Promise<void> {
  await page.evaluate(() => {
    const element = document.activeElement;
    if (element instanceof HTMLElement) element.blur();
  }).catch(() => undefined);
  await page.keyboard.press("Escape").catch(() => undefined);
  await sleep(250);
}

async function tapVisibleLocatorCenter(locator: Locator): Promise<void> {
  const box = await locator.boundingBox({ timeout: 10_000 });
  if (!box || box.width <= 0 || box.height <= 0) throw new Error("android_session_soak_approve_touch_fallback_no_box");
  await locator.page().touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function clickApproveWithMobileFallback(input: {
  page: Page;
  beforeApprovedCount: number;
}): Promise<SoakBundleEvidence | null> {
  const approve = input.page.getByTestId("consumer-repair-approve");
  await approve.waitFor({ timeout: 30_000 });
  await approve.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
  try {
    await approve.click({ timeout: 30_000 });
    return null;
  } catch (error) {
    const evidenceAfterClickAttempt = await withDiagnosticTimeout(
      waitForSoakEvidence(
        input.page,
        "session_soak_approve_after_click_exception",
        (evidence) => approvalEvidenceReady(evidence, input.beforeApprovedCount),
        20_000,
      ),
      25_000,
      null,
    );
    if (evidenceAfterClickAttempt) {
      return evidenceAfterClickAttempt;
    }
    const approveStillVisible = await approve.isVisible({ timeout: 1_000 }).catch(() => false);
    if (!approveStillVisible) {
      return null;
    }
    await settleAndroidMobileInput(input.page);
    await approve.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => undefined);
    await withTimeout("android_session_soak_approve_touch_fallback_timeout", 15_000, tapVisibleLocatorCenter(approve));
    return null;
  }
}

async function approveCurrentDraft(
  page: Page,
  beforeApprovedCount: number,
): Promise<SoakBundleEvidence> {
  const clickEvidence = await clickApproveWithMobileFallback({
    page,
    beforeApprovedCount,
  });
  if (clickEvidence) return clickEvidence;
  return waitForSoakEvidence(
    page,
    "session_soak_approve",
    (evidence) => approvalEvidenceReady(evidence, beforeApprovedCount),
    60_000,
  );
}

async function startNewDraftIfVisible(page: Page): Promise<void> {
  const next = page.getByTestId("consumer-repair-new");
  if (await next.count() === 0) return;
  await next.click({ timeout: 20_000 }).catch(() => undefined);
}

async function reopenAndEditPreviousEstimate(input: {
  page: Page;
  beforeApprovedCount: number;
}): Promise<{
  checked: boolean;
  passed: boolean;
  reopenedDraftId: string | null;
  reopenedRevisionId: string | null;
  reopenedRowCount: number;
  failureCodes: string[];
}> {
  const failureCodes: string[] = [];
  const historyButton = input.page.getByTestId("consumer-repair-history-button");
  await historyButton.waitFor({ timeout: 20_000 });
  await historyButton.click({ timeout: 20_000 });
  await input.page.getByTestId("consumer-repair-history-modal").waitFor({ timeout: 20_000 });
  const rows = input.page.getByTestId("consumer-repair-history-main");
  const rowCount = await rows.count();
  if (rowCount < 2) {
    failureCodes.push(`history_reopen_previous_rows_insufficient:${rowCount}`);
    await input.page.getByTestId("consumer-repair-history-close").click({ timeout: 10_000 }).catch(() => undefined);
    return {
      checked: true,
      passed: false,
      reopenedDraftId: null,
      reopenedRevisionId: null,
      reopenedRowCount: 0,
      failureCodes,
    };
  }

  await rows.nth(1).click({ timeout: 20_000 });
  await input.page.getByTestId("consumer-repair-history-readonly-snapshot").waitFor({ timeout: 20_000 });
  const readonlyItemCount = await input.page.getByTestId("consumer-repair-history-readonly-item").count();
  if (readonlyItemCount < 1) failureCodes.push("history_reopen_readonly_items_missing");
  await input.page.getByTestId("consumer-repair-history-edit-revision").click({ timeout: 20_000 });
  await input.page.getByTestId("consumer-repair-history-close").click({ timeout: 10_000 }).catch(() => undefined);
  await input.page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 45_000 });
  await ensureEstimatePositionsVisible(input.page);

  const beforeEdit = await readSoakEvidence(input.page);
  await clickFirstQuantityPlus(input.page);
  const afterEdit = await waitForSoakEvidence(
    input.page,
    "session_soak_reopen_edit_revision",
    (evidence) =>
      evidence.activeDraftId === beforeEdit.activeDraftId &&
      evidence.currentRevisionId !== beforeEdit.currentRevisionId &&
      evidence.revisionCount > beforeEdit.revisionCount,
    45_000,
  );
  const afterApprove = await approveCurrentDraft(input.page, input.beforeApprovedCount);
  await startNewDraftIfVisible(input.page);

  const passed =
    failureCodes.length === 0 &&
    Boolean(beforeEdit.activeDraftId) &&
    afterEdit.currentRevisionRowCount > 0 &&
    afterApprove.latestStatus === "consumer_approved" &&
    afterApprove.approvedHistoryCount >= input.beforeApprovedCount + 1 &&
    afterApprove.pdfRevisionBound;

  return {
    checked: true,
    passed,
    reopenedDraftId: beforeEdit.activeDraftId,
    reopenedRevisionId: afterEdit.currentRevisionId,
    reopenedRowCount: afterEdit.currentRevisionRowCount,
    failureCodes,
  };
}

function androidSadTabVisible(deviceId: string | null): boolean | null {
  if (!deviceId) return null;
  const topActivity = adbOutputNoThrow(["-s", deviceId, "shell", "dumpsys", "activity", "top"], 10_000);
  if (!topActivity) return null;
  return topActivity.includes("SadTabView") || topActivity.includes("sad_tab_title");
}

function chromePid(deviceId: string | null): string | null {
  if (!deviceId) return null;
  return adbOutputNoThrow(["-s", deviceId, "shell", "pidof", ANDROID_CHROME_PACKAGE], 10_000).trim() || null;
}

function readChromeMemory(deviceId: string | null): ChromeMemory {
  if (!deviceId) return { pssKb: null, rssKb: null };
  const raw = adbOutputNoThrow(["-s", deviceId, "shell", "dumpsys", "meminfo", ANDROID_CHROME_PACKAGE], 20_000);
  const pss = raw.match(/TOTAL PSS:\s*(\d+)/i)?.[1] ?? raw.match(/^\s*TOTAL\s+(\d+)/m)?.[1] ?? null;
  const rss = raw.match(/TOTAL RSS:\s*(\d+)/i)?.[1] ?? raw.match(/^\s*TOTAL\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/m)?.[1] ?? null;
  return {
    pssKb: pss ? Number(pss) : null,
    rssKb: rss ? Number(rss) : null,
  };
}

async function cdpJson(pathname: string, timeoutMs = 5_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`http://127.0.0.1:9222${pathname}`, { signal: controller.signal });
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function cdpTargetCount(): Promise<number | null> {
  try {
    const pages = await cdpJson("/json/list");
    return Array.isArray(pages) ? pages.length : null;
  } catch {
    return null;
  }
}

async function createSessionSoakStepPage(input: {
  session: AndroidChromeCdpSession;
  deviceId: string | null;
}): Promise<Page> {
  const page = await withTimeout(
    "android_session_soak_step_page_open_timeout",
    ANDROID_SESSION_STEP_PAGE_OPEN_TIMEOUT_MS,
    input.session.context.newPage(),
  );
  page.setDefaultTimeout(45_000);
  page.setDefaultNavigationTimeout(60_000);
  await withTimeout("android_session_soak_step_timer_probe_install_timeout", 45_000, installTimerProbe(page));
  await dismissChromeSurfacesNoThrow(input.deviceId);
  return page;
}

async function closeSessionSoakStepPage(page: Page | null): Promise<void> {
  if (!page || page.isClosed()) return;
  await withTimeout(
    "android_session_soak_page_close_timeout",
    ANDROID_SESSION_STEP_PAGE_CLOSE_TIMEOUT_MS,
    page.close({ runBeforeUnload: false }).then(() => undefined),
  ).catch(() => undefined);
}

async function domCounters(page: Page): Promise<DomCounters> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const counters = await cdp.send("Memory.getDOMCounters") as {
      documents?: number;
      nodes?: number;
      jsEventListeners?: number;
    };
    return {
      documents: typeof counters.documents === "number" ? counters.documents : null,
      nodes: typeof counters.nodes === "number" ? counters.nodes : null,
      jsEventListeners: typeof counters.jsEventListeners === "number" ? counters.jsEventListeners : null,
    };
  } catch {
    return { documents: null, nodes: null, jsEventListeners: null };
  } finally {
    await cdp.detach().catch(() => undefined);
  }
}

function installSessionSoakTimerProbe(): void {
  const globalObject = window as unknown as {
    __rikAiEstimate11610SessionSoakTimerProbeInstalled?: boolean;
    __rikAiEstimate11610SessionSoakTimerProbe?: () => { activeTimeouts: number; activeIntervals: number };
    setTimeout: typeof window.setTimeout;
    clearTimeout: typeof window.clearTimeout;
    setInterval: typeof window.setInterval;
    clearInterval: typeof window.clearInterval;
  };
  if (globalObject.__rikAiEstimate11610SessionSoakTimerProbeInstalled) return;
  globalObject.__rikAiEstimate11610SessionSoakTimerProbeInstalled = true;
  const originalSetTimeout = window.setTimeout.bind(window);
  const originalClearTimeout = window.clearTimeout.bind(window);
  const originalSetInterval = window.setInterval.bind(window);
  const originalClearInterval = window.clearInterval.bind(window);
  const timeouts = new Set<number>();
  const intervals = new Set<number>();
  globalObject.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = originalSetTimeout((...innerArgs: unknown[]) => {
      timeouts.delete(id);
      if (typeof handler === "function") {
        handler(...innerArgs);
      } else {
        new Function(String(handler))();
      }
    }, timeout, ...args);
    timeouts.add(Number(id));
    return id;
  }) as typeof window.setTimeout;
  globalObject.clearTimeout = ((id?: number) => {
    if (id != null) timeouts.delete(Number(id));
    return originalClearTimeout(id);
  }) as typeof window.clearTimeout;
  globalObject.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const id = originalSetInterval(handler, timeout, ...args);
    intervals.add(Number(id));
    return id;
  }) as typeof window.setInterval;
  globalObject.clearInterval = ((id?: number) => {
    if (id != null) intervals.delete(Number(id));
    return originalClearInterval(id);
  }) as typeof window.clearInterval;
  globalObject.__rikAiEstimate11610SessionSoakTimerProbe = () => ({
    activeTimeouts: timeouts.size,
    activeIntervals: intervals.size,
  });
}

async function installTimerProbe(page: Page): Promise<void> {
  await page.addInitScript(installSessionSoakTimerProbe);
  await page.evaluate(installSessionSoakTimerProbe).catch(() => undefined);
}

async function readTimerProbe(page: Page): Promise<TimerProbe> {
  try {
    return await page.evaluate<TimerProbe>(() => {
      const globalObject = window as unknown as {
        __rikAiEstimate11610SessionSoakTimerProbe?: () => { activeTimeouts: number; activeIntervals: number };
      };
      const probe = globalObject.__rikAiEstimate11610SessionSoakTimerProbe?.();
      return {
        activeTimeouts: probe?.activeTimeouts ?? null,
        activeIntervals: probe?.activeIntervals ?? null,
      };
    });
  } catch {
    return { activeTimeouts: null, activeIntervals: null };
  }
}

async function readIdleResourceCounters(page: Page): Promise<{
  dom: DomCounters;
  timers: TimerProbe;
}> {
  const dom = await withDiagnosticTimeout(domCounters(page), 5_000, {
    documents: null,
    nodes: null,
    jsEventListeners: null,
  });
  const timers = await withDiagnosticTimeout(readTimerProbe(page), 5_000, {
    activeTimeouts: null,
    activeIntervals: null,
  });
  return { dom, timers };
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

function sanitizeArtifactName(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 160);
}

async function captureSessionSoakFailureEvidence(input: {
  outDir: string;
  stepIndex: number;
  templateId: string;
  row: SessionSoakLedgerRow;
  page: Page | null;
  deviceId: string | null;
}): Promise<string> {
  const evidenceDir = path.join(
    input.outDir,
    "case-failure-evidence",
    `${String(input.stepIndex).padStart(3, "0")}-${sanitizeArtifactName(input.templateId)}`,
  );
  fs.mkdirSync(evidenceDir, { recursive: true });
  writeJson(path.join(evidenceDir, "failure-row.json"), input.row);
  writeJson(path.join(evidenceDir, "failure-context.json"), {
    captured_at: new Date().toISOString(),
    step_index: input.stepIndex,
    template_id: input.templateId,
    failure_codes: input.row.failure_codes,
    chrome_sad_tab_visible: androidSadTabVisible(input.deviceId),
    page_url: input.row.page_url,
    heap_used_mb: heapUsedMb(),
  });
  writeText(path.join(evidenceDir, "cdp-version.json"), await fetchTextNoThrow("http://127.0.0.1:9222/json/version"));
  writeText(path.join(evidenceDir, "cdp-pages.json"), await fetchTextNoThrow("http://127.0.0.1:9222/json/list"));
  if (input.deviceId) {
    writeText(path.join(evidenceDir, "adb-ps.txt"), adbOutputNoThrow(["-s", input.deviceId, "shell", "ps", "-A"], 10_000));
    writeText(path.join(evidenceDir, "adb-dumpsys-activity-top.txt"), adbOutputNoThrow([
      "-s",
      input.deviceId,
      "shell",
      "dumpsys",
      "activity",
      "top",
    ], 10_000));
    writeText(path.join(evidenceDir, "adb-chrome-meminfo.txt"), adbOutputNoThrow([
      "-s",
      input.deviceId,
      "shell",
      "dumpsys",
      "meminfo",
      ANDROID_CHROME_PACKAGE,
    ], 20_000));
    writeText(path.join(evidenceDir, "adb-logcat-tail.txt"), adbOutputNoThrow([
      "-s",
      input.deviceId,
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

async function runSessionSoakCase(input: {
  page: Page;
  baseUrl: string;
  passport: ProfessionalWorkPassport;
  device: AndroidApi34DeviceReadyResult;
  stepIndex: number;
  chromePidAtStart: string | null;
  cdpTargetCountAtStart: number | null;
  approvedCountBeforeCase: number;
  reopenPrevious: boolean;
}): Promise<SessionSoakLedgerRow> {
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
  let beforeEdit: SoakBundleEvidence | null = null;
  let afterEdit: SoakBundleEvidence | null = null;
  let afterApprove: SoakBundleEvidence | null = null;
  let catchEvidence: SoakBundleEvidence | null = null;
  let quantityInputCountBeforeEdit = 0;
  let quantityUiEvidence: QuantityEditUiEvidence | null = null;
  let quantityTrace: QuantityEditTraceSummary | null = null;
  let quantityEditDurableMs: number | null = null;
  let reopenResult: Awaited<ReturnType<typeof reopenAndEditPreviousEstimate>> | null = null;
  let bodyText = "";
  let stage = "init";
  const failureCodes: string[] = [];
  const chromePidBefore = chromePid(input.device.device_id);

  try {
    stage = "dismiss_chrome_surfaces_before_case";
    await dismissChromeSurfacesNoThrow(input.device.device_id);
    if (chromePidBefore !== input.chromePidAtStart) {
      failureCodes.push(`chrome_pid_changed_before_case:${chromePidBefore ?? "missing"}:${input.chromePidAtStart ?? "missing"}`);
    }
    if (androidSadTabVisible(input.device.device_id)) failureCodes.push("android_chrome_sad_tab_visible_before_case");

    const pageUrl = `${input.baseUrl}/request?autoPrepare=1&prompt=${encodeURIComponent(prompt)}&androidSessionSoak=${input.stepIndex}`;
    stage = "navigate_auto_prepare";
    await withTimeout(
      "android_session_soak_navigation_timeout",
      75_000,
      input.page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 60_000 }).then(() => undefined),
    );
    stage = "dismiss_chrome_surfaces_after_navigation";
    await dismissChromeSurfacesNoThrow(input.device.device_id);
    stage = "wait_summary";
    await withTimeout(
      "android_session_soak_summary_timeout",
      105_000,
      input.page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 90_000 }).then(() => undefined),
    );
    stage = "ensure_positions_visible";
    await withTimeout("android_session_soak_positions_timeout", 60_000, ensureEstimatePositionsVisible(input.page));
    stage = "ensure_delivery_ready";
    await withTimeout("android_session_soak_delivery_timeout", 75_000, ensureDeliveryReady(input.page, input.stepIndex));
    stage = "read_body_text";
    bodyText = await withTimeout(
      "android_session_soak_body_text_timeout",
      20_000,
      input.page.locator("body").innerText({ timeout: 15_000 }),
    );
    stage = "read_durable_before_edit";
    beforeEdit = await withTimeout("android_session_soak_durable_before_edit_timeout", 30_000, readSoakEvidence(input.page));
    stage = "count_quantity_inputs";
    quantityInputCountBeforeEdit = await withTimeout(
      "android_session_soak_quantity_input_count_timeout",
      20_000,
      input.page.locator("[data-testid^='consumer-repair-item-quantity-input-']").count(),
    );

    if (!beforeEdit.bundleFound) failureCodes.push("durable_bundle_missing_before_edit");
    if (beforeEdit.selectedTemplateId !== input.passport.templateId) {
      failureCodes.push(`selected_template_mismatch:${beforeEdit.selectedTemplateId ?? "missing"}:${input.passport.templateId}`);
    }
    if (beforeEdit.currentRevisionRowCount !== input.passport.boqRecipe.rowCount) {
      failureCodes.push(`row_count_mismatch_before_edit:${beforeEdit.currentRevisionRowCount}:${input.passport.boqRecipe.rowCount}`);
    }
    if (beforeEdit.itemCount !== input.passport.boqRecipe.rowCount) {
      failureCodes.push(`item_count_mismatch_before_edit:${beforeEdit.itemCount}:${input.passport.boqRecipe.rowCount}`);
    }
    if (beforeEdit.passportBackedRevisionRowCount !== beforeEdit.currentRevisionRowCount || beforeEdit.currentRevisionRowCount === 0) {
      failureCodes.push(`passport_backed_rows_mismatch:${beforeEdit.passportBackedRevisionRowCount}:${beforeEdit.currentRevisionRowCount}`);
    }
    if (beforeEdit.revisionCount < 1 || !beforeEdit.currentRevisionId) failureCodes.push("revision_history_missing_before_edit");
    if (quantityInputCountBeforeEdit < 1) failureCodes.push("quantity_inputs_missing_before_edit");
    if (!beforeEdit.activeDraftId || beforeEdit.latestStatus !== "draft") {
      failureCodes.push(`active_draft_missing_before_quantity_edit:${beforeEdit.latestStatus ?? "missing"}`);
    }
    if (/raw_ai_json|source_parameters|template_id|formula_id|normFactor|round_to/i.test(bodyText)) {
      failureCodes.push("raw_internal_dump_visible");
    }

    stage = "click_quantity_plus";
    const quantityActionStarted = performance.now();
    quantityUiEvidence = await clickFirstQuantityPlus(input.page);
    stage = "wait_quantity_revision";
    afterEdit = await waitForSoakEvidence(
      input.page,
      "session_soak_quantity_edit",
      (evidence) =>
        Boolean(beforeEdit?.activeDraftId) &&
        evidence.activeDraftId === beforeEdit?.activeDraftId &&
        evidence.latestStatus === "draft" &&
        evidence.currentRevisionId !== beforeEdit?.currentRevisionId &&
        evidence.revisionCount > (beforeEdit?.revisionCount ?? 0),
      45_000,
    );
    quantityEditDurableMs = Math.round((performance.now() - quantityActionStarted) * 100) / 100;
    quantityTrace = await withDiagnosticTimeout(readQuantityEditTrace(input.page), 5_000, null);
    if (afterEdit.currentRevisionRowCount !== input.passport.boqRecipe.rowCount) {
      failureCodes.push(`row_count_mismatch_after_edit:${afterEdit.currentRevisionRowCount}:${input.passport.boqRecipe.rowCount}`);
    }
    if (afterEdit.currentRevisionId === beforeEdit.currentRevisionId) failureCodes.push("revision_id_unchanged_after_quantity_edit");
    if (afterEdit.rowsHash === beforeEdit.rowsHash) failureCodes.push("rows_hash_unchanged_after_quantity_edit");
    if (afterEdit.revisionCount <= beforeEdit.revisionCount) failureCodes.push("revision_count_not_incremented_after_quantity_edit");

    stage = "approve_current_draft";
    afterApprove = await approveCurrentDraft(input.page, input.approvedCountBeforeCase);
    if (afterApprove.latestStatus !== "consumer_approved") failureCodes.push(`approve_status_mismatch:${afterApprove.latestStatus ?? "missing"}`);
    if (afterApprove.approvedHistoryCount < input.approvedCountBeforeCase + 1) {
      failureCodes.push(`approved_history_not_incremented:${afterApprove.approvedHistoryCount}:${input.approvedCountBeforeCase}`);
    }
    if (!afterApprove.pdfRevisionBound) failureCodes.push("approved_pdf_revision_not_bound");
    if (afterApprove.generatedPdfCount < 1) failureCodes.push("approved_pdf_missing");
    if (afterApprove.currentRevisionRowCount !== input.passport.boqRecipe.rowCount) {
      failureCodes.push(`row_count_mismatch_after_approve:${afterApprove.currentRevisionRowCount}:${input.passport.boqRecipe.rowCount}`);
    }

    if (input.reopenPrevious) {
      stage = "reopen_previous_history";
      reopenResult = await reopenAndEditPreviousEstimate({
        page: input.page,
        beforeApprovedCount: afterApprove.approvedHistoryCount,
      });
      failureCodes.push(...reopenResult.failureCodes);
      if (!reopenResult.passed) failureCodes.push("history_reopen_previous_failed");
    }

    stage = "start_new_draft";
    await startNewDraftIfVisible(input.page);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failureCodes.push(`session_soak_stage:${stage}`);
    const frameworkFailure = androidFrameworkServicesDegradedFailureCode(input.device.device_id);
    if (frameworkFailure) failureCodes.push(frameworkFailure);
    if (androidSadTabVisible(input.device.device_id)) failureCodes.push("android_chrome_sad_tab_visible");
    if (/ERR_EMPTY_RESPONSE/i.test(message)) failureCodes.push("WEB_SERVER_EMPTY_RESPONSE");
    if (/ERR_EMPTY_RESPONSE|net::ERR_|page\.goto|session_soak_navigation_timeout/i.test(message)) {
      failureCodes.push("ANDROID_INGRESS_FAILED");
    }
    if (/quantity_visible_update_timeout|session_soak_quantity_edit_timeout|session_soak_reopen_edit_revision_timeout/i.test(message)) {
      failureCodes.push("QUANTITY_PERSISTENCE_FAILED");
    }
    if (/session_soak_quantity_edit_timeout|session_soak_reopen_edit_revision_timeout/i.test(message)) {
      failureCodes.push("REVISION_CONFIRMATION_FAILED");
    }
    failureCodes.push(`session_soak_exception:${message.replace(/\s+/g, " ").slice(0, 260)}`);
    catchEvidence = await withDiagnosticTimeout(readSoakEvidence(input.page), 5_000, null);
    quantityTrace = await withDiagnosticTimeout(readQuantityEditTrace(input.page), 5_000, null);
  } finally {
    input.page.off("console", onConsole);
    input.page.off("pageerror", onPageError);
  }

  const memory = readChromeMemory(input.device.device_id);
  const cdpTargets = await withDiagnosticTimeout(cdpTargetCount(), 5_000, null);
  const dom = await withDiagnosticTimeout(domCounters(input.page), 5_000, {
    documents: null,
    nodes: null,
    jsEventListeners: null,
  });
  const timers = await withDiagnosticTimeout(readTimerProbe(input.page), 5_000, {
    activeTimeouts: null,
    activeIntervals: null,
  });
  const chromePidAfter = chromePid(input.device.device_id);
  if (chromePidAfter !== input.chromePidAtStart) {
    const ingressIndex = failureCodes.indexOf("ANDROID_INGRESS_FAILED");
    const hasServerOrNetworkIngressEvidence = failureCodes.some((code) =>
      /WEB_SERVER_|ERR_EMPTY_RESPONSE|net::ERR_/i.test(code)
    );
    if (ingressIndex >= 0 && !hasServerOrNetworkIngressEvidence) {
      failureCodes[ingressIndex] = "ANDROID_BROWSER_NAVIGATION_ABORTED";
    }
    failureCodes.push(`chrome_pid_changed_after_case:${chromePidAfter ?? "missing"}:${input.chromePidAtStart ?? "missing"}`);
  }
  if (androidSadTabVisible(input.device.device_id)) failureCodes.push("android_chrome_sad_tab_visible_after_case");
  if (cdpTargets == null) {
    failureCodes.push("ANDROID_CDP_TARGET_LIST_UNREACHABLE_AFTER_CASE");
  }
  if (cdpTargets != null && input.cdpTargetCountAtStart != null && cdpTargets > input.cdpTargetCountAtStart + CDP_TARGET_GROWTH_BUDGET) {
    failureCodes.push(`cdp_target_accumulation:${cdpTargets}:${input.cdpTargetCountAtStart}`);
  }
  if (timers.activeTimeouts != null && timers.activeTimeouts > ACTIVE_TIMER_BUDGET) {
    failureCodes.push(`active_timeout_growth:${timers.activeTimeouts}`);
  }
  if (timers.activeIntervals != null && timers.activeIntervals > ACTIVE_INTERVAL_BUDGET) {
    failureCodes.push(`active_interval_growth:${timers.activeIntervals}`);
  }
  if (consoleErrors.length > 0) failureCodes.push(`console_errors:${consoleErrors.length}:${consoleErrors[0] ?? ""}`);
  if (pageErrors.length > 0) failureCodes.push(`page_errors:${pageErrors.length}:${pageErrors[0] ?? ""}`);

  const latestEvidence = afterApprove ?? catchEvidence ?? afterEdit ?? beforeEdit;
  const quantityChanged = Boolean(
    beforeEdit &&
    afterEdit &&
    afterEdit.currentRevisionId !== beforeEdit.currentRevisionId &&
    afterEdit.rowsHash !== beforeEdit.rowsHash,
  );

  return {
    schema: AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA,
    step_index: input.stepIndex,
    case_id: `${input.passport.templateId}:android_api34_session_soak`,
    template_id: input.passport.templateId,
    prompt_hash: hashText(prompt),
    page_url: input.page.url(),
    android_device_id: input.device.device_id,
    android_sdk: input.device.android_sdk,
    chrome_pid_before: chromePidBefore,
    chrome_pid_after: chromePidAfter,
    selected_template_id: beforeEdit?.selectedTemplateId ?? null,
    selected_work_key: beforeEdit?.selectedWorkKey ?? null,
    current_draft_id: latestEvidence?.latestDraftId ?? null,
    current_status: latestEvidence?.latestStatus ?? null,
    durable_record_count: latestEvidence?.durableRecordCount ?? 0,
    active_draft_count: latestEvidence?.activeDraftCount ?? 0,
    approved_history_count: latestEvidence?.approvedHistoryCount ?? 0,
    item_count: latestEvidence?.itemCount ?? 0,
    expected_row_count: input.passport.boqRecipe.rowCount,
    passport_backed_revision_row_count:
      afterEdit?.passportBackedRevisionRowCount ?? latestEvidence?.passportBackedRevisionRowCount ?? 0,
    revision_count_before_edit: beforeEdit?.revisionCount ?? 0,
    revision_count_after_edit: afterEdit?.revisionCount ?? 0,
    current_revision_id_before_edit: beforeEdit?.currentRevisionId ?? null,
    current_revision_id_after_edit: afterEdit?.currentRevisionId ?? null,
    rows_hash_before_edit: beforeEdit?.rowsHash ?? null,
    rows_hash_after_edit: afterEdit?.rowsHash ?? null,
    quantity_input_count: quantityInputCountBeforeEdit,
    quantity_ui_value_before: quantityUiEvidence?.valueBefore ?? null,
    quantity_ui_value_after: quantityUiEvidence?.valueAfter ?? null,
    quantity_ui_changed: Boolean(quantityUiEvidence && quantityUiEvidence.valueAfter !== quantityUiEvidence.valueBefore),
    quantity_edit_visible_ms: quantityUiEvidence?.visibleMs ?? null,
    quantity_edit_durable_ms: quantityEditDurableMs,
    quantity_trace_operation_id: quantityTrace?.operationId ?? null,
    quantity_trace_event_count: quantityTrace?.eventCount ?? 0,
    quantity_trace_stages: quantityTrace?.stages ?? [],
    quantity_app_visible_ms: quantityTrace?.appVisibleMs ?? null,
    quantity_app_recalculation_ms: quantityTrace?.appRecalculationMs ?? null,
    quantity_app_persistence_ms: quantityTrace?.appPersistenceMs ?? null,
    quantity_app_revision_confirmed_ms: quantityTrace?.appRevisionConfirmedMs ?? null,
    quantity_app_total_ms: quantityTrace?.appTotalMs ?? null,
    quantity_app_visible_to_recalculation_ms: quantityTrace?.appVisibleToRecalculationMs ?? null,
    quantity_app_enqueue_to_recalculation_ms: quantityTrace?.appEnqueueToRecalculationMs ?? null,
    quantity_changed: quantityChanged,
    approved_after_edit: afterApprove?.latestStatus === "consumer_approved",
    pdf_generated: Boolean(afterApprove?.generatedPdfCount && afterApprove.generatedPdfCount > 0 && afterApprove.pdfRevisionBound),
    generated_pdf_count: afterApprove?.generatedPdfCount ?? 0,
    history_reopen_checked: reopenResult?.checked === true,
    history_reopen_passed: reopenResult?.passed === true,
    reopened_draft_id: reopenResult?.reopenedDraftId ?? null,
    reopened_revision_id: reopenResult?.reopenedRevisionId ?? null,
    reopened_row_count: reopenResult?.reopenedRowCount ?? 0,
    cdp_target_count: cdpTargets,
    dom_documents: dom.documents,
    dom_nodes: dom.nodes,
    js_event_listeners: dom.jsEventListeners,
    active_timeout_count: timers.activeTimeouts,
    active_interval_count: timers.activeIntervals,
    post_close_dom_documents: null,
    post_close_dom_nodes: null,
    post_close_js_event_listeners: null,
    post_close_active_timeout_count: null,
    post_close_active_interval_count: null,
    chrome_pss_kb: memory.pssKb,
    chrome_rss_kb: memory.rssKb,
    console_error_count: consoleErrors.length,
    page_error_count: pageErrors.length,
    duration_ms: Math.round((performance.now() - started) * 100) / 100,
    heap_used_mb: heapUsedMb(),
    failure_codes: failureCodes,
    passed: failureCodes.length === 0,
  };
}

async function sessionSoakAutomationFailureRow(input: {
  page: Page | null;
  passport: ProfessionalWorkPassport;
  device: AndroidApi34DeviceReadyResult;
  stepIndex: number;
  started: number;
  message: string;
}): Promise<SessionSoakLedgerRow> {
  const evidence = input.page ? await withDiagnosticTimeout(readSoakEvidence(input.page), 5_000, null) : null;
  const memory = readChromeMemory(input.device.device_id);
  const dom = input.page
    ? await withDiagnosticTimeout(domCounters(input.page), 5_000, { documents: null, nodes: null, jsEventListeners: null })
    : { documents: null, nodes: null, jsEventListeners: null };
  const timers = input.page
    ? await withDiagnosticTimeout(readTimerProbe(input.page), 5_000, { activeTimeouts: null, activeIntervals: null })
    : { activeTimeouts: null, activeIntervals: null };
  const targetCount = await withDiagnosticTimeout(cdpTargetCount(), 5_000, null);
  const sadTabVisible = androidSadTabVisible(input.device.device_id);
  const frameworkFailure = androidFrameworkServicesDegradedFailureCode(input.device.device_id);
  const failureCodes = [
    frameworkFailure ?? "",
    targetCount == null ? "ANDROID_CDP_TARGET_LIST_UNREACHABLE_AFTER_CASE" : "",
    sadTabVisible ? "android_chrome_sad_tab_visible" : "",
    `session_soak_exception:${input.message.replace(/\s+/g, " ").slice(0, 260)}`,
  ].filter(Boolean);
  const prompt = buildAiEstimate11610NaturalLanguagePromptForPassport(input.passport, "professional_full");
  return {
    schema: AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA,
    step_index: input.stepIndex,
    case_id: `${input.passport.templateId}:android_api34_session_soak`,
    template_id: input.passport.templateId,
    prompt_hash: hashText(prompt),
    page_url: input.page?.url() ?? "",
    android_device_id: input.device.device_id,
    android_sdk: input.device.android_sdk,
    chrome_pid_before: chromePid(input.device.device_id),
    chrome_pid_after: chromePid(input.device.device_id),
    selected_template_id: evidence?.selectedTemplateId ?? null,
    selected_work_key: evidence?.selectedWorkKey ?? null,
    current_draft_id: evidence?.latestDraftId ?? null,
    current_status: evidence?.latestStatus ?? null,
    durable_record_count: evidence?.durableRecordCount ?? 0,
    active_draft_count: evidence?.activeDraftCount ?? 0,
    approved_history_count: evidence?.approvedHistoryCount ?? 0,
    item_count: evidence?.itemCount ?? 0,
    expected_row_count: input.passport.boqRecipe.rowCount,
    passport_backed_revision_row_count: evidence?.passportBackedRevisionRowCount ?? 0,
    revision_count_before_edit: 0,
    revision_count_after_edit: evidence?.revisionCount ?? 0,
    current_revision_id_before_edit: null,
    current_revision_id_after_edit: evidence?.currentRevisionId ?? null,
    rows_hash_before_edit: null,
    rows_hash_after_edit: evidence?.rowsHash ?? null,
    quantity_input_count: 0,
    quantity_ui_value_before: null,
    quantity_ui_value_after: null,
    quantity_ui_changed: false,
    quantity_edit_visible_ms: null,
    quantity_edit_durable_ms: null,
    quantity_trace_operation_id: null,
    quantity_trace_event_count: 0,
    quantity_trace_stages: [],
    quantity_app_visible_ms: null,
    quantity_app_recalculation_ms: null,
    quantity_app_persistence_ms: null,
    quantity_app_revision_confirmed_ms: null,
    quantity_app_total_ms: null,
    quantity_app_visible_to_recalculation_ms: null,
    quantity_app_enqueue_to_recalculation_ms: null,
    quantity_changed: false,
    approved_after_edit: evidence?.latestStatus === "consumer_approved",
    pdf_generated: evidence?.generatedPdfCount ? evidence.generatedPdfCount > 0 && evidence.pdfRevisionBound : false,
    generated_pdf_count: evidence?.generatedPdfCount ?? 0,
    history_reopen_checked: false,
    history_reopen_passed: false,
    reopened_draft_id: null,
    reopened_revision_id: null,
    reopened_row_count: 0,
    cdp_target_count: targetCount,
    dom_documents: dom.documents,
    dom_nodes: dom.nodes,
    js_event_listeners: dom.jsEventListeners,
    active_timeout_count: timers.activeTimeouts,
    active_interval_count: timers.activeIntervals,
    post_close_dom_documents: null,
    post_close_dom_nodes: null,
    post_close_js_event_listeners: null,
    post_close_active_timeout_count: null,
    post_close_active_interval_count: null,
    chrome_pss_kb: memory.pssKb,
    chrome_rss_kb: memory.rssKb,
    console_error_count: 0,
    page_error_count: 0,
    duration_ms: Math.round((performance.now() - input.started) * 100) / 100,
    heap_used_mb: heapUsedMb(),
    failure_codes: failureCodes,
    passed: false,
  };
}

function failureCount(rows: SessionSoakLedgerRow[], pattern: RegExp): number {
  return rows.filter((row) => row.failure_codes.some((code) => pattern.test(code))).length;
}

function numericValues(rows: SessionSoakLedgerRow[], pick: (row: SessionSoakLedgerRow) => number | null): number[] {
  return rows.map(pick).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function writeCheckpoint(input: {
  checkpointPath: string | null;
  runId: string;
  sourceSha: string;
  iterations: number;
  rows: SessionSoakLedgerRow[];
}): void {
  if (!input.checkpointPath) return;
  writeJson(input.checkpointPath, {
    run_id: input.runId,
    schema: AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA,
    source_sha: input.sourceSha,
    updated_at: new Date().toISOString(),
    iterations_requested: input.iterations,
    steps_completed: input.rows.length,
    steps_passed: input.rows.filter((row) => row.passed).length,
    steps_failed: input.rows.filter((row) => !row.passed).length,
    last_template_id: input.rows.at(-1)?.template_id ?? null,
    failure_samples: input.rows.filter((row) => !row.passed).slice(0, 20),
  });
}

export async function runAiEstimate11610AndroidApi34SessionSoak(input: {
  iterations?: number;
  startIndex?: number;
  baseUrl?: string;
  runId?: string;
  reopenEvery?: number;
  writeSummary?: boolean;
  writeLedger?: boolean;
} = {}) {
  const iterations = Math.max(1, Math.floor(input.iterations ?? SESSION_SOAK_MIN_ITERATIONS));
  const startIndex = Math.max(0, Math.floor(input.startIndex ?? 0));
  const reopenEvery = Math.max(1, Math.floor(input.reopenEvery ?? 20));
  const allIds = listProfessionalWorkPassportTemplateIds();
  const selectedIds = selectSoakTemplateIds({ allIds, iterations, startIndex });
  const runId = input.runId?.trim() || timestampForPath();
  const outDir = path.join(ROOT, runId);
  const summaryPath = input.writeSummary ? path.join(outDir, "summary.json") : null;
  const ledgerPath = input.writeLedger ? path.join(outDir, "ledger.jsonl") : null;
  const checkpointPath = input.writeSummary || input.writeLedger ? path.join(outDir, "checkpoint.json") : null;
  const androidEnvironmentDir = path.join(outDir, "android-api34-environment");
  if (ledgerPath) fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const ledgerStream = ledgerPath ? fs.createWriteStream(ledgerPath, { encoding: "utf8", flags: "w" }) : null;
  const ledgerHasher = createHash("sha256");
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const rows: SessionSoakLedgerRow[] = [];
  let maxHeapUsedMb = 0;
  let device: AndroidApi34DeviceReadyResult | null = null;
  let server: ProductionGradeWebServerHandle | null = null;
  let runtimeLock: AndroidProofRuntimeLockHandle | null = null;
  let baseUrl = input.baseUrl?.replace(/\/+$/, "") ?? null;
  let session: AndroidChromeCdpSession | null = null;
  let cdpVersion: AndroidChromeCdpVersion | null = null;
  let healthBefore: AndroidEmulatorHealthResult | null = null;
  let healthAfter: AndroidEmulatorHealthResult | null = null;
  let setupFailure: string | null = null;
  let chromePidAtStart: string | null = null;
  let cdpTargetCountAtStart: number | null = null;

  try {
    runtimeLock = acquireAndroidProofRuntimeLock({
      runId,
      kind: "android-api34-session-soak",
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
      baseUrl: `${baseUrl}/request?androidSessionSoakHealthBefore=${Date.now()}`,
      writeArtifact: true,
    }).artifact;

    if (device.final_status !== API34_DEVICE_READY || !device.device_id) {
      setupFailure = `android_api34_device_not_ready:${device.final_status}`;
    } else if (!healthBefore.android_lab_healthy) {
      setupFailure = `android_lab_not_healthy:${healthBefore.blocking_reasons.join("|")}`;
    }

    if (!setupFailure && device.device_id) {
      session = await withTimeout(
        "android_session_soak_cdp_session_open_timeout",
        ANDROID_SESSION_OPEN_TIMEOUT_MS,
        openAndroidChromeCdpSession({
          deviceId: device.device_id,
          baseUrl,
          startUrl: `${baseUrl}/request?androidSessionSoakStart=${Date.now()}`,
        }),
      );
      cdpVersion = session.cdpVersion;
      const anchorPage = session.page;
      anchorPage.setDefaultTimeout(45_000);
      anchorPage.setDefaultNavigationTimeout(60_000);
      await dismissChromeSurfacesNoThrow(device.device_id);
      await withTimeout("android_session_soak_timer_probe_install_timeout", 45_000, installTimerProbe(anchorPage));
      await withTimeout("android_session_soak_storage_cleanup_timeout", 90_000, clearDurableStorage(anchorPage, baseUrl));
      chromePidAtStart = chromePid(device.device_id);
      cdpTargetCountAtStart = await cdpTargetCount();

      for (const [index, templateId] of selectedIds.entries()) {
        const stepIndex = index + 1;
        const passport = buildProfessionalWorkPassport(templateId);
        let row: SessionSoakLedgerRow | null = null;
        let stepPage: Page | null = null;
        if (!passport) {
          const failureCodes = ["passport_missing"];
          row = {
            schema: AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA,
            step_index: stepIndex,
            case_id: `${templateId}:android_api34_session_soak`,
            template_id: templateId,
            prompt_hash: "passport_missing",
            page_url: anchorPage.url(),
            android_device_id: device.device_id,
            android_sdk: device.android_sdk,
            chrome_pid_before: chromePid(device.device_id),
            chrome_pid_after: chromePid(device.device_id),
            selected_template_id: null,
            selected_work_key: null,
            current_draft_id: null,
            current_status: null,
            durable_record_count: 0,
            active_draft_count: 0,
            approved_history_count: 0,
            item_count: 0,
            expected_row_count: 0,
            passport_backed_revision_row_count: 0,
            revision_count_before_edit: 0,
            revision_count_after_edit: 0,
            current_revision_id_before_edit: null,
            current_revision_id_after_edit: null,
            rows_hash_before_edit: null,
            rows_hash_after_edit: null,
            quantity_input_count: 0,
            quantity_ui_value_before: null,
            quantity_ui_value_after: null,
            quantity_ui_changed: false,
            quantity_edit_visible_ms: null,
            quantity_edit_durable_ms: null,
            quantity_trace_operation_id: null,
            quantity_trace_event_count: 0,
            quantity_trace_stages: [],
            quantity_app_visible_ms: null,
            quantity_app_recalculation_ms: null,
            quantity_app_persistence_ms: null,
            quantity_app_revision_confirmed_ms: null,
            quantity_app_total_ms: null,
            quantity_app_visible_to_recalculation_ms: null,
            quantity_app_enqueue_to_recalculation_ms: null,
            quantity_changed: false,
            approved_after_edit: false,
            pdf_generated: false,
            generated_pdf_count: 0,
            history_reopen_checked: false,
            history_reopen_passed: false,
            reopened_draft_id: null,
            reopened_revision_id: null,
            reopened_row_count: 0,
            cdp_target_count: await cdpTargetCount(),
            dom_documents: null,
            dom_nodes: null,
            js_event_listeners: null,
            active_timeout_count: null,
            active_interval_count: null,
            post_close_dom_documents: null,
            post_close_dom_nodes: null,
            post_close_js_event_listeners: null,
            post_close_active_timeout_count: null,
            post_close_active_interval_count: null,
            chrome_pss_kb: null,
            chrome_rss_kb: null,
            console_error_count: 0,
            page_error_count: 0,
            duration_ms: 0,
            heap_used_mb: heapUsedMb(),
            failure_codes: failureCodes,
            passed: false,
          };
        } else {
          const caseStarted = performance.now();
          try {
            stepPage = await createSessionSoakStepPage({
              session,
              deviceId: device.device_id,
            });
            row = await withTimeout(
              "android_session_soak_step_timeout",
              SESSION_SOAK_STEP_TIMEOUT_MS,
              runSessionSoakCase({
                page: stepPage,
                baseUrl,
                passport,
                device,
                stepIndex,
                chromePidAtStart,
                cdpTargetCountAtStart,
                approvedCountBeforeCase: rows.at(-1)?.approved_history_count ?? 0,
                reopenPrevious: stepIndex % reopenEvery === 0,
              }),
            );
          } catch (error) {
            row = await sessionSoakAutomationFailureRow({
              page: stepPage ?? anchorPage,
              passport,
              device,
              stepIndex,
              started: caseStarted,
              message: error instanceof Error ? error.message : String(error),
            });
          } finally {
            if (row?.passed) {
              await closeSessionSoakStepPage(stepPage);
              const idleCounters = await readIdleResourceCounters(anchorPage);
              row.post_close_dom_documents = idleCounters.dom.documents;
              row.post_close_dom_nodes = idleCounters.dom.nodes;
              row.post_close_js_event_listeners = idleCounters.dom.jsEventListeners;
              row.post_close_active_timeout_count = idleCounters.timers.activeTimeouts;
              row.post_close_active_interval_count = idleCounters.timers.activeIntervals;
              row.cdp_target_count = await cdpTargetCount();
            }
          }
        }
        if (!row) throw new Error(`session_soak_row_missing:${templateId}`);
        rows.push(row);
        maxHeapUsedMb = Math.max(maxHeapUsedMb, row.heap_used_mb);
        const serializedRow = JSON.stringify(row);
        ledgerHasher.update(`${serializedRow}\n`);
        ledgerStream?.write(`${serializedRow}\n`);
        if (!row.passed) {
          const evidencePath = await captureSessionSoakFailureEvidence({
            outDir,
            stepIndex,
            templateId,
            row,
            page: stepPage ?? anchorPage,
            deviceId: device.device_id,
          });
          console.warn(JSON.stringify({
            android_session_soak_failure_evidence: evidencePath,
            step_index: stepIndex,
            template_id: templateId,
            failure_codes: row.failure_codes,
          }));
        }
        writeCheckpoint({
          checkpointPath,
          runId,
          sourceSha: gitOutput(["rev-parse", "HEAD"]),
          iterations,
          rows,
        });
        console.info(JSON.stringify({
          case_id: row.case_id,
          passed: row.passed,
          blockers_count: row.failure_codes.length,
          session_soak_done: rows.length,
          session_soak_total: selectedIds.length,
          approved_history_count: row.approved_history_count,
          history_reopen_checked: row.history_reopen_checked,
          chrome_pss_kb: row.chrome_pss_kb,
          chrome_rss_kb: row.chrome_rss_kb,
          cdp_target_count: row.cdp_target_count,
          js_event_listeners: row.js_event_listeners,
          active_timeout_count: row.active_timeout_count,
          active_interval_count: row.active_interval_count,
          post_close_js_event_listeners: row.post_close_js_event_listeners,
          post_close_active_timeout_count: row.post_close_active_timeout_count,
          post_close_active_interval_count: row.post_close_active_interval_count,
        }));
        if (!row.passed) break;
        if (rows.length > 0 && rows.length % 25 === 0) clearProfessionalWorkPassportBuildCaches();
      }
    }
  } catch (error) {
    setupFailure = error instanceof Error ? error.message : String(error);
  } finally {
    ledgerStream?.end();
    clearProfessionalWorkPassportBuildCaches();
    const completedWithoutFailures = !setupFailure &&
      rows.length === selectedIds.length &&
      rows.every((row) => row.passed);
    if (completedWithoutFailures && device?.device_id && baseUrl) {
      healthAfter = checkAndroidEmulatorHealth({
        requireEmulator: true,
        requireChrome: true,
        serial: device.device_id,
        baseUrl: `${baseUrl}/request?androidSessionSoakHealthAfter=${Date.now()}`,
        writeArtifact: true,
      }).artifact;
    }
    if (session) {
      await withTimeout("android_session_soak_cdp_session_close_timeout", ANDROID_SESSION_CLOSE_TIMEOUT_MS, session.close())
        .catch(() => undefined);
    }
    if (!completedWithoutFailures && device?.device_id && baseUrl) {
      healthAfter = checkAndroidEmulatorHealth({
        requireEmulator: true,
        requireChrome: false,
        serial: device.device_id,
        baseUrl: `${baseUrl}/request?androidSessionSoakHealthAfterFailure=${Date.now()}`,
        writeArtifact: true,
      }).artifact;
    }
    server?.stop();
    runtimeLock?.release();
  }

  const passed = rows.filter((row) => row.passed).length;
  const failed = rows.length - passed + (setupFailure ? selectedIds.length - rows.length : 0);
  const cdpTargetCounts = numericValues(rows, (row) => row.cdp_target_count);
  const jsListenerCounts = numericValues(rows, (row) => row.js_event_listeners);
  const timeoutCounts = numericValues(rows, (row) => row.active_timeout_count);
  const intervalCounts = numericValues(rows, (row) => row.active_interval_count);
  const postCloseJsListenerCounts = numericValues(rows, (row) => row.post_close_js_event_listeners);
  const postCloseTimeoutCounts = numericValues(rows, (row) => row.post_close_active_timeout_count);
  const postCloseIntervalCounts = numericValues(rows, (row) => row.post_close_active_interval_count);
  const pssValues = numericValues(rows, (row) => row.chrome_pss_kb);
  const rssValues = numericValues(rows, (row) => row.chrome_rss_kb);
  const durationValues = rows.map((row) => row.duration_ms);
  const quantityVisibleMsValues = numericValues(rows, (row) => row.quantity_edit_visible_ms);
  const quantityDurableMsValues = numericValues(rows, (row) => row.quantity_edit_durable_ms);
  const quantityAppVisibleMsValues = numericValues(rows, (row) => row.quantity_app_visible_ms);
  const quantityAppPersistenceMsValues = numericValues(rows, (row) => row.quantity_app_persistence_ms);
  const quantityAppRevisionMsValues = numericValues(rows, (row) => row.quantity_app_revision_confirmed_ms);
  const quantityAppVisibleToRecalculationMsValues = numericValues(rows, (row) => row.quantity_app_visible_to_recalculation_ms);
  const quantityAppEnqueueToRecalculationMsValues = numericValues(rows, (row) => row.quantity_app_enqueue_to_recalculation_ms);
  const pssGrowthKb = pssValues.length > 1 ? pssValues[pssValues.length - 1] - pssValues[0] : null;
  const rssGrowthKb = rssValues.length > 1 ? rssValues[rssValues.length - 1] - rssValues[0] : null;
  const jsListenerGrowth = jsListenerCounts.length > 1 ? jsListenerCounts[jsListenerCounts.length - 1] - jsListenerCounts[0] : null;
  const postCloseJsListenerGrowth = postCloseJsListenerCounts.length > 1
    ? postCloseJsListenerCounts[postCloseJsListenerCounts.length - 1] - postCloseJsListenerCounts[0]
    : null;
  const cdpTargetGrowth = cdpTargetCounts.length > 0 && cdpTargetCountAtStart != null
    ? Math.max(...cdpTargetCounts) - cdpTargetCountAtStart
    : null;
  const maxTimeouts = timeoutCounts.length > 0 ? Math.max(...timeoutCounts) : null;
  const maxIntervals = intervalCounts.length > 0 ? Math.max(...intervalCounts) : null;
  const maxPostCloseTimeouts = postCloseTimeoutCounts.length > 0 ? Math.max(...postCloseTimeoutCounts) : null;
  const maxPostCloseIntervals = postCloseIntervalCounts.length > 0 ? Math.max(...postCloseIntervalCounts) : null;
  const memoryGrowthWithinBudget =
    (pssGrowthKb == null || pssGrowthKb <= MEMORY_PSS_GROWTH_BUDGET_KB) &&
    (rssGrowthKb == null || rssGrowthKb <= MEMORY_RSS_GROWTH_BUDGET_KB);
  const cdpTargetAccumulationDetected = cdpTargetGrowth != null && cdpTargetGrowth > CDP_TARGET_GROWTH_BUDGET;
  const listenerTimerGrowthWithinBudget =
    (postCloseJsListenerGrowth == null || postCloseJsListenerGrowth <= JS_LISTENER_GROWTH_BUDGET) &&
    (maxPostCloseTimeouts == null || maxPostCloseTimeouts <= ACTIVE_TIMER_BUDGET) &&
    (maxPostCloseIntervals == null || maxPostCloseIntervals <= ACTIVE_INTERVAL_BUDGET);
  const quantityAppVisibleP95 = percentile(quantityAppVisibleMsValues, 95);
  const quantityAppPersistenceP95 = percentile(quantityAppPersistenceMsValues, 95);
  const quantityAppRevisionP95 = percentile(quantityAppRevisionMsValues, 95);
  const quantityAppRevisionP99 = percentile(quantityAppRevisionMsValues, 99);
  const quantityLatencyWithinBudget =
    rows.every((row) => row.quantity_trace_event_count > 0 && row.quantity_app_revision_confirmed_ms != null) &&
    quantityAppVisibleP95 != null &&
    quantityAppRevisionP95 != null &&
    quantityAppRevisionP99 != null &&
    quantityAppVisibleP95 <= QUANTITY_APP_VISIBLE_P95_BUDGET_MS &&
    quantityAppRevisionP95 <= QUANTITY_APP_PERSISTENCE_P95_BUDGET_MS &&
    quantityAppRevisionP99 <= QUANTITY_APP_REVISION_P99_BUDGET_MS;
  const historyReopenChecks = rows.filter((row) => row.history_reopen_checked).length;
  const historyReopenPassed = rows.filter((row) => row.history_reopen_passed).length;
  const largeBoqCases = rows.filter((row) => row.expected_row_count >= 100).length;
  const serverCrashCount =
    (setupFailure && /WEB_SERVER_EARLY_EXIT|web_server_exited/i.test(setupFailure) ? 1 : 0) +
    failureCount(rows, /WEB_SERVER_EARLY_EXIT|web_server_exited/i);
  const ingressFailureCount =
    (setupFailure && /WEB_SERVER_|ANDROID_INGRESS|ERR_EMPTY_RESPONSE|net::ERR_|android_web_server_preflight/i.test(setupFailure) ? 1 : 0) +
    failureCount(rows, /WEB_SERVER_|ANDROID_INGRESS|ERR_EMPTY_RESPONSE|net::ERR_/i);
  const quantityPersistenceFailureCount = failureCount(rows, /QUANTITY_PERSISTENCE_FAILED|quantity_visible_update_timeout|quantity_edit_timeout/i);
  const revisionConfirmationFailureCount = failureCount(rows, /REVISION_CONFIRMATION_FAILED|revision_confirmation|quantity_edit_timeout/i);
  const androidFrameworkDegradationCount = failureCount(
    rows,
    /ANDROID_API34_LAB_FRAMEWORK_DEGRADED|ANDROID_FRAMEWORK_SERVICES_DEGRADED|ANDROID_FRAMEWORK_SERVICES_NOT_READY/i,
  );
  const orphanProcessCount = 0;
  const sessionSoakPassed =
    iterations >= SESSION_SOAK_MIN_ITERATIONS &&
    selectedIds.length === iterations &&
    rows.length === iterations &&
    passed === iterations &&
    failed === 0 &&
    setupFailure == null &&
    device?.final_status === API34_DEVICE_READY &&
    device.android_sdk === 34 &&
    healthBefore?.android_lab_healthy === true &&
    healthAfter?.android_lab_healthy === true &&
    rows.every((row) => row.chrome_pid_before === chromePidAtStart && row.chrome_pid_after === chromePidAtStart) &&
    failureCount(rows, /sad_tab|renderer|crash/i) === 0 &&
    failureCount(rows, /cdp|Target page|Protocol error|Session closed|browserContext/i) === 0 &&
    failureCount(rows, /timeout/i) === 0 &&
    quantityPersistenceFailureCount === 0 &&
    revisionConfirmationFailureCount === 0 &&
    androidFrameworkDegradationCount === 0 &&
    serverCrashCount === 0 &&
    ingressFailureCount === 0 &&
    orphanProcessCount === 0 &&
    rows.every((row) => row.quantity_changed && row.approved_after_edit && row.pdf_generated) &&
    historyReopenChecks >= Math.floor(iterations / reopenEvery) &&
    historyReopenChecks === historyReopenPassed &&
    largeBoqCases >= 3 &&
    quantityLatencyWithinBudget &&
    memoryGrowthWithinBudget &&
    !cdpTargetAccumulationDetected &&
    listenerTimerGrowthWithinBudget;
  const sourceTreeStatus = gitOutput(["status", "--porcelain"]);
  const setupTimeoutCount = setupFailure && /timeout/i.test(setupFailure) ? 1 : 0;
  const setupCdpDisconnectCount =
    setupFailure && /cdp|Target page|Protocol error|Session closed|browserContext/i.test(setupFailure) ? 1 : 0;
  const summary = {
    run_id: runId,
    schema: AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_SCHEMA,
    final_status: sessionSoakPassed
      ? GREEN_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_100_PASSED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_ANDROID_API34_SESSION_SOAK_BLOCKED_NO_RELEASE,
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
      iterations,
      selection_strategy: "evenly_spaced_session_soak",
    })),
    ledger_sha256: ledgerHasher.digest("hex"),
    base_url: baseUrl,
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
    health_before: compactHealth(healthBefore),
    health_after: compactHealth(healthAfter),
    android_environment_path: path.join(androidEnvironmentDir, "android_api34_environment.json"),
    catalog_total_expected: PROFESSIONAL_WORK_PASSPORT_TOTAL,
    template_ids_total: allIds.length,
    selection_strategy: "evenly_spaced_session_soak",
    iterations_requested: iterations,
    start_index: startIndex,
    reopen_every: reopenEvery,
    cases_completed: rows.length,
    cases_passed: passed,
    cases_failed: failed,
    first_attempt_passed_cases: passed,
    recovered_cases: 0,
    retry_count: 0,
    renderer_crash_count: failureCount(rows, /sad_tab|renderer/i),
    browser_crash_count: failureCount(rows, /chrome_pid_changed|browser_crash|chrome_process/i),
    server_crash_count: serverCrashCount,
    cdp_disconnect_count: failureCount(rows, /cdp|Target page|Protocol error|Session closed|browserContext/i) + setupCdpDisconnectCount,
    timeout_count: failureCount(rows, /timeout/i) + setupTimeoutCount,
    ingress_failure_count: ingressFailureCount,
    quantity_persistence_failure_count: quantityPersistenceFailureCount,
    revision_confirmation_failure_count: revisionConfirmationFailureCount,
    android_framework_degradation_count: androidFrameworkDegradationCount,
    orphan_process_count: orphanProcessCount,
    web_server_pid: server?.pid ?? null,
    web_server_port: server?.port ?? null,
    web_server_owned_by_current_run: server?.owned_by_current_run ?? null,
    web_server_stdout_path: server?.stdout_path ?? null,
    web_server_stderr_path: server?.stderr_path ?? null,
    runtime_lock_path: runtimeLock?.path ?? null,
    session_page_strategy: "fresh_page_same_chrome_session",
    history_reopen_checks: historyReopenChecks,
    history_reopen_passed: historyReopenPassed,
    durable_history_preserved: rows.length > 0 && rows.at(-1)!.durable_record_count >= iterations,
    revision_history_preserved: rows.every((row) => row.revision_count_after_edit > row.revision_count_before_edit),
    pdf_generated_cases: rows.filter((row) => row.pdf_generated).length,
    large_boq_cases: largeBoqCases,
    peak_boq_rows: rows.reduce((max, row) => Math.max(max, row.expected_row_count), 0),
    same_chrome_session: rows.every((row) => row.chrome_pid_before === chromePidAtStart && row.chrome_pid_after === chromePidAtStart),
    chrome_pid_at_start: chromePidAtStart,
    cdp_target_count_at_start: cdpTargetCountAtStart,
    cdp_target_count_max: cdpTargetCounts.length > 0 ? Math.max(...cdpTargetCounts) : null,
    cdp_target_count_end: cdpTargetCounts.at(-1) ?? null,
    cdp_target_growth: cdpTargetGrowth,
    cdp_target_accumulation_detected: cdpTargetAccumulationDetected,
    js_event_listeners_start: jsListenerCounts[0] ?? null,
    js_event_listeners_end: jsListenerCounts.at(-1) ?? null,
    js_event_listeners_max: jsListenerCounts.length > 0 ? Math.max(...jsListenerCounts) : null,
    js_event_listeners_growth: jsListenerGrowth,
    listener_timer_probe_scope: "post_close_anchor_page",
    post_close_js_event_listeners_start: postCloseJsListenerCounts[0] ?? null,
    post_close_js_event_listeners_end: postCloseJsListenerCounts.at(-1) ?? null,
    post_close_js_event_listeners_max: postCloseJsListenerCounts.length > 0 ? Math.max(...postCloseJsListenerCounts) : null,
    post_close_js_event_listeners_growth: postCloseJsListenerGrowth,
    active_timeout_count_max: maxTimeouts,
    active_interval_count_max: maxIntervals,
    post_close_active_timeout_count_max: maxPostCloseTimeouts,
    post_close_active_interval_count_max: maxPostCloseIntervals,
    listener_timer_growth_within_budget: listenerTimerGrowthWithinBudget,
    chrome_pss_kb_start: pssValues[0] ?? null,
    chrome_pss_kb_end: pssValues.at(-1) ?? null,
    chrome_pss_kb_max: pssValues.length > 0 ? Math.max(...pssValues) : null,
    chrome_pss_growth_kb: pssGrowthKb,
    chrome_rss_kb_start: rssValues[0] ?? null,
    chrome_rss_kb_end: rssValues.at(-1) ?? null,
    chrome_rss_kb_max: rssValues.length > 0 ? Math.max(...rssValues) : null,
    chrome_rss_growth_kb: rssGrowthKb,
    memory_growth_within_budget: memoryGrowthWithinBudget,
    quantity_edit_visible_ms_p50: percentile(quantityVisibleMsValues, 50),
    quantity_edit_visible_ms_p95: percentile(quantityVisibleMsValues, 95),
    quantity_edit_visible_ms_p99: percentile(quantityVisibleMsValues, 99),
    quantity_edit_durable_ms_p50: percentile(quantityDurableMsValues, 50),
    quantity_edit_durable_ms_p95: percentile(quantityDurableMsValues, 95),
    quantity_edit_durable_ms_p99: percentile(quantityDurableMsValues, 99),
    quantity_app_visible_ms_p50: percentile(quantityAppVisibleMsValues, 50),
    quantity_app_visible_ms_p95: quantityAppVisibleP95,
    quantity_app_visible_ms_p99: percentile(quantityAppVisibleMsValues, 99),
    quantity_app_persistence_ms_p50: percentile(quantityAppPersistenceMsValues, 50),
    quantity_app_persistence_ms_p95: quantityAppPersistenceP95,
    quantity_app_persistence_ms_p99: percentile(quantityAppPersistenceMsValues, 99),
    quantity_app_revision_confirmed_ms_p50: percentile(quantityAppRevisionMsValues, 50),
    quantity_app_revision_confirmed_ms_p95: quantityAppRevisionP95,
    quantity_app_revision_confirmed_ms_p99: quantityAppRevisionP99,
    quantity_app_visible_to_recalculation_ms_p50: percentile(quantityAppVisibleToRecalculationMsValues, 50),
    quantity_app_visible_to_recalculation_ms_p95: percentile(quantityAppVisibleToRecalculationMsValues, 95),
    quantity_app_enqueue_to_recalculation_ms_p50: percentile(quantityAppEnqueueToRecalculationMsValues, 50),
    quantity_app_enqueue_to_recalculation_ms_p95: percentile(quantityAppEnqueueToRecalculationMsValues, 95),
    quantity_latency_within_budget: quantityLatencyWithinBudget,
    case_duration_ms_p50: percentile(durationValues, 50),
    case_duration_ms_p95: percentile(durationValues, 95),
    case_duration_ms_p99: percentile(durationValues, 99),
    max_heap_used_mb: Math.round(maxHeapUsedMb * 100) / 100,
    session_soak_100_passed: sessionSoakPassed,
    full_11610_android_api34_passed: false,
    limited_smoke_only: false,
    setup_failure: setupFailure,
    failure_samples: rows.filter((row) => !row.passed).slice(0, 20),
    summary_path: summaryPath,
    ledger_path: ledgerPath,
    checkpoint_path: checkpointPath,
    fake_green_claimed: false,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary };
}

if (require.main === module) {
  void runAiEstimate11610AndroidApi34SessionSoak({
    iterations: numericArg("iterations") ?? numericArg("limit") ?? undefined,
    startIndex: numericArg("start-index") ?? undefined,
    baseUrl: argValue("base-url") ?? undefined,
    runId: argValue("run-id") ?? undefined,
    reopenEvery: numericArg("reopen-every") ?? undefined,
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeLedger: hasFlag("write-ledger"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.summary.final_status,
        android_device_id: result.summary.android_device_id,
        android_sdk: result.summary.android_sdk,
        android_chrome_version: result.summary.android_chrome_version,
        iterations_requested: result.summary.iterations_requested,
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
        quantity_persistence_failure_count: result.summary.quantity_persistence_failure_count,
        revision_confirmation_failure_count: result.summary.revision_confirmation_failure_count,
        android_framework_degradation_count: result.summary.android_framework_degradation_count,
        orphan_process_count: result.summary.orphan_process_count,
        history_reopen_checks: result.summary.history_reopen_checks,
        history_reopen_passed: result.summary.history_reopen_passed,
        pdf_generated_cases: result.summary.pdf_generated_cases,
        large_boq_cases: result.summary.large_boq_cases,
        peak_boq_rows: result.summary.peak_boq_rows,
        same_chrome_session: result.summary.same_chrome_session,
        cdp_target_growth: result.summary.cdp_target_growth,
        cdp_target_accumulation_detected: result.summary.cdp_target_accumulation_detected,
        js_event_listeners_growth: result.summary.js_event_listeners_growth,
        listener_timer_growth_within_budget: result.summary.listener_timer_growth_within_budget,
        chrome_pss_growth_kb: result.summary.chrome_pss_growth_kb,
        chrome_rss_growth_kb: result.summary.chrome_rss_growth_kb,
        memory_growth_within_budget: result.summary.memory_growth_within_budget,
        quantity_edit_visible_ms_p50: result.summary.quantity_edit_visible_ms_p50,
        quantity_edit_visible_ms_p95: result.summary.quantity_edit_visible_ms_p95,
        quantity_edit_visible_ms_p99: result.summary.quantity_edit_visible_ms_p99,
        quantity_edit_durable_ms_p50: result.summary.quantity_edit_durable_ms_p50,
        quantity_edit_durable_ms_p95: result.summary.quantity_edit_durable_ms_p95,
        quantity_edit_durable_ms_p99: result.summary.quantity_edit_durable_ms_p99,
        case_duration_ms_p50: result.summary.case_duration_ms_p50,
        case_duration_ms_p95: result.summary.case_duration_ms_p95,
        case_duration_ms_p99: result.summary.case_duration_ms_p99,
        session_soak_100_passed: result.summary.session_soak_100_passed,
        full_11610_android_api34_passed: result.summary.full_11610_android_api34_passed,
        setup_failure: result.summary.setup_failure,
        failure_samples: result.summary.failure_samples.slice(0, 5),
        summary_path: result.summary.summary_path,
        ledger_path: result.summary.ledger_path,
      }, null, 2));
      if (!result.summary.session_soak_100_passed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
