import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";
import { chromium, type Browser, type Page } from "playwright";

type Json = Record<string, any>;
type Inspect = {
  Config: { Image: string; Env: string[]; Cmd: string[] | null };
  HostConfig: {
    RestartPolicy?: { Name?: string };
    PortBindings?: Record<string, unknown>;
  };
  Mounts: unknown[];
  NetworkSettings: { Networks: Record<string, unknown> };
};

const MASTER_SHA256 =
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const WEB_ORIGIN = "http://localhost:8081";
const PROVIDER_ORIGIN = "http://127.0.0.1:54321";
const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const AUTH_CONTAINER = "supabase_auth_rik-r52-a7-provider-20260824";
const EXPECTED_IMAGE = "public.ecr.aws/supabase/gotrue:v2.189.0";
const NORMAL_TTL_SECONDS = 3_600;
// auth-js uses a 90-second expiry margin (3 x 30-second ticks). A proof TTL at
// or below that margin is permanently "near expiry" and creates an artificial
// tight refresh loop. 180 seconds is still 20x shorter than normal while
// leaving a real bounded scheduling window on both sides of the refresh.
const SHORT_TTL_SECONDS = 180;
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const SOURCE = resolve("scripts/dev/runR555AuthShortTtlCompileRace.ts");
const UPSTREAM = resolve(
  ".release-runtime/r555/evidence/23F_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES.json",
);
const OUTPUT = resolve(
  ".release-runtime/r555/evidence/23G_R555_AUTH_SHORT_TTL_COMPILE_RACE.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_AUTH_SHORT_TTL_RACE:${code}`);
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

function docker(args: string[]): string {
  try {
    return execFileSync("docker", args, {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error(`R555_AUTH_SHORT_TTL_RACE:DOCKER_${args[0]?.toUpperCase() ?? "UNKNOWN"}_FAILED`);
  }
}

function inspectContainer(): Inspect {
  const rows = JSON.parse(docker(["inspect", AUTH_CONTAINER])) as Inspect[];
  invariant(rows.length === 1, "AUTH_CONTAINER_IDENTITY_RED");
  return rows[0]!;
}

function ttlOf(env: readonly string[]): number | null {
  const raw = env
    .find((value) => value.startsWith("GOTRUE_JWT_EXP="))
    ?.split("=")
    .slice(1)
    .join("=");
  const parsed = Number(raw ?? Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function withTtl(env: readonly string[], ttl: number): string[] {
  let replaced = false;
  const result = env.map((value) => {
    if (!value.startsWith("GOTRUE_JWT_EXP=")) return value;
    replaced = true;
    return `GOTRUE_JWT_EXP=${ttl}`;
  });
  invariant(replaced, "AUTH_TTL_ENV_MISSING");
  return result;
}

function runContainer(original: Inspect, env: readonly string[]): void {
  const networks = Object.keys(original.NetworkSettings.Networks);
  invariant(networks.length === 1, "AUTH_NETWORK_RED");
  const args = ["run", "-d", "--name", AUTH_CONTAINER, "--network", networks[0]!];
  const restart = original.HostConfig.RestartPolicy?.Name;
  if (restart && restart !== "no") args.push("--restart", restart);
  for (const value of env) args.push("--env", value);
  args.push(original.Config.Image, ...(original.Config.Cmd ?? []));
  docker(args);
}

async function waitForProviderHealth(): Promise<void> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${PROVIDER_ORIGIN}/auth/v1/health`, {
        signal: AbortSignal.timeout(1_500),
      });
      if (response.ok) return;
    } catch {
      // The exact local container is still joining its existing network.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error("R555_AUTH_SHORT_TTL_RACE:AUTH_HEALTH_TIMEOUT");
}

async function replaceContainer(original: Inspect, env: readonly string[]): Promise<void> {
  docker(["stop", AUTH_CONTAINER]);
  docker(["rm", AUTH_CONTAINER]);
  runContainer(original, env);
  await waitForProviderHealth();
}

function endpointOnly(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "invalid-url";
  }
}

function jwtExpiryMs(token: string): number {
  const segment = token.split(".")[1];
  invariant(segment, "JWT_PAYLOAD_MISSING");
  const payload = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Json;
  const expiry = Number(payload.exp);
  invariant(Number.isFinite(expiry), "JWT_EXP_MISSING");
  return expiry * 1_000;
}

async function signInConsumer(page: Page): Promise<string> {
  await page.goto(`${WEB_ORIGIN}/request?shortTtlRace=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.getByTestId("auth.login.screen").waitFor({ timeout: 120_000 });
  await page.getByTestId("auth.login.local-consumer").click();
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 120_000 });
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("sb-127-auth-token");
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      return parsed?.user?.app_metadata?.role === "consumer"
        ? String(parsed?.access_token ?? "")
        : "";
    } catch {
      return "";
    }
  });
}

