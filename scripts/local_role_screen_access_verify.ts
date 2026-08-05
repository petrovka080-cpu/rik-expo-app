import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

import { baseUrl, poll } from "./_shared/webRuntimeHarness";
import { cleanupTempUser, createTempUser, createVerifierAdmin } from "./_shared/testUserDiscipline";
import { POST_AUTH_ENTRY_ROUTE } from "../src/lib/authRouting";
import { LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY } from "../src/lib/developerOverride.constants";
import { isLocalDeveloperFullAccessAllowed } from "../src/lib/developerOverridePolicy";
import { OFFICE_ACCESS_ROUTE_MANIFEST } from "../src/lib/officeRuntime/officeRuntimePolicy";

const projectRoot = process.cwd();
const admin = createVerifierAdmin("local-role-screen-access-verify");
const artifactDir = path.join(projectRoot, "artifacts", "current-core-closeout");
const smokePath = path.join(artifactDir, "developer-route-smoke-results.json");
const inventoryPath = path.join(artifactDir, "developer-route-inventory.json");
const dispositionPath = path.join(artifactDir, "developer-route-disposition-ledger.json");
const productionNegativePath = path.join(artifactDir, "production-rbac-negative-proof.json");
const proofPath = path.join(artifactDir, "developer-route-smoke-results.md");
const webServerStdoutPath = path.join(projectRoot, "artifacts/local-role-screen-access-web.stdout.log");
const webServerStderrPath = path.join(projectRoot, "artifacts/local-role-screen-access-web.stderr.log");

const routeInventory = Object.values(OFFICE_ACCESS_ROUTE_MANIFEST);
const invalidRoute = "/__developer_route_probe_invalid__";

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const anonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const supabaseProjectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
})();
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

type WebServerHandle = {
  started: boolean;
  stop: () => void;
};

function stopProcessTree(child: { pid?: number; exitCode: number | null; kill: (signal?: NodeJS.Signals) => boolean }) {
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

function writeJsonArtifact(fullPath: string, payload: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function normalizeBodyText(value: string) {
  return String(value || "").replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

async function bodyText(page: Page) {
  return normalizeBodyText(await page.evaluate(() => document.body.innerText || ""));
}

async function isWebServerReady() {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureLocalWebServer(): Promise<WebServerHandle> {
  if (await isWebServerReady()) {
    return {
      started: false,
      stop: () => {},
    };
  }

  fs.mkdirSync(path.dirname(webServerStdoutPath), { recursive: true });
  fs.writeFileSync(webServerStdoutPath, "", "utf8");
  fs.writeFileSync(webServerStderrPath, "", "utf8");

  const child = spawn(
    "cmd.exe",
    ["/c", "npx", "expo", "start", "--web"],
    {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        EXPO_PUBLIC_OFFICE_LOCAL_DEVELOPER_FULL_ACCESS: "1",
      },
    },
  );

  child.stdout.on("data", (chunk) => {
    fs.appendFileSync(webServerStdoutPath, String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    fs.appendFileSync(webServerStderrPath, String(chunk));
  });

  await poll(
    "local-role-screen-access-web-server-ready",
    async () => {
      if (child.exitCode != null) {
        const stderr = fs.existsSync(webServerStderrPath)
          ? fs.readFileSync(webServerStderrPath, "utf8")
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
    stop: () => {
      stopProcessTree(child);
    },
  };
}

async function signInSession(email: string, password: string) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-client-info": "local-role-screen-access-verify-signin",
      },
    },
  });

  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) {
    throw result.error ?? new Error(`signInWithPassword returned no session for ${email}`);
  }
  return result.data.session;
}

