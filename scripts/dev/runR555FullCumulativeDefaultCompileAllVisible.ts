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

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { Client } from "pg";

type Json = Record<string, any>;
type CatalogSpec = { catalogId: string; titleRu: string; primaryMeasureParameterId: string };
type LedgerEvent = {
  at: string;
  catalog_id: string;
  state: "accepted" | "succeeded" | "failed" | "submission_failed";
  job_id?: string;
  request_id?: string | null;
  created?: boolean;
  revision_id?: string | null;
  error_code?: string | null;
  http_status?: number;
};

const CONTRACT = "rik-expo-app-r555.full-cumulative-default-compile-all-visible.v1";
const MASTER_SHA256 = "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const ORIGIN = "http://localhost:8081";
const BACKEND = "http://127.0.0.1:8765";
const EXPECTED = 10_329;
const TARGET_RECEIPT = resolve(".release-runtime/r555/evidence/21B_R555_FULL_CUMULATIVE_STRICT_BACKEND_RESTART.json");
const SEARCH_RECEIPT = resolve(".release-runtime/r555/evidence/21C_R555_FULL_CUMULATIVE_BACKEND_WEB_SEARCH_GATE.json");
const CONTROL_RECEIPT = resolve(".release-runtime/r555/evidence/21D_R555_FULL_CUMULATIVE_CONTROL_COMPILE_GATE.json");
const OUTPUT = resolve(".release-runtime/r555/evidence/21E_R555_FULL_CUMULATIVE_DEFAULT_COMPILE_ALL_VISIBLE.json");
const EVENTS = resolve(".release-runtime/r555/evidence/21E_R555_FULL_CUMULATIVE_DEFAULT_COMPILE_EVENTS.jsonl");
const AUDIT_ROWS = resolve(".release-runtime/r555/evidence/21F_R555_FULL_CUMULATIVE_DEFAULT_COMPILE_PER_CATALOG.jsonl");
const LOCK = resolve(".release-runtime/r555/runtime/r555-full-default-compile.lock.json");
const SUBMIT_CONCURRENCY = 7;
const RUN_STARTED = new Date().toISOString();

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`R555_FULL_DEFAULT_COMPILE:${code}`);
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

function appendEvent(event: LedgerEvent): void {
  mkdirSync(dirname(EVENTS), { recursive: true });
  appendFileSync(EVENTS, `${JSON.stringify(event)}\n`, "utf8");
}

function priorEvents(): Map<string, LedgerEvent> {
  const result = new Map<string, LedgerEvent>();
  if (!existsSync(EVENTS)) return result;
  for (const line of readFileSync(EVENTS, "utf8").split(/\r?\n/u)) {
    if (!line) continue;
    const event = JSON.parse(line) as LedgerEvent;
    result.set(event.catalog_id, event);
  }
  return result;
}

function processAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function acquireLock(target: Json): number {
  mkdirSync(dirname(LOCK), { recursive: true });
  if (existsSync(LOCK)) {
    const existing = JSON.parse(readFileSync(LOCK, "utf8")) as Json;
    const pid = Number(existing.pid);
    invariant(!Number.isInteger(pid) || !processAlive(pid), `RUNNER_ALREADY_ACTIVE_PID_${pid}`);
    renameSync(LOCK, `${LOCK}.stale-${new Date().toISOString().replace(/[^0-9]/gu, "")}`);
  }
  const descriptor = openSync(LOCK, "wx");
  writeFileSync(descriptor, `${JSON.stringify({
    contract: CONTRACT,
    pid: process.pid,
    started_utc: RUN_STARTED,
    release_id: target.backend.target_release_id,
    search_release_id: target.backend.search_release_id,
  }, null, 2)}\n`, "utf8");
  return descriptor;
}

class RealConsumerSession {
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;
  latestAuthorization = "";
  identityText = "";
  authEvents: string[] = [];
  pageErrors: string[] = [];
  requestFailures: string[] = [];
  refreshPromise: Promise<void> | null = null;

