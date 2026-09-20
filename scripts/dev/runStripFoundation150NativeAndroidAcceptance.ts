import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "../e2e/androidDeepLinkLaunchContract";
import {
  buildDevClientUri,
  isMetroReachable,
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;

type AuditRow = {
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  authorizationPresent?: boolean;
  userAgent?: string;
  remoteAddress?: string;
};

const CONTRACT = "rik-expo-app.r4-a13-6.i15.strip-foundation-150.native-android.v1";
const GREEN = "GREEN_STRIP_FOUNDATION_150_NATIVE_ANDROID_CREATE_EDIT_HISTORY_COLD_PREPARED_NOT_ACTIVE";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = "emulator-5554";
const DEV_PORT = 8_081;
const BACKEND = "http://127.0.0.1:8765";
const DEFINITION_RELEASE_ID = "ef36fe59-713b-571d-bc2c-7d2015dfb8bd";
const SEARCH_RELEASE_ID = "9daae0ee-dc38-5e2c-accd-1021d9cac632";
const CATALOG_ID = "canonical-work:expanded:strip_foundation";
const PROMPT = "Устройство монолитного железобетонного ленточного фундамента 150 метров";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (20).md",
);
const EXPECTED_MASTER_SHA256 = "17b374957c52d9361497645d210d370216bb98dd9443016684d09a5c105426db";
const ROOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a13-6-i15-foundation-150/04_ANDROID_NATIVE",
);
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/metro.json");
const RESUME_INITIAL_REVISION_ID = String(process.env.I15_NATIVE_INITIAL_REVISION_ID ?? "").trim();
const RESUME_EDITED_REVISION_ID = String(process.env.I15_NATIVE_EDITED_REVISION_ID ?? "").trim();
const PARAMETER_VALUES = {
  total_axis_length_m: "150",
  strip_width_m: "0.6",
  strip_height_m: "1.2",
  preparation_thickness_m: "0.1",
  reinforcement_mass_t: "9",
  binding_wire_mass_kg: "108",
  formwork_transport_mass_t: "20",
} as const;
const FALSE_PARAMETERS = [
  "groundworks_included",
  "foundation_bedding_included",
  "waterproofing_included",
  "backfill_included",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`I15_NATIVE_ANDROID:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(path: string): string {
  return sha256(readFileSync(path));
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
  try {
    return readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRow);
  } catch {
    return [];
  }
}

function runText(
  command: string,
  args: string[],
  timeoutMs = 30_000,
): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      }),
    };
  } catch (error) {
    const record = error as { stdout?: string | Buffer; stderr?: string | Buffer; message?: string };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
    };
  }
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function progress(stage: string, details: Json = {}): void {
  const value = {
    capturedAt: new Date().toISOString(),
    progress: "I15_STRIP_FOUNDATION_150_NATIVE_ANDROID",
    stage,
    ...details,
  };
  atomicJson(resolve(ROOT, "progress.json"), value);
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function adbPath(): string {
  const direct = runText("where.exe", ["adb"], 10_000);
  if (direct.ok) {
    const candidate = direct.output.split(/\r?\n/u).find(Boolean)?.trim();
    if (candidate && existsSync(candidate)) return candidate;
  }
  const fallback = resolve(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
  invariant(existsSync(fallback), "ADB_MISSING");
  return fallback;
}

function resourceSnapshot(): Json {
  const drive = statSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    workspaceDevice: drive.dev,
  };
}

async function authorization(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  const principal = (credentials.principals as Json[]).find((entry) => entry.role === "consumer")
    ?? (credentials.principals as Json[]).find((entry) => entry.role === "owner");
  invariant(principal?.email && principal?.password && credentials.publishable_key, "CREDENTIALS_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && body.access_token, `LOGIN_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(token: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: token },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body;
}

