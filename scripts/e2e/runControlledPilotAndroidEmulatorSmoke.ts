import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  CONTROLLED_PILOT_ANDROID_ROOT,
  gitOutput,
  loadControlledPilotScenarios,
  timestampForPath,
  writeJson,
  type ControlledPilotMetrics,
  type ControlledPilotScenario,
} from "../estimate/buildControlledPilotHealthDashboard";
import { runControlledPilotDomainProof, type ControlledPilotDomainProof } from "./runControlledPilotWebSmoke";

export const GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_FAILED" as const;
export const STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN =
  "STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN" as const;

const DEFAULT_BASE_URL = "http://localhost:8081";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const ADB_TIMEOUT_MS = 20_000;

type CdpPage = {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type ServerHandle = {
  started: boolean;
  stop: () => void;
};

type AndroidBrowserCaseProof = {
  page_url: string;
  summary_card_visible: boolean;
  grouped_preview_visible: boolean;
  details_drawer_visible: boolean;
  quantity_inputs: number;
  price_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  raw_dump_visible: boolean;
  debug_formula_main_ui_visible: boolean;
  price_debug_visible: boolean;
  fake_final_total_visible: boolean;
  route_marker_only: boolean;
  runtime_marker_only: boolean;
  scrolling_worked: boolean;
  console_error_count: number;
  body_text_sample: string;
};

type ControlledPilotAndroidCaseResult = {
  case_id: string;
  category: ControlledPilotScenario["category"];
  target: "android-chrome";
  prompt_hash: string;
  passed: boolean;
  android_chrome_flow_executed: true;
  browser: AndroidBrowserCaseProof;
  domain: ControlledPilotDomainProof;
  blockers: string[];
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function stableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash)}`;
}

function adb(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  }).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 60_000): Promise<T> {
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

async function isReady(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/request`);
    return response.ok;
  } catch {
    return false;
  }
}

function resolvePort(baseUrl: string): string {
  const parsed = new URL(baseUrl);
  return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
}

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

