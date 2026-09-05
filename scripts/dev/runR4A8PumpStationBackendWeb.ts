import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type Page, type Request, type Response } from "playwright";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app-r568-r4-a8.w5-pump-station-backend-web.v1";
const MASTER_SHA256 = "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const WEB_ORIGIN = "http://localhost:8081";
const BACKEND_ORIGIN = "http://127.0.0.1:8765";
const FIXTURE_PATH = resolve("data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json");
const CREDENTIALS_PATH = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/" +
  "r4-a8-developer-estimate-recovery-1/09_W5_PUMP_STATION_BACKEND_WEB.json",
);
const SCREENSHOT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/" +
  "r4-a8-developer-estimate-recovery-1/09_W5_PUMP_STATION_WEB.png",
);

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R4_A8_W5:${code}`);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function safeUrl(raw: string): string {
  const parsed = new URL(raw);
  for (const key of [...parsed.searchParams.keys()]) {
    if (/token|secret|signature|key/iu.test(key)) parsed.searchParams.set(key, "REDACTED");
  }
  return `${parsed.origin}${parsed.pathname}${parsed.search}`;
}

async function responseBody(response: Response): Promise<Json> {
  return await response.json().catch(() => ({})) as Json;
}

async function ownerSession(): Promise<{
  headers: Record<string, string>;
  subjectHash: string;
}> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8")) as Json;
  invariant(
    credentials.environment === "local_developer" &&
    credentials.provider_url === "http://127.0.0.1:54321" &&
    credentials.publishable_key &&
    credentials.owner?.email &&
    credentials.owner?.password,
    "LOCAL_OWNER_CREDENTIALS_RED",
  );
  const login = await fetch(`${credentials.provider_url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: credentials.owner.email, password: credentials.owner.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await login.json().catch(() => ({})) as Json;
  invariant(login.ok && body.access_token && body.user?.id, `OWNER_LOGIN_HTTP_${login.status}`);
  return {
    headers: {
      apikey: String(credentials.publishable_key),
      Authorization: `Bearer ${String(body.access_token)}`,
      "Content-Type": "application/json",
    },
    subjectHash: sha256(String(body.user.id)),
  };
}

