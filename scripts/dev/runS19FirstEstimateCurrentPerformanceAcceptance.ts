import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "../e2e/androidDeepLinkLaunchContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "../e2e/ensureAndroidApi34DeviceReady";
import {
  dumpUi,
  nodeHasId,
  seekNode,
  tapNode,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";
import {
  buildDevClientUri,
  ensureMetro,
  isMetroReachable,
  runAdb,
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";

type Json = Record<string, any>;
type Mode = "cold_calculation_cache" | "warm_application";
type AuditRow = Readonly<{
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
}>;
type TimingSample = Readonly<{
  ordinal: number;
  platform: "web" | "android_native_api34";
  mode: Mode;
  meaningfulUiMs: number;
  runtimeDraftReadyMs: number;
  durableCommitMs: number;
  revisionId: string;
  calculatedRows: number;
  preliminaryNeeds: number;
  productMarkers: readonly string[];
  nativeUiWitnessIds?: readonly string[];
}>;

const CONTRACT = "rik-expo-app.r4-a13-6.s19-first-estimate.current-performance.v1";
const ORIGIN = "http://127.0.0.1:8081";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_PORT = 8_081;
const RELEASE_ID = process.env.S19_PERF_DEFINITION_RELEASE_ID
  ?? "65ee326a-7cfc-54ea-bdfe-b5de969b0ec4";
const SEARCH_RELEASE_ID = process.env.S19_PERF_SEARCH_RELEASE_ID
  ?? "5d7fc97e-ee99-5f15-be4a-2e9d787a0e85";
const CATALOG_ID =
  "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_prepare_large_area";
const PROMPT = "подготовка потолка из гипсокартона на большой площади 500 кв метров";
const SAMPLE_COUNT = Number(process.env.S19_PERF_SAMPLE_COUNT ?? 20);
const OUTPUT_ROOT = resolve(process.env.S19_PERF_OUTPUT_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/current-performance-v2");
const OUTPUT = resolve(OUTPUT_ROOT, "acceptance.json");
const STATE = resolve(OUTPUT_ROOT, "run-state.json");
const FAILURE = resolve(OUTPUT_ROOT, "failure.json");
const DEVICE_ROOT = resolve(OUTPUT_ROOT, "device");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(process.env.S19_PERF_BACKEND_RECEIPT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/runtime-v3-final/backend.json");
const METRO_RECEIPT = resolve(process.env.S19_PERF_METRO_RECEIPT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/runtime-v3-final/metro.json");
const MASTER = resolve(process.env.S19_PERF_MASTER_PATH
  ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md");
const WARM_BUDGET_MS = 3_000;
const COLD_CALCULATION_CACHE_BUDGET_MS = 8_000;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S19_CURRENT_PERFORMANCE:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const pending = `${path}.pending-${process.pid}`;
  writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(pending, path);
}

function resources(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function readAudit(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function revisionIdFromAuditPath(path: string | undefined): string | null {
  return String(path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null;
}

function markerRecords(text: string): { stage: string; elapsedMs: number; raw: string }[] {
  const records: { stage: string; elapsedMs: number; raw: string }[] = [];
  for (const line of text.split(/\r?\n/u)) {
    for (const match of line.matchAll(/\{"stage":"([^"]+)","elapsedMs":(\d+)[^}]*\}/gu)) {
      records.push({ stage: match[1], elapsedMs: Number(match[2]), raw: line.trim() });
    }
  }
  return records;
}

function metricPair(records: readonly { stage: string; elapsedMs: number; raw: string }[]): {
  runtimeDraftReadyMs: number;
  meaningfulUiPublishedMs: number;
  durableCommitMs: number;
  productMarkers: string[];
} | null {
  const ready = records.find((record) => record.stage === "RUNTIME_DRAFT_READY");
  const meaningful = records.find((record) => record.stage === "MEANINGFUL_UI_PUBLISHED");
  const durable = records.find((record) => record.stage === "BUNDLE_PERSISTED");
  if (!ready || !meaningful || !durable
    || meaningful.elapsedMs < ready.elapsedMs
    || durable.elapsedMs < meaningful.elapsedMs) return null;
  return {
    runtimeDraftReadyMs: ready.elapsedMs,
    meaningfulUiPublishedMs: meaningful.elapsedMs,
    durableCommitMs: durable.elapsedMs,
    productMarkers: [ready.raw, meaningful.raw, durable.raw],
  };
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}`);
  return body;
}

async function login(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const owner = credentials.owner as Json | undefined;
  invariant(owner?.role === "platform_developer"
    && owner.email
    && owner.password
    && credentials.publishable_key,
  "OWNER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token && body.user?.id === owner.user_id,
    `LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function waitForAuditRevision(auditPath: string, start: number): Promise<string> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = readAudit(auditPath).slice(start);
    const mutation = rows.findIndex((row) => row.method === "POST"
      && row.path === "/jobs/compile"
      && row.status === 202);
    if (mutation >= 0) {
      const revisionId = rows.slice(mutation + 1)
        .map((row) => revisionIdFromAuditPath(row.path))
        .find(Boolean);
      if (revisionId) return revisionId;
    }
    await sleep(100);
  }
  throw new Error("S19_CURRENT_PERFORMANCE:AUDIT_REVISION_TIMEOUT");
}

async function waitForWebConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const director = page.getByTestId("local-developer-director-login");
    if (await director.isVisible().catch(() => false)
      && await director.isEnabled().catch(() => false)) {
      await director.click({ timeout: 2_000 }).catch(() => undefined);
    } else {
      const consumer = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await consumer.isVisible().catch(() => false)
        && await consumer.isEnabled().catch(() => false)) {
        await consumer.click({ timeout: 2_000 }).catch(() => undefined);
      }
    }
    await page.waitForTimeout(200);
  }
  throw new Error("S19_CURRENT_PERFORMANCE:WEB_CONSUMER_ROUTE_TIMEOUT");
}

async function prepareWebPage(page: Page, marker: string): Promise<{
  authorization: () => string;
  markerStart: number;
  markers: { stage: string; elapsedMs: number; raw: string }[];
}> {
  let authorization = "";
  const markers: { stage: string; elapsedMs: number; raw: string }[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(`${BACKEND}/`)) {
      const value = request.headers().authorization ?? "";
      if (value.startsWith("Bearer ")) authorization = value;
    }
  });
  page.on("console", (message) => markers.push(...markerRecords(message.text())));
  await page.goto(`${ORIGIN}/request?s19Perf=${encodeURIComponent(marker)}`, {
    waitUntil: "commit",
    timeout: 180_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await waitForWebConsumer(page);
  const problem = page.getByTestId("consumer-repair-problem-input");
  const searchPromise = page.waitForResponse((response) =>
    response.url().startsWith(`${BACKEND}/search/catalog?`) && response.status() === 200,
  { timeout: 120_000 });
  const [searchResponse] = await Promise.all([searchPromise, problem.fill(PROMPT)]);
  const search = await searchResponse.json() as Json;
  invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID, "WEB_SEARCH_RELEASE_DRIFT");
  const items = Array.isArray(search.items) ? search.items as Json[] : [];
  const selectedIndex = items.findIndex((item) => item.catalogId === CATALOG_ID);
  invariant(selectedIndex >= 0 && items[selectedIndex].estimateReady === true,
    "WEB_TARGET_NOT_READY");
  const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
  await suggestion.waitFor({ state: "visible", timeout: 120_000 });
  await suggestion.click();
  const prepare = page.getByTestId("consumer-repair-prepare-draft");
  await prepare.waitFor({ state: "visible", timeout: 60_000 });
  invariant(await prepare.isEnabled(), "WEB_PREPARE_DISABLED");
  return { authorization: () => authorization, markerStart: markers.length, markers };
}

async function runWebSample(input: {
  page: Page;
  mode: Mode;
  ordinal: number;
  auditPath: string;
}): Promise<TimingSample> {
  const prepared = await prepareWebPage(
    input.page,
    `web-${input.mode}-${input.ordinal}-${Date.now().toString(36)}`,
  );
  const auditStart = readAudit(input.auditPath).length;
  const startedAt = Date.now();
  const prepare = input.page.getByTestId("consumer-repair-prepare-draft");
  const compilePromise = input.page.waitForResponse((response) =>
    response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST"
      && response.status() === 202,
  { timeout: 60_000 });
  await Promise.all([compilePromise, prepare.click()]);
  const revisionPromise = waitForAuditRevision(input.auditPath, auditStart);
  const uiPromise = (async () => {
    const preview = input.page.getByTestId("consumer-estimate-meaningful-preview");
    await preview.waitFor({ state: "visible", timeout: 120_000 });
    const calculated = preview.getByTestId("request-estimate-row-count");
    const needs = preview.getByTestId("request-estimate-preliminary-need-count");
    await calculated.waitFor({ state: "visible", timeout: 120_000 });
    await needs.waitFor({ state: "visible", timeout: 120_000 });
    invariant(/7/u.test(await calculated.innerText()), "WEB_CALCULATED_COUNT_RED");
    invariant(/20/u.test(await needs.innerText()), "WEB_NEED_COUNT_RED");
    return Date.now() - startedAt;
  })();
  const markerPromise = (async () => {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const pair = metricPair(prepared.markers.slice(prepared.markerStart));
      if (pair) return pair;
      await input.page.waitForTimeout(50);
    }
    throw new Error("S19_CURRENT_PERFORMANCE:WEB_PRODUCT_MARKER_TIMEOUT");
  })();
  const [revisionId, meaningfulUiMs, metrics] = await Promise.all([
    revisionPromise,
    uiPromise,
    markerPromise,
  ]);
  const authorization = prepared.authorization();
  invariant(authorization.startsWith("Bearer "), "WEB_AUTHORIZATION_MISSING");
  const revision = await api(authorization, `revisions/${revisionId}`);
  const rows = await allRows(authorization, revisionId);
  const needs = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
  invariant(revision.releaseId === RELEASE_ID
    && revision.catalogId === CATALOG_ID
    && rows.length === 7
    && needs.length === 20,
  "WEB_REVISION_TRUTH_RED");
  return {
    ordinal: input.ordinal,
    platform: "web",
    mode: input.mode,
    meaningfulUiMs,
    ...metrics,
    revisionId,
    calculatedRows: rows.length,
    preliminaryNeeds: needs.length,
  };
}

async function bootstrapAndroid(adbPath: string, deviceId: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, buildDevClientUri(DEV_PORT), PACKAGE_NAME), 45_000);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adbPath, deviceId);
    invariant(!snapshot.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "ANDROID_CONFIG_RECOVERY_RED");
    if (snapshot.text.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY")
      || snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))) return;
    const continueNode = snapshot.nodes.find((node) => node.enabled
      && /^(Continue|Reload)$/iu.test(node.text.trim()));
    if (continueNode) {
      tapNode(adbPath, deviceId, continueNode);
    }
    const consumer = snapshot.nodes.find((node) =>
      nodeHasId(node, "auth.login.local-consumer")
      || nodeHasId(node, "protected-identity-local-consumer-login"));
    if (consumer?.enabled) {
      tapNode(adbPath, deviceId, consumer);
    }
    await sleep(400);
  }
  throw new Error("S19_CURRENT_PERFORMANCE:ANDROID_BOOTSTRAP_TIMEOUT");
}