async function revisionRows(token: string, revisionId: string): Promise<Json[]> {
  const body = await api(token, `revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(body.rows) ? body.rows : [];
}

function auditRevisionId(row: AuditRow): string | null {
  return String(row.path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null;
}

async function waitForNativeMutationAndRevision(input: {
  auditPath: string;
  start: number;
  mutationPath: "/jobs/compile" | "/jobs/recalculate";
  previousRevisionId?: string;
  timeoutMs?: number;
}): Promise<{ rows: AuditRow[]; mutationIndex: number; revisionId: string }> {
  const deadline = Date.now() + (input.timeoutMs ?? 180_000);
  let rows = readAudit(input.auditPath);
  while (Date.now() < deadline) {
    const mutationIndex = rows.findIndex((row, index) =>
      index >= input.start
      && row.method === "POST"
      && row.path === input.mutationPath
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"),
    );
    if (mutationIndex >= input.start) {
      const revisionId = rows
        .slice(mutationIndex + 1)
        .filter((row) =>
          row.method === "GET"
          && row.status === 200
          && String(row.userAgent ?? "").startsWith("okhttp/"),
        )
        .map(auditRevisionId)
        .filter((value): value is string => Boolean(value && value !== input.previousRevisionId))
        .at(-1);
      if (revisionId) return { rows, mutationIndex, revisionId };
    }
    await sleep(400);
    rows = readAudit(input.auditPath);
  }
  throw new Error(`I15_NATIVE_ANDROID:${input.mutationPath}:REVISION_NOT_OBSERVED`);
}

function isVisible(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.bottom > 140 && box.top < 2_148);
}

function containedBy(child: UiNode, parent: UiNode): boolean {
  const childBox = bounds(child);
  const parentBox = bounds(parent);
  return Boolean(
    childBox
    && parentBox
    && childBox.left >= parentBox.left
    && childBox.right <= parentBox.right
    && childBox.top >= parentBox.top
    && childBox.bottom <= parentBox.bottom,
  );
}

function inputWithin(snapshot: UiSnapshot, editor: UiNode): UiNode | null {
  const inputs = snapshot.nodes.filter((node) => nodeHasId(node, "editable-param-popover-input"));
  return inputs.find((node) => containedBy(node, editor)) ?? (inputs.length === 1 ? inputs[0] : null);
}

async function seekParameterInput(
  adb: string,
  parameterId: string,
  maxSwipes = 28,
): Promise<{ snapshot: UiSnapshot; editor: UiNode; input: UiNode } | null> {
  const found = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, `editable-param-inline-editor-${parameterId}`),
    maxSwipes,
    "coarse",
  );
  if (found.node) {
    const input = inputWithin(found.snapshot, found.node);
    if (input && isVisible(input)) return { snapshot: found.snapshot, editor: found.node, input };
  }
  return null;
}

async function openParameterPanelIfNeeded(adb: string, parameterId: string): Promise<void> {
  const existing = await seekParameterInput(adb, parameterId, 20);
  if (existing) return;
  for (const toggleId of [
    "request-estimate-filled-parameters-toggle",
    "request-estimate-parameters-toggle",
  ]) {
    const toggle = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, toggleId) && node.enabled,
      24,
      "coarse",
    );
    if (!toggle.node || !tapNode(adb, DEVICE_ID, toggle.node)) continue;
    await sleep(600);
    if (await seekParameterInput(adb, parameterId, 24)) return;
  }
}

async function readParameter(adb: string, parameterId: string): Promise<string | null> {
  await openParameterPanelIfNeeded(adb, parameterId);
  return (await seekParameterInput(adb, parameterId))?.input.text ?? null;
}

async function replaceParameter(adb: string, parameterId: string, value: string): Promise<void> {
  await openParameterPanelIfNeeded(adb, parameterId);
  const found = await seekParameterInput(adb, parameterId);
  invariant(found && tapNode(adb, DEVICE_ID, found.input), `PARAMETER_INPUT_MISSING:${parameterId}`);
  await sleep(250);
  const selectAll = runText(adb, ["-s", DEVICE_ID, "shell", "input", "keycombination", "113", "29"], 10_000);
  invariant(selectAll.ok, `PARAMETER_SELECT_ALL_RED:${parameterId}`);
  runText(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
  const typed = runText(adb, ["-s", DEVICE_ID, "shell", "input", "text", value.replace(/ /g, "%s")], 20_000);
  invariant(typed.ok, `PARAMETER_TYPE_RED:${parameterId}`);
  const observed = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "editable-param-popover-input") && node.text === value),
    15_000,
  );
  invariant(
    observed.nodes.some((node) => nodeHasId(node, "editable-param-popover-input") && node.text === value),
    `PARAMETER_VALUE_NOT_VISIBLE:${parameterId}:${value}`,
  );
  runText(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  await sleep(450);
}

async function chooseFalse(adb: string, parameterId: string): Promise<void> {
  invariant(
    await tapById(adb, DEVICE_ID, `editable-param-option-${parameterId}-false`, 40),
    `FALSE_OPTION_MISSING:${parameterId}`,
  );
  await sleep(300);
}

async function seekId(
  adb: string,
  id: string,
  timeoutMs: number,
  maxSwipes = 40,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  const deadline = Date.now() + timeoutMs;
  let latest: { snapshot: UiSnapshot; node: UiNode | null } = {
    snapshot: dumpUi(adb, DEVICE_ID),
    node: null,
  };
  while (Date.now() < deadline) {
    latest = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, id),
      maxSwipes,
      "coarse",
    );
    if (latest.node) return latest;
    await sleep(500);
  }
  return latest;
}

async function seekVisibleRowCount(adb: string, timeoutMs: number): Promise<UiNode | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await seekNode(
      adb,
      DEVICE_ID,
      (node) => ["request-estimate-items-total-count", "request-estimate-row-count"]
        .some((id) => nodeHasId(node, id)) && /15/u.test(node.text),
      40,
      "coarse",
    );
    if (found.node) return found.node;
    await sleep(500);
  }
  return null;
}

function captureEvidence(adb: string, name: string): Json {
  const result = capture(adb, DEVICE_ID, DEVICE_ROOT, name);
  return {
    ...result,
    screenshotSha256: result.screenshot ? sha256File(resolve(result.screenshot)) : null,
    uiDumpSha256: result.uiDump ? sha256File(resolve(result.uiDump)) : null,
  };
}

function existingEvidence(name: string): Json {
  const screenshot = resolve(DEVICE_ROOT, `${name}.png`);
  const uiDump = resolve(DEVICE_ROOT, `${name}.xml`);
  invariant(existsSync(screenshot) && existsSync(uiDump), `EXISTING_EVIDENCE_MISSING:${name}`);
  return {
    screenshot: screenshot.replace(/\\/g, "/"),
    uiDump: uiDump.replace(/\\/g, "/"),
    screenshotSha256: sha256File(screenshot),
    uiDumpSha256: sha256File(uiDump),
  };
}

async function bootstrapDevClient(adb: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  const launch = runText(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, buildDevClientUri(DEV_PORT), PACKAGE_NAME),
    45_000,
  );
  invariant(launch.ok, `DEV_CLIENT_LAUNCH_RED:${launch.output}`);
  const deadline = Date.now() + 120_000;
  let ready = dumpUi(adb, DEVICE_ID);
  while (Date.now() < deadline) {
    const authenticatedShell = ready.nodes.some((node) =>
      node.packageName === PACKAGE_NAME && nodeHasId(node, "app-bottom-nav"))
      && ready.nodes.some((node) => nodeHasId(node, "tabs.request"))
      && !ready.nodes.some((node) => nodeHasId(node, "config-recovery-state"));
    if (authenticatedShell) break;
    if (ready.text.includes("Development Build")) {
      const server = ready.nodes.find((node) =>
        node.enabled
        && [node.text, node.contentDesc].some((value) =>
          value.includes(`127.0.0.1:${DEV_PORT}`)
          || value.includes(`10.0.2.2:${DEV_PORT}`)),
      );
      if (server) tapNode(adb, DEVICE_ID, server);
    }
    const resume = ready.nodes.find((node) =>
      node.enabled && /^(Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (resume) tapNode(adb, DEVICE_ID, resume);
    await sleep(750);
    ready = dumpUi(adb, DEVICE_ID);
  }
  invariant(
    ready.nodes.some((node) => node.packageName === PACKAGE_NAME && nodeHasId(node, "app-bottom-nav")),
    "DEV_CLIENT_BOOTSTRAP_RED",
  );
}

function assertRevision(
  revision: Json,
  rows: Json[],
  width: "0.6" | "0.7",
  concrete: "108.000000000" | "126.000000000",
): Json {
  invariant(revision.catalogId === CATALOG_ID, `CATALOG_RED:${revision.catalogId}`);
  invariant(revision.releaseId === DEFINITION_RELEASE_ID, `RELEASE_RED:${revision.releaseId}`);
  invariant(Number(revision.parameters?.total_axis_length_m) === 150, "LENGTH_150_NOT_PRESERVED");
  invariant(Number(revision.parameters?.strip_width_m) === Number(width), `WIDTH_RED:${revision.parameters?.strip_width_m}`);
  invariant(Number(revision.parameters?.strip_height_m) === 1.2, `HEIGHT_RED:${revision.parameters?.strip_height_m}`);
  invariant(revision.parameters?.groundworks_included === false, "GROUNDWORKS_FALSE_RED");
  invariant(rows.length === 15, `ROW_COUNT_RED:${rows.length}`);
  const concreteRow = rows.find((row) => row.rowId === "main_concrete");
  invariant(concreteRow != null, "CONCRETE_ROW_MISSING");
  invariant(Number(concreteRow.quantity) === Number(concrete), `CONCRETE_RED:${concreteRow.quantity}`);
  invariant(rows.every((row) => row.unitPrice == null || row.priceVerified === true), "INVENTED_PRICE_DETECTED");
  return {
    revisionId: revision.revisionId,
    parentRevisionId: revision.parentRevisionId ?? null,
    catalogId: revision.catalogId,
    releaseId: revision.releaseId,
    rowCount: rows.length,
    totalAxisLengthM: revision.parameters.total_axis_length_m,
    stripWidthM: revision.parameters.strip_width_m,
    stripHeightM: revision.parameters.strip_height_m,
    concreteQuantityM3: concreteRow.quantity,
    unverifiedPriceCount: rows.filter((row) => row.unitPrice == null || row.priceVerified !== true).length,
  };
}

function exactNativeTransaction(input: {
  audit: AuditRow[];
  mutationPath: "/jobs/compile" | "/jobs/recalculate";
  revisionId: string;
}): { mutationIndex: number; revisionGetIndex: number } {
  const revisionGetIndex = input.audit.findIndex((row) =>
    row.method === "GET"
    && row.path === `/revisions/${input.revisionId}`
    && row.status === 200
    && String(row.userAgent ?? "").startsWith("okhttp/"),
  );
  invariant(revisionGetIndex >= 0, `NATIVE_REVISION_GET_MISSING:${input.revisionId}`);
  let mutationIndex = -1;
  for (let index = 0; index < revisionGetIndex; index += 1) {
    const row = input.audit[index];
    if (
      row.method === "POST"
      && row.path === input.mutationPath
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/")
    ) mutationIndex = index;
  }
  invariant(mutationIndex >= 0, `NATIVE_MUTATION_MISSING:${input.mutationPath}:${input.revisionId}`);
  return { mutationIndex, revisionGetIndex };
}

async function waitForNativeRevisionReads(input: {
  auditPath: string;
  start: number;
  revisionId: string;
  timeoutMs?: number;
}): Promise<AuditRow[]> {
  const deadline = Date.now() + (input.timeoutMs ?? 180_000);
  let observed: AuditRow[] = [];
  while (Date.now() < deadline) {
    observed = readAudit(input.auditPath).slice(input.start);
    const paths = observed
      .filter((row) => row.method === "GET" && row.status === 200 && String(row.userAgent ?? "").startsWith("okhttp/"))
      .map((row) => String(row.path ?? ""));
    if (
      paths.includes(`/revisions/${input.revisionId}`)
      && paths.some((path) => path.startsWith(`/revisions/${input.revisionId}/rows`))
    ) return observed;
    await sleep(500);
  }
  throw new Error(`I15_NATIVE_ANDROID:COLD_REVISION_READS_NOT_OBSERVED:${input.revisionId}`);
}

async function waitForArtifact(
  token: string,
  revisionId: string,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const suffix = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  const deadline = Date.now() + 120_000;
  let lastState = "NOT_POLLED";
  while (Date.now() < deadline) {
    try {
      const artifact = await api(token, `revisions/${revisionId}/artifacts/${kind}${suffix}`);
      if (artifact.status === "ready") return artifact;
      lastState = `STATUS_${String(artifact.status)}`;
    } catch (error) {
      lastState = error instanceof Error ? error.message : String(error);
    }
    await sleep(750);
  }
  throw new Error(`I15_NATIVE_ANDROID:${kind.toUpperCase()}_ARTIFACT_NOT_READY:${lastState}`);
}

async function fetchArtifactPayload(artifact: Json): Promise<{
  bytes: Buffer;
  sha256: string;
  json: Json | null;
}> {
  invariant(typeof artifact.signedUrl === "string" && artifact.signedUrl.length > 0,
    "ARTIFACT_SIGNED_URL_MISSING");
  const response = await fetch(artifact.signedUrl, { signal: AbortSignal.timeout(60_000) });
  invariant(response.ok, `ARTIFACT_PAYLOAD_HTTP_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const payloadSha256 = sha256(bytes);
  invariant(bytes.length === Number(artifact.byteSize), "ARTIFACT_PAYLOAD_BYTE_SIZE_RED");
  invariant(payloadSha256 === artifact.sha256, "ARTIFACT_PAYLOAD_SHA256_RED");
  const json = String(artifact.contentType ?? "").startsWith("application/json")
    ? JSON.parse(bytes.toString("utf8")) as Json
    : null;
  return { bytes, sha256: payloadSha256, json };
}

async function waitForNativeArtifactRequest(input: {
  auditPath: string;
  start: number;
  revisionId: string;
  kind: "pdf" | "procurement";
}): Promise<AuditRow[]> {
  const prefix = `/revisions/${input.revisionId}/artifacts/${input.kind}`;
  const deadline = Date.now() + 120_000;
  let rows = readAudit(input.auditPath);
  while (Date.now() < deadline) {
    if (rows.slice(input.start).some((row) =>
      String(row.userAgent ?? "").startsWith("okhttp/")
      && String(row.path ?? "").startsWith(prefix)
      && ((row.method === "POST" && row.status === 202)
        || (row.method === "GET" && row.status === 200)))) return rows;
    await sleep(500);
    rows = readAudit(input.auditPath);
  }
  throw new Error(`I15_NATIVE_ANDROID:NATIVE_${input.kind.toUpperCase()}_REQUEST_NOT_OBSERVED`);
}

function mainActivityResumed(adb: string): boolean {
  const window = runText(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "window"], 20_000);
  if (!window.ok) return false;
  const focusedApp = window.output.split(/\r?\n/u).find((line) => line.includes("mFocusedApp="));
  return Boolean(focusedApp?.includes(MAIN_ACTIVITY));
}