async function waitUntil(predicate: () => boolean, timeoutMs: number, code: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
  }
  throw new Error(`R555_AUTH_SHORT_TTL_RACE:${code}`);
}

async function auditJob(jobId: string): Promise<Json> {
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r555-auth-short-ttl-race-audit",
  });
  await client.connect();
  try {
    const job = await client.query(
      `with target as (
         select id,idempotency_key,organization_id,owner_user_id,status,result_revision_id
         from public.estimate_compile_job where id=$1::uuid
       )
       select count(*)::int job_count,
         count(distinct target.id)::int distinct_jobs,
         count(distinct target.result_revision_id)::int distinct_revisions,
         min(target.status)::text status,
         min(target.result_revision_id::text)::text revision_id,
         coalesce(min((select count(*) from public.estimate_compile_job sibling
           where sibling.idempotency_key=target.idempotency_key
             and sibling.organization_id=target.organization_id
             and sibling.owner_user_id=target.owner_user_id)),0)::int sibling_jobs
       from target`,
      [jobId],
    );
    const row = job.rows[0] as Json;
    let rowCount = 0;
    if (row.revision_id) {
      const rows = await client.query(
        "select count(*)::int row_count from public.estimate_revision_row where revision_id=$1::uuid",
        [row.revision_id],
      );
      rowCount = Number(rows.rows[0]?.row_count ?? 0);
    }
    return {
      job_count: Number(row.job_count ?? 0),
      distinct_jobs: Number(row.distinct_jobs ?? 0),
      distinct_revisions: Number(row.distinct_revisions ?? 0),
      sibling_jobs_with_server_idempotency_key: Number(row.sibling_jobs ?? 0),
      status: row.status ?? null,
      revision_id: row.revision_id ?? null,
      boq_row_count: rowCount,
    };
  } finally {
    await client.end();
  }
}

