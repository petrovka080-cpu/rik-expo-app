import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildAndroidDeepLinkLaunchArgs } from "./androidDeepLinkLaunchContract";
import {
  parseNativeEstimateBuildTimingEvidence,
  type NativeEstimateBuildTimingEvidence,
} from "./nativeEstimateBuildTimingEvidence";
import {
  findNativeNodeOwnedByExactWrapper,
  findNativeWrapperOwningExactText,
  nativeNodeSafeViewportAdjustment,
  nativeOptionalControlledInputIsEmpty,
} from "./nativeExactWrapperNodeSelection";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  ROADWORKS_WAVE_A_PARAMETER_PRESENTATION,
  RoadworksWaveAProductionRegistry,
  compileRoadworksWaveAWork,
  type RoadworksWaveAParameterKey,
} from "../../src/lib/estimate/v4/roadworks";

const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const API_LEVEL = "34";
const UI_DUMP_DEVICE_PATH = "/sdcard/asphalt-native-api34.xml";
const WAIT_POLL_MS = 1_200;
const DEFAULT_TIMEOUT_MS = 90_000;

type CommandResult = {
  ok: boolean;
  output: string;
  status: number | null;
};

type UiNode = {
  attrs: string;
  resourceId: string;
  contentDesc: string;
  text: string;
  bounds: string;
  packageName: string;
};

type NativeCaseResult = {
  work_key: string;
  title: string;
  scope_profile: string;
  expected_p0: string[];
  observed_p0: string[];
  expected_boq_rows: number;
  create: boolean;
  edit: boolean;
  cold_replay_pdf: boolean;
  exact_owner_visible: boolean;
  full_boq_visible: boolean;
  pdf_projection_visible: boolean;
  pdf_projection_mode: "native_webview" | "android_external_viewer" | null;
  pdf_exact_owner_visible: boolean;
  pdf_full_boq_visible: boolean;
  missing_pdf_boq_row_names: string[];
  immutable_revision_visible: boolean;
  build_identity_visible: boolean;
  revision_before_edit: string | null;
  revision_after_edit: string | null;
  missing_boq_row_names: string[];
  screenshots: string[];
  ui_dumps: string[];
  failures: string[];
  duration_ms: number;
  phase_durations_ms: Record<string, number>;
  runtime_build_timing: NativeEstimateBuildTimingEvidence;
  case_start_isolation: NativeCaseIsolationEvidence;
  case_end_isolation: NativeCaseIsolationEvidence | null;
  phase_reached: "launch" | "p0" | "create" | "edit" | "cold_replay" | "pdf";
};

type NativeCaseIsolationEvidence = {
  phase: "before_case" | "after_pdf";
  pdf_viewer_returned: boolean;
  internal_pdf_route_was_open: boolean;
  internal_pdf_route_closed: boolean;
  history_modal_was_open: boolean;
  history_modal_closed: boolean;
  neutral_route_visible: boolean;
  blocking_modal_present: boolean;
  data_wipes: 0;
  failures: string[];
};

type CliOptions = {
  diagnosticWorkKey: string | null;
  diagnosticWorkCount: number | null;
  diagnosticStartIndex: number;
  expectedCommit: string;
  devServerPort: number | null;
  allowDirtyDiagnostic: boolean;
  clearAppData: boolean;
  forceDevReload: boolean;
};

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function adbPath(): string {
  const sdkRoot = process.env.ANDROID_SDK_ROOT
    ?? process.env.ANDROID_HOME
    ?? path.join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function run(command: string, args: string[], timeoutMs = 20_000): CommandResult {
  try {
    const output = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
    });
    return { ok: true, output, status: 0 };
  } catch (error) {
    const record = error as {
      status?: number;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
      message?: string;
    };
    return {
      ok: false,
      output: `${String(record.stdout ?? "")}${String(record.stderr ?? "")}${record.message ?? ""}`.trim(),
      status: typeof record.status === "number" ? record.status : null,
    };
  }
}

function adb(args: string[], timeoutMs = 20_000): CommandResult {
  return run(adbPath(), ["-s", DEVICE_ID, ...args], timeoutMs);
}

function adbBuffer(args: string[], timeoutMs = 30_000): Buffer | null {
  try {
    return execFileSync(adbPath(), ["-s", DEVICE_ID, ...args], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function attr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`\\b${name}=(["'])([\\s\\S]*?)\\1`));
  return decodeXml(match?.[2] ?? "");
}

function parseNodes(xml: string): UiNode[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)).map((match) => {
    const attrs = match[1] ?? "";
    return {
      attrs,
      resourceId: attr(attrs, "resource-id"),
      contentDesc: attr(attrs, "content-desc"),
      text: attr(attrs, "text"),
      bounds: attr(attrs, "bounds"),
      packageName: attr(attrs, "package"),
    };
  });
}

type PdfProjectionProbe = {
  snapshot: ReturnType<typeof dumpUi>;
  mode: NativeCaseResult["pdf_projection_mode"];
  fileName: string | null;
};

async function waitForPdfProjection(timeoutMs = 90_000): Promise<PdfProjectionProbe> {
  const deadline = Date.now() + timeoutMs;
  let last = dumpUi();
  while (Date.now() <= deadline) {
    last = dumpUi();
    if (findNodeById(last, "native-pdf-webview")) {
      return { snapshot: last, mode: "native_webview", fileName: null };
    }
    const externalPdfNode = last.nodes.find((node) =>
      node.packageName !== PACKAGE_NAME && /\.pdf$/i.test(node.text.trim())
    );
    if (externalPdfNode) {
      return {
        snapshot: last,
        mode: "android_external_viewer",
        fileName: path.posix.basename(externalPdfNode.text.trim()),
      };
    }
    await wait(WAIT_POLL_MS);
  }
  return { snapshot: last, mode: null, fileName: null };
}

function latestGeneratedPdfFileName(): string | null {
  const listed = adb([
    "shell",
    "run-as",
    PACKAGE_NAME,
    "sh",
    "-c",
    "ls -t cache/generated-pdfs/*.pdf 2>/dev/null | head -n 1",
  ], 20_000);
  const file = listed.ok ? listed.output.trim().split(/\r?\n/)[0] : "";
  return file ? path.posix.basename(file) : null;
}

async function extractGeneratedPdfText(fileName: string | null): Promise<string | null> {
  const safeFileName = path.posix.basename(fileName ?? latestGeneratedPdfFileName() ?? "");
  if (!safeFileName || !safeFileName.toLocaleLowerCase("en-US").endsWith(".pdf")) return null;
  const pdfBytes = adbBuffer([
    "exec-out",
    "run-as",
    PACKAGE_NAME,
    "cat",
    `cache/generated-pdfs/${safeFileName}`,
  ]);
  if (!pdfBytes || pdfBytes.length === 0) return null;
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({
    data: new Uint8Array(pdfBytes),
  }).promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
  } finally {
    await document.destroy();
  }
  return pages.join("\n").replace(/\s+/g, " ").trim();
}

function dumpUi(): { ok: boolean; xml: string; nodes: UiNode[]; text: string; error: string | null } {
  const dumped = adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", UI_DUMP_DEVICE_PATH], 16_000);
  const read = dumped.ok ? adb(["exec-out", "cat", UI_DUMP_DEVICE_PATH], 20_000) : null;
  adb(["shell", "rm", "-f", UI_DUMP_DEVICE_PATH], 5_000);
  if (!read?.ok || !read.output.includes("<hierarchy")) {
    return { ok: false, xml: read?.output ?? "", nodes: [], text: "", error: read?.output || dumped.output };
  }
  const nodes = parseNodes(read.output);
  const text = nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n");
  return { ok: true, xml: read.output, nodes, text, error: null };
}

function nodeHasId(node: UiNode, testId: string): boolean {
  return node.resourceId === testId
    || node.resourceId.endsWith(`:id/${testId}`)
    || node.resourceId.endsWith(`/${testId}`)
    || node.contentDesc === testId;
}

