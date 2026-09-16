import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  compileFormworkFramiXlifeProjectKitR1,
  FORMWORK_FRAMI_XLIFE_PILE_CAP_PROJECT_SCHEDULES,
  FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS,
  FORMWORK_FRAMI_XLIFE_SOURCE_ID,
  FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID,
  formworkFramiXlifePileCapAcceptanceInputR1,
} from "../../src/lib/estimate/v4/formworkFramiXlifeProjectKitR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.formwork-frami-xlife-pile-cap-distinct-project-family.backend-acceptance.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md");
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/formwork-frami-xlife-pile-cap-distinct-project-e4-api/acceptance.json",
);
const RELEASE_ID = "592dce0c-a06d-5424-81ed-e7e2d587be3f";
const SEARCH_RELEASE_ID = "aaa7f4aa-c5b3-5f5c-a11f-dcfe5f8e7261";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const MEASURED_AREA_ROW_ID = "information:formwork:measured-contact-area";
const TARGETS = FORMWORK_FRAMI_XLIFE_PILE_CAP_TARGETS.filter(
  (target) => target.contextKey !== "wet_zone",
);

const EXPECTED_DEFINITION_IDS: Readonly<Record<string, string>> = Object.freeze({
  standard: "d62108ca-4805-5a93-809d-da7435c88486",
  high_load: "49de0f29-e838-5e36-832a-ac5b2672d910",
  large_area: "ae2b1d48-06d6-557d-bc43-01058b3007f6",
  repair: "57a30599-a7ab-59cc-b5e0-e30b6a651571",
  small_area: "9d5acb19-9a7f-5146-abf8-45bf45280374",
  technical_room: "345af815-b40b-5a13-9467-c79bcdf6f874",
});

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function closeTo(actual: unknown, expected: unknown, code: string): void {
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  invariant(Number.isFinite(actualNumber)
    && Number.isFinite(expectedNumber)
    && Math.abs(actualNumber - expectedNumber) < 1e-8,
  `${code}:${String(actual)}:${String(expected)}`);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "FRAMI_PILE_CAP_DISTINCT_E4", stage, ...details })}\n`);
}

function resourceSnapshot(): Json {
  const disk = statfsSync(resolve("."));
  return {
    capturedAt: new Date().toISOString(),
    availableMemoryBytes: freemem(),
    availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
  };
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_FRAMI_PILE_CAP_E4_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_FRAMI_PILE_CAP_E4_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
  invariant(new URL(BACKEND).hostname === "127.0.0.1" && new URL(PROVIDER).hostname === "127.0.0.1",
    "STOP_FRAMI_PILE_CAP_E4_NON_LOCAL_RUNTIME");
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "FRAMI_PILE_CAP_E4_PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "FRAMI_PILE_CAP_E4_CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `FRAMI_PILE_CAP_E4_LOGIN_HTTP_${response.status}`);
  return `Bearer ${body.access_token}`;
}

async function response(
  authorization: string,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Json }> {
  const result = await fetch(`${BACKEND}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(120_000),
  });
  return { status: result.status, body: await result.json().catch(() => ({})) as Json };
}

async function api(authorization: string, path: string, init?: RequestInit): Promise<Json> {
  const result = await response(authorization, path, init);
  invariant(result.status >= 200 && result.status < 300,
    `FRAMI_PILE_CAP_E4_HTTP:${path}:${result.status}:${JSON.stringify(result.body).slice(0, 2_000)}`);
  return result.body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  invariant(/^[0-9a-f-]{36}$/iu.test(jobId), `FRAMI_PILE_CAP_E4_JOB_ID_INVALID:${jobId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`FRAMI_PILE_CAP_E4_JOB_TIMEOUT:${jobId}`);
}

async function allRows(authorization: string, revisionId: string): Promise<Json[]> {
  const rows: Json[] = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(authorization, `revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(Array.isArray(page.rows) ? page.rows : []));
    cursor = String(page.nextCursor ?? "");
  } while (cursor);
  return rows;
}

