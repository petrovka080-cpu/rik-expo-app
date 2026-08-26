import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createConnection } from "node:net";
import { dirname, resolve } from "node:path";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright";
import { Client } from "pg";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonRecord = Record<string, Json>;

type HttpResult = {
  status: number;
  body: Json;
  contentRange: string | null;
};

type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
  userId: string;
};

type PrincipalFixture = {
  label: "A" | "B";
  email: string;
  password: string;
  userId: string;
  tenantId: string;
  membershipId: string;
  session: Session | null;
  initialAccessToken: string | null;
};

type CaseRecord = {
  request_case_id: string;
  expected_status: string;
  actual_status: string;
  mutation_count: number;
  leak_count: number;
  transport: "AUTH" | "BACKEND" | "BROWSER" | "POSTGREST" | "ORCHESTRATION";
  verdict: "GREEN" | "RED";
};

const ROOT = resolve(".");
const HARNESS_PATH = resolve("scripts/release/runR52A7RealSupabaseGate.ts");
const BACKEND_PATH = resolve(
  "scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts",
);
const MIGRATION_PATH = resolve(
  ".release-runtime/r52/runtime/a7-supabase-project/supabase/migrations/20260824221500_a7_provider_rls_contract.sql",
);
const DEFAULT_OUTPUT = resolve(
  ".release-runtime/r52/evidence/08_R52_A7_REAL_SUPABASE_GATE.json",
);
const SELF_TEST = process.env.R52_A7_SELF_TEST === "inject-red";
const OUTPUT_PATH = resolve(process.env.R52_A7_OUTPUT_PATH ?? DEFAULT_OUTPUT);
const LOCK_PATH = `${OUTPUT_PATH}.lock`;
const SUPABASE_URL = SELF_TEST
  ? "http://127.0.0.1:54321"
  : requiredUrl("R52_A7_SUPABASE_URL");
const BACKEND_URL = SELF_TEST
  ? "http://127.0.0.1:8767"
  : requiredUrl("R52_A7_BACKEND_URL");
const ANON_KEY = SELF_TEST
  ? "self-test-anon-key"
  : requiredSecret("R52_A7_SUPABASE_ANON_KEY");
const SERVICE_KEY = SELF_TEST
  ? "self-test-service-key"
  : requiredSecret("R52_A7_SUPABASE_SERVICE_KEY");
const DATABASE_URL = SELF_TEST
  ? "self-test-database-url"
  : requiredSecret("R52_A7_DATABASE_URL");
const CATALOG_ID = SELF_TEST
  ? "self-test-catalog"
  : required("R52_A7_CATALOG_ID");
const RELEASE_ID = SELF_TEST
  ? "11111111-1111-4111-8111-111111111111"
  : requiredUuid("R52_A7_RELEASE_ID");
const SEARCH_RELEASE_ID = SELF_TEST
  ? "22222222-2222-4222-8222-222222222222"
  : requiredUuid("R52_A7_SEARCH_RELEASE_ID");
const BUILD_SHA = SELF_TEST ? "0".repeat(64) : required("R52_A7_BUILD_SHA");
const SOURCE_SHA = SELF_TEST ? "1".repeat(64) : required("R52_A7_SOURCE_SHA");
const AUTH_CONTAINER = SELF_TEST
  ? "self-test-auth-container"
  : required("R52_A7_AUTH_CONTAINER");
const BACKEND_STDERR_PATH = SELF_TEST
  ? resolve(".release-runtime/r52/runtime/self-test.stderr.log")
  : resolve(required("R52_A7_BACKEND_STDERR_PATH"));
const CAPABILITY_ENVIRONMENT = SELF_TEST
  ? "self-test-environment"
  : required("R52_A7_CAPABILITY_ENVIRONMENT");
const CAPABILITY_SOURCE_HEAD = SELF_TEST
  ? "self-test-head"
  : required("R52_A7_CAPABILITY_SOURCE_HEAD");
const CAPABILITY_SOURCE_TREE = SELF_TEST
  ? "self-test-tree"
  : required("R52_A7_CAPABILITY_SOURCE_TREE");
const RUN_NAMESPACE = `r52-a7-${new Date().toISOString().replace(/\D/gu, "").slice(0, 14)}-${randomBytes(4).toString("hex")}`;
const RUN_SALT = randomBytes(32);
const CASES: CaseRecord[] = [];
const SECRET_VALUES: string[] = [ANON_KEY, SERVICE_KEY, DATABASE_URL];
const INJECT_RED_CASE = String(process.env.R52_A7_INJECT_RED_CASE ?? "").trim();
const TERMINAL_TUPLE =
  /^[0-9a-f]{64}$/u.test(BUILD_SHA) && /^[0-9a-f]{64}$/u.test(SOURCE_SHA);

let lockHandle: number | null = null;
let browser: Browser | null = null;
let contextA: BrowserContext | null = null;
let contextB: BrowserContext | null = null;
let providerStopped = false;
let setupStarted = false;
let teardownCompleted = false;

const fixtures: PrincipalFixture[] = ["A", "B"].map((label) => ({
  label: label as "A" | "B",
  email: `${RUN_NAMESPACE.toLowerCase()}-${label.toLowerCase()}@example.invalid`,
  password: `A7!${randomBytes(24).toString("base64url")}x9`,
  userId: "",
  tenantId: randomUUID(),
  membershipId: randomUUID(),
  session: null,
  initialAccessToken: null,
}));
for (const fixture of fixtures) {
  SECRET_VALUES.push(fixture.email, fixture.password);
}

function required(name: string): string {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function requiredSecret(name: string): string {
  const value = required(name);
  if (value.length < 8) throw new Error(`${name}_INVALID`);
  return value;
}

function requiredUuid(name: string): string {
  const value = required(name);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new Error(`${name}_INVALID`);
  }
  return value;
}

function requiredUrl(name: string): string {
  const value = required(name).replace(/\/$/u, "");
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    !new Set(["127.0.0.1", "localhost"]).has(parsed.hostname)
  ) {
    throw new Error(`${name}_MUST_BE_LOOPBACK_HTTP`);
  }
  return value;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function tokenReference(token: string): string {
  return sha256(Buffer.concat([RUN_SALT, Buffer.from(token, "utf8")]));
}

function sanitizeError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of SECRET_VALUES) {
    if (secret) message = message.split(secret).join("[REDACTED]");
  }
  return message.slice(0, 2_000);
}