async function api(
  headers: Record<string, string>,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Json; requestId: string | null }> {
  const response = await fetch(`${BACKEND_ORIGIN}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(180_000),
  });
  return {
    status: response.status,
    body: await response.json().catch(() => ({})) as Json,
    requestId: response.headers.get("x-request-id"),
  };
}

async function waitJob(headers: Record<string, string>, jobId: string): Promise<Json> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const result = await api(headers, `jobs/${jobId}`);
    invariant(result.status === 200, `JOB_READ_HTTP_${result.status}`);
    const status = String(result.body.status ?? "").toLowerCase();
    if (status === "succeeded") return result.body;
    if (status === "failed" || status === "cancelled") {
      throw new Error(`R4_A8_W5:JOB_${status.toUpperCase()}:${JSON.stringify({
        errorCode: result.body.errorCode ?? "UNKNOWN",
        errorMessage: result.body.errorMessage ?? null,
        failedStage: result.body.failedStage ?? null,
      })}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error(`R4_A8_W5:JOB_TIMEOUT:${jobId}`);
}

async function allRows(headers: Record<string, string>, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const response = await api(headers, `revisions/${revisionId}/rows?${query.toString()}`);
    invariant(response.status === 200, `ROWS_HTTP_${response.status}`);
    rows.push(...(Array.isArray(response.body.rows) ? response.body.rows : []));
    cursor = String(response.body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function directBackendCase(input: {
  fixture: Json;
  head: string;
  headers: Record<string, string>;
}): Promise<Json> {
  const fixtureHash = sha256(JSON.stringify(input.fixture.parameters));
  const accepted = await api(input.headers, "jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: `r4-a8-w5-backend-${sha256(`${input.head}:${fixtureHash}:duty-pump-primary:v2`).slice(0, 48)}`,
      catalogId: input.fixture.catalogId,
      sourceRequestText: input.fixture.fullPromptRu,
      primaryMeasureParameterId: "duty_pump_count",
      parameters: input.fixture.parameters,
      currencyCode: "KGS",
    }),
  });
  invariant(accepted.status === 202 && accepted.body.jobId, `COMPILE_HTTP_${accepted.status}`);
  const terminal = await waitJob(input.headers, String(accepted.body.jobId));
  const revisionId = String(terminal.resultRevisionId ?? "");
  invariant(revisionId, "RESULT_REVISION_MISSING");
  const revisionResponse = await api(input.headers, `revisions/${revisionId}`);
  invariant(revisionResponse.status === 200, `REVISION_HTTP_${revisionResponse.status}`);
  const revision = revisionResponse.body.revision ?? revisionResponse.body;
  const rows = await allRows(input.headers, revisionId);
  const rowIds = rows.map((row) => String(row.rowId ?? row.row_id ?? ""));
  const parameters = revision.parameters ?? revision.inputParameters ?? revision.input_parameters ?? {};
  invariant(Number(revision.rowCount ?? revision.row_count) === input.fixture.expectedRowCount, "BACKEND_REVISION_ROW_COUNT_RED");
  invariant(rows.length === input.fixture.expectedRowCount, "BACKEND_ROWS_LENGTH_RED");
  invariant(new Set(rowIds).size === input.fixture.expectedRowCount && rowIds.every(Boolean), "BACKEND_ROW_IDENTITY_RED");
  invariant(Object.keys(parameters).length === input.fixture.expectedParameterCount, "BACKEND_PARAMETER_COUNT_RED");
  return {
    status: "GREEN",
    compile_http_status: accepted.status,
    compile_request_id: accepted.requestId,
    job_id: accepted.body.jobId,
    terminal_status: terminal.status,
    revision_id: revisionId,
    revision_checksum_sha256: revision.checksumSha256 ?? revision.checksum_sha256 ?? null,
    catalog_id: revision.catalogId ?? revision.catalog_id,
    row_count: rows.length,
    unique_row_ids: new Set(rowIds).size,
    parameter_count: Object.keys(parameters).length,
    all_quantities_positive: rows.every((row) => Number(row.quantity) > 0),
  };
}

type BrowserAudit = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  productionRequests: string[];
  compilePostCount: number;
  compileParameterCount: number | null;
};

function observePage(page: Page): BrowserAudit {
  const audit: BrowserAudit = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    productionRequests: [],
    compilePostCount: 0,
    compileParameterCount: null,
  };
  page.on("console", (message) => {
    if (message.type() === "error") audit.consoleErrors.push(message.text().slice(0, 800));
  });
  page.on("pageerror", (error) => audit.pageErrors.push(error.message.slice(0, 800)));
  page.on("requestfailed", (request) => {
    audit.requestFailures.push(`${request.method()} ${safeUrl(request.url())} ${request.failure()?.errorText ?? ""}`);
  });
  page.on("request", (request: Request) => {
    if (/\.supabase\.co|nxrnjywzxxfdpqmzjorh/iu.test(request.url())) {
      audit.productionRequests.push(new URL(request.url()).origin);
    }
    if (request.method() === "POST" && request.url() === `${BACKEND_ORIGIN}/jobs/compile`) {
      audit.compilePostCount += 1;
      try {
        const body = JSON.parse(request.postData() ?? "{}") as Json;
        audit.compileParameterCount = Object.keys(body.parameters ?? {}).length;
      } catch {
        audit.compileParameterCount = null;
      }
    }
  });
  return audit;
}

