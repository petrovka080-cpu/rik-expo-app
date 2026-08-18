import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { chromium, type Browser } from "playwright";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

const API_VERSION = "2026-08-14.r2";
const COMPILER_VERSION = "canonical-estimate-local-runtime.r2";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_ORGANIZATION_ID = process.env.CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID
  ?? "22222222-2222-4222-8222-222222222222";
const TARGET_RELEASE_ID = String(process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID ?? "").trim();
const ADMISSION_RUN_ID = String(process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID ?? "").trim();
const ADMISSION_DOMAIN_ID = String(process.env.CANONICAL_ESTIMATE_ADMISSION_DOMAIN_ID ?? "").trim();
const CUMULATIVE_MANIFEST_MODE = String(process.env.CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST ?? "").trim() === "true";
const PORT = Number(process.env.CANONICAL_ESTIMATE_LOCAL_PORT ?? 8765);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const SEARCH_DATABASE_URL = process.env.CANONICAL_ESTIMATE_SEARCH_DATABASE_URL
  ?? DATABASE_URL;
const TARGET_SEARCH_RELEASE_ID = String(process.env.CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID ?? "").trim();
const MODEL_DATABASE_URLS = [...new Set([DATABASE_URL, SEARCH_DATABASE_URL])];
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 2_000;
const ARTIFACT_ROOT = resolve(".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts");
const REQUEST_AUDIT_LOG = String(process.env.CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG ?? "").trim();
const R45_RUNTIME_STARTED_AT = new Date().toISOString();
const R45_RUNTIME_SOURCE_HEAD = String(process.env.R45_RUNTIME_SOURCE_HEAD ?? "UNSET").trim();
const R45_RUNTIME_SOURCE_TREE = String(process.env.R45_RUNTIME_SOURCE_TREE ?? "UNSET").trim();
const R45_RUNTIME_SPEC_SHA256 = String(process.env.R45_RUNTIME_SPEC_SHA256 ?? "e834a50c139189432dc4c20eb59b51a2507b4bb3f857e094b38376b6b5bda860").trim();
const ARTIFACT_TOKEN_SECRET = String(
  process.env.CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET
    ?? `local-artifact:${R45_RUNTIME_SOURCE_HEAD}:${OWNER_ID}`,
);
const LOCAL_PROOF_BEARER_TOKENS = new Set([
  "local-dev-runtime-token",
  "local-r45-proof",
  "local-r45-web-manifest",
  "local-r54-exact15-proof",
  "local-r58-cumulative-proof",
]);
let artifactBrowserPromise: Promise<Browser> | null = null;

type JsonRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function boundedText(value: unknown, field: string, maxLength: number): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) throw Object.assign(new Error(`invalid ${field}`), { code: "ROW_AMENDMENT_INVALID" });
  return normalized;
}

function nonNegativeNumericText(value: unknown, field: string, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^\+?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return normalized;
}

function manualProvenance(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as JsonRecord).kind !== "manual") {
    throw Object.assign(new Error(`invalid ${field} provenance`), { code: "ROW_AMENDMENT_INVALID" });
  }
  const reason = (value as JsonRecord).reason;
  if (reason != null && (typeof reason !== "string" || reason.trim().length > 500)) {
    throw Object.assign(new Error(`invalid ${field} provenance reason`), { code: "ROW_AMENDMENT_INVALID" });
  }
  return { kind: "manual", ...(typeof reason === "string" ? { reason: reason.trim() } : {}) };
}

function roundDecimal(value: string, scale: number): string {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw Object.assign(new Error("invalid decimal result"), { code: "DECIMAL_PROJECTION_INVALID" });
  const sign = match[1] === "-" ? -1n : 1n;
  const fraction = (match[3] ?? "").padEnd(scale + 1, "0");
  const factor = 10n ** BigInt(scale);
  let scaled = BigInt(match[2]) * factor + BigInt(fraction.slice(0, scale) || "0");
  if (Number(fraction[scale] ?? "0") >= 5) scaled += 1n;
  scaled *= sign;
  const negative = scaled < 0n;
  const absolute = negative ? -scaled : scaled;
  const integer = absolute / factor;
  const decimals = String(absolute % factor).padStart(scale, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${integer}${decimals ? `.${decimals}` : ""}`;
}

function multiply(quantity: string, unitPrice: string | null): string | null {
  if (unitPrice == null) return null;
  return roundDecimal(evaluateFormulaGraph({
    kind: "binary", operator: "*", left: { kind: "literal", value: quantity }, right: { kind: "literal", value: unitPrice },
  }, {}), 2);
}

function send(response: ServerResponse, status: number, body: JsonRecord): void {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-idempotency-key",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify({ ...body, requestId: randomUUID() }));
}

function requireLocalOwner(request: IncomingMessage): void {
  const authorization = String(request.headers.authorization ?? "").trim();
  const match = /^Bearer\s+(.+)$/iu.exec(authorization);
  if (!match) {
    throw Object.assign(new Error("authentication required"), { code: "AUTH_REQUIRED", httpStatus: 401 });
  }
  const token = match[1].trim();
  if (LOCAL_PROOF_BEARER_TOKENS.has(token)) return;
  const parts = token.split(".");
  try {
    const claims = parts.length === 3
      ? JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as JsonRecord
      : null;
    if (claims?.sub === OWNER_ID) return;
  } catch {
    // A malformed or foreign JWT is denied below without exposing token details.
  }
  throw Object.assign(new Error("authenticated owner does not match requested estimate owner"), {
    code: "AUTH_FORBIDDEN",
    httpStatus: 403,
  });
}

async function readBody(request: IncomingMessage): Promise<JsonRecord> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("request body is too large"), { httpStatus: 413, code: "REQUEST_TOO_LARGE" });
    chunks.push(buffer);
  }
  const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("request body must be an object");
  return parsed as JsonRecord;
}

async function withDatabaseClient<T>(
  connectionString: string,
  operation: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString, application_name: "canonical-estimate-local-runtime-r1" });
  await client.connect();
  try { return await operation(client); } finally { await client.end(); }
}

async function withClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  return withDatabaseClient(DATABASE_URL, operation);
}

async function withSearchClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  return withDatabaseClient(SEARCH_DATABASE_URL, operation);
}

async function modelDatabaseUrlForCatalog(catalogId: string): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) => Boolean((await client.query(`
      select 1 from public.estimate_definition_version v
      join public.estimate_definition_release r on r.id=v.release_id
      where r.status='active' and v.catalog_id=$1 limit 1
    `, [catalogId])).rowCount));
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function findAcrossModelDatabases<T>(
  operation: (client: Client) => Promise<T | null | undefined>,
): Promise<T | null> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const value = await withDatabaseClient(connectionString, operation);
    if (value != null) return value;
  }
  return null;
}

async function modelDatabaseUrlForJob(jobId: string): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) => Boolean((await client.query(
      "select 1 from public.estimate_compile_job where id=$1 and owner_user_id=$2",
      [jobId, OWNER_ID],
    )).rowCount));
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function modelDatabaseUrlForRevision(revisionId: string): Promise<string> {
  for (const connectionString of MODEL_DATABASE_URLS) {
    const found = await withDatabaseClient(connectionString, async (client) => Boolean((await client.query(
      "select 1 from public.estimate_revision where id=$1 and owner_user_id=$2",
      [revisionId, OWNER_ID],
    )).rowCount));
    if (found) return connectionString;
  }
  return DATABASE_URL;
}

async function createJob(body: JsonRecord, operation: "compile" | "recalculate") {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const currencyCode = String(body.currencyCode ?? "").trim();
  if (!idempotencyKey || idempotencyKey.length > 200 || !catalogId || !/^[A-Z]{3}$/.test(currencyCode)) {
    throw Object.assign(new Error("invalid compile request"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const parameters = body.parameters;
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) throw Object.assign(new Error("parameters must be an object"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
  const parentRevisionId = operation === "recalculate" ? String(body.parentRevisionId ?? "") : null;
  const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
  const result = await withDatabaseClient(modelDatabaseUrl, async (client) => {
    await client.query("begin");
    try {
      const inputPayload = {
          parameters,
          currencyCode,
          priceSnapshotIds: body.priceSnapshotIds ?? [],
          ...(operation === "recalculate" ? {
            rowOverrides: body.rowOverrides ?? {},
            customRows: body.customRows ?? [],
            ...(body.releaseMigration == null ? {} : { releaseMigration: body.releaseMigration }),
          } : {}),
          apiVersion: API_VERSION,
      };
      let created;
      if (TARGET_RELEASE_ID) {
        if (!ADMISSION_RUN_ID) throw new Error("CANONICAL_ESTIMATE_ADMISSION_RUN_ID_REQUIRED");
        if (CUMULATIVE_MANIFEST_MODE) {
          created = await client.query(`select * from public.estimate_create_cumulative_admission_job_r54($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [
            TARGET_RELEASE_ID,
            ADMISSION_RUN_ID,
            OWNER_ID,
            TEST_ORGANIZATION_ID,
            idempotencyKey,
            operation,
            catalogId,
            parentRevisionId || null,
            JSON.stringify(inputPayload),
          ]);
        } else if (ADMISSION_DOMAIN_ID) {
          created = await client.query(`select * from public.estimate_create_release_admission_job_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`, [
            TARGET_RELEASE_ID,
            ADMISSION_DOMAIN_ID,
            ADMISSION_RUN_ID,
            OWNER_ID,
            TEST_ORGANIZATION_ID,
            idempotencyKey,
            operation,
            catalogId,
            parentRevisionId || null,
            JSON.stringify(inputPayload),
          ]);
        } else {
          created = await client.query(`select * from public.estimate_create_release_admission_job_v2($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, [
            TARGET_RELEASE_ID,
            ADMISSION_RUN_ID,
            OWNER_ID,
            TEST_ORGANIZATION_ID,
            idempotencyKey,
            operation,
            catalogId,
            parentRevisionId || null,
            JSON.stringify(inputPayload),
          ]);
        }
      } else {
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
        const createFunction = CUMULATIVE_MANIFEST_MODE
          ? "estimate_create_compile_job_r58"
          : "estimate_create_compile_job_v1";
        created = await client.query(`select * from public.${createFunction}($1,$2,$3,$4,$5,$6::jsonb)`, [
          idempotencyKey,
          operation,
          catalogId,
          parentRevisionId || null,
          body.organizationId ?? null,
          JSON.stringify(inputPayload),
        ]);
      }
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  setImmediate(() => { void drainJobs(modelDatabaseUrl).catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
  return { apiVersion: API_VERSION, jobId: result.job_id, status: result.job_status, created: result.created, pollAfterMs: 250 };
}

async function createLegacyJob(body: JsonRecord) {
  const sourceEstimateId = String(body.sourceEstimateId ?? "").trim();
  const sourceRevisionId = String(body.sourceRevisionId ?? "").trim();
  const catalogId = String(body.catalogId ?? "").trim();
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  const currencyCode = String(body.currencyCode ?? "").trim();
  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!sourceEstimateId || !sourceRevisionId || !catalogId || !idempotencyKey
    || !/^[A-Z]{3}$/.test(currencyCode) || !rows || rows.length > 5_000) {
    throw Object.assign(new Error("invalid legacy revision request"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
  }
  const sourceProjection = {
    sourceEstimateId,
    sourceRevisionId,
    catalogId,
    currencyCode,
    parameters: body.parameters ?? {},
    totals: body.totals ?? {},
    rows,
  };
  const sourceChecksumSha256 = sha256(sourceProjection);
  const payload = { ...sourceProjection, sourceChecksumSha256, apiVersion: API_VERSION };
  const result = await withClient(async (client) => {
    await client.query("begin");
    try {
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
      const created = await client.query(`
        select * from public.estimate_create_legacy_revision_job_v1($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      `, [idempotencyKey, catalogId, body.organizationId ?? null, sourceEstimateId, sourceRevisionId,
        sourceChecksumSha256, body.parentCanonicalRevisionId ?? null, JSON.stringify(payload)]);
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  setImmediate(() => { void drainJobs().catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
  return { apiVersion: API_VERSION, jobId: result.job_id, status: result.job_status, created: result.created, sourceChecksumSha256, pollAfterMs: 250 };
}

async function createArtifactJob(body: JsonRecord, revisionId: string, kind: "pdf" | "professional_pdf" | "procurement") {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (!idempotencyKey) throw Object.assign(new Error("idempotencyKey is required"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
  const modelDatabaseUrl = await modelDatabaseUrlForRevision(revisionId);
  const result = await withDatabaseClient(modelDatabaseUrl, async (client) => {
    await client.query("begin");
    try {
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
      const created = await client.query("select * from public.estimate_create_artifact_job_v1($1,$2,$3)", [idempotencyKey, revisionId, kind]);
      await client.query("commit");
      return created.rows[0];
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  });
  if (result.job_id) setImmediate(() => { void drainJobs(modelDatabaseUrl).catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
  return { apiVersion: API_VERSION, jobId: result.job_id, artifactId: result.artifact_id, status: result.job_status, artifactStatus: result.artifact_status, created: result.created, pollAfterMs: 250 };
}

type DrainState = {
  draining: boolean;
  drainRequested: boolean;
  retryDrainTimer: ReturnType<typeof setTimeout> | null;
};

const drainStates = new Map<string, DrainState>();

function drainState(connectionString: string): DrainState {
  const existing = drainStates.get(connectionString);
  if (existing) return existing;
  const created: DrainState = { draining: false, drainRequested: false, retryDrainTimer: null };
  drainStates.set(connectionString, created);
  return created;
}

function scheduleRetryDrain(delayMs: number, connectionString = DATABASE_URL): void {
  const state = drainState(connectionString);
  if (state.retryDrainTimer != null) return;
  state.retryDrainTimer = setTimeout(() => {
    state.retryDrainTimer = null;
    void drainJobs(connectionString).catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`));
  }, Math.max(100, delayMs));
}