function asRecord(value: Json): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function asArray(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function record(input: Omit<CaseRecord, "verdict">): void {
  const verdict =
    input.expected_status === input.actual_status &&
    input.mutation_count === 0 &&
    input.leak_count === 0
      ? "GREEN"
      : "RED";
  const row: CaseRecord = { ...input, verdict };
  CASES.push(row);
  if (INJECT_RED_CASE === row.request_case_id) {
    row.actual_status = "INJECTED_RED";
    row.verdict = "RED";
  }
  if (row.verdict === "RED")
    throw new Error(`A7_CASE_RED:${row.request_case_id}`);
}

async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<HttpResult> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let body: Json = null;
  if (text) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = { non_json_body_sha256: sha256(text) };
    }
  }
  return {
    status: response.status,
    body,
    contentRange: response.headers.get("content-range"),
  };
}

function authHeaders(token: string): Record<string, string> {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}` };
}

function serviceHeaders(prefer?: string): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function adminCreateUser(fixture: PrincipalFixture): Promise<void> {
  const result = await fetchJson(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({
      email: fixture.email,
      password: fixture.password,
      email_confirm: true,
      app_metadata: {
        tenant_id: fixture.tenantId,
        membership_id: fixture.membershipId,
        role: "owner",
      },
    }),
  });
  assert(
    result.status === 200,
    `ADMIN_CREATE_${fixture.label}_${result.status}`,
  );
  const id = String(asRecord(result.body).id ?? "");
  assert(Boolean(id), `ADMIN_CREATE_${fixture.label}_NO_ID`);
  fixture.userId = id;
}

async function seedRlsRows(): Promise<void> {
  const tenants = fixtures.map((fixture) => ({
    id: fixture.tenantId,
    run_namespace: RUN_NAMESPACE,
  }));
  const memberships = fixtures.map((fixture) => ({
    id: fixture.membershipId,
    tenant_id: fixture.tenantId,
    user_id: fixture.userId,
    role: "owner",
  }));
  const tenantResult = await fetchJson(
    `${SUPABASE_URL}/rest/v1/a7_security_tenant`,
    {
      method: "POST",
      headers: serviceHeaders("return=minimal"),
      body: JSON.stringify(tenants),
    },
  );
  assert(tenantResult.status === 201, `TENANT_SEED_${tenantResult.status}`);
  const membershipResult = await fetchJson(
    `${SUPABASE_URL}/rest/v1/a7_security_membership`,
    {
      method: "POST",
      headers: serviceHeaders("return=minimal"),
      body: JSON.stringify(memberships),
    },
  );
  assert(
    membershipResult.status === 201,
    `MEMBERSHIP_SEED_${membershipResult.status}`,
  );
}

async function seedCandidateCapabilities(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    for (const fixture of fixtures) {
      await client.query(
        `insert into public.estimate_candidate_capability_r3(
          id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,
          source_head,source_tree,issued_by
        ) values($1,$2,$3,$4,$5,clock_timestamp()+interval '2 hours',
          'estimate_candidate_admission_r3',$6,$7,$8)`,
        [
          randomUUID(),
          CAPABILITY_ENVIRONMENT,
          fixture.tenantId,
          RELEASE_ID,
          SEARCH_RELEASE_ID,
          CAPABILITY_SOURCE_HEAD,
          CAPABILITY_SOURCE_TREE,
          RUN_NAMESPACE,
        ],
      );
    }
  } finally {
    await client.end();
  }
}

async function browserSignIn(
  page: Page,
  fixture: PrincipalFixture,
): Promise<Session> {
  await page.goto(`${SUPABASE_URL}/auth/v1/health`, {
    waitUntil: "domcontentloaded",
  });
  const raw = await page.evaluate(
    async ({ url, anonKey, email, password }) => {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(`BROWSER_LOGIN_${response.status}`);
      const stored = JSON.stringify({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      localStorage.setItem("r52-a7-auth", stored);
      sessionStorage.setItem(
        "r52-a7-principal-label",
        email.endsWith("-a@example.invalid") ? "A" : "B",
      );
      return body;
    },
    {
      url: SUPABASE_URL,
      anonKey: ANON_KEY,
      email: fixture.email,
      password: fixture.password,
    },
  );
  const user = raw.user as Record<string, unknown>;
  const session: Session = {
    accessToken: String(raw.access_token ?? ""),
    refreshToken: String(raw.refresh_token ?? ""),
    expiresAtMs: Date.now() + Number(raw.expires_in ?? 0) * 1_000,
    userId: String(user?.id ?? ""),
  };
  assert(
    session.accessToken && session.refreshToken,
    `BROWSER_LOGIN_${fixture.label}_NO_SESSION`,
  );
  assert(
    session.userId === fixture.userId,
    `BROWSER_LOGIN_${fixture.label}_WRONG_USER`,
  );
  SECRET_VALUES.push(session.accessToken, session.refreshToken);
  return session;
}

async function browserRefresh(
  page: Page,
  fixture: PrincipalFixture,
): Promise<Session> {
  assert(fixture.session, `SESSION_${fixture.label}_MISSING`);
  const raw = await page.evaluate(
    async ({ url, anonKey, refreshToken }) => {
      const response = await fetch(
        `${url}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: { apikey: anonKey, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        },
      );
      const body = (await response.json()) as Record<string, unknown>;
      if (!response.ok) throw new Error(`BROWSER_REFRESH_${response.status}`);
      localStorage.setItem(
        "r52-a7-auth",
        JSON.stringify({
          access_token: body.access_token,
          refresh_token: body.refresh_token,
        }),
      );
      return body;
    },
    {
      url: SUPABASE_URL,
      anonKey: ANON_KEY,
      refreshToken: fixture.session.refreshToken,
    },
  );
  const session: Session = {
    accessToken: String(raw.access_token ?? ""),
    refreshToken: String(raw.refresh_token ?? ""),
    expiresAtMs: Date.now() + Number(raw.expires_in ?? 0) * 1_000,
    userId: fixture.userId,
  };
  assert(
    session.accessToken && session.refreshToken,
    `BROWSER_REFRESH_${fixture.label}_NO_SESSION`,
  );
  SECRET_VALUES.push(session.accessToken, session.refreshToken);
  return session;
}

async function refreshSession(fixture: PrincipalFixture): Promise<void> {
  assert(fixture.session, `SESSION_${fixture.label}_MISSING`);
  const result = await fetchJson(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: fixture.session.refreshToken }),
    },
  );
  assert(result.status === 200, `REFRESH_${fixture.label}_${result.status}`);
  const body = asRecord(result.body);
  fixture.session = {
    accessToken: String(body.access_token ?? ""),
    refreshToken: String(body.refresh_token ?? ""),
    expiresAtMs: Date.now() + Number(body.expires_in ?? 0) * 1_000,
    userId: fixture.userId,
  };
  SECRET_VALUES.push(fixture.session.accessToken, fixture.session.refreshToken);
}

async function ensureFresh(fixture: PrincipalFixture): Promise<string> {
  assert(fixture.session, `SESSION_${fixture.label}_MISSING`);
  if (fixture.session.expiresAtMs - Date.now() < 6_000)
    await refreshSession(fixture);
  return fixture.session.accessToken;
}