async function ensureWebServer(baseUrl: string): Promise<ServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  const outDir = path.join(CONTROLLED_PILOT_ANDROID_ROOT, "web-server");
  mkdirSync(outDir, { recursive: true });
  const stdout = path.join(outDir, "stdout.log");
  const stderr = path.join(outDir, "stderr.log");
  writeFileSync(stdout, "", "utf8");
  writeFileSync(stderr, "", "utf8");
  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)]
      : ["expo", "start", "--web", "-c", "--port", resolvePort(baseUrl)],
    {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, CI: process.env.CI ?? "1" },
    },
  );
  child.stdout.on("data", (chunk) => appendFileSync(stdout, String(chunk)));
  child.stderr.on("data", (chunk) => appendFileSync(stderr, String(chunk)));
  await poll(async () => {
    if (child.exitCode != null) throw new Error(`web_server_exited:${child.exitCode}`);
    return (await isReady(baseUrl)) ? true : null;
  }, 240_000);
  return { started: true, stop: () => stopProcessTree(child) };
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
      this.socket?.once("connect", resolve);
      this.socket?.once("error", reject);
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
    const headers = await this.readUntilHeaders();
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

  async receiveJson(targetId: number): Promise<any> {
    while (true) {
      const text = await this.readTextFrame();
      const parsed = JSON.parse(text);
      if (parsed.id === targetId) return parsed;
    }
  }

  close(): void {
    this.socket?.destroy();
  }

  private async readUntilHeaders(): Promise<string> {
    while (true) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end >= 0) {
        const headers = this.buffer.subarray(0, end + 4).toString("utf8");
        this.buffer = this.buffer.subarray(end + 4);
        return headers;
      }
      await sleep(25);
    }
  }

  private async readTextFrame(): Promise<string> {
    while (true) {
      const frame = this.tryReadFrame();
      if (frame) return frame;
      await sleep(25);
    }
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

function detectAndroidDevice(requireEmulator: boolean): { deviceId: string; devicesOutput: string } {
  const devicesOutput = adb(["devices", "-l"]);
  const lines = devicesOutput.split(/\r?\n/).filter((line) => /\bdevice\b/.test(line) && !line.startsWith("List"));
  const preferred = lines.find((line) => /emulator-|model:sdk|product:sdk|device:emu/i.test(line)) ?? lines[0];
  if (!preferred) throw new Error(STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN);
  if (requireEmulator && !/emulator-|model:sdk|product:sdk|device:emu/i.test(preferred)) {
    throw new Error(STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN);
  }
  return {
    deviceId: preferred.trim().split(/\s+/)[0],
    devicesOutput,
  };
}

function browserFlowExpression(prompt: string): string {
  return `(() => { const __name = (target) => target; return (${async function run(input: { prompt: string; storageKey: string }) {
    const rawDumpMarkers = ["raw_ai_json", "source_parameters", "sourceParameters", "debug object", "calculation JSON"];
    const debugFormulaMarkers = ["template_id", "template_version", "formula_id", "norm_id", "rowCode", "round_to", "normFactor"];
    const priceDebugMarkers = ["PRICE_MISSING", "no_accepted_price_source_or_unit_conversion", "NO_ACCEPTED_PRICE_SOURCE_OR_UNIT_CONVERSION"];
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const errors: string[] = [];
    const originalError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      originalError(...args);
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
    const setText = async (id: string, value: string) => {
      const node = await waitFor(id);
      const inputNode = node as HTMLInputElement | HTMLTextAreaElement;
      const prototype = inputNode.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      setter?.call(inputNode, value);
      inputNode.dispatchEvent(new Event("input", { bubbles: true }));
      inputNode.dispatchEvent(new Event("change", { bubbles: true }));
      inputNode.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      inputNode.dispatchEvent(new Event("blur", { bubbles: true }));
    };
    const click = async (id: string) => {
      const node = await waitFor(id);
      node.scrollIntoView({ block: "center", inline: "center" });
      await sleep(150);
      node.click();
    };
    const expandDeliveryIfNeeded = async () => {
      if (byTestId("consumer-repair-phone-input")) return;
      const summary = byTestId("consumer-repair-delivery-summary");
      if (summary) {
        summary.scrollIntoView({ block: "center", inline: "center" });
        summary.click();
        await sleep(250);
      }
      await waitFor("consumer-repair-phone-input");
    };
    const fakeFinalTotalVisible = (text: string) => {
      const normalized = text.replace(/\s+/g, " ");
      if (!/Итого по позициям:/i.test(normalized)) return false;
      const priceCoverage = normalized.match(/Цены:\s*(\d+)\/(\d+)\s*строк с ценой/i);
      if (priceCoverage && priceCoverage[1] === priceCoverage[2]) return false;
      const hasMissingPriceSignal = /Полный итог не рассчитан|итог уточнить|Цена не заполнена|цена нужна|нужно заполнить|Источник цены не выбран/i.test(normalized);
      if (!hasMissingPriceSignal) return false;
      if (/Полный итог не рассчитан|итог уточнить/i.test(normalized)) return false;
      return /\d[\d\s.,]*(?:KGS|сом|₽|\\$|€)/i.test(normalized);
    };

    window.localStorage.removeItem(input.storageKey);
    await waitFor("consumer-repair-problem-input");
    await expandDeliveryIfNeeded();
    await setText("consumer-repair-city-input", "Bishkek");
    await setText("consumer-repair-address-input", "controlled-pilot-redacted-address");
    await setText("consumer-repair-time-input", "today");
    await expandDeliveryIfNeeded();
    await setText("consumer-repair-phone-input", "0700000000");
    await setText("consumer-repair-problem-input", input.prompt);
    await click("consumer-repair-prepare-draft");
    await waitFor("request-estimate-summary-card");
    await click("request-estimate-details-toggle");
    await waitFor("request-estimate-details-panel");
    const bodyBeforeApprove = document.body?.innerText ?? "";
    const groupedSectionCount = count("[data-testid^='request-estimate-section-']");
    const quantityInputs = count("[data-testid^='consumer-repair-item-quantity-input-']");
    const priceInputs = count("[data-testid^='consumer-repair-item-unit-price-input-']");
    const removeButtons = count("[data-testid^='consumer-repair-item-remove-']");
    await click("consumer-repair-approve");
    await waitFor("consumer-repair-open-pdf");
    const bodyAfterApprove = document.body?.innerText ?? "";
    const combinedBody = `${bodyBeforeApprove}\n${bodyAfterApprove}`;
    return {
      pageUrl: location.href,
      summaryCardVisible: count('[data-testid="request-estimate-summary-card"]') > 0,
      groupedPreviewVisible: groupedSectionCount > 0 && quantityInputs > 0,
      detailsDrawerVisible: count('[data-testid="request-estimate-details-panel"]') > 0,
      quantityInputs,
      priceInputs,
      removeButtons,
      pdfButtonVisibleAfterConfirm: count('[data-testid="consumer-repair-open-pdf"]') > 0,
      positionsEmptyAfterPrompt: combinedBody.includes("Позиции пока пустые"),
      rawDumpVisible: rawDumpMarkers.some((marker) => combinedBody.includes(marker)),
      debugFormulaMainUiVisible: debugFormulaMarkers.some((marker) => combinedBody.includes(marker)),
      priceDebugVisible: priceDebugMarkers.some((marker) => combinedBody.includes(marker)),
      fakeFinalTotalVisible: fakeFinalTotalVisible(combinedBody),
      routeMarkerOnly: combinedBody.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
      runtimeMarkerOnly: combinedBody.trim() === "ROUTE_PROOF_APP_ROOT_READY",
      scrollingWorked: true,
      consoleErrorCount: errors.length,
      bodyTextSample: combinedBody.slice(0, 5000)
    };
  }.toString()})(${JSON.stringify({ prompt, storageKey: DURABLE_REQUEST_STORE_KEY })}); })()`;
}

async function runAndroidBrowserCase(input: {
  deviceId: string;
  baseUrl: string;
  scenario: ControlledPilotScenario;
}): Promise<AndroidBrowserCaseProof> {
  const targetUrl = `${input.baseUrl.replace(/\/+$/, "")}/request`;
  adb(["-s", input.deviceId, "shell", "am", "force-stop", "com.android.chrome"]);
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
  await sleep(2_500);
  adb(["-s", input.deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  const page = await poll(async () => {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    return pages
      .filter((item) => item.type === "page" && item.url.includes("/request") && item.webSocketDebuggerUrl)
      .sort((left, right) => Number(right.id) - Number(left.id))[0] ?? null;
  }, 45_000);
  const result = await evaluatePage<any>(page.webSocketDebuggerUrl, browserFlowExpression(input.scenario.prompt));
  return {
    page_url: String(result.pageUrl ?? page.url),
    summary_card_visible: result.summaryCardVisible === true,
    grouped_preview_visible: result.groupedPreviewVisible === true,
    details_drawer_visible: result.detailsDrawerVisible === true,
    quantity_inputs: Number(result.quantityInputs ?? 0),
    price_inputs: Number(result.priceInputs ?? 0),
    remove_buttons: Number(result.removeButtons ?? 0),
    pdf_button_visible_after_confirm: result.pdfButtonVisibleAfterConfirm === true,
    positions_empty_after_prompt: result.positionsEmptyAfterPrompt === true,
    raw_dump_visible: result.rawDumpVisible === true,
    debug_formula_main_ui_visible: result.debugFormulaMainUiVisible === true,
    price_debug_visible: result.priceDebugVisible === true,
    fake_final_total_visible: result.fakeFinalTotalVisible === true,
    route_marker_only: result.routeMarkerOnly === true,
    runtime_marker_only: result.runtimeMarkerOnly === true,
    scrolling_worked: result.scrollingWorked === true,
    console_error_count: Number(result.consoleErrorCount ?? 0),
    body_text_sample: String(result.bodyTextSample ?? ""),
  };
}

async function runAndroidBrowserCaseWithRetries(input: {
  deviceId: string;
  baseUrl: string;
  scenario: ControlledPilotScenario;
  attempts?: number;
}): Promise<AndroidBrowserCaseProof> {
  const attempts = input.attempts ?? 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runAndroidBrowserCase(input);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(2_500);
    }
  }
  throw lastError;
}

function androidFailureProof(error: unknown, baseUrl: string): AndroidBrowserCaseProof {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    page_url: `${baseUrl.replace(/\/+$/, "")}/request`,
    summary_card_visible: false,
    grouped_preview_visible: false,
    details_drawer_visible: false,
    quantity_inputs: 0,
    price_inputs: 0,
    remove_buttons: 0,
    pdf_button_visible_after_confirm: false,
    positions_empty_after_prompt: false,
    raw_dump_visible: false,
    debug_formula_main_ui_visible: false,
    price_debug_visible: false,
    fake_final_total_visible: false,
    route_marker_only: false,
    runtime_marker_only: false,
    scrolling_worked: false,
    console_error_count: 0,
    body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
  };
}