async function successfulJobRevision(
  authorization: string,
  queued: Json,
  code: string,
): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const job = await waitForJob(authorization, String(queued.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `${code}:${JSON.stringify(job).slice(0, 2_000)}`);
  const revision = await api(authorization, `revisions/${job.resultRevisionId}`);
  const rows = await allRows(authorization, String(job.resultRevisionId));
  return { job, revision, rows };
}

async function expectedRows(catalogId: string, parameters: Json): Promise<Json[]> {
  const compiled = await compileFormworkFramiXlifeProjectKitR1(parameters as any, { catalogId });
  invariant(compiled.preliminaryNeeds.length === 0 && compiled.rows.length === 24,
    `FRAMI_PILE_CAP_E4_LOCAL_CORE_RED:${catalogId}`);
  return compiled.rows as unknown as Json[];
}

function assertTraceParity(contextKey: string, actual: Json, expected: Json): Json {
  const actualTrace = actual.normativeTrace as Json[];
  const expectedTrace = expected.normative_trace as Json[];
  invariant(Array.isArray(actualTrace) && Array.isArray(expectedTrace)
    && actualTrace.length === expectedTrace.length && actualTrace.length === 1,
  `FRAMI_PILE_CAP_E4_TRACE_DENOMINATOR:${contextKey}:${actual.rowId}`);
  const left = actualTrace[0];
  const right = expectedTrace[0];
  invariant(left.source_id === right.source_id
    && left.source_definition_hash === right.source_definition_hash
    && left.exact_locator === right.exact_locator
    && left.source_url === right.source_url,
  `FRAMI_PILE_CAP_E4_TRACE_PARITY:${contextKey}:${actual.rowId}`);
  return {
    rowId: actual.rowId,
    sourceId: left.source_id,
    sourceDefinitionHash: left.source_definition_hash,
    exactLocator: left.exact_locator,
  };
}

