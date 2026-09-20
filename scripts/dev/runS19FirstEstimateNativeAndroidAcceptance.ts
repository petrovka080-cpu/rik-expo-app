import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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

import { Client } from "pg";

import { buildAndroidDeepLinkLaunchArgs } from "../e2e/androidDeepLinkLaunchContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "../e2e/ensureAndroidApi34DeviceReady";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  scrollToStart,
  seekNode,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
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
type AuditRow = Readonly<{
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
}>;

const CONTRACT = "rik-expo-app.r4-a13-6.s19-first-estimate.native-android.v1";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_PORT = 8_081;
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.S19_NATIVE_DEFINITION_RELEASE_ID
  ?? "a76ff40a-8030-5ee4-a83b-11ec0828fee4";
const SEARCH_RELEASE_ID = process.env.S19_NATIVE_SEARCH_RELEASE_ID
  ?? "f03d0f16-c355-5e45-b2c6-832668eac066";
const DEFINITION_ID = process.env.S19_NATIVE_DEFINITION_VERSION_ID
  ?? "0d1dffe5-0ba9-52bb-8450-b62ee2a24453";
const CATALOG_ID = "canonical-work:base:drywall_ceiling_interior_drywall_ceiling_prepare_large_area";
const ROOT_REVISION_ID = process.env.S19_NATIVE_ROOT_REVISION_ID
  ?? "f3f92944-79d5-4f40-8782-b1dc0993002c";
const REFINED_REVISION_ID = process.env.S19_NATIVE_REFINED_REVISION_ID
  ?? "b5360678-c2b2-4eda-9f55-298444c807be";
const REVISION_ID = process.env.S19_NATIVE_PRICED_REVISION_ID
  ?? "fc4df85a-9961-4e1a-be61-09d99f2db314";
const PASTE_ROW_ID =
  "drywall_ceiling_interior_drywall_ceiling_prepare_large_area:successor-r56:row:finish_paste";
const EXPECTED_ROW_COUNT = 15;
const EXPECTED_PROCUREMENT_COUNT = 8;
const EXPECTED_ROOT_NEED_COUNT = 20;
const ROOT = resolve(process.env.S19_NATIVE_ACCEPTANCE_ROOT
  ?? ".release-runtime/r4a13-6/s19-first-estimate/android-native-current-a76-v1");
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(process.env.S19_NATIVE_BACKEND_RECEIPT
  ?? ".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RECEIPT = resolve(process.env.S19_NATIVE_METRO_RECEIPT
  ?? ".release-runtime/r568/runtime/local-developer-current/metro.json");
