import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "playwright";

import { buildEstimateSupportPackage } from "../estimate/exportEstimateSupportPackage";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "web");
const DEFAULT_BASE_URL = "http://localhost:8081";
const PILOT_PROMPT = "\u0432\u043e\u0434\u043e\u0441\u043d\u0430\u0431\u0436\u0435\u043d\u0438\u0435 \u0441\u0435\u043b\u0430 5 \u043a\u043c \u0442\u0440\u0443\u0431\u0430 \u041f\u0415100 d110";

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

async function pageState(page: Page) {
  return page.evaluate(() => ({
    title: document.title,
    bodyText: document.body?.innerText ?? "",
    pilotBadgeVisible: Boolean(document.querySelector('[data-testid="estimate-pilot-badge"]')),
    topProofVisible: Boolean(document.querySelector('[data-testid="request-estimate-top-proof"]')),
    routeMarkerOnly: document.body?.innerText.trim() === "ROUTE_PROOF_REQUEST_ROUTE_READY",
  }));
}

async function main() {
  const requireRealBrowser = hasFlag("require-real-browser");
  const target = argValue("target") ?? "web";
  if (requireRealBrowser && target !== "web") throw new Error(`web_smoke_target_mismatch:${target}`);
  const baseUrl = String(process.env.ESTIMATE_PILOT_WEB_BASE_URL ?? process.env.RIK_WEB_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
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

  let state: Awaited<ReturnType<typeof pageState>>;
  try {
    await page.goto(`${baseUrl}/request`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByTestId("consumer-repair-problem-input").fill(PILOT_PROMPT);
    await page.getByTestId("consumer-repair-prepare-draft").click();
    state = await poll(async () => {
      const next = await pageState(page);
      return next.pilotBadgeVisible && next.topProofVisible ? next : null;
    }, 60_000);
  } finally {
    await browser.close();
    server.stop();
  }

  const supportPackage = buildEstimateSupportPackage({ prompt: PILOT_PROMPT });
  const blockers = [
    state.title === "rik-expo-app" ? "" : "browser_title_unexpected",
    state.pilotBadgeVisible ? "" : "pilot_badge_missing",
    state.topProofVisible ? "" : "top_proof_missing",
    state.bodyText.includes("\u041f\u0438\u043b\u043e\u0442") ? "" : "pilot_text_missing",
    state.routeMarkerOnly ? "route_marker_only_smoke_rejected" : "",
    consoleErrors.length === 0 ? "" : `console_errors:${consoleErrors.length}`,
    pageErrors.length === 0 ? "" : `page_errors:${pageErrors.length}`,
    supportPackage.raw_prompt_included === false ? "" : "support_package_raw_prompt_included",
    (supportPackage.procurement_package as { material_count?: number } | undefined) ? "" : "procurement_package_missing",
  ].filter(Boolean);
  const artifact = {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PRODUCT_PILOT_WEB_BROWSER_SMOKE_NO_BUILDS"
      : "STOP_AI_ESTIMATE_PRODUCT_PILOT_WEB_BROWSER_SMOKE_FAILED",
    target,
    baseUrl,
    actual_web_browser_estimate_pilot_smoke_passed: blockers.length === 0,
    route_equivalent_not_reported_as_real_browser: true,
    route_equivalent_smoke_passed: false,
    browser_automation_started: true,
    pilot_badge_visible: state.pilotBadgeVisible,
    pdf_generated: Boolean((supportPackage.pdf as { generated?: boolean } | undefined)?.generated),
    procurement_package_generated: Boolean(supportPackage.procurement_package),
    support_package_exported: true,
    console_error_count: consoleErrors.length,
    page_error_count: pageErrors.length,
    blockers,
    consoleErrors,
    pageErrors,
  };
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, artifact);
  console.info(JSON.stringify({ ...artifact, artifact: outPath }, null, 2));
  if (blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
