import { createHash } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page } from "playwright";

import {
  LOCAL_DEVELOPER_REVIEW_ROLES,
  type LocalDeveloperReviewRole,
} from "../../src/lib/localDeveloperReviewRoles";

const MASTER_SHA256 =
  process.env.R4_A8_MASTER_SHA256 ??
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const ORIGIN = process.env.R555_WEB_ORIGIN ?? "http://localhost:8081";
const OUTPUT = resolve(
  process.env.R4_A8_DEVELOPER_ROLE_MATRIX_OUTPUT ??
    ".release-runtime/r555/evidence/23A_R555_LOCAL_DEVELOPER_ROLE_MATRIX.json",
);
const ROLE_LABELS: Record<LocalDeveloperReviewRole, string> = {
  foreman: "Прораб",
  director: "Директор",
  buyer: "Закупщик",
  accountant: "Бухгалтер",
  warehouse: "Склад",
  contractor: "Подрядчик",
  security: "Охрана",
  estimator: "Сметчик",
  engineer: "Инженер",
};
const ROLE_ROUTES: Partial<
  Record<LocalDeveloperReviewRole, { route: string; shellTestId?: string }>
> = {
  foreman: { route: "/office/foreman", shellTestId: "office-role-auth-context-foreman" },
  director: { route: "/office/director", shellTestId: "office-role-auth-context-director" },
  buyer: { route: "/office/buyer", shellTestId: "office-role-auth-context-buyer" },
  accountant: { route: "/office/accountant", shellTestId: "office-role-auth-context-accountant" },
  warehouse: { route: "/office/warehouse", shellTestId: "office-role-auth-context-warehouse" },
  contractor: { route: "/office/contractor", shellTestId: "office-role-auth-context-contractor" },
  security: { route: "/office/security", shellTestId: "office-role-auth-context-security" },
  estimator: { route: "/request" },
  engineer: { route: "/office" },
};

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

