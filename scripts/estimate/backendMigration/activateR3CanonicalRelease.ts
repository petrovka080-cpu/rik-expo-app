import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "master11610-backend-canonical-r2", "evidence");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/master11610_r3_final";
const R1_RELEASE_ID = "86e62f78-7aee-49ff-a033-bb832339d588";
const R2_RELEASE_ID = "c90141a2-fdd6-4e78-b01c-bad792c8df18";

type JsonRecord = Record<string, unknown>;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: Buffer | string | unknown): string {
  const input = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(input).digest("hex");
}

async function releaseState(client: Client): Promise<JsonRecord[]> {
  const result = await client.query(`
    select id, release_key, schema_version, status, parent_release_id,
           source_manifest_sha256, source_package_sha256, definition_count,
           parameter_count, formula_count, resource_row_count, activated_at
    from public.estimate_definition_release
    where id = any($1::uuid[])
    order by schema_version
  `, [[R1_RELEASE_ID, R2_RELEASE_ID]]);
  return result.rows.map((row) => ({
    ...row,
    activated_at: row.activated_at == null ? null : new Date(row.activated_at).toISOString(),
  }));
}

async function programState(client: Client): Promise<JsonRecord> {
  const result = await client.query(`
    select denominator_total, admitted_global_count, queue_remaining,
           external_reference_count, batch006_started
    from public.estimate_program_control_state where singleton=true
  `);
  return result.rows[0];
}

async function oldRevisionFingerprint(client: Client): Promise<JsonRecord> {
  const revisions = await client.query(`
    select id, parent_revision_id, release_id, catalog_id, revision_number,
           status, input_parameters, price_snapshot_ids, currency_code, totals,
           row_count, checksum_sha256, compiler_version, migration_source, created_at
    from public.estimate_revision where release_id=$1 order by id
  `, [R1_RELEASE_ID]);
  const rows = await client.query(`
    select rr.* from public.estimate_revision_row rr
    join public.estimate_revision r on r.id=rr.revision_id
    where r.release_id=$1 order by rr.revision_id,rr.ordinal,rr.row_id
  `, [R1_RELEASE_ID]);
  const prices = await client.query(`
    select rp.* from public.estimate_revision_row_price rp
    join public.estimate_revision r on r.id=rp.revision_id
    where r.release_id=$1 order by rp.revision_id,rp.row_id
  `, [R1_RELEASE_ID]);
  const normalize = (value: unknown): unknown => JSON.parse(JSON.stringify(value));
  return {
    revisionCount: revisions.rowCount,
    rowCount: rows.rowCount,
    priceCount: prices.rowCount,
    revisionsSha256: sha256(normalize(revisions.rows)),
    rowsSha256: sha256(normalize(rows.rows)),
    pricesSha256: sha256(normalize(prices.rows)),
  };
}

function assertPreActivation(releases: JsonRecord[], program: JsonRecord): void {
  if (releases.length !== 2
    || releases[0].id !== R1_RELEASE_ID || releases[0].status !== "active"
    || releases[1].id !== R2_RELEASE_ID || releases[1].status !== "prepared"
    || releases[1].parent_release_id !== R1_RELEASE_ID
    || Number(program.denominator_total) !== 11_610
    || Number(program.admitted_global_count) !== 1_160
    || Number(program.queue_remaining) !== 10_450
    || Number(program.external_reference_count) !== 8
    || program.batch006_started !== false) {
    throw new Error(`R3_ACTIVATION_PREFLIGHT_RED:${stableJson({ releases, program })}`);
  }
}

function assertActivated(releases: JsonRecord[], program: JsonRecord): void {
  if (releases.length !== 2
    || releases[0].status !== "retired" || releases[1].status !== "active"
    || releases[1].activated_at == null
    || Number(program.denominator_total) !== 11_610
    || Number(program.admitted_global_count) !== 1_160
    || Number(program.queue_remaining) !== 10_450
    || Number(program.external_reference_count) !== 8
    || program.batch006_started !== false) {
    throw new Error(`R3_ACTIVATION_RESULT_RED:${stableJson({ releases, program })}`);
  }
}

