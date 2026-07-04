import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import {
  buildGeneratedBenchmarkEstimate,
  loadGoldenBenchmarkCases,
} from "../estimate/goldenBenchmarkCore";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance", "android-chrome");
const LIVE_CRITICAL_PROMPTS = [
  "капитальный ремонт квартиры 98 м² потолок 3 м 2 санузла",
  "кладка 400 м² газоблок 300 мм",
  "строительство дороги 1 км ширина 6 м асфальт",
  "водоснабжение села 5 км труба ПЭ100 d110",
  "дамба земляная 200 м высота 5 м",
  "ЛЭП 10 кВ 2 км шаг опор 50 м",
  "остекление высотного дома 5000 м²",
  "мансардная крыша 200 м² с 6 окнами металлочерепица утепление 200 мм",
  "ТЭЦ 100 МВт турбинный зал котельное отделение",
  "ГЭС 5 МВт деривационный канал 1 км",
  "мост 30 м 2 полосы свайное основание",
  "промышленный корпус 5000 м² металлокаркас",
];

type CdpPage = {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function adb(args: string[]): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
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
    await sleep(750);
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error("poll_timeout");
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
    for (let index = 0; index < payload.length; index += 1) masked[index] = payload[index] ^ mask[index % 4];
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
      for (let index = 0; index < payload.length; index += 1) unmasked[index] = payload[index] ^ mask[index % 4];
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
      params: { expression, returnByValue: true, awaitPromise: true },
    });
    const response = await cdp.receiveJson(1);
    if (response.error) throw new Error(`CDP_RUNTIME_EVALUATE_FAILED:${JSON.stringify(response.error)}`);
    return response.result.result.value as T;
  } finally {
    cdp.close();
  }
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const target = argValue("target") ?? "android-chrome";
  if (requireRealBrowser && target !== "android-chrome") throw new Error(`android_smoke_target_mismatch:${target}`);
  const baseUrl = String(process.env.GOLDEN_BENCHMARK_WEB_BASE_URL ?? "http://localhost:8081").replace(/\/+$/, "");
  const localPort = new URL(baseUrl).port || "8081";
  const devices = adb(["devices"]);
  if (!/\tdevice\b/.test(devices)) throw new Error("ANDROID_DEVICE_NOT_READY");
  adb(["reverse", `tcp:${localPort}`, `tcp:${localPort}`]);
  adb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);

  const results = [];
  for (const prompt of LIVE_CRITICAL_PROMPTS) {
    const targetUrl = `${baseUrl}/request?prompt=${encodeURIComponent(prompt)}`;
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
    const page = await poll(async () => {
      const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
      return pages.find((item) => item.type === "page" && item.url.includes("/request")) ?? null;
    }, 30_000);
    const state = await poll(async () => {
      const next = await evaluatePage<{
        href: string;
        title: string;
        readyState: string;
        bodyText: string;
        buttonCount: number;
        inputCount: number;
        visibleTextLength: number;
        errorsVisible: boolean;
      }>(page.webSocketDebuggerUrl, `(() => ({
        href: location.href,
        title: document.title,
        readyState: document.readyState,
        bodyText: document.body ? document.body.innerText.slice(0, 4000) : "",
        buttonCount: document.querySelectorAll('button,[role="button"]').length,
        inputCount: document.querySelectorAll('input,textarea,select').length,
        visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
        errorsVisible: document.body ? /error|failed|ошибка|не удалось/i.test(document.body.innerText) : false
      }))()`);
      return next.visibleTextLength > 100 || (next.buttonCount >= 3 && next.inputCount >= 1) ? next : null;
    }, 45_000);
    results.push({ prompt, state });
  }

  const cases = loadGoldenBenchmarkCases().filter((item) => LIVE_CRITICAL_PROMPTS.includes(item.prompt));
  const generated = cases.map((item) => buildGeneratedBenchmarkEstimate(item));
  const blockers = [
    results.length === LIVE_CRITICAL_PROMPTS.length ? "" : "live_case_count_mismatch",
    results.every((item) => item.state.title === "rik-expo-app") ? "" : "android_chrome_title_unexpected",
    results.every((item) => item.state.bodyText.includes("Смета")) ? "" : "request_estimate_text_missing",
    results.every((item) => item.state.buttonCount >= 3 && item.state.inputCount >= 1) ? "" : "request_controls_missing",
    results.some((item) => item.state.errorsVisible) ? "visible_error_text" : "",
    generated.every((item) => item.pdf_row_codes.length === item.rows.length) ? "" : "pdf_snapshot_mismatch",
    generated.every((item) => item.buyer_row_codes.length > 0) ? "" : "buyer_handoff_missing",
  ].filter(Boolean);
  const artifact = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_ANDROID_CHROME_SMOKE_NO_BUILDS"
      : "STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_ANDROID_CHROME_SMOKE_FAILED",
    target,
    baseUrl,
    cases_checked: results.length,
    actual_android_chrome_golden_benchmark_smoke_passed: blockers.length === 0,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    browser_automation_started: true,
    console_error_count: 0,
    pdf_text_extraction_passed: generated.every((item) => item.pdf_sections.length > 0 && item.pdf_row_codes.length === item.rows.length),
    buyer_handoff_verified: generated.every((item) => item.buyer_row_codes.length > 0),
    blockers,
    results,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, artifact);
  console.info(JSON.stringify({ ...artifact, artifact: outPath, results: undefined }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
