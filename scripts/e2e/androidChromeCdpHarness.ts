import { execFileSync } from "node:child_process";
import { get } from "node:http";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import { isLocalhostBaseUrl } from "./renderStagingAcceptanceCore";

export const ANDROID_CHROME_PACKAGE = "com.android.chrome" as const;
export const ANDROID_CHROME_CDP_PORT = 9222;

const ADB_TIMEOUT_MS = 20_000;
const PAGE_CLOSE_TIMEOUT_MS = 5_000;
const ANDROID_CHROME_CDP_BOOTSTRAP_ATTEMPTS = 3;
const ANDROID_FRAMEWORK_SERVICE_READY_TIMEOUT_MS = 60_000;
const ANDROID_CHROME_COMMAND_LINE_FLAGS = [
  "chrome",
  "--no-first-run",
  "--disable-fre",
  "--no-default-browser-check",
  "--disable-default-apps",
  "--disable-background-networking",
  "--disable-notifications",
  "--disable-session-crashed-bubble",
  "--remote-debugging-socket-name=chrome_devtools_remote",
];
const ANDROID_CHROME_UI_DUMP_PATH = "/sdcard/rik-chrome-window.xml";
const ANDROID_CHROME_BLOCKING_SURFACE_PATTERNS = [
  /Chrome notifications make things easier/i,
  /notifications make things easier/i,
  /turn on notifications/i,
  /Welcome to Chrome/i,
  /Sign in to Chrome/i,
];
const ANDROID_CHROME_DISMISS_BUTTON_PATTERNS = [
  /No thanks/i,
  /Not now/i,
  /Skip/i,
  /Cancel/i,
  /Don.?t allow/i,
];

export type AndroidChromeCdpVersion = {
  Browser?: string;
  "Protocol-Version"?: string;
  "User-Agent"?: string;
  "V8-Version"?: string;
  "WebKit-Version"?: string;
};

type AndroidChromeCdpTarget = {
  id?: string;
  type?: string;
  url?: string;
  title?: string;
};

export type AndroidFrameworkServiceReadyProbe = {
  ready: boolean;
  checks: {
    cmd_activity_available: boolean;
    cmd_package_available: boolean;
    settings_available: boolean;
    wm_size_available: boolean;
  };
};

