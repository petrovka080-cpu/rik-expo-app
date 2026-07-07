import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  WAVE2C_EXPANDED_CASE_SET,
  WAVE2C_EXPANDED_CRITICAL_CASES,
  runWave2CExpandedCaseDomainProof,
  type Wave2CExpandedCase,
  type Wave2CExpandedCaseDomainProof,
} from "../estimate/wave2CExpandedBoqCases";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  checkAndroidEmulatorHealth,
  STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN,
  type AndroidEmulatorHealthResult,
} from "./checkAndroidEmulatorHealth";
import { assertLocalServerMayStart, isLocalhostBaseUrl, resolveE2eBaseUrl } from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE =
  "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_ANDROID_CHROME_SMOKE" as const;
export const STOP_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_ANDROID_CHROME_SMOKE_FAILED" as const;
export const STOP_WAVE2C_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN =
  "STOP_WAVE2C_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN" as const;

const ANDROID_ROOT = path.join(".release-runtime", "ai-estimate-wave2c-expanded-1610", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8093";
const DURABLE_REQUEST_STORE_KEY = "rik.consumer_repair.request_bundles.v1";
const ADB_TIMEOUT_MS = 20_000;
const CDP_TIMEOUT_MS = 120_000;

export type Wave2CAndroidServerHandle = {
  started: boolean;
  stop: () => void;
};

type CdpPage = {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
};

export type Wave2CAndroidCaseProof = {
  case_id: string;
  prompt: string;
  expected_family_id: string;
  matched_family_id: string | null;
  passed: boolean;
  target_url: string;
  page_url: string;
  summary_card_visible: boolean;
  grouped_boq_visible: boolean;
  details_drawer_visible: boolean;
  work_rows_visible: boolean;
  material_rows_visible: boolean;
  service_or_equipment_rows_visible: boolean;
  assumptions_visible: boolean;
  quantity_inputs: number;
  remove_buttons: number;
  pdf_button_visible_after_confirm: boolean;
  positions_empty_after_prompt: boolean;
  refusal_visible: boolean;
  drawings_required_stop_visible: boolean;
  raw_dump_visible: boolean;
  route_marker_only: boolean;
  runtime_marker_only: boolean;
  scrolling_worked: boolean;
  console_error_count: number;
  body_text_sample: string;
  domain: Wave2CExpandedCaseDomainProof;
  android_health_before_case: Pick<AndroidEmulatorHealthResult, "android_lab_healthy" | "blocking_reasons" | "sys_boot_completed_value" | "cmd_activity_available">;
  android_health_after_case: Pick<AndroidEmulatorHealthResult, "android_lab_healthy" | "blocking_reasons" | "sys_boot_completed_value" | "cmd_activity_available">;
  blockers: string[];
};

export type Wave2CAndroidSmokeSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE
    | typeof STOP_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE_FAILED
    | typeof STOP_WAVE2C_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN
    | typeof STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: typeof WAVE2C_EXPANDED_CASE_SET;
  base_url: string;
  require_real_browser: boolean;
  require_emulator: boolean;
  browser_automation_started: boolean;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_device_id: string | null;
  android_lab_health_checked: boolean;
  android_lab_healthy: boolean;
  android_health_blocking_reasons: string[];
  actual_android_emulator_wave2c_expanded_smoke_passed: boolean;
  android_wave2c_cases_passed: string;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_console_errors_count: number;
  android_emulator_health_degraded: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  fake_green_claimed: false;
  blockers: string[];
  case_results: Wave2CAndroidCaseProof[];
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll<T>(fn: () => Promise<T | null>, timeoutMs = 240_000): Promise<T> {
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
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/request`);
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

export async function ensureWave2CAndroidWebServer(baseUrl: string, outDir: string): Promise<Wave2CAndroidServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  assertLocalServerMayStart(baseUrl);
  const serverDir = path.join(outDir, "web-server");
  mkdirSync(serverDir, { recursive: true });
  const stdout = path.join(serverDir, "stdout.log");
  const stderr = path.join(serverDir, "stderr.log");
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
  });
  return { started: true, stop: () => stopProcessTree(child) };
}

function adb(args: string[], timeoutMs = ADB_TIMEOUT_MS): string {
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

export function compactAndroidHealth(health: AndroidEmulatorHealthResult): Pick<
  AndroidEmulatorHealthResult,
  "android_lab_healthy" | "blocking_reasons" | "sys_boot_completed_value" | "cmd_activity_available"
> {
  return {
    android_lab_healthy: health.android_lab_healthy,
    blocking_reasons: health.blocking_reasons,
    sys_boot_completed_value: health.sys_boot_completed_value,
    cmd_activity_available: health.cmd_activity_available,
  };
}

function browserFlowExpression(input: {
  prompt: string;
  expectedWorkTitle: string | null;
  expectedMaterialTitle: string | null;
  expectedServiceOrEquipmentTitle: string | null;
}): string {
  return `(() => { const __name = (target) => target; return (${async function run(args: {
    prompt: string;
    expectedWorkTitle: string | null;
    expectedMaterialTitle: string | null;
    expectedServiceOrEquipmentTitle: string | null;
    storageKey: string;
  }) {
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
      node.scrollIntoView({ block: "center" });
      node.click();
    };
    const expandDeliveryFieldsIfNeeded = async () => {
      if (byTestId("consumer-repair-phone-input")) return;
      const summary = byTestId("consumer-repair-delivery-summary");
      if (summary) summary.click();
      await waitFor("consumer-repair-phone-input", 45000);
    };
    const has = (marker: string | null) => Boolean(marker && (document.body?.innerText ?? "").includes(marker));

    window.localStorage.removeItem(args.storageKey);
    await waitFor("consumer-repair-problem-input");
    await expandDeliveryFieldsIfNeeded();
    await setText("consumer-repair-city-input", "Bishkek");
    await setText("consumer-repair-address-input", "wave2c-redacted-address");
    await setText("consumer-repair-time-input", "today");
    await expandDeliveryFieldsIfNeeded();
    await setText("consumer-repair-phone-input", "0700000");
    await setText("consumer-repair-problem-input", args.prompt);
    await click("consumer-repair-prepare-draft");
    await waitFor("request-estimate-summary-card");
    const detailsToggle = byTestId("request-estimate-details-toggle");
    if (detailsToggle) detailsToggle.click();
    if (detailsToggle) await waitFor("request-estimate-details-panel", 45000);
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(500);
    const groupedSectionCount = count("[data-testid^='request-estimate-section-']");
    const quantityInputs = count("[data-testid^='consumer-repair-item-quantity-input-']");
    const removeButtons = count("[data-testid^='consumer-repair-item-remove-']");
    const assumptionsVisible = count('[data-testid="request-estimate-assumptions"]') > 0;
    const bodyBeforeApprove = document.body?.innerText ?? "";
    await click("consumer-repair-approve");
    await waitFor("consumer-repair-open-pdf");
    const bodyText = document.body?.innerText ?? "";
    return {
      pageUrl: location.href,
      summaryCardVisible: count('[data-testid="request-estimate-summary-card"]') > 0,
      groupedBoqVisible: groupedSectionCount > 0 && quantityInputs > 0,
      detailsDrawerVisible: count('[data-testid="request-estimate-details-panel"]') > 0,
      workRowsVisible: has(args.expectedWorkTitle),
      materialRowsVisible: has(args.expectedMaterialTitle),
      serviceOrEquipmentRowsVisible: has(args.expectedServiceOrEquipmentTitle),
      assumptionsVisible,
      quantityInputs,
      removeButtons,
      pdfButtonVisibleAfterConfirm: count('[data-testid="consumer-repair-open-pdf"]') > 0,
      positionsEmptyAfterPrompt: bodyText.includes("Позиции пока пустые"),
      refusalVisible: /Заявка специалисту|опасно|dangerous/i.test(bodyText),
      drawingsRequiredStopVisible: /чертежи обязательны для расчета|drawings_required_stop/i.test(bodyText),
      rawDumpVisible: /PRICE_MISSING|source_parameters|raw_ai_json|formula_id|template_id|round_to|normFactor/i.test(bodyBeforeApprove),
      routeMarkerOnly: bodyText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
      runtimeMarkerOnly: bodyText.trim() === "ROUTE_PROOF_APP_ROOT_READY",
      scrollingWorked: window.scrollY > 0 || document.body.scrollHeight <= window.innerHeight,
      consoleErrorCount: errors.length,
      bodyTextSample: bodyText.slice(0, 5000),
    };
  }.toString()})(${JSON.stringify({
    ...input,
    storageKey: DURABLE_REQUEST_STORE_KEY,
  })}); })()`;
}

export async function runWave2CAndroidBrowserCase(input: {
  deviceId: string;
  baseUrl: string;
  testCase: Wave2CExpandedCase;
  domain: Wave2CExpandedCaseDomainProof;
}): Promise<Omit<Wave2CAndroidCaseProof, "passed" | "blockers" | "android_health_before_case" | "android_health_after_case">> {
  if (isLocalhostBaseUrl(input.baseUrl)) {
    const port = resolvePort(input.baseUrl);
    adb(["-s", input.deviceId, "reverse", `tcp:${port}`, `tcp:${port}`]);
  }
  adb(["-s", input.deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  const targetUrl = `${input.baseUrl.replace(/\/+$/, "")}/request`;
  adbNoThrow(["-s", input.deviceId, "shell", "am", "force-stop", "com.android.chrome"]);
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
  await sleep(2500);
  const page = await poll(async () => {
    const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
    return pages
      .filter((item) => item.type === "page" && item.url.includes("/request") && item.webSocketDebuggerUrl)
      .sort((left, right) => Number(right.id) - Number(left.id))[0] ?? null;
  }, 45_000);
  const result = await evaluatePage<any>(page.webSocketDebuggerUrl, browserFlowExpression({
    prompt: input.testCase.prompt,
    expectedWorkTitle: input.domain.first_work_title,
    expectedMaterialTitle: input.domain.first_material_title,
    expectedServiceOrEquipmentTitle: input.domain.first_service_or_equipment_title,
  }));
  return {
    case_id: input.testCase.case_id,
    prompt: input.testCase.prompt,
    expected_family_id: input.testCase.family_id,
    matched_family_id: input.domain.matched_family_id,
    target_url: targetUrl,
    page_url: String(result.pageUrl ?? page.url),
    summary_card_visible: result.summaryCardVisible === true,
    grouped_boq_visible: result.groupedBoqVisible === true,
    details_drawer_visible: result.detailsDrawerVisible === true,
    work_rows_visible: result.workRowsVisible === true,
    material_rows_visible: result.materialRowsVisible === true,
    service_or_equipment_rows_visible: result.serviceOrEquipmentRowsVisible === true,
    assumptions_visible: result.assumptionsVisible === true,
    quantity_inputs: Number(result.quantityInputs ?? 0),
    remove_buttons: Number(result.removeButtons ?? 0),
    pdf_button_visible_after_confirm: result.pdfButtonVisibleAfterConfirm === true,
    positions_empty_after_prompt: result.positionsEmptyAfterPrompt === true,
    refusal_visible: result.refusalVisible === true,
    drawings_required_stop_visible: result.drawingsRequiredStopVisible === true,
    raw_dump_visible: result.rawDumpVisible === true,
    route_marker_only: result.routeMarkerOnly === true,
    runtime_marker_only: result.runtimeMarkerOnly === true,
    scrolling_worked: result.scrollingWorked === true,
    console_error_count: Number(result.consoleErrorCount ?? 0),
    body_text_sample: String(result.bodyTextSample ?? ""),
    domain: input.domain,
  };
}

export function wave2CAndroidCaseBlockers(proof: Omit<Wave2CAndroidCaseProof, "passed" | "blockers">): string[] {
  return [
    proof.android_health_before_case.android_lab_healthy ? "" : `android_health_before_case_failed:${proof.android_health_before_case.blocking_reasons.join("|")}`,
    proof.android_health_after_case.android_lab_healthy ? "" : `android_health_after_case_failed:${proof.android_health_after_case.blocking_reasons.join("|")}`,
    proof.summary_card_visible ? "" : "android_summary_card_missing",
    proof.grouped_boq_visible ? "" : "android_grouped_boq_missing",
    proof.details_drawer_visible ? "" : "android_details_drawer_missing",
    proof.work_rows_visible ? "" : "android_work_rows_not_visible",
    proof.material_rows_visible ? "" : "android_material_rows_not_visible",
    proof.domain.service_rows_count + proof.domain.equipment_rows_count === 0 || proof.service_or_equipment_rows_visible
      ? ""
      : "android_service_or_equipment_rows_not_visible",
    proof.assumptions_visible ? "" : "android_assumptions_missing",
    proof.quantity_inputs > 0 ? "" : "android_quantity_inputs_missing",
    proof.remove_buttons > 0 ? "" : "android_remove_buttons_missing",
    proof.pdf_button_visible_after_confirm ? "" : "android_pdf_button_missing_after_confirm",
    !proof.positions_empty_after_prompt ? "" : "android_positions_empty_after_prompt",
    !proof.refusal_visible ? "" : "android_refusal_visible",
    !proof.drawings_required_stop_visible ? "" : "android_drawings_required_stop_visible",
    !proof.raw_dump_visible ? "" : "android_raw_dump_visible",
    !proof.route_marker_only ? "" : "android_route_marker_only_smoke_rejected",
    !proof.runtime_marker_only ? "" : "android_runtime_marker_only_smoke_rejected",
    proof.scrolling_worked ? "" : "android_scrolling_not_verified",
    proof.console_error_count === 0 ? "" : `android_console_errors:${proof.console_error_count}`,
    ...proof.domain.blocking_reasons.map((reason) => `domain:${reason}`),
  ].filter(Boolean);
}

function writeStopArtifact(input: {
  outDir: string;
  baseUrl: string;
  requireRealBrowser: boolean;
  requireEmulator: boolean;
  health: AndroidEmulatorHealthResult | null;
  blocker: string;
}) {
  const summary: Wave2CAndroidSmokeSummary = {
    final_status: input.blocker === STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      ? STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN
      : STOP_WAVE2C_ANDROID_EMULATOR_EVIDENCE_MISSING_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: WAVE2C_EXPANDED_CASE_SET,
    base_url: input.baseUrl,
    require_real_browser: input.requireRealBrowser,
    require_emulator: input.requireEmulator,
    browser_automation_started: false,
    android_emulator_detected: input.health?.emulator_detected ?? false,
    android_chrome_launched_or_attached: false,
    android_device_id: input.health?.selected_serial ?? null,
    android_lab_health_checked: Boolean(input.health),
    android_lab_healthy: input.health?.android_lab_healthy ?? false,
    android_health_blocking_reasons: input.health?.blocking_reasons ?? [input.blocker],
    actual_android_emulator_wave2c_expanded_smoke_passed: false,
    android_wave2c_cases_passed: `0/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    android_cases_total: WAVE2C_EXPANDED_CRITICAL_CASES.length,
    android_cases_passed_count: 0,
    android_cases_failed_count: WAVE2C_EXPANDED_CRITICAL_CASES.length,
    android_empty_estimate_count: 0,
    android_refusal_count: 0,
    android_drawings_required_stop_count: 0,
    android_raw_dump_ui_count: 0,
    android_pdf_missing_count: 0,
    android_buyer_handoff_missing_count: 0,
    android_console_errors_count: 0,
    android_emulator_health_degraded: true,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers: [input.blocker, ...(input.health?.blocking_reasons ?? [])],
    case_results: [],
  };
  const artifactPath = path.join(input.outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

export async function runWave2CExpandedBoqAndroidSmoke(options: {
  target?: "android-chrome";
  cases?: string;
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string;
  writeSummary?: boolean;
} = {}) {
  if ((options.target ?? "android-chrome") !== "android-chrome") throw new Error(`UNSUPPORTED_WAVE2C_ANDROID_TARGET:${options.target}`);
  if ((options.cases ?? WAVE2C_EXPANDED_CASE_SET) !== WAVE2C_EXPANDED_CASE_SET) {
    throw new Error(`UNSUPPORTED_WAVE2C_CASES:${options.cases}`);
  }
  const baseUrl = resolveE2eBaseUrl({
    explicit: options.baseUrl,
    scriptEnvKeys: ["WAVE2C_ANDROID_BASE_URL"],
    defaultBaseUrl: DEFAULT_BASE_URL,
  });
  const outDir = path.join(ANDROID_ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const requireRealBrowser = options.requireRealBrowser === true;
  const requireEmulator = options.requireEmulator === true;
  const initialHealth = checkAndroidEmulatorHealth({
    requireEmulator,
    requireChrome: true,
    baseUrl,
    writeArtifact: true,
  }).artifact;
  if (!requireRealBrowser) {
    return writeStopArtifact({ outDir, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: "real_browser_required_flag_missing" });
  }
  if (!initialHealth.android_lab_healthy || !initialHealth.selected_serial) {
    return writeStopArtifact({ outDir, baseUrl, requireRealBrowser, requireEmulator, health: initialHealth, blocker: STOP_ANDROID_LAB_UNHEALTHY_NO_GREEN });
  }

  let server: Wave2CAndroidServerHandle | null = null;
  const caseResults: Wave2CAndroidCaseProof[] = [];
  let chromeAttached = false;
  try {
    server = await ensureWave2CAndroidWebServer(baseUrl, outDir);
    const deviceId = initialHealth.selected_serial;
    for (const testCase of WAVE2C_EXPANDED_CRITICAL_CASES) {
      const domain = runWave2CExpandedCaseDomainProof(testCase);
      const healthBefore = checkAndroidEmulatorHealth({
        requireEmulator,
        requireChrome: true,
        serial: deviceId,
        baseUrl,
        writeArtifact: false,
      }).artifact;
      let proof: Omit<Wave2CAndroidCaseProof, "passed" | "blockers">;
      try {
        if (!healthBefore.android_lab_healthy) throw new Error(`android_health_before_case_failed:${healthBefore.blocking_reasons.join("|")}`);
        proof = {
          ...(await runWave2CAndroidBrowserCase({ deviceId, baseUrl, testCase, domain })),
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
        chromeAttached = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        proof = {
          case_id: testCase.case_id,
          prompt: testCase.prompt,
          expected_family_id: testCase.family_id,
          matched_family_id: domain.matched_family_id,
          target_url: `${baseUrl}/request`,
          page_url: `${baseUrl}/request`,
          summary_card_visible: false,
          grouped_boq_visible: false,
          details_drawer_visible: false,
          work_rows_visible: false,
          material_rows_visible: false,
          service_or_equipment_rows_visible: false,
          assumptions_visible: false,
          quantity_inputs: 0,
          remove_buttons: 0,
          pdf_button_visible_after_confirm: false,
          positions_empty_after_prompt: false,
          refusal_visible: false,
          drawings_required_stop_visible: false,
          raw_dump_visible: false,
          route_marker_only: false,
          runtime_marker_only: false,
          scrolling_worked: false,
          console_error_count: 0,
          body_text_sample: `ERROR: ${errorMessage}`.slice(0, 5000),
          domain,
          android_health_before_case: compactAndroidHealth(healthBefore),
          android_health_after_case: compactAndroidHealth(healthBefore),
        };
      } finally {
        adbNoThrow(["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"], 10_000);
      }
      const healthAfter = checkAndroidEmulatorHealth({
        requireEmulator,
        requireChrome: true,
        serial: deviceId,
        baseUrl,
        writeArtifact: false,
      }).artifact;
      proof.android_health_after_case = compactAndroidHealth(healthAfter);
      const blockers = wave2CAndroidCaseBlockers(proof);
      caseResults.push({
        ...proof,
        passed: blockers.length === 0,
        blockers,
      });
      console.info(JSON.stringify({
        case_id: testCase.case_id,
        passed: blockers.length === 0,
        blockers_count: blockers.length,
        first_blockers: blockers.slice(0, 8),
        error_sample: blockers.length > 0 ? proof.body_text_sample.slice(0, 500) : "",
        cases_done: caseResults.length,
        cases_total: WAVE2C_EXPANDED_CRITICAL_CASES.length,
      }));
      if (!healthAfter.android_lab_healthy) break;
    }
  } finally {
    server?.stop();
  }

  const failedCases = caseResults.filter((item) => !item.passed);
  const allCasesExecuted = caseResults.length === WAVE2C_EXPANDED_CRITICAL_CASES.length;
  const healthDegraded = caseResults.some((item) => !item.android_health_before_case.android_lab_healthy || !item.android_health_after_case.android_lab_healthy);
  const blockers = [
    allCasesExecuted ? "" : `not_all_cases_executed:${caseResults.length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    chromeAttached ? "" : "android_chrome_not_launched_or_attached",
    ...failedCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`)),
  ].filter(Boolean);
  const androidPdfMissingCount = caseResults.filter((item) => !item.domain.pdf_generated_from_snapshot || !item.pdf_button_visible_after_confirm).length;
  const androidBuyerMissingCount = caseResults.filter((item) => !item.domain.buyer_handoff_created || !item.domain.buyer_handoff_procurement_subset_valid).length;
  const summary: Wave2CAndroidSmokeSummary = {
    final_status: blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded
      ? GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE
      : STOP_AI_ESTIMATE_WAVE2C_EXPANDED_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: WAVE2C_EXPANDED_CASE_SET,
    base_url: baseUrl,
    require_real_browser: requireRealBrowser,
    require_emulator: requireEmulator,
    browser_automation_started: chromeAttached,
    android_emulator_detected: initialHealth.emulator_detected,
    android_chrome_launched_or_attached: chromeAttached,
    android_device_id: initialHealth.selected_serial,
    android_lab_health_checked: true,
    android_lab_healthy: initialHealth.android_lab_healthy && !healthDegraded,
    android_health_blocking_reasons: [
      ...initialHealth.blocking_reasons,
      ...caseResults.flatMap((item) => item.android_health_after_case.blocking_reasons),
    ],
    actual_android_emulator_wave2c_expanded_smoke_passed: blockers.length === 0 && allCasesExecuted && chromeAttached && !healthDegraded,
    android_wave2c_cases_passed: `${caseResults.filter((item) => item.passed).length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    android_cases_total: WAVE2C_EXPANDED_CRITICAL_CASES.length,
    android_cases_passed_count: caseResults.filter((item) => item.passed).length,
    android_cases_failed_count: failedCases.length + (allCasesExecuted ? 0 : WAVE2C_EXPANDED_CRITICAL_CASES.length - caseResults.length),
    android_empty_estimate_count: caseResults.filter((item) => item.domain.row_count === 0 || item.positions_empty_after_prompt).length,
    android_refusal_count: caseResults.filter((item) => item.refusal_visible || !item.domain.no_refusal).length,
    android_drawings_required_stop_count: caseResults.filter((item) => item.drawings_required_stop_visible || !item.domain.no_drawings_required_stop).length,
    android_raw_dump_ui_count: caseResults.filter((item) => item.raw_dump_visible || !item.domain.no_raw_dump).length,
    android_pdf_missing_count: androidPdfMissingCount,
    android_buyer_handoff_missing_count: androidBuyerMissingCount,
    android_console_errors_count: caseResults.reduce((sum, item) => sum + item.console_error_count, 0),
    android_emulator_health_degraded: healthDegraded,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    env_browser_green_rejected: true,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    fake_green_claimed: false,
    blockers,
    case_results: caseResults,
  };
  const artifactPath = path.join(outDir, "summary.json");
  if (options.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runWave2CExpandedBoqAndroidSmoke.ts")) {
  void runWave2CExpandedBoqAndroidSmoke({
    target: (argValue("target") ?? "android-chrome") as "android-chrome",
    cases: argValue("cases") ?? WAVE2C_EXPANDED_CASE_SET,
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url") ?? undefined,
    writeSummary: hasFlag("write-summary") || true,
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        actual_android_emulator_wave2c_expanded_smoke_passed: result.artifact.actual_android_emulator_wave2c_expanded_smoke_passed,
        android_wave2c_cases_passed: result.artifact.android_wave2c_cases_passed,
        android_emulator_detected: result.artifact.android_emulator_detected,
        android_chrome_launched_or_attached: result.artifact.android_chrome_launched_or_attached,
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
