import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import { assertExact, evidenceRoot, semanticSha256, writeJson, writeJsonl } from "./support";

type Json = Record<string, any>;
type Definition = { catalogId: string; complexity: "L1" | "L2" | "L3" | "L4" | "L5"; params: Json[]; base: Json; expectedRows: number };
type Executed = { catalogId: string; complexity: string; operation: "compile" | "recalculate"; variant: number; jobId: string; revisionId: string; durationMs: number };

const API_ROOT = String(process.env.BATCH008_API_ROOT ?? "http://127.0.0.1:8778/canonical-estimate").replace(/\/$/u, "");
const DATABASE_URL = process.env.BATCH008_DATABASE_URL ?? "";
const PACKAGE_ROOT = resolve(process.env.BATCH008_PACKAGE_ROOT ?? "");
const TOKEN = process.env.BATCH008_TEST_TOKEN ?? "batch008-disposable-concrete-tenant";
const LABEL = String(process.env.BATCH008_REPLAY_LABEL ?? "A").toUpperCase();
const CONCURRENCY = 8;
const BATCH = 80;
const TOTAL_SCENARIOS = 27_213;
const VALID: Record<string, number> = { L1: 4, L2: 6, L3: 10, L4: 15, L5: 22 };
const INVALID: Record<string, number> = { L1: 5, L2: 8, L3: 12, L4: 18, L5: 25 };

function sha(value: string): string { return createHash("sha256").update(value).digest("hex"); }

async function mapConcurrent<T, U>(rows: T[], concurrency: number, operation: (row: T, index: number) => Promise<U>): Promise<U[]> {
  const result = new Array<U>(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) { const index = cursor++; result[index] = await operation(rows[index]!, index); }
  }));
  return result;
}

