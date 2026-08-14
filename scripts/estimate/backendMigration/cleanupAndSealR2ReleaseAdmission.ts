import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r2_dev";
const RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";
const PREDECESSOR_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const OWNER_USER_ID = "11111111-1111-4111-8111-111111111111";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const ADMISSION_RUN_ID = String(process.env.CANONICAL_ESTIMATE_ADMISSION_RUN_ID
  ?? "master11610-r3-final-constraint-aware-3684").trim();

type JsonRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value)).digest("hex");
}

function fileSha256(name: string): string {
  return sha256(readFileSync(join(EVIDENCE_ROOT, name)));
}

function assertExactSummary(summary: JsonRecord): void {
  const compile = summary.serverCompile as JsonRecord;
  const recalculate = summary.serverRecalculate as JsonRecord;
  const coverage = summary.resourceBranchCoverage as JsonRecord;
  if (summary.status !== "GREEN" || summary.releaseId !== RELEASE_ID
    || Number(compile.expected) !== 1_168 || Number(compile.green) !== 1_168
    || Number(recalculate.expected) !== 1_168 || Number(recalculate.green) !== 1_168
    || Number(summary.scenarioCount) !== 3_684
    || Number(coverage.reachedUnique) !== 101_416 || Number(coverage.expected) !== 101_416
    || Number(summary.invalidParameterCombinations) !== 0
    || Number(summary.mutuallyExclusiveSimultaneous) !== 0
    || Number(summary.doubleCount) !== 0 || Number(summary.unreachableRows) !== 0
    || Number(summary.redCount) !== 0) {
    throw new Error(`ADMISSION_SUMMARY_NOT_EXACT_GREEN:${stableJson(summary)}`);
  }
}

async function revisionFingerprint(client: Client, releaseId: string): Promise<JsonRecord> {
  const result = await client.query(`
    select id, parent_revision_id, release_id, catalog_id, revision_number,
           checksum_sha256, row_count, totals, migration_source, created_at
    from public.estimate_revision where release_id=$1 order by id
  `, [releaseId]);
  const rows = result.rows.map((row) => ({
    ...row,
    created_at: new Date(row.created_at).toISOString(),
  }));
  return { count: rows.length, sha256: sha256(rows) };
}

