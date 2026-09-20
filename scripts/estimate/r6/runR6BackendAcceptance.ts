import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.backend-acceptance.v1";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const PORT = Number(process.env.R6_BACKEND_ACCEPTANCE_PORT ?? 8796);
const API_ROOT = `http://127.0.0.1:${PORT}/canonical-estimate`;
const TOKEN = "local-dev-runtime-token";
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const ENVIRONMENT = "r6-asphalt-gabion-isolated";
const ASPHALT_CATALOG_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_install_standard";
const GABION_CATALOG_ID = "canonical-work:expanded:gabion_wall";
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/backend-acceptance");
const ASPHALT_MIX_ROW = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_install_standard_professional_expanded_v1:r555:2";
const ASPHALT_TACK_ROW = "work_catalog_roadworks_paving_roads_landscape_interior_asphalt_install_standard_professional_expanded_v1:r555:1";
const GABION_EXPECTED_ROWS = Object.freeze({
  gabion_drainage_pipe_lm: { at80: 80, at100: 100 },
  gabion_base_preparation_m2: { at80: 68, at100: 85 },
  gabion_backfill_compaction_m3: { at80: 36, at100: 45 },
  gabion_tie_wire_spacers_set: { at80: 6, at100: 8 },
});

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

function numeric(value: unknown): number {
  const parsed = Number(value);
  invariant(Number.isFinite(parsed), `R6_ACCEPTANCE_NOT_NUMERIC:${String(value)}`);
  return parsed;
}

function closeTo(actual: unknown, expected: number, code: string): void {
  invariant(Math.abs(numeric(actual) - expected) < 1e-8, `${code}:${String(actual)}:${expected}`);
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
  invariant(result.status >= 200 && result.status < 300, `R6_ACCEPTANCE_HTTP:${path}:${result.status}:${JSON.stringify(result.body)}`);
  return result.body;
}

async function waitForJob(jobId: string): Promise<Json> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const job = await api(`/jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`R6_ACCEPTANCE_JOB_${job.status}:${jobId}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`R6_ACCEPTANCE_JOB_TIMEOUT:${jobId}`);
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

async function compile(input: {
  idempotencyKey: string;
  catalogId: string;
  parameters: Json;
  sourceRequestText: string;
  primaryMeasureParameterId: string;
}): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const queued = await api("/jobs/compile", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      currencyCode: "KGS",
      priceSnapshotIds: [],
      organizationId: ORGANIZATION_ID,
    }),
  });
  const job = await waitForJob(String(queued.jobId));
  const revision = await api(`/revisions/${job.resultRevisionId}`);
  const rows = await allRows(String(job.resultRevisionId));
  return { job, revision, rows };
}

async function recalculate(input: {
  idempotencyKey: string;
  catalogId: string;
  parentRevisionId: string;
  parameters: Json;
  rowOverrides?: Json;
}): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const queued = await api("/jobs/recalculate", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      currencyCode: "KGS",
      priceSnapshotIds: [],
      rowOverrides: input.rowOverrides ?? {},
      customRows: [],
      organizationId: ORGANIZATION_ID,
    }),
  });
  const job = await waitForJob(String(queued.jobId));
  const revision = await api(`/revisions/${job.resultRevisionId}`);
  const rows = await allRows(String(job.resultRevisionId));
  return { job, revision, rows };
}

