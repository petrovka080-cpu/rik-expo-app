import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

import { loadOfficeMarketLiveEnv } from "../e2e/officeMarketLiveHarnessContracts";
import {
  OFFICE_ACCESS_ROUTE_MANIFEST,
} from "../../src/lib/officeRuntime/officeRuntimePolicy";
import { PLATFORM_DEVELOPER_ACCESS_MATRIX } from "../../src/lib/platformDeveloper/platformDeveloperAccessMatrix";

type Json = Record<string, any>;

const DEVELOPER_OVERRIDE_ROLES = [
  "foreman",
  "director",
  "buyer",
  "warehouse",
  "accountant",
  "contractor",
  "security",
  "engineer",
  "estimator",
] as const;
type DeveloperOverrideRole = (typeof DEVELOPER_OVERRIDE_ROLES)[number];

const LIVE_ENV = loadOfficeMarketLiveEnv();
const ORIGIN = String(process.env.S279_DEVELOPER_WEB_ORIGIN ?? "http://127.0.0.1:8081")
  .replace(/\/$/u, "");
const PROVIDER_URL = String(process.env.STAGING_SUPABASE_URL ?? "").replace(/\/$/u, "");
const PROVIDER_KEY = String(process.env.STAGING_SUPABASE_READONLY_KEY ?? "");
const OUTPUT = resolve(
  process.env.S279_DEVELOPER_ACCESS_OUTPUT ??
    ".release-runtime/r568/s27-9/p6/v15/developer-account-access/acceptance.json",
);
const METRO_RECEIPT = resolve(
  process.env.S279_DEVELOPER_METRO_RECEIPT ??
    ".release-runtime/r568/runtime/whole-app-developer-current/metro.json",
);

const ROLE_TARGETS: Record<DeveloperOverrideRole, { route: string; testId: string }> = {
  foreman: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.foreman.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.foreman.expectedShellTestId,
  },
  director: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.director.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.director.expectedShellTestId,
  },
  buyer: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.buyer.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.buyer.expectedShellTestId,
  },
  accountant: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.accountant.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.accountant.expectedShellTestId,
  },
  warehouse: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.warehouse.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.warehouse.expectedShellTestId,
  },
  contractor: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.contractor.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.contractor.expectedShellTestId,
  },
  security: {
    route: OFFICE_ACCESS_ROUTE_MANIFEST.security.route,
    testId: OFFICE_ACCESS_ROUTE_MANIFEST.security.expectedShellTestId,
  },
  estimator: { route: "/request", testId: "consumer-repair-problem-input" },
  engineer: { route: "/office", testId: "office-card-engineer" },
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S279_DEVELOPER_ACCESS:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function sessionIdentity(page: Page): Promise<{ actorId: string; providerRole: string }> {
  const identity = await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      try {
        const session = JSON.parse(window.localStorage.getItem(key) ?? "null") as Json;
        const actorId = String(session?.user?.id ?? "");
        if (actorId) {
          return {
            actorId,
            providerRole: String(session?.user?.app_metadata?.role ?? ""),
          };
        }
      } catch {
        // Ignore unrelated storage records.
      }
    }
    return { actorId: "", providerRole: "" };
  });
  invariant(identity.actorId, "ACTOR_ID_MISSING");
  return identity;
}

async function sessionAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      try {
        const session = JSON.parse(window.localStorage.getItem(key) ?? "null") as Json;
        const accessToken = String(session?.access_token ?? "");
        if (accessToken.length > 20) return accessToken;
      } catch {
        // Ignore unrelated storage records.
      }
    }
    return "";
  });
  invariant(token.length > 20, "ACCESS_TOKEN_MISSING");
  return token;
}

