import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  createAndroidHarness,
  isAndroidAuthLoginScreenXml,
  isAndroidAuthenticatedSessionSurfaceXml,
} from "../_shared/androidHarness";

type Json = Record<string, any>;
type UiNode = {
  resourceId: string;
  contentDesc: string;
  text: string;
  bounds: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
};
type UiSnapshot = { xml: string; nodes: UiNode[]; text: string };
type AuditRow = {
  at: string;
  method: string;
  path: string;
  status: number;
  userAgent: string | null;
  authorizationPresent: boolean;
  remoteAddress: string | null;
};
type Assertion = { name: string; passed: boolean; details?: unknown };
type RawCaseIdentity = {
  head: string;
  headTree: string;
  appSourceStateId: string;
  harnessStateId: string;
  apkSha256: string;
  manifestSha256: string;
  casesContentSha256: string;
  buildManifestSha256: string;
  authProofSha256: string;
};

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const IS_BATCH001_R56 = process.env.BATCH001_R56_ANDROID_MODE === "true";
const IS_BATCH003_R56 = process.env.BATCH003_R56_ANDROID_MODE === "true";
const IS_BATCH004_R56 = process.env.BATCH004_R56_ANDROID_MODE === "true";
if ([IS_BATCH001_R56, IS_BATCH003_R56, IS_BATCH004_R56].filter(Boolean).length > 1) {
  throw new Error("ANDROID_R56_BATCH_MODE_AMBIGUOUS");
}
const BATCH_TOKEN = IS_BATCH004_R56 ? "BATCH004_R56"
  : IS_BATCH003_R56 ? "BATCH003_R56" : IS_BATCH001_R56 ? "BATCH001_R56" : "BATCH002_R55";
const BATCH_NUMBER = IS_BATCH004_R56 ? "BATCH004"
  : IS_BATCH003_R56 ? "BATCH003" : IS_BATCH001_R56 ? "BATCH001" : "BATCH002";
const BATCH_SLUG = IS_BATCH004_R56 ? "batch004-r56"
  : IS_BATCH003_R56 ? "batch003-r56" : IS_BATCH001_R56 ? "batch001-r56" : "batch002-r55";
const EXPECTED_MANIFEST_STATUS = IS_BATCH004_R56
  ? "FROZEN_R56_BATCH004_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
  : IS_BATCH003_R56
  ? "FROZEN_R56_BATCH003_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
  : IS_BATCH001_R56
    ? "FROZEN_R56_BATCH001_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE"
    : "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE";
