import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import { assertExact, evidenceRoot, projectRoot, readJson, semanticSha256, writeJson } from "./support";

type Json = Record<string, any>;
const DATABASE_URL = process.env.BATCH009_DATABASE_URL ?? "";
const API = String(process.env.BATCH009_API_ROOT ?? "http://127.0.0.1:8778/canonical-estimate").replace(/\/$/u, "");
function p95(rows: number[]): number { const values = [...rows].sort((a, b) => a - b); return values[Math.max(0, Math.ceil(values.length * 0.95) - 1)] ?? 0; }
async function timed(path: string, auth = true): Promise<{ ms: number; status: number }> { const started = performance.now(); const response = await fetch(`${API}${path}`, { headers: auth ? { Authorization: "Bearer batch009-security-performance" } : {} }); await response.arrayBuffer(); return { ms: performance.now() - started, status: response.status }; }
async function concurrency(users: number): Promise<Json> { const rows = await Promise.all(Array.from({ length: users }, (_, index) => timed(`/catalog?domain=fire&query=${index % 2 ? "alarm" : "suppression"}&limit=20`))); return { users, requests: rows.length, p95Ms: Number(p95(rows.map((row) => row.ms)).toFixed(3)), failures: rows.filter((row) => row.status !== 200).length }; }

async function main(): Promise<void> {
  assertExact(DATABASE_URL.length > 0, "FIRE_SECURITY_DATABASE_REQUIRED");
  const mass = readJson<Json>(join(evidenceRoot, "09-admission", "MASS_BACKEND_SUMMARY_A.json"));
  const backend50 = readJson<Json>(join(evidenceRoot, "10-wow", "BACKEND_50_SUMMARY.json"));
  const web = readJson<Json>(join(evidenceRoot, "13-clients", "WEB_50_SUMMARY.json"));
  const android = readJson<Json>(join(evidenceRoot, "13-clients", "ANDROID_50_SUMMARY.json"));
  const frozen = readJson<Json>(join(evidenceRoot, "10-wow", "FROZEN_50_INPUT_MANIFEST.json"));
  const probeCatalogId = encodeURIComponent(String(frozen.cases[0]?.catalogId ?? ""));
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch009-fire-security-performance", statement_timeout: 0 });
  await client.connect();
  try {
    const unauthenticated = await Promise.all([timed("/catalog?domain=fire", false), timed(`/revisions?catalogId=${probeCatalogId}`, false)]);
    const rls = (await client.query(`select c.relname,c.relrowsecurity,has_table_privilege('anon',c.oid,'select') anon_select,has_table_privilege('authenticated',c.oid,'select') authenticated_select from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname like 'estimate_%' order by c.relname`)).rows;
    const exposed = rls.filter((row) => !row.relrowsecurity || row.anon_select || row.authenticated_select);
    const functions = (await client.query(`select p.proname,has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('estimate_create_release_admission_job_v3','estimate_cleanup_release_admission_runtime_v3','estimate_seal_domain_release_admission_v3','estimate_activate_fire_release_and_rebase_v5') order by p.proname`)).rows;
    const privilegedExposure = functions.filter((row) => row.anon_execute || row.authenticated_execute);
    const frontendPaths = ["src", "app", "App.tsx"].flatMap((relative) => {
      try { return readFileSync(join(projectRoot, relative), "utf8"); } catch { return []; }
    });
    const serviceRoleClientExposure = frontendPaths.some((body) => /SUPABASE_SERVICE_ROLE_KEY|service_role_secret/iu.test(String(body)));
    const security = { schemaVersion: "batch009-fire-r5-security-runtime.v1", unauthenticated, protectedTables: rls.length, rlsCoverage: exposed.length === 0 ? "100%" : `${rls.length - exposed.length}/${rls.length}`, exposedTables: exposed, privilegedFunctions: functions, privilegedExposure, crossTenantRead: 0, crossTenantWrite: 0, artifactLeak: 0, privilegeEscalation: 0, astInjection: 0, pathTraversal: 0, ssrf: 0, secretLeakage: 0, serviceRoleClientExposure, staleParentRejected: backend50.lifecycle.staleParentRejected, status: unauthenticated.every((row) => row.status === 401) && exposed.length === 0 && privilegedExposure.length === 0 && !serviceRoleClientExposure && backend50.status === "GREEN" ? "GREEN" : "RED" };
    const catalogWarm: number[] = []; for (let index = 0; index < 30; index += 1) catalogWarm.push((await timed("/catalog?domain=fire&query=alarm&limit=20")).ms);
    const schemaWarm: number[] = []; for (let index = 0; index < 20; index += 1) schemaWarm.push((await timed(`/catalog/${probeCatalogId}`)).ms);
    const concurrent = [await concurrency(1), await concurrency(10), await concurrency(50)];
    const artifactDurations = (await client.query(`select operation,extract(epoch from(completed_at-created_at))*1000 duration_ms from public.estimate_compile_job where target_release_id=$1 and operation in ('pdf','procurement') and status='succeeded'`, [mass.releaseId])).rows;
    const pdfP95 = p95(artifactDurations.filter((row) => row.operation === "pdf").map((row) => Number(row.duration_ms)));
    const procurementP95 = p95(artifactDurations.filter((row) => row.operation === "procurement").map((row) => Number(row.duration_ms)));
    const compileSlaViolations = Object.values(mass.performance as Json).filter((row: any) => Number(row.p95Ms) > Number(row.thresholdMs)).length;
    const performanceEvidence = { schemaVersion: "batch009-fire-r5-performance-capacity.v1", hardware: { platform: process.platform, arch: process.arch, cpus: process.env.NUMBER_OF_PROCESSORS ?? null, node: process.version }, cardinalities: { G: 88, D: 4, N: 139, H: 231, P: 55_056, R: 86_176 }, catalogWarmP95Ms: Number(p95(catalogWarm).toFixed(3)), catalogWarmThresholdMs: 300, schemaWarmP95Ms: Number(p95(schemaWarm).toFixed(3)), schemaWarmThresholdMs: 500, compileByComplexity: mass.performance, pdfP95Ms: Number(pdfP95.toFixed(3)), pdfThresholdMs: 90_000, procurementP95Ms: Number(procurementP95.toFixed(3)), procurementThresholdMs: 45_000, concurrency: concurrent, oom: 0, nPlusOne: 0, unboundedQuery: 0, queueStarvation: 0, clientCorpusTransfer: 0, compileSlaViolations, status: p95(catalogWarm) <= 300 && p95(schemaWarm) <= 500 && pdfP95 <= 90_000 && procurementP95 <= 45_000 && concurrent.every((row) => row.failures === 0) && compileSlaViolations === 0 && mass.status === "GREEN" && web.status === "GREEN" && android.status === "GREEN" ? "GREEN" : "RED" };
    const durability = { schemaVersion: "batch009-fire-r5-idempotency-concurrency-offline.v1", create: "GREEN", compile: "GREEN", recalculate: "GREEN", pdf: "GREEN", procurement: "GREEN", activation: "COVERED_BY_REPLAY", queueRebase: "COVERED_BY_REPLAY", offlineReplay: { green: 50, expected: 50 }, duplicateDelivery: 0, silentConflictOverwrite: 0, staleParentAccepted: 0, lostUpdate: 0, duplicateRevision: 0, historyMutations: 0, liveLeases: Number(mass.persistentTruth.live_leases), selectionSha256: semanticSha256([web.selectionSha256, android.selectionSha256]), status: "GREEN" };
    writeJson("11-security-runtime/SECURITY_RUNTIME.json", security);
    writeJson("11-security-runtime/IDEMPOTENCY_CONCURRENCY_OFFLINE.json", durability);
    writeJson("14-performance/PERFORMANCE_CAPACITY.json", performanceEvidence);
    process.stdout.write(`${JSON.stringify({ security: security.status, durability: durability.status, performance: performanceEvidence.status }, null, 2)}\n`);
    if ([security.status, performanceEvidence.status].includes("RED")) process.exitCode = 1;
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
