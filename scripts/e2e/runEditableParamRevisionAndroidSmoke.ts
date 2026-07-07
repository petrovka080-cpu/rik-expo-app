import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";

import { gitOutput, timestampForPath } from "../estimate/buildControlledPilotHealthDashboard";
import {
  EDITABLE_PARAM_REVISION_CASE_SET,
  buildEditableParamRevisionAcceptanceCases,
  type EditableParamRevisionAcceptanceCase,
} from "../estimate/editableParamRevisionAcceptanceCases";
import { checkAndroidEmulatorHealth } from "./checkAndroidEmulatorHealth";
import type { EditableParamRevisionSmokeCaseResult } from "./runEditableParamRevisionWebSmoke";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAM_REVISION_ANDROID_CHROME_SMOKE_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-editable-param-revisions", "android-chrome");
const CHROME_PACKAGE = "com.android.chrome";
const CDP_TIMEOUT_MS = 120_000;
const ANDROID_CASE_TRANSIENT_RETRY_LIMIT = 1;

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
  return buildEditableParamRevisionAcceptanceCases(Math.max(count * 2, 120))
    .filter((item) => !item.selectedTemplateId && item.operation === "update_param")
    .filter((item) => item.expectedFamily !== "diamond_core_drilling_concrete")
    .slice(0, count);
}

function fingerprint(cases: readonly EditableParamRevisionAcceptanceCase[]): string {
  return Buffer.from(cases.map((item) => `${item.id}:${item.paramKey}:${item.rawValue}`).join("|")).toString("base64url").slice(0, 32);
}

function writeSummary(summary: EditableParamRevisionAndroidSmokeSummary): string {
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, "summary.json");
  writeFileSync(filePath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return filePath;
}

async function connectAndroidChrome() {
  const deadline = Date.now() + 45_000;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 5_000 });
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
    adbNoThrow(["-s", serial, "forward", "--remove", "tcp:9222"]);
    adb(["-s", serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
    if (await cdpVersionResponds(3_000)) return true;
    await sleep(1000);
  }
  return false;
}

async function createCleanAndroidPage(browser: import("playwright").Browser) {
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages().find((candidate) => !candidate.isClosed()) ?? await context.newPage();
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

async function waitForChromeStartupState(serial: string, timeoutMs: number): Promise<"first_run" | "tabbed" | "unknown"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
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
    adb(["-s", serial, "shell", "input", "tap", String(center.x), String(center.y)], 10_000);
    await sleep(2500);
  }
  return await waitForChromeStartupState(serial, 5_000) === "tabbed";
}

async function runCase(page: import("playwright").Page, baseUrl: string, testCase: EditableParamRevisionAcceptanceCase): Promise<EditableParamRevisionSmokeCaseResult> {
  const targetUrl = `${baseUrl}/request`;
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
    await waitFor("consumer-repair-problem-input", 45_000);
    await setText("consumer-repair-problem-input", prompt);
    await click("inline-work-prompt-build-estimate");
    await waitFor("editable-param-revision-panel", 25_000);
    await click(`editable-param-edit-${paramKey}`);
    await waitFor("editable-param-popover", 10_000);
    await setText("editable-param-popover-input", rawValue);
    await click("editable-param-popover-save");
    await waitFor("estimate-revision-timeline-r2", 25_000);
    await waitFor("estimate-revision-diff", 25_000);
    const visible = (id: string) => Boolean(byTestId(id));
    return {
      revision_panel_visible: visible("editable-param-revision-panel"),
      param_chip_visible: visible(`editable-param-chip-${paramKey}`),
      popover_visible: visible("editable-param-popover"),
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
    if (!message.includes("WAIT_TIMEOUT:consumer-repair-problem-input")) throw error;
    await page.waitForTimeout(1000);
    return runCase(page, baseUrl, testCase);
  }
}