async function main(): Promise<void> {
  const summary = JSON.parse(readFileSync(join(EVIDENCE_ROOT, "SERVER_1168_SUMMARY.json"), "utf8")) as JsonRecord;
  assertExactSummary(summary);
  const evidenceHashes = {
    serverCompileMatrixSha256: fileSha256("SERVER_COMPILE_1168_MATRIX.jsonl"),
    serverRecalculateMatrixSha256: fileSha256("SERVER_RECALCULATE_1168_MATRIX.jsonl"),
    sourceToServerParitySha256: fileSha256("SOURCE_TO_SERVER_ROW_PARITY.jsonl"),
    scenarioMatrixSha256: fileSha256("CONSTRAINT_AWARE_SCENARIO_MATRIX.jsonl"),
    branchCoverageMatrixSha256: fileSha256("RESOURCE_BRANCH_COVERAGE_MATRIX.jsonl"),
    summarySha256: fileSha256("SERVER_1168_SUMMARY.json"),
  };
  const client = new Client({ connectionString: DATABASE_URL, application_name: "cleanup-seal-r2-release-admission" });
  await client.connect();
  let proof: JsonRecord;
  try {
    await client.query("begin isolation level serializable");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [`release-admission-cleanup:${RELEASE_ID}`]);
    const releases = await client.query(`
      select id,release_key,schema_version,status,parent_release_id,source_manifest_sha256,
             source_package_sha256,definition_count,parameter_count,formula_count,
             resource_row_count,sealed_at,activated_at
      from public.estimate_definition_release where id=any($1::uuid[]) order by schema_version
      for update
    `, [[PREDECESSOR_RELEASE_ID, RELEASE_ID]]);
    if (releases.rows.length !== 2 || releases.rows[0].status !== "active"
      || releases.rows[1].status !== "prepared" || releases.rows[1].parent_release_id !== PREDECESSOR_RELEASE_ID) {
      throw new Error(`RELEASE_LINEAGE_STATE_INVALID:${stableJson(releases.rows)}`);
    }
    const oldRevisionBefore = await revisionFingerprint(client, PREDECESSOR_RELEASE_ID);
    const jobs = await client.query(`
      select id,operation,status,result_revision_id,target_release_id,owner_user_id,organization_id,
             input_payload->>'admissionRunId' admission_run_id
      from public.estimate_compile_job
      where target_release_id=$1 and input_payload->>'releaseAdmission'='true'
      order by id
    `, [RELEASE_ID]);
    const compileCount = jobs.rows.filter((row) => row.operation === "compile").length;
    const recalculateCount = jobs.rows.filter((row) => row.operation === "recalculate").length;
    if (jobs.rows.length !== 3_684 || compileCount !== 1_168 || recalculateCount !== 2_516
      || jobs.rows.some((row) => row.status !== "succeeded" || row.owner_user_id !== OWNER_USER_ID
        || row.organization_id !== ORGANIZATION_ID || row.admission_run_id !== ADMISSION_RUN_ID
        || row.result_revision_id == null)) {
      throw new Error(`ADMISSION_JOB_SCOPE_INVALID:${jobs.rows.length}:${compileCount}:${recalculateCount}`);
    }
    const revisionIds = jobs.rows.map((row) => row.result_revision_id as string);
    const runtime = await client.query(`
      select
        (select count(*)::integer from public.estimate_revision r where r.id=any($1::uuid[])) revisions,
        (select count(*)::integer from public.estimate_revision_row rr where rr.revision_id=any($1::uuid[])) revision_rows,
        (select count(*)::integer from public.estimate_revision_row_price rp where rp.revision_id=any($1::uuid[])) price_rows,
        (select count(*)::integer from public.estimate_revision_artifact a where a.revision_id=any($1::uuid[])) artifacts,
        (select count(*)::integer from public.estimate_revision r
          where r.id=any($1::uuid[]) and (r.release_id<>$2 or r.owner_user_id<>$3 or r.organization_id<>$4)) scope_mismatch
    `, [revisionIds, RELEASE_ID, OWNER_USER_ID, ORGANIZATION_ID]);
    const before = runtime.rows[0];
    if (Number(before.revisions) !== 3_684 || Number(before.revision_rows) !== 275_822
      || Number(before.artifacts) !== 0 || Number(before.scope_mismatch) !== 0) {
      throw new Error(`ADMISSION_RUNTIME_SCOPE_INVALID:${stableJson(before)}`);
    }

    await client.query("delete from public.estimate_compile_job where id=any($1::uuid[])", [jobs.rows.map((row) => row.id)]);
    await client.query("alter table public.estimate_revision_row_price disable trigger estimate_revision_row_price_immutable_trg");
    await client.query("alter table public.estimate_revision_row disable trigger estimate_revision_row_immutable_trg");
    await client.query("alter table public.estimate_revision disable trigger estimate_revision_immutable_trg");
    await client.query("delete from public.estimate_revision_row_price where revision_id=any($1::uuid[])", [revisionIds]);
    await client.query("delete from public.estimate_revision_row where revision_id=any($1::uuid[])", [revisionIds]);
    await client.query("delete from public.estimate_revision where id=any($1::uuid[])", [revisionIds]);
    await client.query("alter table public.estimate_revision enable trigger estimate_revision_immutable_trg");
    await client.query("alter table public.estimate_revision_row enable trigger estimate_revision_row_immutable_trg");
    await client.query("alter table public.estimate_revision_row_price enable trigger estimate_revision_row_price_immutable_trg");

    const residueResult = await client.query(`
      select
        (select count(*)::integer from public.estimate_compile_job j
          where j.target_release_id=$1 and j.input_payload->>'releaseAdmission'='true') jobs,
        (select count(*)::integer from public.estimate_revision r where r.release_id=$1) revisions,
        (select count(*)::integer from public.estimate_revision_row rr
          join public.estimate_revision r on r.id=rr.revision_id where r.release_id=$1) rows,
        (select count(*)::integer from public.estimate_revision_artifact a
          join public.estimate_revision r on r.id=a.revision_id where r.release_id=$1) artifacts
    `, [RELEASE_ID]);
    const residue = residueResult.rows[0];
    const residueTotal = Object.values(residue as Record<string, unknown>)
      .reduce<number>((sum, value) => sum + Number(value), 0);
    if (residueTotal !== 0) throw new Error(`ADMISSION_RUNTIME_RESIDUE:${stableJson(residue)}`);
    const oldRevisionAfter = await revisionFingerprint(client, PREDECESSOR_RELEASE_ID);
    if (stableJson(oldRevisionAfter) !== stableJson(oldRevisionBefore)) throw new Error("OLD_R1_REVISION_DRIFT_DURING_ADMISSION_CLEANUP");

    const admissionProofPayload = {
      schemaVersion: "canonical-r2-release-mass-admission-proof.r2",
      releaseId: RELEASE_ID,
      predecessorReleaseId: PREDECESSOR_RELEASE_ID,
      sourceManifestSha256: summary.sourceManifestSha256,
      evidenceHashes,
      serverCompile: { expected: 1_168, green: 1_168 },
      serverRecalculate: { expected: 1_168, green: 1_168 },
      constraintAwareScenarios: { expected: 3_684, green: 3_684 },
      resourceBranchCoverage: { expected: 101_416, reached: 101_416, percent: 100 },
      invalidParameterCombinations: 0,
      mutuallyExclusiveSimultaneous: 0,
      doubleCount: 0,
      unreachableRows: 0,
      testScope: { ownerUserId: OWNER_USER_ID, organizationId: ORGANIZATION_ID, admissionRunId: ADMISSION_RUN_ID },
      runtimeBeforeCleanup: before,
      runtimeResidueAfterCleanup: { ...residue, total: residueTotal },
      oldR1RevisionFingerprintBefore: oldRevisionBefore,
      oldR1RevisionFingerprintAfter: oldRevisionAfter,
    };
    const proofPayloadSha256 = sha256(admissionProofPayload);
    await client.query(`select public.estimate_seal_release_admission_v2(
      $1,$2,1168,1168,3684,101416,101416,0,0,0
    )`, [RELEASE_ID, proofPayloadSha256]);
    await client.query("commit");
    proof = {
      ...admissionProofPayload,
      proofPayloadSha256,
      databaseAdmissionSeal: {
        releaseId: RELEASE_ID,
        proofSha256: proofPayloadSha256,
        testRuntimeResidue: 0,
      },
      status: "GREEN",
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
  writeFileSync(join(EVIDENCE_ROOT, "R2_RELEASE_MASS_ADMISSION_PROOF.json"), `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(proof)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
