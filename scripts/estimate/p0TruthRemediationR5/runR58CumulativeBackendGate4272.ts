import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Client } from "pg";

import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";

type Json = Record<string, any>;
type Definition = {
  catalogId: string;
  definitionVersionId: string;
  domain: string;
  titleRu: string;
  baselineId: string;
  values: Json;
  formulaConsumers: Json;
  validationScenarios: Json[];
  baselineRowCount: number;
  numericParameters: Json[];
};
type Mutation = { parameterId: string; baselineValue: number; changedValue: number; source: string };

const CONTROL_72 = String(process.env.R6_CONTROL72_GATE ?? "").trim() === "true";
const SPEC_PATH = resolve(CONTROL_72
  ? "C:/Users/User/Downloads/ONE_CANONICAL_ESTIMATE_PRODUCTION_TZ_R6.md"
  : "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md");
const SPEC_SHA256 = CONTROL_72
  ? "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa"
  : "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const BASE_COMMIT = "691acb78d55c38ef447a4d91c0bc798992e58dbc";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const TARGET_RELEASE_ID = process.env.R58_TARGET_RELEASE_ID
  ?? "a7dca174-3ad5-552b-aa4c-fc28979a56ef";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = CONTROL_72
  ? String(process.env.CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID
    ?? "66666666-6666-4666-8666-666666666666")
  : "22222222-2222-4222-8222-222222222222";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const API_ROOT = String(process.env.R58_CANONICAL_API_ROOT
  ?? "http://127.0.0.1:8777/canonical-estimate").replace(/\/+$/u, "");
const AUTHORIZATION = "Bearer local-r58-cumulative-proof";
const EXPECTED_TOTAL = Number(process.env.R58_EXPECTED_TOTAL ?? "4272");
const TARGET_CATALOG_ID = String(process.env.R58_TARGET_CATALOG_ID ?? "").trim();
const TARGET_CATALOG_IDS = String(process.env.R58_TARGET_CATALOG_IDS ?? "").split(",")
  .map((value) => value.trim()).filter(Boolean);
const REPRESENTATIVE = String(process.env.R58_REPRESENTATIVE_GATE ?? "").trim() === "true";
const DEFAULT_SHARD_SIZE = 10;
const ARTIFACT_ROOT = resolve(".release-runtime/master11610-backend-canonical-r1/05-runtime/local-artifacts");
const OUTPUT_ROOT = resolve(CONTROL_72
  ? ".release-runtime/one-canonical-estimate-r6/evidence/09-control-72/backend"
  : ".release-runtime/p0-one-monolith-r58/evidence/06-backend");
const PROBE = process.argv.includes("--probe");

function optionNumber(name: string, fallback: number): number {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`));
  const separate = process.argv.indexOf(name);
  const raw = inline?.slice(name.length + 1) ?? (separate >= 0 ? process.argv[separate + 1] : undefined);
  const value = raw == null ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`R58_BACKEND_OPTION_INVALID:${name}:${raw}`);
  return value;
}

const SHARD_SIZE = optionNumber("--shard-size", DEFAULT_SHARD_SIZE);
const LIMIT = optionNumber("--limit", PROBE ? 2 : EXPECTED_TOTAL);
const VACUUM_EVERY_SHARDS = 10;
const RUNTIME_TABLES = [
  "estimate_revision_row",
  "estimate_revision_row_price",
  "estimate_revision_artifact",
  "estimate_revision",
  "estimate_compile_job",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Json;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : stable(value)).digest("hex");
}

function git(args: readonly string[]): string {
  return execFileSync("git", [...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function readJsonl(path: string): Json[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

async function api(path: string, init: RequestInit = {}): Promise<Json> {
  const response = await fetch(`${API_ROOT}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: AUTHORIZATION,
      ...(init.body == null ? {} : { "Content-Type": "application/json" }),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null) as Json | null;
  if (!response.ok) throw new Error(`R58_BACKEND_HTTP_${response.status}:${path}:${JSON.stringify(payload).slice(0, 2_000)}`);
  return payload ?? {};
}

async function mapConcurrent<T, U>(rows: readonly T[], concurrency: number,
  operation: (row: T, index: number) => Promise<U>): Promise<U[]> {
  const results = new Array<U>(rows.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const index = cursor++;
      results[index] = await operation(rows[index]!, index);
    }
  }));
  return results;
}

