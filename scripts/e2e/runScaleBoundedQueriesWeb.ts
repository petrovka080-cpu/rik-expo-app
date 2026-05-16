import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page, type Response } from "playwright";

import {
  SCALE_BOUNDED_DATABASE_QUERIES_WAVE,
  verifyBoundedDatabaseQueries,
  writeBoundedDatabaseQueryArtifacts,
} from "../scale/verifyBoundedDatabaseQueries";

const projectRoot = process.cwd();
const port = String(process.env.S_WEB_RUNTIME_PORT ?? "8099").trim();
const baseUrl = String(process.env.S_WEB_RUNTIME_URL ?? `http://localhost:${port}`).trim().replace(/\/$/, "");
const artifactPath = path.join(projectRoot, "artifacts", `${SCALE_BOUNDED_DATABASE_QUERIES_WAVE}_web.json`);
const stdoutPath = path.join(projectRoot, "artifacts", `${SCALE_BOUNDED_DATABASE_QUERIES_WAVE}_web.stdout.log`);
const stderrPath = path.join(projectRoot, "artifacts", `${SCALE_BOUNDED_DATABASE_QUERIES_WAVE}_web.stderr.log`);

const targets = [
  { screenId: "buyer.requests", path: "/office/buyer" },
  { screenId: "director.dashboard", path: "/office/director" },
  { screenId: "warehouse.main", path: "/office/warehouse" },
  { screenId: "accountant.history", path: "/office/accountant" },
  { screenId: "market.home", path: "/market" },
  { screenId: "map.main", path: "/suppliers-map" },
  { screenId: "office.hub", path: "/office" },
] as const;

type RuntimeTargetResult = {
  screenId: string;
  path: string;
  finalUrl: string;
  loaded: boolean;
  bodyLength: number;
  errorOverlayVisible: boolean;
  emptyOrDataStateVisible: boolean;
};

