import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";

import { ensureProductionGradeWebServer } from "../../e2e/runProductionGradeEstimateWebSmoke";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.asphalt-web-acceptance.v1";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const USE_RUNNING_LOCAL_DEVELOPER = process.env.R6_WEB_ACCEPTANCE_USE_RUNNING_LOCAL_DEVELOPER === "1";
const BACKEND_PORT = Number(process.env.R6_WEB_ACCEPTANCE_BACKEND_PORT ?? (USE_RUNNING_LOCAL_DEVELOPER ? 8765 : 8797));
const WEB_PORT = Number(process.env.R6_WEB_ACCEPTANCE_WEB_PORT ?? (USE_RUNNING_LOCAL_DEVELOPER ? 8081 : 8176));
const API_ROOT = `http://127.0.0.1:${BACKEND_PORT}${USE_RUNNING_LOCAL_DEVELOPER ? "" : "/canonical-estimate"}`;
const WEB_ROOT = `http://127.0.0.1:${WEB_PORT}`;
const TOKEN = "local-dev-runtime-token";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const PROJECT_REF = "nxrnjywzxxfdpqmzjorh";
const ENVIRONMENT = "r6-asphalt-web-isolated";
const CATALOG_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_install_standard";
const MIX_ROW_ID = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_install_standard_professional_expanded_v1:r555:2";
const TACK_ROW_ID = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_install_standard_professional_expanded_v1:r555:1";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/web-acceptance");
let backendAuthorization = `Bearer ${TOKEN}`;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
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
  const expiresAt = issuedAt + 86_400;
  return {
    // The UI reads the complete session object from durable auth storage. The
    // isolated backend deliberately accepts only the deterministic proof token.
    access_token: TOKEN,
    token_type: "bearer",
    expires_in: 86_400,
    expires_at: expiresAt,
    refresh_token: "proof-refresh-disabled",
    user: {
      id: OWNER_ID,
      aud: "authenticated",
      role: "authenticated",
      email: "r6-asphalt-web@example.invalid",
      email_confirmed_at: new Date(issuedAt * 1_000).toISOString(),
      phone: "",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date(issuedAt * 1_000).toISOString(),
      updated_at: new Date(issuedAt * 1_000).toISOString(),
    },
    // Keep a syntactically valid identity token alongside the transport token
    // for diagnostics without ever sending it to the backend.
    proof_identity: `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({ sub: OWNER_ID })}.proof`,
  };
}

async function response(path: string, init?: RequestInit): Promise<{ status: number; body: Json }> {
  const result = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: backendAuthorization,
      ...(init?.body == null ? {} : { "content-type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  return { status: result.status, body: await result.json().catch(() => ({})) as Json };
}

async function api(path: string): Promise<Json> {
  const result = await response(path);
  invariant(result.status >= 200 && result.status < 300, `R6_WEB_API_${result.status}:${path}:${JSON.stringify(result.body)}`);
  return result.body;
}

async function history(): Promise<Json[]> {
  const result = await api(`revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
  return Array.isArray(result.revisions) ? result.revisions : [];
}

async function allRows(revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const result = await api(`revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(result.rows) ? result.rows : []));
    cursor = result.nextCursor == null ? null : String(result.nextCursor);
  } while (cursor);
  return rows;
}

async function explicitFixture(client: Client, releaseId: string): Promise<Record<string, unknown>> {
  const result = await client.query(`select baseline.input_values,
      jsonb_agg(parameter.parameter_id order by parameter.ordinal)
        filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT') user_parameter_ids
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=$2
    group by baseline.input_values`, [releaseId, CATALOG_ID]);
  const row = result.rows[0] as Json | undefined;
  invariant(row && Array.isArray(row.user_parameter_ids), "R6_WEB_EXPLICIT_FIXTURE_MISSING");
  const parameters = Object.fromEntries(row.user_parameter_ids.flatMap((parameterId: string) =>
    Object.prototype.hasOwnProperty.call(row.input_values, parameterId)
      ? [[parameterId, row.input_values[parameterId]]]
      : []));
  invariant(Object.keys(parameters).length > 0, "R6_WEB_EXPLICIT_FIXTURE_EMPTY");
  return parameters;
}