async function waitForJobs(client: Client, jobIds: readonly string[], label: string): Promise<Map<string, Json>> {
  const startedAt = Date.now();
  let heartbeatAt = 0;
  while (Date.now() - startedAt < 300_000) {
    const rows = jobIds.length === 0 ? [] : (await client.query(`
      select id::text,status,result_revision_id::text,error_code,error_detail,
        extract(epoch from(coalesce(completed_at,now())-created_at))*1000 duration_ms
      from public.estimate_compile_job where id=any($1::uuid[])
    `, [jobIds])).rows as Json[];
    const terminal = rows.filter((row) => ["succeeded", "failed", "cancelled"].includes(String(row.status)));
    if (terminal.length === jobIds.length) return new Map(rows.map((row) => [String(row.id), row]));
    if (Date.now() - heartbeatAt > 10_000) {
      process.stdout.write(`[${new Date().toISOString()}] ${label} ${terminal.length}/${jobIds.length}\n`);
      heartbeatAt = Date.now();
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`R58_BACKEND_JOB_TIMEOUT:${label}:${jobIds.length}`);
}

function constraintAllows(parameter: Json, value: number): boolean {
  const constraints = parameter.constraints_json ?? {};
  return Number.isFinite(value)
    && (constraints.min == null || value >= Number(constraints.min))
    && (constraints.max == null || value <= Number(constraints.max))
    && (constraints.minExclusive == null || value > Number(constraints.minExclusive))
    && (constraints.maxExclusive == null || value < Number(constraints.maxExclusive));
}

function mutations(definition: Definition): Mutation[] {
  const scenarios = definition.validationScenarios
    .map((scenario) => scenario?.sensitivityScenario)
    .filter((scenario) => scenario?.changedValueAffectsCompilation === true
      && scenario?.missingRequiredValueRejected === true);
  const result: Mutation[] = scenarios.map((scenario) => ({
    parameterId: String(scenario.parameterId),
    baselineValue: Number(scenario.baselineValue),
    changedValue: Number(scenario.changedValue),
    source: "APPROVED_BASELINE_SENSITIVITY",
  }));
  const parameters = [...definition.numericParameters].sort((left, right) => {
    const leftConsumers = Array.isArray(definition.formulaConsumers?.[left.parameter_id])
      ? definition.formulaConsumers[left.parameter_id].length : 0;
    const rightConsumers = Array.isArray(definition.formulaConsumers?.[right.parameter_id])
      ? definition.formulaConsumers[right.parameter_id].length : 0;
    return rightConsumers - leftConsumers || Number(left.ordinal) - Number(right.ordinal);
  });
  for (const parameter of parameters) {
    const parameterId = String(parameter.parameter_id);
    const consumers = definition.formulaConsumers?.[parameterId];
    if (!Array.isArray(consumers) || consumers.length === 0) continue;
    const baselineValue = Number(definition.values[parameterId]);
    if (!Number.isFinite(baselineValue)) continue;
    const candidates = parameter.value_type === "integer"
      ? [baselineValue + 1, Math.round(baselineValue * 2), baselineValue - 1]
      : [baselineValue === 0 ? 1 : baselineValue * 1.1, baselineValue + 1,
        baselineValue === 0 ? 2 : baselineValue * 2, baselineValue * 0.9, baselineValue - 1];
    for (const changedValue of [...new Set(candidates.map((value) => parameter.value_type === "integer"
      ? Math.round(value) : Number(value.toPrecision(12))))]) {
      if (changedValue === baselineValue || !constraintAllows(parameter, changedValue)) continue;
      result.push({ parameterId, baselineValue, changedValue, source: "FORMULA_CONSUMER_PERTURBATION" });
    }
  }
  const unique = new Map<string, Mutation>();
  for (const row of result) unique.set(`${row.parameterId}:${row.changedValue}`, row);
  return [...unique.values()].slice(0, 24);
}

async function loadDefinitions(client: Client, catalogIds: readonly string[]): Promise<Definition[]> {
  const rows = (await client.query(`
    select manifest.catalog_id,manifest.definition_version_id::text,identity.domain,identity.title_ru,
      baseline.id::text baseline_id,baseline.input_values,baseline.formula_consumer_ids,
      baseline.validation_scenario_refs
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline
      on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_work_identity identity on identity.catalog_id=manifest.catalog_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    order by manifest.catalog_id
  `, [TARGET_RELEASE_ID, catalogIds])).rows as Json[];
  const definitionIds = rows.map((row) => String(row.definition_version_id));
  const resources = definitionIds.length === 0 ? [] : (await client.query(`
    select definition_version_id::text,row_id,inclusion_ast
    from public.estimate_resource_spec
    where definition_version_id=any($1::uuid[])
    order by definition_version_id,ordinal,row_id
  `, [definitionIds])).rows as Json[];
  const resourcesByDefinition = new Map<string, Json[]>();
  for (const resource of resources) {
    const key = String(resource.definition_version_id);
    const list = resourcesByDefinition.get(key) ?? [];
    list.push(resource);
    resourcesByDefinition.set(key,list);
  }
  const parameters = definitionIds.length === 0 ? [] : (await client.query(`
    select definition_version_id::text,parameter_id,ordinal,value_type,unit_id,title_ru,required,constraints_json
    from public.estimate_parameter_definition
    where definition_version_id=any($1::uuid[]) and required
      and value_type in ('decimal','integer')
    order by definition_version_id,ordinal
  `, [definitionIds])).rows as Json[];
  const parametersByDefinition = new Map<string, Json[]>();
  for (const parameter of parameters) {
    const key = String(parameter.definition_version_id);
    const list = parametersByDefinition.get(key) ?? [];
    list.push(parameter);
    parametersByDefinition.set(key, list);
  }
  return rows.map((row) => ({
    catalogId: String(row.catalog_id),
    definitionVersionId: String(row.definition_version_id),
    domain: String(row.domain),
    titleRu: String(row.title_ru),
    baselineId: String(row.baseline_id),
    values: row.input_values as Json,
    formulaConsumers: row.formula_consumer_ids as Json,
    validationScenarios: Array.isArray(row.validation_scenario_refs) ? row.validation_scenario_refs : [],
    baselineRowCount: (resourcesByDefinition.get(String(row.definition_version_id)) ?? [])
      .filter((resource) => evaluateInclusionGraph(resource.inclusion_ast as Json,row.input_values as Json)).length,
    numericParameters: parametersByDefinition.get(String(row.definition_version_id)) ?? [],
  }));
}

async function createOperation(definition: Definition, operation: "compile" | "recalculate",
  head: string, mutation: Mutation | null, parentRevisionId: string | null): Promise<Json> {
  const parameters = { ...definition.values };
  if (mutation) parameters[mutation.parameterId] = mutation.changedValue;
  const key = `${CONTROL_72 ? "r6-control72" : "r58-4272"}-${sha256({ head, catalogId: definition.catalogId, operation,
    mutation, parentRevisionId }).slice(0, 48)}`;
  const primaryParameter = [...definition.numericParameters]
    .filter((parameter) => Number.isFinite(Number(parameters[String(parameter.parameter_id)])))
    .sort((left, right) => {
      const score = (parameter: Json): number => {
        const id = String(parameter.parameter_id);
        if (/^quantity_/u.test(id)) return 20;
        if (/(?:area|length|volume|count|width|height|mass|distance|capacity|power)/u.test(id)) return 0;
        return 10;
      };
      return score(left) - score(right) || Number(left.ordinal) - Number(right.ordinal);
    })[0];
  invariant(primaryParameter, `R6_BACKEND_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
  const primaryMeasureParameterId = String(primaryParameter.parameter_id);
  const sourceRequestText = `${definition.titleRu} ${parameters[primaryMeasureParameterId]}`
    + `${primaryParameter.unit_id ? ` ${primaryParameter.unit_id}` : ""}`;
  const created = await api(`jobs/${operation}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: key,
      catalogId: definition.catalogId,
      parentRevisionId,
      parameters,
      ...(operation === "compile" ? { sourceRequestText, primaryMeasureParameterId } : {}),
      currencyCode: "KGS",
      priceSnapshotIds: [],
    }),
  });
  return { definition, mutation, jobId: String(created.jobId) };
}

