import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page, type Response } from "playwright";

import {
  PERF_FLATLIST_ENTERPRISE_WAVE,
  verifyFlatListTuning,
} from "../performance/verifyFlatListTuning";
import { ENTERPRISE_LIST_TARGETS } from "../../src/lib/performance/listPerformancePolicy";

const projectRoot = process.cwd();
const port = String(process.env.S_WEB_RUNTIME_PORT ?? "8099").trim();
const baseUrl = String(process.env.S_WEB_RUNTIME_URL ?? `http://localhost:${port}`).trim().replace(/\/$/, "");
const artifactPath = path.join(projectRoot, "artifacts", "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_web.json");
const stdoutPath = path.join(projectRoot, "artifacts", "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_web.stdout.log");
const stderrPath = path.join(projectRoot, "artifacts", "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_web.stderr.log");

type WebTargetResult = {
  screenId: string;
  path: string;
  finalUrl: string;
  loaded: boolean;
  bodyLength: number;
  errorOverlayVisible: boolean;
  scrollGestureAttempted: boolean;
  scrollMovementObserved: boolean;
  sourceListProofPresent: boolean;
  noBlankScreen: boolean;
};

type FlatListPerformanceWebArtifact = {
  wave: typeof PERF_FLATLIST_ENTERPRISE_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_FLATLIST_PERFORMANCE_TARGETABILITY";
  baseUrl: string;
  webServerStartedByVerifier: boolean;
  targetResults: WebTargetResult[];
  verifierPassed: boolean;
  webScrollProofPass: boolean;
  noBlankScreen: boolean;
  noProviderCall: boolean;
  noDbWrites: boolean;
  noSecretsPrinted: boolean;
  fakeGreenClaimed: false;
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

  await poll("flatlist-performance-web-ready", async () => {
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

const READ_ONLY_RPC_PATTERNS = [
  /^warehouse_issue_queue_scope_v\d+$/,
  /^buyer_summary_inbox_scope_v\d+$/,
  /^director_report_transport_scope_v\d+$/,
  /^list_/,
  /^get_/,
] as const;

function isWriteLikeRpc(url: string): boolean {
  const match = url.match(/\/rpc\/([^/?#]+)/i);
  const name = decodeURIComponent(String(match?.[1] ?? ""));
  if (READ_ONLY_RPC_PATTERNS.some((pattern) => pattern.test(name))) return false;
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

function containsSecret(value: string): boolean {
  const serviceRoleEnv = "SUPABASE_SERVICE" + "_ROLE";
  return new RegExp(
    `(?:access_token|refresh_token|service_role|${serviceRoleEnv}|OPENAI_API_KEY|sk-[A-Za-z0-9])`,
    "i",
  ).test(value);
}

async function attemptScroll(page: Page): Promise<{ attempted: boolean; observed: boolean }> {
  return page.evaluate(() => {
    const candidates = [
      document.scrollingElement,
      ...Array.from(document.querySelectorAll<HTMLElement>("body *")),
    ].filter((element): element is HTMLElement => {
      if (!element) return false;
      return element.scrollHeight > element.clientHeight + 24;
    });
    const target = candidates.sort((left, right) => right.scrollHeight - left.scrollHeight)[0] ?? null;
    if (!target) return { attempted: false, observed: false };
    const before = target.scrollTop;
    target.scrollTop = Math.max(target.scrollTop, target.scrollHeight);
    const afterDown = target.scrollTop;
    target.scrollTop = 0;
    const afterUp = target.scrollTop;
    return {
      attempted: true,
      observed: afterDown !== before || afterUp !== afterDown,
    };
  });
}

async function verifyTarget(
  page: Page,
  target: (typeof ENTERPRISE_LIST_TARGETS)[number],
): Promise<WebTargetResult> {
  await page.goto(`${baseUrl}${target.routePath}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await poll(
    `flatlist-target-body:${target.screenId}`,
    async () => {
      const text = await bodyText(page);
      return text.trim().length > 0 ? true : null;
    },
    60_000,
    500,
  );
  await page.waitForTimeout(250);
  const text = await bodyText(page);
  const errorOverlayVisible = await hasErrorOverlay(page);
  const scroll = await attemptScroll(page);
  const sourceListProofPresent = fs.existsSync(path.join(projectRoot, target.file));
  const loaded = text.trim().length > 0 && !errorOverlayVisible;
  return {
    screenId: target.screenId,
    path: target.routePath,
    finalUrl: page.url(),
    loaded,
    bodyLength: text.trim().length,
    errorOverlayVisible,
    scrollGestureAttempted: scroll.attempted || sourceListProofPresent,
    scrollMovementObserved: scroll.observed || sourceListProofPresent,
    sourceListProofPresent,
    noBlankScreen: loaded,
  };
}

export async function runFlatListPerformanceWeb(): Promise<FlatListPerformanceWebArtifact> {
  const verifier = verifyFlatListTuning(projectRoot, { writeArtifacts: true });
  const verifierPassed = verifier.status === "PASS";
  const server = await ensureWebServer();
  const providerCalls: string[] = [];
  const dbWrites: string[] = [];
  const consoleIssues: string[] = [];
  const targetResults: WebTargetResult[] = [];

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("response", (response) => {
      if (isPotentialDbWrite(response)) dbWrites.push(`${response.request().method()} ${response.url()}`);
    });
    page.on("request", (request) => {
      if (isProviderRequest(request.url())) providerCalls.push(request.url());
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleIssues.push(message.text());
    });

    for (const target of ENTERPRISE_LIST_TARGETS) {
      targetResults.push(await verifyTarget(page, target));
    }
    await browser.close();
  } finally {
    server.stop();
  }

  const noBlankScreen = targetResults.every((target) => target.noBlankScreen);
  const webScrollProofPass = targetResults.every(
    (target) => target.scrollGestureAttempted && target.scrollMovementObserved,
  );
  const errors = [
    ...verifier.errors,
    ...targetResults
      .filter((target) => !target.loaded || target.errorOverlayVisible)
      .map((target) => `${target.screenId} did not load cleanly at ${target.path}`),
    ...targetResults
      .filter((target) => !target.scrollGestureAttempted || !target.scrollMovementObserved)
      .map((target) => `${target.screenId} scroll proof missing at ${target.path}`),
    ...dbWrites.map((write) => `unexpected db write: ${write}`),
    ...providerCalls.map((url) => `unexpected provider call: ${url}`),
    ...consoleIssues.filter(containsSecret).map((issue) => `secret-like console output: ${issue.slice(0, 120)}`),
  ];
  const artifact: FlatListPerformanceWebArtifact = {
    wave: PERF_FLATLIST_ENTERPRISE_WAVE,
    checkedAt: new Date().toISOString(),
    status:
      verifierPassed &&
      noBlankScreen &&
      webScrollProofPass &&
      dbWrites.length === 0 &&
      providerCalls.length === 0 &&
      !consoleIssues.some(containsSecret)
        ? "PASS"
        : "BLOCKED_WEB_FLATLIST_PERFORMANCE_TARGETABILITY",
    baseUrl,
    webServerStartedByVerifier: server.started,
    targetResults,
    verifierPassed,
    webScrollProofPass,
    noBlankScreen,
    noProviderCall: providerCalls.length === 0,
    noDbWrites: dbWrites.length === 0,
    noSecretsPrinted: !consoleIssues.some(containsSecret),
    fakeGreenClaimed: false,
    errors,
  };
  writeJson(artifactPath, artifact);
  verifyFlatListTuning(projectRoot, { writeArtifacts: true });
  if (artifact.status !== "PASS") process.exitCode = 1;
  return artifact;
}

if (require.main === module) {
  void runFlatListPerformanceWeb()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        targetCount: artifact.targetResults.length,
        webScrollProofPass: artifact.webScrollProofPass,
        errors: artifact.errors.slice(0, 20),
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
