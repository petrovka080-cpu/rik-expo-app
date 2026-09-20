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

import { Client } from "pg";

import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "../e2e/androidDeepLinkLaunchContract";
import {
  API34_DEVICE_READY,
  ensureAndroidApi34DeviceReady,
} from "../e2e/ensureAndroidApi34DeviceReady";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  tapById,
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

const CONTRACT = "rik-expo-app.r4-a13-6.s19-first-estimate.native-create-refine.v1";
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
const PROMPT = "подготовка потолка из гипсокартона на большой площади 500 кв метров";
const RESERVE_PARAMETER_ID = "finish_paste_order_reserve_percent";
const PASTE_ROW_ID =
  "drywall_ceiling_interior_drywall_ceiling_prepare_large_area:successor-r56:row:finish_paste";
const EXPECTED_CALCULATED_ROWS = 7;
const EXPECTED_PRELIMINARY_NEEDS = 20;
const RESUME_ROOT_REVISION_ID = String(process.env.S19_NATIVE_ROOT_REVISION_ID ?? "").trim();
const RESUME_REFINED_REVISION_ID = String(process.env.S19_NATIVE_REFINED_REVISION_ID ?? "").trim();
const PROVEN_ROOT_AUDIT = resolve(
  process.env.S19_NATIVE_PROVEN_ROOT_AUDIT
    ?? ".release-runtime/r568/runtime/local-developer-current/runtime/backend-dba1d737c00e/request-audit.jsonl",
);
const ROOT = resolve(
  process.env.S19_NATIVE_CREATE_REFINE_ROOT
    ?? ".release-runtime/r4a13-6/s19-first-estimate/android-native-create-refine-current-a76-v1",
);
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(process.env.S19_NATIVE_BACKEND_RECEIPT
  ?? ".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RECEIPT = resolve(process.env.S19_NATIVE_METRO_RECEIPT
  ?? ".release-runtime/r568/runtime/local-developer-current/metro.json");
const MASTER = resolve(
  process.env.S19_NATIVE_MASTER_PATH
    ?? "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (23).md",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S19_FIRST_ESTIMATE_NATIVE_CREATE_REFINE:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
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

function captureEvidence(adbPath: string, deviceId: string, name: string): Json[] {
  const result = capture(adbPath, deviceId, ROOT, name);
  return [result.screenshot, result.uiDump]
    .filter((path): path is string => Boolean(path))
    .map((path) => {
      const bytes = readFileSync(resolve(path));
      return {
        path: path.replace(/\\/gu, "/"),
        bytes: bytes.length,
        sha256: sha256(bytes),
      };
    });
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

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

function revisionIdFromAuditPath(path: string | undefined): string | null {
  return String(path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null;
}

async function waitForNativeMutationAndRevision(input: {
  auditPath: string;
  start: number;
  mutationPath: "/jobs/compile" | "/jobs/recalculate";
  previousRevisionId?: string;
}): Promise<{ rows: AuditRow[]; revisionId: string }> {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const rows = readAudit(input.auditPath).slice(input.start);
    const mutationIndex = rows.findIndex((row) => row.method === "POST"
      && row.path === input.mutationPath
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"));
    if (mutationIndex >= 0) {
      const revisionId = rows.slice(mutationIndex + 1)
        .map((row) => revisionIdFromAuditPath(row.path))
        .find((candidate) => candidate != null && candidate !== input.previousRevisionId);
      if (revisionId) return { rows, revisionId };
    }
    await sleep(300);
  }
  throw new Error(`S19_FIRST_ESTIMATE_NATIVE_CREATE_REFINE:MUTATION_NOT_OBSERVED:${input.mutationPath}`);
}

async function waitForNativeRevisionUiData(input: {
  auditPath: string;
  start: number;
  revisionId: string;
}): Promise<void> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = readAudit(input.auditPath).slice(input.start);
    if (rows.some((row) => row.method === "GET"
      && row.status === 200
      && row.path === `/revisions/${input.revisionId}`
      && String(row.userAgent ?? "").startsWith("okhttp/"))
      && rows.some((row) => row.method === "GET"
        && row.status === 200
        && String(row.path ?? "").startsWith(`/revisions/${input.revisionId}/rows`)
        && String(row.userAgent ?? "").startsWith("okhttp/"))) return;
    await sleep(250);
  }
  throw new Error(`S19_FIRST_ESTIMATE_NATIVE_CREATE_REFINE:UI_DATA_NOT_OBSERVED:${input.revisionId}`);
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
  throw new Error(`S19_FIRST_ESTIMATE_NATIVE_CREATE_REFINE:DEV_CLIENT_BOOTSTRAP_RED:${last.text.slice(0, 500)}`);
}

function visibleNode(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.bottom > 140 && box.top < 2_148);
}