async function revisionEvidence(client: Client, revisionIds: readonly string[]): Promise<Map<string, Json>> {
  if (revisionIds.length === 0) return new Map();
  const rows = (await client.query(`
    select revision.id::text,revision.parent_revision_id::text,revision.release_id::text,
      revision.catalog_id,revision.revision_number,revision.status,revision.row_count,
      revision.checksum_sha256,revision.compiler_version,revision.compiler_owner,
      revision.parameter_schema_hash,revision.input_hash,revision.output_hash,
      count(revision_row.*)::int projected_rows,
      count(*) filter(where revision_row.quantity<0)::int negative_rows,
      count(*) filter(where revision_row.quantity::text in ('NaN','Infinity','-Infinity'))::int non_finite_rows,
      count(revision_row.row_id)-count(distinct revision_row.row_id)::int duplicate_row_ids,
      count(*) filter(where nullif(trim(revision_row.semantic_owner),'') is null)::int blank_semantic_owners,
      count(revision_row.semantic_owner)-count(distinct revision_row.semantic_owner)::int duplicate_semantic_owners
    from public.estimate_revision revision
    left join public.estimate_revision_row revision_row on revision_row.revision_id=revision.id
    where revision.id=any($1::uuid[])
    group by revision.id
  `, [revisionIds])).rows as Json[];
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function changedRows(client: Client, beforeRevisionId: string, afterRevisionId: string): Promise<number> {
  return Number((await client.query(`
    select count(*)::int value from (
      select coalesce(before.row_id,after.row_id) row_id
      from public.estimate_revision_row before
      full join public.estimate_revision_row after
        on after.revision_id=$2 and after.row_id=before.row_id
      where before.revision_id=$1 and (
        before.row_sha256 is distinct from after.row_sha256
        or before.quantity is distinct from after.quantity
        or before.included_in_estimate is distinct from after.included_in_estimate
      )
    ) changed
  `, [beforeRevisionId, afterRevisionId])).rows[0]?.value ?? 0);
}

async function historyEvidence(definition: Definition, compileRevisionId: string,
  recalculatedRevisionId: string): Promise<Json> {
  const payload = await api(`revisions?catalogId=${encodeURIComponent(definition.catalogId)}&limit=100`);
  const revisions = Array.isArray(payload.revisions) ? payload.revisions : [];
  const compile = revisions.find((row: Json) => row.revisionId === compileRevisionId);
  const recalculated = revisions.find((row: Json) => row.revisionId === recalculatedRevisionId);
  return {
    compileVisible: Boolean(compile),
    recalculatedVisible: Boolean(recalculated),
    immutableParentLink: recalculated?.parentRevisionId === compileRevisionId,
    historyCount: revisions.length,
  };
}

async function createArtifacts(client: Client, definitions: readonly Definition[], finalByCatalog: Map<string, Json>,
  head: string): Promise<Map<string, Json>> {
  const requests = definitions.flatMap((definition) => {
    const final = finalByCatalog.get(definition.catalogId);
    if (!final) return [];
    return (["pdf", "procurement"] as const).map((kind) => ({ definition, final, kind }));
  });
  const created = await mapConcurrent(requests, 6, async (request) => {
    const payload = await api(`revisions/${request.final.revisionId}/artifacts/${request.kind}`, {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `${CONTROL_72 ? "r6-control72-artifact" : "r58-4272-artifact"}-${sha256({ head, catalogId: request.definition.catalogId,
          revisionId: request.final.revisionId, kind: request.kind }).slice(0, 48)}`,
      }),
    });
    return { ...request, jobId: String(payload.jobId), artifactId: String(payload.artifactId) };
  });
  const jobs = await waitForJobs(client, created.map((row) => row.jobId), "artifacts");
  const result = new Map<string, Json>();
  for (const row of created) {
    const job = jobs.get(row.jobId)!;
    const artifact = job.status === "succeeded"
      ? await api(`revisions/${row.final.revisionId}/artifacts/${row.kind}`)
      : null;
    result.set(`${row.definition.catalogId}:${row.kind}`, {
      jobId: row.jobId,
      jobStatus: job.status,
      errorCode: job.error_code,
      artifactId: row.artifactId,
      status: artifact?.status ?? "failed",
      releaseId: artifact?.releaseId ?? null,
      revisionId: artifact?.revisionId ?? null,
      byteSize: artifact?.byteSize ?? null,
      sha256: artifact?.sha256 ?? null,
      contentType: artifact?.contentType ?? null,
      sourceReleaseId: artifact?.metadata?.sourceReleaseId ?? null,
      sourceRevisionChecksumSha256: artifact?.metadata?.sourceRevisionChecksumSha256 ?? null,
    });
  }
  return result;
}

