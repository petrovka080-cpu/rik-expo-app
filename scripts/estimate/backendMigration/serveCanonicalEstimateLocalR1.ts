import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { Client } from "pg";
import { chromium } from "playwright";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const API_VERSION = "2026-08-14.r2";
const COMPILER_VERSION = "canonical-estimate-local-runtime.r2";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_ORGANIZATION_ID = process.env.CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID
  ?? "22222222-2222-4222-8222-222222222222";
const TARGET_RELEASE_ID = String(process.env.CANONICAL_ESTIMATE_TARGET_RELEASE_ID ?? "").trim();
const ADMISSION_RUN_ID = String(process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID ?? "").trim();
const PORT = Number(process.env.CANONICAL_ESTIMATE_LOCAL_PORT ?? 8765);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_ROWS = 2_000;
const ARTIFACT_ROOT = resolve(".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts");
const REQUEST_AUDIT_LOG = String(process.env.CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG ?? "").trim();

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
  return { kind: "manual", ...(reason == null ? {} : { reason: reason.trim() }) };
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

function evaluateCondition(ast: JsonRecord, parameters: JsonRecord): boolean {
  const kind = String(ast?.kind ?? "");
  if (kind === "literal") return ast.value === true;
  if (kind === "parameter") return parameters[String(ast.id ?? "")] === true;
  if (kind === "not") return !evaluateCondition(ast.operand as JsonRecord, parameters);
  if (kind === "and" || kind === "or") {
    const operands = Array.isArray(ast.operands) ? ast.operands : [];
    return kind === "and"
      ? operands.every((entry) => evaluateCondition(entry as JsonRecord, parameters))
      : operands.some((entry) => evaluateCondition(entry as JsonRecord, parameters));
  }
  if (kind === "equals") return parameters[String(ast.parameterId ?? "")] === ast.value;
  throw Object.assign(new Error("unsupported inclusion AST"), { code: "INVALID_INCLUSION_GRAPH" });
}

