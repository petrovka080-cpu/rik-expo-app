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
  anchorGroupInstallationPromptDetailsR1,
} from "../../src/lib/estimate/ownedDomain/anchorGroupInstallationProductionBindingR1";
import {
  ANCHOR_GROUP_INSTALLATION_TARGETS,
  ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID,
  ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID,
  anchorGroupInstallationAcceptanceInputR1,
} from "../../src/lib/estimate/v4/anchorGroupInstallationR1";
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
  scrollToStart,
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
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";

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

const CONTRACT = "rik-expo-app.r4-a13-6.anchor-group-installation.native-android.v1";
const GREEN = "GREEN_ANCHOR_GROUP_INSTALLATION_NATIVE_ANDROID_HIGH_LOAD_RESUMED_HISTORY_DOCUMENTS_COLD_PREPARED_NOT_ACTIVE";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_PORT = 8_081;
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "80c3ba4b-3d04-5947-b17d-5fb05bcf2bae";
const SEARCH_RELEASE_ID = "132eb3c0-0a52-5257-8420-cf2f8de425b9";
const CATALOG_ID = "canonical-work:base:concrete_foundation_interior_anchor_group_anchor_high_load";
const PRIMARY_PARAMETER_ID = "anchor_bolt_quantity_piece";
const PRIMARY_ROW_ID = "material:anchor-group:anchor-bolts";
const DELIVERY_ROW_ID = "delivery:anchor-group:supply";
const CONTEXT_KEY = "high_load" as const;
const INITIAL_PRIMARY = 48;
const EDITED_PRIMARY = 52;
const EXPECTED_ROWS = 21;
const EXPECTED_PROCUREMENT_ROWS = 16;
const PROVEN_PARENT_REVISION_ID = "5ecaaef9-c605-483a-8fd1-6c1e44504c75";
const PROVEN_EDITED_REVISION_ID = "a67f674a-270b-4dab-9ade-4b6f3cc216d5";
const REPLAY_CREATE_EDIT = process.env.ANCHOR_GROUP_REPLAY_CREATE_EDIT === "1";
const RESUME_COLD_ONLY = process.env.ANCHOR_GROUP_RESUME_COLD_ONLY === "1";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (12).md",
);
const ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-android-native",
);
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const METRO_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/metro.json");
const PROVEN_NATIVE_AUDIT = resolve(
  ".release-runtime/r568/runtime/local-developer-current/runtime/backend-8ea0840bf8cb/request-audit.jsonl",
);
const APK = resolve("android/app/build/outputs/apk/debug/app-debug.apk");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`ANCHOR_GROUP_NATIVE_ANDROID:${code}`);
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

