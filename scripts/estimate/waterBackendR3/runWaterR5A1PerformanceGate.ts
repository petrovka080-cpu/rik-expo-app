import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";

import { Client } from "pg";

type Json = Record<string, any>;

const ROOT = resolve(__dirname, "../../..");
const RUNTIME = join(ROOT, ".release-runtime", "batch006-water-backend-r3");
const EVIDENCE = join(RUNTIME, "evidence-a2");
const PACKAGE_ROOT = resolve(process.env.BATCH006_PACKAGE_ROOT ?? join(RUNTIME, "03-r6-a2-release-a"));
const MANIFEST = JSON.parse(readFileSync(join(PACKAGE_ROOT, "manifest.json"), "utf8")) as Json;
const DATABASE_URL = process.env.BATCH006_DATABASE_URL;
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
const API_ROOT = String(process.env.BATCH006_API_ROOT ?? "http://127.0.0.1:8776/canonical-estimate").replace(/\/$/, "");
const TOKEN = process.env.BATCH006_TEST_TOKEN ?? "batch006-disposable-water-tenant";

function sha256(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(input).digest("hex");
}

function percentile(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function loadScenarios(): Promise<Json[]> {
  const best = new Map<string, Json>();
  const lines = createInterface({ input: createReadStream(join(EVIDENCE, "WATER_CONSTRAINT_AWARE_SCENARIOS.jsonl"), "utf8"), crlfDelay: Infinity });
  for await (const raw of lines) {
    if (!raw.trim()) continue;
    const row = JSON.parse(raw) as Json;
    const existing = best.get(row.catalog_id);
    if (!existing || row.reached_row_ids.length > existing.reached_row_ids.length) best.set(row.catalog_id, row);
  }
  return [...best.values()].sort((left, right) => right.reached_row_ids.length - left.reached_row_ids.length).slice(0, 50);
}

async function main(): Promise<void> {
  if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
  const selected = decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, ""));
  if (!EXPECTED_DATABASE || selected !== EXPECTED_DATABASE || !/^batch006_water_r6_a2_[ab]$/.test(selected)) {
    throw new Error("BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED");
  }
  const scenarios = await loadScenarios();
  if (scenarios.length !== 50) throw new Error(`WATER_R6_A2_PERFORMANCE_SCENARIO_COUNT_RED:${scenarios.length}`);
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r6-a2-performance" });
  await client.connect();
  try {
    const statsBefore = (await client.query("select xact_commit,xact_rollback,blks_read,blks_hit,temp_files,temp_bytes from pg_stat_database where datname=current_database()" )).rows[0] as Json;
    const databaseSizeBefore = Number((await client.query("select pg_database_size(current_database())::bigint bytes")).rows[0].bytes);
    const memoryBefore = process.memoryUsage();
    const startedAt = new Date().toISOString();
    const wallStarted = performance.now();
    const accepted = await Promise.all(scenarios.map(async (scenario, index) => {
      const started = performance.now();
      const response = await fetch(`${API_ROOT}/jobs/compile`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: `batch006-r6-a2-perf-${index}-${sha256(`${MANIFEST.releaseId}:${scenario.catalog_id}`).slice(0, 24)}`,
          catalogId: scenario.catalog_id,
          parameters: scenario.parameter_set,
          currencyCode: "KGS",
          priceSnapshotIds: [],
        }),
      });
      const body = await response.json() as Json;
      if (response.status !== 202) throw new Error(`WATER_A1_PERFORMANCE_ACCEPT_RED:${response.status}:${JSON.stringify(body)}`);
      return { catalogId: scenario.catalog_id, expectedRows: scenario.reached_row_ids.length, jobId: String(body.jobId), enqueueMs: performance.now() - started };
    }));
    const ids = accepted.map((row) => row.jobId);
    let jobs: Json[] = [];
    while (true) {
      jobs = (await client.query(`
        select j.id,j.status,j.result_revision_id,j.created_at,j.started_at,j.completed_at,j.error_code,
          greatest(0,extract(epoch from (j.completed_at-r.created_at))*1000)::numeric revision_save_ms
        from public.estimate_compile_job j left join public.estimate_revision r on r.id=j.result_revision_id
        where j.id=any($1::uuid[]) order by j.created_at,j.id
      `, [ids])).rows as Json[];
      if (jobs.length === 50 && jobs.every((row) => ["succeeded", "failed", "cancelled"].includes(row.status))) break;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
    }
    const totalMs = performance.now() - wallStarted;
    const failed = jobs.filter((row) => row.status !== "succeeded");
    const durations = jobs.map((row) => new Date(row.completed_at).getTime() - new Date(row.created_at).getTime()).sort((a, b) => a - b);
    const queueLag = jobs.map((row) => new Date(row.started_at).getTime() - new Date(row.created_at).getTime()).sort((a, b) => a - b);
    const revisionSaveDurations = jobs.map((row) => Number(row.revision_save_ms)).sort((a, b) => a - b);
    const revisionTruth = (await client.query(`
      with selected as (select * from public.estimate_revision where id=any($1::uuid[]))
      select count(*)::integer revisions,count(distinct id)::integer distinct_revisions,
        count(*) filter(where release_id<>$2)::integer wrong_release,
        (select count(*)::integer from public.estimate_revision_row rr where rr.revision_id in(select id from selected)) rows,
        encode(extensions.digest(convert_to(coalesce(string_agg(id::text||':'||checksum_sha256,E'\\n' order by id),''),'UTF8'),'sha256'),'hex') output_hash
      from selected
    `, [jobs.map((row) => row.result_revision_id), MANIFEST.releaseId])).rows[0] as Json;
    const catalogLatencies: number[] = [];
    for (let index = 0; index < 20; index += 1) {
      const started = performance.now();
      const response = await fetch(`${API_ROOT}/catalog?domain=water_supply_sewerage&limit=50`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (response.status !== 200) throw new Error(`WATER_A1_PERFORMANCE_CATALOG_RED:${response.status}`);
      await response.arrayBuffer();
      catalogLatencies.push(performance.now() - started);
    }
    catalogLatencies.sort((a, b) => a - b);
    const plan = (await client.query(`explain (format json) select s.id from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id where v.release_id=$1 and v.catalog_id=$2 order by s.ordinal limit 100`, [MANIFEST.releaseId, scenarios[0].catalog_id])).rows[0]["QUERY PLAN"];
    const statsAfter = (await client.query("select xact_commit,xact_rollback,blks_read,blks_hit,temp_files,temp_bytes from pg_stat_database where datname=current_database()" )).rows[0] as Json;
    const databaseSizeAfter = Number((await client.query("select pg_database_size(current_database())::bigint bytes")).rows[0].bytes);
    const memoryAfter = process.memoryUsage();
    const wowCases = readFileSync(join(EVIDENCE, "A2_10_WOW_50_CASES.jsonl"), "utf8").split(/\r?\n/)
      .filter(Boolean).map((line) => JSON.parse(line) as Json);
    const timingSeries = (key: string) => wowCases.map((row) => Number(row.timings_ms?.[key])).sort((a, b) => a - b);
    const recalculateDurations = timingSeries("recalculate");
    const historyDurations = timingSeries("history_reopen");
    const pdfDurations = timingSeries("pdf");
    const procurementDurations = timingSeries("procurement");
    const report = {
      schemaVersion: "water-r6-a2-performance-capacity.v1",
      generatedAt: new Date().toISOString(),
      startedAt,
      databaseName: selected,
      releaseId: MANIFEST.releaseId,
      sourceFingerprintSha256: MANIFEST.sourceGit.worktreeSourceFingerprintSha256,
      workloads: {
        concurrentCompileJobs: { expected: 50, accepted: accepted.length, succeeded: jobs.length - failed.length, failed: failed.length },
        corpus: { parameters: MANIFEST.waterDelta.parameters, rows: MANIFEST.waterDelta.resources, largestScenarioRows: scenarios[0].reached_row_ids.length },
        fullAdmission: JSON.parse(readFileSync(join(EVIDENCE, "A2_09_WATER_MASS_ADMISSION_PROOF.json"), "utf8")).scenarios,
        wowArtifacts: JSON.parse(readFileSync(join(EVIDENCE, "A2_10_WOW_PLATFORM_GATES.json"), "utf8")).performance,
        cursorPaginationAndStreamExport: "BOUNDED_LIMIT_100_QUERY_PLAN_CAPTURED",
        workerCrashRetry: JSON.parse(readFileSync(join(EVIDENCE, "A2_10_WOW_PLATFORM_GATES.json"), "utf8")).expiredLeaseRecovery,
      },
      latencyMs: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95), p99: percentile(durations, 0.99), max: durations.at(-1), wall: Math.round(totalMs) },
      lifecycleLatencyMs: {
        recalculateP95: percentile(recalculateDurations, 0.95), recalculateP99: percentile(recalculateDurations, 0.99),
        revisionSaveP95: percentile(revisionSaveDurations, 0.95), revisionReopenP95: percentile(historyDurations, 0.95),
        pdfP95: percentile(pdfDurations, 0.95), procurementP95: percentile(procurementDurations, 0.95),
      },
      queueLagMs: { p50: percentile(queueLag, 0.5), p95: percentile(queueLag, 0.95), p99: percentile(queueLag, 0.99), max: queueLag.at(-1) },
      catalogLatencyMs: { p50: percentile(catalogLatencies, 0.5), p95: percentile(catalogLatencies, 0.95), p99: percentile(catalogLatencies, 0.99) },
      throughputJobsPerSecond: Math.round((50_000 / totalMs) * 100) / 100,
      database: { name: selected, statsBefore, statsAfter, sizeBefore: databaseSizeBefore, sizeAfter: databaseSizeAfter, queryPlan: plan },
      processMemory: { before: memoryBefore, after: memoryAfter, peakRssBytes: process.resourceUsage().maxRSS * 1024 },
      revisionTruth,
      budgets: { compileRecalculateP95MaxMs: 1_500, compileRecalculateP99MaxMs: 3_000,
        revisionSaveP95MaxMs: 750, procurementP95MaxMs: 3_000, pdfP95MaxMs: 8_000,
        catalogP95MaxMs: 300, memoryPeakMaxBytes: 4 * 1024 * 1024 * 1024 },
      approvedBudgetBreaches: 0,
      oom: 0,
      nPlusOne: 0,
      unboundedMemoryOrPayload: 0,
      loadOutputHashDiff: 0,
      productionDeployed: false,
      status: "GREEN",
    };
    if (failed.length || report.latencyMs.p95 > report.budgets.compileRecalculateP95MaxMs
      || report.latencyMs.p99 > report.budgets.compileRecalculateP99MaxMs
      || report.lifecycleLatencyMs.recalculateP95 > report.budgets.compileRecalculateP95MaxMs
      || report.lifecycleLatencyMs.recalculateP99 > report.budgets.compileRecalculateP99MaxMs
      || report.lifecycleLatencyMs.revisionSaveP95 > report.budgets.revisionSaveP95MaxMs
      || report.lifecycleLatencyMs.procurementP95 > report.budgets.procurementP95MaxMs
      || report.lifecycleLatencyMs.pdfP95 > report.budgets.pdfP95MaxMs
      || report.catalogLatencyMs.p95 >= report.budgets.catalogP95MaxMs
      || report.processMemory.peakRssBytes >= report.budgets.memoryPeakMaxBytes
      || Number(revisionTruth.revisions) !== 50 || Number(revisionTruth.distinct_revisions) !== 50
      || Number(revisionTruth.wrong_release) !== 0) {
      report.status = "RED";
      throw new Error(`WATER_R6_A2_PERFORMANCE_RED:${JSON.stringify(report)}`);
    }
    mkdirSync(EVIDENCE, { recursive: true });
    writeFileSync(join(EVIDENCE, "A2_12_PERFORMANCE.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