async function drainJobs(connectionString = DATABASE_URL): Promise<void> {
  const state = drainState(connectionString);
  if (state.draining) {
    state.drainRequested = true;
    return;
  }
  state.draining = true;
  try {
    do {
      state.drainRequested = false;
      await withDatabaseClient(connectionString, async (client) => {
        while (true) {
          const workerId = `local-runtime:${randomUUID()}`;
          const claimed = await client.query("select * from public.estimate_claim_compile_jobs_v1($1,4,120)", [workerId]);
          if (claimed.rows.length === 0) break;
          for (const job of claimed.rows) {
            try {
              if (job.operation === "legacy_revision_migration") await migrateLegacyClaimedJob(client, workerId, job as JsonRecord);
              else if (job.operation === "pdf" || job.operation === "professional_pdf" || job.operation === "procurement") await buildArtifactClaimedJob(client, workerId, job as JsonRecord);
              else await compileClaimedJob(client, workerId, job as JsonRecord);
            }
            catch (error) {
              const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "COMPILER_FAILED";
              const message = error instanceof Error ? error.message : String(error);
              process.stderr.write(`[canonical-local-worker-job-error] ${JSON.stringify({
                jobId: job.id,
                catalogId: job.catalog_id,
                operation: job.operation,
                code,
                message,
              })}\n`);
              const retryable = (code === "40001" && !message.startsWith("optimistic revision conflict:"))
                || ["40P01", "55P03"].includes(code)
                || code.endsWith("_LOAD_FAILED")
                || code.endsWith("_STORAGE_FAILED")
                || code === "REVISION_COMMIT_RETRYABLE";
              const retryDelaySeconds = Math.min(300, 2 ** Math.min(Number(job.attempt ?? 1), 8));
              await client.query(
                "select public.estimate_fail_compile_job_v2($1,$2,$3,$4::jsonb,$5,$6)",
                [
                  job.id,
                  workerId,
                  code.slice(0, 100),
                  JSON.stringify({ compilerVersion: COMPILER_VERSION, retryable }),
                  retryable,
                  retryDelaySeconds,
                ],
              );
            }
          }
        }
        const retry = await client.query(`
          select ceil(extract(epoch from (min(available_at) - now())) * 1000)::integer delay_ms
            from public.estimate_compile_job where status='retry_wait'
        `);
        const rawRetryDelayMs = retry.rows[0]?.delay_ms;
        if (rawRetryDelayMs != null) {
          const retryDelayMs = Number(rawRetryDelayMs);
          if (Number.isFinite(retryDelayMs)) scheduleRetryDrain(retryDelayMs + 100, connectionString);
        }
      });
    } while (state.drainRequested);
  } finally {
    state.draining = false;
    if (state.drainRequested) {
      state.drainRequested = false;
      setImmediate(() => { void drainJobs(connectionString).catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
    }
  }
}

async function compileClaimedJob(client: Client, workerId: string, job: JsonRecord): Promise<void> {
  const definition = (await client.query(`
    select effective.id,effective.cumulative_manifest,effective.approved_template_baseline_id,
      coalesce(baseline.input_values,'{}'::jsonb) baseline_input_values
    from public.estimate_definition_release release
    cross join lateral (
      select direct.id,false cumulative_manifest,null::uuid approved_template_baseline_id,0 priority
      from public.estimate_definition_version direct
      where direct.release_id=release.id and direct.catalog_id=$1
      union all
      select inherited.id,true cumulative_manifest,manifest.approved_template_baseline_id,1 priority
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version inherited on inherited.id=manifest.definition_version_id
      where manifest.release_id=release.id and manifest.catalog_id=$1
        and manifest.baseline_ready and manifest.scenario_ready
    ) effective
    left join public.estimate_approved_template_baseline baseline
      on baseline.id=effective.approved_template_baseline_id
    where release.id=$2
      and (release.status='active' or (release.status='prepared' and $3::boolean))
    order by effective.priority
    limit 1
  `, [job.catalog_id, job.target_release_id, (job.input_payload as JsonRecord)?.releaseAdmission === true])).rows[0];
  if (!definition) throw Object.assign(new Error("definition not found"), { code: "DEFINITION_LOAD_FAILED" });
  const parameterDefinitions = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [definition.id])).rows;
  const payload = (job.input_payload ?? {}) as JsonRecord;
  const baselineParameters = (definition.baseline_input_values ?? {}) as JsonRecord;
  const submittedParameters = (payload.parameters ?? {}) as JsonRecord;
  let confirmedParameters: JsonRecord = { ...baselineParameters };
  let inheritedUserParameters: JsonRecord = {};
  if (job.operation === "recalculate") {
    const parent = (await client.query(
      "select release_id,catalog_id,input_parameters,amendment_contract from public.estimate_revision where id=$1",
      [job.parent_revision_id],
    )).rows[0];
    if (!parent || parent.catalog_id !== job.catalog_id) {
      throw Object.assign(new Error("parent revision parameter source unavailable"), { code: "PARENT_REVISION_INVALID" });
    }
    if (parent.release_id === job.target_release_id) {
      confirmedParameters = { ...baselineParameters, ...(parent.input_parameters ?? {}) };
      inheritedUserParameters = parent.amendment_contract?.parameterSources?.userParameters ?? {};
    }
  }
  const parameters = validateCanonicalEstimateParameters(
    parameterDefinitions,
    submittedParameters,
    {
      confirmedParameters,
      baselineContext: { catalogId: String(job.catalog_id) },
    },
  );
  const effectiveUserParameters = { ...inheritedUserParameters, ...submittedParameters };
  const baselineAssumptions = Object.fromEntries(Object.entries(baselineParameters)
    .filter(([parameterId, value]) => !(parameterId in effectiveUserParameters)
      && stableJson(parameters[parameterId]) === stableJson(value)));
  const numericParameters = Object.fromEntries(Object.entries(parameters).filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
  const formulas = (await client.query("select formula_id,ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph where definition_version_id=$1", [definition.id])).rows;
  const formulaById = new Map(formulas.map((formula) => [formula.formula_id, formula]));
  const resources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal limit $2", [definition.id, MAX_ROWS + 1])).rows;
  if (resources.length > MAX_ROWS) throw Object.assign(new Error("resource row limit exceeded"), { code: "DEFINITION_LIMIT_EXCEEDED" });
  const currencyCode = String(payload.currencyCode ?? "");
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw Object.assign(new Error("invalid currency"), { code: "PARAMETER_VALIDATION_FAILED" });
  const rawOverrides = payload.rowOverrides ?? {};
  const customRows = payload.customRows ?? [];
  if (!rawOverrides || typeof rawOverrides !== "object" || Array.isArray(rawOverrides)
    || Object.keys(rawOverrides as JsonRecord).length > MAX_ROWS
    || !Array.isArray(customRows) || customRows.length > 200) {
    throw Object.assign(new Error("invalid row amendments"), { code: "ROW_AMENDMENT_INVALID" });
  }
  const overrides = new Map(Object.entries(rawOverrides as JsonRecord));
  const rows: JsonRecord[] = [];
  const rowIds = new Set<string>();
  let totalAmount = "0";
  const addToTotal = (amount: string | null, included: boolean) => {
    if (amount != null && included) totalAmount = evaluateFormulaGraph({
      kind: "binary", operator: "+", left: { kind: "literal", value: totalAmount }, right: { kind: "literal", value: amount },
    }, {});
  };
  for (const resource of resources) {
    if (!evaluateInclusionGraph(resource.inclusion_ast as JsonRecord, parameters)) continue;
    const formula = formulaById.get(resource.formula_id);
    if (!formula) throw Object.assign(new Error("formula missing"), { code: "DEFINITION_INTEGRITY_FAILED" });
    const calculatedQuantity = evaluateFormulaGraph(formula.ast as FormulaAst, numericParameters);
    const override = overrides.get(resource.row_id) as JsonRecord | undefined;
    if (override != null && (!override || typeof override !== "object" || Array.isArray(override))) {
      throw Object.assign(new Error(`invalid row override ${resource.row_id}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    const provenance = override == null ? null : manualProvenance(override.provenance, resource.row_id);
    const quantity = override?.quantity == null ? calculatedQuantity : nonNegativeNumericText(override.quantity, `${resource.row_id}.quantity`)!;
    const unitPrice = override != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
      ? nonNegativeNumericText(override.unitPrice, `${resource.row_id}.unitPrice`, true)
      : null;
    const includedInEstimate = override?.includedInEstimate == null ? true : override.includedInEstimate;
    const includedInProcurement = includedInEstimate
      && (override?.includedInProcurement == null ? resource.procurement_eligible : override.includedInProcurement);
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !resource.procurement_eligible)) {
      throw Object.assign(new Error(`invalid row inclusion ${resource.row_id}`), { code: "ROW_AMENDMENT_INVALID" });
    }
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const calculationTrace = {
      compilerVersion: COMPILER_VERSION,
      formulaId: resource.formula_id,
      formulaAstSha256: formula.ast_sha256,
      inputParameterIds: formula.input_parameter_ids,
      resourceGraph: resource.resource_graph,
      ...(provenance == null ? {} : { manualAmendment: provenance }),
    };
    const normativeTrace = Array.isArray(resource.source_metadata?.normativeTrace) ? resource.source_metadata.normativeTrace : [];
    const rowBase = {
      rowId: resource.row_id,
      ordinal: resource.ordinal,
      resourceSpecId: resource.id,
      section: resource.section,
      category: resource.category,
      titleRu: override?.titleRu == null ? resource.title_ru : boundedText(override.titleRu, `${resource.row_id}.titleRu`, 2_000),
      unitId: resource.unit_id,
      quantity,
      unitPrice,
      amount,
      currencyCode: unitPrice == null ? null : currencyCode,
      procurementEligible: resource.procurement_eligible,
      includedInEstimate,
      includedInProcurement,
      ownershipStatus: includedInEstimate ? "OWNED" : "OWNED_EXCLUDED",
      calculationTrace,
      normativeTrace,
      sourceRowSha256: resource.row_sha256,
      priceSnapshotId: null,
      priceRouteId: null,
      priceResolutionTrace: provenance != null && Object.prototype.hasOwnProperty.call(override, "unitPrice")
        ? { kind: "manual_override", provenance, resolved: unitPrice != null }
        : { priceKey: resource.cost_owner_id || resource.row_id, resolved: false },
    };
    const row = {
      row_id: rowBase.rowId,
      ordinal: rowBase.ordinal,
      resource_spec_id: rowBase.resourceSpecId,
      section: rowBase.section,
      category: rowBase.category,
      title_ru: rowBase.titleRu,
      unit_id: rowBase.unitId,
      quantity: rowBase.quantity,
      unit_price: rowBase.unitPrice,
      amount: rowBase.amount,
      currency_code: rowBase.currencyCode,
      procurement_eligible: rowBase.procurementEligible,
      included_in_estimate: rowBase.includedInEstimate,
      included_in_procurement: rowBase.includedInProcurement,
      ownership_status: rowBase.ownershipStatus,
      calculation_trace: rowBase.calculationTrace,
      normative_trace: rowBase.normativeTrace,
      legacy_row_payload: null,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: rowBase.priceResolutionTrace,
    } as JsonRecord;
    row.row_sha256 = sha256(row);
    rows.push(row);
    rowIds.add(resource.row_id);
    overrides.delete(resource.row_id);
  }
  if (overrides.size > 0) throw Object.assign(new Error(`row override is not reachable: ${[...overrides.keys()][0]}`), { code: "ROW_OVERRIDE_NOT_REACHED" });
  let nextOrdinal = rows.reduce((maximum, row) => Math.max(maximum, Number(row.ordinal)), -1) + 1;
  for (let index = 0; index < customRows.length; index += 1) {
    const custom = customRows[index] as JsonRecord;
    if (!custom || typeof custom !== "object" || Array.isArray(custom)) throw Object.assign(new Error(`invalid custom row ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    const clientRowId = boundedText(custom.clientRowId, `customRows.${index}.clientRowId`, 200);
    if (!/^[A-Za-z0-9._:-]+$/.test(clientRowId)) throw Object.assign(new Error(`invalid custom row identity ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    const rowId = `manual:${clientRowId}`;
    if (rowIds.has(rowId)) throw Object.assign(new Error(`duplicate custom row ${rowId}`), { code: "ROW_AMENDMENT_INVALID" });
    const provenance = manualProvenance(custom.provenance, `customRows.${index}`);
    const quantity = nonNegativeNumericText(custom.quantity, `customRows.${index}.quantity`)!;
    const unitPrice = nonNegativeNumericText(custom.unitPrice, `customRows.${index}.unitPrice`, true);
    const includedInEstimate = custom.includedInEstimate;
    const includedInProcurement = custom.includedInProcurement;
    if (typeof includedInEstimate !== "boolean" || typeof includedInProcurement !== "boolean"
      || (includedInProcurement && !includedInEstimate)) throw Object.assign(new Error(`invalid custom row inclusion ${index}`), { code: "ROW_AMENDMENT_INVALID" });
    const amount = multiply(quantity, unitPrice);
    addToTotal(amount, includedInEstimate);
    const sourcePayload = { kind: "manual_server_owned_v1", clientRowId, provenance };
    const row = {
      row_id: rowId,
      ordinal: nextOrdinal,
      resource_spec_id: null,
      section: boundedText(custom.section, `customRows.${index}.section`, 240),
      category: boundedText(custom.category, `customRows.${index}.category`, 240),
      title_ru: boundedText(custom.titleRu, `customRows.${index}.titleRu`, 2_000),
      unit_id: boundedText(custom.unitId, `customRows.${index}.unitId`, 120),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null ? null : currencyCode,
      procurement_eligible: true,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInProcurement,
      ownership_status: "MANUAL_SERVER_OWNED",
      calculation_trace: { compilerVersion: COMPILER_VERSION, manualAmendment: provenance },
      normative_trace: [],
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: { kind: "manual_custom_row", provenance, resolved: unitPrice != null },
    } as JsonRecord;
    row.row_sha256 = sha256(row);
    rows.push(row);
    rowIds.add(rowId);
    nextOrdinal += 1;
  }
  const totals = {
    amount: totalAmount,
    includedRowCount: rows.filter((row) => row.included_in_estimate).length,
    excludedRowCount: rows.filter((row) => !row.included_in_estimate).length,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode,
  };
  const revisionProjection = {
    catalogId: job.catalog_id,
    parameters,
    priceSnapshotIds: payload.priceSnapshotIds ?? [],
    currencyCode,
    totals,
    rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
    compilerVersion: COMPILER_VERSION,
  };
  const commitFunction = definition.cumulative_manifest === true
    ? "estimate_commit_cumulative_compile_job_r58"
    : "estimate_commit_compile_job_v1";
  await client.query(`select public.${commitFunction}($1,$2,$3::jsonb,$4::jsonb)`, [job.id, workerId, JSON.stringify({
    rowCount: rows.length,
    currencyCode,
    totals,
    checksumSha256: sha256(revisionProjection),
    compilerVersion: COMPILER_VERSION,
    migrationSource: null,
    resolvedParameters: parameters,
    parameterSources: {
      approvedTemplateBaselineId: definition.approved_template_baseline_id,
      baselineAssumptions,
      userParameters: effectiveUserParameters,
      parentRevisionId: job.parent_revision_id,
    },
  }), JSON.stringify(rows)]);
}

function numericValue(value: unknown, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) throw Object.assign(new Error("invalid legacy numeric value"), { code: "LEGACY_REVISION_INVALID" });
  return normalized;
}

async function migrateLegacyClaimedJob(client: Client, workerId: string, job: JsonRecord): Promise<void> {
  const payload = job.input_payload as JsonRecord;
  const rows = Array.isArray(payload.rows) ? payload.rows as JsonRecord[] : [];
  const sourceProjection = {
    sourceEstimateId: payload.sourceEstimateId,
    sourceRevisionId: payload.sourceRevisionId,
    catalogId: job.catalog_id,
    currencyCode: payload.currencyCode,
    parameters: payload.parameters ?? {},
    totals: payload.totals ?? {},
    rows,
  };
  const sourceChecksumSha256 = sha256(sourceProjection);
  if (sourceChecksumSha256 !== payload.sourceChecksumSha256) throw Object.assign(new Error("legacy checksum mismatch"), { code: "LEGACY_CHECKSUM_MISMATCH" });
  const definition = (await client.query(`select v.id from public.estimate_definition_version v join public.estimate_definition_release r on r.id=v.release_id where r.status='active' and v.catalog_id=$1`, [job.catalog_id])).rows[0];
  if (!definition) throw Object.assign(new Error("definition missing"), { code: "DEFINITION_LOAD_FAILED" });
  const resourceRows = (await client.query("select id,row_id from public.estimate_resource_spec where definition_version_id=$1", [definition.id])).rows;
  const resourceMap = new Map(resourceRows.map((row) => [row.row_id, row.id]));
  const seen = new Set<string>();
  let totalAmount = "0";
  let matchedRows = 0;
  let unmatchedRows = 0;
  const migrated = rows.map((source, ordinal) => {
    const rowId = String(source.rowId ?? "").trim();
    if (!rowId || seen.has(rowId)) throw Object.assign(new Error("duplicate or empty legacy row id"), { code: "LEGACY_REVISION_INVALID" });
    seen.add(rowId);
    const sourcePayload = source.sourcePayload && typeof source.sourcePayload === "object" && !Array.isArray(source.sourcePayload)
      ? source.sourcePayload as JsonRecord
      : source;
    const resourceSpecId = resourceMap.get(rowId) ?? null;
    const sourceQuantity = numericValue(source.quantity, true);
    const sourceUnitPrice = numericValue(source.unitPrice, true);
    const sourceAmount = numericValue(source.amount, true);
    const quantity = sourceQuantity == null ? null : roundDecimal(sourceQuantity, 9);
    const unitPrice = sourceUnitPrice == null ? null : roundDecimal(sourceUnitPrice, 6);
    const amount = sourceAmount == null ? null : roundDecimal(sourceAmount, 2);
    const includedInEstimate = resourceSpecId != null;
    const procurementEligible = source.procurementEligible === true;
    if (includedInEstimate) {
      matchedRows += 1;
      if (amount != null) totalAmount = evaluateFormulaGraph({
        kind: "binary", operator: "+", left: { kind: "literal", value: totalAmount }, right: { kind: "literal", value: amount },
      }, {});
    } else unmatchedRows += 1;
    const row = {
      row_id: rowId,
      ordinal,
      resource_spec_id: resourceSpecId,
      section: String(source.section ?? "legacy"),
      category: String(source.category ?? "legacy"),
      title_ru: String(source.titleRu ?? "").trim(),
      unit_id: String(source.unitId ?? "unit"),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: source.unitPrice == null && source.amount == null ? null : String(payload.currencyCode),
      procurement_eligible: procurementEligible,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInEstimate && procurementEligible,
      ownership_status: includedInEstimate ? "OWNED" : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      calculation_trace: { ...(source.calculationTrace as JsonRecord ?? {}), migration: { sourceOrdinal: ordinal } },
      normative_trace: Array.isArray(source.normativeTrace) ? source.normativeTrace : [],
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: {
        migrated: true,
        sourcePricePreserved: sourceUnitPrice != null,
        ownershipDisposition: includedInEstimate ? "OWNED" : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    } as JsonRecord;
    row.row_sha256 = sha256(row);
    return row;
  });
  const sourceTotals = payload.totals && typeof payload.totals === "object" ? payload.totals as JsonRecord : {};
  const totals = {
    ...sourceTotals,
    amount: totalAmount,
    includedRowCount: matchedRows,
    excludedRowCount: unmatchedRows,
    pricedRowCount: migrated.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: migrated.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode: payload.currencyCode,
  };
  const revisionProjection = {
    sourceChecksumSha256,
    catalogId: job.catalog_id,
    totals,
    rows: migrated.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
    compilerVersion: COMPILER_VERSION,
  };
  await client.query("select public.estimate_commit_compile_job_v1($1,$2,$3::jsonb,$4::jsonb)", [job.id, workerId, JSON.stringify({
    rowCount: migrated.length,
    currencyCode: payload.currencyCode,
    totals,
    checksumSha256: sha256(revisionProjection),
    compilerVersion: COMPILER_VERSION,
    migrationSource: {
      kind: "legacy_revision_post_line_v2",
      sourceEstimateId: payload.sourceEstimateId,
      sourceRevisionId: payload.sourceRevisionId,
      sourceChecksumSha256,
      sourceTotals,
      rowsPreserved: migrated.length,
      matchedRows,
      unmatchedRows,
      unmatchedDisposition: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
    },
  }), JSON.stringify(migrated)]);
}

function artifactFilePath(storageKey: string): string {
  const safe = storageKey.replace(/[^a-zA-Z0-9._/-]+/g, "_").replace(/^[/\\]+/, "");
  const filePath = resolve(ARTIFACT_ROOT, safe);
  if (filePath !== ARTIFACT_ROOT && !filePath.startsWith(`${ARTIFACT_ROOT}\\`) && !filePath.startsWith(`${ARTIFACT_ROOT}/`)) {
    throw new Error("artifact path escaped local root");
  }
  return filePath;
}

function artifactBrowser(): Promise<Browser> {
  artifactBrowserPromise ??= chromium.launch({ headless: true });
  return artifactBrowserPromise;
}

function escapeArtifactHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function professionalPdfQuantity(value: unknown): string {
  if (value == null || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return escapeArtifactHtml(value);
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(numeric);
}

function professionalPdfMoney(value: unknown, currencyCode: unknown): string {
  if (value == null || value === "") return "уточнить";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "уточнить";
  const currency = String(currencyCode ?? "KGS") === "KGS" ? "сом" : String(currencyCode ?? "");
  return `${new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numeric)} ${currency}`.trim();
}

function professionalPdfUnit(row: JsonRecord): string {
  const traceUnit = String((row.calculation_trace as JsonRecord | null)?.displayUnitRu ?? "").trim();
  if (traceUnit) return traceUnit;
  const unit = String(row.unit_id ?? "").trim();
  const fixed: Record<string, string> = {
    set: "компл.",
    item: "шт.",
    pcs: "шт.",
    man_hour: "чел.-ч",
    machine_hour: "маш.-ч",
    t_km: "т·км",
    kg: "кг",
    t: "т",
    l: "л",
    m: "м",
    m2: "м²",
    m3: "м³",
    trip: "рейс",
    document: "док.",
    ratio: "коэф.",
    service: "\u0443\u0441\u043b\u0443\u0433\u0430",
  };
  if (unit !== "test") return fixed[unit] ?? unit;
  const semanticOwner = `${String(row.category ?? "")} ${String(row.title_ru ?? "")}`.toLocaleLowerCase("ru-RU");
  if (/гермет|давлен|опресс|испыт/u.test(semanticOwner)) return "испыт.";
  if (/при[её]м|контрол|провер/u.test(semanticOwner)) return "проверка";
  return "испыт.";
}

function professionalPdfSection(row: JsonRecord): string {
  const identity = `${String(row.section ?? "")} ${String(row.category ?? "")}`.toLowerCase();
  if (/material|waste/u.test(identity)) return "Материалы";
  if (/equipment|machine|machinery/u.test(identity)) return "Машины и оборудование";
  if (/delivery|transport|logistic/u.test(identity)) return "Логистика";
  if (/test|quality|control/u.test(identity)) return "Испытания и контроль";
  return "Работы и услуги";
}

function professionalArtifactToken(input: {
  artifactId: string;
  expiresAt: number;
  ownerUserId: string;
  organizationId: string | null;
}): string {
  const claim = `${input.artifactId}.${input.expiresAt}.${input.ownerUserId}.${input.organizationId ?? "personal"}`;
  return createHmac("sha256", ARTIFACT_TOKEN_SECRET).update(claim).digest("base64url");
}

function artifactTokenMatches(input: {
  signature: string;
  artifactId: string;
  expiresAt: number;
  ownerUserId: string;
  organizationId: string | null;
}): boolean {
  if (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= Date.now()) return false;
  const expected = professionalArtifactToken(input);
  const actualBytes = Buffer.from(input.signature);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

async function buildArtifactClaimedJob(client: Client, workerId: string, job: JsonRecord): Promise<void> {
  const revisionId = String(job.parent_revision_id ?? "");
  const revision = (await client.query("select * from public.estimate_revision where id=$1", [revisionId])).rows[0];
  const allRows = (await client.query("select * from public.estimate_revision_row where revision_id=$1 order by ordinal", [revisionId])).rows;
  if (!revision || allRows.length !== revision.row_count) throw Object.assign(new Error("artifact source invalid"), { code: "ARTIFACT_SOURCE_INVALID" });
  const estimateRows = allRows.filter((row) => row.included_in_estimate
    && row.ownership_status !== "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL");
  const rows = job.operation === "procurement"
    ? estimateRows.filter((row) => row.procurement_eligible && row.included_in_procurement)
    : estimateRows;
  let bytes: Buffer;
  let contentType: string;
  let extension: string;
  let renderer: string;
  if (job.operation === "procurement") {
    bytes = Buffer.from(stableJson({
      schemaVersion: "canonical_estimate_procurement_v2",
      revisionId,
      releaseId: revision.release_id,
      revisionChecksumSha256: revision.checksum_sha256,
      rows,
    }), "utf8");
    contentType = "application/json; charset=utf-8";
    extension = "json";
    renderer = "canonical-procurement-local.r2";
  } else if (job.operation === "professional_pdf") {
    const identity = (await client.query(
      "select title_ru from public.estimate_work_identity where catalog_id=$1",
      [revision.catalog_id],
    )).rows[0];
    const groups = new Map<string, JsonRecord[]>();
    for (const row of rows as JsonRecord[]) {
      const section = professionalPdfSection(row);
      groups.set(section, [...(groups.get(section) ?? []), row]);
    }
    const sections = [...groups.entries()].map(([section, sectionRows]) => `
      <section><h2>${escapeArtifactHtml(section)}</h2><table>
        <thead><tr><th>№</th><th>Позиция</th><th>Ед.</th><th>Количество</th><th>Цена</th><th>Сумма</th></tr></thead>
        <tbody>${sectionRows.map((row) => `<tr><td>${Number(row.ordinal) + 1}</td><td>${escapeArtifactHtml(row.title_ru)}</td><td>${escapeArtifactHtml(professionalPdfUnit(row))}</td><td>${professionalPdfQuantity(row.quantity)}</td><td>${professionalPdfMoney(row.unit_price, row.currency_code ?? revision.currency_code)}</td><td>${professionalPdfMoney(row.amount, row.currency_code ?? revision.currency_code)}</td></tr>`).join("")}</tbody>
      </table></section>`).join("");
    const pricedRows = rows.filter((row) => row.unit_price != null).length;
    const createdDate = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" }).format(new Date(revision.created_at));
    const total = revision.totals?.amount ?? null;
    const browser = await artifactBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
        @page{size:A4;margin:18mm 14mm 18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:10px;line-height:1.35}
        header{border-bottom:3px solid #176b45;padding-bottom:12px;margin-bottom:16px}h1{font-size:24px;margin:0 0 7px;color:#10253d}h2{font-size:14px;color:#176b45;margin:18px 0 7px}
        .subtitle{font-size:14px;font-weight:700}.meta,.notice{color:#526174}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.summary div{background:#eef7f2;border-radius:6px;padding:9px}
        table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#e7edf4;text-align:left}td,th{border:1px solid #cbd4df;padding:5px;vertical-align:top}th:nth-child(1){width:6%}th:nth-child(3){width:10%}th:nth-child(4){width:13%}th:nth-child(5),th:nth-child(6){width:14%}
        tr{break-inside:avoid}.notice{margin-top:18px;padding:10px;border:1px solid #d5dde6;border-radius:6px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:38px}.signature{border-top:1px solid #758195;padding-top:5px}
        footer{position:fixed;bottom:-10mm;left:0;right:0;text-align:center;color:#7b8797;font-size:9px}
      </style></head><body>
        <header><h1>Профессиональная смета</h1><div class="subtitle">${escapeArtifactHtml(identity?.title_ru ?? "Строительно-монтажные работы")}</div><div class="meta">Сформировано ${escapeArtifactHtml(createdDate)} из сохранённой версии сметы</div></header>
        <div class="summary"><div><strong>Позиций</strong><br>${rows.length}</div><div><strong>Цены подтверждены</strong><br>${pricedRows} из ${rows.length}</div><div><strong>Итого</strong><br>${professionalPdfMoney(total, revision.currency_code)}</div></div>
        ${sections}
        <div class="notice"><strong>Основание и допущения.</strong> Документ отображает сохранённые параметры, объёмы и цены выбранной версии. PDF не выполняет повторный расчёт. Неподтверждённые цены отмечены словом «уточнить».</div>
        <div class="signatures"><div class="signature">Заказчик / дата</div><div class="signature">Исполнитель / дата</div></div>
        <footer>Профессиональная смета</footer>
      </body></html>`);
      bytes = await page.pdf({ format: "A4", printBackground: true });
    } finally {
      await page.close();
    }
    contentType = "application/pdf";
    extension = "pdf";
    renderer = "canonical-professional-pdf-local.r3";
  } else {
    const body = rows.map((row) => `<tr><td>${row.ordinal + 1}</td><td>${String(row.title_ru).replace(/[<>&]/g, "")}</td><td>${row.unit_id}</td><td>${row.quantity ?? "—"}</td><td>${row.amount ?? "—"}</td></tr>`).join("");
    const browser = await artifactBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(`<!doctype html><html lang="ru"><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:10px}td,th{border:1px solid #ccc;padding:4px}</style><h1>Каноническая смета</h1><p>Ревизия ${revisionId} · release ${revision.release_id}</p><table>${body}</table></html>`);
      bytes = await page.pdf({ format: "A4", printBackground: true });
    } finally {
      await page.close();
    }
    contentType = "application/pdf";
    extension = "pdf";
    renderer = "playwright-local.r2";
  }
  const artifactSha256 = createHash("sha256").update(bytes).digest("hex");
  const storageKey = `${job.owner_user_id}/${revisionId}/${job.operation}/${revision.checksum_sha256}.${extension}`;
  const path = artifactFilePath(storageKey);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  await client.query("select public.estimate_commit_artifact_job_v1($1,$2,$3::jsonb)", [job.id, workerId, JSON.stringify({
    kind: job.operation,
    storageBucket: "local-estimate-artifacts",
    storageKey,
    contentType,
    byteSize: bytes.byteLength,
    sha256: artifactSha256,
    metadata: {
      renderer,
      ...(job.operation === "professional_pdf" ? { templateVersion: "professional-estimate-pdf:3" } : {}),
      projectedRowCount: rows.length,
      sourceRowCount: Number(revision.row_count),
      sourceCatalogId: revision.catalog_id,
      sourceReleaseId: revision.release_id,
      sourceRevisionChecksumSha256: revision.checksum_sha256,
      sourceOwnerUserId: revision.owner_user_id,
      sourceOrganizationId: revision.organization_id ?? null,
    },
  })]);
}

function cursorAfter(raw: string | null): number {
  if (!raw) return -1;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Number.isSafeInteger(decoded.ordinal) || decoded.ordinal < 0) throw new Error("invalid");
    return decoded.ordinal;
  } catch { throw Object.assign(new Error("invalid rows cursor"), { code: "INVALID_CURSOR", httpStatus: 400 }); }
}