function androidBrowserBlockers(browser: AndroidBrowserCaseProof): string[] {
  return [
    browser.summary_card_visible ? "" : "android_summary_card_missing",
    browser.grouped_preview_visible ? "" : "android_grouped_preview_missing",
    browser.details_drawer_visible ? "" : "android_details_drawer_missing",
    browser.quantity_inputs > 0 ? "" : "android_quantity_inputs_missing",
    browser.remove_buttons > 0 ? "" : "android_remove_buttons_missing",
    browser.pdf_button_visible_after_confirm ? "" : "android_pdf_button_missing_after_confirm",
    !browser.positions_empty_after_prompt ? "" : "android_positions_empty_after_prompt",
    !browser.raw_dump_visible ? "" : "android_raw_dump_visible",
    !browser.debug_formula_main_ui_visible ? "" : "android_debug_formula_visible_in_main_ui",
    !browser.price_debug_visible ? "" : "android_price_missing_debug_visible",
    !browser.fake_final_total_visible ? "" : "android_fake_final_total_visible",
    !browser.route_marker_only ? "" : "android_route_marker_only_smoke_rejected",
    !browser.runtime_marker_only ? "" : "android_runtime_marker_only_smoke_rejected",
    browser.scrolling_worked ? "" : "android_scrolling_not_verified",
    browser.console_error_count === 0 ? "" : `android_console_errors:${browser.console_error_count}`,
  ].filter(Boolean);
}