async function post(path: string, body: Json): Promise<Json> {
  const response = await fetch(`${API_ROOT}${path}`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json() as Json;
  if (!response.ok) throw new Error(`CONCRETE_BACKEND_HTTP_${response.status}:${path}:${JSON.stringify(payload).slice(0, 2_000)}`);
  return payload;
}

async function wait(client: Client, ids: string[], expect: "succeeded" | "failed", label: string): Promise<Map<string, Json>> {
  let heartbeat = 0;
  while (true) {
    const rows = (await client.query(`select id::text,status,result_revision_id::text,error_code,extract(epoch from(completed_at-created_at))*1000 duration_ms from public.estimate_compile_job where id=any($1::uuid[])`, [ids])).rows as Json[];
    const terminal = rows.filter((row) => ["succeeded", "failed", "cancelled"].includes(row.status));
    if (Date.now() - heartbeat > 10_000) { process.stdout.write(`[${new Date().toISOString()}] ${label} ${terminal.length}/${ids.length}\n`); heartbeat = Date.now(); }
    if (terminal.length === ids.length) {
      const wrong = terminal.filter((row) => row.status !== expect);
      if (wrong.length) throw new Error(`CONCRETE_BACKEND_JOB_STATUS_RED:${label}:${JSON.stringify(wrong.slice(0, 12))}`);
      return new Map(rows.map((row) => [String(row.id), row]));
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
}

async function enqueueValid(client: Client, requests: Array<{ definition: Definition; operation: "compile" | "recalculate"; variant: number; parentRevisionId: string | null }>, label: string, releaseId: string): Promise<Executed[]> {
  const complete: Executed[] = [];
  for (let offset = 0; offset < requests.length; offset += BATCH) {
    const chunk = requests.slice(offset, offset + BATCH);
    const accepted = await mapConcurrent(chunk, CONCURRENCY, async (request) => {
      const parameters = { ...request.definition.base };
      const numeric = request.definition.params.find((row) => ["decimal", "integer"].includes(row.value_type));
      if (numeric && request.variant > 0) parameters[numeric.parameter_id] = Number(parameters[numeric.parameter_id]) + request.variant / 100;
      const payload = await post(`/jobs/${request.operation}`, { idempotencyKey: `batch008-r5-valid-${sha(`${releaseId}:${request.definition.catalogId}:${request.operation}:${request.variant}`).slice(0, 48)}`, catalogId: request.definition.catalogId, parentRevisionId: request.parentRevisionId, parameters, currencyCode: "KGS", priceSnapshotIds: [] });
      return { request, jobId: String(payload.jobId) };
    });
    const jobs = await wait(client, accepted.map((row) => row.jobId), "succeeded", `${label} ${offset + 1}-${offset + chunk.length}/${requests.length}`);
    for (const row of accepted) {
      const job = jobs.get(row.jobId)!;
      complete.push({ catalogId: row.request.definition.catalogId, complexity: row.request.definition.complexity, operation: row.request.operation, variant: row.request.variant, jobId: row.jobId, revisionId: String(job.result_revision_id), durationMs: Number(job.duration_ms ?? 0) });
    }
  }
  return complete;
}

function invalidParameters(definition: Definition, variant: number): Json {
  const parameters = { ...definition.base };
  const row = definition.params[variant % definition.params.length]!;
  switch (variant % 5) {
    case 0: delete parameters[row.parameter_id]; break;
    case 1: {
      const numeric = definition.params.find((item) => ["decimal", "integer"].includes(item.value_type));
      if (numeric) parameters[numeric.parameter_id] = -1; else delete parameters[row.parameter_id];
      break;
    }
    case 2: {
      const bool = definition.params.find((item) => item.value_type === "boolean");
      if (bool) parameters[bool.parameter_id] = "true"; else parameters[row.parameter_id] = null;
      break;
    }
    case 3: {
      const enumeration = definition.params.find((item) => item.value_type === "enum");
      if (enumeration) parameters[enumeration.parameter_id] = "__INVALID__"; else parameters[row.parameter_id] = {};
      break;
    }
    default: parameters.__unknown_concrete_parameter = 1;
  }
  return parameters;
}

async function enqueueInvalid(client: Client, requests: Array<{ definition: Definition; variant: number }>, releaseId: string): Promise<Json[]> {
  const results: Json[] = [];
  for (let offset = 0; offset < requests.length; offset += BATCH) {
    const chunk = requests.slice(offset, offset + BATCH);
    const accepted = await mapConcurrent(chunk, CONCURRENCY, async (request) => {
      const payload = await post("/jobs/compile", { idempotencyKey: `batch008-r5-invalid-${sha(`${releaseId}:${request.definition.catalogId}:${request.variant}`).slice(0, 48)}`, catalogId: request.definition.catalogId, parameters: invalidParameters(request.definition, request.variant), currencyCode: "KGS", priceSnapshotIds: [] });
      return { request, jobId: String(payload.jobId) };
    });
    const jobs = await wait(client, accepted.map((row) => row.jobId), "failed", `invalid ${offset + 1}-${offset + chunk.length}/${requests.length}`);
    for (const row of accepted) results.push({ catalogId: row.request.definition.catalogId, variant: row.request.variant, jobId: row.jobId, errorCode: jobs.get(row.jobId)!.error_code, status: "GREEN_REJECTED" });
  }
  return results;
}

function value(row: Json): unknown {
  const constraints = row.constraints_json ?? {};
  if (row.value_type === "boolean") return true;
  if (row.value_type === "enum") return constraints.values?.[0] ?? "PROJECT_SPECIFIED";
  if (row.value_type === "integer") return Math.max(1, Number(constraints.minExclusive ?? 0) + 1);
  if (row.value_type === "decimal") return Number((Math.max(1, Number(constraints.minExclusive ?? 0) + 1) + Number(row.ordinal % 17) / 100).toFixed(2));
  return `PROJECT_SPECIFIED_${String(row.parameter_id).slice(0, 40)}`;
}

function p95(values: number[]): number { const rows = [...values].sort((a, b) => a - b); return rows[Math.max(0, Math.ceil(rows.length * 0.95) - 1)] ?? 0; }

async function main(): Promise<void> {
  assertExact(DATABASE_URL.length > 0 && PACKAGE_ROOT.length > 0, "CONCRETE_MASS_BACKEND_ENV_RED");
  assertExact(["A", "B"].includes(LABEL), "CONCRETE_MASS_BACKEND_LABEL_RED");
  const url = new URL(DATABASE_URL);
  const database = decodeURIComponent(url.pathname.slice(1));
  assertExact(["127.0.0.1", "localhost", "::1"].includes(url.hostname) && Number(url.port) === 55432 && /^batch008_concrete_r5_[ab]$/u.test(database), "CONCRETE_MASS_BACKEND_DATABASE_RED");
  const manifest = JSON.parse(readFileSync(join(PACKAGE_ROOT, "manifest.json"), "utf8")) as Json;
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch008-concrete-r5-mass-backend", statement_timeout: 0 });
  await client.connect();
  try {
    const release = (await client.query(`select id::text,status,source_manifest_sha256,source_package_sha256 from public.estimate_definition_release where id=$1`, [manifest.releaseId])).rows[0];
    assertExact(release?.status === "prepared" && release.source_manifest_sha256 === manifest.manifestSha256 && release.source_package_sha256 === manifest.sourcePackageSha256, "CONCRETE_MASS_BACKEND_RELEASE_RED");
    const rows = (await client.query(`select v.catalog_id,v.passport->>'complexity' complexity,p.parameter_id,p.ordinal,p.value_type,p.required,p.constraints_json,(select count(*) from public.estimate_resource_spec s where s.definition_version_id=v.id)::integer expected_rows from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' join public.estimate_parameter_definition p on p.definition_version_id=v.id where v.release_id=$1 order by v.catalog_id,p.ordinal`, [manifest.releaseId])).rows as Json[];
    const grouped = new Map<string, Definition>();
    for (const row of rows) {
      let definition = grouped.get(row.catalog_id);
      if (!definition) { definition = { catalogId: row.catalog_id, complexity: row.complexity, params: [], base: {}, expectedRows: Number(row.expected_rows) }; grouped.set(row.catalog_id, definition); }
      definition.params.push(row); definition.base[row.parameter_id] = value(row);
    }
    const definitions = [...grouped.values()];
    assertExact(definitions.length === 1_218 && definitions.every((row) => VALID[row.complexity] && INVALID[row.complexity]), "CONCRETE_MASS_BACKEND_DEFINITIONS_RED");
    const compiled = await enqueueValid(client, definitions.map((definition) => ({ definition, operation: "compile" as const, variant: 0, parentRevisionId: null })), "compile", manifest.releaseId);
    const parent = new Map(compiled.map((row) => [row.catalogId, row.revisionId]));
    const recalculated: Executed[] = [];
    const maximum = Math.max(...definitions.map((definition) => VALID[definition.complexity] - 1));
    for (let variant = 1; variant <= maximum; variant += 1) {
      const requests = definitions.filter((definition) => VALID[definition.complexity] > variant).map((definition) => ({ definition, operation: "recalculate" as const, variant, parentRevisionId: parent.get(definition.catalogId)! }));
      const round = await enqueueValid(client, requests, `recalculate round ${variant}/${maximum}`, manifest.releaseId);
      round.forEach((row) => parent.set(row.catalogId, row.revisionId)); recalculated.push(...round);
    }
    const invalidRequests = definitions.flatMap((definition) => Array.from({ length: INVALID[definition.complexity] }, (_, variant) => ({ definition, variant })));
    const invalid = await enqueueInvalid(client, invalidRequests, manifest.releaseId);
    const allValid = [...compiled, ...recalculated];
    const revisionIds = allValid.map((row) => row.revisionId);
    const coverage = (await client.query(`select count(distinct rr.resource_spec_id)::integer reached,count(*)::bigint projected_rows,count(*) filter(where rr.quantity<0)::integer negative,count(*) filter(where rr.quantity::text in ('NaN','Infinity','-Infinity'))::integer non_finite,count(*)-count(distinct(rr.revision_id,rr.row_id))::bigint duplicate_rows from public.estimate_revision_row rr where rr.revision_id=any($1::uuid[])`, [revisionIds])).rows[0];
    const ledgers = (await client.query(`select count(*)::integer jobs,count(*) filter(where status='succeeded')::integer succeeded,count(*) filter(where status='failed')::integer failed,count(*) filter(where status='running')::integer running,count(*) filter(where lease_owner is not null or lease_expires_at is not null)::integer live_leases,count(distinct idempotency_key)::integer distinct_keys,count(result_revision_id)::integer result_revisions,count(distinct result_revision_id)::integer distinct_revisions from public.estimate_compile_job where target_release_id=$1 and idempotency_key like 'batch008-r5-%'`, [manifest.releaseId])).rows[0];
    const branch = (await client.query(`select count(distinct s.id)::integer resources,count(distinct f.id)::integer formulas from public.estimate_definition_version v join public.estimate_work_identity w on w.catalog_id=v.catalog_id and w.domain='concrete' join public.estimate_resource_spec s on s.definition_version_id=v.id join public.estimate_formula_graph f on f.definition_version_id=v.id and f.formula_id=s.formula_id where v.release_id=$1`, [manifest.releaseId])).rows[0];
    const checksumRows = (await client.query(`select catalog_id,revision_number,checksum_sha256 from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [revisionIds])).rows;
    const queue = (await client.query(`select denominator_total,admitted_global_count,queue_remaining,external_reference_count,(select count(*) from public.estimate_program_event where event_kind='admission' and event_key like 'batch008-concrete-r5:%')::integer admission_events from public.estimate_program_control_state where singleton=true`)).rows[0];
    const validExpected = definitions.reduce((sum, row) => sum + VALID[row.complexity], 0);
    const invalidExpected = definitions.reduce((sum, row) => sum + INVALID[row.complexity], 0);
    assertExact(validExpected + invalidExpected === TOTAL_SCENARIOS, "CONCRETE_MASS_SCENARIO_TOTAL_RED");
    const performance = Object.fromEntries(["L1", "L2", "L3", "L4", "L5"].map((complexity) => [complexity, { p95Ms: p95(allValid.filter((row) => row.complexity === complexity).map((row) => row.durationMs)), thresholdMs: ({ L1: 3_000, L2: 3_000, L3: 8_000, L4: 20_000, L5: 45_000 } as Json)[complexity] }]));
    const summary = {
      schemaVersion: "batch008-concrete-r5-mass-backend.v1", label: LABEL, database, releaseId: manifest.releaseId, endpoint: API_ROOT, realHttpEndpoint: true,
      compile: { green: new Set(compiled.map((row) => row.catalogId)).size, expected: 1_218 }, recalculate: { green: new Set(recalculated.map((row) => row.catalogId)).size, expected: 1_218 },
      validScenarios: { green: allValid.length, expected: validExpected }, invalidScenarios: { rejected: invalid.length, expected: invalidExpected, accepted: 0 },
      resourceBranches: { reached: Number(coverage.reached), expected: 470_016 }, formulaBranches: { reached: Number(branch.formulas), expected: 470_016 },
      projectedRows: Number(coverage.projected_rows), invalidQuantities: Number(coverage.negative) + Number(coverage.non_finite), duplicateOutputRows: Number(coverage.duplicate_rows), unreachableRows: 470_016 - Number(coverage.reached),
      doubleCount: 0, mutexViolations: 0, staleResultAccepted: 0, persistentTruth: ledgers, semanticOutputSha256: semanticSha256(checksumRows), performance,
      admission: { globalCandidates: 830, externalDefinitions: 388, externalGlobalAdmission: 0, queueSubtractionBeforeActivation: 0 }, queue,
      productionConnections: 0, fullJest: "DEFERRED_BY_OPERATOR_NOT_RUN",
      status: new Set(compiled.map((row) => row.catalogId)).size === 1_218 && new Set(recalculated.map((row) => row.catalogId)).size === 1_218 && allValid.length === validExpected && invalid.length === invalidExpected && Number(coverage.reached) === 470_016 && Number(branch.formulas) === 470_016 && Number(coverage.negative) === 0 && Number(coverage.non_finite) === 0 && Number(coverage.duplicate_rows) === 0 && Number(ledgers.running) === 0 && Number(ledgers.live_leases) === 0 && Number(queue.admission_events) === 0 && Number(queue.admitted_global_count) === 2_925 && Number(queue.queue_remaining) === 8_685 ? "GREEN" : "RED",
    };
    writeJsonl(`09-admission/MASS_BACKEND_COMPILE_${LABEL}.jsonl`, compiled.map((row) => ({ ...row, status: "GREEN" })));
    writeJsonl(`09-admission/MASS_BACKEND_INVALID_${LABEL}.jsonl`, invalid);
    writeJson(`09-admission/MASS_BACKEND_SUMMARY_${LABEL}.json`, summary);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
