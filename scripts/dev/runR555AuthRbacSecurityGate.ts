import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";
import { chromium, type Browser, type Page } from "playwright";

type Json = Record<string, any>;
type Session = { access_token: string; refresh_token: string; user?: Json };

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const WEB_ORIGIN = "http://localhost:8081";
const PROVIDER = "http://127.0.0.1:54321";
const BROKER = "http://127.0.0.1:54329";
const BACKEND = "http://127.0.0.1:8765";
const DB_CONTAINER = "supabase_db_rik-r52-a7-provider-20260824";
const MODEL_DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const LOCAL_CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const SECURITY_CREDENTIALS = resolve(
  ".release-runtime/r541/runtime/real-auth/credentials.json",
);
const SEED_MANIFEST = resolve(
  ".release-runtime/r555/evidence/22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json",
);
const CONTROL_COMPILE = resolve(
  ".release-runtime/r555/evidence/21D_R555_FULL_CUMULATIVE_CONTROL_COMPILE_GATE.json",
);
const PRINCIPAL_RECEIPT = resolve(
  ".release-runtime/r555/evidence/23D_R555_LOCAL_DEVELOPER_PRINCIPALS.json",
);
const ROLE_RECEIPT = resolve(
  ".release-runtime/r555/evidence/23A_R555_LOCAL_DEVELOPER_ROLE_MATRIX.json",
);
const ROUTE_RECEIPT = resolve(
  ".release-runtime/r555/evidence/23B_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST.json",
);
const OUTPUT = resolve(
  ".release-runtime/r555/evidence/23E_R555_AUTH_RBAC_SECURITY_MATRIX.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_AUTH_RBAC_SECURITY:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function endpointOnly(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function runProviderSql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  ).trim();
}