const MASTER = resolve(
  process.env.S19_NATIVE_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md",
);
const WEB_RECEIPT = resolve(
  process.env.S19_NATIVE_WEB_RECEIPT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/web-current-a76-w12-v1/12_complete_editable_workflow.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S19_FIRST_ESTIMATE_NATIVE:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function readAudit(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function resources(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
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

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}`);
  return body;
}

async function allRows(authorization: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${REVISION_ID}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

function captureEvidence(adbPath: string, deviceId: string, name: string): Json[] {
  const result = capture(adbPath, deviceId, ROOT, name);
  return [result.screenshot, result.uiDump]
    .filter((path): path is string => Boolean(path))
    .map((path) => {
      const absolute = resolve(path);
      const bytes = readFileSync(absolute);
      return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
    });
}

function pdfViewerVisible(snapshot: UiSnapshot): boolean {
  return snapshot.ok && (
    snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))
    || snapshot.nodes.some((node) => node.packageName !== PACKAGE_NAME
      && /pdf/iu.test(`${node.text} ${node.contentDesc}`))
  );
}

async function bootstrap(adbPath: string, deviceId: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, buildDevClientUri(DEV_PORT), PACKAGE_NAME), 45_000);
  const deadline = Date.now() + 180_000;
  let last = dumpUi(adbPath, deviceId);
  while (Date.now() < deadline) {
    last = dumpUi(adbPath, deviceId);
    invariant(!last.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "DEV_CLIENT_CONFIG_RECOVERY_RED");
    if (last.text.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY")
      || last.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))) return;
    const continueNode = last.nodes.find((node) => node.enabled
      && /^(Continue|Reload)$/iu.test(node.text.trim()));
    if (continueNode) {
      tapNode(adbPath, deviceId, continueNode);
      await sleep(1_000);
      continue;
    }
    const localConsumerLogin = last.nodes.find((node) =>
      nodeHasId(node, "auth.login.local-consumer")
      || nodeHasId(node, "protected-identity-local-consumer-login"));
    if (localConsumerLogin?.enabled) {
      tapNode(adbPath, deviceId, localConsumerLogin);
      await sleep(1_000);
      continue;
    }
    await sleep(500);
  }
  throw new Error(`S19_FIRST_ESTIMATE_NATIVE:DEV_CLIENT_BOOTSTRAP_RED:${last.text.slice(0, 500)}`);
}

async function launchRevision(adbPath: string, deviceId: string, launchId: string): Promise<void> {
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", REVISION_ID);
  uri.searchParams.set("launchId", launchId);
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, uri.toString(), PACKAGE_NAME), 45_000);
}

async function waitForRevisionAudit(auditPath: string, start: number): Promise<AuditRow[]> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = readAudit(auditPath).slice(start);
    if (rows.some((row) => row.method === "GET"
      && row.status === 200
      && row.path === `/revisions/${REVISION_ID}`)
      && rows.some((row) => row.method === "GET"
        && row.status === 200
        && String(row.path).startsWith(`/revisions/${REVISION_ID}/rows`))) return rows;
    await sleep(250);
  }
  throw new Error("S19_FIRST_ESTIMATE_NATIVE:REVISION_GETS_NOT_OBSERVED");
}

async function tapFullyVisibleId(
  adbPath: string,
  deviceId: string,
  id: string,
): Promise<boolean> {
  const found = await seekNode(
    adbPath,
    deviceId,
    (node) => {
      const box = bounds(node);
      return nodeHasId(node, id)
        && node.enabled
        && box != null
        && box.top >= 283
        && box.bottom <= 2_100;
    },
    60,
    "fine",
  );
  return Boolean(found.node && tapNode(adbPath, deviceId, found.node));
}

function nodeInside(parent: UiNode, child: UiNode): boolean {
  const parentBox = bounds(parent);
  const childBox = bounds(child);
  return Boolean(parentBox && childBox
    && childBox.left >= parentBox.left
    && childBox.right <= parentBox.right
    && childBox.top >= parentBox.top
    && childBox.bottom <= parentBox.bottom);
}

async function verifyCurrentEstimate(
  adbPath: string,
  deviceId: string,
  evidencePrefix: string,
): Promise<{ evidence: Json[]; summaryText: string }> {
  await scrollToStart(adbPath, deviceId, 48);
  const title = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-selected-work-title")
      && /подготовка потолка из гипсокартона/iu.test(node.text)
      && /500/iu.test(node.text),
    30,
  );
  invariant(title.node, "CURRENT_TITLE_NOT_VISIBLE");
  const rowCount = title.snapshot.nodes.find((node) => /15 позиц/iu.test(node.text));
  const total = title.snapshot.nodes.find((node) => /350[\s\u00a0]*840/iu.test(node.text));
  invariant(rowCount && total, "CURRENT_SUMMARY_NOT_VISIBLE");
  const evidence = captureEvidence(adbPath, deviceId, `${evidencePrefix}_summary_15_rows`);

  let paste = title.snapshot.nodes.find((node) =>
    /Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи/iu.test(node.text)
      && /252/iu.test(node.text));
  if (!paste) {
    const positionsToggle = title.snapshot.nodes.find((node) =>
      nodeHasId(node, "request-estimate-items-editor") && node.enabled);
    if (positionsToggle) {
      tapNode(adbPath, deviceId, positionsToggle);
      await sleep(500);
    }
    const found = await seekNode(
      adbPath,
      deviceId,
      (node) => /Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи/iu.test(node.text)
        && /252/iu.test(node.text),
      40,
      "fine",
    );
    paste = found.node ?? undefined;
  }
  invariant(paste, "KNAUF_252_KG_ROW_NOT_VISIBLE");
  evidence.push(...captureEvidence(adbPath, deviceId, `${evidencePrefix}_knauf_252_kg`));
  return { evidence, summaryText: `${rowCount.text}; ${total.text}` };
}

async function openFullEstimateAfterMeaningfulPreview(
  adbPath: string,
  deviceId: string,
): Promise<void> {
  const initial = dumpUi(adbPath, deviceId);
  if (initial.nodes.some((node) => nodeHasId(node, "estimate-revision-timeline"))) return;
  const open = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled,
    32,
    "fine",
  );
  invariant(open.node && tapNode(adbPath, deviceId, open.node), "OPEN_FULL_ESTIMATE_RED");
  const projection = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => !snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-estimate-meaningful-preview")
      || nodeHasId(node, "consumer-estimate-open-full-estimate")),
    120_000,
  );
  invariant(!projection.nodes.some((node) =>
    nodeHasId(node, "consumer-estimate-meaningful-preview")
    || nodeHasId(node, "consumer-estimate-open-full-estimate")),
    "FULL_ESTIMATE_PROJECTION_RED");
}

async function main(): Promise<void> {
  mkdirSync(ROOT, { recursive: true });
  const before = resources();
  const androidWasAlreadyOnline = /\tdevice\b/u.test(
    execFileSync("adb", ["devices"], { encoding: "utf8", timeout: 10_000 }),
  );
  invariant(before.availableMemoryBytes >= 1024 ** 3 || androidWasAlreadyOnline,
    `AVAILABLE_MEMORY_RED:${before.availableMemoryBytes}`);
  invariant([MASTER, CREDENTIALS, BACKEND_RECEIPT, METRO_RECEIPT, WEB_RECEIPT]
    .every((path) => existsSync(path)), "REQUIRED_INPUT_MISSING");

  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const webReceipt = readJson(WEB_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(tuple.definitionReleaseId === RELEASE_ID
    && tuple.searchReleaseId === SEARCH_RELEASE_ID
    && metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
  "RUNTIME_TUPLE_RED");
  invariant(webReceipt.status === "GREEN_R4_A13_4_PLATFORM_CORE_GLOBAL_WORKFLOW_WEB"
    && webReceipt.cases?.[0]?.revision?.revisionId === ROOT_REVISION_ID
    && webReceipt.cases?.[0]?.fullWorkflow?.fullRevisionId === REFINED_REVISION_ID
    && webReceipt.cases?.[0]?.fullWorkflow?.pricedRevisionId === REVISION_ID
    && webReceipt.cases?.[0]?.pdf?.status === "ready"
    && webReceipt.cases?.[0]?.procurement?.status === "ready",
  "WEB_ACCEPTANCE_LINEAGE_RED");

  const authorization = await login();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.definitionRelease?.status === "prepared"
    && manifest.searchRelease?.status === "draft"
    && manifest.definitionRelease?.activatedAt == null
    && manifest.searchRelease?.activatedAt == null,
  "LIFECYCLE_RED");
  const rootRevision = await api(authorization, `revisions/${ROOT_REVISION_ID}`);
  const refinedRevision = await api(authorization, `revisions/${REFINED_REVISION_ID}`);
  const revision = await api(authorization, `revisions/${REVISION_ID}`);
  const rows = await allRows(authorization);
  const paste = rows.find((row) => row.rowId === PASTE_ROW_ID);
  invariant(rootRevision.releaseId === RELEASE_ID
    && Number(rootRevision.rowCount) === 7
    && rootRevision.preliminaryNeeds?.length === EXPECTED_ROOT_NEED_COUNT
    && refinedRevision.parentRevisionId === ROOT_REVISION_ID
    && revision.parentRevisionId === REFINED_REVISION_ID
    && revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === DEFINITION_ID
    && revision.catalogId === CATALOG_ID
    && Number(revision.rowCount) === EXPECTED_ROW_COUNT
    && rows.length === EXPECTED_ROW_COUNT
    && Number(paste?.quantity) === 252
    && paste?.unitId === "kg",
  "REVISION_TRUTH_RED");

  const pdf = await api(authorization,
    `revisions/${REVISION_ID}/artifacts/pdf?documentProfile=professional_v1`);
  const procurement = await api(authorization, `revisions/${REVISION_ID}/artifacts/procurement`);
  invariant(pdf.status === "ready"
    && pdf.releaseId === RELEASE_ID
    && Number(pdf.metadata?.projectedRowCount) === EXPECTED_ROW_COUNT
    && procurement.status === "ready"
    && procurement.releaseId === RELEASE_ID
    && Number(procurement.metadata?.selectedProcurementRowCount) === EXPECTED_PROCUREMENT_COUNT,
  "ARTIFACT_IDENTITY_RED");

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
  `DEVICE_RED:${device.final_status}`);
  const adbPath = String(device.adb_path);
  const deviceId = String(device.device_id);
  const installed = String(runAdb(["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000));
  invariant(installed.includes("package:"), "PACKAGE_NOT_INSTALLED");
  await bootstrap(adbPath, deviceId);

  const auditPath = resolve(
    process.env.S19_NATIVE_BACKEND_AUDIT
      ?? `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`,
  );
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);
  const evidence: Json[] = [];
  const initialAuditStart = readAudit(auditPath).length;
  await launchRevision(adbPath, deviceId, `s19-first-estimate-native:${Date.now().toString(36)}`);
  const initialAudit = await waitForRevisionAudit(auditPath, initialAuditStart);
  invariant(initialAudit.length > 0
    && initialAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/")),
  "INITIAL_NATIVE_TRANSPORT_RED");
  const current = await verifyCurrentEstimate(adbPath, deviceId, "01_current");
  evidence.push(...current.evidence);
  await openFullEstimateAfterMeaningfulPreview(adbPath, deviceId);

  const timeline = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    48,
    "fine",
  );
  invariant(timeline.node, "HISTORY_NOT_VISIBLE");
  evidence.push(...captureEvidence(adbPath, deviceId, "02_history"));

  const procurementOpen = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list")),
    2_000,
  );
  if (!procurementOpen.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list"))) {
    invariant(await tapFullyVisibleId(adbPath, deviceId, "consumer-estimate-open-procurement"),
      "PROCUREMENT_ACTION_RED");
  }
  const procurementHeader = await seekNode(
    adbPath,
    deviceId,
    (node) => /Список закупки/iu.test(node.text),
    40,
    "fine",
  );
  const procurementMeta = procurementHeader.snapshot.nodes.find((node) => /8 позиц/iu.test(node.text))
    ?? (await seekNode(adbPath, deviceId, (node) => /8 позиц/iu.test(node.text), 8, "fine")).node;
  invariant(procurementHeader.node && procurementMeta, "PROCUREMENT_HEADER_RED");
  const procurementPaste = await seekNode(
    adbPath,
    deviceId,
    (node) => {
      const box = bounds(node);
      return nodeHasId(node, `consumer-estimate-procurement-row-${PASTE_ROW_ID}`)
        && box != null
        && box.top >= 283
        && box.bottom <= 2_100;
    },
    60,
    "fine",
  );
  const procurementPasteChildren = procurementPaste.node
    ? procurementPaste.snapshot.nodes.filter((node) => nodeInside(procurementPaste.node as UiNode, node))
    : [];
  const procurementPasteTitleVisible = procurementPasteChildren.some((node) =>
    /^Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи$/iu.test(node.text));
  const procurementPasteQuantityVisible = procurementPasteChildren.some((node) =>
    /^252\s*(?:кг|kg)$/iu.test(node.text));
  evidence.push(...captureEvidence(adbPath, deviceId, "03_procurement_8_rows"));
  const procurementPasteDiagnostics = procurementPasteChildren
    .map((node) => node.text.trim())
    .filter(Boolean)
    .slice(0, 12);
  invariant(procurementPaste.node
    && procurementPasteTitleVisible
    && procurementPasteQuantityVisible,
  `PROCUREMENT_KNAUF_ROW_RED:${JSON.stringify({
    rowVisible: Boolean(procurementPaste.node),
    titleVisible: procurementPasteTitleVisible,
    quantityVisible: procurementPasteQuantityVisible,
    matchingTexts: procurementPasteDiagnostics,
  })}`);

  const pdfAuditStart = readAudit(auditPath).length;
  invariant(await tapFullyVisibleId(adbPath, deviceId, "consumer-estimate-make-pdf"),
    "PDF_ACTION_RED");
  const pdfViewer = await waitForSnapshot(adbPath, deviceId, pdfViewerVisible, 60_000);
  invariant(pdfViewerVisible(pdfViewer), "PDF_VIEWER_RED");
  const pdfAudit = readAudit(auditPath).slice(pdfAuditStart);
  invariant(pdfAudit.some((row) => (row.method === "GET" || row.method === "POST")
    && Number(row.status) >= 200
    && Number(row.status) < 300
    && String(row.path).startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`)),
  "PDF_REQUEST_NOT_OBSERVED");
  evidence.push(...captureEvidence(adbPath, deviceId, "04_pdf_viewer"));

  const coldStart = readAudit(auditPath).length;
  runAdb(["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  await sleep(750);
  await bootstrap(adbPath, deviceId);
  await launchRevision(adbPath, deviceId, `s19-first-estimate-cold:${Date.now().toString(36)}`);
  await waitForRevisionAudit(auditPath, coldStart);
  const cold = await verifyCurrentEstimate(adbPath, deviceId, "05_cold_current");
  evidence.push(...cold.evidence);
  const coldAudit = readAudit(auditPath).slice(coldStart);
  invariant(coldAudit.length > 0
    && coldAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/"))
    && !coldAudit.some((row) => row.method === "POST")
    && coldAudit.some((row) => row.method === "GET"
      && String(row.path).startsWith(`/revisions/${REVISION_ID}/artifacts/pdf`))
    && coldAudit.some((row) => row.method === "GET"
      && row.path === `/revisions/${REVISION_ID}/artifacts/procurement`),
  "COLD_AUDIT_RED");

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const release = (await client.query(
    "select status,activated_at from public.estimate_definition_release where id=$1",
    [RELEASE_ID],
  )).rows[0] as Json;
  const search = (await client.query(
    "select status,activated_at from public.estimate_search_index_release where id=$1",
    [SEARCH_RELEASE_ID],
  )).rows[0] as Json;
  await client.end();
  invariant(release.status === "prepared" && release.activated_at == null
    && search.status === "draft" && search.activated_at == null,
  "PERSISTED_LIFECYCLE_RED");

  const after = resources();
  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_S19_FIRST_ESTIMATE_NATIVE_ANDROID_HISTORY_PDF_PROCUREMENT_COLD_PREPARED_NOT_ACTIVE",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    master: { path: MASTER.replace(/\\/gu, "/"), sha256: sha256(readFileSync(MASTER)) },
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      runtimeSourceTree: tuple.sourceTree,
      frontendJsBundleFingerprint: tuple.frontendJsBundleFingerprint,
    },
    runtime: {
      platform: "android",
      apiLevel: device.android_sdk,
      deviceId,
      avd: device.avd_name,
      package: PACKAGE_NAME,
      releaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionId: DEFINITION_ID,
      catalogId: CATALOG_ID,
      metroStartedForAcceptance: metro.started,
      metroConfigurationValidated: metro.configurationValidated,
      androidWasAlreadyOnline,
    },
    lineage: {
      rootRevisionId: ROOT_REVISION_ID,
      refinedRevisionId: REFINED_REVISION_ID,
      pricedRevisionId: REVISION_ID,
      webReceipt: { path: WEB_RECEIPT.replace(/\\/gu, "/"), sha256: sha256(readFileSync(WEB_RECEIPT)) },
    },
    currentUi: {
      rowCount: EXPECTED_ROW_COUNT,
      pasteKg: 252,
      pasteTitleRu: "Финишная шпаклёвка КНАУФ-Ротбанд Паста Профи",
      summaryText: current.summaryText,
      visible: true,
    },
    history: { visible: true, rootRevisionId: ROOT_REVISION_ID, currentRevisionId: REVISION_ID },
    documents: {
      procurement: { artifactId: procurement.artifactId, rowCount: EXPECTED_PROCUREMENT_COUNT, panelVisible: true },
      pdf: { artifactId: pdf.artifactId, pageCount: pdf.metadata?.pageCount, viewerVisible: true },
    },
    coldOpen: { currentRevisionVisible: true, pdfHydrated: true, procurementHydrated: true },
    requestAudit: {
      path: auditPath.replace(/\\/gu, "/"),
      requestCount: coldAudit.length,
      postCount: coldAudit.filter((row) => row.method === "POST").length,
      transport: "okhttp",
    },
    evidence,
    resourceControl: {
      before,
      after,
      availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
      availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
      oneHeavyProcessAtATime: true,
      appDataCleared: false,
      avdDataDeleted: false,
    },
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  atomicJson(OUTPUT, { ...body, receiptSha256: sha256(JSON.stringify(body)) });
  process.stdout.write(`${JSON.stringify({
    status: body.status,
    revisionId: REVISION_ID,
    output: OUTPUT,
    coldPosts: body.requestAudit.postCount,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
