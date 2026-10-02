import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "../e2e/androidDeepLinkLaunchContract";
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

type Json = Record<string, any>;
type AuditRow = { method?: string; path?: string; status?: number; userAgent?: string };

const DEVICE = "emulator-5554";
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const PORT = 8101;
const BACKEND = "http://127.0.0.1:8765/canonical-estimate";
const RELEASE = "4cbbd414-48d6-5e1b-ae35-0db75e568eb1";
const SEARCH_RELEASE = "43203007-2129-5862-a063-0f27d7b64a7b";
const CATALOG = "canonical-work:expanded:strip_foundation";
const SOURCE_REVISION = "982a93d4-edf4-45ee-8074-a1a65a8ef65d";
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (55).md");
const MASTER_SHA256 = "8f354905ca67e93d8c4383d90d1c59d6ba060db6363fe255afa3c51a0fecece5";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const ROOT = resolve(".release-runtime/r568/s27-15/acceptance/android-native-strip-foundation-150-full");
const DEVICE_ROOT = resolve(ROOT, "device");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_15_ANDROID:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function run(command: string, args: string[], timeoutMs = 30_000): string {
  return execFileSync(command, args, {
    cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs,
  });
}

function git(...args: string[]): string {
  return run("git", args).trim();
}

function audit(path: string): AuditRow[] {
  try {
    return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRow);
  } catch {
    return [];
  }
}