function findNodeById(snapshot: ReturnType<typeof dumpUi>, testId: string): UiNode | null {
  return snapshot.nodes.find((node) => nodeHasId(node, testId)) ?? null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    x: Math.round((Number(match[1]) + Number(match[3])) / 2),
    y: Math.round((Number(match[2]) + Number(match[4])) / 2),
  };
}

function findInputOwnedByEditor(
  snapshot: ReturnType<typeof dumpUi>,
  editor: UiNode,
): UiNode | null {
  return findNativeNodeOwnedByExactWrapper(
    snapshot.nodes,
    editor,
    (node) => nodeHasId(node, "editable-param-popover-input"),
  );
}

async function findSafeInputOwnedByExactEditor(
  editorId: string,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; editor: UiNode; input: UiNode } | null> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const lookup = await scrollToId(editorId, 20);
    if (!lookup.node) continue;
    const input = findInputOwnedByEditor(lookup.snapshot, lookup.node);
    if (!input) {
      // React Native may expose the exact editor wrapper before mounting its
      // clipped native TextInput below the sticky action bar. Move the exact
      // wrapper into the safe viewport, then reacquire its owned child; never
      // fall back to a generic EditText from another parameter or BOQ row.
      const editorAdjustment = nativeNodeSafeViewportAdjustment(
        lookup.node.bounds,
        viewport().height,
      );
      if (editorAdjustment === "invalid") return null;
      if (editorAdjustment !== "none") swipe(editorAdjustment);
      await wait(600);
      continue;
    }
    const adjustment = nativeNodeSafeViewportAdjustment(
      input.bounds,
      viewport().height,
    );
    if (adjustment === "none") {
      return { snapshot: lookup.snapshot, editor: lookup.node, input };
    }
    if (adjustment === "invalid") return null;
    swipe(adjustment);
    await wait(600);
  }
  return null;
}

function tapNode(node: UiNode): boolean {
  const point = center(node.bounds);
  return Boolean(point && adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000).ok);
}

function viewport(): { width: number; height: number } {
  const size = adb(["shell", "wm", "size"], 10_000);
  const match = size.output.match(/Override size:\s*(\d+)x(\d+)/i)
    ?? size.output.match(/Physical size:\s*(\d+)x(\d+)/i);
  return { width: Number(match?.[1] ?? 1080), height: Number(match?.[2] ?? 2400) };
}

function swipe(direction: "up" | "down", long = false): void {
  const { width, height } = viewport();
  const x = Math.round(width * 0.5);
  const top = Math.round(height * (long ? 0.22 : 0.32));
  const bottom = Math.round(height * (long ? 0.72 : 0.62));
  const [startY, endY] = direction === "up" ? [bottom, top] : [top, bottom];
  adb(["shell", "input", "swipe", String(x), String(startY), String(x), String(endY), "420"], 10_000);
}

async function scrollToId(testId: string, maxSwipes = 18): Promise<{ snapshot: ReturnType<typeof dumpUi>; node: UiNode | null }> {
  let snapshot = dumpUi();
  let node = findNodeById(snapshot, testId);
  if (node) return { snapshot, node };
  let previousFingerprint = sha256(snapshot.xml);
  let stableBoundaryCount = 0;
  for (let index = 0; index < maxSwipes; index += 1) {
    swipe("up", index % 4 === 3);
    await wait(450);
    snapshot = dumpUi();
    node = findNodeById(snapshot, testId);
    if (node) return { snapshot, node };
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) break;
  }
  previousFingerprint = sha256(snapshot.xml);
  stableBoundaryCount = 0;
  for (let index = 0; index < maxSwipes; index += 1) {
    swipe("down", index % 4 === 3);
    await wait(450);
    snapshot = dumpUi();
    node = findNodeById(snapshot, testId);
    if (node) return { snapshot, node };
    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint ? stableBoundaryCount + 1 : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2) break;
  }
  return { snapshot, node: null };
}

async function tapHistoryEntryByExactTitle(
  expectedTitle: string,
  maxSwipes = 20,
  timeoutMs = 180_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let direction: "up" | "down" = "up";
  let swipesInDirection = 0;
  let previousFingerprint = "";
  let stableBoundaryCount = 0;
  while (Date.now() < deadline) {
    const snapshot = dumpUi();
    const exactHistoryMain = findNativeWrapperOwningExactText(
      snapshot.nodes,
      (node) => nodeHasId(node, "consumer-repair-history-main"),
      (node) => node.text,
      expectedTitle,
    );
    if (exactHistoryMain) {
      const adjustment = nativeNodeSafeViewportAdjustment(
        exactHistoryMain.bounds,
        viewport().height,
      );
      if (adjustment === "none") return tapNode(exactHistoryMain);
      if (adjustment === "invalid") return false;
      swipe(adjustment);
      await wait(600);
      continue;
    }

    const fingerprint = sha256(snapshot.xml);
    stableBoundaryCount = fingerprint === previousFingerprint
      ? stableBoundaryCount + 1
      : 0;
    previousFingerprint = fingerprint;
    if (stableBoundaryCount >= 2 || swipesInDirection >= maxSwipes) {
      direction = direction === "up" ? "down" : "up";
      swipesInDirection = 0;
      stableBoundaryCount = 0;
      await wait(1_500);
      continue;
    }
    swipe(direction, swipesInDirection % 4 === 3);
    swipesInDirection += 1;
    await wait(600);
  }
  return false;
}

async function returnToTop(swipes = 16): Promise<void> {
  for (let index = 0; index < swipes; index += 1) {
    swipe("down", index % 4 === 3);
    await wait(180);
  }
}

function pdfProjectionVisibleIn(snapshot: ReturnType<typeof dumpUi>): boolean {
  return Boolean(
    findNodeById(snapshot, "native-pdf-webview")
    || findNodeById(snapshot, "native-pdf-handoff-shell")
    || snapshot.nodes.some((node) => node.packageName !== PACKAGE_NAME && /\.pdf$/i.test(node.text.trim())),
  );
}

async function waitForKnownCaseBoundarySurface(timeoutMs = 30_000): Promise<ReturnType<typeof dumpUi>> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi();
  while (Date.now() < deadline) {
    if (
      findNodeById(snapshot, "consumer-repair-screen")
      || findNodeById(snapshot, "consumer-repair-history-modal")
      || findNodeById(snapshot, "native-pdf-handoff-shell")
    ) {
      return snapshot;
    }
    await wait(WAIT_POLL_MS);
    snapshot = dumpUi();
  }
  return snapshot;
}

async function restoreNativeCaseIsolation(
  phase: NativeCaseIsolationEvidence["phase"],
  expectedPdfProjection: NativeCaseResult["pdf_projection_mode"] = null,
): Promise<NativeCaseIsolationEvidence> {
  const failures: string[] = [];
  let snapshot = dumpUi();
  const pdfViewerWasOpen = expectedPdfProjection != null || pdfProjectionVisibleIn(snapshot);
  let pdfViewerReturned = false;
  if (pdfViewerWasOpen) {
    const returned = adb(["shell", "input", "keyevent", "4"], 10_000);
    pdfViewerReturned = returned.ok;
    if (!returned.ok) failures.push(`${phase}_pdf_viewer_return_failed`);
    await wait(800);
    snapshot = await waitForKnownCaseBoundarySurface();
  }

  const internalPdfRouteWasOpen = Boolean(findNodeById(snapshot, "native-pdf-handoff-shell"));
  let internalPdfRouteClosed = !internalPdfRouteWasOpen;
  if (internalPdfRouteWasOpen) {
    const backNode = findNodeById(snapshot, "pdf-viewer-back");
    if (!backNode || !tapNode(backNode)) {
      failures.push(`${phase}_internal_pdf_route_close_failed`);
    } else {
      snapshot = await waitForKnownCaseBoundarySurface();
      internalPdfRouteClosed = !findNodeById(snapshot, "native-pdf-handoff-shell");
      if (!internalPdfRouteClosed) failures.push(`${phase}_internal_pdf_route_remained_open`);
    }
  }

  const historyModalWasOpen = Boolean(findNodeById(snapshot, "consumer-repair-history-modal"));
  let historyModalClosed = !historyModalWasOpen;
  if (historyModalWasOpen) {
    const closeNode = findNodeById(snapshot, "consumer-repair-history-close");
    if (!closeNode || !tapNode(closeNode)) {
      failures.push(`${phase}_history_modal_close_failed`);
    } else {
      const deadline = Date.now() + 20_000;
      do {
        await wait(500);
        snapshot = dumpUi();
        historyModalClosed = !findNodeById(snapshot, "consumer-repair-history-modal");
      } while (!historyModalClosed && Date.now() < deadline);
      if (!historyModalClosed) failures.push(`${phase}_history_modal_remained_open`);
    }
  }

  snapshot = dumpUi();
  const blockingModalPresent = Boolean(findNodeById(snapshot, "consumer-repair-history-modal"))
    || pdfProjectionVisibleIn(snapshot);
  const neutralRouteVisible = Boolean(findNodeById(snapshot, "consumer-repair-screen"));
  if (blockingModalPresent) failures.push(`${phase}_blocking_modal_present`);
  if (!neutralRouteVisible) failures.push(`${phase}_neutral_consumer_repair_route_missing`);

  return {
    phase,
    pdf_viewer_returned: pdfViewerReturned,
    internal_pdf_route_was_open: internalPdfRouteWasOpen,
    internal_pdf_route_closed: internalPdfRouteClosed,
    history_modal_was_open: historyModalWasOpen,
    history_modal_closed: historyModalClosed,
    neutral_route_visible: neutralRouteVisible,
    blocking_modal_present: blockingModalPresent,
    data_wipes: 0,
    failures,
  };
}