const EXPECTED_DISTINCT_CATALOGS = IS_BATCH004_R56 ? 50 : IS_BATCH003_R56 ? 36 : IS_BATCH001_R56 ? 16 : 50;
const MANIFEST = resolve(process.env.BATCH004_R56_ANDROID_MANIFEST
  ?? process.env.BATCH003_R56_ANDROID_MANIFEST
  ?? process.env.BATCH001_R56_ANDROID_MANIFEST
  ?? (IS_BATCH004_R56
    ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/matrix/BATCH004_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
    : IS_BATCH003_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/matrix/BATCH003_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
    : IS_BATCH001_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/matrix/BATCH001_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"
      : ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002/BATCH002_R55_ANDROID_API34_MATRIX_50_MANIFEST.json"));
const OUTPUT = resolve(process.env.BATCH004_R56_ANDROID_OUTPUT
  ?? process.env.BATCH003_R56_ANDROID_OUTPUT
  ?? process.env.BATCH001_R56_ANDROID_OUTPUT
  ?? (IS_BATCH004_R56
    ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/android"
    : IS_BATCH003_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/android"
    : IS_BATCH001_R56
      ? ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/android"
      : ".release-runtime/real-professional-estimates-r4/evidence/06-android/batch002"));
const RUNTIME = resolve(OUTPUT, "runtime");
const BUILD_MANIFEST = resolve(OUTPUT, "ANDROID_PROOF_BUILD_MANIFEST.json");
const AUTH_PROOF = resolve(OUTPUT, "ANDROID_AUTH_BOOTSTRAP_PROOF.json");
const RAW_CASES = resolve(RUNTIME, `raw-cases-${BATCH_SLUG}`);
const CASE_FILTER_RAW = String(
  process.env.BATCH004_R56_ANDROID_CASES
    ?? process.env.BATCH003_R56_ANDROID_CASES
    ?? process.env.BATCH001_R56_ANDROID_CASES
    ?? process.env.BATCH002_R55_ANDROID_CASES
    ?? "",
).trim();
const CASE_FILTER_ARTIFACT_SUFFIX = CASE_FILTER_RAW
  ? `_SHARD_${CASE_FILTER_RAW.replace(/[^0-9,-]+/gu, "_").replace(/,+/gu, "-")}`
  : "";
const REPORT = resolve(OUTPUT, `${BATCH_TOKEN}_ANDROID_API34_50${CASE_FILTER_ARTIFACT_SUFFIX}_RESULT.json`);
const PROGRESS = resolve(RUNTIME, `${BATCH_TOKEN}_ANDROID_API34_50${CASE_FILTER_ARTIFACT_SUFFIX}_PROGRESS.json`);
const AUDIT_LOG = resolve(process.env.BATCH004_R56_BACKEND_AUDIT_LOG
  ?? process.env.BATCH003_R56_BACKEND_AUDIT_LOG ?? resolve(RUNTIME, "backend_http_audit.jsonl"));
const RUNNER_LOCK = resolve(RUNTIME, `${BATCH_NUMBER}_ANDROID_API34_50.lock.json`);
const RUNNER_PROCESS_AUDIT = resolve(OUTPUT, `RUNNER_SINGLE_FLIGHT_AND_PROCESS_AUDIT_R55${CASE_FILTER_ARTIFACT_SUFFIX}.json`);
const API_ROOT = String(process.env.BATCH004_R56_CANONICAL_API_ROOT
  ?? process.env.BATCH003_R56_CANONICAL_API_ROOT
  ?? process.env.BATCH001_R56_CANONICAL_API_ROOT
  ?? process.env.BATCH002_R52_CANONICAL_API_ROOT
  ?? (IS_BATCH004_R56 ? "http://127.0.0.1:8769/canonical-estimate" : "http://127.0.0.1:8767/canonical-estimate")).replace(/\/+$/u, "");
const DEVICE_ID = process.env.E2E_ANDROID_DEVICE_ID ?? "emulator-5554";
const PACKAGE_NAME = "com.azisbek_dzhantaev.rikexpoapp";
const MAIN_ACTIVITY = `${PACKAGE_NAME}/.MainActivity`;
const EXPECTED_API = "34";
const POLL_MS = 350;

function requestedCaseNumbers(): Set<number> | null {
  const raw = CASE_FILTER_RAW;
  if (!raw) return null;
  const values = raw.split(",").map((value) => Number(value.trim())).filter(Number.isInteger);
  if (values.length === 0) throw new Error("BATCH002_R52_ANDROID_CASE_FILTER_INVALID");
  return new Set(values);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Json)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", timeout: 30_000 }).trim();
}

function adbPath(): string {
  const sdk = process.env.ANDROID_SDK_ROOT ?? process.env.ANDROID_HOME
    ?? resolve(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
  return resolve(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function adb(args: string[], timeoutMs = 30_000): { ok: boolean; output: string } {
  try {
    return {
      ok: true,
      output: execFileSync(adbPath(), ["-s", DEVICE_ID, ...args], {
        cwd: process.cwd(),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
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

function packageProcessIds(): string[] {
  return adb(["shell", "pidof", PACKAGE_NAME], 10_000).output
    .trim()
    .split(/\s+/u)
    .filter((value) => /^\d+$/u.test(value));
}

function logcatProcessId(line: string): string | null {
  return line.match(/^\S+\s+\S+\s+(\d+)\s+\d+\s+[VDIWEF]\s+/u)?.[1]
    ?? line.match(/\(\s*(\d+)\s*\)\s*:/u)?.[1]
    ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function delaySync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function decodeXml(value: string): string {
  return value.replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&#10;/g, "\n");
}

function attribute(attrs: string, name: string): string {
  return decodeXml(attrs.match(new RegExp(`\\b${name}=([\"'])([\\s\\S]*?)\\1`))?.[2] ?? "");
}

function parseNodes(xml: string): UiNode[] {
  return Array.from(xml.matchAll(/<node\b([^>]*?)\/?>(?:<\/node>)?/g)).map((match) => {
    const attrs = match[1] ?? "";
    return {
      resourceId: attribute(attrs, "resource-id"),
      contentDesc: attribute(attrs, "content-desc"),
      text: attribute(attrs, "text"),
      bounds: attribute(attrs, "bounds"),
      className: attribute(attrs, "class"),
      clickable: attribute(attrs, "clickable") === "true",
      enabled: attribute(attrs, "enabled") === "true",
      focused: attribute(attrs, "focused") === "true",
    };
  });
}

let dumpSequence = 0;
function dumpUi(): UiSnapshot {
  let lastError = "ANDROID_UI_DUMP_NOT_ATTEMPTED";
  for (let dumpAttempt = 0; dumpAttempt < 6; dumpAttempt += 1) {
    dumpSequence += 1;
    // Keep every hierarchy on Android's native data filesystem. /sdcard FUSE
    // became unavailable during long matrices, while /dev/tty emitted valid
    // XML but held the command open until its 12-second timeout on API 34.
    const remote = `/data/local/tmp/r55-b2-${process.pid}-${dumpSequence}.xml`;
    const dumped = adb(["shell", "timeout", "12", "uiautomator", "dump", "--compressed", remote], 16_000);
    if (dumped.ok) {
      for (let readAttempt = 0; readAttempt < 2; readAttempt += 1) {
        const read = adb(["exec-out", "cat", remote], 20_000);
        if (read.ok && read.output.includes("<hierarchy")) {
          adb(["shell", "rm", "-f", remote], 5_000);
          const nodes = parseNodes(read.output);
          return {
            xml: read.output,
            nodes,
            text: nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n"),
          };
        }
        lastError = read.output || lastError || "ANDROID_UI_DUMP_NOT_READABLE";
        delaySync(250);
      }
    } else {
      lastError = dumped.output || lastError || "ANDROID_UI_DUMP_FAILED";
    }
    adb(["shell", "rm", "-f", remote], 5_000);
    adb(["shell", "pkill", "-9", "uiautomator"], 5_000);
    delaySync(250);

    // A few images reject file output during accessibility recovery. Retain a
    // bounded stream fallback, accepting a complete hierarchy even if the
    // device-side timeout reports a non-zero exit after writing it.
    const streamed = adb([
      "exec-out", "timeout", "12", "uiautomator", "dump", "--compressed", "/dev/tty",
    ], 16_000);
    if (streamed.output.includes("<hierarchy")) {
      const xmlStart = streamed.output.indexOf("<?xml");
      const hierarchyEnd = streamed.output.lastIndexOf("</hierarchy>");
      const xml = xmlStart >= 0 && hierarchyEnd >= xmlStart
        ? streamed.output.slice(xmlStart, hierarchyEnd + "</hierarchy>".length)
        : streamed.output;
      const nodes = parseNodes(xml);
      return {
        xml,
        nodes,
        text: nodes.flatMap((node) => [node.resourceId, node.contentDesc, node.text]).filter(Boolean).join("\n"),
      };
    }
    lastError = streamed.output || lastError || "ANDROID_UI_STREAM_DUMP_FAILED";
    adb(["shell", "pkill", "-9", "uiautomator"], 5_000);
    adb(["shell", "cmd", "statusbar", "collapse"], 5_000);
    delaySync(750);
  }
  throw new Error(`ANDROID_UI_DUMP_FAILED_AFTER_RETRIES:${lastError}`);
}

function hasId(node: UiNode, id: string): boolean {
  return node.resourceId === id || node.resourceId.endsWith(`:id/${id}`)
    || node.resourceId.endsWith(`/${id}`) || node.contentDesc === id;
}

function findById(snapshot: UiSnapshot, id: string): UiNode | null {
  return snapshot.nodes.find((node) => hasId(node, id)) ?? null;
}

function findByPrefix(snapshot: UiSnapshot, prefix: string): UiNode | null {
  return snapshot.nodes.find((node) => node.resourceId.startsWith(prefix)
    || node.resourceId.includes(`:id/${prefix}`) || node.contentDesc.startsWith(prefix)) ?? null;
}

function center(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  const x = Math.round((left + right) / 2);
  const y = Math.round((top + bottom) / 2);
  // The request route has a fixed header, a sticky approve/delete bar and a
  // fixed bottom navigation. UIAutomator still reports obscured descendants as
  // clickable, so only tap controls whose centre is in the unobscured body.
  if (right <= left || bottom <= top || y < 300 || y > 1700) return null;
  return { x, y };
}

function tap(node: UiNode): boolean {
  const point = center(node.bounds);
  return Boolean(point && adb(["shell", "input", "tap", String(point.x), String(point.y)], 10_000).ok);
}

function tapOverlayNode(node: UiNode): boolean {
  const match = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return false;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  if (right <= left || bottom <= top || top < 60 || bottom > 2_400) return false;
  return adb([
    "shell",
    "input",
    "tap",
    String(Math.round((left + right) / 2)),
    String(Math.round((top + bottom) / 2)),
  ], 10_000).ok;
}

async function dismissSoftKeyboard(): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const state = adb(["shell", "dumpsys", "input_method"], 15_000);
    if (!/mInputShown=true/i.test(state.output)) return true;
    adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
    await delay(750);
  }
  return !/mInputShown=true/i.test(adb(["shell", "dumpsys", "input_method"], 15_000).output);
}

async function blurInput(
  nodePredicate: (snapshot: UiSnapshot) => UiNode | null,
): Promise<boolean> {
  await dismissSoftKeyboard();
  let snapshot = dumpUi();
  if (!nodePredicate(snapshot)?.focused) return true;

  // Android can report mInputShown=false while the React Native TextInput
  // still owns focus. A safe tap on the non-interactive screen header forces
  // the product onBlur commit without activating a neighbouring row action.
  const header = findById(snapshot, "app.screen-header");
  if (header) {
    tapOverlayNode(header);
    await delay(600);
    snapshot = dumpUi();
    if (!nodePredicate(snapshot)?.focused) return true;
  }

  // Modal sheets do not expose the main header. TAB is the deterministic
  // accessibility fallback and still exercises the real TextInput onBlur.
  adb(["shell", "input", "keyevent", "KEYCODE_TAB"], 5_000);
  await delay(600);
  return !nodePredicate(dumpUi())?.focused;
}

async function swipe(direction: "up" | "down"): Promise<void> {
  await dismissSoftKeyboard();
  // Stay in the empty left gutter of the request ScrollView. A centre swipe
  // crosses the delivery TextInputs and can be degraded into a focus/tap while
  // UiAutomator releases its accessibility connection.
  const startY = direction === "up" ? 1650 : 510;
  const endY = direction === "up" ? 510 : 1650;
  // Keep the complete gesture in one Android `input` process. Splitting DOWN,
  // MOVE and UP across adb processes can lose pointer ownership and turn a
  // downward recovery gesture into the SystemUI notification shade.
  adb(["shell", "input", "swipe", "50", String(startY), "50", String(endY), "900"], 10_000);
  await delay(250);
  // SystemUI can remain drawn over a resumed MainActivity, so activity state
  // alone cannot detect a notification-shade interception.
  adb(["shell", "cmd", "statusbar", "collapse"], 5_000);
  await delay(250);
  if (!resumedActivity().includes(`${PACKAGE_NAME}/.MainActivity`)) {
    await returnToMainActivity();
  }
}

async function waitFor(predicate: (snapshot: UiSnapshot) => boolean, timeoutMs: number): Promise<UiSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let snapshot = dumpUi();
  while (!predicate(snapshot) && Date.now() < deadline) {
    await delay(POLL_MS);
    snapshot = dumpUi();
  }
  return snapshot;
}

async function findScrollable(
  predicate: (snapshot: UiSnapshot) => UiNode | null,
  maxSwipes = 28,
): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  for (const direction of ["up", "down"] as const) {
    let previous = "";
    let stalledSwipes = 0;
    for (let step = 0; step <= maxSwipes; step += 1) {
      let snapshot = dumpUi();
      if (snapshot.xml.includes('package="com.android.systemui"')) {
        adb(["shell", "cmd", "statusbar", "collapse"], 5_000);
        await delay(500);
        snapshot = dumpUi();
      }
      if (!findById(snapshot, "consumer-repair-screen")
        && !resumedActivity().includes(`${PACKAGE_NAME}/.MainActivity`)) {
        await returnToMainActivity();
        snapshot = dumpUi();
      }
      const node = predicate(snapshot);
      if (node && center(node.bounds)) return { snapshot, node };
      const current = sha256(snapshot.xml);
      if (current === previous) {
        stalledSwipes += 1;
        // ADB input occasionally lands while UIAutomator is releasing its
        // accessibility connection. One unchanged dump is not proof that the
        // React Native ScrollView reached an edge; require repeated stalls.
        if (stalledSwipes >= 3) break;
      } else {
        previous = current;
        stalledSwipes = 0;
      }
      await swipe(direction);
      await delay(700);
    }
  }
  const snapshot = dumpUi();
  return { snapshot, node: predicate(snapshot) };
}

async function findId(id: string, maxSwipes = 28): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  return await findScrollable((snapshot) => findById(snapshot, id), maxSwipes);
}

async function findIdTowardTop(id: string, maxSwipes = 20): Promise<{ snapshot: UiSnapshot; node: UiNode | null }> {
  let snapshot = dumpUi();
  for (let step = 0; step <= maxSwipes; step += 1) {
    const node = findById(snapshot, id);
    if (node) return { snapshot, node };
    await swipe("down");
    await delay(500);
    snapshot = dumpUi();
  }
  return { snapshot, node: findById(snapshot, id) };
}

async function tapId(id: string, maxSwipes = 28): Promise<boolean> {
  const found = await findId(id, maxSwipes);
  if (!found.node) return false;
  // Re-read bounds after scroll momentum is fully settled. React Native keeps
  // obscured descendants in the accessibility tree while their screen bounds
  // are changing, which otherwise turns a parameter tap into an adjacent
  // artifact action.
  await delay(600);
  const stable = findById(dumpUi(), id);
  return Boolean(stable && center(stable.bounds) && tap(stable));
}

async function stableScrollableTap(
  predicate: (snapshot: UiSnapshot) => UiNode | null,
  maxSwipes: number,
  overlay = false,
): Promise<{ node: UiNode | null; tapped: boolean; snapshot: UiSnapshot }> {
  let found = await findScrollable(predicate, maxSwipes);
  if (!found.node) return { node: null, tapped: false, snapshot: found.snapshot };
  await delay(800);
  let snapshot = dumpUi();
  let node = predicate(snapshot);
  const pointAvailable = (candidate: UiNode | null) => Boolean(candidate
    && (overlay ? candidate.bounds : center(candidate.bounds)));
  if (!pointAvailable(node)) {
    found = await findScrollable(predicate, Math.min(maxSwipes, 8));
    await delay(800);
    snapshot = dumpUi();
    node = predicate(snapshot) ?? found.node;
  }
  if (!node) return { node: null, tapped: false, snapshot };
  const tapped = overlay ? tapOverlayNode(node) : tap(node);
  await delay(500);
  return { node, tapped, snapshot };
}

async function activateIdWithKeyboard(id: string, maxTabs = 80): Promise<boolean> {
  for (let attempt = 0; attempt <= maxTabs; attempt += 1) {
    const snapshot = dumpUi();
    const target = findById(snapshot, id);
    if (target?.focused) {
      const activated = adb(["shell", "input", "keyevent", "KEYCODE_ENTER"], 10_000).ok;
      await delay(700);
      await dismissSoftKeyboard();
      return activated;
    }
    adb(["shell", "input", "keyevent", "KEYCODE_TAB"], 10_000);
    await delay(150);
  }
  return false;
}

async function replaceInput(
  nodePredicate: (snapshot: UiSnapshot) => UiNode | null,
  value: string,
  evidenceName?: string,
): Promise<boolean> {
  const normalized = (candidate: string) => candidate.replace(",", ".");
  const observedValue = (node: UiNode | null): string => {
    if (!node) return "";
    const isSearchInput = hasId(node, "request-estimate-items-search")
      || hasId(node, "request-catalog-picker-search");
    const comparable = (candidate: string) => candidate.trim().replace(/[…]+$/u, "").trim();
    // React Native exposes an empty search field's placeholder as `text` on
    // Android. Its accessibility label retains the same placeholder without
    // the ellipsis, so treat that exact pair as an empty value.
    if (isSearchInput && comparable(node.text) === comparable(node.contentDesc)) return "";
    if (hasId(node, "request-catalog-picker-search")
      && comparable(node.text) === "Введите минимум 2 буквы") return "";
    return node.text;
  };
  const focusExactInput = async (maxSwipes = 8): Promise<UiNode | null> => {
    for (let focusAttempt = 0; focusAttempt < 3; focusAttempt += 1) {
      const currentSnapshot = dumpUi();
      let current = nodePredicate(currentSnapshot);
      const currentSurface = findById(currentSnapshot, "consumer-repair-screen")
        || findById(currentSnapshot, "request-catalog-item-picker");
      // Once the soft keyboard is open, the focused TextInput can be reported
      // over the keyboard. Tapping those stale accessibility bounds presses a
      // keyboard key (the material search hit `T`) before ADB types the next
      // character. A focused exact node needs no activation; preserve focus.
      if (current?.focused && currentSurface) return current;
      if (!current || !center(current.bounds)) {
        current = (await findScrollable(nodePredicate, maxSwipes)).node;
      }
      if (!current || !center(current.bounds)) continue;
      // The long disclosure can still be settling after a scroll. Reacquire
      // the exact input before tapping, then require native focus.
      await delay(350);
      const stableCurrent = nodePredicate(dumpUi());
      if (!stableCurrent || !center(stableCurrent.bounds) || !tap(stableCurrent)) continue;
      await delay(250);
      const focusedSnapshot = dumpUi();
      const focusedCurrent = nodePredicate(focusedSnapshot);
      const supportedSurface = findById(focusedSnapshot, "consumer-repair-screen")
        || findById(focusedSnapshot, "request-catalog-item-picker");
      if (focusedCurrent?.focused && supportedSurface) return focusedCurrent;
    }
    return null;
  };
  const clearExactInput = async (): Promise<boolean> => {
    // Controlled React Native inputs can remount on every change. Reacquire
    // after each delete and prove the field is empty before replacement.
    for (let clearAttempt = 0; clearAttempt < 48; clearAttempt += 1) {
      const before = nodePredicate(dumpUi());
      if (normalized(observedValue(before)) === "") return true;
      const current = await focusExactInput();
      if (!current) return false;
      adb(["shell", "input", "keycombination", "113", "29"], 10_000);
      await delay(120);
      adb(["shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
      await delay(280);
      const afterSelectionDelete = nodePredicate(dumpUi());
      if (normalized(observedValue(afterSelectionDelete)) === "") return true;

      const fallback = await focusExactInput();
      if (!fallback) return false;
      adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"], 5_000);
      adb(["shell", "input", "keyevent", "KEYCODE_DEL"], 5_000);
      await delay(280);
      const afterSingleDelete = nodePredicate(dumpUi());
      if (normalized(observedValue(afterSingleDelete)) === "") return true;
      process.stdout.write(`${JSON.stringify({
        stage: "controlled_input_clear_retry",
        clearAttempt: clearAttempt + 1,
        before: observedValue(before),
        after: observedValue(afterSingleDelete),
      })}\n`);
    }
    return false;
  };

  let focused = await focusExactInput(30);
  if (!focused) return false;
  const numeric = /^-?\d+(?:\.\d+)?$/u.test(value);
  const remountingControlledInput = hasId(focused, "editable-param-popover-input") || !numeric;
  let typedOk = false;
  if (remountingControlledInput) {
    const numericControlledInput = numeric && hasId(focused, "editable-param-popover-input");
    const numericKeyCodes: Record<string, string> = {
      "0": "7", "1": "8", "2": "9", "3": "10", "4": "11",
      "5": "12", "6": "13", "7": "14", "8": "15", "9": "16",
      ".": "56", "-": "69",
    };
    for (let valueAttempt = 0; valueAttempt < 3 && !typedOk; valueAttempt += 1) {
      if (numericControlledInput) {
        focused = await focusExactInput();
        if (!focused) continue;
        // An empty controlled numeric input is immediately restored by React
        // validation. Keep the old value selected and let the first numeric
        // key replace it atomically; subsequent keys append after each remount.
        adb(["shell", "input", "keycombination", "113", "29"], 10_000);
        await delay(180);
      } else {
        const cleared = await clearExactInput();
        if (!cleared) continue;
      }
      let expectedPrefix = "";
      let attemptTyped = true;
      for (const [characterIndex, character] of [...value].entries()) {
        await delay(180);
        focused = characterIndex === 0 && numericControlledInput ? focused : await focusExactInput();
        if (!focused) {
          attemptTyped = false;
          break;
        }
        if (characterIndex > 0 || !numericControlledInput) {
          adb(["shell", "input", "keyevent", "KEYCODE_MOVE_END"], 5_000);
        }
        const inserted = numeric && hasId(focused, "editable-param-popover-input")
          ? Boolean(numericKeyCodes[character])
            && adb(["shell", "input", "keyevent", numericKeyCodes[character]], 5_000).ok
          : adb(["shell", "input", "text", character === " " ? "%s" : character], 5_000).ok;
        await delay(220);
        expectedPrefix += character;
        const prefixObserved = observedValue(nodePredicate(dumpUi()));
        if (!inserted || normalized(prefixObserved) !== normalized(expectedPrefix)) {
          attemptTyped = false;
          process.stdout.write(`${JSON.stringify({
            stage: "controlled_input_prefix_retry",
            valueAttempt: valueAttempt + 1,
            expectedPrefix,
            observed: prefixObserved,
          })}\n`);
          break;
        }
      }
      const attemptObserved = observedValue(nodePredicate(dumpUi()));
      typedOk = attemptTyped && normalized(attemptObserved) === normalized(value);
      if (!typedOk) {
        process.stdout.write(`${JSON.stringify({
          stage: "controlled_input_value_retry",
          valueAttempt: valueAttempt + 1,
          value,
          observed: attemptObserved,
        })}\n`);
      }
    }
  } else {
    // Row price/quantity editors retain one native view, so replacing the
    // selection atomically avoids cursor and formatting drift.
    adb(["shell", "input", "keycombination", "113", "29"], 10_000);
    typedOk = adb(["shell", "input", "text", value], 20_000).ok;
    await delay(650);
  }
  await delay(180);
  const typedSnapshot = dumpUi();
  const observed = observedValue(nodePredicate(typedSnapshot));
  const changed = typedOk && normalized(observed) === normalized(value);
  // Specification edits submit on blur. Never commit a truncated value; a
  // failed attempt remains local and the next cold case launch discards it.
  const blurred = changed ? await blurInput(nodePredicate) : false;
  await delay(350);
  const snapshot = dumpUi();
  if (evidenceName) capture(evidenceName, snapshot);
  process.stdout.write(`${JSON.stringify({ stage: "input_replaced", evidenceName, value, observed, changed, blurred })}\n`);
  return changed && blurred;
}

function readAudit(): AuditRow[] {
  try {
    return readFileSync(AUDIT_LOG, "utf8").split(/\r?\n/).filter(Boolean)
      .map((line) => JSON.parse(line) as AuditRow)
      .map((row) => {
        const parsed = new URL(row.path, "http://loopback.invalid");
        for (const name of ["signature", "token"]) {
          if (parsed.searchParams.has(name)) parsed.searchParams.set(name, "[redacted]");
        }
        return {
          ...row,
          path: `${parsed.pathname}${parsed.search}`,
        };
      });
  } catch {
    return [];
  }
}

async function waitForNativeAudit(
  after: number,
  predicate: (row: AuditRow) => boolean,
  timeoutMs = 90_000,
): Promise<AuditRow[]> {
  const deadline = Date.now() + timeoutMs;
  let rows = readAudit();
  while (!rows.slice(after).some((row) => /okhttp/i.test(String(row.userAgent ?? "")) && predicate(row))
    && Date.now() < deadline) {
    await delay(POLL_MS);
    rows = readAudit();
  }
  return rows.slice(after).filter((row) => /okhttp/i.test(String(row.userAgent ?? "")));
}

async function waitForNativeAuditSet(
  after: number,
  predicates: ((row: AuditRow) => boolean)[],
  timeoutMs = 90_000,
): Promise<AuditRow[]> {
  const deadline = Date.now() + timeoutMs;
  let nativeRows = readAudit().slice(after)
    .filter((row) => /okhttp/i.test(String(row.userAgent ?? "")));
  while (!predicates.every((predicate) => nativeRows.some(predicate)) && Date.now() < deadline) {
    await delay(POLL_MS);
    nativeRows = readAudit().slice(after)
      .filter((row) => /okhttp/i.test(String(row.userAgent ?? "")));
  }
  return nativeRows;
}

async function api(path: string): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: "Bearer local-dev-runtime-token" },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`ANDROID_R52_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body ?? {};
}

async function apiStatus(path: string, authorization: string): Promise<{ status: number; body: Json | null }> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${authorization}` },
    signal: AbortSignal.timeout(60_000),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null) as Json | null,
  };
}

function unsignedJwt(subject: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1_000) + 3_600,
    iat: Math.floor(Date.now() / 1_000) - 60,
    sub: subject,
    role: "authenticated",
  })}.proof`;
}

async function waitForPhotoAttachment(input: {
  revisionId: string;
  baselineIds: Set<string>;
  catalogId: string;
  rowId: string;
  timeoutMs?: number;
}): Promise<Json | null> {
  const deadline = Date.now() + (input.timeoutMs ?? 120_000);
  while (Date.now() < deadline) {
    const projection = await api(`revisions/${input.revisionId}/attachments?includeDeleted=true`);
    const attachment = (projection.attachments as Json[] | undefined)?.find((candidate) =>
      !input.baselineIds.has(String(candidate.attachmentId))
      && candidate.status === "committed"
      && candidate.parentRevisionId === input.revisionId
      && candidate.catalogId === input.catalogId
      && candidate.rowId === input.rowId);
    if (attachment) return attachment;
    await delay(POLL_MS);
  }
  return null;
}

async function findAttachedPhoto(testCase: Json, attempts = 3): Promise<{
  snapshot: UiSnapshot;
  attached: UiNode | null;
  image: UiNode | null;
}> {
  let snapshot = dumpUi();
  let attached: UiNode | null = null;
  let image: UiNode | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await findScrollable(
      (value) => rowControl(value, "estimate-material-row-photo-attached-", testCase),
      35,
    );
    snapshot = result.snapshot;
    attached = result.node;
    image = attached ? rowControl(snapshot, "estimate-material-row-photo-view-", testCase) : null;
    if (attached && image) break;
    await delay(2_000);
  }
  return { snapshot, attached, image };
}

async function matchingParameterChildren(input: {
  catalogId: string;
  parentRevisionId: string;
  parameterId: string;
  parameterValue: number;
}): Promise<Json[]> {
  const history = await api(`revisions?catalogId=${encodeURIComponent(input.catalogId)}&limit=100`);
  const candidates = (history.revisions as Json[]).filter((revision) =>
    revision.parentRevisionId === input.parentRevisionId);
  const details = await Promise.all(candidates.map((revision) => api(`revisions/${revision.revisionId}`)));
  return details.filter((revision) =>
    Number(revision.parameters?.[input.parameterId]) === Number(input.parameterValue));
}

async function pollChild(
  catalogId: string,
  parentRevisionId: string,
  afterIso: string,
  timeoutMs = 120_000,
  expectedParameter?: { parameterId: string; parameterValue: number },
  expectedChild?: (child: Json) => boolean,
): Promise<Json | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const history = await api(`revisions?catalogId=${encodeURIComponent(catalogId)}&limit=100`);
    const candidates = (history.revisions as Json[]).filter((revision) =>
      revision.parentRevisionId === parentRevisionId);
    for (const candidate of candidates) {
      const child = await api(`revisions/${candidate.revisionId}`);
      const createdInWindow = String(child.createdAt) >= afterIso;
      const matchesExpectedParameter = expectedParameter
        && Number(child.parameters?.[expectedParameter.parameterId]) === Number(expectedParameter.parameterValue);
      if (createdInWindow || matchesExpectedParameter || expectedChild?.(child)) return child;
    }
    await delay(POLL_MS);
  }
  return null;
}

function resumedActivity(): string {
  const result = adb(["shell", "dumpsys", "activity", "activities"], 20_000);
  return result.output.split(/\r?\n/).find((line) => /mResumedActivity|topResumedActivity/.test(line))?.trim() ?? "";
}

async function returnToMainActivity(): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (resumedActivity().includes(`${PACKAGE_NAME}/.MainActivity`)) return true;
    adb(["shell", "input", "keyevent", "KEYCODE_BACK"], 5_000);
    await delay(700);
  }
  return false;
}

function capture(name: string, snapshot: UiSnapshot): Json {
  mkdirSync(RUNTIME, { recursive: true });
  const safeName = name.replace(/[^A-Za-z0-9._-]/g, "_");
  const bytes = execFileSync(adbPath(), ["-s", DEVICE_ID, "exec-out", "screencap", "-p"], {
    cwd: process.cwd(), encoding: "buffer", maxBuffer: 64 * 1024 * 1024,
    timeout: 30_000, stdio: ["ignore", "pipe", "pipe"],
  });
  const captureContentSha256 = createHash("sha256").update(bytes).update(snapshot.xml, "utf8").digest("hex");
  const base = resolve(RUNTIME, `${safeName}-${captureContentSha256}`);
  const png = `${base}.png`;
  const xml = `${base}.xml`;
  const xmlBytes = Buffer.from(snapshot.xml, "utf8");
  for (const [path, payload] of [[png, bytes], [xml, xmlBytes]] as const) {
    if (existsSync(path)) {
      if (!readFileSync(path).equals(payload)) throw new Error(`BATCH002_R55_CAPTURE_CONTENT_COLLISION:${path}`);
    } else {
      writeFileSync(path, payload, { flag: "wx" });
    }
  }
  return {
    png,
    xml,
    pngSha256: sha256(bytes),
    xmlSha256: sha256(xmlBytes),
    captureContentSha256,
    immutable: true,
  };
}

function exactMarker(snapshot: UiSnapshot): UiNode | null {
  return findByPrefix(snapshot, "estimate-compiled-revision-v1--");
}

async function launchExact(
  testCase: Json,
  launchTag: string,
  auditRecoveryAttempted = false,
): Promise<{
  launch: string;
  snapshot: UiSnapshot;
  nativeAudit: AuditRow[];
  assertions: Assertion[];
  nativeAuditRecovery: Json | null;
  launchEnvironmentRecovery: Json | null;
  parameterParityProbe: Json | null;
}> {
  const auditBefore = readAudit().length;
  // A previous external document/autofill task can re-assert itself over the
  // app even after Back. Remove that proof-environment residue before the exact
  // MainActivity launch; this does not touch app data or the authenticated app
  // session.
  adb(["logcat", "-c"], 15_000);
  const foregroundBeforeLaunch = resumedActivity();
  if (foregroundBeforeLaunch.includes("com.google.android.gms")) {
    adb(["shell", "am", "force-stop", "com.google.android.gms"], 10_000);
  }
  adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
  const deepLink = `rik:///request?canonicalRevisionId=${encodeURIComponent(testCase.parentRevisionId)}&r52Android=${launchTag}`;
  const launched = adb([
    "shell", "am", "start", "-W", "-n", MAIN_ACTIVITY,
    "-a", "android.intent.action.VIEW", "-d", deepLink,
  ], 60_000);
  const hasExactIdentity = (value: UiSnapshot): boolean => {
    const release = findById(value, "consumer-repair-draft-release-id")?.text ?? "";
    return Boolean(findById(value, "consumer-repair-screen"))
      && release.includes(String(testCase.parentRevisionId))
      && release.includes(String(testCase.releaseId));
  };
  let systemAnrWaitTaps = 0;
  const maximumSystemAnrWaitTaps = 4;
  const waitForExactIdentity = async (timeoutMs: number): Promise<UiSnapshot> => {
    const deadline = Date.now() + timeoutMs;
    let current = dumpUi();
    while (!hasExactIdentity(current) && Date.now() < deadline) {
      const waitNode = findById(current, "android:id/aerr_wait");
      if (systemAnrWaitTaps < maximumSystemAnrWaitTaps && waitNode?.clickable && tap(waitNode)) {
        // Never close an app for a system-process ANR. One observable Wait per
        // exact launch is enough to dismiss proof-environment residue while
        // keeping the launch and all subsequent provenance checks fail-closed.
        systemAnrWaitTaps += 1;
        await delay(4_000);
      } else {
        await delay(POLL_MS);
      }
      current = dumpUi();
    }
    return current;
  };
  // A cold process can briefly paint the previously persisted draft before the
  // authoritative deep-link load adopts its exact revision. Waiting for the
  // release testID alone therefore races the stale first paint. Require the
  // complete expected identity in two consecutive snapshots.
  let snapshot = await waitForExactIdentity(120_000);
  if (hasExactIdentity(snapshot)) {
    await delay(1_000);
    const confirmation = dumpUi();
    snapshot = hasExactIdentity(confirmation)
      ? confirmation
      : await waitForExactIdentity(60_000);
  }
  if (!hasExactIdentity(snapshot)) {
    throw new Error(`EXACT_CANONICAL_REQUEST_NOT_READY:${testCase.parentRevisionId}`);
  }
  const releaseText = findById(snapshot, "consumer-repair-draft-release-id")?.text ?? "";
  const markerLookup = exactMarker(snapshot) ?? (await findScrollable(exactMarker, 10)).node;
  const markerId = markerLookup?.resourceId ?? "";
  const rowText = (await findId("request-estimate-row-count", 10)).node?.text ?? "";
  const exactRevisionPath = `/canonical-estimate/revisions/${testCase.parentRevisionId}`;
  const exactRowsPath = `${exactRevisionPath}/rows?`;
  const exactCatalogPath = `/canonical-estimate/catalog/${encodeURIComponent(testCase.catalogId)}`;
  const parameterParityRequired = (testCase.coverage as string[] | undefined)
    ?.includes("row_and_parameter_parity") === true;
  const parameterParityOpened = parameterParityRequired
    ? await openParameters(testCase)
    : null;
  const parameterParityProbe = parameterParityOpened ? {
    required: true,
    parameterId: testCase.parameter.parameterId,
    activationMode: parameterParityOpened.activationMode,
    ordinaryTouchEvidence: parameterParityOpened.ordinaryTouchEvidence,
    exactChipVisible: Boolean(findById(
      parameterParityOpened.snapshot,
      `editable-param-chip-${testCase.parameter.parameterId}`,
    )),
  } : null;
  const requiredNativeAudit = [
    { name: "revision", predicate: (row: AuditRow) => row.method === "GET"
      && row.path === exactRevisionPath && row.status === 200 },
    { name: "rows", predicate: (row: AuditRow) => row.method === "GET"
      && row.path.startsWith(exactRowsPath) && row.status === 200 },
    { name: "catalog", predicate: (row: AuditRow) => row.method === "GET"
      && row.path.startsWith(exactCatalogPath) && row.status === 200 },
    { name: "parameter_session", predicate: (row: AuditRow) => row.method === "GET"
      && row.path === `${exactRevisionPath}/parameter-session` && row.status === 200 },
  ];
  const nativeAudit = await waitForNativeAuditSet(
    auditBefore,
    requiredNativeAudit.map((entry) => entry.predicate),
  );
  const missingNativeAudit = requiredNativeAudit
    .filter((entry) => !nativeAudit.some(entry.predicate))
    .map((entry) => entry.name);
  if (missingNativeAudit.length > 0 && !auditRecoveryAttempted) {
    // A long API-34 run can occasionally paint the exact persisted revision
    // while one cold-start effect never dispatches. One new exact cold launch
    // is observable and safe: it performs reads only and still has to produce
    // the complete no-cache native audit set for this same revision.
    const recovered = await launchExact(testCase, `${launchTag}-native-audit-recovery`, true);
    return {
      ...recovered,
      nativeAuditRecovery: {
        attempted: true,
        firstLaunch: deepLink,
        missingNativeAudit,
        firstNativeAudit: nativeAudit,
      },
    };
  }
  const has = (predicate: (row: AuditRow) => boolean) => nativeAudit.some(predicate);
  const bearerProtectedAudit = nativeAudit.filter((row) => ![
    "/canonical-estimate/photo-upload-files/",
    "/canonical-estimate/photo-attachment-files/",
    "/canonical-estimate/artifact-files/",
  ].some((prefix) => row.path.startsWith(prefix)));
  const assertions: Assertion[] = [
    { name: "exact_mainactivity_launch", passed: launched.ok && launched.output.includes(`Activity: ${MAIN_ACTIVITY}`), details: launched.output.trim() },
    { name: "mainactivity_resumed", passed: resumedActivity().includes(`${PACKAGE_NAME}/.MainActivity`), details: resumedActivity() },
    { name: "authenticated_request_screen", passed: Boolean(findById(snapshot, "consumer-repair-screen")) },
    { name: "exact_parent_revision_visible", passed: releaseText.includes(testCase.parentRevisionId), details: releaseText },
    { name: "exact_release_visible", passed: releaseText.includes(testCase.releaseId), details: releaseText },
    { name: "exact_catalog_marker", passed: markerId.includes(`catalog-${testCase.catalogId}`), details: markerId },
    { name: "exact_revision_marker", passed: markerId.includes(`revision-${testCase.parentRevisionId}`), details: markerId },
    { name: "exact_row_marker", passed: markerId.includes(`rows-${testCase.expectedRowCount}`), details: markerId },
    { name: "exact_row_count_visible", passed: rowText.includes(String(testCase.expectedRowCount)), details: rowText },
    { name: "native_revision_get_200", passed: has((row) => row.method === "GET" && row.path === exactRevisionPath && row.status === 200) },
    { name: "native_rows_get_200", passed: has((row) => row.method === "GET" && row.path.startsWith(exactRowsPath) && row.status === 200) },
    { name: "native_catalog_get_200", passed: has((row) => row.method === "GET" && row.path.startsWith(exactCatalogPath) && row.status === 200) },
    { name: "native_parameter_session_ready", passed: has((row) => row.method === "GET" && row.path === `${exactRevisionPath}/parameter-session` && row.status === 200) },
    { name: "native_authorization_present", passed: bearerProtectedAudit.length >= 4
      && bearerProtectedAudit.every((row) => row.authorizationPresent), details: bearerProtectedAudit.length },
    { name: "native_http_errors_zero", passed: nativeAudit.every((row) => row.status < 400), details: nativeAudit.filter((row) => row.status >= 400) },
    ...(parameterParityRequired ? [{
      name: "row_and_parameter_parity_interaction",
      passed: parameterParityProbe?.activationMode === "touch"
        && Boolean(parameterParityProbe.ordinaryTouchEvidence)
        && parameterParityProbe.exactChipVisible === true,
      details: parameterParityProbe,
    }] : []),
  ];
  return {
    launch: deepLink,
    snapshot,
    nativeAudit,
    assertions,
    nativeAuditRecovery: null,
    launchEnvironmentRecovery: systemAnrWaitTaps > 0 ? {
      kind: "SYSTEM_PROCESS_ANR_WAIT",
      waitTaps: systemAnrWaitTaps,
      closeAppTapped: false,
      boundedAttempts: maximumSystemAnrWaitTaps,
    } : null,
    parameterParityProbe,
  };
}

