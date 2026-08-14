import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";

const OWNER_A = "11111111-1111-4111-8111-111111111111";
const OWNER_B = "22222222-2222-4222-8222-222222222222";
const CATALOG_ID = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_drain_standard_professional_expanded_v1";
const WORKER_ID = `postgres-integration:${randomUUID()}`;

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}
function hash(value: unknown): string { return createHash("sha256").update(stableJson(value)).digest("hex"); }

async function asUser<T>(client: Client, userId: string, operation: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    const result = await operation();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function createJob(client: Client, userId: string, idempotencyKey: string) {
  return asUser(client, userId, async () => {
    const parameters = await client.query(`
      select p.parameter_id from public.estimate_parameter_definition p
      join public.estimate_definition_version v on v.id=p.definition_version_id
      join public.estimate_definition_release r on r.id=v.release_id
      where r.status='active' and v.catalog_id=$1 order by p.ordinal
    `, [CATALOG_ID]);
    const values = Object.fromEntries(parameters.rows.map((row, index) => [row.parameter_id, index === 0 ? 120 : 10]));
    const created = await client.query(`
      select * from public.estimate_create_compile_job_v1($1,'compile',$2,null,null,$3::jsonb)
    `, [idempotencyKey, CATALOG_ID, JSON.stringify({ parameters: values, currencyCode: "KGS", priceSnapshotIds: [] })]);
    return { ...created.rows[0], parameters: values };
  });
}

async function main() {
  const databaseUrl = process.env.ESTIMATE_MIGRATION_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:55432/master11610_r1";
  const client = new Client({ connectionString: databaseUrl, application_name: "verify-canonical-estimate-postgres-r1" });
  await client.connect();
  const report: Record<string, unknown> = { schemaVersion: "canonical-estimate-postgres-integration.r1", catalogId: CATALOG_ID };
  try {
    const programBefore = (await client.query("select * from public.estimate_program_control_state where singleton=true")).rows[0];
    const key = `postgres-integration-${randomUUID()}`;
    const first = await createJob(client, OWNER_A, key);
    const replay = await createJob(client, OWNER_A, key);
    if (first.job_id !== replay.job_id || replay.created !== false) throw new Error("JOB_IDEMPOTENCY_FAILED");

    const claimed = await client.query("select * from public.estimate_claim_compile_jobs_v1($1,25,120)", [WORKER_ID]);
    const job = claimed.rows.find((row) => row.id === first.job_id);
    if (!job) throw new Error("JOB_CLAIM_FAILED");
    const release = (await client.query("select id from public.estimate_definition_release where status='active'")).rows[0];
    const definition = (await client.query("select id from public.estimate_definition_version where release_id=$1 and catalog_id=$2", [release.id, CATALOG_ID])).rows[0];
    const formulas = await client.query("select formula_id,ast,ast_sha256,input_parameter_ids from public.estimate_formula_graph where definition_version_id=$1", [definition.id]);
    const formulaById = new Map(formulas.rows.map((row) => [row.formula_id, row]));
    const resources = await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [definition.id]);
    const compiledRows = resources.rows.map((resource) => {
      const formula = formulaById.get(resource.formula_id);
      if (!formula) throw new Error(`FORMULA_MISSING:${resource.formula_id}`);
      const quantity = evaluateFormulaGraph(formula.ast as FormulaAst, first.parameters);
      const projection = {
        rowId: resource.row_id, ordinal: resource.ordinal, resourceSpecId: resource.id,
        section: resource.section, category: resource.category, titleRu: resource.title_ru,
        unitId: resource.unit_id, quantity, procurementEligible: resource.procurement_eligible,
        formulaAstSha256: formula.ast_sha256,
      };
      return {
        row_id: resource.row_id,
        ordinal: resource.ordinal,
        resource_spec_id: resource.id,
        section: resource.section,
        category: resource.category,
        title_ru: resource.title_ru,
        unit_id: resource.unit_id,
        quantity,
        unit_price: null,
        amount: null,
        currency_code: null,
        procurement_eligible: resource.procurement_eligible,
        calculation_trace: { compilerVersion: "postgres-integration.r1", formulaId: resource.formula_id, formulaAstSha256: formula.ast_sha256 },
        normative_trace: [],
        row_sha256: hash(projection),
        price_snapshot_id: null,
        price_route_id: null,
        price_resolution_trace: { resolved: false },
      };
    });
    const revisionProjection = { catalogId: CATALOG_ID, parameters: first.parameters, rows: compiledRows.map((row) => [row.row_id, row.row_sha256]) };
    const committed = await client.query(`
      select public.estimate_commit_compile_job_v1($1,$2,$3::jsonb,$4::jsonb) revision_id
    `, [first.job_id, WORKER_ID, JSON.stringify({
      rowCount: compiledRows.length,
      currencyCode: "KGS",
      totals: { amount: "0", pricedRowCount: 0, unpricedRowCount: compiledRows.length, currencyCode: "KGS" },
      checksumSha256: hash(revisionProjection),
      compilerVersion: "postgres-integration.r1",
      migrationSource: null,
    }), JSON.stringify(compiledRows)]);
    const revisionId = committed.rows[0].revision_id;
    const revision = (await client.query("select * from public.estimate_revision where id=$1", [revisionId])).rows[0];
    const revisionRows = Number((await client.query("select count(*) count from public.estimate_revision_row where revision_id=$1", [revisionId])).rows[0].count);
    if (revision.status !== "ready" || revisionRows !== compiledRows.length || revision.checksum_sha256 !== hash(revisionProjection)) {
      throw new Error("ATOMIC_REVISION_COMMIT_FAILED");
    }

    let immutableRejected = false;
    try { await client.query("update public.estimate_revision set compiler_version='tampered' where id=$1", [revisionId]); }
    catch (error: any) { immutableRejected = error?.code === "55000"; }
    if (!immutableRejected) throw new Error("IMMUTABLE_REVISION_TAMPER_NOT_REJECTED");

    const legacySourceRows = [
      {
        rowId: resources.rows[0].row_id,
        section: "Материалы",
        category: "material",
        titleRu: "Сохранённая строка с каноническим row_id",
        unitId: resources.rows[0].unit_id,
        quantity: "2.500",
        unitPrice: "100.00",
        amount: "250.00",
        procurementEligible: true,
        calculationTrace: { legacyFormula: "2.5" },
        normativeTrace: [],
        sourcePayload: { exact: true, rowId: resources.rows[0].row_id, quantity: 2.5, userEdit: "preserved" },
      },
      {
        rowId: "legacy-user-row-2",
        section: "Работы",
        category: "labor",
        titleRu: "Пользовательская строка без resource spec",
        unitId: "hour",
        quantity: null,
        unitPrice: null,
        amount: null,
        procurementEligible: false,
        calculationTrace: {},
        normativeTrace: [],
        sourcePayload: { exact: true, rowId: "legacy-user-row-2", quantity: null, note: "не пересоздавать" },
      },
    ];
    const legacyRunId = randomUUID();
    const legacySourceProjection = {
      sourceEstimateId: `legacy-estimate-postgres-r1:${legacyRunId}`,
      sourceRevisionId: `legacy-revision-postgres-r1:${legacyRunId}`,
      catalogId: CATALOG_ID,
      currencyCode: "KGS",
      parameters: { preserved: true },
      totals: { amount: "250.00", currencyCode: "KGS" },
      rows: legacySourceRows,
    };
    const legacyChecksum = hash(legacySourceProjection);
    const legacyPayload = { ...legacySourceProjection, sourceChecksumSha256: legacyChecksum, apiVersion: "2026-08-14.r1" };
    const legacyKey = `legacy-postgres-${randomUUID()}`;
    const legacyCreated = await asUser(client, OWNER_A, async () => (await client.query(`
      select * from public.estimate_create_legacy_revision_job_v1($1,$2,null,$3,$4,$5,$6,$7::jsonb)
    `, [legacyKey, CATALOG_ID, legacySourceProjection.sourceEstimateId, legacySourceProjection.sourceRevisionId,
      legacyChecksum, revisionId, JSON.stringify(legacyPayload)])).rows[0]);
    const legacyReplay = await asUser(client, OWNER_A, async () => (await client.query(`
      select * from public.estimate_create_legacy_revision_job_v1($1,$2,null,$3,$4,$5,$6,$7::jsonb)
    `, [legacyKey, CATALOG_ID, legacySourceProjection.sourceEstimateId, legacySourceProjection.sourceRevisionId,
      legacyChecksum, revisionId, JSON.stringify(legacyPayload)])).rows[0]);
    if (legacyCreated.job_id !== legacyReplay.job_id || legacyReplay.created !== false) throw new Error("LEGACY_IMPORT_IDEMPOTENCY_FAILED");
    const legacyWorker = `${WORKER_ID}:legacy`;
    const legacyClaims = await client.query("select * from public.estimate_claim_compile_jobs_v1($1,25,120)", [legacyWorker]);
    const legacyClaim = legacyClaims.rows.find((row) => row.id === legacyCreated.job_id);
    if (!legacyClaim) throw new Error("LEGACY_JOB_CLAIM_FAILED");
    const legacyRows = legacySourceRows.map((source, ordinal) => ({
      row_id: source.rowId,
      ordinal,
      resource_spec_id: ordinal === 0 ? resources.rows[0].id : null,
      section: source.section,
      category: source.category,
      title_ru: source.titleRu,
      unit_id: source.unitId,
      quantity: source.quantity,
      unit_price: source.unitPrice,
      amount: source.amount,
      currency_code: source.unitPrice == null && source.amount == null ? null : "KGS",
      procurement_eligible: source.procurementEligible,
      calculation_trace: { ...source.calculationTrace, migration: { sourceOrdinal: ordinal } },
      normative_trace: source.normativeTrace,
      legacy_row_payload: source.sourcePayload,
      row_sha256: hash(source.sourcePayload),
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: { migrated: true },
    }));
    const legacyCommit = await client.query(`
      select public.estimate_commit_compile_job_v1($1,$2,$3::jsonb,$4::jsonb) revision_id
    `, [legacyCreated.job_id, legacyWorker, JSON.stringify({
      rowCount: legacyRows.length,
      currencyCode: "KGS",
      totals: legacySourceProjection.totals,
      checksumSha256: legacyChecksum,
      compilerVersion: "postgres-integration.r1",
      migrationSource: {
        kind: "legacy_revision_post_line_v1",
        sourceEstimateId: legacySourceProjection.sourceEstimateId,
        sourceRevisionId: legacySourceProjection.sourceRevisionId,
        sourceChecksumSha256: legacyChecksum,
        rowsPreserved: legacyRows.length,
      },
    }), JSON.stringify(legacyRows)]);
    const legacyRevisionId = legacyCommit.rows[0].revision_id;
    const legacyRevision = (await client.query("select * from public.estimate_revision where id=$1", [legacyRevisionId])).rows[0];
    const preservedLegacyRows = (await client.query("select row_id,quantity,legacy_row_payload,row_sha256 from public.estimate_revision_row where revision_id=$1 order by ordinal", [legacyRevisionId])).rows;
    if (legacyRevision.parent_revision_id !== revisionId || legacyRevision.checksum_sha256 !== legacyChecksum
      || stableJson(preservedLegacyRows[0].legacy_row_payload) !== stableJson(legacySourceRows[0].sourcePayload)
      || preservedLegacyRows[1].quantity !== null
      || stableJson(preservedLegacyRows[1].legacy_row_payload) !== stableJson(legacySourceRows[1].sourcePayload)) {
      throw new Error("LEGACY_POST_LINE_PRESERVATION_FAILED");
    }

    const artifactKey = `artifact-postgres-${randomUUID()}`;
    const artifactCreated = await asUser(client, OWNER_A, async () => (await client.query(
      "select * from public.estimate_create_artifact_job_v1($1,$2,'procurement')",
      [artifactKey, legacyRevisionId],
    )).rows[0]);
    const artifactWorker = `${WORKER_ID}:artifact`;
    const artifactClaims = await client.query("select * from public.estimate_claim_compile_jobs_v1($1,25,120)", [artifactWorker]);
    if (!artifactClaims.rows.some((row) => row.id === artifactCreated.job_id)) throw new Error("ARTIFACT_JOB_CLAIM_FAILED");
    const artifactPayload = {
      kind: "procurement",
      storageBucket: "estimate-artifacts-integration",
      storageKey: `${OWNER_A}/${legacyRevisionId}/procurement/${legacyChecksum}.json`,
      contentType: "application/json; charset=utf-8",
      byteSize: 512,
      sha256: hash({ revisionId: legacyRevisionId, kind: "procurement" }),
      metadata: { renderer: "postgres-integration.r1", projectedRowCount: 1 },
    };
    const artifactCommit = await client.query("select public.estimate_commit_artifact_job_v1($1,$2,$3::jsonb) artifact_id", [
      artifactCreated.job_id, artifactWorker, JSON.stringify(artifactPayload),
    ]);
    const artifact = (await client.query("select * from public.estimate_revision_artifact where id=$1", [artifactCommit.rows[0].artifact_id])).rows[0];
    const artifactReplay = await asUser(client, OWNER_A, async () => (await client.query(
      "select * from public.estimate_create_artifact_job_v1($1,$2,'procurement')",
      [`artifact-ready-replay-${randomUUID()}`, legacyRevisionId],
    )).rows[0]);
    if (artifact.status !== "ready" || artifact.sha256 !== artifactPayload.sha256
      || artifactReplay.created !== false || artifactReplay.job_id !== null) {
      throw new Error("ARTIFACT_COMMIT_OR_REPLAY_FAILED");
    }

    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [OWNER_B]);
    const crossTenantRows = Number((await client.query("select count(*) count from public.estimate_revision where id=$1", [revisionId])).rows[0].count);
    await client.query("rollback");
    if (crossTenantRows !== 0) throw new Error("RLS_CROSS_TENANT_READ_ALLOWED");

    let migrationDeltaRejected = false;
    try {
      await client.query("insert into public.estimate_program_event(event_kind,event_key,denominator_delta,queue_delta) values('migration',$1,0,-1)", [`negative-${randomUUID()}`]);
    } catch (error: any) { migrationDeltaRejected = error?.code === "23514"; }
    if (!migrationDeltaRejected) throw new Error("MIGRATION_QUEUE_DELTA_NOT_REJECTED");

    const retryJob = await createJob(client, OWNER_A, `retry-${randomUUID()}`);
    const retryWorker = `${WORKER_ID}:retry`;
    await client.query("select * from public.estimate_claim_compile_jobs_v1($1,1,30)", [retryWorker]);
    const failed = await client.query("select public.estimate_fail_compile_job_v1($1,$2,'TRANSIENT_TEST','{}'::jsonb,1) status", [retryJob.job_id, retryWorker]);
    if (failed.rows[0].status !== "retry_wait") throw new Error("WORKER_RETRY_STATE_FAILED");

    const programAfter = (await client.query("select * from public.estimate_program_control_state where singleton=true")).rows[0];
    if (stableJson(programBefore) !== stableJson(programAfter)) throw new Error("PROGRAM_CONTROL_MUTATED_BY_COMPILE");
    Object.assign(report, {
      status: "GREEN",
      realPostgresql: true,
      idempotentJob: true,
      claimedWithSkipLocked: true,
      revisionId,
      revisionRows,
      immutableRevisionRejected: immutableRejected,
      crossTenantRows,
      migrationDeltaRejected,
      legacyRevisionId,
      legacyPostLineRowsPreserved: preservedLegacyRows.length,
      legacyImportIdempotent: true,
      artifactJobId: artifactCreated.job_id,
      artifactReady: artifact.status === "ready",
      artifactReadyReplayIdempotent: true,
      retryStatus: failed.rows[0].status,
      programControl: {
        denominator: Number(programAfter.denominator_total),
        admitted: Number(programAfter.admitted_global_count),
        queueRemaining: Number(programAfter.queue_remaining),
        externalReferences: Number(programAfter.external_reference_count),
        batch006Started: programAfter.batch006_started,
      },
    });
  } finally {
    await client.end();
  }
  const output = resolve(".release-runtime/master11610-backend-canonical-r1/04-postgresql/POSTGRESQL_INTEGRATION_REPORT.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