type LocalSearchCursor = { releaseId: string; snapshotSha256: string; orderKey: string; shown: number };

function searchCursor(raw: string | null): LocalSearchCursor | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!decoded || typeof decoded.releaseId !== "string" || typeof decoded.snapshotSha256 !== "string"
      || typeof decoded.orderKey !== "string" || !Number.isSafeInteger(decoded.shown) || decoded.shown < 0) throw new Error("invalid");
    return decoded;
  } catch { throw Object.assign(new Error("invalid search cursor"), { code: "INVALID_CURSOR", httpStatus: 400 }); }
}

function normalizeSearchQuery(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/ё/gu, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

type LocalSearchMode = "ANY" | "ALL" | "PHRASE";

function parseSearchIntent(rawQuery: string, requestedMode: string | null, requestedTokens: string[]) {
  const quantityPattern = /(?:^|\s)(\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[,.](\d+))?\s*(кв\.?\s*м(?:етр(?:ов|а)?)?|квадратн(?:ых|ого|ые)?\s+метр(?:ов|а)?|м[²2]|шт(?:ук|ука|уки)?|штук(?:а|и)?|метр(?:ов|а|ы)?|тонн?(?:а|ы)?|кг|м|т)(?=\s|$)/iu;
  const quantityMatch = quantityPattern.exec(rawQuery.normalize("NFC"));
  const quantity = quantityMatch
    ? Number(`${quantityMatch[1]!.replace(/[\s\u00a0]/gu, "")}.${quantityMatch[2] ?? "0"}`)
    : null;
  const rawUnit = String(quantityMatch?.[3] ?? "").toLocaleLowerCase("ru");
  const unit = !quantityMatch ? null
    : /^(?:кв|квадрат|м[²2])/u.test(rawUnit) ? "м²"
      : /^(?:шт|штук)/u.test(rawUnit) ? "шт"
        : /^(?:тон|т$)/u.test(rawUnit) ? "т"
          : rawUnit === "кг" ? "кг" : "м";
  const searchText = normalizeSearchQuery(quantityMatch
    ? `${rawQuery.slice(0,quantityMatch.index)} ${rawQuery.slice(quantityMatch.index + quantityMatch[0].length)}`
    : rawQuery);
  const explicitMode = String(requestedMode ?? "").trim().toUpperCase();
  const inferredMode:LocalSearchMode = /\s+или\s+/iu.test(searchText) ? "ANY" : "PHRASE";
  const mode:LocalSearchMode = ["ANY","ALL","PHRASE"].includes(explicitMode)
    ? explicitMode as LocalSearchMode : inferredMode;
  const tokenSource = requestedTokens.length > 0 ? requestedTokens
    : mode === "ANY" ? searchText.split(/\s+или\s+|\s*[,;|]\s*/iu)
      : mode === "ALL" ? searchText.split(/\s+и\s+|\s*[,;|]\s*/iu)
        : [searchText];
  const tokens = [...new Set(tokenSource.map(normalizeSearchQuery)
    .filter((token) => (token.match(/[\p{L}\p{N}]/gu) ?? []).length >= 2))];
  return {rawQuery,searchText,quantity,unit,mode,tokens};
}

async function localSearchRelease(client:Client):Promise<Record<string,any>> {
  const release = (await client.query(`select * from public.estimate_search_index_release
    where (($1::uuid is not null and id=$1) or ($1::uuid is null and status='active'))
    order by case when id=$1 then 0 else 1 end,activated_at desc nulls last,created_at desc limit 1`,
  [TARGET_SEARCH_RELEASE_ID || null])).rows[0];
  if (!release) throw Object.assign(new Error("active search release not found"), {code:"NOT_FOUND",httpStatus:404});
  return release;
}

const LOCAL_LITERAL_SEARCH_R58 = `
with tokens as materialized(
  select distinct unnest($2::text[]) q
), token_state as(
  select count(*)::int token_count from tokens
), source_hits as materialized(
  select source.catalog_id source_catalog_id,
    coalesce(source.canonical_target_catalog_id,source.catalog_id) resolved_catalog_id,
    count(distinct token.q)::int matched_count,
    bool_or(source.normalized_catalog_id=token.q or source.normalized_canonical_name=token.q) exact_name,
    bool_or(token.q=any(source.normalized_aliases)) exact_alias,
    bool_or(source.normalized_canonical_name like token.q||'%') prefix_name,
    bool_or(position(token.q in source.normalized_canonical_name)>0) literal_name,
    bool_or(position(token.q in source.normalized_search_blob)>0
      and position(token.q in source.normalized_canonical_name)=0) literal_alias,
    string_agg(distinct token.q,' | ' order by token.q) matched_term
  from public.estimate_search_document source
  cross join tokens token
  where source.search_release_id=$1
    and case upper($8)
      when 'REFERENCES' then source.adjudication_class='EXTERNAL_REFERENCE'
      else source.adjudication_class='EFFECTIVE_WORK' and source.selectable
        or source.adjudication_class in('ALIAS','DUPLICATE') and exists(
          select 1 from public.estimate_search_document target
          where target.search_release_id=source.search_release_id
            and target.catalog_id=source.canonical_target_catalog_id
            and target.adjudication_class='EFFECTIVE_WORK' and target.selectable)
    end
    and position(token.q in source.normalized_search_blob)>0
  group by source.catalog_id,source.canonical_target_catalog_id
), accepted as materialized(
  select hit.*,
    case when hit.exact_name then 1 when hit.exact_alias then 2 when hit.prefix_name then 3
      when hit.literal_alias and not hit.literal_name then 4 else 5 end tier
  from source_hits hit cross join token_state state
  where (upper($3)='ANY' and hit.matched_count>0)
    or (upper($3)='ALL' and state.token_count>0 and hit.matched_count=state.token_count)
    or (upper($3)='PHRASE' and state.token_count=1 and hit.matched_count=1)
), filtered as materialized(
  select hit.*,target.catalog_origin,target.group_id,target.domain_id,target.system_id,target.work_family_id,
    row_number() over(partition by hit.resolved_catalog_id order by hit.tier,
      hit.source_catalog_id=hit.resolved_catalog_id desc,hit.source_catalog_id) resolved_ordinal
  from accepted hit
  join public.estimate_search_document target
    on target.search_release_id=$1 and target.catalog_id=hit.resolved_catalog_id
  where (coalesce($4,'')='' or target.domain_id=$4)
    and (coalesce($5,'')='' or target.group_id=$5)
    and (coalesce($6,'')='' or target.operation_kind=$6)
), deduplicated as materialized(
  select filtered.*,
    concat_ws(E'\\u001f',lpad(filtered.tier::text,2,'0'),filtered.domain_id,
      filtered.system_id,filtered.work_family_id,filtered.resolved_catalog_id) stable_order_key
  from filtered where resolved_ordinal=1
), summary as materialized(
  select count(*)::bigint literal_total_count,
    count(*) filter(where catalog_origin='GLOBAL')::bigint global_literal_total_count,
    count(*) filter(where catalog_origin<>'GLOBAL')::bigint external_literal_total_count,
    count(distinct group_id)::bigint group_total_count,
    encode(extensions.digest(convert_to(coalesce(string_agg(
      resolved_catalog_id||E'\\u001f'||tier::text||E'\\u001f'||stable_order_key,
      E'\\n' order by stable_order_key),''),'UTF8'),'sha256'),'hex') result_set_sha256
  from deduplicated
), page as(
  select hit.*,summary.* from deduplicated hit cross join summary
  where $7::text is null or hit.stable_order_key>$7
  order by hit.stable_order_key limit $9
)
select document.*,group_row.group_name_ru,page.source_catalog_id,page.tier,page.matched_term,
  page.stable_order_key,page.literal_total_count,page.global_literal_total_count,
  page.external_literal_total_count,page.group_total_count,page.result_set_sha256
from page
join public.estimate_search_document document
  on document.search_release_id=$1 and document.catalog_id=page.resolved_catalog_id
join public.estimate_search_group group_row
  on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
order by page.stable_order_key`;

function levenshtein(left:string,right:string):number {
  const prior=Array.from({length:right.length+1},(_,index)=>index);
  for(let leftIndex=1;leftIndex<=left.length;leftIndex+=1){
    let diagonal=prior[0]!;
    prior[0]=leftIndex;
    for(let rightIndex=1;rightIndex<=right.length;rightIndex+=1){
      const above=prior[rightIndex]!;
      prior[rightIndex]=Math.min(prior[rightIndex]!+1,prior[rightIndex-1]!+1,
        diagonal+(left[leftIndex-1]===right[rightIndex-1] ? 0 : 1));
      diagonal=above;
    }
  }
  return prior[right.length]!;
}

function fuzzySearchPage(rows:Record<string,any>[],query:string,after:string|null,limit:number) {
  const queryTokens=query.split(" ").filter(Boolean);
  const ranked=rows.flatMap<Record<string,any>>((row) => {
    const terms=[...new Set([row.normalized_canonical_name,...(row.normalized_search_terms ?? [])]
      .map(String).filter(Boolean))];
    const best=queryTokens.map((queryToken) => terms
      .filter((term)=>term.slice(0,2)===queryToken.slice(0,2)).map((term) => ({term,
      distance:levenshtein(queryToken,term)})).sort((left,right) => left.distance-right.distance
        || left.term.localeCompare(right.term,"ru"))[0]).filter(Boolean) as {term:string;distance:number}[];
    if(best.length!==queryTokens.length) return [];
    const maximumDistance=best.reduce((sum,item)=>sum+item.distance,0);
    const allowedDistance=queryTokens.reduce((sum,token)=>sum+Math.max(1,Math.floor(token.length*0.34)),0);
    if(maximumDistance>allowedDistance) return [];
    const score=Math.max(0,1-maximumDistance/Math.max(1,queryTokens.join("").length));
    const stableOrderKey=`06\u001f${String(Math.round((1-score)*1_000_000)).padStart(7,"0")}\u001f${row.catalog_id}`;
    return [{...row,source_catalog_id:row.catalog_id,tier:6,matched_term:best.map((item)=>item.term).join(" | "),
      stable_order_key:stableOrderKey,score} as Record<string,any>];
  }).sort((left,right)=>String(left.stable_order_key).localeCompare(String(right.stable_order_key)));
  const resultSetSha256=createHash("sha256").update(stableJson(ranked.map((row)=>[
    row.catalog_id,row.score,row.stable_order_key]))).digest("hex");
  const groupTotalCount=new Set(ranked.map((row)=>row.group_id)).size;
  const page=ranked.filter((row)=>after==null || row.stable_order_key>after).slice(0,limit)
    .map((row)=>({...row,fuzzy_total_count:ranked.length,group_total_count:groupTotalCount,
      result_set_sha256:resultSetSha256,literal_total_count:0,global_literal_total_count:0,
      external_literal_total_count:0}));
  return page;
}

function localParameterGuideView(source: unknown) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return undefined;
  const guide = source as Record<string, unknown>;
  return {
    guideKind: guide.guide_kind, guideShortRu: guide.guide_short_ru,
    guideMin: guide.guide_min, guideMax: guide.guide_max, guideTarget: guide.guide_target,
    minInclusive: guide.min_inclusive, maxInclusive: guide.max_inclusive,
    guideOptions: guide.guide_options, canonicalUnit: guide.canonical_unit,
    displayUnit: guide.display_unit, guideBasis: guide.guide_basis,
    precision: guide.precision, step: guide.step, guideCondition: guide.guide_condition,
    guideValidationPolicy: guide.guide_validation_policy, sourceRole: guide.source_role,
    sourceDocument: guide.source_document, sourceEditionStatus: guide.source_edition_status,
    sourceLocator: guide.source_locator, guideVersion: guide.guide_version,
    sourceSnapshotHash: guide.source_snapshot_hash, applicability: guide.applicability,
    exclusions: guide.exclusions, verifiedAt: guide.verified_at,
  };
}