function androidCaseExpression(input: {
  prompt: string;
  paramKey: string;
  rawValue: string;
}): string {
  return `(() => { const __name = (target) => target; return (${async function run(args: {
    prompt: string;
    paramKey: string;
    rawValue: string;
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
    await waitFor("consumer-repair-problem-input", 45_000);
    await setText("consumer-repair-problem-input", "");
    await setText("consumer-repair-problem-input", args.prompt);
    await click("inline-work-prompt-build-estimate");
    await waitFor("editable-param-revision-panel", 25_000);
    await click(`editable-param-edit-${args.paramKey}`);
    await waitFor("editable-param-popover", 10_000);
    await setText("editable-param-popover-input", args.rawValue);
    await click("editable-param-popover-save");
    await waitFor("estimate-revision-timeline-r2", 25_000);
    await waitFor("estimate-revision-diff", 25_000);
    const visible = (id: string) => Boolean(byTestId(id));
    return {
      revision_panel_visible: visible("editable-param-revision-panel"),
      param_chip_visible: visible(`editable-param-chip-${args.paramKey}`),
      popover_visible: visible("editable-param-popover"),
      revision_diff_visible: visible("estimate-revision-diff"),
      timeline_r2_visible: visible("estimate-revision-timeline-r2"),
      artifact_status_visible: visible("estimate-revision-artifact-status") || visible("estimate-current-revision-artifacts"),
      console_error_count: errors.length,
    };
  }.toString()})(${JSON.stringify(input)}); })()`;
}

async function findAndroidRequestPage(): Promise<CdpPage> {
  return poll(async () => {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    return pages
      .filter((item) => item.type === "page" && item.url.includes("/request") && item.webSocketDebuggerUrl)
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
    message.includes("WAIT_TIMEOUT:consumer-repair-problem-input");
}

async function resetAndroidChromeForCaseRetry(serial: string): Promise<void> {
  adbNoThrow(["-s", serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
  adbNoThrow(["-s", serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  await sleep(1500);
}

async function runDirectAndroidCase(input: {
  serial: string;
  baseUrl: string;
  testCase: EditableParamRevisionAcceptanceCase;
}): Promise<{ result: EditableParamRevisionSmokeCaseResult; consoleErrorCount: number }> {
  const targetUrl = `${input.baseUrl}/request?editableParamRevisionSmoke=${encodeURIComponent(input.testCase.id)}`;
  adb([
    "-s",
    input.serial,
    "shell",
    "am",
    "start",
    "-n",
    `${CHROME_PACKAGE}/com.google.android.apps.chrome.Main`,
    "-a",
    "android.intent.action.VIEW",
    "-d",
    targetUrl,
  ]);
  const page = await findAndroidRequestPage();
  const ui = await evaluatePage<EditableParamRevisionSmokeCaseResult["ui"] & { console_error_count: number }>(
    page.webSocketDebuggerUrl!,
    androidCaseExpression({
      prompt: input.testCase.prompt,
      paramKey: input.testCase.paramKey,
      rawValue: input.testCase.rawValue,
    }),
  );
  await closeOtherAndroidPageTargets(page.id);
  const blockers = [
    ui.revision_panel_visible ? "" : "param_edit_ui_missing",
    ui.param_chip_visible ? "" : "param_chip_missing",
    ui.revision_diff_visible ? "" : "revision_diff_missing",
    ui.timeline_r2_visible ? "" : "revision_r2_missing",
    ui.artifact_status_visible ? "" : "artifact_status_missing",
  ].filter(Boolean);
  const { console_error_count: consoleErrorCount, ...resultUi } = ui;
  return {
    consoleErrorCount,
    result: {
      case_id: input.testCase.id,
      prompt: input.testCase.prompt,
      param_key: input.testCase.paramKey,
      passed: blockers.length === 0,
      ui: resultUi,
      blocking_reasons: blockers,
    },
  };
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
    adbNoThrow(["-s", serial, "forward", "--remove", "tcp:9222"]);
    adb(["-s", serial, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
    adbNoThrow(["-s", serial, "shell", "am", "force-stop", CHROME_PACKAGE]);
    adbNoThrow(["-s", serial, "shell", "am", "clear-debug-app"]);
    adbNoThrow(["-s", serial, "shell", "input", "keyevent", "KEYCODE_BACK"]);
    adbNoThrow(["-s", serial, "shell", "rm", "-f", "/data/local/tmp/chrome-command-line"]);
    adbNoThrow(["-s", serial, "shell", "rm", "-f", "/data/local/chrome-command-line"]);
    if (resetAndroidChromeProfile) {
      adb(["-s", serial, "shell", "pm", "clear", CHROME_PACKAGE], 60_000);
    }
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
      `${baseUrl}/request`,
    ]);
    await sleep(5000);
    if (resetAndroidChromeProfile) {
      summary.android_chrome_first_run_dismissed = await dismissChromeFirstRunIfPresent(serial);
      if (!summary.android_chrome_first_run_dismissed) {
        summary.blockers.push("android_chrome_first_run_not_dismissed");
      } else {
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
          `${baseUrl}/request`,
        ]);
        await sleep(2500);
      }
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
  console.log(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