async function poll<T>(owner: string, read: () => Promise<T | null>, timeoutMs = 120_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await read();
    if (value != null) return value;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`${owner}_TIMEOUT`);
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
    const timer = setTimeout(() => rejectReady(new Error(`R6_WEB_BACKEND_READY_TIMEOUT:${logs.join("").slice(-3000)}`)), 45_000);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timer);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timer);
      rejectReady(new Error(`R6_WEB_BACKEND_EARLY_EXIT:${code}:${logs.join("").slice(-3000)}`));
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

function installSession(context: BrowserContext): Promise<void> {
  return context.addInitScript(({ key, session }) => {
    window.localStorage.setItem(key, JSON.stringify(session));
  }, { key: `sb-${PROJECT_REF}-auth-token`, session: proofSession() });
}

async function enterLocalConsumer(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const login = page.getByTestId("auth.login.local-consumer")
      .or(page.getByTestId("protected-identity-local-consumer-login"));
    if (attempt === 0) await login.first().waitFor({ state: "visible", timeout: 180_000 });
    if (!await login.first().isVisible().catch(() => false)) {
      const readyWithoutRetry = await page.getByTestId("consumer-repair-problem-input")
        .waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false);
      if (readyWithoutRetry) return;
      break;
    }
    await login.first().click();
    const ready = await page.getByTestId("consumer-repair-problem-input")
      .waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false);
    if (ready) return;
  }
  {
    const diagnostic = await page.evaluate(() => ({
      url: window.location.href,
      body: document.body.innerText.slice(0, 5_000),
      testIds: Array.from(document.querySelectorAll("[data-testid]"), (node) => node.getAttribute("data-testid")).slice(0, 200),
    }));
    throw new Error(`R6_WEB_LOCAL_CONSUMER_LOGIN_RED:${JSON.stringify(diagnostic)}`);
  }
}

async function openParameterPanel(page: Page): Promise<void> {
  if (await page.getByTestId("request-estimate-parameter-panel").count() === 0) {
    await page.getByTestId("request-estimate-parameters-toggle").click();
    await page.getByTestId("request-estimate-parameter-panel").waitFor({ state: "visible", timeout: 30_000 });
  }
}

async function fillParameter(page: Page, key: string, value: string): Promise<void> {
  await openParameterPanel(page);
  let editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  for (let attempt = 0; attempt < 20 && await editor.count() === 0; attempt += 1) {
    const more = page.getByTestId("request-estimate-show-more-parameters");
    if (await more.count() > 0) {
      await more.click();
      await page.waitForTimeout(50);
    } else {
      const filled = page.getByTestId("request-estimate-filled-parameters-toggle");
      if (await filled.count() > 0) await filled.click();
      break;
    }
    editor = page.getByTestId(`editable-param-inline-editor-${key}`);
  }
  const activeEditor = editor.filter({ visible: true }).first();
  try {
    await activeEditor.waitFor({ state: "visible", timeout: 30_000 });
  } catch (error) {
    const visibleEditors = await page.locator('[data-testid^="editable-param-inline-editor-"]')
      .evaluateAll((nodes) => nodes.map((node) => ({ testId: node.getAttribute("data-testid"),
        visible: Boolean((node as HTMLElement).offsetWidth || (node as HTMLElement).offsetHeight) })));
    throw new Error(`R6_WEB_PARAMETER_EDITOR_MISSING:${key}:${JSON.stringify(visibleEditors)}:${error instanceof Error ? error.message : String(error)}`);
  }
  await activeEditor.scrollIntoViewIfNeeded();
  const option = page.getByTestId(`editable-param-option-${key}-${value}`).filter({ visible: true });
  if (await option.count() > 0) {
    await option.first().click();
  } else {
    const input = activeEditor.getByTestId("editable-param-popover-input");
    await input.fill(value);
    invariant(await input.inputValue() === value, `R6_WEB_PARAMETER_VALUE_REJECTED:${key}`);
  }
}

