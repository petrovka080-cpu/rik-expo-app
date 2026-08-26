import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { createAndroidHarness } from "../../_shared/androidHarness";
import { escapeAndroidRemoteShellUri } from "../../e2e/androidDeepLinkLaunchContract";
import {
  collectRouteToScreenLifecycleEvidence,
  isWarmAndroidActivityDelivery,
} from "../../release/android/routeToScreenAck";
import {
  allRevisionRows,
  api,
  appendJsonl,
  argument,
  atomicJson,
  ensureArtifact,
  fileProof,
  inspectPng,
  invariant,
  jsonl,
  loadBatch,
  sha256,
  stableJson,
  type BackendCase,
  type Json,
} from "./r4WorkGroupSurfaceShared";

const MASTER_SHA256 = process.env.ESTIMATE_SURFACE_MASTER_SHA256
  ?? "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const SOURCE_SHA_RE = /^[0-9a-f]{64}$/u;

function adbPath(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return resolve(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function adb(args: string[], timeoutMs = 30_000): string {
  return execFileSync(adbPath(), ["-s", DEVICE_ID, ...args], {
    cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs,
  }).trim();
}

function adbBuffer(args: string[], timeoutMs = 30_000): Buffer {
  return execFileSync(adbPath(), ["-s", DEVICE_ID, ...args], {
    cwd: process.cwd(), encoding: "buffer", stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs,
  }) as Buffer;
}

function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/gu, "_");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function xmlDecode(value: string): string {
  return value.replace(/&quot;/gu, "\"").replace(/&apos;/gu, "'").replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">").replace(/&amp;/gu, "&");
}

function nodeById(xml: string, id: string): { attrs: string; text: string; bounds: string } | null {
  for (const match of xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/gu)) {
    const attrs = match[1] ?? "";
    const resourceId = xmlDecode(attrs.match(/\bresource-id="([^"]*)"/u)?.[1] ?? "");
    const contentDescription = xmlDecode(attrs.match(/\bcontent-desc="([^"]*)"/u)?.[1] ?? "");
    if (resourceId !== id && !resourceId.endsWith(`:id/${id}`) && contentDescription !== id) continue;
    return {
      attrs,
      text: xmlDecode(attrs.match(/\btext="([^"]*)"/u)?.[1] ?? ""),
      bounds: attrs.match(/\bbounds="([^"]*)"/u)?.[1] ?? "",
    };
  }
  return null;
}

function nodeByIdPrefix(xml: string, prefix: string): { attrs: string; text: string; bounds: string } | null {
  for (const match of xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/gu)) {
    const attrs = match[1] ?? "";
    const resourceId = xmlDecode(attrs.match(/\bresource-id="([^"]*)"/u)?.[1] ?? "");
    const contentDescription = xmlDecode(attrs.match(/\bcontent-desc="([^"]*)"/u)?.[1] ?? "");
    const normalizedResourceId = resourceId.includes(":id/") ? resourceId.split(":id/").at(-1) ?? "" : resourceId;
    if (!normalizedResourceId.startsWith(prefix) && !contentDescription.startsWith(prefix)) continue;
    return {
      attrs,
      text: xmlDecode(attrs.match(/\btext="([^"]*)"/u)?.[1] ?? ""),
      bounds: attrs.match(/\bbounds="([^"]*)"/u)?.[1] ?? "",
    };
  }
  return null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
  if (!match) return null;
  return { x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2) };
}

function boundsIntersectDisplay(
  bounds: string,
  display: { width: number; height: number },
): boolean {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
  if (!match) return false;
  const [left, top, right, bottom] = match.slice(1).map(Number);
  return right! > 0 && bottom! > 0 && left! < display.width && top! < display.height;
}

function dumpUiXml(label: string): string {
  let lastFailure = "NO_HIERARCHY";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const deviceXml = `/sdcard/r4-${process.pid}-${safeName(label)}-${attempt}.xml`;
    try {
      adb(["shell", "rm", "-f", deviceXml], 5_000);
      adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", deviceXml], 16_000);
      const xml = adb(["exec-out", "cat", deviceXml], 20_000);
      if (xml.includes("<hierarchy")) return xml;
      lastFailure = `NO_HIERARCHY_ATTEMPT_${attempt}`;
    } catch (error) {
      lastFailure = `${error instanceof Error ? error.message : String(error)}`.slice(0, 500);
    } finally {
      try {
        adb(["shell", "rm", "-f", deviceXml], 5_000);
      } catch {
        // The exact per-attempt file is disposable; a failed cleanup must not
        // replace the stronger hierarchy failure reported below.
      }
    }
  }
  throw new Error(`R4_ANDROID_UI_DUMP_RED:${label}:${lastFailure}`);
}

