import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  createConsumerRepairRequestDraft,
  updateConsumerRepairRequestItemQuantity,
  updateConsumerRepairRequestItemUnitPrice,
  __resetConsumerRepairRequestStoreForTests,
} from "../../src/lib/consumerRequests";
import { createAndroidHarness } from "../_shared/androidHarness";
import { API34_DEVICE_READY, ensureAndroidApi34DeviceReady } from "./ensureAndroidApi34DeviceReady";
import { runCommandProbe, type CommandProbe } from "./androidAdbDeviceHealth";
import { hasVisibleMojibake } from "./runRequestEstimateSelectedWorkUxMojibakeRootCauseScan";

const WAVE = "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT_CLOSEOUT_POINT_OF_NO_RETURN";
const ARTIFACT_DIR = path.join(process.cwd(), "artifacts", "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT");
const GREEN = "GREEN_ANDROID_API34_EDITABLE_ESTIMATE_WORKSPACE_READY";
const BLOCKED = "BLOCKED_EDITABLE_ESTIMATE_WORKSPACE_ANDROID_API34";
const APP_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const DEV_CLIENT_PORT = Number(process.env.ANDROID_EDITABLE_ESTIMATE_DEV_CLIENT_PORT ?? 8107);
const APK_PATH = path.join(process.cwd(), "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const PROMPT = "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u043b\u0435\u043d\u0442\u043e\u0447\u043d\u044b\u0439 \u0444\u0443\u043d\u0434\u0430\u043c\u0435\u043d\u0442 \u0434\u043b\u0438\u043d\u0430 48 \u043c \u0448\u0438\u0440\u0438\u043d\u0430 0,4 \u043c \u0432\u044b\u0441\u043e\u0442\u0430 1.7 \u043c";
const QUANTITY_OVERRIDE = 250;
const PRICE_OVERRIDE = 1237;

type AndroidXmlNode = {
  raw: string;
  text: string;
  resourceId: string;
  contentDesc: string;
  bounds: string;
};

type AndroidScreenDump = {
  xml: string;
  xmlPath: string | null;
  pngPath: string | null;
};

type AndroidRouteAttempt = {
  route: string;
  start_exit_code: number | null;
  start_output: string;
  dumps: number;
  request_ready: boolean;
  auth_login_screen: boolean;
  xml_path: string | null;
  png_path: string | null;
};

function currentHead(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, name), `${JSON.stringify({
    source_code_head: currentHead(),
    current_head_at_write_time: currentHead(),
    fake_green_claimed: false,
    ...value as Record<string, unknown>,
  }, null, 2)}\n`, "utf8");
}

function clip(value: string | null | undefined, maxChars = 1200): string {
  const text = String(value ?? "");
  return text.length > maxChars ? `${text.slice(0, maxChars)}...` : text;
}

function adb(adbPath: string, deviceId: string, args: string[], timeoutMs = 10_000): CommandProbe {
  return runCommandProbe(adbPath, ["-s", deviceId, ...args], timeoutMs);
}

function installDebugApk(adbPath: string, deviceId: string) {
  const apkExists = fs.existsSync(APK_PATH);
  const packagePath = adb(adbPath, deviceId, ["shell", "pm", "path", APP_PACKAGE], 10_000);
  const alreadyInstalled = packagePath.exit_code === 0 && /package:/i.test(`${packagePath.stdout}${packagePath.stderr}`);
  if (!apkExists) {
    return {
      apk_exists: false,
      install_attempted: false,
      install_ok: alreadyInstalled,
      package_installed: alreadyInstalled,
      output: clip(`${packagePath.stdout}${packagePath.stderr}`),
    };
  }
  const install = adb(adbPath, deviceId, ["install", "-r", APK_PATH], 180_000);
  const output = `${install.stdout}${install.stderr}`;
  const installed = adb(adbPath, deviceId, ["shell", "pm", "path", APP_PACKAGE], 10_000);
  const packageInstalled = installed.exit_code === 0 && /package:/i.test(`${installed.stdout}${installed.stderr}`);
  return {
    apk_exists: true,
    install_attempted: true,
    install_ok: /Success/i.test(output) && packageInstalled,
    package_installed: packageInstalled,
    output: clip(output),
  };
}

