import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
  stripFoundationConcretePlacementAcceptanceInputR1,
  type StripFoundationConcretePlacementContextKey,
} from "../../src/lib/estimate/v4/stripFoundationConcretePlacementR1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement-family.backend-acceptance.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const BACKEND = "http://127.0.0.1:8765";
const PROVIDER = "http://127.0.0.1:54321";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CREDENTIALS = resolve(".release-runtime/r551/runtime/local-developer/credentials.json");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md");
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json",
);
const RELEASE_ID = "ffce7418-e0b2-54df-94b9-45ec442eb651";
const SEARCH_RELEASE_ID = "84ccfb2b-1c44-550f-9393-409c5a8d3ed1";
const ORGANIZATION_ID = "55555555-5555-4555-8555-555555555551";
const READY_MIX_ROW_ID = "material:concrete:ready-mix";
const DELIVERY_ROW_ID = "delivery:concrete:ready-mix";

const EXPECTED_DEFINITION_IDS: Readonly<Record<StripFoundationConcretePlacementContextKey, string>> = Object.freeze({
  standard: "ce31e029-235c-508c-8d6a-294222273c75",
  high_load: "9cd8563b-bd33-529d-a614-4153c9384b09",
  large_area: "12fe35f3-e8bf-5521-8d84-19f9d48dd366",
  repair: "b32913a8-ad01-593b-96c8-90cd4370224e",
  small_area: "a6ffeaa7-df26-5a23-abc5-a32854df2bf5",
  technical_room: "7a1fb3e0-aded-57b3-90ff-0a53b3ef5880",
  wet_zone: "0e89ee0d-2132-5f1c-a881-eedc2bb994b8",
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

function closeTo(actual: unknown, expected: number, code: string): void {
  const numeric = Number(actual);
  invariant(Number.isFinite(numeric) && Math.abs(numeric - expected) < 1e-8,
    `${code}:${String(actual)}:${expected}`);
}

function progress(stage: string, details: Json = {}): void {
  process.stdout.write(`${JSON.stringify({ progress: "STRIP_CONCRETE_FAMILY_E4", stage, ...details })}\n`);
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
    `STOP_CONCRETE_E4_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_CONCRETE_E4_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
  invariant(new URL(BACKEND).hostname === "127.0.0.1" && new URL(PROVIDER).hostname === "127.0.0.1",
    "STOP_CONCRETE_E4_NON_LOCAL_RUNTIME");
}

async function loginConsumer(): Promise<string> {
  const credentials = JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  invariant(credentials.provider_url === PROVIDER, "CONCRETE_E4_PROVIDER_IDENTITY_RED");
  const consumer = (credentials.principals as Json[]).find((entry) => entry.role === "consumer");
  invariant(consumer?.email && consumer?.password && credentials.publishable_key,
    "CONCRETE_E4_CONSUMER_CREDENTIALS_MISSING");
  const response = await fetch(`${PROVIDER}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: credentials.publishable_key, "Content-Type": "application/json" },
    body: JSON.stringify({ email: consumer.email, password: consumer.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null) as Json | null;
  invariant(response.ok && body?.access_token, `CONCRETE_E4_LOGIN_HTTP_${response.status}`);
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
    `CONCRETE_E4_HTTP:${path}:${result.status}:${JSON.stringify(result.body).slice(0, 2_000)}`);
  return result.body;
}

async function waitForJob(authorization: string, jobId: string): Promise<Json> {
  invariant(/^[0-9a-f-]{36}$/iu.test(jobId), `CONCRETE_E4_JOB_ID_INVALID:${jobId}`);
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await api(authorization, `jobs/${jobId}`);
    if (["succeeded", "failed", "cancelled"].includes(String(job.status))) return job;
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`CONCRETE_E4_JOB_TIMEOUT:${jobId}`);
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

function expectedRows(parameters: Json, volume: number): ReadonlyMap<string, number> {
  const contingency = Number(parameters.selected_contingency_percent);
  const readyMix = volume * (1 + contingency / 100);
  const rows = new Map<string, number>([
    [READY_MIX_ROW_ID, readyMix],
    ["work:concrete:place-and-compact", Number(parameters.placement_worker_h)],
    ["work:concrete:finish-surface", Number(parameters.finishing_worker_h)],
    ["work:concrete:cure", Number(parameters.curing_worker_h)],
    ["equipment:concrete:deep-vibrator", Number(parameters.deep_vibrator_machine_h)],
    ["service:concrete:acceptance-control", Number(parameters.quality_control_document_count)],
  ]);
  if (parameters.curing_method === "membrane") {
    rows.set("material:concrete:curing-membrane", Number(parameters.curing_membrane_area_m2));
  }
  if (parameters.winter_mode === true) {
    rows.set("material:concrete:winter-heating-cable", Number(parameters.winter_heating_cable_m));
    rows.set("work:concrete:winter-heating", Number(parameters.winter_heating_worker_h));
    rows.set("equipment:concrete:heating-transformer", Number(parameters.heating_transformer_machine_h));
  }
  if (parameters.placement_method === "pump") {
    rows.set("equipment:concrete:pump", Number(parameters.pump_machine_h));
  }
  if (parameters.placement_method === "crane_bucket") {
    rows.set("equipment:concrete:crane-bucket", Number(parameters.crane_bucket_machine_h));
  }
  if (parameters.delivery_pricing_mode === "SEPARATE"
    && Number(parameters.concrete_delivery_distance_km) > 0) {
    rows.set(DELIVERY_ROW_ID, readyMix * Number(parameters.concrete_delivery_distance_km));
  }
  return rows;
}

function assertRows(
  contextKey: StripFoundationConcretePlacementContextKey,
  revision: Json,
  rows: Json[],
  parameters: Json,
  volume: number,
): Json {
  const expected = expectedRows(parameters, volume);
  invariant(revision.releaseId === RELEASE_ID
    && revision.definitionVersionId === EXPECTED_DEFINITION_IDS[contextKey]
    && Number(revision.parameters?.plan_dimension_concrete_volume_m3) === volume,
  `CONCRETE_E4_REVISION_IDENTITY:${contextKey}`);
  invariant(Array.isArray(revision.preliminaryNeeds) && revision.preliminaryNeeds.length === 0,
    `CONCRETE_E4_UNEXPECTED_PRELIMINARY:${contextKey}`);
  invariant(rows.length === expected.size && rows.length === Number(revision.rowCount),
    `CONCRETE_E4_ROW_DENOMINATOR:${contextKey}:${rows.length}:${expected.size}`);
  invariant(new Set(rows.map((row) => row.rowId)).size === rows.length,
    `CONCRETE_E4_DUPLICATE_ROW:${contextKey}`);
  for (const [rowId, quantity] of expected) {
    const row = rows.find((candidate) => candidate.rowId === rowId);
    invariant(row, `CONCRETE_E4_ROW_MISSING:${contextKey}:${rowId}`);
    closeTo(row.quantity, quantity, `CONCRETE_E4_QUANTITY:${contextKey}:${rowId}`);
    invariant(row.includedInEstimate === true && row.unitPrice == null && row.amount == null,
      `CONCRETE_E4_PRICE_OR_INCLUSION:${contextKey}:${rowId}`);
  }
  invariant(!rows.some((row) => !expected.has(String(row.rowId))),
    `CONCRETE_E4_UNEXPECTED_ROW:${contextKey}`);
  const readyMix = rows.find((row) => row.rowId === READY_MIX_ROW_ID);
  invariant(readyMix?.unitId === "m3"
    && readyMix.procurementEligible === true
    && readyMix.includedInProcurement === true,
  `CONCRETE_E4_READY_MIX_FLAGS:${contextKey}`);
  const exactTrace = (readyMix.normativeTrace as Json[] | undefined)?.find((trace) =>
    trace.source_id === STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA.sourceId
      && trace.norm_id === STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA.normId,
  );
  const binding = readyMix.calculationTrace?.resourceGraph?.professionalPhysicalNormBindingV1;
  invariant(exactTrace?.source_definition_hash
    === STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA.sourceDefinitionHash
    && exactTrace?.exact_locator
    && exactTrace?.source_url === "https://www.nrmca.org/wp-content/uploads/2021/01/31pr.pdf"
    && binding?.product_profile_id === STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA.productProfileId,
  `CONCRETE_E4_NRMCA_TRACE:${contextKey}`);
  const procurementRows = rows.filter((row) => row.includedInProcurement === true).length;
  invariant(Number(revision.totals?.includedRowCount) === rows.length
    && Number(revision.totals?.unpricedRowCount) === rows.length
    && Number(revision.totals?.pricedRowCount) === 0
    && Number(revision.totals?.amount) === 0,
  `CONCRETE_E4_TOTALS:${contextKey}`);
  return {
    expectedRowIds: [...expected.keys()],
    rowCount: rows.length,
    procurementRowCount: procurementRows,
    readyMixM3: Number(readyMix.quantity),
    deliveryM3Km: Number(rows.find((row) => row.rowId === DELIVERY_ROW_ID)?.quantity ?? 0),
    priceState: "PARTIAL_NEEDS_PRICE",
    inventedPriceCount: rows.filter((row) => row.unitPrice != null || row.amount != null).length,
    normativeSourceId: exactTrace.source_id,
    normativeNormId: exactTrace.norm_id,
    normativeSourceDefinitionHash: exactTrace.source_definition_hash,
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
    "CONCRETE_E4_RELEASE_LIFECYCLE_DRIFT");
  invariant(search?.status === "draft" && search.activated_at == null,
    "CONCRETE_E4_SEARCH_LIFECYCLE_DRIFT");
  const definitions = (await client.query(`select catalog_id,definition_version_id::text
    from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=any($2::text[]) order by catalog_id`, [
    RELEASE_ID,
    STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
  ])).rows as Json[];
  const revisions = (await client.query(`select id::text,parent_revision_id::text,release_id::text,
      definition_version_id::text,catalog_id,revision_number,row_count,checksum_sha256
    from public.estimate_revision where id=any($1::uuid[]) order by catalog_id,revision_number`, [revisionIds])).rows as Json[];
  const failedJobs = (await client.query(`select id::text,status,error_code,result_revision_id::text
    from public.estimate_compile_job where id=any($1::uuid[]) order by created_at`, [failedJobIds])).rows as Json[];
  invariant(definitions.length === 7
    && definitions.every((row) => Object.values(EXPECTED_DEFINITION_IDS).includes(row.definition_version_id)),
  "CONCRETE_E4_DATABASE_DEFINITION_DENOMINATOR");
  invariant(revisions.length === revisionIds.length && revisions.every((row) => row.release_id === RELEASE_ID),
    "CONCRETE_E4_DATABASE_REVISION_PARITY");
  invariant(failedJobs.length === failedJobIds.length
    && failedJobs.every((row) => row.status === "failed"
      && row.error_code === "PARAMETER_VALIDATION_FAILED" && row.result_revision_id == null),
  "CONCRETE_E4_DATABASE_FAIL_CLOSED_PARITY");
  return { release, search, definitions, revisions, failedJobs };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  const before = resourceSnapshot();
  const runId = randomUUID();
  const authorization = await loginConsumer();
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-concrete-family-e4-backend-acceptance",
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
    "CONCRETE_E4_RUNTIME_TUPLE_RED");
    progress("RUNTIME_GREEN", { releaseId: RELEASE_ID, searchReleaseId: SEARCH_RELEASE_ID });

    const targetResults: Json[] = [];
    const revisionIds: string[] = [];
    const failedJobIds: string[] = [];
    for (const target of STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS) {
      const contextKey = target.contextKey;
      const fixture = { ...stripFoundationConcretePlacementAcceptanceInputR1(contextKey) } as Json;
      const expectedDefinitionId = EXPECTED_DEFINITION_IDS[contextKey];
      const search = await api(authorization,
        `search/catalog?query=${encodeURIComponent(target.titleRu)}`);
      const exactSearchItems = (search.items as Json[]).filter((item) => item.catalogId === target.catalogId);
      invariant(search.searchIndexReleaseId === SEARCH_RELEASE_ID && exactSearchItems.length === 1,
        `CONCRETE_E4_SEARCH_IDENTITY:${contextKey}`);
      const searchItem = exactSearchItems[0];
      invariant(searchItem.definitionVersionId === expectedDefinitionId
        && searchItem.definitionReleaseId === RELEASE_ID
        && searchItem.canonicalNameRu === target.titleRu
        && searchItem.estimateReady === true
        && searchItem.contentAdmission?.allowed === true
        && searchItem.shortScopeRu.includes("Полная применимая смета")
        && searchItem.includedBoundaries.length === 4
        && searchItem.excludedBoundaries.length === 4,
      `CONCRETE_E4_SEARCH_CLAIMS:${contextKey}`);

      const catalog = await api(authorization, `catalog/${encodeURIComponent(target.catalogId)}`);
      const item = catalog.item as Json;
      invariant(item.catalogId === target.catalogId
        && item.releaseId === RELEASE_ID
        && item.definitionVersion === 4
        && item.applicability?.contextKey === contextKey
        && item.applicability?.conditionalScopeFailClosed === true
        && item.professionalMetadata?.fullApplicableScope === true
        && item.professionalMetadata?.priceState === "PARTIAL_NEEDS_PRICE"
        && item.contentAdmission?.definitionVersionId === expectedDefinitionId
        && item.contentAdmission?.allowed === true
        && Array.isArray(item.parameterSchema) && item.parameterSchema.length === 32,
      `CONCRETE_E4_CATALOG_CLAIMS:${contextKey}`);

      const compilePayload = {
        idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:compile`,
        catalogId: target.catalogId,
        parameters: fixture,
        currencyCode: "KGS",
        priceSnapshotIds: [],
        sourceRequestText: target.titleRu,
        primaryMeasureParameterId: "plan_dimension_concrete_volume_m3",
        organizationId: ORGANIZATION_ID,
      };
      const queued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      const initial = await successfulJobRevision(
        authorization,
        queued,
        `CONCRETE_E4_COMPILE:${contextKey}`,
      );
      const originalVolume = Number(fixture.plan_dimension_concrete_volume_m3);
      const original = assertRows(contextKey, initial.revision, initial.rows, fixture, originalVolume);
      invariant(initial.revision.catalogId === target.catalogId,
        `CONCRETE_E4_CATALOG_REVISION:${contextKey}`);

      const replay = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify(compilePayload),
      });
      invariant(replay.jobId === queued.jobId && replay.created === false,
        `CONCRETE_E4_IDEMPOTENCY:${contextKey}`);

      const sensitivityVolume = originalVolume + 1;
      const recalculatedQueued = await api(authorization, "jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:recalculate`,
          catalogId: target.catalogId,
          parentRevisionId: initial.revision.revisionId,
          parameters: { plan_dimension_concrete_volume_m3: sensitivityVolume },
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
        `CONCRETE_E4_RECALCULATE:${contextKey}`,
      );
      invariant(sensitivity.revision.parentRevisionId === initial.revision.revisionId,
        `CONCRETE_E4_PARENT_LINEAGE:${contextKey}`);
      const edited = assertRows(contextKey, sensitivity.revision, sensitivity.rows, fixture, sensitivityVolume);
      const originalById = new Map(initial.rows.map((row) => [row.rowId, Number(row.quantity)]));
      const changedRows = sensitivity.rows
        .filter((row) => Number(row.quantity) !== originalById.get(row.rowId))
        .map((row) => row.rowId).sort();
      invariant(JSON.stringify(changedRows) === JSON.stringify([DELIVERY_ROW_ID, READY_MIX_ROW_ID].sort()),
        `CONCRETE_E4_SENSITIVITY_SCOPE:${contextKey}:${changedRows.join(",")}`);

      const invalidQueued = await api(authorization, "jobs/compile", {
        method: "POST",
        body: JSON.stringify({
          ...compilePayload,
          idempotencyKey: `${CONTRACT}:${runId}:${contextKey}:invalid-contingency`,
          parameters: { ...fixture, selected_contingency_percent: 3 },
        }),
      });
      const invalidJob = await waitForJob(authorization, String(invalidQueued.jobId));
      invariant(invalidJob.status === "failed"
        && invalidJob.errorCode === "PARAMETER_VALIDATION_FAILED"
        && invalidJob.resultRevisionId == null,
      `CONCRETE_E4_FAIL_CLOSED:${contextKey}:${JSON.stringify(invalidJob).slice(0, 2_000)}`);

      const history = await api(authorization,
        `revisions?catalogId=${encodeURIComponent(target.catalogId)}&limit=100`);
      const historyIds = (history.revisions as Json[]).map((revision) => String(revision.revisionId));
      invariant(historyIds.includes(String(initial.revision.revisionId))
        && historyIds.includes(String(sensitivity.revision.revisionId))
        && historyIds.indexOf(String(sensitivity.revision.revisionId))
          < historyIds.indexOf(String(initial.revision.revisionId)),
      `CONCRETE_E4_HISTORY:${contextKey}`);

      revisionIds.push(String(initial.revision.revisionId), String(sensitivity.revision.revisionId));
      failedJobIds.push(String(invalidJob.jobId));
      targetResults.push({
        contextKey,
        catalogId: target.catalogId,
        titleRu: target.titleRu,
        definitionVersionId: expectedDefinitionId,
        search: {
          exactMatchCount: exactSearchItems.length,
          matchTier: searchItem.matchTier,
          matchType: searchItem.matchType,
          fullApplicableScopeClaim: true,
          includedBoundaryCount: searchItem.includedBoundaries.length,
          excludedBoundaryCount: searchItem.excludedBoundaries.length,
        },
        catalog: {
          parameterCount: item.parameterSchema.length,
          contextKey: item.applicability.contextKey,
          conditionalScopeFailClosed: item.applicability.conditionalScopeFailClosed,
          priceState: item.professionalMetadata.priceState,
        },
        compile: {
          jobId: queued.jobId,
          revisionId: initial.revision.revisionId,
          revisionNumber: initial.revision.revisionNumber,
          inputVolumeM3: originalVolume,
          ...original,
        },
        idempotencyReplay: { sameJobId: true, created: false },
        edit: {
          jobId: recalculatedQueued.jobId,
          parentRevisionId: initial.revision.revisionId,
          revisionId: sensitivity.revision.revisionId,
          revisionNumber: sensitivity.revision.revisionNumber,
          inputVolumeM3: sensitivityVolume,
          changedRowIds: changedRows,
          ...edited,
        },
        failClosed: {
          case: "selected_contingency_percent_below_nrmca_range",
          submittedPercent: 3,
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
        readyMixM3: original.readyMixM3,
      });
    }

    invariant(targetResults.length === 7
      && new Set(targetResults.map((target) => target.catalogId)).size === 7
      && new Set(targetResults.map((target) => target.definitionVersionId)).size === 7,
    "CONCRETE_E4_TARGET_DENOMINATOR");
    const database = await databaseProof(client, revisionIds, failedJobIds);
    const manifestAfter = await api(authorization, "runtime-manifest");
    invariant(manifestAfter.compatibilityTuple?.definitionReleaseId === RELEASE_ID
      && manifestAfter.compatibilityTuple?.searchReleaseId === SEARCH_RELEASE_ID
      && manifestAfter.definitionRelease?.status === "prepared"
      && manifestAfter.searchRelease?.status === "draft"
      && Number(manifestAfter.activeCompileJobCount) === 0,
    "CONCRETE_E4_RUNTIME_AFTER_RED");

    const after = resourceSnapshot();
    const masterBytes = readFileSync(MASTER);
    const sourcePath = resolve("src/lib/estimate/v4/stripFoundationConcretePlacementR1.ts");
    const evidence = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      status: "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE",
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
        originalTargetCount: 7,
        acceptedTargetCount: targetResults.length,
        blockedTargetCount: 0,
        compileRevisionCount: 7,
        editRevisionCount: 7,
        failClosedNegativeCount: 7,
      },
      normativeSource: STRIP_FOUNDATION_CONCRETE_PLACEMENT_SOURCE_METADATA,
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