async function signIn(page: Page): Promise<{ actorId: string; providerRole: string }> {
  const email = String(process.env.E2E_CONSUMER_EMAIL ?? "").trim();
  const password = String(process.env.E2E_CONSUMER_PASSWORD ?? "");
  invariant(email && password, "GUARDED_CREDENTIALS_MISSING");
  const login = new URL("/auth/login", ORIGIN);
  login.searchParams.set("returnTo", "/request");
  await page.goto(login.toString(), { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("auth.login.email").fill(email);
  await page.getByTestId("auth.login.password").fill(password);
  await page.getByTestId("auth.login.submit").click();
  await page.waitForURL((url) => url.pathname === "/request", { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
  return sessionIdentity(page);
}

async function switchRole(page: Page, role: DeveloperOverrideRole, actorId: string): Promise<Json> {
  await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
  const accessToken = await sessionAccessToken(page);
  const response = await fetch(`${PROVIDER_URL}/rest/v1/rpc/developer_set_effective_role_v1`, {
    method: "POST",
    headers: {
      apikey: PROVIDER_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_effective_role: role }),
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  if (!response.ok) {
    return {
      role,
      route: ROLE_TARGETS[role].route,
      rpcStatus: response.status,
      rpcErrorCode: String(body?.code ?? body?.error_code ?? "ROLE_RPC_REJECTED"),
      providerActorStable: (await sessionIdentity(page)).actorId === actorId,
      verdict: "RED",
    };
  }
  const allowedRoles = Array.isArray(body.allowedRoles) ? body.allowedRoles.map(String) : [];
  const explicitServerAuthorization =
    body.actorRole === "platform_developer" &&
    body.entitlement === "platform_developer" &&
    body.authorizationSource === "server_entitlement";
  const legacyProtectedServerAuthorization =
    !("actorRole" in body) &&
    !("entitlement" in body) &&
    !("authorizationSource" in body) &&
    body.isEnabled === true &&
    body.canAccessAllOfficeRoutes === true &&
    body.canImpersonateForMutations === true;
  const contextGreen =
    body.actorUserId === actorId &&
    (explicitServerAuthorization || legacyProtectedServerAuthorization) &&
    body.isEnabled === true &&
    body.isActive === true &&
    body.activeEffectiveRole === role &&
    body.canAccessAllOfficeRoutes === true &&
    body.canImpersonateForMutations === true;

  const target = ROLE_TARGETS[role];
  await page.goto(`${ORIGIN}${target.route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const targetVisible = await page.getByTestId(target.testId)
    .waitFor({ state: "visible", timeout: 90_000 })
    .then(() => true)
    .catch(() => false);
  const state = await page.evaluate(() => ({
    pathname: window.location.pathname,
    loginRedirect: window.location.pathname.startsWith("/auth/"),
    protectedFailure: Boolean(document.querySelector('[data-testid^="protected-identity-state-"]')),
    roleGuardBlocked: Boolean(document.querySelector('[data-testid="office-role-guard-blocked"]')),
    authDegraded: Boolean(document.querySelector('[data-testid="office-role-auth-degraded"]')),
    redOverlay: Boolean(
      document.querySelector('[data-testid="redbox"]') ||
      document.querySelector('[data-testid="error-overlay"]'),
    ),
  }));
  const identity = await sessionIdentity(page);
  const green =
    contextGreen &&
    targetVisible &&
    state.pathname === target.route &&
    !state.loginRedirect &&
    !state.protectedFailure &&
    !state.roleGuardBlocked &&
    !state.authDegraded &&
    !state.redOverlay &&
    identity.actorId === actorId;
  return {
    role,
    route: target.route,
    targetTestId: target.testId,
    rpcStatus: response.status,
    serverAllowedRoles: allowedRoles,
    serverAllowedRoleCount: allowedRoles.length,
    activeEffectiveRole: body.activeEffectiveRole ?? null,
    authorizationContract: explicitServerAuthorization
      ? "EXPLICIT_PLATFORM_DEVELOPER_ENTITLEMENT"
      : legacyProtectedServerAuthorization
        ? "LEGACY_PROTECTED_SERVER_OVERRIDE"
        : "UNAUTHORIZED",
    fullOfficeRoutes: body.canAccessAllOfficeRoutes === true,
    mutationImpersonation: body.canImpersonateForMutations === true,
    providerActorStable: identity.actorId === actorId,
    targetVisible,
    ...state,
    verdict: green ? "GREEN" : "RED",
  };
}

async function verifyRoute(page: Page, entry: (typeof PLATFORM_DEVELOPER_ACCESS_MATRIX)[number]): Promise<Json> {
  const requestFailures: string[] = [];
  const pageErrors: string[] = [];
  const onRequestFailed = (request: { url(): string }) => requestFailures.push(request.url());
  const onPageError = (error: Error) => pageErrors.push(error.message.slice(0, 500));
  page.on("requestfailed", onRequestFailed);
  page.on("pageerror", onPageError);
  try {
    await page.goto(`${ORIGIN}${entry.route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    if ("expectedShellTestId" in entry) {
      await page.getByTestId(entry.expectedShellTestId)
        .waitFor({ state: "visible", timeout: 90_000 })
        .catch(() => undefined);
    } else {
      await page.waitForTimeout(1_000);
    }
    const state = await page.evaluate(() => ({
      pathname: window.location.pathname,
      bodyVisible: document.body.innerText.replace(/\s+/gu, " ").trim().length > 20,
      loginRedirect: window.location.pathname.startsWith("/auth/"),
      notFound: /page not found|страница не найдена/iu.test(document.body.innerText),
      protectedFailure: Boolean(document.querySelector('[data-testid^="protected-identity-state-"]')),
      roleGuardBlocked: Boolean(document.querySelector('[data-testid="office-role-guard-blocked"]')),
      authDegraded: Boolean(document.querySelector('[data-testid="office-role-auth-degraded"]')),
      configRecovery: Boolean(document.querySelector('[data-testid="config-recovery-state"]')),
      redOverlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
        document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const green =
      state.pathname === entry.route &&
      state.bodyVisible &&
      !state.loginRedirect &&
      !state.notFound &&
      !state.protectedFailure &&
      !state.roleGuardBlocked &&
      !state.authDegraded &&
      !state.configRecovery &&
      !state.redOverlay &&
      pageErrors.length === 0;
    return {
      area: entry.area,
      route: entry.route,
      expectedRole: "effectiveRole" in entry ? entry.effectiveRole : null,
      ...state,
      pageErrors,
      requestFailures,
      verdict: green ? "GREEN" : "RED",
    };
  } finally {
    page.off("requestfailed", onRequestFailed);
    page.off("pageerror", onPageError);
  }
}

async function main(): Promise<void> {
  const metro = readJson(METRO_RECEIPT);
  invariant(metro.runtime_profile === "whole_app_staging_plus_local_estimate", "RUNTIME_PROFILE_RED");
  invariant(PROVIDER_URL.startsWith("https://") && PROVIDER_KEY.length > 20,
    "STAGING_PROVIDER_CONFIG_MISSING");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  let actor: { actorId: string; providerRole: string } | null = null;
  const roles: Json[] = [];
  const routes: Json[] = [];
  try {
    actor = await signIn(page);
    for (const role of DEVELOPER_OVERRIDE_ROLES) {
      roles.push(await switchRole(page, role, actor.actorId));
    }
    await switchRole(page, "director", actor.actorId);
    for (const entry of PLATFORM_DEVELOPER_ACCESS_MATRIX) {
      routes.push(await verifyRoute(page, entry));
    }
  } finally {
    if (actor) await switchRole(page, "director", actor.actorId).catch(() => undefined);
    await context.close();
    await browser.close();
  }

  const roleGreen = roles.filter((entry) => entry.verdict === "GREEN").length;
  const routeGreen = routes.filter((entry) => entry.verdict === "GREEN").length;
  const allGreen = roleGreen === DEVELOPER_OVERRIDE_ROLES.length && routeGreen === routes.length;
  const receipt = {
    schemaVersion: "rik-expo-app.s27-9.existing-developer-access-acceptance.v1",
    generatedAt: new Date().toISOString(),
    status: allGreen
      ? "GREEN_S279_EXISTING_DEVELOPER_ALL_ROLES_AND_SCREENS"
      : "RED_S279_EXISTING_DEVELOPER_ACCESS_GAP",
    actor: {
      userIdSha256: sha256(actor?.actorId ?? ""),
      providerRole: actor?.providerRole ?? null,
      providerActorStable: roles.every((entry) => entry.providerActorStable === true),
      credentialsPrinted: false,
      tokensPrinted: false,
      guardedEnvFilesLoaded: LIVE_ENV.loadedFiles,
      finalEffectiveRole: "director",
    },
    roleMatrix: {
      denominator: DEVELOPER_OVERRIDE_ROLES.length,
      green: roleGreen,
      red: DEVELOPER_OVERRIDE_ROLES.length - roleGreen,
      cases: roles,
    },
    routeMatrix: {
      denominator: routes.length,
      green: routeGreen,
      red: routes.length - routeGreen,
      cases: routes,
    },
    runtime: {
      origin: ORIGIN,
      metroReceipt: METRO_RECEIPT.replaceAll("\\", "/"),
      metroReceiptSha256: sha256(readFileSync(METRO_RECEIPT)),
      sourceTreeHash: metro.source_tree_hash,
      productSourceHash: metro.product_source_hash,
      jsBundleFingerprint: metro.js_bundle_fingerprint,
    },
    productionAccessed: false,
    deployed: false,
    released: false,
  };
  writeJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    roleGreen,
    roleDenominator: DEVELOPER_OVERRIDE_ROLES.length,
    routeGreen,
    routeDenominator: routes.length,
    redRoles: roles.filter((entry) => entry.verdict === "RED").map((entry) => entry.role),
    redRoutes: routes.filter((entry) => entry.verdict === "RED").map((entry) => entry.route),
    output: OUTPUT,
    outputSha256: sha256(readFileSync(OUTPUT)),
  })}\n`);
  invariant(allGreen, "ALL_ROLES_AND_SCREENS_RED");
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