function pathFromUrl(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

async function verifyRoute(
  page: Page,
  entry: (typeof routeInventory)[number],
) {
  await page.goto(`${baseUrl}${entry.route}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const settled = await poll(
    `local-role-screen-route:${entry.route}`,
    async () => {
      const currentUrl = page.url();
      const currentPath = pathFromUrl(currentUrl);
      const text = await bodyText(page);
      const hasNotFoundSurface = /Страница не найдена|page not found|not found/i.test(text);
      const authRedirected = currentPath.includes("/auth/login");
      const shellVisible = await page
        .locator(`[data-testid="${entry.expectedShellTestId}"]`)
        .isVisible()
        .catch(() => false);
      const loadingFallbackVisible = await page
        .locator('[data-testid="office-role-auth-loading"]')
        .isVisible()
        .catch(() => false);
      return text.length > 0 && (shellVisible || hasNotFoundSurface || authRedirected)
        ? {
            currentUrl,
            currentPath,
            bodySample: text.slice(0, 280),
            hasNotFoundSurface,
            authRedirected,
            shellVisible,
            loadingFallbackVisible,
          }
        : null;
    },
    45_000,
    500,
  );

  return {
    routeId: entry.screenId,
    role: entry.role,
    route: entry.route,
    routeModule: entry.routeModule,
    expectedShellTestId: entry.expectedShellTestId,
    finalUrl: settled.currentUrl,
    finalPath: settled.currentPath,
    redirected: settled.currentPath !== entry.route,
    openedInLocalDev:
      settled.currentPath === entry.route &&
      settled.shellVisible &&
      !settled.hasNotFoundSurface &&
      !settled.authRedirected &&
      !settled.loadingFallbackVisible,
    hasNotFoundSurface: settled.hasNotFoundSurface,
    authRedirected: settled.authRedirected,
    expectedRoleShellVisible: settled.shellVisible,
    loadingFallbackVisible: settled.loadingFallbackVisible,
    blankScreen: settled.bodySample.length === 0,
    bodySample: settled.bodySample,
  };
}

async function verifyInvalidRouteIsRejected(page: Page) {
  await page.goto(`${baseUrl}${invalidRoute}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  return poll(
    "local-role-invalid-route-rejected",
    async () => {
      const text = await bodyText(page);
      const hasNotFoundSurface =
        /Страница не найдена|page not found|not found/i.test(text);
      return hasNotFoundSurface
        ? {
            route: invalidRoute,
            finalPath: pathFromUrl(page.url()),
            hasNotFoundSurface,
            bodySample: text.slice(0, 280),
          }
        : null;
    },
    45_000,
    500,
  );
}

function evaluateStaticRouteInventory() {
  return routeInventory.map((entry) => {
    const routeModulePath = path.join(projectRoot, entry.routeModule);
    const source = fs.existsSync(routeModulePath)
      ? fs.readFileSync(routeModulePath, "utf8")
      : "";
    return {
      ...entry,
      routeModuleExists: fs.existsSync(routeModulePath),
      routeDefinitionMatches:
        source.includes(`route="${entry.route}"`) &&
        source.includes(`requiredRole="${entry.role}"`),
    };
  });
}

function evaluateProductionRbacNegativeProof() {
  const productionWeb = {
    envValue: "1",
    host: "app.example.com",
    isDev: false,
    platformOS: "web",
    releaseChannel: "production",
    storageValue: "1",
    webdriver: false,
  } as const;
  const productionNative = {
    envValue: "1",
    host: null,
    isDev: false,
    platformOS: "android",
    releaseChannel: "production",
    storageValue: "1",
    webdriver: false,
  } as const;
  const localWithoutExplicitOptIn = {
    envValue: null,
    host: "localhost",
    isDev: true,
    platformOS: "web",
    releaseChannel: "development",
    storageValue: null,
    webdriver: false,
  } as const;
  const cases = [
    {
      id: "production_web_rejects_injected_flags",
      allowed: isLocalDeveloperFullAccessAllowed(productionWeb),
    },
    {
      id: "production_native_rejects_injected_flags",
      allowed: isLocalDeveloperFullAccessAllowed(productionNative),
    },
    {
      id: "local_requires_explicit_opt_in",
      allowed: isLocalDeveloperFullAccessAllowed(localWithoutExplicitOptIn),
    },
  ];
  return {
    status: cases.every((item) => item.allowed === false) ? "GREEN" : "RED",
    cases,
  };
}

function evaluateEntryPolicyProof() {
  return {
    postAuthEntryRoute: POST_AUTH_ENTRY_ROUTE,
    postAuthEntryUsesAccessHub: POST_AUTH_ENTRY_ROUTE === "/(tabs)/profile",
  };
}

async function main() {
  if (!supabaseUrl || !anonKey || !supabaseProjectRef) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  let user: Awaited<ReturnType<typeof createTempUser>> | null = null;
  let webServer: WebServerHandle | null = null;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    webServer = await ensureLocalWebServer();
    user = await createTempUser(admin, {
      role: "foreman",
      fullName: "Local Role Access Verify",
      emailPrefix: "local-role-access-verify",
    });

    const session = await signInSession(user.email, user.password);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.addInitScript(
      ({ authStorageKey, developerStorageKey, sessionValue }) => {
        window.localStorage.setItem(authStorageKey, sessionValue);
        window.localStorage.setItem(developerStorageKey, "1");
      },
      {
        authStorageKey: supabaseStorageKey,
        developerStorageKey: LOCAL_DEVELOPER_FULL_ACCESS_STORAGE_KEY,
        sessionValue: JSON.stringify(session),
      },
    );

    const staticInventory = evaluateStaticRouteInventory();
    const routeResults = [] as Array<Awaited<ReturnType<typeof verifyRoute>>>;
    for (const entry of routeInventory) {
      routeResults.push(await verifyRoute(page, entry));
    }
    const invalidRouteProof = await verifyInvalidRouteIsRejected(page);
    const productionRbacNegativeProof = evaluateProductionRbacNegativeProof();

    const entryPolicy = evaluateEntryPolicyProof();
    const inventoryIsCanonical = staticInventory.every(
      (item) => item.routeModuleExists && item.routeDefinitionMatches,
    );
    const payload = {
      status:
        routeResults.every((item) => item.openedInLocalDev)
        && inventoryIsCanonical
        && invalidRouteProof.hasNotFoundSurface
        && productionRbacNegativeProof.status === "GREEN"
        && entryPolicy.postAuthEntryUsesAccessHub
          ? "GREEN"
          : "NOT_GREEN",
      checkedAt: new Date().toISOString(),
      baseUrl,
      authenticatedUser: {
        role: user.role,
        email: user.email,
      },
      developerOverrideRequested: true,
      inventoryIsCanonical,
      routes: routeResults,
      invalidRouteProof,
      productionRbacNegativeProof,
      entryPolicy,
    };

    writeJsonArtifact(inventoryPath, {
      status: inventoryIsCanonical ? "GREEN" : "RED",
      source: "src/lib/officeRuntime/officeRuntimePolicy.ts#OFFICE_ACCESS_ROUTE_MANIFEST",
      routes: staticInventory,
    });
    writeJsonArtifact(dispositionPath, {
      status: "GREEN",
      priorFalseGreenRoutes: [
        "/director",
        "/buyer",
        "/accountant",
        "/warehouse",
        "/contractor",
      ].map((legacyRoute) => ({
        legacyRoute,
        disposition: "removed_from_verifier",
        reason: "No matching Expo Router module; canonical route is nested under /office.",
      })),
      aliasesCreated: 0,
    });
    writeJsonArtifact(productionNegativePath, productionRbacNegativeProof);
    writeJsonArtifact(smokePath, payload);
    fs.writeFileSync(
      proofPath,
      [
        "# Local Role Screen Access Proof",
        "",
        "## Result",
        `- Status: \`${payload.status}\``,
        `- Base URL: \`${baseUrl}\``,
        `- Authenticated role used for proof: \`${user.role}\``,
        "",
        "## Local/dev route checks",
        ...routeResults.map(
          (item) =>
            `- \`${item.route}\` -> \`${item.finalPath}\` | redirected=${item.redirected ? "true" : "false"} | opened=${item.openedInLocalDev ? "true" : "false"}`,
        ),
        `- Invalid route rejected: ${invalidRouteProof.hasNotFoundSurface ? "true" : "false"}`,
        `- Production RBAC bypass rejected: ${productionRbacNegativeProof.status === "GREEN" ? "true" : "false"}`,
        "",
        "## Entry policy",
        `- postAuthEntryRoute = \`${entryPolicy.postAuthEntryRoute}\``,
        `- postAuthEntryUsesAccessHub = ${entryPolicy.postAuthEntryUsesAccessHub ? "true" : "false"}`,
      ].join("\n"),
      "utf8",
    );

    console.log(JSON.stringify(payload, null, 2));
    if (payload.status !== "GREEN") process.exitCode = 1;
  } finally {
    await browser?.close().catch(() => {});
    await cleanupTempUser(admin, user);
    webServer?.stop();
  }
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown error");
  writeJsonArtifact(smokePath, {
    status: "FAILED",
    checkedAt: new Date().toISOString(),
    baseUrl,
    error: message,
  });
  console.error(message);
  process.exitCode = 1;
});
