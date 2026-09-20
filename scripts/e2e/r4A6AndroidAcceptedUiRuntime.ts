import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildRequestEstimateLaunchReadyMarkerId } from "../../src/lib/navigation/requestEstimateLaunchPayload";
import {
  buildAndroidDeepLinkLaunchArgs,
  buildAndroidRouteDeepLink,
} from "./androidDeepLinkLaunchContract";
import {
  collectRouteToScreenLifecycleEvidence,
  isWarmAndroidActivityDelivery,
  type RouteToScreenLifecycleEvidence,
} from "../release/android/routeToScreenAck";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const ANDROID_DEV_PORT = 8100;
// UIAutomator only exposes nodes from the current native viewport. Keep the
// status-bar guard, but do not clamp taps to the old 1,920 px emulator height:
// API 34 Pixel devices use a 2,400 px viewport and ordinary actions can sit
// below y=1,828 (for example the shared parameter batch action).
const APP_CONTENT_TOP = 140;
const PROMPT =
  "Кровля, мансарды и кровельные окна: обрешётка и контробрешётка 200 кв метров";
const CATALOG_ID = "canonical-work:expanded:battens_counterbattens";
const FIRST_FORMULA_ROW_TITLE =
  "Металлочерепица кровельного покрытия мансарды";
const ACCEPTED_WEB_REVISION_ID = String(
  process.env.R4_A8_ACCEPTED_WEB_REVISION_ID ?? "",
).trim();
const EXPECTED_CATEGORY_COUNTS = {
  all: 45,
  materials: 22,
  labor: 4,
  machinery: 7,
  services: 9,
  delivery: 3,
} as const;
const CATEGORY_IDS: Array<keyof typeof EXPECTED_CATEGORY_COUNTS> = [
  "materials",
  "labor",
  "machinery",
  "services",
  "delivery",
  "all",
];
const BACKEND_ROOT = "http://127.0.0.1:8765";
const LOCAL_PROVIDER_CREDENTIALS = path.resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const BACKEND_AUDIT = path.resolve(
  String(process.env.R4_A6_ANDROID_BACKEND_AUDIT_PATH ?? "").trim() ||
    ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/runtime/backend-4976352da510/request-audit.jsonl",
);
const PHOTO_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type Json = Record<string, any>;

export type UiNode = {
  text: string;
  contentDesc: string;
  resourceId: string;
  packageName: string;
  clickable: boolean;
  enabled: boolean;
  selected: boolean;
  bounds: string;
};

export type UiSnapshot = {
  ok: boolean;
  xml: string;
  nodes: UiNode[];
  text: string;
  error: string | null;
};

type AuditRow = {
  at?: string;
  method?: string;
  path?: string;
  status?: number;
  authorizationPresent?: boolean;
  userAgent?: string;
};

export type R4A6AndroidAcceptedJourneyResult = {
  caseId: "r4_a6_accepted_ui_runtime";
  status: "GREEN" | "RED";
  prompt: string;
  catalogId: string;
  launchId: string;
  launchWarmDelivery: boolean;
  promptLifecycle: RouteToScreenLifecycleEvidence;
  selection: {
    explicitUiSelection: boolean;
    suggestionIndex: number | null;
    searchCatalogMatched: boolean;
    visibleSuggestionMatched: boolean;
    selectedWorkTitleMatched: boolean;
    revisionCatalogMatched: boolean;
    selectedCatalogMarker: boolean;
  };
  estimate: {
    revisionId: string | null;
    releaseId: string | null;
    checksumSha256: string | null;
    rowCount: number | null;
    primaryMeasureM2: number | null;
    firstFormulaQuantityM2: number | null;
  };
  categories: Record<
    string,
    {
      expectedCount: number;
      observedCount: number | null;
      toggleRequired: boolean;
      hidden: boolean;
      restored: boolean;
    }
  >;
  editableField: {
    fieldId: string | null;
    before: string | null;
    changed: string | null;
    childRevisionId: string | null;
  };
  photo: {
    cameraPermissionDialogDismissed: boolean;
    pickerOpened: boolean;
    reviewOpened: boolean;
    committed: boolean;
    uploadPosts: number;
    finalizePosts: number;
  };
  approval: {
    tapCount: number;
    completed: boolean;
    approvedHistoryCount: number | null;
  };
  history: {
    opened: boolean;
    readonlySnapshot: boolean;
    rowCount: number | null;
  };
  pdf: {
    opened: boolean;
    returnedToMainActivity: boolean;
    artifactPosts: number;
    artifactGets: number;
  };
  procurement: {
    opened: boolean;
    artifactMarker: boolean;
    artifactPosts: number;
    artifactGets: number;
  };
  lifecycle: {
    backgroundForeground: boolean;
    coldBootstrapReady: boolean;
    coldRestart: boolean;
    coldLifecycle: RouteToScreenLifecycleEvidence;
    coldMutationPosts: number;
  };
  parity: {
    webRevisionId: string | null;
    androidRevisionId: string | null;
    sameRelease: boolean;
    sameCatalog: boolean;
    sameChecksum: boolean;
    sameRowCount: boolean;
  };
  apk: {
    localPath: string;
    localSha256: string | null;
    installedSha256: string | null;
    exactMatch: boolean;
  };
  evidence: {
    estimateScreenshot: string | null;
    historyScreenshot: string | null;
    coldScreenshot: string | null;
    finalUiDump: string | null;
  };
  failures: string[];
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reportStage(
  stage: string,
  details: Record<string, string | number | boolean | null> = {},
): void {
  console.log(JSON.stringify({ r4_a6_android_stage: stage, ...details }));
}

function runText(
  command: string,
  args: string[],
  timeoutMs = 20_000,
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

function runBuffer(
  command: string,
  args: string[],
  timeoutMs = 20_000,
): { ok: boolean; output: Buffer | null } {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      }),
    };
  } catch {
    return { ok: false, output: null };
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#39;/g, "'");
}

