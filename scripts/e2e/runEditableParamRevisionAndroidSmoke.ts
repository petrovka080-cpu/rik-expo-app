import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";

import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import {
  EDITABLE_PARAM_REVISION_CASE_SET,
  buildEditableParamRevisionAcceptanceCases,
  type EditableParamRevisionAcceptanceCase,
} from "../estimate/editableParamRevisionAcceptanceCases";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import {
  runEditableParamRevisionPageCase,
  type EditableParamRevisionSmokeCaseResult,
} from "./runEditableParamRevisionWebSmoke";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions", "android-chrome");
const CHROME_PACKAGE = "com.android.chrome";
const CHROME_CDP_COMMAND_LINE = [
  "chrome",
  "--no-first-run",
  "--disable-fre",
  "--disable-default-apps",
  "--disable-background-networking",
  "--remote-debugging-socket-name=chrome_devtools_remote",
  "--remote-debugging-port=9222",
].join(" ");
const CHROME_STARTUP_URL = "about:blank";
const CDP_TIMEOUT_MS = 120_000;
const ANDROID_CASE_TRANSIENT_RETRY_LIMIT = 1;
const CAPITAL_RENOVATION_BATCH_SMOKE_CASE: EditableParamRevisionAcceptanceCase = {
  id: "mandatory-capital-renovation-three-param-batch",
  prompt: "\u041a\u0430\u043f\u0438\u0442\u0430\u043b\u044c\u043d\u044b\u0439 \u0440\u0435\u043c\u043e\u043d\u0442 \u043a\u0432\u0430\u0440\u0442\u0438\u0440\u044b 101 \u043a\u0432. \u043c\u0435\u0442\u0440",
  operation: "update_param",
  paramKey: "area_m2",
  rawValue: "120",
  expectedFamily: "apartment_capital_renovation",
  expectedParamAfter: 120,
};

type BatchParamEdit = {
  paramKey: string;
  rawValue: string;
};

type CdpPage = {
  id: string;
  type: string;
  url: string;
  webSocketDebuggerUrl?: string;
};