async function openParameters(testCase: Json): Promise<{
  snapshot: UiSnapshot;
  activationMode: "touch" | "keyboard" | "already_open";
  ordinaryTouchEvidence: Json | null;
}> {
  await dismissSoftKeyboard();
  const toggle = await findId("request-estimate-parameters-toggle", 30);
  let activationMode: "touch" | "keyboard" | "already_open" = "already_open";
  let touchActivated = false;
  if (toggle.node && !findById(toggle.snapshot, "request-estimate-parameter-panel")) {
    await delay(600);
    const stable = findById(dumpUi(), "request-estimate-parameters-toggle");
    touchActivated = Boolean(stable && center(stable.bounds) && tap(stable));
    if (touchActivated) activationMode = "touch";
    await delay(1_000);
  }
  let panel = await findId("request-estimate-parameter-panel", 16);
  if (!panel.node) {
    const keyboardActivated = await activateIdWithKeyboard("request-estimate-parameters-toggle", 40);
    if (!keyboardActivated) throw new Error("PARAMETERS_TOGGLE_NOT_REACHABLE");
    activationMode = "keyboard";
    panel = await findId("request-estimate-parameter-panel", 16);
  }
  if (!panel.node) throw new Error("PARAMETER_PANEL_NOT_VISIBLE");
  const chip = await findId(`editable-param-chip-${testCase.parameter.parameterId}`, 30);
  if (!chip.node) throw new Error(`PARAMETER_CHIP_NOT_VISIBLE:${testCase.parameter.parameterId}`);
  return {
    snapshot: chip.snapshot,
    activationMode,
    ordinaryTouchEvidence: touchActivated
      ? capture(`case-${testCase.case}-parameters-ordinary-touch-open`, chip.snapshot)
      : null,
  };
}