async function waitForPdfViewer(
  adb: string,
  timeoutMs = 120_000,
): Promise<{ externalActivity: boolean; inAppRoute: boolean }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!mainActivityResumed(adb)) return { externalActivity: true, inAppRoute: false };
    const snapshot = dumpUi(adb, DEVICE_ID);
    if (snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))) {
      return { externalActivity: false, inAppRoute: true };
    }
    await sleep(650);
  }
  return { externalActivity: false, inAppRoute: false };
}

async function runColdResumeAcceptance(input: {
  adb: string;
  token: string;
  auditPath: string;
  tuple: Json;
  fingerprints: ReturnType<typeof computeReleaseFingerprints>;
  before: Json;
  initialRevisionId: string;
  editedRevisionId: string;
}): Promise<void> {
  invariant(/^[0-9a-f-]{36}$/iu.test(input.initialRevisionId), "RESUME_INITIAL_REVISION_ID_RED");
  invariant(/^[0-9a-f-]{36}$/iu.test(input.editedRevisionId), "RESUME_EDITED_REVISION_ID_RED");
  const initialRevision = await api(input.token, `revisions/${input.initialRevisionId}`);
  const initialRows = await revisionRows(input.token, input.initialRevisionId);
  const initialTruth = assertRevision(initialRevision, initialRows, "0.6", "108.000000000");
  const editedRevision = await api(input.token, `revisions/${input.editedRevisionId}`);
  const editedRows = await revisionRows(input.token, input.editedRevisionId);
  const editedTruth = assertRevision(editedRevision, editedRows, "0.7", "126.000000000");
  invariant(editedRevision.parentRevisionId === input.initialRevisionId, "RESUME_EDIT_PARENT_RED");

  const fullAuditBeforeCold = readAudit(input.auditPath);
  const compile = exactNativeTransaction({
    audit: fullAuditBeforeCold,
    mutationPath: "/jobs/compile",
    revisionId: input.initialRevisionId,
  });
  const recalculate = exactNativeTransaction({
    audit: fullAuditBeforeCold,
    mutationPath: "/jobs/recalculate",
    revisionId: input.editedRevisionId,
  });
  invariant(recalculate.mutationIndex > compile.revisionGetIndex, "RESUME_NATIVE_TRANSACTION_ORDER_RED");

  const coldAuditStart = fullAuditBeforeCold.length;
  const forceStop = runText(input.adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  invariant(forceStop.ok, "RESUME_COLD_FORCE_STOP_RED");
  await bootstrapDevClient(input.adb);
  const coldUri = new URL("rik:///request");
  coldUri.searchParams.set("canonicalRevisionId", input.editedRevisionId);
  coldUri.searchParams.set("launchId", `i15-foundation-native-cold-resume-${Date.now().toString(36)}`);
  const coldLaunch = runText(
    input.adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, coldUri.toString(), PACKAGE_NAME),
    45_000,
  );
  invariant(coldLaunch.ok, `RESUME_COLD_LAUNCH_RED:${coldLaunch.output}`);
  const observedCold = await waitForNativeRevisionReads({
    auditPath: input.auditPath,
    start: coldAuditStart,
    revisionId: input.editedRevisionId,
  });
  invariant(await seekVisibleRowCount(input.adb, 120_000), "RESUME_COLD_15_ROWS_NOT_VISIBLE");
  invariant((await readParameter(input.adb, "strip_width_m")) === "0.7", "RESUME_COLD_WIDTH_NOT_0_7");
  const evidence = [
    existingEvidence("01-native-prompt-ready"),
    existingEvidence("02-native-parameter-collection-length-150"),
    existingEvidence("03-native-all-required-parameters-filled"),
    existingEvidence("04-native-created-108m3"),
    existingEvidence("05-native-edited-126m3-history"),
    captureEvidence(input.adb, "06-native-cold-open-width-0-7"),
  ];
  const auditEnd = readAudit(input.auditPath).length;
  const coldNativeAudit = readAudit(input.auditPath)
    .slice(coldAuditStart, auditEnd)
    .filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  const coldPosts = coldNativeAudit.filter((row) => row.method === "POST");
  invariant(observedCold.length > 0 && coldNativeAudit.length > 0 && coldPosts.length === 0, `RESUME_COLD_MUTATION_RED:${coldPosts.length}`);

  const nativeAudit = readAudit(input.auditPath)
    .slice(compile.mutationIndex, auditEnd)
    .filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  const nativePosts = nativeAudit.filter((row) => row.method === "POST");
  invariant(nativePosts.filter((row) => row.path === "/jobs/compile" && row.status === 202).length === 1, "RESUME_COMPILE_COUNT_RED");
  invariant(nativePosts.filter((row) => row.path === "/jobs/recalculate" && row.status === 202).length === 1, "RESUME_RECALCULATE_COUNT_RED");
  const allowedNativePostPaths = new Set([
    "/jobs/compile",
    "/jobs/recalculate",
    `/revisions/${input.editedRevisionId}/artifacts/procurement`,
    `/revisions/${input.editedRevisionId}/artifacts/pdf`,
  ]);
  invariant(nativePosts.every((row) => allowedNativePostPaths.has(String(row.path))), "RESUME_UNEXPECTED_NATIVE_POST");
  const nativeAuditPath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(nativeAuditPath, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const documentsAuditStart = readAudit(input.auditPath).length;
  invariant(
    await tapById(input.adb, DEVICE_ID, "consumer-estimate-open-procurement", 30),
    "RESUME_PROCUREMENT_ACTION_RED",
  );
  await waitForNativeArtifactRequest({
    auditPath: input.auditPath,
    start: documentsAuditStart,
    revisionId: input.editedRevisionId,
    kind: "procurement",
  });
  const procurementArtifact = await waitForArtifact(
    input.token,
    input.editedRevisionId,
    "procurement",
  );
  const procurementPayload = await fetchArtifactPayload(procurementArtifact);
  const procurementProjection = procurementPayload.json ?? {};
  invariant(
    procurementArtifact.revisionId === input.editedRevisionId
      && procurementArtifact.releaseId === DEFINITION_RELEASE_ID
      && procurementProjection.revisionId === input.editedRevisionId
      && procurementProjection.releaseId === DEFINITION_RELEASE_ID
      && procurementProjection.catalogId === CATALOG_ID
      && Number(procurementProjection.selectedRowCount) > 0
      && Array.isArray(procurementProjection.rows)
      && procurementProjection.rows.length === Number(procurementProjection.selectedRowCount)
      && procurementProjection.rows.every((row: Json) =>
        row.includedInProcurement === true && row.unitPrice == null && row.amount == null),
    "RESUME_PROCUREMENT_PAYLOAD_RED",
  );
  invariant(
    (await seekNode(input.adb, DEVICE_ID,
      (node) => nodeHasId(node, "consumer-estimate-procurement-list"),
      30,
      "coarse")).node,
    "RESUME_PROCUREMENT_PANEL_RED",
  );
  evidence.push(captureEvidence(input.adb, "07-native-procurement-unpriced"));
  progress("RESUMED_PROCUREMENT_GREEN", {
    artifactId: procurementArtifact.artifactId,
    selectedRowCount: procurementProjection.selectedRowCount,
    sha256: procurementPayload.sha256,
  });

  const pdfAuditStart = readAudit(input.auditPath).length;
  invariant(
    await tapById(input.adb, DEVICE_ID, "consumer-estimate-make-pdf", 36),
    "RESUME_PDF_ACTION_RED",
  );
  await waitForNativeArtifactRequest({
    auditPath: input.auditPath,
    start: pdfAuditStart,
    revisionId: input.editedRevisionId,
    kind: "pdf",
  });
  const pdfArtifact = await waitForArtifact(input.token, input.editedRevisionId, "pdf");
  const pdfPayload = await fetchArtifactPayload(pdfArtifact);
  const pdfMetadata = pdfArtifact.metadata as Json | undefined;
  invariant(
    pdfArtifact.revisionId === input.editedRevisionId
      && pdfArtifact.releaseId === DEFINITION_RELEASE_ID
      && pdfMetadata?.documentProfile === "professional_v1"
      && pdfMetadata?.artifactKind === "professional_pdf"
      && Number(pdfMetadata?.projectedRowCount) === 15
      && Number(pdfMetadata?.pageCount) > 0
      && pdfPayload.bytes.subarray(0, 5).toString("ascii") === "%PDF-",
    "RESUME_PDF_IDENTITY_RED",
  );
  const pdfViewer = await waitForPdfViewer(input.adb);
  invariant(pdfViewer.externalActivity || pdfViewer.inAppRoute, "RESUME_PDF_VIEWER_RED");
  evidence.push(captureEvidence(input.adb, "08-native-professional-pdf-viewer"));
  if (pdfViewer.externalActivity) {
    runText(input.adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
    const handoffBack = await seekNode(
      input.adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "pdf-viewer-back"),
      5,
      "fine",
    );
    invariant(
      handoffBack.node && tapNode(input.adb, DEVICE_ID, handoffBack.node),
      "RESUME_PDF_HANDOFF_BACK_RED",
    );
  } else {
    invariant(await tapById(input.adb, DEVICE_ID, "pdf-viewer-back", 3), "RESUME_PDF_BACK_RED");
  }
  invariant(await seekVisibleRowCount(input.adb, 90_000), "RESUME_PDF_RETURN_RED");
  progress("RESUMED_PDF_GREEN", {
    artifactId: pdfArtifact.artifactId,
    pageCount: pdfMetadata?.pageCount,
    sha256: pdfPayload.sha256,
    externalActivity: pdfViewer.externalActivity,
    inAppRoute: pdfViewer.inAppRoute,
  });

  const documentsAuditEnd = readAudit(input.auditPath).length;
  const documentsNativeAudit = readAudit(input.auditPath)
    .slice(documentsAuditStart, documentsAuditEnd)
    .filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  const documentsAuditPath = resolve(ROOT, "native-documents-request-audit.jsonl");
  writeFileSync(documentsAuditPath,
    `${documentsNativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");

  const finalManifest = await api(input.token, "runtime-manifest");
  invariant(
    finalManifest.definitionRelease?.status === "prepared"
      && finalManifest.definitionRelease?.activatedAt == null
      && finalManifest.searchRelease?.status === "draft"
      && finalManifest.searchRelease?.activatedAt == null,
    "RESUME_FINAL_PREPARED_DRAFT_RED",
  );
  const dirtyManifest = git("status", "--porcelain=v1", "-uall");
  const payload: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN,
    globalStatus: GLOBAL_STATUS,
    executionMode: "RESUME_COLD_FROM_VERIFIED_NATIVE_CREATE_EDIT",
    master: {
      path: MASTER.replace(/\\/g, "/"),
      bytes: readFileSync(MASTER).byteLength,
      sha256: sha256File(MASTER),
    },
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      sourceTreeHash: input.fingerprints.sourceTreeHash,
      productSourceHash: input.fingerprints.productSourceHash,
      jsBundleFingerprint: input.fingerprints.jsBundleFingerprint,
      dirtyPathCount: dirtyManifest ? dirtyManifest.split(/\r?\n/u).filter(Boolean).length : 0,
      dirtyManifestSha256: sha256(dirtyManifest),
    },
    runtime: {
      platform: "android_native",
      browser: null,
      chromeCdpUsed: false,
      apiLevel: 34,
      deviceId: DEVICE_ID,
      package: PACKAGE_NAME,
      activity: MAIN_ACTIVITY,
      packageInstalledBefore: true,
      installPerformed: false,
      appDataCleared: false,
      avdWiped: false,
      transport: "okhttp",
      definitionReleaseId: DEFINITION_RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      catalogId: CATALOG_ID,
      compatibilityTuple: input.tuple,
    },
    releaseState: {
      definition: finalManifest.definitionRelease,
      search: finalManifest.searchRelease,
    },
    nativeJourney: {
      prompt: PROMPT,
      promptDelivery: "native_deep_link_then_native_ui_prepare_tap",
      nativePromptVisibleInPackage: true,
      nativePrepareTap: true,
      retainedRecognizedLengthM: "150",
      missingCardsVisibleBeforeCompile: ["strip_width_m", "strip_height_m"],
      create: {
        ...initialTruth,
        request: "POST /jobs/compile",
        httpStatus: 202,
        nativeOkHttp: true,
        auditLine: compile.mutationIndex + 1,
      },
      edit: {
        ...editedTruth,
        request: "POST /jobs/recalculate",
        httpStatus: 202,
        changedParameterId: "strip_width_m",
        from: "0.6",
        to: "0.7",
        nativeOkHttp: true,
        auditLine: recalculate.mutationIndex + 1,
      },
      history: {
        immutableParentPreserved: true,
        nativeTimelineVisible: true,
        nativeWidthDiffVisible: true,
      },
      coldOpen: {
        forceStopPerformed: true,
        devClientBootstrapAfterForceStop: true,
        revisionId: input.editedRevisionId,
        visibleWidthM: "0.7",
        visibleRowCount: 15,
        requestCount: coldNativeAudit.length,
        postCount: coldPosts.length,
        allRequestsFromOkHttp: true,
      },
      documents: {
        revisionId: input.editedRevisionId,
        procurement: {
          artifactId: procurementArtifact.artifactId,
          selectedRowCount: procurementProjection.selectedRowCount,
          allPricesUnknown: procurementProjection.rows.every((row: Json) =>
            row.unitPrice == null && row.amount == null),
          sha256: procurementPayload.sha256,
        },
        pdf: {
          artifactId: pdfArtifact.artifactId,
          projectedRowCount: pdfMetadata?.projectedRowCount,
          pageCount: pdfMetadata?.pageCount,
          sha256: pdfPayload.sha256,
          binaryHeaderValid: true,
          externalActivity: pdfViewer.externalActivity,
          inAppRoute: pdfViewer.inAppRoute,
          returnToRevisionGreen: true,
        },
      },
    },
    requestAudit: {
      sourcePath: input.auditPath.replace(/\\/g, "/"),
      sourceStartLine: compile.mutationIndex + 1,
      sourceEndLine: auditEnd,
      nativeSubsetPath: nativeAuditPath.replace(/\\/g, "/"),
      nativeSubsetSha256: sha256File(nativeAuditPath),
      requestCount: nativeAudit.length,
      posts: nativePosts,
      compilePostCount: nativePosts.filter((row) => row.path === "/jobs/compile").length,
      recalculatePostCount: nativePosts.filter((row) => row.path === "/jobs/recalculate").length,
      unexpectedPostCount: nativePosts.filter((row) => !allowedNativePostPaths.has(String(row.path))).length,
      documentsSubsetPath: documentsAuditPath.replace(/\\/g, "/"),
      documentsSubsetSha256: sha256File(documentsAuditPath),
      documentsRequestCount: documentsNativeAudit.length,
    },
    evidence,
    resourceControl: {
      before: input.before,
      after: resourceSnapshot(),
      emulatorDataDeleted: false,
      emulatorStatePreserved: true,
    },
    gates: {
      currentRuntimeSource: "GREEN",
      exactPreparedDraftTuple: "GREEN",
      actualNativePackage: "GREEN",
      chromeNotUsed: "GREEN",
      nativeCreate: "GREEN",
      nativeEdit: "GREEN",
      nativeHistory: "GREEN",
      nativeColdOpen: "GREEN",
      nativeProcurement: "GREEN",
      nativePdf: "GREEN",
      nativePdfReturn: "GREEN",
      length150Preserved: "GREEN",
      concrete108To126: "GREEN",
      noInventedPrices: "GREEN",
      noColdMutation: "GREEN",
      avdStatePreserved: "GREEN",
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  payload.receiptSha256 = sha256(JSON.stringify(payload));
  atomicJson(OUTPUT, payload);
  progress("ACCEPTANCE_GREEN", {
    output: OUTPUT,
    receiptSha256: payload.receiptSha256,
    initialRevisionId: input.initialRevisionId,
    editedRevisionId: input.editedRevisionId,
    executionMode: payload.executionMode,
  });
}

async function main(): Promise<void> {
  mkdirSync(ROOT, { recursive: true });
  mkdirSync(DEVICE_ROOT, { recursive: true });
  const before = resourceSnapshot();
  progress("PREFLIGHT_START", { availableMemoryBytes: before.availableMemoryBytes });
  invariant(existsSync(MASTER), "MASTER_MISSING");
  invariant(sha256File(MASTER) === EXPECTED_MASTER_SHA256, "MASTER_HASH_RED");
  invariant(existsSync(CREDENTIALS) && existsSync(BACKEND_RECEIPT) && existsSync(METRO_RECEIPT), "RUNTIME_RECEIPT_MISSING");

  const fingerprints = computeReleaseFingerprints();
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(
    tuple.definitionReleaseId === DEFINITION_RELEASE_ID
      && tuple.searchReleaseId === SEARCH_RELEASE_ID
      && metroReceipt.definition_release_id === DEFINITION_RELEASE_ID
      && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
    "RUNTIME_TUPLE_RED",
  );
  invariant(
    tuple.sourceTree === fingerprints.sourceTreeHash
      && tuple.frontendProductSourceHash === fingerprints.productSourceHash
      && tuple.frontendJsBundleFingerprint === fingerprints.jsBundleFingerprint
      && metroReceipt.source_tree_hash === fingerprints.sourceTreeHash
      && metroReceipt.product_source_hash === fingerprints.productSourceHash
      && metroReceipt.js_bundle_fingerprint === fingerprints.jsBundleFingerprint,
    "RUNTIME_SOURCE_DRIFT",
  );
  invariant(await isMetroReachable(DEV_PORT), "METRO_NOT_REACHABLE");
  const backendRuntimeDir = resolve(
    `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}`,
  );
  const auditPath = resolve(backendRuntimeDir, "request-audit.jsonl");
  invariant(existsSync(auditPath), `REQUEST_AUDIT_MISSING:${auditPath}`);

  const token = await authorization();
  const manifest = await api(token, "runtime-manifest");
  invariant(
    manifest.compatibilityTuple?.definitionReleaseId === DEFINITION_RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.definitionRelease?.activatedAt == null
      && manifest.searchRelease?.status === "draft"
      && manifest.searchRelease?.activatedAt == null,
    "MANIFEST_PREPARED_DRAFT_RED",
  );

  const adb = adbPath();
  const devices = runText(adb, ["devices"], 15_000);
  invariant(devices.ok && devices.output.includes(`${DEVICE_ID}\tdevice`), "API34_DEVICE_MISSING");
  invariant(runText(adb, ["-s", DEVICE_ID, "shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim() === "34", "API34_REQUIRED");
  invariant(runText(adb, ["-s", DEVICE_ID, "shell", "getprop", "sys.boot_completed"], 10_000).output.trim() === "1", "DEVICE_NOT_BOOTED");
  const packagePath = runText(adb, ["-s", DEVICE_ID, "shell", "pm", "path", PACKAGE_NAME], 15_000);
  invariant(packagePath.ok && packagePath.output.includes("package:"), "PACKAGE_NOT_INSTALLED_NO_REINSTALL_ALLOWED");
  await bootstrapDevClient(adb);
  progress("PREFLIGHT_GREEN", {
    apiLevel: 34,
    packageInstalledBefore: true,
    installPerformed: false,
    appDataCleared: false,
    runtimeSourceTree: tuple.sourceTree,
  });

  if (RESUME_INITIAL_REVISION_ID || RESUME_EDITED_REVISION_ID) {
    invariant(
      RESUME_INITIAL_REVISION_ID && RESUME_EDITED_REVISION_ID,
      "BOTH_RESUME_REVISION_IDS_REQUIRED",
    );
    await runColdResumeAcceptance({
      adb,
      token,
      auditPath,
      tuple,
      fingerprints,
      before,
      initialRevisionId: RESUME_INITIAL_REVISION_ID,
      editedRevisionId: RESUME_EDITED_REVISION_ID,
    });
    return;
  }

  const auditStart = readAudit(auditPath).length;
  const launchId = `i15-foundation-native-create-${Date.now().toString(36)}`;
  const uri = buildAndroidRouteDeepLink({
    route: "/request",
    prompt: PROMPT,
    catalogWorkId: CATALOG_ID,
    launchId,
  });
  const launch = runText(adb, buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri, PACKAGE_NAME), 45_000);
  invariant(launch.ok, `REQUEST_LAUNCH_RED:${launch.output}`);
  const promptReady = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-repair-problem-input") && node.text === PROMPT),
    60_000,
  );
  invariant(
    promptReady.nodes.some((node) =>
      node.packageName === PACKAGE_NAME
      && nodeHasId(node, "consumer-repair-problem-input")
      && node.text === PROMPT),
    "NATIVE_PROMPT_NOT_VISIBLE",
  );
  const evidence: Json[] = [captureEvidence(adb, "01-native-prompt-ready")];
  invariant(await tapById(adb, DEVICE_ID, "consumer-repair-prepare-draft", 20), "NATIVE_PREPARE_ACTION_RED");

  const collection = await seekId(adb, "consumer-estimate-parameter-collection", 120_000);
  invariant(collection.node, "PARAMETER_COLLECTION_NOT_VISIBLE");
  invariant(
    (await readParameter(adb, "total_axis_length_m")) === "150",
    "RECOGNIZED_LENGTH_NOT_VISIBLE_AS_150",
  );
  invariant(
    (await seekId(adb, "request-estimate-missing-param-strip_width_m", 30_000)).node,
    "WIDTH_CARD_MISSING",
  );
  evidence.push(captureEvidence(adb, "02-native-parameter-collection-length-150"));
  progress("PARAMETER_COLLECTION_GREEN", { retainedLengthM: 150 });

  await replaceParameter(adb, "strip_width_m", PARAMETER_VALUES.strip_width_m);
  await replaceParameter(adb, "strip_height_m", PARAMETER_VALUES.strip_height_m);
  invariant(await tapById(adb, DEVICE_ID, "editable-param-batch-apply", 36), "FIRST_BATCH_APPLY_RED");
  const secondStage = await seekId(adb, "request-estimate-missing-param-preparation_thickness_m", 120_000);
  invariant(secondStage.node, "SECOND_PARAMETER_STAGE_RED");
  progress("SECOND_PARAMETER_STAGE_GREEN");

  for (const [parameterId, value] of Object.entries(PARAMETER_VALUES).filter(([key]) =>
    [
      "preparation_thickness_m",
      "reinforcement_mass_t",
      "binding_wire_mass_kg",
      "formwork_transport_mass_t",
    ].includes(key))) {
    await replaceParameter(adb, parameterId, value);
  }
  for (const parameterId of FALSE_PARAMETERS) await chooseFalse(adb, parameterId);
  evidence.push(captureEvidence(adb, "03-native-all-required-parameters-filled"));

  const compileAuditStart = readAudit(auditPath).length;
  invariant(await tapById(adb, DEVICE_ID, "editable-param-batch-apply", 40), "COMPILE_BATCH_APPLY_RED");
  const compiled = await waitForNativeMutationAndRevision({
    auditPath,
    start: compileAuditStart,
    mutationPath: "/jobs/compile",
  });
  const initialRevision = await api(token, `revisions/${compiled.revisionId}`);
  const initialRows = await revisionRows(token, compiled.revisionId);
  const initialTruth = assertRevision(initialRevision, initialRows, "0.6", "108.000000000");
  invariant(await seekVisibleRowCount(adb, 120_000), "INITIAL_15_ROWS_NOT_VISIBLE");
  evidence.push(captureEvidence(adb, "04-native-created-108m3"));
  progress("NATIVE_CREATE_GREEN", { revisionId: compiled.revisionId, rowCount: initialRows.length });

  const editAuditStart = readAudit(auditPath).length;
  await replaceParameter(adb, "strip_width_m", "0.7");
  invariant(await tapById(adb, DEVICE_ID, "editable-param-batch-apply", 36), "EDIT_BATCH_APPLY_RED");
  const recalculated = await waitForNativeMutationAndRevision({
    auditPath,
    start: editAuditStart,
    mutationPath: "/jobs/recalculate",
    previousRevisionId: compiled.revisionId,
  });
  const editedRevision = await api(token, `revisions/${recalculated.revisionId}`);
  const editedRows = await revisionRows(token, recalculated.revisionId);
  const editedTruth = assertRevision(editedRevision, editedRows, "0.7", "126.000000000");
  invariant(editedRevision.parentRevisionId === compiled.revisionId, `EDIT_PARENT_RED:${editedRevision.parentRevisionId}`);

  const history = await api(token, `revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
  const revisions = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  const editedHistoryIndex = revisions.findIndex((revision) => revision.revisionId === recalculated.revisionId);
  const initialHistoryIndex = revisions.findIndex((revision) => revision.revisionId === compiled.revisionId);
  invariant(editedHistoryIndex >= 0 && initialHistoryIndex >= 0 && editedHistoryIndex < initialHistoryIndex, "IMMUTABLE_HISTORY_RED");
  const historyUi = await seekId(adb, "estimate-revision-timeline", 90_000);
  invariant(historyUi.node, "NATIVE_HISTORY_NOT_VISIBLE");
  const exactDiff = await seekId(adb, "estimate-revision-diff-param-strip_width_m", 30_000);
  invariant(exactDiff.node, "NATIVE_WIDTH_DIFF_NOT_VISIBLE");
  evidence.push(captureEvidence(adb, "05-native-edited-126m3-history"));
  progress("NATIVE_EDIT_HISTORY_GREEN", { revisionId: recalculated.revisionId, parentRevisionId: compiled.revisionId });

  const coldAuditStart = readAudit(auditPath).length;
  const forceStop = runText(adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  invariant(forceStop.ok, "COLD_FORCE_STOP_RED");
  // A development build returns to the Expo launcher after a real force-stop.
  // Reconnect the dev client before launching the product deep link; otherwise
  // the launcher can consume the intent while the React Native shell is absent.
  await bootstrapDevClient(adb);
  const coldUri = new URL("rik:///request");
  coldUri.searchParams.set("canonicalRevisionId", recalculated.revisionId);
  coldUri.searchParams.set("launchId", `i15-foundation-native-cold-${Date.now().toString(36)}`);
  const coldLaunch = runText(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, coldUri.toString(), PACKAGE_NAME),
    45_000,
  );
  invariant(coldLaunch.ok, `COLD_LAUNCH_RED:${coldLaunch.output}`);
  invariant(await seekVisibleRowCount(adb, 120_000), "COLD_15_ROWS_NOT_VISIBLE");
  invariant((await readParameter(adb, "strip_width_m")) === "0.7", "COLD_WIDTH_NOT_0_7");
  evidence.push(captureEvidence(adb, "06-native-cold-open-width-0-7"));
  const auditEnd = readAudit(auditPath).length;
  const coldAudit = readAudit(auditPath).slice(coldAuditStart, auditEnd);
  const coldNativeAudit = coldAudit.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  const coldPosts = coldNativeAudit.filter((row) => row.method === "POST");
  invariant(coldNativeAudit.length > 0 && coldPosts.length === 0, `COLD_MUTATION_RED:${coldPosts.length}`);
  progress("NATIVE_COLD_GREEN", { requestCount: coldNativeAudit.length, postCount: coldPosts.length });

  const entireAudit = readAudit(auditPath).slice(auditStart, auditEnd);
  const nativeAudit = entireAudit.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  const nativeAuditPath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(nativeAuditPath, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const nativePosts = nativeAudit.filter((row) => row.method === "POST");
  invariant(nativePosts.filter((row) => row.path === "/jobs/compile" && row.status === 202).length === 1, "NATIVE_COMPILE_COUNT_RED");
  invariant(nativePosts.filter((row) => row.path === "/jobs/recalculate" && row.status === 202).length === 1, "NATIVE_RECALCULATE_COUNT_RED");
  invariant(nativePosts.every((row) => ["/jobs/compile", "/jobs/recalculate"].includes(String(row.path))), "UNEXPECTED_NATIVE_POST");

  const finalManifest = await api(token, "runtime-manifest");
  invariant(
    finalManifest.definitionRelease?.status === "prepared"
      && finalManifest.definitionRelease?.activatedAt == null
      && finalManifest.searchRelease?.status === "draft"
      && finalManifest.searchRelease?.activatedAt == null,
    "FINAL_PREPARED_DRAFT_RED",
  );
  const dirtyManifest = git("status", "--porcelain=v1", "-uall");
  const focus = runText(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "window"], 20_000).output;
  invariant(focus.includes(PACKAGE_NAME) && focus.includes("MainActivity"), "FINAL_MAIN_ACTIVITY_NOT_FOCUSED");
  const payload: Json = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN,
    globalStatus: GLOBAL_STATUS,
    master: {
      path: MASTER.replace(/\\/g, "/"),
      bytes: readFileSync(MASTER).byteLength,
      sha256: sha256File(MASTER),
    },
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      sourceTreeHash: fingerprints.sourceTreeHash,
      productSourceHash: fingerprints.productSourceHash,
      jsBundleFingerprint: fingerprints.jsBundleFingerprint,
      dirtyPathCount: dirtyManifest ? dirtyManifest.split(/\r?\n/u).filter(Boolean).length : 0,
      dirtyManifestSha256: sha256(dirtyManifest),
    },
    runtime: {
      platform: "android_native",
      browser: null,
      chromeCdpUsed: false,
      apiLevel: 34,
      deviceId: DEVICE_ID,
      package: PACKAGE_NAME,
      activity: MAIN_ACTIVITY,
      packageInstalledBefore: true,
      installPerformed: false,
      appDataCleared: false,
      avdWiped: false,
      transport: "okhttp",
      definitionReleaseId: DEFINITION_RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      catalogId: CATALOG_ID,
      compatibilityTuple: tuple,
    },
    releaseState: {
      definition: finalManifest.definitionRelease,
      search: finalManifest.searchRelease,
    },
    nativeJourney: {
      prompt: PROMPT,
      promptDelivery: "native_deep_link_then_native_ui_prepare_tap",
      nativePromptVisibleInPackage: true,
      nativePrepareTap: true,
      retainedRecognizedLengthM: "150",
      missingCardsVisibleBeforeCompile: ["strip_width_m", "strip_height_m"],
      create: {
        ...initialTruth,
        request: "POST /jobs/compile",
        httpStatus: 202,
        nativeOkHttp: true,
      },
      edit: {
        ...editedTruth,
        request: "POST /jobs/recalculate",
        httpStatus: 202,
        changedParameterId: "strip_width_m",
        from: "0.6",
        to: "0.7",
        nativeOkHttp: true,
      },
      history: {
        immutableParentPreserved: true,
        editedBeforeCreatedInApiHistory: editedHistoryIndex < initialHistoryIndex,
        nativeTimelineVisible: true,
        nativeWidthDiffVisible: true,
      },
      coldOpen: {
        forceStopPerformed: true,
        revisionId: recalculated.revisionId,
        visibleWidthM: "0.7",
        visibleRowCount: 15,
        requestCount: coldNativeAudit.length,
        postCount: coldPosts.length,
        allRequestsFromOkHttp: true,
      },
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/g, "/"),
      sourceStartLine: auditStart + 1,
      sourceEndLine: auditEnd,
      nativeSubsetPath: nativeAuditPath.replace(/\\/g, "/"),
      nativeSubsetSha256: sha256File(nativeAuditPath),
      requestCount: nativeAudit.length,
      posts: nativePosts,
      compilePostCount: nativePosts.filter((row) => row.path === "/jobs/compile").length,
      recalculatePostCount: nativePosts.filter((row) => row.path === "/jobs/recalculate").length,
      unexpectedPostCount: nativePosts.filter((row) => !["/jobs/compile", "/jobs/recalculate"].includes(String(row.path))).length,
    },
    evidence,
    resourceControl: {
      before,
      after: resourceSnapshot(),
      emulatorDataDeleted: false,
      emulatorStatePreserved: true,
    },
    gates: {
      currentRuntimeSource: "GREEN",
      exactPreparedDraftTuple: "GREEN",
      actualNativePackage: "GREEN",
      chromeNotUsed: "GREEN",
      nativeCreate: "GREEN",
      nativeEdit: "GREEN",
      nativeHistory: "GREEN",
      nativeColdOpen: "GREEN",
      length150Preserved: "GREEN",
      concrete108To126: "GREEN",
      noInventedPrices: "GREEN",
      noColdMutation: "GREEN",
      avdStatePreserved: "GREEN",
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  payload.receiptSha256 = sha256(JSON.stringify(payload));
  atomicJson(OUTPUT, payload);
  progress("ACCEPTANCE_GREEN", {
    output: OUTPUT,
    receiptSha256: payload.receiptSha256,
    initialRevisionId: compiled.revisionId,
    editedRevisionId: recalculated.revisionId,
  });
}

main().catch((error) => {
  const failure = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: "RED_STRIP_FOUNDATION_150_NATIVE_ANDROID",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    globalStatus: GLOBAL_STATUS,
    destructiveRecoveryAttempted: false,
    appDataCleared: false,
    avdWiped: false,
    installPerformed: false,
  };
  atomicJson(FAILURE_OUTPUT, failure);
  console.error(failure.error);
  process.exitCode = 1;
});