async function draftIdFromStorage(page: Page): Promise<string> {
  return poll("R6_WEB_DRAFT_STORAGE", async () => page.evaluate(() => {
    const manifestEntry = Object.entries(window.localStorage)
      .find(([key]) => key.includes("consumer") && key.includes("manifest"));
    if (manifestEntry) {
      try {
        const manifest = JSON.parse(String(manifestEntry[1]));
        const id = Array.isArray(manifest.bundleIds) ? manifest.bundleIds.at(-1) : null;
        if (typeof id === "string" && id) return id;
      } catch { /* try records below */ }
    }
    const record = Object.entries(window.localStorage).find(([key]) => key.includes("consumer") && key.includes("bundle"));
    if (!record) return null;
    const match = record[0].match(/bundle[:_-](.+)$/u);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }));
}

async function visibleRowText(page: Page, rowId: string): Promise<string> {
  // Consumer rows have durable local item ids, while the backend row id is
  // retained in the canonical native identity. Assert against that immutable
  // identity instead of coupling the proof to a generated local bundle id.
  const selector = `[id^="canonical-estimate-row-identity|"][id$="|${rowId}"]`;
  const row = page.locator(selector);
  if (await row.count() === 0) {
    const positionsPanel = page.getByTestId("request-estimate-positions-panel");
    if (await positionsPanel.count() === 0) {
      await page.getByTestId("request-estimate-positions-toggle").click();
      await positionsPanel.waitFor({ state: "visible", timeout: 30_000 });
    }
  }
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      // The estimate panel replaces a row node while applying a saved backend
      // revision. Resolve the locator again on every attempt so evidence
      // capture never holds a detached pre-revision element handle.
      const current = page.locator(selector).first();
      await current.waitFor({ state: "visible", timeout: 60_000 });
      await current.scrollIntoViewIfNeeded();
      const text = await current.innerText();
      const quantityInput = current.locator('[data-testid^="consumer-repair-item-quantity-input-"]');
      const quantity = await quantityInput.count() > 0 ? await quantityInput.first().inputValue() : "";
      return `${text}\n${quantity}`.trim();
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(100);
    }
  }
  {
    const visibleRows = await page.locator('[id^="canonical-estimate-row-identity|"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("id")).slice(0, 100));
    throw new Error(`R6_WEB_ROW_NOT_VISIBLE:${rowId}:${JSON.stringify(visibleRows)}:${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }
}

async function main(): Promise<void> {
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.owner === "R4_A13_6_ASPHALT_GABION_OWNER", "R6_WEB_CURRENT_RELEASE_NOT_R6");
  const releaseId = String(current.definitionReleaseId);
  const searchReleaseId = String(current.searchReleaseId);
  const runId = randomUUID();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-asphalt-web-acceptance" });
  await client.connect();
  let backend: { child: ChildProcess; logs: string[] } | null = null;
  let web: Awaited<ReturnType<typeof ensureProductionGradeWebServer>> | null = null;
  const browser = await chromium.launch({ headless: true });
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const requestTrace: Json[] = [];
  try {
    const release = (await client.query(
      "select source_commit,source_tree,status from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json;
    invariant(release?.status === "prepared", "R6_WEB_RELEASE_NOT_PREPARED");
    const asphaltFixture = await explicitFixture(client, releaseId);
    const capabilityId = USE_RUNNING_LOCAL_DEVELOPER
      ? String((await client.query(`select id from public.estimate_candidate_capability_r3
          where release_id=$1 and search_release_id=$2 and revoked_at is null and expires_at>now()
          order by created_at desc limit 1`, [releaseId, searchReleaseId])).rows[0]?.id ?? "")
      : randomUUID();
    invariant(/^[0-9a-f-]{36}$/iu.test(capabilityId), "R6_WEB_CAPABILITY_MISSING");
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    if (!USE_RUNNING_LOCAL_DEVELOPER) {
      await client.query(`insert into public.estimate_candidate_capability_r3(
        id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by)
        values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
        capabilityId, ENVIRONMENT, ORGANIZATION_ID, releaseId, searchReleaseId, expiresAt,
        release.source_commit, release.source_tree, "runR6AsphaltWebAcceptance",
      ]);
    }
    const auditLog = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    const backendEnv = {
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
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: current.definitionSnapshotSha256,
      CANONICAL_ESTIMATE_LOCAL_PORT: String(BACKEND_PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "DETERMINISTIC_FIXTURE",
    };
    if (!USE_RUNNING_LOCAL_DEVELOPER) {
      backend = await startBackend(backendEnv);
      process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL = API_ROOT;
      process.env.EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK = "true";
      process.env.EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW = "0";
      process.env.EXPO_PUBLIC_PROOF_RUNNER_DISABLE_SUPABASE_AUTH_PERSISTENCE = "1";
      web = await ensureProductionGradeWebServer(WEB_ROOT, OUTPUT_ROOT, { requireOwned: true, readinessAttempts: 3 });
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
    if (!USE_RUNNING_LOCAL_DEVELOPER) await installSession(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("response", (item: Response) => {
      if (item.url().startsWith(`${API_ROOT}/`)) requestTrace.push({
        at: new Date().toISOString(),
        method: item.request().method(),
        url: item.url().replace(/([?&](?:token|signature|key)=[^&]+)/giu, "$1REDACTED"),
        status: item.status(),
      });
    });
    page.on("request", (item) => {
      if (!item.url().startsWith(`${API_ROOT}/`)) return;
      const authorization = item.headers()["authorization"];
      if (authorization) backendAuthorization = authorization;
    });
    context.on("page", (opened) => { if (opened !== page) void opened.close().catch(() => undefined); });

    const prompt = "Ремонт асфальтового покрытия, площадь 500 м²";
    const route = `${WEB_ROOT}/request?catalogWorkId=${encodeURIComponent(CATALOG_ID)}&prompt=${encodeURIComponent(prompt)}&autoPrepare=1`;
    if (USE_RUNNING_LOCAL_DEVELOPER) {
      await page.goto(`${WEB_ROOT}/request`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.getByTestId("local-developer-review-banner").waitFor({ state: "visible", timeout: 180_000 });
      await enterLocalConsumer(page);
    }
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ state: "visible", timeout: 120_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 180_000 });
    const initialIdentity = await page.locator('[id^="canonical-estimate-row-identity|"]').first()
      .getAttribute("id", { timeout: 60_000 });
    const initialRevisionId = String(initialIdentity ?? "").split("|")[1] ?? "";
    invariant(/^[0-9a-f-]{36}$/iu.test(initialRevisionId), `R6_WEB_INITIAL_REVISION_ID_MISSING:${initialIdentity}`);
    const initial = await api(`revisions/${initialRevisionId}`);
    const initialRows = await allRows(String(initial.revisionId));
    const initialRevision = initial;
    invariant(initial.releaseId === releaseId, "R6_WEB_INITIAL_RELEASE_MISMATCH");
    invariant(initialRows.length > 0, "R6_WEB_INITIAL_INDEPENDENT_ROWS_MISSING");
    invariant(!initialRows.some((row) => row.rowId === MIX_ROW_ID || row.rowId === TACK_ROW_ID),
      "R6_WEB_INITIAL_HIDDEN_DEFAULT_ROWS_VISIBLE");
    invariant((initialRevision.preliminaryNeeds ?? []).length > 0, "R6_WEB_INITIAL_NEEDS_MISSING");
    const missingStatus = await page.getByTestId("request-estimate-parameter-status").innerText();
    invariant(/\d+/u.test(missingStatus), "R6_WEB_INITIAL_MISSING_STATUS_NOT_VISIBLE");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-web-${runId}-missing.png`), fullPage: true });

    const explicitUiInputs: Record<string, number> = {
      ...asphaltFixture,
      area_m2: 500,
      thickness_mm: 50,
      density_t_m3: 2.4,
      waste_factor: 1.03,
      tack_coat_l_m2: 0.3,
    };
    const deferredTransportInputs = new Set([
      "truck_average_speed_km_per_machine_hour",
      "truck_turnaround_machine_hours",
    ]);
    for (const [parameterId, value] of Object.entries(explicitUiInputs)) {
      if (parameterId === "area_m2" || deferredTransportInputs.has(parameterId)) continue;
      await fillParameter(page, parameterId, String(value));
    }
    const firstAccepted = page.waitForResponse((item) => item.request().method() === "POST"
      && item.url().endsWith("/jobs/recalculate") && item.status() === 202, { timeout: 60_000 });
    await page.getByTestId("editable-param-batch-apply").first().click();
    await firstAccepted;
    const intermediate = await poll("R6_WEB_INTERMEDIATE_REVISION", async () => {
      const entries = await history();
      return entries.find((item) => item.parentRevisionId === initial.revisionId) ?? null;
    });
    const intermediateMissing = new Set((intermediate.preliminaryNeeds ?? [])
      .flatMap((need: Json) => need.missingParameterIds ?? []));
    invariant(intermediateMissing.size === deferredTransportInputs.size
      && [...deferredTransportInputs].every((parameterId) => intermediateMissing.has(parameterId)),
    `R6_WEB_INTERMEDIATE_NEEDS_MISMATCH:${JSON.stringify([...intermediateMissing])}`);
    const intermediateUiStatus = await poll("R6_WEB_INTERMEDIATE_UI_REVISION", async () => {
      const status = await page.getByTestId("request-estimate-parameter-status")
        .innerText().catch(() => "");
      return /(?:^|\D)2(?:\D|$)/u.test(status) ? status : null;
    }, 90_000);

    for (const parameterId of deferredTransportInputs) {
      await fillParameter(page, parameterId, String(explicitUiInputs[parameterId]));
    }
    const finalAccepted = page.waitForResponse((item) => item.request().method() === "POST"
      && item.url().endsWith("/jobs/recalculate") && item.status() === 202, { timeout: 60_000 });
    await page.getByTestId("editable-param-batch-apply").first().click();
    await finalAccepted;
    const child = await poll("R6_WEB_CHILD_REVISION", async () => {
      const entries = await history();
      return entries.find((item) => item.parentRevisionId === intermediate.revisionId) ?? null;
    });
    const childRows = await allRows(String(child.revisionId));
    const mix = childRows.find((row) => row.rowId === MIX_ROW_ID);
    const tack = childRows.find((row) => row.rowId === TACK_ROW_ID);
    invariant(mix && tack, "R6_WEB_REQUIRED_RESULT_ROWS_MISSING");
    invariant(child.status === "ready", `R6_WEB_CHILD_NOT_READY:${String(child.status)}`);
    invariant((child.preliminaryNeeds ?? []).length === 0,
      `R6_WEB_CHILD_NEEDS_REMAIN:${(child.preliminaryNeeds ?? []).length}`);
    invariant(Math.abs(Number(mix?.quantity) - 61.8) < 1e-8, `R6_WEB_MIX_QUANTITY:${String(mix?.quantity)}`);
    invariant(Math.abs(Number(tack?.quantity) - 150) < 1e-8, `R6_WEB_TACK_QUANTITY:${String(tack?.quantity)}`);
    await page.getByTestId("request-estimate-parameter-apply-status").waitFor({ state: "visible", timeout: 60_000 });
    const mixText = await visibleRowText(page, MIX_ROW_ID);
    const tackText = await visibleRowText(page, TACK_ROW_ID);
    invariant(/61[,.]8/u.test(mixText), `R6_WEB_MIX_NOT_VISIBLE:${mixText}`);
    invariant(/150/u.test(tackText), `R6_WEB_TACK_NOT_VISIBLE:${tackText}`);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-web-${runId}-positive.png`), fullPage: true });

    const draftId = await draftIdFromStorage(page);
    const postsBeforeReload = requestTrace.filter((item) => item.method === "POST").length;
    await page.goto(`${WEB_ROOT}/request?draftId=${encodeURIComponent(draftId)}`, {
      waitUntil: "domcontentloaded", timeout: 120_000,
    });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 120_000 });
    const postsAfterReload = requestTrace.filter((item) => item.method === "POST").length;
    invariant(postsAfterReload === postsBeforeReload, "R6_WEB_RELOAD_CREATED_MUTATION");
    const reloadedMixText = await visibleRowText(page, MIX_ROW_ID);
    invariant(/61[,.]8/u.test(reloadedMixText), "R6_WEB_RELOAD_MIX_NOT_VISIBLE");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-web-${runId}-reload.png`), fullPage: true });

    await fillParameter(page, "thickness_mm", "40");
    const sensitivityAccepted = page.waitForResponse((item) => item.request().method() === "POST"
      && item.url().endsWith("/jobs/recalculate") && item.status() === 202, { timeout: 60_000 });
    await page.getByTestId("editable-param-batch-apply").first().click();
    await sensitivityAccepted;
    const sensitivity = await poll("R6_WEB_SENSITIVITY_REVISION", async () => {
      const entries = await history();
      return entries.find((item) => item.parentRevisionId === child.revisionId) ?? null;
    });
    const sensitivityRows = await allRows(String(sensitivity.revisionId));
    const sensitivityMix = sensitivityRows.find((row) => row.rowId === MIX_ROW_ID);
    const sensitivityTack = sensitivityRows.find((row) => row.rowId === TACK_ROW_ID);
    invariant(sensitivityMix && sensitivityTack, "R6_WEB_SENSITIVITY_RESULT_ROWS_MISSING");
    invariant((sensitivity.preliminaryNeeds ?? []).length === 0,
      `R6_WEB_SENSITIVITY_NEEDS_REMAIN:${(sensitivity.preliminaryNeeds ?? []).length}`);
    invariant(Math.abs(Number(sensitivityMix?.quantity) - 49.44) < 1e-8,
      `R6_WEB_SENSITIVITY_MIX_QUANTITY:${String(sensitivityMix?.quantity)}`);
    invariant(Math.abs(Number(sensitivityTack?.quantity) - 150) < 1e-8,
      `R6_WEB_SENSITIVITY_TACK_QUANTITY:${String(sensitivityTack?.quantity)}`);
    const sensitivityMixText = await poll("R6_WEB_SENSITIVITY_UI_REVISION", async () => {
      const text = await visibleRowText(page, MIX_ROW_ID).catch(() => "");
      return /49[,.]44/u.test(text) ? text : null;
    }, 90_000);
    const sensitivityTackText = await visibleRowText(page, TACK_ROW_ID);
    invariant(/150/u.test(sensitivityTackText), `R6_WEB_SENSITIVITY_TACK_NOT_VISIBLE:${sensitivityTackText}`);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-web-${runId}-thickness-40.png`), fullPage: true });

    const postsBeforeSensitivityReload = requestTrace.filter((item) => item.method === "POST").length;
    await page.goto(`${WEB_ROOT}/request?draftId=${encodeURIComponent(draftId)}`, {
      waitUntil: "domcontentloaded", timeout: 120_000,
    });
    await page.getByTestId("request-estimate-summary-card").waitFor({ state: "visible", timeout: 120_000 });
    const postsAfterSensitivityReload = requestTrace.filter((item) => item.method === "POST").length;
    invariant(postsAfterSensitivityReload === postsBeforeSensitivityReload,
      "R6_WEB_SENSITIVITY_RELOAD_CREATED_MUTATION");
    const sensitivityReloadedMixText = await visibleRowText(page, MIX_ROW_ID);
    invariant(/49[,.]44/u.test(sensitivityReloadedMixText), "R6_WEB_SENSITIVITY_RELOAD_MIX_NOT_VISIBLE");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, `r6-web-${runId}-thickness-40-reload.png`), fullPage: true });

    const reportUnsigned = {
      contract: CONTRACT,
      runId,
      generatedAt: new Date().toISOString(),
      definitionReleaseId: releaseId,
      searchReleaseId,
      capabilityId,
      candidateStatus: release.status,
      route,
      initial: {
        revisionId: initial.revisionId,
        revisionNumber: initial.revisionNumber,
        rowCount: initialRows.length,
        needsCount: initialRevision.preliminaryNeeds.length,
        mixRows: initialRows.filter((row) => row.rowId === MIX_ROW_ID).length,
        tackRows: initialRows.filter((row) => row.rowId === TACK_ROW_ID).length,
        visibleMissingStatus: missingStatus,
      },
      positive: {
        revisionId: child.revisionId,
        parentRevisionId: child.parentRevisionId,
        intermediateRevisionId: intermediate.revisionId,
        intermediateParentRevisionId: intermediate.parentRevisionId,
        intermediateRemainingParameterIds: [...intermediateMissing].sort(),
        intermediateUiStatus,
        status: child.status,
        remainingNeeds: (child.preliminaryNeeds ?? []).length,
        explicitUiInputs,
        mixQuantityT: Number(mix.quantity),
        tackQuantityL: Number(tack.quantity),
        mixVisibleText: mixText,
        tackVisibleText: tackText,
      },
      reload: { draftId, exactRevisionPreserved: true, mutationPosts: postsAfterReload - postsBeforeReload },
      sensitivity: {
        revisionId: sensitivity.revisionId,
        parentRevisionId: sensitivity.parentRevisionId,
        thicknessMm: 40,
        remainingNeeds: (sensitivity.preliminaryNeeds ?? []).length,
        mixQuantityT: Number(sensitivityMix.quantity),
        tackQuantityL: Number(sensitivityTack.quantity),
        mixVisibleText: sensitivityMixText,
        tackVisibleText: sensitivityTackText,
        reloadMixVisibleText: sensitivityReloadedMixText,
        reloadMutationPosts: postsAfterSensitivityReload - postsBeforeSensitivityReload,
      },
      requestTrace,
      pageErrors,
      consoleErrors,
      screenshots: [
        `r6-web-${runId}-missing.png`,
        `r6-web-${runId}-positive.png`,
        `r6-web-${runId}-reload.png`,
        `r6-web-${runId}-thickness-40.png`,
        `r6-web-${runId}-thickness-40-reload.png`,
      ],
      status: "GREEN_R6_REAL_WEB_INPUT_SAVE_RELOAD_AND_THICKNESS_SENSITIVITY",
    };
    invariant(pageErrors.length === 0, `R6_WEB_PAGE_ERRORS:${pageErrors.join("|")}`);
    const report = { ...reportUnsigned, sha256: sha256(JSON.stringify(reportUnsigned)) };
    const reportPath = resolve(OUTPUT_ROOT, `R6_ASPHALT_WEB_ACCEPTANCE_${runId}.json`);
    atomicJson(reportPath, report);
    process.stdout.write(`${JSON.stringify({ status: report.status, reportPath, releaseId, searchReleaseId,
      initialRevisionId: initial.revisionId, childRevisionId: child.revisionId,
      mixQuantityT: mix.quantity, tackQuantityL: tack.quantity,
      sensitivityRevisionId: sensitivity.revisionId,
      sensitivityMixQuantityT: sensitivityMix.quantity,
      sensitivityTackQuantityL: sensitivityTack.quantity }, null, 2)}\n`);
    await context.close();
  } finally {
    await browser.close().catch(() => undefined);
    web?.stop();
    if (backend) await stopChild(backend.child);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