  async open(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
    this.page.on("console", (message) => {
      const text = message.text();
      if (text.includes("[RootLayout] onAuthStateChange:")) this.authEvents.push(text.slice(0, 500));
    });
    this.page.on("pageerror", (error) => this.pageErrors.push(error.message));
    this.page.on("requestfailed", (request) => this.requestFailures.push(`${request.method()} ${new URL(request.url()).pathname}`));
    this.page.on("request", (request) => {
      if (!request.url().startsWith(`${BACKEND}/`)) return;
      const authorization = request.headers().authorization ?? "";
      if (authorization.startsWith("Bearer ")) this.latestAuthorization = authorization;
    });
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.refreshPromise) return await this.refreshPromise;
    this.refreshPromise = this.refreshInternal();
    try { await this.refreshPromise; } finally { this.refreshPromise = null; }
  }

  private async refreshInternal(): Promise<void> {
    invariant(this.page, "AUTH_PAGE_MISSING");
    await this.page.goto(`${ORIGIN}/request`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await this.page.getByTestId("local-developer-review-banner").waitFor({ timeout: 180_000 });
    if (!await this.page.getByTestId("consumer-repair-problem-input").isVisible().catch(() => false)) {
      const consumerLogin = this.page.getByTestId("auth.login.local-consumer")
        .or(this.page.getByTestId("protected-identity-local-consumer-login"));
      await consumerLogin.first().waitFor({ timeout: 180_000 });
      await consumerLogin.first().click();
      await this.page.getByTestId("consumer-repair-problem-input").waitFor({ timeout: 180_000 });
    }
    this.identityText = (await this.page.getByTestId("verified-identity-summary").innerText()).trim();
    invariant(this.identityText.toLowerCase().includes("consumer"), "AUTH_PRINCIPAL_NOT_CONSUMER");
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().startsWith(`${BACKEND}/search/catalog?`) && response.status() === 200,
      { timeout: 120_000 },
    );
    const input = this.page.getByTestId("consumer-repair-problem-input");
    await input.fill("");
    await input.fill("асф");
    await responsePromise;
    invariant(this.latestAuthorization.startsWith("Bearer "), "AUTHORIZATION_NOT_CAPTURED");
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
  }
}

async function backendJson(
  session: RealConsumerSession,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: Json; requestId: string | null }> {
  let lastStatus = 0;
  let lastBody: Json = {};
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (!session.latestAuthorization) await session.refresh();
    let response: Response;
    try {
      response = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
        ...init,
        headers: {
          Authorization: session.latestAuthorization,
          ...(init.body == null ? {} : { "content-type": "application/json" }),
          ...(init.headers ?? {}),
        },
      });
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * (attempt + 1)));
      continue;
    }
    const body = await response.json().catch(() => ({})) as Json;
    lastStatus = response.status;
    lastBody = body;
    if (response.status === 401) {
      await session.refresh();
      continue;
    }
    if (response.status >= 500 && attempt < 4) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250 * (attempt + 1)));
      continue;
    }
    return {
      status: response.status,
      body,
      requestId: response.headers.get("x-request-id") ?? (String(body.requestId ?? "") || null),
    };
  }
  return { status: lastStatus, body: lastBody, requestId: null };
}

async function concurrent<T>(items: readonly T[], maximum: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(maximum, items.length) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      await work(items[index]!);
    }
  }));
}

async function catalogSpecs(client: Client, releaseId: string): Promise<CatalogSpec[]> {
  const rows = (await client.query(`
    select manifest.catalog_id,
      identity.title_ru,
      parameter.parameter_id primary_measure_parameter_id
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
    left join lateral (
      select item.parameter_id
      from public.estimate_parameter_definition item
      where item.definition_version_id=definition.id
      order by item.ordinal
      limit 1
    ) parameter on true
    where manifest.release_id=$1
      and manifest.baseline_ready and manifest.scenario_ready
      and manifest.runtime_publication_state='CANDIDATE'
    order by manifest.catalog_id
  `, [releaseId])).rows as Json[];
  return rows.map((row) => ({
    catalogId: String(row.catalog_id),
    titleRu: String(row.title_ru),
    primaryMeasureParameterId: String(row.primary_measure_parameter_id),
  }));
}