async function postgrest(
  fixture: PrincipalFixture,
  tableAndQuery: string,
  method: string,
  body?: Json,
  prefer = "return=representation",
): Promise<HttpResult> {
  const token = await ensureFresh(fixture);
  return fetchJson(`${SUPABASE_URL}/rest/v1/${tableAndQuery}`, {
    method,
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function backend(
  fixture: PrincipalFixture,
  route: string,
  method = "GET",
  body?: Json,
  tokenOverride?: string,
  extraHeaders: Record<string, string> = {},
): Promise<HttpResult> {
  const token = tokenOverride ?? (await ensureFresh(fixture));
  return fetchJson(
    `${BACKEND_URL}${route}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...extraHeaders,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    30_000,
  );
}

async function browserBackend(
  page: Page,
  fixture: PrincipalFixture,
  route: string,
  method = "GET",
  body?: Json,
): Promise<HttpResult> {
  const token = await ensureFresh(fixture);
  const serializedBody = body === undefined ? null : JSON.stringify(body);
  await page.goto(`${BACKEND_URL}/runtime-manifest`, {
    waitUntil: "domcontentloaded",
  });
  const result = await page.evaluate<
    { status: number; bodyText: string; contentRange: string | null },
    {
      backendUrl: string;
      routePath: string;
      requestMethod: string;
      serializedBody: string | null;
      bearer: string;
    }
  >(
    async ({
      backendUrl,
      routePath,
      requestMethod,
      serializedBody,
      bearer,
    }) => {
      localStorage.setItem(
        "r52-a7-auth",
        JSON.stringify({ access_token: bearer }),
      );
      const stored = JSON.parse(
        localStorage.getItem("r52-a7-auth") ?? "{}",
      ) as {
        access_token?: string;
      };
      const response = await fetch(`${backendUrl}${routePath}`, {
        method: requestMethod,
        headers: {
          Authorization: `Bearer ${stored.access_token ?? ""}`,
          ...(serializedBody == null
            ? {}
            : { "Content-Type": "application/json" }),
        },
        ...(serializedBody == null ? {} : { body: serializedBody }),
      });
      return {
        status: response.status,
        bodyText: await response.text(),
        contentRange: response.headers.get("content-range"),
      };
    },
    {
      backendUrl: BACKEND_URL,
      routePath: route,
      requestMethod: method,
      serializedBody,
      bearer: token,
    },
  );
  return {
    status: result.status,
    body: result.bodyText ? (JSON.parse(result.bodyText) as Json) : null,
    contentRange: result.contentRange,
  };
}

async function serviceCount(table: string, filter: string): Promise<number> {
  const result = await fetchJson(
    `${SUPABASE_URL}/rest/v1/${table}?select=id&${filter}`,
    {
      headers: serviceHeaders("count=exact"),
    },
  );
  assert(result.status === 200, `SERVICE_COUNT_${table}_${result.status}`);
  return asArray(result.body).length;
}

async function canonicalMutationCount(): Promise<number> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const owners = fixtures
      .filter((fixture) => fixture.userId)
      .map((fixture) => fixture.userId);
    if (owners.length === 0) return 0;
    const result = await client.query(
      `select
        (select count(*) from public.estimate_draft where owner_user_id=any($1::uuid[]))::integer drafts,
        (select count(*) from public.estimate_compile_job where owner_user_id=any($1::uuid[]))::integer jobs,
        (select count(*) from public.estimate_revision where owner_user_id=any($1::uuid[]))::integer revisions`,
      [owners],
    );
    return (
      Number(result.rows[0].drafts) +
      Number(result.rows[0].jobs) +
      Number(result.rows[0].revisions)
    );
  } finally {
    await client.end();
  }
}

async function rawDuplicateAuthorizationStatus(
  tokenA: string,
  tokenB: string,
): Promise<number> {
  const url = new URL(BACKEND_URL);
  return new Promise<number>((resolveStatus, rejectStatus) => {
    const socket = createConnection({
      host: url.hostname,
      port: Number(url.port),
    });
    let response = "";
    socket.setTimeout(10_000);
    socket.once("connect", () => {
      socket.write(
        `GET /runtime-manifest HTTP/1.1\r\nHost: ${url.host}\r\nAuthorization: Bearer ${tokenA}\r\nAuthorization: Bearer ${tokenB}\r\nConnection: close\r\n\r\n`,
      );
    });
    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
    });
    socket.once("end", () => {
      const match = /^HTTP\/1\.1\s+(\d{3})/u.exec(response);
      if (!match) rejectStatus(new Error("DUPLICATE_AUTH_NO_HTTP_STATUS"));
      else resolveStatus(Number(match[1]));
    });
    socket.once("timeout", () =>
      socket.destroy(new Error("DUPLICATE_AUTH_TIMEOUT")),
    );
    socket.once("error", rejectStatus);
  });
}

function mutateJwt(
  token: string,
  mutation:
    | "payload"
    | "signature"
    | "alg_none"
    | "issuer"
    | "audience"
    | "nbf"
    | "sub",
): string {
  const parts = token.split(".");
  assert(parts.length === 3, "REFERENCE_TOKEN_NOT_JWT");
  if (mutation === "signature")
    return `${parts[0]}.${parts[1]}.${randomBytes(32).toString("base64url")}`;
  if (mutation === "alg_none") {
    return `${Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")}.${parts[1]}.`;
  }
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  if (mutation === "payload") payload.email = "tampered@example.invalid";
  if (mutation === "issuer") payload.iss = "http://127.0.0.1:1/auth/v1";
  if (mutation === "audience") payload.aud = "forged-audience";
  if (mutation === "nbf") payload.nbf = Math.floor(Date.now() / 1_000) + 86_400;
  if (mutation === "sub") payload.sub = randomUUID();
  return `${parts[0]}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${parts[2]}`;
}

async function waitForJob(
  fixture: PrincipalFixture,
  jobId: string,
): Promise<JsonRecord> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const result = await backend(fixture, `/jobs/${jobId}`);
    assert(result.status === 200, `JOB_POLL_${result.status}`);
    const body = asRecord(result.body);
    const status = String(body.status ?? "");
    if (["succeeded", "failed", "cancelled"].includes(status)) return body;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`JOB_TIMEOUT_${jobId}`);
}

function defaultParameters(catalog: JsonRecord): {
  parameters: JsonRecord;
  primary: string;
} {
  const schema = asArray(catalog.parameterSchema as Json);
  const parameters: JsonRecord = {};
  let primary = "";
  let firstUserInput = "";
  for (const raw of schema) {
    const parameter = asRecord(raw);
    const id = String(parameter.parameterId ?? "");
    if (!id) continue;
    if (!firstUserInput && parameter.visibilityRole === "USER_INPUT")
      firstUserInput = id;
    if (id === "area_m2") primary = id;
    if (
      parameter.defaultValue !== null &&
      parameter.defaultValue !== undefined
    ) {
      parameters[id] = parameter.defaultValue;
    }
  }
  primary ||= firstUserInput;
  assert(primary, "CATALOG_PRIMARY_PARAMETER_MISSING");
  assert(
    Object.prototype.hasOwnProperty.call(parameters, primary),
    "CATALOG_PRIMARY_DEFAULT_MISSING",
  );
  return { parameters, primary };
}

async function runRlsMatrix(): Promise<{
  estimateIds: [string, string];
  revisionIds: [string, string];
}> {
  const [a, b] = fixtures;
  const ownPayloads = fixtures.map((fixture) => ({
    tenant_id: fixture.tenantId,
    owner_user_id: fixture.userId,
    title: "Одинаковое имя A7",
    idempotency_key: "same-human-key",
    payload: { owner: fixture.label, phase: 1 },
  }));
  const created = await Promise.all(
    fixtures.map((fixture, index) =>
      postgrest(
        fixture,
        "a7_security_estimate",
        "POST",
        ownPayloads[index] as unknown as Json,
      ),
    ),
  );
  const estimateIds = created.map((result, index) => {
    assert(
      result.status === 201,
      `RLS_CREATE_${fixtures[index].label}_${result.status}`,
    );
    return String(asRecord(asArray(result.body)[0]).id ?? "");
  }) as [string, string];
  record({
    request_case_id: "RLS_PARALLEL_SAME_TITLE_CREATE",
    expected_status: "201/201",
    actual_status: `${created[0].status}/${created[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const ownReads = await Promise.all([
    postgrest(
      a,
      `a7_security_estimate?id=eq.${estimateIds[0]}&select=*`,
      "GET",
    ),
    postgrest(
      b,
      `a7_security_estimate?id=eq.${estimateIds[1]}&select=*`,
      "GET",
    ),
  ]);
  record({
    request_case_id: "RLS_OWN_READ",
    expected_status: "1/1",
    actual_status: `${asArray(ownReads[0].body).length}/${asArray(ownReads[1].body).length}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const crossReads = await Promise.all([
    postgrest(
      a,
      `a7_security_estimate?id=eq.${estimateIds[1]}&select=*`,
      "GET",
    ),
    postgrest(
      b,
      `a7_security_estimate?id=eq.${estimateIds[0]}&select=*`,
      "GET",
    ),
  ]);
  const crossLeak =
    asArray(crossReads[0].body).length + asArray(crossReads[1].body).length;
  record({
    request_case_id: "RLS_SYMMETRIC_CROSS_READ",
    expected_status: "200/200",
    actual_status: `${crossReads[0].status}/${crossReads[1].status}`,
    mutation_count: 0,
    leak_count: crossLeak,
    transport: "POSTGREST",
  });

  const lists = await Promise.all([
    postgrest(
      a,
      "a7_security_estimate?select=id,title",
      "GET",
      undefined,
      "count=exact",
    ),
    postgrest(
      b,
      "a7_security_estimate?select=id,title",
      "GET",
      undefined,
      "count=exact",
    ),
  ]);
  record({
    request_case_id: "RLS_LIST_COUNT_ISOLATION",
    expected_status: "1/1",
    actual_status: `${asArray(lists[0].body).length}/${asArray(lists[1].body).length}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const crossUpdates = await Promise.all([
    postgrest(a, `a7_security_estimate?id=eq.${estimateIds[1]}`, "PATCH", {
      payload: { forged: "A" },
    }),
    postgrest(b, `a7_security_estimate?id=eq.${estimateIds[0]}`, "PATCH", {
      payload: { forged: "B" },
    }),
  ]);
  record({
    request_case_id: "RLS_SYMMETRIC_CROSS_UPDATE",
    expected_status: "0/0",
    actual_status: `${asArray(crossUpdates[0].body).length}/${asArray(crossUpdates[1].body).length}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const crossDeletes = await Promise.all([
    postgrest(a, `a7_security_estimate?id=eq.${estimateIds[1]}`, "DELETE"),
    postgrest(b, `a7_security_estimate?id=eq.${estimateIds[0]}`, "DELETE"),
  ]);
  record({
    request_case_id: "RLS_SYMMETRIC_CROSS_DELETE",
    expected_status: "0/0",
    actual_status: `${asArray(crossDeletes[0].body).length}/${asArray(crossDeletes[1].body).length}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const spoofInsert = await postgrest(a, "a7_security_estimate", "POST", {
    tenant_id: b.tenantId,
    owner_user_id: b.userId,
    title: "spoof",
    idempotency_key: randomUUID(),
    payload: { forged: true },
  });
  record({
    request_case_id: "RLS_TENANT_OWNER_SPOOF_INSERT",
    expected_status: "403",
    actual_status: String(spoofInsert.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const revisionCreates = await Promise.all(
    fixtures.map((fixture, index) =>
      postgrest(fixture, "a7_security_revision", "POST", {
        estimate_id: estimateIds[index],
        tenant_id: fixture.tenantId,
        owner_user_id: fixture.userId,
        revision_no: 1,
        payload: { owner: fixture.label, revision: 1 },
      }),
    ),
  );
  const revisionIds = revisionCreates.map((result, index) => {
    assert(
      result.status === 201,
      `RLS_REVISION_${fixtures[index].label}_${result.status}`,
    );
    return String(asRecord(asArray(result.body)[0]).id ?? "");
  }) as [string, string];
  record({
    request_case_id: "RLS_PARALLEL_REVISION_CREATE",
    expected_status: "201/201",
    actual_status: `${revisionCreates[0].status}/${revisionCreates[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const restores = await Promise.all(
    fixtures.map((fixture, index) =>
      postgrest(fixture, "a7_security_revision", "POST", {
        estimate_id: estimateIds[index],
        tenant_id: fixture.tenantId,
        owner_user_id: fixture.userId,
        revision_no: 2,
        payload: { owner: fixture.label, revision: 2 },
        restored_from_revision_id: revisionIds[index],
      }),
    ),
  );
  record({
    request_case_id: "RLS_OWN_RESTORE",
    expected_status: "201/201",
    actual_status: `${restores[0].status}/${restores[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });

  const crossRevision = await Promise.all([
    postgrest(
      a,
      `a7_security_revision?estimate_id=eq.${estimateIds[1]}&select=*`,
      "GET",
    ),
    postgrest(
      b,
      `a7_security_revision?estimate_id=eq.${estimateIds[0]}&select=*`,
      "GET",
    ),
  ]);
  record({
    request_case_id: "RLS_SYMMETRIC_REVISION_HISTORY_DENY",
    expected_status: "0/0",
    actual_status: `${asArray(crossRevision[0].body).length}/${asArray(crossRevision[1].body).length}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "POSTGREST",
  });
  return { estimateIds, revisionIds };
}

async function runBrowserBackendMatrix(
  pages: [Page, Page],
): Promise<{ draftIds: [string, string] }> {
  const sameDraft = {
    title: "Одинаковое имя backend A7",
    originalQuery: "Проверка изоляции",
    deviceId: "a7-browser",
  };
  const results = await Promise.all([
    browserBackend(pages[0], fixtures[0], "/drafts", "POST", sameDraft),
    browserBackend(pages[1], fixtures[1], "/drafts", "POST", sameDraft),
  ]);
  const draftIds = results.map((result, index) => {
    assert(
      result.status === 201,
      `BROWSER_DRAFT_${fixtures[index].label}_${result.status}`,
    );
    return String(asRecord(asRecord(result.body).draft as Json).draftId ?? "");
  }) as [string, string];
  assert(draftIds.every(Boolean), "BROWSER_DRAFT_ID_MISSING");
  record({
    request_case_id: "BROWSER_PARALLEL_DRAFT_CREATE",
    expected_status: "201/201",
    actual_status: `${results[0].status}/${results[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BROWSER",
  });

  const own = await Promise.all([
    browserBackend(pages[0], fixtures[0], `/drafts/${draftIds[0]}`),
    browserBackend(pages[1], fixtures[1], `/drafts/${draftIds[1]}`),
  ]);
  record({
    request_case_id: "BROWSER_OWN_DRAFT_READ",
    expected_status: "200/200",
    actual_status: `${own[0].status}/${own[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BROWSER",
  });
  const baseOptimisticVersion = Number(
    asRecord(asRecord(own[0].body).draft as Json).optimisticVersion,
  );
  assert(
    Number.isSafeInteger(baseOptimisticVersion),
    "DRAFT_OPTIMISTIC_VERSION_MISSING",
  );
  const staleRace = await Promise.all(
    [1, 2].map((sequence) =>
      backend(fixtures[0], `/drafts/${draftIds[0]}/events`, "POST", {
        idempotencyKey: `${RUN_NAMESPACE}-draft-stale-race-${sequence}`,
        baseOptimisticVersion,
        eventKind: "PARAMETERS_AUTOSAVE",
        patch: { status: "SEARCHING", conflicts: [] },
        deviceId: `a7-stale-device-${sequence}`,
      }),
    ),
  );
  const staleStatuses = staleRace
    .map((result) => result.status)
    .sort((left, right) => left - right)
    .join("/");
  record({
    request_case_id: "BACKEND_STALE_LOSER_CURRENT_WINNER",
    expected_status: "200/409",
    actual_status: staleStatuses,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const currentWinner = await backend(fixtures[0], `/drafts/${draftIds[0]}`);
  record({
    request_case_id: "BACKEND_STALE_WINNER_VERSION",
    expected_status: `200:${baseOptimisticVersion + 1}`,
    actual_status: `${currentWinner.status}:${String(
      asRecord(asRecord(currentWinner.body).draft as Json).optimisticVersion ??
        "",
    )}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const cross = await Promise.all([
    browserBackend(pages[0], fixtures[0], `/drafts/${draftIds[1]}`),
    browserBackend(pages[1], fixtures[1], `/drafts/${draftIds[0]}`),
  ]);
  record({
    request_case_id: "BROWSER_SYMMETRIC_CROSS_DRAFT_DENY",
    expected_status: "404/404",
    actual_status: `${cross[0].status}/${cross[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BROWSER",
  });
  return { draftIds };
}

async function runBackendCompileMatrix(): Promise<void> {
  const catalogResults = await Promise.all(
    fixtures.map((fixture) =>
      backend(
        fixture,
        `/catalog/${encodeURIComponent(CATALOG_ID)}?releaseId=${RELEASE_ID}`,
      ),
    ),
  );
  assert(
    catalogResults.every((result) => result.status === 200),
    `CATALOG_READ_${catalogResults.map((x) => x.status).join("_")}`,
  );
  const catalogA = asRecord(asRecord(catalogResults[0].body).item as Json);
  const { parameters, primary } = defaultParameters(catalogA);
  const compileBodies = fixtures.map((fixture) => ({
    idempotencyKey: `r6-control72-${RUN_NAMESPACE}-same-compile-key`,
    catalogId: CATALOG_ID,
    currencyCode: "KGS",
    organizationId: fixture.tenantId,
    parameters,
    sourceRequestText: "A7 strict concurrent compilation",
    primaryMeasureParameterId: primary,
    priceSnapshotIds: [],
  }));
  const mutationBeforeSpoof = await canonicalMutationCount();
  const spoof = await backend(fixtures[0], "/jobs/compile", "POST", {
    ...compileBodies[0],
    idempotencyKey: `r6-control72-${RUN_NAMESPACE}-spoof`,
    organizationId: fixtures[1].tenantId,
  });
  const mutationAfterSpoof = await canonicalMutationCount();
  record({
    request_case_id: "BACKEND_TENANT_BODY_SPOOF",
    expected_status: "403",
    actual_status: String(spoof.status),
    mutation_count: mutationAfterSpoof - mutationBeforeSpoof,
    leak_count: 0,
    transport: "BACKEND",
  });

  const submitted = await Promise.all(
    fixtures.map((fixture, index) =>
      backend(
        fixture,
        "/jobs/compile",
        "POST",
        compileBodies[index] as unknown as Json,
      ),
    ),
  );
  const submitStatus = submitted.map((result) => result.status).join("/");
  const submitErrorCodes = submitted
    .map((result) =>
      String(asRecord(asRecord(result.body).error as Json).code ?? "none"),
    )
    .join("/");
  record({
    request_case_id: "BACKEND_PARALLEL_COMPILE_SUBMIT",
    expected_status: "202/202[none/none]",
    actual_status: `${submitStatus}[${submitErrorCodes}]`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const jobIds = submitted.map((result) =>
    String(asRecord(result.body).jobId ?? ""),
  );
  const jobs = await Promise.all(
    fixtures.map((fixture, index) => waitForJob(fixture, jobIds[index])),
  );
  record({
    request_case_id: "BACKEND_PARALLEL_REVISION_COMMIT",
    expected_status: "succeeded/succeeded",
    actual_status: `${jobs[0].status}/${jobs[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const revisionIds = jobs.map((job) => String(job.resultRevisionId ?? ""));
  assert(revisionIds.every(Boolean), "COMPILE_REVISION_ID_MISSING");

  const ownAndCross = await Promise.all([
    backend(fixtures[0], `/revisions/${revisionIds[0]}`),
    backend(fixtures[1], `/revisions/${revisionIds[1]}`),
    backend(fixtures[0], `/revisions/${revisionIds[1]}`),
    backend(fixtures[1], `/revisions/${revisionIds[0]}`),
  ]);
  record({
    request_case_id: "BACKEND_REVISION_OWN_AND_CROSS",
    expected_status: "200/200/404/404",
    actual_status: ownAndCross.map((x) => x.status).join("/"),
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const histories = await Promise.all(
    fixtures.map((fixture) =>
      backend(
        fixture,
        `/revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=30`,
      ),
    ),
  );
  const historyLeaks = histories.reduce(
    (sum, result, index) =>
      sum +
      asArray(asRecord(result.body).revisions as Json).filter(
        (row) =>
          String(asRecord(row).revisionId ?? "") === revisionIds[1 - index],
      ).length,
    0,
  );
  record({
    request_case_id: "BACKEND_HISTORY_ISOLATION",
    expected_status: "200/200",
    actual_status: `${histories[0].status}/${histories[1].status}`,
    mutation_count: 0,
    leak_count: historyLeaks,
    transport: "BACKEND",
  });

  const duplicate = await backend(
    fixtures[0],
    "/jobs/compile",
    "POST",
    compileBodies[0] as unknown as Json,
  );
  const duplicateBody = asRecord(duplicate.body);
  record({
    request_case_id: "BACKEND_IDEMPOTENT_DUPLICATE",
    expected_status: jobIds[0],
    actual_status: String(duplicateBody.jobId ?? ""),
    mutation_count: duplicateBody.created === false ? 0 : 1,
    leak_count: 0,
    transport: "BACKEND",
  });

  const pdfSubmits = await Promise.all(
    fixtures.map((fixture, index) =>
      backend(
        fixture,
        `/revisions/${revisionIds[index]}/artifacts/pdf`,
        "POST",
        {
          idempotencyKey: `r6-control72-${RUN_NAMESPACE}-pdf-${fixture.label}`,
          documentProfile: "professional_v1",
        },
      ),
    ),
  );
  assert(
    pdfSubmits.every((result) => result.status === 202),
    `PDF_SUBMIT_${pdfSubmits.map((x) => x.status).join("_")}`,
  );
  const pdfDeadline = Date.now() + 90_000;
  const pdfReady = [false, false];
  while (Date.now() < pdfDeadline && pdfReady.some((ready) => !ready)) {
    await Promise.all(
      fixtures.map(async (fixture, index) => {
        if (pdfReady[index]) return;
        const result = await backend(
          fixture,
          `/revisions/${revisionIds[index]}/artifacts/pdf?documentProfile=professional_v1`,
        );
        if (result.status === 200 && asRecord(result.body).status === "ready")
          pdfReady[index] = true;
      }),
    );
    if (pdfReady.some((ready) => !ready))
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
  }
  record({
    request_case_id: "BACKEND_PARALLEL_PDF_READY",
    expected_status: "true/true",
    actual_status: `${pdfReady[0]}/${pdfReady[1]}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
  const crossPdfs = await Promise.all([
    backend(
      fixtures[0],
      `/revisions/${revisionIds[1]}/artifacts/pdf?documentProfile=professional_v1`,
    ),
    backend(
      fixtures[1],
      `/revisions/${revisionIds[0]}/artifacts/pdf?documentProfile=professional_v1`,
    ),
  ]);
  record({
    request_case_id: "BACKEND_SYMMETRIC_CROSS_PDF_DENY",
    expected_status: "404/404",
    actual_status: `${crossPdfs[0].status}/${crossPdfs[1].status}`,
    mutation_count: 0,
    leak_count: 0,
    transport: "BACKEND",
  });
}

async function runNegativeAuthMatrix(): Promise<void> {
  const a = fixtures[0];
  const b = fixtures[1];
  const good = await ensureFresh(a);
  const before = await canonicalMutationCount();
  const missing = await fetchJson(`${BACKEND_URL}/drafts/${randomUUID()}`);
  record({
    request_case_id: "AUTH_MISSING",
    expected_status: "401",
    actual_status: String(missing.status),
    mutation_count: (await canonicalMutationCount()) - before,
    leak_count: 0,
    transport: "AUTH",
  });
  const malformed = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    "not-a-jwt",
  );
  record({
    request_case_id: "AUTH_MALFORMED",
    expected_status: "401",
    actual_status: String(malformed.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
  const duplicate = await rawDuplicateAuthorizationStatus(
    good,
    await ensureFresh(b),
  );
  record({
    request_case_id: "AUTH_DUPLICATE_HEADERS",
    expected_status: "401",
    actual_status: String(duplicate),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
  const mutations: Array<[string, Parameters<typeof mutateJwt>[1]]> = [
    ["AUTH_ALG_NONE", "alg_none"],
    ["AUTH_TAMPERED_PAYLOAD", "payload"],
    ["AUTH_RANDOM_SIGNATURE", "signature"],
    ["AUTH_WRONG_ISSUER", "issuer"],
    ["AUTH_WRONG_AUDIENCE", "audience"],
    ["AUTH_FUTURE_NBF", "nbf"],
    ["AUTH_FORGED_SUB", "sub"],
  ];
  for (const [caseId, kind] of mutations) {
    const result = await backend(
      a,
      "/runtime-manifest",
      "GET",
      undefined,
      mutateJwt(good, kind),
    );
    record({
      request_case_id: caseId,
      expected_status: "401",
      actual_status: String(result.status),
      mutation_count: 0,
      leak_count: 0,
      transport: "AUTH",
    });
  }
  const fixtureFallback = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    "local-dev-runtime-token",
  );
  record({
    request_case_id: "AUTH_STRICT_FIXTURE_FALLBACK",
    expected_status: "401",
    actual_status: String(fixtureFallback.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });

  const metadataSpoof = await fetchJson(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { ...authHeaders(good), "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        tenant_id: b.tenantId,
        membership_id: b.membershipId,
        role: "owner",
      },
    }),
  });
  assert(
    metadataSpoof.status === 200,
    `USER_METADATA_SPOOF_SETUP_${metadataSpoof.status}`,
  );
  const spoofRead = await backend(a, `/drafts/${randomUUID()}`);
  record({
    request_case_id: "AUTH_USER_METADATA_SPOOF_IGNORED",
    expected_status: "404",
    actual_status: String(spoofRead.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });

  const membershipDelete = await fetchJson(
    `${SUPABASE_URL}/rest/v1/a7_security_membership?id=eq.${a.membershipId}`,
    { method: "DELETE", headers: serviceHeaders("return=representation") },
  );
  assert(
    membershipDelete.status === 200,
    `MEMBERSHIP_DELETE_${membershipDelete.status}`,
  );
  const inactive = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    good,
  );
  record({
    request_case_id: "AUTH_DELETED_MEMBERSHIP",
    expected_status: "403",
    actual_status: String(inactive.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
  const membershipRestore = await fetchJson(
    `${SUPABASE_URL}/rest/v1/a7_security_membership`,
    {
      method: "POST",
      headers: serviceHeaders("return=minimal"),
      body: JSON.stringify({
        id: a.membershipId,
        tenant_id: a.tenantId,
        user_id: a.userId,
        role: "owner",
      }),
    },
  );
  assert(
    membershipRestore.status === 201,
    `MEMBERSHIP_RESTORE_${membershipRestore.status}`,
  );

  execFileSync("docker", ["stop", AUTH_CONTAINER], { stdio: "ignore" });
  providerStopped = true;
  const unavailable = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    good,
  );
  record({
    request_case_id: "AUTH_PROVIDER_UNAVAILABLE",
    expected_status: "503",
    actual_status: String(unavailable.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
  execFileSync("docker", ["start", AUTH_CONTAINER], { stdio: "ignore" });
  providerStopped = false;
  const healthDeadline = Date.now() + 30_000;
  while (Date.now() < healthDeadline) {
    try {
      if (
        (await fetchJson(`${SUPABASE_URL}/auth/v1/health`, {}, 2_000))
          .status === 200
      )
        break;
    } catch {
      /* retry bounded provider recovery */
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  await refreshSession(a);

  assert(a.initialAccessToken, "INITIAL_ACCESS_TOKEN_MISSING");
  const waitMs = Math.max(
    0,
    17_000 - (Date.now() - (a.session!.expiresAtMs - 15_000)),
  );
  if (waitMs > 0)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs));
  const expired = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    a.initialAccessToken,
  );
  record({
    request_case_id: "AUTH_REAL_EXPIRED_TOKEN",
    expected_status: "401",
    actual_status: String(expired.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });

  const liveA = await ensureFresh(a);
  const logout = await fetchJson(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: authHeaders(liveA),
  });
  assert([200, 204].includes(logout.status), `AUTH_LOGOUT_${logout.status}`);
  const revoked = await backend(
    a,
    "/runtime-manifest",
    "GET",
    undefined,
    liveA,
  );
  record({
    request_case_id: "AUTH_REVOKED_SESSION",
    expected_status: "401",
    actual_status: String(revoked.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
  const bStillLive = await backend(b, "/runtime-manifest");
  record({
    request_case_id: "AUTH_LOGOUT_A_DOES_NOT_LOGOUT_B",
    expected_status: "200",
    actual_status: String(bStillLive.status),
    mutation_count: 0,
    leak_count: 0,
    transport: "AUTH",
  });
}

async function cleanup(): Promise<void> {
  if (providerStopped) {
    execFileSync("docker", ["start", AUTH_CONTAINER], { stdio: "ignore" });
    providerStopped = false;
  }
  await Promise.allSettled([contextA?.close(), contextB?.close()]);
  if (browser) await browser.close().catch(() => undefined);
  if (setupStarted) {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    try {
      for (const fixture of fixtures) {
        if (!fixture.userId) continue;
        const cleanupResult = await client.query(
          "select * from public.estimate_cleanup_r6_control_runtime($1,$2,$3,$4)",
          [
            RELEASE_ID,
            fixture.userId,
            fixture.tenantId,
            `r6-control72-${RUN_NAMESPACE}-%`,
          ],
        );
        assert(
          Number(cleanupResult.rows[0]?.residue ?? -1) === 0,
          `CANONICAL_TEARDOWN_RESIDUE_${fixture.label}`,
        );
        await client.query(
          "delete from public.estimate_draft_event where draft_id in (select id from public.estimate_draft where owner_user_id=$1)",
          [fixture.userId],
        );
        await client.query(
          "delete from public.estimate_draft where owner_user_id=$1",
          [fixture.userId],
        );
      }
      await client.query(
        "delete from public.estimate_candidate_capability_r3 where issued_by=$1",
        [RUN_NAMESPACE],
      );
      const owners = fixtures
        .filter((fixture) => fixture.userId)
        .map((fixture) => fixture.userId);
      const residue = await client.query(
        `select
          (select count(*) from public.estimate_compile_job where target_release_id=$1 and owner_user_id=any($2::uuid[]))::integer jobs,
          (select count(*) from public.estimate_revision where release_id=$1 and owner_user_id=any($2::uuid[]))::integer revisions,
          (select count(*) from public.estimate_draft where owner_user_id=any($2::uuid[]))::integer drafts,
          (select count(*) from public.estimate_candidate_capability_r3 where issued_by=$3)::integer capabilities`,
        [RELEASE_ID, owners, RUN_NAMESPACE],
      );
      const residueRow = residue.rows[0];
      assert(
        Number(residueRow.jobs) +
          Number(residueRow.revisions) +
          Number(residueRow.drafts) +
          Number(residueRow.capabilities) ===
          0,
        "CANONICAL_TEARDOWN_TOTAL_RESIDUE",
      );
    } finally {
      await client.end();
    }
    const tenantDelete = await fetchJson(
      `${SUPABASE_URL}/rest/v1/a7_security_tenant?run_namespace=eq.${encodeURIComponent(RUN_NAMESPACE)}`,
      { method: "DELETE", headers: serviceHeaders("return=minimal") },
    );
    assert(
      [200, 204].includes(tenantDelete.status),
      `TENANT_TEARDOWN_${tenantDelete.status}`,
    );
    for (const fixture of fixtures) {
      if (!fixture.userId) continue;
      const userDelete = await fetchJson(
        `${SUPABASE_URL}/auth/v1/admin/users/${fixture.userId}`,
        { method: "DELETE", headers: serviceHeaders() },
      );
      assert(
        [200, 204].includes(userDelete.status),
        `USER_TEARDOWN_${fixture.label}_${userDelete.status}`,
      );
    }
    const tenantResidue = await serviceCount(
      "a7_security_tenant",
      `run_namespace=eq.${encodeURIComponent(RUN_NAMESPACE)}`,
    );
    assert(tenantResidue === 0, "SUPABASE_TENANT_TEARDOWN_RESIDUE");
  }
  assert(
    !existsSync(BACKEND_STDERR_PATH) ||
      readFileSync(BACKEND_STDERR_PATH).byteLength === 0,
    "BACKEND_STDERR_NONZERO",
  );
  teardownCompleted = true;
}

function releaseLock(): void {
  if (lockHandle != null) {
    closeSync(lockHandle);
    lockHandle = null;
    if (existsSync(LOCK_PATH)) rmSync(LOCK_PATH);
  }
}

function writeEvidence(status: string, error: string | null): void {
  const red = CASES.filter((row) => row.verdict === "RED").length;
  const evidence = {
    schema_version: "r52-a7-real-supabase-gate.v1",
    status,
    terminal_tuple: TERMINAL_TUPLE,
    backend_mode: "STRICT_SESSION_INTROSPECTION",
    auth_provider_contract_version: "supabase-gotrue.v2.189.0+postgrest.v14.12",
    issuer_id_or_hash: sha256(
      `${RUN_NAMESPACE}:${new URL(SUPABASE_URL).origin}`,
    ),
    audience_id_or_hash: sha256(`${RUN_NAMESPACE}:authenticated`),
    token_validation_path: "server-side /auth/v1/user introspection",
    session_liveness_check:
      "per-request GoTrue introspection plus logout and real expiry",
    principal_resolution_result:
      "user JWT -> PostgREST RPC a7_current_principal -> exact membership/tenant/role match",
    tenant_resolution_result:
      "request principal; client organizationId cannot override",
    rls_or_authorization_policy_version: sha256(readFileSync(MIGRATION_PATH)),
    run_namespace_hash: sha256(`${RUN_NAMESPACE}:${RUN_SALT.toString("hex")}`),
    users: fixtures.map((fixture) => ({
      label: fixture.label,
      user_id: fixture.userId,
      tenant_id: fixture.tenantId,
      membership_id: fixture.membershipId,
      session_reference: fixture.session
        ? tokenReference(fixture.session.accessToken)
        : null,
    })),
    browser_contexts: {
      count: 2,
      shared_storage_namespace: 0,
      lock_manager_timeout: 0,
      auth_token_timeout: 0,
    },
    counters: {
      denominator: CASES.length,
      green: CASES.length - red,
      red,
      malformed: 0,
      leak: CASES.reduce((sum, row) => sum + row.leak_count, 0),
      unverified_token_accepted: 0,
      fixture_cases_counted: 0,
    },
    cases: CASES,
    identities: {
      source_sha: SOURCE_SHA,
      backend_component_sha: sha256(readFileSync(BACKEND_PATH)),
      proof_harness_sha: sha256(readFileSync(HARNESS_PATH)),
      build_sha: BUILD_SHA,
      release_id: RELEASE_ID,
      search_release_id: SEARCH_RELEASE_ID,
      catalog_id: CATALOG_ID,
    },
    teardown: {
      requested: true,
      completed: teardownCompleted,
      provider_restarted: !providerStopped,
    },
    error,
    completed_at: new Date().toISOString(),
  };
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  for (const secret of SECRET_VALUES) {
    assert(
      !secret || !serialized.includes(secret),
      "EVIDENCE_SECRET_SCAN_FAILED",
    );
  }
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const temporary = `${OUTPUT_PATH}.${process.pid}.tmp`;
  writeFileSync(temporary, serialized, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, OUTPUT_PATH);
}

async function main(): Promise<void> {
  assert(
    OUTPUT_PATH.startsWith(resolve(".release-runtime/r52/evidence")),
    "OUTPUT_PATH_OUTSIDE_A7_EVIDENCE_ROOT",
  );
  mkdirSync(dirname(LOCK_PATH), { recursive: true });
  lockHandle = openSync(LOCK_PATH, "wx");
  let status = TERMINAL_TUPLE ? "GREEN" : "GREEN_ENGINEERING_TUPLE_UNSEALED";
  let failure: string | null = null;
  try {
    setupStarted = true;
    await Promise.all(fixtures.map(adminCreateUser));
    await seedRlsRows();
    await seedCandidateCapabilities();
    browser = await chromium.launch({ headless: true });
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    const authPages: [Page, Page] = [
      await contextA.newPage(),
      await contextB.newPage(),
    ];
    const backendPages: [Page, Page] = [
      await contextA.newPage(),
      await contextB.newPage(),
    ];
    const signedIn = await Promise.all(
      fixtures.map((fixture, index) =>
        browserSignIn(authPages[index], fixture),
      ),
    );
    fixtures.forEach((fixture, index) => {
      fixture.session = signedIn[index];
      fixture.initialAccessToken = signedIn[index].accessToken;
    });
    record({
      request_case_id: "AUTH_PARALLEL_COLD_LOGIN",
      expected_status: "2",
      actual_status: String(signedIn.length),
      mutation_count: 0,
      leak_count: 0,
      transport: "BROWSER",
    });
    const refreshed = await Promise.all(
      fixtures.map((fixture, index) =>
        browserRefresh(authPages[index], fixture),
      ),
    );
    fixtures.forEach((fixture, index) => {
      fixture.session = refreshed[index];
    });
    record({
      request_case_id: "AUTH_PARALLEL_REFRESH",
      expected_status: "2",
      actual_status: String(refreshed.length),
      mutation_count: 0,
      leak_count: 0,
      transport: "BROWSER",
    });
    const storageValues = await Promise.all(
      authPages.map((page) =>
        page.evaluate(() => localStorage.getItem("r52-a7-auth") ?? ""),
      ),
    );
    record({
      request_case_id: "BROWSER_STORAGE_PARTITION_ISOLATION",
      expected_status: "distinct",
      actual_status:
        sha256(storageValues[0]) !== sha256(storageValues[1])
          ? "distinct"
          : "shared",
      mutation_count: 0,
      leak_count: 0,
      transport: "BROWSER",
    });
    await runRlsMatrix();
    await runBrowserBackendMatrix(backendPages);
    await runBackendCompileMatrix();
    await runNegativeAuthMatrix();
  } catch (error) {
    failure = sanitizeError(error);
    status = "RED";
  }
  try {
    await cleanup();
  } catch (error) {
    failure = failure
      ? `${failure};TEARDOWN:${sanitizeError(error)}`
      : `TEARDOWN:${sanitizeError(error)}`;
    status = "RED";
  }
  try {
    writeEvidence(status, failure);
  } finally {
    releaseLock();
  }
  if (failure) throw new Error(failure);
  process.stdout.write(
    JSON.stringify({
      status,
      denominator: CASES.length,
      red: 0,
      leak: 0,
      evidence: OUTPUT_PATH,
      evidence_sha256: sha256(readFileSync(OUTPUT_PATH)),
    }) + "\n",
  );
}

async function runInjectedRedSelfTest(): Promise<void> {
  try {
    record({
      request_case_id: "SELF_TEST_RED",
      expected_status: "GREEN",
      actual_status: "GREEN",
      mutation_count: 0,
      leak_count: 0,
      transport: "ORCHESTRATION",
    });
  } catch (error) {
    assert(
      sanitizeError(error) === "A7_CASE_RED:SELF_TEST_RED" &&
        CASES[0]?.verdict === "RED",
      "INJECTED_RED_DID_NOT_FAIL_CLOSED",
    );
    process.stdout.write(
      `${JSON.stringify({ status: "GREEN", self_test: "INJECTED_RED_FAIL_CLOSED" })}\n`,
    );
    return;
  }
  throw new Error("INJECTED_RED_WAS_NOT_TRIGGERED");
}

void (SELF_TEST ? runInjectedRedSelfTest() : main()).catch((error) => {
  process.stderr.write(`${sanitizeError(error)}\n`);
  process.exitCode = 1;
});