async function tapById(testId: string, maxSwipes = 18): Promise<boolean> {
  let found = await scrollToId(testId, maxSwipes);
  let node = found.node;
  if (!node) return false;
  const { height } = viewport();
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const adjustment = nativeNodeSafeViewportAdjustment(node.bounds, height);
    if (adjustment === "none") return tapNode(node);
    if (adjustment === "invalid") return false;
    swipe(adjustment);
    await wait(600);
    const snapshot = dumpUi();
    const moved = findNodeById(snapshot, testId);
    if (!moved) {
      const reacquired = await scrollToId(testId, 4);
      if (!reacquired.node) return false;
      found = reacquired;
      node = reacquired.node;
      continue;
    }
    found = { snapshot, node: moved };
    node = moved;
  }
  return false;
}

async function waitForId(testId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<ReturnType<typeof dumpUi>> {
  const deadline = Date.now() + timeoutMs;
  let last = dumpUi();
  while (Date.now() < deadline) {
    if (findNodeById(last, testId)) return last;
    if (/isn't responding|is not responding|Application Not Responding/i.test(last.text)) {
      const waitNode = last.nodes.find((node) => /\bWait\b/i.test(node.text) || node.resourceId.endsWith("aerr_wait"));
      if (waitNode) tapNode(waitNode);
    }
    await wait(WAIT_POLL_MS);
    last = dumpUi();
  }
  return last;
}

async function waitForIdSparse(
  testId: string,
  timeoutMs: number,
  quietSettleMs = 20_000,
  pollMs = 8_000,
): Promise<ReturnType<typeof dumpUi>> {
  await wait(quietSettleMs);
  const deadline = Date.now() + Math.max(0, timeoutMs - quietSettleMs);
  let last = dumpUi();
  while (Date.now() < deadline) {
    if (findNodeById(last, testId)) return last;
    await wait(pollMs);
    last = dumpUi();
  }
  return last;
}

async function waitForCompiledProjection(
  expectedRowCount: number,
  timeoutMs = 420_000,
): Promise<ReturnType<typeof dumpUi>> {
  await wait(3_000);
  const deadline = Date.now() + Math.max(0, timeoutMs - 3_000);
  let last = dumpUi();
  while (Date.now() < deadline) {
    const rowCountText = findNodeById(last, "request-estimate-row-count")?.text ?? "";
    const parameterStatusText = findNodeById(last, "request-estimate-parameter-status")?.text ?? "";
    if (
      Number(rowCountText.match(/\d+/)?.[0] ?? -1) === expectedRowCount
      && /\b0\b/.test(parameterStatusText)
    ) {
      return last;
    }
    await wait(3_000);
    last = dumpUi();
  }
  return last;
}

function inputText(value: string): boolean {
  const chunks = value.match(/[\s\S]{1,8}/g) ?? [];
  for (const chunk of chunks) {
    const escaped = chunk
      .replace(/ /g, "%s")
      .replace(/&/g, "\\&")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\|/g, "\\|")
      .replace(/</g, "\\<")
      .replace(/>/g, "\\>")
      .replace(/;/g, "\\;")
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'");
    if (!adb(["shell", "input", "text", escaped], 20_000).ok) return false;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 180);
  }
  return true;
}

async function replaceFocusedInput(value: string): Promise<boolean> {
  adb(["shell", "input", "keyevent", "123"], 5_000);
  adb(["shell", "input", "keyevent", ...Array.from({ length: 96 }, () => "67")], 20_000);
  const typed = inputText(value);
  const dismissed = await dismissSoftKeyboard();
  await wait(250);
  return typed && dismissed;
}

async function dismissSoftKeyboard(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const state = adb(["shell", "dumpsys", "input_method"], 15_000);
    if (!/mInputShown=true/i.test(state.output)) return true;
    adb(["shell", "input", "keyevent", "4"], 5_000);
    await wait(750);
  }
  return !/mInputShown=true/i.test(adb(["shell", "dumpsys", "input_method"], 15_000).output);
}

async function setTextInput(testId: string, value: string, maxSwipes = 18): Promise<boolean> {
  const found = await scrollToId(testId, maxSwipes);
  if (!found.node || !tapNode(found.node)) return false;
  await wait(250);
  return replaceFocusedInput(value);
}

async function waitForEnabledId(testId: string, timeoutMs = 60_000): Promise<UiNode | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lookup = await scrollToId(testId, 8);
    if (lookup.node?.attrs.includes('enabled="true"')) return lookup.node;
    await wait(2_000);
  }
  return null;
}

async function collapseDisclosureIfOpen(testId: string): Promise<boolean> {
  const lookup = await scrollToId(testId, 24);
  if (!lookup.node) return false;
  const label = `${lookup.node.text} ${lookup.node.contentDesc}`;
  if (!/\u0421\u043a\u0440\u044b\u0442\u044c/u.test(label)) return true;
  if (!await tapById(testId, 6)) return false;
  await wait(750);
  return true;
}

async function openDisclosureAndFind(
  toggleId: string,
  contentId: string,
  maxSwipes = 16,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; node: UiNode | null }> {
  let content = { snapshot: dumpUi(), node: null as UiNode | null };
  const initiallyVisible = findNodeById(content.snapshot, contentId);
  if (initiallyVisible) return { snapshot: content.snapshot, node: initiallyVisible };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const toggle = await scrollToId(toggleId, maxSwipes);
    if (!toggle.node) return content;
    const open = /\u0421\u043a\u0440\u044b\u0442\u044c/u.test(`${toggle.node.text} ${toggle.node.contentDesc}`);
    if (!open && !await tapById(toggleId, 6)) return content;
    await wait(1_500);
    content = await scrollToId(contentId, maxSwipes);
    if (content.node) return content;
  }
  return content;
}

async function readApprovedHistoryCount(): Promise<number | null> {
  const lookup = await scrollToId("consumer-repair-history-loaded-count", 20);
  const numbers = (lookup.node?.text ?? "").match(/\d+/g)?.map(Number) ?? [];
  return numbers.length >= 2 ? numbers[1] : null;
}

async function waitForApprovedHistoryIncrement(
  previousApprovedCount: number,
  timeoutMs = 180_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const lookup = await scrollToId("consumer-repair-history-loaded-count", 20);
    const numbers = (lookup.node?.text ?? "").match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length >= 2 && numbers[0] > 0 && numbers[1] > previousApprovedCount) return true;
    await wait(5_000);
  }
  return false;
}

function p0Keys(workKey: string): RoadworksWaveAParameterKey[] {
  const registration = RoadworksWaveAProductionRegistry.find((item) => item.workId === workKey);
  return registration?.parameterDefinitions.filter((definition) => definition.tier === "P0").map((definition) => definition.key) ?? [];
}