function progress(stage: string, details: Json = {}): void {
  const value = { capturedAt: new Date().toISOString(), stage, ...details };
  atomicJson(resolve(ROOT, "progress.json"), value);
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function token(): Promise<string> {
  const credentials = json(CREDENTIALS);
  const principals = credentials.principals as Json[];
  const consumer = principals.find((row) => row.role === "consumer");
  invariant(consumer?.email && consumer?.password, "LOCAL_CONSUMER_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json() as Json;
  invariant(response.ok && body.access_token, `LOGIN_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function api(path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: await token() }, signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body;
}

async function rows(revisionId: string): Promise<Json[]> {
  const body = await api(`revisions/${revisionId}/rows?limit=200`);
  return Array.isArray(body.rows) ? body.rows : [];
}

function adbPath(): string {
  const candidate = run("where.exe", ["adb"]).split(/\r?\n/u).find(Boolean)?.trim();
  invariant(candidate && existsSync(candidate), "ADB_MISSING");
  return candidate;
}

async function bootstrap(adb: string): Promise<void> {
  setupAndroidRuntime(PORT, PACKAGE, { clearAppState: false, reversePorts: [8765, 54321, 54329] });
  run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, buildDevClientUri(PORT), PACKAGE), 45_000);
  const ready = await waitForSnapshot(adb, DEVICE, (snapshot) =>
    snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))
    && snapshot.nodes.some((node) => nodeHasId(node, "tabs.request")), 180_000);
  invariant(ready.nodes.some((node) => nodeHasId(node, "app-bottom-nav")), "DEV_CLIENT_NOT_READY");
}

async function openRevision(adb: string, revisionId: string, launch: string): Promise<UiSnapshot> {
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", revisionId);
  uri.searchParams.set("launchId", launch);
  run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, uri.toString(), PACKAGE), 45_000);
  const preview = await waitForSnapshot(adb, DEVICE, (snapshot) => snapshot.nodes.some((node) =>
    nodeHasId(node, "request-estimate-row-count") && /63/u.test(node.text)), 180_000);
  invariant(preview.nodes.some((node) => nodeHasId(node, "request-estimate-row-count") && /63/u.test(node.text)),
    `REVISION_63_NOT_VISIBLE:${revisionId}`);
  if (preview.nodes.some((node) => nodeHasId(node, "consumer-estimate-open-full-estimate"))) {
    invariant(await tapById(adb, DEVICE, "consumer-estimate-open-full-estimate", 8), "OPEN_FULL_RED");
  }
  const full = await waitForSnapshot(adb, DEVICE, (snapshot) => snapshot.nodes.some((node) =>
    nodeHasId(node, "request-estimate-row-count") && /63/u.test(node.text)), 30_000);
  invariant(full.nodes.some((node) => nodeHasId(node, "request-estimate-row-count") && /63/u.test(node.text)),
    "FULL_63_NOT_VISIBLE");
  return full;
}

function visible(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(box && box.bottom > 140 && box.top < 2148);
}

function contains(child: UiNode, parent: UiNode): boolean {
  const a = bounds(child); const b = bounds(parent);
  return Boolean(a && b && a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom);
}

function inputWithin(snapshot: UiSnapshot, editor: UiNode): UiNode | null {
  const inputs = snapshot.nodes.filter((node) => nodeHasId(node, "editable-param-popover-input"));
  return inputs.find((node) => contains(node, editor)) ?? (inputs.length === 1 ? inputs[0] : null);
}

async function parameterInput(adb: string, id: string, maxSwipes = 40): Promise<UiNode | null> {
  const found = await seekNode(adb, DEVICE,
    (node) => nodeHasId(node, `editable-param-inline-editor-${id}`), maxSwipes, "coarse");
  const input = found.node ? inputWithin(found.snapshot, found.node) : null;
  return input && visible(input) ? input : null;
}

async function fastScrollToStart(adb: string): Promise<void> {
  for (let index = 0; index < 48; index += 1) {
    run(adb, ["-s", DEVICE, "shell", "input", "swipe", "540", "500", "540", "1900", "70"], 5_000);
  }
  await sleep(500);
}

async function ensureParametersOpen(adb: string, id: string): Promise<void> {
  const immediate = dumpUi(adb, DEVICE);
  if (immediate.nodes.some((node) => nodeHasId(node, `editable-param-inline-editor-${id}`))) return;
  await fastScrollToStart(adb);
  const positions = await seekNode(adb, DEVICE,
    (node) => nodeHasId(node, "request-estimate-items-editor") && node.enabled, 12, "coarse");
  if (positions.node && /hide|скрыть/iu.test(`${positions.node.text} ${positions.node.contentDesc}`)) {
    invariant(tapNode(adb, DEVICE, positions.node), "COLLAPSE_POSITIONS_RED");
    await sleep(500);
  }
  invariant(await tapById(adb, DEVICE, "request-estimate-parameters-toggle", 12), "PARAMETER_TOGGLE_MISSING");
  await sleep(600);
  if (await parameterInput(adb, id, 16)) return;
  if (await tapById(adb, DEVICE, "request-estimate-filled-parameters-toggle", 18)) {
    await sleep(600);
    if (await parameterInput(adb, id, 24)) return;
  }
  throw new Error(`S27_15_ANDROID:PARAMETER_PANEL_MISSING:${id}`);
}

async function readParameter(adb: string, id: string): Promise<string | null> {
  await ensureParametersOpen(adb, id);
  return (await parameterInput(adb, id))?.text ?? null;
}

async function replaceParameter(adb: string, id: string, value: string): Promise<void> {
  await ensureParametersOpen(adb, id);
  const input = await parameterInput(adb, id);
  invariant(input && tapNode(adb, DEVICE, input), `PARAMETER_INPUT_MISSING:${id}`);
  await sleep(250);
  run(adb, ["-s", DEVICE, "shell", "input", "keycombination", "113", "29"]);
  run(adb, ["-s", DEVICE, "shell", "input", "keyevent", "KEYCODE_DEL"]);
  run(adb, ["-s", DEVICE, "shell", "input", "text", value]);
  const changed = await waitForSnapshot(adb, DEVICE, (snapshot) => snapshot.nodes.some((node) =>
    nodeHasId(node, "editable-param-popover-input") && node.text === value), 15_000);
  invariant(changed.nodes.some((node) => nodeHasId(node, "editable-param-popover-input") && node.text === value),
    `PARAMETER_VALUE_RED:${id}:${value}`);
  run(adb, ["-s", DEVICE, "shell", "input", "keyevent", "KEYCODE_BACK"]);
  await sleep(500);
}

function revisionFromPath(path: string | undefined): string | null {
  return String(path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1] ?? null;
}

async function waitForRecalculate(auditPath: string, start: number): Promise<{ revisionId: string; subset: AuditRow[] }> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const subset = audit(auditPath).slice(start);
    const mutation = subset.findIndex((row) => row.method === "POST" && row.path === "/jobs/recalculate"
      && row.status === 202 && String(row.userAgent ?? "").startsWith("okhttp/"));
    const revisionId = mutation >= 0 ? subset.slice(mutation + 1).filter((row) => row.method === "GET"
      && row.status === 200 && String(row.userAgent ?? "").startsWith("okhttp/"))
      .map((row) => revisionFromPath(row.path)).filter((id): id is string => Boolean(id && id !== SOURCE_REVISION)).at(-1) : null;
    if (revisionId) return { revisionId, subset };
    await sleep(500);
  }
  throw new Error("S27_15_ANDROID:RECALCULATE_NOT_OBSERVED");
}

function assertRevision(revision: Json, revisionRows: Json[], width: number, concrete: number): Json {
  invariant(revision.catalogId === CATALOG && revision.releaseId === RELEASE, "REVISION_IDENTITY_RED");
  invariant(revisionRows.length === 63, `ROW_COUNT_RED:${revisionRows.length}`);
  invariant(Number(revision.parameters?.total_axis_length_m) === 150, "LENGTH_RED");
  invariant(Number(revision.parameters?.strip_width_m) === width, `WIDTH_RED:${revision.parameters?.strip_width_m}`);
  const concreteRow = revisionRows.find((row) => row.rowId === "main_concrete");
  const wire = revisionRows.find((row) => row.rowId === "binding_wire");
  invariant(concreteRow, "MAIN_CONCRETE_ROW_MISSING");
  invariant(wire, "BINDING_WIRE_ROW_MISSING");
  invariant(Number(concreteRow.quantity) === concrete, `CONCRETE_RED:${concreteRow.quantity}`);
  invariant(Number(wire.unitPrice) === 123.45, `WIRE_PRICE_NOT_PRESERVED:${wire.unitPrice}`);
  const priced = revisionRows.filter((row) => row.unitPrice != null);
  invariant(priced.length === 10, `EXPLICIT_FIXTURE_PRICE_COUNT_RED:${priced.length}`);
  return { revisionId: revision.revisionId, parentRevisionId: revision.parentRevisionId, rowCount: revisionRows.length,
    widthM: revision.parameters.strip_width_m, mainConcreteM3: concreteRow.quantity,
    bindingWireUnitPrice: wire.unitPrice, explicitPriceCount: priced.length };
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  invariant(sha256(readFileSync(MASTER)) === MASTER_SHA256, "MASTER_HASH_RED");
  const backend = json(BACKEND_RECEIPT);
  const tuple = backend.compatibility_tuple as Json;
  invariant(tuple.definitionReleaseId === RELEASE && tuple.searchReleaseId === SEARCH_RELEASE, "RUNTIME_TUPLE_RED");
  invariant(await isMetroReachable(PORT), "METRO_RED");
  const auditPath = resolve(`.release-runtime/r568/runtime/local-developer-current/runtime/backend-${String(tuple.sourceTree).slice(0, 12)}/request-audit.jsonl`);
  invariant(existsSync(auditPath), "AUDIT_MISSING");
  const source = await api(`revisions/${SOURCE_REVISION}`);
  const sourceRows = await rows(SOURCE_REVISION);
  const sourceTruth = assertRevision(source, sourceRows, 0.85, 275.4);
  const adb = adbPath();
  await bootstrap(adb);
  await openRevision(adb, SOURCE_REVISION, `s2715-native-open-${Date.now().toString(36)}`);
  invariant((await readParameter(adb, "strip_width_m")) === "0.85", "SOURCE_WIDTH_NOT_VISIBLE");
  const evidence: Json[] = [capture(adb, DEVICE, DEVICE_ROOT, "01-native-full-63-width-0-85")];
  progress("NATIVE_OPEN_GREEN", sourceTruth);

  const auditStart = audit(auditPath).length;
  await replaceParameter(adb, "strip_width_m", "0.9");
  invariant(await tapById(adb, DEVICE, "editable-param-batch-apply", 40), "APPLY_RED");
  const mutation = await waitForRecalculate(auditPath, auditStart);
  const child = await api(`revisions/${mutation.revisionId}`);
  const childRows = await rows(mutation.revisionId);
  const childTruth = assertRevision(child, childRows, 0.9, 291.6);
  invariant(child.parentRevisionId === SOURCE_REVISION, `PARENT_RED:${child.parentRevisionId}`);
  const sourcePrices = new Map(sourceRows.filter((row) => row.unitPrice != null)
    .map((row) => [row.rowId, Number(row.unitPrice)]));
  invariant(childRows.filter((row) => row.unitPrice != null).every((row) =>
    sourcePrices.get(row.rowId) === Number(row.unitPrice)), "PRICE_CHANGED_OR_INVENTED_DURING_RECALCULATE");
  invariant((await waitForSnapshot(adb, DEVICE, (snapshot) => snapshot.nodes.some((node) =>
    nodeHasId(node, "request-estimate-row-count") && /63/u.test(node.text)), 120_000)).nodes.length > 0, "EDIT_UI_RED");
  evidence.push(capture(adb, DEVICE, DEVICE_ROOT, "02-native-edited-63-width-0-9"));
  progress("NATIVE_EDIT_GREEN", childTruth);

  run(adb, ["-s", DEVICE, "shell", "am", "force-stop", PACKAGE]);
  await bootstrap(adb);
  const coldStart = audit(auditPath).length;
  await openRevision(adb, mutation.revisionId, `s2715-native-cold-${Date.now().toString(36)}`);
  invariant((await readParameter(adb, "strip_width_m")) === "0.9", "COLD_WIDTH_RED");
  evidence.push(capture(adb, DEVICE, DEVICE_ROOT, "03-native-cold-open-63-width-0-9"));
  const coldNative = audit(auditPath).slice(coldStart).filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  invariant(coldNative.filter((row) => row.method === "POST").length === 0, "COLD_MUTATION_RED");
  const nativeMutation = mutation.subset.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/"));
  writeFileSync(resolve(ROOT, "native-request-audit.jsonl"), `${nativeMutation.map((row) => JSON.stringify(row)).join("\n")}\n`);

  const receipt: Json = {
    schemaVersion: "rik-expo-app.s27-15.strip-foundation-full.native-android.receipt.v1",
    capturedAt: new Date().toISOString(), status: "GREEN_S27_15_FULL_FOUNDATION_NATIVE_ANDROID_OPEN_EDIT_SAVE_COLD",
    master: { path: MASTER.replace(/\\/gu, "/"), sha256: MASTER_SHA256 },
    source: { branch: git("branch", "--show-current"), head: git("rev-parse", "HEAD"), sourceTreeHash: tuple.sourceTree },
    runtime: { device: DEVICE, apiLevel: 34, package: PACKAGE, transport: "okhttp", definitionReleaseId: RELEASE,
      searchReleaseId: SEARCH_RELEASE, catalogId: CATALOG, productionRequests: 0 },
    sourceRevision: sourceTruth, editedRevision: childTruth,
    assertions: { rowCount: 63, volumeChain: "150 * 0.9 * 2 = 270; 270 * 1.08 = 291.6",
      manualBindingWirePricePreserved: true, immutableParentPreserved: true, coldOpenPostCount: 0,
      noPriceChangedOrInventedDuringRecalculate: true },
    requestAudit: { sourcePath: auditPath.replace(/\\/gu, "/"), nativeRequestCount: nativeMutation.length,
      recalculatePostCount: nativeMutation.filter((row) => row.method === "POST" && row.path === "/jobs/recalculate").length,
      coldRequestCount: coldNative.length },
    evidence, deployPerformed: false, activationPerformed: false, releasePerformed: false,
  };
  receipt.receiptSha256 = sha256(JSON.stringify(receipt));
  atomicJson(resolve(ROOT, "acceptance.json"), receipt);
  progress("ACCEPTANCE_GREEN", { revisionId: mutation.revisionId, receiptSha256: receipt.receiptSha256 });
}

main().catch((error) => {
  atomicJson(resolve(ROOT, "failure.json"), { capturedAt: new Date().toISOString(), error: error instanceof Error ? error.stack : String(error) });
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
