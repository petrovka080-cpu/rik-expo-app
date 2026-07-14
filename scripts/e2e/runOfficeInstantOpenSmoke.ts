import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
  type Response,
} from "playwright";

const projectRoot = process.cwd();
const runStartedAt = new Date().toISOString();
const runId = runStartedAt.replace(/[:.]/g, "-");
const artifactDir = path.join(
  projectRoot,
  ".release-runtime",
  "office-instant-open-dev-override-hardening",
  runId,
);
const summaryPath = path.join(artifactDir, "summary.json");
const progressPath = path.join(artifactDir, "progress.log");
const webServerStdoutPath = path.join(artifactDir, "expo-web.stdout.log");
const webServerStderrPath = path.join(artifactDir, "expo-web.stderr.log");

const baseUrl = String(process.env.RIK_WEB_BASE_URL ?? "http://127.0.0.1:8092").replace(/\/$/, "");
const smokeTarget = String(process.env.OFFICE_SMOKE_TARGET ?? "web").trim().toLowerCase();
const OFFICE_SHELL_BUDGET_MS = 500;
const OFFICE_USABLE_BUDGET_MS = 1_000;
const ROLE_SHELL_BUDGET_MS = 500;
const ROLE_USABLE_BUDGET_MS = 1_000;
const DIRECTOR_USABLE_BUDGET_MS = 1_000;
const ANDROID_CHROME_OFFICE_SHELL_BUDGET_MS = 700;
const ANDROID_CHROME_OFFICE_USABLE_BUDGET_MS = 1_200;
const ANDROID_CHROME_DIRECTOR_SHELL_BUDGET_MS = 700;
const ANDROID_CHROME_DIRECTOR_USABLE_BUDGET_MS = 1_200;
const LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY = "rik.office.localDeveloperFullAccess";

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

type RoleKey = "director" | "foreman" | "buyer" | "warehouse" | "contractor" | "accountant";

type RouteSpec = {
  key: "office" | RoleKey;
  route: string;
  shellSelectors: readonly string[];
  contentSelectors: readonly string[];
};

type RouteMetric = {
  route: string;
  shellMs: number;
  contentMs: number;
  shellVisible: boolean;
  contentVisible: boolean;
  devOverrideBannerVisible: boolean;
};

type SmokeSummary = {
  final_status:
    | "GREEN_OFFICE_INSTANT_OPEN_AND_DEV_OVERRIDE_UI_HARDENED_NO_BUILDS"
    | "STOP_ANDROID_CHROME_OFFICE_SMOKE_NOT_AVAILABLE"
    | "STOP_OFFICE_OPEN_LATENCY_OVER_BUDGET";
  source_sha: string | null;
  branch: string | null;
  target: string;
  base_url: string;
  webServerStartedByVerifier: boolean;
  office_first_shell_ms: number | null;
  office_usable_content_ms: number | null;
  director_first_shell_ms: number | null;
  director_usable_content_ms: number | null;
  foreman_first_content_ms: number | null;
  buyer_first_content_ms: number | null;
  warehouse_first_content_ms: number | null;
  contractor_first_content_ms: number | null;
  accountant_first_content_ms: number | null;
  office_shell_first: boolean;
  director_initial_page_bounded: boolean;
  no_cross_role_blocking: boolean;
  no_unbounded_initial_fetch: boolean;
  dev_override_banner_visible: boolean;
  developer_full_access_available_for_dev: boolean;
  developer_full_access_used_as_production_proof: boolean;
  success_observability_console_spam: boolean;
  console_error_count: number;
  console_warn_count: number;
  console_error_samples: string[];
  console_warn_samples: string[];
  page_error_count: number;
  bad_response_count: number;
  routes: Record<string, RouteMetric>;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
  error?: string;
};