function artifactPath(storageKey: string): string {
  const safe = storageKey.replace(/[^a-zA-Z0-9._/-]+/gu, "_").replace(/^[/\\]+/u, "");
  const path = resolve(ARTIFACT_ROOT, safe);
  invariant(path !== ARTIFACT_ROOT
    && (path.startsWith(`${ARTIFACT_ROOT}\\`) || path.startsWith(`${ARTIFACT_ROOT}/`)),
  `R58_BACKEND_ARTIFACT_PATH_ESCAPE:${storageKey}`);
  return path;
}

async function cleanupRuntime(client: Client): Promise<Json> {
  const storageKeys = (await client.query(`
    select artifact.storage_key from public.estimate_revision_artifact artifact
    join public.estimate_revision revision on revision.id=artifact.revision_id
    where revision.release_id=$1 and revision.owner_user_id=$2 and revision.organization_id=$3
      and artifact.storage_key is not null
  `, [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID])).rows.map((row) => String(row.storage_key));
  const cleanup = (await client.query(CONTROL_72
    ? "select * from public.estimate_cleanup_r6_control_runtime($1,$2,$3,$4)"
    : "select * from public.estimate_cleanup_cumulative_admission_runtime_r58($1,$2,$3)",
  CONTROL_72
    ? [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID, "r6-control72-%"]
    : [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID])).rows[0] as Json;
  invariant(Number(cleanup.residue) === 0, `R58_BACKEND_CLEANUP_RESIDUE:${cleanup.residue}`);
  let artifactFilesDeleted = 0;
  for (const storageKey of storageKeys) {
    const path = artifactPath(storageKey);
    if (existsSync(path)) {
      unlinkSync(path);
      artifactFilesDeleted += 1;
    }
  }
  return { ...cleanup, artifactFilesDeleted };
}

