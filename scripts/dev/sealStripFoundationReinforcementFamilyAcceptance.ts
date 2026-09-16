import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, statfsSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-reinforcement-family-final-acceptance.v1";
const GLOBAL_STATUS = "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY";
const DATABASE_URL = "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const RELEASE_ID = "831a5ba4-af0f-561c-8766-09a960cf2c74";
const SEARCH_RELEASE_ID = "2a89ec21-c69a-50f2-9c84-9810a9c276e1";
const MASTER = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (9).md",
);
const PREPARED = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family/prepared-acceptance.json",
);
const API = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-api/acceptance.json",
);
const WEB = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-differential-web/acceptance.json",
);
const ANDROID = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-android/acceptance.json",
);
const RESIDUAL = resolve(
  ".release-runtime/ai-estimate-real-professional-norm-packs/2026-09-16T18-44-36-935Z/candidate-summary.json",
);
const OUTPUT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-reinforcement-family-e5-final/acceptance.json",
);
const SOURCE_ID =
  "src_professional_norm_pack_reinforcement_project_bar_schedule_weight_same_unit_routing_v1";
const LEGACY_SOURCE_ID =
  "src_professional_norm_pack_reinforcement_rebar_kg_m3_concrete_element_v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`STRIP_REINFORCEMENT_FINAL:${code}`);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")) as Json;
}

