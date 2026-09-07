import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

import { PLATFORM_DEVELOPER_ACCESS_MATRIX } from "../../src/lib/platformDeveloper/platformDeveloperAccessMatrix";
import { computeReleaseFingerprints } from "../release/computeReleaseFingerprints";

type Json = Record<string, any>;

const MASTER_SHA256 =
  process.env.R4_A10_MASTER_SHA256 ??
  process.env.R4_A8_MASTER_SHA256 ??
  "9262479c9c9fb3107c4541046c367db7934c875ea8354cc472a7529788635d1b";
const ORIGIN = process.env.R555_WEB_ORIGIN ?? "http://localhost:8081";
const OUTPUT = resolve(
  process.env.R4_A8_DEVELOPER_ROUTE_MANIFEST_OUTPUT ??
    ".release-runtime/r555/evidence/23B_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST.json",
);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
function atomicJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}
function endpoint(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-request-url";
  }
}

async function signInDirector(page: Page) {
  await page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("auth.login.screen").waitFor({ timeout: 60_000 });
  await page.getByTestId("local-developer-role-toggle").waitFor({
    state: "visible",
    timeout: 180_000,
  });
  const actorBefore = await page.evaluate(() => {
    const raw = window.localStorage.getItem("sb-127-auth-token");
    try {
      const session = raw ? JSON.parse(raw) : null;
      return {
        userId:
          typeof session?.user?.id === "string" ? session.user.id : null,
        providerRole:
          typeof session?.user?.app_metadata?.role === "string"
            ? session.user.app_metadata.role
            : null,
      };
    } catch {
      return { userId: null, providerRole: null };
    }
  });
  invariant(actorBefore.userId, "R555_ROUTE_OWNER_ACTOR_ID_MISSING");
  await page.getByTestId("local-developer-role-toggle").click();
  const serverRoleResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith(
        "/rest/v1/rpc/developer_set_effective_role_v1",
      ) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await page.getByTestId("local-developer-role-director").click();
  const roleResponse = await serverRoleResponse;
  invariant(roleResponse.ok(), "R555_ROUTE_EFFECTIVE_ROLE_RPC_RED");
  const serverContext = (await roleResponse.json()) as Record<string, unknown>;
  const allowedRoles = Array.isArray(serverContext.allowedRoles)
    ? serverContext.allowedRoles.map(String)
    : [];
  invariant(
    serverContext.actorUserId === actorBefore.userId &&
      serverContext.actorRole === "platform_developer" &&
      serverContext.entitlement === "platform_developer" &&
      serverContext.authorizationSource === "server_entitlement" &&
      serverContext.activeEffectiveRole === "director" &&
      serverContext.canAccessAllOfficeRoutes === true &&
      serverContext.canImpersonateForMutations === true,
    "R555_ROUTE_SERVER_ENTITLEMENT_RED",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(
        '[data-testid="local-developer-active-role"]',
      )?.textContent?.trim() === "Директор",
    undefined,
    { timeout: 120_000 },
  );
  await page.waitForURL((url) => url.pathname === "/request", { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
  const actorAfter = await page.evaluate(() => {
    const raw = window.localStorage.getItem("sb-127-auth-token");
    try {
      const session = raw ? JSON.parse(raw) : null;
      return {
        userId:
          typeof session?.user?.id === "string" ? session.user.id : null,
        providerRole:
          typeof session?.user?.app_metadata?.role === "string"
            ? session.user.app_metadata.role
            : null,
      };
    } catch {
      return { userId: null, providerRole: null };
    }
  });
  invariant(
    actorAfter.userId === actorBefore.userId &&
      actorAfter.providerRole === actorBefore.providerRole,
    "R555_ROUTE_PROVIDER_ACTOR_CHANGED",
  );
  return { actorBefore, serverContext, allowedRoles };
}

async function verifyRoute(
  context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>,
  entry: (typeof PLATFORM_DEVELOPER_ACCESS_MATRIX)[number],
) {
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const productionRequests: string[] = [];
  const multipleClientWarnings: string[] = [];
  const httpErrors: Array<{ status: number; endpoint: string }> = [];
  page.on("console", (message) => {
    const messageText = message.text();
    if (message.type() === "error") consoleErrors.push(messageText.slice(0, 500));
    if (/Multiple GoTrueClient instances/iu.test(messageText)) {
      multipleClientWarnings.push(messageText.slice(0, 500));
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 500)));
  page.on("requestfailed", (request) => {
    if (!/sentry|favicon/iu.test(request.url())) requestFailures.push(endpoint(request.url()));
  });
  page.on("request", (request) => {
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
      productionRequests.push(endpoint(request.url()));
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    httpErrors.push({ status: response.status(), endpoint: endpoint(response.url()) });
  });

  try {
    await page.goto(`${ORIGIN}${entry.route}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 120_000 });
    if ("expectedShellTestId" in entry) {
      await Promise.race([
        page.getByTestId(entry.expectedShellTestId).waitFor({ timeout: 60_000 }),
        page.getByTestId("office-role-guard-blocked").waitFor({ timeout: 60_000 }),
        page.getByTestId("office-role-auth-degraded").waitFor({ timeout: 60_000 }),
      ]).catch(() => undefined);
    } else {
      await page.waitForTimeout(1_500);
    }
    const state = await page.evaluate(() => ({
      pathname: window.location.pathname,
      bodyText: document.body.innerText.replace(/\s+/gu, " ").trim().slice(0, 2_000),
      protectedFailure: Boolean(
        document.querySelector('[data-testid^="protected-identity-state-"]'),
      ),
      configRecovery: Boolean(document.querySelector('[data-testid="config-recovery-state"]')),
      redOverlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
          document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const expectedPath = entry.route;
    const notFound = /Страница не найдена|page not found/iu.test(state.bodyText);
    const loginRedirect = state.pathname.startsWith("/auth/");
    const green =
      state.pathname === expectedPath &&
      state.bodyText.length > 0 &&
      !state.protectedFailure &&
      !state.configRecovery &&
      !state.redOverlay &&
      !notFound &&
      !loginRedirect &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      requestFailures.length === 0 &&
      productionRequests.length === 0 &&
      multipleClientWarnings.length === 0;
    return {
      area: entry.area,
      route: entry.route,
      route_module: entry.routeModule,
      expected_role: "effectiveRole" in entry ? entry.effectiveRole : null,
      final_path: state.pathname,
      body_visible: state.bodyText.length > 0,
      protected_failure: state.protectedFailure,
      config_recovery: state.configRecovery,
      red_overlay: state.redOverlay,
      not_found: notFound,
      login_redirect: loginRedirect,
      console_errors: consoleErrors.length,
      console_error_messages: consoleErrors,
      page_errors: pageErrors.length,
      request_failures: requestFailures,
      production_requests: productionRequests,
      multiple_client_warnings: multipleClientWarnings.length,
      http_errors: httpErrors,
      verdict: green ? "GREEN" : "RED",
    };
  } finally {
    await page.close();
  }
}

async function main() {
  const fingerprints = computeReleaseFingerprints();
  const requestedRoute = String(process.argv[2] ?? "").trim();
  const entries = requestedRoute
    ? PLATFORM_DEVELOPER_ACCESS_MATRIX.filter((entry) => entry.route === requestedRoute)
    : PLATFORM_DEVELOPER_ACCESS_MATRIX;
  invariant(entries.length > 0, "R555_ROUTE_MANIFEST_FILTER_RED");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  try {
    const loginPage = await context.newPage();
    const developerIdentity = await signInDirector(loginPage);
    await loginPage.close();

    const routes: Json[] = [];
    for (const entry of entries) {
      routes.push(await verifyRoute(context, entry));
    }
    const green = routes.filter((route) => route.verdict === "GREEN").length;
    const receiptBase = {
      schema_version: "rik-expo-app-r555.local-developer-route-manifest.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status:
        green === entries.length
          ? "GREEN_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST"
          : "RED_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST",
      source: "src/lib/platformDeveloper/platformDeveloperAccessMatrix.ts",
      source_identity: {
        product_source_hash: fingerprints.productSourceHash,
        js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
      },
      principal: {
        provider_issued: true,
        actor_user_id_sha256: sha256(developerIdentity.actorBefore.userId!),
        provider_role: developerIdentity.actorBefore.providerRole,
        provider_actor_stable: true,
        actor_role: developerIdentity.serverContext.actorRole,
        entitlement: developerIdentity.serverContext.entitlement,
        authorization_source:
          developerIdentity.serverContext.authorizationSource,
        effective_role: developerIdentity.serverContext.activeEffectiveRole,
        allowed_roles: developerIdentity.allowedRoles.length,
        can_access_all_office_routes:
          developerIdentity.serverContext.canAccessAllOfficeRoutes === true,
        tenant_class: "dedicated_local_test_tenant",
        credentials_captured: false,
      },
      denominator: entries.length,
      green,
      red: entries.length - green,
      routes,
      scope: {
        production_accessed: false,
        deployed: false,
        released: false,
        merged: false,
        ota: false,
      },
    };
    const output = requestedRoute
      ? resolve(".release-runtime/r555/runtime/local-developer/route-probe.json")
      : OUTPUT;
    atomicJson(output, {
      ...receiptBase,
      payload_sha256: sha256(JSON.stringify(receiptBase)),
    });
    process.stdout.write(
      `${JSON.stringify({
        status: receiptBase.status,
        denominator: receiptBase.denominator,
        green,
        red: receiptBase.red,
        red_routes: routes.filter((route) => route.verdict === "RED").map((route) => route.route),
      })}\n`,
    );
    invariant(green === entries.length, "R551_ROUTE_MANIFEST_RED");
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