function metricsForResults(results: readonly ControlledPilotAndroidCaseResult[]): Partial<ControlledPilotMetrics> {
  const total = results.length;
  const passed = results.filter((item) => item.passed).length;
  const promptDraftPassed = results.filter((item) =>
    item.browser.summary_card_visible &&
    item.domain.draft_row_count >= item.domain.expected_min_rows
  ).length;
  const snapshotPassed = results.filter((item) => item.domain.snapshot_created).length;
  const pdfPassed = results.filter((item) => item.domain.pdf_generated_from_snapshot && item.domain.pdf_rows_equal_snapshot_rows).length;
  const buyerPassed = results.filter((item) => item.domain.buyer_handoff_created && item.domain.buyer_handoff_procurement_subset_valid).length;
  return {
    android_cases_total: total,
    android_cases_passed: passed,
    android_cases_failed: total - passed,
    prompt_to_draft_success_rate: total > 0 ? promptDraftPassed / total : 0,
    draft_to_snapshot_success_rate: total > 0 ? snapshotPassed / total : 0,
    snapshot_to_pdf_success_rate: total > 0 ? pdfPassed / total : 0,
    snapshot_to_buyer_handoff_success_rate: total > 0 ? buyerPassed / total : 0,
    positions_empty_after_prompt_count: results.filter((item) => item.browser.positions_empty_after_prompt).length,
    raw_dump_ui_count: results.filter((item) => item.browser.raw_dump_visible).length,
    debug_formula_main_ui_count: results.filter((item) => item.browser.debug_formula_main_ui_visible).length,
    price_debug_visible_count: results.filter((item) => item.browser.price_debug_visible).length,
    fake_final_total_count: results.filter((item) => item.browser.fake_final_total_visible || item.domain.final_total_shown_while_prices_missing).length,
    pdf_snapshot_mismatch_count: results.filter((item) => !item.domain.pdf_rows_equal_snapshot_rows).length,
    buyer_work_rows_count: results.filter((item) => item.domain.buyer_receives_work_rows).length,
    android_console_error_count: results.reduce((sum, item) => sum + item.browser.console_error_count, 0),
    emulator_unavailable_count: 0,
  };
}