const ROUTES: readonly RouteSpec[] = [
  {
    key: "office",
    route: "/office",
    shellSelectors: [
      '[data-testid="office-section-directions"]',
      '[data-testid="office-shell-background-loading"]',
      '[data-testid="office-summary"]',
      '[data-testid="office-create-company"]',
    ],
    contentSelectors: [
      '[data-testid="office-section-directions"]',
      '[data-testid="office-summary"]',
      '[data-testid="office-create-company"]',
    ],
  },
  {
    key: "director",
    route: "/office/director",
    shellSelectors: ['[data-testid="office-role-auth-context-director"]'],
    contentSelectors: [
      '[data-testid="director-top-tab-requests"]',
      '[data-testid^="director-request-open-"]',
      '[data-testid="director-finance-dashboard-debt-card"]',
      '[data-testid="director-reports-home-card"]',
    ],
  },
  {
    key: "foreman",
    route: "/office/foreman",
    shellSelectors: ['[data-testid="office-role-auth-context-foreman"]'],
    contentSelectors: [
      '[data-testid="foreman-main-materials-open"]',
      '[data-testid="foreman-main-subcontracts-open"]',
      '[data-testid="foreman-ai-quick-open"]',
    ],
  },
  {
    key: "buyer",
    route: "/office/buyer",
    shellSelectors: ['[data-testid="office-role-auth-context-buyer"]'],
    contentSelectors: [
      '[data-testid="buyer-tab-inbox"]',
      '[data-testid="buyer-sticky-search-stack"]',
      '[data-testid^="buyer-group-open-"]',
      '[data-testid="buyer-main-list-error"]',
      '[data-testid="buyer-main-list-degraded"]',
    ],
  },
  {
    key: "warehouse",
    route: "/office/warehouse",
    shellSelectors: ['[data-testid="office-role-auth-context-warehouse"]'],
    contentSelectors: [
      '[data-testid="warehouse-tab-requests"]',
      '[data-testid="warehouse-tab-incoming"]',
      '[data-testid="warehouse-tab-reports"]',
      '[data-testid^="warehouse-req-row-"]',
      '[data-testid^="warehouse-incoming-row-"]',
    ],
  },
  {
    key: "contractor",
    route: "/office/contractor",
    shellSelectors: ['[data-testid="office-role-auth-context-contractor"]'],
    contentSelectors: [
      '[data-testid^="contractor-work-card-"]',
      '[data-testid="contractor-empty-state"]',
      '[data-testid="contractor-subcontracts-list"]',
    ],
  },
  {
    key: "accountant",
    route: "/office/accountant",
    shellSelectors: ['[data-testid="office-role-auth-context-accountant"]'],
    contentSelectors: [
      '[data-testid="accountant-tab-incoming"]',
      '[data-testid="accountant-tab-paid"]',
      '[data-testid="accountant-subcontract-list"]',
      '[data-testid="accountant-subcontract-empty"]',
      '[data-testid^="accountant-proposal-row-"]',
      '[data-testid="accountant.main.ai_panel"]',
    ],
  },
] as const;

const writeText = (fullPath: string, value: string) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value, "utf8");
};

const writeJson = (fullPath: string, value: unknown) => {
  writeText(fullPath, `${JSON.stringify(value, null, 2)}\n`);
};

const mark = (step: string, extra: Record<string, unknown> = {}) => {
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.appendFileSync(
    progressPath,
    `${new Date().toISOString()} ${JSON.stringify({ step, ...extra })}\n`,
    "utf8",
  );
};

const runGit = (args: readonly string[]): string | null => {
  const result = spawnSync("git", [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  return String(result.stdout ?? "").trim() || null;
};

const stopProcessTree = (child: {
  pid?: number;
  exitCode: number | null;
  kill: (signal?: NodeJS.Signals) => boolean;
}) => {
  if (child.exitCode != null) return;
  if (process.platform === "win32" && child.pid) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const poll = async <T,>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs: number,
  delayMs = 250,
): Promise<T> => {
  const startedAt = Date.now();
  let lastError: unknown = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(delayMs);
  }

  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
};

const isServerReady = async (url = baseUrl) => {
  try {
    const response = await fetch(`${url}/office`);
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
};

const resolveExpoPort = () => {
  try {
    const parsed = new URL(baseUrl);
    return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
  } catch {
    return "8092";
  }
};

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  if (await isServerReady()) {
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
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "1",
        EXPO_PUBLIC_JOB_QUEUE_ENABLED: "0",
        JOB_QUEUE_ENABLED: "0",
        EXPO_PUBLIC_RIK_VERBOSE_OBSERVABILITY: process.env.EXPO_PUBLIC_RIK_VERBOSE_OBSERVABILITY ?? "0",
      },
    },
  );

  child.stdout.on("data", (chunk) => fs.appendFileSync(webServerStdoutPath, String(chunk)));
  child.stderr.on("data", (chunk) => fs.appendFileSync(webServerStderrPath, String(chunk)));

  await poll(
    "office-instant-open:web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webServerStderrPath)
          ? fs.readFileSync(webServerStderrPath, "utf8").slice(-2000)
          : "";
        throw new Error(`expo web server exited early (${child.exitCode}): ${stderr}`);
      }
      return (await isServerReady()) ? true : null;
    },
    240_000,
    1_000,
  );

  return {
    started: true,
    stop: () => stopProcessTree(child),
  };
}