function evidence(path: string): Json {
  const bytes = readFileSync(path);
  return {
    path: path.replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

async function main(): Promise<void> {
  const prepared = readJson(PREPARED);
  const api = readJson(API);
  const web = readJson(WEB);
  const android = readJson(ANDROID);
  const residual = readJson(RESIDUAL);
  invariant(prepared.status === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_FINAL_PREPARED_DRAFT_NOT_ACTIVE"
    && prepared.denominator?.targetCount === 7
    && prepared.denominator?.preparedTargetCount === 7
    && prepared.denominator?.blockedTargetCount === 0
    && prepared.denominator?.parameterCountPerTarget === 37
    && prepared.denominator?.formulaCountPerTarget === 16
    && prepared.denominator?.resourceDefinitionCountPerTarget === 16
    && prepared.normativeClosure?.sourceId === SOURCE_ID
    && prepared.normativeClosure?.legacyRows === 0,
  "PREPARED_RECEIPT_RED");
  invariant(api.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_7_OF_7_BACKEND_CREATE_EDIT_HISTORY_FAIL_CLOSED_PREPARED_NOT_ACTIVE"
    && api.denominator?.acceptedTargetCount === 7
    && api.denominator?.compileRevisionCount === 7
    && api.denominator?.editRevisionCount === 7
    && api.denominator?.failClosedNegativeCount === 7,
  "API_RECEIPT_RED");
  invariant(web.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_WEB_STANDARD_AND_HIGH_LOAD_CREATE_EDIT_PDF_PROCUREMENT_HISTORY_COLD_PREPARED_NOT_ACTIVE"
    && web.results?.length === 2
    && web.results.every((result: Json) => result.promptParameterCount === 37
      && result.history?.delta === 2
      && result.artifacts?.pdf?.downloadParity === true
      && result.artifacts?.procurement?.downloadParity === true),
  "WEB_RECEIPT_RED");
  invariant(android.status
    === "GREEN_STRIP_FOUNDATION_REINFORCEMENT_DIFFERENTIAL_ANDROID_HIGH_LOAD_COLD_OPEN_PDF_PROCUREMENT_HISTORY_PREPARED_NOT_ACTIVE"
    && android.coldOpen?.estimateRowCount === 16
    && android.coldOpen?.approvedScheduleWeightKg === 8_700
    && android.coldOpen?.procurementRowCount === 10
    && android.requestAudit?.mutationCount === 0
    && android.resourceControl?.emulatorStopped === true
    && android.resourceControl?.metroStopped === true
    && android.resourceControl?.backendPreserved === true,
  "ANDROID_RECEIPT_RED");
  for (const receipt of [prepared, api, web, android]) {
    invariant(receipt.globalStatus === GLOBAL_STATUS
      && receipt.productionRequests === 0
      && receipt.productionAccessed === false
      && receipt.deployPerformed === false
      && receipt.activationPerformed === false
      && receipt.releasePerformed === false
      && receipt.otaPerformed === false,
    "PRODUCTION_OR_RELEASE_MUTATION_RED");
  }
  invariant(residual.status === "STOP_CANDIDATE_NORM_SOURCE_RESIDUAL_PRESENT"
    && residual.candidate?.definition_release_id === RELEASE_ID
    && residual.candidate?.definition_status === "prepared"
    && residual.candidate?.definition_activated_at == null
    && residual.candidate?.search_release_id === SEARCH_RELEASE_ID
    && residual.candidate?.search_status === "draft"
    && residual.current_residual?.unresolved_distinct_definition_count === 9_881
    && residual.current_residual?.legacy_pack_distinct_definition_count === 1_104
    && residual.current_residual?.legacy_pack_trace_resource_claim_rows === 2_564,
  "POST_ACCEPTANCE_RESIDUAL_RED");
  const legacyDisposition = (residual.exact_8_plus_4_disposition as Json[])
    .find((row) => row.source_id === LEGACY_SOURCE_ID);
  const reviewedReachability = (residual.related_reviewed_source_reachability as Json[])
    .find((row) => row.source_id === SOURCE_ID);
  invariant(legacyDisposition?.disposition === "REAL_CURRENT_CANDIDATE_GAP"
    && legacyDisposition.current_trace_definition_count === 608
    && reviewedReachability?.accepted_registry_source === true
    && Number(reviewedReachability.current_normalized_binding_rows) >= 7,
  "RESIDUAL_REINFORCEMENT_DISPOSITION_RED");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "strip-reinforcement-family-final-seal",
  });
  await client.connect();
  let release: Json;
  let search: Json;
  let targetCount: number;
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
    targetCount = Number((await client.query(
      `select count(*)::int count from public.estimate_cumulative_manifest_entry
        where release_id=$1 and catalog_id like
          'canonical-work:base:concrete_foundation_interior_strip_foundation_reinforce_%'`,
      [RELEASE_ID],
    )).rows[0].count);
    activeJobCount = Number((await client.query(
      `select count(*)::int count from public.estimate_compile_job
        where upper(status) in ('QUEUED','RUNNING','CLAIMED','RETRY_WAIT')`,
    )).rows[0].count);
  } finally {
    await client.end();
  }
  invariant(release.status === "prepared" && release.activated_at == null
    && search.status === "draft" && search.activated_at == null
    && targetCount === 7 && activeJobCount === 0,
  "FINAL_DATABASE_LIFECYCLE_RED");

  const disk = statfsSync(resolve("."));
  const receipts = [PREPARED, API, WEB, ANDROID, RESIDUAL].map(evidence);
  const nextCandidates = (residual.next_family_candidates as Json[]).slice(0, 4)
    .map((candidate) => ({
      sourceId: candidate.source_id,
      definitions: Number(candidate.definitions),
      domains: candidate.domains,
    }));
  invariant(nextCandidates.length === 4
    && nextCandidates[0].sourceId
      === "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1"
    && nextCandidates[0].definitions === 608,
  "NEXT_RESIDUAL_QUEUE_RED");

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    status: "GREEN_STRIP_FOUNDATION_REINFORCEMENT_FAMILY_BACKEND_WEB_ANDROID_PDF_PROCUREMENT_HISTORY_PREPARED_NOT_ACTIVE",
    globalStatus: GLOBAL_STATUS,
    master: evidence(MASTER),
    source: {
      branch: execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim(),
      head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
      tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim(),
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
      failClosedNegativeTargets: 7,
      ordinaryWebDifferentialTargets: 2,
      nativeAndroidApi34DifferentialTargets: 1,
      parametersPerTarget: 37,
      formulaDefinitionsPerTarget: 16,
      resourceDefinitionsPerTarget: 16,
      blockedTargets: 0,
    },
    acceptance: {
      preparedReceiptSha256: prepared.receiptSha256,
      apiReceiptSha256: api.receiptSha256,
      webReceiptSha256: web.receiptSha256,
      androidReceiptSha256: android.receiptSha256,
      ordinaryFormInput: true,
      batchParameterEdit: true,
      immutableHistory: true,
      pdfDownloadParity: true,
      procurementDownloadParity: true,
      nativeColdOpen: true,
      unknownPricesPreserved: true,
      exactReviewedSourceOnly: true,
      legacyKgPerM3AbsentFromSevenTargets: true,
    },
    postAcceptanceResidual: {
      status: residual.status,
      receiptSha256: residual.receipt_sha256,
      unresolvedDistinctDefinitions: residual.current_residual.unresolved_distinct_definition_count,
      legacyDistinctDefinitions: residual.current_residual.legacy_pack_distinct_definition_count,
      legacyTraceRows: residual.current_residual.legacy_pack_trace_resource_claim_rows,
      nextCandidates,
      nextAction:
        "Prepare the first exact bounded family under legacy concrete ready-mix (608 definitions), preserving per-work applicability and prepared/draft-only lifecycle.",
    },
    evidence: receipts,
    resourceControl: {
      availableMemoryBytes: freemem(),
      availableDiskBytes: Number(disk.bavail) * Number(disk.bsize),
      emulatorRunning: false,
      metroRunning: false,
      backendPreserved: true,
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
  const receipt = { ...body, receiptSha256: sha256(JSON.stringify(body)) };
  atomicJson(OUTPUT, receipt);
  process.stdout.write(`${JSON.stringify({
    status: receipt.status,
    preparedTargets: 7,
    backendAcceptedTargets: 7,
    webDifferentialTargets: 2,
    androidDifferentialTargets: 1,
    nextResidualSourceId: nextCandidates[0].sourceId,
    receiptSha256: receipt.receiptSha256,
  })}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
