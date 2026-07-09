import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { checkAndroidEmulatorHealth, STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN } from "./checkAndroidEmulatorHealth";
import { argValue, hasFlag, isLocalhostBaseUrl, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";
import { adbNoThrow, ensureWave2CAndroidWebServer } from "./runWave2CExpandedBoqAndroidSmoke";

export const GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE_FAILED" as const;
export const STOP_ANDROID_EMULATOR_PARAMETER_HISTORY_EVIDENCE_MISSING_NO_GREEN =
  "STOP_ANDROID_EMULATOR_PARAMETER_HISTORY_EVIDENCE_MISSING_NO_GREEN" as const;

const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-parameter-durable-history", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8104";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const HISTORY_TARGET = 25;
const CDP_TIMEOUT_MS = 360_000;
const ADB_TIMEOUT_MS = 20_000;
const BASE_PROMPT =
  "\u0412\u0435\u043d\u0442\u0444\u0430\u0441\u0430\u0434 1500 \u043c2 \u0432\u044b\u0441\u043e\u0442\u0430 40 \u043c \u0443\u0442\u0435\u043f\u043b\u0435\u043d\u0438\u0435 100 \u043c\u043c";

type CdpPage = {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type AndroidFlowProof = {
  android_dirty_storage_profile_used: boolean;
  android_parameter_cards_visible: boolean;
  android_parameter_cards_are_clickable: boolean;
  android_parameter_cards_edit_inline: boolean;
  android_parameter_card_edited_key: string | null;
  android_parameter_edit_recalculates_boq: boolean;
  android_created_estimates_count: number;
  android_history_existing_count_before_create: number;
  android_history_expected_total_count_after_create: number;
  android_history_total_count_after_create: number;
  android_all_created_estimates_preserved: boolean;
  android_history_count_reaches_25: boolean;
  android_history_not_limited_to_13: boolean;
  android_console_errors_count: number;
  android_visible_english_words_count: number;
  android_raw_internal_ids_visible_count: number;
  first_phase_error: string | null;
};

type AndroidReloadProof = {
  android_history_persists_after_reload: boolean;
  android_pdf_from_history_passed: boolean;
  android_buyer_package_from_history_passed: boolean;
  second_phase_error: string | null;
};

export type AiEstimateParameterDurableHistoryAndroidSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE_FAILED
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
    | typeof STOP_ANDROID_EMULATOR_PARAMETER_HISTORY_EVIDENCE_MISSING_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: "parameter-durable-history";
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  web_server_started_by_runner: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  android_dirty_storage_profile_used: boolean;
  actual_android_emulator_parameter_durable_history_smoke_passed: boolean;
  android_parameter_cards_visible: boolean;
  android_parameter_cards_are_clickable: boolean;
  android_parameter_cards_edit_inline: boolean;
  android_parameter_card_edited_key: string | null;
  android_parameter_edit_recalculates_boq: boolean;
  android_created_estimates_count: number;
  android_history_existing_count_before_create: number;
  android_history_expected_total_count_after_create: number;
  android_history_total_count_after_create: number;
  android_all_created_estimates_preserved: boolean;
  android_history_count_reaches_25: boolean;
  android_history_not_limited_to_13: boolean;
  android_history_persists_after_reload: boolean;
  android_pdf_from_history_passed: boolean;
  android_buyer_package_from_history_passed: boolean;
  android_visible_english_words_count: number;
  android_raw_internal_ids_visible_count: number;
  android_console_errors_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
  exact_artifact_paths: {
    android_summary: string;
  };
};

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
  throw new Error("poll_timeout");
}