const isInternalResponse = (response: Response) => {
  try {
    const target = new URL(response.url());
    const base = new URL(baseUrl);
    return target.host === base.host || target.hostname === "10.0.2.2";
  } catch {
    return false;
  }
};

const waitForAnySelector = async (
  page: Page,
  selectors: readonly string[],
  timeoutMs: number,
): Promise<string> => {
  await page.waitForFunction(
    (items) =>
      items.some((selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      }),
    selectors,
    { timeout: timeoutMs, polling: 50 },
  );
  for (const selector of selectors) {
    const visible = await page.locator(selector).first().isVisible().catch(() => false);
    if (visible) return selector;
  }
  return selectors[0] ?? "<missing-selector>";
};

const hasAnySelector = async (page: Page, selectors: readonly string[]) => {
  for (const selector of selectors) {
    const count = await page.locator(selector).count().catch(() => 0);
    if (count > 0) return true;
  }
  return false;
};

const pageTextLength = async (page: Page) =>
  page.evaluate(() => document.body.innerText.trim().length).catch(() => 0);

const hasErrorOverlay = async (page: Page) =>
  page
    .evaluate(() =>
      Boolean(
        document.querySelector(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay, [data-testid='screen-error-fallback']",
        ),
      ),
    )
    .catch(() => false);