function routeCandidates(): string[] {
  const query = new URLSearchParams();
  query.set("prompt", PROMPT);
  const promptQuery = query.toString();
  const autoPrepareQuery = `${promptQuery}\\&autoPrepare=1`;
  return [
    `rik:///request?${autoPrepareQuery}`,
    `rik://request?${autoPrepareQuery}`,
    `rik:///%28tabs%29/request?${autoPrepareQuery}`,
  ];
}

function isRequestRouteReady(xml: string): boolean {
  return (
    xml.includes("request-estimate-summary-card") ||
    xml.includes("consumer-repair-screen") ||
    xml.includes("ROUTE_PROOF_REQUEST_ROUTE_READY")
  );
}

function isAuthLoginScreen(xml: string): boolean {
  return (
    xml.includes("auth.login.screen") ||
    (xml.includes("auth.login.email") && xml.includes("auth.login.password")) ||
    (/Email/i.test(xml) && /auth\.login\.submit|Login|\u0412\u043e\u0439\u0442\u0438/i.test(xml))
  );
}

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attr(raw: string, name: string): string {
  const match = raw.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return decodeXmlAttr(match?.[1] ?? "");
}

function nodes(xml: string): AndroidXmlNode[] {
  return (xml.match(/<node\b[^>]*>/g) ?? []).map((raw) => ({
    raw,
    text: attr(raw, "text"),
    resourceId: attr(raw, "resource-id"),
    contentDesc: attr(raw, "content-desc"),
    bounds: attr(raw, "bounds"),
  }));
}

function nodeHaystack(node: AndroidXmlNode): string {
  return [node.text, node.resourceId, node.contentDesc, node.raw].join(" ");
}

function findNode(xml: string, token: string): AndroidXmlNode | null {
  return nodes(xml).find((node) => nodeHaystack(node).includes(token)) ?? null;
}

function parseBounds(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  if (right <= left || bottom <= top) return null;
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
}

function extractRowId(node: AndroidXmlNode, prefix: string): string | null {
  const match = nodeHaystack(node).match(new RegExp(`${prefix}([^\\s"']+)`));
  return match?.[1] ?? null;
}

