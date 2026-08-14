import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import {
  evaluateFormulaGraph,
  type FormulaAst,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(
  ROOT,
  ".release-runtime",
  "master11610-backend-canonical-r2",
  "evidence",
);
const API_ROOT = (process.env.CANONICAL_ESTIMATE_R2_API_ROOT
  ?? "http://127.0.0.1:8765/canonical-estimate").replace(/\/$/, "");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const TOKEN = process.env.CANONICAL_ESTIMATE_R2_TEST_TOKEN ?? "r2-local-integration-owner";
const EXPECTED_RELEASE_MANIFEST =
  "2b1af91a7551d4ccf9be6408b018439438110fc732974961e8b20484b18d14b9";
const EXPECTED_DEFINITIONS = 1_168;
const EXPECTED_RESOURCES = 101_416;
const MAX_IDS_PER_SHARD = 32;
const MAX_ROWS_PER_SHARD = 4_000;
const HTTP_CONCURRENCY = 8;

type JsonRecord = Record<string, unknown>;
type Definition = {
  id: string;
  catalog_id: string;
  domain: string;
  scope_kind: "global" | "external_reference";
  parameter_count: number;
  resource_count: number;
};
type ParameterDefinition = {
  parameter_id: string;
  value_type: "decimal" | "integer" | "boolean" | "enum" | "text";
  required: boolean;
  default_value: unknown;
  constraints_json: JsonRecord;
};
type Scenario = {
  parameters: JsonRecord;
  derivation: Record<string, number>;
};
type JobBinding = {
  catalogId: string;
  jobId: string;
  revisionId: string;
  operation: "compile" | "recalculate";
  parameters: JsonRecord;
  parameterDerivation: Record<string, number>;
  parentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
};

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function numericText(value: number, integer: boolean): string {
  if (!Number.isFinite(value)) throw new Error("non-finite parameter boundary");
  const normalized = integer ? Math.trunc(value) : value;
  if (Math.abs(normalized) >= 1e21 || (Math.abs(normalized) > 0 && Math.abs(normalized) < 1e-9)) {
    return normalized.toLocaleString("en-US", { useGrouping: false, maximumSignificantDigits: 16 });
  }
  return String(normalized);
}

function finiteBoundary(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function enumValues(constraints: JsonRecord): unknown[] {
  if (Array.isArray(constraints.values)) return constraints.values;
  if (typeof constraints.values === "string") {
    return constraints.values.split("|").map((value) => value.trim()).filter(Boolean);
  }
  return [];
}

function scenarioFor(definitions: ParameterDefinition[], mode: "baseline" | "recalculate"): Scenario {
  const parameters: JsonRecord = {};
  const derivation: Record<string, number> = {};
  for (const definition of definitions) {
    const id = definition.parameter_id;
    const constraints = definition.constraints_json ?? {};
    let value: unknown;
    let strategy: string;
    if (definition.value_type === "boolean") {
      value = true;
      strategy = mode === "baseline" ? "schema_boolean_inclusive" : "schema_boolean_inclusive_stable";
    } else if (definition.value_type === "enum") {
      const values = enumValues(constraints);
      const baselineIndex = 0;
      const index = mode === "recalculate" && values.length > 1 ? 1 : baselineIndex;
      value = values[index] ?? definition.default_value ?? `${id}_R2_VALID`;
      strategy = values.length ? `schema_enum_index_${index}` : "schema_enum_declared_fallback";
    } else if (definition.value_type === "text") {
      value = definition.default_value ?? `${id}_R2_VALID`;
      strategy = definition.default_value == null ? "schema_text_identity_value" : "schema_default";
    } else {
      const minimum = finiteBoundary(constraints.min);
      const maximum = finiteBoundary(constraints.max);
      const integer = definition.value_type === "integer";
      let baseline = minimum != null && minimum > 1 ? minimum : 1;
      if (maximum != null && baseline > maximum) baseline = maximum;
      if (minimum != null && baseline < minimum) baseline = minimum;
      if (integer) baseline = Math.max(minimum ?? Number.NEGATIVE_INFINITY, Math.ceil(baseline));
      let selected = baseline;
      if (mode === "recalculate") {
        selected = baseline === 0 ? 1 : baseline * 2;
        if (maximum != null) selected = Math.min(selected, maximum);
        if (minimum != null) selected = Math.max(selected, minimum);
        if (integer) selected = Math.ceil(selected);
      }
      value = numericText(selected, integer);
      strategy = mode === "baseline" ? "schema_bounds_baseline" : "schema_bounds_variant";
    }
    parameters[id] = value;
    derivation[strategy] = (derivation[strategy] ?? 0) + 1;
  }
  return { parameters, derivation };
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
  throw new Error(`unsupported inclusion AST kind: ${kind}`);
}

function buildShards(definitions: Definition[]): Definition[][] {
  const shards: Definition[][] = [];
  let current: Definition[] = [];
  let currentRows = 0;
  for (const definition of definitions) {
    if (current.length > 0 && (current.length >= MAX_IDS_PER_SHARD
      || currentRows + definition.resource_count > MAX_ROWS_PER_SHARD)) {
      shards.push(current);
      current = [];
      currentRows = 0;
    }
    current.push(definition);
    currentRows += definition.resource_count;
  }
  if (current.length) shards.push(current);
  return shards;
}

async function post(path: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as JsonRecord;
  if (!response.ok) throw new Error(`POST ${path} failed ${response.status}: ${stableJson(payload)}`);
  return payload;
}

async function concurrentMap<T, U>(values: T[], concurrency: number, callback: (value: T) => Promise<U>): Promise<U[]> {
  const result = new Array<U>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      result[index] = await callback(values[index]);
    }
  }));
  return result;
}