function parseNodes(xml: string): UiNode[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)).map(
    (match) => {
      const attrs = match[1] ?? "";
      const attribute = (name: string) =>
        decodeXml(
          attrs.match(new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`))?.[2] ?? "",
        );
      return {
        text: attribute("text"),
        contentDesc: attribute("content-desc"),
        resourceId: attribute("resource-id"),
        packageName: attribute("package"),
        clickable: attribute("clickable") === "true",
        enabled: attribute("enabled") !== "false",
        selected: attribute("selected") === "true",
        bounds: attribute("bounds"),
      };
    },
  );
}

export function dumpUi(adbPath: string, deviceId: string): UiSnapshot {
  const devicePath = `/sdcard/r4-a6-ui-${process.pid}.xml`;
  const dumped = runText(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "timeout",
      "25",
      "uiautomator",
      "dump",
      "--compressed",
      devicePath,
    ],
    32_000,
  );
  if (!dumped.ok) {
    return { ok: false, xml: "", nodes: [], text: "", error: dumped.output };
  }
  const read = runText(
    adbPath,
    ["-s", deviceId, "exec-out", "cat", devicePath],
    20_000,
  );
  if (!read.ok || !read.output.includes("<hierarchy")) {
    return {
      ok: false,
      xml: read.output,
      nodes: [],
      text: "",
      error: read.output || "ANDROID_UI_HIERARCHY_MISSING",
    };
  }
  const nodes = parseNodes(read.output);
  return {
    ok: true,
    xml: read.output,
    nodes,
    text: nodes
      .flatMap((node) => [node.resourceId, node.contentDesc, node.text])
      .filter(Boolean)
      .join("\n"),
    error: null,
  };
}

export function nodeHasId(node: UiNode, id: string): boolean {
  return (
    node.resourceId === id ||
    node.resourceId.endsWith(`:id/${id}`) ||
    node.resourceId.endsWith(`/${id}`) ||
    node.contentDesc === id
  );
}

export function nodeById(snapshot: UiSnapshot, id: string): UiNode | null {
  return snapshot.nodes.find((node) => nodeHasId(node, id)) ?? null;
}

export function bounds(node: UiNode): { left: number; top: number; right: number; bottom: number } | null {
  const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/u);
  if (!match) return null;
  const [, left, top, right, bottom] = match.map(Number);
  if (right <= left || bottom <= top) return null;
  return { left, top, right, bottom };
}

function visiblePoint(node: UiNode): { x: number; y: number } | null {
  const box = bounds(node);
  if (!box) return null;
  const top = Math.max(box.top, APP_CONTENT_TOP);
  const bottom = box.bottom;
  if (bottom <= top) return null;
  return {
    x: Math.round((box.left + box.right) / 2),
    y: Math.round((top + bottom) / 2),
  };
}

function fullyVisible(node: UiNode): boolean {
  const box = bounds(node);
  return Boolean(
    box &&
      box.top >= APP_CONTENT_TOP,
  );
}

export function tapNode(adbPath: string, deviceId: string, node: UiNode): boolean {
  const point = visiblePoint(node);
  return Boolean(
    point &&
      runText(
        adbPath,
        [
          "-s",
          deviceId,
          "shell",
          "input",
          "tap",
          String(point.x),
          String(point.y),
        ],
        10_000,
      ).ok,
  );
}

function tapNodeIncludingBottomSheet(
  adbPath: string,
  deviceId: string,
  node: UiNode,
): boolean {
  const box = bounds(node);
  if (!box) return false;
  const top = Math.max(box.top, 140);
  const bottom = Math.min(box.bottom, 2320);
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

async function dismissReactNativeWarningOverlay(
  adbPath: string,
  deviceId: string,
): Promise<boolean> {
  const snapshot = dumpUi(adbPath, deviceId);
  const overlay = snapshot.nodes.find((node) =>
    node.contentDesc.includes("VirtualizedLists should never be nested"),
  );
  if (!overlay) return true;
  const box = bounds(overlay);
  if (!box) return false;
  const dismissed = runText(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "input",
      "tap",
      String(Math.max(box.left + 1, box.right - 58)),
      String(Math.round((box.top + box.bottom) / 2)),
    ],
    10_000,
  ).ok;
  if (!dismissed) return false;
  const cleared = await waitForSnapshot(
    adbPath,
    deviceId,
    (candidate) => !candidate.nodes.some((node) =>
      node.contentDesc.includes("VirtualizedLists should never be nested"),
    ),
    10_000,
  );
  return !cleared.nodes.some((node) =>
    node.contentDesc.includes("VirtualizedLists should never be nested"),
  );
}

function tapBottomSheetPrimaryAction(
  adbPath: string,
  deviceId: string,
  node: UiNode,
): boolean {
  const box = bounds(node);
  if (!box) return false;
  const y = Math.min(box.bottom - 24, 2320);
  if (y <= box.top) return false;
  return runText(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "input",
      "tap",
      String(Math.round((box.left + box.right) / 2)),
      String(Math.round(y)),
    ],
    10_000,
  ).ok;
}

function swipe(
  adbPath: string,
  deviceId: string,
  direction: "up" | "down",
  granularity: "coarse" | "fine" = "coarse",
): void {
  const points = granularity === "fine"
    ? direction === "up"
      ? ["540", "1450", "540", "900", "220"]
      : ["540", "900", "540", "1450", "220"]
    : direction === "up"
      ? ["540", "1700", "540", "500", "330"]
      : ["540", "500", "540", "1700", "330"];
  runText(
    adbPath,
    ["-s", deviceId, "shell", "input", "swipe", ...points],
    10_000,
  );
}

export async function waitForSnapshot(
  adbPath: string,
  deviceId: string,
  predicate: (snapshot: UiSnapshot) => boolean,
  timeoutMs: number,
): Promise<UiSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let latest = dumpUi(adbPath, deviceId);
  while (Date.now() < deadline && !predicate(latest)) {
    await wait(650);
    latest = dumpUi(adbPath, deviceId);
  }
  return latest;
}

export async function seekNode(
  adbPath: string,
  deviceId: string,
  predicate: (node: UiNode) => boolean,
  maxSwipes = 55,
  granularity: "coarse" | "fine" = "coarse",
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  for (const direction of ["down", "up"] as const) {
    let previous = "";
    let stagnantSnapshots = 0;
    for (let index = 0; index <= maxSwipes; index += 1) {
      const snapshot = dumpUi(adbPath, deviceId);
      const node =
        snapshot.nodes.find(
          (candidate) => predicate(candidate) && visiblePoint(candidate),
        ) ?? null;
      if (node) return { snapshot, node };
      const fingerprint = createHash("sha256")
        .update(snapshot.xml)
        .digest("hex");
      if (fingerprint === previous) {
        stagnantSnapshots += 1;
        if (stagnantSnapshots >= 3) break;
      } else {
        stagnantSnapshots = 0;
      }
      previous = fingerprint;
      swipe(adbPath, deviceId, direction, granularity);
      await wait(450);
    }
  }
  const snapshot = dumpUi(adbPath, deviceId);
  return { snapshot, node: snapshot.nodes.find(predicate) ?? null };
}

export async function scrollToStart(
  adbPath: string,
  deviceId: string,
  swipeCount = 72,
): Promise<void> {
  for (let index = 0; index < swipeCount; index += 1) {
    swipe(adbPath, deviceId, "down");
    if ((index + 1) % 8 === 0) await wait(120);
  }
  await wait(750);
}

async function seekNodeForwardFromAnchor(
  adbPath: string,
  deviceId: string,
  anchorPredicate: (node: UiNode) => boolean,
  targetPredicate: (node: UiNode) => boolean,
  maxForwardSwipes = 12,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  await scrollToStart(adbPath, deviceId);
  let snapshot = dumpUi(adbPath, deviceId);
  let anchorVisible = snapshot.nodes.some(
    (candidate) => anchorPredicate(candidate) && visiblePoint(candidate),
  );
  if (!anchorVisible) {
    await scrollToStart(adbPath, deviceId, 24);
    snapshot = dumpUi(adbPath, deviceId);
    anchorVisible = snapshot.nodes.some(
      (candidate) => anchorPredicate(candidate) && visiblePoint(candidate),
    );
  }
  if (!anchorVisible) return { snapshot, node: null };

  for (let index = 0; index <= maxForwardSwipes; index += 1) {
    const node =
      snapshot.nodes.find(
        (candidate) => targetPredicate(candidate) && visiblePoint(candidate),
      ) ?? null;
    if (node) return { snapshot, node };
    if (index < maxForwardSwipes) {
      swipe(adbPath, deviceId, "up");
      await wait(450);
      snapshot = dumpUi(adbPath, deviceId);
    }
  }
  return { snapshot, node: null };
}

async function ensureEstimatePositionsExpanded(
  adbPath: string,
  deviceId: string,
): Promise<boolean> {
  const found = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-items-editor") &&
      node.enabled &&
      /(?:Показать|Скрыть) позиции/u.test(node.contentDesc),
    16,
  );
  if (!found.node) return false;
  if (/Скрыть позиции/u.test(found.node.contentDesc)) return true;
  if (!tapNode(adbPath, deviceId, found.node)) return false;
  const expanded = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      snapshot.nodes.some(
        (node) =>
          nodeHasId(node, "request-estimate-items-editor") &&
          /Скрыть позиции/u.test(node.contentDesc),
      ),
    10_000,
  );
  return expanded.nodes.some(
    (node) =>
      nodeHasId(node, "request-estimate-items-editor") &&
      /Скрыть позиции/u.test(node.contentDesc),
  );
}

async function openFirstFormulaRowPhotoFlow(
  adbPath: string,
  deviceId: string,
  expectedSelectedDisplayTitle: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const photoButton = await seekNodeForwardFromAnchor(
      adbPath,
      deviceId,
      (node) =>
        nodeHasId(node, "request-estimate-selected-work-title") &&
        node.text.trim() === expectedSelectedDisplayTitle,
      (node) =>
        node.resourceId.startsWith("estimate-material-row-photo-button-") &&
        node.contentDesc === `Фото товара ${FIRST_FORMULA_ROW_TITLE}`,
      12,
    );
    if (!photoButton.node || !tapNode(adbPath, deviceId, photoButton.node)) {
      continue;
    }
    const opened = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) =>
        Boolean(nodeById(snapshot, "mobile-photo-capture-flow")) ||
        snapshot.nodes.some(
          (node) =>
            node.packageName.includes("permissioncontroller") ||
            node.resourceId.includes("permissioncontroller"),
        ),
      12_000,
    );
    if (
      nodeById(opened, "mobile-photo-capture-flow") ||
      opened.nodes.some(
        (node) =>
          node.packageName.includes("permissioncontroller") ||
          node.resourceId.includes("permissioncontroller"),
      )
    ) {
      return true;
    }
  }
  return false;
}

export async function tapById(
  adbPath: string,
  deviceId: string,
  id: string,
  maxSwipes = 55,
): Promise<boolean> {
  const found = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, id) && node.enabled,
    maxSwipes,
  );
  return Boolean(found.node && tapNode(adbPath, deviceId, found.node));
}

async function tapByIdPrefix(
  adbPath: string,
  deviceId: string,
  prefix: string,
  maxSwipes = 55,
): Promise<boolean> {
  const found = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      (node.resourceId.startsWith(prefix) ||
        node.contentDesc.startsWith(prefix)) &&
      node.enabled,
    maxSwipes,
  );
  return Boolean(found.node && tapNode(adbPath, deviceId, found.node));
}

function countWithinNode(snapshot: UiSnapshot, parent: UiNode): number | null {
  const parentBounds = bounds(parent);
  if (!parentBounds) return null;
  const values = snapshot.nodes
    .filter((node) => {
      const child = bounds(node);
      return (
        child &&
        child.left >= parentBounds.left &&
        child.right <= parentBounds.right &&
        child.top >= parentBounds.top &&
        child.bottom <= parentBounds.bottom &&
        /^\d+$/u.test(node.text.trim())
      );
    })
    .map((node) => Number(node.text.trim()));
  return values.at(-1) ?? null;
}

function readAudit(): AuditRow[] {
  try {
    return fs
      .readFileSync(BACKEND_AUDIT, "utf8")
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRow);
  } catch {
    return [];
  }
}

async function waitForAudit(
  start: number,
  predicate: (row: AuditRow) => boolean,
  timeoutMs = 120_000,
): Promise<AuditRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows = readAudit();
  while (Date.now() < deadline && !rows.slice(start).some(predicate)) {
    await wait(500);
    rows = readAudit();
  }
  return rows;
}

function auditRevisionId(row: AuditRow): string | null {
  return String(row.path ?? "").match(
    /^\/revisions\/([0-9a-f-]{36})$/iu,
  )?.[1] ?? null;
}

async function waitForChildRevisionId(
  start: number,
  parentRevisionId: string | null,
  timeoutMs = 120_000,
): Promise<string | null> {
  const rows = await waitForAudit(
    start,
    (row) => {
      const candidate = auditRevisionId(row);
      return Boolean(
        row.method === "GET" &&
          row.status === 200 &&
          candidate &&
          candidate !== parentRevisionId,
      );
    },
    timeoutMs,
  );
  return rows
    .slice(start)
    .filter((row) => row.method === "GET" && row.status === 200)
    .map(auditRevisionId)
    .filter((value): value is string => Boolean(value && value !== parentRevisionId))
    .at(-1) ?? null;
}

function revisionIdsWithAcceptedArtifacts(rows: AuditRow[]): string[] {
  const byRevision = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.method !== "POST" || row.status !== 202) continue;
    const match = String(row.path ?? "").match(
      /^\/revisions\/([0-9a-f-]{36})\/artifacts\/(pdf|procurement)$/iu,
    );
    if (!match) continue;
    const set = byRevision.get(match[1]) ?? new Set<string>();
    set.add(match[2]);
    byRevision.set(match[1], set);
  }
  return [...byRevision.entries()]
    .filter(([, kinds]) => kinds.has("pdf") && kinds.has("procurement"))
    .map(([revisionId]) => revisionId);
}

async function backendSessionToken(): Promise<string> {
  const credentials = JSON.parse(
    fs.readFileSync(LOCAL_PROVIDER_CREDENTIALS, "utf8"),
  ) as Json;
  const consumers = Array.isArray(credentials.principals)
    ? credentials.principals.filter(
        (principal: Json) => principal.role === "consumer",
      )
    : [];
  if (consumers.length !== 1) {
    throw new Error("R4_A6_ANDROID_CONSUMER_CARDINALITY_RED");
  }
  const consumer = consumers[0] as Json;
  const response = await fetch(
    `${String(credentials.provider_url).replace(/\/+$/u, "")}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: String(credentials.publishable_key),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: String(consumer.email),
        password: String(consumer.password),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = (await response.json().catch(() => null)) as Json | null;
  const token = String(body?.access_token ?? "");
  if (!response.ok || !token) {
    throw new Error(`R4_A6_ANDROID_BACKEND_AUTH_RED:${response.status}`);
  }
  return token;
}

async function backendJson(
  token: string,
  endpoint: string,
): Promise<Json> {
  const response = await fetch(
    `${BACKEND_ROOT}/${endpoint.replace(/^\/+/, "")}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    },
  );
  const body = (await response.json().catch(() => null)) as Json | null;
  if (!response.ok || !body) {
    throw new Error(`R4_A6_ANDROID_BACKEND_${response.status}:${endpoint}`);
  }
  return body;
}

function sha256File(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function installedApkSha256(
  adbPath: string,
  deviceId: string,
): string | null {
  const packagePath = runText(
    adbPath,
    ["-s", deviceId, "shell", "pm", "path", PACKAGE_NAME],
    20_000,
  );
  const apkPath = packagePath.output
    .split(/\r?\n/u)
    .find((line) => line.startsWith("package:"))
    ?.slice("package:".length)
    .trim();
  if (!packagePath.ok || !apkPath) return null;
  const sum = runText(
    adbPath,
    ["-s", deviceId, "shell", "sha256sum", apkPath],
    60_000,
  );
  return sum.ok ? sum.output.match(/\b[0-9a-f]{64}\b/iu)?.[0]?.toLowerCase() ?? null : null;
}

export function capture(
  adbPath: string,
  deviceId: string,
  artifactDir: string,
  name: string,
): { screenshot: string | null; uiDump: string | null } {
  fs.mkdirSync(artifactDir, { recursive: true });
  const screenshot = runBuffer(
    adbPath,
    ["-s", deviceId, "exec-out", "screencap", "-p"],
    20_000,
  );
  const screenshotPath = path.join(artifactDir, `${name}.png`);
  if (screenshot.ok && screenshot.output) {
    fs.writeFileSync(screenshotPath, screenshot.output);
  }
  const snapshot = dumpUi(adbPath, deviceId);
  const uiDumpPath = path.join(artifactDir, `${name}.xml`);
  if (snapshot.ok) fs.writeFileSync(uiDumpPath, snapshot.xml, "utf8");
  return {
    screenshot: screenshot.ok && screenshot.output
      ? path.relative(process.cwd(), screenshotPath).replace(/\\/g, "/")
      : null,
    uiDump: snapshot.ok
      ? path.relative(process.cwd(), uiDumpPath).replace(/\\/g, "/")
      : null,
  };
}

async function selectExactSuggestion(
  adbPath: string,
  deviceId: string,
): Promise<{
  ok: boolean;
  index: number | null;
  expectedTitle: string | null;
  searchCatalogMatched: boolean;
  visibleSuggestionMatched: boolean;
}> {
  let page: Json | null = null;
  try {
    const token = await backendSessionToken();
    page = await backendJson(
      token,
      `search/catalog?query=${encodeURIComponent(PROMPT)}&pageSize=100`,
    );
  } catch {
    return {
      ok: false,
      index: null,
      expectedTitle: null,
      searchCatalogMatched: false,
      visibleSuggestionMatched: false,
    };
  }
  const items = Array.isArray(page.items) ? page.items as Json[] : [];
  const zeroBasedIndex = items.findIndex(
    (item) => String(item.catalogId ?? "") === CATALOG_ID,
  );
  const exactItem = zeroBasedIndex >= 0 ? items[zeroBasedIndex] : null;
  const expectedTitle = exactItem ? String(exactItem.canonicalNameRu ?? "") : null;
  const expectedGroup = exactItem ? String(exactItem.groupNameRu ?? "") : null;
  const searchCatalogMatched = Boolean(
    exactItem &&
      expectedTitle &&
      expectedGroup &&
      exactItem.estimateReady === true,
  );
  if (!searchCatalogMatched) {
    return {
      ok: false,
      index: null,
      expectedTitle,
      searchCatalogMatched: false,
      visibleSuggestionMatched: false,
    };
  }
  const index = zeroBasedIndex + 1;
  const ready = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(
      nodeById(snapshot, "consumer-repair-work-suggestions") &&
        nodeById(snapshot, `consumer-repair-work-suggestion-${index}`),
    ),
    60_000,
  );
  const suggestion = nodeById(
    ready,
    `consumer-repair-work-suggestion-${index}`,
  );
  const visibleSuggestionMatched = Boolean(
    suggestion &&
      suggestion.enabled &&
      suggestion.contentDesc.includes(expectedTitle!) &&
      suggestion.contentDesc.includes(expectedGroup!),
  );
  return {
    ok: Boolean(
      visibleSuggestionMatched &&
        suggestion &&
        tapNode(adbPath, deviceId, suggestion),
    ),
    index,
    expectedTitle,
    searchCatalogMatched,
    visibleSuggestionMatched,
  };
}

async function activateExactPromptSearch(
  adbPath: string,
  deviceId: string,
): Promise<boolean> {
  const snapshot = await waitForSnapshot(
    adbPath,
    deviceId,
    (candidate) =>
      nodeById(candidate, "consumer-repair-problem-input")?.text === PROMPT,
    30_000,
  );
  const input = nodeById(snapshot, "consumer-repair-problem-input");
  if (!input || !tapNode(adbPath, deviceId, input)) return false;
  await wait(250);
  for (const keyCode of [
    "KEYCODE_MOVE_END",
    "KEYCODE_SPACE",
    "KEYCODE_DEL",
    "KEYCODE_BACK",
  ]) {
    if (!runText(
      adbPath,
      ["-s", deviceId, "shell", "input", "keyevent", keyCode],
      10_000,
    ).ok) {
      return false;
    }
  }
  const searchReady = await waitForSnapshot(
    adbPath,
    deviceId,
    (candidate) =>
      nodeById(candidate, "consumer-repair-problem-input")?.text === PROMPT &&
      Boolean(nodeById(candidate, "consumer-repair-work-suggestions")),
    90_000,
  );
  return Boolean(
    nodeById(searchReady, "consumer-repair-problem-input")?.text === PROMPT &&
      nodeById(searchReady, "consumer-repair-work-suggestions"),
  );
}

async function waitForExternalActivityOrPdfRoute(
  adbPath: string,
  deviceId: string,
  timeoutMs: number,
): Promise<{ externalActivity: boolean; pdfRoute: boolean }> {
  const deadline = Date.now() + timeoutMs;
  let pdfRoute = false;
  let pdfRouteObservedAt = 0;
  while (Date.now() < deadline) {
    if (!mainActivityResumed(adbPath, deviceId)) {
      return { externalActivity: true, pdfRoute };
    }
    const snapshot = dumpUi(adbPath, deviceId);
    if (nodeById(snapshot, "pdf-viewer-back")) {
      pdfRoute = true;
      if (pdfRouteObservedAt === 0) pdfRouteObservedAt = Date.now();
    }
    if (pdfRouteObservedAt > 0 && Date.now() - pdfRouteObservedAt >= 30_000) {
      break;
    }
    await wait(650);
  }
  return { externalActivity: false, pdfRoute };
}

async function bootstrapFreshDevClient(
  adbPath: string,
  deviceId: string,
): Promise<boolean> {
  runText(
    adbPath,
    ["-s", deviceId, "reverse", `tcp:${ANDROID_DEV_PORT}`, `tcp:${ANDROID_DEV_PORT}`],
    10_000,
  );
  const devClientUrl =
    `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(
      `http://127.0.0.1:${ANDROID_DEV_PORT}`,
    )}`;
  const launch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, devClientUrl, PACKAGE_NAME),
    45_000,
  );
  if (!launch.ok) return false;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const snapshot = dumpUi(adbPath, deviceId);
    if (
      snapshot.text.includes("ROUTE_PROOF_APP_ROOT_READY") &&
      snapshot.text.includes("ROUTE_PROOF_AUTHENTICATED_SESSION_READY")
    ) {
      return true;
    }
    if (
      snapshot.text.includes("Development Build") &&
      snapshot.text.includes("DEVELOPMENT SERVERS")
    ) {
      const server = snapshot.nodes.find(
        (node) =>
          node.enabled &&
          (node.text.includes(`127.0.0.1:${ANDROID_DEV_PORT}`) ||
            node.text.includes(`10.0.2.2:${ANDROID_DEV_PORT}`) ||
            node.contentDesc.includes(`127.0.0.1:${ANDROID_DEV_PORT}`) ||
            node.contentDesc.includes(`10.0.2.2:${ANDROID_DEV_PORT}`)),
      );
      if (server) tapNodeIncludingBottomSheet(adbPath, deviceId, server);
    }
    const continueNode = snapshot.nodes.find(
      (node) => node.enabled && /^(Continue|Reload)$/iu.test(node.text.trim()),
    );
    if (continueNode) tapNodeIncludingBottomSheet(adbPath, deviceId, continueNode);
    await wait(1_000);
  }
  return false;
}

export async function replaceField(
  adbPath: string,
  deviceId: string,
  id: string,
  value: string,
): Promise<boolean> {
  const found = await seekNode(adbPath, deviceId, (node) => nodeHasId(node, id));
  if (!found.node || !tapNode(adbPath, deviceId, found.node)) return false;
  await wait(200);
  runText(
    adbPath,
    ["-s", deviceId, "shell", "input", "keycombination", "113", "29"],
    5_000,
  );
  runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
  const encoded = value.replace(/ /g, "%s");
  const typed = runText(
    adbPath,
    ["-s", deviceId, "shell", "input", "text", encoded],
    20_000,
  );
  runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
  await wait(500);
  return typed.ok;
}

async function waitForLifecycle(
  adbPath: string,
  deviceId: string,
  launchId: string,
  timeoutMs = 45_000,
): Promise<RouteToScreenLifecycleEvidence> {
  const deadline = Date.now() + timeoutMs;
  let evidence = collectRouteToScreenLifecycleEvidence("", launchId);
  while (Date.now() < deadline && !evidence.acknowledged) {
    const logcat = runText(
      adbPath,
      ["-s", deviceId, "logcat", "-d", "-v", "time", "ReactNativeJS:I", "*:S"],
      20_000,
    );
    evidence = collectRouteToScreenLifecycleEvidence(
      logcat.ok ? logcat.output : "",
      launchId,
    );
    if (!evidence.acknowledged) await wait(500);
  }
  return evidence;
}

function mainActivityResumed(
  adbPath: string,
  deviceId: string,
): boolean {
  const activity = runText(
    adbPath,
    ["-s", deviceId, "shell", "dumpsys", "activity", "activities"],
    20_000,
  );
  return activity.ok && activity.output.split(/\r?\n/u).some(
    (line) =>
      /mResumedActivity|topResumedActivity/u.test(line) &&
      line.includes(MAIN_ACTIVITY),
  );
}

async function waitForPhotoPermissionGate(
  adbPath: string,
  deviceId: string,
  timeoutMs = 45_000,
): Promise<{
  snapshot: UiSnapshot;
  cameraPermissionDialogDismissed: boolean;
}> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi(adbPath, deviceId);
  let cameraPermissionDialogDismissed = false;
  while (Date.now() < deadline) {
    if (
      nodeById(snapshot, "mobile-photo-pick-library") ||
      nodeById(snapshot, "mobile-photo-gallery")
    ) {
      return { snapshot, cameraPermissionDialogDismissed };
    }
    if (
      snapshot.nodes.some(
        (node) =>
          node.packageName === "com.google.android.permissioncontroller" ||
          node.resourceId.includes("permissioncontroller"),
      )
    ) {
      runText(
        adbPath,
        ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"],
        10_000,
      );
      cameraPermissionDialogDismissed = true;
      await wait(750);
    } else {
      await wait(350);
    }
    snapshot = dumpUi(adbPath, deviceId);
  }
  return { snapshot, cameraPermissionDialogDismissed };
}

export async function runR4A6AndroidAcceptedUiRuntime(input: {
  adbPath: string;
  deviceId: string;
  artifactDir: string;
  apkPath: string;
}): Promise<R4A6AndroidAcceptedJourneyResult> {
  const { adbPath, deviceId, artifactDir, apkPath } = input;
  const failures: string[] = [];
  const auditBefore = readAudit();
  const auditStart = auditBefore.length;
  const acceptedWebRevisionIds = revisionIdsWithAcceptedArtifacts(auditBefore);
  const previousAcceptedWebRevisionId = ACCEPTED_WEB_REVISION_ID;
  if (
    !/^[0-9a-f-]{36}$/iu.test(previousAcceptedWebRevisionId) ||
    !acceptedWebRevisionIds.includes(previousAcceptedWebRevisionId)
  ) {
    failures.push("R4_A6_ACCEPTED_WEB_ARTIFACT_BASELINE_RED");
  }
  const localApkSha256 = sha256File(apkPath);
  const deviceApkSha256 = installedApkSha256(adbPath, deviceId);
  if (!localApkSha256 || localApkSha256 !== deviceApkSha256) {
    failures.push("R4_A6_ANDROID_INSTALLED_APK_SHA_MISMATCH");
  }

  const launchId = `r4-a6-accepted:${Date.now().toString(36)}`;
  const uri = buildAndroidRouteDeepLink({
    route: "/request",
    prompt: PROMPT,
    launchId,
  });
  const launch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(deviceId, uri, PACKAGE_NAME),
    30_000,
  );
  const promptLifecycle = await waitForLifecycle(
    adbPath,
    deviceId,
    launchId,
  );
  if (!launch.ok) failures.push("R4_A6_ANDROID_REQUEST_LAUNCH_RED");
  if (!isWarmAndroidActivityDelivery(launch.output)) {
    failures.push("R4_A6_ANDROID_REQUEST_NOT_WARM");
  }
  if (!promptLifecycle.acknowledged) {
    failures.push("R4_A6_ANDROID_PROMPT_LIFECYCLE_RED");
  }
  reportStage("PROMPT_ACKNOWLEDGED", {
    acknowledged: promptLifecycle.acknowledged,
  });

  const promptReady = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      snapshot.text.includes(PROMPT) &&
      nodeById(snapshot, "consumer-repair-problem-input")?.text === PROMPT,
    60_000,
  );
  if (!promptReady.text.includes(PROMPT)) {
    failures.push("R4_A6_ANDROID_EXACT_PROMPT_NOT_VISIBLE");
  }
  if (!await activateExactPromptSearch(adbPath, deviceId)) {
    failures.push("R4_A6_ANDROID_EXACT_SEARCH_ACTIVATION_RED");
  }
  const selection = await selectExactSuggestion(adbPath, deviceId);
  if (!selection.ok) failures.push("R4_A6_ANDROID_EXACT_SELECTION_RED");

  if (!await tapById(adbPath, deviceId, "consumer-repair-prepare-draft", 24)) {
    failures.push("R4_A6_ANDROID_PREPARE_ACTION_RED");
  }

  const compileAudit = await waitForAudit(
    auditStart,
    (row) => row.method === "POST" && row.path === "/jobs/compile" && row.status === 202,
    120_000,
  );
  if (!compileAudit.slice(auditStart).some((row) => row.method === "POST" && row.path === "/jobs/compile" && row.status === 202)) {
    failures.push("R4_A6_ANDROID_COMPILE_NOT_OBSERVED");
  }
  const revisionAudit = await waitForAudit(
    auditStart,
    (row) =>
      row.method === "GET" &&
      /^\/revisions\/[0-9a-f-]{36}$/iu.test(String(row.path ?? "")) &&
      row.status === 200,
    150_000,
  );
  const compiledRevisionId = revisionAudit
    .slice(auditStart)
    .map((row) =>
      String(row.path ?? "").match(/^\/revisions\/([0-9a-f-]{36})$/iu)?.[1],
    )
    .filter((value): value is string => Boolean(value))
    .at(-1) ?? null;
  if (!compiledRevisionId) failures.push("R4_A6_ANDROID_REVISION_ID_MISSING");
  let revisionId = compiledRevisionId;
  reportStage("COMPILED_REVISION_READY", {
    revisionId: compiledRevisionId,
  });

  const estimateReady = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      Boolean(nodeById(snapshot, "request-estimate-summary-card")) &&
      snapshot.text.includes("45 позиций") &&
      snapshot.text.includes("200 м²"),
    120_000,
  );
  if (!nodeById(estimateReady, "request-estimate-summary-card")) {
    failures.push("R4_A6_ANDROID_SUMMARY_MISSING");
  }
  let compiledRevision: Json | null = null;
  try {
    const token = await backendSessionToken();
    compiledRevision = compiledRevisionId
      ? await backendJson(token, `revisions/${compiledRevisionId}`)
      : null;
  } catch {
    compiledRevision = null;
  }
  const expectedSelectedDisplayTitle = String(
    compiledRevision?.displayTitleRu ?? "",
  ).trim();
  const selectedWork = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-selected-work-title") &&
      node.text.trim() === expectedSelectedDisplayTitle,
    12,
  );
  const selectedWorkTitleMatched = Boolean(
    expectedSelectedDisplayTitle && selectedWork.node,
  );
  if (!selectedWorkTitleMatched) {
    failures.push("R4_A6_ANDROID_SELECTED_WORK_TITLE_RED");
  }
  const selectedTitleAuthorityMatched = Boolean(
    selection.expectedTitle &&
    String(compiledRevision?.canonicalWorkTitleRu ?? "")
      .toLocaleLowerCase("ru-RU")
      .includes(selection.expectedTitle.toLocaleLowerCase("ru-RU")),
  );
  const revisionCatalogMatched = compiledRevision?.catalogId === CATALOG_ID;
  const selectedCatalogMarker = Boolean(
    selection.searchCatalogMatched &&
      selection.visibleSuggestionMatched &&
      selectedTitleAuthorityMatched &&
      selectedWorkTitleMatched &&
      revisionCatalogMatched,
  );
  if (!selectedCatalogMarker) {
    failures.push("R4_A6_ANDROID_SELECTED_CATALOG_MARKER_RED");
  }

  const categoryEvidence: R4A6AndroidAcceptedJourneyResult["categories"] = {};
  const categoryLocation = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-category-filter-all") &&
      fullyVisible(node),
    18,
  );
  if (!categoryLocation.node) failures.push("R4_A6_ANDROID_CATEGORY_STACK_MISSING");
  for (const categoryId of CATEGORY_IDS) {
    let snapshot = dumpUi(adbPath, deviceId);
    let control = nodeById(
      snapshot,
      `request-estimate-category-filter-${categoryId}`,
    );
    if (!control || !fullyVisible(control)) {
      const found = await seekNode(
        adbPath,
        deviceId,
        (node) =>
          nodeHasId(
            node,
            `request-estimate-category-filter-${categoryId}`,
          ) && fullyVisible(node),
        12,
      );
      snapshot = found.snapshot;
      control = found.node;
    }
    let observedCount = control ? countWithinNode(snapshot, control) : null;
    const refreshObservedCount = async (): Promise<number | null> => {
      const stable = await seekNode(
        adbPath,
        deviceId,
        (node) =>
          nodeHasId(
            node,
            `request-estimate-category-filter-${categoryId}`,
          ) && fullyVisible(node),
        12,
      );
      return stable.node ? countWithinNode(stable.snapshot, stable.node) : null;
    };
    if (categoryId === "all") {
      if (observedCount !== EXPECTED_CATEGORY_COUNTS[categoryId]) {
        observedCount = await refreshObservedCount();
      }
      const restored = Boolean(control?.selected);
      categoryEvidence[categoryId] = {
        expectedCount: EXPECTED_CATEGORY_COUNTS[categoryId],
        observedCount,
        toggleRequired: false,
        hidden: false,
        restored,
      };
      if (observedCount !== EXPECTED_CATEGORY_COUNTS[categoryId] || !restored) {
        failures.push("R4_A6_ANDROID_CATEGORY_ALL_RED");
      }
      continue;
    }
    const hidden = Boolean(control && tapNode(adbPath, deviceId, control));
    const hiddenSnapshot = await waitForSnapshot(
      adbPath,
      deviceId,
      (candidate) => {
        const node = nodeById(
          candidate,
          `request-estimate-category-filter-${categoryId}`,
        );
        return Boolean(node && !node.selected && /Показать/u.test(node.contentDesc));
      },
      15_000,
    );
    const hiddenObserved = Boolean(
      nodeById(
        hiddenSnapshot,
        `request-estimate-category-filter-${categoryId}`,
      ) &&
        !nodeById(
          hiddenSnapshot,
          `request-estimate-category-filter-${categoryId}`,
        )!.selected,
    );
    const restoreControl = nodeById(
      hiddenSnapshot,
      `request-estimate-category-filter-${categoryId}`,
    );
    const restoredTap = Boolean(
      restoreControl && tapNode(adbPath, deviceId, restoreControl),
    );
    const restoredSnapshot = await waitForSnapshot(
      adbPath,
      deviceId,
      (candidate) => {
        const node = nodeById(
          candidate,
          `request-estimate-category-filter-${categoryId}`,
        );
        return Boolean(node && node.selected);
      },
      15_000,
    );
    const restored = Boolean(
      restoredTap &&
        nodeById(
          restoredSnapshot,
          `request-estimate-category-filter-${categoryId}`,
        )?.selected,
    );
    const stableRestoredControl = nodeById(
      restoredSnapshot,
      `request-estimate-category-filter-${categoryId}`,
    );
    observedCount = stableRestoredControl
      ? countWithinNode(restoredSnapshot, stableRestoredControl) ?? observedCount
      : observedCount;
    if (observedCount !== EXPECTED_CATEGORY_COUNTS[categoryId]) {
      observedCount = await refreshObservedCount();
    }
    categoryEvidence[categoryId] = {
      expectedCount: EXPECTED_CATEGORY_COUNTS[categoryId],
      observedCount,
      toggleRequired: true,
      hidden: hidden && hiddenObserved,
      restored,
    };
    if (
      observedCount !== EXPECTED_CATEGORY_COUNTS[categoryId] ||
      !hidden ||
      !hiddenObserved ||
      !restored
    ) {
      failures.push(`R4_A6_ANDROID_CATEGORY_${categoryId.toUpperCase()}_RED`);
    }
  }
  reportStage("CATEGORY_STACK_VERIFIED", {
    categories: CATEGORY_IDS.length,
  });
  const estimateCapture = capture(
    adbPath,
    deviceId,
    artifactDir,
    "accepted-estimate-categories",
  );

  await scrollToStart(adbPath, deviceId);
  const positionsExpandedForEdit = await ensureEstimatePositionsExpanded(
    adbPath,
    deviceId,
  );
  const firstQuantity = await seekNodeForwardFromAnchor(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-selected-work-title") &&
      node.text.trim() === expectedSelectedDisplayTitle,
    (node) =>
      node.resourceId.startsWith("consumer-repair-item-quantity-input-") &&
      node.contentDesc.startsWith(`Количество ${FIRST_FORMULA_ROW_TITLE}:`) &&
      node.text === "216",
    12,
  );
  const quantityFieldId = firstQuantity.node?.resourceId ?? null;
  const beforeQuantity = firstQuantity.node?.text ?? null;
  let changedQuantity: string | null = null;
  let changedRevisionId: string | null = null;
  if (!positionsExpandedForEdit || !quantityFieldId || beforeQuantity !== "216") {
    failures.push("R4_A6_ANDROID_FIRST_FORMULA_QUANTITY_RED");
  } else {
    const changeAuditStart = readAudit().length;
    if (!await replaceField(adbPath, deviceId, quantityFieldId, "217")) {
      failures.push("R4_A6_ANDROID_EDITABLE_FIELD_CHANGE_RED");
    }
    const changedSnapshot = await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => nodeById(snapshot, quantityFieldId)?.text === "217",
      15_000,
    );
    changedQuantity = nodeById(changedSnapshot, quantityFieldId)?.text ?? null;
    changedRevisionId = await waitForChildRevisionId(
      changeAuditStart,
      revisionId,
    );
    if (!changedRevisionId) {
      failures.push("R4_A6_ANDROID_EDITABLE_FIELD_CHILD_REVISION_RED");
    } else {
      revisionId = changedRevisionId;
    }
    reportStage("EDIT_CHILD_REVISION_READY", {
      revisionId,
      quantity: changedQuantity,
    });
    if (changedQuantity !== "217") {
      failures.push("R4_A6_ANDROID_EDITABLE_FIELD_TRANSITION_RED");
    }
  }

  const photoAuditStart = readAudit().length;
  const localPhotoPath = path.join(artifactDir, "r4-a6-evidence.png");
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(localPhotoPath, Buffer.from(PHOTO_PNG_BASE64, "base64"));
  const devicePhotoPath = "/sdcard/Pictures/r4-a6-evidence.png";
  const pushed = runText(
    adbPath,
    ["-s", deviceId, "push", localPhotoPath, devicePhotoPath],
    30_000,
  );
  runText(
    adbPath,
    [
      "-s",
      deviceId,
      "shell",
      "am",
      "broadcast",
      "-a",
      "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
      "-d",
      `file://${devicePhotoPath}`,
    ],
    20_000,
  );
  if (!pushed.ok) failures.push("R4_A6_ANDROID_PHOTO_PUSH_RED");
  const photoActionOpened = await openFirstFormulaRowPhotoFlow(
    adbPath,
    deviceId,
    expectedSelectedDisplayTitle,
  );
  if (!photoActionOpened) {
    failures.push("R4_A6_ANDROID_PHOTO_ACTION_RED");
  }
  const permissionGate = photoActionOpened
    ? await waitForPhotoPermissionGate(adbPath, deviceId)
    : {
        snapshot: dumpUi(adbPath, deviceId),
        cameraPermissionDialogDismissed: false,
      };
  const photoGate = permissionGate.snapshot;
  const pickerButton =
    nodeById(photoGate, "mobile-photo-pick-library") ??
    nodeById(photoGate, "mobile-photo-gallery");
  const pickerOpened = Boolean(
    pickerButton && tapNode(adbPath, deviceId, pickerButton),
  );
  if (!pickerOpened) failures.push("R4_A6_ANDROID_PHOTO_PICKER_RED");

  const pickerSnapshot = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      snapshot.nodes.some(
        (node) =>
          node.packageName === "com.google.android.providers.media.module" &&
          node.clickable &&
          /Photo taken|Image|Photo/iu.test(node.contentDesc),
      ),
    30_000,
  );
  const mediaNode = pickerSnapshot.nodes.find(
    (node) =>
      node.packageName === "com.google.android.providers.media.module" &&
      node.clickable &&
      /Photo taken|Image|Photo/iu.test(node.contentDesc) &&
      visiblePoint(node),
  );
  if (!mediaNode || !tapNode(adbPath, deviceId, mediaNode)) {
    failures.push("R4_A6_ANDROID_PHOTO_SYSTEM_PICK_RED");
  }
  const review = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(nodeById(snapshot, "mobile-photo-use")),
    30_000,
  );
  const reviewOpened = Boolean(nodeById(review, "mobile-photo-review-screen"));
  const warningOverlayDismissed = await dismissReactNativeWarningOverlay(
    adbPath,
    deviceId,
  );
  const reviewAfterOverlay = dumpUi(adbPath, deviceId);
  const usePhoto = nodeById(reviewAfterOverlay, "mobile-photo-use");
  if (
    !warningOverlayDismissed ||
    !usePhoto ||
    !tapBottomSheetPrimaryAction(adbPath, deviceId, usePhoto)
  ) {
    failures.push("R4_A6_ANDROID_PHOTO_COMMIT_ACTION_RED");
  }
  const attached = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      node.resourceId.startsWith("estimate-material-row-photo-attached-") ||
      node.contentDesc.startsWith("Прикреплённое фото "),
    20,
  );
  const photoCommitted = Boolean(attached.node);
  if (!reviewOpened || !photoCommitted) {
    failures.push("R4_A6_ANDROID_PHOTO_COMMIT_RED");
  }
  const photoAudit = readAudit().slice(photoAuditStart);
  const uploadPosts = photoAudit.filter(
    (row) =>
      row.method === "POST" &&
      row.status === 201 &&
      /\/attachments\/photo\/uploads$/u.test(String(row.path ?? "")),
  ).length;
  const finalizePosts = photoAudit.filter(
    (row) =>
      row.method === "POST" &&
      row.status === 200 &&
      /\/attachments\/photo\/uploads\/[0-9a-f-]{36}\/finalize$/u.test(
        String(row.path ?? ""),
      ),
  ).length;
  if (uploadPosts !== 1 || finalizePosts !== 1) {
    failures.push("R4_A6_ANDROID_PHOTO_ATOMIC_AUDIT_RED");
  }
  reportStage("PHOTO_COMMITTED", {
    committed: photoCommitted,
    uploadPosts,
    finalizePosts,
  });

  const positionsToggle = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-items-editor") &&
      node.clickable &&
      /Скрыть позиции/u.test(node.contentDesc),
    20,
  );
  if (!positionsToggle.node || !tapNode(adbPath, deviceId, positionsToggle.node)) {
    failures.push("R4_A6_ANDROID_POSITIONS_COLLAPSE_RED");
  }

  for (const [fieldId, value] of [
    ["consumer-repair-city-input", "Bishkek"],
    ["consumer-repair-address-input", "64 Manas Avenue"],
    ["consumer-repair-phone-input", "+996700000000"],
  ] as const) {
    if (!await replaceField(adbPath, deviceId, fieldId, value)) {
      failures.push(`R4_A6_ANDROID_CONTACT_${fieldId.toUpperCase()}_RED`);
    }
  }

  const approvalAuditStart = readAudit().length;
  let approvalTapCount = 0;
  const approval = await seekNode(
    adbPath,
    deviceId,
    (node) => nodeHasId(node, "consumer-repair-approve") && node.enabled,
    30,
  );
  if (approval.node && tapNode(adbPath, deviceId, approval.node)) {
    approvalTapCount = 1;
  } else {
    failures.push("R4_A6_ANDROID_APPROVAL_ACTION_RED");
  }
  const approved = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      snapshot.text.includes("Заявка утверждена") &&
      Boolean(nodeById(snapshot, "consumer-repair-history-button")),
    120_000,
  );
  const approvalCompleted = approved.text.includes("Заявка утверждена");
  if (!approvalCompleted || approvalTapCount !== 1) {
    failures.push("R4_A6_ANDROID_APPROVAL_EXACTLY_ONCE_RED");
  }
  const approvedBadge = nodeById(
    approved,
    "consumer-repair-history-approved-count",
  );
  const approvedHistoryCount = approvedBadge
    ? countWithinNode(approved, approvedBadge)
    : null;
  if (approvedHistoryCount !== 1) {
    failures.push("R4_A6_ANDROID_APPROVED_HISTORY_COUNT_RED");
  }
  reportStage("APPROVAL_COMPLETED", {
    completed: approvalCompleted,
    historyCount: approvedHistoryCount,
  });

  const historyOpened = await tapById(
    adbPath,
    deviceId,
    "consumer-repair-history-button",
    16,
  );
  const historyModal = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(nodeById(snapshot, "consumer-repair-history-modal")),
    30_000,
  );
  if (!historyOpened || !nodeById(historyModal, "consumer-repair-history-modal")) {
    failures.push("R4_A6_ANDROID_HISTORY_MODAL_RED");
  }
  const historyMain = await tapById(
    adbPath,
    deviceId,
    "consumer-repair-history-main",
    18,
  );
  const readonly = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      Boolean(nodeById(snapshot, "consumer-repair-history-readonly-snapshot")),
    30_000,
  );
  const readonlySnapshot = Boolean(
    nodeById(readonly, "consumer-repair-history-readonly-snapshot"),
  );
  if (!historyMain || !readonlySnapshot) {
    failures.push("R4_A6_ANDROID_HISTORY_READONLY_RED");
  }
  const historyCapture = capture(
    adbPath,
    deviceId,
    artifactDir,
    "accepted-history-readonly",
  );

  const pdfTapped = await tapById(
    adbPath,
    deviceId,
    "consumer-repair-history-pdf",
    10,
  );
  if (!pdfTapped) failures.push("R4_A6_ANDROID_PDF_OPEN_ACTION_RED");
  const pdfViewer = pdfTapped
    ? await waitForExternalActivityOrPdfRoute(adbPath, deviceId, 120_000)
    : { externalActivity: false, pdfRoute: false };
  if (pdfViewer.externalActivity) {
    runText(
      adbPath,
      ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"],
      10_000,
    );
  }
  const pdfRoute = pdfTapped
    ? await waitForSnapshot(
      adbPath,
      deviceId,
      (snapshot) => Boolean(nodeById(snapshot, "pdf-viewer-back")),
      45_000,
    )
    : dumpUi(adbPath, deviceId);
  const pdfRouteBack = nodeById(pdfRoute, "pdf-viewer-back");
  if (pdfRouteBack) tapNode(adbPath, deviceId, pdfRouteBack);
  const returnedPdfSnapshot = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(nodeById(snapshot, "consumer-repair-screen")),
    45_000,
  );
  const viewerObserved = pdfViewer.externalActivity || pdfViewer.pdfRoute;
  const returnedFromPdf = Boolean(
    mainActivityResumed(adbPath, deviceId) &&
      nodeById(returnedPdfSnapshot, "consumer-repair-screen"),
  );
  if (!viewerObserved || !returnedFromPdf) {
    failures.push("R4_A6_ANDROID_PDF_VIEWER_RETURN_RED");
  }

  const postPdfSnapshot = dumpUi(adbPath, deviceId);
  const historyClosedForProcurement = nodeById(
    postPdfSnapshot,
    "consumer-repair-history-modal",
  )
    ? await tapById(
      adbPath,
      deviceId,
      "consumer-repair-history-close",
      5,
    )
    : true;
  const historyDismissedForProcurement = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      Boolean(nodeById(snapshot, "consumer-repair-screen")) &&
      !nodeById(snapshot, "consumer-repair-history-modal"),
    30_000,
  );
  if (
    !historyClosedForProcurement ||
    !nodeById(historyDismissedForProcurement, "consumer-repair-screen") ||
    nodeById(historyDismissedForProcurement, "consumer-repair-history-modal")
  ) {
    failures.push("R4_A6_ANDROID_HISTORY_CLOSE_FOR_PROCUREMENT_RED");
  }

  const procurementLaunchId = `r4-a6-procurement:${Date.now().toString(36)}`;
  const procurementUrl = new URL("rik:///request");
  procurementUrl.searchParams.set("canonicalRevisionId", revisionId ?? "");
  procurementUrl.searchParams.set("launchId", procurementLaunchId);
  const procurementLaunch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(
      deviceId,
      procurementUrl.toString(),
      PACKAGE_NAME,
    ),
    45_000,
  );
  if (!procurementLaunch.ok) {
    failures.push("R4_A6_ANDROID_PROCUREMENT_REVISION_LAUNCH_RED");
  }
  const procurementLaunchMarker = buildRequestEstimateLaunchReadyMarkerId(
    procurementLaunchId,
  );
  const procurementRouteApplied = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      Boolean(nodeById(snapshot, "consumer-repair-screen")) &&
      snapshot.text.includes(procurementLaunchMarker),
    120_000,
  );
  if (!procurementRouteApplied.text.includes(procurementLaunchMarker)) {
    failures.push("R4_A6_ANDROID_PROCUREMENT_REVISION_ROUTE_RED");
  }
  const procurementSummaryAnchor = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-selected-work-title") &&
      node.text.trim() === expectedSelectedDisplayTitle,
    30,
  );
  if (!procurementSummaryAnchor.node) {
    failures.push("R4_A6_ANDROID_PROCUREMENT_SUMMARY_ANCHOR_RED");
  }
  const procurementAuditStart = readAudit().length;
  const procurementTapped = await tapById(
    adbPath,
    deviceId,
    "consumer-estimate-open-procurement",
    16,
  );
  if (!procurementTapped) {
    failures.push("R4_A6_ANDROID_PROCUREMENT_ACTION_RED");
  }
  const procurementAudit = procurementTapped
    ? await waitForAudit(
      procurementAuditStart,
      (row) =>
        row.method === "GET" &&
        row.status === 200 &&
        /\/artifacts\/procurement$/u.test(String(row.path ?? "")),
      120_000,
    )
    : readAudit();
  const procurementRows = procurementAudit.slice(procurementAuditStart);
  const procurementViewer = procurementTapped
    ? await waitForExternalActivityOrPdfRoute(adbPath, deviceId, 45_000)
    : { externalActivity: false, pdfRoute: false };
  const procurementExternalViewer = procurementViewer.externalActivity;
  if (procurementExternalViewer) {
    runText(
      adbPath,
      ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_BACK"],
      10_000,
    );
  }
  const returnedProcurementSnapshot = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(nodeById(snapshot, "consumer-repair-screen")),
    45_000,
  );
  const returnedFromProcurement = Boolean(
    mainActivityResumed(adbPath, deviceId) &&
      nodeById(returnedProcurementSnapshot, "consumer-repair-screen"),
  );
  if (!procurementExternalViewer || !returnedFromProcurement) {
    failures.push("R4_A6_ANDROID_PROCUREMENT_VIEWER_RETURN_RED");
  }

  runText(adbPath, ["-s", deviceId, "shell", "input", "keyevent", "KEYCODE_HOME"], 10_000);
  await wait(1_500);
  const backgrounded = !mainActivityResumed(adbPath, deviceId);
  const foreground = runText(
    adbPath,
    ["-s", deviceId, "shell", "am", "start", "-W", "-n", MAIN_ACTIVITY],
    30_000,
  );
  const resumed = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) => Boolean(nodeById(snapshot, "consumer-repair-screen")),
    45_000,
  );
  const backgroundForeground =
    backgrounded &&
    foreground.ok &&
    mainActivityResumed(adbPath, deviceId) &&
    Boolean(nodeById(resumed, "consumer-repair-screen"));
  if (!backgroundForeground) {
    failures.push("R4_A6_ANDROID_BACKGROUND_FOREGROUND_RED");
  }

  let androidRevision: Json | null = null;
  let parityAndroidRevision: Json | null = null;
  let webRevision: Json | null = null;
  try {
    const token = await backendSessionToken();
    androidRevision = revisionId
      ? await backendJson(token, `revisions/${revisionId}`)
      : null;
    parityAndroidRevision = compiledRevisionId
      ? await backendJson(token, `revisions/${compiledRevisionId}`)
      : null;
    webRevision = previousAcceptedWebRevisionId
      ? await backendJson(token, `revisions/${previousAcceptedWebRevisionId}`)
      : null;
  } catch (error) {
    failures.push(
      `R4_A6_ANDROID_PARITY_READ_RED:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const sameRelease = Boolean(
    parityAndroidRevision &&
      webRevision &&
      parityAndroidRevision.releaseId === webRevision.releaseId,
  );
  const sameCatalog = Boolean(
    parityAndroidRevision &&
      webRevision &&
      parityAndroidRevision.catalogId === webRevision.catalogId,
  );
  const sameChecksum = Boolean(
    parityAndroidRevision &&
      webRevision &&
      parityAndroidRevision.checksumSha256 === webRevision.checksumSha256,
  );
  const sameRowCount = Boolean(
    parityAndroidRevision &&
      webRevision &&
      Number(parityAndroidRevision.rowCount) === Number(webRevision.rowCount),
  );
  if (!sameRelease || !sameCatalog || !sameChecksum || !sameRowCount) {
    failures.push("R4_A6_ANDROID_WEB_PARITY_RED");
  }

  const coldAuditStart = readAudit().length;
  runText(adbPath, ["-s", deviceId, "shell", "am", "force-stop", PACKAGE_NAME], 20_000);
  await wait(750);
  const coldBootstrapReady = await bootstrapFreshDevClient(adbPath, deviceId);
  const coldLaunchId = `r4-a6-cold:${Date.now().toString(36)}`;
  const coldUrl = new URL("rik:///request");
  coldUrl.searchParams.set("canonicalRevisionId", revisionId ?? "");
  coldUrl.searchParams.set("launchId", coldLaunchId);
  const coldLaunch = runText(
    adbPath,
    buildAndroidDeepLinkLaunchArgs(
      deviceId,
      coldUrl.toString(),
      PACKAGE_NAME,
    ),
    45_000,
  );
  const coldLaunchMarker = buildRequestEstimateLaunchReadyMarkerId(coldLaunchId);
  const coldRouteApplied = await waitForSnapshot(
    adbPath,
    deviceId,
    (snapshot) =>
      Boolean(nodeById(snapshot, "consumer-repair-screen")) &&
      snapshot.text.includes(coldLaunchMarker),
    120_000,
  );
  const coldLifecycle = collectRouteToScreenLifecycleEvidence("", coldLaunchId);
  await scrollToStart(adbPath, deviceId);
  const coldSelectedTitle = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-selected-work-title") &&
      node.text.trim() === expectedSelectedDisplayTitle,
    30,
  );
  const coldRowCount = await seekNode(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-row-count") &&
      node.text.trim() === "45 позиций",
    16,
  );
  const coldSummaryReady = Boolean(
    coldSelectedTitle.node && coldRowCount.node,
  );
  const coldPositionsExpanded = await ensureEstimatePositionsExpanded(
    adbPath,
    deviceId,
  );
  const coldFirstQuantity = await seekNodeForwardFromAnchor(
    adbPath,
    deviceId,
    (node) =>
      nodeHasId(node, "request-estimate-selected-work-title") &&
      node.text.trim() === expectedSelectedDisplayTitle,
    (node) =>
      node.resourceId.startsWith("consumer-repair-item-quantity-input-") &&
      node.contentDesc.startsWith(`Количество ${FIRST_FORMULA_ROW_TITLE}:`) &&
      node.text === "217",
    12,
  );
  const coldAudit = readAudit().slice(coldAuditStart);
  const coldMutationPosts = coldAudit.filter((row) => row.method === "POST").length;
  const coldRestart = Boolean(
    coldBootstrapReady &&
      coldLaunch.ok &&
      coldSummaryReady &&
      coldPositionsExpanded &&
      coldRouteApplied.text.includes(coldLaunchMarker) &&
      coldFirstQuantity.node &&
      coldAudit.some(
        (row) =>
          row.method === "GET" &&
          row.path === `/revisions/${revisionId}` &&
          row.status === 200,
      ),
  );
  if (!coldRestart || coldMutationPosts !== 0) {
    failures.push("R4_A6_ANDROID_COLD_RESTART_RED");
  }
  const coldCapture = capture(
    adbPath,
    deviceId,
    artifactDir,
    "accepted-cold-revision",
  );

  const finalAudit = readAudit().slice(approvalAuditStart);
  const pdfRows = finalAudit.filter(
    (row) =>
      row.path === `/revisions/${revisionId}/artifacts/pdf`,
  );
  const procurementArtifactRows = procurementRows.filter(
    (row) => row.path === `/revisions/${revisionId}/artifacts/procurement`,
  );
  const result: R4A6AndroidAcceptedJourneyResult = {
    caseId: "r4_a6_accepted_ui_runtime",
    status: failures.length === 0 ? "GREEN" : "RED",
    prompt: PROMPT,
    catalogId: CATALOG_ID,
    launchId,
    launchWarmDelivery: isWarmAndroidActivityDelivery(launch.output),
    promptLifecycle,
    selection: {
      explicitUiSelection: selection.ok,
      suggestionIndex: selection.index,
      searchCatalogMatched: selection.searchCatalogMatched,
      visibleSuggestionMatched: selection.visibleSuggestionMatched,
      selectedWorkTitleMatched,
      revisionCatalogMatched,
      selectedCatalogMarker,
    },
    estimate: {
      revisionId,
      releaseId: androidRevision?.releaseId ?? null,
      checksumSha256: androidRevision?.checksumSha256 ?? null,
      rowCount: androidRevision ? Number(androidRevision.rowCount) : null,
      primaryMeasureM2: androidRevision
        ? Number(androidRevision.primaryMeasureValue)
        : null,
      firstFormulaQuantityM2: beforeQuantity ? Number(beforeQuantity) : null,
    },
    categories: categoryEvidence,
    editableField: {
      fieldId: quantityFieldId,
      before: beforeQuantity,
      changed: changedQuantity,
      childRevisionId: changedRevisionId,
    },
    photo: {
      cameraPermissionDialogDismissed:
        permissionGate.cameraPermissionDialogDismissed,
      pickerOpened,
      reviewOpened,
      committed: photoCommitted,
      uploadPosts,
      finalizePosts,
    },
    approval: {
      tapCount: approvalTapCount,
      completed: approvalCompleted,
      approvedHistoryCount,
    },
    history: {
      opened: historyOpened,
      readonlySnapshot,
      rowCount: androidRevision ? Number(androidRevision.rowCount) : null,
    },
    pdf: {
      opened: pdfTapped && viewerObserved,
      returnedToMainActivity: returnedFromPdf,
      artifactPosts: pdfRows.filter((row) => row.method === "POST" && row.status === 202).length,
      artifactGets: pdfRows.filter((row) => row.method === "GET" && row.status === 200).length,
    },
    procurement: {
      opened: Boolean(
        procurementTapped && procurementExternalViewer && returnedFromProcurement,
      ),
      artifactMarker: procurementArtifactRows.some(
        (row) => row.method === "GET" && row.status === 200,
      ),
      artifactPosts: procurementArtifactRows.filter(
        (row) => row.method === "POST" && row.status === 202,
      ).length,
      artifactGets: procurementArtifactRows.filter(
        (row) => row.method === "GET" && row.status === 200,
      ).length,
    },
    lifecycle: {
      backgroundForeground,
      coldBootstrapReady,
      coldRestart,
      coldLifecycle,
      coldMutationPosts,
    },
    parity: {
      webRevisionId: previousAcceptedWebRevisionId,
      androidRevisionId: compiledRevisionId,
      sameRelease,
      sameCatalog,
      sameChecksum,
      sameRowCount,
    },
    apk: {
      localPath: path.relative(process.cwd(), apkPath).replace(/\\/g, "/"),
      localSha256: localApkSha256,
      installedSha256: deviceApkSha256,
      exactMatch: Boolean(localApkSha256 && localApkSha256 === deviceApkSha256),
    },
    evidence: {
      estimateScreenshot: estimateCapture.screenshot,
      historyScreenshot: historyCapture.screenshot,
      coldScreenshot: coldCapture.screenshot,
      finalUiDump: coldCapture.uiDump,
    },
    failures,
  };
  return result;
}