function rawParameterValue(key: RoadworksWaveAParameterKey): string {
  return String(DEFAULT_ROADWORKS_WAVE_A_INPUTS[key]);
}

async function setInlineParameter(
  key: RoadworksWaveAParameterKey,
  value: string,
  caseDir: string,
): Promise<boolean> {
  const presentation = ROADWORKS_WAVE_A_PARAMETER_PRESENTATION[key];
  const waitForCommittedValue = async (): Promise<boolean> => {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const exactEditor = await scrollToId(`editable-param-inline-editor-${key}`, 8);
      const snapshot = exactEditor.snapshot;
      const dirty = findNodeById(snapshot, `editable-param-dirty-${key}`);
      const editor = exactEditor.node;
      const input = editor ? findInputOwnedByEditor(snapshot, editor) : null;
      if (presentation.choices.length > 0 && dirty) return true;
      if (dirty && input?.text === value) return true;
      await wait(750);
    }
    return false;
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (presentation.choices.length > 0) {
      if (await tapById(`editable-param-option-${key}-${value}`, 4) && await waitForCommittedValue()) return true;
      capture(caseDir, `p0-${key}-attempt-${attempt + 1}-primary-not-dirty`);
      const alternate = presentation.choices.find((choice) => String(choice.value) !== value);
      if (
        alternate
        && await tapById(`editable-param-option-${key}-${alternate.value}`, 4)
        && await waitForCommittedValue()
        && await tapById(`editable-param-option-${key}-${value}`, 4)
        && await waitForCommittedValue()
      ) return true;
      capture(caseDir, `p0-${key}-attempt-${attempt + 1}-alternate-not-dirty`);
      continue;
    }
    const editorId = `editable-param-inline-editor-${key}`;
    const owned = await findSafeInputOwnedByExactEditor(editorId);
    if (!owned) continue;
    if (!tapNode(owned.input)) continue;
    await wait(200);
    if (await replaceFocusedInput(value) && await waitForCommittedValue()) return true;
  }
  return false;
}

function revisionLabel(snapshot: ReturnType<typeof dumpUi>): string | null {
  const node = findNodeById(snapshot, "estimate-current-revision-id");
  return node?.text || node?.contentDesc || null;
}

async function waitForChangedRevision(
  previousRevisionLabel: string,
  timeoutMs = 420_000,
): Promise<{ snapshot: ReturnType<typeof dumpUi>; label: string | null }> {
  const deadline = Date.now() + timeoutMs;
  let last = dumpUi();
  while (Date.now() < deadline) {
    await returnToTop(5);
    const lookup = await scrollToId("estimate-current-revision-id", 6);
    last = lookup.snapshot;
    const label = revisionLabel(last);
    if (label && label !== previousRevisionLabel) return { snapshot: last, label };
    await wait(10_000);
  }
  return { snapshot: last, label: revisionLabel(last) };
}

async function applyEditAndWaitForChangedRevision(
  previousRevisionLabel: string,
  timeoutMs = 420_000,
): Promise<{
  snapshot: ReturnType<typeof dumpUi>;
  label: string | null;
  applyTapped: boolean;
}> {
  const deadline = Date.now() + timeoutMs;
  let last = { snapshot: dumpUi(), label: null as string | null, applyTapped: false };
  for (let attempt = 0; attempt < 3 && Date.now() < deadline; attempt += 1) {
    // A successful `adb input tap` only proves that Android accepted the
    // coordinate. Reacquire the exact action and require a new immutable
    // revision before accepting the edit; the status from the initial P0 apply
    // remains visible and is deliberately not an acknowledgement signal.
    if (!await tapById("editable-param-batch-apply", 16)) continue;
    last.applyTapped = true;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) break;
    const changed = await waitForChangedRevision(
      previousRevisionLabel,
      Math.min(120_000, remainingMs),
    );
    last = { ...changed, applyTapped: true };
    if (changed.label && changed.label !== previousRevisionLabel) return last;
  }
  return last;
}

function visibleBuildIdentity(snapshot: ReturnType<typeof dumpUi>): string | null {
  const node = findNodeById(snapshot, "build-identity")
    ?? snapshot.nodes.find((candidate) => candidate.contentDesc === "BUILD_IDENTITY");
  return node?.text || node?.contentDesc || null;
}

function capture(caseDir: string, name: string): { screenshot: string | null; uiDump: string | null } {
  fs.mkdirSync(caseDir, { recursive: true });
  const screenshot = path.join(caseDir, `${name}.png`);
  const uiDump = path.join(caseDir, `${name}.xml`);
  const shot = adb(["exec-out", "screencap", "-p"], 20_000);
  if (shot.ok) {
    const binary = execFileSync(adbPath(), ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
      cwd: process.cwd(),
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
    });
    fs.writeFileSync(screenshot, binary);
  }
  const dumped = dumpUi();
  if (dumped.ok) fs.writeFileSync(uiDump, dumped.xml, "utf8");
  return { screenshot: shot.ok ? screenshot : null, uiDump: dumped.ok ? uiDump : null };
}

function requestUri(prompt?: string, autoPrepare = false): string {
  const url = new URL("rik:///request");
  if (prompt) url.searchParams.set("prompt", prompt);
  if (autoPrepare) url.searchParams.set("autoPrepare", "1");
  return url.toString();
}

function launchUri(uri: string): CommandResult {
  return run(adbPath(), buildAndroidDeepLinkLaunchArgs(DEVICE_ID, uri, PACKAGE_NAME), 25_000);
}