function swipeOuterPage(
  adbPath: string,
  deviceId: string,
  direction: "forward" | "backward",
): void {
  const [fromY, toY, duration] = direction === "forward"
    ? [1_000, 750, 700]
    : [500, 1_650, 100];
  execFileSync(adbPath, [
    "-s", deviceId, "shell", "input", "swipe", "25", String(fromY), "25", String(toY), String(duration),
  ], { encoding: "utf8", timeout: 10_000 });
}

async function scrollOuterPageToStart(
  adbPath: string,
  deviceId: string,
  maxSwipes = 80,
): Promise<void> {
  for (let index = 0; index < maxSwipes; index += 1) {
    swipeOuterPage(adbPath, deviceId, "backward");
    await sleep(90);
  }
}

async function seekOuterPageNode(
  adbPath: string,
  deviceId: string,
  predicate: (node: UiNode) => boolean,
  maxSwipes = 48,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  await scrollOuterPageToStart(adbPath, deviceId);
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index <= maxSwipes; index += 1) {
    const node = snapshot.nodes.find((candidate) => predicate(candidate) && visibleNode(candidate));
    if (node) return { snapshot, node };
    if (index === maxSwipes) break;
    swipeOuterPage(adbPath, deviceId, "forward");
    await sleep(160);
    snapshot = dumpUi(adbPath, deviceId);
  }
  return { snapshot, node: null };
}

async function seekParameterInput(
  adbPath: string,
  deviceId: string,
  _parameterId: string,
  maxSwipes = 32,
): Promise<{ snapshot: UiSnapshot; input: UiNode } | null> {
  await scrollOuterPageToStart(adbPath, deviceId);
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index <= maxSwipes; index += 1) {
    const input = snapshot.nodes.find((node) =>
      nodeHasId(node, "editable-param-popover-input")
      && node.contentDesc.toLocaleLowerCase("ru-RU").includes("резерв")
      && visibleNode(node));
    if (input) return { snapshot, input };
    if (index === maxSwipes) break;
    swipeOuterPage(adbPath, deviceId, "forward");
    await sleep(180);
    snapshot = dumpUi(adbPath, deviceId);
  }
  return null;
}

async function openParameterPanel(adbPath: string, deviceId: string): Promise<UiNode> {
  const found = await seekOuterPageNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-parameters-toggle"),
    48,
  );
  const toggle = found.node;
  invariant(toggle?.enabled, "PARAMETER_TOGGLE_RED");
  if (!toggle.contentDesc.includes("Скрыть параметры")) {
    invariant(tapNode(adbPath, deviceId, toggle), "PARAMETER_TOGGLE_TAP_RED");
    await sleep(700);
  }
  const field = await seekParameterInput(adbPath, deviceId, RESERVE_PARAMETER_ID, 56);
  if (field) return field.input;
  throw new Error(`S19_FIRST_ESTIMATE_NATIVE_CREATE_REFINE:PARAMETER_PANEL_RED:${RESERVE_PARAMETER_ID}`);
}