async function assertRows(
  contextKey: string,
  catalogId: string,
  definitionVersionId: string,
  revision: Json,
  rows: Json[],
  parameters: Json,
): Promise<Json> {
  const expected = await expectedRows(catalogId, parameters);
  invariant(revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === definitionVersionId
    && revision.catalogId === catalogId,
  `FRAMI_PILE_CAP_E4_REVISION_IDENTITY:${contextKey}`);
  invariant(Array.isArray(revision.preliminaryNeeds) && revision.preliminaryNeeds.length === 0,
    `FRAMI_PILE_CAP_E4_UNEXPECTED_PRELIMINARY:${contextKey}`);
  invariant(rows.length === 24 && rows.length === expected.length && rows.length === Number(revision.rowCount),
    `FRAMI_PILE_CAP_E4_ROW_DENOMINATOR:${contextKey}:${rows.length}:${expected.length}`);
  invariant(new Set(rows.map((row) => row.rowId)).size === rows.length,
    `FRAMI_PILE_CAP_E4_DUPLICATE_ROW:${contextKey}`);

  const expectedById = new Map(expected.map((row) => [String(row.row_id), row]));
  for (const row of rows) {
    const coreRow = expectedById.get(String(row.rowId));
    invariant(coreRow, `FRAMI_PILE_CAP_E4_UNEXPECTED_ROW:${contextKey}:${row.rowId}`);
    closeTo(row.quantity, coreRow.quantity, `FRAMI_PILE_CAP_E4_QUANTITY:${contextKey}:${row.rowId}`);
    invariant(row.titleRu === coreRow.title_ru
      && row.unitId === coreRow.unit_id
      && row.includedInEstimate === coreRow.included_in_estimate
      && row.includedInProcurement === coreRow.included_in_procurement
      && row.procurementEligible === coreRow.procurement_eligible,
    `FRAMI_PILE_CAP_E4_ROW_CONTRACT:${contextKey}:${row.rowId}`);
    if (row.includedInEstimate === true) {
      invariant(row.unitPrice == null && row.amount == null,
        `FRAMI_PILE_CAP_E4_INVENTED_PRICE:${contextKey}:${row.rowId}`);
    }
  }

  const measured = rows.find((row) => row.rowId === MEASURED_AREA_ROW_ID) as Json | undefined;
  const panel = rows.find((row) => row.rowId === "equipment:formwork:frami-xlife-panels-rental") as Json | undefined;
  invariant(measured && panel, `FRAMI_PILE_CAP_E4_REFERENCE_ROWS_MISSING:${contextKey}`);
  const ricsTrace = assertTraceParity(contextKey, measured, expectedById.get(MEASURED_AREA_ROW_ID) as Json);
  const dokaTrace = assertTraceParity(
    contextKey,
    panel,
    expectedById.get("equipment:formwork:frami-xlife-panels-rental") as Json,
  );
  invariant(ricsTrace.sourceId === "src_professional_norm_pack_formwork_rics_nrm2_measured_contact_area_same_unit_routing_v1"
    && dokaTrace.sourceId === FORMWORK_FRAMI_XLIFE_SOURCE_ID
    && parameters.formwork_system_profile_id === FORMWORK_FRAMI_XLIFE_SYSTEM_PROFILE_ID
    && panel.calculationTrace?.resourceGraph?.formworkSystemProfileParameterId
      === "formwork_system_profile_id",
  `FRAMI_PILE_CAP_E4_EXACT_SOURCE_CLOSURE:${contextKey}`);

  const includedRows = rows.filter((row) => row.includedInEstimate === true);
  const procurementRows = rows.filter((row) => row.includedInProcurement === true);
  invariant(includedRows.length === 17 && procurementRows.length === 14
    && Number(revision.totals?.includedRowCount) === 17
    && Number(revision.totals?.pricedRowCount) === 0
    && Number(revision.totals?.unpricedRowCount) === 17
    && Number(revision.totals?.amount) === 0,
  `FRAMI_PILE_CAP_E4_TOTALS:${contextKey}`);
  return {
    rowCount: rows.length,
    includedRowCount: includedRows.length,
    procurementRowCount: procurementRows.length,
    excludedInformationalRowCount: rows.length - includedRows.length,
    measuredContactAreaM2: Number(measured.quantity),
    panelRentalPieceDays: Number(panel.quantity),
    inventedPriceCount: includedRows.filter((row) => row.unitPrice != null || row.amount != null).length,
    priceState: "PARTIAL_NEEDS_PRICE",
    sourceClosure: [ricsTrace, dokaTrace],
    rowIds: rows.map((row) => row.rowId),
  };
}

