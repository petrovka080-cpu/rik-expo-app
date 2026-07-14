import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

import { buildEstimateSupportPackage } from "../estimate/exportEstimateSupportPackage";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "android-chrome");
const DEFAULT_BASE_URL = "http://localhost:8081";
const PILOT_PROMPT = "\u0434\u043e\u0440\u043e\u0433\u0430 1 \u043a\u043c \u0448\u0438\u0440\u0438\u043d\u0430 6 \u043c \u0430\u0441\u0444\u0430\u043b\u044c\u0442";

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

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((item) => item.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
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
  const outDir = path.join(RUNTIME_ROOT, "web-server");
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
  const baseUrl = String(process.env.ESTIMATE_PILOT_WEB_BASE_URL ?? process.env.RIK_WEB_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const server = await ensureWebServer(baseUrl);
  try {
    const localPort = new URL(baseUrl).port || "8081";
    const devices = adb(["devices"]);
    if (!/\tdevice\b/.test(devices)) throw new Error("ANDROID_DEVICE_NOT_READY");
    adb(["reverse", `tcp:${localPort}`, `tcp:${localPort}`]);
    adb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
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
      `${baseUrl}/request`,
    ]);
    const page = await poll(async () => {
      const pages = await fetchJson<CdpPage[]>("http://127.0.0.1:9222/json");
      return pages.find((item) => item.type === "page" && item.url.includes("/request")) ?? null;
    }, 30_000);
    await poll(async () => {
      const ready = await evaluatePage<boolean>(page.webSocketDebuggerUrl, "document.readyState === 'complete' || document.readyState === 'interactive'");
      return ready ? true : null;
    }, 45_000);
    const state = await poll(async () => {
      const next = await evaluatePage<{
        title: string;
        bodyText: string;
        pilotBadgeVisible: boolean;
        topProofVisible: boolean;
        routeMarkerOnly: boolean;
      }>(page.webSocketDebuggerUrl, `(() => {
        const input = document.querySelector('[data-testid="consumer-repair-problem-input"]');
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          nativeInputValueSetter?.call(input, ${JSON.stringify(PILOT_PROMPT)});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        document.querySelector('[data-testid="consumer-repair-prepare-draft"]')?.click();
        return {
          title: document.title,
          bodyText: document.body ? document.body.innerText : "",
          pilotBadgeVisible: Boolean(document.querySelector('[data-testid="estimate-pilot-badge"]')),
          topProofVisible: Boolean(document.querySelector('[data-testid="request-estimate-top-proof"]')),
          routeMarkerOnly: document.body ? document.body.innerText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY" : false
        };
      })()`);
      return next.pilotBadgeVisible && next.topProofVisible ? next : null;
    }, 60_000);

    const supportPackage = buildEstimateSupportPackage({ prompt: PILOT_PROMPT });
    const blockers = [
      state.title === "rik-expo-app" ? "" : "android_chrome_title_unexpected",
      state.pilotBadgeVisible ? "" : "pilot_badge_missing",
      state.topProofVisible ? "" : "top_proof_missing",
      state.routeMarkerOnly ? "route_marker_only_smoke_rejected" : "",
      (supportPackage.pdf as { generated?: boolean } | undefined)?.generated ? "" : "pdf_generation_missing",
      supportPackage.procurement_package ? "" : "procurement_package_missing",
    ].filter(Boolean);
    const artifact = {
      final_status: blockers.length === 0
        ? "GREEN_AI_ESTIMATE_PRODUCT_PILOT_ANDROID_CHROME_SMOKE_NO_BUILDS"
        : "STOP_AI_ESTIMATE_PRODUCT_PILOT_ANDROID_CHROME_SMOKE_FAILED",
      target,
      baseUrl,
      actual_android_chrome_estimate_pilot_smoke_passed: blockers.length === 0,
      route_equivalent_not_reported_as_real_browser: true,
      route_equivalent_smoke_passed: false,
      browser_automation_started: true,
      pilot_badge_visible: state.pilotBadgeVisible,
      pdf_generated: Boolean((supportPackage.pdf as { generated?: boolean } | undefined)?.generated),
      procurement_package_generated: Boolean(supportPackage.procurement_package),
      support_package_exported: true,
      blockers,
    };
    const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
    writeJson(outPath, artifact);
    console.info(JSON.stringify({ ...artifact, artifact: outPath }, null, 2));
    if (blockers.length > 0) process.exitCode = 1;
  } finally {
    server.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