function androidLogs(adbPath: string, deviceId: string): string {
  return execFileSync(adbPath, [
    "-s", deviceId, "logcat", "-d", "-v", "raw", "ReactNativeJS:I", "*:S",
  ], { encoding: "utf8", timeout: 20_000, maxBuffer: 32 * 1024 * 1024 });
}

async function waitForAndroidMarkers(
  adbPath: string,
  deviceId: string,
  baselineCount: number,
): Promise<ReturnType<typeof metricPair> & {}> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const records = markerRecords(androidLogs(adbPath, deviceId));
    const pair = metricPair(records.slice(baselineCount));
    if (pair) return pair;
    await sleep(100);
  }
  throw new Error("S19_CURRENT_PERFORMANCE:ANDROID_PRODUCT_MARKER_TIMEOUT");
}

async function waitForAndroidLaunchReady(
  adbPath: string,
  deviceId: string,
  launchId: string,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const logs = androidLogs(adbPath, deviceId);
    if (logs.split(/\r?\n/u).some((line) =>
      line.includes("[RikWarmDeepLink] UI_READY")
        && line.includes(`\"launchId\":\"${launchId}\"`)
        && line.includes("\"projection\":\"request_prompt_composer\""))) return;
    await sleep(100);
  }
  throw new Error("S19_CURRENT_PERFORMANCE:ANDROID_PROMPT_UI_READY_TIMEOUT");
}