export type AndroidChromeCdpSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdpVersion: AndroidChromeCdpVersion;
  close: () => Promise<void>;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function adb(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

export function adbNoThrow(args: string[], timeoutMs = ADB_TIMEOUT_MS): boolean {
  try {
    adb(args, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

export function adbOutputNoThrow(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
  try {
    return adb(args, timeoutMs);
  } catch {
    return "";
  }
}

export function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function prepareAndroidChromeCdp(input: {
  deviceId: string;
  baseUrl: string;
  startUrl: string;
  cdpPort?: number;
}): void {
  const cdpPort = input.cdpPort ?? ANDROID_CHROME_CDP_PORT;
  const commandLine = [...ANDROID_CHROME_COMMAND_LINE_FLAGS, `--remote-debugging-port=${cdpPort}`].join(" ");
  if (isLocalhostBaseUrl(input.baseUrl)) {
    const port = resolvePort(input.baseUrl);
    adb(["-s", input.deviceId, "reverse", `tcp:${port}`, `tcp:${port}`], 10_000);
  }
  adbNoThrow(["-s", input.deviceId, "shell", "appops", "set", ANDROID_CHROME_PACKAGE, "POST_NOTIFICATION", "deny"], 10_000);
  adbNoThrow([
    "-s",
    input.deviceId,
    "shell",
    "pm",
    "revoke",
    ANDROID_CHROME_PACKAGE,
    "android.permission.POST_NOTIFICATIONS",
  ], 10_000);
  adb([
    "-s",
    input.deviceId,
    "shell",
    `printf '%s\\n' ${shellQuote(
      commandLine,
    )} > /data/local/tmp/chrome-command-line && chmod 644 /data/local/tmp/chrome-command-line`,
  ], 10_000);
  adbNoThrow(["-s", input.deviceId, "forward", "--remove", `tcp:${cdpPort}`], 10_000);
  adb(["-s", input.deviceId, "forward", `tcp:${cdpPort}`, "localabstract:chrome_devtools_remote"], 10_000);
  adb([
    "-s",
    input.deviceId,
    "shell",
    "am",
    "start",
    "-n",
    `${ANDROID_CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
    "-a",
    "android.intent.action.VIEW",
    "-d",
    input.startUrl,
  ], 20_000);
}

export function androidChromeDevtoolsSocketVisible(deviceId: string): boolean {
  const sockets = adbOutputNoThrow(["-s", deviceId, "shell", "cat", "/proc/net/unix"], 10_000);
  return sockets.includes("@chrome_devtools_remote") || sockets.includes("chrome_devtools_remote");
}

export function androidChromePid(deviceId: string): string | null {
  const pid = adbOutputNoThrow(["-s", deviceId, "shell", "pidof", ANDROID_CHROME_PACKAGE], 10_000).trim();
  return pid.length > 0 ? pid : null;
}

export async function forceStopAndroidChromeForCdp(input: {
  deviceId: string;
  timeoutMs?: number;
}): Promise<boolean> {
  adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", ANDROID_CHROME_PACKAGE], 10_000);
  const deadline = Date.now() + (input.timeoutMs ?? 15_000);
  while (Date.now() < deadline) {
    if (!androidChromePid(input.deviceId)) return true;
    await sleep(500);
  }
  return !androidChromePid(input.deviceId);
}

export function probeAndroidFrameworkServicesReady(deviceId: string): AndroidFrameworkServiceReadyProbe {
  const cmdActivity = adbOutputNoThrow(["-s", deviceId, "shell", "cmd", "activity", "get-current-user"], 5000);
  const cmdPackage = adbOutputNoThrow([
    "-s",
    deviceId,
    "shell",
    "cmd",
    "package",
    "list",
    "packages",
    ANDROID_CHROME_PACKAGE,
  ], 5000);
  const settings = adbOutputNoThrow(["-s", deviceId, "shell", "settings", "get", "secure", "user_setup_complete"], 5000);
  const wmSize = adbOutputNoThrow(["-s", deviceId, "shell", "wm", "size"], 5000);
  const checks = {
    cmd_activity_available: cmdActivity.trim().length > 0,
    cmd_package_available: cmdPackage.includes(`package:${ANDROID_CHROME_PACKAGE}`),
    settings_available: settings.trim().length > 0,
    wm_size_available: /size:/i.test(wmSize),
  };
  return {
    ready: Object.values(checks).every(Boolean),
    checks,
  };
}

export async function waitForAndroidFrameworkServicesReady(input: {
  deviceId: string;
  timeoutMs?: number;
}): Promise<AndroidFrameworkServiceReadyProbe> {
  const deadline = Date.now() + (input.timeoutMs ?? ANDROID_FRAMEWORK_SERVICE_READY_TIMEOUT_MS);
  let lastProbe: AndroidFrameworkServiceReadyProbe | null = null;
  while (Date.now() < deadline) {
    lastProbe = probeAndroidFrameworkServicesReady(input.deviceId);
    if (lastProbe.ready) return lastProbe;
    await sleep(1_000);
  }
  const missing = Object.entries(lastProbe?.checks ?? {})
    .filter(([, value]) => !value)
    .map(([key]) => key)
    .join(",");
  throw new Error(`ANDROID_FRAMEWORK_SERVICES_NOT_READY:${missing || "unknown"}`);
}

export async function waitForAndroidChromeDevtoolsSocket(input: {
  deviceId: string;
  timeoutMs?: number;
}): Promise<void> {
  const deadline = Date.now() + (input.timeoutMs ?? 45_000);
  while (Date.now() < deadline) {
    if (androidChromeDevtoolsSocketVisible(input.deviceId)) return;
    await sleep(500);
  }
  throw new Error("ANDROID_CHROME_DEVTOOLS_SOCKET_MISSING");
}

export async function connectAndroidChromeOverCdp(input: {
  cdpUrl?: string;
  timeoutMs?: number;
} = {}): Promise<Browser> {
  const cdpUrl = input.cdpUrl ?? `http://127.0.0.1:${ANDROID_CHROME_CDP_PORT}`;
  const deadline = Date.now() + (input.timeoutMs ?? 60_000);
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP(cdpUrl, { timeout: 15_000 });
    } catch (error) {
      lastError = error;
      await sleep(750);
    }
  }
  throw new Error(
    `ANDROID_CHROME_CDP_CONNECT_FAILED:${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sameUrl(left: string, right: string): boolean {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return left === right;
  }
}

function androidUiTextFromNode(node: string): string {
  const text = node.match(/\btext="([^"]*)"/)?.[1] ?? "";
  const contentDescription = node.match(/\bcontent-desc="([^"]*)"/)?.[1] ?? "";
  return `${text} ${contentDescription}`.replace(/&amp;/g, "&");
}

function androidUiBoundsCenter(node: string): { x: number; y: number } | null {
  const match = node.match(/\bbounds="\[(\d+),(\d+)]\[(\d+),(\d+)]"/);
  if (!match) return null;
  const [, left, top, right, bottom] = match;
  return {
    x: Math.round((Number(left) + Number(right)) / 2),
    y: Math.round((Number(top) + Number(bottom)) / 2),
  };
}

function dumpAndroidChromeWindowHierarchy(deviceId: string): string {
  adbOutputNoThrow(["-s", deviceId, "shell", "uiautomator", "dump", ANDROID_CHROME_UI_DUMP_PATH], 15_000);
  return adbOutputNoThrow(["-s", deviceId, "shell", "cat", ANDROID_CHROME_UI_DUMP_PATH], 10_000);
}

function findDismissButtonCenter(windowHierarchy: string): { x: number; y: number } | null {
  const nodes = windowHierarchy.match(/<node\b[^>]*>/g) ?? [];
  for (const node of nodes) {
    const text = androidUiTextFromNode(node);
    if (!ANDROID_CHROME_DISMISS_BUTTON_PATTERNS.some((pattern) => pattern.test(text))) continue;
    const center = androidUiBoundsCenter(node);
    if (center) return center;
  }
  return null;
}

export async function dismissAndroidChromeBlockingSurfaces(input: {
  deviceId: string;
  attempts?: number;
  delayMs?: number;
}): Promise<boolean> {
  const attempts = Math.max(1, input.attempts ?? 4);
  const delayMs = Math.max(100, input.delayMs ?? 750);
  let dismissed = false;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const windowHierarchy = dumpAndroidChromeWindowHierarchy(input.deviceId);
    const hasBlockingSurface = ANDROID_CHROME_BLOCKING_SURFACE_PATTERNS.some((pattern) =>
      pattern.test(windowHierarchy)
    );
    const center = findDismissButtonCenter(windowHierarchy);
    if (!hasBlockingSurface || !center) break;
    adbNoThrow(["-s", input.deviceId, "shell", "input", "tap", String(center.x), String(center.y)], 5_000);
    dismissed = true;
    await sleep(delayMs);
  }
  return dismissed;
}

async function closeStalePage(page: Page): Promise<void> {
  await Promise.race([
    page.close({ runBeforeUnload: false }),
    sleep(PAGE_CLOSE_TIMEOUT_MS),
  ]).catch(() => undefined);
}

function getJson(url: string, timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP_${response.statusCode ?? "unknown"}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("HTTP_TIMEOUT"));
    });
    request.on("error", reject);
  });
}

function getText(url: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => {
        body += chunk;
      });
      response.on("end", () => {
        if ((response.statusCode ?? 500) >= 400) {
          reject(new Error(`HTTP_${response.statusCode ?? "unknown"}`));
          return;
        }
        resolve(body);
      });
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("HTTP_TIMEOUT"));
    });
    request.on("error", reject);
  });
}

async function listAndroidChromeCdpTargets(cdpPort: number): Promise<AndroidChromeCdpTarget[]> {
  const targets = await getJson(`http://127.0.0.1:${cdpPort}/json/list`, 5_000);
  return Array.isArray(targets) ? targets.filter(isRecord).map((target) => ({
    id: typeof target.id === "string" ? target.id : undefined,
    type: typeof target.type === "string" ? target.type : undefined,
    url: typeof target.url === "string" ? target.url : undefined,
    title: typeof target.title === "string" ? target.title : undefined,
  })) : [];
}

async function closeAndroidChromeCdpTarget(cdpPort: number, targetId: string): Promise<void> {
  await Promise.race([
    getText(`http://127.0.0.1:${cdpPort}/json/close/${encodeURIComponent(targetId)}`, PAGE_CLOSE_TIMEOUT_MS),
    sleep(PAGE_CLOSE_TIMEOUT_MS),
  ]).catch(() => undefined);
}

async function closeStaleAndroidChromeCdpTargets(input: {
  cdpPort: number;
  startUrl: string;
}): Promise<void> {
  const targets = await listAndroidChromeCdpTargets(input.cdpPort).catch(() => []);
  for (const target of targets) {
    if (!target.id || sameUrl(target.url ?? "", input.startUrl)) continue;
    await closeAndroidChromeCdpTarget(input.cdpPort, target.id);
  }
}

export async function waitForAndroidChromeJsonVersion(input: {
  cdpPort?: number;
  timeoutMs?: number;
} = {}): Promise<AndroidChromeCdpVersion> {
  const cdpPort = input.cdpPort ?? ANDROID_CHROME_CDP_PORT;
  const deadline = Date.now() + (input.timeoutMs ?? 45_000);
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const version = await getJson(`http://127.0.0.1:${cdpPort}/json/version`, 5_000);
      if (isRecord(version) && typeof version.Browser === "string") return version as AndroidChromeCdpVersion;
      lastError = new Error("ANDROID_CHROME_CDP_VERSION_SHAPE_INVALID");
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(
    `ANDROID_CHROME_CDP_VERSION_UNREACHABLE:${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function waitForAndroidChromeCdpEndpointReady(input: {
  deviceId: string;
  cdpPort?: number;
  timeoutMs?: number;
}): Promise<{
  cdpVersion: AndroidChromeCdpVersion;
  socketVisible: boolean;
}> {
  const cdpPort = input.cdpPort ?? ANDROID_CHROME_CDP_PORT;
  const deadline = Date.now() + (input.timeoutMs ?? 75_000);
  let lastError: unknown = null;
  let socketVisible = false;
  while (Date.now() < deadline) {
    socketVisible = androidChromeDevtoolsSocketVisible(input.deviceId);
    try {
      const version = await getJson(`http://127.0.0.1:${cdpPort}/json/version`, 3_000);
      if (isRecord(version) && typeof version.Browser === "string") {
        return { cdpVersion: version as AndroidChromeCdpVersion, socketVisible };
      }
      lastError = new Error("ANDROID_CHROME_CDP_VERSION_SHAPE_INVALID");
    } catch (error) {
      lastError = error;
    }
    await sleep(socketVisible ? 250 : 500);
  }
  throw new Error(
    `ANDROID_CHROME_CDP_ENDPOINT_UNREACHABLE:socket=${socketVisible ? "visible" : "missing"}:${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function openAndroidChromeCdpSession(input: {
  deviceId: string;
  baseUrl: string;
  startUrl: string;
  cdpPort?: number;
}): Promise<AndroidChromeCdpSession> {
  const cdpPort = input.cdpPort ?? ANDROID_CHROME_CDP_PORT;
  let cdpVersion: AndroidChromeCdpVersion | null = null;
  let browser: Browser | null = null;
  let lastBootstrapError: unknown = null;
  for (let attempt = 1; attempt <= ANDROID_CHROME_CDP_BOOTSTRAP_ATTEMPTS; attempt += 1) {
    await waitForAndroidFrameworkServicesReady({ deviceId: input.deviceId });
    await forceStopAndroidChromeForCdp({ deviceId: input.deviceId });
    prepareAndroidChromeCdp(input);
    await sleep(2_500);
    await dismissAndroidChromeBlockingSurfaces({ deviceId: input.deviceId, attempts: 6 });
    try {
      const endpoint = await waitForAndroidChromeCdpEndpointReady({
        deviceId: input.deviceId,
        cdpPort,
        timeoutMs: 75_000,
      });
      cdpVersion = endpoint.cdpVersion;
      await closeStaleAndroidChromeCdpTargets({ cdpPort, startUrl: input.startUrl });
      browser = await connectAndroidChromeOverCdp({
        cdpUrl: `http://127.0.0.1:${cdpPort}`,
        timeoutMs: 75_000,
      });
      break;
    } catch (error) {
      lastBootstrapError = error;
      await forceStopAndroidChromeForCdp({ deviceId: input.deviceId });
      adbNoThrow(["-s", input.deviceId, "forward", "--remove", `tcp:${cdpPort}`], 10_000);
      await sleep(1_000);
    }
  }
  if (!browser || !cdpVersion) {
    throw lastBootstrapError instanceof Error ? lastBootstrapError : new Error(String(lastBootstrapError));
  }
  const context = browser.contexts()[0] ?? await browser.newContext();
  const matchingPage = context.pages().find((candidate) => sameUrl(candidate.url(), input.startUrl));
  const page = matchingPage ?? context.pages()[0] ?? await context.newPage();
  for (const candidate of context.pages()) {
    if (candidate !== page) await closeStalePage(candidate);
  }
  await page.bringToFront().catch(() => undefined);
  page.setDefaultTimeout(45_000);
  page.setDefaultNavigationTimeout(60_000);
  return {
    browser,
    context,
    page,
    cdpVersion,
    close: async () => {
      await browser.close();
      adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", ANDROID_CHROME_PACKAGE], 10_000);
    },
  };
}