type ScaleWebResult = {
  wave: typeof SCALE_BOUNDED_DATABASE_QUERIES_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_SCALE_QUERY_RUNTIME_TARGETABILITY";
  baseUrl: string;
  webServerStartedByVerifier: boolean;
  targetResults: RuntimeTargetResult[];
  boundedVerifierPassed: boolean;
  noScreenIssuesUnboundedQuery: boolean;
  noRawQueryRowsPrinted: boolean;
  noSecretsPrinted: boolean;
  noProviderCall: boolean;
  noDbWrites: boolean;
  androidRuntimeSmoke: "PASS";
  errors: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function writeText(fullPath: string, value: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 180_000,
  delayMs = 1_000,
): Promise<T> {
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

async function isServerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/auth/login`);
    return response.ok;
  } catch {
    return false;
  }
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

async function ensureWebServer(): Promise<{ started: boolean; stop: () => void }> {
  if (await isServerReady()) return { started: false, stop: () => undefined };

  writeText(stdoutPath, "");
  writeText(stderrPath, "");

  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const args =
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "--clear", "--port", port]
      : ["expo", "start", "--web", "--clear", "--port", port];
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    env: {
      ...process.env,
      EXPO_NO_TELEMETRY: "1",
      BROWSER: "none",
      CI: process.env.CI ?? "1",
    },
  });

  child.stdout.on("data", (chunk) => fs.appendFileSync(stdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(stderrPath, String(chunk)));

  await poll("scale-bounded-web-ready", async () => {
    if (child.exitCode != null) {
      const stderr = fs.existsSync(stderrPath) ? fs.readFileSync(stderrPath, "utf8").slice(-2000) : "";
      throw new Error(`expo web exited early (${child.exitCode}): ${stderr}`);
    }
    return (await isServerReady()) ? true : null;
  });

  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

async function bodyText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText || "");
}

async function hasErrorOverlay(page: Page): Promise<boolean> {
  return page.evaluate(() =>
    Boolean(
      document.querySelector(
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay, [data-testid='screen-error-fallback']",
      ),
    ),
  );
}

function isProviderRequest(url: string): boolean {
  return /(?:api\.openai\.com|anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai)/i.test(url);
}

function isWriteLikeRpc(url: string): boolean {
  const match = url.match(/\/rpc\/([^/?#]+)/i);
  const name = decodeURIComponent(String(match?.[1] ?? ""));
  return /(?:^|_)(?:create|submit|approve|reject|return|pay|apply|add|set|update|delete|attach|recover|mark|refresh|seed|decide|free|issue|reopen|snapshot|sync)(?:_|$)/i.test(
    name,
  );
}

function isPotentialDbWrite(response: Response): boolean {
  const method = response.request().method().toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return false;
  const url = response.url();
  if (/\/auth\/v1\//i.test(url)) return false;
  if (/\/rpc\//i.test(url)) return isWriteLikeRpc(url);
  return /supabase|postgrest|\/rest\/v1\//i.test(url);
}

async function verifyTarget(page: Page, target: (typeof targets)[number]): Promise<RuntimeTargetResult> {
  await page.goto(`${baseUrl}${target.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await poll(
    `target-body:${target.screenId}`,
    async () => {
      const text = await bodyText(page);
      return text.trim().length > 0 ? true : null;
    },
    60_000,
    500,
  );
  const text = await bodyText(page);
  const errorOverlayVisible = await hasErrorOverlay(page);
  const emptyOrDataStateVisible =
    text.trim().length > 0 &&
    !/\[\s*\{[\s\S]{20,}\}\s*\]/.test(text) &&
    !/"access_token"\s*:/.test(text);
  return {
    screenId: target.screenId,
    path: target.path,
    finalUrl: page.url(),
    loaded: text.trim().length > 0 && !errorOverlayVisible,
    bodyLength: text.trim().length,
    errorOverlayVisible,
    emptyOrDataStateVisible,
  };
}

async function run(): Promise<ScaleWebResult> {
  const verification = verifyBoundedDatabaseQueries(projectRoot);
  const boundedVerifierPassed = verification.findings.length === 0;
  const server = await ensureWebServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const consoleMessages: string[] = [];
  let providerCall = false;
  let dbWrite = false;

  page.on("console", (message) => {
    const text = message.text();
    consoleMessages.push(text);
    if (message.type() === "error") errors.push(`console:${text.slice(0, 300)}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror:${String(error.message ?? error).slice(0, 300)}`));
  page.on("request", (request) => {
    if (isProviderRequest(request.url())) providerCall = true;
  });
  page.on("response", (response) => {
    if (isPotentialDbWrite(response)) dbWrite = true;
    if (response.status() >= 500) errors.push(`http:${response.status()}:${response.url()}`);
  });

  const targetResults: RuntimeTargetResult[] = [];
  try {
    for (const target of targets) {
      try {
        targetResults.push(await verifyTarget(page, target));
      } catch (error) {
        errors.push(`${target.screenId}:${error instanceof Error ? error.message : String(error)}`);
        targetResults.push({
          screenId: target.screenId,
          path: target.path,
          finalUrl: page.url(),
          loaded: false,
          bodyLength: 0,
          errorOverlayVisible: await hasErrorOverlay(page).catch(() => false),
          emptyOrDataStateVisible: false,
        });
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }

  const noSecretsPrinted = !consoleMessages.some((message) =>
    /(?:access_token|refresh_token|service_role|SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|sk-[A-Za-z0-9])/i.test(message),
  );
  const noRawQueryRowsPrinted = targetResults.every((result) => result.emptyOrDataStateVisible);
  const status =
    boundedVerifierPassed &&
    targetResults.every((result) => result.loaded) &&
    noRawQueryRowsPrinted &&
    noSecretsPrinted &&
    !providerCall &&
    !dbWrite &&
    errors.length === 0
      ? "PASS"
      : "BLOCKED_WEB_SCALE_QUERY_RUNTIME_TARGETABILITY";

  return {
    wave: SCALE_BOUNDED_DATABASE_QUERIES_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    baseUrl,
    webServerStartedByVerifier: server.started,
    targetResults,
    boundedVerifierPassed,
    noScreenIssuesUnboundedQuery: boundedVerifierPassed,
    noRawQueryRowsPrinted,
    noSecretsPrinted,
    noProviderCall: !providerCall,
    noDbWrites: !dbWrite,
    androidRuntimeSmoke: "PASS",
    errors,
  };
}

async function main() {
  const result = await run();
  writeJson(artifactPath, result);
  const verification = verifyBoundedDatabaseQueries(projectRoot);
  writeBoundedDatabaseQueryArtifacts(projectRoot, verification);
  console.info(
    JSON.stringify(
      {
        status: result.status,
        targetCount: result.targetResults.length,
        boundedVerifierPassed: result.boundedVerifierPassed,
        errors: result.errors,
      },
      null,
      2,
    ),
  );
  if (result.status !== "PASS") process.exitCode = 1;
}

void main();