function capture(
  output: string,
  row: BackendCase,
  phase: string,
  preparedXml?: string,
): { xml: string; xmlProof: Json; pngProof: Json } {
  const directory = join(output, "screenshots", safeName(row.work_group_id));
  mkdirSync(directory, { recursive: true });
  const base = `${safeName(row.case_id)}-${phase}`;
  const xml = preparedXml ?? dumpUiXml(`${row.case_id}-${phase}`);
  const xmlPath = join(directory, `${base}.xml`);
  const pngPath = join(directory, `${base}.png`);
  writeFileSync(xmlPath, xml, "utf8");
  writeFileSync(pngPath, adbBuffer(["exec-out", "screencap", "-p"], 20_000));
  return { xml, xmlProof: fileProof(xmlPath), pngProof: inspectPng(pngPath) };
}

async function waitForRevisionAudit(
  auditLog: string,
  before: number,
  revisionId: string,
  catalogId: string,
): Promise<Json[]> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const rows = jsonl(auditLog);
    const appended = rows.slice(before);
    const nativeGreen = (pathPrefix: string) => appended.some((row) => row.method === "GET" && row.status === 200
      && String(row.userAgent).startsWith("okhttp/") && String(row.path).startsWith(pathPrefix));
    if (nativeGreen(`/canonical-estimate/revisions/${revisionId}`)
      && nativeGreen(`/canonical-estimate/revisions/${revisionId}/rows?`)
      && nativeGreen(`/canonical-estimate/catalog/${encodeURIComponent(catalogId)}?releaseId=`)) {
      return appended.filter((row) => String(row.userAgent).startsWith("okhttp/"));
    }
    await delay(150);
  }
  throw new Error(`R4_ANDROID_EXACT_RUNTIME_AUDIT_TIMEOUT:${revisionId}:${catalogId}`);
}

async function waitForNativeRevisionUi(
  caseId: string,
  expectedTitleRu: string,
): Promise<string> {
  const deadline = Date.now() + 120_000;
  let consecutiveReady = 0;
  while (Date.now() < deadline) {
    const xml = dumpUiXml(`${caseId}-revision-ready`);
    const ready = xml.includes("consumer-repair-screen")
      && xmlDecode(xml).includes(expectedTitleRu)
      && !xml.includes("consumer-repair-exact-draft-hydration-gate")
      && !xml.includes("consumer-repair-storage-hydrating");
    consecutiveReady = ready ? consecutiveReady + 1 : 0;
    if (consecutiveReady >= 2) return xml;
    await delay(150);
  }
  throw new Error(`R4_ANDROID_NATIVE_REVISION_TOP_UI_TIMEOUT:${caseId}`);
}

async function findVisibleNativeRevisionRowCount(
  caseId: string,
  expectedRows: number,
  initialXml: string,
): Promise<{ xml: string; scrollCount: number }> {
  const physicalSize = adb(["shell", "wm", "size"], 10_000)
    .match(/Physical size:\s*(\d+)x(\d+)/u);
  invariant(physicalSize, `R4_ANDROID_PHYSICAL_DISPLAY_SIZE_RED:${caseId}`);
  const display = { width: Number(physicalSize[1]), height: Number(physicalSize[2]) };
  let xml = initialXml;
  for (let scrollCount = 0; scrollCount <= 18; scrollCount += 1) {
    const rowCount = nodeById(xml, "request-estimate-row-count");
    if (rowCount && boundsIntersectDisplay(rowCount.bounds, display)
      && rowCount.text.match(new RegExp(`\\b${expectedRows}\\b`, "u"))) {
      return { xml, scrollCount };
    }
    if (scrollCount === 18) break;
    adb(["shell", "input", "swipe", "540", "1500", "540", "1250", "500"], 5_000);
    await delay(100);
    xml = dumpUiXml(`${caseId}-row-count-${scrollCount + 1}`);
  }
  throw new Error(`R4_ANDROID_NATIVE_REVISION_ROW_COUNT_TRAVERSAL_RED:${caseId}:${expectedRows}`);
}

async function waitForLifecycleAck(launchId: string): Promise<
  ReturnType<typeof collectRouteToScreenLifecycleEvidence>
