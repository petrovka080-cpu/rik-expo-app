import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r9-wall-putty-backend-acceptance.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = process.env.R9_WALL_PUTTY_RELEASE_ID
  ?? "90d4d971-2725-5ccd-96be-209be6d253cc";
const SEARCH_RELEASE_ID = process.env.R9_WALL_PUTTY_SEARCH_RELEASE_ID
  ?? "06820680-b6b7-5341-b549-8ee2800b40c1";
const DEFINITION_ID = process.env.R9_WALL_PUTTY_DEFINITION_ID
  ?? "2f152050-1fb2-5759-9281-297ffc99a7ea";
const MASTER_SHA256 = "fe3b20f891c4bbda761f10939fbf991d28b9629516b8cbd372b01836b0eb7047";
const CATALOG_ID = "canonical-work:base:plaster_paint_interior_wall_putty_apply_standard";
const PORT = Number(process.env.R9_WALL_PUTTY_BACKEND_PORT ?? 8799);
const API_ROOT = `http://127.0.0.1:${PORT}/canonical-estimate`;
const TOKEN = "local-dev-runtime-token";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const ENVIRONMENT = "r9-wall-putty-isolated";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r9-wall-putty");
const MATERIAL_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:primary_material";
const WORKER_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:construction_worker_labor";
const OPERATOR_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:machine_operator_labor";
const LIFT_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:cargo_lift";
const TRUCK_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:flatbed_truck";
const SANDING_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:sanding_sheet";
const RAGS_ROW = "interior_finishes_wave_1:technology:plaster_paint_interior_wall_putty_apply_standard:row:rags";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_R9_ACCEPTANCE_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R9_ACCEPTANCE_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

function closeTo(actual: unknown, expected: number, code: string): void {
  const numeric = Number(actual);
  invariant(Number.isFinite(numeric) && Math.abs(numeric - expected) < 1e-8,
    `${code}:${String(actual)}:${expected}`);
}

async function response(path: string, init?: RequestInit): Promise<{ status: number; body: Json }> {
  const result = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  return { status: result.status, body: await result.json() as Json };
}

async function api(path: string, init?: RequestInit): Promise<Json> {
  const result = await response(path, init);
  invariant(result.status >= 200 && result.status < 300,
    `R9_ACCEPTANCE_HTTP:${path}:${result.status}:${JSON.stringify(result.body)}`);
  return result.body;
}

async function waitForJob(jobId: string): Promise<Json> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const job = await api(`/jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`R9_ACCEPTANCE_JOB_TIMEOUT:${jobId}`);
}

async function allRows(revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(`/revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(page.rows as Json[]));
    cursor = page.nextCursor == null ? null : String(page.nextCursor);
  } while (cursor);
  return rows;
}

function compilePayload(input: {
  idempotencyKey: string;
  parameters: Json;
  sourceRequestText: string;
}): Json {
  return {
    idempotencyKey: input.idempotencyKey,
    catalogId: CATALOG_ID,
    parameters: input.parameters,
    currencyCode: "KGS",
    priceSnapshotIds: [],
    sourceRequestText: input.sourceRequestText,
    primaryMeasureParameterId: "area_m2",
    organizationId: ORGANIZATION_ID,
  };
}

async function queueCompile(payload: Json): Promise<Json> {
  return api("/jobs/compile", { method: "POST", body: JSON.stringify(payload) });
}

async function successfulCompile(payload: Json): Promise<{ queued: Json; job: Json; revision: Json; rows: Json[] }> {
  const queued = await queueCompile(payload);
  const job = await waitForJob(String(queued.jobId));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `R9_ACCEPTANCE_COMPILE_NOT_SUCCEEDED:${JSON.stringify(job)}`);
  const revision = await api(`/revisions/${job.resultRevisionId}`);
  const rows = await allRows(String(job.resultRevisionId));
  return { queued, job, revision, rows };
}

async function rejectedCompile(payload: Json, code: string): Promise<Json> {
  const queued = await queueCompile(payload);
  const job = await waitForJob(String(queued.jobId));
  invariant(job.status === "failed" && !job.resultRevisionId && String(job.errorCode ?? "").trim(),
    `${code}:${JSON.stringify(job)}`);
  return job;
}