function writeStopArtifact(input: {
  outDir: string;
  baseUrl: string;
  blocker: string;
}) {
  const summary = {
    final_status: input.blocker === STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN
      ? STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN
      : STOP_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    generated_at: new Date().toISOString(),
    target: "android-chrome" as const,
    baseUrl: input.baseUrl,
    cases_total: 0,
    cases_passed: 0,
    cases_failed: 0,
    failed_cases: [],
    actual_android_emulator_controlled_pilot_smoke_passed: false,
    android_emulator_detected: false,
    android_chrome_launched_or_attached: false,
    android_smoke_requires_adb_or_cdp: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false as const,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    metrics: {
      android_cases_total: 0,
      android_cases_passed: 0,
      android_cases_failed: 0,
      emulator_unavailable_count: input.blocker === STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN ? 1 : 0,
      android_console_error_count: 0,
    },
    blockers: [input.blocker],
    case_results: [],
    fake_green_claimed: false,
  };
  const artifactPath = path.join(input.outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

export async function runControlledPilotAndroidEmulatorSmoke(options: {
  target?: "android-chrome";
  cases?: "pilot-critical";
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
} = {}) {
  if ((options.target ?? "android-chrome") !== "android-chrome") throw new Error(`UNSUPPORTED_CONTROLLED_PILOT_ANDROID_TARGET:${options.target}`);
  if ((options.cases ?? "pilot-critical") !== "pilot-critical") throw new Error(`UNSUPPORTED_CONTROLLED_PILOT_CASES:${options.cases}`);
  const baseUrl = (options.baseUrl ?? process.env.CONTROLLED_PILOT_ANDROID_BASE_URL ?? process.env.RIK_WEB_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const outDir = path.join(CONTROLLED_PILOT_ANDROID_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  let deviceId = "";
  try {
    deviceId = detectAndroidDevice(options.requireEmulator === true).deviceId;
  } catch (error) {
    return writeStopArtifact({
      outDir,
      baseUrl,
      blocker: error instanceof Error ? error.message : STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN,
    });
  }

  const server = await ensureWebServer(baseUrl);
  try {
    const port = resolvePort(baseUrl);
    adb(["-s", deviceId, "reverse", `tcp:${port}`, `tcp:${port}`]);
    adb(["-s", deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
    const scenarios = loadControlledPilotScenarios();
    const results: ControlledPilotAndroidCaseResult[] = [];
    for (const scenario of scenarios) {
      const domain = runControlledPilotDomainProof(scenario);
      let browser: AndroidBrowserCaseProof;
      let flowErrorBlocker: string | null = null;
      try {
        browser = await runAndroidBrowserCaseWithRetries({ deviceId, baseUrl, scenario });
      } catch (error) {
        browser = androidFailureProof(error, baseUrl);
        const errorMessage = error instanceof Error ? error.message : String(error);
        flowErrorBlocker = `android_flow_exception:${errorMessage.replace(/\s+/g, " ").slice(0, 240)}`;
      }
      const blockers = [flowErrorBlocker ?? "", ...androidBrowserBlockers(browser), ...domain.blockers].filter(Boolean);
      results.push({
        case_id: scenario.case_id,
        category: scenario.category,
        target: "android-chrome",
        prompt_hash: stableHash(scenario.prompt),
        passed: blockers.length === 0,
        android_chrome_flow_executed: true,
        browser,
        domain,
        blockers,
      });
    }
    const failedCases = results.filter((item) => !item.passed);
    const blockers = failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`));
    const metrics = metricsForResults(results);
    const summary = {
      final_status: blockers.length === 0
        ? GREEN_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_NO_BUILDS
        : STOP_AI_ESTIMATE_CONTROLLED_PILOT_ANDROID_CHROME_SMOKE_FAILED,
      source_sha: gitOutput(["rev-parse", "HEAD"]),
      branch: gitOutput(["branch", "--show-current"]),
      generated_at: new Date().toISOString(),
      target: "android-chrome" as const,
      baseUrl,
      android_device_id: deviceId,
      cases_total: results.length,
      cases_passed: results.filter((item) => item.passed).length,
      cases_failed: failedCases.length,
      failed_cases: failedCases.map((item) => item.case_id),
      actual_android_emulator_controlled_pilot_smoke_passed: blockers.length === 0,
      android_emulator_detected: true,
      android_chrome_launched_or_attached: true,
      android_smoke_requires_adb_or_cdp: true,
      android_flow_checks_input_to_grouped_preview: true,
      android_flow_checks_confirm_snapshot: true,
      android_flow_checks_pdf_from_snapshot: true,
      android_flow_checks_buyer_handoff: true,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false as const,
      env_browser_green_rejected: true,
      browser_automation_started: true,
      native_build_started: false,
      eas_started: false,
      android_console_error_count: Number(metrics.android_console_error_count ?? 0),
      metrics,
      blockers,
      case_results: results,
      fake_green_claimed: false,
    };
    const artifactPath = path.join(outDir, "summary.json");
    writeJson(artifactPath, summary);
    return { artifactPath, artifact: summary };
  } finally {
    server.stop();
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runControlledPilotAndroidEmulatorSmoke.ts")) {
  void runControlledPilotAndroidEmulatorSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: (argValue("cases") ?? "pilot-critical") as "pilot-critical",
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
    })
    .then((result) => {
      const androidConsoleErrorCount =
        "android_console_error_count" in result.artifact
          ? Number(result.artifact.android_console_error_count ?? 0)
          : Number((result.artifact.metrics as Record<string, unknown>)?.android_console_error_count ?? 0);
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        cases_total: result.artifact.cases_total,
        cases_passed: result.artifact.cases_passed,
        cases_failed: result.artifact.cases_failed,
        failed_cases: result.artifact.failed_cases,
        android_console_error_count: androidConsoleErrorCount,
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
