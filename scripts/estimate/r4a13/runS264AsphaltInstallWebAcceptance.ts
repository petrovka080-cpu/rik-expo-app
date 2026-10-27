import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Response } from "playwright";
import { Client } from "pg";

import { ensureProductionGradeWebServer } from "../../e2e/runProductionGradeEstimateWebSmoke";
import { ASPHALT_INSTALL_KRER27_CATALOG_ID } from "../../../src/lib/estimate/v4/asphaltInstallKrer27ProfileR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.s26-4.asphalt-install-web-acceptance.v1";
const MASTER_SHA256 = "a83e58cabc738d0a9265cda2a3a1061891a0b6009836ccbab0bac7f1a086e2d6";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const CREDENTIALS_PATH = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/s26-4/asphalt-install-web");
const BACKEND_PORT = Number(process.env.S264_ASPHALT_WEB_BACKEND_PORT ?? 8766);
const WEB_PORT = Number(process.env.S264_ASPHALT_WEB_PORT ?? 8082);
const API_ROOT = `http://127.0.0.1:${BACKEND_PORT}/canonical-estimate`;
const WEB_ROOT = `http://localhost:${WEB_PORT}`;
const ENVIRONMENT = "s26-4-asphalt-install-web-local";
const PROMPT = "асфальтирование 5000 м²";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`S264_ASPHALT_WEB:${code}`);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function localProviderPublicConfig(): { apiUrl: string; publicKey: string } {
  const providerRoot = resolve(".release-runtime/r52/runtime/a7-supabase-project");
  const candidates = [
    resolve(".release-runtime/r52/runtime/supabase-cli-2.105.0/supabase.exe"),
    resolve(process.env.USERPROFILE ?? "", ".local/share/supabase/v2.105.0/supabase.exe"),
  ];
  const cli = candidates.find((candidate) => existsSync(candidate));
  invariant(cli && existsSync(resolve(providerRoot, "supabase/config.toml")),
    "LOCAL_PROVIDER_CLI_OR_CONFIG_MISSING");
  const status = JSON.parse(execFileSync(cli, ["status", "-o", "json"], {
    cwd: providerRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  })) as Json;
  const apiUrl = String(status.API_URL ?? "").trim();
  let publicKey = String(status.PUBLISHABLE_KEY ?? status.ANON_KEY ?? "").trim();
  if (!publicKey) {
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Json;
    publicKey = String(credentials.publishable_key ?? "");
  }
  invariant(apiUrl === "http://127.0.0.1:54321" && publicKey.length > 20,
    "LOCAL_PROVIDER_CONFIG_RED");
  return { apiUrl, publicKey };
}

async function startChild(
  executable: string,
  args: string[],
  env: Json,
  readyMarker: string,
  timeoutMs: number,
): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(executable, args, {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise<void>((ready, reject) => {
    const timer = setTimeout(() => reject(new Error(
      `S264_ASPHALT_WEB:CHILD_READY_TIMEOUT:${readyMarker}:${logs.join("").slice(-3_000)}`,
    )), timeoutMs);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes(readyMarker)) {
        clearTimeout(timer);
        ready();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`S264_ASPHALT_WEB:CHILD_EARLY_EXIT:${code}:${logs.join("").slice(-3_000)}`));
    });
  });
  return { child, logs };
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function consumerSession(credentials: Json): Promise<Json> {
  const principal = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(principal?.email && principal?.password, "CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "content-type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
    signal: AbortSignal.timeout(30_000),
  });
  const session = await response.json().catch(() => ({})) as Json;
  invariant(response.ok && typeof session.access_token === "string"
    && typeof session.refresh_token === "string", `CONSUMER_LOGIN_${response.status}`);
  return session;
}

async function api(authorization: string, path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization,
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(180_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.ok, `HTTP_${response.status}:${path}:${JSON.stringify(body).slice(0, 2_000)}`);
  return body;
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows as Json[] : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function enterConsumer(page: Page): Promise<void> {
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
  throw new Error(`S264_ASPHALT_WEB:LOCAL_CONSUMER_LOGIN_RED:${JSON.stringify(diagnostic)}`);
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
      price: price?.value ?? null,
      hasPriceInput: Boolean(price),
    };
  }));
}

