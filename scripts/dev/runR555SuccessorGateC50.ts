import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium, type BrowserContext, type Page, type Response } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app-r555.successor-gate-c-50.v1";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const ORIGIN = "http://localhost:8081";
const BACKEND = "http://127.0.0.1:8765";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const MANIFEST = resolve(".release-runtime/r555/evidence/22A_R555_SUCCESSOR_ABC_SEED_MANIFEST.json");
const GATE_A = resolve(".release-runtime/r555/evidence/22B_R555_SUCCESSOR_GATE_A_2_OF_2.json");
const GATE_B = resolve(".release-runtime/r555/evidence/22C_R555_SUCCESSOR_GATE_B_10_OF_10.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/22D_R555_SUCCESSOR_GATE_C_50_OF_50.json");
const EVENTS = resolve(".release-runtime/r555/evidence/22D_R555_SUCCESSOR_GATE_C_EVENTS.jsonl");
const LOCK = resolve(".release-runtime/r555/runtime/r555-successor-gate-c.lock.json");
const EXPECTED = 50;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_GATE_C:${code}`);
}
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}
function appendResult(result: Json): void {
  mkdirSync(dirname(EVENTS), { recursive: true });
  appendFileSync(EVENTS, `${JSON.stringify(result)}\n`, "utf8");
}
function completedByCatalog(): Map<string, Json> {
  const result = new Map<string, Json>();
  if (!existsSync(EVENTS)) return result;
  for (const line of readFileSync(EVENTS, "utf8").split(/\r?\n/u)) {
    if (!line) continue;
    const row = JSON.parse(line) as Json;
    if (row.status === "GREEN") result.set(String(row.catalog_id), row);
  }
  return result;
}
function processAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}
function acquireLock(manifest: Json): number {
  mkdirSync(dirname(LOCK), { recursive: true });
  if (existsSync(LOCK)) {
    const old = JSON.parse(readFileSync(LOCK, "utf8")) as Json;
    invariant(!processAlive(Number(old.pid)), `RUNNER_ALREADY_ACTIVE_${old.pid}`);
    renameSync(LOCK, `${LOCK}.stale-${new Date().toISOString().replace(/[^0-9]/gu, "")}`);
  }
  const descriptor = openSync(LOCK, "wx");
  writeFileSync(descriptor, `${JSON.stringify({
    contract: CONTRACT,
    pid: process.pid,
    started_utc: new Date().toISOString(),
    catalog_set_sha256: manifest.gate_c.catalog_set_sha256,
  }, null, 2)}\n`, "utf8");
  return descriptor;
}

async function enterConsumer(page: Page): Promise<void> {
  if (await page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) return;
  const login = page.getByTestId("auth.login.local-consumer")
    .or(page.getByTestId("protected-identity-local-consumer-login"));
  await login.first().waitFor({ timeout: 180_000 });
  await login.first().click();
  await page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
}

async function responseJson(response: Response): Promise<Json> {
  return await response.json().catch(() => ({})) as Json;
}

async function api(authorization: string, path: string): Promise<Json> {
  const response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    headers: { Authorization: authorization },
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({})) as Json;
  invariant(response.status === 200, `API_${response.status}:${path}:${String(body.error?.code ?? "")}`);
  return body;
}

function rowIdentity(page: Page): ReturnType<Page["locator"]> {
  return page.locator('[id^="canonical-estimate-row-identity|"]').first();
}
async function identity(page: Page): Promise<{ revisionId: string; releaseId: string; catalogId: string; rowIdentity: string }> {
  const locator = rowIdentity(page);
  await locator.waitFor({ timeout: 180_000 });
  const value = await locator.getAttribute("id") ?? "";
  const parts = value.split("|");
  return { revisionId: parts[1] ?? "", releaseId: parts[2] ?? "", catalogId: parts[3] ?? "", rowIdentity: value };
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ limit: "200" });
    if (cursor) params.set("cursor", cursor);
    const body = await api(authorization, `revisions/${revisionId}/rows?${params.toString()}`);
    rows.push(...(Array.isArray(body.rows) ? body.rows as Json[] : []));
    cursor = String(body.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function revealFirstEditableInput(page: Page): Promise<ReturnType<Page["locator"]>> {
  const toggle = page.getByTestId("request-estimate-parameters-toggle");
  await toggle.waitFor({ state: "visible", timeout: 60_000 });
  await toggle.click();
  await page.getByTestId("request-estimate-parameter-panel").waitFor({ state: "visible", timeout: 60_000 });
  let input = page.getByTestId("editable-param-popover-input").first();
  if (!await input.isVisible().catch(() => false)) {
    const showMore = page.getByTestId("request-estimate-show-more-parameters");
    if (await showMore.isVisible().catch(() => false)) await showMore.click();
    const filled = page.getByTestId("request-estimate-filled-parameters-toggle");
    if (await filled.isVisible().catch(() => false)) await filled.click();
    input = page.getByTestId("editable-param-popover-input").first();
  }
  await input.waitFor({ state: "visible", timeout: 60_000 });
  return input;
}

function changedNumericValue(raw: string): string {
  const value = Number(raw.replace(",", "."));
  invariant(Number.isFinite(value), `FIRST_EDITABLE_PARAMETER_NOT_NUMERIC:${raw}`);
  return String(value === 0 ? 1 : Number((value * 1.1 + 1).toFixed(4)));
}

async function runCase(context: BrowserContext, spec: Json, index: number, releaseId: string, searchReleaseId: string): Promise<Json> {
  const page = await context.newPage();
  const started = Date.now();
  const authEvents: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const requestFailures: string[] = [];
  const requests: Json[] = [];
  let authorization = "";
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("[RootLayout] onAuthStateChange:")) authEvents.push(text.slice(0, 500));
    if (message.type() === "error") consoleErrors.push(text.slice(0, 1_000));
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => requestFailures.push(`${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`));
  page.on("request", (request) => {
    if (request.url().startsWith(`${BACKEND}/`)) {
      const header = request.headers().authorization ?? "";
      if (header.startsWith("Bearer ")) authorization = header;
    }
  });
  page.on("response", (response) => {
    if (!response.url().startsWith(`${BACKEND}/`)) return;
    requests.push({
      method: response.request().method(),
      path: new URL(response.url()).pathname,
      status: response.status(),
      request_id: response.headers()["x-request-id"] ?? null,
    });
  });
  try {
    await page.goto(`${ORIGIN}/request?gateC=${index + 1}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    await enterConsumer(page);
    const principal = (await page.getByTestId("verified-identity-summary").innerText()).trim();
    invariant(principal.toLowerCase().includes("consumer"), "PRINCIPAL_NOT_CONSUMER");
    const input = page.getByTestId("consumer-repair-problem-input");
    const searchPromise = page.waitForResponse((response) => response.url().startsWith(`${BACKEND}/search/catalog?`)
      && new URL(response.url()).searchParams.get("query") === String(spec.titleRu) && response.status() === 200,
    { timeout: 120_000 });
    const [searchResponse] = await Promise.all([searchPromise, input.fill(String(spec.titleRu))]);
    const searchBody = await responseJson(searchResponse);
    invariant(searchBody.searchIndexReleaseId === searchReleaseId, "SEARCH_RELEASE_DRIFT");
    const items = Array.isArray(searchBody.items) ? searchBody.items as Json[] : [];
    const selectedIndex = items.findIndex((item) => String(item.catalogId) === String(spec.catalogId));
    invariant(selectedIndex >= 0, `EXACT_SEARCH_RESULT_MISSING:${spec.catalogId}`);
    const suggestion = page.getByTestId(`consumer-repair-work-suggestion-${selectedIndex + 1}`);
    await suggestion.waitFor({ timeout: 60_000 });
    await suggestion.click();
    invariant(authorization.startsWith("Bearer "), "AUTHORIZATION_MISSING");
    const historyBefore = await api(authorization, `revisions?catalogId=${encodeURIComponent(spec.catalogId)}&limit=100`);
    const beforeCount = Array.isArray(historyBefore.revisions) ? historyBefore.revisions.length : 0;

    const compilePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/compile")
      && response.request().method() === "POST", { timeout: 180_000 });
    const [compileResponse] = await Promise.all([
      compilePromise,
      page.getByTestId("consumer-repair-prepare-draft").click(),
    ]);
    const compileBody = await responseJson(compileResponse);
    invariant(compileResponse.status() === 202, `COMPILE_HTTP_${compileResponse.status()}:${String(compileBody.error?.code ?? "")}`);
    const parent = await identity(page);
    invariant(parent.releaseId === releaseId && parent.catalogId === spec.catalogId, "PARENT_IDENTITY_DRIFT");
    const parentRows = await allRows(authorization, parent.revisionId);
    invariant(parentRows.length > 0 && parentRows.every((row) => Number(row.quantity) > 0
      && Number(row.unitPrice) > 0 && Number(row.amount) > 0), "PARENT_ROWS_RED");

    const parameterInput = await revealFirstEditableInput(page);
    const parameterBefore = await parameterInput.inputValue();
    const parameterAfter = changedNumericValue(parameterBefore);
    await parameterInput.fill(parameterAfter);
    await page.getByTestId("editable-param-batch-dirty-count").waitFor({ state: "visible", timeout: 30_000 });
    // The asphalt editor normalizes dependent fields on blur. Complete that
    // user interaction before pressing the batch action so its replacement
    // DOM node, rather than the focused-field render, receives the click.
    await parameterInput.blur();
    await page.waitForTimeout(300);
    const applyParameters = page.getByTestId("editable-param-batch-apply");
    await applyParameters.waitFor({ state: "visible", timeout: 30_000 });
    const recalculatePromise = page.waitForResponse((response) => response.url().endsWith("/jobs/recalculate")
      && response.request().method() === "POST", { timeout: 180_000 });
    const [recalculateResponse] = await Promise.all([
      recalculatePromise,
      applyParameters.click(),
    ]);
    const recalculateBody = await responseJson(recalculateResponse);
    invariant(recalculateResponse.status() === 202, `RECALCULATE_HTTP_${recalculateResponse.status()}:${String(recalculateBody.error?.code ?? "")}`);
    await page.waitForFunction((parentRevisionId) => {
      const row = document.querySelector('[id^="canonical-estimate-row-identity|"]');
      return Boolean(row?.id && !row.id.startsWith(`canonical-estimate-row-identity|${parentRevisionId}|`));
    }, parent.revisionId, { timeout: 180_000 });
    const child = await identity(page);
    invariant(child.revisionId !== parent.revisionId && child.releaseId === releaseId && child.catalogId === spec.catalogId,
      "CHILD_IDENTITY_DRIFT");
    const childRevision = await api(authorization, `revisions/${child.revisionId}`);
    invariant(childRevision.parentRevisionId === parent.revisionId && childRevision.releaseId === releaseId
      && childRevision.catalogId === spec.catalogId, "CHILD_PARENT_OR_TUPLE_RED");
    const childRows = await allRows(authorization, child.revisionId);
    invariant(childRows.length > 0 && childRows.every((row) => Number(row.quantity) > 0
      && Number(row.unitPrice) > 0 && Number(row.amount) > 0), "CHILD_ROWS_RED");
    await page.getByTestId("estimate-revision-diff").waitFor({ state: "visible", timeout: 60_000 });
    const historyAfter = await api(authorization, `revisions?catalogId=${encodeURIComponent(spec.catalogId)}&limit=100`);
    const afterRows = Array.isArray(historyAfter.revisions) ? historyAfter.revisions as Json[] : [];
    invariant(afterRows.length === beforeCount + 2, `HISTORY_DELTA_${beforeCount}_${afterRows.length}`);
    invariant(afterRows.some((row) => row.revisionId === child.revisionId), "HISTORY_CHILD_MISSING");

    const procurementPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${child.revisionId}/artifacts/procurement`) && response.status() === 200,
    { timeout: 180_000 });
    const procurementAction = page.getByTestId("consumer-estimate-open-procurement").first();
    invariant(await procurementAction.isEnabled(), "PROCUREMENT_DISABLED");
    const [procurementResponse] = await Promise.all([procurementPromise, procurementAction.click()]);
    const procurementBody = await responseJson(procurementResponse);
    invariant(procurementBody.revisionId === child.revisionId && procurementBody.releaseId === releaseId
      && procurementBody.status === "ready", "PROCUREMENT_IDENTITY_RED");

    const pdfMetadataPromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().includes(`/revisions/${child.revisionId}/artifacts/pdf`) && response.status() === 200,
    { timeout: 180_000 });
    const pdfFilePromise = page.waitForResponse((response) => response.url().includes("/canonical-estimate/artifact-files/")
      && [200, 206].includes(response.status()), { timeout: 180_000 });
    const [pdfMetadata, pdfFile] = await Promise.all([
      pdfMetadataPromise,
      pdfFilePromise,
      page.getByTestId("consumer-estimate-make-pdf").first().click(),
    ]);
    const pdfBody = await responseJson(pdfMetadata);
    await page.getByTestId("pdf-viewer-web-iframe").waitFor({ timeout: 180_000 });
    invariant(pdfBody.revisionId === child.revisionId && pdfBody.releaseId === releaseId
      && [200, 206].includes(pdfFile.status()), "PDF_IDENTITY_RED");

    const coldUrl = `${ORIGIN}/request?canonicalRevisionId=${encodeURIComponent(child.revisionId)}&gateCCold=${index + 1}-${Date.now()}`;
    const postCountBeforeCold = requests.filter((request) => request.method === "POST").length;
    await page.goto(coldUrl, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.getByTestId("consumer-repair-screen").waitFor({ timeout: 180_000 });
    const cold = await identity(page);
    invariant(cold.revisionId === child.revisionId && cold.releaseId === releaseId && cold.catalogId === spec.catalogId,
      "COLD_REOPEN_IDENTITY_RED");
    const postCountAfterCold = requests.filter((request) => request.method === "POST").length;
    invariant(postCountAfterCold === postCountBeforeCold, "COLD_REOPEN_CREATED_MUTATION");
    const tokenRefreshed = authEvents.filter((event) => event.includes("TOKEN_REFRESHED"));
    const expectedPdfAbort = requestFailures.filter((failure) => failure.includes("/canonical-estimate/artifact-files/")
      && failure.includes("ERR_ABORTED"));
    const unexpectedFailures = requestFailures.filter((failure) => !expectedPdfAbort.includes(failure));
    invariant(tokenRefreshed.length === 0, `TOKEN_REFRESHED_${tokenRefreshed.length}`);
    invariant(consoleErrors.length === 0, `CONSOLE_ERRORS:${consoleErrors.join("|")}`);
    invariant(pageErrors.length === 0, `PAGE_ERRORS:${pageErrors.join("|")}`);
    invariant(unexpectedFailures.length === 0, `REQUEST_FAILURES:${unexpectedFailures.join("|")}`);
    return {
      at: new Date().toISOString(),
      ordinal: index + 1,
      status: "GREEN",
      catalog_id: spec.catalogId,
      title_ru: spec.titleRu,
      domain: spec.domain,
      group_id: spec.groupId,
      provider_principal_role: "consumer",
      search: { status: searchResponse.status(), search_release_id: searchBody.searchIndexReleaseId, exact_catalog_id: spec.catalogId },
      default_preliminary: { job_id: compileBody.jobId, request_id: compileBody.requestId ?? null, revision_id: parent.revisionId, row_count: parentRows.length },
      refinement: { parameter_before: parameterBefore, parameter_after: parameterAfter, job_id: recalculateBody.jobId,
        request_id: recalculateBody.requestId ?? null, parent_revision_id: parent.revisionId, child_revision_id: child.revisionId,
        child_row_count: childRows.length, diff_visible: true },
      history: { before: beforeCount, after: afterRows.length, delta: afterRows.length - beforeCount, child_present: true },
      procurement: { ready: true, revision_id: procurementBody.revisionId, release_id: procurementBody.releaseId,
        selected_row_count: procurementBody.selectedRowCount ?? null },
      pdf: { ready: true, revision_id: pdfBody.revisionId, release_id: pdfBody.releaseId, sha256: pdfBody.sha256 ?? null },
      cold_reopen: { url_path: new URL(coldUrl).pathname, exact_revision: true, mutation_posts: 0 },
      content: { default_rows_positive_and_priced: true, child_rows_positive_and_priced: true },
      auth_event_count: authEvents.length,
      token_refreshed_count: tokenRefreshed.length,
      console_errors: consoleErrors,
      page_errors: pageErrors,
      request_failures: unexpectedFailures,
      duration_ms: Date.now() - started,
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function independentAudit(revisionIds: string[], releaseId: string): Promise<Json> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-gate-c-independent-audit" });
  await client.connect();
  try {
    const rows = (await client.query(`
      select revision.id,revision.catalog_id,revision.parent_revision_id,revision.release_id,
        count(row.row_id)::int row_count,
        count(*) filter(where spec.row_type='material')::int material_rows,
        count(*) filter(where spec.row_type='labor')::int labor_rows,
        count(*) filter(where spec.row_type in ('equipment','service'))::int technique_rows,
        count(*) filter(where row.procurement_eligible)::int procurement_rows,
        count(*) filter(where row.quantity>0 and row.unit_price>0 and row.amount>0)::int positive_priced_rows
      from public.estimate_revision revision
      join public.estimate_revision_row row on row.revision_id=revision.id
      join public.estimate_resource_spec spec on spec.id=row.resource_spec_id
      where revision.id=any($1::uuid[])
      group by revision.id,revision.catalog_id,revision.parent_revision_id,revision.release_id
      order by revision.catalog_id
    `, [revisionIds])).rows as Json[];
    const green = rows.filter((row) => row.release_id === releaseId && row.parent_revision_id
      && Number(row.row_count) > 0 && Number(row.material_rows) > 0 && Number(row.labor_rows) > 0
      && Number(row.technique_rows) > 0 && Number(row.procurement_rows) > 0
      && Number(row.positive_priced_rows) === Number(row.row_count));
    return {
      denominator: revisionIds.length,
      audited: rows.length,
      green: green.length,
      total_rows: rows.reduce((sum, row) => sum + Number(row.row_count), 0),
      minimum_rows: rows.length ? Math.min(...rows.map((row) => Number(row.row_count))) : 0,
      maximum_rows: rows.length ? Math.max(...rows.map((row) => Number(row.row_count))) : 0,
      failures: rows.filter((row) => !green.includes(row)).slice(0, 100),
    };
  } finally { await client.end(); }
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Json;
  const gateA = JSON.parse(readFileSync(GATE_A, "utf8")) as Json;
  const gateB = JSON.parse(readFileSync(GATE_B, "utf8")) as Json;
  invariant(manifest.status === "GREEN_R555_SUCCESSOR_ABC_SEED_MANIFEST_FROZEN_BEFORE_BROWSER_RUN", "MANIFEST_RED");
  invariant(gateA.status === "GREEN_R555_SUCCESSOR_GATE_A_FULL_PATH_2_OF_2", "GATE_A_RED");
  invariant(gateB.status === "GREEN_R555_SUCCESSOR_GATE_B_FULL_PATH_10_OF_10", "GATE_B_RED");
  const cases = manifest.gate_c.cases as Json[];
  invariant(cases.length === EXPECTED && new Set(cases.map((row) => row.catalogId)).size === EXPECTED, "DENOMINATOR_RED");
  const descriptor = acquireLock(manifest);
  closeSync(descriptor);
  const browser = await chromium.launch({ headless: true });
  let terminal = "failed";
  try {
    const completed = completedByCatalog();
    process.stdout.write(`[r555-gate-c] frozen=${cases.length} resume_green=${completed.size}\n`);
    for (let index = 0; index < cases.length; index += 1) {
      const spec = cases[index]!;
      if (completed.has(String(spec.catalogId))) continue;
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
      let result: Json;
      try {
        result = await runCase(context, spec, index, String(manifest.candidate_release_id), String(manifest.candidate_search_release_id));
      } catch (error) {
        result = {
          at: new Date().toISOString(), ordinal: index + 1, status: "RED", catalog_id: spec.catalogId,
          title_ru: spec.titleRu, domain: spec.domain,
          error: error instanceof Error ? error.message : String(error),
        };
      } finally {
        await context.close();
      }
      appendResult(result);
      process.stdout.write(`[r555-gate-c] ${index + 1}/${EXPECTED} ${spec.catalogId} ${result.status}\n`);
      invariant(result.status === "GREEN", `CASE_RED:${spec.catalogId}:${result.error ?? "UNKNOWN"}`);
    }
    const final = completedByCatalog();
    const ordered = cases.map((spec) => final.get(String(spec.catalogId))).filter(Boolean) as Json[];
    invariant(ordered.length === EXPECTED, `FINAL_DENOMINATOR_${ordered.length}`);
    const audit = await independentAudit(ordered.map((row) => String(row.refinement.child_revision_id)), String(manifest.candidate_release_id));
    const receiptBase = {
      schema_version: CONTRACT,
      generated_utc: new Date().toISOString(),
      status: audit.green === EXPECTED
        ? "GREEN_R555_SUCCESSOR_GATE_C_FULL_PATH_REFINED_50_OF_50"
        : "RED_R555_SUCCESSOR_GATE_C",
      master_sha256: MASTER_SHA256,
      candidate_release_id: manifest.candidate_release_id,
      candidate_search_release_id: manifest.candidate_search_release_id,
      frozen_catalog_set_sha256: manifest.gate_c.catalog_set_sha256,
      denominator: EXPECTED,
      green: ordered.length,
      unique_catalog_ids: new Set(ordered.map((row) => row.catalog_id)).size,
      unique_domains: new Set(ordered.map((row) => row.domain)).size,
      default_preliminary: `${EXPECTED}/${EXPECTED}`,
      refined_child: `${EXPECTED}/${EXPECTED}`,
      history_pdf_procurement_cold_reopen: `${EXPECTED}/${EXPECTED}`,
      independent_content_audit: audit,
      token_refreshed_count: ordered.reduce((sum, row) => sum + Number(row.token_refreshed_count), 0),
      console_error_count: ordered.reduce((sum, row) => sum + row.console_errors.length, 0),
      page_error_count: ordered.reduce((sum, row) => sum + row.page_errors.length, 0),
      request_failure_count: ordered.reduce((sum, row) => sum + row.request_failures.length, 0),
      cases: ordered,
      event_ledger: EVENTS.replaceAll("\\", "/"),
      event_ledger_sha256: sha256(readFileSync(EVENTS)),
      raw_access_token_persisted: false,
      service_role_in_browser: false,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    };
    atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) });
    process.stdout.write(`${JSON.stringify({ status: receiptBase.status, green: ordered.length,
      denominator: EXPECTED, unique_domains: receiptBase.unique_domains, independent_audit: audit })}\n`);
    invariant(receiptBase.status.startsWith("GREEN_"), "FINAL_RED");
    terminal = "completed";
  } finally {
    await browser.close();
    if (existsSync(LOCK)) renameSync(LOCK, `${LOCK}.${terminal}-${new Date().toISOString().replace(/[^0-9]/gu, "")}`);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
