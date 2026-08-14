import { appendFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const ADMIN_URL = "postgresql://postgres@127.0.0.1:55432/postgres";
const R1_URL = "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const DISPOSABLE_DATABASE = "master11610_r2_admission";
const MANIFEST_SHA256 = "bf0de1a3045355f3c2b9efa50bc6d70c688592546d04232548222f925b5fcf4c";

async function main(): Promise<void> {
  const admission = new Client({ connectionString: `postgresql://postgres@127.0.0.1:55432/${DISPOSABLE_DATABASE}` });
  await admission.connect();
  const before = (await admission.query(`
    select
      (select source_manifest_sha256 from public.estimate_definition_release where status='active') manifest_sha256,
      (select count(*)::integer from public.estimate_definition_version) definitions,
      (select count(*)::integer from public.estimate_resource_spec) resources,
      (select count(*)::integer from public.estimate_compile_job where idempotency_key like 'r2-valid-%') jobs,
      (select count(*)::integer from public.estimate_compile_job where idempotency_key like 'r2-valid-%' and status='succeeded') succeeded_jobs,
      (select count(*)::integer from public.estimate_revision) revisions,
      (select count(*)::integer from public.estimate_revision_row) revision_rows
  `)).rows[0];
  await admission.end();
  if (before.manifest_sha256 !== MANIFEST_SHA256 || before.definitions !== 1_168
    || before.resources !== 101_416 || before.jobs !== 3_684
    || before.succeeded_jobs !== 3_684 || before.revisions !== 3_684) {
    throw new Error(`refusing disposable database cleanup: ${JSON.stringify(before)}`);
  }

  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`
    select pg_terminate_backend(pid)
      from pg_stat_activity
     where datname=$1 and pid<>pg_backend_pid()
  `, [DISPOSABLE_DATABASE]);
  // Identifier is a fixed compile-time constant, never input or environment.
  await admin.query(`drop database "${DISPOSABLE_DATABASE}"`);
  const remainingDatabases = Number((await admin.query(
    "select count(*) count from pg_database where datname=$1",
    [DISPOSABLE_DATABASE],
  )).rows[0].count);
  await admin.end();

  const r1 = new Client({ connectionString: R1_URL });
  await r1.connect();
  const r1Residue = (await r1.query(`
    select
      (select count(*)::integer from public.estimate_compile_job where idempotency_key like 'r2-valid-%' or idempotency_key like 'r2-1168-%') jobs,
      (select count(*)::integer from public.estimate_revision where id in (
        select result_revision_id from public.estimate_compile_job
         where idempotency_key like 'r2-valid-%' or idempotency_key like 'r2-1168-%'
      )) revisions
  `)).rows[0];
  await r1.end();
  if (remainingDatabases !== 0 || r1Residue.jobs !== 0 || r1Residue.revisions !== 0) {
    throw new Error(`mass admission residue remains: ${JSON.stringify({ remainingDatabases, r1Residue })}`);
  }

  const proof = {
    schemaVersion: "constraint-aware-admission-disposable-cleanup.r2",
    cleanedAt: new Date().toISOString(),
    database: DISPOSABLE_DATABASE,
    before,
    databaseExistsAfter: false,
    r1RuntimeResidue: r1Residue,
    productionDataTouched: false,
    productionMigrationCorpusResidue: 0,
    status: "GREEN",
  };
  writeFileSync(join(EVIDENCE_ROOT, "MASS_ADMISSION_DISPOSABLE_CLEANUP_PROOF.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  appendFileSync(join(EVIDENCE_ROOT, "JOURNAL.jsonl"), `${JSON.stringify({
    at: proof.cleanedAt,
    gate: "C1_C5",
    event: "DISPOSABLE_ADMISSION_DATABASE_REMOVED",
    status: "GREEN",
    database: DISPOSABLE_DATABASE,
    residue: 0,
  })}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(proof)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