async function signInAs(page: Page, role: LocalDeveloperReviewRole) {
  await page.goto(`${ORIGIN}/request`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
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
  invariant(actorBefore.userId, "R551_OWNER_ACTOR_ID_MISSING");
  await page.getByTestId("local-developer-role-toggle").click();
  const serverRoleResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith(
        "/rest/v1/rpc/developer_set_effective_role_v1",
      ) && response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await page.getByTestId(`local-developer-role-${role}`).click();
  const roleResponse = await serverRoleResponse;
  invariant(roleResponse.ok(), `R551_EFFECTIVE_ROLE_RPC_RED_${role}`);
  const serverContext = (await roleResponse.json()) as Record<string, unknown>;
  await page.getByTestId("local-developer-active-role").waitFor({
    state: "visible",
    timeout: 120_000,
  });
  await page.waitForFunction(
    ({ expectedLabel }) =>
      document.querySelector(
        '[data-testid="local-developer-active-role"]',
      )?.textContent?.trim() === expectedLabel,
    { expectedLabel: ROLE_LABELS[role] },
    { timeout: 120_000 },
  );
  await page.waitForURL((url) => url.pathname === "/request", { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
  await page.waitForTimeout(1_000);
  return { actorBefore, serverContext };
}

async function verifyRole(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  role: LocalDeveloperReviewRole,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const productionRequests: string[] = [];
  const httpErrors: Array<{ status: number; endpoint: string }> = [];
  const multipleClientWarnings: string[] = [];
  const authEvents: string[] = [];
  page.on("console", (message) => {
    const messageText = message.text();
    if (message.type() === "error") consoleErrors.push(messageText.slice(0, 500));
    const authEvent = messageText.match(/onAuthStateChange:\s*([A-Z_]+)/u)?.[1];
    if (authEvent) authEvents.push(authEvent);
    if (/Multiple GoTrueClient instances/iu.test(messageText)) {
      multipleClientWarnings.push(messageText.slice(0, 500));
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 500)));
  page.on("request", (request) => {
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
      productionRequests.push(new URL(request.url()).origin);
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const parsed = new URL(response.url());
    httpErrors.push({
      status: response.status(),
      endpoint: `${parsed.origin}${parsed.pathname}`,
    });
  });

  try {
    const roleSwitch = await signInAs(page, role);
    const target = ROLE_ROUTES[role];
    invariant(target, `R551_ROLE_ROUTE_MISSING_${role}`);
    if (target.route !== "/request") {
      await page.goto(`${ORIGIN}${target.route}`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      });
      if (target.shellTestId) {
        await page.getByTestId(target.shellTestId).waitFor({ timeout: 120_000 });
      } else {
        await page.waitForTimeout(2_000);
      }
    }
    await page.waitForTimeout(500);

    const state = await page.evaluate(() => {
      const storageKey = "sb-127-auth-token";
      const raw = window.localStorage.getItem(storageKey);
      let session: Record<string, any> | null = null;
      try {
        session = raw ? JSON.parse(raw) : null;
      } catch {
        session = null;
      }
      const metadata = session?.user?.app_metadata ?? {};
      return {
        pathname: window.location.pathname,
        storageKeyPresent: Boolean(raw),
        userId: typeof session?.user?.id === "string" ? session.user.id : null,
        role: typeof metadata.role === "string" ? metadata.role : null,
        tenantId: typeof metadata.tenant_id === "string" ? metadata.tenant_id : null,
        membershipId:
          typeof metadata.membership_id === "string" ? metadata.membership_id : null,
        protectedFailure: Boolean(
          document.querySelector('[data-testid^="protected-identity-state-"]'),
        ),
        redOverlay: Boolean(
          document.querySelector('[data-testid="redbox"]') ||
            document.querySelector('[data-testid="error-overlay"]'),
        ),
        objectObject: document.body.innerText.includes("[object Object]"),
      };
    });

    const serverAllowedRoles = Array.isArray(roleSwitch.serverContext.allowedRoles)
      ? roleSwitch.serverContext.allowedRoles.map(String)
      : [];
    const serverEntitlementGreen =
      roleSwitch.serverContext.actorUserId === roleSwitch.actorBefore.userId &&
      roleSwitch.serverContext.actorRole === "platform_developer" &&
      roleSwitch.serverContext.entitlement === "platform_developer" &&
      roleSwitch.serverContext.authorizationSource === "server_entitlement" &&
      roleSwitch.serverContext.isEnabled === true &&
      roleSwitch.serverContext.isActive === true &&
      roleSwitch.serverContext.activeEffectiveRole === role &&
      roleSwitch.serverContext.canAccessAllOfficeRoutes === true &&
      roleSwitch.serverContext.canImpersonateForMutations === true &&
      LOCAL_DEVELOPER_REVIEW_ROLES.every((allowedRole) =>
        serverAllowedRoles.includes(allowedRole),
      );
    const providerActorStable =
      state.userId === roleSwitch.actorBefore.userId &&
      state.role === roleSwitch.actorBefore.providerRole;
    const green =
      state.pathname === target.route &&
      state.storageKeyPresent &&
      providerActorStable &&
      serverEntitlementGreen &&
      Boolean(state.userId && state.tenantId && state.membershipId) &&
      !state.protectedFailure &&
      !state.redOverlay &&
      !state.objectObject &&
      consoleErrors.length === 0 &&
      pageErrors.length === 0 &&
      productionRequests.length === 0 &&
      multipleClientWarnings.length === 0;
    return {
      role,
      label_ru: ROLE_LABELS[role],
      route: target.route,
      final_path: state.pathname,
      provider_session: state.storageKeyPresent,
      provider_user_id_sha256: state.userId ? sha256(state.userId) : null,
      provider_actor_stable: providerActorStable,
      provider_role_unchanged: state.role === roleSwitch.actorBefore.providerRole,
      provider_role: state.role,
      tenant_metadata_present: Boolean(state.tenantId),
      membership_metadata_present: Boolean(state.membershipId),
      server_entitlement: roleSwitch.serverContext.entitlement ?? null,
      server_authorization_source:
        roleSwitch.serverContext.authorizationSource ?? null,
      server_effective_role:
        roleSwitch.serverContext.activeEffectiveRole ?? null,
      server_effective_role_matches:
        roleSwitch.serverContext.activeEffectiveRole === role,
      server_allowed_roles: serverAllowedRoles.length,
      server_entitlement_green: serverEntitlementGreen,
      console_errors: consoleErrors.length,
      console_error_messages: consoleErrors,
      page_errors: pageErrors.length,
      page_error_messages: pageErrors,
      production_requests: productionRequests.length,
      http_errors: httpErrors,
      multiple_gotrue_client_warnings: multipleClientWarnings.length,
      auth_events: authEvents,
      token_refreshed_events: authEvents.filter((event) => event === "TOKEN_REFRESHED").length,
      protected_failure: state.protectedFailure,
      red_overlay: state.redOverlay,
      object_object: state.objectObject,
      verdict: green ? "GREEN" : "RED",
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const requestedRole = String(process.argv[2] ?? "").trim().toLowerCase();
  const roles = requestedRole
    ? LOCAL_DEVELOPER_REVIEW_ROLES.filter((role) => role === requestedRole)
    : [...LOCAL_DEVELOPER_REVIEW_ROLES];
  invariant(roles.length > 0, "R551_ROLE_MATRIX_FILTER_RED");
  const browser = await chromium.launch({ headless: true });
  try {
    const cases = [];
    for (const role of roles) {
      cases.push(await verifyRole(browser, role));
    }
    const green = cases.filter((entry) => entry.verdict === "GREEN").length;
    const receiptBase = {
      schema_version: "rik-expo-app-r555.local-developer-role-matrix.v1",
      generated_utc: new Date().toISOString(),
      master_sha256: MASTER_SHA256,
      status:
        green === roles.length
          ? requestedRole
            ? `GREEN_R555_LOCAL_DEVELOPER_ROLE_${requestedRole.toUpperCase()}`
            : "GREEN_R555_LOCAL_DEVELOPER_ROLE_MATRIX_9_OF_9"
          : "RED_R555_LOCAL_DEVELOPER_ROLE_MATRIX",
      denominator: roles.length,
      green,
      red: roles.length - green,
      real_provider_sessions: true,
      actor_identity_must_remain_stable: true,
      presentation_role_must_not_replace_provider_role: true,
      storage_values_captured: false,
      credentials_captured: false,
      cases,
      scope: {
        production_accessed: false,
        deployed: false,
        released: false,
        merged: false,
        ota: false,
      },
    };
    const output = requestedRole
      ? resolve(`.release-runtime/r555/runtime/local-developer/role-probe-${requestedRole}.json`)
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
        red_roles: cases.filter((entry) => entry.verdict === "RED").map((entry) => entry.role),
      })}\n`,
    );
    invariant(green === roles.length, "R551_ROLE_MATRIX_RED");
  } finally {
    await browser.close();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
