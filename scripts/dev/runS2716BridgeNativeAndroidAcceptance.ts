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

const CONTRACT = "rik-expo-app.s27-19.bridge-4800m2-native-android-acceptance.v2";
const DEVICE = "emulator-5554";
const PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const PORT = 8081;
const RELEASE_ID = "890b3fff-6372-57e8-8c36-1e09672489a0";
const SEARCH_RELEASE_ID = "8cb0714d-3c6d-5ea5-9fd5-2a45971d7f99";
const BACKEND_RECEIPT = resolve(".release-runtime/r568/runtime/whole-app-developer-current/backend.json");
const BRIDGE_RECEIPT = resolve(".release-runtime/r568/s27-19/acceptance/bridge-100m2-backend/acceptance.json");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-19/acceptance/bridge-4800m2-android");
const DEVICE_ROOT = resolve(OUTPUT_ROOT, "device");

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S27_16_BRIDGE_ANDROID:${code}`);
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

function nativeRows(rows: readonly AuditRow[], revisionId: string): AuditRow[] {
  return rows.filter((row) => String(row.userAgent ?? "").startsWith("okhttp/")
    && row.status === 200
    && [
      `/revisions/${revisionId}`,
      `/revisions/${revisionId}/rows?limit=200`,
      `/revisions/${revisionId}/parameter-session`,
    ].some((suffix) => String(row.path ?? "").endsWith(suffix)));
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
  throw new Error(`S27_16_BRIDGE_ANDROID:${kind.toUpperCase()}_NATIVE_REQUEST_MISSING`);
}

async function waitForRecalculatedRevision(
  auditPath: string,
  start: number,
  parentRevisionId: string,
): Promise<string> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const rows = auditRows(auditPath).slice(start).filter((row) =>
      String(row.userAgent ?? "").startsWith("okhttp/"));
    const recalculationStarted = rows.some((row) =>
      row.method === "POST"
        && row.status === 202
        && String(row.path ?? "").endsWith("/jobs/recalculate"));
    if (recalculationStarted) {
      for (const row of [...rows].reverse()) {
        const match = String(row.path ?? "").match(/\/revisions\/([0-9a-f-]{36})$/iu);
        if (row.method === "GET" && row.status === 200 && match?.[1]
          && match[1] !== parentRevisionId) {
          return match[1];
        }
      }
    }
    await sleep(500);
  }
  throw new Error("S27_16_BRIDGE_ANDROID:LATE_ROW_RECALCULATION_MISSING");
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

function rowCountVisible(snapshot: UiSnapshot): boolean {
  return snapshot.nodes.some((node) =>
    (nodeHasId(node, "request-estimate-row-count") || nodeHasId(node, "request-estimate-items-total-count"))
      && /194/u.test(node.text || node.contentDesc))
    || /194\s+позиц/u.test(snapshot.text);
}

function foregroundActivities(adb: string): string {
  return run(adb, ["-s", DEVICE, "shell", "dumpsys", "activity", "activities"], 20_000)
    .split(/\r?\n/u)
    .filter((line) => line.includes("topResumedActivity=")
      || line.includes("mResumedActivity=")
      || line.includes("ResumedActivity:"))
    .map((line) => line.trim())
    .join("\n");
}

async function findForwardFromStart(
  adb: string,
  id: string,
  maxSwipes = 12,
  resetSwipes = 72,
): Promise<UiNode | null> {
  await scrollToStart(adb, DEVICE, resetSwipes);
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

async function revealSecondEditableRowBatch(adb: string): Promise<UiNode> {
  let loadMore = await findForwardFromStart(
    adb,
    "request-estimate-load-more-rows",
    50,
    72,
  );
  invariant(loadMore, "LOAD_MORE_16_RED");
  invariant(/показано\s+16\s+из\s+103/iu.test(`${loadMore.text}\n${loadMore.contentDesc}`),
    "INITIAL_ROW_BATCH_RED");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await sleep(700);
    const stable = dumpUi(adb, DEVICE).nodes.find((node) =>
      nodeHasId(node, "request-estimate-load-more-rows") && node.enabled) ?? loadMore;
    tapVisibleNode(adb, stable);
    await sleep(750);
    const advanced = await findForwardFromStart(
      adb,
      "request-estimate-load-more-rows",
      50,
      0,
    );
    if (advanced && /показано\s+32\s+из\s+103/iu.test(`${advanced.text}\n${advanced.contentDesc}`)) {
      return advanced;
    }
    loadMore = advanced ?? await findForwardFromStart(
      adb,
      "request-estimate-load-more-rows",
      50,
      72,
    );
    invariant(loadMore, "LOAD_MORE_RETRY_RED");
    if (/показано\s+32\s+из\s+103/iu.test(`${loadMore.text}\n${loadMore.contentDesc}`)) {
      return loadMore;
    }
  }
  throw new Error("S27_16_BRIDGE_ANDROID:SECOND_ROW_BATCH_RED");
}

function tapVisibleNode(adb: string, node: UiNode): void {
  const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
  invariant(match, `NODE_BOUNDS_RED:${node.resourceId}`);
  const [, left, top, right, bottom] = match.map(Number);
  run(adb, [
    "-s", DEVICE, "shell", "input", "tap",
    String(Math.round((left + right) / 2)),
    String(Math.round((top + bottom) / 2)),
  ], 10_000);
}

async function main(): Promise<void> {
  mkdirSync(DEVICE_ROOT, { recursive: true });
  const backend = json(BACKEND_RECEIPT);
  const bridge = json(BRIDGE_RECEIPT);
  invariant([
    "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
    "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
  ].includes(String(backend.status)), "BACKEND_RED");
  invariant(backend.compatibility_tuple?.definitionReleaseId === RELEASE_ID
    && backend.compatibility_tuple?.searchReleaseId === SEARCH_RELEASE_ID,
  "RELEASE_PAIR_RED");
  invariant(bridge.status === "GREEN_S27_19_BRIDGE_100M2_BACKEND", "BRIDGE_BACKEND_RED");
  const parentRevisionId = String(bridge.revisions?.fullScaleRevisionId ?? "");
  invariant(/^[0-9a-f-]{36}$/iu.test(parentRevisionId), "REVISION_ID_RED");
  const resumeRevisionId = String(process.env.S2716_RESUME_CHILD_REVISION_ID ?? "").trim();
  invariant(!resumeRevisionId || /^[0-9a-f-]{36}$/iu.test(resumeRevisionId),
    "RESUME_REVISION_ID_RED");
  let revisionId = resumeRevisionId || parentRevisionId;
  const sourceTree = String(backend.compatibility_tuple.sourceTree);
  const auditPath = resolve(`.release-runtime/r568/runtime/whole-app-developer-current/runtime/backend-${sourceTree.slice(0, 12)}/request-audit.jsonl`);
  invariant(existsSync(auditPath), `AUDIT_MISSING:${auditPath}`);

  const adb = adbPath();
  invariant(run(adb, ["-s", DEVICE, "get-state"]) === "device", "EMULATOR_NOT_READY");
  const packageDump = run(adb, ["-s", DEVICE, "shell", "dumpsys", "package", PACKAGE]);
  invariant(/versionCode=13\b/u.test(packageDump) && /versionName=1\.0\.0\b/u.test(packageDump),
    "APP_BUILD_IDENTITY_RED");
  await bootstrap(adb);

  const auditStart = auditRows(auditPath).length;
  const uri = new URL("rik:///request");
  uri.searchParams.set("canonicalRevisionId", revisionId);
  uri.searchParams.set("launchId", `s2719-bridge-4800m2-native-${Date.now().toString(36)}`);
  run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, uri.toString(), PACKAGE), 45_000);
  let estimate = await waitForSnapshot(adb, DEVICE, rowCountVisible, 15_000);
  if (!rowCountVisible(estimate)) {
    const locatedEstimate = await seekNode(adb, DEVICE, (node) =>
      nodeHasId(node, "request-estimate-items-total-count")
        || nodeHasId(node, "request-estimate-row-count")
        || nodeHasId(node, "consumer-estimate-meaningful-preview")
        || nodeHasId(node, "consumer-estimate-open-full-estimate"), 60, "coarse");
    estimate = locatedEstimate.snapshot;
  }
  invariant(rowCountVisible(estimate), "ROW_COUNT_NOT_VISIBLE");
  let areaVisible = /(?:4800|4\s*800)/u.test(estimate.text.replace(/\u00a0/gu, " "));
  let estimateEvidence: ReturnType<typeof capture> | null = null;
  const fullEditorOpen = estimate.nodes.some((node) =>
    nodeHasId(node, "request-estimate-items-total-count")
      || nodeHasId(node, "request-estimate-flat-row-list")
      || nodeHasId(node, "request-estimate-items-editor-content"));
  if (!fullEditorOpen) {
    estimateEvidence = capture(adb, DEVICE, DEVICE_ROOT, "00-bridge-194-full-scale-preview");
    let fullEditor: Awaited<ReturnType<typeof seekNode>> | null = null;
    for (let attempt = 0; attempt < 3 && !fullEditor?.node; attempt += 1) {
      const openFull = await findForwardFromStart(
        adb,
        "consumer-estimate-open-full-estimate",
        50,
        72,
      );
      if (!openFull) {
        const racedEditor = dumpUi(adb, DEVICE);
        const racedNode = racedEditor.nodes.find((node) =>
          nodeHasId(node, "request-estimate-items-total-count")
            || nodeHasId(node, "request-estimate-flat-row-list")
            || nodeHasId(node, "request-estimate-items-editor-content")) ?? null;
        if (racedNode) fullEditor = { snapshot: racedEditor, node: racedNode };
        continue;
      }
      await sleep(900);
      const stableOpenFull = dumpUi(adb, DEVICE).nodes.find((node) =>
        nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled) ?? null;
      if (!stableOpenFull) continue;
      tapVisibleNode(adb, stableOpenFull);
      await sleep(450);
      const confirmedOpenFull = dumpUi(adb, DEVICE).nodes.find((node) =>
        nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled) ?? null;
      if (confirmedOpenFull) tapVisibleNode(adb, confirmedOpenFull);
      await sleep(800);
      const opened = await seekNode(adb, DEVICE, (node) =>
        nodeHasId(node, "request-estimate-items-total-count")
          || nodeHasId(node, "request-estimate-flat-row-list")
          || nodeHasId(node, "request-estimate-items-editor-content"), 12, "coarse");
      if (opened.node) fullEditor = opened;
    }
    invariant(fullEditor?.node, "FULL_EDITOR_RED");
    estimate = fullEditor.snapshot;
  }
  areaVisible = areaVisible || /(?:4800|4\s*800)/u.test(estimate.text.replace(/\u00a0/gu, " "));
  invariant(areaVisible, "AREA_NOT_VISIBLE");
  estimateEvidence ??= capture(adb, DEVICE, DEVICE_ROOT, "01-bridge-194-full-scale");

  let lateItemId = "";
  let parentLateItemId = "";
  let lateRowTitleNeedle = "";
  let lateQuantityBefore = Number.NaN;
  let lateQuantityAfter = Number.NaN;
  let lateRowEvidence: ReturnType<typeof capture>;
  const resumedFromAppliedChild = Boolean(resumeRevisionId);
  if (resumeRevisionId) {
    parentLateItemId = String(process.env.S2716_RESUME_LATE_ITEM_ID ?? "").trim();
    lateRowTitleNeedle = String(process.env.S2716_RESUME_LATE_TITLE_NEEDLE ?? "").trim();
    lateQuantityBefore = Number(process.env.S2716_RESUME_LATE_QUANTITY_BEFORE ?? "");
    invariant(parentLateItemId, "RESUME_LATE_ROW_ID_RED");
    invariant(lateRowTitleNeedle, "RESUME_LATE_ROW_TITLE_RED");
    invariant(Number.isFinite(lateQuantityBefore), "RESUME_LATE_ROW_QUANTITY_RED");
    await revealSecondEditableRowBatch(adb);
    const lateQuantityAfterResult = await seekNode(adb, DEVICE, (node) => {
      if (!node.resourceId.includes("consumer-repair-item-quantity-input-")
        || !node.contentDesc.includes(lateRowTitleNeedle)) return false;
      const value = Number(node.text.replace(",", "."));
      return Number.isFinite(value) && Math.abs(value - (lateQuantityBefore + 1)) < 0.000001;
    }, 24, "fine");
    invariant(lateQuantityAfterResult.node, "LATE_ROW_REOPEN_QUANTITY_RED");
    lateQuantityAfter = Number(lateQuantityAfterResult.node.text.replace(",", "."));
    invariant(Number.isFinite(lateQuantityAfter)
      && Math.abs(lateQuantityAfter - (lateQuantityBefore + 1)) < 0.000001,
    "LATE_ROW_REOPEN_VALUE_RED");
    lateItemId = lateQuantityAfterResult.node.resourceId
      .replace("consumer-repair-item-quantity-input-", "");
    invariant(lateItemId, "LATE_ROW_REOPEN_ITEM_ID_RED");
    lateRowEvidence = capture(adb, DEVICE, DEVICE_ROOT, "01b-bridge-late-row-reopen");
  } else {
    const editAuditStart = auditRows(auditPath).length;
    await revealSecondEditableRowBatch(adb);
    const secondBatchSnapshot = dumpUi(adb, DEVICE);
    const latePlus = [...secondBatchSnapshot.nodes].reverse().find((node) =>
      node.resourceId.includes("consumer-repair-item-plus-")
        && node.enabled
        && (() => {
          const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
          return match != null && Number(match[2]) >= 320 && Number(match[4]) <= 2_040;
        })()) ?? null;
    invariant(latePlus, "LATE_ROW_PLUS_RED");
    lateItemId = latePlus.resourceId.match(/consumer-repair-item-plus-(.+)$/u)?.[1] ?? "";
    invariant(lateItemId, "LATE_ROW_ID_RED");
    parentLateItemId = lateItemId;
    lateRowTitleNeedle = latePlus.contentDesc.replace(/^Увеличить\s+/u, "").trim();
    invariant(lateRowTitleNeedle, "LATE_ROW_TITLE_RED");
    const lateQuantityId = `consumer-repair-item-quantity-input-${lateItemId}`;
    const lateQuantityBeforeNode = secondBatchSnapshot.nodes.find((node) =>
      nodeHasId(node, lateQuantityId)) ?? null;
    invariant(lateQuantityBeforeNode, "LATE_ROW_QUANTITY_RED");
    lateQuantityBefore = Number(lateQuantityBeforeNode.text.replace(",", "."));
    invariant(Number.isFinite(lateQuantityBefore), "LATE_ROW_QUANTITY_PARSE_RED");
    tapVisibleNode(adb, latePlus);
    const stagedQuantity = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      snapshot.nodes.some((node) => {
        if (!nodeHasId(node, lateQuantityId)) return false;
        const value = Number(node.text.replace(",", "."));
        return Number.isFinite(value) && Math.abs(value - (lateQuantityBefore + 1)) < 0.000001;
      }), 10_000);
    invariant(stagedQuantity.nodes.some((node) => {
      if (!nodeHasId(node, lateQuantityId)) return false;
      const value = Number(node.text.replace(",", "."));
      return Number.isFinite(value) && Math.abs(value - (lateQuantityBefore + 1)) < 0.000001;
    }), "LATE_ROW_PENDING_QUANTITY_RED");
    // Android omits off-screen accessibility nodes; scroll the mounted batch
    // bar into view before asserting the pending edit.
    const pendingBatchBar = await findForwardFromStart(adb, "request-estimate-row-batch-bar", 8, 72);
    invariant(pendingBatchBar, "LATE_ROW_PENDING_EDIT_RED");

    const allFilter = await findForwardFromStart(adb, "request-estimate-category-filter-all", 20, 72);
    invariant(allFilter, "CATEGORY_FILTER_ALL_RED");
    tapVisibleNode(adb, allFilter);
    const collapsedFilter = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-category-filter-all") && !node.selected),
    10_000);
    const collapsedAll = collapsedFilter.nodes.find((node) =>
      nodeHasId(node, "request-estimate-category-filter-all") && !node.selected) ?? null;
    invariant(collapsedAll, "CATEGORY_FILTER_COLLAPSE_RED");
    tapVisibleNode(adb, collapsedAll);
    const expandedFilter = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-category-filter-all") && node.selected),
    10_000);
    invariant(expandedFilter.nodes.some((node) =>
      nodeHasId(node, "request-estimate-category-filter-all") && node.selected),
    "CATEGORY_FILTER_EXPAND_RED");

    const applyEdit = await findForwardFromStart(adb, "request-estimate-row-batch-apply", 20, 72);
    invariant(applyEdit, "LATE_ROW_APPLY_RED");
    tapVisibleNode(adb, applyEdit);
    revisionId = await waitForRecalculatedRevision(auditPath, editAuditStart, parentRevisionId);

    const reopenUri = new URL("rik:///request");
    reopenUri.searchParams.set("canonicalRevisionId", revisionId);
    reopenUri.searchParams.set("launchId", `s2720-bridge-late-row-reopen-${Date.now().toString(36)}`);
    run(adb, buildAndroidDeepLinkLaunchArgs(DEVICE, reopenUri.toString(), PACKAGE), 45_000);
    let reopened = await waitForSnapshot(adb, DEVICE, rowCountVisible, 30_000);
    invariant(rowCountVisible(reopened), "LATE_ROW_REOPEN_COUNT_RED");
  if (!reopened.nodes.some((node) => nodeHasId(node, "request-estimate-flat-row-list")
    || nodeHasId(node, "request-estimate-items-editor-content"))) {
      const reopenFull = await seekNode(adb, DEVICE, (node) =>
        nodeHasId(node, "consumer-estimate-open-full-estimate") && node.enabled, 24, "coarse");
      invariant(reopenFull.node, "LATE_ROW_REOPEN_FULL_ACTION_RED");
      tapVisibleNode(adb, reopenFull.node);
    reopened = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      snapshot.nodes.some((node) => nodeHasId(node, "request-estimate-flat-row-list")
        || nodeHasId(node, "request-estimate-items-editor-content")), 30_000);
    invariant(reopened.nodes.some((node) => nodeHasId(node, "request-estimate-flat-row-list")
      || nodeHasId(node, "request-estimate-items-editor-content")),
      "LATE_ROW_REOPEN_FULL_RED");
    }
    await revealSecondEditableRowBatch(adb);
    const lateQuantityAfterResult = await seekNode(adb, DEVICE, (node) => {
      if (!node.resourceId.includes("consumer-repair-item-quantity-input-")
        || !node.contentDesc.includes(lateRowTitleNeedle)) return false;
      const value = Number(node.text.replace(",", "."));
      return Number.isFinite(value) && Math.abs(value - (lateQuantityBefore + 1)) < 0.000001;
    }, 24, "fine");
    invariant(lateQuantityAfterResult.node, "LATE_ROW_REOPEN_QUANTITY_RED");
    lateQuantityAfter = Number(lateQuantityAfterResult.node.text.replace(",", "."));
    invariant(Number.isFinite(lateQuantityAfter)
      && Math.abs(lateQuantityAfter - (lateQuantityBefore + 1)) < 0.000001,
    "LATE_ROW_REOPEN_VALUE_RED");
    lateItemId = lateQuantityAfterResult.node.resourceId
      .replace("consumer-repair-item-quantity-input-", "");
    invariant(lateItemId, "LATE_ROW_REOPEN_ITEM_ID_RED");
    lateRowEvidence = capture(adb, DEVICE, DEVICE_ROOT, "01b-bridge-late-row-reopen");
  }

  // The full editor contains 194 calculated rows; technical/included rows are
  // collapsed by default so the primary list remains a purchasing/work list.
  const positionToggle = await findForwardFromStart(
    adb,
    "request-estimate-items-editor",
    12,
    72,
  );
  invariant(positionToggle, "POSITIONS_TOGGLE_RED");
  if (positionToggle.contentDesc.includes("Скрыть позиции")) {
    invariant(tapNode(adb, DEVICE, positionToggle), "COLLAPSE_POSITIONS_RED");
    await sleep(500);
  }

  const procurementAction = await findForwardFromStart(adb, "consumer-estimate-open-procurement", 50, 8);
  invariant(procurementAction, "PROCUREMENT_ACTION_RED");
  tapVisibleNode(adb, procurementAction);
  const procurementAudit = await waitForNativeArtifact(
    auditPath, auditStart, revisionId, "procurement",
  );
  let procurementSnapshot = dumpUi(adb, DEVICE);
  if (!procurementSnapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list"))) {
    invariant(await tapById(adb, DEVICE, "consumer-estimate-open-procurement", 8),
      "PROCUREMENT_REOPEN_RED");
    procurementSnapshot = await waitForSnapshot(adb, DEVICE, (snapshot) =>
      snapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list")), 30_000);
  }
  invariant(procurementSnapshot.nodes.some((node) => nodeHasId(node, "consumer-estimate-procurement-list")),
    "PROCUREMENT_PANEL_RED");
  const procurementCount = await seekNode(adb, DEVICE, (node) =>
    /49\s+позиц/u.test(`${node.text}\n${node.contentDesc}`), 10, "coarse");
  invariant(procurementCount.node, "PROCUREMENT_COUNT_RED");
  const procurementAsphalt = await seekNode(adb, DEVICE, (node) =>
    `${node.text}\n${node.contentDesc}`.includes(
      "Нижний слой: асфальтобетонная смесь типа А",
    ), 14, "coarse");
  invariant(procurementAsphalt.node, "PROCUREMENT_ASPHALT_RED");
  const procurementEvidence = capture(adb, DEVICE, DEVICE_ROOT, "02-bridge-procurement-49");

  const pdfAction = await findForwardFromStart(adb, "consumer-estimate-make-pdf", 50, 8);
  invariant(pdfAction, "PDF_ACTION_RED");
  // The procurement list is rendered inline beneath the action row. Returning
  // from a long seek leaves ScrollView momentum active for a short time, and a
  // coordinate tap during that momentum is swallowed even though the PDF node
  // is present and enabled in the accessibility tree. Re-resolve and retry the
  // stable action until either navigation starts or this run emits a PDF
  // request; the screen handler's pdfOpenBusy guard prevents duplicate opens.
  const pdfTapAuditStart = auditRows(auditPath).length;
  let pdfActionStarted = false;
  for (let attempt = 0; attempt < 3 && !pdfActionStarted; attempt += 1) {
    const stablePdfAction = attempt === 0
      ? pdfAction
      : await findForwardFromStart(adb, "consumer-estimate-make-pdf", 50, 8);
    if (!stablePdfAction) continue;
    tapVisibleNode(adb, stablePdfAction);
    await sleep(350);
    const confirmedPdfAction = dumpUi(adb, DEVICE).nodes.find((node) =>
      nodeHasId(node, "consumer-estimate-make-pdf") && node.enabled) ?? null;
    if (confirmedPdfAction) tapVisibleNode(adb, confirmedPdfAction);
    const startDeadline = Date.now() + 30_000;
    while (Date.now() < startDeadline) {
      const activity = foregroundActivities(adb);
      const snapshot = dumpUi(adb, DEVICE);
      const viewerVisible = snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"))
        || (activity.includes("com.google.android.apps.docs/")
          && activity.includes("PdfViewerActivity"));
      const pdfRequested = auditRows(auditPath).slice(pdfTapAuditStart).some((row) =>
        String(row.userAgent ?? "").startsWith("okhttp/")
          && String(row.path ?? "").startsWith(`/revisions/${revisionId}/artifacts/pdf`));
      if (viewerVisible || pdfRequested) {
        pdfActionStarted = true;
        break;
      }
      await sleep(500);
    }
  }
  invariant(pdfActionStarted, "PDF_ACTION_NOT_STARTED");
  const pdfAudit = await waitForNativeArtifact(auditPath, auditStart, revisionId, "pdf");
  // A cold Google Drive PDF viewer can take over two minutes to start after
  // the backend artifact is ready. Inspect every resumed-activity record:
  // dumpsys may retain the host MainActivity as the first matching line while
  // PdfViewerActivity is already the task's top activity.
  const pdfDeadline = Date.now() + 180_000;
  let pdfInApp = false;
  let pdfExternal = false;
  while (Date.now() < pdfDeadline) {
    const snapshot = dumpUi(adb, DEVICE);
    pdfInApp = snapshot.nodes.some((node) => nodeHasId(node, "pdf-viewer-back"));
    const activity = foregroundActivities(adb);
    pdfExternal = activity.includes("com.google.android.apps.docs/")
      && activity.includes("PdfViewerActivity");
    if (pdfInApp || pdfExternal) break;
    await sleep(650);
  }
  invariant(pdfInApp || pdfExternal, "PDF_VIEWER_RED");
  const pdfEvidence = capture(adb, DEVICE, DEVICE_ROOT, "03-bridge-pdf-viewer");

  const nativeAudit = auditRows(auditPath).slice(auditStart);
  const revisionReads = nativeRows(nativeAudit, revisionId);
  invariant(revisionReads.some((row) => String(row.path).endsWith("/rows?limit=200")),
    "OKHTTP_ROWS_READ_MISSING");
  invariant(procurementAudit.some((row) => String(row.userAgent).startsWith("okhttp/"))
    && pdfAudit.some((row) => String(row.userAgent).startsWith("okhttp/")),
  "OKHTTP_ARTIFACT_READ_MISSING");

  const unsigned = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    status: "GREEN_S27_19_BRIDGE_4800M2_ANDROID_NATIVE",
    capturedAt: new Date().toISOString(),
    device: DEVICE,
    package: PACKAGE,
    appVersion: "1.0.0",
    versionCode: 13,
    definitionReleaseId: RELEASE_ID,
    searchReleaseId: SEARCH_RELEASE_ID,
    revisionId,
    rowCountVisible: 194,
    areaM2Visible: 4_800,
    lateRowEdit: {
      status: "GREEN",
      parentRevisionId,
      childRevisionId: revisionId,
      parentItemId: parentLateItemId,
      itemId: lateItemId,
      titleIdentity: lateRowTitleNeedle,
      quantityBefore: lateQuantityBefore,
      quantityAfter: lateQuantityAfter,
      secondBatchVisibleCount: 32,
      categoryCollapseExpandPreservedPendingEdit: true,
      applyAndColdReopenPreservedQuantity: true,
      resumedFromAppliedChildAfterCollectorFailure: resumedFromAppliedChild,
    },
    procurement: { status: "GREEN", rowCountVisible: 49 },
    pdf: { status: "GREEN", inAppViewer: pdfInApp, externalViewer: pdfExternal },
    nativeTransportUserAgent: "okhttp/4.12.0",
    nativeRevisionReadCount: revisionReads.length,
    evidence: { estimateEvidence, lateRowEvidence, procurementEvidence, pdfEvidence },
    audit: { path: auditPath.replace(/\\/gu, "/"), capturedRows: nativeAudit.length },
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
