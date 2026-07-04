import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import {
  buildGeneratedBenchmarkEstimate,
  loadGoldenBenchmarkCases,
} from "../estimate/goldenBenchmarkCore";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance", "web");
const DEFAULT_BASE_URL = "http://localhost:8081";

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

function stopProcessTree(child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
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

async function ensureWebServer(baseUrl: string): Promise<ServerHandle> {
  if (await isReady(baseUrl)) return { started: false, stop: () => undefined };
  const outDir = path.join(".release-runtime", "ai-estimate-golden-benchmark-acceptance", "web-server");
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
  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

async function readPageState(page: Page) {
  return page.evaluate(() => ({
    href: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body?.innerText.slice(0, 6000) ?? "",
    buttonCount: document.querySelectorAll("button,[role='button']").length,
    inputCount: document.querySelectorAll("input,textarea,select").length,
    visibleTextLength: document.body?.innerText.trim().length ?? 0,
    routeMarkerVisible: document.body?.innerText.includes("ROUTE_PROOF_REQUEST_ROUTE_READY") ?? false,
    errorsVisible: /error|failed|ошибка|не удалось/i.test(document.body?.innerText ?? ""),
  }));
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const target = argValue("target") ?? "web";
  if (requireRealBrowser && target !== "web") throw new Error(`web_smoke_target_mismatch:${target}`);
  const baseUrl = String(process.env.GOLDEN_BENCHMARK_WEB_BASE_URL ?? process.env.RIK_WEB_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const server = await ensureWebServer(baseUrl);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const results = [];
  try {
    for (const prompt of LIVE_CRITICAL_PROMPTS) {
      await page.goto(`${baseUrl}/request?prompt=${encodeURIComponent(prompt)}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const state = await poll(async () => {
        const next = await readPageState(page);
        return next.visibleTextLength > 100 || (next.buttonCount >= 3 && next.inputCount >= 1) ? next : null;
      }, 60_000);
      results.push({ prompt, state });
    }
  } finally {
    await browser.close();
    server.stop();
  }

  const cases = loadGoldenBenchmarkCases().filter((item) => LIVE_CRITICAL_PROMPTS.includes(item.prompt));
  const generated = cases.map((item) => buildGeneratedBenchmarkEstimate(item));
  const blockers = [
    results.length === LIVE_CRITICAL_PROMPTS.length ? "" : "live_case_count_mismatch",
    results.every((item) => item.state.title === "rik-expo-app") ? "" : "browser_title_unexpected",
    results.every((item) => item.state.bodyText.includes("Смета")) ? "" : "request_estimate_text_missing",
    results.every((item) => item.state.inputCount >= 1 && item.state.buttonCount >= 3) ? "" : "request_controls_missing",
    results.some((item) => item.state.errorsVisible) ? "visible_error_text" : "",
    consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
    pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
    generated.every((item) => item.pdf_row_codes.length === item.rows.length) ? "" : "pdf_snapshot_mismatch",
    generated.every((item) => item.buyer_row_codes.every((code) => {
      const row = item.rows.find((candidate) => candidate.code === code);
      return row && row.included_in_procurement && row.line_type !== "work" && row.line_type !== "helper";
    })) ? "" : "buyer_handoff_invalid",
  ].filter(Boolean);

  const artifact = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_WEB_BROWSER_SMOKE_NO_BUILDS"
      : "STOP_AI_ESTIMATE_GOLDEN_BENCHMARK_WEB_BROWSER_SMOKE_FAILED",
    target,
    baseUrl,
    cases_checked: results.length,
    actual_web_browser_golden_benchmark_smoke_passed: blockers.length === 0,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    browser_automation_started: true,
    console_error_count: consoleErrors.length,
    page_error_count: pageErrors.length,
    pdf_text_extraction_passed: generated.every((item) => item.pdf_sections.length > 0 && item.pdf_row_codes.length === item.rows.length),
    buyer_handoff_verified: generated.every((item) => item.buyer_row_codes.length > 0),
    blockers,
    consoleErrors,
    pageErrors,
    results,
  };
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const outPath = path.join(outDir, "summary.json");
  writeJson(outPath, artifact);
  console.info(JSON.stringify({ ...artifact, artifact: outPath, results: undefined }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