function localDraftView(row: Record<string, any>) {
  return { draftId: row.id, status: row.status, title: row.title, originalQuery: row.original_query, normalizedQuery: row.normalized_query, searchIndexReleaseId: row.search_index_release_id, taxonomyVersion: row.taxonomy_version, groupRelationVersion: row.group_relation_version, searchResultSetHash: row.search_result_set_hash, candidateSetHash: row.candidate_set_hash, selectedResultHash: row.selected_result_hash, selectedCatalogIds: row.selected_catalog_ids, selectedWorkOrder: row.selected_work_order, parameterSchemaVersions: row.parameter_schema_versions, typedInputs: row.typed_inputs, unresolvedRequiredParameters: row.unresolved_required_parameters, conflicts: row.conflicts, latestRevisionId: row.latest_revision_id, optimisticVersion: Number(row.optimistic_version), lastDeviceId: row.last_device_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = url.pathname.split("/").filter(Boolean).filter((part, index) => !(index === 0 && part === "canonical-estimate"));
  if (request.method === "GET" && path.length === 2 && path[0] === "artifact-files") {
    const artifact = await findAcrossModelDatabases(async (client) => (await client.query(`
      select a.*,r.owner_user_id,r.organization_id from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
      where a.id=$1 and a.status='ready' and r.owner_user_id=$2
    `, [path[1], OWNER_ID])).rows[0]);
    if (!artifact?.storage_key) throw Object.assign(new Error("artifact file not found"), { code: "NOT_FOUND", httpStatus: 404 });
    const expiresAt = Number(url.searchParams.get("expires"));
    const signature = String(url.searchParams.get("signature") ?? "");
    if (!artifactTokenMatches({
      signature,
      artifactId: artifact.id,
      expiresAt,
      ownerUserId: artifact.owner_user_id,
      organizationId: artifact.organization_id ?? null,
    })) {
      throw Object.assign(new Error("artifact signature invalid"), { code: "AUTH_REQUIRED", httpStatus: 401 });
    }
    const bytes = readFileSync(artifactFilePath(artifact.storage_key));
    response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": artifact.content_type, "Content-Length": String(bytes.byteLength), "Cache-Control": "private, no-store" });
    response.end(bytes);
    return;
  }
  requireLocalOwner(request);
  if (request.method === "GET" && path.length === 1 && path[0] === "runtime-manifest") {
    const modelDatabase = await withClient(async (client) => {
      const definitionRelease = (await client.query(`
        select id,status,source_manifest_sha256 from public.estimate_definition_release
        where status='active' order by activated_at desc nulls last,created_at desc limit 1
      `)).rows[0] ?? null;
      const counts = (await client.query(`select
        (select count(*)::integer from public.estimate_definition_version d join public.estimate_definition_release r on r.id=d.release_id where r.status='active') active_definitions
      `)).rows[0];
      return { definitionRelease, counts };
    });
    const searchDatabase = await withSearchClient(async (client) => {
      const searchRelease = (await client.query(`
        select id,status,snapshot_sha256,taxonomy_version,group_relation_version,ranking_contract_version
        from public.estimate_search_index_release
        where (($1::uuid is not null and id=$1) or ($1::uuid is null and status='active'))
        order by case when id=$1 then 0 else 1 end,activated_at desc nulls last,created_at desc limit 1
      `,[TARGET_SEARCH_RELEASE_ID || null])).rows[0] ?? null;
      const counts = (await client.query(`select
        (select count(*)::integer from public.estimate_search_document d join public.estimate_search_index_release r on r.id=d.search_release_id where r.status='active') active_search_documents
      `)).rows[0];
      return { searchRelease, counts };
    });
    const parsedDatabaseUrl = new URL(DATABASE_URL);
    const parsedSearchDatabaseUrl = new URL(SEARCH_DATABASE_URL);
    return send(response, 200, {
      schemaVersion: "p0-estimate-truth-remediation-r4.5-runtime-manifest.v1",
      runtimeRole: "FULL_CANONICAL_ESTIMATE_BACKEND",
      processId: process.pid,
      parentProcessId: process.ppid,
      startedAt: R45_RUNTIME_STARTED_AT,
      workingDirectory: process.cwd(),
      sourceHead: R45_RUNTIME_SOURCE_HEAD,
      sourceTree: R45_RUNTIME_SOURCE_TREE,
      specSha256: R45_RUNTIME_SPEC_SHA256,
      database: {
        host: parsedDatabaseUrl.hostname,
        port: parsedDatabaseUrl.port,
        name: parsedDatabaseUrl.pathname.replace(/^\//, ""),
        searchOnly: false,
      },
      searchDatabase: {
        host: parsedSearchDatabaseUrl.hostname,
        port: parsedSearchDatabaseUrl.port,
        name: parsedSearchDatabaseUrl.pathname.replace(/^\//, ""),
      },
      definitionRelease: modelDatabase.definitionRelease,
      searchRelease: searchDatabase.searchRelease,
      activeDefinitionCount: Number(modelDatabase.counts?.active_definitions ?? 0),
      activeSearchDocumentCount: Number(searchDatabase.counts?.active_search_documents ?? 0),
    });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "search" && path[1] === "catalog") {
    const startedAt = performance.now();
    const query = String(url.searchParams.get("query") ?? "").trim().slice(0, 240);
    const intent = parseSearchIntent(query,url.searchParams.get("mode"),url.searchParams.getAll("token"));
    if (intent.tokens.length === 0) throw Object.assign(new Error("Введите не менее двух значимых символов."), { code: "SEARCH_MIN_SIGNIFICANT_CHARS", httpStatus: 400 });
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 50) || 50));
    const cursor = searchCursor(url.searchParams.get("cursor"));
    const filters = Object.fromEntries([["domain_id", String(url.searchParams.get("domain") ?? "").trim()], ["group_id", String(url.searchParams.get("groupId") ?? "").trim()], ["operation_kind", String(url.searchParams.get("operationKind") ?? "").trim()]].filter((entry) => entry[1]));
    const scope = String(url.searchParams.get("scope") ?? "WORKS").toUpperCase() === "REFERENCES" ? "REFERENCES" : "WORKS";
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (cursor && (cursor.releaseId !== release.id || cursor.snapshotSha256 !== release.snapshot_sha256)) throw Object.assign(new Error("Поисковый индекс обновился. Повторите запрос."), { code: "STALE_SEARCH_SNAPSHOT", httpStatus: 409 });
      let rows = (await client.query(LOCAL_LITERAL_SEARCH_R58,[release.id,intent.tokens,intent.mode,
        filters.domain_id ?? "",filters.group_id ?? "",filters.operation_kind ?? "",
        cursor?.orderKey ?? null,scope,limit])).rows;
      let resultLevel:"LITERAL"|"FUZZY"="LITERAL";
      if (rows.length===0 && intent.mode==="PHRASE" && scope==="WORKS") {
        const candidates=(await client.query(`select document.catalog_id,document.definition_version_id,
          document.definition_release_id,document.canonical_name_ru,document.group_id,group_row.group_name_ru,
          document.domain_id,document.system_id,document.subsystem_id,document.assembly_id,
          document.work_family_id,document.element_type,document.operation_kind,document.technology_variant,
          document.primary_uom,document.publication_state,document.catalog_origin,document.adjudication_class,
          document.selectable,document.short_scope_ru,document.key_distinguishing_parameters,
          document.required_inputs_count,document.clarification_fields,document.included_boundaries,
          document.excluded_boundaries,document.normalized_canonical_name,document.normalized_search_terms
        from public.estimate_search_document document
        join public.estimate_search_group group_row
          on group_row.search_release_id=document.search_release_id and group_row.group_id=document.group_id
        where document.search_release_id=$1 and document.adjudication_class='EFFECTIVE_WORK'
          and document.selectable and length(replace($2,' ',''))>2
          and exists(select 1 from unnest(document.normalized_search_terms) term
            where term like left($2,2)||'%')
          and (coalesce($3,'')='' or document.domain_id=$3)
          and (coalesce($4,'')='' or document.group_id=$4)
          and (coalesce($5,'')='' or document.operation_kind=$5)`,[release.id,intent.searchText,
          filters.domain_id ?? "",filters.group_id ?? "",filters.operation_kind ?? ""])).rows;
        rows=fuzzySearchPage(candidates,intent.searchText,cursor?.orderKey ?? null,limit);
        resultLevel="FUZZY";
      }
      const inventoryAuditReleaseId = String(
        release.metadata?.parentSearchReleaseId ?? release.metadata?.parent_search_release_id ?? release.id,
      );
      const inventory = url.searchParams.get("auditInventory") === "true" ? (await client.query(`with tokens as(
        select distinct unnest($2::text[]) q
      ),hits as(
        select document.catalog_id,count(distinct token.q)::int matched
        from public.estimate_search_document document cross join tokens token
        where document.search_release_id=$1 and position(token.q in document.normalized_search_blob)>0
        group by document.catalog_id
      ) select count(*)::bigint inventory_literal_total_count from hits
      cross join (select count(*)::int token_count from tokens) state
      where (upper($3)='ANY' and hits.matched>0)
        or (upper($3)='ALL' and state.token_count>0 and hits.matched=state.token_count)
        or (upper($3)='PHRASE' and state.token_count=1 and hits.matched=1)`,
      [inventoryAuditReleaseId,intent.tokens,intent.mode])).rows[0] : null;
      return { release,rows,inventory,resultLevel };
    });
    const literalTotalCount = Number(result.rows[0]?.literal_total_count ?? 0);
    const globalLiteralTotalCount = Number(result.rows[0]?.global_literal_total_count ?? literalTotalCount);
    const externalLiteralTotalCount = Number(result.rows[0]?.external_literal_total_count ?? 0);
    const groupTotalCount = Number(result.rows[0]?.group_total_count ?? 0);
    const fuzzyTotalCount = Number(result.rows[0]?.fuzzy_total_count ?? 0);
    const shownCount = (cursor?.shown ?? 0) + result.rows.length;
    const last = result.rows[result.rows.length - 1];
    return send(response,200,{apiVersion:API_VERSION,searchIndexReleaseId:result.release.id,
      searchIndexReleaseStatus:result.release.status,searchIndexSnapshotSha256:result.release.snapshot_sha256,
      taxonomyVersion:result.release.taxonomy_version,groupRelationVersion:result.release.group_relation_version,
      rankingContractVersion:result.release.ranking_contract_version,
      resultSetSha256:result.rows[0]?.result_set_sha256 ?? createHash("sha256").update("[]").digest("hex"),
      rawQuery:intent.rawQuery,normalizedQuery:intent.searchText,searchText:intent.searchText,
      searchMode:intent.mode,searchTokens:intent.tokens,parsedQuantity:intent.quantity,parsedUnit:intent.unit,
      filters,scope,resultLevel:result.resultLevel,literalTotalCount,globalLiteralTotalCount,externalLiteralTotalCount,groupTotalCount,
      inventoryLiteralTotalCount:result.inventory == null ? null
        : Number(result.inventory.inventory_literal_total_count ?? 0),
      fuzzyTotalCount,suggestionTotalCount:fuzzyTotalCount,shownCount,
      items:result.rows.map((row:Record<string,any>) => {
        const matchTier=Number(row.tier) as 1|2|3|4|5|6;
        const matchType=matchTier===1 ? "T1_EXACT" : matchTier===2 ? "T2_EXACT_ALIAS"
          : matchTier===3 ? "T3_CANONICAL_PREFIX" : matchTier===4 ? "T4_TOKEN_PREFIX"
            : matchTier===5 ? "T5_NORMALIZED_SUBSTRING" : "T6_TYPO_TRANSLITERATION_SUGGESTION";
        const matchedAlias=matchTier===2 || matchTier===4;
        const estimateReady=row.selectable===true && Boolean(row.definition_version_id)
          && row.publication_state==="ADMITTED_BACKEND";
        return {catalogId:row.catalog_id,definitionVersionId:row.definition_version_id,
          definitionReleaseId:row.definition_release_id,canonicalNameRu:row.canonical_name_ru,
          groupId:row.group_id,groupNameRu:row.group_name_ru,domainId:row.domain_id,
          systemId:row.system_id,subsystemId:row.subsystem_id,assemblyId:row.assembly_id,
          workFamilyId:row.work_family_id,elementType:row.element_type,operationKind:row.operation_kind,
          technologyVariant:row.technology_variant,primaryUom:row.primary_uom,
          publicationState:row.publication_state,catalogOrigin:row.catalog_origin,
          adjudicationClass:row.adjudication_class,estimateReady,
          shortScopeRu:row.short_scope_ru,keyDistinguishingParameters:row.key_distinguishing_parameters,
          requiredInputsCount:row.required_inputs_count,clarificationFields:row.clarification_fields,
          includedBoundaries:row.included_boundaries,excludedBoundaries:row.excluded_boundaries,
          replacementCatalogId:row.source_catalog_id!==row.catalog_id ? row.catalog_id : null,
          matchTier,matchType,matchedTerm:row.matched_term,
          matchedField:matchTier===6 ? "fuzzy_name_or_alias" : matchedAlias ? "aliases" : "canonical_name_ru",
          rankingReasonRu:matchTier===1 ? "Точное совпадение идентификатора или названия"
            : matchTier===2 ? "Точный зарегистрированный синоним"
              : matchTier===3 ? "Начало канонического названия"
                : matchTier===4 ? "Буквальное вхождение в разрешённый синоним"
                  : matchTier===5 ? "Буквальное вхождение без ограничения первых 15 результатов"
                    : "Отдельная нечёткая подсказка; не смешана с literal-выдачей",
          selectableMode:estimateReady ? "PROFESSIONAL"
            : row.adjudication_class==="EXTERNAL_REFERENCE" ? "PRELIMINARY" : "NONE",
          nonselectableReasonRu:estimateReady ? null : row.adjudication_class==="EXTERNAL_REFERENCE"
            ? "Справочная запись; не является selectable профессиональной работой."
            : "Работа выведена из актуального каталога."};
      }),nextCursor:last && shownCount<(literalTotalCount+fuzzyTotalCount) ? Buffer.from(JSON.stringify({
        releaseId:result.release.id,snapshotSha256:result.release.snapshot_sha256,
        orderKey:last.stable_order_key,shown:shownCount})).toString("base64url") : null,
      durationMs:Number((performance.now()-startedAt).toFixed(3))});
  }
  if (request.method === "GET" && path.length === 3 && path[0] === "search" && path[1] === "groups") {
    const groupId = decodeURIComponent(path[2]);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 50) || 50));
    const cursor = searchCursor(url.searchParams.get("cursor"));
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (cursor && (cursor.releaseId !== release.id || cursor.snapshotSha256 !== release.snapshot_sha256)) throw Object.assign(new Error("Поисковый индекс обновился. Откройте группу заново."), { code: "STALE_SEARCH_SNAPSHOT", httpStatus: 409 });
      const rows = (await client.query("select * from public.estimate_list_search_group_r58($1,$2,$3,$4)",
        [release.id,groupId,cursor?.orderKey ?? null,limit])).rows;
      return { release, rows };
    });
    if (!result.rows.length && !cursor) throw Object.assign(new Error("search group not found"), { code: "NOT_FOUND", httpStatus: 404 });
    const totalCount = Number(result.rows[0]?.member_count ?? 0);
    const shownCount = (cursor?.shown ?? 0) + result.rows.length;
    const last = result.rows[result.rows.length - 1];
    return send(response, 200, { apiVersion: API_VERSION, searchIndexReleaseId: result.release.id, searchIndexSnapshotSha256: result.release.snapshot_sha256, taxonomyVersion: result.release.taxonomy_version, groupRelationVersion: result.release.group_relation_version, groupId, groupNameRu: result.rows[0]?.group_name_ru ?? "", totalCount, shownCount, items: result.rows.map((row: Record<string, any>) => ({ catalogId: row.catalog_id, canonicalNameRu: row.canonical_name_ru, publicationState: row.publication_state, catalogOrigin: row.catalog_origin, operationKind: row.operation_kind, technologyVariant: row.technology_variant })), nextCursor: last && shownCount < totalCount ? Buffer.from(JSON.stringify({ releaseId: result.release.id, snapshotSha256: result.release.snapshot_sha256, orderKey: String(last.catalog_id), shown: shownCount })).toString("base64url") : null });
  }
  if (request.method === "GET" && path.length === 4 && path[0] === "search" && path[1] === "catalog" && path[3] === "relations") {
    const catalogId = decodeURIComponent(path[2]);
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      const rows = (await client.query(`select r.*,d.canonical_name_ru target_name_ru from public.estimate_search_typed_relation r join public.estimate_search_document d on d.search_release_id=r.search_release_id and d.catalog_id=r.target_catalog_id where r.search_release_id=$1 and r.source_catalog_id=$2 order by r.relationship_type,r.target_catalog_id`, [release.id, catalogId])).rows;
      return { release, rows };
    });
    return send(response, 200, { apiVersion: API_VERSION, searchIndexReleaseId: result.release.id, groupRelationVersion: result.release.group_relation_version, items: result.rows.map((row: Record<string, any>) => ({ sourceCatalogId: row.source_catalog_id, targetCatalogId: row.target_catalog_id, targetCanonicalNameRu: row.target_name_ru, relationshipType: row.relationship_type, direction: row.direction, sourceLocator: row.source_locator, applicabilityPredicate: row.applicability_predicate, requiredWhen: row.required_when, mutuallyExclusiveWith: row.mutually_exclusive_with, explanationRu: row.explanation_ru, relationSha256: row.relation_sha256 })) });
  }
  if (request.method === "POST" && path.length === 1 && path[0] === "drafts") {
    const body = await readBody(request) as Record<string, any>;
    const result = await withSearchClient(async (client) => {
      const release = await localSearchRelease(client);
      if (!release || (body.searchIndexReleaseId && body.searchIndexReleaseId !== release.id)) throw Object.assign(new Error("stale search snapshot"), { code: "STALE_SEARCH_SNAPSHOT", httpStatus: 409 });
      const selected = Array.isArray(body.selectedCatalogIds) ? [...new Set(body.selectedCatalogIds.map(String))] : [];
      if (selected.length) {
        const known = Number((await client.query("select count(*) count from public.estimate_search_document where search_release_id=$1 and catalog_id=any($2::text[]) and adjudication_class='EFFECTIVE_WORK' and selectable and definition_version_id is not null", [release.id, selected])).rows[0].count);
        if (known !== selected.length) throw Object.assign(new Error("invalid search selection"), { code: "INVALID_SEARCH_SELECTION", httpStatus: 409 });
      }
      return (await client.query(`insert into public.estimate_draft(owner_user_id,status,title,original_query,normalized_query,search_filters,search_index_release_id,taxonomy_version,group_relation_version,search_result_set_hash,candidate_set_hash,selected_result_hash,selected_catalog_ids,selected_work_order,last_device_id) values($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$10,$11,$12,$12,$13) returning *`, [OWNER_ID, selected.length ? "DRAFT_INPUT_REQUIRED" : "SEARCHING", String(body.title ?? body.originalQuery ?? ""), String(body.originalQuery ?? ""), normalizeSearchQuery(String(body.originalQuery ?? "")), JSON.stringify(body.searchFilters ?? {}), release.id, release.taxonomy_version, release.group_relation_version, body.searchResultSetHash ?? null, selected.length ? sha256(selected) : null, selected, body.deviceId ?? null])).rows[0];
    });
    return send(response, 201, { apiVersion: API_VERSION, draft: localDraftView(result) });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "drafts") {
    const draft = await withSearchClient(async (client) => (await client.query("select * from public.estimate_draft where id=$1 and owner_user_id=$2", [path[1], OWNER_ID])).rows[0]);
    if (!draft) throw Object.assign(new Error("draft not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, draft: localDraftView(draft) });
  }
  if (request.method === "POST" && path.length === 3 && path[0] === "drafts" && path[2] === "events") {
    const body = await readBody(request) as Record<string, any>;
    const draft = await withSearchClient(async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
        const row = (await client.query("select public.estimate_apply_draft_event_r2($1,$2,$3,$4,$5::jsonb,$6) value", [path[1], body.idempotencyKey, body.baseOptimisticVersion, body.eventKind, JSON.stringify(body.patch ?? {}), body.deviceId ?? null])).rows[0]?.value;
        await client.query("commit");
        return row;
      } catch (error) { await client.query("rollback"); throw error; }
    });
    return send(response, 200, { apiVersion: API_VERSION, draft: localDraftView(draft) });
  }
  if (request.method === "POST" && path.join("/") === "jobs/compile") return send(response, 202, await createJob(await readBody(request), "compile"));
  if (request.method === "POST" && path.join("/") === "jobs/recalculate") return send(response, 202, await createJob(await readBody(request), "recalculate"));
  if (request.method === "POST" && path.join("/") === "migrations/legacy-revisions") return send(response, 202, await createLegacyJob(await readBody(request)));
  if (request.method === "GET" && path.length === 2 && path[0] === "jobs") {
    const job = await findAcrossModelDatabases(async (client) => (await client.query("select * from public.estimate_compile_job where id=$1 and owner_user_id=$2", [path[1], OWNER_ID])).rows[0]);
    if (!job) throw Object.assign(new Error("job not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, jobId: job.id, operation: job.operation, status: job.status, stage: job.stage, progress: job.progress, attempt: job.attempt, resultRevisionId: job.result_revision_id, errorCode: job.error_code, createdAt: job.created_at, updatedAt: job.updated_at });
  }
  if (request.method === "POST" && path.length === 3 && path[0] === "jobs" && path[2] === "cancel") {
    const modelDatabaseUrl = await modelDatabaseUrlForJob(path[1]);
    const cancelled = await withDatabaseClient(modelDatabaseUrl, async (client) => {
      await client.query("begin");
      try {
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
        const result = await client.query("select public.estimate_cancel_compile_job_v1($1) cancelled", [path[1]]);
        await client.query("commit");
        return result.rows[0]?.cancelled === true;
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
    if (!cancelled) throw Object.assign(new Error("job is not cancellable"), { code: "JOB_NOT_CANCELLABLE", httpStatus: 409 });
    return send(response, 200, { apiVersion: API_VERSION, jobId: path[1], status: "cancelled" });
  }
  if (request.method === "GET" && path.length === 1 && path[0] === "revisions") {
    const catalogId = String(url.searchParams.get("catalogId") ?? "").trim();
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));
    const before = url.searchParams.get("cursor") == null ? null : Number(url.searchParams.get("cursor"));
    if (!catalogId || (before != null && (!Number.isSafeInteger(before) || before <= 0))) throw Object.assign(new Error("invalid revision history query"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
    const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
    const revisions = await withDatabaseClient(modelDatabaseUrl, async (client) => (await client.query(`
      select * from public.estimate_revision where owner_user_id=$1 and catalog_id=$2
        and ($3::integer is null or revision_number<$3) order by revision_number desc limit $4
    `, [OWNER_ID, catalogId, before, limit + 1])).rows);
    const page = revisions.slice(0, limit);
    return send(response, 200, {
      apiVersion: API_VERSION,
      revisions: page.map((revision) => ({
        revisionId: revision.id, parentRevisionId: revision.parent_revision_id, releaseId: revision.release_id,
        catalogId: revision.catalog_id, revisionNumber: revision.revision_number, status: revision.status,
        currencyCode: revision.currency_code, parameters: revision.input_parameters, amendmentContract: revision.amendment_contract, totals: revision.totals,
        rowCount: revision.row_count, checksumSha256: revision.checksum_sha256,
        compilerVersion: revision.compiler_version,
        definitionVersion: revision.definition_version ?? null,
        compilerOwner: revision.compiler_owner ?? "backend",
        parameterSchemaHash: revision.parameter_schema_hash ?? null,
        inputHash: revision.input_hash ?? null,
        outputHash: revision.output_hash ?? revision.checksum_sha256,
        createdAt: revision.created_at,
      })),
      nextCursor: revisions.length > limit ? String(page[page.length - 1].revision_number) : null,
    });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "revisions") {
    const revision = await findAcrossModelDatabases(async (client) => (await client.query("select * from public.estimate_revision where id=$1 and owner_user_id=$2", [path[1], OWNER_ID])).rows[0]);
    if (!revision) throw Object.assign(new Error("revision not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, revisionId: revision.id, parentRevisionId: revision.parent_revision_id, releaseId: revision.release_id, catalogId: revision.catalog_id, revisionNumber: revision.revision_number, status: revision.status, currencyCode: revision.currency_code, parameters: revision.input_parameters, amendmentContract: revision.amendment_contract, totals: revision.totals, rowCount: revision.row_count, checksumSha256: revision.checksum_sha256, compilerVersion: revision.compiler_version, definitionVersion: revision.definition_version ?? null, compilerOwner: revision.compiler_owner ?? "backend", parameterSchemaHash: revision.parameter_schema_hash ?? null, inputHash: revision.input_hash ?? null, outputHash: revision.output_hash ?? revision.checksum_sha256, createdAt: revision.created_at });
  }
  if (request.method === "GET" && path.length === 3 && path[0] === "revisions" && path[2] === "rows") {
    const after = cursorAfter(url.searchParams.get("cursor"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
    const modelDatabaseUrl = await modelDatabaseUrlForRevision(path[1]);
    const rows = await withDatabaseClient(modelDatabaseUrl, async (client) => (await client.query(`
      select rr.* from public.estimate_revision_row rr
      join public.estimate_revision r on r.id=rr.revision_id
      where rr.revision_id=$1 and r.owner_user_id=$2 and rr.ordinal>$3 order by rr.ordinal limit $4
    `, [path[1], OWNER_ID, after, limit + 1])).rows);
    const page = rows.slice(0, limit);
    return send(response, 200, { apiVersion: API_VERSION, revisionId: path[1], rows: page.map((row) => ({ rowId: row.row_id, ordinal: row.ordinal, section: row.section, category: row.category, titleRu: row.title_ru, unitId: row.unit_id, quantity: row.quantity == null ? null : String(row.quantity), unitPrice: row.unit_price == null ? null : String(row.unit_price), amount: row.amount == null ? null : String(row.amount), currencyCode: row.currency_code, procurementEligible: row.procurement_eligible, includedInEstimate: row.included_in_estimate, includedInProcurement: row.included_in_procurement, ownershipStatus: row.ownership_status, calculationTrace: row.calculation_trace, normativeTrace: row.normative_trace, rowSha256: row.row_sha256 })), nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ ordinal: page[page.length - 1].ordinal })).toString("base64url") : null });
  }
  if (path.length === 4 && path[0] === "revisions" && path[2] === "artifacts" && (path[3] === "pdf" || path[3] === "professional_pdf" || path[3] === "procurement")) {
    const publicKind = path[3] as "pdf" | "professional_pdf" | "procurement";
    const body = request.method === "POST" ? await readBody(request) : {};
    const requestedProfile = String(
      request.method === "POST" ? body.documentProfile ?? "" : url.searchParams.get("documentProfile") ?? "",
    ).trim();
    if (requestedProfile && requestedProfile !== "professional_v1") {
      throw Object.assign(new Error("unsupported PDF document profile"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    if (requestedProfile && publicKind !== "pdf") {
      throw Object.assign(new Error("documentProfile is only valid for PDF"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
    }
    const kind = (
      publicKind === "pdf" && requestedProfile === "professional_v1" ? "professional_pdf" : publicKind
    ) as "pdf" | "professional_pdf" | "procurement";
    if (request.method === "POST") return send(response, 202, await createArtifactJob(body, path[1], kind));
    if (request.method === "GET") {
      const modelDatabaseUrl = await modelDatabaseUrlForRevision(path[1]);
      const artifact = await withDatabaseClient(modelDatabaseUrl, async (client) => (await client.query(`
        select a.*,r.release_id,r.catalog_id,r.row_count,r.checksum_sha256 revision_checksum_sha256,
          r.owner_user_id,r.organization_id
        from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
        where a.revision_id=$1 and a.artifact_kind=$2 and r.owner_user_id=$3
      `, [path[1], kind, OWNER_ID])).rows[0]);
      if (!artifact) throw Object.assign(new Error("artifact not found"), { code: "NOT_FOUND", httpStatus: 404 });
      const forwardedProtocol = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0]?.trim();
      const protocol = forwardedProtocol === "https" ? "https" : "http";
      const signedUrlExpiresAtMs = Date.now() + 900_000;
      const signature = professionalArtifactToken({
        artifactId: artifact.id,
        expiresAt: signedUrlExpiresAtMs,
        ownerUserId: artifact.owner_user_id,
        organizationId: artifact.organization_id ?? null,
      });
      const signedUrl = artifact.status === "ready"
        ? `${protocol}://${request.headers.host ?? `127.0.0.1:${PORT}`}/canonical-estimate/artifact-files/${artifact.id}?expires=${signedUrlExpiresAtMs}&signature=${encodeURIComponent(signature)}`
        : null;
      const sourceMetadata = artifact.metadata ?? {};
      if (artifact.status === "ready" && (
        (sourceMetadata.sourceReleaseId != null && sourceMetadata.sourceReleaseId !== artifact.release_id)
        || (sourceMetadata.sourceRevisionChecksumSha256 != null && sourceMetadata.sourceRevisionChecksumSha256 !== artifact.revision_checksum_sha256)
        || (sourceMetadata.sourceCatalogId != null && sourceMetadata.sourceCatalogId !== artifact.catalog_id)
        || (sourceMetadata.sourceRowCount != null && Number(sourceMetadata.sourceRowCount) !== Number(artifact.row_count))
        || (sourceMetadata.sourceOwnerUserId != null && sourceMetadata.sourceOwnerUserId !== artifact.owner_user_id)
        || (sourceMetadata.sourceOrganizationId != null && sourceMetadata.sourceOrganizationId !== (artifact.organization_id ?? null))
        || (kind === "professional_pdf" && !String(sourceMetadata.templateVersion ?? "").startsWith("professional-estimate-pdf:"))
      )) throw Object.assign(new Error("artifact revision identity mismatch"), { code: "ARTIFACT_REVISION_IDENTITY_MISMATCH", httpStatus: 409 });
      const metadata = {
        ...sourceMetadata,
        ...(kind === "professional_pdf" ? { documentProfile: "professional_v1" } : {}),
        sourceCatalogId: artifact.catalog_id,
        sourceRowCount: Number(artifact.row_count),
        sourceReleaseId: artifact.release_id,
        sourceRevisionChecksumSha256: artifact.revision_checksum_sha256,
        sourceOwnerUserId: artifact.owner_user_id,
        sourceOrganizationId: artifact.organization_id ?? null,
      };
      return send(response, 200, { apiVersion: API_VERSION, artifactId: artifact.id, revisionId: artifact.revision_id, releaseId: artifact.release_id, kind: publicKind, status: artifact.status, contentType: artifact.content_type, byteSize: artifact.byte_size == null ? null : Number(artifact.byte_size), sha256: artifact.sha256, metadata, errorCode: artifact.error_code, createdAt: artifact.created_at, updatedAt: artifact.updated_at, readyAt: artifact.ready_at, signedUrl, signedUrlExpiresAt: signedUrl ? new Date(signedUrlExpiresAtMs).toISOString() : null });
    }
  }
  if (request.method === "GET" && path.length === 1 && path[0] === "catalog") {
    return send(response, 410, { error: { code: "LEGACY_SEARCH_ROUTE_RETIRED", message: "use server-owned /search/catalog R2" } });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "catalog") {
    const catalogId = decodeURIComponent(path[1]);
    const modelDatabaseUrl = await modelDatabaseUrlForCatalog(catalogId);
    const item = await withDatabaseClient(modelDatabaseUrl, async (client) => {
      const identity = (await client.query("select * from public.estimate_work_identity where catalog_id=$1 and retired_at is null", [catalogId])).rows[0];
      const definition = (await client.query(`select version.*,manifest.release_id cumulative_release_id,
          manifest.approved_template_baseline_id cumulative_baseline_id
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version version on version.id=manifest.definition_version_id
        join public.estimate_definition_release release on release.id=manifest.release_id
        where manifest.catalog_id=$1
          and (($2::uuid is not null and release.id=$2) or ($2::uuid is null and release.status='active'))`,
      [catalogId, TARGET_RELEASE_ID || null])).rows[0];
      if (!identity || !definition) return null;
      const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [definition.id])).rows;
      const baseline = definition.cumulative_baseline_id == null ? null : (await client.query(`
        select id,contract_version,acceptance_evidence_sha256,accepted_at,input_values,input_classification,
          formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
          proposal_source_refs
        from public.estimate_approved_template_baseline where id=$1`,
      [definition.cumulative_baseline_id])).rows[0] ?? null;
      return { catalogId: identity.catalog_id, releaseId: definition.cumulative_release_id, namespace: identity.namespace, domain: identity.domain, workKey: identity.work_key, titleRu: identity.title_ru, definitionVersion: definition.definition_version, applicability: definition.applicability, professionalMetadata: definition.source_metadata, parameterSchema: parameters.map((parameter) => {
        const truth = parameter.truth_metadata && typeof parameter.truth_metadata === "object" ? parameter.truth_metadata : {};
        const parameterId = String(parameter.parameter_id);
        const acceptedAsInput = baseline != null
          && Object.prototype.hasOwnProperty.call(baseline.input_values ?? {}, parameterId);
        const acceptedGuide = String(baseline?.guide_provenance_ru?.[parameterId] ?? "").trim();
        const acceptedFormulaConsumers = Array.isArray(baseline?.formula_consumer_ids?.[parameterId])
          ? baseline.formula_consumer_ids[parameterId] : [];
        const acceptedResourceConsumers = Array.isArray(baseline?.resource_consumer_row_ids?.[parameterId])
          ? baseline.resource_consumer_row_ids[parameterId] : [];
        const acceptedNormativeSources = Array.isArray(baseline?.normative_source_ids?.[parameterId])
          ? baseline.normative_source_ids[parameterId] : [];
        const baselineGuide = acceptedGuide && baseline ? {
          guide_kind: "PROJECT_DEFINED",
          guide_short_ru: acceptedGuide,
          source_role: "PROJECT_DOCUMENTATION",
          guide_validation_policy: "INFORMATION_ONLY",
          source_document: acceptedNormativeSources.join(", ") || "APPROVED_TEMPLATE_BASELINE",
          source_edition_status: baseline.contract_version,
          source_locator: String(baseline.proposal_source_refs?.[0]?.sha256 ?? baseline.id),
          guide_version: baseline.contract_version,
          source_snapshot_hash: baseline.acceptance_evidence_sha256,
          applicability: `Только для выбранной работы ${catalogId}; параметр подтверждён её индивидуальным baseline и связан с её формулами или ресурсами.`,
          verified_at: baseline.accepted_at,
        } : undefined;
        const effectiveGuide = baselineGuide ? { ...baselineGuide, ...(truth.guide ?? {}) } : truth.guide;
        const effectiveFormulaConsumers = Array.isArray(truth.formula_consumers) && truth.formula_consumers.length > 0
          ? truth.formula_consumers : acceptedFormulaConsumers;
        const effectiveResourceConsumers = Array.isArray(truth.resource_branch_consumers) && truth.resource_branch_consumers.length > 0
          ? truth.resource_branch_consumers : acceptedResourceConsumers;
        const effectiveProvenance = truth.provenance && Object.keys(truth.provenance).length > 0
          ? truth.provenance : baseline ? {
            owner: "backend",
            contract: baseline.contract_version,
            approvedTemplateBaselineId: baseline.id,
            acceptanceEvidenceSha256: baseline.acceptance_evidence_sha256,
          } : truth.provenance;
        const composite = truth.composite_item_schema && typeof truth.composite_item_schema === "object"
          ? truth.composite_item_schema as Record<string, any>
          : null;
        return {
          parameterId: parameter.parameter_id, ordinal: parameter.ordinal, valueType: parameter.value_type,
          unitId: parameter.unit_id, titleRu: parameter.title_ru, required: parameter.required,
          defaultValue: parameter.default_value, constraints: parameter.constraints_json,
          semanticParameterKey: truth.semantic_parameter_key ?? (baseline ? parameterId : undefined),
          visibilityRole: truth.visibility_role ?? (baseline
            ? acceptedAsInput ? "USER_INPUT" : "INTERNAL_ONLY"
            : undefined),
          descriptionRu: truth.description_ru, requiredWhen: truth.required_when,
          visibleWhen: truth.visible_when, allowedRangeOrOptions: truth.allowed_range_or_options,
          defaultPolicy: truth.default_policy,
          valueSourceRole: truth.value_source_role ?? (baseline
            ? acceptedAsInput ? "PROJECT_DOCUMENTATION" : "BACKEND_DERIVED"
            : undefined),
          guide: localParameterGuideView(effectiveGuide),
          compositeItemSchema: composite ? {
            itemLabelRu: composite.item_label_ru, minimumItems: composite.minimum_items,
            maximumItems: composite.maximum_items, reorderable: composite.reorderable === true,
            subfields: Array.isArray(composite.subfields) ? composite.subfields.map((subfield: Record<string, any>) => ({
              subfieldId: subfield.subfield_id, labelRu: subfield.label_ru, valueType: subfield.value_type,
              unitId: subfield.unit_id, required: subfield.required === true,
              constraints: subfield.constraints ?? {}, guide: localParameterGuideView(subfield.guide),
              formulaConsumers: subfield.formula_consumers ?? [],
              resourceBranchConsumers: subfield.resource_branch_consumers ?? [],
            })) : [],
          } : undefined,
          sharedInputBindingPolicy: truth.shared_input_binding_policy, derivedFrom: truth.derived_from,
          normativeLinks: truth.normative_links, formulaConsumers: effectiveFormulaConsumers,
          resourceBranchConsumers: effectiveResourceConsumers,
          validationRules: Array.isArray(truth.validation_rules) && truth.validation_rules.length > 0
            ? truth.validation_rules : baseline ? ["declared_type", "work_specific_applicability"] : truth.validation_rules,
          conflictsWith: truth.conflicts_with, provenance: effectiveProvenance,
        };
      }) };
    });
    if (!item) throw Object.assign(new Error("catalog item not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, item });
  }
  throw Object.assign(new Error("route not found"), { code: "ROUTE_NOT_FOUND", httpStatus: 404 });
}

const server = createServer((request, response) => {
  if (REQUEST_AUDIT_LOG) {
    response.once("finish", () => {
      mkdirSync(dirname(resolve(REQUEST_AUDIT_LOG)), { recursive: true });
      appendFileSync(resolve(REQUEST_AUDIT_LOG), `${JSON.stringify({
        at: new Date().toISOString(),
        method: request.method ?? null,
        path: request.url ?? null,
        status: response.statusCode,
        userAgent: request.headers["user-agent"] ?? null,
        authorizationPresent: Boolean(request.headers.authorization),
        remoteAddress: request.socket.remoteAddress ?? null,
      })}\n`, "utf8");
    });
  }
  void route(request, response).catch((error: { code?: string; httpStatus?: number; message?: string }) => {
    const databaseCode = String(error.code ?? "");
    const conflict = databaseCode === "23505";
    const httpStatus = Number(error.httpStatus ?? (conflict ? 409 : 500));
    const code = conflict ? "IDEMPOTENCY_PAYLOAD_CONFLICT" : String(error.code ?? "INTERNAL_ERROR");
    send(response, httpStatus, { error: { code, message: String(error.message ?? "local canonical backend failed"), retryable: false } });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const database = (() => { try { return new URL(DATABASE_URL).pathname.replace(/^\//, ""); } catch { return "invalid"; } })();
  const searchDatabase = (() => { try { return new URL(SEARCH_DATABASE_URL).pathname.replace(/^\//, ""); } catch { return "invalid"; } })();
  process.stdout.write(JSON.stringify({ status: "READY", port: PORT, database, searchDatabase, ownerId: OWNER_ID, targetReleaseId: TARGET_RELEASE_ID || null }) + "\n");
  for (const connectionString of MODEL_DATABASE_URLS) {
    void drainJobs(connectionString).catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`));
  }
});