async function auditJobs(client: Client, jobIds: string[], releaseId: string, tenantId: string): Promise<Json[]> {
  return (await client.query(`
    select job.id job_id,job.catalog_id,job.status,job.result_revision_id revision_id,
      revision.release_id revision_release_id,revision.organization_id,
      count(row.row_id)::int row_count,
      count(*) filter(where spec.row_type='material')::int material_rows,
      count(*) filter(where spec.row_type='labor')::int labor_rows,
      count(*) filter(where spec.row_type in ('equipment','service'))::int technique_rows,
      count(*) filter(where row.procurement_eligible)::int procurement_rows,
      count(*) filter(where row.quantity>0)::int positive_quantity_rows,
      count(*) filter(where row.unit_price is not null and row.unit_price>0)::int priced_rows,
      count(*) filter(where row.amount is not null and row.amount>0)::int positive_amount_rows,
      min(row.quantity)::text minimum_quantity,
      max(row.quantity)::text maximum_quantity,
      sum(row.amount)::text total_amount
    from public.estimate_compile_job job
    left join public.estimate_revision revision on revision.id=job.result_revision_id
    left join public.estimate_revision_row row on row.revision_id=revision.id
    left join public.estimate_resource_spec spec on spec.id=row.resource_spec_id
    where job.id=any($1::uuid[])
    group by job.id,job.catalog_id,job.status,job.result_revision_id,revision.release_id,revision.organization_id
    order by job.catalog_id
  `, [jobIds])).rows.map((row: Json) => ({
    ...row,
    green: row.status === "succeeded"
      && row.revision_release_id === releaseId
      && row.organization_id === tenantId
      && Number(row.row_count) > 0
      && Number(row.material_rows) > 0
      && Number(row.labor_rows) > 0
      && Number(row.technique_rows) > 0
      && Number(row.procurement_rows) > 0
      && Number(row.positive_quantity_rows) === Number(row.row_count)
      && Number(row.priced_rows) === Number(row.row_count)
      && Number(row.positive_amount_rows) === Number(row.row_count),
  }));
}

