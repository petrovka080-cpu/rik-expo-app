import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";

import { ensureProductionGradeWebServer } from "../../e2e/runProductionGradeEstimateWebSmoke";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r9-wall-putty-web-reopen-acceptance.v1";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "90d4d971-2725-5ccd-96be-209be6d253cc";
const SEARCH_RELEASE_ID = "06820680-b6b7-5341-b549-8ee2800b40c1";
const DEFINITION_ID = "2f152050-1fb2-5759-9281-297ffc99a7ea";
const CATALOG_ID = "canonical-work:base:plaster_paint_interior_wall_putty_apply_standard";
const MASTER_SHA256 = "fe3b20f891c4bbda761f10939fbf991d28b9629516b8cbd372b01836b0eb7047";
const BACKEND_PORT = Number(process.env.R9_WALL_PUTTY_WEB_BACKEND_PORT ?? 8800);
const WEB_PORT = Number(process.env.R9_WALL_PUTTY_WEB_PORT ?? 8081);
const API_ROOT = `http://127.0.0.1:${BACKEND_PORT}/canonical-estimate`;
const WEB_ROOT = `http://localhost:${WEB_PORT}`;
const TOKEN = "local-dev-runtime-token";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const ENVIRONMENT = "r9-wall-putty-web-isolated";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r9-wall-putty/web");
const MATERIAL_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:primary_material";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R9_WALL_PUTTY_WEB:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function proofSession(): Json {
  const issuedAt = Math.floor(Date.now() / 1_000) - 60;
  return {
    access_token: TOKEN,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: issuedAt + 86_400,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: OWNER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "r9-wall-putty-web@example.invalid",
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(),
      phone: "",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(),
      updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
    proof_identity: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({ sub: OWNER_ID })}.proof`,
  };
}

function localProviderPublicConfig(): { apiUrl: string; publicKey: string; origin: string } {
  const providerRoot = resolve(".release-runtime/r52/runtime/a7-supabase-project");
  const candidates = [
    resolve(".release-runtime/r52/runtime/supabase-cli-2.105.0/supabase.exe"),
    resolve(process.env.USERPROFILE ?? "", ".local/share/supabase/v2.105.0/supabase.exe"),
  ];
  const cli = candidates.find((candidate) => existsSync(candidate));
  invariant(cli && existsSync(resolve(providerRoot, "supabase/config.toml")), "LOCAL_PROVIDER_CLI_OR_CONFIG_MISSING");
  const status = JSON.parse(execFileSync(cli, ["status", "-o", "json"], {
    cwd: providerRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })) as Json;
  const apiUrl = String(status.API_URL ?? "").trim();
  let publicKey = String(status.PUBLISHABLE_KEY ?? status.ANON_KEY ?? "").trim();
  if (!publicKey) {
    const kong = execFileSync("docker", [
      "exec", "supabase_kong_rik-r52-a7-provider-20260824", "cat", "/home/kong/kong.yml",
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    publicKey = /sb_publishable_[A-Za-z0-9_-]+/u.exec(kong)?.[0] ?? "";
  }
  const parsed = new URL(apiUrl);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
    && publicKey.length > 20, "LOCAL_PROVIDER_PUBLIC_CONFIG_INVALID");
  return { apiUrl, publicKey, origin: parsed.origin };
}

function installSession(context: BrowserContext): Promise<void> {
  return context.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
  }, { key: `sb-${PROJECT_REF}-auth-token`, session: proofSession() });
}

async function startBackend(env: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error(
      `R9_WALL_PUTTY_WEB:BACKEND_READY_TIMEOUT:${logs.join("").slice(-3000)}`,
    )), 45_000);
    const onText = (chunk: Buffer) => {
      const value = chunk.toString("utf8");
      logs.push(value);
      if (value.includes('"status":"READY"')) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (exitCode) => {
      clearTimeout(timer);
      rejectReady(new Error(`R9_WALL_PUTTY_WEB:BACKEND_EARLY_EXIT:${exitCode}:${logs.join("").slice(-3000)}`));
    });
  });
  return { child, logs };
}

async function startAuthBroker(): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/dev/serveLocalDeveloperAuthBroker.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((resolveReady, rejectReady) => {
    const timer = setTimeout(() => rejectReady(new Error(
      `R9_WALL_PUTTY_WEB:AUTH_BROKER_READY_TIMEOUT:${logs.join("").slice(-2000)}`,
    )), 15_000);
    const onText = (chunk: Buffer) => {
      const value = chunk.toString("utf8");
      logs.push(value);
      if (value.includes('"status":"LOCAL_DEVELOPER_AUTH_BROKER_READY"')) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (exitCode) => {
      clearTimeout(timer);
      rejectReady(new Error(`R9_WALL_PUTTY_WEB:AUTH_BROKER_EARLY_EXIT:${exitCode}:${logs.join("").slice(-2000)}`));
    });
  });
  const health = await fetch("http://127.0.0.1:54329/health").then((response) => response.json()) as Json;
  invariant(health.status === "ready" && Number(health.principal_count) === 10
    && health.owner_available === true, "AUTH_BROKER_HEALTH_RED");
  return { child, logs };
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function backendApi(token: string, path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `BACKEND_API_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function waitForBackendJob(token: string, jobId: string): Promise<Json> {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const job = await backendApi(token, `jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    invariant(!["failed", "cancelled"].includes(String(job.status)),
      `BACKEND_JOB_${String(job.status)}:${jobId}:${String(job.errorCode ?? "")}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`R9_WALL_PUTTY_WEB:BACKEND_JOB_TIMEOUT:${jobId}`);
}

