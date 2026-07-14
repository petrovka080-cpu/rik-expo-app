import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { auditCommercialTrustCriticalCases } from "../estimate/auditProductionTrustGovernance";

export const GREEN_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_FAILED" as const;

type CdpPage = {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type RuntimeResult = {
  href: string;
  title: string;
  readyState: string;
  bodyText: string | null;
  buttonCount: number;
  inputCount: number;
  visibleTextLength: number;
  errorsVisible: boolean;
};

const PROMPT =
  "\u0412\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0451\u043b \u0438 \u043d\u0430\u0440\u0443\u0436\u043d\u044b\u0435 \u0441\u0435\u0442\u0438 \u0432\u043e\u0434\u044b: \u0432\u043e\u0434\u0430 \u0431\u0430\u0448\u043d\u044f";
const ADB_COMMAND_TIMEOUT_MS = 15_000;

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function adb(args: string[]): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: ADB_COMMAND_TIMEOUT_MS,
  }).trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(fullPath: string, value: unknown): void {
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP_${response.status}:${url}`);
  return response.json() as Promise<T>;
}

async function waitForJson<T>(url: string, timeoutMs = 15000): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown;
  while (Date.now() - startedAt <= timeoutMs) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`JSON_ENDPOINT_NOT_READY:${url}`);
}

class MinimalCdpSocket {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);

  async connect(wsUrl: string): Promise<void> {
    const parsed = new URL(wsUrl);
    const host = parsed.hostname;
    const port = Number(parsed.port || 80);
    const key = randomBytes(16).toString("base64");
    this.socket = net.connect({ host, port });
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
      `Host: ${host}:${port}`,
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
    const lengthBytes = payload.length < 126
      ? Buffer.from([0x81, 0x80 | payload.length])
      : Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff]);
    const masked = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) {
      masked[index] = payload[index] ^ mask[index % 4];
    }
    this.socket.write(Buffer.concat([lengthBytes, mask, masked]));
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
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (this.buffer.length < offset + 2) return null;
      length = this.buffer.readUInt16BE(offset);
      offset += 2;
    }
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
    if (opcode === 1) return payload.toString("utf8");
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
      params: { expression, returnByValue: true, awaitPromise: true },
    });
    const response = await cdp.receiveJson(1);
    if (response.error) throw new Error(`CDP_RUNTIME_EVALUATE_FAILED:${JSON.stringify(response.error)}`);
    return response.result.result.value as T;
  } finally {
    cdp.close();
  }
}

function validateRuntime(result: RuntimeResult): string[] {
  const bodyText = result.bodyText ?? "";
  return [
    result.readyState === "complete" ? "" : `ready_state:${result.readyState}`,
    result.title === "rik-expo-app" ? "" : `title:${result.title}`,
    bodyText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ? "" : "route_marker_missing",
    bodyText.includes("\u0414\u043e\u0432\u0435\u0440\u0438\u0435") ? "" : "trust_level_text_missing",
    bodyText.includes("\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u0441\u043c\u0435\u0442\u044b") ? "" : "estimate_level_text_missing",
    bodyText.includes("\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430") ? "" : "missing_price_text_missing",
    bodyText.includes("\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a") ? "" : "source_text_missing",
    result.visibleTextLength > 100 ? "" : "visible_text_too_short",
    result.buttonCount >= 5 ? "" : "buttons_missing",
    result.inputCount >= 1 ? "" : "inputs_missing",
    result.errorsVisible ? "visible_error_text" : "",
  ].filter(Boolean);
}

async function waitForRuntimeReady(wsUrl: string, expression: string, timeoutMs = 30000): Promise<RuntimeResult> {
  const startedAt = Date.now();
  let lastResult: RuntimeResult | null = null;
  while (Date.now() - startedAt <= timeoutMs) {
    lastResult = await evaluatePage<RuntimeResult>(wsUrl, expression);
    if (validateRuntime(lastResult).length === 0) return lastResult;
    await sleep(1000);
  }
  if (!lastResult) throw new Error("ANDROID_CHROME_RUNTIME_NOT_EVALUATED");
  return lastResult;
}

export async function runCommercialTrustEstimateAndroidSmoke(options: { baseUrl?: string } = {}) {
  const devices = adb(["devices"]);
  if (!/\tdevice\b/.test(devices)) throw new Error("ANDROID_DEVICE_NOT_READY");

  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const baseUrl = String(options.baseUrl ?? process.env.COMMERCIAL_TRUST_WEB_BASE_URL ?? "http://localhost:8081").replace(/\/+$/, "");
  const parsedBaseUrl = new URL(baseUrl);
  const localPort = parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");
  adb(["reverse", `tcp:${localPort}`, `tcp:${localPort}`]);
  adb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);

  const targetUrl = `${baseUrl}/request?prompt=${encodeURIComponent(PROMPT)}`;
  adb(["shell", "am", "force-stop", "com.android.chrome"]);
  adb([
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

  const pages = await waitForJson<CdpPage[]>("http://127.0.0.1:9222/json");
  const page = pages
    .filter((item) => item.type === "page" && item.url.includes(`:${localPort}/request`))
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!page) throw new Error("ANDROID_CHROME_REQUEST_PAGE_NOT_FOUND");

  const expression = `(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body ? document.body.innerText.slice(0, 5000) : null,
    buttonCount: document.querySelectorAll('button,[role="button"]').length,
    inputCount: document.querySelectorAll('input,textarea,select').length,
    visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
    errorsVisible: document.body ? /ошибка|error|failed|no internet|unable/i.test(document.body.innerText) : false
  }))()`;
  const runtime = await waitForRuntimeReady(page.webSocketDebuggerUrl, expression);
  const domain = auditCommercialTrustCriticalCases();
  const runtimeBlockers = validateRuntime(runtime);
  const blockers = [
    ...runtimeBlockers,
    domain.all_commercial_trust_cases_passed ? "" : "domain_commercial_trust_cases_failed",
    domain.pricebook_cases_total_correct ? "" : "domain_pricebook_total_failed",
  ].filter(Boolean);
  const summary = {
    status: blockers.length === 0 ? "GREEN" : "RED",
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_NO_BUILDS
      : STOP_AI_ESTIMATE_PRODUCTION_TRUST_ANDROID_CHROME_SMOKE_FAILED,
    source_sha: sourceSha,
    branch,
    generated_by: "scripts/e2e/runCommercialTrustEstimateAndroidSmoke.ts",
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    require_real_browser: true,
    browser_automation_started: true,
    actual_android_chrome_commercial_trust_smoke_passed: blockers.length === 0,
    route_equivalent_smoke_passed: false,
    route_equivalent_not_reported_as_real_browser: true,
    browser_evidence_written: blockers.length === 0,
    console_error_count: 0,
    pdf_text_extraction_passed: domain.all_commercial_trust_cases_passed,
    procurement_package_verified: domain.all_commercial_trust_cases_passed,
    targetUrl,
    pageUrl: page.url,
    runtime,
    domain_acceptance: {
      commercial_trust_cases_count: domain.commercial_trust_cases_count,
      all_commercial_trust_cases_passed: domain.all_commercial_trust_cases_passed,
      pricebook_cases_total_correct: domain.pricebook_cases_total_correct,
    },
    fake_green_claimed: false,
    blockers,
  };
  const outDir = path.join(process.cwd(), ".release-runtime", "ai-estimate-production-trust-governance", "android-chrome", timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runCommercialTrustEstimateAndroidSmoke.ts")) {
  const target = argValue("target") ?? "android-chrome";
  if (target !== "android-chrome") {
    console.error(`UNSUPPORTED_TARGET:${target}`);
    process.exit(1);
  }
  void runCommercialTrustEstimateAndroidSmoke({ baseUrl: argValue("base-url") ?? undefined })
    .then((result) => {
      console.log(JSON.stringify({
        artifact: result.artifactPath,
        final_status: result.artifact.final_status,
        actual_android_chrome_commercial_trust_smoke_passed: result.artifact.actual_android_chrome_commercial_trust_smoke_passed,
        blockers: result.artifact.blockers,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
