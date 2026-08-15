import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a1");
const UP = join(ROOT, "supabase/migrations/20260815100000_batch006_water_backend_r3.sql");
const DOWN = join(ROOT, "supabase/rollback/20260815100000_batch006_water_backend_r3.down.sql");
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!EXPECTED_DATABASE || decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")) !== EXPECTED_DATABASE
  || !/^batch006_water_r5_a1_[ab]$/.test(EXPECTED_DATABASE)) throw new Error("BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED");

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function psql(): string {
  return process.env.PSQL_PATH ?? resolve(process.env.ProgramFiles ?? "C:/Program Files", "PostgreSQL/17/bin/psql.exe");
}

function migration(path: string): { exitCode: number | null; stdout: string; stderr: string } {
  const result = spawnSync(psql(), [DATABASE_URL, "-v", "ON_ERROR_STOP=1", "-f", path], {
    cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, timeout: 120_000, windowsHide: true,
  });
  return { exitCode: result.status, stdout: result.stdout ?? "", stderr: `${result.stderr ?? ""}${result.error ? result.error.message : ""}` };
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-r5-migration-rehearsal" });
  await client.connect();
  try {
    const before = (await client.query(`
      select
        (select count(*)::integer from public.estimate_definition_release where schema_version=5) r5_releases,
        (select count(*)::integer from public.estimate_definition_version v join public.estimate_definition_release r on r.id=v.release_id where r.status='active') predecessor_definitions,
        (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_definition_release r on r.id=v.release_id where r.status='active') predecessor_resources,
        (select admitted_global_count from public.estimate_program_control_state where singleton=true) admitted,
        (select queue_remaining from public.estimate_program_control_state where singleton=true) remaining
    `)).rows[0];
    if (Number(before.r5_releases) !== 0 || Number(before.predecessor_definitions) !== 1_168
      || Number(before.predecessor_resources) !== 101_416 || Number(before.admitted) !== 1_160
      || Number(before.remaining) !== 10_450) throw new Error(`WATER_R5_MIGRATION_REHEARSAL_BASE_RED:${JSON.stringify(before)}`);
    const down = migration(DOWN);
    if (down.exitCode !== 0) throw new Error(`WATER_R5_MIGRATION_DOWN_RED:${down.stderr}`);
    const up = migration(UP);
    if (up.exitCode !== 0) throw new Error(`WATER_R5_MIGRATION_UP_RED:${up.stderr}`);
    const after = (await client.query(`
      select
        to_regprocedure('public.estimate_create_release_admission_job_v3(uuid,text,text,uuid,uuid,text,text,text,uuid,jsonb)')::text admission_rpc,
        to_regprocedure('public.estimate_cleanup_release_admission_runtime_v3(uuid,uuid,uuid)')::text cleanup_rpc,
        to_regprocedure('public.estimate_seal_domain_release_admission_v3(uuid,text,text,text,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,integer,jsonb)')::text seal_rpc,
        to_regprocedure('public.estimate_activate_water_release_and_rebase_v3(uuid,text,text,text,text,integer)')::text activation_rpc,
        (select count(*)::integer from public.estimate_definition_release where schema_version=5) r5_releases,
        (select count(*)::integer from public.estimate_definition_version v join public.estimate_definition_release r on r.id=v.release_id where r.status='active') predecessor_definitions,
        (select count(*)::integer from public.estimate_resource_spec s join public.estimate_definition_version v on v.id=s.definition_version_id join public.estimate_definition_release r on r.id=v.release_id where r.status='active') predecessor_resources,
        (select jsonb_build_object('denominator',denominator_total,'admitted',admitted_global_count,'remaining',queue_remaining,
          'external',external_reference_count,'batch007Started',batch007_execution_started) from public.estimate_program_control_state where singleton=true) queue
    `)).rows[0];
    const status = after.admission_rpc && after.cleanup_rpc && after.seal_rpc && after.activation_rpc
      && Number(after.r5_releases) === 0 && Number(after.predecessor_definitions) === 1_168
      && Number(after.predecessor_resources) === 101_416 ? "GREEN" : "RED";
    const report = {
      schemaVersion: "water-r5-explicit-migration-rehearsal.v1",
      database: new URL(DATABASE_URL).pathname.replace(/^\//, ""),
      disposableBytePreservingClone: true,
      migrationUpSha256: sha256(readFileSync(UP)),
      rollbackSha256: sha256(readFileSync(DOWN)),
      before,
      replay: {
        down: { exitCode: down.exitCode, stdoutSha256: sha256(Buffer.from(down.stdout)), stderrSha256: sha256(Buffer.from(down.stderr)) },
        up: { exitCode: up.exitCode, stdoutSha256: sha256(Buffer.from(up.stdout)), stderrSha256: sha256(Buffer.from(up.stderr)) },
      },
      after,
      predecessorByteCloneUnchanged: Number(after.predecessor_definitions) === 1_168 && Number(after.predecessor_resources) === 101_416,
      productionDeployed: false,
      status,
    };
    writeFileSync(join(EVIDENCE, "WATER_R5_EXPLICIT_MIGRATION_REHEARSAL.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    writeFileSync(join(EVIDENCE, "A7_MIGRATION_REPLAY.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(report)}\n`);
    if (status !== "GREEN") process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