async function executeBrowserRace(browser: Browser): Promise<Json> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const authEvents: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: Json[] = [];
  const productionRequests: string[] = [];
  const refresh = {
    started: 0,
    finished: 0,
    failed: 0,
    in_flight: 0,
    max_in_flight: 0,
    statuses: [] as number[],
  };
  const compileRequests: Array<{
    ordinal: number;
    body_sha256: string;
    idempotency_key: string | null;
  }> = [];
  const compileResponses: Json[] = [];
  let originalExpiredToken = "";
  let firstCompileForcedExpired = false;

  const isRefresh = (url: string, method: string, postData: string | null) =>
    method === "POST" &&
    endpointOnly(url) === `${PROVIDER_ORIGIN}/auth/v1/token` &&
    (/grant_type=refresh_token/iu.test(url) || /refresh_token/iu.test(postData ?? ""));

  page.on("console", (message) => {
    const text = message.text();
    const event = text.match(/onAuthStateChange:\s*([A-Z_]+)/u)?.[1];
    if (event) authEvents.push(event);
    if (message.type() === "error") consoleErrors.push(text.slice(0, 500));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message.slice(0, 500)));
  page.on("request", (request) => {
    const endpoint = endpointOnly(request.url());
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
      productionRequests.push(endpoint);
    }
    if (isRefresh(request.url(), request.method(), request.postData())) {
      refresh.started += 1;
      refresh.in_flight += 1;
      refresh.max_in_flight = Math.max(refresh.max_in_flight, refresh.in_flight);
    }
  });
  page.on("requestfinished", (request) => {
    if (isRefresh(request.url(), request.method(), request.postData())) {
      refresh.finished += 1;
      refresh.in_flight -= 1;
    }
  });
  page.on("requestfailed", (request) => {
    if (isRefresh(request.url(), request.method(), request.postData())) {
      refresh.failed += 1;
      refresh.in_flight -= 1;
    }
    requestFailures.push({
      endpoint: endpointOnly(request.url()),
      error: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    const request = response.request();
    if (isRefresh(request.url(), request.method(), request.postData())) {
      refresh.statuses.push(response.status());
    }
    if (
      endpointOnly(response.url()) === `${BACKEND_ORIGIN}/jobs/compile` &&
      request.method() === "POST"
    ) {
      const responseReceipt: Json = {
        status: response.status(),
        job_id: null,
        request_id_present: false,
        error_code: null,
      };
      compileResponses.push(responseReceipt);
      void response
        .json()
        .catch(() => ({}))
        .then((body: Json) => {
          responseReceipt.job_id = typeof body.jobId === "string" ? body.jobId : null;
          responseReceipt.request_id_present = Boolean(body.requestId);
          responseReceipt.error_code = body.error?.code ?? null;
        });
    }
  });

  await page.route(`${BACKEND_ORIGIN}/jobs/compile`, async (route) => {
    const request = route.request();
    const rawBody = request.postData() ?? "";
    let idempotencyKey: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as Json;
      idempotencyKey = typeof parsed.idempotencyKey === "string" ? parsed.idempotencyKey : null;
    } catch {
      idempotencyKey = null;
    }
    compileRequests.push({
      ordinal: compileRequests.length + 1,
      body_sha256: sha256(rawBody),
      idempotency_key: idempotencyKey,
    });
    if (compileRequests.length === 1) {
      invariant(Date.now() > jwtExpiryMs(originalExpiredToken), "ORIGINAL_TOKEN_NOT_EXPIRED");
      firstCompileForcedExpired = true;
      await route.continue({
        headers: {
          ...request.headers(),
          authorization: `Bearer ${originalExpiredToken}`,
        },
      });
      return;
    }
    await route.continue();
  });

  try {
    originalExpiredToken = await signInConsumer(page);
    invariant(originalExpiredToken.length > 0, "CONSUMER_TOKEN_MISSING");
    const originalExpiry = jwtExpiryMs(originalExpiredToken);
    invariant(
      originalExpiry - Date.now() <= (SHORT_TTL_SECONDS + 5) * 1_000,
      "SHORT_TTL_TOKEN_RED",
    );

    const input = page.getByTestId("consumer-repair-problem-input");
    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().startsWith(`${BACKEND_ORIGIN}/search/catalog?`) &&
        new URL(response.url()).searchParams.get("query") === "асф" &&
        response.status() === 200,
      { timeout: 120_000 },
    );
    const [searchResponse] = await Promise.all([searchResponsePromise, input.fill("асф")]);
    const searchBody = (await searchResponse.json()) as Json;
    const items = Array.isArray(searchBody.items) ? searchBody.items : [];
    invariant(items.length > 0, "ASPHALT_SEARCH_EMPTY");
    const titleFragmentIndex = items.findIndex((item: Json) =>
      /асф/iu.test(String(item.canonicalNameRu ?? "")),
    );
    // Canonical search intentionally indexes the whole applicable work passport,
    // not only its public title. A result can therefore match asphalt materials
    // while keeping a clearer operation-first Russian title.
    const asphaltIndex = titleFragmentIndex >= 0 ? titleFragmentIndex : 0;
    const selected = items[asphaltIndex] as Json;
    await page
      .getByTestId(`consumer-repair-work-suggestion-${asphaltIndex + 1}`)
      .click();
    await page.getByTestId("consumer-repair-prepare-draft").waitFor({ timeout: 60_000 });

    const expiryWaitMs = Math.max(0, originalExpiry - Date.now() + 1_000);
    process.stdout.write(
      `[r555-short-ttl] asphalt=${String(selected.catalogId)} wait_original_expiry_ms=${expiryWaitMs}\n`,
    );
    await page.waitForTimeout(expiryWaitMs);
    const attemptId = randomUUID();
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await waitUntil(
      () =>
        compileResponses.length >= 2 &&
        compileResponses.some((entry) => entry.status === 202 && entry.job_id),
      180_000,
      "COMPILE_ACCEPTED_TIMEOUT",
    );
    await page
      .locator('[id^="canonical-estimate-row-identity|"]')
      .first()
      .waitFor({ timeout: 180_000 });
    await waitUntil(() => refresh.in_flight === 0, 30_000, "REFRESH_NOT_QUIESCENT");

    const idempotencyKeys = compileRequests
      .map((entry) => entry.idempotency_key)
      .filter((value): value is string => Boolean(value));
    invariant(idempotencyKeys.length >= 2, "COMPILE_RETRY_NOT_OBSERVED");
    const acceptedJobId = String(
      compileResponses.find((entry) => entry.status === 202)?.job_id ?? "",
    );
    invariant(acceptedJobId.length > 0, "ACCEPTED_JOB_ID_MISSING");
    const audit = await auditJob(acceptedJobId);
    const responseStatuses = compileResponses.map((entry) => entry.status);
    const expectedForced401ConsoleErrors = consoleErrors.filter(
      (sample) => /Failed to load resource/iu.test(sample),
    );
    const unexpectedConsoleErrors = consoleErrors.filter(
      (sample) => !expectedForced401ConsoleErrors.includes(sample),
    );
    const checks = {
      asphalt_search_nonempty: items.length > 0,
      forced_expired_token_request: firstCompileForcedExpired,
      compile_401_then_202:
        responseStatuses.filter((status) => status === 401).length === 1 &&
        responseStatuses.filter((status) => status === 202).length === 1,
      bounded_retry_exactly_two_requests: compileRequests.length === 2,
      identical_retry_body:
        compileRequests.length === 2 &&
        compileRequests[0]?.body_sha256 === compileRequests[1]?.body_sha256,
      identical_idempotency_key:
        idempotencyKeys.length === 2 && new Set(idempotencyKeys).size === 1,
      refresh_observed: refresh.started >= 1 && authEvents.includes("TOKEN_REFRESHED"),
      refresh_single_flight:
        refresh.max_in_flight === 1 &&
        refresh.in_flight === 0 &&
        refresh.started === refresh.finished &&
        refresh.failed === 0 &&
        refresh.statuses.every((status) => status === 200),
      refresh_not_storm: refresh.started >= 1 && refresh.started <= 4,
      one_job_one_revision:
        audit.job_count === 1 &&
        audit.distinct_jobs === 1 &&
        audit.distinct_revisions === 1 &&
        audit.sibling_jobs_with_server_idempotency_key === 1 &&
        audit.status === "succeeded",
      boq_nonempty: audit.boq_row_count > 0,
      page_errors_0: pageErrors.length === 0,
      requestfailed_0: requestFailures.length === 0,
      unexpected_console_errors_0: unexpectedConsoleErrors.length === 0,
      production_requests_0: productionRequests.length === 0,
    };
    return {
      attempt_id: attemptId,
      selected_catalog_id: selected.catalogId,
      selected_title_ru: selected.canonicalNameRu,
      selected_title_contains_query_fragment: titleFragmentIndex >= 0,
      search_result_count: items.length,
      compile: {
        request_count: compileRequests.length,
        response_statuses: responseStatuses,
        request_body_sha256_equal: checks.identical_retry_body,
        idempotency_key_equal: checks.identical_idempotency_key,
        request_ids_present: compileResponses.every((entry) => entry.request_id_present),
      },
      refresh: {
        started: refresh.started,
        finished: refresh.finished,
        failed: refresh.failed,
        max_in_flight: refresh.max_in_flight,
        terminal_in_flight: refresh.in_flight,
        response_statuses: refresh.statuses,
        token_refreshed_events: authEvents.filter((event) => event === "TOKEN_REFRESHED").length,
      },
      database: audit,
      browser: {
        expected_forced_401_console_errors: expectedForced401ConsoleErrors.length,
        unexpected_console_errors: unexpectedConsoleErrors,
        page_errors: pageErrors,
        request_failures: requestFailures,
        production_requests: productionRequests.length,
      },
      checks,
    };
  } finally {
    originalExpiredToken = "";
    await context.close();
  }
}

