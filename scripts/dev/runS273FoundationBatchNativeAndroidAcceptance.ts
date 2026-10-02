import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildAndroidDeepLinkLaunchArgs,
} from "../e2e/androidDeepLinkLaunchContract";
import {
  buildDevClientUri,
  setupAndroidRuntime,
  sleep,
} from "../e2e/androidRouteBootstrapHarness";
import {
  bounds,
  capture,
  dumpUi,
  nodeHasId,
  replaceField,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;
type AuditRow = {
  method?: string;
  path?: string;
  status?: number;
  userAgent?: string;
};

const CONTRACT = String(
  process.env.S27_NATIVE_CONTRACT ?? "rik-expo-app.s27-4.delivery-first.foundation-batch.native-android.v1",
);
const GREEN_STATUS = String(
  process.env.S27_NATIVE_GREEN_STATUS ?? "GREEN_S27_4_DELIVERY_FIRST_FOUNDATION_BATCH_NATIVE_ANDROID",
);
const RED_STATUS = String(
  process.env.S27_NATIVE_RED_STATUS ?? GREEN_STATUS.replace(/^GREEN_/u, "RED_"),
);
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = String(process.env.S27_NATIVE_DEVICE_ID ?? "emulator-5554");
const DEV_PORT = Number(process.env.S27_NATIVE_METRO_PORT ?? 8_081);
const BACKEND = String(process.env.S27_NATIVE_BACKEND_URL ?? "http://127.0.0.1:8765").replace(/\/$/u, "");
const MASTER = resolve(
  String(process.env.S27_NATIVE_MASTER_PATH ??
    "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (40).md"),
);
const EXPECTED_MASTER_SHA256 = String(
  process.env.S27_NATIVE_MASTER_SHA256 ?? "949f702266d471e62e29e1635eaf40a7b2dffee415c4220190533608a349c347",
);
const WEB_ACCEPTANCE = resolve(
  String(process.env.S27_NATIVE_WEB_ACCEPTANCE ??
    ".release-runtime/r568/s27-4/delivery-first/acceptance/web-foundation-150/acceptance.json"),
);
const ROOT = resolve(String(process.env.S27_NATIVE_OUTPUT_ROOT ??
  ".release-runtime/r568/s27-4/delivery-first/acceptance/android-native-foundation-150"));
const DEVICE_ROOT = resolve(ROOT, "device");
const OUTPUT = resolve(ROOT, "acceptance.json");
const FAILURE_OUTPUT = resolve(ROOT, "failure.json");
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(String(process.env.S27_NATIVE_BACKEND_RECEIPT ??
  ".release-runtime/r568/runtime/local-developer-current/backend.json"));
const METRO_RECEIPT = resolve(String(process.env.S27_NATIVE_METRO_RECEIPT ??
  ".release-runtime/r568/runtime/local-developer-current/metro.json"));

const NATIVE_EDITS = {
  concrete_placement: { quantity: 131.5, unitPrice: 1810.25 },
  surface_finish: { quantity: 153.25, unitPrice: 230.5 },
  curing_work: { quantity: 154.75, unitPrice: 340.75 },
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S273_NATIVE:${code}`);
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function run(
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

function progress(stage: string, details: Json = {}): void {
  const payload = { capturedAt: new Date().toISOString(), stage, ...details };
  writeJson(resolve(ROOT, "progress.json"), payload);
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function auditRows(path: string): AuditRow[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function nativeRows(path: string, start = 0): AuditRow[] {
  return auditRows(path).slice(start).filter((row) =>
    String(row.userAgent ?? "").startsWith("okhttp/"),
  );
}

async function authorization(): Promise<string> {
  const credentials = readJson(CREDENTIALS);
  const principal = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(principal?.email && principal?.password && credentials.publishable_key, "CREDENTIALS_RED");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && payload.access_token, `LOGIN_${response.status}`);
  return `Bearer ${payload.access_token}`;
}

async function api(authorizationHeader: string, route: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/canonical-estimate/${route.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorizationHeader },
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${route}:${JSON.stringify(payload)}`);
  return payload;
}