async function replaceParameter(adbPath: string, deviceId: string, value: string): Promise<void> {
  const input = await openParameterPanel(adbPath, deviceId);
  invariant(tapNode(adbPath, deviceId, input), "PARAMETER_INPUT_MISSING");
  await sleep(250);
  execFileSync(adbPath, [
    "-s", deviceId, "shell", "input", "keycombination", "113", "29",
  ], { encoding: "utf8", timeout: 10_000 });
  execFileSync(adbPath, [
    "-s", deviceId, "shell", "input", "text", value,
  ], { encoding: "utf8", timeout: 10_000 });
  const observed = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      (nodeHasId(node, "editable-param-popover-input") && node.text === value)
      || nodeHasId(node, `editable-param-dirty-${RESERVE_PARAMETER_ID}`)),
    15_000,
  );
  invariant(observed.nodes.some((node) =>
    (nodeHasId(node, "editable-param-popover-input") && node.text === value)
    || nodeHasId(node, `editable-param-dirty-${RESERVE_PARAMETER_ID}`)),
  `PARAMETER_VALUE_NOT_VISIBLE:${value}`);
  const inputMethod = execFileSync(adbPath, ["-s", deviceId, "shell", "dumpsys", "input_method"], {
    encoding: "utf8",
    timeout: 10_000,
  });
  if (/mInputShown=true/iu.test(inputMethod)) {
    execFileSync(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"], {
      encoding: "utf8",
      timeout: 10_000,
    });
    await sleep(700);
  }
}

function assertRootRevision(revision: Json, rows: Json[]): Json {
  const paste = rows.find((row) => row.rowId === PASTE_ROW_ID);
  const needCount = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds.length : -1;
  invariant(revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === DEFINITION_ID
    && revision.catalogId === CATALOG_ID
    && revision.parentRevisionId == null,
  "ROOT_IDENTITY_RED");
  invariant(Number(revision.rowCount) === EXPECTED_CALCULATED_ROWS
    && rows.length === EXPECTED_CALCULATED_ROWS
    && needCount === EXPECTED_PRELIMINARY_NEEDS,
  `ROOT_COMPOSITION_RED:${rows.length}:${needCount}`);
  invariant(Number(revision.parameters?.area_m2) === 500
    && Number(revision.parameters?.[RESERVE_PARAMETER_ID]) === 0
    && !Object.prototype.hasOwnProperty.call(revision.parameters ?? {}, "repair_requirement_state"),
  "ROOT_PARAMETERS_RED");
  invariant(Number(paste?.quantity) === 240 && paste?.unitId === "kg", "ROOT_PASTE_QUANTITY_RED");
  invariant(rows.every((row) => row.unitPrice == null && row.amount == null), "ROOT_INVENTED_PRICE_RED");
  return { rowCount: rows.length, needCount, pasteKg: Number(paste.quantity) };
}

function assertRefinedRevision(rootId: string, revision: Json, rows: Json[]): Json {
  const paste = rows.find((row) => row.rowId === PASTE_ROW_ID);
  const needCount = Array.isArray(revision.preliminaryNeeds) ? revision.preliminaryNeeds.length : -1;
  invariant(revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === DEFINITION_ID
    && revision.catalogId === CATALOG_ID
    && revision.parentRevisionId === rootId,
  "REFINED_IDENTITY_RED");
  invariant(Number(revision.rowCount) === EXPECTED_CALCULATED_ROWS
    && rows.length === EXPECTED_CALCULATED_ROWS
    && needCount === EXPECTED_PRELIMINARY_NEEDS,
  `REFINED_COMPOSITION_RED:${rows.length}:${needCount}`);
  invariant(Number(revision.parameters?.area_m2) === 500
    && Number(revision.parameters?.[RESERVE_PARAMETER_ID]) === 5
    && !Object.prototype.hasOwnProperty.call(revision.parameters ?? {}, "repair_requirement_state"),
  "REFINED_PARAMETERS_RED");
  invariant(Number(paste?.quantity) === 252 && paste?.unitId === "kg", "REFINED_PASTE_QUANTITY_RED");
  invariant(rows.every((row) => row.unitPrice == null && row.amount == null), "REFINED_INVENTED_PRICE_RED");
  return { rowCount: rows.length, needCount, pasteKg: Number(paste.quantity) };
}