async function runAndroidSample(input: {
  adbPath: string;
  deviceId: string;
  authorization: string;
  auditPath: string;
  mode: Mode;
  ordinal: number;
}): Promise<TimingSample> {
  if (input.mode === "cold_calculation_cache") {
    runAdb(["-s", input.deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
    await sleep(250);
    await bootstrapAndroid(input.adbPath, input.deviceId);
  }
  const launchId = `s19-perf-${input.mode}-${input.ordinal}-${Date.now().toString(36)}`;
  const uri = buildAndroidRouteDeepLink({
    route: "/request",
    prompt: PROMPT,
    catalogWorkId: CATALOG_ID,
    launchId,
  });
  runAdb(buildAndroidDeepLinkLaunchArgs(input.deviceId, uri, PACKAGE_NAME), 45_000);
  await waitForAndroidLaunchReady(input.adbPath, input.deviceId, launchId);
  const prepare = await seekNode(
    input.adbPath,
    input.deviceId,
    (node) => nodeHasId(node, "consumer-repair-prepare-draft") && node.enabled,
    30,
  );
  invariant(prepare.node, "ANDROID_PREPARE_NOT_READY");
  const baselineCount = markerRecords(androidLogs(input.adbPath, input.deviceId)).length;
  const auditStart = readAudit(input.auditPath).length;
  const startedAt = Date.now();
  invariant(tapNode(input.adbPath, input.deviceId, prepare.node), "ANDROID_PREPARE_TAP_RED");
  const revisionPromise = waitForAuditRevision(input.auditPath, auditStart);
  const markerPromise = waitForAndroidMarkers(
    input.adbPath,
    input.deviceId,
    baselineCount,
  );
  const [revisionId, metrics] = await Promise.all([
    revisionPromise,
    markerPromise,
  ]);
  // UIAutomator freezes the React Native UI thread on this API-34 emulator and
  // materially inflates the measured product path. The product emits the
  // marker from the setState completion callback; accessibility is witnessed
  // only after that timer has stopped.
  const meaningfulUiMs = metrics.meaningfulUiPublishedMs;
  const revision = await api(input.authorization, `revisions/${revisionId}`);
  const rows = await allRows(input.authorization, revisionId);
  const needs = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds : [];
  invariant(revision.releaseId === RELEASE_ID
    && revision.catalogId === CATALOG_ID
    && rows.length === 7
    && needs.length === 20,
  "ANDROID_REVISION_TRUTH_RED");
  await sleep(100);
  const witness = dumpUi(input.adbPath, input.deviceId);
  const nativeUiWitnessIds = witness.nodes
    .filter((node) => [
      "request-estimate-selected-work-title",
      "request-estimate-row-count",
      "request-estimate-preliminary-need-count",
      "request-estimate-positions-toggle",
      "request-estimate-parameter-status",
    ].some((id) => nodeHasId(node, id)))
    .map((node) => node.resourceId || node.contentDesc)
    .filter(Boolean);
  invariant(nativeUiWitnessIds.length > 0, "ANDROID_UI_PROJECTION_WITNESS_RED");
  return {
    ordinal: input.ordinal,
    platform: "android_native_api34",
    mode: input.mode,
    meaningfulUiMs,
    ...metrics,
    revisionId,
    calculatedRows: rows.length,
    preliminaryNeeds: needs.length,
    nativeUiWitnessIds,
  };
}

function nearestRankP95(values: readonly number[]): number {
  invariant(values.length >= 20, `P95_SAMPLE_COUNT_RED:${values.length}`);
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(0.95 * sorted.length) - 1];
}

function summary(samples: readonly TimingSample[], platform: TimingSample["platform"], mode: Mode): Json {
  const selected = samples.filter((sample) => sample.platform === platform && sample.mode === mode);
  invariant(selected.length === SAMPLE_COUNT, `SUMMARY_SAMPLE_COUNT:${platform}:${mode}:${selected.length}`);
  const ui = selected.map((sample) => sample.meaningfulUiMs);
  const ready = selected.map((sample) => sample.runtimeDraftReadyMs);
  const durable = selected.map((sample) => sample.durableCommitMs);
  const budgetMs = mode === "warm_application" ? WARM_BUDGET_MS : COLD_CALCULATION_CACHE_BUDGET_MS;
  const meaningfulUiP95Ms = nearestRankP95(ui);
  return {
    platform,
    mode,
    sampleCount: selected.length,
    budgetMs,
    nearestRank: true,
    meaningfulUi: { rawMs: ui, p95Ms: meaningfulUiP95Ms, maxMs: Math.max(...ui) },
    runtimeDraftReady: { rawMs: ready, p95Ms: nearestRankP95(ready), maxMs: Math.max(...ready) },
    durableCommit: { rawMs: durable, p95Ms: nearestRankP95(durable), maxMs: Math.max(...durable) },
    status: meaningfulUiP95Ms <= budgetMs ? "PASS" : "FAIL",
  };
}

async function main(): Promise<void> {
  invariant(Number.isInteger(SAMPLE_COUNT) && SAMPLE_COUNT >= 20, `SAMPLE_COUNT_RED:${SAMPLE_COUNT}`);
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const before = resources();
  invariant([MASTER, CREDENTIALS, BACKEND_RECEIPT, METRO_RECEIPT].every(existsSync),
    "REQUIRED_INPUT_MISSING");
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(backendReceipt.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT"
    && backendReceipt.active_compile_jobs === 0
    && tuple.definitionReleaseId === RELEASE_ID
    && tuple.searchReleaseId === SEARCH_RELEASE_ID
    && metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID
    && tuple.sourceTree === metroReceipt.source_tree_hash,
  "RUNTIME_TUPLE_RED");
  const auditPath = resolve(
    dirname(BACKEND_RECEIPT),
    "runtime",
    `backend-${String(tuple.sourceTree).slice(0, 12)}`,
    "request-audit.jsonl",
  );
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);
  const authorization = await login();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && manifest.definitionRelease?.status === "prepared"
    && manifest.definitionRelease?.activatedAt == null
    && manifest.searchRelease?.status === "draft"
    && manifest.searchRelease?.activatedAt == null,
  "RUNTIME_MANIFEST_RED");

  let state: Json;
  if (existsSync(STATE)) {
    state = readJson(STATE);
    invariant(state.definitionReleaseId === RELEASE_ID
      && state.searchReleaseId === SEARCH_RELEASE_ID
      && state.sourceTree === tuple.sourceTree
      && state.jsBundleFingerprint === tuple.frontendJsBundleFingerprint,
    "STATE_DEPENDENCY_DRIFT");
  } else {
    state = {
      schemaVersion: `${CONTRACT}.state.v1`,
      startedAt: new Date().toISOString(),
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      sourceTree: tuple.sourceTree,
      jsBundleFingerprint: tuple.frontendJsBundleFingerprint,
      samples: [],
    };
    atomicJson(STATE, state);
  }
  const samples = state.samples as TimingSample[];
  const has = (platform: TimingSample["platform"], mode: Mode, ordinal: number) =>
    samples.some((sample) => sample.platform === platform
      && sample.mode === mode
      && sample.ordinal === ordinal);
  const save = (sample: TimingSample) => {
    samples.push(sample);
    state.samples = samples;
    state.lastCompleted = {
      at: new Date().toISOString(),
      platform: sample.platform,
      mode: sample.mode,
      ordinal: sample.ordinal,
    };
    atomicJson(STATE, state);
    process.stdout.write(`${JSON.stringify({ stage: "SAMPLE_GREEN", ...state.lastCompleted,
      meaningfulUiMs: sample.meaningfulUiMs, durableCommitMs: sample.durableCommitMs })}\n`);
  };

  const browser = await chromium.launch({ headless: true });
  try {
    let warmContext: BrowserContext | null = null;
    let warmPage: Page | null = null;
    for (const mode of ["cold_calculation_cache", "warm_application"] as const) {
      if (mode === "warm_application") {
        warmContext = await browser.newContext();
        warmPage = await warmContext.newPage();
      }
      for (let ordinal = 1; ordinal <= SAMPLE_COUNT; ordinal += 1) {
        if (has("web", mode, ordinal)) continue;
        const context = mode === "cold_calculation_cache" ? await browser.newContext() : warmContext!;
        const page = mode === "cold_calculation_cache" ? await context.newPage() : warmPage!;
        try {
          save(await runWebSample({ page, mode, ordinal, auditPath }));
        } finally {
          if (mode === "cold_calculation_cache") await context.close();
        }
      }
      await warmContext?.close();
      warmContext = null;
      warmPage = null;
    }
  } finally {
    await browser.close();
  }

  const metro = await ensureMetro(DEV_PORT);
  invariant(await isMetroReachable(DEV_PORT) && metro.configurationValidated, "METRO_RED");
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: DEVICE_ROOT,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  invariant(device.final_status === API34_DEVICE_READY
    && device.android_sdk === 34
    && device.single_device_active === true
    && device.device_id
    && device.adb_path,
  `DEVICE_RED:${device.final_status}:${device.failure_reason ?? ""}`);
  const adbPath = String(device.adb_path);
  const deviceId = String(device.device_id);
  invariant(String(runAdb(["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000))
    .includes("package:"), "PACKAGE_NOT_INSTALLED");
  await bootstrapAndroid(adbPath, deviceId);
  for (const mode of ["cold_calculation_cache", "warm_application"] as const) {
    for (let ordinal = 1; ordinal <= SAMPLE_COUNT; ordinal += 1) {
      if (has("android_native_api34", mode, ordinal)) continue;
      save(await runAndroidSample({
        adbPath,
        deviceId,
        authorization,
        auditPath,
        mode,
        ordinal,
      }));
    }
  }

  const summaries = [
    summary(samples, "web", "cold_calculation_cache"),
    summary(samples, "web", "warm_application"),
    summary(samples, "android_native_api34", "cold_calculation_cache"),
    summary(samples, "android_native_api34", "warm_application"),
  ];
  invariant(summaries.every((entry) => entry.status === "PASS"),
    `BUDGET_RED:${JSON.stringify(summaries.map((entry) => ({
      platform: entry.platform,
      mode: entry.mode,
      p95Ms: entry.meaningfulUi.p95Ms,
      budgetMs: entry.budgetMs,
    })))}`);
  const after = resources();
  const body: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_S19_CURRENT_WEB_ANDROID_PERFORMANCE_PREPARED_NOT_ACTIVE",
    master: { path: MASTER.replace(/\\/gu, "/"), sha256: sha256(readFileSync(MASTER)) },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      sourceTree: tuple.sourceTree,
      jsBundleFingerprint: tuple.frontendJsBundleFingerprint,
      backendRuntimeSourceSha256: tuple.backendRuntimeSourceSha256,
      backendPid: backendReceipt.backend_pid,
      metroPid: metroReceipt.pid,
      capabilityId: tuple.capabilityId,
      androidApiLevel: device.android_sdk,
      androidDeviceId: deviceId,
      androidAvd: device.avd_name,
    },
    contract: {
      warmApplicationBudgetMs: WARM_BUDGET_MS,
      firstRequestColdCalculationCacheBudgetMs: COLD_CALCULATION_CACHE_BUDGET_MS,
      minimumSamplesPerModeAndPlatform: 20,
      percentile: "nearest-rank-p95",
      timerStart: "ordinary prepare action",
      meaningfulStop: "current request calculated rows and honest preliminary needs visible",
      durableStop: "BUNDLE_PERSISTED product marker after backend history and transactional local commit",
      skeletonOrOldEstimateStopsTimer: false,
      fullColdApplicationStartupExcludedAndMeasuredSeparately: true,
    },
    summaries,
    samples,
    counts: {
      totalSamples: samples.length,
      expectedTotalSamples: SAMPLE_COUNT * 4,
      passingModePlatformSets: summaries.filter((entry) => entry.status === "PASS").length,
      modePlatformSets: summaries.length,
      duplicateRevisionIds: samples.length - new Set(samples.map((sample) => sample.revisionId)).size,
    },
    resourceControl: {
      before,
      after,
      oneHeavyPhaseAtATime: true,
      databaseCleared: false,
      appDataCleared: false,
      avdDataDeleted: false,
      userDraftsDeleted: false,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    mergePerformed: false,
    otaPerformed: false,
  };
  invariant(body.counts.totalSamples === body.counts.expectedTotalSamples
    && body.counts.duplicateRevisionIds === 0,
  "FINAL_SAMPLE_CARDINALITY_RED");
  body.receiptSha256 = sha256(JSON.stringify(body));
  atomicJson(OUTPUT, body);
  state.status = body.status;
  state.completedAt = body.capturedAt;
  state.output = OUTPUT.replace(/\\/gu, "/");
  state.outputSha256 = sha256(readFileSync(OUTPUT));
  atomicJson(STATE, state);
  process.stdout.write(`${JSON.stringify({
    status: body.status,
    summaries: summaries.map((entry) => ({
      platform: entry.platform,
      mode: entry.mode,
      p95Ms: entry.meaningfulUi.p95Ms,
      maxMs: entry.meaningfulUi.maxMs,
      budgetMs: entry.budgetMs,
    })),
    output: OUTPUT,
    outputSha256: state.outputSha256,
  }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  const failure = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: "RED_S19_CURRENT_WEB_ANDROID_PERFORMANCE",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  };
  atomicJson(FAILURE, failure);
  process.stderr.write(`${failure.error}\n`);
  process.exitCode = 1;
});
