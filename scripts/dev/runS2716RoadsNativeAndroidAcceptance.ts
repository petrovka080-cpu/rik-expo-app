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
  capture,
  dumpUi,
  nodeHasId,
  scrollToStart,
  seekNode,
  tapById,
  tapNode,
  waitForSnapshot,
  type UiNode,
  type UiSnapshot,
} from "../e2e/r4A6AndroidAcceptedUiRuntime";

type Json = Record<string, any>;
type AuditRow = { method?: string; path?: string; status?: number; userAgent?: string };

const CONTRACT = "rik-expo-app.s27-16.roads-native-android-acceptance.v1";
const DEVICE = "emulator-5554";
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const PORT = 8081;
const RELEASE_ID = "5800af1e-fe52-58e4-8484-e8a28542f761";
const SEARCH_RELEASE_ID = "3d76d2ef-ef83-5082-a8ea-c6928e56fcee";
const BACKEND_RUNTIME_RECEIPT = resolve(".release-runtime/r568/runtime/local-developer-current/backend.json");
const ROADS_RECEIPT = resolve(".release-runtime/r568/s27-16/acceptance/roads-backend/acceptance.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-16/acceptance/roads-android");
const DEVICE_ROOT = resolve(OUTPUT_ROOT, "device");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_ROADS_ANDROID:${code}`);
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
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbPath(): string {
  const candidate = run("where.exe", ["adb"]).split(/\r?\n/u).find(Boolean)?.trim();
  invariant(candidate && existsSync(candidate), "ADB_MISSING");
  return candidate;
}

function auditRows(path: string): AuditRow[] {
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as AuditRow);
}

function exactNativeReads(rows: readonly AuditRow[], revisionId: string): AuditRow[] {
  return rows.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/4.12.0")
    && row.status === 200
    && String(row.path ?? "").includes(revisionId));
}

async function waitForNativeArtifact(
  auditPath: string,
  start: number,
  revisionId: string,
  kind: "pdf" | "procurement",
): Promise<AuditRow[]> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = auditRows(auditPath).slice(start);
    if (rows.some((row) => String(row.userAgent ?? "").startsWith("okhttp/")
      && String(row.path ?? "").startsWith(`/revisions/${revisionId}/artifacts/${kind}`)
      && ((row.method === "GET" && row.status === 200)
        || (row.method === "POST" && row.status === 202)))) return rows;
    await sleep(500);
  }
  throw new Error(`S27_16_ROADS_ANDROID:${kind.toUpperCase()}_NATIVE_REQUEST_MISSING`);
}

async function bootstrap(adb: string): Promise<void> {
  invariant(await isMetroReachable(PORT), "METRO_RED");
  setupAndroidRuntime(PORT, PACKAGE, { clearAppState: false, reversePorts: [8765, 54321, 54329] });
  run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, buildDevClientUri(PORT), PACKAGE), 45_000);
  const ready = await waitForSnapshot(adb, DEVICE, (snapshot) =>
    snapshot.nodes.some((node) => nodeHasId(node, "app-bottom-nav"))
    && snapshot.nodes.some((node) => nodeHasId(node, "tabs.request")), 180_000);
  invariant(ready.nodes.some((node) => nodeHasId(node, "app-bottom-nav")), "DEV_CLIENT_NOT_READY");
}

function rowCountVisible(snapshot: UiSnapshot, expected: number): boolean {
  return snapshot.nodes.some((node) =>
    (nodeHasId(node, "request-estimate-row-count") || nodeHasId(node, "request-estimate-items-total-count"))
      && new RegExp(`\\b${expected}\\b`, "u").test(node.text || node.contentDesc))
    || new RegExp(`\\b${expected}\\s+позиц`, "u").test(snapshot.text);
}

function foregroundActivity(adb: string): string {
  return run(adb, ["-s", DEVICE, "shell", "dumpsys", "activity", "activities"], 20_000)
    .split(/\r?\n/u)
    .find((line) => line.includes("topResumedActivity=") || line.includes("mResumedActivity="))
    ?.trim() ?? "";
}

async function findForwardFromStart(adb: string, id: string, maxSwipes = 12): Promise<UiNode | null> {
  await scrollToStart(adb, DEVICE, 72);
  for (let index = 0; index <= maxSwipes; index += 1) {
    const snapshot = dumpUi(adb, DEVICE);
    const node = snapshot.nodes.find((candidate) => nodeHasId(candidate, id) && candidate.enabled) ?? null;
    if (node && /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u.test(node.bounds)) {
      const [, , top, , bottom] = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u)!.map(Number);
      if (bottom > 283 && top < 2_148) return node;
    }
    run(adb, ["-s", DEVICE, "shell", "input", "swipe", "540", "1700", "540", "500", "250"], 10_000);
    await sleep(300);
  }
  return null;
}

async function openRevision(
  adb: string,
  revisionId: string,
  expectedRows: number,
  marker: string,
): Promise<UiSnapshot> {
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", revisionId);
  uri.searchParams.set("launchId", `${marker}-${Date.now().toString(36)}`);
  run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, uri.toString(), PACKAGE), 45_000);
  let estimate = await waitForSnapshot(adb, DEVICE,
    (snapshot) => rowCountVisible(snapshot, expectedRows), 180_000);
  if (estimate.nodes.some((node) => nodeHasId(node, "consumer-estimate-open-full-estimate"))) {
    invariant(await tapById(adb, DEVICE, "consumer-estimate-open-full-estimate", 8),
      `${marker.toUpperCase()}_OPEN_FULL_RED`);
    estimate = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      rowCountVisible(snapshot, expectedRows)
      && !snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-meaningful-preview")), 30_000);
  }
  invariant(rowCountVisible(estimate, expectedRows), `${marker.toUpperCase()}_ROW_COUNT_RED`);
  return estimate;
}

async function collapsePositions(adb: string): Promise<void> {
  const toggle = await findForwardFromStart(adb, "request-estimate-items-editor");
  invariant(toggle, "POSITIONS_TOGGLE_RED");
  if (toggle.contentDesc.includes("Скрыть позиции")) {
    invariant(tapNode(adb, DEVICE, toggle), "COLLAPSE_POSITIONS_RED");
    await sleep(500);
  }
}

async function openProcurement(
  adb: string,
  auditPath: string,
  revisionId: string,
  expectedText: readonly string[],
): Promise<{ snapshot: UiSnapshot; audit: AuditRow[] }> {
  const start = auditRows(auditPath).length;
  const action = await findForwardFromStart(adb, "consumer-estimate-open-procurement", 8);
  invariant(action && tapNode(adb, DEVICE, action), "PROCUREMENT_ACTION_RED");
  const audit = await waitForNativeArtifact(auditPath, start, revisionId, "procurement");
  const list = await seekNode(adb, DEVICE,
    (node) => nodeHasId(node, "consumer-estimate-procurement-list"), 16, "coarse");
  invariant(list.node, "PROCUREMENT_LIST_RED");
  let snapshot = list.snapshot;
  for (const text of expectedText) {
    if (snapshot.text.includes(text)) continue;
    const found = await seekNode(adb, DEVICE,
      (node) => `${node.text}\n${node.contentDesc}`.includes(text), 16, "coarse");
    invariant(found.node, `PROCUREMENT_UI_RED:${text}`);
    snapshot = found.snapshot;
  }
  return { snapshot, audit };
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  const runtime = json(BACKEND_RUNTIME_RECEIPT);
  const roads = json(ROADS_RECEIPT);
  invariant(runtime.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT", "BACKEND_RED");
  invariant(runtime.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && runtime.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RELEASE_PAIR_RED");
  invariant(roads.status === "GREEN_S27_16_ROADS_BACKEND", "ROADS_BACKEND_RED");
  const compactionRevisionId = String(roads.standaloneCompaction?.pricedRevisionId ?? "");
  const installRevisionId = String(roads.asphaltInstall?.revisionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(compactionRevisionId)
    && /^[0-9a-f-]{36}$/iu.test(installRevisionId), "REVISION_IDS_RED");
  const sourceTree = String(runtime.compatibility_tuple.sourceTree);
  const auditPath = resolve(
    `.release-runtime/r568/runtime/local-developer-current/runtime/backend-${sourceTree.slice(0, 12)}/request-audit.jsonl`,
  );
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);

  const adb = adbPath();
  invariant(run(adb, ["-s", DEVICE, "get-state"]) === "device", "EMULATOR_NOT_READY");
  const packageDump = run(adb, ["-s", DEVICE, "shell", "dumpsys", "package", PACKAGE]);
  invariant(/versionCode=13\b/u.test(packageDump) && /versionName=1\.0\.0\b/u.test(packageDump),
    "APP_BUILD_IDENTITY_RED");
  await bootstrap(adb);

  const auditStart = auditRows(auditPath).length;
  const compaction = await openRevision(adb, compactionRevisionId, 49, "s2716-roads-compaction");
  invariant(/6\s*000/u.test(compaction.text.replace(/\u00a0/gu, " ")), "COMPACTION_AREA_NOT_VISIBLE");
  const compactionEvidence = capture(adb, DEVICE, DEVICE_ROOT, "01-compaction-49-priced");
  const priceHistory = await seekNode(adb, DEVICE,
    (node) => nodeHasId(node, "estimate-revision-diff-price-rc09:asphalt_compaction_breakdown_roller"),
    16, "coarse");
  invariant(priceHistory.node?.text.includes("нет -> 5000 KGS"), "COMPACTION_PRICE_HISTORY_NOT_VISIBLE");
  const compactionPriceEvidence = capture(adb, DEVICE, DEVICE_ROOT, "02-compaction-price-history-5000");

  await collapsePositions(adb);
  const compactionProcurement = await openProcurement(adb, auditPath, compactionRevisionId, [
    "7 позиций",
    "Dynapac CC2200 VI",
    "Dynapac CP1200",
  ]);
  const compactionProcurementEvidence = capture(adb, DEVICE, DEVICE_ROOT, "03-compaction-procurement-7");

  const install = await openRevision(adb, installRevisionId, 56, "s2716-roads-install");
  invariant(/5\s*000/u.test(install.text.replace(/\u00a0/gu, " ")), "INSTALL_AREA_NOT_VISIBLE");
  const installEvidence = capture(adb, DEVICE, DEVICE_ROOT, "04-asphalt-install-56");
  await collapsePositions(adb);
  const installProcurement = await openProcurement(adb, auditPath, installRevisionId, [
    "5 позиций",
    "Смесь асфальтобетонная горячая",
    "Битум нефтяной дорожный",
  ]);
  const installProcurementEvidence = capture(adb, DEVICE, DEVICE_ROOT, "05-asphalt-install-procurement-5");

  await openRevision(adb, compactionRevisionId, 49, "s2716-roads-compaction-pdf");
  await collapsePositions(adb);
  const pdfStart = auditRows(auditPath).length;
  const pdfAction = await findForwardFromStart(adb, "consumer-estimate-make-pdf", 8);
  invariant(pdfAction && tapNode(adb, DEVICE, pdfAction), "PDF_ACTION_RED");
  const pdfAudit = await waitForNativeArtifact(auditPath, pdfStart, compactionRevisionId, "pdf");
  const pdfDeadline = Date.now() + 120_000;
  let pdfInApp = false;
  let pdfExternal = false;
  while (Date.now() < pdfDeadline) {
    const snapshot = dumpUi(adb, DEVICE);
    pdfInApp = snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"));
    const activity = foregroundActivity(adb);
    pdfExternal = activity.includes("com.google.android.apps.docs/")
      && activity.includes("PdfViewerActivity");
    if (pdfInApp || pdfExternal) break;
    await sleep(650);
  }
  invariant(pdfInApp || pdfExternal, "PDF_VIEWER_RED");
  const pdfEvidence = capture(adb, DEVICE, DEVICE_ROOT, "06-compaction-pdf-viewer");

  const nativeAudit = auditRows(auditPath).slice(auditStart);
  const compactionReads = exactNativeReads(nativeAudit, compactionRevisionId);
  const installReads = exactNativeReads(nativeAudit, installRevisionId);
  invariant(compactionReads.some((row) => row.path === `/revisions/${compactionRevisionId}/rows?limit=200`)
    && installReads.some((row) => row.path === `/revisions/${installRevisionId}/rows?limit=200`),
  "OKHTTP_ROWS_READ_MISSING");
  invariant(compactionProcurement.audit.some((row) => String(row.userAgent).startsWith("okhttp/"))
    && installProcurement.audit.some((row) => String(row.userAgent).startsWith("okhttp/"))
    && pdfAudit.some((row) => String(row.userAgent).startsWith("okhttp/")),
  "OKHTTP_ARTIFACT_READ_MISSING");

  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_16_ROADS_ANDROID_NATIVE",
    capturedAt: new Date().toISOString(),
    device: DEVICE,
    package: PACKAGE,
    appVersion: "1.0.0",
    versionCode: 13,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    compaction: {
      revisionId: compactionRevisionId,
      rowCountVisible: 49,
      areaM2Visible: 6_000,
      breakdownRollerUnitPriceVisible: 5_000,
      procurementRowCountVisible: 7,
    },
    asphaltInstall: {
      revisionId: installRevisionId,
      rowCountVisible: 56,
      areaM2Visible: 5_000,
      procurementRowCountVisible: 5,
    },
    pdf: { status: "GREEN", inAppViewer: pdfInApp, externalViewer: pdfExternal },
    nativeTransportUserAgent: "okhttp/4.12.0",
    nativeAuditRowCount: nativeAudit.length,
    evidence: {
      compactionEstimate: compactionEvidence,
      compactionPriceHistory: compactionPriceEvidence,
      compactionProcurement: compactionProcurementEvidence,
      asphaltInstallEstimate: installEvidence,
      asphaltInstallProcurement: installProcurementEvidence,
      pdfViewer: pdfEvidence,
    },
    audit: { path: auditPath.replace(/\\/gu, "/") },
    productionAccessed: false,
    activationPerformed: false,
    deployPerformed: false,
  };
  const receipt = { ...unsigned, sha256: sha256(JSON.stringify(unsigned)) };
  const output = resolve(OUTPUT_ROOT, "acceptance.json");
  atomicJson(output, receipt);
  process.stdout.write(`${JSON.stringify({ ...receipt, output }, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
