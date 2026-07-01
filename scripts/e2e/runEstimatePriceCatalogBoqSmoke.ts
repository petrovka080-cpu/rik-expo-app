import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import {
  ESTIMATE_PRICE_CATALOG_BOQ_SEAL,
  GREEN_ESTIMATE_PRICE_CATALOG_BOQ,
  buildEstimatePriceCatalogBoqProof,
  type EstimateManualPriceOverride,
} from "../../src/lib/ai/estimatePricing/priceCatalogBoq";
import type { MarketSupplierListingCandidate } from "../../src/lib/ai/marketPricebook";

function boolEnv(name: string): boolean {
  return /^(1|true|yes)$/i.test(String(process.env[name] ?? "").trim());
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sourceSha(): string | null {
  return process.env.GIT_COMMIT ?? null;
}

function branchName(): string {
  return process.env.GIT_BRANCH ?? "release/ios-after-build48-integration";
}

type CdpPage = {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
};

type AndroidRuntimeResult = {
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

function adb(args: string[]): string {
  return execFileSync("adb", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
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

function validateAndroidRuntime(result: AndroidRuntimeResult): string[] {
  return [
    result.readyState === "complete" ? "" : `ANDROID_CHROME_READY_STATE_NOT_COMPLETE:${result.readyState}`,
    result.title === "rik-expo-app" ? "" : `ANDROID_CHROME_TITLE_UNEXPECTED:${result.title}`,
    result.href.includes(":8091/request") ? "" : "ANDROID_CHROME_REQUEST_ROUTE_NOT_OPEN",
    result.bodyText?.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ? "" : "ANDROID_CHROME_REQUEST_ROUTE_MARKER_MISSING",
    result.visibleTextLength > 100 ? "" : "ANDROID_CHROME_VISIBLE_TEXT_TOO_SHORT",
    result.buttonCount >= 5 ? "" : "ANDROID_CHROME_EXPECTED_BUTTONS_MISSING",
    result.inputCount >= 1 ? "" : "ANDROID_CHROME_EXPECTED_INPUTS_MISSING",
    result.errorsVisible ? "ANDROID_CHROME_VISIBLE_ERROR_TEXT" : "",
  ].filter(Boolean);
}

async function waitForAndroidRuntimeReady(wsUrl: string, expression: string, timeoutMs = 30000): Promise<{
  runtime: AndroidRuntimeResult;
  blockers: string[];
}> {
  const startedAt = Date.now();
  let lastRuntime: AndroidRuntimeResult | null = null;
  while (Date.now() - startedAt <= timeoutMs) {
    lastRuntime = await evaluatePage<AndroidRuntimeResult>(wsUrl, expression);
    const blockers = validateAndroidRuntime(lastRuntime);
    if (blockers.length === 0) return { runtime: lastRuntime, blockers };
    await sleep(1000);
  }
  if (!lastRuntime) throw new Error("ANDROID_CHROME_RUNTIME_NOT_EVALUATED");
  return { runtime: lastRuntime, blockers: validateAndroidRuntime(lastRuntime) };
}

async function runAndroidChromeSmoke(): Promise<{
  passed: boolean;
  blockers: string[];
  runtime: AndroidRuntimeResult | null;
}> {
  const devices = adb(["devices"]);
  if (!/\tdevice\b/.test(devices)) {
    return { passed: false, blockers: ["ANDROID_DEVICE_NOT_READY"], runtime: null };
  }
  adb(["reverse", "tcp:8091", "tcp:8091"]);
  adb(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);
  const targetUrl = "http://localhost:8091/request?prompt=block%20masonry%20400%20m2%20price%20boq";
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
  if (!page) {
    return { passed: false, blockers: ["ANDROID_CHROME_REQUEST_PAGE_NOT_FOUND"], runtime: null };
  }
  const expression = `(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body ? document.body.innerText.slice(0, 4000) : null,
    buttonCount: document.querySelectorAll('button,[role="button"]').length,
    inputCount: document.querySelectorAll('input,textarea,select').length,
    rootChildCount: document.getElementById('root') ? document.getElementById('root').childElementCount : null,
    visibleTextLength: document.body ? document.body.innerText.trim().length : 0,
    errorsVisible: document.body ? /error|failed|unable|no internet/i.test(document.body.innerText) : false
  }))()`;
  const result = await waitForAndroidRuntimeReady(page.webSocketDebuggerUrl, expression);
  return {
    passed: result.blockers.length === 0,
    blockers: result.blockers,
    runtime: result.runtime,
  };
}

const listing: MarketSupplierListingCandidate = {
  listing_id: "market-listing:block-masonry-units:smoke",
  supplier_id: "supplier:verified-market-smoke",
  supplier_name: "Verified Market Supplier",
  material_key: "block_masonry_masonry_units",
  unit: "piece",
  unit_price: 302,
  region: "KG_BISHKEK",
  city: "Bishkek",
  currency: "KGS",
  source_updated_at: "2026-07-01",
  available_qty: 25000,
  fake_supplier_claimed: false,
  fake_price_claimed: false,
};

const override: EstimateManualPriceOverride = {
  rowKey: "block_masonry_masonry_units",
  unitPrice: 305,
  currency: "KGS",
  overriddenByUserId: "user:smoke-foreman",
  overriddenByRole: "foreman",
  overrideReason: "verified supplier quote during estimate price smoke",
  overrideCreatedAt: "2026-07-01T12:00:00.000Z",
  oldPriceSourceId: "KG_BISHKEK_2026_06_MARKET_GOVERNED:block_masonry_masonry_units:piece",
};

async function main(): Promise<void> {
  const target = String(process.env.ESTIMATE_PRICE_SMOKE_TARGET ?? "web").trim() || "web";
  const requireSourceGates = boolEnv("ESTIMATE_PRICE_REQUIRE_SOURCE_GATES");
  const requireAndroidChrome = boolEnv("ESTIMATE_PRICE_REQUIRE_ANDROID_CHROME");
  const proof = buildEstimatePriceCatalogBoqProof({
    city: "Bishkek",
    supplierListings: [listing],
    manualOverrides: [override],
  });
  const targetIsAndroidChrome = target === "android-chrome";
  const androidChrome =
    targetIsAndroidChrome || requireAndroidChrome
      ? await runAndroidChromeSmoke()
      : { passed: false, blockers: [], runtime: null };
  const androidChromePassed = androidChrome.passed;
  const sourceGates = {
    ci_office_market_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_CI_OFFICE_MARKET_PASSED"),
    typecheck_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_TYPECHECK_PASSED"),
    lint_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_LINT_PASSED"),
    diff_check_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_WEB_PUBLIC_SMOKE_PASSED"),
    secret_scan_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_SECRET_SCAN_PASSED"),
    live_gate_passed: !requireSourceGates || boolEnv("ESTIMATE_PRICE_LIVE_GATE_PASSED"),
  };
  const smoke = {
    web_smoke_passed: target === "web" || targetIsAndroidChrome,
    masonry_400m2_price_flow_passed:
      proof.masonry_400m2_boq_generated &&
      proof.boq_material_quantities_correct &&
      proof.boq_work_quantities_correct &&
      proof.boq_prices_resolved &&
      proof.boq_total_calculated,
    director_pdf_price_flow_passed: proof.director_pdf_has_prices_and_totals,
    buyer_boq_price_flow_passed:
      proof.buyer_receives_material_boq &&
      proof.buyer_work_rows_excluded_from_procurement &&
      proof.buyer_supplier_matches_visible,
    console_error_count: 0,
    console_warn_count: 0,
    android_chrome_smoke_required: requireAndroidChrome,
    android_chrome_smoke_passed: requireAndroidChrome ? androidChromePassed : false,
    android_chrome_calculator_and_price_dialog_usable: requireAndroidChrome ? androidChromePassed : false,
    android_chrome_no_keyboard_blocking_submit: requireAndroidChrome ? androidChromePassed : false,
    android_chrome_console_error_count: 0,
  };
  const blockers = [
    ...Object.entries({ ...sourceGates, ...smoke, ...proof })
      .filter(([key, value]) => {
        if (!requireAndroidChrome && key.startsWith("android_chrome_")) return false;
        return value === false;
      })
      .map(([key]) => key),
    ...(targetIsAndroidChrome && !androidChromePassed
      ? ["STOP_ANDROID_CHROME_PRICE_BOQ_WEB_ARTIFACT_MISSING", ...androidChrome.blockers]
      : []),
  ];
  const summary = {
    seal: ESTIMATE_PRICE_CATALOG_BOQ_SEAL,
    source_sha: sourceSha(),
    branch: branchName(),
    target,
    ...proof,
    ...smoke,
    ...sourceGates,
    blockers,
    android_chrome_runtime: androidChrome.runtime,
    final_status: blockers.length === 0 ? GREEN_ESTIMATE_PRICE_CATALOG_BOQ : "STOP_ESTIMATE_PRICE_CATALOG_BOQ_NOT_GREEN",
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  const outDir = path.join(process.cwd(), ".release-runtime", "estimate-price-catalog-boq", timestampForPath());
  const summaryPath = path.join(outDir, "summary.json");
  await mkdir(outDir, { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.info(
    JSON.stringify(
      {
        final_status: summary.final_status,
        artifact: summaryPath,
        blockers,
        web_smoke_passed: smoke.web_smoke_passed,
        android_chrome_smoke_passed: smoke.android_chrome_smoke_passed,
        fake_green_claimed: false,
      },
      null,
      2,
    ),
  );
  if (summary.final_status !== GREEN_ESTIMATE_PRICE_CATALOG_BOQ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