async function backendRows(token: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await backendApi(token, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function identity(page: Page): Promise<{ revisionId: string; releaseId: string; catalogId: string }> {
  const row = page.locator('[id^="canonical-estimate-row-identity|"]').first();
  await row.waitFor({ state: "visible", timeout: 180_000 });
  const parts = String(await row.getAttribute("id") ?? "").split("|");
  return { revisionId: parts[1] ?? "", releaseId: parts[2] ?? "", catalogId: parts[3] ?? "" };
}

async function enterLocalConsumer(page: Page): Promise<void> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login")).first();
    if (await login.isVisible().catch(() => false) && await login.isEnabled().catch(() => false)) {
      await login.click().catch(() => undefined);
    }
    await page.waitForTimeout(500);
  }
  const diagnostic = await page.evaluate(() => ({
    url: location.href,
    body: document.body.innerText.slice(0, 5_000),
    testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) =>
      node.getAttribute("data-testid")).slice(0, 250),
  }));
  throw new Error(`R9_WALL_PUTTY_WEB:LOCAL_CONSUMER_LOGIN:${JSON.stringify(diagnostic)}`);
}

async function openPositions(page: Page): Promise<void> {
  const panel = page.getByTestId("request-estimate-positions-panel");
  if (await panel.isVisible().catch(() => false)) return;
  const toggle = page.getByTestId("request-estimate-positions-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  await toggle.click();
  await panel.waitFor({ state: "visible", timeout: 60_000 });
}

async function visibleRows(page: Page): Promise<Json[]> {
  await openPositions(page);
  return page.locator('[id^="canonical-estimate-row-identity|"]').evaluateAll((nodes) => nodes.map((node) => {
    const id = node.getAttribute("id") ?? "";
    const quantity = node.querySelector('[data-testid^="consumer-repair-item-quantity-input-"]') as HTMLInputElement | null;
    const price = node.querySelector('[data-testid^="consumer-repair-item-unit-price-input-"]') as HTMLInputElement | null;
    return {
      nativeIdentity: id,
      rowId: id.split("|").slice(7).join("|"),
      text: (node as HTMLElement).innerText,
      quantity: quantity?.value ?? null,
      unitPrice: price?.value ?? null,
    };
  }));
}

async function waitForStableExactRevision(page: Page): Promise<void> {
  await page.getByTestId("consumer-repair-storage-hydrating")
    .waitFor({ state: "hidden", timeout: 180_000 });
  await page.getByTestId("request-estimate-incomplete-composition-notice")
    .waitFor({ state: "hidden", timeout: 180_000 });
}

async function main(): Promise<void> {
  const parsedDatabase = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsedDatabase.hostname)
    && parsedDatabase.port === "55432" && parsedDatabase.pathname === "/rik_r4_runtime_b5_v2",
  "DATABASE_NOT_CANONICAL_LOCAL");
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r9-wall-putty-web-reopen" });
  await client.connect();
  let backend: { child: ChildProcess; logs: string[] } | null = null;
  let broker: { child: ChildProcess; logs: string[] } | null = null;
  let web: Awaited<ReturnType<typeof ensureProductionGradeWebServer>> | null = null;
  const browser = await chromium.launch({ headless: true });
  const requests: Json[] = [];
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  try {
    const provider = localProviderPublicConfig();
    const release = (await client.query(
      "select source_commit,source_tree,status,activated_at,metadata from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0] as Json;
    const baseline = (await client.query(`select baseline.input_values
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_approved_template_baseline baseline
        on baseline.id=manifest.approved_template_baseline_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`,
    [RELEASE_ID, CATALOG_ID])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null
      && release.metadata?.masterSha256 === MASTER_SHA256,
    "RELEASE_NOT_PREPARED");
    invariant(baseline?.input_values && Object.keys(baseline.input_values).length === 16,
      "EXPLICIT_FIXTURE_MISSING");

    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, ORGANIZATION_ID, RELEASE_ID, SEARCH_RELEASE_ID, expiresAt,
      release.source_commit, release.source_tree, "runR9WallPuttyWebReopenAcceptance",
    ]);
    const frontendSourceTreeHash = String(release.source_tree);
    const frontendProductSourceHash = sha256(`${CONTRACT}:product:${release.source_tree}`);
    const frontendJsBundleFingerprint = sha256(`${CONTRACT}:web:${release.source_commit}`);
    const backendEnv = {
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: SEARCH_RELEASE_ID,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: SEARCH_RELEASE_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      R568_FRONTEND_SOURCE_TREE_HASH: frontendSourceTreeHash,
      R568_FRONTEND_PRODUCT_SOURCE_HASH: frontendProductSourceHash,
      R568_FRONTEND_JS_BUNDLE_FINGERPRINT: frontendJsBundleFingerprint,
      R568_FRONTEND_BUILD_COMMIT: release.source_commit,
      CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256: sha256(`${CONTRACT}:backend:${release.source_commit}`),
      CANONICAL_ESTIMATE_LOCAL_PORT: String(BACKEND_PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: resolve(OUTPUT_ROOT, `http-${runId}.jsonl`),
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "STRICT_SESSION_INTROSPECTION",
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: provider.apiUrl,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: provider.publicKey,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: sha256(`${CONTRACT}:artifact-secret`),
    };
    backend = await startBackend(backendEnv);
    broker = await startAuthBroker();
    const ownerSessionResponse = await fetch("http://127.0.0.1:54329/owner-session", {
      method: "POST",
      headers: { origin: "http://localhost:8081", "content-type": "application/json" },
      body: "{}",
    });
    const ownerSession = await ownerSessionResponse.json().catch(() => ({})) as Json;
    invariant(ownerSessionResponse.ok && typeof ownerSession.access_token === "string",
      `OWNER_SESSION_RED:${ownerSessionResponse.status}`);
    const compileAccepted = await backendApi(ownerSession.access_token, "jobs/compile", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `${CONTRACT}:${runId}:owner-compile`,
        catalogId: CATALOG_ID,
        parameters: { ...baseline.input_values, area_m2: 120 },
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: "Третья шпаклёвка стен CT 127, 120 м², расход 0,7 кг/м², слой 2 мм",
        primaryMeasureParameterId: "area_m2",
      }),
    });
    const compiledJob = await waitForBackendJob(ownerSession.access_token, String(compileAccepted.jobId));
    const webRevisionId = String(compiledJob.resultRevisionId ?? "");
    invariant(/^[0-9a-f-]{36}$/iu.test(webRevisionId), `OWNER_REVISION_ID_RED:${webRevisionId}`);
    const ownerRevision = await backendApi(ownerSession.access_token, `revisions/${webRevisionId}`);
    const ownerRows = await backendRows(ownerSession.access_token, webRevisionId);
    invariant(ownerRevision.releaseId === RELEASE_ID && ownerRevision.definitionVersionId === DEFINITION_ID
      && ownerRevision.catalogId === CATALOG_ID && Number(ownerRevision.parameters?.area_m2) === 120
      && ownerRows.length === 7,
    "OWNER_REVISION_CONTRACT_RED");
    const ownerMaterial = ownerRows.find((row) => row.rowId === MATERIAL_ROW);
    invariant(Number(ownerMaterial?.quantity) === 84 && ownerRows.every((row) => row.unitPrice == null),
      "OWNER_REVISION_QUANTITY_OR_PRICE_RED");
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = API_ROOT;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true";
    process.env.LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_APP_ENV = "local_developer";
    process.env.EXPO_PUBLIC_RELEASE_LABEL = "LOCAL_DEVELOPMENT";
    process.env.EXPO_PUBLIC_SUPABASE_URL = provider.apiUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = provider.publicKey;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID = RELEASE_ID;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID = SEARCH_RELEASE_ID;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID = capabilityId;
    process.env.EXPO_PUBLIC_BUILD_COMMIT = String(release.source_commit);
    process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = frontendSourceTreeHash;
    process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = frontendProductSourceHash;
    process.env.EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = frontendJsBundleFingerprint;
    process.env.EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE = "1";
    web = await ensureProductionGradeWebServer(WEB_ROOT, OUTPUT_ROOT, { requireOwned: true, readinessAttempts: 3 });

    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    await installSession(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text().slice(0, 2_000)); });
    page.on("response", (item: Response) => {
      if (!item.url().startsWith(`${API_ROOT}/`)) return;
      requests.push({ method: item.request().method(), path: new URL(item.url()).pathname,
        query: new URL(item.url()).search, status: item.status() });
    });
    context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });

    const route = `${WEB_ROOT}/request?canonicalRevisionId=${encodeURIComponent(webRevisionId)}&r9WallPutty=${runId}`;
    await page.goto(`${WEB_ROOT}/request?r9WallPuttyLogin=${runId}`,
      { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForTimeout(15_000);
    if (!await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) {
      const login = page.getByTestId("auth.login.local-consumer")
        .or(page.getByTestId("protected-identity-local-consumer-login")).first();
      if (await login.isVisible().catch(() => false)) {
        await enterLocalConsumer(page);
      } else {
        const diagnosticPath = resolve(OUTPUT_ROOT, `r9-wall-putty-${runId}-entry-diagnostic.png`);
        await page.screenshot({ path: diagnosticPath, fullPage: true });
        const diagnostic = await page.evaluate(() => ({
          url: location.href,
          body: document.body.innerText.slice(0, 5_000),
          testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) =>
            node.getAttribute("data-testid")).slice(0, 250),
        }));
        throw new Error(`R9_WALL_PUTTY_WEB:ENTRY_DIAGNOSTIC:${JSON.stringify({
          ...diagnostic, pageErrors, consoleErrors, diagnosticPath,
        })}`);
      }
    }
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 180_000 });
    await page.waitForTimeout(15_000);
    if (!await page.getByTestId("request-estimate-summary-card").isVisible().catch(() => false)) {
      const diagnosticPath = resolve(OUTPUT_ROOT, `r9-wall-putty-${runId}-revision-diagnostic.png`);
      await page.screenshot({ path: diagnosticPath, fullPage: true });
      const diagnostic = await page.evaluate(() => ({
        url: location.href,
        body: document.body.innerText.slice(0, 8_000),
        testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) =>
          node.getAttribute("data-testid")).slice(0, 300),
      }));
      throw new Error(`R9_WALL_PUTTY_WEB:REVISION_DIAGNOSTIC:${JSON.stringify({
        ...diagnostic, requests, pageErrors, consoleErrors, diagnosticPath,
      })}`);
    }
    await waitForStableExactRevision(page);
    const screenIdentity = await identity(page);
    invariant(screenIdentity.revisionId === webRevisionId && screenIdentity.releaseId === RELEASE_ID
      && screenIdentity.catalogId === CATALOG_ID,
    `SCREEN_IDENTITY:${JSON.stringify(screenIdentity)}`);
    const rows = await visibleRows(page);
    invariant(rows.length === 7, `VISIBLE_ROW_COUNT:${rows.length}`);
    const material = rows.find((row) => row.rowId === MATERIAL_ROW);
    invariant(material && /84(?:[,.]0+)?/u.test(String(material.quantity ?? material.text))
      && (material.unitPrice == null || material.unitPrice === "")
      && /Ceresit CT 127/u.test(String(material.text)),
    `MATERIAL_ROW_NOT_VISIBLE:${JSON.stringify(material)}`);
    invariant(rows.every((row) => row.unitPrice == null || row.unitPrice === ""),
      "UNKNOWN_PRICE_RENDERED_AS_NUMBER");
    const screenshot = resolve(OUTPUT_ROOT, `r9-wall-putty-${runId}-reopen.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    const procurementResponsePromise = page.waitForResponse((item) => item.request().method() === "GET"
      && item.url().includes(`/revisions/${webRevisionId}/artifacts/procurement`) && item.status() === 200,
    { timeout: 180_000 });
    const procurementAction = page.getByTestId("consumer-estimate-open-procurement").first();
    await procurementAction.waitFor({ state: "visible", timeout: 60_000 });
    const [procurementResponse] = await Promise.all([procurementResponsePromise, procurementAction.click()]);
    const procurement = await procurementResponse.json() as Json;
    invariant(procurement.status === "ready" && procurement.revisionId === webRevisionId
      && procurement.releaseId === RELEASE_ID
      && Number(procurement.metadata?.selectedProcurementRowCount) === 3,
    `PROCUREMENT_ACTION:${JSON.stringify(procurement)}`);

    const pdfResponsePromise = page.waitForResponse((item) => item.request().method() === "GET"
      && item.url().includes(`/revisions/${webRevisionId}/artifacts/pdf`) && item.status() === 200,
    { timeout: 180_000 });
    const pdfAction = page.getByTestId("consumer-estimate-make-pdf").first();
    await pdfAction.waitFor({ state: "visible", timeout: 60_000 });
    const [pdfResponse] = await Promise.all([pdfResponsePromise, pdfAction.click()]);
    const pdf = await pdfResponse.json() as Json;
    invariant(pdf.status === "ready" && pdf.revisionId === webRevisionId
      && pdf.releaseId === RELEASE_ID && typeof pdf.signedUrl === "string"
      && Number(pdf.metadata?.pageCount) === 2,
    `PDF_ACTION:${JSON.stringify(pdf)}`);

    const postsBeforeCold = requests.filter((request) => request.method === "POST").length;
    await page.goto(`${route}&cold=1`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    await waitForStableExactRevision(page);
    const coldIdentity = await identity(page);
    const coldRows = await visibleRows(page);
    const postsAfterCold = requests.filter((request) => request.method === "POST").length;
    invariant(coldIdentity.revisionId === webRevisionId && coldIdentity.releaseId === RELEASE_ID
      && coldRows.length === 7 && postsAfterCold === postsBeforeCold,
    "COLD_REOPEN_MUTATED_OR_DRIFTED");
    const coldScreenshot = resolve(OUTPUT_ROOT, `r9-wall-putty-${runId}-cold.png`);
    await page.screenshot({ path: coldScreenshot, fullPage: true });
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);

    const evidence = {
      schemaVersion: `${CONTRACT}.evidence.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      runId,
      releaseId: RELEASE_ID,
      searchReleaseId: SEARCH_RELEASE_ID,
      definitionId: DEFINITION_ID,
      revisionId: webRevisionId,
      route,
      web: {
        localAuthProviderOrigin: provider.origin,
        authBroker: { ownedByRun: true, principalCount: 10, credentialsPrinted: false },
        viewport: "1440x1100",
        visibleRows: rows.length,
        materialNetKg: 84,
        unknownPriceRows: rows.filter((row) => row.unitPrice == null || row.unitPrice === "").length,
        procurementAction: { ready: true, selectedRows: 3, sha256: procurement.sha256 },
        pdfAction: { ready: true, pageCount: pdf.metadata.pageCount, sha256: pdf.sha256 },
        coldReopen: { exactRevisionPreserved: true, mutationPosts: postsAfterCold - postsBeforeCold },
      },
      requests,
      pageErrors,
      consoleErrors,
      screenshots: [screenshot, coldScreenshot],
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      androidRestartPerformed: false,
      status: "GREEN_R9_WALL_PUTTY_REAL_WEB_REOPEN_PDF_PROCUREMENT_NOT_ACTIVE",
    };
    const sealed = { ...evidence, evidenceSha256: sha256(JSON.stringify(evidence)) };
    const reportPath = resolve(OUTPUT_ROOT, `web-reopen-${runId}.json`);
    atomicJson(reportPath, sealed);
    process.stdout.write(`${JSON.stringify({ status: evidence.status, reportPath, revisionId: webRevisionId,
      visibleRows: rows.length, materialNetKg: 84, procurementRows: 3, pdfPages: 2,
      coldReopenMutationPosts: 0, pageErrors: pageErrors.length }, null, 2)}\n`);
    await context.close();
  } finally {
    await browser.close().catch(() => undefined);
    web?.stop();
    if (broker) await stopChild(broker.child);
    if (backend) await stopChild(backend.child);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
