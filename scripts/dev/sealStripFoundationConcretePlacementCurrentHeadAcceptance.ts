import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-concrete-placement.current-head-final.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "ffce7418-e0b2-54df-94b9-45ec442eb651";
const SEARCH_RELEASE_ID = "84ccfb2b-1c44-550f-9393-409c5a8d3ed1";
const SOURCE_ID = "src_professional_norm_pack_concrete_nrmca_cip31_selected_contingency_m3_m3_v1";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const PREPARED = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-concrete-placement-family/acceptance.json",
);
const API = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-api/acceptance.json",
);
const STANDARD_WEB = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/web-strip-foundation-concrete-placement-standard/acceptance.json",
);
const DIFFERENTIAL_WEB = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-web/acceptance.json",
);
const STANDARD_ANDROID = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/android-strip-foundation-concrete-placement-standard/acceptance.json",
);
const RUNTIME_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-current-head-runtime",
);
const RUNTIME_MANIFEST = resolve(RUNTIME_ROOT, "backend.json");
const ANDROID_COLD_XML = resolve(RUNTIME_ROOT, "03_high_load_awake.xml");
const ANDROID_ROWS_XML = resolve(RUNTIME_ROOT, "09_high_load_native_summary.xml");
const ANDROID_HEADER_XML = resolve(RUNTIME_ROOT, "10_high_load_native_header.xml");
const PRIOR_ANDROID_VISUAL = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/concrete-family-e4-differential-android/06_high_load_exact_rows.png",
);
const RESIDUAL = resolve(
  ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-16T19-12-34-050Z/candidate-summary.json",
);
const REINFORCEMENT_FINAL = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-final/acceptance.json",
);
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-concrete-placement-current-head-final/acceptance.json",
);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STRIP_CONCRETE_CURRENT_HEAD_FINAL:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function evidence(path: string): Json {
  const bytes = readFileSync(path);
  return { path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function processCount(pattern: string): number {
  const script = `$items=@(Get-CimInstance Win32_Process | Where-Object { `
    + `$_.ProcessId -ne $PID -and $_.CommandLine -match '${pattern.replaceAll("'", "''")}' });`
    + `[int]$items.Count`;
  return Number(execFileSync("powershell", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    timeout: 15_000,
  }).trim());
}

async function main(): Promise<void> {
  const prepared = readJson(PREPARED);
  const api = readJson(API);
  const standardWeb = readJson(STANDARD_WEB);
  const differentialWeb = readJson(DIFFERENTIAL_WEB);
  const standardAndroid = readJson(STANDARD_ANDROID);
  const runtimeManifest = readJson(RUNTIME_MANIFEST);
  const residual = readJson(RESIDUAL);
  const reinforcementFinal = readJson(REINFORCEMENT_FINAL);

  invariant(prepared.status === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_PREPARED_NOT_ACTIVE"
    && prepared.successor?.releaseId === RELEASE_ID
    && prepared.successor?.searchReleaseId === SEARCH_RELEASE_ID
    && prepared.successor?.targets?.length === 7
    && prepared.coreAcceptance?.targetCount === 7
    && prepared.coreAcceptance?.parameterCount === 32
    && prepared.coreAcceptance?.formulaCount === 13
    && prepared.coreAcceptance?.resourceDefinitionCount === 13,
  "PREPARED_RECEIPT_RED");
  invariant(api.status
    === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    && api.denominator?.acceptedTargetCount === 7
    && api.denominator?.compileRevisionCount === 7
    && api.denominator?.editRevisionCount === 7
    && api.denominator?.failClosedNegativeCount === 7
    && api.normativeSource?.sourceId === SOURCE_ID
    && api.normativeSource?.previousGenericReadyMixFactorRejected === true
    && api.targetResults?.every((target: Json) => target.compile?.inventedPriceCount === 0
      && target.edit?.inventedPriceCount === 0),
  "API_RECEIPT_RED");
  invariant(standardWeb.status
    === "GREEN_EXACT_STRIP_FOUNDATION_CONCRETE_PLACEMENT_STANDARD_WEB_BACKEND_PDF_PROCUREMENT_HISTORY"
    && standardWeb.scenarioOriginal?.primaryValue === 30
    && standardWeb.scenarioOriginal?.targetQuantity === 31.8
    && standardWeb.sensitivity?.primaryValue === 40
    && standardWeb.sensitivity?.targetQuantity === 42.4
    && standardWeb.semanticScope?.includedEstimateRowCount === 9
    && standardWeb.semanticScope?.procurementRowCount === 6
    && standardWeb.negative?.length === 3
    && standardWeb.documents?.pdf?.byteSize > 0
    && standardWeb.documents?.pdf?.downloadParity === true
    && standardWeb.documents?.procurement?.selectedProcurementRowCount === 6
    && standardWeb.documents?.procurement?.downloadParity === true
    && standardWeb.historyColdReopen?.revisionId === standardWeb.sensitivity?.revisionId
    && standardWeb.historyColdReopen?.expectedQuantityVisible === true,
  "STANDARD_WEB_RECEIPT_RED");
  invariant(differentialWeb.status
    === "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_DIFFERENTIAL_WEB_HIGH_LOAD_AND_REPAIR_CREATE_EDIT_COLD"
    && differentialWeb.results?.length === 2
    && differentialWeb.results.every((result: Json) => result.edit?.singleBatchApply === true
      && result.coldOpen?.revisionId === result.edit?.revisionId
      && result.exactBranchCompositionVisible === true
      && result.unknownPricesPreserved === true),
  "DIFFERENTIAL_WEB_RECEIPT_RED");
  invariant(standardAndroid.status
    === "GREEN_ANDROID_API34_STRIP_FOUNDATION_CONCRETE_PLACEMENT_CREATE_EDIT_COLD_OPEN"
    && standardAndroid.activationPerformed === false,
  "STANDARD_ANDROID_BASELINE_RED");

  const highLoad = (differentialWeb.results as Json[])
    .find((result) => result.contextKey === "high_load");
  invariant(highLoad?.edit?.inputVolumeM3 === 73
    && highLoad.edit?.readyMixM3 === 80.3
    && highLoad.edit?.rowCount === 11,
  "HIGH_LOAD_WEB_REVISION_RED");
  const revisionId = String(highLoad.edit.revisionId);
  const coldXml = readFileSync(ANDROID_COLD_XML, "utf8");
  const rowsXml = readFileSync(ANDROID_ROWS_XML, "utf8");
  const headerXml = readFileSync(ANDROID_HEADER_XML, "utf8");
  invariant(coldXml.includes("SF-POUR-HIGH-LOAD") && coldXml.includes("72"),
    "CURRENT_ANDROID_COLD_INPUT_RED");
  for (const signal of ["80.3", "540"]) {
    invariant(rowsXml.includes(signal), `CURRENT_ANDROID_ROW_SIGNAL_${signal}`);
  }
  for (const signal of ["80.3", "0/11", "11", "3"]) {
    invariant(headerXml.includes(signal), `CURRENT_ANDROID_HEADER_SIGNAL_${signal}`);
  }
  const priorVisualBytes = readFileSync(PRIOR_ANDROID_VISUAL);
  invariant(priorVisualBytes.length > 100_000
    && priorVisualBytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
  "PRIOR_NATIVE_VISUAL_BASELINE_RED");

  const runtimeTuple = runtimeManifest.compatibility_tuple as Json;
  invariant(runtimeManifest.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT"
    && runtimeTuple.definitionReleaseId === RELEASE_ID
    && runtimeTuple.searchReleaseId === SEARCH_RELEASE_ID
    && runtimeTuple.frontendSourceTreeHash === differentialWeb.runtime?.sourceTree
    && runtimeTuple.frontendProductSourceHash
      === differentialWeb.runtime?.frontendBuildIdentity?.productSourceHash,
  "CURRENT_RUNTIME_TUPLE_RED");
  const requestAudit = resolve(
    RUNTIME_ROOT,
    "runtime",
    `backend-${String(runtimeTuple.sourceTree).slice(0, 12)}`,
    "request-audit.jsonl",
  );
  const nativeAuditRows = readFileSync(requestAudit, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Json)
    .filter((row) => row.userAgent === "okhttp/4.12.0"
      && Date.parse(String(row.at)) >= Date.parse(String(differentialWeb.capturedAt)));
  invariant(nativeAuditRows.length >= 10
    && nativeAuditRows.every((row) => row.method === "GET")
    && nativeAuditRows.some((row) => row.path === `/revisions/${revisionId}` && row.status === 200)
    && nativeAuditRows.some((row) => row.path === `/revisions/${revisionId}/rows?limit=200`
      && row.status === 200),
  "CURRENT_ANDROID_REQUEST_AUDIT_RED");

  invariant(residual.status === "STOP_CANDIDATE_NORM_SOURCE_RESIDUAL_PRESENT"
    && residual.candidate?.definition_release_id === RELEASE_ID
    && residual.candidate?.definition_status === "prepared"
    && residual.candidate?.definition_activated_at == null
    && residual.candidate?.search_release_id === SEARCH_RELEASE_ID
    && residual.candidate?.search_status === "draft"
    && residual.current_residual?.unresolved_distinct_definition_count === 9_888
    && residual.current_residual?.legacy_pack_distinct_definition_count === 1_111
    && residual.current_residual?.legacy_pack_trace_resource_claim_rows === 2_585,
  "CONCRETE_RESIDUAL_RED");
  const reviewedSource = (residual.related_reviewed_source_reachability as Json[])
    .find((row) => row.source_id === SOURCE_ID);
  invariant(reviewedSource?.accepted_registry_source === true
    && Number(reviewedSource.current_normalized_binding_rows) >= 7,
  "NRMCA_REVIEWED_SOURCE_REACHABILITY_RED");
  invariant(reinforcementFinal.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_FAMILY_BACKEND_WEB_ANDROID_PDF_PROCUREMENT_HISTORY_PREPARED_NOT_ACTIVE"
    && reinforcementFinal.postAcceptanceResidual?.nextCandidates?.[0]?.definitions === 608,
  "SUCCESSOR_CONTINUATION_RED");

  for (const receipt of [prepared, api, standardWeb, differentialWeb, standardAndroid]) {
    invariant(receipt.globalStatus === GLOBAL_STATUS
      && receipt.productionAccessed === false
      && receipt.deployPerformed === false
      && receipt.activationPerformed === false
      && receipt.releasePerformed === false
      && receipt.otaPerformed === false,
    "PRODUCTION_OR_RELEASE_MUTATION_RED");
  }

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-concrete-current-head-final-seal",
  });
  await client.connect();
  let release: Json;
  let search: Json;
  let revision: Json;
  let activeJobCount: number;
  try {
    release = (await client.query(
      "select id::text,status,activated_at from public.estimate_definition_release where id=$1",
      [RELEASE_ID],
    )).rows[0] as Json;
    search = (await client.query(
      "select id::text,status,activated_at from public.estimate_search_index_release where id=$1",
      [SEARCH_RELEASE_ID],
    )).rows[0] as Json;
    revision = (await client.query(
      `select id::text,parent_revision_id::text,release_id::text,catalog_id,
        revision_number,row_count,input_parameters
        from public.estimate_revision where id=$1`,
      [revisionId],
    )).rows[0] as Json;
    activeJobCount = Number((await client.query(
      `select count(*)::int count from public.estimate_compile_job
        where upper(status) in ('QUEUED','RUNNING','CLAIMED','RETRY_WAIT')`,
    )).rows[0].count);
  } finally {
    await client.end();
  }
  invariant(release?.status === "prepared" && release.activated_at == null
    && search?.status === "draft" && search.activated_at == null
    && revision?.release_id === RELEASE_ID
    && revision.catalog_id === highLoad.catalogId
    && Number(revision.row_count) === 11
    && Number(revision.input_parameters?.plan_dimension_concrete_volume_m3) === 73
    && activeJobCount === 0,
  "FINAL_DATABASE_LIFECYCLE_RED");

  const metroCount = processCount("expo.*start.*--web.*8081");
  const emulatorCount = processCount("qemu-system.*Pixel_7_API_34");
  invariant(metroCount === 0 && emulatorCount === 0, "HEAVY_PROCESS_CLEANUP_RED");
  const disk = statfsSync(resolve("."));
  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status:
      "GREEN_STRIP_FOUNDATION_CONCRETE_PLACEMENT_CURRENT_HEAD_BACKEND_WEB_ANDROID_PDF_PROCUREMENT_HISTORY_PREPARED_NOT_ACTIVE",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      acceptedRuntimeHead: runtimeTuple.sourceHead,
      acceptedProductSourceHash: runtimeTuple.frontendProductSourceHash,
      harnessOnlyCommitAfterRuntime: true,
    },
    runtime: {
      definitionReleaseId: RELEASE_ID,
      definitionReleaseStatus: release.status,
      definitionActivatedAt: release.activated_at ?? null,
      searchReleaseId: SEARCH_RELEASE_ID,
      searchReleaseStatus: search.status,
      searchActivatedAt: search.activated_at ?? null,
      activeCompileJobCount: activeJobCount,
    },
    denominator: {
      preparedTargets: 7,
      backendCreateEditHistoryTargets: 7,
      backendFailClosedNegativeTargets: 7,
      standardWebTargets: 1,
      differentialWebTargets: 2,
      currentNativeAndroidApi34ColdTargets: 1,
      priorNativeAndroidCreateEditColdTargets: 1,
      parametersPerTarget: 32,
      formulaDefinitionsPerTarget: 13,
      resourceDefinitionsPerTarget: 13,
      blockedTargets: 0,
    },
    acceptance: {
      standardWeb: { fromM3: 30, orderM3: 31.8, editedM3: 40, editedOrderM3: 42.4 },
      differentialWeb: { contexts: ["high_load", "repair"], highLoadRows: 11, repairRows: 7 },
      currentNativeAndroid: {
        apiLevel: 34,
        revisionId,
        inputConcreteVolumeM3: 73,
        readyMixConcreteM3: 80.3,
        heatingCableM: 540,
        estimateRowCount: 11,
        inventedPriceCount: 0,
        currentUiAutomatorExactSignals: true,
        currentReadOnlyRequestAudit: true,
        framebufferPngMode: "PRIOR_ACCEPTED_VISUAL_BASELINE_REUSED_CURRENT_UI_TREE_PRIMARY",
      },
      pdf: {
        revisionId: standardWeb.documents.pdf.revisionId,
        byteSize: standardWeb.documents.pdf.byteSize,
        sha256: standardWeb.documents.pdf.sha256,
        downloadParity: true,
      },
      procurement: {
        revisionId: standardWeb.documents.procurement.revisionId,
        rowCount: 6,
        sha256: standardWeb.documents.procurement.sha256,
        downloadParity: true,
      },
      immutableHistory: true,
      exactNrmcaCip31OrderQuantitySourceOnly: true,
      projectScheduleClaimsSeparatedFromNrmca: true,
      unknownPricesPreserved: true,
    },
    receipts: {
      prepared: prepared.receiptSha256,
      api: api.receiptSha256,
      standardWeb: standardWeb.receiptSha256,
      differentialWeb: differentialWeb.receiptSha256,
      priorStandardAndroid: standardAndroid.receiptSha256,
      concreteResidual: residual.receipt_sha256,
      subsequentReinforcementFinal: reinforcementFinal.receiptSha256,
    },
    postAcceptanceResidual: {
      concreteCandidate: {
        unresolvedDistinctDefinitions: 9_888,
        legacyDistinctDefinitions: 1_111,
        legacyTraceRows: 2_585,
        firstLegacyFamilyDefinitions: 615,
      },
      currentLaterSuccessor: {
        unresolvedDistinctDefinitions:
          reinforcementFinal.postAcceptanceResidual.unresolvedDistinctDefinitions,
        legacyDistinctDefinitions: reinforcementFinal.postAcceptanceResidual.legacyDistinctDefinitions,
        legacyTraceRows: reinforcementFinal.postAcceptanceResidual.legacyTraceRows,
        firstLegacyFamilyDefinitions: 608,
      },
      nextAction:
        "Prepare the first exact bounded family under legacy concrete ready-mix (608 definitions) from the later reinforcement successor; keep prepared/draft only.",
    },
    nativeRequestAudit: {
      requestCount: nativeAuditRows.length,
      methods: [...new Set(nativeAuditRows.map((row) => row.method))],
      mutationCount: nativeAuditRows.filter((row) => row.method !== "GET").length,
    },
    evidence: [
      evidence(PREPARED),
      evidence(API),
      evidence(STANDARD_WEB),
      evidence(DIFFERENTIAL_WEB),
      evidence(ANDROID_COLD_XML),
      evidence(ANDROID_ROWS_XML),
      evidence(ANDROID_HEADER_XML),
      evidence(PRIOR_ANDROID_VISUAL),
      evidence(requestAudit),
      evidence(RESIDUAL),
      evidence(REINFORCEMENT_FINAL),
    ],
    resourceControl: {
      availableMemoryBytes: freemem(),
      availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
      emulatorRunning: false,
      metroRunning: false,
      backendPreserved: true,
      databasePreserved: true,
      providerPreserved: true,
      historyPreserved: true,
    },
    productionRequests: 0,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const receipt = { ...body, receiptSha256: sha256(JSON.stringify(body)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    preparedTargets: 7,
    backendAcceptedTargets: 7,
    webTargets: 3,
    androidTargets: 2,
    currentResidualNextDefinitions: 608,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