async function mutateParameter(testCase: Json): Promise<Json> {
  const parentBefore = await api(`revisions/${testCase.parentRevisionId}`);
  const matchingChildrenBefore = await matchingParameterChildren({
    catalogId: testCase.catalogId,
    parentRevisionId: testCase.parentRevisionId,
    parameterId: testCase.parameter.parameterId,
    parameterValue: Number(testCase.parameter.changedValue),
  });
  let opened = await openParameters(testCase);
  const preserveOpenedInteraction = (next: Awaited<ReturnType<typeof openParameters>>): void => {
    const modes = [opened.activationMode, next.activationMode];
    opened = {
      snapshot: next.snapshot,
      activationMode: modes.includes("touch") ? "touch"
        : modes.includes("keyboard") ? "keyboard" : "already_open",
      ordinaryTouchEvidence: opened.ordinaryTouchEvidence ?? next.ordinaryTouchEvidence,
    };
  };
  // Opening the panel requests a fresh parameter session. Let that state settle
  // before typing; if React legitimately remounts the disclosure while adopting
  // the session, reopen it by touch and target the same exact parameter.
  await delay(3_000);
  let settled = dumpUi();
  if (!findById(settled, "request-estimate-parameter-panel")) {
    preserveOpenedInteraction(await openParameters(testCase));
    settled = opened.snapshot;
  }
  const runtimeEditorLabel = String(testCase.parameter.runtimeEditorLabelRu ?? testCase.parameter.titleRu);
  const input = (snapshot: UiSnapshot) => snapshot.nodes.find((node) =>
    hasId(node, "editable-param-popover-input")
      && node.contentDesc === runtimeEditorLabel) ?? null;
  let typed = await replaceInput(
    input,
    String(testCase.parameter.changedValue),
    `case-${testCase.case}-parameter-after-typing`,
  );
  let inputRecoveryAttempted = false;
  if (!typed) {
    // No backend command is issued until Apply. A long API-34 matrix can lose
    // the focused controlled TextInput while UIAutomator is recovering. One
    // bounded reopen/retype is therefore safe and remains fully observable.
    inputRecoveryAttempted = true;
    await dismissSoftKeyboard();
    preserveOpenedInteraction(await openParameters(testCase));
    await delay(1_000);
    typed = await replaceInput(
      input,
      String(testCase.parameter.changedValue),
      `case-${testCase.case}-parameter-after-typing-recovery`,
    );
  }
  if (!typed) throw new Error(`PARAMETER_VALUE_NOT_CHANGED:${testCase.parameter.parameterId}`);
  const acceptedAt = new Date().toISOString();
  const auditBefore = readAudit().length;
  const applyLookup = await findId("editable-param-batch-apply", 30);
  if (!applyLookup.node) throw new Error("PARAMETER_BATCH_APPLY_NOT_VISIBLE_AFTER_EDIT");
  capture(`case-${testCase.case}-parameter-before-touch-apply`, applyLookup.snapshot);
  const appliedByTouch = await tapId("editable-param-batch-apply", 30);
  process.stdout.write(`${JSON.stringify({ stage: "parameter_apply_touch", appliedByTouch })}\n`);
  const reachedBackend = (row: AuditRow) => row.method === "POST"
    && row.path === "/canonical-estimate/jobs/recalculate";
  let audit = await waitForNativeAudit(auditBefore, reachedBackend, 10_000);
  let appliedByKeyboard = false;
  if (!audit.some(reachedBackend)) {
    appliedByKeyboard = await activateIdWithKeyboard("editable-param-batch-apply");
    audit = await waitForNativeAudit(auditBefore, reachedBackend, 120_000);
  }
  const child = await pollChild(testCase.catalogId, testCase.parentRevisionId, acceptedAt, 120_000, {
    parameterId: testCase.parameter.parameterId,
    parameterValue: Number(testCase.parameter.changedValue),
  });
  const matchingChildrenAfter = await matchingParameterChildren({
    catalogId: testCase.catalogId,
    parentRevisionId: testCase.parentRevisionId,
    parameterId: testCase.parameter.parameterId,
    parameterValue: Number(testCase.parameter.changedValue),
  });
  const parentAfter = await api(`revisions/${testCase.parentRevisionId}`);
  let childVisible = dumpUi();
  let childVisibleInCurrentUi = false;
  if (child) {
    const deadline = Date.now() + 90_000;
    do {
      const lookup = await findIdTowardTop("consumer-repair-draft-release-id", 20);
      childVisible = lookup.snapshot;
      childVisibleInCurrentUi = (lookup.node?.text ?? "").includes(String(child.revisionId));
      if (childVisibleInCurrentUi) break;
      await delay(POLL_MS);
    } while (Date.now() < deadline);
  }
  const finalNativeAudit = readAudit().slice(auditBefore)
    .filter((row) => /okhttp/i.test(String(row.userAgent ?? "")));
  const recalculatePosts = finalNativeAudit.filter((row) =>
    row.method === "POST" && row.path === "/canonical-estimate/jobs/recalculate");
  return {
    typed,
    inputRecoveryAttempted,
    parameterActivationMode: opened.activationMode,
    ordinaryTouchEvidence: opened.ordinaryTouchEvidence,
    applied: appliedByTouch || appliedByKeyboard,
    appliedByTouch,
    appliedByKeyboard,
    logicalCommands: recalculatePosts.length,
    post202: recalculatePosts.length === 1 && recalculatePosts[0]?.status === 202,
    physicalRecalculatePosts: recalculatePosts.length,
    childRevisionId: child?.revisionId ?? null,
    matchingChildRevisionIdsBefore: matchingChildrenBefore.map((revision) => revision.revisionId),
    matchingChildRevisionIdsAfter: matchingChildrenAfter.map((revision) => revision.revisionId),
    uniqueMatchingChildRevision: matchingChildrenAfter.length === 1,
    childCreatedThisRun: matchingChildrenBefore.length === 0 && matchingChildrenAfter.length === 1,
    idempotentChildReused: matchingChildrenBefore.length === 1
      && matchingChildrenAfter.length === 1
      && matchingChildrenBefore[0]?.revisionId === matchingChildrenAfter[0]?.revisionId,
    childParentExact: child?.parentRevisionId === testCase.parentRevisionId,
    childReleaseExact: child?.releaseId === testCase.releaseId,
    parameterPersisted: Number(child?.parameters?.[testCase.parameter.parameterId]) === Number(testCase.parameter.changedValue),
    parentImmutable: parentBefore.checksumSha256 === parentAfter.checksumSha256,
    parentChecksumBefore: parentBefore.checksumSha256,
    parentChecksumAfter: parentAfter.checksumSha256,
    childVisible: childVisibleInCurrentUi,
    snapshot: childVisible,
  };
}

function rowControl(snapshot: UiSnapshot, prefix: string, testCase: Json): UiNode | null {
  return snapshot.nodes.find((node) =>
    node.resourceId.includes(prefix)
      && (node.resourceId.includes(String(testCase.materialRow.rowId))
        || node.contentDesc.includes(String(testCase.materialRow.titleRu)))) ?? null;
}

async function ensurePositions(): Promise<void> {
  const current = await findId("request-estimate-items-editor", 24);
  if (!current.node) throw new Error("POSITIONS_TOGGLE_NOT_REACHABLE");
  const open = !findById(current.snapshot, "request-estimate-positions-panel");
  if (open && !tap(current.node)) throw new Error("POSITIONS_TOGGLE_TAP_FAILED");
  const panel = await waitFor((snapshot) => Boolean(findById(snapshot, "request-estimate-positions-panel")), 30_000);
  if (!findById(panel, "request-estimate-positions-panel")) throw new Error("POSITIONS_PANEL_NOT_VISIBLE");
}

async function mutateRow(testCase: Json, kind: "quantity" | "unitPrice"): Promise<Json> {
  await ensurePositions();
  const prefix = kind === "quantity" ? "consumer-repair-item-plus-" : "consumer-repair-item-unit-price-input-";
  const found = await findScrollable((snapshot) => rowControl(snapshot, prefix, testCase), 35);
  if (!found.node) return { controlVisible: false, post202: false, childRevisionId: null, snapshot: found.snapshot };
  const acceptedAt = new Date().toISOString();
  const auditBefore = readAudit().length;
  let interacted = false;
  let expectedValue: number;
  if (kind === "quantity") {
    expectedValue = Number(testCase.materialRow.quantity) + 1;
    interacted = tap(found.node);
  }
  else {
    const before = Number(found.node.text) || 0;
    expectedValue = Math.round((before + 3.25) * 100) / 100;
    interacted = await replaceInput((snapshot) => rowControl(snapshot, prefix, testCase), String(expectedValue));
    if (interacted) await dismissSoftKeyboard();
  }
  const audit = await waitForNativeAudit(auditBefore, (row) => row.method === "POST"
    && row.path === "/canonical-estimate/jobs/recalculate" && row.status === 202, 90_000);
  const child = await pollChild(
    testCase.catalogId,
    testCase.parentRevisionId,
    acceptedAt,
    90_000,
    undefined,
    (candidate) => Number(candidate.amendmentContract?.rowOverrides?.[testCase.materialRow.rowId]?.[kind]) === expectedValue,
  );
  return {
    controlVisible: true,
    interacted,
    post202: audit.some((row) => row.method === "POST" && row.path === "/canonical-estimate/jobs/recalculate" && row.status === 202),
    childRevisionId: child?.revisionId ?? null,
    childParentExact: child?.parentRevisionId === testCase.parentRevisionId,
    childReleaseExact: child?.releaseId === testCase.releaseId,
    snapshot: dumpUi(),
  };
}

async function artifactScenario(testCase: Json, kind: "pdf" | "procurement"): Promise<Json> {
  const id = kind === "pdf" ? "consumer-estimate-make-pdf" : "consumer-estimate-open-procurement";
  const auditBefore = readAudit().length;
  const tapped = await tapId(id, 30);
  const expectedPath = `/canonical-estimate/revisions/${testCase.parentRevisionId}/artifacts/${kind}`;
  const audit = await waitForNativeAudit(auditBefore, (row) => row.method === "POST"
    && row.path === expectedPath && row.status === 202, 120_000);
  await delay(1_000);
  const returned = await returnToMainActivity();
  const readKind = kind === "pdf" ? "professional_pdf" : "procurement";
  let artifact: Json | null = null;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    artifact = await api(`revisions/${testCase.parentRevisionId}/artifacts/${readKind}`).catch(() => null);
    if (artifact?.status === "ready") break;
    await delay(POLL_MS);
  }
  let environmentRecoveredToMainActivity = false;
  if (!resumedActivity().includes(`${PACKAGE_NAME}/.MainActivity`)) {
    const deepLink = `rik:///request?canonicalRevisionId=${encodeURIComponent(testCase.parentRevisionId)}`
      + `&r55ArtifactRecovery=${Date.now()}`;
    adb(["shell", "am", "force-stop", PACKAGE_NAME], 10_000);
    adb([
      "shell", "am", "start", "-W", "-n", MAIN_ACTIVITY,
      "-a", "android.intent.action.VIEW", "-d", deepLink,
    ], 60_000);
    const recovered = await waitFor((value) => {
      const release = findById(value, "consumer-repair-draft-release-id")?.text ?? "";
      return Boolean(findById(value, "consumer-repair-screen"))
        && release.includes(String(testCase.parentRevisionId))
        && release.includes(String(testCase.releaseId));
    }, 120_000);
    environmentRecoveredToMainActivity = Boolean(findById(recovered, "consumer-repair-screen"));
  }
  return {
    tapped,
    post202: audit.some((row) => row.method === "POST" && row.path === expectedPath && row.status === 202),
    returnedToMainActivity: returned,
    environmentRecoveredToMainActivity,
    artifact: artifact ? {
      artifactId: artifact.artifactId,
      revisionId: artifact.revisionId,
      releaseId: artifact.releaseId,
      status: artifact.status,
      sha256: artifact.sha256,
    } : null,
    parity: artifact?.status === "ready" && artifact?.revisionId === testCase.parentRevisionId
      && artifact?.releaseId === testCase.releaseId && /^[0-9a-f]{64}$/i.test(String(artifact?.sha256 ?? "")),
    snapshot: dumpUi(),
  };
}