function adb(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
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

async function navigatePage(wsUrl: string, targetUrl: string): Promise<void> {
  const cdp = new MinimalCdpSocket();
  await cdp.connect(wsUrl);
  try {
    cdp.sendJson({ id: 1, method: "Page.enable" });
    const enable = await cdp.receiveJson(1, 20_000);
    if (enable.error) throw new Error(`CDP_PAGE_ENABLE_FAILED:${JSON.stringify(enable.error)}`);
    cdp.sendJson({ id: 2, method: "Page.navigate", params: { url: targetUrl } });
    const navigate = await cdp.receiveJson(2, 20_000);
    if (navigate.error) throw new Error(`CDP_PAGE_NAVIGATE_FAILED:${JSON.stringify(navigate.error)}`);
  } finally {
    cdp.close();
  }
}

function primaryFlowExpression(input: { basePrompt: string; historyTarget: number; storageKey: string }): string {
  return `(() => { const __name = (target) => target; return (${async function run(args: { basePrompt: string; historyTarget: number; storageKey: string }) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const errors: string[] = [];
    const originalError = console.error.bind(console);
    console.error = (...items: unknown[]) => {
      errors.push(items.map(String).join(" "));
      originalError(...items);
    };
    const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    const count = (selector: string) => document.querySelectorAll(selector).length;
    const waitFor = async (id: string, timeoutMs = 90000) => {
      const started = Date.now();
      while (Date.now() - started <= timeoutMs) {
        const node = byTestId(id);
        if (node) return node;
        await sleep(250);
      }
      throw new Error(`WAIT_TIMEOUT:${id}`);
    };
    const waitUntil = async (fn: () => boolean, timeoutMs = 60000) => {
      const started = Date.now();
      while (Date.now() - started <= timeoutMs) {
        if (fn()) return true;
        await sleep(250);
      }
      return false;
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
    const click = async (id: string, timeoutMs = 90000) => {
      const node = await waitFor(id, timeoutMs);
      node.scrollIntoView({ block: "center" });
      node.click();
    };
    const clickNode = (node: Element | null) => {
      if (!node) throw new Error("CLICK_NODE_MISSING");
      (node as HTMLElement).scrollIntoView({ block: "center" });
      (node as HTMLElement).click();
    };
    const expandDeliveryFieldsIfNeeded = async () => {
      if (byTestId("consumer-repair-phone-input")) return;
      byTestId("consumer-repair-delivery-summary")?.click();
      await waitFor("consumer-repair-phone-input", 45000);
    };
    const quantityValues = () => Array.from(document.querySelectorAll("[data-testid^='consumer-repair-item-quantity-input-']"))
      .map((node) => String((node as HTMLInputElement).value ?? ""));
    const valuesChanged = (left: string[], right: string[]) => left.length > 0 && right.length > 0 && left.join("|") !== right.join("|");
    const historyCount = () => Number((byTestId("consumer-repair-history-approved-count")?.innerText ?? "").replace(/[^0-9]/g, ""));
    const countRawInternalIds = (text: string) => (text.match(/\b[a-z][a-z0-9]+_[a-z0-9_]+\b|\b(?:sourceParameters|source_parameters|formula_id|template_id|round_to|PRICE_MISSING)\b/gi) ?? []).length;
    const countVisibleEnglishWords = (text: string) => (text.replace(/\bPDF\b/g, "").match(/\b(?:user|input|catalog|default|source|price|missing|formula|template|round|area|length|height|width)\b/gi) ?? []).length;
    try {
      window.localStorage.removeItem(args.storageKey);
      const durablePrefix = "rik.consumer_repair.request_bundle.v2:";
      const approvedHistoryStatuses = new Set(["consumer_approved", "sent_to_marketplace", "archived"]);
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (!key?.startsWith(durablePrefix)) continue;
        try {
          const bundle = JSON.parse(window.localStorage.getItem(key) ?? "null");
          const status = bundle?.draft?.status;
          if (!approvedHistoryStatuses.has(status)) window.localStorage.removeItem(key);
        } catch {
          window.localStorage.removeItem(key);
        }
      }
      for (let index = 0; index < 120; index += 1) {
        window.localStorage.setItem(`parameter.android.dirty.fragment.${index}`, "x".repeat(index % 3 === 0 ? 64 : 7));
      }
      await waitFor("consumer-repair-problem-input");
      let editedKey: string | null = null;
      let cardsVisible = false;
      let cardsClickable = false;
      let editInline = false;
      let recalculatesBoq = false;
      const baselineApprovedCount = historyCount();
      for (let index = 1; index <= args.historyTarget; index += 1) {
        if (!byTestId("consumer-repair-delivery-summary")) {
          await expandDeliveryFieldsIfNeeded();
          await setText("consumer-repair-city-input", "\u0411\u0438\u0448\u043a\u0435\u043a");
          await setText("consumer-repair-address-input", "parameter-android-redacted-address");
          await setText("consumer-repair-time-input", "\u0421\u0435\u0433\u043e\u0434\u043d\u044f");
          await setText("consumer-repair-phone-input", "0700000000");
        }
        await setText("consumer-repair-problem-input", `${args.basePrompt} ${index}`);
        await click("consumer-repair-prepare-draft");
        await waitFor("request-estimate-summary-card");
        await waitFor("editable-param-chips");
        if (index === 1) {
          cardsVisible = count('[data-testid="editable-param-chips"]') > 0;
          const before = quantityValues();
          const preferred = byTestId("editable-param-edit-facade_area_m2");
          const target = preferred ?? document.querySelector("[data-testid^='editable-param-edit-']");
          editedKey = target?.getAttribute("data-testid")?.replace("editable-param-edit-", "") ?? null;
          cardsClickable = Boolean(target);
          clickNode(target);
          await waitFor("editable-param-popover");
          await setText("editable-param-popover-input", "1200");
          await click("editable-param-popover-save");
          await waitUntil(() => !byTestId("editable-param-popover"), 30000);
          await waitUntil(() => valuesChanged(before, quantityValues()), 45000);
          editInline = !byTestId("editable-param-popover");
          recalculatesBoq = valuesChanged(before, quantityValues());
        }
        await click("consumer-repair-approve");
        await waitUntil(() => historyCount() >= baselineApprovedCount + index, 90000);
        if (index < args.historyTarget) await waitFor("consumer-repair-problem-input", 45000);
      }
      const paramText = byTestId("editable-param-chips")?.innerText ?? "";
      const approvedCount = historyCount();
      const expectedTotalAfterCreate = baselineApprovedCount + args.historyTarget;
      return {
        android_dirty_storage_profile_used: true,
        android_parameter_cards_visible: cardsVisible,
        android_parameter_cards_are_clickable: cardsClickable,
        android_parameter_cards_edit_inline: editInline,
        android_parameter_card_edited_key: editedKey,
        android_parameter_edit_recalculates_boq: recalculatesBoq,
        android_created_estimates_count: args.historyTarget,
        android_history_existing_count_before_create: baselineApprovedCount,
        android_history_expected_total_count_after_create: expectedTotalAfterCreate,
        android_history_total_count_after_create: approvedCount,
        android_all_created_estimates_preserved: approvedCount >= expectedTotalAfterCreate,
        android_history_count_reaches_25: approvedCount >= args.historyTarget,
        android_history_not_limited_to_13: approvedCount > 13,
        android_console_errors_count: errors.length,
        android_visible_english_words_count: countVisibleEnglishWords(paramText),
        android_raw_internal_ids_visible_count: countRawInternalIds(paramText),
        first_phase_error: null,
      };
    } catch (error) {
      return {
        android_dirty_storage_profile_used: false,
        android_parameter_cards_visible: false,
        android_parameter_cards_are_clickable: false,
        android_parameter_cards_edit_inline: false,
        android_parameter_card_edited_key: null,
        android_parameter_edit_recalculates_boq: false,
        android_created_estimates_count: args.historyTarget,
        android_history_existing_count_before_create: 0,
        android_history_expected_total_count_after_create: args.historyTarget,
        android_history_total_count_after_create: 0,
        android_all_created_estimates_preserved: false,
        android_history_count_reaches_25: false,
        android_history_not_limited_to_13: false,
        android_console_errors_count: errors.length,
        android_visible_english_words_count: 0,
        android_raw_internal_ids_visible_count: 0,
        first_phase_error: error instanceof Error ? error.message : String(error),
      };
    }
  }})((${JSON.stringify(input)})); })()`;
}

function reloadProofExpression(input: { historyTarget: number }): string {
  return `(() => { const __name = (target) => target; return (${async function run(args: { historyTarget: number }) {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    const waitFor = async (id: string, timeoutMs = 90000) => {
      const started = Date.now();
      while (Date.now() - started <= timeoutMs) {
        const node = byTestId(id);
        if (node) return node;
        await sleep(250);
      }
      throw new Error(`WAIT_TIMEOUT:${id}`);
    };
    const click = async (id: string, timeoutMs = 90000) => {
      const node = await waitFor(id, timeoutMs);
      node.scrollIntoView({ block: "center" });
      node.click();
    };
    const historyCount = () => Number((byTestId("consumer-repair-history-approved-count")?.innerText ?? "").replace(/[^0-9]/g, ""));
    try {
      await waitFor("consumer-repair-history-approved-count");
      const persists = historyCount() >= args.historyTarget;
      await click("consumer-repair-history-button");
      await waitFor("consumer-repair-history-modal");
      const firstHistory = document.querySelector('[data-testid="consumer-repair-history-main"]') as HTMLElement | null;
      firstHistory?.click();
      await waitFor("consumer-repair-history-open-pdf-expanded");
      return {
        android_history_persists_after_reload: persists,
        android_pdf_from_history_passed: Boolean(byTestId("consumer-repair-history-open-pdf-expanded") || byTestId("consumer-repair-history-pdf")),
        android_buyer_package_from_history_passed: Boolean(byTestId("consumer-repair-history-send-market")),
        second_phase_error: null,
      };
    } catch (error) {
      return {
        android_history_persists_after_reload: false,
        android_pdf_from_history_passed: false,
        android_buyer_package_from_history_passed: false,
        second_phase_error: error instanceof Error ? error.message : String(error),
      };
    }
  }})((${JSON.stringify(input)})); })()`;
}

async function currentCdpRequestPage(): Promise<CdpPage> {
  return poll(async () => {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    return pages
      .filter((item) => item.type === "page" && item.url.includes("/request") && item.webSocketDebuggerUrl)
      .sort((left, right) => Number(right.id) - Number(left.id))[0] ?? null;
  }, 90_000);
}

async function runAndroidBrowserProof(input: {
  deviceId: string;
  baseUrl: string;
}): Promise<{ flow: AndroidFlowProof; reload: AndroidReloadProof; chromeAttached: boolean }> {
  const targetUrl = `${input.baseUrl.replace(/\/+$/, "")}/request?parameterHistoryAndroidSmoke=${Date.now()}`;
  adb(["-s", input.deviceId, "shell", "sh", "-c", "echo 'chrome --remote-debugging-socket-name=chrome_devtools_remote --remote-debugging-port=9222' > /data/local/tmp/chrome-command-line && chmod 644 /data/local/tmp/chrome-command-line"], 10_000);
  adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
  adb(["-s", input.deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"], 10_000);
  adb([
    "-s",
    input.deviceId,
    "shell",
    "am",
    "start",
    "-n",
    "com.android.chrome/com.google.android.apps.chrome.Main",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    targetUrl,
  ]);
  await sleep(5_000);
  const page = await currentCdpRequestPage();
  const flow = await evaluatePage<AndroidFlowProof>(page.webSocketDebuggerUrl, primaryFlowExpression({
    basePrompt: BASE_PROMPT,
    historyTarget: HISTORY_TARGET,
    storageKey: DURABLE_REQUEST_STORE_KEY,
  }));
  await navigatePage(page.webSocketDebuggerUrl, `${input.baseUrl.replace(/\/+$/, "")}/request?parameterHistoryAndroidReload=${Date.now()}`);
  await sleep(2_500);
  const reloadedPage = await currentCdpRequestPage();
  const reload = await evaluatePage<AndroidReloadProof>(reloadedPage.webSocketDebuggerUrl, reloadProofExpression({
    historyTarget: HISTORY_TARGET,
  }));
  return { flow, reload, chromeAttached: true };
}

function stopSummary(input: {
  artifactPath: string;
  baseUrl: string;
  requireRealBrowser: boolean;
  requireEmulator: boolean;
  blocker: typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN | typeof STOP_ANDROID_EMULATOR_PARAMETER_HISTORY_EVIDENCE_MISSING_NO_GREEN | string;
  health?: ReturnType<typeof checkAndroidEmulatorHealth>["artifact"] | null;
  writeSummary?: boolean;
}): { artifactPath: string; artifact: AiEstimateParameterDurableHistoryAndroidSummary } {
  const summary: AiEstimateParameterDurableHistoryAndroidSummary = {
    final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      : STOP_ANDROID_EMULATOR_PARAMETER_HISTORY_EVIDENCE_MISSING_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: "parameter-durable-history",
    base_url: input.baseUrl,
    require_real_browser: input.requireRealBrowser,
    require_emulator: input.requireEmulator,
    browser_automation_started: false,
    web_server_started_by_runner: false,
    android_emulator_detected: input.health?.emulator_detected ?? false,
    android_chrome_launched_or_attached: false,
    android_device_id: input.health?.selected_serial ?? null,
    android_dirty_storage_profile_used: false,
    actual_android_emulator_parameter_durable_history_smoke_passed: false,
    android_parameter_cards_visible: false,
    android_parameter_cards_are_clickable: false,
    android_parameter_cards_edit_inline: false,
    android_parameter_card_edited_key: null,
    android_parameter_edit_recalculates_boq: false,
    android_created_estimates_count: 0,
    android_history_existing_count_before_create: 0,
    android_history_expected_total_count_after_create: HISTORY_TARGET,
    android_history_total_count_after_create: 0,
    android_all_created_estimates_preserved: false,
    android_history_count_reaches_25: false,
    android_history_not_limited_to_13: false,
    android_history_persists_after_reload: false,
    android_pdf_from_history_passed: false,
    android_buyer_package_from_history_passed: false,
    android_visible_english_words_count: 0,
    android_raw_internal_ids_visible_count: 0,
    android_console_errors_count: 0,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
    exact_artifact_paths: {
      android_summary: input.artifactPath,
    },
  };
  if (input.writeSummary !== false) writeJson(input.artifactPath, summary);
  return { artifactPath: input.artifactPath, artifact: summary };
}

export async function runAiEstimateParameterDurableHistoryAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: string | null;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}): Promise<{ artifactPath: string; artifact: AiEstimateParameterDurableHistoryAndroidSummary }> {
  if ((options.target ?? "android-chrome") !== "android-chrome") {
    throw new Error(`UNSUPPORTED_PARAMETER_HISTORY_ANDROID_TARGET:${options.target}`);
  }
  if ((options.cases ?? "parameter-durable-history") !== "parameter-durable-history") {
    throw new Error(`UNSUPPORTED_PARAMETER_HISTORY_CASES:${options.cases}`);
  }
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl ?? undefined,
    scriptEnvKeys: ["AI_ESTIMATE_PARAMETER_HISTORY_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;
  const initialHealth = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return stopSummary({
      artifactPath,
      baseUrl,
      requireRealBrowser,
      requireEmulator,
      blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
      health: initialHealth,
      writeSummary: options.writeSummary,
    });
  }

  const deviceId = initialHealth.selected_serial;
  let server: Awaited<ReturnType<typeof ensureWave2CAndroidWebServer>> | null = null;
  let browserProof: Awaited<ReturnType<typeof runAndroidBrowserProof>> | null = null;
  let flowError: string | null = null;
  try {
    server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
    if (isLocalhostBaseUrl(baseUrl)) {
      const port = resolvePort(baseUrl);
      adb(["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`], 10_000);
    }
    browserProof = await runAndroidBrowserProof({ deviceId, baseUrl });
  } catch (error) {
    flowError = error instanceof Error ? error.message : String(error);
  } finally {
    adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
    server?.stop();
  }

  const flow = browserProof?.flow ?? {
    android_dirty_storage_profile_used: false,
    android_parameter_cards_visible: false,
    android_parameter_cards_are_clickable: false,
    android_parameter_cards_edit_inline: false,
    android_parameter_card_edited_key: null,
    android_parameter_edit_recalculates_boq: false,
    android_created_estimates_count: 0,
    android_history_existing_count_before_create: 0,
    android_history_expected_total_count_after_create: HISTORY_TARGET,
    android_history_total_count_after_create: 0,
    android_all_created_estimates_preserved: false,
    android_history_count_reaches_25: false,
    android_history_not_limited_to_13: false,
    android_console_errors_count: 0,
    android_visible_english_words_count: 0,
    android_raw_internal_ids_visible_count: 0,
    first_phase_error: null,
  };
  const reload = browserProof?.reload ?? {
    android_history_persists_after_reload: false,
    android_pdf_from_history_passed: false,
    android_buyer_package_from_history_passed: false,
    second_phase_error: null,
  };
  const blockers = [
    requireRealBrowser ? "" : "real_browser_required_flag_missing",
    requireEmulator ? "" : "emulator_required_flag_missing",
    browserProof?.chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    flowError ? `android_browser_flow_exception:${flowError.replace(/\s+/g, " ").slice(0, 240)}` : "",
    flow.first_phase_error ? `android_first_phase_error:${flow.first_phase_error}` : "",
    reload.second_phase_error ? `android_second_phase_error:${reload.second_phase_error}` : "",
    flow.android_dirty_storage_profile_used ? "" : "android_dirty_storage_profile_missing",
    flow.android_parameter_cards_visible ? "" : "android_parameter_cards_missing",
    flow.android_parameter_cards_are_clickable ? "" : "android_parameter_cards_not_clickable",
    flow.android_parameter_cards_edit_inline ? "" : "android_parameter_cards_not_edit_inline",
    flow.android_parameter_edit_recalculates_boq ? "" : "android_parameter_edit_did_not_recalculate_boq",
    flow.android_all_created_estimates_preserved ? "" : "android_all_created_estimates_not_preserved",
    flow.android_history_count_reaches_25 ? "" : "android_history_count_below_25",
    flow.android_history_not_limited_to_13 ? "" : "android_history_stuck_at_13",
    reload.android_history_persists_after_reload ? "" : "android_history_not_persisted_after_reload",
    reload.android_pdf_from_history_passed ? "" : "android_pdf_from_history_missing",
    reload.android_buyer_package_from_history_passed ? "" : "android_buyer_package_from_history_missing",
    flow.android_visible_english_words_count === 0 ? "" : `android_visible_english_words:${flow.android_visible_english_words_count}`,
    flow.android_raw_internal_ids_visible_count === 0 ? "" : `android_raw_internal_ids:${flow.android_raw_internal_ids_visible_count}`,
    flow.android_console_errors_count === 0 ? "" : `android_console_errors:${flow.android_console_errors_count}`,
  ].filter(Boolean);
  const passed = blockers.length === 0;
  const summary: AiEstimateParameterDurableHistoryAndroidSummary = {
    final_status: passed
      ? GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: "parameter-durable-history",
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: Boolean(browserProof),
    web_server_started_by_runner: server?.started ?? false,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: Boolean(browserProof?.chromeAttached),
    android_device_id: deviceId,
    android_dirty_storage_profile_used: flow.android_dirty_storage_profile_used,
    actual_android_emulator_parameter_durable_history_smoke_passed: passed,
    android_parameter_cards_visible: flow.android_parameter_cards_visible,
    android_parameter_cards_are_clickable: flow.android_parameter_cards_are_clickable,
    android_parameter_cards_edit_inline: flow.android_parameter_cards_edit_inline,
    android_parameter_card_edited_key: flow.android_parameter_card_edited_key,
    android_parameter_edit_recalculates_boq: flow.android_parameter_edit_recalculates_boq,
    android_created_estimates_count: flow.android_created_estimates_count,
    android_history_existing_count_before_create: flow.android_history_existing_count_before_create,
    android_history_expected_total_count_after_create: flow.android_history_expected_total_count_after_create,
    android_history_total_count_after_create: flow.android_history_total_count_after_create,
    android_all_created_estimates_preserved:
      flow.android_all_created_estimates_preserved && reload.android_history_persists_after_reload,
    android_history_count_reaches_25: flow.android_history_count_reaches_25,
    android_history_not_limited_to_13: flow.android_history_not_limited_to_13,
    android_history_persists_after_reload: reload.android_history_persists_after_reload,
    android_pdf_from_history_passed: reload.android_pdf_from_history_passed,
    android_buyer_package_from_history_passed: reload.android_buyer_package_from_history_passed,
    android_visible_english_words_count: flow.android_visible_english_words_count,
    android_raw_internal_ids_visible_count: flow.android_raw_internal_ids_visible_count,
    android_console_errors_count: flow.android_console_errors_count,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
    exact_artifact_paths: {
      android_summary: artifactPath,
    },
  };
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runAiEstimateParameterDurableHistoryAndroidSmoke.ts")) {
  void runAiEstimateParameterDurableHistoryAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases"),
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
    writeSummary: hasFlag("write-summary") || !hasFlag("no-write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_parameter_durable_history_smoke_passed:
          result.artifact.actual_android_emulator_parameter_durable_history_smoke_passed,
        android_parameter_edit_recalculates_boq: result.artifact.android_parameter_edit_recalculates_boq,
        android_history_count_reaches_25: result.artifact.android_history_count_reaches_25,
        android_history_persists_after_reload: result.artifact.android_history_persists_after_reload,
        android_console_errors_count: result.artifact.android_console_errors_count,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