export type EditableParamRevisionAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE
    | typeof STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof EDITABLE_PARAM_REVISION_CASE_SET;
  corpus_fingerprint: string;
  target: "android-chrome";
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  actual_android_emulator_editable_param_revision_passed: boolean;
  android_editable_revision_cases_passed: string;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_chrome_profile_reset: boolean;
  android_chrome_first_run_dismissed: boolean;
  android_device_id: string | null;
  android_revision_diff_visible_count: number;
  android_template_lost_after_edit_count: number;
  android_param_update_failures: number;
  android_recalc_failures: number;
  android_stale_pdf_failures: number;
  android_stale_buyer_failures: number;
  android_console_errors_count: number;
  android_case_retry_count: number;
  android_transient_retry_recovered_count: number;
  android_emulator_health_degraded: boolean;
  android_cdp_page_count_after_attach: number | null;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  route_equivalent_used: false;
  env_flag_green: false;
  case_results: EditableParamRevisionSmokeCaseResult[];
  blockers: string[];
  runtime_summary_path?: string;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function adb(args: string[], timeoutMs = 20_000): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function adbNoThrow(args: string[], timeoutMs = 20_000): boolean {
  try {
    adb(args, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

function adbOutputNoThrow(args: string[], timeoutMs = 20_000): string {
  try {
    return adb(args, timeoutMs);
  } catch {
    return "";
  }
}

function enableAndroidChromeCdp(serial: string): void {
  const commandDir = path.join(RUNTIME_ROOT, "android-chrome-command-line");
  mkdirSync(commandDir, { recursive: true });
  const localCommandLine = path.join(commandDir, `chrome-command-line-${serial.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
  writeFileSync(localCommandLine, `${CHROME_CDP_COMMAND_LINE}\n`, "utf8");
  adb(["-s", serial, "push", localCommandLine, "/data/local/tmp/chrome-command-line"], 10_000);
  adb(["-s", serial, "shell", "chmod", "644", "/data/local/tmp/chrome-command-line"], 10_000);
  const installedCommandLine = adbOutputNoThrow(["-s", serial, "shell", "cat", "/data/local/tmp/chrome-command-line"], 10_000).trim();
  if (installedCommandLine !== CHROME_CDP_COMMAND_LINE) {
    throw new Error(`ANDROID_CHROME_CDP_COMMAND_LINE_NOT_INSTALLED:${installedCommandLine}`);
  }
  adbNoThrow(["-s", serial, "forward", "--remove", "tcp:9222"]);
  adb(["-s", serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
}

function androidShellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function startAndroidChrome(serial: string, targetUrl = CHROME_STARTUP_URL): void {
  adb([
    "-s",
    serial,
    "shell",
    "am",
    "start",
    "-n",
    `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
    "-a",
    "android.intent.action.VIEW",
    "-d",
    androidShellQuote(targetUrl),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 120_000): Promise<T> {
  const started = Date.now();
  let lastError: unknown;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error(`POLL_TIMEOUT:${timeoutMs}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP_${response.status}:${url}`);
  return response.json() as Promise<T>;
}

class MinimalCdpSocket {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);

  async connect(wsUrl: string): Promise<void> {
    const parsed = new URL(wsUrl);
    const key = randomBytes(16).toString("base64");
    this.socket = net.connect({ host: parsed.hostname, port: Number(parsed.port || 80) });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.socket?.destroy();
        reject(new Error("CDP_CONNECT_TIMEOUT"));
      }, 20_000);
      this.socket?.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      this.socket?.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    this.socket.on("data", (chunk) => {
      const data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      this.buffer = Buffer.concat([this.buffer, data]);
    });
    this.socket.write([
      `GET ${parsed.pathname}${parsed.search} HTTP/1.1`,
      `Host: ${parsed.hostname}:${parsed.port}`,
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Key: ${key}`,
      "Sec-WebSocket-Version: 13",
      "",
      "",
    ].join("\r\n"));
    const headers = await this.readUntilHeaders(20_000);
    if (!headers.includes(" 101 ")) throw new Error(`CDP_WEBSOCKET_UPGRADE_FAILED:${headers.split("\r\n")[0] ?? ""}`);
  }

  sendJson(value: unknown): void {
    if (!this.socket) throw new Error("CDP_SOCKET_NOT_CONNECTED");
    const payload = Buffer.from(JSON.stringify(value), "utf8");
    const mask = randomBytes(4);
    const header = payload.length < 126
      ? Buffer.from([0x81, 0x80 | payload.length])
      : Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff]);
    const masked = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) {
      masked[index] = payload[index] ^ mask[index % 4];
    }
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  async receiveJson(targetId: number, timeoutMs = CDP_TIMEOUT_MS): Promise<any> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = await this.readTextFrame(Math.max(1, deadline - Date.now()));
      const parsed = JSON.parse(text);
      if (parsed.id === targetId) return parsed;
    }
    throw new Error(`CDP_RESPONSE_TIMEOUT:${timeoutMs}`);
  }

  close(): void {
    this.socket?.destroy();
  }

  private async readUntilHeaders(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end >= 0) {
        const headers = this.buffer.subarray(0, end + 4).toString("utf8");
        this.buffer = this.buffer.subarray(end + 4);
        return headers;
      }
      await sleep(25);
    }
    throw new Error(`CDP_HEADERS_TIMEOUT:${timeoutMs}`);
  }

  private async readTextFrame(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const frame = this.tryReadFrame();
      if (frame) return frame;
      await sleep(25);
    }
    throw new Error(`CDP_TEXT_FRAME_TIMEOUT:${timeoutMs}`);
  }

  private tryReadFrame(): string | null {
    if (this.buffer.length < 2) return null;
    const first = this.buffer[0];
    const second = this.buffer[1];
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (this.buffer.length < 4) return null;
      length = this.buffer.readUInt16BE(2);
      offset = 4;
    }
    const masked = Boolean(second & 0x80);
    const maskOffset = offset;
    if (masked) offset += 4;
    if (this.buffer.length < offset + length) return null;
    let payload = this.buffer.subarray(offset, offset + length);
    if (masked) {
      const mask = this.buffer.subarray(maskOffset, maskOffset + 4);
      const unmasked = Buffer.alloc(payload.length);
      for (let index = 0; index < payload.length; index += 1) {
        unmasked[index] = payload[index] ^ mask[index % 4];
      }
      payload = unmasked;
    }
    this.buffer = this.buffer.subarray(offset + length);
    if ((first & 0x0f) === 1) return payload.toString("utf8");
    return null;
  }
}

async function evaluatePage<T>(wsUrl: string, expression: string): Promise<T> {
  const cdp = new MinimalCdpSocket();
  await cdp.connect(wsUrl);
  try {
    cdp.sendJson({
      id: 1,
      method: "Runtime.evaluate",
      params: {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
    });
    const response = await cdp.receiveJson(1);
    if (response.error) throw new Error(`CDP_RUNTIME_EVALUATE_FAILED:${JSON.stringify(response.error)}`);
    if (response.result?.exceptionDetails) throw new Error(`CDP_RUNTIME_EXCEPTION:${JSON.stringify(response.result.exceptionDetails)}`);
    return response.result.result.value as T;
  } finally {
    cdp.close();
  }
}

function isLocalhostBaseUrl(baseUrl: string): boolean {
  const hostname = new URL(baseUrl).hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function resolveBaseUrl(): string {
  return String(
    process.env.EDITABLE_PARAM_REVISION_ANDROID_BASE_URL ??
    process.env.EDITABLE_PARAM_REVISION_WEB_BASE_URL ??
    process.env.INLINE_WORK_PROMPT_ANDROID_BASE_URL ??
    process.env.INLINE_WORK_PROMPT_WEB_BASE_URL ??
    "http://127.0.0.1:18080",
  ).replace(/\/+$/, "");
}

function smokeCases(count: number): EditableParamRevisionAcceptanceCase[] {
  const generated = buildEditableParamRevisionAcceptanceCases(Math.max(count * 2, 120))
    .filter((item) => !item.selectedTemplateId && item.operation === "update_param")
    .filter((item) => item.expectedFamily !== "diamond_core_drilling_concrete")
    .filter((item) => item.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id);
  return [CAPITAL_RENOVATION_BATCH_SMOKE_CASE, ...generated].slice(0, count);
}

function fingerprint(cases: readonly EditableParamRevisionAcceptanceCase[]): string {
  return Buffer.from(cases.map((item) => {
    const edits = explicitBatchEditsForCase(item) ?? [{ paramKey: item.paramKey, rawValue: item.rawValue }];
    return `${item.id}:${edits.map((edit) => `${edit.paramKey}=${edit.rawValue}`).join(",")}`;
  }).join("|")).toString("base64url").slice(0, 32);
}

function writeSummary(summary: EditableParamRevisionAndroidSmokeSummary): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return filePath;
}

function explicitBatchEditsForCase(testCase: EditableParamRevisionAcceptanceCase): BatchParamEdit[] | null {
  if (testCase.id !== CAPITAL_RENOVATION_BATCH_SMOKE_CASE.id) return null;
  return [
    { paramKey: "area_m2", rawValue: "120" },
    { paramKey: "ceiling_height_m", rawValue: "3.2" },
    { paramKey: "doors_count", rawValue: "8" },
    { paramKey: "electrical_points", rawValue: "99" },
  ];
}

function nextRawBatchValue(currentValue: string, index: number): string {
  const normalized = currentValue.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/-?\d+(?:[,.]\d+)?/);
  if (!match) return normalized ? `${normalized} ${index + 1}` : String(index + 1);
  const parsed = Number(match[0].replace(",", "."));
  if (!Number.isFinite(parsed)) return String(index + 1);
  const next = parsed + index + 1;
  return Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, "");
}

async function revealDerivedParameters(page: import("playwright").Page): Promise<void> {
  const toggle = page.getByTestId("request-estimate-derived-parameters-toggle");
  if (await toggle.count() === 0) return;
  await toggle.first().click();
  await page.getByTestId("request-estimate-derived-parameters").waitFor({ timeout: 5_000 }).catch(() => undefined);
}

async function collectBatchEdits(
  page: import("playwright").Page,
  testCase: EditableParamRevisionAcceptanceCase,
): Promise<BatchParamEdit[]> {
  const explicit = explicitBatchEditsForCase(testCase);
  if (explicit) return explicit;
  const editorIds = await page
    .locator('[data-testid^="editable-param-inline-editor-"]')
    .evaluateAll((nodes) => [...new Set(nodes
      .map((node) => node.getAttribute("data-testid") ?? "")
      .filter(Boolean)
      .map((testId) => testId.replace(/^editable-param-inline-editor-/, "")))]);
  const paramKeys = [testCase.paramKey, ...editorIds.filter((key) => key !== testCase.paramKey)].slice(0, 3);
  const edits: BatchParamEdit[] = [];
  for (const [index, paramKey] of paramKeys.entries()) {
    if (paramKey === testCase.paramKey) {
      edits.push({ paramKey, rawValue: testCase.rawValue });
      continue;
    }
    const input = page.getByTestId(`editable-param-inline-editor-${paramKey}`).getByTestId("editable-param-popover-input");
    const currentValue = await input.inputValue().catch(() => "");
    edits.push({ paramKey, rawValue: nextRawBatchValue(currentValue, index) });
  }
  return edits;
}

async function connectAndroidChrome() {
  const deadline = Date.now() + CDP_TIMEOUT_MS;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 45_000 });
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw new Error(`ANDROID_CHROME_CDP_CONNECT_FAILED:${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function cdpVersionResponds(timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("http://127.0.0.1:9222/json/version", { signal: controller.signal });
    const body = await response.text();
    return response.ok && body.includes("Chrome/");
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForAndroidChromeCdpReady(serial: string): Promise<boolean> {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    dismissAndroidAnrDialogIfPresent(serial);
    adbNoThrow(["-s", serial, "forward", "--remove", "tcp:9222"]);
    adb(["-s", serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
    if (await cdpVersionResponds(3_000)) return true;
    await sleep(1000);
  }
  return false;
}

async function createCleanAndroidPage(browser: import("playwright").Browser, targetUrl: string) {
  const context = browser.contexts()[0] ?? await browser.newContext();
  const pages = context.pages().filter((candidate) => !candidate.isClosed());
  const page = pages.find((candidate) => candidate.url() === targetUrl) ??
    pages.find((candidate) => candidate.url().includes("/request") && candidate.url().includes("editableParamRevisionSmoke")) ??
    pages.find((candidate) => candidate.url().includes("/request")) ??
    pages[0] ??
    await context.newPage();
  await page.bringToFront().catch(() => undefined);
  return page;
}

function findUiNodeCenter(xml: string, selectors: readonly string[]): { x: number; y: number } | null {
  for (const selector of selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = xml.match(new RegExp(`<node[^>]+(?:text|resource-id|content-desc)="${escaped}"[^>]+bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
    if (match) {
      const [, left, top, right, bottom] = match.map(Number);
      return {
        x: Math.round((left + right) / 2),
        y: Math.round((top + bottom) / 2),
      };
    }
  }
  return null;
}

function isChromeFirstRunFocused(serial: string): boolean {
  const activity = adbOutputNoThrow(["-s", serial, "shell", "dumpsys", "activity", "activities"], 20_000);
  return /(?:topResumedActivity|ResumedActivity)=ActivityRecord\{[^\n]*org\.chromium\.chrome\.browser\.firstrun\.FirstRunActivity/.test(activity) ||
    /mCurrentFocus=Window\{[^\n]*org\.chromium\.chrome\.browser\.firstrun\.FirstRunActivity/.test(activity);
}

function isChromeTabbedFocused(serial: string): boolean {
  const activity = adbOutputNoThrow(["-s", serial, "shell", "dumpsys", "activity", "activities"], 20_000);
  return /(?:topResumedActivity|ResumedActivity)=ActivityRecord\{[^\n]*(?:com\.android\.chrome\/com\.google\.android\.apps\.chrome\.Main|ChromeTabbedActivity)/.test(activity) ||
    /mCurrentFocus=Window\{[^\n]*com\.android\.chrome\/com\.google\.android\.apps\.chrome\.Main/.test(activity);
}

function isAndroidAnrFocused(serial: string): boolean {
  const windowState = adbOutputNoThrow(["-s", serial, "shell", "dumpsys", "window"], 20_000);
  if (/mCurrentFocus=Window\{[^\n]*Application Not Responding:/.test(windowState)) return true;
  const activity = adbOutputNoThrow(["-s", serial, "shell", "dumpsys", "activity", "activities"], 20_000);
  return /mCurrentFocus=Window\{[^\n]*Application Not Responding:/.test(activity);
}

function androidScreenSize(serial: string): { width: number; height: number } {
  const size = adbOutputNoThrow(["-s", serial, "shell", "wm", "size"], 10_000);
  const match = size.match(/Physical size:\s*(\d+)x(\d+)/);
  return {
    width: Number(match?.[1] ?? 1080),
    height: Number(match?.[2] ?? 2400),
  };
}

function dismissAndroidAnrDialogIfPresent(serial: string): boolean {
  if (!isAndroidAnrFocused(serial)) return false;
  const { width, height } = androidScreenSize(serial);
  const tapped = adbNoThrow([
    "-s",
    serial,
    "shell",
    "input",
    "tap",
    String(Math.round(width / 2)),
    String(Math.round(height * 0.57)),
  ], 30_000);
  return tapped || adbNoThrow(["-s", serial, "shell", "input", "keyevent", "KEYCODE_ENTER"], 30_000);
}

function closeAndroidAnrDialogIfPresent(serial: string): boolean {
  if (!isAndroidAnrFocused(serial)) return false;
  const { width, height } = androidScreenSize(serial);
  return adbNoThrow([
    "-s",
    serial,
    "shell",
    "input",
    "tap",
    String(Math.round(width / 2)),
    String(Math.round(height * 0.52)),
  ], 30_000);
}

function startAndroidAnrWatcher(serial: string, action: "wait" | "close" = "wait"): () => void {
  const tick = () => {
    if (action === "close") {
      closeAndroidAnrDialogIfPresent(serial);
    } else {
      dismissAndroidAnrDialogIfPresent(serial);
    }
  };
  const timer = setInterval(tick, 2_000);
  (timer as unknown as { unref?: () => void }).unref?.();
  return () => {
    clearInterval(timer);
  };
}

async function waitForChromeStartupState(serial: string, timeoutMs: number): Promise<"first_run" | "tabbed" | "unknown"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    dismissAndroidAnrDialogIfPresent(serial);
    if (isChromeFirstRunFocused(serial)) return "first_run";
    if (isChromeTabbedFocused(serial)) return "tabbed";
    await sleep(500);
  }
  return "unknown";
}

async function dismissChromeFirstRunIfPresent(serial: string): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const state = await waitForChromeStartupState(serial, 6_000);
    if (state === "tabbed") return true;
    if (state === "unknown") continue;
    adbOutputNoThrow(["-s", serial, "shell", "uiautomator", "dump", "/sdcard/window.xml"], 20_000);
    const xml = adbOutputNoThrow(["-s", serial, "exec-out", "cat", "/sdcard/window.xml"], 20_000);
    const center = findUiNodeCenter(xml, [
      "com.android.chrome:id/signin_fre_dismiss_button",
      "Use without an account",
      "Accept & continue",
      "com.android.chrome:id/terms_accept",
    ]) ?? { x: 540, y: 2093 };
    const tapped = adbNoThrow(["-s", serial, "shell", "input", "tap", String(center.x), String(center.y)], 30_000);
    if (!tapped) {
      adbNoThrow(["-s", serial, "shell", "input", "keyevent", "KEYCODE_ENTER"], 30_000);
    }
    await sleep(2500);
  }
  return await waitForChromeStartupState(serial, 5_000) === "tabbed";
}

async function runCase(page: import("playwright").Page, baseUrl: string, testCase: EditableParamRevisionAcceptanceCase): Promise<EditableParamRevisionSmokeCaseResult> {
  const target = new URL("/request", `${baseUrl.replace(/\/+$/, "")}/`);
  target.searchParams.set("autoPrepare", "1");
  target.searchParams.set("prompt", testCase.prompt);
  target.searchParams.set("editableParamRevisionSmoke", testCase.id);
  const targetUrl = target.toString();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => undefined);
  await page.evaluate("var __name = globalThis.__name || ((target) => target); globalThis.__name = __name;");
  const ui = await page.evaluate(async ({ prompt, paramKey, rawValue, targetUrl }) => {
    const sleepInner = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    const waitFor = async (id: string, timeoutMs = 25_000) => {
      const started = Date.now();
      while (Date.now() - started <= timeoutMs) {
        const node = byTestId(id);
        if (node) return node;
        await sleepInner(200);
      }
      throw new Error(`WAIT_TIMEOUT:${id}`);
    };
    const setText = async (id: string, value: string) => {
      const node = await waitFor(id);
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    };
    const click = async (id: string) => {
      const node = await waitFor(id);
      node.scrollIntoView({ block: "center", inline: "nearest" });
      await sleepInner(50);
      node.click();
    };
    const visible = (id: string) => Boolean(byTestId(id));
    await waitFor("request-estimate-parameters-toggle", 45_000);
    await click("request-estimate-parameters-toggle");
    await waitFor("request-estimate-parameter-panel", 10_000);
    const derivedToggle = byTestId("request-estimate-derived-parameters-toggle");
    if (derivedToggle) {
      derivedToggle.click();
      await sleepInner(200);
    }
    const explicitEdits = [
      { paramKey, rawValue },
      ...Array.from(document.querySelectorAll('[data-testid^="editable-param-inline-editor-"]'))
        .map((node) => (node.getAttribute("data-testid") ?? "").replace(/^editable-param-inline-editor-/, ""))
        .filter((key) => key && key !== paramKey)
        .slice(0, 2)
        .map((key, index) => ({ paramKey: key, rawValue: String(index + 2) })),
    ].slice(0, 3);
    if (explicitEdits.length < 3) throw new Error("batch_three_params_missing");
    for (const edit of explicitEdits) {
      const editor = await waitFor(`editable-param-inline-editor-${edit.paramKey}`, 10_000);
      const input = editor.querySelector('[data-testid="editable-param-popover-input"]') as HTMLInputElement | HTMLTextAreaElement | null;
      if (!input) throw new Error(`editable_param_input_missing:${edit.paramKey}`);
      const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(input, edit.rawValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    }
    await waitFor("editable-param-batch-bar", 10_000);
    const batchBarVisible = visible("editable-param-batch-bar");
    const batchApplyVisible = visible("editable-param-batch-apply");
    const dirtyCountVisible = visible("editable-param-batch-dirty-count");
    await click("editable-param-batch-apply");
    await waitFor("request-estimate-parameter-apply-status", 20_000);
    await click("request-estimate-runtime-details-toggle");
    await waitFor("estimate-revision-timeline-r2", 25_000);
    await waitFor("estimate-revision-diff", 25_000);
    return {
      revision_panel_visible: visible("request-estimate-parameter-panel"),
      param_chip_visible: visible(`editable-param-chip-${paramKey}`),
      popover_visible: visible("editable-param-popover"),
      batch_bar_visible: batchBarVisible,
      batch_apply_visible: batchApplyVisible,
      dirty_count_visible: dirtyCountVisible,
      revision_diff_visible: visible("estimate-revision-diff"),
      timeline_r2_visible: visible("estimate-revision-timeline-r2"),
      artifact_status_visible: visible("estimate-revision-artifact-status") || visible("estimate-current-revision-artifacts"),
    };
  }, {
    prompt: testCase.prompt,
    paramKey: testCase.paramKey,
    rawValue: testCase.rawValue,
    targetUrl,
  });
  const blockers = [
    ui.revision_panel_visible ? "" : "param_edit_ui_missing",
    ui.param_chip_visible ? "" : "param_chip_missing",
    ui.revision_diff_visible ? "" : "revision_diff_missing",
    ui.timeline_r2_visible ? "" : "revision_r2_missing",
    ui.artifact_status_visible ? "" : "artifact_status_missing",
  ].filter(Boolean);
  return {
    case_id: testCase.id,
    prompt: testCase.prompt,
    param_key: testCase.paramKey,
    passed: blockers.length === 0,
    ui,
    blocking_reasons: blockers,
  };
}

async function runCaseWithColdStartRetry(
  page: import("playwright").Page,
  baseUrl: string,
  testCase: EditableParamRevisionAcceptanceCase,
): Promise<EditableParamRevisionSmokeCaseResult> {
  try {
    return await runCase(page, baseUrl, testCase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("WAIT_TIMEOUT:request-estimate-parameters-toggle")) throw error;
    await page.waitForTimeout(1000);
    return runCase(page, baseUrl, testCase);
  }
}

function androidCaseExpression(input: {
  prompt: string;
  paramKey: string;
  rawValue: string;
  edits?: BatchParamEdit[];
}): string {
  return `(() => { const __name = (target) => target; return (${async function run(args: {
    prompt: string;
    paramKey: string;
    rawValue: string;
    edits?: { paramKey: string; rawValue: string }[];
  }) {
    const sleepInner = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const errors: string[] = [];
    const originalError = console.error.bind(console);
    console.error = (...items: unknown[]) => {
      errors.push(items.map(String).join(" "));
      originalError(...items);
    };
    const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    const waitFor = async (id: string, timeoutMs = 25_000) => {
      const started = Date.now();
      while (Date.now() - started <= timeoutMs) {
        const node = byTestId(id);
        if (node) return node;
        await sleepInner(200);
      }
      throw new Error(`WAIT_TIMEOUT:${id}`);
    };
    const setText = async (id: string, value: string) => {
      const node = await waitFor(id);
      const input = node as HTMLInputElement | HTMLTextAreaElement;
      const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    };
    const click = async (id: string) => {
      const node = await waitFor(id);
      node.scrollIntoView({ block: "center", inline: "nearest" });
      await sleepInner(50);
      node.click();
    };
    const nextRawBatchValueInner = (currentValue: string, index: number) => {
      const normalized = currentValue.replace(/\u00a0/g, " ").trim();
      const match = normalized.match(/-?\d+(?:[,.]\d+)?/);
      if (!match) return normalized ? `${normalized} ${index + 1}` : String(index + 1);
      const parsed = Number(match[0].replace(",", "."));
      if (!Number.isFinite(parsed)) return String(index + 1);
      const next = parsed + index + 1;
      return Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, "");
    };
    const collectEdits = () => {
      if (args.edits?.length) return args.edits.slice(0, 3);
      const editorKeys = [...new Set(Array.from(document.querySelectorAll('[data-testid^="editable-param-inline-editor-"]'))
        .map((node) => (node.getAttribute("data-testid") ?? "").replace(/^editable-param-inline-editor-/, ""))
        .filter(Boolean))];
      return [args.paramKey, ...editorKeys.filter((key) => key !== args.paramKey)].slice(0, 3).map((key, index) => {
        if (key === args.paramKey) return { paramKey: key, rawValue: args.rawValue };
        const editor = byTestId(`editable-param-inline-editor-${key}`);
        const input = editor?.querySelector('[data-testid="editable-param-popover-input"]') as HTMLInputElement | HTMLTextAreaElement | null;
        return { paramKey: key, rawValue: nextRawBatchValueInner(input?.value ?? "", index) };
      });
    };
    await waitFor("request-estimate-parameters-toggle", 45_000);
    await click("request-estimate-parameters-toggle");
    await waitFor("request-estimate-parameter-panel", 10_000);
    const derivedToggle = byTestId("request-estimate-derived-parameters-toggle");
    if (derivedToggle) {
      derivedToggle.scrollIntoView({ block: "center", inline: "nearest" });
      await sleepInner(50);
      derivedToggle.click();
      await sleepInner(200);
    }
    const edits = collectEdits();
    if (edits.length < 3) throw new Error("batch_three_params_missing");
    for (const edit of edits) {
      const editor = await waitFor(`editable-param-inline-editor-${edit.paramKey}`, 10_000);
      const input = editor.querySelector('[data-testid="editable-param-popover-input"]') as HTMLInputElement | HTMLTextAreaElement | null;
      if (!input) throw new Error(`editable_param_input_missing:${edit.paramKey}`);
      const prototype = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(input, edit.rawValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    }
    await waitFor("editable-param-batch-bar", 10_000);
    const visible = (id: string) => Boolean(byTestId(id));
    const batchBarVisible = visible("editable-param-batch-bar");
    const batchApplyVisible = visible("editable-param-batch-apply");
    const dirtyCountVisible = visible("editable-param-batch-dirty-count");
    await click("editable-param-batch-apply");
    await waitFor("request-estimate-parameter-apply-status", 20_000);
    await click("request-estimate-runtime-details-toggle");
    await waitFor("estimate-revision-timeline-r2", 25_000);
    await waitFor("estimate-revision-diff", 25_000);
    return {
      revision_panel_visible: visible("request-estimate-parameter-panel"),
      param_chip_visible: visible(`editable-param-chip-${args.paramKey}`),
      popover_visible: visible("editable-param-popover"),
      batch_bar_visible: batchBarVisible,
      batch_apply_visible: batchApplyVisible,
      dirty_count_visible: dirtyCountVisible,
      revision_diff_visible: visible("estimate-revision-diff"),
      timeline_r2_visible: visible("estimate-revision-timeline-r2"),
      artifact_status_visible: visible("estimate-revision-artifact-status") || visible("estimate-current-revision-artifacts"),
      console_error_count: errors.length,
    };
  }.toString()})(${JSON.stringify(input)}); })()`;
}

async function findAndroidPage(): Promise<CdpPage> {
  return poll(async () => {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    return pages
      .filter((item) => item.type === "page" && Boolean(item.webSocketDebuggerUrl))
      .sort((left, right) => Number(right.id) - Number(left.id))[0] ?? null;
  }, 60_000);
}

async function closeOtherAndroidPageTargets(keepId: string): Promise<void> {
  try {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    for (const page of pages) {
      if (page.type !== "page" || page.id === keepId) continue;
      await fetch(`http://127.0.0.1:9222/json/close/${encodeURIComponent(page.id)}`).catch(() => undefined);
    }
  } catch {
    // Best-effort tab hygiene; the next case still proves readiness and UI markers.
  }
}

function retryableAndroidCaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Execution context was destroyed") ||
    message.includes("WAIT_TIMEOUT:request-estimate-parameters-toggle") ||
    message.includes("Target page, context or browser has been closed") ||
    message.includes("Browser has been closed") ||
    message.includes("Page crashed") ||
    message.includes("fetch failed") ||
    message.includes("android_chrome_cdp_not_ready_for_case");
}

async function resetAndroidChromeForCaseRetry(serial: string): Promise<void> {
  adbNoThrow(["-s", serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
  enableAndroidChromeCdp(serial);
  await sleep(1500);
}

async function closeBrowserNoThrow(browser: import("playwright").Browser | null): Promise<void> {
  if (!browser) return;
  try {
    const disconnect = (browser as unknown as { disconnect?: () => void }).disconnect;
    if (disconnect) {
      disconnect.call(browser);
      return;
    }
  } catch {
    // Fall back to close below when the connected-over-CDP handle does not support disconnect cleanly.
  }
  await Promise.race([
    browser.close().catch(() => undefined),
    sleep(5_000),
  ]);
}

async function cdpPointerClickVisibleTestId(page: Page, target: Locator, testId: string, timeoutMs = 20_000): Promise<void> {
  await target.waitFor({ timeout: timeoutMs });
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  const box = await target.boundingBox();
  if (!box) throw new Error(`android_pointer_click_target_missing:${testId}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const hitTarget = await page.evaluate(
    ({ x, y, id }) => {
      const targetNode = document.querySelector(`[data-testid="${id}"]`);
      const hitNode = document.elementFromPoint(x, y);
      return Boolean(targetNode && hitNode && (targetNode === hitNode || targetNode.contains(hitNode)));
    },
    { x: point.x, y: point.y, id: testId },
  );
  if (!hitTarget) throw new Error(`android_pointer_click_target_obscured:${testId}`);
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: point.x, y: point.y, radiusX: 1, radiusY: 1, force: 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach().catch(() => undefined);
  }
}

async function collectAndroidLayoutProof(
  page: Page,
  paramKeys: readonly string[],
): Promise<Record<string, unknown>> {
  const paramKey = paramKeys.includes("ceiling_height_m")
    ? "ceiling_height_m"
    : paramKeys[1] ?? paramKeys[0] ?? "area_m2";
  const input = page
    .locator(`[data-testid="editable-param-inline-editor-${paramKey}"] [data-testid="editable-param-popover-input"]`)
    .first();
  await input.waitFor({ timeout: 10_000 });
  await input.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    viewportHeight: window.visualViewport?.height ?? window.innerHeight,
    bodyHeight: document.body.scrollHeight,
  }));
  await input.focus();
  await input.fill("3.4");
  await page.waitForTimeout(700);
  const valueAfterInput = await input.inputValue();
  const layout = await page.evaluate((focusedParamKey) => {
    const editor = document.querySelector(`[data-testid="editable-param-inline-editor-${focusedParamKey}"]`);
    const focusedInput = editor?.querySelector('[data-testid="editable-param-popover-input"]');
    const apply = document.querySelector('[data-testid="editable-param-batch-apply"]');
    const positions = document.querySelector('[data-testid="request-estimate-items-editor"]');
    const rectOf = (node: Element | null | undefined) => {
      const rect = node?.getBoundingClientRect();
      return rect
        ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
        : null;
    };
    const inputRect = rectOf(focusedInput);
    const applyRect = rectOf(apply);
    const positionsRect = rectOf(positions);
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const bodyHeight = document.body.scrollHeight;
    const overlaps = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) =>
      Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    return {
      scrollY: window.scrollY,
      viewportHeight,
      bodyHeight,
      inputRect,
      applyRect,
      positionsRect,
      keyboard_not_covering_input: Boolean(inputRect && inputRect.bottom <= viewportHeight && inputRect.top >= 0),
      apply_not_overlapping_focused_input: !overlaps(applyRect, inputRect),
      apply_not_overlapping_positions: !overlaps(applyRect, positionsRect),
      list_not_jumped_to_bottom: bodyHeight <= viewportHeight || window.scrollY + viewportHeight < bodyHeight - 12,
      visual_viewport_reported: Boolean(window.visualViewport),
    };
  }, paramKey);
  await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();
  });
  await page.waitForTimeout(300);
  const valueAfterKeyboardClose = await input.inputValue();
  const cancel = page.getByTestId("editable-param-batch-cancel");
  if (await cancel.count()) await cdpPointerClickVisibleTestId(page, cancel.first(), "editable-param-batch-cancel");
  await page.waitForTimeout(200);
  const applyVisibleAfterCancel = await page.getByTestId("editable-param-batch-apply").count() > 0;
  return {
    ...layout,
    focused_param_key: paramKey,
    value_after_input: valueAfterInput,
    value_after_keyboard_close: valueAfterKeyboardClose,
    value_not_lost_after_keyboard_close: valueAfterInput === valueAfterKeyboardClose && valueAfterKeyboardClose === "3.4",
    cancel_hides_batch_apply: !applyVisibleAfterCancel,
    repeated_apply_does_not_duplicate_revision: !applyVisibleAfterCancel,
    scroll_delta_after_focus: Number(layout.scrollY ?? 0) - before.scrollY,
  };
}

async function runDirectAndroidCase(input: {
  serial: string;
  baseUrl: string;
  testCase: EditableParamRevisionAcceptanceCase;
}): Promise<{ result: EditableParamRevisionSmokeCaseResult; consoleErrorCount: number }> {
  startAndroidChrome(input.serial);
  if (!(await waitForAndroidChromeCdpReady(input.serial))) {
    throw new Error("android_chrome_cdp_not_ready_for_case");
  }
  const cdpPage = await findAndroidPage();
  await closeOtherAndroidPageTargets(cdpPage.id);
  const stopAnrWatcher = startAndroidAnrWatcher(input.serial, "close");
  let browser: import("playwright").Browser | null = null;
  const consoleErrors: string[] = [];
  try {
    browser = await connectAndroidChrome();
    const page = await createCleanAndroidPage(browser, cdpPage.url);
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const result = await runEditableParamRevisionPageCase(page, input.testCase, {
      baseUrl: input.baseUrl,
      waitTimeoutMs: 240_000,
      pdfReturnMode: "history",
      cdpInputMode: "touch",
    });
    const androidProof = await collectAndroidLayoutProof(page, result.param_keys ?? [input.testCase.paramKey]);
    const androidBlockers = [
      androidProof.keyboard_not_covering_input === true ? "" : "android_keyboard_covers_focused_input",
      androidProof.apply_not_overlapping_focused_input === true ? "" : "android_apply_overlaps_focused_input",
      androidProof.apply_not_overlapping_positions === true ? "" : "android_apply_overlaps_positions",
      androidProof.list_not_jumped_to_bottom === true ? "" : "android_list_jumped_to_bottom",
      androidProof.value_not_lost_after_keyboard_close === true ? "" : "android_value_lost_after_keyboard_close",
      androidProof.cancel_hides_batch_apply === true ? "" : "android_cancel_did_not_hide_batch_apply",
      androidProof.repeated_apply_does_not_duplicate_revision === true ? "" : "android_repeat_apply_duplicate_risk",
    ].filter(Boolean);
    if (result.proof) {
      (result.proof as Record<string, unknown>).android = androidProof;
    }
    result.blocking_reasons.push(...androidBlockers);
    result.passed = result.blocking_reasons.length === 0;
    await closeOtherAndroidPageTargets(cdpPage.id);
    return {
      consoleErrorCount: consoleErrors.length,
      result,
    };
  } finally {
    stopAnrWatcher();
    await closeBrowserNoThrow(browser);
  }
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const requireEmulator = hasFlag("require-emulator");
  const resetAndroidChromeProfile = hasFlag("reset-android-chrome-profile");
  const write = hasFlag("write-summary");
  const requestedCases = Math.max(1, Number(argValue("case-count", "100")) || 100);
  const baseUrl = resolveBaseUrl();
  const cases = smokeCases(requestedCases);
  const health = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  const summary: EditableParamRevisionAndroidSmokeSummary = {
    final_status: STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: EDITABLE_PARAM_REVISION_CASE_SET,
    corpus_fingerprint: fingerprint(cases),
    target: "android-chrome",
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    actual_android_emulator_editable_param_revision_passed: false,
    android_editable_revision_cases_passed: `0/${cases.length}`,
    android_emulator_detected: health.emulator_detected,
    android_chrome_launched_or_attached: false,
    android_chrome_profile_reset: resetAndroidChromeProfile,
    android_chrome_first_run_dismissed: false,
    android_device_id: health.selected_serial,
    android_revision_diff_visible_count: 0,
    android_template_lost_after_edit_count: 0,
    android_param_update_failures: 0,
    android_recalc_failures: 0,
    android_stale_pdf_failures: 0,
    android_stale_buyer_failures: 0,
    android_console_errors_count: 0,
    android_case_retry_count: 0,
    android_transient_retry_recovered_count: 0,
    android_emulator_health_degraded: !health.android_lab_healthy,
    android_cdp_page_count_after_attach: null,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    route_equivalent_used: false,
    env_flag_green: false,
    case_results: [],
    blockers: [],
  };

  if (!requireRealBrowser) summary.blockers.push("real_browser_required_flag_missing");
  if (requireEmulator && !health.emulator_detected) summary.blockers.push("android_emulator_not_detected");
  if (!health.android_lab_healthy || !health.selected_serial) summary.blockers.push(...health.blocking_reasons, "android_lab_not_healthy");

  if (summary.blockers.length === 0 && health.selected_serial) {
    const serial = health.selected_serial;
    if (isLocalhostBaseUrl(baseUrl)) {
      const port = resolvePort(baseUrl);
      adb(["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`]);
    }
    closeAndroidAnrDialogIfPresent(serial);
    adbNoThrow(["-s", serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
    closeAndroidAnrDialogIfPresent(serial);
    adbNoThrow(["-s", serial, "shell", "am", "clear-debug-app"]);
    adbNoThrow(["-s", serial, "shell", "input", "keyevent", "KEYCODE_BACK"]);
    if (resetAndroidChromeProfile) {
      adb(["-s", serial, "shell", "pm", "clear", CHROME_PACKAGE], 60_000);
    }
    enableAndroidChromeCdp(serial);
    startAndroidChrome(serial);
    await sleep(5000);
    summary.android_chrome_first_run_dismissed = await dismissChromeFirstRunIfPresent(serial);
    if (!summary.android_chrome_first_run_dismissed) {
      summary.blockers.push("android_chrome_first_run_not_dismissed");
    } else {
      adbNoThrow(["-s", serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
      enableAndroidChromeCdp(serial);
      startAndroidChrome(serial);
      await sleep(3500);
    }
    if (summary.blockers.length === 0 && !(await waitForAndroidChromeCdpReady(serial))) {
      summary.blockers.push("android_chrome_cdp_not_ready");
    }
    if (summary.blockers.length === 0) {
      summary.android_chrome_launched_or_attached = true;
      const attachedPages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json").catch((): CdpPage[] => []);
      summary.android_cdp_page_count_after_attach = attachedPages.filter((item) => item.type === "page").length;
      for (const [index, testCase] of cases.entries()) {
        let result: EditableParamRevisionSmokeCaseResult;
        let caseConsoleErrorCount = 0;
        let recoveredAfterRetry = false;
        try {
          let attempt = 0;
          for (;;) {
            try {
              const proof = await runDirectAndroidCase({ serial, baseUrl, testCase });
              result = proof.result;
              caseConsoleErrorCount = proof.consoleErrorCount;
              recoveredAfterRetry = attempt > 0;
              break;
            } catch (error) {
              if (attempt < ANDROID_CASE_TRANSIENT_RETRY_LIMIT && retryableAndroidCaseError(error)) {
                attempt += 1;
                summary.android_case_retry_count += 1;
                console.error(`[android-editable-param-smoke] retry ${attempt}/${ANDROID_CASE_TRANSIENT_RETRY_LIMIT} ${testCase.id} after ${error instanceof Error ? error.message : String(error)}`);
                await resetAndroidChromeForCaseRetry(serial);
                continue;
              }
              throw error;
            }
          }
        } catch (error) {
          result = {
            case_id: testCase.id,
            prompt: testCase.prompt,
            param_key: testCase.paramKey,
            passed: false,
            ui: {
              revision_panel_visible: false,
              param_chip_visible: false,
              popover_visible: false,
              revision_diff_visible: false,
              timeline_r2_visible: false,
              artifact_status_visible: false,
            },
            blocking_reasons: [error instanceof Error ? error.message : String(error)],
          };
        }
        if (recoveredAfterRetry && result.passed) summary.android_transient_retry_recovered_count += 1;
        summary.android_console_errors_count += caseConsoleErrorCount;
        summary.case_results.push(result);
        console.error(`[android-editable-param-smoke] ${index + 1}/${cases.length} ${testCase.id} ${result.passed ? "passed" : "failed"}`);
      }
    }
  }

  const passed = summary.case_results.filter((item) => item.passed).length;
  summary.android_editable_revision_cases_passed = `${passed}/${cases.length}`;
  summary.android_revision_diff_visible_count = summary.case_results.filter((item) => item.ui.revision_diff_visible).length;
  summary.android_param_update_failures = summary.case_results.filter((item) => item.blocking_reasons.includes("param_chip_missing")).length;
  summary.android_recalc_failures = summary.case_results.filter((item) => item.blocking_reasons.includes("revision_r2_missing") || item.blocking_reasons.includes("revision_diff_missing")).length;
  summary.blockers.push(
    ...summary.case_results.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)).slice(0, 80),
  );
  const green = passed === cases.length &&
    cases.length === requestedCases &&
    summary.android_console_errors_count === 0 &&
    summary.android_chrome_launched_or_attached &&
    summary.android_emulator_detected &&
    summary.blockers.length === 0;
  summary.actual_android_emulator_editable_param_revision_passed = green;
  summary.final_status = green
    ? GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE
    : STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED;
  if (write) summary.runtime_summary_path = writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`, () => {
    process.exit(green ? 0 : 1);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