async function main(): Promise<void> {
  const admissionProof = JSON.parse(readFileSync(
    join(EVIDENCE_ROOT, "R2_RELEASE_MASS_ADMISSION_PROOF.json"), "utf8",
  )) as JsonRecord;
  const admissionProofSha256 = String(admissionProof.proofPayloadSha256 ?? "");
  const auditBytes = readFileSync(join(EVIDENCE_ROOT, "INDEPENDENT_R3_RELEASE_AUDIT.json"));
  const independentAudit = JSON.parse(auditBytes.toString("utf8")) as JsonRecord;
  const independentAuditSha256 = sha256(auditBytes);
  if (admissionProof.status !== "GREEN" || independentAudit.status !== "GREEN"
    || !/^[0-9a-f]{64}$/.test(admissionProofSha256)
    || !/^[0-9a-f]{64}$/.test(independentAuditSha256)) {
    throw new Error("R3_ACTIVATION_PROOFS_NOT_GREEN");
  }

  const client = new Client({ connectionString: DATABASE_URL, application_name: "activate-r3-canonical-release" });
  await client.connect();
  try {
    const beforeReleases = await releaseState(client);
    const beforeProgram = await programState(client);
    const beforeOldRevisions = await oldRevisionFingerprint(client);
    assertPreActivation(beforeReleases, beforeProgram);
    if (Number(beforeOldRevisions.revisionCount) !== 16) throw new Error("R1_REVISION_COUNT_NOT_16");

    // Prove that an error after both status updates rolls the complete activation back.
    await client.query("begin isolation level serializable");
    await client.query(
      "select public.estimate_activate_definition_release_v2($1,$2,$3,'GREEN')",
      [R2_RELEASE_ID, admissionProofSha256, independentAuditSha256],
    );
    const inTransactionReleases = await releaseState(client);
    assertActivated(inTransactionReleases, await programState(client));
    await client.query("rollback");

    const afterRollbackReleases = await releaseState(client);
    const afterRollbackProgram = await programState(client);
    const afterRollbackOldRevisions = await oldRevisionFingerprint(client);
    if (stableJson(afterRollbackReleases) !== stableJson(beforeReleases)
      || stableJson(afterRollbackProgram) !== stableJson(beforeProgram)
      || stableJson(afterRollbackOldRevisions) !== stableJson(beforeOldRevisions)) {
      throw new Error("R3_ATOMIC_ACTIVATION_ROLLBACK_DRIFT");
    }
    const rolledBackActivation = await client.query(
      "select count(*)::integer count from public.estimate_definition_release_activation where release_id=$1",
      [R2_RELEASE_ID],
    );
    if (Number(rolledBackActivation.rows[0].count) !== 0) throw new Error("R3_ROLLBACK_LEFT_ACTIVATION_EVENT");

    await client.query("begin isolation level serializable");
    await client.query(
      "select public.estimate_activate_definition_release_v2($1,$2,$3,'GREEN') activated_release_id",
      [R2_RELEASE_ID, admissionProofSha256, independentAuditSha256],
    );
    await client.query("commit");

    const afterReleases = await releaseState(client);
    const afterProgram = await programState(client);
    const afterOldRevisions = await oldRevisionFingerprint(client);
    assertActivated(afterReleases, afterProgram);
    if (stableJson(afterProgram) !== stableJson(beforeProgram)) throw new Error("R3_ACTIVATION_QUEUE_DRIFT");
    if (stableJson(afterOldRevisions) !== stableJson(beforeOldRevisions)) throw new Error("R3_ACTIVATION_CHANGED_R1_REVISIONS");
    const activationResult = await client.query(`
      select release_id, predecessor_release_id, admission_proof_sha256,
             independent_audit_sha256, program_state_before, program_state_after, activated_at
      from public.estimate_definition_release_activation where release_id=$1
    `, [R2_RELEASE_ID]);
    if (activationResult.rowCount !== 1
      || activationResult.rows[0].predecessor_release_id !== R1_RELEASE_ID
      || activationResult.rows[0].admission_proof_sha256 !== admissionProofSha256
      || activationResult.rows[0].independent_audit_sha256 !== independentAuditSha256) {
      throw new Error(`R3_ACTIVATION_LEDGER_RED:${stableJson(activationResult.rows)}`);
    }

    const proof = {
      schemaVersion: "canonical-r2-atomic-activation-proof.r3",
      database: DATABASE_URL.replace(/:[^:@/]+@/, ":***@"),
      predecessorReleaseId: R1_RELEASE_ID,
      releaseId: R2_RELEASE_ID,
      admissionProofSha256,
      independentAuditSha256,
      independentAuditStatus: "GREEN",
      rollbackMutation: {
        bothStatusUpdatesObserved: inTransactionReleases.map((release) => ({ id: release.id, status: release.status })),
        transactionRolledBack: true,
        stateRestoredExactly: true,
        activationLedgerResidue: 0,
      },
      stateBefore: { releases: beforeReleases, program: beforeProgram, oldR1Revisions: beforeOldRevisions },
      stateAfter: { releases: afterReleases, program: afterProgram, oldR1Revisions: afterOldRevisions },
      queueDelta: { denominator: 0, admitted: 0, remaining: 0, external: 0 },
      batch006Started: false,
      activationLedger: activationResult.rows[0],
      status: "GREEN",
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(
      join(EVIDENCE_ROOT, "CANONICAL_R2_ATOMIC_ACTIVATION_PROOF.json"),
      `${JSON.stringify(proof, null, 2)}\n`, "utf8",
    );
    process.stdout.write(`${JSON.stringify(proof)}\n`);
  } catch (error) {
    try { await client.query("rollback"); } catch { /* preserve the primary error */ }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