async function verifyNativeSummary(adbPath: string, deviceId: string): Promise<void> {
  const title = await seekOuterPageNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-selected-work-title"),
    32,
  );
  invariant(title.node
    && /подготовка потолка из гипсокартона/iu.test(title.node.text)
    && /500/iu.test(title.node.text),
  `SUMMARY_TITLE_RED:${title.node?.text ?? "missing"}`);
  const calculated = title.snapshot.nodes.find((node) =>
    nodeHasId(node, "request-estimate-row-count") && visibleNode(node));
  const needs = await seekOuterPageNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-preliminary-need-count"),
    8,
  );
  invariant(calculated && /7/iu.test(calculated.text),
    `SUMMARY_CALCULATED_COUNT_RED:${calculated?.text ?? "missing"}`);
  invariant(needs.node && /20/iu.test(needs.node.text),
    `SUMMARY_NEED_COUNT_RED:${needs.node?.text ?? "missing"}`);
}

async function openFullEstimateAfterMeaningfulPreview(
  adbPath: string,
  deviceId: string,
): Promise<void> {
  const open = await seekOuterPageNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled,
    12,
  );
  invariant(open.node && tapNode(adbPath, deviceId, open.node), "OPEN_FULL_ESTIMATE_RED");
  const projection = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameter-status")
      || nodeHasId(node, "request-estimate-parameters-toggle")),
    120_000,
  );
  invariant(projection.nodes.some((node) =>
    nodeHasId(node, "request-estimate-parameter-status")
    || nodeHasId(node, "request-estimate-parameters-toggle")),
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
  invariant([MASTER, CREDENTIALS, BACKEND_RECEIPT, METRO_RECEIPT]
    .every((path) => existsSync(path)), "REQUIRED_INPUT_MISSING");

  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(tuple.definitionReleaseId === RELEASE_ID
    && tuple.searchReleaseId === SEARCH_RELEASE_ID
    && metroReceipt.definition_release_id === RELEASE_ID
    && metroReceipt.search_release_id === SEARCH_RELEASE_ID
    && tuple.sourceTree === metroReceipt.source_tree_hash,
  "RUNTIME_TUPLE_RED");

  const authorization = await login();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
    && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
    && manifest.definitionRelease?.status === "prepared"
    && manifest.definitionRelease?.activatedAt == null
    && manifest.searchRelease?.status === "draft"
    && manifest.searchRelease?.activatedAt == null,
  "RUNTIME_MANIFEST_RED");

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
  const installed = String(runAdb(["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000));
  invariant(installed.includes("package:"), "PACKAGE_NOT_INSTALLED");
  await bootstrap(adbPath, deviceId);

  const auditPath = resolve(
    process.env.S19_NATIVE_BACKEND_AUDIT
      ?? `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`,
  );
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);
  const evidence: Json[] = [];
  const auditStart = readAudit(auditPath).length;
  let evidenceAuditStart = auditStart;
  let compiled: { rows: AuditRow[]; revisionId: string };
  let rootProofAuditPath = auditPath;
  if (RESUME_ROOT_REVISION_ID) {
    invariant(/^[0-9a-f-]{36}$/iu.test(RESUME_ROOT_REVISION_ID), "RESUME_ROOT_ID_RED");
    invariant(existsSync(PROVEN_ROOT_AUDIT), `PROVEN_ROOT_AUDIT_MISSING:${PROVEN_ROOT_AUDIT}`);
    const provenRootAudit = readAudit(PROVEN_ROOT_AUDIT);
    const rootGetIndex = provenRootAudit.findIndex((row) => row.method === "GET"
      && row.path === `/revisions/${RESUME_ROOT_REVISION_ID}`
      && row.status === 200
      && String(row.userAgent ?? "").startsWith("okhttp/"));
    invariant(rootGetIndex >= 0
      && provenRootAudit.slice(0, rootGetIndex).some((row) => row.method === "POST"
        && row.path === "/jobs/compile"
        && row.status === 202
        && String(row.userAgent ?? "").startsWith("okhttp/")),
    "PROVEN_NATIVE_ROOT_COMPILE_RED");
    rootProofAuditPath = PROVEN_ROOT_AUDIT;
    const uri = new URL("rik:///request");
    uri.searchParams.set("canonicalRevisionId", RESUME_ROOT_REVISION_ID);
    uri.searchParams.set("launchId", `s19-native-resume-root:${Date.now().toString(36)}`);
    runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, uri.toString(), PACKAGE_NAME), 45_000);
    await waitForNativeRevisionUiData({
      auditPath,
      start: auditStart,
      revisionId: RESUME_ROOT_REVISION_ID,
    });
    compiled = { rows: readAudit(auditPath).slice(auditStart), revisionId: RESUME_ROOT_REVISION_ID };
  } else {
    const launchId = `s19-native-create:${Date.now().toString(36)}`;
    const uri = buildAndroidRouteDeepLink({
      route: "/request",
      prompt: PROMPT,
      catalogWorkId: CATALOG_ID,
      launchId,
    });
    runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, uri, PACKAGE_NAME), 45_000);
    const promptReady = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => snapshot.nodes.some((node) =>
        nodeHasId(node, "consumer-repair-problem-input") && node.text === PROMPT)
        && snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-prepare-draft")),
      120_000,
    );
    invariant(promptReady.nodes.some((node) =>
      nodeHasId(node, "consumer-repair-problem-input") && node.text === PROMPT),
    "PROMPT_NOT_VISIBLE");
    evidence.push(...captureEvidence(adbPath, deviceId, "01_prompt_ready"));
    invariant(await tapById(adbPath, deviceId, "consumer-repair-prepare-draft", 30),
      "PREPARE_ACTION_RED");
    compiled = await waitForNativeMutationAndRevision({
      auditPath,
      start: auditStart,
      mutationPath: "/jobs/compile",
    });
  }
  const rootRevision = await api(authorization, `revisions/${compiled.revisionId}`);
  const rootRows = await allRows(authorization, compiled.revisionId);
  const rootTruth = assertRootRevision(rootRevision, rootRows);
  await waitForNativeRevisionUiData({ auditPath, start: auditStart, revisionId: compiled.revisionId });
  await verifyNativeSummary(adbPath, deviceId);
  evidence.push(...captureEvidence(adbPath, deviceId, "02_root_7_calculated_20_needs"));
  await openFullEstimateAfterMeaningfulPreview(adbPath, deviceId);

  let recalculated: { rows: AuditRow[]; revisionId: string };
  let editStart = readAudit(auditPath).length;
  if (RESUME_REFINED_REVISION_ID) {
    invariant(/^[0-9a-f-]{36}$/iu.test(RESUME_REFINED_REVISION_ID), "RESUME_REFINED_ID_RED");
    const fullAudit = readAudit(auditPath);
    const refinedGetIndex = fullAudit.findIndex((row) => row.method === "GET"
      && row.path === `/revisions/${RESUME_REFINED_REVISION_ID}`
      && row.status === 200
      && String(row.userAgent ?? "").startsWith("okhttp/"));
    const recalculateIndex = fullAudit.findLastIndex((row, index) => index < refinedGetIndex
      && row.method === "POST"
      && row.path === "/jobs/recalculate"
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"));
    invariant(refinedGetIndex >= 0 && recalculateIndex >= 0, "PROVEN_NATIVE_RECALCULATE_RED");
    editStart = recalculateIndex;
    evidenceAuditStart = recalculateIndex;
    recalculated = {
      rows: fullAudit.slice(recalculateIndex),
      revisionId: RESUME_REFINED_REVISION_ID,
    };
    const refinedOpenStart = readAudit(auditPath).length;
    const refinedUri = new URL("rik:///request");
    refinedUri.searchParams.set("canonicalRevisionId", RESUME_REFINED_REVISION_ID);
    refinedUri.searchParams.set("launchId", `s19-native-resume-refined:${Date.now().toString(36)}`);
    runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, refinedUri.toString(), PACKAGE_NAME), 45_000);
    await waitForNativeRevisionUiData({
      auditPath,
      start: refinedOpenStart,
      revisionId: RESUME_REFINED_REVISION_ID,
    });
  } else {
    await replaceParameter(adbPath, deviceId, "5");
    evidence.push(...captureEvidence(adbPath, deviceId, "03_reserve_5_before_apply"));
    const apply = await seekOuterPageNode(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, "editable-param-batch-apply"),
      48,
    );
    invariant(apply.node?.enabled && tapNode(adbPath, deviceId, apply.node), "BATCH_APPLY_RED");
    recalculated = await waitForNativeMutationAndRevision({
      auditPath,
      start: editStart,
      mutationPath: "/jobs/recalculate",
      previousRevisionId: compiled.revisionId,
    });
  }
  const refinedRevision = await api(authorization, `revisions/${recalculated.revisionId}`);
  const refinedRows = await allRows(authorization, recalculated.revisionId);
  const refinedTruth = assertRefinedRevision(compiled.revisionId, refinedRevision, refinedRows);
  const rootById = new Map(rootRows.map((row) => [String(row.rowId), Number(row.quantity)]));
  const changedRowIds = refinedRows
    .filter((row) => Number(row.quantity) !== rootById.get(String(row.rowId)))
    .map((row) => String(row.rowId))
    .sort();
  invariant(JSON.stringify(changedRowIds) === JSON.stringify([PASTE_ROW_ID]),
    `EDIT_SCOPE_RED:${changedRowIds.join(",")}`);
  await waitForNativeRevisionUiData({
    auditPath,
    start: editStart,
    revisionId: recalculated.revisionId,
  });
  await verifyNativeSummary(adbPath, deviceId);
  const history = await seekOuterPageNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    40,
  );
  invariant(history.node, "HISTORY_NOT_VISIBLE");
  evidence.push(...captureEvidence(adbPath, deviceId, "04_refined_252_history"));

  const apiHistory = await api(
    authorization,
    `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`,
  );
  const historyRevisions = Array.isArray(apiHistory.revisions) ? apiHistory.revisions as Json[] : [];
  const refinedIndex = historyRevisions.findIndex((entry) =>
    entry.revisionId === recalculated.revisionId);
  const rootIndex = historyRevisions.findIndex((entry) => entry.revisionId === compiled.revisionId);
  invariant(refinedIndex >= 0 && rootIndex >= 0 && refinedIndex < rootIndex,
    "IMMUTABLE_HISTORY_RED");

  const coldStart = readAudit(auditPath).length;
  runAdb(["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  await sleep(750);
  await bootstrap(adbPath, deviceId);
  const coldUri = new URL("rik:///request");
  coldUri.searchParams.set("canonicalRevisionId", recalculated.revisionId);
  coldUri.searchParams.set("launchId", `s19-native-cold:${Date.now().toString(36)}`);
  runAdb(buildAndroidDeepLinkLaunchArgs(deviceId, coldUri.toString(), PACKAGE_NAME), 45_000);
  await waitForNativeRevisionUiData({
    auditPath,
    start: coldStart,
    revisionId: recalculated.revisionId,
  });
  await verifyNativeSummary(adbPath, deviceId);
  evidence.push(...captureEvidence(adbPath, deviceId, "05_cold_refined"));
  const coldAudit = readAudit(auditPath).slice(coldStart);
  invariant(coldAudit.length > 0
    && coldAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/"))
    && !coldAudit.some((row) => row.method === "POST"),
  "COLD_AUDIT_RED");

  const nativeAudit = readAudit(auditPath).slice(evidenceAuditStart);
  const nativeAuditPath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(nativeAuditPath,
    `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  evidence.push({
    path: nativeAuditPath.replace(/\\/gu, "/"),
    bytes: readFileSync(nativeAuditPath).byteLength,
    sha256: sha256(readFileSync(nativeAuditPath)),
  });

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
  const body: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_S19_NATIVE_ANDROID_CREATED_REFINED_HISTORY_COLD_PREPARED_NOT_ACTIVE",
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    master: { path: MASTER.replace(/\\/gu, "/"), sha256: sha256(readFileSync(MASTER)) },
    runtime: {
      platform: "android",
      apiLevel: device.android_sdk,
      deviceId,
      avd: device.avd_name,
      package: PACKAGE_NAME,
      transport: "okhttp",
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId: DEFINITION_ID,
      catalogId: CATALOG_ID,
      sourceTree: tuple.sourceTree,
      jsBundleFingerprint: tuple.frontendJsBundleFingerprint,
      metroStartedForAcceptance: metro.started,
      metroConfigurationValidated: metro.configurationValidated,
      androidWasAlreadyOnline,
    },
    userActions: {
      workSelectedFromDeepLinkBinding: true,
      ordinaryPrepareTap: true,
      rootResumedAfterProjectionFix: Boolean(RESUME_ROOT_REVISION_ID),
      parameterEditedOnAndroid: RESERVE_PARAMETER_ID,
      batchApplyTap: true,
      refinedRevisionResumedAfterNativeApply: Boolean(RESUME_REFINED_REVISION_ID),
      coldOpenAfterForceStop: true,
    },
    root: { revisionId: compiled.revisionId, ...rootTruth },
    refinement: {
      revisionId: recalculated.revisionId,
      parentRevisionId: compiled.revisionId,
      parameterId: RESERVE_PARAMETER_ID,
      from: 0,
      to: 5,
      changedRowIds,
      ...refinedTruth,
    },
    history: { rootPreserved: true, childBeforeRoot: true, nativeTimelineVisible: true },
    coldOpen: {
      revisionId: recalculated.revisionId,
      currentRevisionVisible: true,
      postCount: coldAudit.filter((row) => row.method === "POST").length,
      allRequestsFromOkHttp: true,
    },
    requestAudit: {
      path: auditPath.replace(/\\/gu, "/"),
      rootProofPath: rootProofAuditPath.replace(/\\/gu, "/"),
      capturedPath: nativeAuditPath.replace(/\\/gu, "/"),
      requestCount: nativeAudit.length,
      compilePostCount: readAudit(rootProofAuditPath).filter((row) =>
        row.method === "POST" && row.path === "/jobs/compile"
        && String(row.userAgent ?? "").startsWith("okhttp/")).length,
      recalculatePostCount: nativeAudit.filter((row) =>
        row.method === "POST" && row.path === "/jobs/recalculate").length,
    },
    evidence,
    resourceControl: {
      before,
      after,
      appDataCleared: false,
      avdDataDeleted: false,
      oneHeavyProcessAtATime: true,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  body.receiptSha256 = sha256(JSON.stringify(body));
  atomicJson(OUTPUT, body);
  process.stdout.write(`${JSON.stringify({
    status: body.status,
    rootRevisionId: compiled.revisionId,
    refinedRevisionId: recalculated.revisionId,
    output: OUTPUT,
    receiptSha256: body.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  const failure = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: "RED_S19_NATIVE_ANDROID_CREATE_REFINE",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  };
  atomicJson(FAILURE_OUTPUT, failure);
  process.stderr.write(`${failure.error}\n`);
  process.exitCode = 1;
});
