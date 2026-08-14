import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const ARCHIVE_ROOT = join(EVIDENCE_ROOT, "invalidated-all-boolean");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
const TEST_OWNER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_KEY_PATTERN = "r2-1168-%";
const INVALIDATED_FILES = [
  "SERVER_COMPILE_1168_MATRIX.jsonl",
  "SERVER_RECALCULATE_1168_MATRIX.jsonl",
  "SOURCE_TO_SERVER_ROW_PARITY.jsonl",
  "SERVER_1168_SUMMARY.json",
] as const;

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  mkdirSync(ARCHIVE_ROOT, { recursive: true });
  const invalidatedAt = new Date().toISOString();
  const archivedFiles = INVALIDATED_FILES.map((file) => {
    const source = join(EVIDENCE_ROOT, file);
    const bytes = readFileSync(source);
    const target = join(ARCHIVE_ROOT, file);
    renameSync(source, target);
    return { file, bytes: statSync(target).size, sha256: sha256(bytes) };
  });

  const client = new Client({ connectionString: DATABASE_URL, application_name: "canonical-estimate-r2-test-residue-cleanup" });
  await client.connect();
  try {
    const before = (await client.query(`
      select count(*)::integer jobs,
             count(result_revision_id)::integer revisions,
             count(*) filter (where operation='compile')::integer compile_jobs,
             count(*) filter (where operation='recalculate')::integer recalculate_jobs,
             count(*) filter (where operation not in ('compile','recalculate'))::integer unexpected_jobs
        from public.estimate_compile_job
       where owner_user_id=$1 and idempotency_key like $2
    `, [TEST_OWNER_ID, TEST_KEY_PATTERN])).rows[0];
    if (before.unexpected_jobs !== 0 || before.jobs !== 2_336 || before.revisions !== 2_336
      || before.compile_jobs !== 1_168 || before.recalculate_jobs !== 1_168) {
      throw new Error(`refusing cleanup: unexpected target set ${JSON.stringify(before)}`);
    }
    const dependent = (await client.query(`
      with target as (
        select id, result_revision_id from public.estimate_compile_job
         where owner_user_id=$1 and idempotency_key like $2
      )
      select
        (select count(*)::integer from public.estimate_legacy_revision_import l join target t on t.id=l.job_id) legacy_imports,
        (select count(*)::integer from public.estimate_revision_artifact a join target t on t.result_revision_id=a.revision_id) artifacts,
        (select count(*)::integer from public.estimate_revision r join target t on t.result_revision_id=r.parent_revision_id
          where r.id not in (select result_revision_id from target)) external_children
    `, [TEST_OWNER_ID, TEST_KEY_PATTERN])).rows[0];
    if (dependent.legacy_imports !== 0 || dependent.artifacts !== 0 || dependent.external_children !== 0) {
      throw new Error(`refusing cleanup: test revisions have unexpected dependants ${JSON.stringify(dependent)}`);
    }

    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(hashtextextended('master11610-r2-mass-cleanup',0))");
      await client.query(`
        create temporary table r2_mass_cleanup_target on commit drop as
        select id job_id, operation, result_revision_id revision_id
          from public.estimate_compile_job
         where owner_user_id=$1 and idempotency_key like $2
      `, [TEST_OWNER_ID, TEST_KEY_PATTERN]);
      await client.query(`delete from public.estimate_compile_job j using r2_mass_cleanup_target t where j.id=t.job_id`);
      await client.query("alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg");
      await client.query("alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg");
      await client.query("alter table public.estimate_revision disable trigger estimate_revision_immutable_trg");
      await client.query(`delete from public.estimate_revision_row_price p using r2_mass_cleanup_target t where p.revision_id=t.revision_id`);
      await client.query(`delete from public.estimate_revision_row r using r2_mass_cleanup_target t where r.revision_id=t.revision_id`);
      await client.query(`delete from public.estimate_revision r using r2_mass_cleanup_target t where r.id=t.revision_id and t.operation='recalculate'`);
      await client.query(`delete from public.estimate_revision r using r2_mass_cleanup_target t where r.id=t.revision_id and t.operation='compile'`);
      await client.query("alter table public.estimate_revision enable trigger estimate_revision_immutable_trg");
      await client.query("alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg");
      await client.query("alter table public.estimate_revision_row_price enable trigger estimate_revision_row_price_immutable_trg");
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    const residue = (await client.query(`
      select
        (select count(*)::integer from public.estimate_compile_job where owner_user_id=$1 and idempotency_key like $2) jobs,
        (select count(*)::integer from public.estimate_revision where id in (
          select result_revision_id from public.estimate_compile_job where owner_user_id=$1 and idempotency_key like $2
        )) revisions,
        (select count(*)::integer from public.estimate_revision_row where calculation_trace->>'compilerVersion'='canonical-estimate-local-runtime.r1'
          and revision_id not in (select result_revision_id from public.estimate_compile_job)) orphan_runtime_rows
    `, [TEST_OWNER_ID, TEST_KEY_PATTERN])).rows[0];
    if (residue.jobs !== 0 || residue.revisions !== 0 || residue.orphan_runtime_rows !== 0) {
      throw new Error(`test runtime residue remains ${JSON.stringify(residue)}`);
    }
    const proof = {
      schemaVersion: "mass-admission-correction-and-test-residue-proof.r2",
      invalidatedAt,
      reason: "ALL_BOOLEAN_TRUE_IS_NOT_A_VALID_SEMANTIC_OR_MUTUAL_EXCLUSION_SCENARIO",
      priorResultClassification: "INVALIDATED_NOT_GREEN",
      archivedFiles,
      exactCleanupScope: { ownerUserId: TEST_OWNER_ID, idempotencyKeyPattern: TEST_KEY_PATTERN, before },
      protectedData: {
        corpusTablesChanged: false,
        legacyImportRowsDeleted: 0,
        artifactRowsDeleted: 0,
        nonTargetRevisionRowsDeleted: 0,
      },
      residue,
      productionMigrationCorpusResidue: 0,
      nextAdmission: "CONSTRAINT_AWARE_MINIMAL_BRANCH_COVER_IN_DISPOSABLE_DATABASE",
      status: "GREEN_CORRECTION_RED_ADMISSION_PENDING",
    };
    writeFileSync(join(EVIDENCE_ROOT, "MASS_ADMISSION_CORRECTION_AND_TEST_RESIDUE_PROOF.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
    appendFileSync(join(EVIDENCE_ROOT, "JOURNAL.jsonl"), `${JSON.stringify({
      at: invalidatedAt,
      gate: "C1_C5",
      event: "INVALID_BOOLEAN_MASS_ADMISSION_REMOVED",
      status: "RED_ADMISSION_PENDING",
      removedJobs: before.jobs,
      removedRevisions: before.revisions,
      residue: 0,
    })}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(proof)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