async function waitForJobs(client: Client, jobIds: string[], label: string): Promise<Map<string, JsonRecord>> {
  const expected = new Set(jobIds);
  let lastReport = 0;
  while (true) {
    const result = await client.query(`
      select id, status, result_revision_id, error_code, created_at, updated_at
        from public.estimate_compile_job
       where id = any($1::uuid[])
    `, [jobIds]);
    const terminal = result.rows.filter((row) => row.status === "succeeded" || row.status === "failed");
    const now = Date.now();
    if (now - lastReport >= 10_000) {
      const succeeded = terminal.filter((row) => row.status === "succeeded").length;
      const failed = terminal.filter((row) => row.status === "failed").length;
      process.stdout.write(`[${new Date().toISOString()}] ${label}: ${succeeded}/${expected.size} succeeded, ${failed} failed\n`);
      lastReport = now;
    }
    if (terminal.length === expected.size) {
      const failed = terminal.filter((row) => row.status !== "succeeded");
      if (failed.length) throw new Error(`${label} failed jobs: ${stableJson(failed.slice(0, 20))}`);
      return new Map(result.rows.map((row) => [String(row.id), row as JsonRecord]));
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
}

async function loadParameters(client: Client, definitionIds: string[]): Promise<Map<string, ParameterDefinition[]>> {
  const result = await client.query(`
    select definition_version_id, parameter_id, value_type, required, default_value, constraints_json
      from public.estimate_parameter_definition
     where definition_version_id = any($1::uuid[])
     order by definition_version_id, ordinal
  `, [definitionIds]);
  const byDefinition = new Map<string, ParameterDefinition[]>();
  for (const row of result.rows) {
    const id = String(row.definition_version_id);
    const bucket = byDefinition.get(id) ?? [];
    bucket.push(row as ParameterDefinition);
    byDefinition.set(id, bucket);
  }
  return byDefinition;
}

async function enqueueOperation(
  client: Client,
  definitions: Definition[],
  operation: "compile" | "recalculate",
  parents: Map<string, string>,
): Promise<JobBinding[]> {
  const parameterDefinitions = await loadParameters(client, definitions.map((definition) => definition.id));
  const requests = definitions.map((definition) => {
    const scenario = scenarioFor(parameterDefinitions.get(definition.id) ?? [], operation === "compile" ? "baseline" : "recalculate");
    const parentRevisionId = operation === "recalculate" ? parents.get(definition.catalog_id) ?? null : null;
    if (operation === "recalculate" && !parentRevisionId) throw new Error(`missing parent revision for ${definition.catalog_id}`);
    const keyHash = sha256(`${EXPECTED_RELEASE_MANIFEST}:${operation}:${definition.catalog_id}`).slice(0, 32);
    return {
      definition,
      scenario,
      parentRevisionId,
      body: {
        idempotencyKey: `r2-1168-${operation}-${keyHash}`,
        catalogId: definition.catalog_id,
        parentRevisionId,
        parameters: scenario.parameters,
        currencyCode: "KGS",
        priceSnapshotIds: [],
      },
    };
  });
  const created = await concurrentMap(requests, HTTP_CONCURRENCY, async (request) => ({
    request,
    response: await post(`/jobs/${operation}`, request.body),
  }));
  const ids = created.map((entry) => String(entry.response.jobId));
  if (new Set(ids).size !== definitions.length) throw new Error(`${operation} idempotency collision`);
  const terminal = await waitForJobs(client, ids, `${operation} shard`);
  return created.map(({ request, response }) => {
    const job = terminal.get(String(response.jobId));
    if (!job?.result_revision_id) throw new Error(`missing ${operation} result revision`);
    return {
      catalogId: request.definition.catalog_id,
      jobId: String(response.jobId),
      revisionId: String(job.result_revision_id),
      operation,
      parameters: request.scenario.parameters,
      parameterDerivation: request.scenario.derivation,
      parentRevisionId: request.parentRevisionId,
      createdAt: new Date(String(job.created_at)).toISOString(),
      updatedAt: new Date(String(job.updated_at)).toISOString(),
    };
  });
}

async function verifyRevision(
  client: Client,
  definition: Definition,
  binding: JobBinding,
): Promise<{ matrix: JsonRecord; parity: JsonRecord }> {
  const sourceResult = await client.query(`
      select r.id resource_spec_id, r.row_id, r.row_sha256 source_row_sha256,
             r.inclusion_ast, f.ast, f.ast_sha256
        from public.estimate_resource_spec r
        join public.estimate_formula_graph f
          on f.definition_version_id = r.definition_version_id and f.formula_id = r.formula_id
       where r.definition_version_id = $1
       order by r.ordinal
    `, [definition.id]);
  const actualResult = await client.query(`
      select resource_spec_id, row_id, quantity::text, row_sha256,
             calculation_trace->>'formulaAstSha256' formula_ast_sha256
        from public.estimate_revision_row
       where revision_id = $1
       order by ordinal
    `, [binding.revisionId]);
  const revisionResult = await client.query(
    `select * from public.estimate_revision where id=$1`,
    [binding.revisionId],
  );
  const expected = sourceResult.rows
    .filter((row) => evaluateCondition(row.inclusion_ast as JsonRecord, binding.parameters))
    .map((row) => ({
      resourceSpecId: String(row.resource_spec_id),
      rowId: String(row.row_id),
      quantity: evaluateFormulaGraph(row.ast as FormulaAst, binding.parameters as Record<string, string | number | bigint>),
      formulaAstSha256: String(row.ast_sha256),
      sourceRowSha256: String(row.source_row_sha256),
    }));
  const actual = actualResult.rows.map((row) => ({
    resourceSpecId: String(row.resource_spec_id),
    rowId: String(row.row_id),
    quantity: evaluateFormulaGraph({ kind: "literal", value: String(row.quantity) }, {}),
    formulaAstSha256: String(row.formula_ast_sha256),
    revisionRowSha256: String(row.row_sha256),
  }));
  const expectedComparable = expected.map(({ resourceSpecId, rowId, quantity, formulaAstSha256 }) => ({ resourceSpecId, rowId, quantity, formulaAstSha256 }));
  const actualComparable = actual.map(({ resourceSpecId, rowId, quantity, formulaAstSha256 }) => ({ resourceSpecId, rowId, quantity, formulaAstSha256 }));
  const expectedHash = sha256(expectedComparable);
  const actualHash = sha256(actualComparable);
  const revision = revisionResult.rows[0];
  const durationMs = new Date(binding.updatedAt).getTime() - new Date(binding.createdAt).getTime();
  const green = expected.length === actual.length && expectedHash === actualHash
    && Number(revision?.row_count) === actual.length;
  return {
    matrix: {
      schemaVersion: `canonical-estimate-server-${binding.operation}-matrix.r2`,
      catalogId: definition.catalog_id,
      domain: definition.domain,
      scopeKind: definition.scope_kind,
      shardInvariant: { maxIds: MAX_IDS_PER_SHARD, maxRows: MAX_ROWS_PER_SHARD },
      jobId: binding.jobId,
      revisionId: binding.revisionId,
      parentRevisionId: binding.parentRevisionId,
      parameterCount: Object.keys(binding.parameters).length,
      parameterDerivation: binding.parameterDerivation,
      expectedRows: expected.length,
      actualRows: actual.length,
      checksumSha256: String(revision?.checksum_sha256 ?? ""),
      durationMs,
      status: green ? "GREEN" : "RED",
    },
    parity: {
      schemaVersion: "canonical-estimate-source-to-server-row-parity.r2",
      catalogId: definition.catalog_id,
      operation: binding.operation,
      sourceDefinitionVersionId: definition.id,
      sourceResourceRows: sourceResult.rows.length,
      includedSourceRows: expected.length,
      serverRevisionId: binding.revisionId,
      serverRows: actual.length,
      expectedProjectionSha256: expectedHash,
      serverProjectionSha256: actualHash,
      missingRows: Math.max(0, expected.length - actual.length),
      extraRows: Math.max(0, actual.length - expected.length),
      mismatch: expectedHash === actualHash ? 0 : 1,
      status: green ? "GREEN" : "RED",
    },
  };
}

function writeJsonLines(file: string, rows: JsonRecord[]): void {
  writeFileSync(join(EVIDENCE_ROOT, file), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "canonical-estimate-r2-mass-admission" });
  await client.connect();
  try {
    const release = (await client.query(`select * from public.estimate_definition_release where status='active'`)).rows[0];
    if (release?.source_manifest_sha256 !== EXPECTED_RELEASE_MANIFEST) throw new Error("active release manifest mismatch");
    const definitions = (await client.query(`
      select v.id, v.catalog_id, i.domain, i.namespace scope_kind,
             (select count(*)::integer from public.estimate_parameter_definition p where p.definition_version_id=v.id) parameter_count,
             (select count(*)::integer from public.estimate_resource_spec r where r.definition_version_id=v.id) resource_count
        from public.estimate_definition_version v
        join public.estimate_work_identity i on i.catalog_id=v.catalog_id
       where v.release_id=$1
       order by i.domain, v.catalog_id
    `, [release.id])).rows as Definition[];
    const totalRows = definitions.reduce((total, definition) => total + definition.resource_count, 0);
    if (definitions.length !== EXPECTED_DEFINITIONS || totalRows !== EXPECTED_RESOURCES) {
      throw new Error(`corpus cardinality mismatch ${definitions.length}/${totalRows}`);
    }
    const shards = buildShards(definitions);
    const compileBindings: JobBinding[] = [];
    const recalculateBindings: JobBinding[] = [];
    for (let index = 0; index < shards.length; index += 1) {
      const shard = shards[index];
      const rows = shard.reduce((total, definition) => total + definition.resource_count, 0);
      process.stdout.write(`[${new Date().toISOString()}] compile shard ${index + 1}/${shards.length}: ${shard.length} IDs, ${rows} rows\n`);
      compileBindings.push(...await enqueueOperation(client, shard, "compile", new Map()));
    }
    const parents = new Map(compileBindings.map((binding) => [binding.catalogId, binding.revisionId]));
    for (let index = 0; index < shards.length; index += 1) {
      const shard = shards[index];
      const rows = shard.reduce((total, definition) => total + definition.resource_count, 0);
      process.stdout.write(`[${new Date().toISOString()}] recalculate shard ${index + 1}/${shards.length}: ${shard.length} IDs, ${rows} rows\n`);
      recalculateBindings.push(...await enqueueOperation(client, shard, "recalculate", parents));
    }

    const compileByCatalog = new Map(compileBindings.map((binding) => [binding.catalogId, binding]));
    const recalculateByCatalog = new Map(recalculateBindings.map((binding) => [binding.catalogId, binding]));
    const compileMatrix: JsonRecord[] = [];
    const recalculateMatrix: JsonRecord[] = [];
    const parityMatrix: JsonRecord[] = [];
    for (let index = 0; index < definitions.length; index += 1) {
      const definition = definitions[index];
      const compile = await verifyRevision(client, definition, compileByCatalog.get(definition.catalog_id)!);
      const recalculate = await verifyRevision(client, definition, recalculateByCatalog.get(definition.catalog_id)!);
      compileMatrix.push(compile.matrix);
      recalculateMatrix.push(recalculate.matrix);
      parityMatrix.push(compile.parity, recalculate.parity);
      if ((index + 1) % 50 === 0 || index + 1 === definitions.length) {
        process.stdout.write(`[${new Date().toISOString()}] parity ${index + 1}/${definitions.length}\n`);
      }
    }
    const red = [...compileMatrix, ...recalculateMatrix, ...parityMatrix].filter((row) => row.status !== "GREEN");
    writeJsonLines("SERVER_COMPILE_1168_MATRIX.jsonl", compileMatrix);
    writeJsonLines("SERVER_RECALCULATE_1168_MATRIX.jsonl", recalculateMatrix);
    writeJsonLines("SOURCE_TO_SERVER_ROW_PARITY.jsonl", parityMatrix);
    const summary = {
      schemaVersion: "canonical-estimate-mass-admission-summary.r2",
      generatedAt: new Date().toISOString(),
      activeReleaseId: release.id,
      sourceManifestSha256: release.source_manifest_sha256,
      shardCount: shards.length,
      shardPolicy: { maxIds: MAX_IDS_PER_SHARD, maxRows: MAX_ROWS_PER_SHARD },
      compile: { expected: EXPECTED_DEFINITIONS, green: compileMatrix.filter((row) => row.status === "GREEN").length },
      recalculate: { expected: EXPECTED_DEFINITIONS, green: recalculateMatrix.filter((row) => row.status === "GREEN").length },
      parity: { comparisons: parityMatrix.length, green: parityMatrix.filter((row) => row.status === "GREEN").length },
      formulaResourceRowsPerOperation: EXPECTED_RESOURCES,
      redCount: red.length,
      status: red.length === 0 ? "GREEN" : "RED",
    };
    writeFileSync(join(EVIDENCE_ROOT, "SERVER_1168_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    appendFileSync(join(EVIDENCE_ROOT, "JOURNAL.jsonl"), `${JSON.stringify({
      at: summary.generatedAt,
      gate: "C1_C5",
      event: "SERVER_COMPILE_RECALCULATE_1168",
      status: summary.status,
      compileGreen: summary.compile.green,
      recalculateGreen: summary.recalculate.green,
      parityGreen: summary.parity.green,
    })}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (red.length) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
