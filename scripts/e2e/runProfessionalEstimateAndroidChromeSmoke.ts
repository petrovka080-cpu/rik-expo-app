import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
} from "../../src/lib/ai/professionalEstimateCalculator";

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
  rootChildCount: number | null;
  visibleTextLength: number;
  errorsVisible: boolean;
};

const ADB_COMMAND_TIMEOUT_MS = 15_000;

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

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
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
      : payload.length <= 0xffff
        ? Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
        : this.largeHeader(payload.length);
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

  private largeHeader(length: number): Buffer {
    const header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(length), 2);
    return header;
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
    } else if (length === 127) {
      if (this.buffer.length < offset + 8) return null;
      length = Number(this.buffer.readBigUInt64BE(offset));
      offset += 8;
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
      params: {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
    });
    const response = await cdp.receiveJson(1);
    if (response.error) throw new Error(`CDP_RUNTIME_EVALUATE_FAILED:${JSON.stringify(response.error)}`);
    return response.result.result.value as T;
  } finally {
    cdp.close();
  }
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

function validateRuntime(result: RuntimeResult): string[] {
  return [
    result.readyState === "complete" ? "" : `ANDROID_CHROME_READY_STATE_NOT_COMPLETE:${result.readyState}`,
    result.title === "rik-expo-app" ? "" : `ANDROID_CHROME_TITLE_UNEXPECTED:${result.title}`,
    result.bodyText?.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ? "" : "ANDROID_CHROME_REQUEST_ROUTE_MARKER_MISSING",
    result.bodyText?.includes("Смета") ? "" : "ANDROID_CHROME_REQUEST_SCREEN_TEXT_MISSING",
    result.bodyText?.includes("Позиции пока пустые") ? "" : "ANDROID_CHROME_REQUEST_DRAFT_STATE_TEXT_MISSING",
    result.visibleTextLength > 100 ? "" : "ANDROID_CHROME_VISIBLE_TEXT_TOO_SHORT",
    result.buttonCount >= 5 ? "" : "ANDROID_CHROME_EXPECTED_BUTTONS_MISSING",
    result.inputCount >= 1 ? "" : "ANDROID_CHROME_EXPECTED_INPUTS_MISSING",
    result.errorsVisible ? "ANDROID_CHROME_VISIBLE_ERROR_TEXT" : "",
  ].filter(Boolean);
}

async function main() {
  const devices = adb(["devices"]);
  if (!/\tdevice\b/.test(devices)) throw new Error("ANDROID_DEVICE_NOT_READY");
  adb(["reverse", "tcp:8091", "tcp:8091"]);
  adb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);

  const targetUrl = "http://localhost:8091/request?prompt=%D0%BA%D0%B0%D0%BC%D0%B5%D0%BD%D0%BD%D1%83%D1%8E%20%D0%BA%D0%BB%D0%B0%D0%B4%D0%BA%D1%83%20400%20%D0%BA%D0%B2%20%D0%BC%D0%B5%D1%82%D1%80%D0%B0";
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
  await sleep(2000);

  const pages = await waitForJson<CdpPage[]>("http://127.0.0.1:9222/json");
  const page = pages
    .filter((item) => item.type === "page" && item.url.includes(":8091/request"))
    .sort((left, right) => Number(right.id) - Number(left.id))[0];
  if (!page) throw new Error("ANDROID_CHROME_REQUEST_PAGE_NOT_FOUND");

  const expression = `(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body ? document.body.innerText.slice(0, 3000) : null,
    buttonCount: document.querySelectorAll('button,[role="button"]').length,
    inputCount: document.querySelectorAll('input,textarea,select').length,
    rootChildCount: document.getElementById('root') ? document.getElementById('root').childElementCount : null,
    visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
    errorsVisible: document.body ? /ошибка|error|failed|no internet|unable/i.test(document.body.innerText) : false
  }))()`;
  const runtime = await waitForRuntimeReady(page.webSocketDebuggerUrl, expression);
  const blockers = validateRuntime(runtime);
  const generatedAt = new Date().toISOString();
  const artifact = {
    status: blockers.length === 0 ? "GREEN" : "RED",
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS
      : "STOP_ANDROID_CHROME_PROFESSIONAL_AI_ESTIMATE_SMOKE_NOT_GREEN",
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    artifact_schema_version: 1,
    generated_by: "scripts/e2e/runProfessionalEstimateAndroidChromeSmoke.ts",
    generated_at: generatedAt,
    targetUrl,
    pageUrl: page.url,
    title: page.title,
    runtime,
    blockers,
    fake_green_claimed: false,
    fakeGreenClaimed: false,
    createdAt: generatedAt,
  };
  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "professional-ai-estimate-real-quantity-engine",
    "android-chrome",
    timestampForPath(),
  );
  mkdirSync(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    status: artifact.status,
    artifact: artifactPath,
    blockers,
    href: runtime.href,
    buttonCount: runtime.buttonCount,
    inputCount: runtime.inputCount,
    visibleTextLength: runtime.visibleTextLength,
  }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