async function databaseProof(
  client: Client,
  revisionIds: string[],
  failedJobIds: string[],
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,source_commit,source_tree
    from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
  const search = (await client.query(`select id::text,status,activated_at
    from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
  invariant(release?.status === "prepared" && release.activated_at == null,
    "FRAMI_PILE_CAP_E4_RELEASE_LIFECYCLE_DRIFT");
  invariant(search?.status === "draft" && search.activated_at == null,
    "FRAMI_PILE_CAP_E4_SEARCH_LIFECYCLE_DRIFT");
  const definitions = (await client.query(`select catalog_id,definition_version_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    RELEASE_ID,
    TARGETS.map((target) => target.catalogId),
  ])).rows as Json[];
  const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
      definition_version_id::text,catalog_id,revision_number,row_count,checksum_sha256
    from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [revisionIds])).rows as Json[];
  const failedJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
    from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [failedJobIds])).rows as Json[];
  invariant(definitions.length === 6
    && definitions.every((row) => Object.values(EXPECTED_DEFINITION_IDS).includes(row.definition_version_id)),
  "FRAMI_PILE_CAP_E4_DATABASE_DEFINITION_DENOMINATOR");
  invariant(revisions.length === revisionIds.length && revisions.every((row) => row.release_id === RELEASE_ID),
    "FRAMI_PILE_CAP_E4_DATABASE_REVISION_PARITY");
  invariant(failedJobs.length === failedJobIds.length
    && failedJobs.every((row) => row.status === "failed"
      && row.error_code === "PARAMETER_VALIDATION_FAILED" && row.result_revision_id == null),
  "FRAMI_PILE_CAP_E4_DATABASE_FAIL_CLOSED_PARITY");
  return { release, search, definitions, revisions, failedJobs };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const before = resourceSnapshot();
  const runId = randomUUID();
  const authorization = await loginConsumer();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "frami-pile-cap-distinct-e4-backend-acceptance",
  });
  await client.connect();
  try {
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
      && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.searchRelease?.status === "draft"
      && Number(manifest.activeCompileJobCount) === 0,
    "FRAMI_PILE_CAP_E4_RUNTIME_TUPLE_RED");
    progress("RUNTIME_GREEN", { releaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID });

    const targetResults: Json[] = [];
    const revisionIds: string[] = [];
    const failedJobIds: string[] = [];
    for (const target of TARGETS) {
      const contextKey = target.contextKey;
      const fixture = { ...formworkFramiXlifePileCapAcceptanceInputR1(contextKey) } as Json;
      const expectedDefinitionId = EXPECTED_DEFINITION_IDS[contextKey];
      invariant(expectedDefinitionId, `FRAMI_PILE_CAP_E4_DEFINITION_MISSING:${contextKey}`);

      const search = await api(authorization,
        `search/catalog?query=${encodeURIComponent(target.titleRu)}`);
      const exactSearchItems = (search.items as Json[]).filter((item) => item.catalogId === target.catalogId);
      invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID && exactSearchItems.length === 1,
        `FRAMI_PILE_CAP_E4_SEARCH_IDENTITY:${contextKey}`);
      const searchItem = exactSearchItems[0];
      invariant(searchItem.definitionVersionId === expectedDefinitionId
        && searchItem.definitionReleaseId === RELEASE_ID
        && searchItem.canonicalNameRu === target.titleRu
        && searchItem.estimateReady === true
        && searchItem.contentAdmission?.allowed === true
        && searchItem.shortScopeRu.includes("Полная проектная смета")
        && searchItem.requiredInputsCount === 52
        && searchItem.includedBoundaries.length === 4
        && searchItem.excludedBoundaries.length === 4,
      `FRAMI_PILE_CAP_E4_SEARCH_CLAIMS:${contextKey}`);

      const catalog = await api(authorization, `catalog/${encodeURIComponent(target.catalogId)}`);
      const item = catalog.item as Json;
      invariant(item.catalogId === target.catalogId
        && item.releaseId === RELEASE_ID
        && item.definitionVersion === 8
        && item.applicability?.pileCapContextKey === contextKey
        && item.applicability?.projectLayoutRequired === true
        && item.applicability?.projectScheduleRequired === true
        && item.applicability?.contextMultiplierApplied === false
        && item.professionalMetadata?.fullQuantityScope === true
        && item.professionalMetadata?.priceState === "PARTIAL_NEEDS_PRICE"
        && item.contentAdmission?.definitionVersionId === expectedDefinitionId
        && item.contentAdmission?.allowed === true
        && Array.isArray(item.parameterSchema) && item.parameterSchema.length === 52,
      `FRAMI_PILE_CAP_E4_CATALOG_CLAIMS:${contextKey}`);

      const compilePayload = {
        idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:compile`,
        catalogId: target.catalogId,
        parameters: fixture,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: target.titleRu,
        primaryMeasureParameterId: "measured_formwork_contact_area_m2",
        organizationId: ORGANIZATION_ID,
      };
      const queued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      const initial = await successfulJobRevision(
        authorization,
        queued,
        `FRAMI_PILE_CAP_E4_COMPILE:${contextKey}`,
      );
      const original = await assertRows(
        contextKey,
        target.catalogId,
        expectedDefinitionId,
        initial.revision,
        initial.rows,
        fixture,
      );

      const replay = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      invariant(replay.jobId === queued.jobId && replay.created === false,
        `FRAMI_PILE_CAP_E4_IDEMPOTENCY:${contextKey}`);

      const originalArea = Number(fixture.measured_formwork_contact_area_m2);
      const editedArea = originalArea + 1;
      const recalculatedQueued = await api(authorization, "jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:recalculate`,
          catalogId: target.catalogId,
          parentRevisionId: initial.revision.revisionId,
          parameters: { measured_formwork_contact_area_m2: editedArea },
          currencyCode: "KGS",
          priceSnapshotIds: [],
          rowOverrides: {},
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const sensitivity = await successfulJobRevision(
        authorization,
        recalculatedQueued,
        `FRAMI_PILE_CAP_E4_RECALCULATE:${contextKey}`,
      );
      invariant(sensitivity.revision.parentRevisionId === initial.revision.revisionId,
        `FRAMI_PILE_CAP_E4_PARENT_LINEAGE:${contextKey}`);
      const editedFixture = { ...fixture, measured_formwork_contact_area_m2: editedArea };
      const edited = await assertRows(
        contextKey,
        target.catalogId,
        expectedDefinitionId,
        sensitivity.revision,
        sensitivity.rows,
        editedFixture,
      );
      const originalById = new Map(initial.rows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRows = sensitivity.rows
        .filter((row) => Number(row.quantity) !== originalById.get(row.rowId))
        .map((row) => row.rowId).sort();
      invariant(JSON.stringify(changedRows) === JSON.stringify([MEASURED_AREA_ROW_ID]),
        `FRAMI_PILE_CAP_E4_SENSITIVITY_SCOPE:${contextKey}:${changedRows.join(",")}`);

      const invalidQueued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          ...compilePayload,
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:invalid-thickness`,
          parameters: { ...fixture, foundation_wall_thickness_cm: 81 },
        }),
      });
      const invalidJob = await waitForJob(authorization, String(invalidQueued.jobId));
      invariant(invalidJob.status === "failed"
        && invalidJob.errorCode === "PARAMETER_VALIDATION_FAILED"
        && invalidJob.resultRevisionId == null,
      `FRAMI_PILE_CAP_E4_FAIL_CLOSED:${contextKey}:${JSON.stringify(invalidJob).slice(0, 2_000)}`);

      const history = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
      invariant(historyIds.includes(String(initial.revision.revisionId))
        && historyIds.includes(String(sensitivity.revision.revisionId))
        && historyIds.indexOf(String(sensitivity.revision.revisionId))
          < historyIds.indexOf(String(initial.revision.revisionId)),
      `FRAMI_PILE_CAP_E4_HISTORY:${contextKey}`);

      revisionIds.push(String(initial.revision.revisionId), String(sensitivity.revision.revisionId));
      failedJobIds.push(String(invalidJob.jobId));
      targetResults.push({
        contextKey,
        catalogId: target.catalogId,
        titleRu: target.titleRu,
        definitionVersionId: expectedDefinitionId,
        projectSchedule: FORMWORK_FRAMI_XLIFE_PILE_CAP_PROJECT_SCHEDULES[contextKey],
        search: {
          exactMatchCount: exactSearchItems.length,
          matchTier: searchItem.matchTier,
          matchType: searchItem.matchType,
          fullProjectEstimateClaim: true,
          includedBoundaryCount: searchItem.includedBoundaries.length,
          excludedBoundaryCount: searchItem.excludedBoundaries.length,
        },
        catalog: {
          parameterCount: item.parameterSchema.length,
          pileCapContextKey: item.applicability.pileCapContextKey,
          projectScheduleRequired: item.applicability.projectScheduleRequired,
          contextMultiplierApplied: item.applicability.contextMultiplierApplied,
          priceState: item.professionalMetadata.priceState,
        },
        compile: {
          jobId: queued.jobId,
          revisionId: initial.revision.revisionId,
          revisionNumber: initial.revision.revisionNumber,
          ...original,
        },
        idempotencyReplay: { sameJobId: true, created: false },
        edit: {
          jobId: recalculatedQueued.jobId,
          parentRevisionId: initial.revision.revisionId,
          revisionId: sensitivity.revision.revisionId,
          revisionNumber: sensitivity.revision.revisionNumber,
          originalMeasuredContactAreaM2: originalArea,
          editedMeasuredContactAreaM2: editedArea,
          changedRowIds: changedRows,
          ...edited,
        },
        failClosed: {
          case: "foundation_wall_thickness_above_doka_system_applicability",
          submittedThicknessCm: 81,
          acceptedRangeCm: [10, 80],
          jobId: invalidJob.jobId,
          status: invalidJob.status,
          errorCode: invalidJob.errorCode,
          resultRevisionId: null,
        },
        history: { containsExactImmutableLineage: true, observedRevisionCount: historyIds.length },
      });
      progress("TARGET_GREEN", {
        contextKey,
        rows: original.rowCount,
        procurementRows: original.procurementRowCount,
        measuredContactAreaM2: original.measuredContactAreaM2,
        panelRentalPieceDays: original.panelRentalPieceDays,
      });
    }

    invariant(targetResults.length === 6
      && new Set(targetResults.map((target) => target.catalogId)).size === 6
      && new Set(targetResults.map((target) => target.definitionVersionId)).size === 6
      && new Set(targetResults.map((target) => JSON.stringify(target.projectSchedule))).size === 6,
    "FRAMI_PILE_CAP_E4_TARGET_DENOMINATOR");
    const database = await databaseProof(client, revisionIds, failedJobIds);
    const manifestAfter = await api(authorization, "runtime-manifest");
    invariant(manifestAfter.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifestAfter.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifestAfter.definitionRelease?.status === "prepared"
      && manifestAfter.searchRelease?.status === "draft"
      && Number(manifestAfter.activeCompileJobCount) === 0,
    "FRAMI_PILE_CAP_E4_RUNTIME_AFTER_RED");

    const after = resourceSnapshot();
    const masterBytes = readFileSync(MASTER);
    const sourcePath = resolve("src/lib/estimate/v4/formworkFramiXlifeProjectKitR1.ts");
    const evidence = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: "GREEN_FORMWORK_FRAMI_XLIFE_PILE_CAP_6_OF_6_DISTINCT_PROJECT_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
      globalStatus: GLOBAL_STATUS,
      runId,
      master: { path: MASTER, sha256: sha256(masterBytes) },
      source: {
        branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        workingSourceSha256: sha256(readFileSync(sourcePath)),
        runtimeSourceHead: manifest.sourceHead,
        runtimeSourceTree: manifest.sourceTree,
        backendRuntimeSourceSha256: manifest.runtimeSourceSha256,
      },
      runtime: {
        definitionReleaseId: RELEASE_ID,
        definitionReleaseStatus: manifest.definitionRelease.status,
        definitionActivatedAt: database.release.activated_at ?? null,
        searchReleaseId: SEARCH_RELEASE_ID,
        searchReleaseStatus: manifest.searchRelease.status,
        searchActivatedAt: database.search.activated_at ?? null,
        providerMode: "local-only",
        backendOrigin: BACKEND,
        database: "127.0.0.1:55432/rik_r4_runtime_b5_v2",
      },
      denominator: {
        originalTargetCount: 6,
        acceptedTargetCount: targetResults.length,
        blockedTargetCount: 0,
        compileRevisionCount: 6,
        editRevisionCount: 6,
        failClosedNegativeCount: 6,
        exactRowCountPerTarget: 24,
        includedRowCountPerTarget: 17,
        procurementRowCountPerTarget: 14,
      },
      targetResults,
      database: {
        persistedRevisionCount: database.revisions.length,
        failedJobCount: database.failedJobs.length,
        definitionCount: database.definitions.length,
        release: database.release,
        search: database.search,
        revisionIds,
        failedJobIds,
      },
      resourceControl: {
        before,
        after,
        availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
        availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
        heavyProcessStarted: false,
        existingRuntimeReused: true,
        databasePreserved: true,
        historyPreserved: true,
      },
      productionRequests: 0,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
      releasePerformed: false,
      otaPerformed: false,
    };
    const sealed = { ...evidence, receiptSha256: sha256(JSON.stringify(evidence)) };
    atomicJson(OUTPUT, sealed);
    progress("GREEN", { output: OUTPUT, receiptSha256: sealed.receiptSha256 });
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