function visibleText(xml: string): string {
  return nodes(xml)
    .flatMap((node) => [node.text, node.contentDesc])
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function internalKeysVisible(text: string): number {
  return (text.match(/\b(?:PRICE_MISSING|USER_PRICE_OVERRIDE|USER_ENTERED_PRICE|CATALOG_PRICE_VERIFIED|REFERENCE_PRICE_ESTIMATE|PRICEBOOK_VERIFIED|catalogItemId|sourceId|row_key|snapshot_id)\b/g) ?? []).length;
}

function hasMojibake(text: string): boolean {
  return hasVisibleMojibake(text);
}

function moneyFromText(value: string): number | null {
  const compact = value.replace(/[^\d-]/g, "");
  if (!compact) return null;
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyFromNodeText(node: AndroidXmlNode | null | undefined): number | null {
  return moneyFromText(node?.text ?? "");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function tapAndReplace(
  adbPath: string,
  deviceId: string,
  node: AndroidXmlNode,
  value: string,
  options: { dismissKeyboard?: boolean } = {},
): Promise<boolean> {
  const center = parseBounds(node.bounds);
  if (!center) return false;
  adb(adbPath, deviceId, ["shell", "input", "tap", String(center.x), String(center.y)], 10_000);
  await sleep(600);
  adb(adbPath, deviceId, ["shell", "input", "keyevent", "123"], 10_000);
  for (let index = 0; index < 16; index += 1) {
    adb(adbPath, deviceId, ["shell", "input", "keyevent", "67"], 10_000);
  }
  const typed = adb(adbPath, deviceId, ["shell", "input", "text", value], 10_000);
  await sleep(1000);
  if (options.dismissKeyboard) {
    adb(adbPath, deviceId, ["shell", "input", "keyevent", "4"], 10_000);
    await sleep(900);
  }
  return typed.exit_code === 0;
}

async function scrollUntilNodeVisible(input: {
  harness: ReturnType<typeof createAndroidHarness>;
  adbPath: string;
  deviceId: string;
  token: string;
  artifactBase: string;
  current: AndroidScreenDump;
  maxCenterY?: number;
  maxScrolls?: number;
}): Promise<AndroidScreenDump & { scroll_attempts: number; scrolled_to_token: boolean }> {
  let current = input.current;
  const isSafe = (xml: string): boolean => {
    const node = findNode(xml, input.token);
    if (!node) return false;
    const center = parseBounds(node.bounds);
    return input.maxCenterY == null || (center != null && center.y <= input.maxCenterY);
  };
  if (isSafe(current.xml)) {
    return { ...current, scroll_attempts: 0, scrolled_to_token: true };
  }

  const maxScrolls = input.maxScrolls ?? 10;
  for (let attempt = 1; attempt <= maxScrolls; attempt += 1) {
    adb(input.adbPath, input.deviceId, ["shell", "input", "swipe", "240", "620", "240", "220", "650"], 10_000);
    await sleep(900);
    current = input.harness.dumpAndroidScreen(`${input.artifactBase}_scroll_${attempt}`);
    if (isSafe(current.xml)) {
      return { ...current, scroll_attempts: attempt, scrolled_to_token: true };
    }
  }

  return { ...current, scroll_attempts: maxScrolls, scrolled_to_token: findNode(current.xml, input.token) != null };
}

async function openEditableEstimateRoute(input: {
  harness: ReturnType<typeof createAndroidHarness>;
  adbPath: string;
  deviceId: string;
  packageName: string;
  routes: string[];
  artifactBase: string;
  timeoutPerRouteMs?: number;
  delayMs?: number;
}): Promise<AndroidScreenDump & {
  route_opened: boolean;
  auth_login_screen_detected: boolean;
  route_attempts: AndroidRouteAttempt[];
}> {
  let current: AndroidScreenDump = { xml: "", xmlPath: null, pngPath: null };
  const routeAttempts: AndroidRouteAttempt[] = [];
  const timeoutPerRouteMs = input.timeoutPerRouteMs ?? 50_000;
  const delayMs = input.delayMs ?? 1500;

  for (let routeIndex = 0; routeIndex < input.routes.length; routeIndex += 1) {
    const route = input.routes[routeIndex];
    const start = adb(
      input.adbPath,
      input.deviceId,
      ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", route, input.packageName],
      20_000,
    );
    const startedAt = Date.now();
    let dumpCount = 0;
    let requestReady = false;
    let authLoginScreen = false;

    while (Date.now() - startedAt < timeoutPerRouteMs) {
      await sleep(delayMs);
      dumpCount += 1;
      current = input.harness.dumpAndroidScreen(`${input.artifactBase}-route-${routeIndex + 1}-${dumpCount}`);
      requestReady = isRequestRouteReady(current.xml);
      authLoginScreen = isAuthLoginScreen(current.xml);
      if (requestReady) {
        routeAttempts.push({
          route,
          start_exit_code: start.exit_code,
          start_output: clip(`${start.stdout}${start.stderr}`, 700),
          dumps: dumpCount,
          request_ready: true,
          auth_login_screen: authLoginScreen,
          xml_path: current.xmlPath,
          png_path: current.pngPath,
        });
        return {
          ...current,
          route_opened: true,
          auth_login_screen_detected: routeAttempts.some((attempt) => attempt.auth_login_screen),
          route_attempts: routeAttempts,
        };
      }

      if (authLoginScreen && dumpCount % 4 === 0) {
        adb(
          input.adbPath,
          input.deviceId,
          ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", route, input.packageName],
          20_000,
        );
      }
    }

    routeAttempts.push({
      route,
      start_exit_code: start.exit_code,
      start_output: clip(`${start.stdout}${start.stderr}`, 700),
      dumps: dumpCount,
      request_ready: requestReady,
      auth_login_screen: authLoginScreen,
      xml_path: current.xmlPath,
      png_path: current.pngPath,
    });
  }

  return {
    ...current,
    route_opened: isRequestRouteReady(current.xml),
    auth_login_screen_detected: routeAttempts.some((attempt) => attempt.auth_login_screen) || isAuthLoginScreen(current.xml),
    route_attempts: routeAttempts,
  };
}

type EditableAndroidRowCandidate = {
  rowId: string;
  quantityNode: AndroidXmlNode;
  priceNode: AndroidXmlNode;
  quantityCenter: { x: number; y: number };
  priceCenter: { x: number; y: number };
};

type EditableAndroidPartialRow = {
  rowId: string;
  quantityCenter: { x: number; y: number } | null;
  priceCenter: { x: number; y: number } | null;
};

function editableRowCandidates(xml: string): EditableAndroidRowCandidate[] {
  const rowIds = new Set<string>();
  for (const node of nodes(xml)) {
    const quantityRowId = extractRowId(node, "consumer-repair-item-quantity-input-");
    if (quantityRowId) rowIds.add(quantityRowId);
    const priceRowId = extractRowId(node, "consumer-repair-item-unit-price-input-");
    if (priceRowId) rowIds.add(priceRowId);
  }

  return [...rowIds]
    .flatMap((rowId) => {
      const quantityNode = findNode(xml, `consumer-repair-item-quantity-input-${rowId}`);
      const priceNode = findNode(xml, `consumer-repair-item-unit-price-input-${rowId}`);
      const quantityCenter = quantityNode ? parseBounds(quantityNode.bounds) : null;
      const priceCenter = priceNode ? parseBounds(priceNode.bounds) : null;
      if (!quantityNode || !priceNode || !quantityCenter || !priceCenter) return [];
      return [{ rowId, quantityNode, priceNode, quantityCenter, priceCenter }];
    })
    .sort((left, right) => left.quantityCenter.y - right.quantityCenter.y);
}

function partialEditableRows(xml: string): EditableAndroidPartialRow[] {
  const rowIds = new Set<string>();
  for (const node of nodes(xml)) {
    const quantityRowId = extractRowId(node, "consumer-repair-item-quantity-input-");
    if (quantityRowId) rowIds.add(quantityRowId);
    const priceRowId = extractRowId(node, "consumer-repair-item-unit-price-input-");
    if (priceRowId) rowIds.add(priceRowId);
  }

  return [...rowIds]
    .map((rowId) => {
      const quantityNode = findNode(xml, `consumer-repair-item-quantity-input-${rowId}`);
      const priceNode = findNode(xml, `consumer-repair-item-unit-price-input-${rowId}`);
      return {
        rowId,
        quantityCenter: quantityNode ? parseBounds(quantityNode.bounds) : null,
        priceCenter: priceNode ? parseBounds(priceNode.bounds) : null,
      };
    })
    .sort((left, right) => {
      const leftY = left.quantityCenter?.y ?? left.priceCenter?.y ?? Number.POSITIVE_INFINITY;
      const rightY = right.quantityCenter?.y ?? right.priceCenter?.y ?? Number.POSITIVE_INFINITY;
      return leftY - rightY;
    });
}

function safeEditableRowCandidate(xml: string): EditableAndroidRowCandidate | null {
  return editableRowCandidates(xml).find((candidate) => (
    candidate.quantityCenter.y >= 150 &&
    candidate.quantityCenter.y <= 430 &&
    candidate.priceCenter.y >= 150 &&
    candidate.priceCenter.y <= 410
  )) ?? null;
}

async function alignEditableRowForAndroidTap(input: {
  harness: ReturnType<typeof createAndroidHarness>;
  adbPath: string;
  deviceId: string;
  artifactBase: string;
  current: AndroidScreenDump;
}): Promise<AndroidScreenDump & EditableAndroidRowCandidate & { align_attempts: number; aligned_to_safe_row: boolean }> {
  let current = input.current;
  const safe = safeEditableRowCandidate(current.xml);
  if (safe) {
    return { ...current, ...safe, align_attempts: 0, aligned_to_safe_row: true };
  }

  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const partialRows = partialEditableRows(current.xml);
    const firstPartial = partialRows[0] ?? null;
    const visibleCandidate = editableRowCandidates(current.xml)[0] ?? null;
    const firstQuantityY = firstPartial?.quantityCenter?.y ?? null;
    const firstPriceY = firstPartial?.priceCenter?.y ?? null;
    const rowTooHigh = (
      (firstQuantityY != null && firstQuantityY < 150) ||
      (firstPriceY != null && firstPriceY < 150) ||
      (firstQuantityY == null && firstPriceY != null && firstPriceY < 260)
    );

    if (rowTooHigh) {
      adb(input.adbPath, input.deviceId, ["shell", "input", "swipe", "240", "300", "240", "430", "250"], 10_000);
    } else {
      adb(input.adbPath, input.deviceId, ["shell", "input", "swipe", "240", "570", "240", "470", "250"], 10_000);
    }
    await sleep(650);
    current = input.harness.dumpAndroidScreen(`${input.artifactBase}_align_${attempt}`);
    const nextSafe = safeEditableRowCandidate(current.xml);
    if (nextSafe) {
      return { ...current, ...nextSafe, align_attempts: attempt, aligned_to_safe_row: true };
    }
    if (!partialRows.length && visibleCandidate == null) {
      await sleep(350);
    }
  }

  const fallback = editableRowCandidates(current.xml)[0] ?? null;
  if (fallback) {
    return { ...current, ...fallback, align_attempts: 12, aligned_to_safe_row: false };
  }
  throw new Error("ANDROID_EDITABLE_ROW_NOT_ALIGNED");
}

function deterministicSnapshotProof() {
  __resetConsumerRepairRequestStoreForTests();
  let bundle = createConsumerRepairRequestDraft({
    consumerUserId: "android-api34-editable-estimate-proof-user",
    problemText: PROMPT,
    repairType: "foundation",
    city: "Bishkek",
    contactPhone: "+996700000000",
    aiDraft: buildConsumerRepairAiDraft(PROMPT),
  });
  const priced = bundle.items.find((item) => item.unitPrice != null && item.unitPrice > 0);
  if (!priced) {
    return {
      passed: false,
      failures: ["DETERMINISTIC_PRICED_ROW_MISSING"],
      snapshot_updated: false,
      line_total_recalculates: false,
      manual_price_status_visible: false,
    };
  }
  const initialHash = bundle.editableEstimateSnapshot?.hash ?? null;
  bundle = updateConsumerRepairRequestItemQuantity({
    requestDraftId: bundle.draft.id,
    itemId: priced.id,
    quantity: QUANTITY_OVERRIDE,
  });
  bundle = updateConsumerRepairRequestItemUnitPrice({
    requestDraftId: bundle.draft.id,
    itemId: priced.id,
    unitPrice: PRICE_OVERRIDE,
  });
  const edited = bundle.items.find((item) => item.id === priced.id);
  const expectedTotal = Math.round(QUANTITY_OVERRIDE * PRICE_OVERRIDE);
  const failures = [
    ...(edited?.quantity === QUANTITY_OVERRIDE ? [] : ["DETERMINISTIC_QUANTITY_NOT_EDITED"]),
    ...(edited?.unitPrice === PRICE_OVERRIDE ? [] : ["DETERMINISTIC_PRICE_NOT_EDITED"]),
    ...(edited?.totalPrice === expectedTotal ? [] : ["DETERMINISTIC_TOTAL_NOT_RECALCULATED"]),
    ...(edited?.priceStatus === "USER_PRICE_OVERRIDE" ? [] : [`DETERMINISTIC_MANUAL_PRICE_STATUS:${edited?.priceStatus ?? "missing"}`]),
    ...(edited?.priceSource === "user" && edited.priceSourceId == null ? [] : ["DETERMINISTIC_MANUAL_PRICE_CLAIMED_AS_SUPPLIER"]),
    ...(bundle.editableEstimateSnapshot?.hash && bundle.editableEstimateSnapshot.hash !== initialHash ? [] : ["DETERMINISTIC_SNAPSHOT_HASH_NOT_UPDATED"]),
  ];
  return {
    passed: failures.length === 0,
    failures,
    snapshot_updated: failures.includes("DETERMINISTIC_SNAPSHOT_HASH_NOT_UPDATED") ? false : true,
    line_total_recalculates: edited?.totalPrice === expectedTotal,
    manual_price_status_visible: edited?.priceStatus === "USER_PRICE_OVERRIDE",
    edited_quantity: edited?.quantity ?? null,
    edited_unit_price: edited?.unitPrice ?? null,
    edited_line_total: edited?.totalPrice ?? null,
    price_status: edited?.priceStatus ?? null,
    price_source: edited?.priceSource ?? null,
    price_source_id: edited?.priceSourceId ?? null,
  };
}

async function androidRouteProof(device: Awaited<ReturnType<typeof ensureAndroidApi34DeviceReady>>) {
  const adbPath = device.adb_path ?? "adb";
  const deviceId = device.device_id ?? "";
  if (device.final_status !== API34_DEVICE_READY || !deviceId) {
    return {
      passed: false,
      request_route_opens: false,
      estimate_rows_visible: false,
      quantity_input_editable: false,
      unit_price_input_editable: false,
      line_total_recalculates: false,
      manual_price_status_visible: false,
      failures: ["ANDROID_API34_DEVICE_NOT_READY"],
      visible_text_sample: "",
    };
  }

  const install = installDebugApk(adbPath, deviceId);
  const harness = createAndroidHarness({
    projectRoot: process.cwd(),
    devClientPort: DEV_CLIENT_PORT,
    devClientStdoutPath: `artifacts/S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_dev_client_${DEV_CLIENT_PORT}.out.log`,
    devClientStderrPath: `artifacts/S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_dev_client_${DEV_CLIENT_PORT}.err.log`,
  });
  let cleanup: (() => void) | undefined;
  let xml = "";
  let xmlPath: string | null = null;
  let pngPath: string | null = null;
  let error: string | null = null;
  let quantityEdited = false;
  let priceEdited = false;
  let totalChanged = false;
  let manualStatusVisible = false;
  let rowScrollAttempts = 0;
  let rowAlignmentAttempts = 0;
  let alignedRowId: string | null = null;
  let alignedToSafeRow = false;
  let scrolledToRows = false;
  let initialRequestRouteOpened = false;
  let authLoginScreenDetected = false;
  let routeAttempts: AndroidRouteAttempt[] = [];

  try {
    if (!install.install_ok || !install.package_installed) {
      throw new Error(`ANDROID_DEBUG_APK_INSTALL_FAILED:${install.output}`);
    }
    const devClient = await harness.ensureAndroidDevClientServer();
    cleanup = devClient.cleanup;
    harness.ensureAndroidReverseProxy(DEV_CLIENT_PORT);
    harness.startAndroidDevClientProject(APP_PACKAGE, DEV_CLIENT_PORT, { stopApp: true });
    await sleep(3000);

    const route = await openEditableEstimateRoute({
      harness,
      adbPath,
      deviceId,
      packageName: APP_PACKAGE,
      routes: routeCandidates(),
      artifactBase: "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace",
      timeoutPerRouteMs: 50_000,
      delayMs: 1500,
    });
    xml = route.xml;
    xmlPath = route.xmlPath;
    pngPath = route.pngPath;
    routeAttempts = route.route_attempts;
    authLoginScreenDetected = route.auth_login_screen_detected;
    initialRequestRouteOpened = route.route_opened;
    if (!initialRequestRouteOpened) {
      throw new Error(authLoginScreenDetected ? "ANDROID_AUTH_SESSION_REQUIRED_FOR_REQUEST_ROUTE" : "ANDROID_REQUEST_ROUTE_NOT_OPEN_AFTER_BOUNDED_ROUTE");
    }

    const rowScreen = await scrollUntilNodeVisible({
      harness,
      adbPath,
      deviceId,
      token: "consumer-repair-item-quantity-input-",
      artifactBase: "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_rows",
      current: { xml, xmlPath, pngPath },
    });
    xml = rowScreen.xml;
    xmlPath = rowScreen.xmlPath;
    pngPath = rowScreen.pngPath;
    rowScrollAttempts = rowScreen.scroll_attempts;
    scrolledToRows = rowScreen.scrolled_to_token;

    const alignedRow = await alignEditableRowForAndroidTap({
      harness,
      adbPath,
      deviceId,
      artifactBase: "S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_rows",
      current: { xml, xmlPath, pngPath },
    });
    xml = alignedRow.xml;
    xmlPath = alignedRow.xmlPath;
    pngPath = alignedRow.pngPath;
    rowAlignmentAttempts = alignedRow.align_attempts;
    alignedRowId = alignedRow.rowId;
    alignedToSafeRow = alignedRow.aligned_to_safe_row;

    const quantityNode = alignedRow.quantityNode;
    const priceNode = alignedRow.priceNode;
    const rowId = alignedRow.rowId;
    const totalNodeBefore = rowId ? findNode(xml, `consumer-repair-item-total-${rowId}`) : null;
    const totalBefore = moneyFromNodeText(totalNodeBefore);
    if (quantityNode) {
      quantityEdited = await tapAndReplace(adbPath, deviceId, quantityNode, String(QUANTITY_OVERRIDE));
      const afterQuantity = harness.dumpAndroidScreen("S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_after_quantity");
      xml = afterQuantity.xml;
      xmlPath = afterQuantity.xmlPath;
      pngPath = afterQuantity.pngPath;
    }
    const freshPriceNode = rowId ? findNode(xml, `consumer-repair-item-unit-price-input-${rowId}`) ?? priceNode : priceNode;
    if (freshPriceNode) {
      priceEdited = await tapAndReplace(adbPath, deviceId, freshPriceNode, String(PRICE_OVERRIDE));
    }
    const after = harness.dumpAndroidScreen("S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_after_edit");
    xml = after.xml;
    xmlPath = after.xmlPath;
    pngPath = after.pngPath;
    const quantityNodeAfter = rowId ? findNode(xml, `consumer-repair-item-quantity-input-${rowId}`) : null;
    const priceNodeAfter = rowId ? findNode(xml, `consumer-repair-item-unit-price-input-${rowId}`) : null;
    quantityEdited = quantityEdited && moneyFromNodeText(quantityNodeAfter) === QUANTITY_OVERRIDE;
    priceEdited = priceEdited && moneyFromNodeText(priceNodeAfter) === PRICE_OVERRIDE;
    const totalNodeAfter = rowId ? findNode(xml, `consumer-repair-item-total-${rowId}`) : null;
    const totalAfter = moneyFromNodeText(totalNodeAfter);
    totalChanged = totalBefore != null && totalAfter === Math.round(QUANTITY_OVERRIDE * PRICE_OVERRIDE);
    let statusNode = rowId ? findNode(xml, `consumer-repair-item-price-status-${rowId}`) : null;
    if (!statusNode && rowId) {
      adb(adbPath, deviceId, ["shell", "input", "swipe", "240", "620", "240", "500", "450"], 10_000);
      await sleep(900);
      const statusScreen = harness.dumpAndroidScreen("S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_after_status_scroll");
      xml = statusScreen.xml;
      xmlPath = statusScreen.xmlPath;
      pngPath = statusScreen.pngPath;
      statusNode = findNode(xml, `consumer-repair-item-price-status-${rowId}`);
    }
    manualStatusVisible = /\u0432\u0440\u0443\u0447|\u0432\u0432\u0435\u0434/i.test([statusNode?.text, statusNode?.contentDesc].filter(Boolean).join(" "));
  } catch (nextError) {
    error = nextError instanceof Error ? nextError.message : String(nextError);
    try {
      const failure = harness.captureFailureArtifacts("S_EDITABLE_ESTIMATE_WORKSPACE_USER_PRICE_QUANTITY_SNAPSHOT/android_api34_editable_workspace_failure");
      xmlPath = failure.xmlPath;
      pngPath = failure.pngPath;
      xml = xmlPath ? fs.readFileSync(path.join(process.cwd(), xmlPath), "utf8") : xml;
    } catch {
      // best effort
    }
  } finally {
    cleanup?.();
  }

  const text = visibleText(xml);
  const requestRouteOpens = initialRequestRouteOpened || xml.includes("consumer-repair-screen") || xml.includes("request-estimate-summary-card");
  const estimateRowsVisible = xml.includes("consumer-repair-item-");
  const quantityInputVisible = xml.includes("consumer-repair-item-quantity-input-");
  const priceInputVisible = xml.includes("consumer-repair-item-unit-price-input-");
  const internalKeys = internalKeysVisible(text);
  const mojibakeFound = hasMojibake(text) ? 1 : 0;
  const failures = [
    ...(install.install_ok && install.package_installed ? [] : ["ANDROID_DEBUG_APK_NOT_INSTALLED"]),
    ...(requestRouteOpens ? [] : ["ANDROID_REQUEST_ROUTE_NOT_OPEN"]),
    ...(estimateRowsVisible ? [] : ["ANDROID_ESTIMATE_ROWS_NOT_VISIBLE"]),
    ...(quantityInputVisible ? [] : ["ANDROID_QUANTITY_INPUT_NOT_VISIBLE"]),
    ...(priceInputVisible ? [] : ["ANDROID_UNIT_PRICE_INPUT_NOT_VISIBLE"]),
    ...(quantityEdited ? [] : ["ANDROID_QUANTITY_INPUT_NOT_EDITED"]),
    ...(priceEdited ? [] : ["ANDROID_UNIT_PRICE_INPUT_NOT_EDITED"]),
    ...(totalChanged ? [] : ["ANDROID_LINE_TOTAL_NOT_RECALCULATED"]),
    ...(manualStatusVisible ? [] : ["ANDROID_MANUAL_PRICE_STATUS_NOT_VISIBLE"]),
    ...(internalKeys === 0 ? [] : [`ANDROID_INTERNAL_KEYS_VISIBLE:${internalKeys}`]),
    ...(mojibakeFound === 0 ? [] : ["ANDROID_MOJIBAKE_FOUND"]),
    ...(error ? [`ANDROID_ROUTE_PROOF_ERROR:${error}`] : []),
  ];

  return {
    passed: failures.length === 0,
    request_route_opens: requestRouteOpens,
    estimate_rows_visible: estimateRowsVisible,
    noisy_explanation_hidden: internalKeys === 0,
    quantity_input_editable: quantityInputVisible && quantityEdited,
    unit_price_input_editable: priceInputVisible && priceEdited,
    line_total_recalculates: totalChanged,
    manual_price_status_visible: manualStatusVisible,
    internal_keys_visible: internalKeys,
    mojibake_found: mojibakeFound,
    install,
    xml_path: xmlPath,
    png_path: pngPath,
    visible_text_sample: clip(text, 1800),
    row_scroll_attempts: rowScrollAttempts,
    row_alignment_attempts: rowAlignmentAttempts,
    aligned_row_id: alignedRowId,
    aligned_to_safe_row: alignedToSafeRow,
    auth_login_screen_detected: authLoginScreenDetected,
    route_attempts: routeAttempts,
    scrolled_to_rows: scrolledToRows,
    dev_client_log_tails: harness.getDevClientLogTails(),
    recovery_summary: harness.getRecoverySummary(),
    failures,
    error,
  };
}

export async function runAndroidApi34EditableEstimateWorkspaceSmoke() {
  const device = await ensureAndroidApi34DeviceReady({
    artifactDir: ARTIFACT_DIR,
    bootTimeoutMs: 240_000,
    allowCreateAvd: false,
  });
  const route = await androidRouteProof(device);
  const deterministic = deterministicSnapshotProof();
  const failures = [
    ...(device.final_status === API34_DEVICE_READY ? [] : [device.final_status]),
    ...(device.android_sdk === 34 ? [] : [`ANDROID_API_NOT_34:${device.android_sdk ?? "missing"}`]),
    ...route.failures,
    ...deterministic.failures,
  ];
  const passed = failures.length === 0;
  const artifact = {
    wave: WAVE,
    final_status: passed ? GREEN : BLOCKED,
    android_api34_tested: passed && device.android_sdk === 34,
    actual_api: device.android_sdk,
    api36_rejected: true,
    api36_used_as_substitute: false,
    device_id: device.device_id,
    cpu_abi: device.cpu_abi,
    request_route_opens: route.request_route_opens,
    estimate_rows_visible: route.estimate_rows_visible,
    noisy_explanation_hidden: route.noisy_explanation_hidden,
    quantity_input_editable: route.quantity_input_editable,
    unit_price_input_editable: route.unit_price_input_editable,
    line_total_recalculates: route.line_total_recalculates && deterministic.line_total_recalculates,
    manual_price_status_visible: route.manual_price_status_visible && deterministic.manual_price_status_visible,
    snapshot_updated: deterministic.snapshot_updated,
    internal_keys_visible: route.internal_keys_visible,
    mojibake_found: route.mojibake_found,
    android_route_proof: route,
    deterministic_snapshot_proof: deterministic,
    failures,
    fake_green_claimed: false,
  };
  writeJson("android_api34_results.json", artifact);
  console.log(artifact.final_status);
  if (!passed) {
    console.error(JSON.stringify(failures.slice(0, 30), null, 2));
    process.exitCode = 1;
  }
  return artifact;
}

if (require.main === module) {
  runAndroidApi34EditableEstimateWorkspaceSmoke()
    .then(() => {
      process.exit(process.exitCode ?? 0);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      writeJson("android_api34_results.json", {
        wave: WAVE,
        final_status: BLOCKED,
        android_api34_tested: false,
        actual_api: null,
        api36_rejected: true,
        api36_used_as_substitute: false,
        request_route_opens: false,
        estimate_rows_visible: false,
        noisy_explanation_hidden: false,
        quantity_input_editable: false,
        unit_price_input_editable: false,
        line_total_recalculates: false,
        manual_price_status_visible: false,
        snapshot_updated: false,
        internal_keys_visible: 0,
        mojibake_found: 0,
        failures: [`ANDROID_EDITABLE_ESTIMATE_SMOKE_ERROR:${message}`],
        fake_green_claimed: false,
      });
      console.error(message);
      process.exit(1);
    });
}