async function openRequest(page: Page): Promise<string> {
  await page.goto(`${WEB_ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
  const identity = await page.getByTestId("verified-identity-summary").innerText().catch(() => "");
  return sha256(identity.trim());
}

async function selectPump(page: Page, prompt: string, catalogId: string): Promise<{ selectedText: string; searchRequestId: string | null }> {
  const searchResponse = page.waitForResponse(
    (response) => response.request().method() === "GET" &&
      response.url().startsWith(`${BACKEND_ORIGIN}/search/catalog?`) && response.status() === 200,
    { timeout: 120_000 },
  );
  await page.getByTestId("consumer-repair-problem-input").fill(prompt);
  const response = await searchResponse;
  const body = await responseBody(response);
  const items = Array.isArray(body.items) ? body.items as Json[] : [];
  const index = items.findIndex((item) => String(item.catalogId ?? item.id ?? "") === catalogId);
  invariant(index >= 0, "PUMP_CATALOG_NOT_FOUND_IN_WEB_SEARCH");
  const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${index + 1}`);
  await suggestion.waitFor({ timeout: 120_000 });
  const selectedText = (await suggestion.innerText()).trim();
  await suggestion.click();
  return { selectedText, searchRequestId: response.headers()["x-request-id"] ?? null };
}

async function incompleteWebCase(browser: Awaited<ReturnType<typeof chromium.launch>>, fixture: Json): Promise<Json> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const audit = observePage(page);
  try {
    const identityHash = await openRequest(page);
    const selection = await selectPump(page, fixture.barePromptRu, fixture.catalogId);
    const compileBefore = audit.compilePostCount;
    await page.getByTestId("consumer-repair-prepare-draft").click();
    await page.waitForTimeout(2_000);
    const state = await page.evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 30_000),
      canonicalRows: document.querySelectorAll('[id^="canonical-estimate-row-identity|"]').length,
      summaryVisible: Boolean(document.querySelector('[data-testid="request-estimate-summary-card"]')),
      loginVisible: Boolean(document.querySelector('[data-testid="auth.login.screen"]')),
    }));
    const promptVisible = /не заполнены обязательные исходные данные|уточните параметры/iu.test(state.bodyText);
    invariant(audit.compilePostCount === compileBefore, "INCOMPLETE_WEB_SENT_COMPILE");
    invariant(promptVisible, "INCOMPLETE_WEB_QUESTIONS_NOT_VISIBLE");
    invariant(state.canonicalRows === 0 && !state.summaryVisible, "INCOMPLETE_WEB_FALSE_ESTIMATE_VISIBLE");
    invariant(!state.loginVisible, "INCOMPLETE_WEB_LOGIN_SCREEN_VISIBLE");
    invariant(audit.pageErrors.length === 0 && audit.productionRequests.length === 0, "INCOMPLETE_WEB_RUNTIME_RED");
    return {
      status: "GREEN_NEEDS_INPUT",
      identity_hash: identityHash,
      selected_work_text: selection.selectedText,
      search_request_id: selection.searchRequestId,
      compile_posts_before: compileBefore,
      compile_posts_after: audit.compilePostCount,
      required_input_message_visible: promptVisible,
      canonical_rows: state.canonicalRows,
      summary_visible: state.summaryVisible,
      login_visible: state.loginVisible,
      console_error_count: audit.consoleErrors.length,
      page_error_count: audit.pageErrors.length,
      request_failure_count: audit.requestFailures.length,
      production_requests: audit.productionRequests.length,
    };
  } finally {
    await context.close();
  }
}