async function processShard(client: Client, definitions: readonly Definition[], head: string): Promise<Json[]> {
  const compileCreated = await mapConcurrent(definitions, 6,
    async (definition) => createOperation(definition, "compile", head, null, null));
  const compileJobs = await waitForJobs(client, compileCreated.map((row) => row.jobId), "compile");
  const compileRevisionIds = compileCreated.map((row) => String(compileJobs.get(row.jobId)?.result_revision_id ?? ""))
    .filter(Boolean);
  const compileRevisions = await revisionEvidence(client, compileRevisionIds);
  const compileByCatalog = new Map<string, Json>();
  for (const created of compileCreated) {
    const job = compileJobs.get(created.jobId)!;
    const revision = compileRevisions.get(String(job.result_revision_id));
    if (job.status === "succeeded" && revision) {
      compileByCatalog.set(created.definition.catalogId, { jobId: created.jobId, job, revision });
    }
  }

  const finalByCatalog = new Map<string, Json>();
  const attemptsByCatalog = new Map<string, Json[]>();
  const pending = definitions.filter((definition) => compileByCatalog.has(definition.catalogId))
    .map((definition) => ({ definition, candidates: mutations(definition), candidateIndex: 0 }));
  while (pending.some((row) => !finalByCatalog.has(row.definition.catalogId))) {
    const round = pending.filter((row) => !finalByCatalog.has(row.definition.catalogId)
      && row.candidateIndex < row.candidates.length);
    if (round.length === 0) break;
    const created = await mapConcurrent(round, 6, async (row) => {
      const mutation = row.candidates[row.candidateIndex++]!;
      const compile = compileByCatalog.get(row.definition.catalogId)!;
      return createOperation(row.definition, "recalculate", head, mutation, String(compile.revision.id));
    });
    const jobs = await waitForJobs(client, created.map((row) => row.jobId), "recalculate");
    const revisionIds = created.map((row) => String(jobs.get(row.jobId)?.result_revision_id ?? "")).filter(Boolean);
    const revisions = await revisionEvidence(client, revisionIds);
    for (const row of created) {
      const job = jobs.get(row.jobId)!;
      const revision = revisions.get(String(job.result_revision_id));
      const attempts = attemptsByCatalog.get(row.definition.catalogId) ?? [];
      const compile = compileByCatalog.get(row.definition.catalogId)!;
      let dependentRowsChanged = 0;
      if (job.status === "succeeded" && revision) {
        dependentRowsChanged = await changedRows(client, String(compile.revision.id), String(revision.id));
      }
      attempts.push({ jobId: row.jobId, status: job.status, errorCode: job.error_code,
        mutation: row.mutation, revisionId: revision?.id ?? null,
        checksumSha256: revision?.checksum_sha256 ?? null, dependentRowsChanged });
      attemptsByCatalog.set(row.definition.catalogId, attempts);
      if (job.status === "succeeded" && revision
        && revision.checksum_sha256 !== compile.revision.checksum_sha256 && dependentRowsChanged > 0) {
        finalByCatalog.set(row.definition.catalogId, {
          revisionId: String(revision.id),
          revision,
          jobId: row.jobId,
          mutation: row.mutation,
          dependentRowsChanged,
        });
      }
    }
  }

  const artifacts = await createArtifacts(client, definitions, finalByCatalog, head);
  const ledger: Json[] = [];
  for (const definition of definitions) {
    const compile = compileByCatalog.get(definition.catalogId);
    const final = finalByCatalog.get(definition.catalogId);
    const history = compile && final
      ? await historyEvidence(definition, String(compile.revision.id), String(final.revision.id))
      : null;
    const pdf = artifacts.get(`${definition.catalogId}:pdf`) ?? null;
    const procurement = artifacts.get(`${definition.catalogId}:procurement`) ?? null;
    const compileRevision = compile?.revision;
    const recalculateRevision = final?.revision;
    const failures: string[] = [];
    if (!compile) failures.push(`COMPILE_FAILED:${compileCreated.find((row) => row.definition.catalogId === definition.catalogId)?.jobId ?? "missing"}`);
    if (compileRevision && (
      compileRevision.release_id !== TARGET_RELEASE_ID
      || compileRevision.catalog_id !== definition.catalogId
      || Number(compileRevision.row_count) !== definition.baselineRowCount
      || Number(compileRevision.projected_rows) !== definition.baselineRowCount
      || Number(compileRevision.negative_rows) !== 0
      || Number(compileRevision.non_finite_rows) !== 0
      || Number(compileRevision.duplicate_row_ids) !== 0
      || Number(compileRevision.blank_semantic_owners) !== 0
      || Number(compileRevision.duplicate_semantic_owners) !== 0
      || compileRevision.compiler_owner !== "backend"
    )) failures.push("COMPILE_REVISION_INVARIANT_RED");
    if (!final) failures.push(`RECALCULATE_NO_EFFECT_OR_FAILED:${JSON.stringify(attemptsByCatalog.get(definition.catalogId) ?? [])}`);
    if (recalculateRevision && (
      recalculateRevision.release_id !== TARGET_RELEASE_ID
      || recalculateRevision.catalog_id !== definition.catalogId
      || recalculateRevision.parent_revision_id !== compileRevision?.id
      || Number(recalculateRevision.negative_rows) !== 0
      || Number(recalculateRevision.non_finite_rows) !== 0
      || Number(recalculateRevision.duplicate_row_ids) !== 0
      || Number(recalculateRevision.blank_semantic_owners) !== 0
      || Number(recalculateRevision.duplicate_semantic_owners) !== 0
      || recalculateRevision.compiler_owner !== "backend"
    )) failures.push("RECALCULATE_REVISION_INVARIANT_RED");
    if (history && (!history.compileVisible || !history.recalculatedVisible || !history.immutableParentLink)) {
      failures.push("HISTORY_IMMUTABILITY_RED");
    }
    for (const [kind, artifact] of [["PDF", pdf], ["PROCUREMENT", procurement]] as const) {
      if (!artifact || artifact.jobStatus !== "succeeded" || artifact.status !== "ready"
        || artifact.releaseId !== TARGET_RELEASE_ID || artifact.revisionId !== final?.revisionId
        || Number(artifact.byteSize) <= 0 || !/^[a-f0-9]{64}$/u.test(String(artifact.sha256 ?? ""))
        || artifact.sourceReleaseId !== TARGET_RELEASE_ID
        || artifact.sourceRevisionChecksumSha256 !== recalculateRevision?.checksum_sha256) {
        failures.push(`${kind}_ARTIFACT_RED`);
      }
    }
    ledger.push({
      schemaVersion: "p0-one-monolith-r58-cumulative-backend-definition.v1",
      head,
      catalogId: definition.catalogId,
      domain: definition.domain,
      definitionVersionId: definition.definitionVersionId,
      approvedTemplateBaselineId: definition.baselineId,
      baselineRowCount: definition.baselineRowCount,
      compile: compile ? { jobId: compile.jobId, revisionId: compile.revision.id,
        rowCount: Number(compile.revision.row_count), checksumSha256: compile.revision.checksum_sha256,
        durationMs: Number(compile.job.duration_ms ?? 0) } : null,
      recalculate: final ? { jobId: final.jobId, revisionId: final.revisionId,
        parentRevisionId: final.revision.parent_revision_id, rowCount: Number(final.revision.row_count),
        checksumSha256: final.revision.checksum_sha256, mutation: final.mutation,
        dependentRowsChanged: final.dependentRowsChanged } : null,
      recalculateAttempts: attemptsByCatalog.get(definition.catalogId) ?? [],
      history,
      artifacts: { pdf, procurement },
      failures,
      status: failures.length === 0 ? "GREEN" : "RED",
    });
  }
  return ledger;
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R58_BACKEND_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R58_BACKEND_BRANCH_DRIFT:${branch}`);
  invariant(git(["status", "--porcelain=v1"]) === "", "R58_BACKEND_DIRTY_WORKTREE");
  git(["merge-base", "--is-ancestor", BASE_COMMIT, head]);
  invariant(!PROBE || LIMIT <= SHARD_SIZE, "R58_BACKEND_PROBE_MUST_BE_SINGLE_SHARD");

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  const suffix = CONTROL_72 ? `CONTROL72_${head.slice(0, 8)}`
    : REPRESENTATIVE ? `REPRESENTATIVE50_${head.slice(0, 8)}`
    : PROBE ? `PROBE_${head.slice(0, 8)}` : head.slice(0, 8);
  const basename = CONTROL_72 ? "R6_CONTROL_72_BACKEND" : "BATCH001_008_BACKEND_ADMISSION_4272";
  const ledgerPath = resolve(OUTPUT_ROOT, `${basename}_${suffix}.jsonl`);
  const repairPath = resolve(OUTPUT_ROOT, `${CONTROL_72 ? "R6_CONTROL_72_BACKEND_REPAIR_QUEUE" : "BATCH001_008_BACKEND_REPAIR_QUEUE"}_${suffix}.jsonl`);
  const summaryPath = resolve(OUTPUT_ROOT, `${basename}_${suffix}.json`);
  const existing = PROBE ? [] : readJsonl(ledgerPath);
  invariant(existing.every((row) => row.head === head), "R58_BACKEND_CHECKPOINT_HEAD_DRIFT");
  const completed = new Set(existing.map((row) => String(row.catalogId)));

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: PROBE ? "r58-cumulative-backend-4272-probe" : "r58-cumulative-backend-4272",
    statement_timeout: 120_000,
  });
  await client.connect();
  try {
    const runtime = await api("runtime-manifest");
    invariant(runtime.sourceHead === head && runtime.sourceTree === tree && runtime.specSha256 === SPEC_SHA256,
      `R58_BACKEND_RUNTIME_SOURCE_DRIFT:${runtime.sourceHead}:${runtime.sourceTree}`);
    const releases = (await client.query(`
      select id::text,status,release_key,schema_version,source_commit,source_tree,
        definition_count,parameter_count,formula_count,resource_row_count
      from public.estimate_definition_release where id=any($1::uuid[]) order by id
    `, [[ACTIVE_RELEASE_ID, TARGET_RELEASE_ID]])).rows as Json[];
    const active = releases.find((row) => row.id === ACTIVE_RELEASE_ID);
    const candidate = releases.find((row) => row.id === TARGET_RELEASE_ID);
    invariant(active?.status === "active" && candidate?.status === "prepared" && candidate.schema_version === 6,
      "R58_BACKEND_RELEASE_STATE_RED");
    const residueBefore = Number((await client.query(CONTROL_72 ? `
      select (select count(*) from public.estimate_compile_job where target_release_id=$1
          and owner_user_id=$2 and organization_id=$3)
        +(select count(*) from public.estimate_revision where release_id=$1
          and owner_user_id=$2 and organization_id=$3) value
    ` : `
      select (select count(*) from public.estimate_compile_job where target_release_id=$1)
        +(select count(*) from public.estimate_revision where release_id=$1) value
    `, CONTROL_72 ? [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID] : [TARGET_RELEASE_ID])).rows[0]?.value ?? 0);
    if (residueBefore > 0) {
      const nonterminal = Number((await client.query(CONTROL_72 ? `select count(*)::int value
        from public.estimate_compile_job where target_release_id=$1 and owner_user_id=$2 and organization_id=$3
          and status not in ('succeeded','failed','cancelled')` : `select count(*)::int value
        from public.estimate_compile_job where target_release_id=$1
          and status not in ('succeeded','failed','cancelled')`, CONTROL_72
        ? [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID]
        : [TARGET_RELEASE_ID])).rows[0]?.value ?? 0);
      invariant(nonterminal === 0, `R58_BACKEND_NONTERMINAL_RESIDUE:${nonterminal}`);
      await cleanupRuntime(client);
    }

    const catalogIds = (await client.query(`select catalog_id from public.estimate_cumulative_manifest_entry
      where release_id=$1
        and ($2='' or catalog_id=$2)
        and (cardinality($3::text[])=0 or catalog_id=any($3::text[]))
      order by catalog_id`, [TARGET_RELEASE_ID,TARGET_CATALOG_ID,TARGET_CATALOG_IDS])).rows
      .map((row) => String(row.catalog_id));
    invariant(catalogIds.length === EXPECTED_TOTAL && new Set(catalogIds).size === EXPECTED_TOTAL,
      `R58_BACKEND_DENOMINATOR:${catalogIds.length}/${new Set(catalogIds).size}`);
    const pendingCatalogIds = catalogIds.filter((catalogId) => !completed.has(catalogId)).slice(0, LIMIT);
    let processedThisRun = 0;
    for (let offset = 0; offset < pendingCatalogIds.length; offset += SHARD_SIZE) {
      const shardIds = pendingCatalogIds.slice(offset, offset + SHARD_SIZE);
      const definitions = await loadDefinitions(client, shardIds);
      invariant(definitions.length === shardIds.length, `R58_BACKEND_SHARD_LOAD:${definitions.length}/${shardIds.length}`);
      const ledger = await processShard(client, definitions, head);
      const cleanup = await cleanupRuntime(client);
      const shardNumber = offset / SHARD_SIZE + 1;
      const maintenanceVacuum = shardNumber % VACUUM_EVERY_SHARDS === 0
        || offset + shardIds.length === pendingCatalogIds.length;
      if (maintenanceVacuum) {
        for (const table of RUNTIME_TABLES) await client.query(`vacuum (analyze) public.${table}`);
      }
      cleanup.maintenanceVacuum = maintenanceVacuum;
      for (const row of ledger) {
        row.cleanup = cleanup;
        appendFileSync(ledgerPath, `${JSON.stringify(row)}\n`, "utf8");
        if (row.status !== "GREEN") appendFileSync(repairPath, `${JSON.stringify({
          catalogId: row.catalogId, domain: row.domain, failures: row.failures,
          checkpointHead: head, status: "QUEUED_FOR_FORWARD_REPAIR",
        })}\n`, "utf8");
      }
      processedThisRun += ledger.length;
      const green = ledger.filter((row) => row.status === "GREEN").length;
      process.stdout.write(`[${new Date().toISOString()}] shard ${offset + 1}-${offset + ledger.length}/${pendingCatalogIds.length}`
        + ` GREEN=${green} RED=${ledger.length - green} cleanupResidue=${cleanup.residue}\n`);
    }

    const all = readJsonl(ledgerPath);
    const unique = new Map(all.map((row) => [String(row.catalogId), row]));
    const rows = [...unique.values()];
    const green = rows.filter((row) => row.status === "GREEN");
    const red = rows.filter((row) => row.status !== "GREEN");
    const asphalt = rows.filter((row) => row.domain === "asphalt");
    const activeAfter = (await client.query("select status from public.estimate_definition_release where id=$1",
      [ACTIVE_RELEASE_ID])).rows[0]?.status;
    const candidateAfter = (await client.query("select status from public.estimate_definition_release where id=$1",
      [TARGET_RELEASE_ID])).rows[0]?.status;
    const residueAfter = Number((await client.query(CONTROL_72 ? `
      select (select count(*) from public.estimate_compile_job where target_release_id=$1
          and owner_user_id=$2 and organization_id=$3)
        +(select count(*) from public.estimate_revision where release_id=$1
          and owner_user_id=$2 and organization_id=$3) value
    ` : `
      select (select count(*) from public.estimate_compile_job where target_release_id=$1)
        +(select count(*) from public.estimate_revision where release_id=$1) value
    `, CONTROL_72 ? [TARGET_RELEASE_ID, OWNER_ID, ORGANIZATION_ID] : [TARGET_RELEASE_ID])).rows[0]?.value ?? 0);
    const fullRunComplete = !PROBE && rows.length === EXPECTED_TOTAL;
    const asphaltRows = asphalt.reduce((sum, row) => sum + Number(row.compile?.rowCount ?? 0), 0);
    const summary = {
      schemaVersion: CONTROL_72 ? "one-canonical-estimate-r6-control-72-backend.v1"
        : REPRESENTATIVE ? "p0-one-monolith-r58-representative-backend-50.v1"
        : "p0-one-monolith-r58-cumulative-backend-admission-4272.v1",
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      source: { branch, head, tree, descendantOf691acb78: true },
      runtime: { apiRoot: API_ROOT, processId: runtime.processId, sourceHead: runtime.sourceHead,
        sourceTree: runtime.sourceTree, database: runtime.database },
      targetReleaseId: TARGET_RELEASE_ID,
      expected: EXPECTED_TOTAL,
      executedUnique: rows.length,
      green: green.length,
      red: red.length,
      processedThisRun,
      probe: PROBE,
      asphalt: { expectedDefinitions: 63, executed: asphalt.length, green: asphalt.filter((row) => row.status === "GREEN").length,
        expectedFrozenRows: 3_709, compiledRows: asphaltRows },
      activeRelease: { id: ACTIVE_RELEASE_ID, status: activeAfter },
      candidateStatus: candidateAfter,
      runtimeResidue: residueAfter,
      activeReleaseSwitched: false,
      runtime8081Switched: false,
      searchCutover: false,
      fullRunComplete,
      terminalGreenClaimed: false,
      ledgerPath,
      repairQueuePath: repairPath,
      ledgerSha256: sha256(rows),
      status: CONTROL_72
        ? (fullRunComplete && red.length === 0 && rows.length === EXPECTED_TOTAL
          ? "GREEN_R6_CONTROL_72_UNIQUE_BACKEND_CLEANED_NOT_TERMINAL"
          : "RED_R6_CONTROL_72_BACKEND_REPAIR_QUEUE_ACTIVE")
        : REPRESENTATIVE
        ? (fullRunComplete && red.length === 0 && rows.length === 50
          ? "GREEN_R58_REPRESENTATIVE_BACKEND_50_CLEANED_NOT_TERMINAL"
          : "RED_R58_REPRESENTATIVE_BACKEND_50_REPAIR_QUEUE_ACTIVE")
        : PROBE
        ? (red.length === 0 && rows.length === LIMIT ? "GREEN_R58_CUMULATIVE_BACKEND_PROBE_CLEANED" : "RED_R58_CUMULATIVE_BACKEND_PROBE")
        : fullRunComplete && red.length === 0 && asphalt.length === 63 && asphaltRows === 3_709
          ? "GREEN_R58_BATCH001_008_BACKEND_4272_CLEANED_NOT_TERMINAL"
          : "RED_R58_BATCH001_008_BACKEND_REPAIR_QUEUE_ACTIVE",
    };
    invariant(activeAfter === "active" && candidateAfter === "prepared" && residueAfter === 0,
      "R58_BACKEND_POSTCONDITION_RED");
    writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