async function main(): Promise<void> {
  const target = JSON.parse(readFileSync(TARGET_RECEIPT, "utf8")) as Json;
  const search = JSON.parse(readFileSync(SEARCH_RECEIPT, "utf8")) as Json;
  const control = JSON.parse(readFileSync(CONTROL_RECEIPT, "utf8")) as Json;
  invariant(target.status === "GREEN_R555_STRICT_BACKEND_READY", "TARGET_BACKEND_NOT_GREEN");
  invariant(search.status === "GREEN_R555_FULL_CUMULATIVE_BACKEND_WEB_SEARCH_9_OF_9", "SEARCH_GATE_NOT_GREEN");
  invariant(control.status === "GREEN_R555_FULL_CUMULATIVE_CONTROL_COMPILE_FULL_PATH_1_OF_1", "CONTROL_COMPILE_NOT_GREEN");
  const releaseId = String(target.backend.target_release_id);
  const searchReleaseId = String(target.backend.search_release_id);
  const tenantId = "55555555-5555-4555-8555-555555555551";
  const lockDescriptor = acquireLock(target);
  const session = new RealConsumerSession();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r555-full-default-compile-all-visible", statement_timeout: 0 });
  let terminal = "failed";
  try {
    closeSync(lockDescriptor);
    await client.connect();
    const specs = await catalogSpecs(client, releaseId);
    invariant(specs.length === EXPECTED, `CATALOG_DENOMINATOR_${specs.length}`);
    invariant(new Set(specs.map((item) => item.catalogId)).size === EXPECTED, "CATALOG_IDS_NOT_UNIQUE");
    invariant(specs.every((item) => item.titleRu && /^[A-Za-z][A-Za-z0-9_.:-]{0,199}$/u.test(item.primaryMeasureParameterId)), "CATALOG_REQUEST_IDENTITY_GAP");
    await session.open();
    const latest = priorEvents();
    let accepted = [...latest.values()].filter((event) => event.state === "accepted").length;
    let succeeded = [...latest.values()].filter((event) => event.state === "succeeded").length;
    let terminalFailures = [...latest.values()].filter((event) => event.state === "failed" || event.state === "submission_failed").length;
    const toSubmit = specs.filter((spec) => !latest.has(spec.catalogId));
    process.stdout.write(`[r555-default] manifest=${specs.length} resume_succeeded=${succeeded} resume_accepted=${accepted} submit=${toSubmit.length}\n`);
    let submittedNow = 0;
    await concurrent(toSubmit, SUBMIT_CONCURRENCY, async (spec) => {
      const response = await backendJson(session, "/jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `r555-default-${sha256(`${releaseId}:${spec.catalogId}`).slice(0, 48)}`,
          catalogId: spec.catalogId,
          sourceRequestText: spec.titleRu,
          primaryMeasureParameterId: spec.primaryMeasureParameterId,
          parameters: {},
          currencyCode: "KGS",
        }),
      });
      const jobId = String(response.body.jobId ?? "");
      if (response.status === 202 && /^[0-9a-f-]{36}$/iu.test(jobId)) {
        const event: LedgerEvent = {
          at: new Date().toISOString(), catalog_id: spec.catalogId, state: "accepted", job_id: jobId,
          request_id: response.requestId, created: response.body.created === true,
        };
        appendEvent(event); latest.set(spec.catalogId, event); accepted += 1;
      } else {
        const event: LedgerEvent = {
          at: new Date().toISOString(), catalog_id: spec.catalogId, state: "submission_failed",
          request_id: response.requestId, http_status: response.status,
          error_code: String(response.body.error?.code ?? response.body.code ?? "UNKNOWN"),
        };
        appendEvent(event); latest.set(spec.catalogId, event); terminalFailures += 1;
      }
      submittedNow += 1;
      if (submittedNow % 100 === 0 || submittedNow === toSubmit.length) {
        process.stdout.write(`[r555-default] submitted=${submittedNow}/${toSubmit.length} accepted_total=${accepted} failures=${terminalFailures}\n`);
      }
    });

    const pending = specs.filter((spec) => latest.get(spec.catalogId)?.state === "accepted");
    let polledNow = 0;
    for (const spec of pending) {
      const acceptedEvent = latest.get(spec.catalogId)!;
      invariant(acceptedEvent.job_id, `ACCEPTED_JOB_ID_MISSING:${spec.catalogId}`);
      const deadline = Date.now() + 8 * 60 * 60 * 1000;
      while (true) {
        invariant(Date.now() < deadline, `JOB_TIMEOUT:${acceptedEvent.job_id}`);
        const response = await backendJson(session, `/jobs/${acceptedEvent.job_id}`);
        invariant(response.status === 200, `JOB_POLL_HTTP_${response.status}:${spec.catalogId}`);
        const status = String(response.body.status ?? "").toLowerCase();
        if (status === "succeeded") {
          const event: LedgerEvent = {
            at: new Date().toISOString(), catalog_id: spec.catalogId, state: "succeeded",
            job_id: acceptedEvent.job_id, revision_id: String(response.body.resultRevisionId ?? "") || null,
          };
          appendEvent(event); latest.set(spec.catalogId, event); succeeded += 1; break;
        }
        if (status === "failed" || status === "cancelled") {
          const event: LedgerEvent = {
            at: new Date().toISOString(), catalog_id: spec.catalogId, state: "failed",
            job_id: acceptedEvent.job_id, error_code: String(response.body.errorCode ?? status),
          };
          appendEvent(event); latest.set(spec.catalogId, event); terminalFailures += 1; break;
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 125));
      }
      polledNow += 1;
      if (polledNow % 100 === 0 || polledNow === pending.length) {
        process.stdout.write(`[r555-default] terminal=${polledNow}/${pending.length} succeeded_total=${succeeded} failures=${terminalFailures}\n`);
      }
    }

    const finalState = priorEvents();
    const succeededEvents = specs.map((spec) => finalState.get(spec.catalogId)).filter((event): event is LedgerEvent => event?.state === "succeeded");
    const jobIds = succeededEvents.map((event) => String(event.job_id));
    const audits = await auditJobs(client, jobIds, releaseId, tenantId);
    const auditBytes = audits.map((row) => JSON.stringify(row)).join("\n") + "\n";
    writeFileSync(AUDIT_ROWS, auditBytes, "utf8");
    const greenAudits = audits.filter((row) => row.green === true);
    const failures = specs.map((spec) => finalState.get(spec.catalogId))
      .filter((event) => event?.state !== "succeeded")
      .slice(0, 100);
    const auditFailures = audits.filter((row) => row.green !== true).slice(0, 100);
    const tokenRefreshed = session.authEvents.filter((event) => event.includes("TOKEN_REFRESHED"));
    const receiptBase = {
      schema_version: CONTRACT,
      generated_utc: new Date().toISOString(),
      status: succeededEvents.length === EXPECTED && greenAudits.length === EXPECTED && failures.length === 0
        ? "GREEN_R555_FULL_CUMULATIVE_DEFAULT_COMPILE_10329_OF_10329"
        : "RED_R555_FULL_CUMULATIVE_DEFAULT_COMPILE",
      master_sha256: MASTER_SHA256,
      candidate_release_id: releaseId,
      candidate_search_release_id: searchReleaseId,
      consumer_tenant_id: tenantId,
      provider_principal_role: session.identityText.toLowerCase().includes("consumer") ? "consumer" : "UNEXPECTED",
      denominator: EXPECTED,
      accepted: [...finalState.values()].filter((event) => event.state === "accepted" || event.state === "succeeded").length,
      succeeded: succeededEvents.length,
      independently_audited_green: greenAudits.length,
      terminal_failures: [...finalState.values()].filter((event) => event.state === "failed" || event.state === "submission_failed").length,
      total_revision_rows: audits.reduce((sum, row) => sum + Number(row.row_count), 0),
      total_procurement_rows: audits.reduce((sum, row) => sum + Number(row.procurement_rows), 0),
      minimum_rows_per_estimate: audits.length ? Math.min(...audits.map((row) => Number(row.row_count))) : 0,
      maximum_rows_per_estimate: audits.length ? Math.max(...audits.map((row) => Number(row.row_count))) : 0,
      failures,
      audit_failures: auditFailures,
      event_ledger: EVENTS.replaceAll("\\", "/"),
      event_ledger_sha256: sha256(readFileSync(EVENTS)),
      per_catalog_audit: AUDIT_ROWS.replaceAll("\\", "/"),
      per_catalog_audit_sha256: sha256(auditBytes),
      auth_event_count: session.authEvents.length,
      token_refreshed_count: tokenRefreshed.length,
      auth_refresh_storm: tokenRefreshed.length > 1,
      page_errors: session.pageErrors,
      request_failures: session.requestFailures,
      raw_access_token_persisted: false,
      service_role_in_browser: false,
      active_release_switched: false,
      production_accessed: false,
      deployed: false,
      merged: false,
      released: false,
      ota: false,
    };
    atomicJson(OUTPUT, { ...receiptBase, payload_sha256: sha256(JSON.stringify(receiptBase)) });
    process.stdout.write(`${JSON.stringify({
      status: receiptBase.status, denominator: EXPECTED, succeeded: succeededEvents.length,
      independently_audited_green: greenAudits.length, total_revision_rows: receiptBase.total_revision_rows,
      terminal_failures: receiptBase.terminal_failures, token_refreshed_count: tokenRefreshed.length,
    })}\n`);
    invariant(receiptBase.status.startsWith("GREEN_"), "FINAL_GATE_RED");
    terminal = "completed";
  } finally {
    await client.end().catch(() => undefined);
    await session.close();
    if (existsSync(LOCK)) renameSync(LOCK, `${LOCK}.${terminal}-${new Date().toISOString().replace(/[^0-9]/gu, "")}`);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