async function successfulRecalculate(input: {
  idempotencyKey: string;
  parentRevisionId: string;
  parameters: Json;
}): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const queued = await api("/jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: input.idempotencyKey,
      catalogId: CATALOG_ID,
      parentRevisionId: input.parentRevisionId,
      parameters: input.parameters,
      currencyCode: "KGS",
      priceSnapshotIds: [],
      rowOverrides: {},
      customRows: [],
      organizationId: ORGANIZATION_ID,
    }),
  });
  const job = await waitForJob(String(queued.jobId));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `R9_ACCEPTANCE_RECALCULATE_NOT_SUCCEEDED:${JSON.stringify(job)}`);
  const revision = await api(`/revisions/${job.resultRevisionId}`);
  return { job, revision, rows: await allRows(String(job.resultRevisionId)) };
}

async function artifact(input: {
  revisionId: string;
  kind: "professional_pdf" | "procurement";
  idempotencyKey: string;
}): Promise<{ metadata: Json; bytes: Buffer }> {
  const publicPath = input.kind === "professional_pdf" ? "pdf" : "procurement";
  const created = await api(`/revisions/${input.revisionId}/artifacts/${publicPath}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey: input.idempotencyKey,
      ...(input.kind === "professional_pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (created.jobId) {
    const job = await waitForJob(String(created.jobId));
    invariant(job.status === "succeeded", `R9_ACCEPTANCE_ARTIFACT_JOB:${input.kind}:${JSON.stringify(job)}`);
  }
  const suffix = input.kind === "professional_pdf" ? "?documentProfile=professional_v1" : "";
  const metadata = await api(`/revisions/${input.revisionId}/artifacts/${publicPath}${suffix}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `R9_ACCEPTANCE_ARTIFACT_NOT_READY:${input.kind}:${JSON.stringify(metadata)}`);
  const downloaded = await fetch(metadata.signedUrl, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  invariant(downloaded.ok, `R9_ACCEPTANCE_ARTIFACT_DOWNLOAD:${input.kind}:${downloaded.status}`);
  const bytes = Buffer.from(await downloaded.arrayBuffer());
  invariant(bytes.length === Number(metadata.byteSize) && sha256(bytes) === metadata.sha256,
    `R9_ACCEPTANCE_ARTIFACT_IDENTITY:${input.kind}`);
  return { metadata, bytes };
}

async function startServer(env: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error(
      `R9_ACCEPTANCE_BACKEND_READY_TIMEOUT:${logs.join("").slice(-3000)}`,
    )), 45_000);
    const onText = (chunk: Buffer) => {
      const value = chunk.toString("utf8");
      logs.push(value);
      if (value.includes('"status":"READY"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (exitCode) => {
      clearTimeout(timeout);
      rejectReady(new Error(`R9_ACCEPTANCE_BACKEND_EARLY_EXIT:${exitCode}:${logs.join("").slice(-3000)}`));
    });
  });
  await ready;
  return { child, logs };
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

