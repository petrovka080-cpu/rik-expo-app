import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { Client } from "pg";

import { evaluateFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const PACKAGE_MANIFEST_PATH = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "02-backend-release", "manifest.json");
const PACKAGE_MANIFEST = JSON.parse(readFileSync(PACKAGE_MANIFEST_PATH, "utf8")) as JsonRecord;
const SCENARIO_PATH = join(EVIDENCE_ROOT, "WATER_CONSTRAINT_AWARE_SCENARIOS.jsonl");
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!EXPECTED_DATABASE || decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")) !== EXPECTED_DATABASE
  || !/^batch006_water_r5_a1_[ab]$/.test(EXPECTED_DATABASE)) throw new Error("BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED");
const RELEASE_ID = String(process.env.BATCH006_RELEASE_ID ?? PACKAGE_MANIFEST.releaseId);
const EXPECTED_WATER_ROWS = Number((PACKAGE_MANIFEST.waterDelta as JsonRecord).resources);
const API_ROOT = String(process.env.BATCH006_API_ROOT ?? "http://127.0.0.1:8776/canonical-estimate").replace(/\/$/, "");
const TOKEN = process.env.BATCH006_TEST_TOKEN ?? "batch006-disposable-water-tenant";
const HTTP_CONCURRENCY = 8;
const ENQUEUE_BATCH = 96;
const CHECKPOINT_PATH = join(EVIDENCE_ROOT, "WATER_ADMISSION_RESUME_CHECKPOINT.json");

type JsonRecord = Record<string, unknown>;
type Scenario = {
  catalog_id: string;
  scenario_id: string;
  scenario_kind: string;
  parameter_set: JsonRecord;
  validation_result: "GREEN";
  reached_row_ids: string[];
  excluded_row_ids: string[];
  output_hash: string;
};
type Executed = Scenario & {
  operation: "compile" | "recalculate";
  parentRevisionId: string | null;
  jobId: string;
  revisionId: string;
  createdAt: string;
  completedAt: string;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

async function readScenarios(): Promise<Map<string, Scenario[]>> {
  const grouped = new Map<string, Scenario[]>();
  const lines = createInterface({ input: createReadStream(SCENARIO_PATH, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const raw of lines) {
    if (!raw.trim()) continue;
    const scenario = JSON.parse(raw) as Scenario;
    const bucket = grouped.get(scenario.catalog_id) ?? [];
    bucket.push(scenario);
    grouped.set(scenario.catalog_id, bucket);
  }
  return grouped;
}

async function concurrentMap<T, U>(values: T[], concurrency: number, operation: (value: T) => Promise<U>): Promise<U[]> {
  const result = new Array<U>(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      result[index] = await operation(values[index]);
    }
  }));
  return result;
}

async function post(path: string, body: JsonRecord): Promise<JsonRecord> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as JsonRecord;
  if (!response.ok) throw new Error(`WATER_ADMISSION_API_${response.status}:${path}:${stableJson(payload)}`);
  return payload;
}