async function brokerSession(role: string): Promise<Session> {
  const response = await fetch(`${BROKER}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: WEB_ORIGIN },
    body: JSON.stringify({ role }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json()) as Json;
  invariant(response.status === 200, `BROKER_${role}_${response.status}`);
  invariant(body.role === role && body.access_token && body.refresh_token, `BROKER_${role}_BODY`);
  return body as Session;
}

async function securitySession(credentials: Json, label: string): Promise<Session> {
  const principal = credentials.principals.find((entry: Json) => entry.label === label);
  invariant(principal, `SECURITY_PRINCIPAL_${label}_MISSING`);
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: credentials.publishable_key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json()) as Json;
  invariant(response.status === 200 && body.access_token && body.refresh_token, `SECURITY_LOGIN_${label}_${response.status}`);
  return body as Session;
}

async function backendRequest(params: {
  path: string;
  token?: string | null;
  method?: "GET" | "POST";
  body?: Json;
}): Promise<Json> {
  const response = await fetch(`${BACKEND}${params.path}`, {
    method: params.method ?? "GET",
    headers: {
      ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
      ...(params.body ? { "Content-Type": "application/json" } : {}),
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json().catch(() => ({}))) as Json;
  return {
    status: response.status,
    code: body.error?.code ?? body.code ?? null,
    request_id: body.requestId ?? response.headers.get("x-request-id") ?? null,
    has_revision: Boolean(body.revision),
    has_job_id: Boolean(body.jobId),
  };
}

async function injectSession(page: Page, session: Session): Promise<void> {
  await page.goto(`${WEB_ORIGIN}/auth/login`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.evaluate(
    ({ value }) => {
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith("sb-")) window.localStorage.removeItem(key);
      }
      window.localStorage.setItem("sb-127-auth-token", JSON.stringify(value));
    },
    { value: session },
  );
}

async function signInLocalRoleThroughUi(page: Page, role: string): Promise<void> {
  await page.goto(`${WEB_ORIGIN}/request`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 120_000 });
  await page.getByTestId("auth.login.screen").waitFor({ timeout: 60_000 });
  await page.getByTestId("local-developer-role-toggle").click();
  await page.getByTestId(`local-developer-role-${role}`).click();
  await page.waitForFunction(
    ({ expectedRole }) => {
      const raw = window.localStorage.getItem("sb-127-auth-token");
      if (!raw) return false;
      try {
        return JSON.parse(raw)?.user?.app_metadata?.role === expectedRole;
      } catch {
        return false;
      }
    },
    { expectedRole: role },
    { timeout: 120_000 },
  );
  await page.waitForURL((url) => url.pathname === "/request", { timeout: 120_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
  await page.waitForTimeout(1_000);
}

async function ordinaryRoleNegativeMatrix(browser: Browser): Promise<Json> {
  const originalDefinition = runProviderSql(
    "select pg_get_functiondef('public.developer_override_context_v1()'::regprocedure);",
  );
  invariant(originalDefinition.includes("developer_override_context_v1"), "DEVELOPER_OVERRIDE_SOURCE_MISSING");
  const beforeHash = sha256(originalDefinition);
  const cases = [
    { actorRole: "buyer", forbiddenRole: "accountant", route: "/office/accountant" },
    { actorRole: "foreman", forbiddenRole: "director", route: "/office/director" },
    { actorRole: "contractor", forbiddenRole: "warehouse", route: "/office/warehouse" },
  ];
  const results: Json[] = [];
  let restored = false;
  try {
    runProviderSql(String.raw`
create or replace function public.developer_override_context_v1()
returns jsonb
language sql
stable
security definer
set search_path=public,pg_temp
as $function$
  select jsonb_build_object(
    'actorUserId',auth.uid()::text,
    'actorRole',null,
    'entitlement',null,
    'authorizationSource','none',
    'isEnabled',false,
    'isActive',false,
    'allowedRoles','[]'::jsonb,
    'activeEffectiveRole',null,
    'canAccessAllOfficeRoutes',false,
    'canImpersonateForMutations',false,
    'expiresAt',null,
    'reason','ordinary_role_negative_profile'
  )
$function$;
`);
    for (const entry of cases) {
      process.stdout.write(`[r555-security] browser deny ${entry.actorRole}->${entry.forbiddenRole}\n`);
      const context = await browser.newContext();
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const productionRequests: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text().slice(0, 300));
      });
      page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));
      page.on("request", (request) => {
        if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
          productionRequests.push(new URL(request.url()).origin);
        }
      });
      try {
        await signInLocalRoleThroughUi(page, entry.actorRole);
        await page.goto(`${WEB_ORIGIN}${entry.route}`, {
          waitUntil: "domcontentloaded",
          timeout: 120_000,
        });
        let gateSettled = true;
        try {
          await page
            .locator(
              '[data-testid="office-role-guard-blocked"], [data-testid="office-role-auth-unauthenticated"], [data-testid="office-role-auth-degraded"], [data-testid^="office-role-auth-context-"]',
            )
            .first()
            .waitFor({ timeout: 20_000 });
        } catch {
          gateSettled = false;
        }
        const visibleGateTestIds = await page.locator("[data-testid]").evaluateAll((nodes) =>
          nodes
            .map((node) => node.getAttribute("data-testid"))
            .filter((value): value is string => Boolean(value?.startsWith("office-role-"))),
        );
        const accessDeniedVisible = visibleGateTestIds.includes("office-role-guard-blocked");
        const exposedForbiddenShell =
          await page.getByTestId(`office-role-auth-context-${entry.forbiddenRole}`).count();
        results.push({
          ...entry,
          final_path: new URL(page.url()).pathname,
          gate_settled: gateSettled,
          access_denied_visible: accessDeniedVisible,
          visible_gate_test_ids: visibleGateTestIds,
          visible_text_sample: gateSettled
            ? null
            : (await page.locator("body").innerText()).replace(/\s+/gu, " ").slice(0, 500),
          forbidden_shell_visible: exposedForbiddenShell > 0,
          console_errors: consoleErrors.length,
          console_error_samples: consoleErrors.slice(0, 3),
          page_errors: pageErrors.length,
          production_requests: productionRequests.length,
          verdict:
            accessDeniedVisible &&
            exposedForbiddenShell === 0 &&
            consoleErrors.length === 0 &&
            pageErrors.length === 0 &&
            productionRequests.length === 0
              ? "GREEN"
              : "RED",
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    runProviderSql(`${originalDefinition}\n`);
    restored = true;
  }
  const afterDefinition = runProviderSql(
    "select pg_get_functiondef('public.developer_override_context_v1()'::regprocedure);",
  );
  return {
    denominator: cases.length,
    green: results.filter((entry) => entry.verdict === "GREEN").length,
    cases: results,
    ordinary_profile_was_temporary: true,
    developer_override_restored: restored && sha256(afterDefinition) === beforeHash,
    developer_override_definition_sha256: beforeHash,
  };
}

async function browserConsumerLifecycle(browser: Browser): Promise<Json> {
  const context = await browser.newContext();
  const authEvents: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: Json[] = [];
  const logoutResponses: number[] = [];
  const productionRequests: string[] = [];
  let lifecycleStage = "bootstrap";
  const attach = (page: Page) => {
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error") consoleErrors.push(text.slice(0, 300));
      const event = text.match(/onAuthStateChange:\s*([A-Z_]+)/u)?.[1];
      if (event) authEvents.push(event);
    });
    page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 300)));
    page.on("requestfailed", (request) =>
      requestFailures.push({
        stage: lifecycleStage,
        endpoint: endpointOnly(request.url()),
        error: request.failure()?.errorText ?? "unknown",
      }),
    );
    page.on("response", (response) => {
      if (endpointOnly(response.url()) === `${PROVIDER}/auth/v1/logout`) {
        logoutResponses.push(response.status());
      }
    });
    page.on("request", (request) => {
      if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
        productionRequests.push(new URL(request.url()).origin);
      }
    });
  };
  try {
    let page = await context.newPage();
    attach(page);
    lifecycleStage = "initial_login";
    await page.goto(`${WEB_ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("auth.login.screen").waitFor({ timeout: 120_000 });
    await page.getByTestId("auth.login.local-consumer").click();
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
    const initialRole = await page.evaluate(() => {
      const raw = window.localStorage.getItem("sb-127-auth-token");
      try {
        return raw ? JSON.parse(raw)?.user?.app_metadata?.role ?? null : null;
      } catch {
        return null;
      }
    });
    await page.close();

    page = await context.newPage();
    attach(page);
    lifecycleStage = "cold_restart";
    await page.goto(`${WEB_ORIGIN}/request?cold=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
    const coldRestartGreen = new URL(page.url()).pathname === "/request";

    lifecycleStage = "profile_logout";
    await page.goto(`${WEB_ORIGIN}/profile`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("profile.logout.button").waitFor({ timeout: 120_000 });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("profile.logout.button").click();
    await page.getByTestId("auth.login.screen").waitFor({ timeout: 120_000 });
    const signedOut = new URL(page.url()).pathname === "/auth/login";
    await page.close();
    page = await context.newPage();
    attach(page);
    lifecycleStage = "relogin";
    await page.goto(`${WEB_ORIGIN}/request?relogin=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    });
    await page.getByTestId("auth.login.screen").waitFor({ timeout: 120_000 });
    await page.getByTestId("auth.login.local-consumer").click();
    await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
    const reloginGreen = new URL(page.url()).pathname === "/request";
    const bodyText = await page.locator("body").innerText();
    const explainedLogoutAborts = requestFailures.filter(
      (failure) =>
        failure.stage === "profile_logout" &&
        failure.endpoint === `${PROVIDER}/auth/v1/logout` &&
        failure.error === "net::ERR_ABORTED" &&
        logoutResponses.includes(204),
    ).length;
    const unexpectedRequestFailures = requestFailures.length - explainedLogoutAborts;
    return {
      initial_provider_role: initialRole,
      cold_restart: coldRestartGreen ? "GREEN" : "RED",
      logout: signedOut ? "GREEN" : "RED",
      relogin: reloginGreen ? "GREEN" : "RED",
      auth_events: authEvents,
      token_refreshed_events: authEvents.filter((event) => event === "TOKEN_REFRESHED").length,
      console_errors: consoleErrors.length,
      page_errors: pageErrors.length,
      request_failures: requestFailures.length,
      request_failure_samples: requestFailures.slice(0, 5),
      logout_response_statuses: logoutResponses,
      explained_logout_navigation_aborts: explainedLogoutAborts,
      unexpected_request_failures: unexpectedRequestFailures,
      production_requests: productionRequests.length,
      object_object_visible: bodyText.includes("[object Object]"),
      verdict:
        initialRole === "consumer" &&
        coldRestartGreen &&
        signedOut &&
        reloginGreen &&
        consoleErrors.length === 0 &&
        pageErrors.length === 0 &&
        unexpectedRequestFailures === 0 &&
        productionRequests.length === 0 &&
        !bodyText.includes("[object Object]")
          ? "GREEN"
          : "RED",
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const localCredentials = JSON.parse(readFileSync(LOCAL_CREDENTIALS, "utf8")) as Json;
  const securityCredentials = JSON.parse(readFileSync(SECURITY_CREDENTIALS, "utf8")) as Json;
  const seed = JSON.parse(readFileSync(SEED_MANIFEST, "utf8")) as Json;
  const control = JSON.parse(readFileSync(CONTROL_COMPILE, "utf8")) as Json;
  const principalReceipt = JSON.parse(readFileSync(PRINCIPAL_RECEIPT, "utf8")) as Json;
  const roleReceipt = JSON.parse(readFileSync(ROLE_RECEIPT, "utf8")) as Json;
  const routeReceipt = JSON.parse(readFileSync(ROUTE_RECEIPT, "utf8")) as Json;
  invariant(principalReceipt.status === "GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER", "PRINCIPALS_NOT_GREEN");
  invariant(roleReceipt.status === "GREEN_R555_LOCAL_DEVELOPER_ROLE_MATRIX_9_OF_9", "ROLES_NOT_GREEN");
  invariant(routeReceipt.status === "GREEN_R555_LOCAL_DEVELOPER_ROUTE_MANIFEST", "ROUTES_NOT_GREEN");
  invariant(roleReceipt.green === 9 && routeReceipt.green === 23, "UPSTREAM_DENOMINATOR_RED");

  const catalog = seed.gate_a.cases[0] as Json;
  const revisionId = String(control.cases[0].revision_id);
  invariant(catalog?.catalogId && revisionId, "SECURITY_FIXTURE_MISSING");
  const requestPrefix = `r555-security-${Date.now()}`;
  const compileBody = {
    catalogId: catalog.catalogId,
    sourceRequestText: catalog.titleRu,
    primaryMeasureParameterId: catalog.primaryMeasureParameterId,
    parameters: {},
    currencyCode: "KGS",
  };

  const oldSessions: Record<string, Session> = {};
  for (const label of ["ordinary_user", "cross_tenant", "revoked"] as const) {
    oldSessions[label] = await securitySession(securityCredentials, label);
  }
  const consumer = await brokerSession("consumer");

  const denialCases: Json[] = [];
  for (const [label, token] of [
    ["missing", null],
    ["malformed", "not-a-jwt"],
    ["ordinary_no_capability", oldSessions.ordinary_user.access_token],
    ["cross_tenant_no_capability", oldSessions.cross_tenant.access_token],
    ["revoked_role_no_capability", oldSessions.revoked.access_token],
  ] as const) {
    const result = await backendRequest({
      path: "/jobs/compile",
      token,
      method: "POST",
      body: { ...compileBody, idempotencyKey: `${requestPrefix}-${label}` },
    });
    const expected = label === "missing" || label === "malformed" ? 401 : 403;
    denialCases.push({
      case_id: label,
      ...result,
      expected_status: expected,
      verdict: result.status === expected && !result.has_job_id ? "GREEN" : "RED",
    });
  }

  const sameTenantRead = await backendRequest({
    path: `/revisions/${revisionId}/parameter-session`,
    token: consumer.access_token,
  });
  const crossTenantRead = await backendRequest({
    path: `/revisions/${revisionId}/parameter-session`,
    token: oldSessions.cross_tenant.access_token,
  });

  const revokedPrincipal = securityCredentials.principals.find((entry: Json) => entry.label === "revoked");
  const crossPrincipal = securityCredentials.principals.find((entry: Json) => entry.label === "cross_tenant");
  invariant(revokedPrincipal && crossPrincipal, "MUTATION_PRINCIPALS_MISSING");
  let revokedRestored = false;
  let staleRoleRestored = false;
  let revokedRead: Json = {};
  let restoredRevokedRead: Json = {};
  let staleRoleRead: Json = {};
  let restoredCrossRead: Json = {};
  try {
    const revokedUpdate = runProviderSql(
      `update public.r541_security_membership set active=false where id='${revokedPrincipal.membership_id}'::uuid and user_id='${revokedPrincipal.user_id}'::uuid and active returning id;`,
    );
    invariant(
      revokedUpdate.split(/\r?\n/).includes(revokedPrincipal.membership_id),
      "REVOKED_DEACTIVATE_RED",
    );
    revokedRead = await backendRequest({
      path: `/revisions/${revisionId}/parameter-session`,
      token: oldSessions.revoked.access_token,
    });
  } finally {
    runProviderSql(
      `update public.r541_security_membership set active=true where id='${revokedPrincipal.membership_id}'::uuid and user_id='${revokedPrincipal.user_id}'::uuid;`,
    );
    revokedRestored = true;
  }
  restoredRevokedRead = await backendRequest({
    path: `/revisions/${revisionId}/parameter-session`,
    token: oldSessions.revoked.access_token,
  });

  try {
    const staleUpdate = runProviderSql(
      `update public.r541_security_membership set role='engineer' where id='${crossPrincipal.membership_id}'::uuid and user_id='${crossPrincipal.user_id}'::uuid and role='cross_tenant' returning id;`,
    );
    invariant(
      staleUpdate.split(/\r?\n/).includes(crossPrincipal.membership_id),
      "STALE_ROLE_MUTATION_RED",
    );
    staleRoleRead = await backendRequest({
      path: `/revisions/${revisionId}/parameter-session`,
      token: oldSessions.cross_tenant.access_token,
    });
  } finally {
    runProviderSql(
      `update public.r541_security_membership set role='cross_tenant' where id='${crossPrincipal.membership_id}'::uuid and user_id='${crossPrincipal.user_id}'::uuid;`,
    );
    staleRoleRestored = true;
  }
  restoredCrossRead = await backendRequest({
    path: `/revisions/${revisionId}/parameter-session`,
    token: oldSessions.cross_tenant.access_token,
  });

  const browser = await chromium.launch({ headless: true });
  let ordinaryNegative: Json;
  let consumerLifecycle: Json;
  try {
    ordinaryNegative = await ordinaryRoleNegativeMatrix(browser);
    consumerLifecycle = await browserConsumerLifecycle(browser);
  } finally {
    await browser.close();
  }

  const model = new Client({ connectionString: MODEL_DATABASE_URL });
  await model.connect();
  const deniedJobRows = Number(
    (
      await model.query(
        "select count(*)::integer count from public.estimate_compile_job where idempotency_key like $1",
        [`${requestPrefix}-%`],
      )
    ).rows[0]?.count ?? 0,
  );
  await model.end();

  const checks = {
    upstream_principals_10_of_10: principalReceipt.green === 10,
    upstream_roles_9_of_9: roleReceipt.green === 9,
    upstream_routes_23_of_23: routeReceipt.green === 23,
    denial_matrix_5_of_5: denialCases.every((entry) => entry.verdict === "GREEN"),
    denied_compile_created_jobs_0: deniedJobRows === 0,
    same_tenant_revision_allowed: sameTenantRead.status === 200 && sameTenantRead.has_revision,
    cross_tenant_revision_hidden: crossTenantRead.status === 404 && !crossTenantRead.has_revision,
    revoked_membership_denied: revokedRead.status === 403 && revokedRead.code === "AUTH_FORBIDDEN",
    revoked_membership_restored: revokedRestored && restoredRevokedRead.status === 404,
    stale_role_denied: staleRoleRead.status === 403 && staleRoleRead.code === "AUTH_FORBIDDEN",
    stale_role_restored: staleRoleRestored && restoredCrossRead.status === 404,
    ordinary_role_negative_3_of_3:
      ordinaryNegative.green === ordinaryNegative.denominator &&
      ordinaryNegative.developer_override_restored === true,
    consumer_logout_relogin_cold_restart: consumerLifecycle.verdict === "GREEN",
    normal_ttl_seconds_3600:
      execFileSync(
        "docker",
        ["inspect", "--format", "{{range .Config.Env}}{{println .}}{{end}}", "supabase_auth_rik-r52-a7-provider-20260824"],
        { encoding: "utf8" },
      )
        .split(/\r?\n/u)
        .includes("GOTRUE_JWT_EXP=3600"),
  };
  const green = Object.values(checks).every(Boolean);
  const receiptBase = {
    schema_version: "rik-expo-app-r555.auth-rbac-security-matrix.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: green
      ? "GREEN_R555_AUTH_RBAC_SECURITY_MATRIX"
      : "RED_R555_AUTH_RBAC_SECURITY_MATRIX",
    upstream_evidence: {
      principals_sha256: sha256(readFileSync(PRINCIPAL_RECEIPT)),
      roles_sha256: sha256(readFileSync(ROLE_RECEIPT)),
      routes_sha256: sha256(readFileSync(ROUTE_RECEIPT)),
    },
    denial_cases: denialCases,
    denied_compile_job_rows: deniedJobRows,
    tenant_isolation: {
      same_tenant: sameTenantRead,
      cross_tenant: crossTenantRead,
      revision_id_sha256: sha256(revisionId),
    },
    revoked_membership: {
      denied: revokedRead,
      restored_read: restoredRevokedRead,
      restored: revokedRestored,
    },
    stale_role: {
      denied: staleRoleRead,
      restored_read: restoredCrossRead,
      restored: staleRoleRestored,
    },
    ordinary_role_negative_matrix: ordinaryNegative,
    consumer_lifecycle: consumerLifecycle,
    checks,
    secrets: {
      raw_access_token_persisted: false,
      raw_refresh_token_persisted: false,
      password_persisted: false,
      service_key_in_browser: false,
    },
    scope: {
      local_only: true,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    },
  };
  atomicJson(OUTPUT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(
    `${JSON.stringify({
      status: receiptBase.status,
      denial_green: denialCases.filter((entry) => entry.verdict === "GREEN").length,
      denial_denominator: denialCases.length,
      ordinary_negative_green: ordinaryNegative.green,
      ordinary_negative_denominator: ordinaryNegative.denominator,
      consumer_lifecycle: consumerLifecycle.verdict,
      denied_jobs: deniedJobRows,
    })}\n`,
  );
  invariant(green, "TERMINAL_RED");
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