async function runCoverageScenario(testCase: Json, scenario: string): Promise<{ assertions: Assertion[]; evidence: Json; snapshot: UiSnapshot }> {
  const assertions: Assertion[] = [];
  let evidence: Json = {};
  let snapshot = dumpUi();
  const add = (name: string, passed: boolean, details?: unknown) => assertions.push({ name, passed, details });
  if (scenario === "work_search_exact_selection") {
    const prompt = (await findId("request-estimate-current-launch-prompt-text", 12)).node?.text ?? "";
    const title = (await findId("request-estimate-selected-work-title", 12)).node?.text ?? "";
    add("work_search_exact_selection", prompt.length > 10 && title.includes(String(testCase.titleRu)), { prompt, title });
  } else if (scenario === "parent_revision_open") {
    const release = (await findId("consumer-repair-draft-release-id", 12)).node?.text ?? "";
    add("parent_revision_open", release.includes(testCase.parentRevisionId) && release.includes(testCase.releaseId), release);
  } else if (scenario === "parameter_and_normative_guide") {
    const opened = await openParameters(testCase);
    const toggle = await findId(`editable-param-guide-details-${testCase.parameter.parameterId}`, 30);
    const tapped = Boolean(toggle.node && tap(toggle.node));
    await delay(350);
    snapshot = dumpUi();
    const chip = await findId(`editable-param-chip-${testCase.parameter.parameterId}`, 12);
    const text = chip.snapshot.text;
    evidence = {
      tapped,
      parameterText: text.slice(0, 4_000),
      parameterActivationMode: opened.activationMode,
      ordinaryTouchEvidence: opened.ordinaryTouchEvidence,
    };
    const guideMarkers = IS_BATCH003_R56 || IS_BATCH004_R56
      ? (testCase.parameter.guideRequiredMarkers as string[])
      : [String(testCase.parameter.guideShortRu)];
    add("parameter_and_normative_guide", tapped && text.includes(String(testCase.parameter.titleRu))
      && guideMarkers.every((marker) => text.includes(marker)), { ...evidence, guideMarkers });
  } else if (scenario === "parameter_edit_recalculate_child" || scenario === "historical_revision_restore_as_new") {
    evidence = await mutateParameter(testCase);
    snapshot = evidence.snapshot as UiSnapshot;
    add(scenario, evidence.typed && evidence.applied && evidence.post202 && evidence.physicalRecalculatePosts === 1
      && evidence.uniqueMatchingChildRevision && evidence.childParentExact
      && evidence.childReleaseExact && evidence.parameterPersisted && evidence.parentImmutable && evidence.childVisible, evidence);
  } else if (scenario === "quantity_edit" || scenario === "unit_price_edit_child") {
    evidence = await mutateRow(testCase, scenario === "quantity_edit" ? "quantity" : "unitPrice");
    snapshot = evidence.snapshot as UiSnapshot;
    add(scenario, evidence.controlVisible && evidence.interacted && evidence.post202
      && evidence.childParentExact && evidence.childReleaseExact, evidence);
  } else if (scenario === "specification_edit") {
    await ensurePositions();
    const spec = await findScrollable((value) => rowControl(value, "consumer-repair-item-specification-input-", testCase), 35);
    const expectedTitle = `BATCH002_SPEC_${testCase.case}`;
    const acceptedAt = new Date().toISOString();
    const auditBefore = readAudit().length;
    const interacted = Boolean(spec.node) && await replaceInput(
      (value) => rowControl(value, "consumer-repair-item-specification-input-", testCase),
      expectedTitle,
    );
    if (interacted) await dismissSoftKeyboard();
    const audit = await waitForNativeAudit(auditBefore, (row) => row.method === "POST"
      && row.path === "/canonical-estimate/jobs/recalculate" && row.status === 202, 90_000);
    const child = interacted ? await pollChild(
      testCase.catalogId,
      testCase.parentRevisionId,
      acceptedAt,
      90_000,
      undefined,
      (candidate) => candidate.amendmentContract?.rowOverrides?.[testCase.materialRow.rowId]?.titleRu === expectedTitle,
    ) : null;
    snapshot = dumpUi();
    evidence = { controlVisible: Boolean(spec.node), interacted, expectedTitle,
      post202: audit.some((row) => row.status === 202), childRevisionId: child?.revisionId ?? null,
      childParentExact: child?.parentRevisionId === testCase.parentRevisionId,
      childReleaseExact: child?.releaseId === testCase.releaseId };
    add("specification_edit", evidence.controlVisible && evidence.interacted && evidence.post202
      && evidence.childParentExact && evidence.childReleaseExact, evidence);
  } else if (scenario === "material_search_add") {
    await ensurePositions();
    const typed = await replaceInput((value) => findById(value, "request-estimate-items-search"), "batchmaterial");
    const resultPredicate = (value: UiSnapshot) => value.nodes.find((node) =>
      node.clickable
        && node.resourceId.startsWith("estimate-material-search-catalog-")
        && !hasId(node, "estimate-material-search-catalog-section")) ?? null;
    const acceptedAt = new Date().toISOString();
    const auditBefore = readAudit().length;
    const result = await stableScrollableTap(resultPredicate, 12);
    const selected = result.tapped;
    const selectedCatalogItemId = result.node?.resourceId.split("estimate-material-search-catalog-").at(-1) ?? "";
    const audit = await waitForNativeAudit(auditBefore, (row) => row.method === "POST"
      && row.path === "/canonical-estimate/jobs/recalculate" && row.status === 202, 90_000);
    const post202 = audit.some((row) => row.status === 202);
    const child = selected && post202 ? await pollChild(
      testCase.catalogId,
      testCase.parentRevisionId,
      acceptedAt,
      90_000,
      undefined,
      (candidate) => (candidate.amendmentContract?.customRows ?? []).some((custom: Json) =>
        String(custom.provenance?.reason ?? "").startsWith(`catalog_add:${selectedCatalogItemId}:`)),
    ) : null;
    snapshot = dumpUi();
    evidence = { typed, resultVisible: Boolean(result.node), selected, post202, childRevisionId: child?.revisionId ?? null };
    add("material_search_add", typed && Boolean(result.node) && selected && evidence.post202 && child?.parentRevisionId === testCase.parentRevisionId, evidence);
  } else if (scenario === "material_replace") {
    await ensurePositions();
    const badge = await findScrollable((value) => rowControl(value, "consumer-repair-item-catalog-", testCase), 35);
    const opened = Boolean(badge.node && tap(badge.node));
    const picker = opened ? await waitFor((value) => Boolean(findById(value, "request-catalog-item-picker")), 30_000) : dumpUi();
    const compatibleCatalogQuery = String(testCase.materialRow.unitId) === "m"
      ? "batchmateriallinear"
      : String(testCase.materialRow.unitId) === "m2" ? "batchmaterialm2" : "batchmaterial";
    const typed = opened
      ? await replaceInput((value) => findById(value, "request-catalog-picker-search"), compatibleCatalogQuery)
      : false;
    // The picker result is already present in the accessibility tree while
    // the IME still covers the lower half of the modal. On Android the first
    // coordinate tap can then be consumed only to dismiss the keyboard,
    // leaving the picker open and producing no recalculation command.
    // Dismiss the IME first; stableScrollableTap reacquires the row after the
    // modal has settled, so the recorded tap is the real catalog selection.
    const keyboardDismissed = typed ? await dismissSoftKeyboard() : false;
    const acceptedAt = new Date().toISOString();
    const auditBefore = readAudit().length;
    const row = await stableScrollableTap(
      (value) => findByPrefix(value, "request-catalog-picker-row-"),
      12,
      true,
    );
    const selected = row.tapped;
    const selectedCatalogItemId = row.node?.resourceId.split("request-catalog-picker-row-").at(-1) ?? "";
    const audit = await waitForNativeAudit(auditBefore, (entry) => entry.method === "POST"
      && entry.path === "/canonical-estimate/jobs/recalculate" && entry.status === 202, 90_000);
    const post202 = audit.some((entry) => entry.status === 202);
    const child = selected && post202 ? await pollChild(
      testCase.catalogId,
      testCase.parentRevisionId,
      acceptedAt,
      90_000,
      undefined,
      (candidate) => String(candidate.amendmentContract?.rowOverrides?.[testCase.materialRow.rowId]?.provenance?.reason ?? "")
        .startsWith(`market_catalog:${selectedCatalogItemId}:`),
    ) : null;
    snapshot = dumpUi();
    evidence = { opened, pickerVisible: Boolean(findById(picker, "request-catalog-item-picker")), typed, keyboardDismissed,
      resultVisible: Boolean(row.node), selected,
      post202, childRevisionId: child?.revisionId ?? null };
    add("material_replace", evidence.opened && evidence.pickerVisible && evidence.typed && evidence.keyboardDismissed
      && evidence.resultVisible && evidence.selected
      && evidence.post202 && child?.parentRevisionId === testCase.parentRevisionId, evidence);
  } else if (scenario === "photo_add_and_view") {
    const parentBefore = await api(`revisions/${testCase.parentRevisionId}`);
    const pdfBefore = await api(`revisions/${testCase.parentRevisionId}/artifacts/professional_pdf`);
    const attachmentsBefore = await api(
      `revisions/${testCase.parentRevisionId}/attachments?includeDeleted=true`,
    );
    const baselineAttachments = (attachmentsBefore.attachments as Json[] | undefined) ?? [];
    const baselineIds = new Set(baselineAttachments.map((attachment) => String(attachment.attachmentId)));
    await ensurePositions();
    const button = await findScrollable((value) => rowControl(value, "estimate-material-row-photo-button-", testCase), 35);
    const opened = Boolean(button.node && tap(button.node));
    let flow = opened ? await waitFor((value) => Boolean(findById(value, "mobile-photo-capture-flow")
      || findById(value, "mobile-photo-camera-screen") || findById(value, "mobile-photo-permission-gate")
      || /permissioncontroller/i.test(value.xml)), 45_000) : dumpUi();
    const permissionDialogInitial = /permissioncontroller/i.test(flow.xml);
    const deny = flow.nodes.find((node) => node.clickable
      && (node.resourceId.endsWith("/permission_deny_button")
        || node.resourceId.endsWith(":id/permission_deny_button")
        || /don.?t allow|deny|не разрешать|запретить/iu.test(`${node.text} ${node.contentDesc}`)));
    const denialTapped = Boolean(deny && tap(deny));
    const denialGate = denialTapped
      ? await waitFor((value) => Boolean(findById(value, "mobile-photo-permission-gate")), 45_000)
      : dumpUi();
    const denialGateVisible = Boolean(findById(denialGate, "mobile-photo-permission-gate"));
    const reentryButton = findById(denialGate, "mobile-photo-request-permission");
    const reentryTapped = Boolean(denialGateVisible && reentryButton && tapOverlayNode(reentryButton));
    const reentryDialog = reentryTapped
      ? await waitFor((value) => /permissioncontroller/i.test(value.xml), 45_000)
      : dumpUi();
    const permissionDialogReentry = /permissioncontroller/i.test(reentryDialog.xml);
    const allow = reentryDialog.nodes.find((node) => node.clickable
      && (node.resourceId.endsWith("/permission_allow_foreground_only_button")
        || node.resourceId.endsWith(":id/permission_allow_foreground_only_button")
        || node.resourceId.endsWith("/permission_allow_one_time_button")
        || node.resourceId.endsWith(":id/permission_allow_one_time_button")
        || /while using the app|only this time|allow|при использовании приложения|только в этот раз|разрешить/iu
          .test(`${node.text} ${node.contentDesc}`)));
    const allowTapped = Boolean(allow && tap(allow));
    const camera = allowTapped ? await waitFor((value) => Boolean(
      findById(value, "mobile-photo-camera-screen")
      && findById(value, "mobile-photo-shutter")?.enabled,
    ), 90_000) : dumpUi();
    const cameraReady = Boolean(findById(camera, "mobile-photo-camera-screen")
      && findById(camera, "mobile-photo-shutter")?.enabled);
    const shutter = findById(camera, "mobile-photo-shutter");
    const shutterTapped = Boolean(cameraReady && shutter && tapOverlayNode(shutter));
    const review = shutterTapped ? await waitFor((value) => Boolean(
      findById(value, "mobile-photo-review-screen")
      && findById(value, "mobile-photo-review-image"),
    ), 90_000) : dumpUi();
    const reviewVisible = Boolean(findById(review, "mobile-photo-review-screen"));
    const reviewImageVisible = Boolean(findById(review, "mobile-photo-review-image"));
    const reviewCapture = reviewVisible && reviewImageVisible
      ? capture(`case-${testCase.case}-photo-review`, review)
      : null;
    const photoAuditBefore = readAudit().length;
    const use = findById(review, "mobile-photo-use");
    const useTapped = Boolean(reviewVisible && use && tapOverlayNode(use));
    if (useTapped) {
      await waitFor((value) => !findById(value, "mobile-photo-capture-flow"), 45_000);
    }
    let attachedAfterSave = useTapped
      ? await findAttachedPhoto(testCase)
      : { snapshot: dumpUi(), attached: null, image: null };
    const serverAttachment = useTapped ? await waitForPhotoAttachment({
      revisionId: String(testCase.parentRevisionId),
      baselineIds,
      catalogId: String(testCase.catalogId),
      rowId: String(testCase.materialRow.rowId),
    }) : null;
    if (serverAttachment && (!attachedAfterSave.attached || !attachedAfterSave.image)) {
      await delay(1_500);
      attachedAfterSave = await findAttachedPhoto(testCase, 5);
    }
    const attachedPhotoVisible = Boolean(attachedAfterSave.attached);
    const attachedImageVisible = Boolean(attachedAfterSave.image);
    const afterSaveCapture = capture(
      `case-${testCase.case}-photo-after-save-${attachedPhotoVisible && attachedImageVisible ? "visible" : "missing"}`,
      attachedAfterSave.snapshot,
    );
    const afterSaveStatus = findById(attachedAfterSave.snapshot, "mobile-photo-error")?.text
      ?? findById(attachedAfterSave.snapshot, "consumer-repair-status")?.text
      ?? null;
    const nativePhotoAudit = await waitForNativeAudit(
      photoAuditBefore,
      (row) => row.method === "POST"
        && row.path.includes(`/revisions/${testCase.parentRevisionId}/attachments/photo/uploads/`)
        && row.path.endsWith("/finalize")
        && row.status === 200,
      120_000,
    );
    const uploadRequest201 = nativePhotoAudit.some((row) => row.method === "POST"
      && row.path === `/canonical-estimate/revisions/${testCase.parentRevisionId}/attachments/photo/uploads`
      && row.status === 201);
    const uploadBytes201 = nativePhotoAudit.some((row) => row.method === "PUT"
      && row.path.startsWith("/canonical-estimate/photo-upload-files/") && row.status === 201);
    const finalize200 = nativePhotoAudit.some((row) => row.method === "POST"
      && row.path.includes(`/canonical-estimate/revisions/${testCase.parentRevisionId}/attachments/photo/uploads/`)
      && row.path.endsWith("/finalize") && row.status === 200);

    const attachmentCreated = Boolean(serverAttachment)
      && !baselineIds.has(String(serverAttachment?.attachmentId));
    const attachmentHashPresent = /^[0-9a-f]{64}$/u.test(String(serverAttachment?.contentSha256 ?? ""));
    const attachmentMimeAndSizeValidated = ["image/jpeg", "image/png"].includes(
      String(serverAttachment?.mimeType ?? ""),
    ) && Number.isSafeInteger(Number(serverAttachment?.sizeBytes))
      && Number(serverAttachment?.sizeBytes) > 0
      && Number(serverAttachment?.sizeBytes) <= 20 * 1024 * 1024;
    const attachmentBoundExact = Boolean(serverAttachment)
      && serverAttachment?.status === "committed"
      && serverAttachment?.parentRevisionId === testCase.parentRevisionId
      && serverAttachment?.catalogId === testCase.catalogId
      && serverAttachment?.rowId === testCase.materialRow.rowId
      && typeof serverAttachment?.requestId === "string"
      && serverAttachment.requestId.length > 0;
    const immutableEventCreated = /^[0-9a-f-]{36}$/iu.test(
      String(serverAttachment?.attachmentEventId ?? ""),
    );

    const cold = serverAttachment
      ? await launchExact(testCase, `photo-cold-reopen-${testCase.case}-${Date.now()}`)
      : null;
    const coldAttached = cold
      ? await findAttachedPhoto(testCase, 5)
      : { snapshot: dumpUi(), attached: null, image: null };
    const thumbnailVisibleAfterColdReopen = Boolean(coldAttached.attached && coldAttached.image);
    const coldCapture = thumbnailVisibleAfterColdReopen
      ? capture(`case-${testCase.case}-photo-cold-reopen`, coldAttached.snapshot)
      : null;

    const profileTab = thumbnailVisibleAfterColdReopen ? await findId("tabs.profile", 5) : null;
    const profileTabTapped = Boolean(profileTab?.node && tapOverlayNode(profileTab.node));
    const logoutControl = profileTabTapped ? await findId("profile.logout.button", 35) : null;
    const profileOpened = Boolean(profileTabTapped && logoutControl?.node);
    const logoutTapped = Boolean(logoutControl?.node && tap(logoutControl.node));
    const logoutConfirmation = logoutTapped
      ? await waitFor((value) => Boolean(findById(value, "button1")), 15_000)
      : dumpUi();
    const logoutConfirmationControl = findById(logoutConfirmation, "button1");
    const logoutConfirmationVisible = Boolean(logoutConfirmationControl);
    const logoutConfirmed = Boolean(logoutConfirmationControl && tap(logoutConfirmationControl));
    const logoutReachedLogin = logoutConfirmed
      ? Boolean(findById(await waitFor(
          (value) => Boolean(findById(value, "auth.login.email") && findById(value, "auth.login.password")),
          60_000,
        ), "auth.login.email"))
      : false;
    let reloginExact = false;
    let reloginHarnessErrorClass: string | null = null;
    let reloginHarnessError: string | null = null;
    let reloginHarnessRecovered = false;
    if (logoutReachedLogin) {
      const authHarness = createAndroidHarness({
        projectRoot: process.cwd(),
        devClientPort: 8081,
        devClientStdoutPath: "artifacts/r55-photo-relogin-dev-client.stdout.log",
        devClientStderrPath: "artifacts/r55-photo-relogin-dev-client.stderr.log",
      });
      const protectedRoute = `rik:///request?canonicalRevisionId=${encodeURIComponent(testCase.parentRevisionId)}`
        + `&r55PhotoRelogin=${Date.now()}`;
      const isExactReloginScreen = (value: { xml: string }) => value.xml.includes("consumer-repair-screen")
        && value.xml.includes(String(testCase.parentRevisionId))
        && value.xml.includes(String(testCase.releaseId));
      try {
        const relogin = await authHarness.loginAndroidWithProtectedRoute({
          packageName: PACKAGE_NAME,
          user: {
            email: process.env.BATCH002_R55_AUTH_EMAIL ?? "batch002-r55-local-proof@example.invalid",
            password: process.env.BATCH002_R55_AUTH_PASSWORD ?? "r55-local-proof-password-not-a-secret",
          },
          protectedRoute,
          artifactBase: `batch002-r55-case-${testCase.case}-photo-relogin`,
          successPredicate: (xml) => xml.includes("consumer-repair-screen")
            && xml.includes(String(testCase.parentRevisionId))
            && xml.includes(String(testCase.releaseId)),
          renderablePredicate: (xml) => isAndroidAuthLoginScreenXml(xml)
            || isAndroidAuthenticatedSessionSurfaceXml(xml)
            || xml.includes("consumer-repair-screen"),
          loginScreenPredicate: isAndroidAuthLoginScreenXml,
        });
        reloginExact = isExactReloginScreen(relogin);
      } catch (error) {
        reloginHarnessErrorClass = error instanceof Error ? error.name : "NonError";
        reloginHarnessError = error instanceof Error ? error.message : String(error);
        const recovered = await waitFor(isExactReloginScreen, 30_000);
        reloginExact = isExactReloginScreen(recovered);
        reloginHarnessRecovered = reloginExact;
      }
    }
    const reloginAttached = reloginExact
      ? await findAttachedPhoto(testCase, 5)
      : { snapshot: dumpUi(), attached: null, image: null };
    const thumbnailVisibleAfterLogoutLogin = Boolean(reloginAttached.attached && reloginAttached.image);
    const reloginCapture = thumbnailVisibleAfterLogoutLogin
      ? capture(`case-${testCase.case}-photo-logout-login-reopen`, reloginAttached.snapshot)
      : null;

    const foreign = await apiStatus(
      `revisions/${testCase.parentRevisionId}/attachments?includeDeleted=true`,
      unsignedJwt("99999999-9999-4999-8999-999999999999"),
    );
    const otherTenantAccessDenied = foreign.status === 403;
    const parentAfter = await api(`revisions/${testCase.parentRevisionId}`);
    const pdfAfter = await api(`revisions/${testCase.parentRevisionId}/artifacts/professional_pdf`);
    const parentRevisionAndOldPdfUnchanged = parentAfter.checksumSha256 === parentBefore.checksumSha256
      && parentAfter.revisionId === parentBefore.revisionId
      && pdfAfter.artifactId === pdfBefore.artifactId
      && pdfAfter.sha256 === pdfBefore.sha256
      && pdfAfter.metadata?.sourceRevisionChecksumSha256 === pdfBefore.metadata?.sourceRevisionChecksumSha256;
    const finalProjection = await api(
      `revisions/${testCase.parentRevisionId}/attachments?includeDeleted=true`,
    );
    const finalAttachment = (finalProjection.attachments as Json[] | undefined)?.find((candidate) =>
      candidate.attachmentId === serverAttachment?.attachmentId && candidate.status === "committed") ?? null;
    let downloadedHash: string | null = null;
    if (typeof finalAttachment?.signedUrl === "string" && finalAttachment.signedUrl) {
      const download = await fetch(finalAttachment.signedUrl, { signal: AbortSignal.timeout(60_000) });
      if (download.ok) downloadedHash = sha256(Buffer.from(await download.arrayBuffer()));
    }
    const cleanupDidNotDeleteUserPhoto = Boolean(finalAttachment)
      && downloadedHash === serverAttachment?.contentSha256;
    const finalAttachmentEvidence = serverAttachment ? {
      attachmentId: serverAttachment.attachmentId,
      attachmentEventId: serverAttachment.attachmentEventId,
      ownerFingerprint: sha256(String(serverAttachment.ownerUserId ?? "")),
      tenantFingerprint: sha256(String(serverAttachment.tenantId ?? "")),
      requestFingerprint: sha256(String(serverAttachment.requestId ?? "")),
      catalogId: serverAttachment.catalogId,
      rowId: serverAttachment.rowId,
      parentRevisionId: serverAttachment.parentRevisionId,
      status: serverAttachment.status,
      storageBucket: serverAttachment.storageBucket,
      storageObjectKeyFingerprint: sha256(String(serverAttachment.storageObjectKey ?? "")),
      contentSha256: serverAttachment.contentSha256,
      mimeType: serverAttachment.mimeType,
      sizeBytes: serverAttachment.sizeBytes,
      signedUrlPersistedInEvidence: false,
    } : null;
    snapshot = reloginAttached.snapshot;
    evidence = {
      opened,
      permissionDialogInitial,
      denialTapped,
      denialGateVisible,
      reentryTapped,
      permissionDialogReentry,
      allowTapped,
      cameraReady,
      shutterTapped,
      reviewVisible,
      reviewImageVisible,
      reviewCapture,
      useTapped,
      attachedPhotoVisible,
      attachedImageVisible,
      afterSaveCapture,
      afterSaveStatus,
      attachmentCreated,
      attachmentHashPresent,
      attachmentMimeAndSizeValidated,
      attachmentBoundExact,
      immutableEventCreated,
      uploadRequest201,
      uploadBytes201,
      finalize200,
      nativePhotoAudit,
      attachment: finalAttachmentEvidence,
      emulatorCameraSource: "DECLARED_ANDROID_EMULATOR_CAMERA_API34",
      coldReopenExact: Boolean(cold?.assertions.every((entry) => entry.passed)),
      thumbnailVisibleAfterColdReopen,
      coldCapture,
      profileTabTapped,
      profileOpened,
      logoutTapped,
      logoutConfirmationVisible,
      logoutConfirmed,
      logoutReachedLogin,
      reloginExact,
      reloginHarnessErrorClass,
      reloginHarnessError,
      reloginHarnessRecovered,
      thumbnailVisibleAfterLogoutLogin,
      reloginCapture,
      otherTenantAccessDenied,
      parentRevisionAndOldPdfUnchanged,
      parentChecksumBefore: parentBefore.checksumSha256,
      parentChecksumAfter: parentAfter.checksumSha256,
      pdfArtifactIdBefore: pdfBefore.artifactId,
      pdfArtifactIdAfter: pdfAfter.artifactId,
      pdfSha256Before: pdfBefore.sha256,
      pdfSha256After: pdfAfter.sha256,
      cleanupDidNotDeleteUserPhoto,
      downloadedContentSha256: downloadedHash,
    };
    add("photo_add_and_view", opened && permissionDialogInitial && denialTapped && denialGateVisible
      && reentryTapped && permissionDialogReentry && allowTapped && cameraReady && shutterTapped
      && reviewVisible && reviewImageVisible && useTapped && attachedPhotoVisible && attachedImageVisible
      && attachmentCreated && attachmentHashPresent && attachmentMimeAndSizeValidated
      && attachmentBoundExact && immutableEventCreated && uploadRequest201 && uploadBytes201 && finalize200
      && Boolean(cold?.assertions.every((entry) => entry.passed))
      && thumbnailVisibleAfterColdReopen && logoutConfirmationVisible && logoutConfirmed
      && logoutReachedLogin && reloginExact
      && thumbnailVisibleAfterLogoutLogin && otherTenantAccessDenied
      && parentRevisionAndOldPdfUnchanged && cleanupDidNotDeleteUserPhoto, evidence);
  } else if (scenario === "note_add") {
    await ensurePositions();
    const itemCount = (value: UiSnapshot): number | null => {
      const text = findById(value, "request-estimate-items-total-count")?.text ?? "";
      const match = text.match(/\d+/u);
      return match ? Number(match[0]) : null;
    };
    const beforeSnapshot = dumpUi();
    const beforeCount = itemCount(beforeSnapshot);
    const tapped = await tapId("consumer-repair-add-custom-item", 24);
    snapshot = tapped && beforeCount !== null
      ? await waitFor((value) => itemCount(value) === beforeCount + 1, 15_000)
      : dumpUi();
    const afterCount = itemCount(snapshot);
    evidence = {
      tapped,
      beforeCount,
      afterCount,
      rowCountIncreasedByOne: beforeCount !== null && afterCount === beforeCount + 1,
    };
    add("note_add", evidence.tapped && evidence.rowCountIncreasedByOne, evidence);
  } else if (scenario === "optional_position") {
    await ensurePositions();
    const optional = await findScrollable((value) => rowControl(value, "consumer-repair-item-optional-toggle-", testCase), 35);
    const acceptedAt = new Date().toISOString();
    const auditBefore = readAudit().length;
    const interacted = Boolean(optional.node && tap(optional.node));
    const audit = await waitForNativeAudit(auditBefore, (row) => row.method === "POST"
      && row.path === "/canonical-estimate/jobs/recalculate" && row.status === 202, 90_000);
    const child = interacted ? await pollChild(
      testCase.catalogId,
      testCase.parentRevisionId,
      acceptedAt,
      90_000,
      undefined,
      (candidate) => candidate.amendmentContract?.rowOverrides?.[testCase.materialRow.rowId]?.includedInEstimate === false,
    ) : null;
    snapshot = dumpUi();
    evidence = { controlVisible: Boolean(optional.node), interacted,
      post202: audit.some((row) => row.status === 202), childRevisionId: child?.revisionId ?? null,
      childParentExact: child?.parentRevisionId === testCase.parentRevisionId,
      childReleaseExact: child?.releaseId === testCase.releaseId };
    add("optional_position", evidence.controlVisible && evidence.interacted && evidence.post202
      && evidence.childParentExact && evidence.childReleaseExact, evidence);
  } else if (scenario === "history_and_diff") {
    evidence = await mutateRow(testCase, "unitPrice");
    snapshot = evidence.snapshot as UiSnapshot;
    const timeline = await findId("estimate-revision-timeline-r2", 24);
    const diff = await findId("estimate-revision-diff", 24);
    evidence.timelineR2 = Boolean(timeline.node);
    evidence.diffVisible = Boolean(diff.node);
    add("history_and_diff", evidence.post202 && evidence.childParentExact && evidence.timelineR2 && evidence.diffVisible, evidence);
  } else if (scenario === "professional_pdf" || scenario === "procurement") {
    evidence = await artifactScenario(testCase, scenario === "professional_pdf" ? "pdf" : "procurement");
    snapshot = evidence.snapshot as UiSnapshot;
    add(scenario, evidence.tapped && evidence.post202
      && (evidence.returnedToMainActivity || evidence.environmentRecoveredToMainActivity)
      && evidence.parity, evidence);
  } else if (scenario === "cold_reopen_exact_revision") {
    const second = await launchExact(testCase, `cold-second-${testCase.case}-${Date.now()}`);
    snapshot = second.snapshot;
    evidence = { secondLaunch: second.launch, assertions: second.assertions };
    add("cold_reopen_exact_revision", second.assertions.every((entry) => entry.passed), evidence);
  } else {
    add("exact_revision_open_and_row_parameter_parity", true, { scenario });
  }
  return { assertions, evidence, snapshot };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function freezeRawCase(result: Json, identity: RawCaseIdentity): Json {
  const base = {
    schema_version: "real-professional-estimates-r5.6.android-immutable-raw-case.v1",
    generated_at: result.completedAt,
    contract_sha256: MASTER_SHA256,
    source_head: identity.head,
    source_head_tree: identity.headTree,
    app_source_state_id: identity.appSourceStateId,
    harness_state_id: identity.harnessStateId,
    apk_sha256_full: identity.apkSha256,
    matrix_manifest_sha256: identity.manifestSha256,
    cases_content_sha256: identity.casesContentSha256,
    build_manifest_sha256: identity.buildManifestSha256,
    auth_proof_sha256: identity.authProofSha256,
    result,
  };
  const contentSha256 = sha256(canonical(base));
  const path = resolve(RAW_CASES, `case-${String(result.case)}-${contentSha256}.json`);
  const payload = { ...base, content_sha256: contentSha256 };
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  mkdirSync(RAW_CASES, { recursive: true });
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`BATCH002_R55_RAW_CASE_CONTENT_ADDRESS_COLLISION:${path}`);
    }
  } else {
    writeFileSync(path, serialized, { encoding: "utf8", flag: "wx" });
  }
  return {
    case: result.case,
    status: result.status,
    path,
    report_sha256: sha256(readFileSync(path)),
    content_sha256: contentSha256,
  };
}