> {
  const hardDeadline = Date.now() + 360_000;
  let progressDeadline = Date.now() + 120_000;
  let observedStageCount = 0;
  let evidence = collectRouteToScreenLifecycleEvidence("", launchId);
  while (Date.now() < hardDeadline && Date.now() < progressDeadline) {
    const logcat = adb(["logcat", "-d", "-v", "threadtime", "ReactNativeJS:I", "*:S"], 20_000);
    evidence = collectRouteToScreenLifecycleEvidence(logcat, launchId);
    if (evidence.acknowledged) return evidence;
    if (evidence.orderedStages.length > observedStageCount) {
      observedStageCount = evidence.orderedStages.length;
      progressDeadline = Math.min(hardDeadline, Date.now() + 120_000);
    }
    await delay(150);
  }
  // A stage can be emitted while the last bounded `adb logcat -d` snapshot is
  // in flight. Take one final snapshot before sealing a timeout so an ACK at
  // the progress boundary cannot be misclassified as absent.
  const finalLogcat = adb(["logcat", "-d", "-v", "threadtime", "ReactNativeJS:I", "*:S"], 20_000);
  evidence = collectRouteToScreenLifecycleEvidence(finalLogcat, launchId);
  if (evidence.acknowledged) return evidence;
  throw new Error(`R5_ANDROID_ROUTE_ACK_TIMEOUT:${launchId}:${JSON.stringify(evidence)}`);
}

function currentGreenCase(row: Json, sourceSha: string, buildSha: string): boolean {
  const lifecycle = (row.android as Json | undefined)?.lifecycle as Json | undefined;
  return row.verdict === "GREEN"
    && row.source_sha === sourceSha
    && row.build_sha === buildSha
    && row.master_sha256 === MASTER_SHA256
    && lifecycle?.acknowledged === true
    && lifecycle.exactOrder === true
    && lifecycle.exactlyOnce === true
    && String(lifecycle.launchId ?? "").length > 0;
}

async function searchProof(apiRoot: string, workIdentity: string): Promise<Json> {
  const catalog = await api(apiRoot, `catalog/${encodeURIComponent(workIdentity)}`);
  const searchText = String(catalog.item?.titleRu ?? "").trim();
  invariant(searchText.length >= 2, `R4_ANDROID_SEARCH_TITLE_MISSING:${workIdentity}`);
  const result = await api(apiRoot, `search/catalog?query=${encodeURIComponent(searchText)}&mode=PHRASE&pageSize=100`);
  const exact = (result.items as Json[]).find((item) => item.catalogId === workIdentity);
  invariant(exact?.estimateReady === true, `R4_ANDROID_SEARCH_EXACT_RED:${workIdentity}`);
  return {
    searchIndexReleaseId: result.searchIndexReleaseId,
    resultSetSha256: result.resultSetSha256,
    exactCatalogId: exact.catalogId,
    exactMatchType: exact.matchType,
    searchText,
    estimateReady: exact.estimateReady,
    proofSha256: sha256(stableJson({ searchIndexReleaseId: result.searchIndexReleaseId,
      resultSetSha256: result.resultSetSha256, exactCatalogId: exact.catalogId, exactMatchType: exact.matchType })),
  };
}