function validateParameters(definitions: JsonRecord[], input: JsonRecord): JsonRecord {
  const values = { ...input };
  const accepted = new Set(definitions.map((definition) => String(definition.parameter_id)));
  if (Object.keys(values).some((key) => !accepted.has(key))) throw Object.assign(new Error("unknown estimate parameters"), { code: "PARAMETER_VALIDATION_FAILED" });
  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const constraints = (definition.constraints_json ?? {}) as JsonRecord;
    const value = values[id] ?? definition.default_value;
    if (value == null) {
      if (definition.required) throw Object.assign(new Error(`missing parameter ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
      continue;
    }
    const valueType = String(definition.value_type);
    if (valueType === "boolean" && typeof value !== "boolean") throw Object.assign(new Error(`invalid boolean ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    if ((valueType === "decimal" || valueType === "integer") && !/^[+-]?\d+(?:\.\d+)?$/.test(String(value))) {
      throw Object.assign(new Error(`invalid number ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if (valueType === "integer" && !Number.isInteger(Number(value))) throw Object.assign(new Error(`invalid integer ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    if (valueType === "enum" && Array.isArray(constraints.values) && !constraints.values.includes(value)) {
      throw Object.assign(new Error(`invalid enum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if ((valueType === "decimal" || valueType === "integer") && constraints.min != null && Number(value) < Number(constraints.min)) {
      throw Object.assign(new Error(`parameter below minimum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    if ((valueType === "decimal" || valueType === "integer") && constraints.max != null && Number(value) > Number(constraints.max)) {
      throw Object.assign(new Error(`parameter above maximum ${id}`), { code: "PARAMETER_VALIDATION_FAILED" });
    }
    values[id] = value;
  }
  return values;
}

async function withClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: DATABASE_URL, application_name: "canonical-estimate-local-runtime-r1" });
  await client.connect();
  try { return await operation(client); } finally { await client.end(); }
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
  const result = await withClient(async (client) => {
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
      } else {
        await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_ID]);
        created = await client.query(`select * from public.estimate_create_compile_job_v1($1,$2,$3,$4,$5,$6::jsonb)`, [
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
  setImmediate(() => { void drainJobs().catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
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

async function createArtifactJob(body: JsonRecord, revisionId: string, kind: "pdf" | "procurement") {
  const idempotencyKey = String(body.idempotencyKey ?? "").trim();
  if (!idempotencyKey) throw Object.assign(new Error("idempotencyKey is required"), { code: "INVALID_ARGUMENT", httpStatus: 400 });
  const result = await withClient(async (client) => {
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
  if (result.job_id) setImmediate(() => { void drainJobs().catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`)); });
  return { apiVersion: API_VERSION, jobId: result.job_id, artifactId: result.artifact_id, status: result.job_status, artifactStatus: result.artifact_status, created: result.created, pollAfterMs: 250 };
}

let draining = false;
let retryDrainTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRetryDrain(delayMs: number): void {
  if (retryDrainTimer != null) return;
  retryDrainTimer = setTimeout(() => {
    retryDrainTimer = null;
    void drainJobs().catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`));
  }, Math.max(100, delayMs));
}

async function drainJobs(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    await withClient(async (client) => {
      while (true) {
        const workerId = `local-runtime:${randomUUID()}`;
        const claimed = await client.query("select * from public.estimate_claim_compile_jobs_v1($1,4,120)", [workerId]);
        if (claimed.rows.length === 0) break;
        for (const job of claimed.rows) {
          try {
            if (job.operation === "legacy_revision_migration") await migrateLegacyClaimedJob(client, workerId, job as JsonRecord);
            else if (job.operation === "pdf" || job.operation === "procurement") await buildArtifactClaimedJob(client, workerId, job as JsonRecord);
            else await compileClaimedJob(client, workerId, job as JsonRecord);
          }
          catch (error) {
            const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "COMPILER_FAILED";
            const retryable = code.endsWith("_LOAD_FAILED")
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
        if (Number.isFinite(retryDelayMs)) scheduleRetryDrain(retryDelayMs + 100);
      }
    });
  } finally {
    draining = false;
  }
}

async function compileClaimedJob(client: Client, workerId: string, job: JsonRecord): Promise<void> {
  const definition = (await client.query(`
    select v.id from public.estimate_definition_version v
    join public.estimate_definition_release r on r.id=v.release_id
    where r.id=$2 and (r.status='active' or (r.status='prepared' and $3::boolean)) and v.catalog_id=$1
  `, [job.catalog_id, job.target_release_id, (job.input_payload as JsonRecord)?.releaseAdmission === true])).rows[0];
  if (!definition) throw Object.assign(new Error("definition not found"), { code: "DEFINITION_LOAD_FAILED" });
  const parameterDefinitions = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [definition.id])).rows;
  const payload = (job.input_payload ?? {}) as JsonRecord;
  const parameters = validateParameters(parameterDefinitions, (payload.parameters ?? {}) as JsonRecord);
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
    if (!evaluateCondition(resource.inclusion_ast as JsonRecord, parameters)) continue;
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
  await client.query("select public.estimate_commit_compile_job_v1($1,$2,$3::jsonb,$4::jsonb)", [job.id, workerId, JSON.stringify({
    rowCount: rows.length,
    currencyCode,
    totals,
    checksumSha256: sha256(revisionProjection),
    compilerVersion: COMPILER_VERSION,
    migrationSource: null,
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
  } else {
    const body = rows.map((row) => `<tr><td>${row.ordinal + 1}</td><td>${String(row.title_ru).replace(/[<>&]/g, "")}</td><td>${row.unit_id}</td><td>${row.quantity ?? "—"}</td><td>${row.amount ?? "—"}</td></tr>`).join("");
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>@page{size:A4;margin:14mm}body{font-family:Arial}table{width:100%;border-collapse:collapse;font-size:10px}td,th{border:1px solid #ccc;padding:4px}</style><h1>Каноническая смета</h1><p>Ревизия ${revisionId} · release ${revision.release_id}</p><table>${body}</table>`);
      bytes = await page.pdf({ format: "A4", printBackground: true });
    } finally {
      await browser.close();
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
      projectedRowCount: rows.length,
      sourceReleaseId: revision.release_id,
      sourceRevisionChecksumSha256: revision.checksum_sha256,
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

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === "OPTIONS") return send(response, 204, {});
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = url.pathname.split("/").filter(Boolean).filter((part, index) => !(index === 0 && part === "canonical-estimate"));
  if (request.method === "GET" && path.length === 2 && path[0] === "artifact-files") {
    if (url.searchParams.get("token") !== "local-dev-signed-artifact-r1") {
      throw Object.assign(new Error("artifact signature invalid"), { code: "AUTH_REQUIRED", httpStatus: 401 });
    }
    const artifact = await withClient(async (client) => (await client.query(`
      select a.* from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
      where a.id=$1 and a.status='ready' and r.owner_user_id=$2
    `, [path[1], OWNER_ID])).rows[0]);
    if (!artifact?.storage_key) throw Object.assign(new Error("artifact file not found"), { code: "NOT_FOUND", httpStatus: 404 });
    const bytes = readFileSync(artifactFilePath(artifact.storage_key));
    response.writeHead(200, { "Access-Control-Allow-Origin": "*", "Content-Type": artifact.content_type, "Content-Length": String(bytes.byteLength), "Cache-Control": "private, no-store" });
    response.end(bytes);
    return;
  }
  if (!request.headers.authorization) throw Object.assign(new Error("authentication required"), { code: "AUTH_REQUIRED", httpStatus: 401 });
  if (request.method === "POST" && path.join("/") === "jobs/compile") return send(response, 202, await createJob(await readBody(request), "compile"));
  if (request.method === "POST" && path.join("/") === "jobs/recalculate") return send(response, 202, await createJob(await readBody(request), "recalculate"));
  if (request.method === "POST" && path.join("/") === "migrations/legacy-revisions") return send(response, 202, await createLegacyJob(await readBody(request)));
  if (request.method === "GET" && path.length === 2 && path[0] === "jobs") {
    const job = await withClient(async (client) => (await client.query("select * from public.estimate_compile_job where id=$1 and owner_user_id=$2", [path[1], OWNER_ID])).rows[0]);
    if (!job) throw Object.assign(new Error("job not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, jobId: job.id, operation: job.operation, status: job.status, stage: job.stage, progress: job.progress, attempt: job.attempt, resultRevisionId: job.result_revision_id, errorCode: job.error_code, createdAt: job.created_at, updatedAt: job.updated_at });
  }
  if (request.method === "POST" && path.length === 3 && path[0] === "jobs" && path[2] === "cancel") {
    const cancelled = await withClient(async (client) => {
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
    const revisions = await withClient(async (client) => (await client.query(`
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
        compilerVersion: revision.compiler_version, createdAt: revision.created_at,
      })),
      nextCursor: revisions.length > limit ? String(page[page.length - 1].revision_number) : null,
    });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "revisions") {
    const revision = await withClient(async (client) => (await client.query("select * from public.estimate_revision where id=$1 and owner_user_id=$2", [path[1], OWNER_ID])).rows[0]);
    if (!revision) throw Object.assign(new Error("revision not found"), { code: "NOT_FOUND", httpStatus: 404 });
    return send(response, 200, { apiVersion: API_VERSION, revisionId: revision.id, parentRevisionId: revision.parent_revision_id, releaseId: revision.release_id, catalogId: revision.catalog_id, revisionNumber: revision.revision_number, status: revision.status, currencyCode: revision.currency_code, parameters: revision.input_parameters, amendmentContract: revision.amendment_contract, totals: revision.totals, rowCount: revision.row_count, checksumSha256: revision.checksum_sha256, compilerVersion: revision.compiler_version, createdAt: revision.created_at });
  }
  if (request.method === "GET" && path.length === 3 && path[0] === "revisions" && path[2] === "rows") {
    const after = cursorAfter(url.searchParams.get("cursor"));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 100) || 100));
    const rows = await withClient(async (client) => (await client.query(`
      select rr.* from public.estimate_revision_row rr
      join public.estimate_revision r on r.id=rr.revision_id
      where rr.revision_id=$1 and r.owner_user_id=$2 and rr.ordinal>$3 order by rr.ordinal limit $4
    `, [path[1], OWNER_ID, after, limit + 1])).rows);
    const page = rows.slice(0, limit);
    return send(response, 200, { apiVersion: API_VERSION, revisionId: path[1], rows: page.map((row) => ({ rowId: row.row_id, ordinal: row.ordinal, section: row.section, category: row.category, titleRu: row.title_ru, unitId: row.unit_id, quantity: row.quantity == null ? null : String(row.quantity), unitPrice: row.unit_price == null ? null : String(row.unit_price), amount: row.amount == null ? null : String(row.amount), currencyCode: row.currency_code, procurementEligible: row.procurement_eligible, includedInEstimate: row.included_in_estimate, includedInProcurement: row.included_in_procurement, ownershipStatus: row.ownership_status, calculationTrace: row.calculation_trace, normativeTrace: row.normative_trace, rowSha256: row.row_sha256 })), nextCursor: rows.length > limit ? Buffer.from(JSON.stringify({ ordinal: page[page.length - 1].ordinal })).toString("base64url") : null });
  }
  if (path.length === 4 && path[0] === "revisions" && path[2] === "artifacts" && (path[3] === "pdf" || path[3] === "procurement")) {
    const kind = path[3] as "pdf" | "procurement";
    if (request.method === "POST") return send(response, 202, await createArtifactJob(await readBody(request), path[1], kind));
    if (request.method === "GET") {
      const artifact = await withClient(async (client) => (await client.query(`
        select a.*,r.release_id,r.checksum_sha256 revision_checksum_sha256
        from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id
        where a.revision_id=$1 and a.artifact_kind=$2 and r.owner_user_id=$3
      `, [path[1], kind, OWNER_ID])).rows[0]);
      if (!artifact) throw Object.assign(new Error("artifact not found"), { code: "NOT_FOUND", httpStatus: 404 });
      const forwardedProtocol = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0]?.trim();
      const protocol = forwardedProtocol === "https" ? "https" : "http";
      const signedUrl = artifact.status === "ready"
        ? `${protocol}://${request.headers.host ?? `127.0.0.1:${PORT}`}/canonical-estimate/artifact-files/${artifact.id}?token=local-dev-signed-artifact-r1`
        : null;
      if (artifact.status === "ready" && (
        artifact.metadata?.sourceReleaseId !== artifact.release_id
        || artifact.metadata?.sourceRevisionChecksumSha256 !== artifact.revision_checksum_sha256
      )) throw Object.assign(new Error("artifact revision identity mismatch"), { code: "ARTIFACT_REVISION_IDENTITY_MISMATCH", httpStatus: 409 });
      return send(response, 200, { apiVersion: API_VERSION, artifactId: artifact.id, revisionId: artifact.revision_id, releaseId: artifact.release_id, kind: artifact.artifact_kind, status: artifact.status, contentType: artifact.content_type, byteSize: artifact.byte_size == null ? null : Number(artifact.byte_size), sha256: artifact.sha256, metadata: artifact.metadata, errorCode: artifact.error_code, createdAt: artifact.created_at, updatedAt: artifact.updated_at, readyAt: artifact.ready_at, signedUrl, signedUrlExpiresAt: signedUrl ? new Date(Date.now() + 900_000).toISOString() : null });
    }
  }
  if (request.method === "GET" && path.length === 1 && path[0] === "catalog") {
    const query = String(url.searchParams.get("query") ?? "").trim().slice(0, 120);
    const domain = String(url.searchParams.get("domain") ?? "").trim();
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 30) || 30));
    const items = await withClient(async (client) => (await client.query(`
      select catalog_id,namespace,domain,work_key,title_ru from public.estimate_work_identity
      where retired_at is null and ($1='' or domain=$1) and ($2='' or title_ru ilike '%' || $2 || '%')
      order by catalog_id limit $3
    `, [domain, query, limit])).rows);
    return send(response, 200, { apiVersion: API_VERSION, items: items.map((item) => ({ catalogId: item.catalog_id, namespace: item.namespace, domain: item.domain, workKey: item.work_key, titleRu: item.title_ru })) });
  }
  if (request.method === "GET" && path.length === 2 && path[0] === "catalog") {
    const catalogId = decodeURIComponent(path[1]);
    const item = await withClient(async (client) => {
      const identity = (await client.query("select * from public.estimate_work_identity where catalog_id=$1 and retired_at is null", [catalogId])).rows[0];
      const definition = (await client.query(`select v.* from public.estimate_definition_version v join public.estimate_definition_release r on r.id=v.release_id where (($2::uuid is not null and r.id=$2) or ($2::uuid is null and r.status='active')) and v.catalog_id=$1`, [catalogId, TARGET_RELEASE_ID || null])).rows[0];
      if (!identity || !definition) return null;
      const parameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [definition.id])).rows;
      return { catalogId: identity.catalog_id, releaseId: definition.release_id, namespace: identity.namespace, domain: identity.domain, workKey: identity.work_key, titleRu: identity.title_ru, definitionVersion: definition.definition_version, applicability: definition.applicability, professionalMetadata: definition.source_metadata, parameterSchema: parameters.map((parameter) => ({ parameterId: parameter.parameter_id, ordinal: parameter.ordinal, valueType: parameter.value_type, unitId: parameter.unit_id, titleRu: parameter.title_ru, required: parameter.required, defaultValue: parameter.default_value, constraints: parameter.constraints_json })) };
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
    send(response, Number(error.httpStatus ?? 500), { error: { code: String(error.code ?? "INTERNAL_ERROR"), message: String(error.message ?? "local canonical backend failed"), retryable: false } });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  const database = (() => { try { return new URL(DATABASE_URL).pathname.replace(/^\//, ""); } catch { return "invalid"; } })();
  process.stdout.write(JSON.stringify({ status: "READY", port: PORT, database, ownerId: OWNER_ID, targetReleaseId: TARGET_RELEASE_ID || null }) + "\n");
  void drainJobs().catch((error) => process.stderr.write(`[canonical-local-worker] ${String(error)}\n`));
});