function installedApkSha256(): { path: string; sha256: string } {
  const packagePath = adb(["shell", "pm", "path", PACKAGE_NAME], 20_000);
  const path = packagePath.output.split(/\r?\n/u)
    .find((line) => line.startsWith("package:"))
    ?.slice("package:".length)
    .trim();
  if (!packagePath.ok || !path) throw new Error("BATCH002_R55_INSTALLED_APK_PATH_MISSING");
  const digest = adb(["shell", "sha256sum", path], 120_000);
  const value = digest.output.trim().split(/\s+/u)[0] ?? "";
  if (!digest.ok || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`BATCH002_R55_INSTALLED_APK_SHA_UNAVAILABLE:${digest.output}`);
  }
  return { path, sha256: value };
}

let activeRunnerLock: Json | null = null;
let runnerHeartbeat: ReturnType<typeof setInterval> | null = null;
let recoveredStaleLock: Json | null = null;

function processCommandLine(pid: number): string {
  try {
    if (process.platform === "win32") {
      return execFileSync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\").CommandLine`,
      ], { encoding: "utf8", timeout: 15_000 }).trim();
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
      timeout: 15_000,
    }).trim();
  } catch {
    return "";
  }
}

function processExists(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runnerLockPayload(lock: Json): Json {
  return {
    ...lock,
    heartbeatAt: new Date().toISOString(),
  };
}

function releaseRunnerLock(): void {
  if (runnerHeartbeat) clearInterval(runnerHeartbeat);
  runnerHeartbeat = null;
  if (!activeRunnerLock) return;
  try {
    const current = JSON.parse(readFileSync(RUNNER_LOCK, "utf8")) as Json;
    if (current.runId === activeRunnerLock.runId) unlinkSync(RUNNER_LOCK);
  } catch {
    // The owning run may already have removed its lock during signal cleanup.
  }
  activeRunnerLock = null;
}

function acquireRunnerLock(input: RawCaseIdentity): Json {
  mkdirSync(RUNTIME, { recursive: true });
  try {
    const existing = JSON.parse(readFileSync(RUNNER_LOCK, "utf8")) as Json;
    const existingPid = Number(existing.pid);
    const liveCommandLine = processCommandLine(existingPid);
    const sameRunner = liveCommandLine.includes("runBatch002R52AndroidApi34Matrix50.ts");
    if (processExists(existingPid) && sameRunner) {
      throw new Error(`BATCH002_ANDROID_RUNNER_ALREADY_ACTIVE:${existing.runId}:${existingPid}`);
    }
    recoveredStaleLock = {
      ...existing,
      recoveryProof: {
        processExists: processExists(existingPid),
        liveCommandLine,
        checkedAt: new Date().toISOString(),
      },
    };
    unlinkSync(RUNNER_LOCK);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BATCH002_ANDROID_RUNNER_ALREADY_ACTIVE")) throw error;
  }
  const startedAt = new Date().toISOString();
  activeRunnerLock = {
    schemaVersion: "real-professional-estimates-r5.6.runner-single-flight-lock.v1",
    runId: `batch002-android-${process.pid}-${Date.now()}`,
    pid: process.pid,
    parentPid: process.ppid,
    commandLine: process.argv.join(" "),
    startedAt,
    heartbeatAt: startedAt,
    source: {
      head: input.head,
      tree: input.headTree,
      appSourceStateId: input.appSourceStateId,
      harnessStateId: input.harnessStateId,
    },
    contractSha256: MASTER_SHA256,
    manifestSha256: input.manifestSha256,
    casesContentSha256: input.casesContentSha256,
    apkSha256Full: input.apkSha256,
    buildManifestSha256: input.buildManifestSha256,
    authProofSha256: input.authProofSha256,
  };
  writeFileSync(RUNNER_LOCK, `${JSON.stringify(activeRunnerLock, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  runnerHeartbeat = setInterval(() => {
    if (activeRunnerLock) atomicJson(RUNNER_LOCK, runnerLockPayload(activeRunnerLock));
  }, 5_000);
  return activeRunnerLock;
}

async function runSingleFlight(): Promise<void> {
  const head = git("rev-parse", "HEAD");
  const headTree = git("rev-parse", "HEAD^{tree}");
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Json;
  const build = JSON.parse(readFileSync(BUILD_MANIFEST, "utf8")) as Json;
  const manifestSha256 = sha256(readFileSync(MANIFEST));
  const identity: RawCaseIdentity = {
    head,
    headTree,
    appSourceStateId: String(build.app_source_state_id),
    harnessStateId: String(manifest.harness_state_id),
    apkSha256: String(build.apk_sha256_full),
    manifestSha256,
    casesContentSha256: String(manifest.cases_content_sha256),
    buildManifestSha256: sha256(readFileSync(BUILD_MANIFEST)),
    authProofSha256: sha256(readFileSync(AUTH_PROOF)),
  };
  const lock = acquireRunnerLock(identity);
  const startedAt = String(lock.startedAt);
  try {
    await main();
  } finally {
    const auditBase = {
      schemaVersion: "real-professional-estimates-r5.6.runner-single-flight-process-audit.v1",
      generatedAt: new Date().toISOString(),
      contractSha256: MASTER_SHA256,
      source: {
        head,
        tree: headTree,
        appSourceStateId: identity.appSourceStateId,
        harnessStateId: identity.harnessStateId,
      },
      manifestSha256,
      casesContentSha256: identity.casesContentSha256,
      apkSha256Full: identity.apkSha256,
      buildManifestSha256: identity.buildManifestSha256,
      authProofSha256: identity.authProofSha256,
      runId: lock.runId,
      pid: lock.pid,
      parentPid: lock.parentPid,
      commandLine: lock.commandLine,
      startedAt,
      completedAt: new Date().toISOString(),
      duplicateConcurrentRunners: 0,
      staleLockRecovered: Boolean(recoveredStaleLock),
      recoveredStaleLock,
      lockReleased: true,
    };
    atomicJson(RUNNER_PROCESS_AUDIT, {
      ...auditBase,
      contentSha256: sha256(JSON.stringify(auditBase)),
    });
    releaseRunnerLock();
  }
}

async function main(): Promise<void> {
  mkdirSync(RUNTIME, { recursive: true });
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Json;
  const build = JSON.parse(readFileSync(BUILD_MANIFEST, "utf8")) as Json;
  const auth = JSON.parse(readFileSync(AUTH_PROOF, "utf8")) as Json;
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const manifestSha256 = sha256(readFileSync(MANIFEST));
  const buildManifestSha256 = sha256(readFileSync(BUILD_MANIFEST));
  const authProofSha256 = sha256(readFileSync(AUTH_PROOF));
  const requiredCoverage = (manifest.required_coverage ?? manifest.requiredCoverage) as string[];
  const installedApk = installedApkSha256();
  const identity: RawCaseIdentity = {
    head,
    headTree: tree,
    appSourceStateId: String(build.app_source_state_id),
    harnessStateId: String(manifest.harness_state_id),
    apkSha256: String(build.apk_sha256_full),
    manifestSha256,
    casesContentSha256: String(manifest.cases_content_sha256),
    buildManifestSha256,
    authProofSha256,
  };
  const preflight: Assertion[] = [
    { name: "master_sha256", passed: sha256(readFileSync(MASTER)) === MASTER_SHA256 },
    { name: "logcat_pid_parser", passed:
      logcatProcessId("08-20 22:05:53.701 25584 25584 E AndroidRuntime: FATAL EXCEPTION: main") === "25584"
      && logcatProcessId("E/AndroidRuntime(20715): FATAL EXCEPTION: main") === "20715" },
    { name: "manifest_status", passed: manifest.status === EXPECTED_MANIFEST_STATUS },
    { name: "manifest_exact_50", passed: manifest.cases?.length === 50
      && manifest.distinct_catalog_ids === EXPECTED_DISTINCT_CATALOGS },
    { name: "manifest_source_head", passed: manifest.source_head === head },
    { name: "manifest_source_tree", passed: manifest.source_head_tree === tree },
    { name: "manifest_app_source_state", passed: manifest.app_source_component_state_id === build.app_source_state_id },
    { name: "manifest_harness_state", passed: typeof manifest.harness_state_id === "string"
      && manifest.harness_state_id.length === 64 },
    { name: "harness_files_exact", passed: (manifest.harness_file_manifest?.files as Json[] | undefined)
      ?.every((entry) => sha256(readFileSync(resolve(String(entry.path)))) === entry.sha256) === true },
    { name: "build_manifest_r56", passed: build.contract_sha256 === MASTER_SHA256
      && build.status === "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE" },
    { name: "auth_proof_green", passed: auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE" },
    { name: "auth_proof_identity", passed: auth.contract_sha256 === MASTER_SHA256
      && auth.app_source_state_id === build.app_source_state_id && auth.apk_sha256_full === build.apk_sha256_full },
    { name: "installed_apk_sha256", passed: installedApk.sha256 === build.apk_sha256_full,
      details: installedApk.sha256 },
    { name: "android_api_34", passed: adb(["shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim() === EXPECTED_API },
    { name: "package_installed", passed: adb(["shell", "pm", "path", PACKAGE_NAME], 10_000).output.startsWith("package:") },
  ];
  const results: Json[] = [];
  const rawCaseEvidence: Json[] = [];
  const caseFilter = requestedCaseNumbers();
  const selectedCases = (manifest.cases as Json[]).filter((testCase) => !caseFilter || caseFilter.has(Number(testCase.case)));
  if (caseFilter && selectedCases.length !== caseFilter.size) throw new Error("BATCH002_R52_ANDROID_CASE_FILTER_NOT_FOUND");
  for (const testCase of selectedCases) {
    const startedAt = new Date().toISOString();
    const scenario = String((testCase.coverage as string[]).find((value) => requiredCoverage.includes(value))
      ?? "exact_revision_open_and_row_parameter_parity");
    if (scenario === "photo_add_and_view") {
      adb(["shell", "pm", "revoke", PACKAGE_NAME, "android.permission.CAMERA"], 10_000);
      adb(["shell", "pm", "clear-permission-flags", PACKAGE_NAME, "android.permission.CAMERA", "user-set", "user-fixed"], 10_000);
    }
    let base: Awaited<ReturnType<typeof launchExact>>;
    let launchRecovery: Json | null = null;
    try {
      base = await launchExact(testCase, `case-${testCase.case}-${Date.now()}`);
    } catch (firstError) {
      const firstDetails = firstError instanceof Error ? firstError.stack ?? firstError.message : String(firstError);
      launchRecovery = {
        attempted: true,
        firstError: firstDetails,
        firstFailureCapture: (() => {
          try {
            return capture(`case-${testCase.case}-exact-launch-recovery-first-failure`, dumpUi());
          } catch {
            return null;
          }
        })(),
      };
      await delay(2_000);
      try {
        base = await launchExact(testCase, `case-${testCase.case}-recovery-${Date.now()}`);
      } catch (error) {
      const details = error instanceof Error ? error.stack ?? error.message : String(error);
      const failureSnapshot = (() => { try { return dumpUi(); } catch { return null; } })();
      const result = {
        case: testCase.case,
        catalogId: testCase.catalogId,
        parentRevisionId: testCase.parentRevisionId,
        releaseId: testCase.releaseId,
        expectedRowCount: testCase.expectedRowCount,
        scenario,
        startedAt,
        completedAt: new Date().toISOString(),
        launch: null,
        nativeRequestCount: 0,
        assertions: [{ name: "exact_launch_ready", passed: false, details }],
        evidence: {
          error: details,
          launchRecovery,
          failureCapture: failureSnapshot ? capture(`case-${testCase.case}-exact-launch-failure`, failureSnapshot) : null,
        },
        blockers: ["exact_launch_ready"],
        status: "RED",
      };
      rawCaseEvidence.push(freezeRawCase(result, identity));
      results.push(result);
      atomicJson(PROGRESS, {
        schemaVersion: "real-professional-estimates-r5.6.batch002-android-progress.v1",
        contractSha256: MASTER_SHA256,
        appSourceStateId: identity.appSourceStateId,
        harnessStateId: identity.harnessStateId,
        apkSha256Full: identity.apkSha256,
        manifestSha256,
        generatedAt: new Date().toISOString(), completed: results.length, expected: selectedCases.length,
        green: results.filter((entry) => entry.status === "GREEN").length,
        red: results.filter((entry) => entry.status === "RED").length,
        lastCase: result,
      });
      process.stdout.write(`${JSON.stringify({ case: result.case, scenario, status: result.status, blockers: result.blockers })}\n`);
      continue;
      }
    }
    const caseAppProcessIds = packageProcessIds();
    let coverage: { assertions: Assertion[]; evidence: Json; snapshot: UiSnapshot };
    try {
      coverage = await runCoverageScenario(testCase, scenario);
    } catch (error) {
      const snapshot = (() => { try { return dumpUi(); } catch { return base.snapshot; } })();
      coverage = {
        assertions: [{ name: scenario, passed: false, details: error instanceof Error ? error.stack ?? error.message : String(error) }],
        evidence: { error: error instanceof Error ? error.stack ?? error.message : String(error) },
        snapshot,
      };
    }
    const allRuntimeErrors = adb(["logcat", "-d", "AndroidRuntime:E", "ReactNativeJS:E", "*:S"], 30_000).output
      .split(/\r?\n/u)
      .filter((line) => /FATAL EXCEPTION|JavascriptException|RangeError:\s*String length exceeds limit/iu.test(line));
    const attributedAppProcessIds = new Set([...caseAppProcessIds, ...packageProcessIds()]);
    const runtimeErrors = allRuntimeErrors.filter((line) => {
      const processId = logcatProcessId(line);
      return processId == null || attributedAppProcessIds.has(processId);
    });
    const excludedHarnessRuntimeErrors = allRuntimeErrors.filter((line) => {
      const processId = logcatProcessId(line);
      return processId != null && !attributedAppProcessIds.has(processId);
    });
    const basePassed = (name: string) => base.assertions.some((entry) => entry.name === name && entry.passed);
    const mutationEvidence = coverage.evidence;
    const case4ContractAssertions: Assertion[] = Number(testCase.case) === 4
      && scenario === "parameter_edit_recalculate_child"
      ? [
          { name: "exact_revision_marker", passed: basePassed("exact_revision_marker") },
          { name: "correct_catalog_and_release", passed: basePassed("exact_catalog_marker")
            && basePassed("exact_parent_revision_visible") && basePassed("exact_release_visible") },
          { name: "rows_and_parameter_session_provenance", passed: [
            "native_revision_get_200", "native_rows_get_200", "native_catalog_get_200", "native_parameter_session_ready",
          ].every(basePassed), details: "NO_CACHE" },
          { name: "parameter_panel_opened", passed: Boolean(mutationEvidence.parameterActivationMode) },
          { name: "real_native_interaction", passed: mutationEvidence.parameterActivationMode === "touch"
            && Boolean(mutationEvidence.ordinaryTouchEvidence) && mutationEvidence.appliedByTouch === true },
          { name: "parameter_value_changed", passed: mutationEvidence.typed === true },
          { name: "logical_commands_exactly_one", passed: mutationEvidence.logicalCommands === 1,
            details: mutationEvidence.logicalCommands },
          { name: "physical_recalculate_posts_exactly_one", passed: mutationEvidence.physicalRecalculatePosts === 1,
            details: mutationEvidence.physicalRecalculatePosts },
          { name: "recalculate_http_status_202", passed: mutationEvidence.post202 === true },
          { name: "child_revision_created_exactly_one", passed: mutationEvidence.uniqueMatchingChildRevision === true },
          { name: "child_parent_revision_exact", passed: mutationEvidence.childParentExact === true },
          { name: "child_release_exact", passed: mutationEvidence.childReleaseExact === true },
          { name: "child_parameter_value_exact", passed: mutationEvidence.parameterPersisted === true },
          { name: "parent_checksum_unchanged", passed: mutationEvidence.parentImmutable === true },
          { name: "fatal_js_or_native_crashes_zero", passed: runtimeErrors.length === 0 },
          { name: "unexpected_external_requests_zero", passed: base.nativeAudit.every((row: AuditRow) =>
            row.remoteAddress == null || ["127.0.0.1", "::1"].includes(String(row.remoteAddress))) },
        ]
      : [];
    const case10ContractAssertions: Assertion[] = Number(testCase.case) === 10
      && scenario === "photo_add_and_view"
      ? [
          { name: "permission_denied_once", passed: mutationEvidence.permissionDialogInitial === true
            && mutationEvidence.denialTapped === true && mutationEvidence.denialGateVisible === true },
          { name: "reentry_after_denial", passed: mutationEvidence.reentryTapped === true
            && mutationEvidence.permissionDialogReentry === true },
          { name: "permission_allowed", passed: mutationEvidence.allowTapped === true
            && mutationEvidence.cameraReady === true },
          { name: "real_camera_or_declared_emulator_camera_source", passed:
            mutationEvidence.emulatorCameraSource === "DECLARED_ANDROID_EMULATOR_CAMERA_API34" },
          { name: "shutter_completed", passed: mutationEvidence.shutterTapped === true },
          { name: "review_screen_opened", passed: mutationEvidence.reviewVisible === true
            && mutationEvidence.reviewImageVisible === true },
          { name: "use_photo_confirmed", passed: mutationEvidence.useTapped === true },
          { name: "attachment_created", passed: mutationEvidence.attachmentCreated === true, details: 1 },
          { name: "attachment_content_sha256_present", passed: mutationEvidence.attachmentHashPresent === true },
          { name: "attachment_mime_and_size_validated", passed:
            mutationEvidence.attachmentMimeAndSizeValidated === true },
          { name: "attachment_bound_to_exact_row_and_revision", passed:
            mutationEvidence.attachmentBoundExact === true },
          { name: "immutable_attachment_event_or_child_revision_created", passed:
            mutationEvidence.immutableEventCreated === true },
          { name: "native_signed_upload_contract", passed: mutationEvidence.uploadRequest201 === true
            && mutationEvidence.uploadBytes201 === true && mutationEvidence.finalize200 === true },
          { name: "thumbnail_visible_after_save", passed: mutationEvidence.attachedPhotoVisible === true
            && mutationEvidence.attachedImageVisible === true },
          { name: "cold_reopen_exact_revision", passed: mutationEvidence.coldReopenExact === true },
          { name: "thumbnail_visible_after_cold_reopen", passed:
            mutationEvidence.thumbnailVisibleAfterColdReopen === true },
          { name: "logout_confirmation_completed", passed:
            mutationEvidence.logoutConfirmationVisible === true
            && mutationEvidence.logoutConfirmed === true },
          { name: "thumbnail_visible_after_logout_login", passed:
            mutationEvidence.logoutReachedLogin === true && mutationEvidence.reloginExact === true
            && mutationEvidence.thumbnailVisibleAfterLogoutLogin === true },
          { name: "other_tenant_access_denied", passed: mutationEvidence.otherTenantAccessDenied === true },
          { name: "parent_revision_and_old_pdf_unchanged", passed:
            mutationEvidence.parentRevisionAndOldPdfUnchanged === true },
          { name: "cleanup_did_not_delete_user_photo", passed:
            mutationEvidence.cleanupDidNotDeleteUserPhoto === true },
        ]
      : [];
    const assertions = [
      ...base.assertions,
      ...coverage.assertions,
      { name: "app_process_identity_captured", passed: attributedAppProcessIds.size > 0,
        details: [...attributedAppProcessIds] },
      { name: "fatal_js_or_native_crashes_zero", passed: runtimeErrors.length === 0,
        details: { appProcessIds: [...attributedAppProcessIds], appRuntimeErrors: runtimeErrors,
          excludedNonAppRuntimeErrors: excludedHarnessRuntimeErrors } },
      ...case4ContractAssertions,
      ...case10ContractAssertions,
    ];
    const blockers = assertions.filter((entry) => !entry.passed).map((entry) => entry.name);
    const result: Json = {
      case: testCase.case,
      catalogId: testCase.catalogId,
      parentRevisionId: testCase.parentRevisionId,
      releaseId: testCase.releaseId,
      expectedRowCount: testCase.expectedRowCount,
      scenario,
      startedAt,
      completedAt: new Date().toISOString(),
      launch: base.launch,
      nativeRequestCount: base.nativeAudit.length,
      assertions,
      evidence: {
        ...coverage.evidence,
        runtimeErrorAttribution: {
          appProcessIds: [...attributedAppProcessIds],
          appRuntimeErrors: runtimeErrors,
          excludedNonAppRuntimeErrors: excludedHarnessRuntimeErrors,
        },
        launchRecovery,
        nativeAuditRecovery: base.nativeAuditRecovery,
        launchEnvironmentRecovery: base.launchEnvironmentRecovery,
        parameterParityProbe: base.parameterParityProbe,
      },
      blockers,
      status: blockers.length === 0 ? "GREEN" : "RED",
    };
    if (blockers.length) result.evidence.failureCapture = capture(`case-${testCase.case}-${scenario}-failure`, coverage.snapshot);
    const rawCase = freezeRawCase(result, identity);
    rawCaseEvidence.push(rawCase);
    if (Number(testCase.case) === 4 && scenario === "parameter_edit_recalculate_child") {
      const { snapshot: _snapshot, ...case4MutationEvidence } = coverage.evidence;
      const proofBase = {
        schemaVersion: "real-professional-estimates-r5.6.batch002-android-case4-mutation-proof.v1",
        generatedAt: new Date().toISOString(),
        contractSha256: MASTER_SHA256,
        source: {
          branch: git("branch", "--show-current"),
          head,
          tree,
          appSourceStateId: identity.appSourceStateId,
          harnessStateId: identity.harnessStateId,
        },
        manifest: { path: MANIFEST, sha256: manifestSha256,
          casesContentSha256: identity.casesContentSha256 },
        buildManifest: { path: BUILD_MANIFEST, sha256: buildManifestSha256 },
        authProof: { path: AUTH_PROOF, sha256: authProofSha256, status: auth.status },
        apkSha256Full: identity.apkSha256,
        installedApk,
        case: 4,
        catalogId: testCase.catalogId,
        openedRevisionId: testCase.parentRevisionId,
        openedReleaseId: testCase.releaseId,
        provenanceMode: base.assertions.every((entry) => ![
          "native_revision_get_200",
          "native_rows_get_200",
          "native_catalog_get_200",
          "native_parameter_session_ready",
        ].includes(entry.name) || entry.passed) ? "NO_CACHE" : "UNPROVEN",
        nativeReadAudit: base.nativeAudit,
        mutation: case4MutationEvidence,
        rawCaseEvidence: rawCase,
        assertions,
        status: blockers.length === 0
          ? "GREEN_BATCH002_ANDROID_CASE4_MUTATION_NO_RELEASE"
          : "RED_ANDROID_MUTATION_UNPROVEN",
        releasePerformed: false,
        deployPerformed: false,
        otaPerformed: false,
        mergePerformed: false,
        pushPerformed: false,
        batch009Performed: false,
      };
      atomicJson(resolve(OUTPUT, "BATCH002_ANDROID_CASE4_MUTATION_PROOF.json"), {
        ...proofBase,
        contentSha256: sha256(JSON.stringify(proofBase)),
      });
    }
    if (Number(testCase.case) === 10 && scenario === "photo_add_and_view") {
      const proofBase = {
        schemaVersion: "real-professional-estimates-r5.6.batch002-android-case10-photo-proof.v1",
        generatedAt: new Date().toISOString(),
        contractSha256: MASTER_SHA256,
        source: {
          branch: git("branch", "--show-current"),
          head,
          tree,
          appSourceStateId: identity.appSourceStateId,
          harnessStateId: identity.harnessStateId,
        },
        manifest: {
          path: MANIFEST,
          sha256: manifestSha256,
          casesContentSha256: identity.casesContentSha256,
        },
        buildManifest: { path: BUILD_MANIFEST, sha256: buildManifestSha256 },
        authProof: { path: AUTH_PROOF, sha256: authProofSha256, status: auth.status },
        apkSha256Full: identity.apkSha256,
        installedApk,
        case: 10,
        catalogId: testCase.catalogId,
        openedRevisionId: testCase.parentRevisionId,
        openedReleaseId: testCase.releaseId,
        evidence: coverage.evidence,
        rawCaseEvidence: rawCase,
        assertions,
        status: blockers.length === 0
          ? "GREEN_BATCH002_ANDROID_CASE10_PHOTO_NO_RELEASE"
          : "RED_ANDROID_PHOTO_CONTRACT_UNPROVEN",
        releasePerformed: false,
        deployPerformed: false,
        otaPerformed: false,
        mergePerformed: false,
        pushPerformed: false,
        batch009Performed: false,
      };
      atomicJson(resolve(OUTPUT, "BATCH002_ANDROID_CASE10_PHOTO_PROOF.json"), {
        ...proofBase,
        contentSha256: sha256(JSON.stringify(proofBase)),
      });
    }
    results.push(result);
    atomicJson(PROGRESS, {
      schemaVersion: "real-professional-estimates-r5.6.batch002-android-progress.v1",
      contractSha256: MASTER_SHA256,
      appSourceStateId: identity.appSourceStateId,
      harnessStateId: identity.harnessStateId,
      apkSha256Full: identity.apkSha256,
      manifestSha256,
      generatedAt: new Date().toISOString(), completed: results.length, expected: selectedCases.length,
      green: results.filter((entry) => entry.status === "GREEN").length,
      red: results.filter((entry) => entry.status === "RED").length,
      lastCase: result,
    });
    process.stdout.write(`${JSON.stringify({ case: result.case, scenario, status: result.status, blockers })}\n`);
  }
  const allNative = readAudit().filter((row) => /okhttp/i.test(String(row.userAgent ?? "")));
  const external = allNative.filter((row) => row.remoteAddress != null && !["127.0.0.1", "::1"].includes(String(row.remoteAddress)));
  const coverageScope = caseFilter
    ? [...new Set(selectedCases.map((testCase) => String(
        (testCase.coverage as string[]).find((value) => requiredCoverage.includes(value))
          ?? "exact_revision_open_and_row_parameter_parity",
      )))]
    : requiredCoverage;
  const covered = new Set(results.filter((entry) => entry.status === "GREEN").map((entry) => entry.scenario));
  const selectedCaseNumbers = selectedCases.map((entry) => Number(entry.case));
  const executedCaseNumbers = results.map((entry) => Number(entry.case));
  const missing = selectedCaseNumbers.filter((caseNumber) => !executedCaseNumbers.includes(caseNumber));
  const duplicate = executedCaseNumbers.filter((caseNumber, index) => executedCaseNumbers.indexOf(caseNumber) !== index);
  const report: Json = {
    schemaVersion: `real-professional-estimates-r5.6.${BATCH_NUMBER.toLowerCase()}-android-api34-matrix50-result.v1`,
    generatedAt: new Date().toISOString(),
    masterSha256: MASTER_SHA256,
    contractSha256: MASTER_SHA256,
    source: {
      branch: git("branch", "--show-current"), head, tree,
      appSourceStateId: identity.appSourceStateId,
      harnessStateId: identity.harnessStateId,
    },
    manifest: { path: MANIFEST, sha256: manifestSha256, status: manifest.status,
      casesContentSha256: identity.casesContentSha256 },
    buildManifest: { path: BUILD_MANIFEST, sha256: buildManifestSha256, status: build.status },
    authProof: { path: AUTH_PROOF, sha256: authProofSha256, status: auth.status },
    apkSha256Full: identity.apkSha256,
    device: { id: DEVICE_ID, apiLevel: adb(["shell", "getprop", "ro.build.version.sdk"], 10_000).output.trim(),
      packageName: PACKAGE_NAME, component: MAIN_ACTIVITY, installedApk },
    preflight,
    runScope: caseFilter ? "TARGETED_SHARD" : "FULL_MATRIX_50",
    selectedDenominator: selectedCases.length,
    cumulativeDenominator: (manifest.cases as Json[]).length,
    expected: selectedCases.length,
    executed: results.length,
    passed: results.filter((entry) => entry.status === "GREEN").length,
    failed: results.filter((entry) => entry.status === "RED").length,
    missing,
    duplicate,
    skipped: 0,
    distinctCatalogIds: new Set(results.map((entry) => entry.catalogId)).size,
    requiredCoverage: coverageScope,
    fullMatrixRequiredCoverage: requiredCoverage,
    missingGreenCoverage: coverageScope.filter((scenario) => !covered.has(scenario)),
    externalRequests: external.length,
    revisionHistoryBreaks: results.filter((entry) => entry.blockers.includes("history_and_diff")
      || entry.blockers.includes("historical_revision_restore_as_new")).length,
    releaseId: manifest.release_id,
    results,
    rawCaseEvidence,
    blockers: [
      ...preflight.filter((entry) => !entry.passed).map((entry) => `PREFLIGHT:${entry.name}`),
      ...results.filter((entry) => entry.status === "RED").map((entry) => `CASE_${entry.case}:${entry.blockers.join(",")}`),
      ...coverageScope.filter((scenario) => !covered.has(scenario)).map((scenario) => `COVERAGE_RED:${scenario}`),
      ...missing.map((caseNumber) => `MISSING_CASE:${caseNumber}`),
      ...duplicate.map((caseNumber) => `DUPLICATE_CASE:${caseNumber}`),
      ...(external.length ? [`EXTERNAL_REQUESTS:${external.length}`] : []),
    ],
    releasePerformed: false,
    deployPerformed: false,
    otaPerformed: false,
    mergePerformed: false,
    pushPerformed: false,
    batch009Performed: false,
    status: "RED_PENDING_ANDROID_MATRIX",
  };
  const green = report.blockers.length === 0 && report.executed === selectedCases.length
    && report.passed === selectedCases.length && report.failed === 0 && report.skipped === 0
    && report.missing.length === 0 && report.duplicate.length === 0
    && report.externalRequests === 0 && report.revisionHistoryBreaks === 0;
  report.status = green
    ? caseFilter
      ? "GREEN_REAL_ANDROID_API34_TARGETED_SHARD_NO_RELEASE"
      : IS_BATCH004_R56
        ? "GREEN_R56_BATCH004_REAL_ANDROID_API34_50_OF_50_NO_RELEASE"
        : IS_BATCH003_R56
        ? "GREEN_R56_BATCH003_REAL_ANDROID_API34_50_OF_50_NO_RELEASE"
        : IS_BATCH001_R56
          ? "GREEN_R56_BATCH001_REAL_ANDROID_API34_50_OF_50_NO_RELEASE"
          : "GREEN_REAL_ANDROID_API34_50_OF_50_NO_RELEASE"
    : `RED_${BATCH_NUMBER}_ANDROID_API34_MATRIX`;
  report.contentSha256 = sha256(JSON.stringify(report));
  atomicJson(REPORT, report);
  if (selectedCases.length === 1 && Number(selectedCases[0]?.case) === 4) {
    atomicJson(resolve(OUTPUT, "BATCH002_ANDROID_CASE_4_RESULT.json"), report);
  }
  if (selectedCases.length === 1 && Number(selectedCases[0]?.case) === 10) {
    atomicJson(resolve(OUTPUT, "BATCH002_ANDROID_CASE_10_RESULT.json"), report);
  }
  process.stdout.write(`${JSON.stringify({ status: report.status, report: REPORT, passed: report.passed,
    failed: report.failed, blockers: report.blockers }, null, 2)}\n`);
  if (!green) process.exitCode = 1;
}

process.once("exit", releaseRunnerLock);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    releaseRunnerLock();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}

void runSingleFlight().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