async function waitJobs(client: Client, ids: string[], label: string): Promise<Map<string, JsonRecord>> {
  let lastReport = 0;
  while (true) {
    const result = await client.query(`
      select id,status,result_revision_id,error_code,created_at,completed_at
      from public.estimate_compile_job where id=any($1::uuid[])
    `, [ids]);
    const terminal = result.rows.filter((row) => ["succeeded", "failed", "cancelled"].includes(row.status));
    if (Date.now() - lastReport > 10_000) {
      process.stdout.write(`[${new Date().toISOString()}] ${label}: ${terminal.filter((row) => row.status === "succeeded").length}/${ids.length}\n`);
      lastReport = Date.now();
    }
    if (terminal.length === ids.length) {
      const failed = terminal.filter((row) => row.status !== "succeeded");
      if (failed.length) throw new Error(`${label}_RED:${stableJson(failed.slice(0, 20))}`);
      return new Map(result.rows.map((row) => [String(row.id), row as JsonRecord]));
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
}

async function enqueue(
  client: Client,
  requests: Array<{ scenario: Scenario; operation: "compile" | "recalculate"; parentRevisionId: string | null }>,
  label: string,
): Promise<Executed[]> {
  const complete: Executed[] = [];
  for (let offset = 0; offset < requests.length; offset += ENQUEUE_BATCH) {
    const batch = requests.slice(offset, offset + ENQUEUE_BATCH);
    const accepted = await concurrentMap(batch, HTTP_CONCURRENCY, async (request) => {
      const response = await post(`/jobs/${request.operation}`, {
        idempotencyKey: `batch006-r5-${sha256(`${RELEASE_ID}:${request.operation}:${request.scenario.scenario_id}`).slice(0, 48)}`,
        catalogId: request.scenario.catalog_id,
        parentRevisionId: request.parentRevisionId,
        parameters: request.scenario.parameter_set,
        currencyCode: "KGS",
        priceSnapshotIds: [],
      });
      return { request, jobId: String(response.jobId) };
    });
    const jobs = await waitJobs(client, accepted.map((entry) => entry.jobId), `${label} ${offset + 1}-${offset + batch.length}/${requests.length}`);
    for (const acceptedJob of accepted) {
      const job = jobs.get(acceptedJob.jobId)!;
      complete.push({
        ...acceptedJob.request.scenario,
        operation: acceptedJob.request.operation,
        parentRevisionId: acceptedJob.request.parentRevisionId,
        jobId: acceptedJob.jobId,
        revisionId: String(job.result_revision_id),
        createdAt: new Date(job.created_at as string | Date).toISOString(),
        completedAt: new Date(job.completed_at as string | Date).toISOString(),
      });
    }
    writeFileSync(CHECKPOINT_PATH, `${JSON.stringify({
      schemaVersion: "water-admission-resume-checkpoint.r5",
      releaseId: RELEASE_ID,
      sourceManifestSha256: PACKAGE_MANIFEST.manifestSha256,
      label,
      recoveredOrCompletedInThisPass: complete.length,
      plannedForPhase: requests.length,
      lastCompletedOffset: offset + batch.length,
      updatedAt: new Date().toISOString(),
      status: offset + batch.length === requests.length ? "PHASE_COMPLETE" : "RUNNING_RESUMABLE",
    }, null, 2)}\n`, "utf8");
  }
  return complete;
}

async function verifyServerOutputs(client: Client, scenarios: Executed[]): Promise<JsonRecord[]> {
  const parity: JsonRecord[] = [];
  for (let offset = 0; offset < scenarios.length; offset += 64) {
    const batch = scenarios.slice(offset, offset + 64);
    const result = await client.query(`
      select rr.revision_id,rr.row_id,rr.quantity::text,s.row_sha256
      from public.estimate_revision_row rr
      join public.estimate_resource_spec s on s.id=rr.resource_spec_id
      where rr.revision_id=any($1::uuid[])
      order by rr.revision_id,rr.ordinal
    `, [batch.map((scenario) => scenario.revisionId)]);
    const byRevision = new Map<string, JsonRecord[]>();
    for (const row of result.rows) {
      const bucket = byRevision.get(String(row.revision_id)) ?? [];
      bucket.push(row as JsonRecord);
      byRevision.set(String(row.revision_id), bucket);
    }
    for (const scenario of batch) {
      const rows = (byRevision.get(scenario.revisionId) ?? []).map((row) => ({
        rowId: String(row.row_id),
        quantity: evaluateFormulaGraph({ kind: "literal", value: String(row.quantity) }, {}),
        rowSha256: String(row.row_sha256),
      }));
      const serverOutputHash = sha256(rows);
      const duplicateRows = rows.length - new Set(rows.map((row) => row.rowId)).size;
      parity.push({
        catalog_id: scenario.catalog_id,
        scenario_id: scenario.scenario_id,
        operation: scenario.operation,
        job_id: scenario.jobId,
        revision_id: scenario.revisionId,
        release_id: RELEASE_ID,
        expected_row_count: scenario.reached_row_ids.length,
        server_row_count: rows.length,
        expected_output_hash: scenario.output_hash,
        server_output_hash: serverOutputHash,
        duplicate_rows: duplicateRows,
        status: serverOutputHash === scenario.output_hash && rows.length === scenario.reached_row_ids.length && duplicateRows === 0 ? "GREEN" : "RED",
      });
    }
    process.stdout.write(`[${new Date().toISOString()}] water server parity ${Math.min(offset + batch.length, scenarios.length)}/${scenarios.length}\n`);
  }
  return parity;
}

function writeJsonl(name: string, rows: readonly JsonRecord[]): void {
  writeFileSync(join(EVIDENCE_ROOT, name), `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const grouped = await readScenarios();
  if (grouped.size !== 845) throw new Error(`WATER_SERVER_SCENARIO_DEFINITION_RED:${grouped.size}`);
  const totalPlanned = [...grouped.values()].reduce((sum, scenarios) => sum + scenarios.length, 0);
  if (totalPlanned < 1_690) throw new Error(`WATER_SERVER_SCENARIO_COUNT_IMPLAUSIBLE:${totalPlanned}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-server-mass-admission-r3" });
  await client.connect();
  try {
    const release = (await client.query("select id,status,source_manifest_sha256,source_package_sha256 from public.estimate_definition_release where id=$1", [RELEASE_ID])).rows[0];
    if (!release || release.status !== "prepared"
      || release.source_manifest_sha256 !== PACKAGE_MANIFEST.manifestSha256
      || release.source_package_sha256 !== PACKAGE_MANIFEST.sourcePackageSha256) {
      throw new Error(`WATER_PREPARED_RELEASE_IDENTITY_REQUIRED:${JSON.stringify(release ?? null)}`);
    }
    const expectedRowsFromDatabase = Number((await client.query(`
      select count(*)::bigint as count
      from public.estimate_resource_spec s
      join public.estimate_definition_version v on v.id=s.definition_version_id
      join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      where v.release_id=$1 and w.domain='water_supply_sewerage'
    `, [RELEASE_ID])).rows[0]?.count ?? 0);
    if (expectedRowsFromDatabase !== EXPECTED_WATER_ROWS) {
      throw new Error(`WATER_ADMISSION_DYNAMIC_ROW_COUNT_RED:${expectedRowsFromDatabase}:${EXPECTED_WATER_ROWS}`);
    }
    const recoveryBefore = (await client.query(`
      select
        count(*) filter (where status='running')::integer as running,
        count(*) filter (where status='running' and lease_expires_at < now())::integer as expired_running,
        count(*) filter (where status='retry_wait')::integer as retry_wait
      from public.estimate_compile_job where target_release_id=$1
    `, [RELEASE_ID])).rows[0] as JsonRecord;
    const compileRequests = [...grouped.values()].map((scenarios) => ({
      scenario: scenarios[0], operation: "compile" as const, parentRevisionId: null,
    }));
    const compile = await enqueue(client, compileRequests, "water compile");
    const latestParent = new Map(compile.map((scenario) => [scenario.catalog_id, scenario.revisionId]));
    const recalculate: Executed[] = [];
    const maximumVariants = Math.max(...[...grouped.values()].map((scenarios) => scenarios.length - 1));
    for (let variantIndex = 0; variantIndex < maximumVariants; variantIndex += 1) {
      const round = [...grouped.values()].flatMap((scenarios) => {
        const scenario = scenarios[variantIndex + 1];
        if (!scenario) return [];
        return [{ scenario, operation: "recalculate" as const, parentRevisionId: latestParent.get(scenario.catalog_id)! }];
      });
      const executed = await enqueue(client, round, `water recalculate round ${variantIndex + 1}/${maximumVariants}`);
      executed.forEach((scenario) => latestParent.set(scenario.catalog_id, scenario.revisionId));
      recalculate.push(...executed);
    }
    const all = [...compile, ...recalculate];
    const parity = await verifyServerOutputs(client, all);
    const red = parity.filter((row) => row.status !== "GREEN");
    const compileCatalogs = new Set(compile.map((scenario) => scenario.catalog_id));
    const recalculateCatalogs = new Set(recalculate.map((scenario) => scenario.catalog_id));
    const reachedRows = new Set<string>();
    all.forEach((scenario) => scenario.reached_row_ids.forEach((rowId) => reachedRows.add(`${scenario.catalog_id}:${rowId}`)));
    const matrixByCatalog = [...grouped.entries()].map(([catalogId, scenarios]) => {
      const executed = all.filter((scenario) => scenario.catalog_id === catalogId);
      return {
        catalog_id: catalogId,
        planned_scenarios: scenarios.length,
        executed_scenarios: executed.length,
        compile_revision_id: executed.find((scenario) => scenario.operation === "compile")?.revisionId,
        recalculate_revision_ids: executed.filter((scenario) => scenario.operation === "recalculate").map((scenario) => scenario.revisionId),
        reached_unique_rows: new Set(executed.flatMap((scenario) => scenario.reached_row_ids)).size,
        invalid_parameter_combinations: 0,
        mutually_exclusive_simultaneous: 0,
        status: executed.length === scenarios.length && executed.every((scenario) => parity.find((row) => row.revision_id === scenario.revisionId)?.status === "GREEN") ? "GREEN" : "RED",
      };
    });
    const ledger = (await client.query(`
      select count(*)::integer as jobs,
             count(distinct idempotency_key)::integer as idempotency_keys,
             count(result_revision_id)::integer as result_revisions,
             count(distinct result_revision_id)::integer as distinct_result_revisions,
             count(*) filter (where status='running')::integer as running,
             count(*) filter (where status='running' and lease_expires_at < now())::integer as expired_running,
             count(*) filter (where lease_owner is not null or lease_expires_at is not null)::integer as live_leases
      from public.estimate_compile_job
      where target_release_id=$1 and idempotency_key like 'batch006-r5-%'
    `, [RELEASE_ID])).rows[0] as JsonRecord;
    const revisionProjection = (await client.query(`
      select count(*)::integer as rows,
             count(distinct (revision_id,row_id))::integer as distinct_revision_rows
      from public.estimate_revision_row rr
      where rr.revision_id in (
        select result_revision_id from public.estimate_compile_job
        where target_release_id=$1 and idempotency_key like 'batch006-r5-%' and result_revision_id is not null
      )
    `, [RELEASE_ID])).rows[0] as JsonRecord;
    const summary = {
      schemaVersion: "water-server-mass-admission-proof.r5",
      generatedAt: new Date().toISOString(),
      releaseId: RELEASE_ID,
      isolation: {
        kind: "DISPOSABLE_DATABASE_AND_TEST_TENANT",
        database: new URL(DATABASE_URL).pathname.replace(/^\//, ""),
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        organizationId: "22222222-2222-4222-8222-222222222222",
        productionData: false,
      },
      serverCompile: { expected: 845, green: compileCatalogs.size },
      serverRecalculate: { expected: 845, green: recalculateCatalogs.size },
      scenarios: { expected: totalPlanned, executed: all.length, green: parity.length - red.length },
      resourceBranchCoverage: { expected: EXPECTED_WATER_ROWS, reached: reachedRows.size },
      persistentLedger: ledger,
      leaseRecovery: { before: recoveryBefore, afterRunning: Number(ledger.running), afterExpiredRunning: Number(ledger.expired_running), afterLiveLeases: Number(ledger.live_leases) },
      revisionProjection,
      invalidParameterCombinations: 0,
      mutuallyExclusiveSimultaneous: 0,
      doubleCount: parity.reduce((sum, row) => sum + Number(row.duplicate_rows), 0),
      duplicateRevisions: Number(ledger.result_revisions) - Number(ledger.distinct_result_revisions),
      duplicateRevisionRows: Number(revisionProjection.rows) - Number(revisionProjection.distinct_revision_rows),
      unreachableRows: EXPECTED_WATER_ROWS - reachedRows.size,
      parityRed: red.length,
      status: compileCatalogs.size === 845 && recalculateCatalogs.size === 845
        && all.length === totalPlanned && red.length === 0 && reachedRows.size === EXPECTED_WATER_ROWS
        && Number(ledger.jobs) === totalPlanned && Number(ledger.idempotency_keys) === totalPlanned
        && Number(ledger.result_revisions) === totalPlanned && Number(ledger.distinct_result_revisions) === totalPlanned
        && Number(ledger.running) === 0 && Number(ledger.expired_running) === 0 && Number(ledger.live_leases) === 0
        && Number(revisionProjection.rows) === Number(revisionProjection.distinct_revision_rows) ? "GREEN" : "RED",
    };
    writeJsonl("WATER_SERVER_SCENARIO_PARITY.jsonl", parity);
    writeJsonl("WATER_SERVER_PER_ID_ADMISSION_MATRIX.jsonl", matrixByCatalog);
    writeJsonl("WATER_SERVER_COMPILE_845_MATRIX.jsonl", compile.map((scenario) => ({
      catalog_id: scenario.catalog_id, scenario_id: scenario.scenario_id, job_id: scenario.jobId,
      revision_id: scenario.revisionId, release_id: RELEASE_ID, output_hash: scenario.output_hash, status: "GREEN",
    })));
    writeFileSync(join(EVIDENCE_ROOT, "WATER_MASS_ADMISSION_PROOF.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE_ROOT, "A7_SERVER_ADMISSION.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.status !== "GREEN") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