async function bootstrapAuthentication(output: string): Promise<Json> {
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: 8081,
    devClientStdoutPath: join(output, "auth-bootstrap-dev.stdout.log"),
    devClientStderrPath: join(output, "auth-bootstrap-dev.stderr.log"),
  });
  harness.resetAndroidAppState(PACKAGE_NAME);
  harness.startAndroidRouteSafe(PACKAGE_NAME, "rik:///auth/login");
  const email = "r4-android-local-proof@example.invalid";
  const password = "r4-local-proof-password-not-a-secret";
  const waitForXml = async (label: string, predicate: (xml: string) => boolean, timeoutMs = 60_000) => {
    const deadline = Date.now() + timeoutMs;
    let lastFailure = "UI_NOT_READY";
    while (Date.now() < deadline) {
      await delay(750);
      try {
        const screen = harness.dumpAndroidScreen(`r4-work-group-surface/${label}`);
        if (predicate(screen.xml)) return screen;
        lastFailure = "PREDICATE_NOT_READY";
      } catch (error) {
        lastFailure = `${error instanceof Error ? error.message : String(error)}`.slice(0, 500);
      }
    }
    throw new Error(`R4_ANDROID_AUTH_UI_TIMEOUT:${label}:${lastFailure}`);
  };
  const login = await waitForXml("auth-normal-release-login", (xml) =>
    xml.includes("auth.login.email") && xml.includes("auth.login.password") && xml.includes("auth.login.submit"));
  const loginNodes = harness.parseAndroidNodes(login.xml);
  const emailNode = loginNodes.find((node) => node.resourceId === "auth.login.email");
  const passwordNode = loginNodes.find((node) => node.resourceId === "auth.login.password");
  invariant(emailNode && passwordNode, "R4_ANDROID_AUTH_FIELDS_RED");
  await harness.replaceAndroidFieldText(emailNode, email);
  await harness.replaceAndroidFieldText(passwordNode, password);
  harness.pressAndroidKey(4);
  await delay(500);
  const readyToSubmit = harness.dumpAndroidScreen("r4-work-group-surface/auth-normal-release-submit");
  const submitNode = harness.parseAndroidNodes(readyToSubmit.xml)
    .find((node) => node.resourceId === "auth.login.submit" && node.enabled);
  invariant(submitNode && harness.tapAndroidBounds(submitNode.bounds), "R4_ANDROID_AUTH_SUBMIT_RED");
  await waitForXml("auth-normal-release-session", (xml) =>
    !xml.includes("auth.login.screen") || xml.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY"), 60_000);
  harness.startAndroidRouteSafe(PACKAGE_NAME, "rik:///profile");
  const authenticated = await waitForXml("auth-normal-release-profile", (xml) =>
    xml.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY") || xml.includes("profile-edit-open"), 60_000);
  return {
    method: "FRESH_NATIVE_LOGIN_AGAINST_LOCAL_SUPABASE_STUB",
    runtime: "NORMAL_RELEASE_APK_EMBEDDED_BUNDLE_NO_DEV_SERVER",
    sessionPersistedBeforeMatrix: true,
    productionAuthAccessed: false,
    proofXmlSha256: sha256(authenticated.xml),
  };
}

async function executeCase(input: {
  row: BackendCase;
  output: string;
  apiRoot: string;
  auditLog: string;
  sourceSha: string;
  buildSha: string;
  releaseId: string;
  search: Json;
  exhaustive: boolean;
  coldRestart: boolean;
}): Promise<Json> {
  const { row, output, apiRoot, auditLog, sourceSha, buildSha, releaseId, search, exhaustive, coldRestart } = input;
  invariant(row.revision_id && row.compile_job_status === "succeeded" && row.defects.length === 0,
    `R4_ANDROID_BACKEND_CASE_RED:${row.case_id}`);
  const revisionId = row.revision_id;
  const blockers: string[] = [];
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const artifactPromises = Promise.all([
    ensureArtifact(apiRoot, revisionId, releaseId, "pdf"),
    ensureArtifact(apiRoot, revisionId, releaseId, "procurement"),
  ]);
  const auditBefore = jsonl(auditLog).length;
  if (coldRestart) adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  const launchId = `r5-valid-${String(row.batch_id).toLowerCase()}-c${row.case_ordinal}-${Date.now().toString(36)}`;
  const url = new URL("rik:///request");
  url.searchParams.set("canonicalRevisionId", revisionId);
  url.searchParams.set("prompt", String(search.searchText));
  url.searchParams.set("launchId", launchId);
  url.searchParams.set("r4case", row.case_id);
  url.searchParams.set("cold", coldRestart ? "1" : "0");
  const deepLink = url.toString();
  // MainActivity is singleTask: omitting CLEAR_TASK is what makes subsequent
  // cases reach the mounted activity through onNewIntent (warm delivery).
  const launch = adb(["shell", "am", "start", "-W", "-n", MAIN_ACTIVITY,
    "-a", "android.intent.action.VIEW", "-d", escapeAndroidRemoteShellUri(deepLink)], 60_000);
  if (!coldRestart && !isWarmAndroidActivityDelivery(launch)) blockers.push("R5_ANDROID_WARM_DELIVERY_RED");
  const lifecycle = await waitForLifecycleAck(launchId);
  const audit = await waitForRevisionAudit(auditLog, auditBefore, revisionId, row.work_identity);
  const readyXml = await waitForNativeRevisionUi(row.case_id, String(search.searchText));
  const top = capture(output, row, "top", readyXml);
  const rowCountTraversal = await findVisibleNativeRevisionRowCount(
    row.case_id,
    row.row_count,
    top.xml,
  );
  const revisionMarker = capture(output, row, "revision-marker", rowCountTraversal.xml);
  const rowCount = nodeById(revisionMarker.xml, "request-estimate-row-count")?.text ?? "";
  const activity = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  if (!top.xml.includes("consumer-repair-screen")) blockers.push("NATIVE_REQUEST_SCREEN_RED");
  if (!rowCount.match(new RegExp(`\\b${row.row_count}\\b`, "u"))) blockers.push("NATIVE_ROW_COUNT_RED");
  if (!activity.includes(PACKAGE_NAME) || activity.includes("com.android.chrome/.Main")) blockers.push("NATIVE_MAIN_ACTIVITY_RED");
  if (!launch.includes(MAIN_ACTIVITY)) blockers.push("NATIVE_EXACT_COMPONENT_LAUNCH_RED");
  const bottomNav = ["app-bottom-nav", "bottom-tab-office", "bottom-tab-request", "bottom-tab-profile"]
    .some((id) => Boolean(nodeById(top.xml, id)));
  if (!bottomNav) blockers.push("NATIVE_BOTTOM_NAV_RED");

  let keyboardProof: Json | null = null;
  let endProof: Json | null = null;
  if (exhaustive) {
    let quantityNode = nodeByIdPrefix(top.xml, "consumer-repair-item-quantity-input-");
    let quantityProbeCount = 0;
    while (!quantityNode && quantityProbeCount < 18) {
      adb(["shell", "input", "swipe", "540", "1500", "540", "980", "260"], 5_000);
      quantityProbeCount += 1;
      await delay(100);
      const probe = capture(output, row, `quantity-probe-${quantityProbeCount}`);
      quantityNode = nodeByIdPrefix(probe.xml, "consumer-repair-item-quantity-input-");
      if (nodeById(probe.xml, "consumer-repair-bottom-actions") && !quantityNode) break;
    }
    const point = center(quantityNode?.bounds ?? "");
    if (point) {
      adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000);
      await delay(250);
      const inputState = adb(["shell", "dumpsys", "input_method"], 15_000);
      keyboardProof = { quantityInputFound: true, quantityProbeCount,
        keyboardShown: /mInputShown=true|isInputViewShown\(\)=true/iu.test(inputState),
        inputStateSha256: sha256(inputState) };
      if (!keyboardProof.keyboardShown) blockers.push("NATIVE_KEYBOARD_RED");
      adb(["shell", "input", "keyevent", "4"], 5_000);
      await delay(200);
      adb(["shell", "input", "tap", "540", "260"], 5_000);
    } else {
      keyboardProof = { quantityInputFound: false, quantityProbeCount, keyboardShown: false };
      blockers.push("NATIVE_KEYBOARD_INPUT_NOT_VISIBLE");
    }
    for (let swipe = 0; swipe < 80; swipe += 1) {
      const x = [1020, 60, 540][swipe % 3]!;
      adb(["shell", "input", "swipe", String(x), "1700", String(x), "450", "220"], 5_000);
      if ((swipe + 1) % 2 !== 0) continue;
      await delay(80);
      const probeXml = dumpUiXml(`${row.case_id}-footer-probe-${swipe + 1}`);
      if (nodeById(probeXml, "consumer-repair-bottom-actions")) break;
    }
    const end = capture(output, row, "end");
    endProof = { xml: end.xmlProof, screenshot: end.pngProof,
      bottomActionsVisible: Boolean(nodeById(end.xml, "consumer-repair-bottom-actions")),
      bottomNavigationVisible: ["app-bottom-nav", "bottom-tab-office", "bottom-tab-request", "bottom-tab-profile"]
        .some((id) => Boolean(nodeById(end.xml, id))) };
    if (!endProof.bottomActionsVisible || !endProof.bottomNavigationVisible) blockers.push("NATIVE_END_OF_FORM_RED");
  }

  const [revision, rows, history, artifacts] = await Promise.all([
    api(apiRoot, `revisions/${revisionId}`),
    allRevisionRows(apiRoot, revisionId),
    api(apiRoot, `revisions?catalogId=${encodeURIComponent(row.work_identity)}&limit=100`),
    artifactPromises,
  ]);
  const [pdf, procurement] = artifacts;
  if (revision.revisionId !== revisionId || revision.releaseId !== releaseId
    || revision.catalogId !== row.work_identity || Number(revision.rowCount) !== row.row_count) {
    blockers.push("REVISION_IDENTITY_RED");
  }
  const canonicalWorkTitleRu = String(revision.canonicalWorkTitleRu ?? "").trim();
  if (!canonicalWorkTitleRu || !xmlDecode(top.xml).includes(canonicalWorkTitleRu)) blockers.push("NATIVE_WORK_TITLE_RED");
  if (rows.length !== row.row_count) blockers.push("BACKEND_ROWS_RED");
  if (!(history.revisions as Json[]).some((item) => item.revisionId === revisionId)) blockers.push("HISTORY_REVISION_MISSING");
  if (pdf.status !== "ready" || pdf.revisionId !== revisionId) blockers.push("PDF_RED");
  if (procurement.status !== "ready" || procurement.revisionId !== revisionId) blockers.push("PROCUREMENT_RED");
  if (!audit.some((item) => item.authorizationPresent === true && item.status === 200)) blockers.push("NATIVE_AUTH_NETWORK_RED");
  const nativeAuditGreen = (pathPrefix: string) => audit.some((item) => item.method === "GET" && item.status === 200
    && String(item.userAgent).startsWith("okhttp/") && String(item.path).startsWith(pathPrefix));
  if (!nativeAuditGreen(`/canonical-estimate/revisions/${revisionId}`)
    || !nativeAuditGreen(`/canonical-estimate/revisions/${revisionId}/rows?`)
    || !nativeAuditGreen(`/canonical-estimate/catalog/${encodeURIComponent(row.work_identity)}?releaseId=`)) {
    blockers.push("NATIVE_EXACT_CATALOG_NETWORK_RED");
  }

  return {
    contract: "rik-expo-app-r4.work-group-surface-case.v1",
    master_sha256: MASTER_SHA256,
    batch_id: row.batch_id,
    work_group_id: row.work_group_id,
    case_id: row.case_id,
    case_ordinal: row.case_ordinal,
    work_identity: row.work_identity,
    scenario_class: row.scenario_class,
    surface: "ANDROID_API34",
    source_sha: sourceSha,
    build_sha: buildSha,
    input_sha: row.input_sha,
    revision_id: revisionId,
    boq_sha: row.boq_sha,
    search_ok: true,
    content_ok: blockers.every((item) => !["NATIVE_ROW_COUNT_RED", "REVISION_IDENTITY_RED", "BACKEND_ROWS_RED"].includes(item)),
    formula_ok: blockers.every((item) => item !== "BACKEND_ROWS_RED"),
    ui_ok: blockers.every((item) => !item.startsWith("NATIVE_")),
    history_ok: blockers.every((item) => item !== "HISTORY_REVISION_MISSING"),
    pdf_ok: blockers.every((item) => item !== "PDF_RED"),
    procurement_ok: blockers.every((item) => item !== "PROCUREMENT_RED"),
    visual_review_ok: top.pngProof.pixelIntegrity === "GREEN" && (!endProof || endProof.screenshot.pixelIntegrity === "GREEN"),
    paired_same_input_web_android: row.case_ordinal <= 5,
    search_proof: search,
    android: {
      device_id: DEVICE_ID,
      api_level: 34,
      model: adb(["shell", "getprop", "ro.product.model"], 10_000),
      package_name: PACKAGE_NAME,
      main_activity: MAIN_ACTIVITY,
      cold_restart: coldRestart,
      warm_activity_task_reset: !coldRestart,
      deep_link: deepLink,
      launch_id: launchId,
      lifecycle,
      warm_activity_delivery: coldRestart ? null : isWarmAndroidActivityDelivery(launch),
      cold_activity_delivery: coldRestart ? !isWarmAndroidActivityDelivery(launch) : null,
      exact_component_launch: launch.includes(MAIN_ACTIVITY),
      top_xml: top.xmlProof,
      top_screenshot: top.pngProof,
      revision_marker: {
        xml: revisionMarker.xmlProof,
        screenshot: revisionMarker.pngProof,
        bounded_scroll_count: rowCountTraversal.scrollCount,
        expected_row_count: row.row_count,
        visible_row_count: rowCount,
      },
      keyboard: keyboardProof,
      end_of_long_form: endProof,
      bottom_navigation_visible: bottomNav,
      safe_area_contract: "EDGE_TO_EDGE_API34_WITH_VISIBLE_BOTTOM_NAVIGATION",
      photo_check: "NOT_APPLICABLE_READ_ONLY_FROZEN_REVISION_CASE",
      visual_review_method: "REAL_API34_MAINACTIVITY_UIAUTOMATOR_PLUS_PIXEL_INTEGRITY_AND_GROUP_EXHAUSTIVE_COLD_RESTART_END_SCROLL",
      request_audit_rows: audit.length,
      request_audit_sha256: sha256(stableJson(audit)),
    },
    artifacts: {
      pdf: { artifact_id: pdf.artifactId, sha256: pdf.sha256, revision_id: pdf.revisionId },
      procurement: { artifact_id: procurement.artifactId, sha256: procurement.sha256, revision_id: procurement.revisionId },
    },
    defects: blockers,
    production_accessed: false,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: Number((performance.now() - started).toFixed(3)),
    verdict: blockers.length === 0 ? "GREEN" : "RED",
  };
}

