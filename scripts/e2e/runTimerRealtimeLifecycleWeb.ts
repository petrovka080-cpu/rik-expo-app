import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page, type Response } from "playwright";

import {
  SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
  GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY,
  verifyLongSessionLifecycleSafety,
} from "../scale/verifyLongSessionLifecycleSafety";

const projectRoot = process.cwd();
const port = String(process.env.S_WEB_RUNTIME_PORT ?? "8099").trim();
const baseUrl = String(process.env.S_WEB_RUNTIME_URL ?? `http://localhost:${port}`).trim().replace(/\/$/, "");
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_web.json",
);
const stdoutPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_web.stdout.log",
);
const stderrPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_web.stderr.log",
);

const targets = [
  { screenId: "director.dashboard", path: "/office/director" },
  { screenId: "director.reports", path: "/office/director" },
  { screenId: "director.finance", path: "/office/director" },
  { screenId: "warehouse.main", path: "/office/warehouse" },
  { screenId: "buyer.main", path: "/office/buyer" },
  { screenId: "ai.assistant", path: "/ai" },
] as const;

type TargetResult = {
  screenId: string;
  path: string;
  finalUrl: string;
  loaded: boolean;
  bodyLength: number;
  whiteScreen: boolean;
};

type TimerRealtimeLifecycleWebArtifact = {
  wave: typeof SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_LIFECYCLE_RUNTIME_TARGETABILITY";
  baseUrl: string;
  webServerStartedByVerifier: boolean;
  targetResults: TargetResult[];
  lifecycleVerifierPassed: boolean;
  activeTimersReturnToBaseline: boolean;
  activeChannelsReturnToBaseline: boolean;
  noDuplicateSubscriptions: boolean;
  noSecretsPrinted: boolean;
  noRawChannelPayloadsPrinted: boolean;
  noDbWrites: boolean;
  dbWriteSignals: string[];
  noProviderCall: boolean;
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
  await poll("timer-realtime-lifecycle-web-ready", async () => {
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

function isProviderRequest(url: string): boolean {
  return /(?:api\.openai\.com|anthropic\.com|generativelanguage\.googleapis\.com|api\.mistral\.ai)/i.test(url);
}

function isPotentialDbWrite(response: Response): boolean {
  const method = response.request().method().toUpperCase();
  const url = response.url();
  if (!/\/rest\/v1\/|\/rpc\//i.test(url)) return false;
  const rpcMatch = url.match(/\/rpc\/([^/?#]+)/i);
  if (rpcMatch) {
    const rpcName = decodeURIComponent(String(rpcMatch[1] ?? ""));
    if (rpcName === "warehouse_issue_queue_scope_v4") return false;
    return /(?:^|_)(?:create|submit|approve|reject|return|pay|apply|add|set|update|delete|attach|recover|mark|refresh|seed|decide|free|issue|reopen|snapshot|sync)(?:_|$)/i.test(
      rpcName,
    );
  }
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

function hasSecretLikeText(value: string): boolean {
  const serviceRoleEnvName = "SUPABASE_" + "SERVICE_ROLE_KEY";
  return new RegExp(
    `(${serviceRoleEnvName}|service_role|authorization:\\s*bearer|api[_-]?key|password=)`,
    "i",
  ).test(value);
}

async function visitTarget(page: Page, target: (typeof targets)[number]): Promise<TargetResult> {
  await page.goto(`${baseUrl}${target.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  const text = await poll(
    `timer-realtime-lifecycle:${target.screenId}:body`,
    async () => {
      const currentText = await bodyText(page);
      return currentText.length > 20 ? currentText : null;
    },
    20_000,
    500,
  ).catch(() => "");
  return {
    screenId: target.screenId,
    path: target.path,
    finalUrl: page.url(),
    loaded: text.length > 20,
    bodyLength: text.length,
    whiteScreen: text.trim().length === 0,
  };
}

export async function runTimerRealtimeLifecycleWeb(): Promise<TimerRealtimeLifecycleWebArtifact> {
  const lifecycle = await verifyLongSessionLifecycleSafety(projectRoot, {
    writeArtifacts: true,
    webRuntimeChecked: true,
    androidRuntimeChecked: false,
  });
  const server = await ensureWebServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors: string[] = [];
  const consoleLines: string[] = [];
  let noDbWrites = true;
  const dbWriteSignals: string[] = [];
  let noProviderCall = true;

  page.on("console", (message) => consoleLines.push(message.text()));
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (isPotentialDbWrite(response)) {
      noDbWrites = false;
      dbWriteSignals.push(`${response.request().method().toUpperCase()} ${response.url()}`);
    }
    if (isProviderRequest(response.url())) noProviderCall = false;
  });

  let targetResults: TargetResult[] = [];
  try {
    targetResults = [];
    for (const target of targets) {
      targetResults.push(await visitTarget(page, target));
    }
  } finally {
    await browser.close().catch(() => undefined);
    server.stop();
  }

  const noSecretsPrinted = !consoleLines.some(hasSecretLikeText) && !errors.some(hasSecretLikeText);
  const noRawChannelPayloadsPrinted = !consoleLines.some((line) => /postgres_changes.*\{.*(?:new|old|payload)/i.test(line));
  const lifecycleVerifierPassed = lifecycle.final_status === GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY;
  const noWhiteScreens = targetResults.every((target) => !target.whiteScreen && target.loaded);
  const noDuplicateSubscriptions = lifecycle.lifecycleSnapshot.realtimeSnapshot.activeSubscriberCount === 0;
  const status =
    lifecycleVerifierPassed &&
    noWhiteScreens &&
    noSecretsPrinted &&
    noRawChannelPayloadsPrinted &&
    noDbWrites &&
    noProviderCall
      ? "PASS"
      : "BLOCKED_WEB_LIFECYCLE_RUNTIME_TARGETABILITY";

  const artifact: TimerRealtimeLifecycleWebArtifact = {
    wave: SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    baseUrl,
    webServerStartedByVerifier: server.started,
    targetResults,
    lifecycleVerifierPassed,
    activeTimersReturnToBaseline: lifecycle.active_timers_return_to_baseline,
    activeChannelsReturnToBaseline: lifecycle.active_channels_return_to_baseline,
    noDuplicateSubscriptions,
    noSecretsPrinted,
    noRawChannelPayloadsPrinted,
    noDbWrites,
    dbWriteSignals,
    noProviderCall,
    errors,
  };
  writeJson(artifactPath, artifact);
  await verifyLongSessionLifecycleSafety(projectRoot, {
    writeArtifacts: true,
    webRuntimeChecked: status === "PASS",
    androidRuntimeChecked: false,
  });
  return artifact;
}

if (require.main === module) {
  void runTimerRealtimeLifecycleWeb()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        targetCount: artifact.targetResults.length,
        noDbWrites: artifact.noDbWrites,
        noProviderCall: artifact.noProviderCall,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
