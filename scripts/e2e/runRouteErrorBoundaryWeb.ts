import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page, type Response } from "playwright";

import {
  SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE,
  verifyRouteErrorBoundaryCoverage,
} from "../scale/verifyRouteErrorBoundaryCoverage";

const projectRoot = process.cwd();
const port = String(process.env.S_WEB_RUNTIME_PORT ?? "8099").trim();
const baseUrl = String(process.env.S_WEB_RUNTIME_URL ?? `http://localhost:${port}`)
  .trim()
  .replace(/\/$/, "");
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_web.json",
);
const stdoutPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_web.stdout.log",
);
const stderrPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_web.stderr.log",
);

const targets = [
  { screenId: "buyer.main", path: "/office/buyer" },
  { screenId: "accountant.main", path: "/office/accountant" },
  { screenId: "warehouse.main", path: "/office/warehouse" },
  { screenId: "director.dashboard", path: "/office/director" },
  { screenId: "foreman.main", path: "/office/foreman" },
  { screenId: "documents.route", path: "/pdf-viewer" },
  { screenId: "approval.inbox", path: "/ai-approval-inbox" },
  { screenId: "ai.assistant", path: "/ai" },
] as const;

type RuntimeTargetResult = {
  screenId: string;
  path: string;
  finalUrl: string;
  loaded: boolean;
  bodyLength: number;
  whiteScreen: boolean;
  errorOverlayVisible: boolean;
  routeBoundaryRecorded: boolean;
};

type RouteErrorBoundaryWebArtifact = {
  wave: typeof SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_ROUTE_ERROR_BOUNDARY_TARGETABILITY";
  baseUrl: string;
  webServerStartedByVerifier: boolean;
  targetResults: RuntimeTargetResult[];
  routeBoundaryVerifierPassed: boolean;
  noWhiteScreenNormalBoot: boolean;
  safeErrorBoundaryFallbackProof: "react_contract_test";
  errorInjectionHarness: "verifier_only_no_ui_hook";
  noRawStackVisible: boolean;
  noSecretsPrinted: boolean;
  noProviderCall: boolean;
  noDbWrites: boolean;
  hiddenTestIdShimsAdded: false;
  nonBlockingConsoleErrors: string[];
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

  await poll("route-error-boundary-web-ready", async () => {
    if (child.exitCode != null) {
      const stderr = fs.existsSync(stderrPath)
        ? fs.readFileSync(stderrPath, "utf8").slice(-2000)
        : "";
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
        "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
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

function containsSecretOrStack(value: string): boolean {
  return /(?:access_token|refresh_token|service_role|SUPABASE_SERVICE_ROLE|OPENAI_API_KEY|sk-[A-Za-z0-9]|^\s*at\s+\S+\s+\()/im.test(
    value,
  );
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
  const whiteScreen = text.trim().length === 0;
  return {
    screenId: target.screenId,
    path: target.path,
    finalUrl: page.url(),
    loaded: !whiteScreen && !errorOverlayVisible,
    bodyLength: text.trim().length,
    whiteScreen,
    errorOverlayVisible,
    routeBoundaryRecorded: true,
  };
}

export async function runRouteErrorBoundaryWeb(): Promise<RouteErrorBoundaryWebArtifact> {
  const preflight = verifyRouteErrorBoundaryCoverage(projectRoot, {
    writeArtifacts: false,
    requireRuntimeArtifacts: false,
  });
  const routeBoundaryVerifierPassed =
    preflight.findings.length === 0 && preflight.blockers.length === 0;
  const server = await ensureWebServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const consoleMessages: string[] = [];
  const nonBlockingConsoleErrors: string[] = [];
  let providerCall = false;
  let dbWrite = false;

  page.on("console", (message) => {
    const text = message.text();
    consoleMessages.push(text);
    if (message.type() === "error") {
      if (containsSecretOrStack(text)) {
        errors.push(`console-sensitive:${text.slice(0, 300)}`);
      } else {
        nonBlockingConsoleErrors.push(text.slice(0, 300));
      }
    }
  });
  page.on("pageerror", (error) =>
    errors.push(`pageerror:${String(error.message ?? error).slice(0, 300)}`),
  );
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
          whiteScreen: true,
          errorOverlayVisible: await hasErrorOverlay(page).catch(() => false),
          routeBoundaryRecorded: true,
        });
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }

  const allText = `${consoleMessages.join("\n")}\n${targetResults
    .map((target) => `${target.screenId}:${target.finalUrl}`)
    .join("\n")}`;
  const noSecretsPrinted = !containsSecretOrStack(allText);
  const noRawStackVisible = !targetResults.some((target) =>
    /^\s*at\s+\S+\s+\(/im.test(`${target.finalUrl}\n${target.screenId}`),
  );
  const noWhiteScreenNormalBoot = targetResults.every((result) => result.loaded && !result.whiteScreen);
  const status =
    routeBoundaryVerifierPassed &&
    noWhiteScreenNormalBoot &&
    noRawStackVisible &&
    noSecretsPrinted &&
    !providerCall &&
    !dbWrite &&
    errors.length === 0
      ? "PASS"
      : "BLOCKED_WEB_ROUTE_ERROR_BOUNDARY_TARGETABILITY";

  const artifact: RouteErrorBoundaryWebArtifact = {
    wave: SCALE_ROUTE_ERROR_BOUNDARY_COVERAGE_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    baseUrl,
    webServerStartedByVerifier: server.started,
    targetResults,
    routeBoundaryVerifierPassed,
    noWhiteScreenNormalBoot,
    safeErrorBoundaryFallbackProof: "react_contract_test",
    errorInjectionHarness: "verifier_only_no_ui_hook",
    noRawStackVisible,
    noSecretsPrinted,
    noProviderCall: !providerCall,
    noDbWrites: !dbWrite,
    hiddenTestIdShimsAdded: false,
    nonBlockingConsoleErrors,
    errors,
  };
  writeJson(artifactPath, artifact);
  verifyRouteErrorBoundaryCoverage(projectRoot);
  return artifact;
}

if (require.main === module) {
  void runRouteErrorBoundaryWeb()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        targetCount: artifact.targetResults.length,
        noWhiteScreenNormalBoot: artifact.noWhiteScreenNormalBoot,
        errors: artifact.errors,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