async function artifact(revisionId: string, kind: "pdf" | "procurement", idempotencyKey: string): Promise<Json> {
  const created = await api(`/revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({ idempotencyKey, ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}) }),
  });
  if (created.jobId) await waitForJob(String(created.jobId));
  const metadata = await api(`/revisions/${revisionId}/artifacts/${kind}${kind === "pdf" ? "?documentProfile=professional_v1" : ""}`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `R6_ACCEPTANCE_ARTIFACT_NOT_READY:${revisionId}:${kind}`);
  const downloaded = await fetch(metadata.signedUrl, { headers: { authorization: `Bearer ${TOKEN}` } });
  invariant(downloaded.ok, `R6_ACCEPTANCE_ARTIFACT_DOWNLOAD:${kind}:${downloaded.status}`);
  const bytes = Buffer.from(await downloaded.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `R6_ACCEPTANCE_ARTIFACT_SHA:${kind}`);
  return { kind, byteSize: bytes.length, sha256: metadata.sha256, contentType: metadata.contentType };
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
    const timeout = setTimeout(() => rejectReady(new Error(`R6_ACCEPTANCE_BACKEND_READY_TIMEOUT:${logs.join("").slice(-2000)}`)), 45_000);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(new Error(`R6_ACCEPTANCE_BACKEND_EARLY_EXIT:${code}:${logs.join("").slice(-3000)}`));
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

async function explicitFixture(client: Client, releaseId: string, catalogId: string): Promise<Json> {
  const result = await client.query(`select baseline.input_values,
      jsonb_agg(parameter.parameter_id order by parameter.ordinal)
        filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT') user_parameter_ids
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=$2
    group by baseline.input_values`, [releaseId, catalogId]);
  const row = result.rows[0] as Json | undefined;
  invariant(row && Array.isArray(row.user_parameter_ids), `R6_ACCEPTANCE_FIXTURE_MISSING:${catalogId}`);
  const parameters = Object.fromEntries(row.user_parameter_ids.flatMap((parameterId: string) =>
    Object.prototype.hasOwnProperty.call(row.input_values, parameterId)
      ? [[parameterId, row.input_values[parameterId]]]
      : []));
  invariant(Object.keys(parameters).length > 0, `R6_ACCEPTANCE_EXPLICIT_FIXTURE_EMPTY:${catalogId}`);
  return parameters;
}

async function main(): Promise<void> {
  invariant(existsSync(CURRENT_RELEASE_PATH), "R6_ACCEPTANCE_CURRENT_RELEASE_MISSING");
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.owner === "R4_A13_6_ASPHALT_GABION_OWNER", "R6_ACCEPTANCE_CURRENT_RELEASE_NOT_R6");
  const releaseId = String(current.definitionReleaseId);
  const searchReleaseId = String(current.searchReleaseId);
  const runId = randomUUID();
  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-backend-acceptance" });
  await client.connect();
  let firstServer: { child: ChildProcess; logs: string[] } | null = null;
  let secondServer: { child: ChildProcess; logs: string[] } | null = null;
  try {
    const release = (await client.query(`select source_commit,source_tree,status from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json;
    invariant(release?.status === "prepared", "R6_ACCEPTANCE_RELEASE_NOT_PREPARED");
    const capabilityId = randomUUID();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,source_tree,issued_by)
      values($1,$2,$3,$4,$5,$6,'estimate_candidate_admission_r3',$7,$8,$9)`, [
      capabilityId, ENVIRONMENT, ORGANIZATION_ID, releaseId, searchReleaseId, expiresAt,
      release.source_commit, release.source_tree, "runR6BackendAcceptance",
    ]);
    const asphaltFixture = await explicitFixture(client, releaseId, ASPHALT_CATALOG_ID);
    const gabionFixture = await explicitFixture(client, releaseId, GABION_CATALOG_ID);
    const auditLog = resolve(OUTPUT_ROOT, `http-${runId}.jsonl`);
    const env = {
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: runId,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: ENVIRONMENT,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: expiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: release.source_commit,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SOURCE_HEAD: release.source_commit,
      R45_RUNTIME_SOURCE_TREE: release.source_tree,
      R45_RUNTIME_SPEC_SHA256: current.definitionSnapshotSha256,
      CANONICAL_ESTIMATE_LOCAL_PORT: String(PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: auditLog,
      CANONICAL_ESTIMATE_LOCAL_AUTH_MODE: "DETERMINISTIC_FIXTURE",
    };

    firstServer = await startServer(env);
    const hidden = await compile({
      idempotencyKey: `${runId}:asphalt-missing`,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: { area_m2: 500 },
      sourceRequestText: "Устройство асфальтового покрытия, площадь 500 м²",
      primaryMeasureParameterId: "area_m2",
    });
    // R6 keeps independently calculable area-scoped work/document rows. It
    // must not materialize the mix or tack-coat quantities that depend on the
    // absent thickness/density/waste/rate inputs.
    invariant(hidden.rows.length > 0
      && !hidden.rows.some((row) => row.rowId === ASPHALT_MIX_ROW || row.rowId === ASPHALT_TACK_ROW),
    `R6_ACCEPTANCE_HIDDEN_INPUT_CREATED_DEPENDENT_ROWS:${hidden.rows.length}`);
    invariant((hidden.revision.preliminaryNeeds ?? []).length > 0, "R6_ACCEPTANCE_HIDDEN_INPUT_DID_NOT_ASK_QUESTIONS");

    const asphaltParameters = {
      ...asphaltFixture,
      area_m2: 500,
      thickness_mm: 50,
      density_t_m3: 2.4,
      waste_factor: 1.03,
      tack_coat_l_m2: 0.3,
    };
    const asphaltIdempotencyKey = `${runId}:asphalt-positive`;
    const asphalt = await compile({
      idempotencyKey: asphaltIdempotencyKey,
      catalogId: ASPHALT_CATALOG_ID,
      parameters: asphaltParameters,
      sourceRequestText: "Устройство асфальтового покрытия 500 м², слой 50 мм, плотность 2,4 т/м³, коэффициент 1,03, эмульсия 0,3 л/м²",
      primaryMeasureParameterId: "area_m2",
    });
    invariant(asphalt.revision.releaseId === releaseId && asphalt.revision.catalogId === ASPHALT_CATALOG_ID,
      "R6_ACCEPTANCE_ASPHALT_REVISION_IDENTITY");
    closeTo(asphalt.rows.find((row) => row.rowId === ASPHALT_MIX_ROW)?.quantity, 61.8, "R6_ACCEPTANCE_ASPHALT_MIX_500");
    closeTo(asphalt.rows.find((row) => row.rowId === ASPHALT_TACK_ROW)?.quantity, 150, "R6_ACCEPTANCE_ASPHALT_TACK_500");

    const conflict = await response("/jobs/compile", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: asphaltIdempotencyKey,
        catalogId: ASPHALT_CATALOG_ID,
        currencyCode: "KGS",
        parameters: { ...asphaltParameters, area_m2: 501 },
        priceSnapshotIds: [],
        sourceRequestText: "Конфликтующий повтор",
        primaryMeasureParameterId: "area_m2",
        organizationId: ORGANIZATION_ID,
      }),
    });
    invariant(conflict.status === 409 && conflict.body?.error?.code === "IDEMPOTENCY_PAYLOAD_CONFLICT",
      `R6_ACCEPTANCE_HTTP_409:${conflict.status}:${JSON.stringify(conflict.body)}`);

    const asphaltChild = await recalculate({
      idempotencyKey: `${runId}:asphalt-child`,
      catalogId: ASPHALT_CATALOG_ID,
      parentRevisionId: String(asphalt.revision.revisionId),
      parameters: { area_m2: 600 },
      rowOverrides: {
        [ASPHALT_MIX_ROW]: {
          unitPrice: "125.50",
          provenance: { kind: "manual", reason: "R6 проверка сохранения ручной цены" },
        },
      },
    });
    invariant(asphaltChild.revision.parentRevisionId === asphalt.revision.revisionId,
      "R6_ACCEPTANCE_ASPHALT_CHILD_PARENT");
    const childMix = asphaltChild.rows.find((row) => row.rowId === ASPHALT_MIX_ROW);
    closeTo(childMix?.quantity, 74.16, "R6_ACCEPTANCE_ASPHALT_MIX_600");
    closeTo(asphaltChild.rows.find((row) => row.rowId === ASPHALT_TACK_ROW)?.quantity, 180, "R6_ACCEPTANCE_ASPHALT_TACK_600");
    closeTo(childMix?.unitPrice, 125.5, "R6_ACCEPTANCE_ASPHALT_MANUAL_PRICE");
    const artifacts = await Promise.all([
      artifact(String(asphaltChild.revision.revisionId), "pdf", `${runId}:pdf`),
      artifact(String(asphaltChild.revision.revisionId), "procurement", `${runId}:procurement`),
    ]);

    const gabionUnknown = await compile({
      idempotencyKey: `${runId}:gabion-missing-condition`,
      catalogId: GABION_CATALOG_ID,
      parameters: { length_m: 80, height_m: 4, thickness_m: 0.45 },
      sourceRequestText: "Подпорная конструкция длиной 80 м без выбранного типа",
      primaryMeasureParameterId: "length_m",
    });
    invariant([...Object.keys(GABION_EXPECTED_ROWS)].every((rowId) => !gabionUnknown.rows.some((row) => row.rowId === rowId)),
      "R6_ACCEPTANCE_GABION_UNKNOWN_CREATED_PAYABLE_ROWS");
    invariant((gabionUnknown.revision.preliminaryNeeds ?? []).some((need: Json) => need.missingParameterIds?.includes("is_gabion")),
      "R6_ACCEPTANCE_GABION_UNKNOWN_DID_NOT_ASK_CONDITION");

    const gabion = await compile({
      idempotencyKey: `${runId}:gabion-true`,
      catalogId: GABION_CATALOG_ID,
      parameters: { ...gabionFixture, is_gabion: true, length_m: 80, height_m: 4, thickness_m: 0.45 },
      sourceRequestText: "Габионная стена длиной 80 м, высотой 4 м, толщиной 0,45 м",
      primaryMeasureParameterId: "length_m",
    });
    for (const [rowId, values] of Object.entries(GABION_EXPECTED_ROWS)) {
      closeTo(gabion.rows.find((row) => row.rowId === rowId)?.quantity, values.at80, `R6_ACCEPTANCE_GABION_80:${rowId}`);
    }
    const gabionChild = await recalculate({
      idempotencyKey: `${runId}:gabion-length-child`,
      catalogId: GABION_CATALOG_ID,
      parentRevisionId: String(gabion.revision.revisionId),
      parameters: { length_m: 100 },
    });
    for (const [rowId, values] of Object.entries(GABION_EXPECTED_ROWS)) {
      closeTo(gabionChild.rows.find((row) => row.rowId === rowId)?.quantity, values.at100, `R6_ACCEPTANCE_GABION_100:${rowId}`);
    }
    const gabionFalse = await recalculate({
      idempotencyKey: `${runId}:gabion-false-child`,
      catalogId: GABION_CATALOG_ID,
      parentRevisionId: String(gabionChild.revision.revisionId),
      parameters: { is_gabion: false },
    });
    invariant([...Object.keys(GABION_EXPECTED_ROWS)].every((rowId) => !gabionFalse.rows.some((row) => row.rowId === rowId)),
      "R6_ACCEPTANCE_GABION_FALSE_ROWS_ACTIVE");

    const persistedRevisionId = String(asphaltChild.revision.revisionId);
    await stopServer(firstServer.child);
    firstServer = null;
    secondServer = await startServer(env);
    const afterRestart = await api(`/revisions/${persistedRevisionId}`);
    const afterRestartRows = await allRows(persistedRevisionId);
    invariant(afterRestart.revisionId === persistedRevisionId && afterRestart.parentRevisionId === asphalt.revision.revisionId,
      "R6_ACCEPTANCE_RESTART_REVISION_IDENTITY");
    const reopenedMix = afterRestartRows.find((row) => row.rowId === ASPHALT_MIX_ROW);
    invariant(reopenedMix, "R6_ACCEPTANCE_RESTART_MIX_ROW_MISSING");
    closeTo(reopenedMix?.quantity, 74.16, "R6_ACCEPTANCE_RESTART_MIX_QUANTITY");
    closeTo(reopenedMix?.unitPrice, 125.5, "R6_ACCEPTANCE_RESTART_MANUAL_PRICE");
    await stopServer(secondServer.child);
    secondServer = null;

    const databaseAudit = (await client.query(`select
        count(*) filter(where operation='compile' and status='succeeded')::int succeeded_compile_jobs,
        count(*) filter(where operation='recalculate' and status='succeeded')::int succeeded_recalculate_jobs
      from public.estimate_compile_job where target_release_id=$1 and idempotency_key like $2`, [releaseId, `${runId}%`])).rows[0] as Json;
    const evidence = {
      schemaVersion: `${CONTRACT}.evidence.v1`,
      capturedAt: new Date().toISOString(),
      runId,
      releaseId,
      searchReleaseId,
      inventory: { asphaltCatalogRecords: 63, asphaltTechnologyOwners: 44, asphaltAliases: 19, currentDefinitionEntries: 46 },
      missingAsphalt: {
        revisionId: hidden.revision.revisionId,
        independentCalculatedRows: hidden.rows.length,
        forbiddenMixOrTackRows: 0,
        preliminaryNeeds: hidden.revision.preliminaryNeeds.length,
      },
      asphalt500: { revisionId: asphalt.revision.revisionId, mixT: 61.8, tackCoatL: 150 },
      http409: { status: conflict.status, code: conflict.body.error.code },
      asphalt600: { revisionId: persistedRevisionId, parentRevisionId: asphalt.revision.revisionId, mixT: 74.16, tackCoatL: 180, manualUnitPrice: 125.5 },
      artifacts,
      gabion: {
        unknownRevisionId: gabionUnknown.revision.revisionId,
        true80RevisionId: gabion.revision.revisionId,
        true100RevisionId: gabionChild.revision.revisionId,
        falseRevisionId: gabionFalse.revision.revisionId,
        expectedRows: GABION_EXPECTED_ROWS,
      },
      restartRead: { revisionId: afterRestart.revisionId, rowCount: afterRestartRows.length, manualUnitPrice: reopenedMix.unitPrice },
      databaseAudit,
      httpAuditLog: auditLog,
      serverStarts: 2,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      status: "GREEN_R6_BACKEND_COMPILE_SAVE_READ_RESTART_ARTIFACT_ACCEPTANCE",
    };
    const sealed = { ...evidence, evidenceSha256: sha256(JSON.stringify(evidence)) };
    const output = resolve(OUTPUT_ROOT, `R6_BACKEND_ACCEPTANCE_${runId}.json`);
    atomicJson(output, sealed);
    process.stdout.write(`${JSON.stringify({ ...sealed, evidencePath: output }, null, 2)}\n`);
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