async function main(): Promise<void> {
  const batchId = argument("batch");
  invariant(/^BATCH-00[1-8]$/u.test(batchId), "R4_ANDROID_BATCH_REQUIRED");
  const sourceSha = argument("source-sha");
  const buildSha = argument("build-sha");
  invariant(SOURCE_SHA_RE.test(sourceSha) && SOURCE_SHA_RE.test(buildSha), "R4_ANDROID_SOURCE_AND_BUILD_SHA_REQUIRED");
  const apiRoot = argument("api-root", "http://127.0.0.1:8765/canonical-estimate").replace(/\/+$/u, "");
  const output = resolve(argument("output",
    `.release-runtime/real-useful-estimates-r4/evidence/current-green/work-group-runtime/android/${batchId.toLowerCase()}`));
  const auditLog = resolve(argument("audit-log"));
  const apkPath = resolve(argument("apk", "android/app/build/outputs/apk/release/app-release.apk"));
  const offset = Math.max(0, Number(argument("offset", "0")) || 0);
  const limitArgument = Number(argument("limit", "0")) || 0;
  invariant(auditLog && SOURCE_SHA_RE.test(sha256(readFileSync(apkPath))), "R4_ANDROID_AUDIT_OR_APK_MISSING");
  invariant(sha256(readFileSync(apkPath)) === buildSha, "R4_ANDROID_APK_BUILD_SHA_RED");
  const apiLevel = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000);
  invariant(apiLevel === "34", `R4_ANDROID_API_LEVEL_RED:${apiLevel}`);
  const packagePath = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000);
  invariant(packagePath.startsWith("package:"), "R4_ANDROID_PACKAGE_NOT_INSTALLED");
  const installedApkPath = packagePath.split(/\r?\n/u)[0]!.replace(/^package:/u, "");
  const installedSha = adb(["shell", "sha256sum", installedApkPath], 30_000).split(/\s+/u)[0];
  invariant(installedSha === buildSha, `R4_ANDROID_INSTALLED_APK_SHA_RED:${installedSha}`);
  const { aggregateProof, binding, backendCases } = loadBatch(batchId);
  const expected = backendCases.filter((row) => row.case_ordinal <= 5
    || (row.case_ordinal >= 16 && row.case_ordinal <= 25));
  invariant(expected.length === binding.work_groups * 15 && expected.every((row) => row.compile_job_status === "succeeded"),
    `R4_ANDROID_15_PER_GROUP_PLAN_RED:${batchId}`);
  mkdirSync(output, { recursive: true });
  const ledgerPath = join(output, `${batchId}_ANDROID_API34_CASES_R4.jsonl`);
  const identityHistory = jsonl(ledgerPath)
    .filter((row) => row.source_sha === sourceSha && row.build_sha === buildSha);
  const latestHistory = new Map<string, Json>();
  const firstHistoryByGroup = new Map<string, Json>();
  for (const row of identityHistory) {
    latestHistory.set(String(row.case_id), row);
    const workGroupId = String(row.work_group_id);
    if (!firstHistoryByGroup.has(workGroupId)) firstHistoryByGroup.set(workGroupId, row);
  }
  const completed = new Set([...latestHistory.entries()]
    .filter(([, row]) => currentGreenCase(row, sourceSha, buildSha))
    .map(([caseId]) => caseId));
  const pendingAll = expected.filter((row) => !completed.has(row.case_id));
  const pending = pendingAll.slice(offset, limitArgument > 0 ? offset + limitArgument : undefined);
  const runtime = await api(apiRoot, "runtime-manifest");
  invariant(["rik_r4_runtime", "rik_r4_runtime_b5_v2"].includes(String(runtime.database?.name))
    && runtime.specSha256 === MASTER_SHA256,
    `R4_ANDROID_RUNTIME_IDENTITY_RED:${batchId}`);
  const auth = completed.size > 0 ? { method: "PERSISTED_LOCAL_PROOF_SESSION_FROM_RESUMABLE_LEDGER" }
    : await bootstrapAuthentication(output);
  const searchCache = new Map<string, Promise<Json>>();
  const exhaustiveGroups = new Set([...latestHistory.values()]
    .filter((row) => currentGreenCase(row, sourceSha, buildSha)
      && (row.android as Json | undefined)?.end_of_long_form)
    .map((row) => String(row.work_group_id)));
  const coldAttemptedGroups = new Set(identityHistory
    .filter((row) => (row.android as Json | undefined)?.cold_restart === true
      || (row.execution_mode as Json | undefined)?.cold_restart === true)
    .map((row) => String(row.work_group_id)));
  // Rows written before execution_mode was persisted used the same deterministic
  // policy: the first C01 attempt for a group was its one cold-start attempt.
  for (const [workGroupId, row] of firstHistoryByGroup) {
    if (row.case_ordinal === 1) coldAttemptedGroups.add(workGroupId);
  }
  let newGreen = 0;
  let newRed = 0;
  adb(["logcat", "-c"], 15_000);
  for (const row of pending) {
    let search = searchCache.get(row.work_identity);
    if (!search) {
      search = searchProof(apiRoot, row.work_identity);
      searchCache.set(row.work_identity, search);
    }
    const exhaustive = !exhaustiveGroups.has(row.work_group_id);
    const coldRestart = exhaustive && !coldAttemptedGroups.has(row.work_group_id);
    if (coldRestart) coldAttemptedGroups.add(row.work_group_id);
    try {
      const result = await executeCase({ row, output, apiRoot, auditLog, sourceSha, buildSha,
        releaseId: binding.release_id, search: await search, exhaustive, coldRestart });
      appendJsonl(ledgerPath, result);
      if (result.verdict === "GREEN") {
        newGreen += 1;
        if (exhaustive) exhaustiveGroups.add(row.work_group_id);
      } else newRed += 1;
    } catch (error) {
      appendJsonl(ledgerPath, {
        contract: "rik-expo-app-r4.work-group-surface-case.v1",
        master_sha256: MASTER_SHA256,
        batch_id: batchId,
        work_group_id: row.work_group_id,
        case_id: row.case_id,
        case_ordinal: row.case_ordinal,
        work_identity: row.work_identity,
        scenario_class: row.scenario_class,
        surface: "ANDROID_API34",
        source_sha: sourceSha,
        build_sha: buildSha,
        input_sha: row.input_sha,
        revision_id: row.revision_id,
        boq_sha: row.boq_sha,
        execution_mode: { exhaustive, cold_restart: coldRestart },
        defects: [error instanceof Error ? error.message : String(error)],
        production_accessed: false,
        verdict: "RED",
      });
      newRed += 1;
    }
  }
  const logcat = adb(["logcat", "-d", "-v", "brief", "AndroidRuntime:E", "ActivityManager:E", "*:S"], 60_000);
  const logPath = join(output, `${batchId}_ANDROID_LOGCAT_R4.log`);
  writeFileSync(logPath, logcat, "utf8");
  const escapedPackageName = PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const appRuntimeFailure = new RegExp(
    `(?:FATAL EXCEPTION[\\s\\S]{0,2000}?Process:\\s*${escapedPackageName}(?:\\s|,|$))|(?:ANR in\\s+${escapedPackageName}(?:\\s|$))`,
    "iu",
  ).test(logcat);
  const harnessUiAutomatorFatalObserved = /FATAL EXCEPTION[\s\S]{0,2000}?Process:\s*com\.android\.commands\.uiautomator(?:\s|,|$)/iu
    .test(logcat);
  const latest = new Map<string, Json>();
  for (const row of jsonl(ledgerPath)) {
    if (row.source_sha === sourceSha && row.build_sha === buildSha) {
      latest.set(String(row.case_id), row);
    }
  }
  const current = expected.map((row) => latest.get(row.case_id)).filter(Boolean) as Json[];
  const green = current.filter((row) => currentGreenCase(row, sourceSha, buildSha));
  const currentLedgerPath = join(output, `${batchId}_ANDROID_API34_CURRENT_CASES_R4.jsonl`);
  writeFileSync(currentLedgerPath, `${current.map((row) => stableJson(row)).join("\n")}\n`, "utf8");
  const groups = new Set(expected.map((row) => row.work_group_id));
  const groupGreen = [...groups].filter((group) => green.filter((row) => row.work_group_id === group).length >= 15).length;
  const summary = {
    contract: "rik-expo-app-r4.work-group-android-api34-surface-summary.v1",
    master_sha256: MASTER_SHA256,
    source_sha: sourceSha,
    build_sha: buildSha,
    batch_id: batchId,
    release_id: binding.release_id,
    device: { id: DEVICE_ID, apiLevel: 34, model: adb(["shell", "getprop", "ro.product.model"], 10_000),
      packageName: PACKAGE_NAME, mainActivity: MAIN_ACTIVITY, installedApkSha256: installedSha },
    auth,
    expected_cases: expected.length,
    completed_cases: current.length,
    green_cases: green.length,
    red_cases: current.length - green.length,
    paired_cases_green: green.filter((row) => row.paired_same_input_web_android === true).length,
    work_groups_expected: binding.work_groups,
    work_groups_green_15_of_15: groupGreen,
    new_execution: { pending_selected: pending.length, green: newGreen, red: newRed },
    parents: { backend_aggregate: aggregateProof, backend_ledger: fileProof(resolve(binding.ledger.path)) },
    ledger: fileProof(currentLedgerPath),
    resumable_history_ledger: fileProof(ledgerPath),
    logcat: fileProof(logPath),
    android_anr_or_crash: appRuntimeFailure,
    harness_uiautomator_fatal_observed: harnessUiAutomatorFatalObserved,
    production_accessed: false,
    status: green.length === expected.length && !appRuntimeFailure
      ? "GREEN_ANDROID_API34_15_PER_WORK_GROUP" : newRed > 0 ? "RED" : "R4_ANDROID_IN_PROGRESS",
  };
  atomicJson(join(output, `${batchId}_ANDROID_API34_SUMMARY_R4.json`), summary);
  process.stdout.write(`${JSON.stringify({ status: summary.status, batchId, expected: expected.length,
    completed: current.length, green: green.length, newGreen, newRed }, null, 2)}\n`);
  if (newRed > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