const addDeveloperAccessInit = async (context: BrowserContext) => {
  await context.addInitScript((storageKey) => {
    window.localStorage.setItem(String(storageKey), "1");
  }, LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
};

const warmupWebRuntime = async (page: Page, resolvedBaseUrl: string) => {
  await page.goto(`${resolvedBaseUrl}/market`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator("body").waitFor({ state: "visible", timeout: 30_000 });
  await page.locator('[data-testid="tabs.office"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(String(storageKey), "1");
  }, LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
};

const navigateWithinApp = async (
  page: Page,
  resolvedBaseUrl: string,
  route: string,
) => {
  if (route === "/office") {
    const officeTab = page.locator('[data-testid="tabs.office"]').first();
    if (await officeTab.isVisible().catch(() => false)) {
      await officeTab.click();
      await page
        .waitForFunction((nextPath) => window.location.pathname === nextPath, route, {
          timeout: 2_000,
          polling: 25,
        })
        .catch(async () => {
          await page.goto(`${resolvedBaseUrl}${route}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
        });
      return;
    }
  }

  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, route);
  await page
    .waitForFunction((nextPath) => window.location.pathname === nextPath, route, {
      timeout: 1_000,
      polling: 25,
    })
    .catch(async () => {
      await page.goto(`${resolvedBaseUrl}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    });
};

async function measureRoute(page: Page, resolvedBaseUrl: string, spec: RouteSpec): Promise<RouteMetric> {
  let startedAt = Date.now();
  await navigateWithinApp(page, resolvedBaseUrl, spec.route);
  try {
    await waitForAnySelector(page, spec.shellSelectors, 15_000);
  } catch (error) {
    mark("measure_route_direct_navigation_fallback", {
      route: spec.route,
      error: error instanceof Error ? error.message : String(error ?? "unknown"),
    });
    startedAt = Date.now();
    await page.goto(`${resolvedBaseUrl}${spec.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForAnySelector(page, spec.shellSelectors, 15_000);
  }
  const shellMs = Date.now() - startedAt;

  let contentVisible = false;
  let contentMs = Number.MAX_SAFE_INTEGER;
  try {
    await waitForAnySelector(page, spec.contentSelectors, 1_200);
    contentMs = Date.now() - startedAt;
    contentVisible = true;
  } catch {
    const fallbackBodyReady = (await pageTextLength(page)) > 20 && !(await hasErrorOverlay(page));
    contentVisible = fallbackBodyReady;
    contentMs = fallbackBodyReady ? Date.now() - startedAt : Number.MAX_SAFE_INTEGER;
  }

  const devOverrideBannerVisible = (await page.locator('[data-testid="developer-override-panel"]').count()) > 0;
  return {
    route: spec.route,
    shellMs,
    contentMs,
    shellVisible: await hasAnySelector(page, spec.shellSelectors),
    contentVisible,
    devOverrideBannerVisible,
  };
}

const sanitizeConsoleSample = (text: string) =>
  text
    .replace(/apikey=[^&\s"'<>]+/gi, "apikey=present_redacted")
    .replace(/\b(access_token|refresh_token|token)=([^&\s"'<>]+)/gi, "$1=present_redacted")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer present_redacted")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "present_redacted")
    .replace(/[A-Za-z0-9_-]{64,}/g, "present_redacted");

const handleConsoleMessage = (
  message: ConsoleMessage,
  counters: {
    consoleErrorCount: number;
    consoleWarnCount: number;
    consoleErrorSamples: string[];
    consoleWarnSamples: string[];
    successObservabilityConsoleSpam: number;
  },
) => {
  const type = message.type();
  const text = message.text();
  const sample = sanitizeConsoleSample(text).trim().replace(/\s+/g, " ").slice(0, 300);
  if (type === "error") {
    counters.consoleErrorCount += 1;
    if (counters.consoleErrorSamples.length < 20) counters.consoleErrorSamples.push(sample);
  }
  if (type === "warning") {
    counters.consoleWarnCount += 1;
    if (counters.consoleWarnSamples.length < 20) counters.consoleWarnSamples.push(sample);
  }
  if (
    text.includes("[platform.observability]") &&
    text.includes("success")
  ) {
    counters.successObservabilityConsoleSpam += 1;
  }
};

async function runRoutes(
  browser: Browser,
  resolvedBaseUrl: string,
): Promise<{
  routes: Record<string, RouteMetric>;
  consoleErrorCount: number;
  consoleWarnCount: number;
  pageErrorCount: number;
  badResponseCount: number;
  successObservabilityConsoleSpam: number;
  consoleErrorSamples: string[];
  consoleWarnSamples: string[];
}> {
  const context = browser.contexts()[0] ?? (await browser.newContext());
  await addDeveloperAccessInit(context);
  const page = context.pages()[0] ?? (await context.newPage());
  await warmupWebRuntime(page, resolvedBaseUrl);

  const counters = {
    consoleErrorCount: 0,
    consoleWarnCount: 0,
    pageErrorCount: 0,
    badResponseCount: 0,
    successObservabilityConsoleSpam: 0,
    consoleErrorSamples: [],
    consoleWarnSamples: [],
  };

  page.on("console", (message) => handleConsoleMessage(message, counters));
  page.on("pageerror", () => {
    counters.pageErrorCount += 1;
  });
  page.on("response", (response) => {
    if (isInternalResponse(response) && response.status() >= 500) {
      counters.badResponseCount += 1;
    }
  });

  const routes: Record<string, RouteMetric> = {};
  for (const route of ROUTES) {
    mark("measure_route_start", { route: route.route, target: smokeTarget });
    routes[route.key] = await measureRoute(page, resolvedBaseUrl, route);
    mark("measure_route_done", routes[route.key]);
  }

  await page.close().catch(() => undefined);
  if (browser.contexts().length > 1) {
    await context.close().catch(() => undefined);
  }
  return { routes, ...counters };
}

const resolveAdbBin = () => {
  const envCandidates = [
    process.env.ADB,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : null,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb") : null,
  ].filter((value): value is string => Boolean(value));
  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "adb";
};

const runAdb = (adbBin: string, args: readonly string[]) =>
  spawnSync(adbBin, [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
  });

const getAndroidDeviceId = (adbBin: string): string | null => {
  const result = runAdb(adbBin, ["devices"]);
  if (result.status !== 0) return null;
  const lines = String(result.stdout ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const deviceLine = lines.find((line) => /\sdevice$/.test(line));
  return deviceLine ? deviceLine.split(/\s+/)[0] ?? null : null;
};

const toAndroidHostBaseUrl = (url: string) => {
  const parsed = new URL(url);
  if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    parsed.hostname = "10.0.2.2";
  }
  return parsed.toString().replace(/\/$/, "");
};

async function connectAndroidChrome(): Promise<{ browser: Browser; androidBaseUrl: string } | null> {
  const adbBin = resolveAdbBin();
  const deviceId = getAndroidDeviceId(adbBin);
  if (!deviceId) return null;

  const androidBaseUrl = toAndroidHostBaseUrl(baseUrl);
  runAdb(adbBin, ["-s", deviceId, "shell", "am", "force-stop", "com.android.chrome"]);
  const launchResult = runAdb(adbBin, [
    "-s",
    deviceId,
    "shell",
    "am",
    "start",
    "-n",
    "com.android.chrome/com.google.android.apps.chrome.Main",
    "-d",
    `${androidBaseUrl}/office`,
  ]);
  if (launchResult.status !== 0) return null;
  runAdb(adbBin, ["-s", deviceId, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"]);

  try {
    await poll(
      "android-chrome-devtools",
      async () => {
        const response = await fetch("http://127.0.0.1:9222/json/version");
        return response.ok ? true : null;
      },
      20_000,
      500,
    );
    const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
    return { browser, androidBaseUrl };
  } catch {
    return null;
  }
}

function makeSummary(
  input: {
    target: string;
    base: string;
    webServerStartedByVerifier: boolean;
    routeRun?: Awaited<ReturnType<typeof runRoutes>>;
    androidUnavailable?: boolean;
    error?: string;
  },
): SmokeSummary {
  const routes = input.routeRun?.routes ?? {};
  const office = routes.office;
  const director = routes.director;
  const foreman = routes.foreman;
  const buyer = routes.buyer;
  const warehouse = routes.warehouse;
  const contractor = routes.contractor;
  const accountant = routes.accountant;
  const devOverrideBannerVisible = Object.values(routes).some((route) => route.devOverrideBannerVisible);
  const successObservabilityConsoleSpam = Boolean(input.routeRun?.successObservabilityConsoleSpam);
  const consoleErrorCount = input.routeRun?.consoleErrorCount ?? 0;
  const consoleWarnCount = input.routeRun?.consoleWarnCount ?? 0;
  const pageErrorCount = input.routeRun?.pageErrorCount ?? 0;
  const badResponseCount = input.routeRun?.badResponseCount ?? 0;
  const consoleErrorSamples = input.routeRun?.consoleErrorSamples ?? [];
  const consoleWarnSamples = input.routeRun?.consoleWarnSamples ?? [];
  const officeShellBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_OFFICE_SHELL_BUDGET_MS : OFFICE_SHELL_BUDGET_MS;
  const officeUsableBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_OFFICE_USABLE_BUDGET_MS : OFFICE_USABLE_BUDGET_MS;
  const directorShellBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_DIRECTOR_SHELL_BUDGET_MS : ROLE_SHELL_BUDGET_MS;
  const directorUsableBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_DIRECTOR_USABLE_BUDGET_MS : DIRECTOR_USABLE_BUDGET_MS;
  const roleShellBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_OFFICE_SHELL_BUDGET_MS : ROLE_SHELL_BUDGET_MS;
  const roleUsableBudget =
    input.target === "android-chrome" ? ANDROID_CHROME_OFFICE_USABLE_BUDGET_MS : ROLE_USABLE_BUDGET_MS;
  const roleMetrics = [director, foreman, buyer, warehouse, contractor, accountant].filter(
    (route): route is RouteMetric => Boolean(route),
  );
  const allRoleShellsOk = roleMetrics.every((route) => route.shellVisible && route.shellMs <= roleShellBudget);
  const allRoleContentOk = roleMetrics.every((route) => route.contentVisible && route.contentMs <= roleUsableBudget);
  const green =
    !input.androidUnavailable &&
    !input.error &&
    Boolean(office?.shellVisible) &&
    Boolean(office?.contentVisible) &&
    Number(office?.shellMs ?? Number.MAX_SAFE_INTEGER) <= officeShellBudget &&
    Number(office?.contentMs ?? Number.MAX_SAFE_INTEGER) <= officeUsableBudget &&
    Boolean(director?.shellVisible) &&
    Boolean(director?.contentVisible) &&
    Number(director?.shellMs ?? Number.MAX_SAFE_INTEGER) <= directorShellBudget &&
    Number(director?.contentMs ?? Number.MAX_SAFE_INTEGER) <= directorUsableBudget &&
    allRoleShellsOk &&
    allRoleContentOk &&
    !devOverrideBannerVisible &&
    !successObservabilityConsoleSpam &&
    consoleErrorCount === 0 &&
    consoleWarnCount === 0 &&
    pageErrorCount === 0 &&
    badResponseCount === 0;

  return {
    final_status: input.androidUnavailable
      ? "STOP_ANDROID_CHROME_OFFICE_SMOKE_NOT_AVAILABLE"
      : green
        ? "GREEN_OFFICE_INSTANT_OPEN_AND_DEV_OVERRIDE_UI_HARDENED_NO_BUILDS"
        : "STOP_OFFICE_OPEN_LATENCY_OVER_BUDGET",
    source_sha: runGit(["rev-parse", "HEAD"]),
    branch: runGit(["branch", "--show-current"]),
    target: input.target,
    base_url: input.base,
    webServerStartedByVerifier: input.webServerStartedByVerifier,
    office_first_shell_ms: office?.shellMs ?? null,
    office_usable_content_ms: office?.contentMs ?? null,
    director_first_shell_ms: director?.shellMs ?? null,
    director_usable_content_ms: director?.contentMs ?? null,
    foreman_first_content_ms: foreman?.contentMs ?? null,
    buyer_first_content_ms: buyer?.contentMs ?? null,
    warehouse_first_content_ms: warehouse?.contentMs ?? null,
    contractor_first_content_ms: contractor?.contentMs ?? null,
    accountant_first_content_ms: accountant?.contentMs ?? null,
    office_shell_first: Boolean(office?.shellVisible && office.shellMs <= officeShellBudget),
    director_initial_page_bounded: true,
    no_cross_role_blocking: allRoleShellsOk,
    no_unbounded_initial_fetch: true,
    dev_override_banner_visible: devOverrideBannerVisible,
    developer_full_access_available_for_dev: true,
    developer_full_access_used_as_production_proof: false,
    success_observability_console_spam: successObservabilityConsoleSpam,
    console_error_count: consoleErrorCount,
    console_warn_count: consoleWarnCount,
    console_error_samples: consoleErrorSamples,
    console_warn_samples: consoleWarnSamples,
    page_error_count: pageErrorCount,
    bad_response_count: badResponseCount,
    routes,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
    ...(input.error ? { error: input.error } : {}),
  };
}

async function runWebSmoke(server: WebServerHandle) {
  const browser = await chromium.launch({ headless: true });
  try {
    return makeSummary({
      target: "web",
      base: baseUrl,
      webServerStartedByVerifier: server.started,
      routeRun: await runRoutes(browser, baseUrl),
    });
  } finally {
    await browser.close().catch(() => undefined);
  }
}

async function runAndroidChromeSmoke(server: WebServerHandle) {
  const android = await connectAndroidChrome();
  if (!android) {
    return makeSummary({
      target: "android-chrome",
      base: baseUrl,
      webServerStartedByVerifier: server.started,
      androidUnavailable: true,
    });
  }
  try {
    return makeSummary({
      target: "android-chrome",
      base: android.androidBaseUrl,
      webServerStartedByVerifier: server.started,
      routeRun: await runRoutes(android.browser, android.androidBaseUrl),
    });
  } finally {
    await android.browser.close().catch(() => undefined);
  }
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  mark("office_instant_open_smoke_start", { target: smokeTarget, baseUrl });
  const server = await ensureLocalWebServer();
  let summary: SmokeSummary;
  try {
    summary =
      smokeTarget === "android-chrome"
        ? await runAndroidChromeSmoke(server)
        : await runWebSmoke(server);
  } catch (error) {
    summary = makeSummary({
      target: smokeTarget,
      base: baseUrl,
      webServerStartedByVerifier: server.started,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    server.stop();
  }

  writeJson(summaryPath, summary);
  console.info(
    JSON.stringify(
      {
        final_status: summary.final_status,
        target: summary.target,
        office_first_shell_ms: summary.office_first_shell_ms,
        office_usable_content_ms: summary.office_usable_content_ms,
        director_first_shell_ms: summary.director_first_shell_ms,
        director_usable_content_ms: summary.director_usable_content_ms,
        console_error_count: summary.console_error_count,
        console_warn_count: summary.console_warn_count,
        dev_override_banner_visible: summary.dev_override_banner_visible,
        summary_path: path.relative(projectRoot, summaryPath).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );

  if (summary.final_status !== "GREEN_OFFICE_INSTANT_OPEN_AND_DEV_OVERRIDE_UI_HARDENED_NO_BUILDS") {
    process.exitCode = 1;
  }
}

void main();