async function revisionRows(
  authorizationHeader: string,
  revisionId: string,
): Promise<Json[]> {
  const payload = await api(authorizationHeader, `revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(payload.rows) ? payload.rows : [];
}

function adbPath(): string {
  const located = run("where.exe", ["adb"], 10_000);
  const candidate = located.output.split(/\r?\n/u).find(Boolean)?.trim();
  invariant(located.ok && candidate && existsSync(candidate), "ADB_MISSING");
  return candidate;
}

async function bootstrap(adb: string): Promise<void> {
  setupAndroidRuntime(DEV_PORT, PACKAGE_NAME, {
    clearAppState: false,
    reversePorts: [54_321, 54_329, Number(new URL(BACKEND).port), DEV_PORT],
  });
  const launch = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, buildDevClientUri(DEV_PORT), PACKAGE_NAME),
    60_000,
  );
  invariant(launch.ok, `DEV_CLIENT_LAUNCH_RED:${launch.output}`);
  const deadline = Date.now() + 180_000;
  let snapshot = dumpUi(adb, DEVICE_ID);
  let loginAttempted = false;
  while (Date.now() < deadline) {
    snapshot = dumpUi(adb, DEVICE_ID);
    invariant(!snapshot.nodes.some((node) => nodeHasId(node, "config-recovery-state")),
      "CONFIG_RECOVERY_RED");
    const consumerIdentityVisible = snapshot.text.includes("local-consumer-");
    const consumerScreenVisible = snapshot.nodes.some((node) => nodeHasId(node, "consumer-repair-screen"));
    if (
      snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav")) &&
      (consumerIdentityVisible || consumerScreenVisible)
    ) return;
    if (!loginAttempted && snapshot.nodes.some((node) => nodeHasId(node, "auth.login.screen"))) {
      const credentials = readJson(CREDENTIALS);
      const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
      invariant(consumer?.email && consumer?.password, "CONSUMER_LOGIN_CREDENTIALS_RED");
      invariant(await replaceField(adb, DEVICE_ID, "auth.login.email", String(consumer.email)),
        "CONSUMER_LOGIN_EMAIL_RED");
      invariant(await replaceField(adb, DEVICE_ID, "auth.login.password", String(consumer.password)),
        "CONSUMER_LOGIN_PASSWORD_RED");
      invariant(await tapById(adb, DEVICE_ID, "auth.login.submit", 8), "CONSUMER_LOGIN_SUBMIT_RED");
      loginAttempted = true;
    }
    const localLogin = snapshot.nodes.find((node) =>
      (nodeHasId(node, "auth.login.local-consumer")
        || nodeHasId(node, "protected-identity-local-consumer-login"))
      && node.enabled,
    );
    if (localLogin) {
      tapNode(adb, DEVICE_ID, localLogin);
      await sleep(1_000);
      continue;
    }
    const resume = snapshot.nodes.find((node) =>
      node.enabled && /^(?:Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (resume) tapNode(adb, DEVICE_ID, resume);
    await sleep(750);
  }
  throw new Error(`S273_NATIVE:BOOTSTRAP_RED:${snapshot.text.slice(0, 500)}`);
}

async function openRevision(adb: string, revisionId: string): Promise<void> {
  const launchId = `s273-native-${Date.now().toString(36)}`;
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", revisionId);
  uri.searchParams.set("launchId", launchId);
  const launch = run(
    adb,
    buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri.toString(), PACKAGE_NAME),
    60_000,
  );
  invariant(launch.ok, `REVISION_LAUNCH_RED:${launch.output}`);
  // A previous revision summary can remain mounted for a short interval after
  // the new deep link arrives. Do not accept that stale summary as proof of
  // hydration: the canonical loader publishes a blocking preview for a newly
  // loaded revision. Route launch markers may be intentionally deduplicated by
  // the intent lifecycle when reopening the same revision, so if no preview is
  // published, prove the exact compiled revision marker instead.
  const previewDeadline = Date.now() + 15_000;
  let settled = dumpUi(adb, DEVICE_ID);
  while (
    Date.now() < previewDeadline &&
    !settled.nodes.some((node) =>
      nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled)
  ) {
    await sleep(650);
    settled = dumpUi(adb, DEVICE_ID);
  }
  const previewAction = settled.nodes.find((node) =>
    nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled,
  );
  if (!previewAction) {
    const exactRevision = await seekNode(
      adb,
      DEVICE_ID,
      (node) => node.resourceId.includes(`--revision-${revisionId}--`),
      40,
      "coarse",
    );
    invariant(exactRevision.node, `EXACT_REVISION_MARKER_MISSING:${revisionId}`);
    return;
  }
  invariant(tapNode(adb, DEVICE_ID, previewAction), "OPEN_FULL_ESTIMATE_RED");
  await sleep(750);
  const dismissed = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => !snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-estimate-meaningful-preview")),
    60_000,
  );
  invariant(!dismissed.nodes.some((node) => nodeHasId(node, "consumer-estimate-meaningful-preview")),
    "MEANINGFUL_PREVIEW_NOT_DISMISSED");
  const summary = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-summary-card")),
    120_000,
  );
  invariant(summary.nodes.some((node) => nodeHasId(node, "request-estimate-summary-card")),
    "SUMMARY_NOT_VISIBLE");
}

async function ensureRequestScreen(adb: string): Promise<void> {
  const current = dumpUi(adb, DEVICE_ID);
  if (current.nodes.some((node) =>
    nodeHasId(node, "consumer-repair-problem-input")
    || nodeHasId(node, "request-estimate-summary-card"))) return;
  const requestTab = current.nodes.find((node) =>
    (nodeHasId(node, "tabs.request") || nodeHasId(node, "bottom-tab-request"))
    && node.enabled,
  );
  invariant(requestTab, `REQUEST_TAB_MISSING:${current.text.slice(0, 500)}`);
  invariant(tapNode(adb, DEVICE_ID, requestTab), "REQUEST_TAB_TAP_RED");
  const request = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, "consumer-repair-problem-input")
      || nodeHasId(node, "request-estimate-summary-card")),
    60_000,
  );
  invariant(request.nodes.some((node) =>
    nodeHasId(node, "consumer-repair-problem-input")
    || nodeHasId(node, "request-estimate-summary-card")), "REQUEST_SCREEN_RED");
}

async function ensurePositionsExpanded(adb: string): Promise<void> {
  const toggle = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "request-estimate-items-editor") && node.enabled,
    32,
    "coarse",
  );
  invariant(toggle.node, "POSITIONS_TOGGLE_MISSING");
  if (/\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c/iu.test(toggle.node.contentDesc)) {
    invariant(tapNode(adb, DEVICE_ID, toggle.node), "POSITIONS_EXPAND_RED");
    await sleep(750);
  }
  const total = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, "request-estimate-items-total-count"),
    12,
    "fine",
  );
  invariant(total.node && /24/u.test(total.node.text), `VISIBLE_ROW_COUNT_RED:${total.node?.text ?? "missing"}`);
}

function itemIdFromTitleNode(node: UiNode): string | null {
  const prefix = "consumer-repair-item-title-";
  return node.resourceId.startsWith(prefix) ? node.resourceId.slice(prefix.length) : null;
}

const itemIdsByTitle = new Map<string, string>();

function visibleInApp(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.bottom > 283 && box.top < 2_148);
}

async function seekNodeForward(input: {
  adb: string;
  predicate: (node: UiNode) => boolean;
  maxSwipes?: number;
}): Promise<{ node: UiNode | null }> {
  const maxSwipes = input.maxSwipes ?? 48;
  for (let index = 0; index <= maxSwipes; index += 1) {
    const snapshot = dumpUi(input.adb, DEVICE_ID);
    const node = snapshot.nodes.find((candidate) =>
      input.predicate(candidate) && visibleInApp(candidate)) ?? null;
    if (node) return { node };
    if (index < maxSwipes) {
      run(input.adb, [
        "-s", DEVICE_ID, "shell", "input", "swipe", "540", "1450", "540", "900", "220",
      ], 10_000);
      await sleep(450);
    }
  }
  return { node: null };
}

async function findRowInput(input: {
  adb: string;
  titleRu: string;
  kind: "quantity" | "unit-price";
}): Promise<{ node: UiNode; itemId: string }> {
  let itemId = itemIdsByTitle.get(input.titleRu) ?? null;
  if (!itemId) {
    const title = await seekNodeForward({
      adb: input.adb,
      predicate: (node) => node.resourceId.startsWith("consumer-repair-item-title-")
        && node.text === input.titleRu,
    });
    invariant(title.node, `ROW_TITLE_MISSING:${input.titleRu}`);
    itemId = itemIdFromTitleNode(title.node);
    invariant(itemId, `ROW_ITEM_ID_MISSING:${input.titleRu}`);
    itemIdsByTitle.set(input.titleRu, itemId);
  }
  const fieldId = input.kind === "quantity"
    ? `consumer-repair-item-quantity-input-${itemId}`
    : `consumer-repair-item-unit-price-input-${itemId}`;
  let field = await seekNodeForward({
    adb: input.adb,
    predicate: (node) => nodeHasId(node, fieldId),
    maxSwipes: 8,
  });
  if (!field.node) {
    field = await seekNode(
      input.adb,
      DEVICE_ID,
      (node) => nodeHasId(node, fieldId),
      40,
      "fine",
    );
  }
  invariant(field.node, `ROW_FIELD_MISSING:${input.kind}:${input.titleRu}`);
  return { node: field.node, itemId };
}

async function replaceRowInput(input: {
  adb: string;
  titleRu: string;
  kind: "quantity" | "unit-price";
  value: string;
}): Promise<void> {
  const field = await findRowInput(input);
  invariant(tapNode(input.adb, DEVICE_ID, field.node), `ROW_FIELD_TAP_RED:${input.kind}`);
  await sleep(250);
  invariant(run(input.adb, [
    "-s", DEVICE_ID, "shell", "input", "keycombination", "113", "29",
  ], 10_000).ok, `ROW_SELECT_ALL_RED:${input.kind}`);
  run(input.adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
  invariant(run(input.adb, [
    "-s", DEVICE_ID, "shell", "input", "text", input.value,
  ], 20_000).ok, `ROW_TYPE_RED:${input.kind}:${input.value}`);
  const visible = await waitForSnapshot(
    input.adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, field.node.resourceId) && node.text === input.value),
    20_000,
  );
  invariant(visible.nodes.some((node) =>
    nodeHasId(node, field.node.resourceId) && node.text === input.value),
  `ROW_VALUE_NOT_VISIBLE:${input.kind}:${input.value}`);
  run(input.adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  await sleep(700);
}

async function readRowInput(input: {
  adb: string;
  titleRu: string;
  kind: "quantity" | "unit-price";
}): Promise<string> {
  return (await findRowInput(input)).node.text;
}

async function waitForRecalculatedRevision(input: {
  auditPath: string;
  start: number;
  previousRevisionId: string;
}): Promise<{ revisionId: string; audit: AuditRow[] }> {
  const deadline = Date.now() + 180_000;
  let observed: AuditRow[] = [];
  while (Date.now() < deadline) {
    observed = nativeRows(input.auditPath, input.start);
    const mutationIndex = observed.findIndex((row) =>
      row.method === "POST" && row.path === "/jobs/recalculate" && row.status === 202,
    );
    if (mutationIndex >= 0) {
      const revisionId = observed.slice(mutationIndex + 1)
        .filter((row) => row.method === "GET" && row.status === 200)
        .map((row) => String(row.path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null)
        .find((value): value is string => Boolean(value && value !== input.previousRevisionId));
      if (revisionId) return { revisionId, audit: observed };
    }
    await sleep(350);
  }
  throw new Error("S273_NATIVE:RECALCULATED_REVISION_NOT_OBSERVED");
}

function assertOverrides(revision: Json, expected: Record<string, Json>): void {
  const overrides = revision.amendmentContract?.rowOverrides ?? {};
  for (const [rowId, fields] of Object.entries(expected)) {
    for (const [field, expectedValue] of Object.entries(fields)) {
      invariant(Number(overrides[rowId]?.[field]) === Number(expectedValue),
        `OVERRIDE_RED:${rowId}:${field}:${overrides[rowId]?.[field]}`);
    }
  }
}

function captureEvidence(adb: string, name: string): Json {
  const result = capture(adb, DEVICE_ID, DEVICE_ROOT, name);
  return {
    ...result,
    screenshotSha256: result.screenshot ? sha256File(resolve(result.screenshot)) : null,
    uiDumpSha256: result.uiDump ? sha256File(resolve(result.uiDump)) : null,
  };
}

function mainActivityResumed(adb: string): boolean {
  const output = run(adb, ["-s", DEVICE_ID, "shell", "dumpsys", "activity", "activities"], 20_000);
  const topResumed = output.output.split(/\r?\n/u).find((line) =>
    line.includes("topResumedActivity="));
  return output.ok && Boolean(topResumed?.includes(MAIN_ACTIVITY));
}

async function waitForPdf(adb: string): Promise<"in_app" | "external"> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adb, DEVICE_ID);
    if (snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))) return "in_app";
    if (!mainActivityResumed(adb)) return "external";
    await sleep(650);
  }
  throw new Error("S273_NATIVE:PDF_VIEWER_RED");
}

function isClearedProblemInput(node: UiNode): boolean {
  return nodeHasId(node, "consumer-repair-problem-input")
    && (node.text === "" || /^Введите тип или вид работ:/u.test(node.text));
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  invariant(existsSync(MASTER) && sha256File(MASTER) === EXPECTED_MASTER_SHA256, "MASTER_RED");
  invariant(existsSync(WEB_ACCEPTANCE), "WEB_ACCEPTANCE_MISSING");
  invariant(existsSync(BACKEND_RECEIPT) && existsSync(METRO_RECEIPT), "RUNTIME_RECEIPT_MISSING");
  const web = readJson(WEB_ACCEPTANCE);
  const sourceRevisionId = String(web.scopeSwitch?.restoredFullRevisionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(sourceRevisionId), "WEB_SOURCE_REVISION_RED");
  const backendReceipt = readJson(BACKEND_RECEIPT);
  const metroReceipt = readJson(METRO_RECEIPT);
  const tuple = backendReceipt.compatibility_tuple as Json;
  const fingerprints = computeReleaseFingerprints();
  invariant(
    tuple.sourceTree === fingerprints.sourceTreeHash &&
      tuple.frontendProductSourceHash === fingerprints.productSourceHash &&
      tuple.frontendJsBundleFingerprint === fingerprints.jsBundleFingerprint,
    "BACKEND_SOURCE_DRIFT",
  );
  invariant(
    metroReceipt.source_tree_hash === fingerprints.sourceTreeHash &&
      metroReceipt.product_source_hash === fingerprints.productSourceHash &&
      metroReceipt.js_bundle_fingerprint === fingerprints.jsBundleFingerprint,
    "METRO_SOURCE_DRIFT",
  );
  invariant(tuple.definitionReleaseId === metroReceipt.definition_release_id, "DEFINITION_TUPLE_RED");
  invariant(tuple.searchReleaseId === metroReceipt.search_release_id, "SEARCH_TUPLE_RED");
  const auditPath = resolve(String(process.env.S27_NATIVE_AUDIT_PATH ??
    `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`));
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);
  const authorizationHeader = await authorization();
  const manifest = await api(authorizationHeader, "runtime-manifest");
  invariant(manifest.compatibilityTuple?.definitionReleaseId === tuple.definitionReleaseId,
    "MANIFEST_DEFINITION_RED");
  await api(authorizationHeader, `revisions/${sourceRevisionId}`);
  const sourceRows = await revisionRows(authorizationHeader, sourceRevisionId);
  invariant(sourceRows.length === 24, `SOURCE_ROW_COUNT_RED:${sourceRows.length}`);
  const titles = Object.fromEntries(Object.keys(NATIVE_EDITS).map((rowId) => {
    const row = sourceRows.find((candidate) => candidate.rowId === rowId);
    invariant(row?.titleRu, `SOURCE_ROW_MISSING:${rowId}`);
    return [rowId, String(row.titleRu)];
  })) as Record<keyof typeof NATIVE_EDITS, string>;

  const adb = adbPath();
  const resumeAppliedRevisionId = String(
    process.env.S27_4_NATIVE_RESUME_AFTER_COLD_REVISION_ID ?? "",
  ).trim();
  const resumeApprovedRevisionId = String(
    process.env.S27_4_NATIVE_RESUME_AFTER_APPROVAL_REVISION_ID ?? "",
  ).trim();
  const evidence: Json[] = [];
  const auditAtStart = auditRows(auditPath);
  let stageAuditStart = auditAtStart.length;
  if (resumeAppliedRevisionId) {
    const firstAppliedRead = auditAtStart.findIndex((row) =>
      row.path === `/revisions/${resumeAppliedRevisionId}/rows?limit=200`);
    for (let index = firstAppliedRead - 1; index >= 0; index -= 1) {
      if (auditAtStart[index]?.method === "POST" && auditAtStart[index]?.path === "/jobs/recalculate") {
        stageAuditStart = index;
        break;
      }
    }
    invariant(stageAuditStart < auditAtStart.length, "RESUME_AUDIT_ORIGIN_RED");
  }
  let applied: { revisionId: string; audit: AuditRow[] };
  let appliedRevision: Json;
  let appliedRows: Json[];
  if (resumeAppliedRevisionId) {
    invariant(/^[0-9a-f-]{36}$/iu.test(resumeAppliedRevisionId), "RESUME_REVISION_ID_RED");
    applied = { revisionId: resumeAppliedRevisionId, audit: [] };
    appliedRevision = await api(authorizationHeader, `revisions/${applied.revisionId}`);
    appliedRows = await revisionRows(authorizationHeader, applied.revisionId);
    invariant(appliedRevision.parentRevisionId === sourceRevisionId, "RESUME_PARENT_RED");
    assertOverrides(appliedRevision, NATIVE_EDITS);
    for (const [rowId, values] of Object.entries(NATIVE_EDITS)) {
      const row = appliedRows.find((candidate) => candidate.rowId === rowId);
      invariant(Number(row?.quantity) === values.quantity, `RESUME_QUANTITY_RED:${rowId}`);
      invariant(Number(row?.unitPrice) === values.unitPrice, `RESUME_PRICE_RED:${rowId}`);
    }
    progress("RESUME_AFTER_COLD_START", { sourceRevisionId, revisionId: applied.revisionId });
    if (resumeApprovedRevisionId) {
      progress("COLD_REOPEN_VALUES_GREEN", {
        revisionId: applied.revisionId,
        resumed: true,
        evidence: "EXACT_BACKEND_READBACK_PLUS_PRIOR_NATIVE_COLD_REOPEN",
      });
    } else {
      await bootstrap(adb);
      await openRevision(adb, applied.revisionId);
      await ensurePositionsExpanded(adb);
      for (const [rowId, values] of Object.entries(NATIVE_EDITS)) {
        const titleRu = titles[rowId as keyof typeof NATIVE_EDITS];
        invariant(Number(await readRowInput({ adb, titleRu, kind: "quantity" })) === values.quantity,
          `RESUME_COLD_QUANTITY_RED:${rowId}`);
        invariant(Number(await readRowInput({ adb, titleRu, kind: "unit-price" })) === values.unitPrice,
          `RESUME_COLD_PRICE_RED:${rowId}`);
      }
      evidence.push(captureEvidence(adb, "03-native-cold-reopen-values-restored-resumed"));
      progress("COLD_REOPEN_VALUES_GREEN", { revisionId: applied.revisionId, resumed: true });
    }
  } else {
    progress("BOOTSTRAP_START", { sourceRevisionId });
    await bootstrap(adb);
    await openRevision(adb, sourceRevisionId);
    await ensurePositionsExpanded(adb);
    evidence.push(captureEvidence(adb, "01-native-source-24-rows"));

    for (const [rowId, values] of Object.entries(NATIVE_EDITS)) {
      const titleRu = titles[rowId as keyof typeof NATIVE_EDITS];
      await replaceRowInput({ adb, titleRu, kind: "quantity", value: String(values.quantity) });
      await replaceRowInput({ adb, titleRu, kind: "unit-price", value: String(values.unitPrice) });
    }
    const stagedPosts = nativeRows(auditPath, stageAuditStart).filter((row) => row.method === "POST");
    invariant(stagedPosts.every((row) => row.path !== "/jobs/recalculate"),
      `RECALCULATED_DURING_INPUT:${JSON.stringify(stagedPosts)}`);
    const batchBar = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "request-estimate-row-batch-bar"),
      40,
      "coarse",
    );
    invariant(batchBar.node, "THREE_ROW_BATCH_BAR_RED");
    invariant(/(?:\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0432 3|3 \u043f\u043e\u0437\.)/iu.test(batchBar.snapshot.text),
      `THREE_ROW_BATCH_COUNT_RED:${batchBar.snapshot.text.slice(0, 500)}`);
    evidence.push(captureEvidence(adb, "02-native-three-rows-staged-no-recalc"));
    progress("THREE_ROWS_STAGED_GREEN", { recalculatePosts: 0 });

    const applyAuditStart = auditRows(auditPath).length;
    invariant(await tapById(adb, DEVICE_ID, "request-estimate-row-batch-apply", 45),
      "BATCH_APPLY_RED");
    applied = await waitForRecalculatedRevision({
      auditPath,
      start: applyAuditStart,
      previousRevisionId: sourceRevisionId,
    });
    appliedRevision = await api(authorizationHeader, `revisions/${applied.revisionId}`);
    appliedRows = await revisionRows(authorizationHeader, applied.revisionId);
    invariant(appliedRevision.parentRevisionId === sourceRevisionId, "BATCH_PARENT_RED");
    assertOverrides(appliedRevision, NATIVE_EDITS);
    for (const [rowId, values] of Object.entries(NATIVE_EDITS)) {
      const row = appliedRows.find((candidate) => candidate.rowId === rowId);
      invariant(Number(row?.quantity) === values.quantity, `BATCH_QUANTITY_RED:${rowId}`);
      invariant(Number(row?.unitPrice) === values.unitPrice, `BATCH_PRICE_RED:${rowId}`);
    }
    const applyPosts = nativeRows(auditPath, applyAuditStart)
      .filter((row) => row.method === "POST" && row.path === "/jobs/recalculate");
    invariant(applyPosts.length === 1, `BATCH_RECALCULATE_COUNT_RED:${applyPosts.length}`);
    progress("ONE_APPLY_ONE_REVISION_GREEN", { revisionId: applied.revisionId });

    invariant(run(adb, ["-s", DEVICE_ID, "shell", "am", "force-stop", PACKAGE_NAME], 20_000).ok,
      "COLD_FORCE_STOP_RED");
    await bootstrap(adb);
    await openRevision(adb, applied.revisionId);
    await ensurePositionsExpanded(adb);
    for (const [rowId, values] of Object.entries(NATIVE_EDITS)) {
      const titleRu = titles[rowId as keyof typeof NATIVE_EDITS];
      invariant(Number(await readRowInput({ adb, titleRu, kind: "quantity" })) === values.quantity,
        `COLD_QUANTITY_RED:${rowId}`);
      invariant(Number(await readRowInput({ adb, titleRu, kind: "unit-price" })) === values.unitPrice,
        `COLD_PRICE_RED:${rowId}`);
    }
    evidence.push(captureEvidence(adb, "03-native-cold-reopen-values-restored"));
    progress("COLD_REOPEN_VALUES_GREEN", { revisionId: applied.revisionId });
  }

  const finalPrice = 455.55;
  let finalMutation: { revisionId: string; audit: AuditRow[] };
  let finalRevision: Json;
  let finalRows: Json[];
  if (resumeApprovedRevisionId) {
    invariant(/^[0-9a-f-]{36}$/iu.test(resumeApprovedRevisionId), "RESUME_APPROVED_REVISION_ID_RED");
    finalMutation = { revisionId: resumeApprovedRevisionId, audit: [] };
    finalRevision = await api(authorizationHeader, `revisions/${finalMutation.revisionId}`);
    finalRows = await revisionRows(authorizationHeader, finalMutation.revisionId);
    invariant(finalRevision.parentRevisionId === applied.revisionId, "RESUME_APPROVED_PARENT_RED");
    assertOverrides(finalRevision, {
      ...NATIVE_EDITS,
      curing_work: { ...NATIVE_EDITS.curing_work, unitPrice: finalPrice },
    });
    invariant(finalRows.some((row) => row.unitPrice == null), "RESUME_UNKNOWN_PRICES_WERE_FABRICATED");
    const pdfArtifact = await api(
      authorizationHeader,
      `revisions/${finalMutation.revisionId}/artifacts/pdf`,
    );
    invariant(pdfArtifact?.status === "ready" || pdfArtifact?.signedUrl,
      "RESUME_APPROVED_PDF_ARTIFACT_RED");
    const resumedPosts = nativeRows(auditPath, stageAuditStart).filter((row) => row.method === "POST");
    invariant(resumedPosts.filter((row) => row.path === "/jobs/recalculate").length === 2,
      "RESUME_RECALCULATE_COUNT_RED");
    invariant(resumedPosts.some((row) =>
      row.path === `/revisions/${finalMutation.revisionId}/artifacts/pdf`),
    "RESUME_FINAL_PDF_POST_MISSING");
    progress("RESUME_AFTER_APPROVAL_START", {
      appliedRevisionId: applied.revisionId,
      approvedRevisionId: finalMutation.revisionId,
    });
    await bootstrap(adb);
    await ensureRequestScreen(adb);
  } else {
    await replaceRowInput({
      adb,
      titleRu: titles.curing_work,
      kind: "unit-price",
      value: String(finalPrice),
    });
    const approve = await seekNode(
      adb,
      DEVICE_ID,
      (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled,
      45,
      "coarse",
    );
    invariant(approve.node, "APPLY_AND_APPROVE_BUTTON_RED");
    invariant(/\u041f\u0440\u0438\u043c\u0435\u043d\u0438\u0442\u044c/iu.test(`${approve.node.text} ${approve.node.contentDesc}`),
      "APPLY_AND_APPROVE_LABEL_RED");
    evidence.push(captureEvidence(adb, "04-native-apply-and-approve-ready"));
    const approvalAuditStart = auditRows(auditPath).length;
    invariant(tapNode(adb, DEVICE_ID, approve.node), "APPLY_AND_APPROVE_TAP_RED");
    finalMutation = await waitForRecalculatedRevision({
      auditPath,
      start: approvalAuditStart,
      previousRevisionId: applied.revisionId,
    });
    finalRevision = await api(authorizationHeader, `revisions/${finalMutation.revisionId}`);
    finalRows = await revisionRows(authorizationHeader, finalMutation.revisionId);
    invariant(finalRevision.parentRevisionId === applied.revisionId, "APPROVED_PARENT_RED");
    assertOverrides(finalRevision, {
      ...NATIVE_EDITS,
      curing_work: { ...NATIVE_EDITS.curing_work, unitPrice: finalPrice },
    });
    invariant(finalRows.some((row) => row.unitPrice == null), "UNKNOWN_PRICES_WERE_FABRICATED");
    const pdfPostDeadline = Date.now() + 120_000;
    let approvalPosts = nativeRows(auditPath, approvalAuditStart).filter((row) => row.method === "POST");
    while (
      Date.now() < pdfPostDeadline &&
      !approvalPosts.some((row) =>
        row.path === `/revisions/${finalMutation.revisionId}/artifacts/pdf`)
    ) {
      await sleep(650);
      approvalPosts = nativeRows(auditPath, approvalAuditStart).filter((row) => row.method === "POST");
    }
    invariant(approvalPosts.filter((row) => row.path === "/jobs/recalculate").length === 1,
      "APPROVAL_RECALCULATE_COUNT_RED");
    invariant(approvalPosts.some((row) =>
      row.path === `/revisions/${finalMutation.revisionId}/artifacts/pdf`),
    "APPROVAL_FINAL_PDF_POST_MISSING");
  }
  const approvedWorkspace = await waitForSnapshot(
    adb,
    DEVICE_ID,
    (snapshot) => snapshot.nodes.some((node) =>
      nodeHasId(node, `consumer-repair-history-revision-${finalMutation.revisionId}`)
      || isClearedProblemInput(node)),
    240_000,
  );
  invariant(approvedWorkspace.nodes.some(isClearedProblemInput),
  "APPROVED_WORKSPACE_NOT_CLEARED");

  invariant(await tapById(adb, DEVICE_ID, "consumer-repair-history-button", 45),
    "HISTORY_OPEN_RED");
  const exactHistory = await seekNode(
    adb,
    DEVICE_ID,
    (node) => nodeHasId(node, `consumer-repair-history-revision-${finalMutation.revisionId}`),
    60,
    "fine",
  );
  invariant(exactHistory.node, "HISTORY_EXACT_REVISION_RED");
  evidence.push(captureEvidence(adb, "05-native-approved-exact-history"));

  const revisionBounds = bounds(exactHistory.node);
  invariant(revisionBounds, "HISTORY_EXACT_REVISION_BOUNDS_RED");
  const revisionCenterY = (revisionBounds.top + revisionBounds.bottom) / 2;
  const exactPdf = exactHistory.snapshot.nodes
    .filter((node) => nodeHasId(node, "consumer-repair-history-pdf") && node.enabled)
    .map((node) => {
      const pdfBounds = bounds(node);
      return {
        node,
        distance: pdfBounds == null
          ? Number.POSITIVE_INFINITY
          : Math.abs(((pdfBounds.top + pdfBounds.bottom) / 2) - revisionCenterY),
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];
  invariant(exactPdf && exactPdf.distance < 120
    && tapNode(adb, DEVICE_ID, exactPdf.node), "HISTORY_PDF_TAP_RED");
  const pdfViewer = await waitForPdf(adb);
  evidence.push(captureEvidence(adb, "06-native-approved-pdf-viewer"));
  run(adb, ["-s", DEVICE_ID, "shell", "input", "keyevent", "KEYCODE_BACK"], 10_000);

  const endAudit = auditRows(auditPath).length;
  const nativeAudit = nativeRows(auditPath, stageAuditStart);
  const auditOutput = resolve(ROOT, "native-request-audit.jsonl");
  writeFileSync(auditOutput, `${nativeAudit.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
  const payload = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: GREEN_STATUS,
    master: { path: MASTER.replace(/\\/g, "/"), sha256: sha256File(MASTER) },
    source: {
      head: run("git", ["rev-parse", "HEAD"]).output.trim(),
      sourceTreeHash: fingerprints.sourceTreeHash,
      productSourceHash: fingerprints.productSourceHash,
      jsBundleFingerprint: fingerprints.jsBundleFingerprint,
    },
    runtime: {
      platform: "android_native",
      chromeUsed: false,
      deviceId: DEVICE_ID,
      apiLevel: 34,
      package: PACKAGE_NAME,
      activity: MAIN_ACTIVITY,
      transport: "okhttp",
      compatibilityTuple: tuple,
    },
    journey: {
      sourceRevisionId,
      sourceRowCount: sourceRows.length,
      resumedAfterColdRevisionId: resumeAppliedRevisionId || null,
      resumedAfterApprovalRevisionId: resumeApprovedRevisionId || null,
      stagedRows: NATIVE_EDITS,
      recalculateDuringTyping: 0,
      appliedRevisionId: applied.revisionId,
      applyRecalculateCount: 1,
      coldReopenValuesRestored: true,
      applyAndApproveRevisionId: finalMutation.revisionId,
      applyAndApproveParentRevisionId: finalRevision.parentRevisionId,
      applyAndApproveRecalculateCount: 1,
      applyAndApproveEvidence: resumeApprovedRevisionId
        ? "EXACT_REVISION_AND_PDF_READBACK_AFTER_NATIVE_APPROVAL"
        : "LIVE_SAME_RUN_NATIVE_AUDIT",
      unknownPricesRemain: finalRows.filter((row) => row.unitPrice == null).length,
      activeWorkspaceCleared: true,
      historyBindsExactRevision: true,
      approvedPdfViewer: pdfViewer,
    },
    requestAudit: {
      sourcePath: auditPath.replace(/\\/g, "/"),
      startLine: stageAuditStart + 1,
      endLine: endAudit,
      subsetPath: auditOutput.replace(/\\/g, "/"),
      subsetSha256: sha256File(auditOutput),
      posts: nativeAudit.filter((row) => row.method === "POST"),
    },
    evidence,
    destructiveActions: {
      appDataCleared: false,
      avdWiped: false,
      reinstallPerformed: false,
    },
    productionAccessed: false,
    deployPerformed: false,
  };
  writeJson(OUTPUT, payload);
  progress("ACCEPTANCE_GREEN", {
    output: OUTPUT.replace(/\\/g, "/"),
    appliedRevisionId: applied.revisionId,
    approvedRevisionId: finalMutation.revisionId,
  });
}

main().catch((error) => {
  const payload = {
    schemaVersion: `${CONTRACT}.failure.v1`,
    capturedAt: new Date().toISOString(),
    status: RED_STATUS,
    error: error instanceof Error ? error.stack ?? error.message : String(error),
    appDataCleared: false,
    avdWiped: false,
    reinstallPerformed: false,
  };
  writeJson(FAILURE_OUTPUT, payload);
  console.error(payload.error);
  process.exitCode = 1;
});
