import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import { assertExact, evidenceRoot, projectRoot, readJson, semanticSha256, sha256, writeJson } from "./support";

type Json = Record<string, any>;
const OWNER = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION = "22222222-2222-4222-8222-222222222222";

function argument(name: string): string { const prefix = `--${name}=`; return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? ""; }

async function main(): Promise<void> {
  const label = (argument("label") || "A").toUpperCase();
  const databaseUrl = argument("database-url") || process.env.BATCH009_DATABASE_URL || "";
  const packageRoot = resolve(argument("package-root") || process.env.BATCH009_PACKAGE_ROOT || "");
  assertExact(["A", "B"].includes(label) && databaseUrl && packageRoot, "FIRE_ACTIVATION_ARGS_RED");
  const url = new URL(databaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  assertExact(["127.0.0.1", "localhost", "::1"].includes(url.hostname) && Number(url.port) === 55432 && database === `batch009_fire_r5_${label.toLowerCase()}`, "FIRE_ACTIVATION_DATABASE_RED");
  const manifest = JSON.parse(readFileSync(join(packageRoot, "manifest.json"), "utf8")) as Json;
  const massPath = join(evidenceRoot, "09-admission", `MASS_BACKEND_SUMMARY_${label}.json`);
  const databaseEqualityPath = join(evidenceRoot, "08-database", "DATABASE_A_B_EQUALITY.json");
  const mass = readJson<Json>(massPath);
  const equality = readJson<Json>(databaseEqualityPath);
  const mutations = readJson<Json>(join(evidenceRoot, "12-mutations", "MUTATION_SUMMARY.json"));
  assertExact(mass.status === "GREEN" && mass.compile.green === 231 && mass.recalculate.green === 231 && mass.resourceBranches.reached === 86_176 && mass.validScenarios.green + mass.invalidScenarios.rejected === 6_423, "FIRE_ACTIVATION_MASS_RED");
  assertExact(equality.status === "GREEN" && mutations.status === "GREEN_MUTATIONS_2321_OF_2321_KILLED", "FIRE_ACTIVATION_INDEPENDENT_GATES_RED");
  if (label === "A") {
    for (const relative of ["10-wow/BACKEND_50_SUMMARY.json", "11-security-runtime/SECURITY_RUNTIME.json", "13-clients/WEB_50_SUMMARY.json", "13-clients/ANDROID_50_SUMMARY.json", "14-performance/PERFORMANCE_CAPACITY.json"]) {
      const evidence = readJson<Json>(join(evidenceRoot, relative));
      assertExact(evidence.status === "GREEN", `FIRE_ACTIVATION_TERMINAL_GATE_RED:${relative}`);
    }
  }
  const admissionProofSha256 = semanticSha256({ releaseId: mass.releaseId, compile: mass.compile, recalculate: mass.recalculate, validScenarios: mass.validScenarios, invalidScenarios: mass.invalidScenarios, resourceBranches: mass.resourceBranches, formulaBranches: mass.formulaBranches, doubleCount: mass.doubleCount, mutexViolations: mass.mutexViolations, unreachableRows: mass.unreachableRows, fullJest: mass.fullJest, status: mass.status });
  const independentAuditSha256 = sha256(readFileSync(databaseEqualityPath));
  const client = new Client({ connectionString: databaseUrl, application_name: `batch009-fire-r5-activate-${label.toLowerCase()}`, statement_timeout: 0 });
  await client.connect();
  try {
    const before = (await client.query(`select r.id::text,r.status,r.parent_release_id::text,s.*,(select count(*) from public.estimate_program_control_transition t where t.release_id=$1)::integer transition_count from public.estimate_definition_release r cross join public.estimate_program_control_state s where r.id=$1 and s.singleton=true`, [manifest.releaseId])).rows[0];
    assertExact(before?.status === "prepared" && Number(before.admitted_global_count) === 3_755 && Number(before.queue_remaining) === 7_855 && Number(before.transition_count) === 0, "FIRE_ACTIVATION_BEFORE_RED");
    const artifactKeys = (await client.query(`select storage_key from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id where r.release_id=$1 and storage_key is not null`, [manifest.releaseId])).rows.map((row) => String(row.storage_key));
    const cleanup = (await client.query(`select * from public.estimate_cleanup_release_admission_runtime_v3($1,$2,$3)`, [manifest.releaseId, OWNER, ORGANIZATION])).rows[0];
    assertExact(Number(cleanup.residue) === 0, "FIRE_ACTIVATION_RUNTIME_CLEANUP_RED");
    const artifactRoot = resolve(projectRoot, ".release-runtime", "master11610-backend-canonical-r1", "05-runtime", "local-artifacts");
    let artifactFilesDeleted = 0;
    for (const key of artifactKeys) {
      const path = resolve(artifactRoot, key.replace(/[^a-zA-Z0-9._/-]+/gu, "_").replace(/^[/\\]+/u, ""));
      assertExact(path === artifactRoot || path.startsWith(`${artifactRoot}\\`) || path.startsWith(`${artifactRoot}/`), "FIRE_ARTIFACT_CLEANUP_PATH_RED");
      if (existsSync(path)) { unlinkSync(path); artifactFilesDeleted += 1; }
    }
    const residue = (await client.query(`select (select count(*) from public.estimate_compile_job where target_release_id=$1)::integer jobs,(select count(*) from public.estimate_revision where release_id=$1)::integer revisions,(select count(*) from public.estimate_revision_artifact a join public.estimate_revision r on r.id=a.revision_id where r.release_id=$1)::integer artifacts`, [manifest.releaseId])).rows[0];
    assertExact(Number(residue.jobs) === 0 && Number(residue.revisions) === 0 && Number(residue.artifacts) === 0, "FIRE_ACTIVATION_DB_RESIDUE_RED");
    await client.query(`select public.estimate_seal_domain_release_admission_v3($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb)`, [manifest.releaseId, "fire", admissionProofSha256, independentAuditSha256, 231, 55_056, 86_176, 86_176, 231, 231, 6_423, 86_176, 0, 0, 0, 0, 0, JSON.stringify({ status: "GREEN", predecessorReleaseId: manifest.parentRelease.releaseId, oldReleasesPreserved: "100%", databaseEqualitySha256: independentAuditSha256 })]);
    const activation = (await client.query(`select * from public.estimate_activate_fire_release_and_rebase_v5($1,$2,$3,'GREEN',$4,88,143)`, [manifest.releaseId, admissionProofSha256, independentAuditSha256, manifest.fireDelta.globalIdSetSha256])).rows[0];
    const after = (await client.query(`select r.id::text,r.status,r.parent_release_id::text,(select status from public.estimate_definition_release p where p.id=r.parent_release_id) predecessor_status,s.*,(select count(*) from public.estimate_program_control_transition t where t.release_id=$1)::integer transition_count,(select count(*) from public.estimate_definition_release_activation a where a.release_id=$1)::integer activation_count,(select count(*) from public.estimate_program_event e where e.event_kind='admission' and e.event_key like 'batch009-fire-r5:%')::integer admission_event_count from public.estimate_definition_release r cross join public.estimate_program_control_state s where r.id=$1 and s.singleton=true`, [manifest.releaseId])).rows[0];
    const retry = (await client.query(`select * from public.estimate_activate_fire_release_and_rebase_v5($1,$2,$3,'GREEN',$4,88,143)`, [manifest.releaseId, admissionProofSha256, independentAuditSha256, manifest.fireDelta.globalIdSetSha256])).rows[0];
    const retryCounts = (await client.query(`select (select count(*) from public.estimate_program_control_transition where release_id=$1)::integer transitions,(select count(*) from public.estimate_definition_release_activation where release_id=$1)::integer activations,(select count(*) from public.estimate_program_event where event_kind='admission' and event_key like 'batch009-fire-r5:%')::integer admission_events`, [manifest.releaseId])).rows[0];
    assertExact(after.status === "active" && after.predecessor_status === "retired" && Number(after.admitted_global_count) === 3_843 && Number(after.queue_remaining) === 7_767 && Number(after.external_reference_count) === 8 && after.fire_domain_complete === true && Number(after.fire_domain_remaining) === 0 && after.all_normative_work_gaps_disposed === true && Number(after.missing_required_works) === 0 && after.batch009_selected === true && after.batch009_execution_started === true && after.batch010_selected === false && after.batch010_execution_started === false, "FIRE_ACTIVATION_AFTER_RED");
    assertExact(Number(after.transition_count) === 1 && Number(after.activation_count) === 1 && Number(after.admission_event_count) === 88 && Number(retryCounts.transitions) === 1 && Number(retryCounts.activations) === 1 && Number(retryCounts.admission_events) === 88, "FIRE_ACTIVATION_SINGLETON_RED");
    const canonical = { releaseId: manifest.releaseId, manifestSha256: manifest.manifestSha256, sourcePackageSha256: manifest.sourcePackageSha256, admissionProofSha256, independentAuditSha256, queue: { denominator: 11_610, admitted: 3_843, remaining: 7_767, external: 8 }, counts: { G: 88, D: 4, N: 139, H: 231, externalDefinitions: 143 }, activationCount: 1, queueRebaseCount: 1, admissionEvents: 88, externalAdmissionEvents: 0, retryAdditionalActivation: 0, retryAdditionalQueueEvent: 0, predecessorStatus: "retired", targetStatus: "active" };
    const report = { schemaVersion: "batch009-fire-r5-activation-replay.v1", label, database, before, cleanup: { ...cleanup, artifactFilesDeleted }, residue, activation, retry, after, ...canonical, replayPayloadSha256: semanticSha256(canonical), productionConnections: 0, status: "GREEN" };
    writeJson(`15-activation/ACTIVATION_${label}.json`, report);
    writeJson(`16-replay/REPLAY_${label}.json`, report);
    process.stdout.write(`${JSON.stringify({ label, database, releaseId: manifest.releaseId, queue: canonical.queue, replayPayloadSha256: report.replayPayloadSha256, status: report.status }, null, 2)}\n`);
  } finally { await client.end(); }
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`); process.exitCode = 1; });
