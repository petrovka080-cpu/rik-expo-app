import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
  REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
} from "../../src/lib/estimate/v4/domainFactory";
import {
  STRIP_FOUNDATION_REINFORCEMENT_TARGETS,
  compileStripFoundationReinforcementR1,
  stripFoundationReinforcementAcceptanceInputR1,
  type StripFoundationReinforcementContextKey,
} from "../../src/lib/estimate/v4/stripFoundationReinforcementR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-reinforcement-family.backend-acceptance.v1";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const STEEL_ROW_ID = "material:reinforcement:steel-approved-schedule";
const DELIVERY_ROW_ID = "delivery:reinforcement:steel";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const FAMILY_RECEIPT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family/acceptance.json",
);
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-api/acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STRIP_REINFORCEMENT_API:${code}`);
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

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "STRIP_REINFORCEMENT_E5_API", stage, ...details })}\n`);
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
    && parsed.port === "55432"
    && parsed.pathname === "/rik_r4_runtime_b5_v2", "DATABASE_IDENTITY_RED");
  invariant(new URL(BACKEND).hostname === "127.0.0.1"
    && new URL(PROVIDER).hostname === "127.0.0.1", "NON_LOCAL_RUNTIME_RED");
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONSUMER_CREDENTIALS_RED");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `LOGIN_HTTP_${response.status}`);
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
    `HTTP_${path}_${result.status}:${JSON.stringify(result.body).slice(0, 2_000)}`);
  return result.body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  invariant(/^[0-9a-f-]{36}$/iu.test(jobId), `JOB_ID_RED:${jobId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`STRIP_REINFORCEMENT_API:JOB_TIMEOUT:${jobId}`);
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

async function successfulRevision(
  authorization: string,
  queued: Json,
  code: string,
): Promise<{ job: Json; revision: Json; rows: Json[] }> {
  const job = await waitForJob(authorization, String(queued.jobId ?? ""));
  invariant(job.status === "succeeded" && job.resultRevisionId,
    `${code}:${JSON.stringify(job).slice(0, 2_000)}`);
  return {
    job,
    revision: await api(authorization, `revisions/${job.resultRevisionId}`),
    rows: await allRows(authorization, String(job.resultRevisionId)),
  };
}

async function expectedRows(
  catalogId: string,
  parameters: Json,
): Promise<{ rows: Json[]; procurementRows: number }> {
  const compiled = await compileStripFoundationReinforcementR1(parameters, { catalogId });
  invariant(compiled.preliminaryNeeds.length === 0, `LOCAL_CORE_PRELIMINARY:${catalogId}`);
  return {
    rows: compiled.rows as unknown as Json[],
    procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
  };
}

function closeTo(actual: unknown, expected: unknown, code: string): void {
  const actualNumber = Number(actual);
  const expectedNumber = Number(expected);
  invariant(Number.isFinite(actualNumber)
    && Number.isFinite(expectedNumber)
    && Math.abs(actualNumber - expectedNumber) < 1e-8,
  `${code}:${actualNumber}:${expectedNumber}`);
}

function assertRows(input: {
  contextKey: StripFoundationReinforcementContextKey;
  catalogId: string;
  definitionVersionId: string;
  revision: Json;
  rows: Json[];
  expected: { rows: Json[]; procurementRows: number };
  expectedWeightKg: number;
}): Json {
  invariant(input.revision.releaseId === RELEASE_ID
    && input.revision.definitionVersionId === input.definitionVersionId
    && input.revision.catalogId === input.catalogId
    && Number(input.revision.parameters?.approved_reinforcement_schedule_weight_kg)
      === input.expectedWeightKg,
  `REVISION_IDENTITY:${input.contextKey}`);
  invariant(Array.isArray(input.revision.preliminaryNeeds)
    && input.revision.preliminaryNeeds.length === 0, `PRELIMINARY_RED:${input.contextKey}`);
  invariant(input.rows.length === input.expected.rows.length
    && input.rows.length === Number(input.revision.rowCount),
  `ROW_DENOMINATOR:${input.contextKey}:${input.rows.length}:${input.expected.rows.length}`);
  const expectedById = new Map(input.expected.rows.map((row) => [String(row.row_id), row]));
  invariant(new Set(input.rows.map((row) => row.rowId)).size === input.rows.length,
    `ROW_DUPLICATE:${input.contextKey}`);
  for (const row of input.rows) {
    const expected = expectedById.get(String(row.rowId));
    invariant(expected, `ROW_UNEXPECTED:${input.contextKey}:${row.rowId}`);
    closeTo(row.quantity, expected.quantity, `ROW_QUANTITY:${input.contextKey}:${row.rowId}`);
    invariant(row.unitId === expected.unit_id
      && row.includedInEstimate === true
      && row.unitPrice == null
      && row.amount == null,
    `ROW_STATE:${input.contextKey}:${row.rowId}`);
  }
  const steel = input.rows.find((row) => row.rowId === STEEL_ROW_ID);
  invariant(steel?.procurementEligible === true
    && steel.includedInProcurement === true
    && steel.unitId === "kg", `STEEL_FLAGS:${input.contextKey}`);
  const exactTrace = (steel.normativeTrace as Json[] | undefined)?.find((trace) =>
    trace.source_id === REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID
      && trace.norm_id === REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
  );
  const binding = steel.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(exactTrace?.source_definition_hash === REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.definition_hash
    && exactTrace?.exact_locator === REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA.exact_locator
    && binding?.product_profile_id != null,
  `NORMATIVE_TRACE:${input.contextKey}`);
  invariant(Number(input.revision.totals?.includedRowCount) === input.rows.length
    && Number(input.revision.totals?.unpricedRowCount) === input.rows.length
    && Number(input.revision.totals?.pricedRowCount) === 0
    && Number(input.revision.totals?.amount) === 0,
  `TOTALS:${input.contextKey}`);
  return {
    rowIds: input.rows.map((row) => row.rowId),
    rowCount: input.rows.length,
    procurementRowCount: input.rows.filter((row) => row.includedInProcurement === true).length,
    approvedScheduleWeightKg: Number(steel.quantity),
    deliveryTKm: Number(input.rows.find((row) => row.rowId === DELIVERY_ROW_ID)?.quantity ?? 0),
    normativeSourceId: exactTrace.source_id,
    normativeNormId: exactTrace.norm_id,
    inventedPriceCount: input.rows.filter((row) => row.unitPrice != null || row.amount != null).length,
  };
}

async function databaseProof(
  client: Client,
  definitionIds: readonly string[],
  revisionIds: readonly string[],
  failedJobIds: readonly string[],
): Promise<Json> {
  const release = (await client.query(`select id::text,status,activated_at,source_commit,source_tree
    from public.estimate_definition_release where id=$1`, [RELEASE_ID])).rows[0] as Json;
  const search = (await client.query(`select id::text,status,activated_at
    from public.estimate_search_index_release where id=$1`, [SEARCH_RELEASE_ID])).rows[0] as Json;
  invariant(release?.status === "prepared" && release.activated_at == null, "RELEASE_LIFECYCLE_RED");
  invariant(search?.status === "draft" && search.activated_at == null, "SEARCH_LIFECYCLE_RED");
  const definitions = (await client.query(`select catalog_id,definition_version_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    RELEASE_ID, STRIP_FOUNDATION_REINFORCEMENT_TARGETS.map((target) => target.catalogId),
  ])).rows as Json[];
  const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
      definition_version_id::text,catalog_id,revision_number,row_count,checksum_sha256
    from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [
    revisionIds,
  ])).rows as Json[];
  const failedJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
    from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [failedJobIds])).rows as Json[];
  invariant(definitions.length === 7
    && definitions.every((row) => definitionIds.includes(String(row.definition_version_id))),
  "DATABASE_DEFINITION_DENOMINATOR_RED");
  invariant(revisions.length === revisionIds.length
    && revisions.every((row) => row.release_id === RELEASE_ID), "DATABASE_REVISION_PARITY_RED");
  invariant(failedJobs.length === failedJobIds.length
    && failedJobs.every((row) => row.status === "failed"
      && row.error_code === "PARAMETER_VALIDATION_FAILED"
      && row.result_revision_id == null), "DATABASE_FAIL_CLOSED_PARITY_RED");
  return { release, search, definitions, revisions, failedJobs };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const before = resourceSnapshot();
  invariant(before.availableMemoryBytes >= 2 * 1024 ** 3, "AVAILABLE_MEMORY_BELOW_2_GIB");
  invariant(before.availableDiskBytes >= 10 * 1024 ** 3, "AVAILABLE_DISK_BELOW_10_GIB");
  const sourceReceipt = JSON.parse(readFileSync(FAMILY_RECEIPT, "utf8")) as Json;
  invariant(sourceReceipt.status === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_PREPARED_NOT_ACTIVE"
    && sourceReceipt.successor?.releaseId === RELEASE_ID
    && sourceReceipt.successor?.searchReleaseId === SEARCH_RELEASE_ID,
  "FAMILY_RECEIPT_RED");
  const targetReceiptByContext = new Map<string, Json>(
    (sourceReceipt.successor.targets as Json[]).map((target) => [String(target.contextKey), target]),
  );
  invariant(targetReceiptByContext.size === 7, "FAMILY_RECEIPT_DENOMINATOR_RED");

  const authorization = await loginConsumer();
  const runId = randomUUID();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-reinforcement-family-e5-backend-acceptance",
  });
  await client.connect();
  try {
    const manifest = await api(authorization, "runtime-manifest");
    invariant(manifest.runtimeRole === "FULL_CANONICAL_ESTIMATE_BACKEND"
      && manifest.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifest.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifest.definitionRelease?.status === "prepared"
      && manifest.searchRelease?.status === "draft"
      && Number(manifest.activeCompileJobCount) === 0, "RUNTIME_TUPLE_RED");
    progress("RUNTIME_GREEN", { releaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID });

    const targetResults: Json[] = [];
    const revisionIds: string[] = [];
    const failedJobIds: string[] = [];
    const definitionIds: string[] = [];
    for (const target of STRIP_FOUNDATION_REINFORCEMENT_TARGETS) {
      const fixture = { ...stripFoundationReinforcementAcceptanceInputR1(target.contextKey) } as Json;
      const sourceTarget = targetReceiptByContext.get(target.contextKey);
      const definitionVersionId = String(sourceTarget?.definitionId ?? "");
      invariant(/^[0-9a-f-]{36}$/iu.test(definitionVersionId),
        `DEFINITION_ID_RED:${target.contextKey}`);
      definitionIds.push(definitionVersionId);

      const search = await api(authorization,
        `search/catalog?query=${encodeURIComponent(target.titleRu)}`);
      const exactSearchItems = (search.items as Json[]).filter((item) => item.catalogId === target.catalogId);
      invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID && exactSearchItems.length === 1,
        `SEARCH_IDENTITY:${target.contextKey}`);
      const searchItem = exactSearchItems[0];
      invariant(searchItem.definitionVersionId === definitionVersionId
        && searchItem.definitionReleaseId === RELEASE_ID
        && searchItem.canonicalNameRu === target.titleRu
        && searchItem.estimateReady === true
        && searchItem.contentAdmission?.allowed === true,
      `SEARCH_CLAIMS:${target.contextKey}`);

      const catalog = await api(authorization, `catalog/${encodeURIComponent(target.catalogId)}`);
      const item = catalog.item as Json;
      invariant(item.catalogId === target.catalogId
        && item.releaseId === RELEASE_ID
        && item.applicability?.contextKey === target.contextKey
        && item.applicability?.conditionalScopeFailClosed === true
        && item.professionalMetadata?.fullApplicableScope === true
        && item.professionalMetadata?.priceState === "PARTIAL_NEEDS_PRICE"
        && item.contentAdmission?.definitionVersionId === definitionVersionId
        && item.contentAdmission?.allowed === true
        && Array.isArray(item.parameterSchema)
        && item.parameterSchema.length === 37,
      `CATALOG_CLAIMS:${target.contextKey}`);

      const compilePayload = {
        idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:compile`,
        catalogId: target.catalogId,
        parameters: fixture,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: target.titleRu,
        primaryMeasureParameterId: "approved_reinforcement_schedule_weight_kg",
        organizationId: ORGANIZATION_ID,
      };
      const queued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      const initial = await successfulRevision(
        authorization, queued, `COMPILE:${target.contextKey}`,
      );
      const initialExpected = await expectedRows(target.catalogId, fixture);
      const initialWeight = Number(fixture.approved_reinforcement_schedule_weight_kg);
      const original = assertRows({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        revision: initial.revision,
        rows: initial.rows,
        expected: initialExpected,
        expectedWeightKg: initialWeight,
      });

      const replay = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      invariant(replay.jobId === queued.jobId && replay.created === false,
        `IDEMPOTENCY:${target.contextKey}`);

      const editedWeight = initialWeight + 100;
      const editedFixture = {
        ...fixture,
        approved_reinforcement_schedule_weight_kg: editedWeight,
      };
      const recalculatedQueued = await api(authorization, "jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:recalculate`,
          catalogId: target.catalogId,
          parentRevisionId: initial.revision.revisionId,
          parameters: { approved_reinforcement_schedule_weight_kg: editedWeight },
          currencyCode: "KGS",
          priceSnapshotIds: [],
          rowOverrides: {},
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const editedRevision = await successfulRevision(
        authorization, recalculatedQueued, `RECALCULATE:${target.contextKey}`,
      );
      invariant(editedRevision.revision.parentRevisionId === initial.revision.revisionId,
        `PARENT_LINEAGE:${target.contextKey}`);
      const editedExpected = await expectedRows(target.catalogId, editedFixture);
      const edited = assertRows({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        revision: editedRevision.revision,
        rows: editedRevision.rows,
        expected: editedExpected,
        expectedWeightKg: editedWeight,
      });
      const originalById = new Map(initial.rows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRows = editedRevision.rows
        .filter((row) => Number(row.quantity) !== originalById.get(row.rowId))
        .map((row) => String(row.rowId)).sort();
      invariant(JSON.stringify(changedRows) === JSON.stringify([DELIVERY_ROW_ID, STEEL_ROW_ID].sort()),
        `EDIT_SCOPE:${target.contextKey}:${changedRows.join(",")}`);

      const invalidQueued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          ...compilePayload,
          idempotencyKey: `${CONTRACT}:${runId}:${target.contextKey}:invalid-zero-weight`,
          parameters: { ...fixture, approved_reinforcement_schedule_weight_kg: 0 },
        }),
      });
      const invalidJob = await waitForJob(authorization, String(invalidQueued.jobId));
      invariant(invalidJob.status === "failed"
        && invalidJob.errorCode === "PARAMETER_VALIDATION_FAILED"
        && invalidJob.resultRevisionId == null,
      `FAIL_CLOSED:${target.contextKey}:${JSON.stringify(invalidJob).slice(0, 2_000)}`);

      const history = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
      invariant(historyIds.includes(String(initial.revision.revisionId))
        && historyIds.includes(String(editedRevision.revision.revisionId))
        && historyIds.indexOf(String(editedRevision.revision.revisionId))
          < historyIds.indexOf(String(initial.revision.revisionId)),
      `HISTORY:${target.contextKey}`);

      revisionIds.push(
        String(initial.revision.revisionId),
        String(editedRevision.revision.revisionId),
      );
      failedJobIds.push(String(invalidJob.jobId));
      targetResults.push({
        contextKey: target.contextKey,
        catalogId: target.catalogId,
        definitionVersionId,
        search: { exactMatchCount: 1, matchTier: searchItem.matchTier },
        catalog: { parameterCount: 37, priceState: "PARTIAL_NEEDS_PRICE" },
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
          revisionId: editedRevision.revision.revisionId,
          revisionNumber: editedRevision.revision.revisionNumber,
          changedRowIds: changedRows,
          ...edited,
        },
        failClosed: {
          case: "approved_reinforcement_schedule_weight_kg_zero",
          jobId: invalidJob.jobId,
          status: invalidJob.status,
          errorCode: invalidJob.errorCode,
          resultRevisionId: null,
        },
        history: { containsExactImmutableLineage: true },
      });
      progress("TARGET_GREEN", {
        contextKey: target.contextKey,
        rows: original.rowCount,
        procurementRows: original.procurementRowCount,
        approvedScheduleWeightKg: original.approvedScheduleWeightKg,
      });
    }

    invariant(targetResults.length === 7
      && new Set(targetResults.map((target) => target.catalogId)).size === 7
      && new Set(definitionIds).size === 7, "TARGET_DENOMINATOR_RED");
    const database = await databaseProof(client, definitionIds, revisionIds, failedJobIds);
    const manifestAfter = await api(authorization, "runtime-manifest");
    invariant(manifestAfter.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifestAfter.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifestAfter.definitionRelease?.status === "prepared"
      && manifestAfter.searchRelease?.status === "draft"
      && Number(manifestAfter.activeCompileJobCount) === 0, "RUNTIME_AFTER_RED");

    const after = resourceSnapshot();
    const evidence = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      runId,
      master: { path: MASTER, sha256: sha256(readFileSync(MASTER)) },
      source: {
        branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
        head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        productSha256: sha256(readFileSync(resolve("src/lib/estimate/v4/stripFoundationReinforcementR1.ts"))),
        bindingSha256: sha256(readFileSync(resolve(
          "src/lib/estimate/ownedDomain/stripFoundationReinforcementProductionBindingR1.ts",
        ))),
        runtimeSourceHead: manifest.sourceHead,
        runtimeSourceTree: manifest.sourceTree,
        backendRuntimeSourceSha256: manifest.runtimeSourceSha256,
      },
      runtime: {
        definitionReleaseId: RELEASE_ID,
        definitionReleaseStatus: database.release.status,
        definitionActivatedAt: database.release.activated_at ?? null,
        searchReleaseId: SEARCH_RELEASE_ID,
        searchReleaseStatus: database.search.status,
        searchActivatedAt: database.search.activated_at ?? null,
        providerMode: "local-only",
        backendOrigin: BACKEND,
      },
      denominator: {
        originalTargetCount: 7,
        acceptedTargetCount: targetResults.length,
        blockedTargetCount: 0,
        compileRevisionCount: 7,
        editRevisionCount: 7,
        failClosedNegativeCount: 7,
      },
      normativeSource: {
        sourceId: REINFORCEMENT_BAR_SCHEDULE_SOURCE_ID,
        normId: REINFORCEMENT_BAR_SCHEDULE_NORM_ID,
        sourceMetadata: REINFORCEMENT_BAR_SCHEDULE_SOURCE_METADATA,
        sameUnitRoutingOnly: true,
        automaticKgPerM3Allowance: false,
      },
      targetResults,
      database: {
        persistedRevisionCount: database.revisions.length,
        failedJobCount: database.failedJobs.length,
        definitionCount: database.definitions.length,
        revisionIds,
        failedJobIds,
      },
      resourceControl: {
        before,
        after,
        availableMemoryDeltaBytes: after.availableMemoryBytes - before.availableMemoryBytes,
        availableDiskDeltaBytes: after.availableDiskBytes - before.availableDiskBytes,
        heavyProcessStarted: false,
        existingBackendPreserved: true,
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