async function completeWebCase(input: {
  browser: Awaited<ReturnType<typeof chromium.launch>>;
  fixture: Json;
  headers: Record<string, string>;
}): Promise<Json> {
  const context = await input.browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  const audit = observePage(page);
  try {
    const identityHash = await openRequest(page);
    const selection = await selectPump(page, input.fixture.barePromptRu, input.fixture.catalogId);
    await page.getByTestId("consumer-repair-problem-input").fill(input.fixture.fullPromptRu);
    await page.waitForTimeout(250);
    const compileResponsePromise = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url() === `${BACKEND_ORIGIN}/jobs/compile`,
      { timeout: 180_000 },
    );
    await page.getByTestId("consumer-repair-prepare-draft").click();
    const compileResponse = await compileResponsePromise;
    const compileBody = await responseBody(compileResponse);
    invariant(compileResponse.status() === 202, `WEB_COMPILE_HTTP_${compileResponse.status()}`);
    await page.locator('[id^="canonical-estimate-row-identity|"]').first().waitFor({ timeout: 180_000 });
    await page.getByTestId("request-estimate-summary-card").waitFor({ timeout: 180_000 });
    await page.waitForTimeout(1_000);
    const state = await page.evaluate(() => ({
      pathname: window.location.pathname,
      canonicalRowIdentities: Array.from(
        document.querySelectorAll('[id^="canonical-estimate-row-identity|"]'),
        (node) => node.id,
      ),
      summaryVisible: Boolean(document.querySelector('[data-testid="request-estimate-summary-card"]')),
      loginVisible: Boolean(document.querySelector('[data-testid="auth.login.screen"]')),
      redOverlay: Boolean(
        document.querySelector('[data-testid="redbox"]') ||
        document.querySelector('[data-testid="error-overlay"]'),
      ),
    }));
    const firstIdentity = String(state.canonicalRowIdentities[0] ?? "").split("|");
    const revisionId = firstIdentity[1] ?? "";
    const releaseId = firstIdentity[2] ?? "";
    const identityCatalogId = firstIdentity[3] ?? "";
    invariant(revisionId && releaseId && identityCatalogId === input.fixture.catalogId, "WEB_ROW_IDENTITY_RED");
    const rows = await allRows(input.headers, revisionId);
    const rowIds = rows.map((row) => String(row.rowId ?? row.row_id ?? ""));
    const revisionResponse = await api(input.headers, `revisions/${revisionId}`);
    invariant(revisionResponse.status === 200, `WEB_REVISION_HTTP_${revisionResponse.status}`);
    const revision = revisionResponse.body.revision ?? revisionResponse.body;
    const revisionParameters = revision.parameters ?? revision.inputParameters ?? revision.input_parameters ?? {};
    invariant(state.canonicalRowIdentities.length === input.fixture.expectedRowCount, "WEB_DOM_ROW_COUNT_RED");
    invariant(rows.length === input.fixture.expectedRowCount, "WEB_BACKEND_ROW_COUNT_RED");
    invariant(new Set(rowIds).size === input.fixture.expectedRowCount, "WEB_UNIQUE_ROW_COUNT_RED");
    invariant(audit.compileParameterCount === input.fixture.expectedParameterCount, "WEB_COMPILE_PARAMETER_COUNT_RED");
    invariant(Object.keys(revisionParameters).length === input.fixture.expectedParameterCount, "WEB_REVISION_PARAMETER_COUNT_RED");
    invariant(state.summaryVisible && !state.loginVisible && !state.redOverlay, "WEB_VISIBLE_ESTIMATE_RED");
    invariant(audit.pageErrors.length === 0 && audit.productionRequests.length === 0, "WEB_RUNTIME_RED");
    mkdirSync(dirname(SCREENSHOT), { recursive: true });
    await page.screenshot({ path: SCREENSHOT, fullPage: true });
    return {
      status: "GREEN_31_ROWS_VISIBLE",
      identity_hash: identityHash,
      selected_work_text: selection.selectedText,
      search_request_id: selection.searchRequestId,
      compile_http_status: compileResponse.status(),
      compile_request_id: compileResponse.headers()["x-request-id"] ?? compileBody.requestId ?? null,
      compile_job_id: compileBody.jobId ?? null,
      compile_parameter_count: audit.compileParameterCount,
      revision_id: revisionId,
      release_id: releaseId,
      catalog_id: identityCatalogId,
      revision_parameter_count: Object.keys(revisionParameters).length,
      backend_row_count: rows.length,
      web_visible_row_count: state.canonicalRowIdentities.length,
      unique_row_ids: new Set(rowIds).size,
      summary_visible: state.summaryVisible,
      route: state.pathname,
      login_visible: state.loginVisible,
      red_overlay: state.redOverlay,
      console_error_count: audit.consoleErrors.length,
      page_error_count: audit.pageErrors.length,
      request_failure_count: audit.requestFailures.length,
      production_requests: audit.productionRequests.length,
      screenshot_sha256: sha256(readFileSync(SCREENSHOT)),
    };
  } finally {
    await context.close();
  }
}