function assertRows(rows: Json[], area: 100 | 120): void {
  const expected = area === 100
    ? new Map([[MATERIAL_ROW, 70], [WORKER_ROW, 12.1], [OPERATOR_ROW, 0.01], [LIFT_ROW, 0.01],
      [TRUCK_ROW, 0.02], [SANDING_ROW, 0.0003], [RAGS_ROW, 0.1]])
    : new Map([[MATERIAL_ROW, 84], [WORKER_ROW, 14.52], [OPERATOR_ROW, 0.012], [LIFT_ROW, 0.012],
      [TRUCK_ROW, 0.024], [SANDING_ROW, 0.00036], [RAGS_ROW, 0.12]]);
  invariant(rows.length === expected.size, `R9_ACCEPTANCE_ROW_COUNT:${area}:${rows.length}`);
  for (const [rowId, quantity] of expected) {
    const row = rows.find((candidate) => candidate.rowId === rowId);
    invariant(row, `R9_ACCEPTANCE_ROW_MISSING:${area}:${rowId}`);
    closeTo(row.quantity, quantity, `R9_ACCEPTANCE_QUANTITY:${area}:${rowId}`);
    invariant(row.unitPrice == null && row.amount == null && row.currencyCode == null,
      `R9_ACCEPTANCE_UNKNOWN_PRICE_NOT_NULL:${area}:${rowId}`);
  }
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const runId = randomUUID();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r9-wall-putty-backend-acceptance" });
  await client.connect();
  let firstServer: { child: ChildProcess; logs: string[] } | null = null;
  let secondServer: { child: ChildProcess; logs: string[] } | null = null;
  try {
    const release = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0] as Json;
    const searchRelease = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    invariant(release?.status === "prepared" && release.activated_at == null,
      "R9_ACCEPTANCE_RELEASE_NOT_PREPARED");
    invariant(searchRelease?.status === "draft" && searchRelease.activated_at == null,
      "R9_ACCEPTANCE_SEARCH_NOT_DRAFT");
    invariant(release.metadata?.masterSha256 === MASTER_SHA256
      && searchRelease.metadata?.masterSha256 === MASTER_SHA256,
    "R9_ACCEPTANCE_MASTER_PROVENANCE_DRIFT");
    const manifest = (await client.query(`select definition_version_id,approved_template_baseline_id
      from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2`,
    [RELEASE_ID, CATALOG_ID])).rows[0] as Json;
    invariant(String(manifest?.definition_version_id) === DEFINITION_ID,
      "R9_ACCEPTANCE_DEFINITION_IDENTITY_DRIFT");
    const baseline = (await client.query(`select input_values,input_classification
      from public.estimate_approved_template_baseline where id=$1`,
    [manifest.approved_template_baseline_id])).rows[0] as Json;
    const fixture = baseline.input_values as Json;
    invariant(Object.keys(fixture).length === 16
      && Object.values(baseline.input_classification as Json).every((value) => value === "VALIDATION_FIXTURE"),
    "R9_ACCEPTANCE_FIXTURE_CLASSIFICATION_DRIFT");

    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, ORGANIZATION_ID, RELEASE_ID, SEARCH_RELEASE_ID, expiresAt,
      release.source_commit, release.source_tree, "runR9WallPuttyBackendAcceptance",
    ]);
    const auditLog = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    const env = {
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: SEARCH_RELEASE_ID,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: RELEASE_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: SEARCH_RELEASE_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      CANONICAL_ESTIMATE_LOCAL_PORT: String(PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "DETERMINISTIC_FIXTURE",
      CANONICAL_ESTIMATE_TEST_ORGANIZATION_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_LOCAL_ARTIFACT_SECRET: sha256(`${CONTRACT}:artifact-secret`),
    };

    firstServer = await startServer(env);
    const catalog = await api(`/catalog/${encodeURIComponent(CATALOG_ID)}?releaseId=${RELEASE_ID}`);
    const catalogItem = catalog.item as Json;
    const catalogParameters = catalogItem?.parameterSchema ?? [];
    invariant(catalogItem?.contentAdmission?.definitionVersionId === DEFINITION_ID
      && Array.isArray(catalogParameters) && catalogParameters.length === 16
      && catalogParameters.every((parameter: Json) => parameter.defaultValue == null),
    `R9_ACCEPTANCE_CATALOG_SCHEMA:${JSON.stringify(catalog).slice(0, 2000)}`);

    const missingJob = await rejectedCompile(compilePayload({
      idempotencyKey: `${runId}:missing-confirmations`,
      parameters: { area_m2: 100 },
      sourceRequestText: "Шпаклёвка стен 100 м² без обязательных подтверждений",
    }), "R9_ACCEPTANCE_MISSING_INPUT_NOT_REJECTED");
    const invalidJob = await rejectedCompile(compilePayload({
      idempotencyKey: `${runId}:invalid-applicability`,
      parameters: { ...fixture, application_temperature_confirmed: false },
      sourceRequestText: "Шпаклёвка стен 100 м² при неподтверждённой температуре применения",
    }), "R9_ACCEPTANCE_INVALID_APPLICABILITY_NOT_REJECTED");

    const positivePayload = compilePayload({
      idempotencyKey: `${runId}:wall-putty-100`,
      parameters: fixture,
      sourceRequestText: "Третья шпаклёвка стен CT 127, 100 м², расход 0,7 кг/м², слой 2 мм",
    });
    const at100 = await successfulCompile(positivePayload);
    invariant(at100.revision.releaseId === RELEASE_ID
      && at100.revision.definitionVersionId === DEFINITION_ID
      && at100.revision.catalogId === CATALOG_ID,
    "R9_ACCEPTANCE_REVISION_100_IDENTITY");
    assertRows(at100.rows, 100);
    const idempotentQueued = await queueCompile(positivePayload);
    invariant(idempotentQueued.jobId === at100.queued.jobId,
      `R9_ACCEPTANCE_IDEMPOTENCY_DRIFT:${idempotentQueued.jobId}:${at100.queued.jobId}`);

    const at120 = await successfulRecalculate({
      idempotencyKey: `${runId}:wall-putty-120`,
      parentRevisionId: String(at100.revision.revisionId),
      parameters: { area_m2: 120 },
    });
    invariant(at120.revision.parentRevisionId === at100.revision.revisionId
      && at120.revision.releaseId === RELEASE_ID,
    "R9_ACCEPTANCE_REVISION_120_LINEAGE");
    assertRows(at120.rows, 120);

    const history = await api(`/revisions?catalogId=${encodeURIComponent(CATALOG_ID)}&limit=100`);
    const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
    invariant(historyIds.includes(String(at100.revision.revisionId))
      && historyIds.includes(String(at120.revision.revisionId))
      && historyIds.indexOf(String(at120.revision.revisionId)) < historyIds.indexOf(String(at100.revision.revisionId)),
    "R9_ACCEPTANCE_HISTORY_LINEAGE_MISSING");

    const pdf = await artifact({
      revisionId: String(at120.revision.revisionId),
      kind: "professional_pdf",
      idempotencyKey: `${runId}:professional-pdf`,
    });
    invariant(pdf.metadata.releaseId === RELEASE_ID
      && pdf.metadata.revisionId === at120.revision.revisionId
      && pdf.metadata.contentType === "application/pdf"
      && pdf.bytes.subarray(0, 5).toString("ascii") === "%PDF-",
    "R9_ACCEPTANCE_PDF_CONTRACT");

    const procurement = await artifact({
      revisionId: String(at120.revision.revisionId),
      kind: "procurement",
      idempotencyKey: `${runId}:procurement`,
    });
    const procurementJson = JSON.parse(procurement.bytes.toString("utf8")) as Json;
    const procurementMaterial = (procurementJson.rows as Json[]).find((row) => row.rowId === MATERIAL_ROW);
    invariant(procurementJson.revisionId === at120.revision.revisionId
      && procurementJson.releaseId === RELEASE_ID && procurementMaterial,
    "R9_ACCEPTANCE_PROCUREMENT_IDENTITY");
    closeTo(procurementMaterial.netQuantity, 84, "R9_ACCEPTANCE_PROCUREMENT_NET");
    closeTo(procurementMaterial.grossQuantity, 84, "R9_ACCEPTANCE_PROCUREMENT_GROSS");
    closeTo(procurementMaterial.procurementPackageSize, 20, "R9_ACCEPTANCE_PROCUREMENT_PACKAGE");
    closeTo(procurementMaterial.procurementQuantity, 100, "R9_ACCEPTANCE_PROCUREMENT_QUANTITY");
    closeTo(procurementMaterial.quantity, 100, "R9_ACCEPTANCE_PROCUREMENT_DISPLAY_QUANTITY");
    invariant(procurementMaterial.unitPrice == null && procurementMaterial.amount == null,
      "R9_ACCEPTANCE_PROCUREMENT_UNKNOWN_PRICE_NOT_NULL");

    const persistedRevisionId = String(at120.revision.revisionId);
    await stopServer(firstServer.child);
    firstServer = null;
    secondServer = await startServer(env);
    const reopened = await api(`/revisions/${persistedRevisionId}`);
    const reopenedRows = await allRows(persistedRevisionId);
    const reopenedProcurement = await api(`/revisions/${persistedRevisionId}/artifacts/procurement`);
    invariant(reopened.revisionId === persistedRevisionId
      && reopened.parentRevisionId === at100.revision.revisionId
      && reopenedProcurement.sha256 === procurement.metadata.sha256,
    "R9_ACCEPTANCE_REOPEN_IDENTITY");
    assertRows(reopenedRows, 120);
    await stopServer(secondServer.child);
    secondServer = null;

    const databaseAudit = (await client.query(`select
        (select count(*)::int from public.estimate_compile_job
          where target_release_id=$1 and idempotency_key like $2 and status='succeeded') succeeded_jobs,
        (select count(*)::int from public.estimate_compile_job
          where target_release_id=$1 and idempotency_key like $2 and status='failed') failed_jobs,
        (select count(*)::int from public.estimate_revision
          where release_id=$1 and id=any($3::uuid[])) persisted_revisions,
        (select count(*)::int from public.estimate_revision_artifact
          where revision_id=$4 and status='ready') ready_artifacts`, [
      RELEASE_ID, `${runId}%`, [at100.revision.revisionId, at120.revision.revisionId], at120.revision.revisionId,
    ])).rows[0] as Json;
    invariant(Number(databaseAudit.succeeded_jobs) === 4
      && Number(databaseAudit.failed_jobs) === 2
      && Number(databaseAudit.persisted_revisions) === 2
      && Number(databaseAudit.ready_artifacts) === 2,
    `R9_ACCEPTANCE_DATABASE_AUDIT:${JSON.stringify(databaseAudit)}`);

    const evidence = {
      schemaVersion: `${CONTRACT}.evidence.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: GLOBAL_STATUS,
      runId,
      release: { id: RELEASE_ID, status: release.status, activatedAt: release.activated_at ?? null },
      searchRelease: { id: SEARCH_RELEASE_ID, status: searchRelease.status, activatedAt: searchRelease.activated_at ?? null },
      definitionId: DEFINITION_ID,
      targetCatalogId: CATALOG_ID,
      parameterSchema: { count: catalogParameters.length, runtimeDefaults: 0 },
      negativeCases: [
        { case: "missing_confirmations", jobId: missingJob.jobId, errorCode: missingJob.errorCode },
        { case: "invalid_applicability", jobId: invalidJob.jobId, errorCode: invalidJob.errorCode },
      ],
      at100: {
        revisionId: at100.revision.revisionId,
        rowCount: at100.rows.length,
        materialNetKg: 70,
        constructionWorkerManHours: 12.1,
        unknownPriceRows: at100.rows.filter((row) => row.unitPrice == null).length,
      },
      at120: {
        revisionId: at120.revision.revisionId,
        parentRevisionId: at100.revision.revisionId,
        rowCount: at120.rows.length,
        materialNetKg: 84,
        unknownPriceRows: at120.rows.filter((row) => row.unitPrice == null).length,
      },
      history: { containsExactLineage: true, observedRevisionCount: historyIds.length },
      pdf: { byteSize: pdf.bytes.length, sha256: pdf.metadata.sha256, pageCount: pdf.metadata.metadata?.pageCount ?? null },
      procurement: {
        byteSize: procurement.bytes.length,
        sha256: procurement.metadata.sha256,
        selectedRows: procurementJson.selectedRowCount,
        materialNetKg: 84,
        materialGrossKg: 84,
        packageKg: 20,
        procurementKg: 100,
        unitPrice: null,
      },
      restartReopen: { revisionId: persistedRevisionId, rows: reopenedRows.length, artifactSha256Stable: true },
      databaseAudit,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      androidRestartPerformed: false,
      status: "GREEN_R9_WALL_PUTTY_BACKEND_PDF_PROCUREMENT_REOPEN_ACCEPTED_NOT_ACTIVE",
    };
    const sealed = { ...evidence, evidenceSha256: sha256(JSON.stringify(evidence)) };
    atomicJson(resolve(OUTPUT_ROOT, `backend-acceptance-${runId}.json`), sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    if (firstServer) await stopServer(firstServer.child);
    if (secondServer) await stopServer(secondServer.child);
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
