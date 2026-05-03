import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page, type Response } from "playwright";

const projectRoot = process.cwd();
const baseUrl = String(process.env.RIK_WEB_BASE_URL ?? "http://localhost:8081").trim();
const artifactJsonPath = path.join(projectRoot, "artifacts", "web-public-smoke.json");
const artifactMdPath = path.join(projectRoot, "artifacts", "web-public-smoke.md");
const screenshotPath = path.join(projectRoot, "artifacts", "web-public-smoke-login.png");
const webServerStdoutPath = path.join(projectRoot, "artifacts", "web-public-smoke.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts", "web-public-smoke.stderr.log");

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

type SmokeResult = {
  checkedAt: string;
  status: "GREEN" | "NOT_GREEN";
  baseOrigin: string;
  webServerStartedByVerifier: boolean;
  loginRouteOpened: boolean;
  registerRouteOpened: boolean;
  loginControlsVisible: boolean;
  registerControlsVisible: boolean;
  errorOverlayVisible: boolean;
  blankPage: boolean;
  pageErrorCount: number;
  consoleErrorCount: number;
  badResponseCount: number;
  badResponses: Array<{ status: number; method: string; path: string }>;
  screenshot: string | null;
  error?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function writeText(fullPath: string, value: string) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
}

function writeJson(fullPath: string, value: unknown) {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
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

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 500,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
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

async function isWebServerReady() {
  try {
    const response = await fetch(`${baseUrl}/auth/login`);
    return response.ok;
  } catch {
    return false;
  }
}

function resolveExpoPort() {
  try {
    const parsed = new URL(baseUrl);
    return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  } catch {
    return "8081";
  }
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  if (await isWebServerReady()) {
    return { started: false, stop: () => undefined };
  }

  writeText(webServerStdoutPath, "");
  writeText(webServerStderrPath, "");

  const child = spawn(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/c", "npx", "expo", "start", "--web", "-c", "--port", resolveExpoPort()]
      : ["expo", "start", "--web", "-c", "--port", resolveExpoPort()],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        CI: process.env.CI ?? "1",
      },
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(webServerStdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(webServerStderrPath, String(chunk)));

  await poll(
    "web-public-smoke:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webServerStderrPath)
          ? fs.readFileSync(webServerStderrPath, "utf8").slice(-2000)
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      return (await isWebServerReady()) ? true : null;
    },
    240_000,
    1_000,
  );

  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

function redactResponse(response: Response) {
  let pathOnly = "<external>";
  try {
    const parsed = new URL(response.url());
    pathOnly = parsed.pathname;
  } catch {
    pathOnly = "<unparseable>";
  }

  return {
    status: response.status(),
    method: response.request().method(),
    path: pathOnly,
  };
}

async function bodyLength(page: Page) {
  return page.evaluate(() => document.body.innerText.trim().length);
}

async function hasErrorOverlay(page: Page) {
  return page.evaluate(() =>
    Boolean(
      document.querySelector(
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay, [data-testid='screen-error-fallback']",
      ),
    ),
  );
}

async function verifyLoginRoute(page: Page) {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await poll(
    "web-public-smoke:login-controls",
    async () => {
      const email = await page.locator('[data-testid="auth.login.email"]').count();
      const password = await page.locator('[data-testid="auth.login.password"]').count();
      const submit = await page.locator('[data-testid="auth.login.submit"]').count();
      return email > 0 && password > 0 && submit > 0 ? true : null;
    },
    45_000,
    500,
  );
}

async function verifyRegisterRoute(page: Page) {
  await page.goto(`${baseUrl}/auth/register`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await poll(
    "web-public-smoke:register-controls",
    async () => {
      const emailInputs = await page.locator('input[placeholder="Email"]').count();
      const passwordInputs = await page.locator('input[type="password"]').count();
      const buttons = await page.locator('button,[role="button"]').count();
      return emailInputs > 0 && passwordInputs > 0 && buttons > 0 ? true : null;
    },
    45_000,
    500,
  );
}

async function runSmoke(): Promise<SmokeResult> {
  const server = await ensureLocalWebServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const runtime = {
    pageErrorCount: 0,
    consoleErrorCount: 0,
    badResponses: [] as Array<{ status: number; method: string; path: string }>,
  };

  page.on("pageerror", () => {
    runtime.pageErrorCount += 1;
  });
  page.on("console", (message) => {
    if (message.type() === "error") runtime.consoleErrorCount += 1;
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      runtime.badResponses.push(redactResponse(response));
    }
  });

  let loginRouteOpened = false;
  let registerRouteOpened = false;
  let loginControlsVisible = false;
  let registerControlsVisible = false;
  let screenshot: string | null = null;

  try {
    await verifyLoginRoute(page);
    loginRouteOpened = page.url().includes("/auth/login");
    loginControlsVisible = true;
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshot = path.relative(projectRoot, screenshotPath).replace(/\\/g, "/");

    await verifyRegisterRoute(page);
    registerRouteOpened = page.url().includes("/auth/register");
    registerControlsVisible = true;

    const blankPage = (await bodyLength(page)) === 0;
    const errorOverlayVisible = await hasErrorOverlay(page);
    const status =
      loginRouteOpened &&
      registerRouteOpened &&
      loginControlsVisible &&
      registerControlsVisible &&
      !blankPage &&
      !errorOverlayVisible &&
      runtime.pageErrorCount === 0 &&
      runtime.consoleErrorCount === 0 &&
      runtime.badResponses.length === 0
        ? "GREEN"
        : "NOT_GREEN";

    return {
      checkedAt: new Date().toISOString(),
      status,
      baseOrigin: new URL(baseUrl).origin,
      webServerStartedByVerifier: server.started,
      loginRouteOpened,
      registerRouteOpened,
      loginControlsVisible,
      registerControlsVisible,
      errorOverlayVisible,
      blankPage,
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      badResponseCount: runtime.badResponses.length,
      badResponses: runtime.badResponses,
      screenshot,
    };
  } catch (error) {
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    return {
      checkedAt: new Date().toISOString(),
      status: "NOT_GREEN",
      baseOrigin: new URL(baseUrl).origin,
      webServerStartedByVerifier: server.started,
      loginRouteOpened,
      registerRouteOpened,
      loginControlsVisible,
      registerControlsVisible,
      errorOverlayVisible: await hasErrorOverlay(page).catch(() => false),
      blankPage: ((await bodyLength(page).catch(() => 0)) === 0),
      pageErrorCount: runtime.pageErrorCount,
      consoleErrorCount: runtime.consoleErrorCount,
      badResponseCount: runtime.badResponses.length,
      badResponses: runtime.badResponses,
      screenshot: fs.existsSync(screenshotPath)
        ? path.relative(projectRoot, screenshotPath).replace(/\\/g, "/")
        : null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }
}

function writeProof(result: SmokeResult) {
  writeText(
    artifactMdPath,
    [
      "# Public Web Smoke",
      "",
      `- status: ${result.status}`,
      `- checkedAt: ${result.checkedAt}`,
      `- baseOrigin: ${result.baseOrigin}`,
      `- webServerStartedByVerifier: ${String(result.webServerStartedByVerifier)}`,
      `- loginRouteOpened: ${String(result.loginRouteOpened)}`,
      `- registerRouteOpened: ${String(result.registerRouteOpened)}`,
      `- loginControlsVisible: ${String(result.loginControlsVisible)}`,
      `- registerControlsVisible: ${String(result.registerControlsVisible)}`,
      `- errorOverlayVisible: ${String(result.errorOverlayVisible)}`,
      `- blankPage: ${String(result.blankPage)}`,
      `- pageErrorCount: ${result.pageErrorCount}`,
      `- consoleErrorCount: ${result.consoleErrorCount}`,
      `- badResponseCount: ${result.badResponseCount}`,
      `- screenshot: ${result.screenshot ?? "none"}`,
      "",
      "Production safety:",
      "- public routes only",
      "- no login submit",
      "- no registration submit",
      "- no production DB writes",
      "- no business calls",
      "- no secrets or env values printed",
    ].join("\n"),
  );
}

async function main() {
  const result = await runSmoke();
  writeJson(artifactJsonPath, result);
  writeProof(result);
  console.info(
    JSON.stringify(
      {
        status: result.status,
        loginRouteOpened: result.loginRouteOpened,
        registerRouteOpened: result.registerRouteOpened,
        pageErrorCount: result.pageErrorCount,
        consoleErrorCount: result.consoleErrorCount,
        badResponseCount: result.badResponseCount,
      },
      null,
      2,
    ),
  );

  if (result.status !== "GREEN") {
    process.exitCode = 1;
  }
}

void main();