async function main(): Promise<void> {
  const started = new Date();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const fixtureBytes = readFileSync(FIXTURE_PATH);
  const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Json;
  invariant(fixture.sourceClassification === "SYNTHETIC_ACCEPTANCE_FIXTURE_NOT_PROJECT_DATA", "FIXTURE_CLASSIFICATION_RED");
  invariant(Object.keys(fixture.parameters ?? {}).length === fixture.expectedParameterCount, "FIXTURE_PARAMETER_COUNT_RED");
  const owner = await ownerSession();
  const manifest = await api(owner.headers, "runtime-manifest");
  invariant(manifest.status === 200, `RUNTIME_MANIFEST_HTTP_${manifest.status}`);
  invariant(manifest.body.frontendBuildIdentity?.buildCommit === head, "RUNTIME_BUILD_COMMIT_DRIFT");
  invariant(manifest.body.capability?.status === "ACTIVE", "RUNTIME_CAPABILITY_RED");
  const backend = await directBackendCase({ fixture, head, headers: owner.headers });
  const browser = await chromium.launch({ headless: true });
  let incompleteWeb: Json;
  let completeWeb: Json;
  try {
    incompleteWeb = await incompleteWebCase(browser, fixture);
    completeWeb = await completeWebCase({ browser, fixture, headers: owner.headers });
  } finally {
    await browser.close();
  }
  invariant(incompleteWeb.identity_hash === completeWeb.identity_hash, "WEB_OWNER_IDENTITY_DRIFT");
  const ended = new Date();
  const receiptBase = {
    schema_version: CONTRACT,
    master_sha256: MASTER_SHA256,
    generated_utc: ended.toISOString(),
    started_utc: started.toISOString(),
    elapsed_ms: ended.getTime() - started.getTime(),
    status: "GREEN_A8_W5_NEEDS_INPUT_AND_FULL_31_BACKEND_WEB",
    source_head: head,
    fixture: {
      path: "data/estimate-benchmarks/r568-r4-a8-pump-station-acceptance.json",
      sha256: sha256(fixtureBytes),
      source_classification: fixture.sourceClassification,
      parameter_count: Object.keys(fixture.parameters).length,
      expected_row_count: fixture.expectedRowCount,
      values_are_user_project_facts: false,
    },
    runtime: {
      build_commit: manifest.body.frontendBuildIdentity.buildCommit,
      source_tree_hash: manifest.body.frontendBuildIdentity.sourceTreeHash,
      js_bundle_fingerprint: manifest.body.frontendBuildIdentity.jsBundleFingerprint,
      definition_release_id: manifest.body.compatibilityTuple?.definitionReleaseId,
      search_release_id: manifest.body.compatibilityTuple?.searchReleaseId,
      capability_status: manifest.body.capability?.status,
    },
    owner_subject_hash: owner.subjectHash,
    backend,
    incomplete_web: incompleteWeb,
    complete_web: completeWeb,
    tokens_captured: false,
    credentials_printed: false,
    request_headers_captured: false,
    production_requests: 0,
  };
  const receipt = { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receiptBase.status,
    source_head: head,
    backend_rows: backend.row_count,
    incomplete_compile_posts: incompleteWeb.compile_posts_after,
    web_visible_rows: completeWeb.web_visible_row_count,
    web_revision_id: completeWeb.revision_id,
    parameter_count: completeWeb.revision_parameter_count,
    tokens_captured: false,
    production_requests: 0,
    receipt: OUTPUT,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