async function main(): Promise<void> {
  const upstream = JSON.parse(readFileSync(UPSTREAM, "utf8")) as Json;
  invariant(upstream.status === "GREEN_R555_AUTH_NORMAL_TTL_SOAK_10_MINUTES", "UPSTREAM_RED");
  const original = inspectContainer();
  invariant(original.Config.Image === EXPECTED_IMAGE, "AUTH_IMAGE_RED");
  invariant(original.Mounts.length === 0, "AUTH_MOUNTS_RED");
  invariant(Object.keys(original.HostConfig.PortBindings ?? {}).length === 0, "AUTH_PORT_BINDINGS_RED");
  invariant(ttlOf(original.Config.Env) === NORMAL_TTL_SECONDS, "NORMAL_TTL_BASELINE_RED");
  invariant(Object.keys(original.NetworkSettings.Networks).length === 1, "AUTH_NETWORK_DENOMINATOR_RED");
  const originalEnvironmentFingerprint = sha256([...original.Config.Env].sort().join("\n"));
  let containerWasReplaced = false;
  let shortTtlProven = false;
  let restored = false;
  let browser: Browser | null = null;
  let race: Json = {};
  let safeFailureCode: string | null = null;
  try {
    containerWasReplaced = true;
    await replaceContainer(original, withTtl(original.Config.Env, SHORT_TTL_SECONDS));
    shortTtlProven = ttlOf(inspectContainer().Config.Env) === SHORT_TTL_SECONDS;
    invariant(shortTtlProven, "SHORT_TTL_ACTIVATION_RED");
    process.stdout.write(
      `[r555-short-ttl] local auth profile=${SHORT_TTL_SECONDS}s active\n`,
    );
    browser = await chromium.launch({ headless: true });
    race = await executeBrowserRace(browser);
  } catch (error) {
    safeFailureCode =
      error instanceof Error && error.message.startsWith("R555_AUTH_SHORT_TTL_RACE:")
        ? error.message
        : "R555_AUTH_SHORT_TTL_RACE:UNCLASSIFIED_BROWSER_OR_RUNTIME_FAILURE";
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (containerWasReplaced) {
      try {
        await replaceContainer(original, original.Config.Env);
        const restoredInspect = inspectContainer();
        restored =
          ttlOf(restoredInspect.Config.Env) === NORMAL_TTL_SECONDS &&
          sha256([...restoredInspect.Config.Env].sort().join("\n")) ===
            originalEnvironmentFingerprint;
      } catch {
        restored = false;
      }
    }
  }

  const raceChecks = (race.checks ?? {}) as Record<string, boolean>;
  const green =
    safeFailureCode === null &&
    shortTtlProven &&
    restored &&
    Object.keys(raceChecks).length > 0 &&
    Object.values(raceChecks).every(Boolean);
  const receiptBase = {
    schema: "r555.auth-short-ttl-compile-race.v1",
    status: green
      ? "GREEN_R555_AUTH_SHORT_TTL_COMPILE_RACE"
      : "RED_R555_AUTH_SHORT_TTL_COMPILE_RACE",
    generated_at_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    source_sha256: sha256(readFileSync(SOURCE)),
    upstream_normal_ttl_soak_sha256: sha256(readFileSync(UPSTREAM)),
    normal_ttl_before_seconds: NORMAL_TTL_SECONDS,
    short_ttl_proof_seconds: SHORT_TTL_SECONDS,
    short_ttl_activated: shortTtlProven,
    normal_ttl_restored: restored,
    environment_fingerprint_restored: restored,
    safe_failure_code: safeFailureCode,
    race,
    secrets: {
      raw_access_token_persisted: false,
      raw_refresh_token_persisted: false,
      passwords_persisted: false,
      environment_values_persisted: false,
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
      short_ttl_activated: shortTtlProven,
      normal_ttl_restored: restored,
      compile: race.compile ?? null,
      refresh: race.refresh ?? null,
      database: race.database ?? null,
      safe_failure_code: safeFailureCode,
    })}\n`,
  );
  invariant(green, "TERMINAL_RED");
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