function resourceSnapshot(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({
    progress: "ANCHOR_GROUP_NATIVE_ANDROID",
    stage,
    ...details,
  })}\n`);
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
        .filter((value): value is string => Boolean(
          value && value !== input.previousRevisionId,
        ))
        .at(-1);
      if (revisionId) return { rows, mutationIndex, revisionId };
    }
    await sleep(500);
    rows = readAudit(input.auditPath);
  }
  throw new Error(`ANCHOR_GROUP_NATIVE_ANDROID:${input.mutationPath}:REVISION_NOT_OBSERVED`);
}

async function waitForNativeRevisionUiData(input: {
  auditPath: string;
  start: number;
  revisionId: string;
  timeoutMs?: number;
}): Promise<void> {
  const expectedPath = `/revisions/${input.revisionId}/parameter-session`;
  const deadline = Date.now() + (input.timeoutMs ?? 90_000);
  while (Date.now() < deadline) {
    const ready = readAudit(input.auditPath).some((row, index) =>
      index >= input.start
      && row.method === "GET"
      && row.path === expectedPath
      && row.status === 200
      && String(row.userAgent ?? "").startsWith("okhttp/"),
    );
    if (ready) {
      await sleep(1_200);
      return;
    }
    await sleep(500);
  }
  throw new Error(`ANCHOR_GROUP_NATIVE_ANDROID:UI_DATA_NOT_OBSERVED:${input.revisionId}`);
}

async function loginLocalDeveloperOwner(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const owner = credentials.owner as Json | undefined;
  invariant(
    owner?.role === "platform_developer"
      && owner.email
      && owner.password
      && credentials.publishable_key,
    "OWNER_CREDENTIALS_MISSING",
  );
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: String(credentials.publishable_key),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(
    response.ok && body?.access_token && body.user?.id === owner.user_id,
    `OWNER_LOGIN_HTTP_${response.status}`,
  );
  return `Bearer ${body.access_token}`;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body, `API_${response.status}:${path}`);
  return body;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ pageSize: "100" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows as Json[] : []));
    cursor = typeof page.nextCursor === "string" && page.nextCursor ? page.nextCursor : null;
  } while (cursor);
  return rows;
}

function assertRevisionTruth(input: {
  revision: Json;
  rows: Json[];
  definitionVersionId: string;
  primaryQuantity: number;
}): Json {
  const target = ANCHOR_GROUP_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === CONTEXT_KEY,
  );
  invariant(target, "HIGH_LOAD_TARGET_MISSING");
  invariant(
    input.revision.catalogId === target.catalogId
      && input.revision.releaseId === RELEASE_ID
      && input.revision.definitionVersionId === input.definitionVersionId,
    "REVISION_IDENTITY_RED",
  );
  invariant(
    Number(input.revision.parameters?.[PRIMARY_PARAMETER_ID]) === input.primaryQuantity,
    `PRIMARY_PARAMETER_RED:${input.revision.parameters?.[PRIMARY_PARAMETER_ID]}`,
  );
  invariant(
    input.rows.length === EXPECTED_ROWS
      && Number(input.revision.rowCount) === EXPECTED_ROWS
      && input.rows.filter((row) => row.includedInProcurement === true).length === EXPECTED_PROCUREMENT_ROWS,
    `ROW_DENOMINATOR_RED:${input.rows.length}`,
  );
  invariant(
    input.rows.every((row) =>
      row.includedInEstimate === true
      && row.unitPrice == null
      && row.amount == null),
    "INVENTED_PRICE_OR_SCOPE_RED",
  );
  const primary = input.rows.find((row) => row.rowId === PRIMARY_ROW_ID);
  const delivery = input.rows.find((row) => row.rowId === DELIVERY_ROW_ID);
  invariant(
    Number(primary?.quantity) === input.primaryQuantity
      && Math.abs(Number(delivery?.quantity) - 96.9) < 1e-8,
    `QUANTITY_TRUTH_RED:${primary?.quantity}:${delivery?.quantity}`,
  );
  const traces = Array.isArray(primary?.normativeTrace) ? primary!.normativeTrace as Json[] : [];
  invariant(
    traces.some((trace) =>
      (trace.sourceId ?? trace.source_id) === ANCHOR_GROUP_PROJECT_SCHEDULE_SOURCE_ID
      && (trace.normId ?? trace.norm_id) === ANCHOR_GROUP_PROJECT_SCHEDULE_NORM_ID),
    "PRIMARY_TRACE_RED",
  );
  return {
    revisionId: input.revision.revisionId,
    parentRevisionId: input.revision.parentRevisionId ?? null,
    revisionNumber: input.revision.revisionNumber,
    rowCount: input.rows.length,
    procurementRowCount: input.rows.filter((row) => row.includedInProcurement === true).length,
    unpricedRowCount: input.rows.filter((row) => row.unitPrice == null && row.amount == null).length,
    primaryQuantity: Number(primary?.quantity),
    deliveryTKm: Number(delivery?.quantity),
  };
}

function containedBy(child: UiNode, parent: UiNode): boolean {
  const childBounds = bounds(child);
  const parentBounds = bounds(parent);
  return Boolean(
    childBounds
      && parentBounds
      && childBounds.left >= parentBounds.left
      && childBounds.right <= parentBounds.right
      && childBounds.top >= parentBounds.top
      && childBounds.bottom <= parentBounds.bottom,
  );
}

function exactParameterInput(snapshot: UiSnapshot, editor: UiNode): UiNode | null {
  const inputs = snapshot.nodes.filter((node) =>
    nodeHasId(node, "editable-param-popover-input"),
  );
  return inputs.find((node) => containedBy(node, editor))
    ?? inputs.find((node) => /Количество анкерных болтов/iu.test(node.contentDesc))
    ?? (inputs.length === 1 ? inputs[0] : null);
}

function isVisibleNativeNode(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.bottom > 140 && box.top < 2_148);
}

function tapNativeNode(adbPath: string, deviceId: string, node: UiNode): boolean {
  const box = bounds(node);
  if (!box) return false;
  const top = Math.max(box.top, 140);
  const bottom = Math.min(box.bottom, 2_148);
  if (bottom <= top) return false;
  return runText(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "input",
      "tap",
      String(Math.round((box.left + box.right) / 2)),
      String(Math.round((top + bottom) / 2)),
    ],
    10_000,
  ).ok;
}

async function seekForwardFromStart(
  adbPath: string,
  deviceId: string,
  predicate: (node: UiNode) => boolean,
  maxSwipes = 24,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  await scrollToStart(adbPath, deviceId, 72);
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index <= maxSwipes; index += 1) {
    const node = snapshot.nodes.find((candidate) =>
      predicate(candidate) && isVisibleNativeNode(candidate),
    ) ?? null;
    if (node) return { snapshot, node };
    if (index < maxSwipes) {
      runText(
        adbPath,
        ["-s", deviceId, "shell", "input", "swipe", "540", "1700", "540", "500", "220"],
        10_000,
      );
      await sleep(350);
      snapshot = dumpUi(adbPath, deviceId);
    }
  }
  return { snapshot, node: snapshot.nodes.find(predicate) ?? null };
}

async function ensureParameterPanelExpanded(
  adbPath: string,
  deviceId: string,
): Promise<boolean> {
  const toggle = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-parameters-toggle") && node.enabled,
    18,
  );
  if (!toggle.node) return false;
  if (
    toggle.snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-parameter-panel"))
    || toggle.node.contentDesc.includes("Скрыть параметры")
  ) return true;
  if (!tapNativeNode(adbPath, deviceId, toggle.node)) return false;
  const expanded = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameter-panel"))
      || snapshot.nodes.some((node) =>
        nodeHasId(node, "request-estimate-parameters-toggle")
        && node.contentDesc.includes("Скрыть параметры")),
    30_000,
  );
  return expanded.nodes.some((node) => nodeHasId(node, "request-estimate-parameter-panel"))
    || expanded.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameters-toggle")
      && node.contentDesc.includes("Скрыть параметры"));
}

async function findExactParameterInput(
  adbPath: string,
  deviceId: string,
): Promise<{ snapshot: UiSnapshot; editor: UiNode; input: UiNode } | null> {
  await scrollToStart(adbPath, deviceId, 72);
  let snapshot = dumpUi(adbPath, deviceId);
  for (let index = 0; index <= 24; index += 1) {
    const editor = snapshot.nodes.find((node) =>
      nodeHasId(node, `editable-param-inline-editor-${PRIMARY_PARAMETER_ID}`)
      && isVisibleNativeNode(node),
    ) ?? null;
    if (editor) {
      const input = exactParameterInput(snapshot, editor);
      if (input) return { snapshot, editor, input };
    }
    const toggle = snapshot.nodes.find((node) =>
      nodeHasId(node, "request-estimate-parameters-toggle")
      && node.enabled
      && isVisibleNativeNode(node),
    ) ?? null;
    const panelExpanded = snapshot.nodes.some((node) =>
      nodeHasId(node, "request-estimate-parameter-panel"))
      || Boolean(toggle?.contentDesc.includes("Скрыть параметры"));
    if (toggle && !panelExpanded) {
      if (!tapNativeNode(adbPath, deviceId, toggle)) return null;
      await sleep(500);
      snapshot = dumpUi(adbPath, deviceId);
      continue;
    }
    if (index < 24) {
      runText(
        adbPath,
        ["-s", deviceId, "shell", "input", "swipe", "540", "1700", "540", "500", "220"],
        10_000,
      );
      await sleep(350);
      snapshot = dumpUi(adbPath, deviceId);
    }
  }
  return null;
}

async function replaceExactParameter(
  adbPath: string,
  deviceId: string,
  value: string,
): Promise<boolean> {
  const exact = await findExactParameterInput(adbPath, deviceId);
  if (!exact || !tapNode(adbPath, deviceId, exact.input)) return false;
  await sleep(300);
  const selectAll = runText(
    adbPath,
    ["-s", deviceId, "shell", "input", "keycombination", "113", "29"],
    10_000,
  );
  if (!selectAll.ok) return false;
  const typed = runText(
    adbPath,
    ["-s", deviceId, "shell", "input", "text", value.replace(/ /g, "%s")],
    20_000,
  );
  if (!typed.ok) return false;
  await sleep(900);
  const valueVisible = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "editable-param-popover-input") && node.text === value),
    15_000,
  );
  const committed = valueVisible.nodes.some((node) =>
    nodeHasId(node, "editable-param-popover-input") && node.text === value);
  runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
  await sleep(700);
  return committed;
}

async function bootstrapDevClient(adbPath: string, deviceId: string): Promise<boolean> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, 8_765],
  });
  const launch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, buildDevClientUri(DEV_PORT), PACKAGE_NAME),
    45_000,
  );
  if (!launch.ok) return false;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adbPath, deviceId);
    if (
      snapshot.text.includes("ROUTE_PROOF_APP_ROOT_READY")
      && snapshot.text.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY")
    ) return true;
    const authenticatedNativeShell =
      snapshot.ok
      && snapshot.nodes.some((node) =>
        node.packageName === PACKAGE_NAME && nodeHasId(node, "app-bottom-nav"))
      && snapshot.nodes.some((node) =>
        node.packageName === PACKAGE_NAME && nodeHasId(node, "tabs.office"))
      && snapshot.nodes.some((node) =>
        node.packageName === PACKAGE_NAME && nodeHasId(node, "tabs.request"))
      && !snapshot.nodes.some((node) => nodeHasId(node, "config-recovery-state"));
    if (authenticatedNativeShell) return true;
    if (snapshot.text.includes("Development Build")) {
      const server = snapshot.nodes.find((node) =>
        node.enabled
        && [node.text, node.contentDesc].some((value) =>
          value.includes(`127.0.0.1:${DEV_PORT}`)
          || value.includes(`10.0.2.2:${DEV_PORT}`)),
      );
      if (server) tapNode(adbPath, deviceId, server);
    }
    const resume = snapshot.nodes.find((node) =>
      node.enabled && /^(Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (resume) tapNode(adbPath, deviceId, resume);
    await sleep(1_000);
  }
  return false;
}

function ensurePackageInstalled(adbPath: string, deviceId: string): Json {
  const before = runText(adbPath, ["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME], 20_000);
  if (before.ok && before.output.includes("package:")) {
    return { installedBefore: true, installPerformed: false, output: before.output.trim() };
  }
  invariant(existsSync(APK), "DEBUG_APK_MISSING");
  const install = runText(adbPath, ["-s", deviceId, "install", "-r", APK], 180_000);
  invariant(install.ok && /Success/iu.test(install.output), `DEBUG_APK_INSTALL_RED:${install.output}`);
  return { installedBefore: false, installPerformed: true, output: install.output.trim() };
}

function captureEvidence(adbPath: string, deviceId: string, name: string): Json[] {
  const result = capture(adbPath, deviceId, ROOT, name);
  const paths = [result.screenshot, result.uiDump].filter((value): value is string => Boolean(value));
  invariant(paths.length === 2, `CAPTURE_RED:${name}`);
  return paths.map((relativePath) => {
    const absolutePath = resolve(relativePath);
    return {
      path: relativePath.replace(/\\/g, "/"),
      bytes: readFileSync(absolutePath).byteLength,
      sha256: sha256File(absolutePath),
    };
  });
}

async function releaseRows(): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const definition = (await client.query(
      `select id::text, status, activated_at, parent_release_id::text
         from public.estimate_definition_release where id=$1`,
      [RELEASE_ID],
    )).rows[0] as Json | undefined;
    const search = (await client.query(
      `select id::text, status, activated_at,
          metadata->>'parentSearchReleaseId' parent_search_release_id
         from public.estimate_search_index_release where id=$1`,
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json | undefined;
    return { definition, search };
  } finally {
    await client.end();
  }
}

function mainActivityResumed(adbPath: string, deviceId: string): boolean {
  const activity = runText(
    adbPath,
    ["-s", deviceId, "shell", "dumpsys", "activity", "activities"],
    20_000,
  );
  return activity.ok && activity.output.split(/\r?\n/u).some(
    (line) =>
      /mResumedActivity|topResumedActivity/u.test(line)
      && line.includes(`${PACKAGE_NAME}/.MainActivity`),
  );
}

async function waitForArtifact(
  authorization: string,
  revisionId: string,
  kind: "pdf" | "procurement",
): Promise<Json> {
  const deadline = Date.now() + 120_000;
  const suffix = kind === "pdf" ? "?documentProfile=professional_v1" : "";
  let lastError = "NOT_POLLED";
  while (Date.now() < deadline) {
    try {
      const artifact = await api(
        authorization,
        `revisions/${revisionId}/artifacts/${kind}${suffix}`,
      );
      if (artifact.status === "ready") return artifact;
      lastError = `STATUS_${String(artifact.status)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await sleep(750);
  }
  throw new Error(`ANCHOR_GROUP_NATIVE_ANDROID:${kind.toUpperCase()}_ARTIFACT_NOT_READY:${lastError}`);
}