async function openCurrentDevBundle(port: number, forceReload = false): Promise<boolean> {
  adb(["reverse", `tcp:${port}`, `tcp:${port}`], 10_000);
  adb(["reverse", "tcp:8081", `tcp:${port}`], 10_000);
  const alreadyCurrent = dumpUi();
  if (
    !forceReload &&
    (findNodeById(alreadyCurrent, "consumer-repair-screen") || findNodeById(alreadyCurrent, "auth.login.screen"))
    && findNodeById(alreadyCurrent, "build-identity")
  ) {
    return true;
  }
  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(800);
  const uri = `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
  if (!launchUri(uri).ok) return false;
  const deadline = Date.now() + 180_000;
  let requestLaunched = false;
  while (Date.now() < deadline) {
    const snapshot = dumpUi();
    if (findNodeById(snapshot, "consumer-repair-screen")) return true;
    if (findNodeById(snapshot, "auth.login.screen")) return true;
    const continueNode = snapshot.nodes.find((node) => /^Continue$/i.test(node.text));
    if (continueNode) {
      tapNode(continueNode);
      await wait(2_000);
      continue;
    }
    if (snapshot.text.includes("Reload") && snapshot.text.includes("Go home") && snapshot.text.includes("TOOLS")) {
      adb(["shell", "input", "keyevent", "4"], 10_000);
      await wait(1_500);
      continue;
    }
    const server = snapshot.nodes.find((node) =>
      node.text.includes(`127.0.0.1:${port}`)
      || node.text.includes(`10.0.2.2:${port}`)
      || node.contentDesc.includes(`127.0.0.1:${port}`)
      || node.contentDesc.includes(`10.0.2.2:${port}`)
    );
    if (server) {
      tapNode(server);
      await wait(2_000);
      continue;
    }
    if (!requestLaunched && (findNodeById(snapshot, "build-identity") || snapshot.text.includes("BUILD_IDENTITY"))) {
      requestLaunched = launchUri(requestUri()).ok;
      await wait(2_000);
      continue;
    }
    await wait(WAIT_POLL_MS);
  }
  return false;
}

async function ensureAuthenticatedRequestRoute(devServerPort: number): Promise<{ ok: boolean; attempted: boolean; reason: string | null }> {
  let snapshot = dumpUi();
  const authVisible = Boolean(findNodeById(snapshot, "auth.login.screen"));
  if (authVisible) {
    const email = String(process.env.E2E_AUTH_EMAIL ?? process.env.E2E_CONSUMER_EMAIL ?? process.env.E2E_DIRECTOR_EMAIL ?? "").trim();
    const password = String(process.env.E2E_AUTH_PASSWORD ?? process.env.E2E_CONSUMER_PASSWORD ?? process.env.E2E_DIRECTOR_PASSWORD ?? "").trim();
    if (!email || !password) return { ok: false, attempted: false, reason: "native_auth_credentials_missing" };
    if (!await setTextInput("auth.login.email", email, 2)) return { ok: false, attempted: true, reason: "native_auth_email_fill_failed" };
    snapshot = dumpUi();
    const emailNode = findNodeById(snapshot, "auth.login.email");
    if ((emailNode?.text ?? "") !== email) return { ok: false, attempted: true, reason: "native_auth_email_exact_verification_failed" };
    if (!await setTextInput("auth.login.password", password, 2)) return { ok: false, attempted: true, reason: "native_auth_password_fill_failed" };
    let passwordSecureAndPopulated = false;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      snapshot = dumpUi();
      const passwordNode = findNodeById(snapshot, "auth.login.password");
      passwordSecureAndPopulated = Boolean(
        passwordNode?.attrs.includes('password="true"')
        && /[\u2022\u25cf*]/u.test(`${passwordNode.text}${passwordNode.contentDesc}`),
      );
      if (passwordSecureAndPopulated) break;
      await wait(750);
    }
    if (!passwordSecureAndPopulated) {
      return { ok: false, attempted: true, reason: "native_auth_secure_password_verification_failed" };
    }
    const submit = await waitForId("auth.login.submit", 30_000);
    const submitNode = findNodeById(submit, "auth.login.submit");
    if (!submitNode || !tapNode(submitNode)) return { ok: false, attempted: true, reason: "native_auth_submit_missing" };
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await wait(1_500);
      snapshot = dumpUi();
      if (findNodeById(snapshot, "auth.login.error")) return { ok: false, attempted: true, reason: "native_auth_login_rejected" };
      if (!findNodeById(snapshot, "auth.login.screen")) break;
    }
    if (findNodeById(snapshot, "auth.login.screen")) return { ok: false, attempted: true, reason: "native_auth_login_timeout" };
  }
  const launched = launchUri(requestUri());
  if (!launched.ok) return { ok: false, attempted: authVisible, reason: "native_request_route_launch_failed" };
  const request = await waitForId("consumer-repair-screen", 120_000);
  return findNodeById(request, "consumer-repair-screen")
    ? { ok: true, attempted: authVisible, reason: null }
    : { ok: false, attempted: authVisible, reason: "native_authenticated_request_route_missing" };
}

async function collectVisibleRowNames(expectedNames: string[], maxSwipes = 24): Promise<{ found: Set<string>; text: string }> {
  const found = new Set<string>();
  const snapshots: string[] = [];
  for (let index = 0; index <= maxSwipes; index += 1) {
    const snapshot = dumpUi();
    snapshots.push(snapshot.text);
    const normalized = snapshot.text.toLocaleLowerCase("ru-RU");
    for (const name of expectedNames) {
      if (normalized.includes(name.toLocaleLowerCase("ru-RU"))) found.add(name);
    }
    if (found.size === expectedNames.length) break;
    swipe("up", index % 4 === 3);
    await wait(350);
  }
  return { found, text: snapshots.join("\n") };
}

async function runCase(
  registration: typeof RoadworksWaveAProductionRegistry[number],
  artifactDir: string,
  buildIdentityVisible: boolean,
  devServerPort: number | null,
): Promise<NativeCaseResult> {
  const startedAt = Date.now();
  const phaseDurationsMs: Record<string, number> = {};
  const markPhase = (phase: string): void => {
    phaseDurationsMs[phase] = Date.now() - startedAt;
  };
  const failures: string[] = [];
  const screenshots: string[] = [];
  const uiDumps: string[] = [];
  const caseDir = path.join(artifactDir, "cases", registration.workId);
  const expectedP0 = p0Keys(registration.workId);
  const expectedRows = compileRoadworksWaveAWork(
    registration.workId,
    DEFAULT_ROADWORKS_WAVE_A_INPUTS,
    { scopeProfile: registration.scopeProfile },
  ).rows;
  const expectedRowNames = expectedRows.map((row) => row.nameRu);
  let caseStartIsolation: NativeCaseIsolationEvidence = {
    phase: "before_case",
    pdf_viewer_returned: false,
    internal_pdf_route_was_open: false,
    internal_pdf_route_closed: true,
    history_modal_was_open: false,
    history_modal_closed: true,
    neutral_route_visible: false,
    blocking_modal_present: false,
    data_wipes: 0,
    failures: [],
  };
  let caseEndIsolation: NativeCaseIsolationEvidence | null = null;
  const readRuntimeBuildTiming = (): NativeEstimateBuildTimingEvidence =>
    parseNativeEstimateBuildTimingEvidence(adb(["logcat", "-d", "-v", "brief"], 30_000).output);
  const finishAtRootFailure = (
    phaseReached: NativeCaseResult["phase_reached"],
    rootFailures: string[],
    observedP0: string[] = [],
    revisionBeforeEdit: string | null = null,
  ): NativeCaseResult => ({
    work_key: registration.workId,
    title: registration.professionalNameRu,
    scope_profile: registration.scopeProfile,
    expected_p0: expectedP0,
    observed_p0: observedP0,
    expected_boq_rows: expectedRows.length,
    create: false,
    edit: false,
    cold_replay_pdf: false,
    exact_owner_visible: false,
    full_boq_visible: false,
    pdf_projection_visible: false,
    pdf_projection_mode: null,
    pdf_exact_owner_visible: false,
    pdf_full_boq_visible: false,
    missing_pdf_boq_row_names: [],
    immutable_revision_visible: false,
    build_identity_visible: buildIdentityVisible,
    revision_before_edit: revisionBeforeEdit,
    revision_after_edit: null,
    missing_boq_row_names: [],
    screenshots,
    ui_dumps: uiDumps,
    failures: rootFailures,
    duration_ms: Date.now() - startedAt,
    phase_durations_ms: phaseDurationsMs,
    runtime_build_timing: readRuntimeBuildTiming(),
    case_start_isolation: caseStartIsolation,
    case_end_isolation: caseEndIsolation,
    phase_reached: phaseReached,
  });

  caseStartIsolation = await restoreNativeCaseIsolation("before_case");
  if (caseStartIsolation.failures.length > 0) {
    return finishAtRootFailure("launch", caseStartIsolation.failures);
  }
  markPhase("case_start_isolation_complete");
  await returnToTop(12);
  adb(["logcat", "-c"], 15_000);
  const launch = launchUri(requestUri(registration.professionalNameRu, true));
  if (!launch.ok) return finishAtRootFailure("launch", [`create_launch_failed:${launch.output.slice(0, 240)}`]);
  let initial = await waitForIdSparse("request-estimate-parameters-toggle", 420_000, 35_000, 10_000);
  markPhase("exact_intent_p0_disclosure_ready");
  if (!findNodeById(initial, "request-estimate-parameters-toggle")) {
    const failedCapture = capture(caseDir, "p0-root-failure");
    if (failedCapture.screenshot) screenshots.push(failedCapture.screenshot);
    if (failedCapture.uiDump) uiDumps.push(failedCapture.uiDump);
    return finishAtRootFailure("launch", ["p0_disclosure_toggle_missing_after_exact_intent"]);
  }
  if (!await tapById("request-estimate-parameters-toggle", 4)) {
    return finishAtRootFailure("p0", ["p0_disclosure_toggle_tap_failed"]);
  }
  initial = await waitForIdSparse("request-estimate-parameter-panel", 60_000, 2_000, 4_000);
  if (!findNodeById(initial, "request-estimate-parameter-panel")) {
    // A native deep link may dispatch twice while the first lazy runtime build is
    // still settling. The second immutable draft projection legitimately
    // remounts the screen and closes local disclosure state. Wait for that
    // projection to settle, then reacquire and tap the current native node.
    await wait(45_000);
    if (await tapById("request-estimate-parameters-toggle", 6)) {
      initial = await waitForIdSparse("request-estimate-parameter-panel", 60_000, 2_000, 4_000);
    }
  }
  if (!findNodeById(initial, "request-estimate-parameter-panel")) {
    return finishAtRootFailure("p0", ["p0_parameter_panel_missing_after_disclosure"]);
  }
  const observedP0 = expectedP0.filter((key) => initial.text.includes(`request-estimate-missing-param-${key}`));
  for (const key of expectedP0) {
    if (!observedP0.includes(key)) {
      const found = await scrollToId(`request-estimate-missing-param-${key}`, 16);
      if (found.node) observedP0.push(key);
    }
  }
  if (observedP0.length !== expectedP0.length) {
    return finishAtRootFailure("p0", [`p0_schema_mismatch:${observedP0.length}/${expectedP0.length}`], observedP0);
  }
  for (const key of expectedP0) {
    if (!await setInlineParameter(key, rawParameterValue(key), caseDir)) {
      return finishAtRootFailure("p0", [`p0_fill_failed:${key}`], observedP0);
    }
  }
  if (!await tapById("editable-param-batch-apply", 16)) {
    return finishAtRootFailure("p0", ["p0_apply_failed"], observedP0);
  }
  await returnToTop(20);
  const applied = await waitForCompiledProjection(expectedRows.length);
  markPhase("p0_compiled_projection_ready");
  const appliedStatus = await scrollToId("request-estimate-parameter-apply-status", 24);
  if (!appliedStatus.node) {
    return finishAtRootFailure("p0", ["compiled_revision_status_missing_after_p0_apply"], observedP0);
  }
  const appliedRowCount = Number(
    (findNodeById(applied, "request-estimate-row-count")?.text ?? "").match(/\d+/)?.[0] ?? -1,
  );
  if (appliedRowCount !== expectedRows.length) {
    return finishAtRootFailure(
      "p0",
      [`compiled_boq_row_count_expected_${expectedRows.length}_received_${appliedRowCount}`],
      observedP0,
    );
  }
  if (!await collapseDisclosureIfOpen("request-estimate-parameters-toggle")) {
    return finishAtRootFailure("create", ["parameter_disclosure_collapse_failed_after_p0_apply"], observedP0);
  }
  const compiledLookup = await openDisclosureAndFind(
    "request-estimate-items-editor",
    "request-estimate-items-editor-content",
    16,
  );
  const compiled = compiledLookup.snapshot;
  const revisionBeforeLookup = await scrollToId("estimate-current-revision-id", 24);
  const revisionBeforeEdit = revisionLabel(revisionBeforeLookup.snapshot);
  const exactOwnerVisible = applied.text.includes(registration.professionalNameRu);
  if (!compiledLookup.node) {
    return finishAtRootFailure("p0", ["compiled_boq_missing_after_p0_apply"], observedP0);
  }
  if (!exactOwnerVisible) return finishAtRootFailure("create", ["exact_owner_title_missing_after_create"], observedP0, revisionBeforeEdit);
  if (!revisionBeforeEdit) return finishAtRootFailure("create", ["create_revision_missing"], observedP0);
  const createCapture = capture(caseDir, "create");
  if (createCapture.screenshot) screenshots.push(createCapture.screenshot);
  if (createCapture.uiDump) uiDumps.push(createCapture.uiDump);
  const create = true;
  markPhase("create_complete");

  await returnToTop(16);
  if (!await collapseDisclosureIfOpen("request-estimate-items-editor")) {
    failures.push("boq_disclosure_collapse_failed_before_edit");
  }
  const editPanel = await openDisclosureAndFind(
    "request-estimate-parameters-toggle",
    "request-estimate-parameter-panel",
    16,
  );
  if (!editPanel.node) failures.push("parameter_disclosure_open_failed_before_edit");
  if (editPanel.node && !await setInlineParameter("area_m2", "137", caseDir)) failures.push("edit_area_failed");
  if (failures.length > 0) {
    const failedEditCapture = capture(caseDir, "edit-area-failure");
    if (failedEditCapture.screenshot) screenshots.push(failedEditCapture.screenshot);
    if (failedEditCapture.uiDump) uiDumps.push(failedEditCapture.uiDump);
    markPhase("edit_complete");
    return {
      ...finishAtRootFailure("edit", failures, observedP0, revisionBeforeEdit),
      create,
      edit: false,
      immutable_revision_visible: false,
      revision_after_edit: null,
    };
  }
  const changedRevision = revisionBeforeEdit
    ? await applyEditAndWaitForChangedRevision(revisionBeforeEdit)
    : { snapshot: dumpUi(), label: null, applyTapped: false };
  if (!changedRevision.applyTapped) failures.push("edit_apply_failed");
  const editedDiff = await scrollToId("estimate-revision-diff-param-area_m2", 24);
  const edited = editedDiff.snapshot;
  const revisionAfterEdit = changedRevision.label;
  const immutableRevisionVisible = Boolean(
    revisionBeforeEdit
    && revisionAfterEdit
    && revisionBeforeEdit !== revisionAfterEdit
    && editedDiff.node,
  );
  if (!immutableRevisionVisible) failures.push("immutable_revision_edit_proof_missing");
  const editCapture = capture(caseDir, "edit");
  if (editCapture.screenshot) screenshots.push(editCapture.screenshot);
  if (editCapture.uiDump) uiDumps.push(editCapture.uiDump);
  const edit = failures.filter((failure) => failure.startsWith("edit_") || failure.includes("revision")).length === 0;
  markPhase("edit_complete");
  const finishAfterEditFailure = (rootFailures: string[]): NativeCaseResult => ({
    ...finishAtRootFailure("edit", rootFailures, observedP0, revisionBeforeEdit),
    create,
    edit,
    immutable_revision_visible: immutableRevisionVisible,
    revision_after_edit: revisionAfterEdit,
  });
  if (!edit) return finishAfterEditFailure(failures);

  await returnToTop(24);
  if (!await collapseDisclosureIfOpen("request-estimate-parameters-toggle")) {
    return finishAfterEditFailure(["parameter_disclosure_collapse_failed_before_history_baseline"]);
  }
  if (!await collapseDisclosureIfOpen("request-estimate-items-editor")) {
    return finishAfterEditFailure(["boq_disclosure_collapse_failed_before_history_baseline"]);
  }
  const approvedHistoryCountBefore = await readApprovedHistoryCount();
  if (approvedHistoryCountBefore == null) {
    return finishAfterEditFailure(["approved_history_baseline_missing"]);
  }
  await returnToTop(20);
  // Approval freezes the estimate/PDF revision and intentionally does not send
  // to marketplace. Delivery contact is optional here and becomes mandatory
  // only in validateConsumerRepairRequestForMarketplace.
  const optionalAddress = (await scrollToId("consumer-repair-address-input", 24)).node;
  const optionalPhone = (await scrollToId("consumer-repair-phone-input", 24)).node;
  // Android UiAutomator exposes a React Native TextInput placeholder through
  // the node's `text` attribute when its controlled value is still empty.
  // Accept only that exact native projection (or an actual empty string); any
  // user/contact value remains a contract failure.
  const optionalAddressIsEmpty = nativeOptionalControlledInputIsEmpty(optionalAddress, "Адрес");
  const optionalPhoneIsEmpty = nativeOptionalControlledInputIsEmpty(optionalPhone, "Телефон");
  if (!optionalAddressIsEmpty || !optionalPhoneIsEmpty) {
    return finishAfterEditFailure(["approval_optional_contact_state_contract_failed"]);
  }
  if (!await dismissSoftKeyboard()) return finishAfterEditFailure(["soft_keyboard_dismiss_failed"]);
  const approveNode = await waitForEnabledId("consumer-repair-approve", 90_000);
  if (!approveNode || !tapNode(approveNode)) {
    return finishAfterEditFailure(["approve_not_enabled_or_tap_failed"]);
  }
  if (!await waitForApprovedHistoryIncrement(approvedHistoryCountBefore)) {
    return finishAfterEditFailure(["approved_history_count_not_incremented"]);
  }
  markPhase("approval_durable_commit_complete");

  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  await wait(1_000);
  if (devServerPort && !await openCurrentDevBundle(devServerPort)) failures.push("cold_dev_bundle_reconnect_failed");
  const coldLaunch = launchUri(requestUri());
  if (!coldLaunch.ok) failures.push(`cold_launch_failed:${coldLaunch.output.slice(0, 240)}`);
  await waitForIdSparse("consumer-repair-history-button", 180_000, 15_000, 6_000);
  if (!await tapById("consumer-repair-history-button", 16)) {
    failures.push("history_open_failed");
  } else {
    const modal = await waitForId("consumer-repair-history-modal", 30_000);
    if (!findNodeById(modal, "consumer-repair-history-modal")) failures.push("history_modal_missing");
  }
  if (!await tapHistoryEntryByExactTitle(registration.professionalNameRu)) {
    failures.push("history_exact_title_open_failed");
  }
  const history = await waitForId("consumer-repair-history-readonly-snapshot", 90_000);
  const historyExactOwner = history.text.includes(registration.professionalNameRu);
  if (!historyExactOwner) failures.push("history_exact_owner_title_missing");
  const rowEvidence = await collectVisibleRowNames(expectedRowNames, Math.max(24, expectedRowNames.length));
  const missingBoqRowNames = expectedRowNames.filter((name) => !rowEvidence.found.has(name));
  const fullBoqVisible = missingBoqRowNames.length === 0;
  if (!fullBoqVisible) failures.push(`history_full_boq_missing:${missingBoqRowNames.length}/${expectedRowNames.length}`);
  const replayCapture = capture(caseDir, "cold-replay");
  if (replayCapture.screenshot) screenshots.push(replayCapture.screenshot);
  if (replayCapture.uiDump) uiDumps.push(replayCapture.uiDump);
  markPhase("cold_replay_complete");

  await returnToTop(12);
  const pdfTapped = await tapById("consumer-repair-history-open-pdf-expanded", 8)
    || await tapById("consumer-repair-history-open-pdf-inline", 8)
    || await tapById("consumer-repair-history-pdf", 10);
  if (!pdfTapped) failures.push("history_pdf_action_missing");
  const pdfProbe = await waitForPdfProjection(90_000);
  const pdfProjectionVisible = pdfProbe.mode != null;
  if (!pdfProjectionVisible) failures.push("native_pdf_viewer_missing");
  const pdfText = pdfProjectionVisible ? await extractGeneratedPdfText(pdfProbe.fileName) : null;
  if (!pdfText) failures.push("native_pdf_bytes_or_text_missing");
  const normalizedPdfText = pdfText?.toLocaleLowerCase("ru-RU") ?? "";
  const pdfExactOwnerVisible = normalizedPdfText.includes(registration.professionalNameRu.toLocaleLowerCase("ru-RU"));
  if (!pdfExactOwnerVisible) failures.push("native_pdf_exact_owner_missing");
  const missingPdfBoqRowNames = expectedRowNames.filter((name) =>
    !normalizedPdfText.includes(name.toLocaleLowerCase("ru-RU"))
  );
  const pdfFullBoqVisible = missingPdfBoqRowNames.length === 0;
  if (!pdfFullBoqVisible) {
    failures.push(`native_pdf_full_boq_missing:${missingPdfBoqRowNames.length}/${expectedRowNames.length}`);
  }
  const pdfCapture = capture(caseDir, "pdf");
  if (pdfCapture.screenshot) screenshots.push(pdfCapture.screenshot);
  if (pdfCapture.uiDump) uiDumps.push(pdfCapture.uiDump);
  caseEndIsolation = await restoreNativeCaseIsolation("after_pdf", pdfProbe.mode);
  failures.push(...caseEndIsolation.failures);
  markPhase("case_end_isolation_complete");

  const coldReplayPdf = historyExactOwner
    && fullBoqVisible
    && pdfProjectionVisible
    && pdfExactOwnerVisible
    && pdfFullBoqVisible;
  const runtimeBuildTiming = readRuntimeBuildTiming();
  failures.push(...runtimeBuildTiming.failures);
  markPhase("pdf_projection_complete");
  return {
    work_key: registration.workId,
    title: registration.professionalNameRu,
    scope_profile: registration.scopeProfile,
    expected_p0: expectedP0,
    observed_p0: observedP0,
    expected_boq_rows: expectedRows.length,
    create,
    edit,
    cold_replay_pdf: coldReplayPdf,
    exact_owner_visible: exactOwnerVisible && historyExactOwner,
    full_boq_visible: fullBoqVisible,
    pdf_projection_visible: pdfProjectionVisible,
    pdf_projection_mode: pdfProbe.mode,
    pdf_exact_owner_visible: pdfExactOwnerVisible,
    pdf_full_boq_visible: pdfFullBoqVisible,
    missing_pdf_boq_row_names: missingPdfBoqRowNames,
    immutable_revision_visible: immutableRevisionVisible,
    build_identity_visible: buildIdentityVisible,
    revision_before_edit: revisionBeforeEdit,
    revision_after_edit: revisionAfterEdit,
    missing_boq_row_names: missingBoqRowNames,
    screenshots,
    ui_dumps: uiDumps,
    failures,
    duration_ms: Date.now() - startedAt,
    phase_durations_ms: phaseDurationsMs,
    runtime_build_timing: runtimeBuildTiming,
    case_start_isolation: caseStartIsolation,
    case_end_isolation: caseEndIsolation,
    phase_reached: pdfProjectionVisible ? "pdf" : "cold_replay",
  };
}

function parseOptions(): CliOptions {
  const args = process.argv.slice(2);
  const value = (prefix: string): string | null => args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
  const devServerPortRaw = value("--dev-server-port=");
  const diagnosticWorkCountRaw = value("--diagnostic-work-count=");
  const diagnosticWorkCount = diagnosticWorkCountRaw == null ? null : Number(diagnosticWorkCountRaw);
  const diagnosticStartIndexRaw = value("--diagnostic-start-index=");
  return {
    diagnosticWorkKey: value("--diagnostic-work-key="),
    diagnosticWorkCount,
    diagnosticStartIndex: diagnosticStartIndexRaw == null ? 0 : Number(diagnosticStartIndexRaw),
    expectedCommit: value("--expected-commit=") ?? git(["rev-parse", "HEAD"]),
    devServerPort: devServerPortRaw ? Number(devServerPortRaw) : null,
    allowDirtyDiagnostic: args.includes("--allow-dirty-diagnostic"),
    clearAppData: args.includes("--clear-app-data"),
    forceDevReload: args.includes("--force-dev-reload"),
  };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function persistTerminalCaseEvidence(
  artifactDir: string,
  caseNumber: number,
  result: NativeCaseResult,
): void {
  const caseDir = path.join(artifactDir, "cases", result.work_key);
  fs.mkdirSync(caseDir, { recursive: true });
  if (result.failures.length > 0 && result.screenshots.length === 0 && result.ui_dumps.length === 0) {
    const failureCapture = capture(caseDir, `terminal-${result.phase_reached}-failure`);
    if (failureCapture.screenshot) result.screenshots.push(failureCapture.screenshot);
    if (failureCapture.uiDump) result.ui_dumps.push(failureCapture.uiDump);
  }
  const ledgerPath = path.join(caseDir, "terminal-case-result.json");
  const ledger = {
    schema: "asphalt-native-terminal-case-result/v1",
    case_number: caseNumber,
    terminal: true,
    result,
  };
  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    `${ledgerPath}.sha256`,
    `${sha256(fs.readFileSync(ledgerPath))}  ${path.basename(ledgerPath)}\n`,
    "utf8",
  );
}

async function main(): Promise<void> {
  const options = parseOptions();
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const status = git(["status", "--porcelain=v1"]);
  const dirty = Boolean(status.trim());
  const subjectPatchHash = sha256(git(["diff", "--binary", "HEAD"]));
  const expectedIdentityToken = options.expectedCommit;
  const artifactDir = path.join(process.cwd(), ".release-runtime", "asphalt-v3-final-r5", head, "native-android-api34");
  fs.mkdirSync(artifactDir, { recursive: true });

  const device = adb(["shell", "getprop", "ro.build.version.sdk"], 10_000);
  const packageProbe = adb(["shell", "pm", "path", PACKAGE_NAME], 10_000);
  const failures: string[] = [];
  if (!device.ok || device.output.trim() !== API_LEVEL) failures.push(`api_level_expected_34_received_${device.output.trim() || "missing"}`);
  if (!packageProbe.ok || !packageProbe.output.includes("package:")) failures.push("native_package_not_installed");
  if (head !== options.expectedCommit) failures.push(`head_expected_${options.expectedCommit}_received_${head}`);
  if (dirty && !options.allowDirtyDiagnostic) failures.push("worktree_not_clean_for_native_acceptance");
  if (options.diagnosticWorkKey && options.diagnosticWorkCount != null) {
    failures.push("diagnostic_work_key_and_count_are_mutually_exclusive");
  }
  if (
    options.diagnosticWorkCount != null
    && (
      !Number.isInteger(options.diagnosticWorkCount)
      || options.diagnosticWorkCount < 2
      || options.diagnosticWorkCount > 5
    )
  ) {
    failures.push(`diagnostic_work_count_expected_2_to_5_received_${options.diagnosticWorkCount}`);
  }
  if (
    !Number.isInteger(options.diagnosticStartIndex)
    || options.diagnosticStartIndex < 0
    || options.diagnosticStartIndex >= RoadworksWaveAProductionRegistry.length
    || (options.diagnosticWorkCount == null && options.diagnosticStartIndex !== 0)
  ) {
    failures.push(`diagnostic_start_index_invalid:${options.diagnosticStartIndex}`);
  }

  if (options.clearAppData) {
    const clear = adb(["shell", "pm", "clear", PACKAGE_NAME], 20_000);
    if (!clear.ok || !clear.output.includes("Success")) failures.push(`app_data_clear_failed:${clear.output.slice(0, 200)}`);
  }
  if (options.devServerPort && failures.length === 0) {
    if (!await openCurrentDevBundle(options.devServerPort, options.forceDevReload)) {
      failures.push("current_dev_bundle_not_ready");
    }
  } else if (failures.length === 0) {
    adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
    launchUri(requestUri());
    await waitForId("consumer-repair-screen", 120_000);
  }
  let authResult = { ok: false, attempted: false, reason: "native_bootstrap_not_run" as string | null };
  let appBuildIdentityMatches = false;
  if (failures.length === 0) {
    authResult = await ensureAuthenticatedRequestRoute(options.devServerPort ?? 8081);
    if (!authResult.ok) failures.push(authResult.reason ?? "native_authenticated_request_route_missing");
    if (authResult.ok) {
      const identitySnapshot = await waitForId("build-identity", 30_000);
      appBuildIdentityMatches = Boolean(
        (visibleBuildIdentity(identitySnapshot) ?? identitySnapshot.xml).includes(expectedIdentityToken),
      );
      if (!appBuildIdentityMatches) failures.push("native_build_identity_expected_commit_missing");
    }
  }

  const selected = options.diagnosticWorkKey
    ? RoadworksWaveAProductionRegistry.filter((item) => item.workId === options.diagnosticWorkKey)
    : options.diagnosticWorkCount != null
      ? Array.from(
        { length: options.diagnosticWorkCount },
        (_, offset) => RoadworksWaveAProductionRegistry[
          (options.diagnosticStartIndex + offset) % RoadworksWaveAProductionRegistry.length
        ],
      )
      : [...RoadworksWaveAProductionRegistry];
  if (selected.length === 0) failures.push(`unknown_diagnostic_work_key:${options.diagnosticWorkKey}`);
  const results: NativeCaseResult[] = [];
  if (failures.length === 0) {
    for (const [caseIndex, registration] of selected.entries()) {
      const result = await runCase(registration, artifactDir, appBuildIdentityMatches, options.devServerPort);
      persistTerminalCaseEvidence(artifactDir, caseIndex + 1, result);
      results.push(result);
      console.log(`NATIVE_ANDROID_API34 ${registration.workId} create=${result.create} edit=${result.edit} replay_pdf=${result.cold_replay_pdf} failures=${result.failures.length}`);
      if (result.failures.length > 0) break;
    }
  }

  const createCount = results.filter((result) => result.create).length;
  const editCount = results.filter((result) => result.edit).length;
  const replayCount = results.filter((result) => result.cold_replay_pdf).length;
  const runtimeBudgetCount = results.filter((result) => result.runtime_build_timing.performance_budget_green).length;
  const duplicateBuildCount = results.reduce((sum, result) => sum + result.runtime_build_timing.duplicate_build_count, 0);
  const allFailures = [
    ...failures,
    ...results.flatMap((result) => result.failures.map((failure) => `${result.work_key}:${failure}`)),
  ];
  const fullAcceptance = selected.length === 35;
  const green = allFailures.length === 0
    && createCount === selected.length
    && editCount === selected.length
    && replayCount === selected.length
    && (!fullAcceptance || (!dirty && head === options.expectedCommit));
  const artifact = {
    schema: "asphalt-35-native-expo-react-native-api34-matrix:v1",
    final_status: green
      ? fullAcceptance
        ? "GREEN_NATIVE_ANDROID_API34_ASPHALT_35X3"
        : "GREEN_NATIVE_ANDROID_API34_DIAGNOSTIC"
      : "RED_NATIVE_ANDROID_API34_ASPHALT_35X3",
    target: "native_expo_react_native",
    automation: "adb_uiautomator",
    package_name: PACKAGE_NAME,
    device_id: DEVICE_ID,
    api_level: device.output.trim(),
    android_chrome_results_not_counted_as_native: true,
    connect_over_cdp_used: false,
    native_expo_react_native_runtime_executed: results.length > 0,
    native_auth_boundary_bypassed: false,
    native_auth_login_attempted: authResult.attempted,
    native_auth_login_completed: authResult.ok,
    native_build_identity_matches_expected_commit: appBuildIdentityMatches,
    source_head: head,
    expected_commit: options.expectedCommit,
    committed_tree_hash: tree,
    subject_patch_sha256: subjectPatchHash,
    worktree_clean: !dirty,
    dirty_diagnostic_allowed: options.allowDirtyDiagnostic,
    diagnostic_work_key: options.diagnosticWorkKey,
    diagnostic_work_count: options.diagnosticWorkCount,
    source_status: status.split(/\r?\n/).filter(Boolean),
    package_probe: packageProbe.output.trim(),
    native_android_api34_create: `${createCount}/${selected.length}`,
    native_android_api34_edit: `${editCount}/${selected.length}`,
    native_android_api34_cold_replay_pdf: `${replayCount}/${selected.length}`,
    native_android_api34: `${createCount + editCount + replayCount}/${selected.length * 3}`,
    runtime_draft_ready_within_30s: `${runtimeBudgetCount}/${selected.length}`,
    first_persist_within_45s: `${runtimeBudgetCount}/${selected.length}`,
    duplicate_build_count: duplicateBuildCount,
    required_full_counts: {
      create: "35/35",
      edit: "35/35",
      cold_replay_pdf: "35/35",
      total: "105/105",
    },
    results,
    failures: allFailures,
    generated_at: new Date().toISOString(),
    fake_green_claimed: false,
  };
  const artifactPath = path.join(
    artifactDir,
    options.diagnosticWorkKey
      ? "diagnostic-result.json"
      : options.diagnosticWorkCount != null
        ? `diagnostic-${options.diagnosticWorkCount}-result.json`
        : "asphalt-35-native-api34-105-result.json",
  );
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  fs.writeFileSync(`${artifactPath}.sha256`, `${sha256(fs.readFileSync(artifactPath))}  ${path.basename(artifactPath)}\n`, "utf8");
  console.log(JSON.stringify({
    final_status: artifact.final_status,
    artifact_path: artifactPath,
    native_android_api34_create: artifact.native_android_api34_create,
    native_android_api34_edit: artifact.native_android_api34_edit,
    native_android_api34_cold_replay_pdf: artifact.native_android_api34_cold_replay_pdf,
    native_android_api34: artifact.native_android_api34,
    failures: allFailures,
  }, null, 2));
  if (!green) process.exitCode = 1;
}

void main();