async function revisionIdentity(page: Page) {
  const row = page.locator('[id^="canonical-estimate-row-identity|"]').first();
  await row.waitFor({ state: "visible", timeout: 180_000 });
  const parts = String(await row.getAttribute("id") ?? "").split("|");
  invariant(/^[0-9a-f-]{36}$/iu.test(parts[1] ?? ""), `REVISION_ID_RED:${parts.join("|")}`);
  return { revisionId: parts[1]!, releaseId: parts[2] ?? "", catalogId: parts[3] ?? "" };
}

async function responseJson(response: Response): Promise<Json> {
  return response.json().catch(() => ({})) as Promise<Json>;
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const runId = randomUUID();
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Json;
  const releaseId = String(current.definitionReleaseId ?? "");
  const searchReleaseId = String(current.searchReleaseId ?? "");
  invariant(current.owner === "S26_4_ASPHALT_INSTALL_KRER27_SUCCESSOR", "CURRENT_OWNER_DRIFT");
  invariant(current.productionAccessed === false, "PRODUCTION_ACCESS_FLAG_RED");
  const provider = localProviderPublicConfig();
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.user_id && credentials.test_tenant_id, "CONSUMER_PRINCIPAL_MISSING");
  const initialSession = await consumerSession(credentials);

  const client = new Client({ connectionString: DATABASE_URL, application_name: "s26-4-asphalt-install-web" });
  await client.connect();
  let backend: { child: ChildProcess; logs: string[] } | null = null;
  let web: Awaited<ReturnType<typeof ensureProductionGradeWebServer>> | null = null;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 }, acceptDownloads: true });
  await context.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
  }, { key: "sb-127-auth-token", session: initialSession });
  const page = await context.newPage();
  const requests: Json[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  let authorization = "";
  page.on("request", (request) => {
    if (!request.url().startsWith(`${API_ROOT}/`)) return;
    const value = request.headers().authorization ?? "";
    if (value.startsWith("Bearer ")) authorization = value;
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${API_ROOT}/`)) return;
    requests.push({ method: response.request().method(), path: new URL(response.url()).pathname,
      query: new URL(response.url()).search, status: response.status() });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const locationUrl = message.location().url;
    consoleErrors.push(`${message.text().slice(0, 1_600)}${locationUrl ? ` @ ${locationUrl}` : ""}`);
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(
    `${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`,
  ));
  context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });

  try {
    const release = (await client.query(`select source_commit,source_tree,status,metadata
      from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
    invariant(release?.status === "prepared" && release.metadata?.masterSha256 === MASTER_SHA256,
      "RELEASE_PROVENANCE_RED");
    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await client.query(`update public.estimate_candidate_capability_r3 set revoked_at=now()
      where environment=$1 and tenant_id=$2 and release_id=$3 and search_release_id=$4
        and purpose='estimate_candidate_admission_r3' and revoked_at is null`, [
      ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
    ]);
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,
      source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, credentials.test_tenant_id, releaseId, searchReleaseId,
      expiresAt, release.source_commit, release.source_tree,
      "runS264AsphaltInstallWebAcceptance",
    ]);

    const frontendSourceTreeHash = String(release.source_tree);
    const frontendProductSourceHash = sha256(`${CONTRACT}:product:${release.source_tree}`);
    const frontendJsBundleFingerprint = sha256(`${CONTRACT}:web:${release.source_commit}`);
    const backendRuntimeSourceSha256 = sha256(`${CONTRACT}:backend:${release.source_commit}`);
    const auditLog = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    backend = await startChild(process.execPath, [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
    ], {
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_BINDING: "request-principal",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "STRICT_SESSION_INTROSPECTION",
      CANONICAL_ESTIMATE_SUPABASE_AUTH_URL: provider.apiUrl,
      CANONICAL_ESTIMATE_SUPABASE_AUTH_API_KEY: provider.publicKey,
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_MODE: "CANONICAL_RPC",
      CANONICAL_ESTIMATE_SUPABASE_PRINCIPAL_RPC: "r541_current_principal",
      CANONICAL_ESTIMATE_LOCAL_PORT: String(BACKEND_PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: sha256(`${CONTRACT}:${runId}:artifact`),
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      R568_FRONTEND_SOURCE_TREE_HASH: frontendSourceTreeHash,
      R568_FRONTEND_PRODUCT_SOURCE_HASH: frontendProductSourceHash,
      R568_FRONTEND_JS_BUNDLE_FINGERPRINT: frontendJsBundleFingerprint,
      R568_FRONTEND_BUILD_COMMIT: release.source_commit,
      CANONICAL_ESTIMATE_RUNTIME_SOURCE_SHA256: backendRuntimeSourceSha256,
    }, '"status":"READY"', 45_000);

    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = API_ROOT;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true";
    process.env.LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "1";
    process.env.EXPO_PUBLIC_APP_ENV = "local_developer";
    process.env.EXPO_PUBLIC_RELEASE_LABEL = "LOCAL_DEVELOPMENT";
    process.env.EXPO_PUBLIC_SUPABASE_URL = provider.apiUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = provider.publicKey;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID = releaseId;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID = searchReleaseId;
    process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID = capabilityId;
    process.env.EXPO_PUBLIC_BUILD_COMMIT = String(release.source_commit);
    process.env.EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH = frontendSourceTreeHash;
    process.env.EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH = frontendProductSourceHash;
    process.env.EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT = frontendJsBundleFingerprint;
    process.env.EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE = "1";
    web = await ensureProductionGradeWebServer(WEB_ROOT, OUTPUT_ROOT, { requireOwned: true, readinessAttempts: 3 });

    await page.goto(`${WEB_ROOT}/request?s264Asphalt=${runId}`, {
      waitUntil: "domcontentloaded", timeout: 180_000,
    });
    await enterConsumer(page);
    const input = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) => response.url().startsWith(`${API_ROOT}/search/catalog?`)
      && response.status() === 200, { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(PROMPT)]);
    const search = await responseJson(searchResponse);
    const searchItems = Array.isArray(search.items) ? search.items as Json[] : [];
    invariant(search.searchIndexReleaseId === searchReleaseId, "SEARCH_RELEASE_DRIFT");
    invariant(searchItems[0]?.catalogId === ASPHALT_INSTALL_KRER27_CATALOG_ID
      && searchItems[0]?.estimateReady === true,
    `SEARCH_FIRST_RESULT_RED:${searchItems.slice(0, 5).map((item) => item.catalogId).join(",")}`);
    await page.getByTestId("consumer-repair-work-suggestion-1").click();
    invariant(authorization.startsWith("Bearer "), "BACKEND_AUTHORIZATION_MISSING");

    const compilePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST", { timeout: 180_000 });
    const [compileResponse] = await Promise.all([
      compilePromise,
      page.getByTestId("consumer-repair-prepare-draft").click(),
    ]);
    invariant(compileResponse.status() === 202,
      `COMPILE_HTTP_${compileResponse.status()}:${JSON.stringify(await responseJson(compileResponse))}`);
    const identity = await revisionIdentity(page);
    invariant(identity.releaseId === releaseId && identity.catalogId === ASPHALT_INSTALL_KRER27_CATALOG_ID,
      "UI_REVISION_IDENTITY_RED");
    const revision = await api(authorization, `revisions/${identity.revisionId}`);
    const rows = await allRows(authorization, identity.revisionId);
    invariant(Number(revision.parameters?.area_m2) === 5_000, "AREA_EXTRACTION_RED");
    invariant((revision.preliminaryNeeds ?? []).length === 0 && rows.length === 56,
      `FIRST_ESTIMATE_RED:${rows.length}:${(revision.preliminaryNeeds ?? []).length}`);
    invariant(rows.every((row) => row.unitPrice == null && row.amount == null),
      "UNKNOWN_PRICE_BACKEND_RED");
    const visible = await visibleRows(page);
    invariant(visible.length === 56, `VISIBLE_ROW_COUNT_${visible.length}_EXPECTED_56`);
    invariant(visible.every((row) => typeof row.text === "string" && row.text.length > 5),
      "VISIBLE_ROW_TITLE_RED");
    invariant(visible.every((row) => row.price == null || row.price === ""),
      "UNKNOWN_PRICE_UI_RED");
    const rowCountText = await page.getByTestId("request-estimate-row-count").innerText().catch(() => "");
    invariant(rowCountText.includes("56"), `MEANINGFUL_PREVIEW_ROW_COUNT_RED:${rowCountText}`);
    const readyScreenshot = resolve(OUTPUT_ROOT, `s26-4-asphalt-${runId}-01-ready-56-rows.png`);
    await page.screenshot({ path: readyScreenshot, fullPage: true });

    const approve = page.getByTestId("consumer-repair-approve");
    await approve.waitFor({ state: "visible", timeout: 60_000 });
    const approvalDeadline = Date.now() + 60_000;
    while (!await approve.isEnabled() && Date.now() < approvalDeadline) await page.waitForTimeout(100);
    invariant(await approve.isEnabled(), `APPROVAL_BLOCKED_WITHOUT_PRICES:${await approve.getAttribute("aria-label")}`);
    const approvalArtifactPromise = page.waitForResponse((response) => response.request().method() === "POST"
      && response.url().includes(`/revisions/${identity.revisionId}/artifacts/pdf`), { timeout: 180_000 });
    const [approvalArtifactResponse] = await Promise.all([approvalArtifactPromise, approve.click()]);
    invariant(approvalArtifactResponse.status() === 202,
      `APPROVAL_ARTIFACT_HTTP_${approvalArtifactResponse.status()}`);
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "hidden", timeout: 180_000 });
    const archivalPdf = await api(authorization, `revisions/${identity.revisionId}/artifacts/pdf`);
    invariant(archivalPdf.status === "ready" && archivalPdf.revisionId === identity.revisionId,
      "APPROVAL_PDF_RED");
    const approvedScreenshot = resolve(OUTPUT_ROOT, `s26-4-asphalt-${runId}-02-approved-without-prices.png`);
    await page.screenshot({ path: approvedScreenshot, fullPage: true });

    const postsBeforeCold = requests.filter((request) => request.method === "POST").length;
    await page.goto(`${WEB_ROOT}/request?canonicalRevisionId=${encodeURIComponent(identity.revisionId)}&cold=${runId}`, {
      waitUntil: "domcontentloaded", timeout: 180_000,
    });
    const meaningfulPreview = page.getByTestId("consumer-estimate-meaningful-preview");
    if (await meaningfulPreview.isVisible().catch(() => false)) {
      const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
      await openFullEstimate.waitFor({ state: "visible", timeout: 60_000 });
      await openFullEstimate.click();
      await meaningfulPreview.waitFor({ state: "hidden", timeout: 60_000 });
    }
    const coldIdentity = await revisionIdentity(page);
    invariant(JSON.stringify(coldIdentity) === JSON.stringify(identity), "COLD_REOPEN_IDENTITY_RED");
    const coldVisible = await visibleRows(page);
    invariant(coldVisible.length === 56, `COLD_VISIBLE_ROW_COUNT_${coldVisible.length}`);
    const postsAfterCold = requests.filter((request) => request.method === "POST").length;
    invariant(postsAfterCold === postsBeforeCold, "COLD_REOPEN_CREATED_MUTATION");

    const procurementPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${identity.revisionId}/artifacts/procurement`)
      && response.status() === 200, { timeout: 180_000 });
    const procurementAction = page.getByTestId("consumer-estimate-open-procurement").first();
    await procurementAction.waitFor({ state: "visible", timeout: 60_000 });
    // The cold hydration publishes its meaningful preview asynchronously. Use
    // the ordinary UI action once it is present instead of clicking through
    // the overlay into controls underneath it.
    if (await meaningfulPreview.isVisible().catch(() => false)) {
      const openFullEstimate = page.getByTestId("consumer-estimate-open-full-estimate");
      await openFullEstimate.waitFor({ state: "visible", timeout: 60_000 });
      const fullEstimateDeadline = Date.now() + 60_000;
      while (!await openFullEstimate.isEnabled() && Date.now() < fullEstimateDeadline) {
        await page.waitForTimeout(100);
      }
      invariant(await openFullEstimate.isEnabled(), "COLD_FULL_ESTIMATE_ACTION_DISABLED");
      await openFullEstimate.click();
      await meaningfulPreview.waitFor({ state: "hidden", timeout: 60_000 });
    }
    const [procurementResponse] = await Promise.all([procurementPromise, procurementAction.click()]);
    const procurement = await responseJson(procurementResponse);
    invariant(procurement.status === "ready" && procurement.revisionId === identity.revisionId
      && procurement.releaseId === releaseId, "PROCUREMENT_UI_RED");

    const pdfPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${identity.revisionId}/artifacts/pdf`)
      && response.status() === 200, { timeout: 180_000 });
    const [pdfResponse] = await Promise.all([
      pdfPromise,
      page.getByTestId("consumer-estimate-make-pdf").first().click(),
    ]);
    const professionalPdf = await responseJson(pdfResponse);
    invariant(professionalPdf.status === "ready" && professionalPdf.revisionId === identity.revisionId
      && professionalPdf.releaseId === releaseId && typeof professionalPdf.signedUrl === "string",
    "PROFESSIONAL_PDF_UI_RED");
    const pdfDownload = await fetch(professionalPdf.signedUrl, { signal: AbortSignal.timeout(180_000) });
    invariant(pdfDownload.ok, `PROFESSIONAL_PDF_DOWNLOAD_${pdfDownload.status}`);
    const pdfBytes = Buffer.from(await pdfDownload.arrayBuffer());
    invariant(pdfBytes.subarray(0, 4).toString("ascii") === "%PDF"
      && sha256(pdfBytes) === professionalPdf.sha256,
    "PROFESSIONAL_PDF_BYTES_RED");
    const pdfPath = resolve(OUTPUT_ROOT, `S26_4_ASPHALT_5000_${runId}.pdf`);
    writeFileSync(pdfPath, pdfBytes);
    await page.getByTestId("pdf-viewer-web-iframe").waitFor({ state: "visible", timeout: 180_000 });
    const coldScreenshot = resolve(OUTPUT_ROOT, `s26-4-asphalt-${runId}-03-cold-pdf-procurement.png`);
    await page.screenshot({ path: coldScreenshot, fullPage: true });

    const dbAudit = (await client.query(`select revision.id,revision.owner_user_id,
        revision.organization_id,revision.release_id,revision.catalog_id,revision.row_count,
        count(row.row_id)::int persisted_rows,
        count(*) filter(where row.unit_price is null)::int unknown_price_rows
      from public.estimate_revision revision join public.estimate_revision_row row on row.revision_id=revision.id
      where revision.id=$1 group by revision.id`, [identity.revisionId])).rows[0] as Json;
    invariant(dbAudit.owner_user_id === consumer.user_id
      && dbAudit.organization_id === credentials.test_tenant_id
      && Number(dbAudit.persisted_rows) === 56
      && Number(dbAudit.unknown_price_rows) === 56,
    `DATABASE_AUDIT_RED:${JSON.stringify(dbAudit)}`);
    const expectedLifecycleAborts = requestFailures.filter((failure) =>
      failure.includes("ERR_ABORTED") && failure.includes("/artifact-files/"));
    const unexpectedFailures = requestFailures.filter((failure) => !expectedLifecycleAborts.includes(failure));
    const expectedArtifactProbeErrors = consoleErrors.filter((error) =>
      error.includes("404 (Not Found)")
      && error.includes(`/revisions/${identity.revisionId}/artifacts/`)
      && (error.includes("/procurement") || error.includes("/pdf"))
    );
    const unexpectedConsoleErrors = consoleErrors.filter((error) =>
      !expectedArtifactProbeErrors.includes(error));
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    invariant(unexpectedConsoleErrors.length === 0,
      `CONSOLE_ERRORS:${unexpectedConsoleErrors.join("|")}`);
    invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);

    const reportUnsigned = {
      contract: CONTRACT,
      generatedAt: new Date().toISOString(),
      runId,
      status: "GREEN_S26_4_ASPHALT_INSTALL_WEB_56_ROWS_APPROVAL_WITHOUT_PRICES_PDF_PROCUREMENT",
      masterSha256: MASTER_SHA256,
      productionAccessed: false,
      definitionReleaseId: releaseId,
      searchReleaseId,
      prompt: PROMPT,
      authentication: { mode: "STRICT_SESSION_INTROSPECTION", role: "consumer",
        ownerUserId: consumer.user_id, organizationId: credentials.test_tenant_id },
      search: { rawQuery: search.rawQuery, normalizedQuery: search.normalizedQuery,
        firstCatalogId: searchItems[0]?.catalogId, firstMatchType: searchItems[0]?.matchType,
        parsedQuantity: search.parsedQuantity, parsedUnit: search.parsedUnit },
      estimate: { revisionId: identity.revisionId, rowCount: rows.length,
        visibleRowCount: visible.length, coldVisibleRowCount: coldVisible.length,
        unknownPriceRows: rows.filter((row) => row.unitPrice == null).length,
        blockingNeeds: (revision.preliminaryNeeds ?? []).length, rowCountText,
        hotMixT: rows.find((row) => row.rowId === "asphalt:material:hot-dense-fine-mix")?.quantity,
        deliveryTruckMachineHours: rows.find((row) => row.rowId === "asphalt:delivery:truck-machine-hours")?.quantity },
      approval: { approved: true, pricesProvided: 0,
        archivalPdfArtifactId: archivalPdf.artifactId, archivalPdfSha256: archivalPdf.sha256 },
      procurement: { artifactId: procurement.artifactId, revisionId: procurement.revisionId,
        releaseId: procurement.releaseId, selectedRowCount: procurement.metadata?.selectedProcurementRowCount },
      professionalPdf: { artifactId: professionalPdf.artifactId, revisionId: professionalPdf.revisionId,
        releaseId: professionalPdf.releaseId, sha256: professionalPdf.sha256,
        byteSize: pdfBytes.length, path: pdfPath },
      reopen: { exactRevisionPreserved: true, mutationPosts: postsAfterCold - postsBeforeCold },
      databaseAudit: dbAudit,
      requests,
      pageErrors,
      consoleErrors: unexpectedConsoleErrors,
      expectedArtifactProbeErrors,
      requestFailures: unexpectedFailures,
      screenshots: [readyScreenshot, approvedScreenshot, coldScreenshot],
      requestAuditLog: auditLog,
    };
    const report = { ...reportUnsigned, sha256: sha256(JSON.stringify(stable(reportUnsigned))) };
    const outputPath = resolve(OUTPUT_ROOT, `acceptance-${runId}.json`);
    atomicJson(outputPath, report);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), report);
    process.stdout.write(`${JSON.stringify({
      status: report.status,
      outputPath,
      revisionId: identity.revisionId,
      visibleRowCount: visible.length,
      approvedWithoutPrices: true,
      pdfSha256: professionalPdf.sha256,
      procurementRowCount: procurement.metadata?.selectedProcurementRowCount,
    }, null, 2)}\n`);
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
    if (web?.owned_by_current_run) web.stop();
    if (backend) await stopChild(backend.child).catch(() => undefined);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