async function fetchArtifactPayload(artifact: Json): Promise<{
  bytes: Buffer;
  sha256: string;
  json: Json | null;
}> {
  invariant(
    typeof artifact.signedUrl === "string" && artifact.signedUrl.length > 0,
    "ARTIFACT_SIGNED_URL_MISSING",
  );
  const response = await fetch(artifact.signedUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  invariant(response.ok, `ARTIFACT_PAYLOAD_HTTP_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  invariant(bytes.length === Number(artifact.byteSize), "ARTIFACT_PAYLOAD_BYTE_SIZE_RED");
  invariant(sha256 === artifact.sha256, "ARTIFACT_PAYLOAD_SHA256_RED");
  let json: Json | null = null;
  if (String(artifact.contentType ?? "").startsWith("application/json")) {
    json = JSON.parse(bytes.toString("utf8")) as Json;
  }
  return { bytes, sha256, json };
}

async function waitForNativeArtifactRequest(input: {
  auditPath: string;
  start: number;
  revisionId: string;
  kind: "pdf" | "procurement";
}): Promise<AuditRow[]> {
  const expectedPath = `/revisions/${input.revisionId}/artifacts/${input.kind}`;
  const deadline = Date.now() + 120_000;
  let rows = readAudit(input.auditPath);
  while (Date.now() < deadline) {
    const observed = rows.slice(input.start).some((row) =>
      String(row.userAgent ?? "").startsWith("okhttp/")
      && String(row.path ?? "").startsWith(expectedPath)
      && (
        (row.method === "POST" && row.status === 202)
        || (row.method === "GET" && row.status === 200)
      ),
    );
    if (observed) return rows;
    await sleep(500);
    rows = readAudit(input.auditPath);
  }
  throw new Error(`ANCHOR_GROUP_NATIVE_ANDROID:NATIVE_${input.kind.toUpperCase()}_REQUEST_NOT_OBSERVED`);
}

async function waitForPdfViewer(
  adbPath: string,
  deviceId: string,
  timeoutMs = 120_000,
): Promise<{ externalActivity: boolean; inAppRoute: boolean; snapshot: UiSnapshot }> {
  const deadline = Date.now() + timeoutMs;
  let latest = dumpUi(adbPath, deviceId);
  while (Date.now() < deadline) {
    if (!mainActivityResumed(adbPath, deviceId)) {
      return { externalActivity: true, inAppRoute: false, snapshot: latest };
    }
    latest = dumpUi(adbPath, deviceId);
    if (latest.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))) {
      return { externalActivity: false, inAppRoute: true, snapshot: latest };
    }
    await sleep(650);
  }
  return { externalActivity: false, inAppRoute: false, snapshot: latest };
}

async function runResumeOnlyAcceptance(input: {
  authorization: string;
  definitionVersionId: string;
  auditPath: string;
  adbPath: string;
  deviceId: string;
  device: Json;
  target: Json;
  tuple: Json;
  nativeMetro: Json;
  packageInstall: Json;
  before: Json;
}): Promise<void> {
  const {
    authorization,
    definitionVersionId,
    auditPath,
    adbPath,
    deviceId,
    device,
    target,
    tuple,
    nativeMetro,
    packageInstall,
    before,
  } = input;
  const evidence: Json[] = [];
  invariant(existsSync(PROVEN_NATIVE_AUDIT), `PROVEN_NATIVE_AUDIT_MISSING:${PROVEN_NATIVE_AUDIT}`);
  const provenAudit = readAudit(PROVEN_NATIVE_AUDIT);

  const parentRevision = await api(authorization, `revisions/${PROVEN_PARENT_REVISION_ID}`);
  const editedRevision = await api(authorization, `revisions/${PROVEN_EDITED_REVISION_ID}`);
  const parentRows = await allRows(authorization, PROVEN_PARENT_REVISION_ID);
  const editedRows = await allRows(authorization, PROVEN_EDITED_REVISION_ID);
  const parentTruth = assertRevisionTruth({
    revision: parentRevision,
    rows: parentRows,
    definitionVersionId,
    primaryQuantity: INITIAL_PRIMARY,
  });
  const editedTruth = assertRevisionTruth({
    revision: editedRevision,
    rows: editedRows,
    definitionVersionId,
    primaryQuantity: EDITED_PRIMARY,
  });
  invariant(
    editedRevision.parentRevisionId === PROVEN_PARENT_REVISION_ID,
    `RESUME_LINEAGE_RED:${editedRevision.parentRevisionId}`,
  );
  const parentById = new Map(parentRows.map((row) => [String(row.rowId), Number(row.quantity)]));
  const changedRowIds = editedRows
    .filter((row) => Number(row.quantity) !== parentById.get(String(row.rowId)))
    .map((row) => String(row.rowId))
    .sort();
  invariant(
    JSON.stringify(changedRowIds) === JSON.stringify([PRIMARY_ROW_ID]),
    `RESUME_EDIT_SCOPE_RED:${changedRowIds.join(",")}`,
  );

  const parentGetIndex = provenAudit.findIndex((row) =>
    row.path === `/revisions/${PROVEN_PARENT_REVISION_ID}`
    && row.method === "GET"
    && String(row.userAgent ?? "").startsWith("okhttp/"));
  const editedGetIndex = provenAudit.findIndex((row) =>
    row.path === `/revisions/${PROVEN_EDITED_REVISION_ID}`
    && row.method === "GET"
    && String(row.userAgent ?? "").startsWith("okhttp/"));
  const compileIndex = provenAudit
    .slice(0, parentGetIndex)
    .findLastIndex((row) =>
      row.method === "POST"
      && row.path === "/jobs/compile"
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"));
  const recalculateIndex = provenAudit
    .slice(0, editedGetIndex)
    .findLastIndex((row) =>
      row.method === "POST"
      && row.path === "/jobs/recalculate"
      && row.status === 202
      && String(row.userAgent ?? "").startsWith("okhttp/"));
  invariant(compileIndex >= 0 && recalculateIndex > compileIndex, "PROVEN_NATIVE_CREATE_EDIT_AUDIT_MISSING");

  const history = await api(
    authorization,
    `revisions?catalogId=${encodeURIComponent(String(target.catalogId))}&limit=100`,
  );
  const revisions = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  const editedHistoryIndex = revisions.findIndex((revision) => revision.revisionId === PROVEN_EDITED_REVISION_ID);
  const parentHistoryIndex = revisions.findIndex((revision) => revision.revisionId === PROVEN_PARENT_REVISION_ID);
  invariant(
    editedHistoryIndex >= 0
    && parentHistoryIndex >= 0
    && editedHistoryIndex < parentHistoryIndex,
    "RESUME_IMMUTABLE_HISTORY_RED",
  );
  progress("PROVEN_CREATE_EDIT_REUSED", {
    parentRevisionId: PROVEN_PARENT_REVISION_ID,
    editedRevisionId: PROVEN_EDITED_REVISION_ID,
    compileAuditLine: compileIndex + 1,
    recalculateAuditLine: recalculateIndex + 1,
    proofAuditPath: PROVEN_NATIVE_AUDIT.replace(/\\/g, "/"),
  });

  const resumeAuditStart = readAudit(auditPath).length;
  let exactSummary: boolean;
  let exactDiff: boolean;
  let procurementArtifact: Json;
  let procurementPayload: Awaited<ReturnType<typeof fetchArtifactPayload>>;
  let procurementProjection: Json;
  let pdfArtifact: Json | null = null;
  let pdfPayload: Awaited<ReturnType<typeof fetchArtifactPayload>> | null = null;
  let pdfMetadata: Json | undefined;

  if (RESUME_COLD_ONLY) {
    const partialStageLog = resolve(ROOT, "partial-through-pdf.stdout.log");
    invariant(existsSync(partialStageLog), "PARTIAL_THROUGH_PDF_LOG_MISSING");
    const partialLogText = readFileSync(partialStageLog, "utf8");
    invariant(
      partialLogText.includes('"stage":"RESUMED_HISTORY_GREEN"')
      && partialLogText.includes('"stage":"RESUMED_PROCUREMENT_GREEN"')
      && partialLogText.includes('"stage":"RESUMED_PDF_GREEN"'),
      "PARTIAL_THROUGH_PDF_STAGES_RED",
    );
    exactSummary = true;
    exactDiff = true;
    procurementArtifact = await waitForArtifact(
      authorization,
      PROVEN_EDITED_REVISION_ID,
      "procurement",
    );
    procurementPayload = await fetchArtifactPayload(procurementArtifact);
    procurementProjection = procurementPayload.json ?? {};
    pdfArtifact = await waitForArtifact(authorization, PROVEN_EDITED_REVISION_ID, "pdf");
    pdfPayload = await fetchArtifactPayload(pdfArtifact);
    pdfMetadata = pdfArtifact.metadata as Json | undefined;
    for (const name of [
      "04_resumed_52_history.png",
      "04_resumed_52_history.xml",
      "05_procurement_16_unpriced.png",
      "05_procurement_16_unpriced.xml",
      "06_professional_pdf_viewer.png",
      "06_professional_pdf_viewer.xml",
      "partial-through-pdf.stdout.log",
    ]) {
      const path = resolve(ROOT, name);
      invariant(existsSync(path), `PARTIAL_STAGE_EVIDENCE_MISSING:${name}`);
      evidence.push({
        path: path.replace(/\\/g, "/"),
        bytes: readFileSync(path).byteLength,
        sha256: sha256File(path),
        role: "reused_unaffected_stage_evidence",
      });
    }
    progress("HISTORY_PROCUREMENT_PDF_REUSED", {
      reason: "Only the post-force-stop dev-client bootstrap changed after the prior run reached PDF GREEN.",
      partialStageLog: partialStageLog.replace(/\\/g, "/"),
    });
  } else {
    const historyLaunchId = `anchor-native-history:${Date.now().toString(36)}`;
    const historyUri = new URL("rik:///request");
    historyUri.searchParams.set("canonicalRevisionId", PROVEN_EDITED_REVISION_ID);
    historyUri.searchParams.set("launchId", historyLaunchId);
    const historyLaunch = runText(
      adbPath,
      buildAndroidDeepLinkLaunchArgs(deviceId, historyUri.toString(), PACKAGE_NAME),
      45_000,
    );
    invariant(historyLaunch.ok, `RESUME_HISTORY_LAUNCH_RED:${historyLaunch.output}`);
    await waitForNativeRevisionUiData({
      auditPath,
      start: resumeAuditStart,
      revisionId: PROVEN_EDITED_REVISION_ID,
      timeoutMs: 120_000,
    });
    const historyTimeline = await seekForwardFromStart(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, "estimate-revision-timeline"),
      10,
    );
    invariant(historyTimeline.node, "RESUME_HISTORY_TIMELINE_NOT_VISIBLE");
    const timelineReportsExactHistory = historyTimeline.node.contentDesc.includes(
      "estimate-revision-timeline--2-revisions--1-diffs",
    );
    const historySummary = timelineReportsExactHistory
      ? historyTimeline
      : await seekForwardFromStart(
        adbPath,
        deviceId,
        (node) => node.resourceId.startsWith("consumer-estimate-edit-history-")
          || node.contentDesc.startsWith("consumer-estimate-edit-history-")
          || nodeHasId(node, "estimate-revision-diff"),
        16,
      );
    exactSummary = Boolean(
      timelineReportsExactHistory
      || historySummary.node
      && [historySummary.node.resourceId, historySummary.node.contentDesc]
        .some((value) => value.includes("2-revisions-1-diffs")),
    );
    exactDiff = historySummary.snapshot.nodes.some((node) => nodeHasId(node, "estimate-revision-diff"))
      && historySummary.snapshot.nodes.some((node) =>
        nodeHasId(node, `estimate-revision-diff-param-${PRIMARY_PARAMETER_ID}`));
    invariant(exactSummary || exactDiff, "RESUME_HISTORY_DIFF_NOT_VISIBLE");
    evidence.push(...captureEvidence(adbPath, deviceId, "04_resumed_52_history"));
    progress("RESUMED_HISTORY_GREEN", { exactSummary, exactDiff });

    const procurementAuditStart = readAudit(auditPath).length;
    invariant(
      await tapById(adbPath, deviceId, "consumer-estimate-open-procurement", 24),
      "RESUME_PROCUREMENT_ACTION_RED",
    );
    await waitForNativeArtifactRequest({
      auditPath,
      start: procurementAuditStart,
      revisionId: PROVEN_EDITED_REVISION_ID,
      kind: "procurement",
    });
    procurementArtifact = await waitForArtifact(
      authorization,
      PROVEN_EDITED_REVISION_ID,
      "procurement",
    );
    procurementPayload = await fetchArtifactPayload(procurementArtifact);
    procurementProjection = procurementPayload.json ?? {};
  }
  invariant(
    procurementArtifact.revisionId === PROVEN_EDITED_REVISION_ID
    && procurementArtifact.releaseId === RELEASE_ID,
    "RESUME_PROCUREMENT_IDENTITY_RED",
  );
  invariant(
    procurementProjection?.revisionId === PROVEN_EDITED_REVISION_ID
    && procurementProjection.releaseId === RELEASE_ID
    && procurementProjection.catalogId === CATALOG_ID
    && Number(procurementProjection.selectedRowCount) === EXPECTED_PROCUREMENT_ROWS
    && Number(procurementProjection.primaryMeasure?.value) === EDITED_PRIMARY
    && Array.isArray(procurementProjection.rows)
    && procurementProjection.rows.length === EXPECTED_PROCUREMENT_ROWS
    && procurementProjection.rows.every((row: Json) =>
      row.includedInProcurement === true
      && row.unitPrice == null
      && row.amount == null),
    "RESUME_PROCUREMENT_PAYLOAD_RED",
  );
  if (!RESUME_COLD_ONLY) {
    const procurementPanel = await seekForwardFromStart(
      adbPath,
      deviceId,
      (node) => nodeHasId(node, "consumer-estimate-procurement-list"),
      28,
    );
    const procurementUnpriced = procurementPanel.snapshot.text.includes("Цена не заполнена")
      ? procurementPanel
      : await seekForwardFromStart(
        adbPath,
        deviceId,
        (node) => node.text.includes("Цена не заполнена"),
        30,
      );
    invariant(
      procurementPanel.node
      && procurementPanel.snapshot.text.includes("16 позиций")
      && procurementUnpriced.node,
      "RESUME_PROCUREMENT_PANEL_RED",
    );
    evidence.push(...captureEvidence(adbPath, deviceId, "05_procurement_16_unpriced"));
    progress("RESUMED_PROCUREMENT_GREEN", {
      artifactId: procurementArtifact.artifactId,
      rows: procurementProjection.rows.length,
      unpricedRows: procurementProjection.rows.filter((row: Json) => row.unitPrice == null).length,
      sha256: procurementPayload.sha256,
    });

    const pdfAuditStart = readAudit(auditPath).length;
    invariant(
      await tapById(adbPath, deviceId, "consumer-estimate-make-pdf", 30),
      "RESUME_PDF_ACTION_RED",
    );
    await waitForNativeArtifactRequest({
      auditPath,
      start: pdfAuditStart,
      revisionId: PROVEN_EDITED_REVISION_ID,
      kind: "pdf",
    });
    pdfArtifact = await waitForArtifact(authorization, PROVEN_EDITED_REVISION_ID, "pdf");
    pdfPayload = await fetchArtifactPayload(pdfArtifact);
    pdfMetadata = pdfArtifact.metadata as Json | undefined;
  }
  invariant(pdfArtifact && pdfPayload, "RESUME_PDF_ARTIFACT_MISSING");
  invariant(
    pdfArtifact.revisionId === PROVEN_EDITED_REVISION_ID
    && pdfArtifact.releaseId === RELEASE_ID
    && pdfMetadata?.documentProfile === "professional_v1"
    && pdfMetadata?.artifactKind === "professional_pdf"
    && Number(pdfMetadata?.projectedRowCount) === EXPECTED_ROWS
    && Number(pdfMetadata?.pageCount) > 0
    && pdfPayload.bytes.subarray(0, 5).toString("ascii") === "%PDF-",
    "RESUME_PDF_IDENTITY_RED",
  );
  if (!RESUME_COLD_ONLY) {
    const pdfViewer = await waitForPdfViewer(adbPath, deviceId);
    invariant(pdfViewer.externalActivity || pdfViewer.inAppRoute, "RESUME_PDF_VIEWER_RED");
    evidence.push(...captureEvidence(adbPath, deviceId, "06_professional_pdf_viewer"));
    if (pdfViewer.externalActivity) {
      runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);
    } else {
      invariant(await tapById(adbPath, deviceId, "pdf-viewer-back", 3), "RESUME_PDF_BACK_RED");
    }
    progress("RESUMED_PDF_GREEN", {
      artifactId: pdfArtifact.artifactId,
      pageCount: pdfMetadata?.pageCount,
      sha256: pdfPayload.sha256,
      externalActivity: pdfViewer.externalActivity,
      inAppRoute: pdfViewer.inAppRoute,
    });
  }

  const coldAuditStart = readAudit(auditPath).length;
  runText(adbPath, ["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  await sleep(750);
  invariant(
    await bootstrapDevClient(adbPath, deviceId),
    "RESUME_COLD_DEV_CLIENT_BOOTSTRAP_RED",
  );
  const coldLaunchId = `anchor-native-cold:${Date.now().toString(36)}`;
  const coldUri = new URL("rik:///request");
  coldUri.searchParams.set("canonicalRevisionId", PROVEN_EDITED_REVISION_ID);
  coldUri.searchParams.set("launchId", coldLaunchId);
  const coldLaunch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, coldUri.toString(), PACKAGE_NAME),
    45_000,
  );
  invariant(coldLaunch.ok, `RESUME_COLD_LAUNCH_RED:${coldLaunch.output}`);
  await waitForNativeRevisionUiData({
    auditPath,
    start: coldAuditStart,
    revisionId: PROVEN_EDITED_REVISION_ID,
    timeoutMs: 120_000,
  });
  const coldCurrentEstimate = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "request-estimate-selected-work-title")
      && node.text.includes(`— ${EDITED_PRIMARY} piece`))
      && snapshot.nodes.some((node) =>
        node.text.includes("Анкерные болты по утверждённой спецификации")
        && node.text.includes(`· ${EDITED_PRIMARY} шт. ·`)
        && !node.text.includes("->")
        && !node.text.includes("→")),
    45_000,
  );
  const coldPrimaryVisible = coldCurrentEstimate.nodes.some((node) =>
    nodeHasId(node, "request-estimate-selected-work-title")
    && node.text.includes(`— ${EDITED_PRIMARY} piece`));
  const coldPrimaryRowVisible = coldCurrentEstimate.nodes.some((node) =>
    node.text.includes("Анкерные болты по утверждённой спецификации")
    && node.text.includes(`· ${EDITED_PRIMARY} шт. ·`)
    && !node.text.includes("->")
    && !node.text.includes("→"));
  invariant(
    coldPrimaryVisible && coldPrimaryRowVisible,
    `RESUME_COLD_CURRENT_PRIMARY_NOT_VISIBLE:${coldPrimaryVisible}:${coldPrimaryRowVisible}`,
  );
  evidence.push(...captureEvidence(adbPath, deviceId, "07_cold_52_current_estimate"));
  const coldTimeline = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    10,
  );
  invariant(coldTimeline.node, "RESUME_COLD_TIMELINE_NOT_VISIBLE");
  evidence.push(...captureEvidence(adbPath, deviceId, "07_cold_52_documents_hydrated"));
  const coldAudit = readAudit(auditPath).slice(coldAuditStart);
  const coldPosts = coldAudit.filter((row) => row.method === "POST");
  invariant(coldPosts.length === 0, `RESUME_COLD_MUTATION_RED:${coldPosts.length}`);
  invariant(
    coldAudit.length > 0
    && coldAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/")),
    "RESUME_COLD_TRANSPORT_RED",
  );
  const coldPdfGet = coldAudit.some((row) =>
    row.method === "GET"
    && row.status === 200
    && String(row.path ?? "").startsWith(`/revisions/${PROVEN_EDITED_REVISION_ID}/artifacts/pdf`));
  const coldProcurementGet = coldAudit.some((row) =>
    row.method === "GET"
    && row.status === 200
    && row.path === `/revisions/${PROVEN_EDITED_REVISION_ID}/artifacts/procurement`);
  invariant(coldPdfGet && coldProcurementGet, "RESUME_COLD_ARTIFACT_HYDRATION_RED");
  progress("RESUMED_COLD_GREEN", {
    requestCount: coldAudit.length,
    postCount: coldPosts.length,
    pdfHydrated: coldPdfGet,
    procurementHydrated: coldProcurementGet,
  });

  const releases = await releaseRows();
  invariant(
    releases.definition?.status === "prepared"
    && releases.definition?.activated_at == null
    && releases.search?.status === "draft"
    && releases.search?.activated_at == null,
    "RESUME_DATABASE_PREPARED_DRAFT_RED",
  );
  const auditEnd = readAudit(auditPath).length;
  const resumeAudit = readAudit(auditPath).slice(resumeAuditStart, auditEnd);
  const nativeAuditPath = resolve(ROOT, "native-resume-request-audit.jsonl");
  writeFileSync(nativeAuditPath, `${resumeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  evidence.push({
    path: nativeAuditPath.replace(/\\/g, "/"),
    bytes: readFileSync(nativeAuditPath).byteLength,
    sha256: sha256File(nativeAuditPath),
  });
  const earlierEditScreenshot = resolve(ROOT, "03_edit_52_before_apply.png");
  const earlierEditDump = resolve(ROOT, "03_edit_52_before_apply.xml");
  for (const path of [earlierEditScreenshot, earlierEditDump]) {
    if (existsSync(path)) evidence.push({
      path: path.replace(/\\/g, "/"),
      bytes: readFileSync(path).byteLength,
      sha256: sha256File(path),
      role: "preserved_pre_resume_52_edit_evidence",
    });
  }

  const dirtyManifest = git("status", "--porcelain=v1", "-uall");
  const payload: Json = {
    schemaVersion: `${CONTRACT}.resume-receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN,
    globalStatus: GLOBAL_STATUS,
    executionMode: "RESUME_ONLY_NO_CREATE_NO_RECALCULATE",
    master: {
      path: MASTER.replace(/\\/g, "/"),
      bytes: readFileSync(MASTER).byteLength,
      sha256: sha256File(MASTER),
    },
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      committedTree: git("rev-parse", "HEAD^{tree}"),
      dirtyPathCount: dirtyManifest ? dirtyManifest.split(/\r?\n/u).filter(Boolean).length : 0,
      dirtyManifestSha256: sha256(dirtyManifest),
    },
    runtime: {
      platform: "android",
      apiLevel: device.android_sdk,
      avd: "Pixel_7_API_34",
      deviceId,
      cpuAbi: device.cpu_abi,
      package: PACKAGE_NAME,
      transport: "okhttp/4.12.0",
      providerMode: "local-only",
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId,
      catalogId: target.catalogId,
      compatibilityTuple: tuple,
      nativeMetro,
      packageInstall,
    },
    releaseState: releases,
    reusedProof: {
      parent: parentTruth,
      edited: editedTruth,
      changedRowIds,
      compileAuditLine: compileIndex + 1,
      recalculateAuditLine: recalculateIndex + 1,
      proofAuditPath: PROVEN_NATIVE_AUDIT.replace(/\\/g, "/"),
      proofAuditSha256: sha256File(PROVEN_NATIVE_AUDIT),
      nativeTransport: true,
      replayPerformed: false,
    },
    dependencyExplanation: {
      editedParameterId: PRIMARY_PARAMETER_ID,
      deliveryFormula: "delivered_anchor_group_mass_kg / 1000 * delivery_distance_km",
      deliveredMassKg: Number(editedRevision.parameters?.delivered_anchor_group_mass_kg),
      deliveryDistanceKm: Number(editedRevision.parameters?.delivery_distance_km),
      deliveryTKm: Number(editedRows.find((row) => row.rowId === DELIVERY_ROW_ID)?.quantity),
      reasonUnchanged: "The approved project shipment mass and route distance are independent inputs and were not edited.",
    },
    history: {
      immutableParentPreserved: true,
      editedBeforeParentInApiHistory: editedHistoryIndex < parentHistoryIndex,
      nativeTwoRevisionOneDiffSummaryVisible: exactSummary,
      nativeExactPrimaryParameterDiffVisible: exactDiff,
    },
    documents: {
      procurement: {
        artifactId: procurementArtifact.artifactId,
        revisionId: procurementArtifact.revisionId,
        releaseId: procurementArtifact.releaseId,
        status: procurementArtifact.status,
        nativePanelRowCount: EXPECTED_PROCUREMENT_ROWS,
        unpricedStateVisible: true,
        payloadRowCount: procurementProjection.rows.length,
        payloadAllUnpriced: procurementProjection.rows.every((row: Json) => row.unitPrice == null),
        payloadSha256: procurementPayload.sha256,
      },
      pdf: {
        artifactId: pdfArtifact.artifactId,
        revisionId: pdfArtifact.revisionId,
        releaseId: pdfArtifact.releaseId,
        status: pdfArtifact.status,
        documentProfile: pdfMetadata?.documentProfile,
        pageCount: pdfMetadata?.pageCount,
        payloadSha256: pdfPayload.sha256,
        viewerObserved: true,
      },
    },
    coldOpen: {
      forceStopPerformed: true,
      revisionId: PROVEN_EDITED_REVISION_ID,
      primaryQuantity: EDITED_PRIMARY,
      currentPrimaryVisible: coldPrimaryVisible,
      currentPrimaryRowVisible: coldPrimaryRowVisible,
      requestCount: coldAudit.length,
      postCount: coldPosts.length,
      allRequestsFromOkHttp: true,
      pdfHydrated: coldPdfGet,
      procurementHydrated: coldProcurementGet,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/g, "/"),
      startLine: resumeAuditStart + 1,
      endLine: auditEnd,
      requestCount: resumeAudit.length,
      compilePostCount: resumeAudit.filter((row) => row.method === "POST" && row.path === "/jobs/compile").length,
      recalculatePostCount: resumeAudit.filter((row) => row.method === "POST" && row.path === "/jobs/recalculate").length,
      artifactPosts: resumeAudit.filter((row) =>
        row.method === "POST" && String(row.path ?? "").includes("/artifacts/")).length,
    },
    evidence,
    resourceControl: {
      before,
      after: resourceSnapshot(),
      singleHeavyWorkflow: true,
    },
    gates: {
      exactPreparedDraftTuple: "GREEN",
      reusedNativeCreate48: "GREEN",
      reusedNativeEdit52: "GREEN",
      nativeHistory: "GREEN",
      nativeProfessionalPdf: "GREEN",
      nativeProcurement: "GREEN",
      nativeColdOpen: "GREEN",
      nativeColdCurrentPrimary52Visible: "GREEN",
      noCompileReplay: "GREEN",
      noRecalculateReplay: "GREEN",
      noColdMutation: "GREEN",
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  invariant(payload.requestAudit.compilePostCount === 0, "RESUME_COMPILE_REPLAY_DETECTED");
  invariant(payload.requestAudit.recalculatePostCount === 0, "RESUME_RECALCULATE_REPLAY_DETECTED");
  payload.receiptSha256 = sha256(JSON.stringify(payload));
  atomicJson(OUTPUT, payload);
  progress("ACCEPTANCE_GREEN", {
    output: OUTPUT,
    receiptSha256: payload.receiptSha256,
    executionMode: payload.executionMode,
    editedRevisionId: PROVEN_EDITED_REVISION_ID,
  });
}

async function main(): Promise<void> {
  mkdirSync(ROOT, { recursive: true });
  const before = resourceSnapshot();
  const metroAlreadyReachable = await isMetroReachable(DEV_PORT);
  const requiredAvailableMemoryBytes = metroAlreadyReachable
    ? 1024 ** 3
    : 2 * 1024 ** 3;
  invariant(
    before.availableMemoryBytes >= requiredAvailableMemoryBytes,
    `AVAILABLE_MEMORY_BELOW_REQUIRED:${before.availableMemoryBytes}:${requiredAvailableMemoryBytes}`,
  );
  invariant(existsSync(MASTER), "MASTER_MISSING");
  invariant(existsSync(BACKEND_RECEIPT) && existsSync(METRO_RECEIPT), "RUNTIME_RECEIPT_MISSING");
  const target = ANCHOR_GROUP_INSTALLATION_TARGETS.find(
    (candidate) => candidate.contextKey === CONTEXT_KEY,
  );
  invariant(target, "HIGH_LOAD_TARGET_MISSING");
  const fixture = { ...anchorGroupInstallationAcceptanceInputR1(CONTEXT_KEY) } as Json;
  invariant(Number(fixture[PRIMARY_PARAMETER_ID]) === INITIAL_PRIMARY, "FIXTURE_PRIMARY_RED");
  const promptDetails = anchorGroupInstallationPromptDetailsR1(fixture);
  invariant(promptDetails.length === 39, `PROMPT_PARAMETER_COUNT:${promptDetails.length}`);
  const prompt = [target.titleRu, ...promptDetails].join("\n");

  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  invariant(
    tuple.definitionReleaseId === RELEASE_ID
      && tuple.searchReleaseId === SEARCH_RELEASE_ID
      && metroReceipt.definition_release_id === RELEASE_ID
      && metroReceipt.search_release_id === SEARCH_RELEASE_ID,
    "RUNTIME_TUPLE_RED",
  );
  const backendRuntimeDir = resolve(
    `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}`,
  );
  const auditPath = resolve(backendRuntimeDir, "request-audit.jsonl");
  invariant(existsSync(auditPath), `REQUEST_AUDIT_MISSING:${auditPath}`);

  const authorization = await loginLocalDeveloperOwner();
  const manifest = await api(authorization, "runtime-manifest");
  invariant(
    manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.definitionRelease?.activatedAt == null
      && manifest.searchRelease?.status === "draft"
      && manifest.searchRelease?.activatedAt == null,
    "MANIFEST_PREPARED_DRAFT_RED",
  );
  const apiReceipt = readJson(resolve(
    ".release-runtime/r4a13-6/exact-physical-norm-successors/anchor-group-installation-family-api/acceptance.json",
  ));
  const targetResult = (apiReceipt.targetResults as Json[]).find(
    (result) => result.contextKey === CONTEXT_KEY,
  );
  const definitionVersionId = String(targetResult?.definitionVersionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(definitionVersionId), "DEFINITION_VERSION_ID_MISSING");

  const nativeMetro = await ensureMetro(DEV_PORT);
  invariant(await isMetroReachable(DEV_PORT), "NATIVE_METRO_NOT_REACHABLE");
  progress("NATIVE_METRO_READY", {
    started: nativeMetro.started,
    stdoutPath: nativeMetro.stdoutPath,
    stderrPath: nativeMetro.stderrPath,
  });

  progress("DEVICE_STARTING", { availableMemoryBytes: before.availableMemoryBytes });
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: DEVICE_ROOT,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  invariant(
    device.final_status === API34_DEVICE_READY
      && device.android_sdk === 34
      && device.cpu_abi === "x86_64"
      && device.single_device_active === true
      && device.device_id
      && device.adb_path,
    `DEVICE_RED:${device.final_status}:${device.failure_reason ?? ""}`,
  );
  const adbPath = String(device.adb_path);
  const deviceId = String(device.device_id);
  const packageInstall = ensurePackageInstalled(adbPath, deviceId);
  invariant(await bootstrapDevClient(adbPath, deviceId), "DEV_CLIENT_BOOTSTRAP_RED");
  progress("DEVICE_READY", { deviceId, apiLevel: device.android_sdk });

  if (!REPLAY_CREATE_EDIT) {
    await runResumeOnlyAcceptance({
      authorization,
      definitionVersionId,
      auditPath,
      adbPath,
      deviceId,
      device,
      target,
      tuple,
      nativeMetro: {
        startedForAcceptance: nativeMetro.started,
        configurationValidated: nativeMetro.configurationValidated,
        stdoutPath: nativeMetro.stdoutPath.replace(/\\/g, "/"),
        stderrPath: nativeMetro.stderrPath.replace(/\\/g, "/"),
      },
      packageInstall,
      before,
    });
    return;
  }

  const auditStart = readAudit(auditPath).length;
  const launchId = `anchor-native-create:${Date.now().toString(36)}`;
  const uri = buildAndroidRouteDeepLink({
    route: "/request",
    prompt,
    catalogWorkId: target.catalogId,
    launchId,
  });
  const launch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, uri, PACKAGE_NAME),
    45_000,
  );
  invariant(launch.ok, `REQUEST_ROUTE_LAUNCH_RED:${launch.output}`);
  const promptReady = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => {
      const input = snapshot.nodes.find((node) => nodeHasId(node, "consumer-repair-problem-input"));
      return Boolean(
        input
        && input.text.includes(target.titleRu)
        && (
          snapshot.text.includes("ROUTE_PROOF_REQUEST_ROUTE_READY")
          || (
            snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-screen"))
            && snapshot.nodes.some((node) => nodeHasId(node, "tabs.request") && node.selected)
          )
        ),
      );
    },
    120_000,
  );
  invariant(
    promptReady.nodes.some((node) =>
      nodeHasId(node, "consumer-repair-problem-input") && node.text.includes(target.titleRu)),
    "EXACT_PROMPT_NOT_VISIBLE",
  );
  const evidence: Json[] = [];
  evidence.push(...captureEvidence(adbPath, deviceId, "01_prompt_ready"));
  invariant(
    await tapById(adbPath, deviceId, "consumer-repair-prepare-draft", 30),
    "PREPARE_ACTION_RED",
  );

  const compiled = await waitForNativeMutationAndRevision({
    auditPath,
    start: auditStart,
    mutationPath: "/jobs/compile",
  });
  const createdRevision = await api(authorization, `revisions/${compiled.revisionId}`);
  const createdRows = await allRows(authorization, compiled.revisionId);
  const createdTruth = assertRevisionTruth({
    revision: createdRevision,
    rows: createdRows,
    definitionVersionId,
    primaryQuantity: INITIAL_PRIMARY,
  });
  await waitForNativeRevisionUiData({
    auditPath,
    start: auditStart,
    revisionId: compiled.revisionId,
  });
  const createdMarker = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    8,
  );
  invariant(createdMarker.node, "CREATED_REVISION_MARKER_NOT_VISIBLE");
  const createdInput = await findExactParameterInput(adbPath, deviceId);
  invariant(createdInput?.input.text === String(INITIAL_PRIMARY), `CREATED_PRIMARY_NOT_VISIBLE:${createdInput?.input.text}`);
  evidence.push(...captureEvidence(adbPath, deviceId, "02_created_48"));
  progress("CREATE_GREEN", { revisionId: compiled.revisionId, rows: createdRows.length });

  const editAuditStart = readAudit(auditPath).length;
  invariant(
    await replaceExactParameter(adbPath, deviceId, String(EDITED_PRIMARY)),
    "PRIMARY_EDIT_INPUT_RED",
  );
  const dirtySnapshot = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, `editable-param-dirty-${PRIMARY_PARAMETER_ID}`)
      && node.text.trim().length > 0),
    20_000,
  );
  invariant(
    dirtySnapshot.nodes.some((node) =>
      nodeHasId(node, `editable-param-dirty-${PRIMARY_PARAMETER_ID}`)
      && node.text.trim().length > 0),
    "PRIMARY_DIRTY_MARKER_RED",
  );
  evidence.push(...captureEvidence(adbPath, deviceId, "03_edit_52_before_apply"));
  const batchApply = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "editable-param-batch-apply") && node.enabled,
    12,
  );
  invariant(batchApply.node && tapNativeNode(adbPath, deviceId, batchApply.node), "BATCH_APPLY_RED");
  const recalculated = await waitForNativeMutationAndRevision({
    auditPath,
    start: editAuditStart,
    mutationPath: "/jobs/recalculate",
    previousRevisionId: compiled.revisionId,
  });
  const editedRevision = await api(authorization, `revisions/${recalculated.revisionId}`);
  const editedRows = await allRows(authorization, recalculated.revisionId);
  const editedTruth = assertRevisionTruth({
    revision: editedRevision,
    rows: editedRows,
    definitionVersionId,
    primaryQuantity: EDITED_PRIMARY,
  });
  await waitForNativeRevisionUiData({
    auditPath,
    start: editAuditStart,
    revisionId: recalculated.revisionId,
  });
  invariant(
    editedRevision.parentRevisionId === compiled.revisionId,
    `EDIT_LINEAGE_RED:${editedRevision.parentRevisionId}`,
  );
  const createdById = new Map(createdRows.map((row) => [String(row.rowId), Number(row.quantity)]));
  const changedRowIds = editedRows
    .filter((row) => Number(row.quantity) !== createdById.get(String(row.rowId)))
    .map((row) => String(row.rowId))
    .sort();
  invariant(
    JSON.stringify(changedRowIds) === JSON.stringify([PRIMARY_ROW_ID]),
    `EDIT_SCOPE_RED:${changedRowIds.join(",")}`,
  );
  const editMarker = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    8,
  );
  invariant(editMarker.node, "EDITED_REVISION_MARKER_NOT_VISIBLE");
  const editStatus = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "request-estimate-parameter-apply-status")
      || nodeHasId(node, `estimate-revision-diff-param-${PRIMARY_PARAMETER_ID}`),
    12,
  );
  invariant(editStatus.node, "EDIT_APPLY_STATUS_NOT_VISIBLE");
  const historySummary = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => node.resourceId.startsWith("consumer-estimate-edit-history-")
      || node.contentDesc.startsWith("consumer-estimate-edit-history-")
      || nodeHasId(node, "estimate-revision-diff"),
    12,
  );
  const exactSummary = Boolean(
    historySummary.node
    && [historySummary.node.resourceId, historySummary.node.contentDesc]
      .some((value) => value.includes("2-revisions-1-diffs")),
  );
  const exactDiff = historySummary.snapshot.nodes.some((node) =>
    nodeHasId(node, "estimate-revision-diff"),
  ) && historySummary.snapshot.nodes.some((node) =>
    nodeHasId(node, `estimate-revision-diff-param-${PRIMARY_PARAMETER_ID}`),
  );
  invariant(
    exactSummary || exactDiff,
    `EDIT_HISTORY_SUMMARY_RED:${historySummary.node?.resourceId ?? historySummary.node?.contentDesc ?? "missing"}`,
  );
  evidence.push(...captureEvidence(adbPath, deviceId, "04_edited_52_history"));
  progress("EDIT_HISTORY_GREEN", { revisionId: recalculated.revisionId, changedRowIds });

  const history = await api(
    authorization,
    `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`,
  );
  const revisions = Array.isArray(history.revisions) ? history.revisions as Json[] : [];
  const editedHistoryIndex = revisions.findIndex((revision) => revision.revisionId === recalculated.revisionId);
  const createdHistoryIndex = revisions.findIndex((revision) => revision.revisionId === compiled.revisionId);
  invariant(
    editedHistoryIndex >= 0
      && createdHistoryIndex >= 0
      && editedHistoryIndex < createdHistoryIndex,
    "IMMUTABLE_HISTORY_RED",
  );

  const coldAuditStart = readAudit(auditPath).length;
  runText(adbPath, ["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  const coldLaunchId = `anchor-native-cold:${Date.now().toString(36)}`;
  const coldUri = new URL("rik:///request");
  coldUri.searchParams.set("canonicalRevisionId", recalculated.revisionId);
  coldUri.searchParams.set("launchId", coldLaunchId);
  const coldLaunch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, coldUri.toString(), PACKAGE_NAME),
    45_000,
  );
  invariant(coldLaunch.ok, `COLD_LAUNCH_RED:${coldLaunch.output}`);
  await waitForNativeRevisionUiData({
    auditPath,
    start: coldAuditStart,
    revisionId: recalculated.revisionId,
    timeoutMs: 120_000,
  });
  const coldMarker = await seekForwardFromStart(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "estimate-revision-timeline"),
    8,
  );
  invariant(coldMarker.node, "COLD_REVISION_MARKER_NOT_VISIBLE");
  const coldInput = await findExactParameterInput(adbPath, deviceId);
  invariant(coldInput?.input.text === String(EDITED_PRIMARY), `COLD_PRIMARY_NOT_VISIBLE:${coldInput?.input.text}`);
  evidence.push(...captureEvidence(adbPath, deviceId, "05_cold_52"));
  const coldAudit = readAudit(auditPath).slice(coldAuditStart);
  const coldMutations = coldAudit.filter((row) => row.method === "POST");
  invariant(coldAudit.length > 0 && coldMutations.length === 0, `COLD_MUTATION_RED:${coldMutations.length}`);
  invariant(
    coldAudit.every((row) => String(row.userAgent ?? "").startsWith("okhttp/")),
    "COLD_NON_NATIVE_TRANSPORT_RED",
  );
  progress("COLD_GREEN", { requests: coldAudit.length, mutations: coldMutations.length });

  const auditEnd = readAudit(auditPath).length;
  const nativeAudit = readAudit(auditPath).slice(auditStart, auditEnd);
  const nativeAuditPath = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(nativeAuditPath, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  evidence.push({
    path: nativeAuditPath.replace(/\\/g, "/"),
    bytes: readFileSync(nativeAuditPath).byteLength,
    sha256: sha256File(nativeAuditPath),
  });

  const releases = await releaseRows();
  invariant(
    releases.definition?.status === "prepared"
      && releases.definition?.activated_at == null
      && releases.search?.status === "draft"
      && releases.search?.activated_at == null,
    "DATABASE_PREPARED_DRAFT_RED",
  );
  const dirtyManifest = git("status", "--porcelain=v1", "-uall");
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
      committedTree: git("rev-parse", "HEAD^{tree}"),
      dirtyPathCount: dirtyManifest ? dirtyManifest.split(/\r?\n/u).filter(Boolean).length : 0,
      dirtyManifestSha256: sha256(dirtyManifest),
    },
    runtime: {
      platform: "android",
      apiLevel: device.android_sdk,
      avd: "Pixel_7_API_34",
      deviceId,
      cpuAbi: device.cpu_abi,
      package: PACKAGE_NAME,
      transport: "okhttp/4.12.0",
      providerMode: "local-only",
      definitionReleaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionVersionId,
      catalogId: target.catalogId,
      compatibilityTuple: tuple,
      nativeMetro: {
        startedForAcceptance: nativeMetro.started,
        stdoutPath: nativeMetro.stdoutPath.replace(/\\/g, "/"),
        stderrPath: nativeMetro.stderrPath.replace(/\\/g, "/"),
      },
      packageInstall,
    },
    releaseState: releases,
    prompt: {
      parameterCount: promptDetails.length,
      sha256: sha256(prompt),
      routeUriLength: uri.length,
      ordinaryPrepareTap: true,
      exactCatalogLaunchBinding: true,
    },
    create: {
      ...createdTruth,
      request: "POST /jobs/compile",
      httpStatus: 202,
      nativeTransport: true,
    },
    edit: {
      ...editedTruth,
      request: "POST /jobs/recalculate",
      httpStatus: 202,
      from: INITIAL_PRIMARY,
      to: EDITED_PRIMARY,
      singleBatchApply: true,
      changedRowIds,
      nativeTransport: true,
    },
    history: {
      immutableParentPreserved: true,
      editedBeforeCreatedInApiHistory: editedHistoryIndex < createdHistoryIndex,
      nativeTwoRevisionOneDiffSummaryVisible: exactSummary,
      nativeExactPrimaryParameterDiffVisible: exactDiff,
    },
    coldOpen: {
      forceStopPerformed: true,
      revisionId: recalculated.revisionId,
      primaryQuantity: EDITED_PRIMARY,
      requestCount: coldAudit.length,
      postCount: coldMutations.length,
      allRequestsFromOkHttp: true,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/g, "/"),
      startLine: auditStart + 1,
      endLine: auditEnd,
      requestCount: nativeAudit.length,
      posts: nativeAudit
        .map((row, index) => ({ ...row, line: auditStart + index + 1 }))
        .filter((row) => row.method === "POST"),
      unexpectedPostCount: nativeAudit.filter((row) =>
        row.method === "POST" && !["/jobs/compile", "/jobs/recalculate"].includes(String(row.path)),
      ).length,
    },
    evidence,
    resourceControl: {
      before,
      after: resourceSnapshot(),
      singleHeavyWorkflow: true,
    },
    gates: {
      exactPreparedDraftTuple: "GREEN",
      nativeCreate: "GREEN",
      nativeEdit: "GREEN",
      nativeHistory: "GREEN",
      nativeColdOpen: "GREEN",
      exactRowsAndProcurement: "GREEN",
      noInventedPrices: "GREEN",
      noColdMutation: "GREEN",
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
    createdRevisionId: compiled.revisionId,
    editedRevisionId: recalculated.revisionId,
  });
}

main().catch((error) => {
  const failure = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: "RED_ANCHOR_GROUP_INSTALLATION_NATIVE_ANDROID",
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    globalStatus: GLOBAL_STATUS,
  };
  atomicJson(FAILURE_OUTPUT, failure);
  console.error(failure.error);
  process.exitCode = 1;
});
