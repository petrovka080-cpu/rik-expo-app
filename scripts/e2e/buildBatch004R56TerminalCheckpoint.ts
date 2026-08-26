import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type Check = { name: string; passed: boolean; details?: unknown };
type IndexedArtifact = { path: string; sha256: string; bytes: number };

const WORKSPACE = resolve(".");
const MASTER = resolve("C:/Users/User/Downloads/MASTER_TZ_R56_BATCH004_008_CANONICAL_TERMINAL_GREEN_R1_RU.md");
const MASTER_SHA256 = "4961f2ad4f3f157869c4dced3b2cd3ee7a22c8fad89882a51875c3435b1acbe7";
const FROZEN_MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const FROZEN_MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56");
const STATIC = resolve(ROOT, "static");
const CONTENT = resolve(ROOT, "content");
const BACKEND = resolve(ROOT, "backend");
const MATRIX = resolve(ROOT, "matrix");
const WEB = resolve(ROOT, "web");
const ANDROID = resolve(ROOT, "android");
const FINAL = resolve(ROOT, "final");
const RUNNER_LOCK = resolve(ANDROID, "runtime/BATCH004_ANDROID_API34_50.lock.json");

const EXPECTED = {
  acceptedBackendSourceStateId: "0722eecc9df75302a54441a43a9e20f48b2710b44475fad9b3d1a91a7a662639",
  releaseId: "b28fdda9-e55f-4629-bba8-24ff15e7d8b6",
  searchReleaseId: "962cf536-82a9-4bd9-ac5b-0fabf08bcc8a",
  capabilityId: "7d2bc6aa-449e-4e72-a99a-2119a45aedea",
  apkSha256: "da4e12ae2e218b41173cf7f21cf325c5c1a90a08434a1d11e15f4201f9be2243",
  bundleSha256: "3b8d39a622ea41b19189b6ee05679e955f6fce8e52b9055f2fecd4712ede029f",
  sourceMapSha256: "7d1765a1cc268131469f96751573a7a69445565ef5ab2c36028197d5b1cb7cfc",
  postBackendDumpSha256: "bb55748683d191e538ac345dd69ac86931263341cb9ffa3aa0ef2a40e5134778",
  postAndroidDumpSha256: "f6dee47f6503fc1d8ad2d58a844cb0d017fe9621775ae700be5e06c75e9ce404",
  androidResultSha256: "64a408930a7afe6e790ed660aa36fc24162fe67b437909d2ff39508c92fb1f89",
} as const;

const PATHS = {
  static: resolve(STATIC, "BATCH004_R56_STATIC_RECONCILIATION.json"),
  verdicts: resolve(STATIC, "BATCH004_R56_CATALOG_VERDICTS.jsonl"),
  durableJest: resolve(STATIC, "BATCH004_R56_DURABLE_JEST.json"),
  componentIdentities: resolve(STATIC, "BATCH004_R56_COMPONENT_IDENTITIES.json"),
  content: resolve(CONTENT, "BATCH004_R56_CONTENT_ACCEPTANCE.json"),
  contentCards: resolve(CONTENT, "BATCH004_R56_CONTENT_ACCEPTANCE_CARDS.jsonl"),
  backend: resolve(BACKEND, "BATCH004_BACKEND_REVISION_PARITY_R56.json"),
  postBackendDump: resolve(BACKEND, "batch004-r56-post-backend-green.dump"),
  androidMatrix: resolve(MATRIX, "BATCH004_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"),
  webMatrix: resolve(MATRIX, "BATCH004_R56_WEB_MATRIX50_MANIFEST.json"),
  web: resolve(WEB, "BATCH004_R56_WEB_50_RESULT.json"),
  webTrace: resolve(WEB, "batch004_r56_web_canonical_trace.jsonl"),
  build: resolve(ANDROID, "ANDROID_PROOF_BUILD_MANIFEST.json"),
  auth: resolve(ANDROID, "ANDROID_AUTH_BOOTSTRAP_PROOF.json"),
  sourceAttestation: resolve(ANDROID, "runtime/BATCH004_R56_POST_BUILD_SOURCE_ATTESTATION.json"),
  case4Mutation: resolve(ANDROID, "BATCH002_ANDROID_CASE4_MUTATION_PROOF.json"),
  case10Photo: resolve(ANDROID, "BATCH002_ANDROID_CASE10_PHOTO_PROOF.json"),
  android: resolve(ANDROID, "BATCH004_R56_ANDROID_API34_50_RESULT.json"),
  processAudit: resolve(ANDROID, "RUNNER_SINGLE_FLIGHT_AND_PROCESS_AUDIT_R55.json"),
  postAndroidDump: resolve(ANDROID, "batch004-r56-post-android-green.dump"),
  postAndroidAttestation: resolve(ANDROID, "BATCH004_R56_POST_ANDROID_DUMP_ATTESTATION.json"),
  buildArchiveManifest: resolve(ANDROID, "archive/accepted-build/BATCH004_R56_ACCEPTED_BUILD_ARCHIVE.json"),
  archivedApk: resolve(ANDROID, "archive/accepted-build/app-waterProof-batch004-r56.apk"),
  archivedBundle: resolve(ANDROID, "archive/accepted-build/index.android.batch004-r56.bundle"),
  archivedSourceMap: resolve(ANDROID, "archive/accepted-build/index.android.batch004-r56.bundle.map"),
  masterSnapshot: resolve(FINAL, "MASTER_TZ_R56_BATCH004_008_CANONICAL_TERMINAL_GREEN_R1_RU.md"),
  reconciliation: resolve(FINAL, "BATCH004_R56_MASTER_R1_RECONCILIATION.json"),
  cleanup: resolve(FINAL, "BATCH004_R56_LOCAL_CLEANUP_AUDIT.json"),
  evidenceIndex: resolve(FINAL, "BATCH004_R56_EXACT_SHA_EVIDENCE_INDEX.json"),
  checkpoint: resolve(FINAL, "BATCH004_R56_TERMINAL_CHECKPOINT.json"),
} as const;

const PRIOR_TERMINALS = [
  {
    batch: "BATCH-001",
    status: "BATCH001_TERMINAL_GREEN_NO_RELEASE",
    path: resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/final/BATCH001_R56_TERMINAL_CHECKPOINT.json"),
    sha256: "0d3fd7d4c9d1d389a4787e2be3767d74e196bf899c07ff088d8b82b11c39e106",
  },
  {
    batch: "BATCH-002",
    status: "BATCH_TERMINAL_GREEN_NO_RELEASE",
    path: resolve(".release-runtime/real-professional-estimates-r4/evidence/07-closeout/batch002/BATCH002_TERMINAL_CHECKPOINT_R56.json"),
    sha256: "61f504714e139deb56027edbc7b6f97020a630fbb174caf45ef7b23bc054b2e3",
  },
  {
    batch: "BATCH-003",
    status: "BATCH_TERMINAL_GREEN_NO_RELEASE",
    path: resolve(".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/final/BATCH003_R56_TERMINAL_CHECKPOINT.json"),
    sha256: "2f46c13f5a211281fefb72b8ee99905ffb713d4c5d29aad75a4d453968e9c5f0",
  },
] as const;

const checks: Check[] = [];

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function atomicBytes(path: string, value: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, path);
}

function check(name: string, condition: boolean, details?: unknown): void {
  checks.push({ name, passed: condition, ...(details === undefined ? {} : { details }) });
  if (!condition) throw new Error(`BATCH004_R56_TERMINAL_CHECK_FAILED:${name}`);
}

function canonicalPath(path: string): string {
  return relative(WORKSPACE, path).replaceAll("\\", "/");
}

function indexed(path: string): IndexedArtifact {
  check(`${canonicalPath(path)}_exists`, existsSync(path), canonicalPath(path));
  const bytes = readFileSync(path);
  return { path: canonicalPath(path), sha256: sha256(bytes), bytes: bytes.length };
}

function noReleaseMutation(value: Json): boolean {
  const flags = [
    value.release_performed,
    value.releasePerformed,
    value.deploy_performed,
    value.deployPerformed,
    value.ota_performed,
    value.otaPerformed,
    value.merge_performed,
    value.mergePerformed,
    value.push_performed,
    value.pushPerformed,
    value.batch009_performed,
    value.batch009Performed,
  ].filter((entry) => entry !== undefined);
  return flags.length > 0 && flags.every((entry) => entry === false);
}

function inspectCleanup(): Json {
  const powershell = String.raw`
$ports = @(8187,8769,55436)
$listeners = @($ports | ForEach-Object {
  $port = $_
  $rows = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  [pscustomobject]@{ port = $port; owning_processes = @($rows | ForEach-Object { $_.OwningProcess }) }
})
$taskProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -and
  $_.CommandLine -match 'rik-expo-app-p0-estimate-truth-remediation-r1' -and
  $_.CommandLine -match 'serveBatch002R4LocalSupabaseStub|serveCanonicalEstimateLocalR1|runBatch002R52AndroidApi34Matrix50'
} | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; name = $_.Name; command_line = $_.CommandLine } })
[pscustomobject]@{ listeners = $listeners; task_owned_runtime_processes = $taskProcesses } | ConvertTo-Json -Depth 8 -Compress
`;
  const runtime = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command", powershell], {
    encoding: "utf8",
  })) as Json;
  const docker = spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" });
  check("docker_inventory_available", docker.status === 0, docker.stderr);
  const containers = String(docker.stdout).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean);
  return {
    generated_at: new Date().toISOString(),
    required_free_ports: [8187, 8769, 55436],
    ...runtime,
    temporary_container: "rik-batch004-r56-parity-temp",
    temporary_container_present: containers.includes("rik-batch004-r56-parity-temp"),
    android_runner_lock: canonicalPath(RUNNER_LOCK),
    android_runner_lock_present: existsSync(RUNNER_LOCK),
  };
}

check("terminal_checkpoint_not_already_present", !existsSync(PATHS.checkpoint), canonicalPath(PATHS.checkpoint));
check("master_exists", existsSync(MASTER), MASTER);
check("master_sha256", fileSha(MASTER) === MASTER_SHA256, fileSha(MASTER));
check("frozen_master_exists", existsSync(FROZEN_MASTER), FROZEN_MASTER);
check("frozen_master_sha256", fileSha(FROZEN_MASTER) === FROZEN_MASTER_SHA256, fileSha(FROZEN_MASTER));
for (const terminal of PRIOR_TERMINALS) {
  check(`${terminal.batch}_terminal_exists`, existsSync(terminal.path), canonicalPath(terminal.path));
  check(`${terminal.batch}_terminal_sha256`, fileSha(terminal.path) === terminal.sha256, fileSha(terminal.path));
}

const staticReport = readJson(PATHS.static);
check("static_status", staticReport.status === "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING", staticReport.status);
check("static_frozen_master", staticReport.masterSha256 === FROZEN_MASTER_SHA256);
check("static_denominators", staticReport.denominators?.definitions === "393/393"
  && staticReport.denominators?.catalogVerdicts === "393/393"
  && staticReport.denominators?.compile === "393/393"
  && staticReport.denominators?.recalculate === "393/393"
  && staticReport.denominators?.independentOracle === "393/393"
  && staticReport.denominators?.primaryMutations === "393/393", staticReport.denominators);
check("static_defect_counters_zero", Object.keys(staticReport.defectCounters ?? {}).length === 15
  && Object.values(staticReport.defectCounters as Json).every((value) => value === 0), staticReport.defectCounters);
check("static_successor_rows", staticReport.totals?.predecessorRows === 19_605
  && staticReport.totals?.successorRows === 2_768, staticReport.totals);
check("static_verdicts_393", Array.isArray(staticReport.verdicts)
  && staticReport.verdicts.length === 393
  && staticReport.verdicts.every((entry: Json) => String(entry.status).startsWith("GREEN")));
check("static_no_runtime_mutation", staticReport.runtimeMutation?.databaseWrites === 0
  && staticReport.runtimeMutation?.release === false
  && staticReport.runtimeMutation?.deploy === false
  && staticReport.runtimeMutation?.ota === false
  && staticReport.runtimeMutation?.merge === false, staticReport.runtimeMutation);
check("static_no_release", noReleaseMutation(staticReport));

const content = readJson(PATHS.content);
check("content_status", content.status === "GREEN_R56_BATCH004_CONTENT_393_OF_393_BOUND_TO_BACKEND_NO_RELEASE", content.status);
check("content_frozen_master", content.masterSha256 === FROZEN_MASTER_SHA256);
check("content_denominators", content.denominators?.definitions === "393/393"
  && content.denominators?.contentCards === "393/393"
  && content.denominators?.roleVerdicts === "1179/1179"
  && content.denominators?.immutableRevisionChains === "393/393"
  && content.denominators?.pdfArtifacts === "393/393"
  && content.denominators?.procurementArtifacts === "393/393", content.denominators);
check("content_source_bytes_exact", content.exactBackendSourceBytes?.checked === 322
  && Array.isArray(content.exactBackendSourceBytes?.mismatches)
  && content.exactBackendSourceBytes.mismatches.length === 0, content.exactBackendSourceBytes);
check("content_connections", content.connectionAudit?.otherConnectionsDuringFinalAudit === 0
  && content.connectionAudit?.leakedConnectionsAfterBackendExit === 0
  && content.connectionAudit?.burstConnections === false, content.connectionAudit);
check("content_no_release", noReleaseMutation(content));

const durable = readJson(PATHS.durableJest);
check("durable_jest_green", durable.success === true
  && durable.numPassedTestSuites === 1
  && durable.numPassedTests === 7
  && durable.numFailedTestSuites === 0
  && durable.numFailedTests === 0
  && durable.wasInterrupted === false, durable);

const components = readJson(PATHS.componentIdentities);
check("component_identities_393", Array.isArray(components.definitions)
  && components.definitions.length === 393
  && new Set(components.definitions.map((entry: Json) => entry.catalogId)).size === 393);
check("component_identity_hashes", /^[0-9a-f]{64}$/u.test(String(components.sourceStateId))
  && components.definitions.every((entry: Json) => /^[0-9a-f]{64}$/u.test(String(entry.definitionSha256))));

const backend = readJson(PATHS.backend);
check("backend_status", backend.status === "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE", backend.status);
check("backend_frozen_master", backend.masterSha256 === FROZEN_MASTER_SHA256);
check("backend_identity", backend.sourceStateId === EXPECTED.acceptedBackendSourceStateId
  && backend.releaseId === EXPECTED.releaseId
  && backend.searchReleaseId === EXPECTED.searchReleaseId
  && backend.capabilityId === EXPECTED.capabilityId);
check("backend_counts", backend.counts?.definitions === 393
  && backend.counts?.revisions === 1_179
  && backend.counts?.child_revisions === 786
  && backend.counts?.artifacts === 786
  && backend.counts?.succeeded_jobs === 1_965
  && JSON.stringify(backend.counts) === JSON.stringify(backend.expectedCounts), backend.counts);
check("backend_proofs", Array.isArray(backend.proofs)
  && backend.proofs.length === 393
  && backend.proofs.every((entry: Json) => entry.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"));
check("backend_invariants", Object.values(backend.invariants as Json).every((value) => value === true), backend.invariants);
check("backend_connections", backend.connectionAudit?.runnerDatabaseClients === 1
  && backend.connectionAudit?.backendPoolMaximum === 4
  && backend.connectionAudit?.fixtureMaterializationMaxInFlight === 1
  && backend.connectionAudit?.definitionExecution === "SEQUENTIAL"
  && backend.connectionAudit?.burstConnections === false, backend.connectionAudit);
check("backend_prepared_not_active", backend.releaseStatus === "prepared" && backend.releaseActivated === false);
check("backend_no_release", noReleaseMutation(backend));
check("backend_dump_exact", existsSync(PATHS.postBackendDump)
  && fileSha(PATHS.postBackendDump) === EXPECTED.postBackendDumpSha256
  && readFileSync(PATHS.postBackendDump).length > 1_000);
check("content_backend_binding", content.backend?.sha256 === fileSha(PATHS.backend)
  && content.backend?.sourceStateId === backend.sourceStateId
  && content.backend?.definitionSetSha256 === backend.definitionSetSha256
  && content.staticReconciliation?.sha256 === fileSha(PATHS.static));

const matrix = readJson(PATHS.androidMatrix);
check("matrix_status", matrix.status === "FROZEN_R56_BATCH004_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE", matrix.status);
check("matrix_denominator", matrix.expected === 50
  && matrix.distinct_catalog_ids === 50
  && matrix.distinct_parent_revisions === 50
  && Array.isArray(matrix.cases)
  && matrix.cases.length === 50
  && new Set(matrix.cases.map((entry: Json) => entry.case)).size === 50);
check("matrix_backend_binding", matrix.backend_evidence?.sha256 === fileSha(PATHS.backend)
  && matrix.accepted_backend_source_state_id === backend.sourceStateId
  && matrix.definition_set_sha256 === backend.definitionSetSha256);
check("matrix_release_binding", matrix.release_id === backend.releaseId
  && matrix.search_release_id === backend.searchReleaseId);
check("matrix_source_binding", matrix.app_source_component_state_id === backend.sourceStateId
  && /^[0-9a-f]{64}$/u.test(String(matrix.harness_state_id)));
check("matrix_independent_oracle", matrix.business_oracle_source_is_independent_of_runtime_api === true
  && /^[0-9a-f]{64}$/u.test(String(matrix.business_oracle_sha256)));
check("matrix_connections", matrix.connection_audit?.maximumInFlight === 1
  && matrix.connection_audit?.burstConnections === false);
check("matrix_harness_manifest", Array.isArray(matrix.harness_file_manifest?.files)
  && matrix.harness_file_manifest.files.length === 10
  && matrix.harness_file_manifest.files.every((entry: Json) => existsSync(resolve(entry.path))
    && fileSha(resolve(entry.path)) === entry.sha256));
check("matrix_no_release", noReleaseMutation(matrix));

const web = readJson(PATHS.web);
check("web_status", web.status === "GREEN_R56_BATCH004_REAL_WEB_50_OF_50_NO_RELEASE", web.status);
check("web_denominator", web.expected === 50 && web.executed === 50 && web.green === 50
  && web.distinctCatalogIds === 50 && Array.isArray(web.blockers) && web.blockers.length === 0);
check("web_roles", web.roleCounts?.ORDINARY_USER === 18
  && web.roleCounts?.ESTIMATOR === 16
  && web.roleCounts?.CONSTRUCTION_ENGINEER === 16, web.roleCounts);
check("web_binding", web.source?.sourceStateId === backend.sourceStateId
  && web.releaseId === backend.releaseId
  && web.backendEvidence?.sha256 === fileSha(PATHS.backend));
check("web_connections", web.runtimeConnectionAudit?.burstConnections === false
  && web.runtimeConnectionAudit?.maximumActiveCheckouts <= web.runtimeConnectionAudit?.poolMaximumPerDatabaseIdentity
  && web.runtimeConnectionAudit?.pools?.every((entry: Json) => entry.waiting === 0));
check("web_boundary", Array.isArray(web.networkBoundary?.externalRequestAttempts)
  && web.networkBoundary.externalRequestAttempts.length === 0
  && Array.isArray(web.consoleErrors) && web.consoleErrors.length === 0
  && Array.isArray(web.pageErrors) && web.pageErrors.length === 0);
check("web_no_release", noReleaseMutation(web));

const build = readJson(PATHS.build);
const auth = readJson(PATHS.auth);
const sourceAttestation = readJson(PATHS.sourceAttestation);
const buildArchive = readJson(PATHS.buildArchiveManifest);
check("build_status", build.status === "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE", build.status);
check("build_source", build.source_changed_during_build === false
  && build.source_state_id === backend.sourceStateId
  && build.app_source_state_id === backend.sourceStateId
  && build.accepted_backend_component_state_id === backend.sourceStateId);
check("build_archive", fileSha(PATHS.archivedApk) === EXPECTED.apkSha256
  && fileSha(PATHS.archivedBundle) === EXPECTED.bundleSha256
  && fileSha(PATHS.archivedSourceMap) === EXPECTED.sourceMapSha256
  && build.apk_sha256_full === EXPECTED.apkSha256
  && build.js_bundle_sha256 === EXPECTED.bundleSha256
  && build.source_map_sha256 === EXPECTED.sourceMapSha256
  && buildArchive.status === "GREEN_R56_BATCH004_ACCEPTED_BUILD_ARCHIVED_NO_RELEASE");
check("build_source_attestation", build.source_attestation?.sha256 === fileSha(PATHS.sourceAttestation)
  && sourceAttestation.status === "ATTESTED_BATCH004_R56_BUILD_INPUTS_PRECEDE_BUNDLE_NO_RELEASE");
check("build_bundle_origins", build.expected_bundle_markers?.every((entry: Json) => entry.present_in_bundle === true)
  && build.forbidden_production_origins?.every((entry: Json) => entry.present_in_bundle === false));
check("build_auth_binding", build.auth_runtime_proof_completed === true
  && build.auth_runtime_proof?.sha256 === fileSha(PATHS.auth)
  && build.auth_runtime_proof?.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE");
check("build_release", build.release_identity?.release_id === backend.releaseId
  && build.release_identity?.release_status === "prepared"
  && build.release_identity?.activated === false);
check("build_no_release", noReleaseMutation(build) && noReleaseMutation(buildArchive));

check("auth_status", auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE", auth.status);
check("auth_identity", auth.source_state_id === backend.sourceStateId
  && auth.app_source_state_id === backend.sourceStateId
  && auth.apk_sha256_full === EXPECTED.apkSha256);
check("auth_bootstrap", auth.auth_bootstrap?.persisted_session_assumed === false
  && auth.auth_bootstrap?.app_data_cleared_before_login === true
  && auth.auth_bootstrap?.native_login_ui_used === true
  && auth.auth_bootstrap?.token_post_count === 1
  && auth.auth_bootstrap?.user_lookup_count === 1
  && auth.auth_bootstrap?.role_lookup_count === 2, auth.auth_bootstrap);
check("auth_boundary", auth.network_audit?.production_requests === 0
  && auth.network_audit?.unexpected_external_requests === 0);
check("auth_assertions", Array.isArray(auth.assertions) && auth.assertions.every((entry: Json) => entry.passed === true));
check("auth_no_release", noReleaseMutation(auth));

const android = readJson(PATHS.android);
check("android_result_sha", fileSha(PATHS.android) === EXPECTED.androidResultSha256, fileSha(PATHS.android));
check("android_status", android.status === "GREEN_R56_BATCH004_REAL_ANDROID_API34_50_OF_50_NO_RELEASE", android.status);
check("android_denominator", android.runScope === "FULL_MATRIX_50"
  && android.selectedDenominator === 50
  && android.expected === 50
  && android.executed === 50
  && android.passed === 50
  && android.failed === 0
  && android.skipped === 0
  && android.distinctCatalogIds === 50);
check("android_complete", Array.isArray(android.missing) && android.missing.length === 0
  && Array.isArray(android.duplicate) && android.duplicate.length === 0
  && Array.isArray(android.blockers) && android.blockers.length === 0
  && Array.isArray(android.missingGreenCoverage) && android.missingGreenCoverage.length === 0);
check("android_boundary", android.externalRequests === 0 && android.revisionHistoryBreaks === 0);
check("android_preflight", Array.isArray(android.preflight)
  && android.preflight.length > 0
  && android.preflight.every((entry: Json) => entry.passed === true));
check("android_binding", android.releaseId === backend.releaseId
  && android.source?.appSourceStateId === backend.sourceStateId
  && android.source?.harnessStateId === matrix.harness_state_id
  && android.manifest?.sha256 === fileSha(PATHS.androidMatrix)
  && android.buildManifest?.sha256 === fileSha(PATHS.build)
  && android.authProof?.sha256 === fileSha(PATHS.auth)
  && android.apkSha256Full === EXPECTED.apkSha256);
check("android_no_release", noReleaseMutation(android));

const rawArtifacts: IndexedArtifact[] = [];
const rawCases = new Set<number>();
let case9: Json | undefined;
let case10: Json | undefined;
check("android_raw_count", Array.isArray(android.rawCaseEvidence) && android.rawCaseEvidence.length === 50);
for (const reference of android.rawCaseEvidence as Json[]) {
  const path = resolve(String(reference.path));
  check(`raw_case_${reference.case}_exists`, existsSync(path), canonicalPath(path));
  check(`raw_case_${reference.case}_sha`, fileSha(path) === reference.report_sha256);
  const raw = readJson(path);
  check(`raw_case_${reference.case}_green`, raw.result?.case === reference.case
    && raw.result?.status === "GREEN"
    && Array.isArray(raw.result?.blockers)
    && raw.result.blockers.length === 0
    && raw.result.assertions?.every((entry: Json) => entry.passed === true));
  check(`raw_case_${reference.case}_binding`, raw.contract_sha256 === FROZEN_MASTER_SHA256
    && raw.app_source_state_id === backend.sourceStateId
    && raw.harness_state_id === matrix.harness_state_id
    && raw.apk_sha256_full === EXPECTED.apkSha256
    && raw.matrix_manifest_sha256 === fileSha(PATHS.androidMatrix)
    && raw.build_manifest_sha256 === fileSha(PATHS.build)
    && raw.auth_proof_sha256 === fileSha(PATHS.auth));
  if (reference.case === 9) case9 = raw;
  if (reference.case === 10) case10 = raw;
  rawCases.add(Number(reference.case));
  rawArtifacts.push(indexed(path));
}
check("raw_cases_1_to_50", rawCases.size === 50
  && Array.from({ length: 50 }, (_, index) => index + 1).every((entry) => rawCases.has(entry)));
const case9Assertions = new Map<string, Json>((case9?.result?.assertions ?? [])
  .map((entry: Json) => [String(entry.name), entry] as [string, Json]));
check("case9_material_replace", case9?.result?.status === "GREEN"
  && case9?.result?.evidence?.selected === true
  && case9?.result?.evidence?.post202 === true
  && /^[0-9a-f-]{36}$/u.test(String(case9?.result?.evidence?.childRevisionId))
  && case9Assertions.get("material_replace")?.passed === true);
const case10Assertions = new Map<string, Json>((case10?.result?.assertions ?? [])
  .map((entry: Json) => [String(entry.name), entry] as [string, Json]));
check("case10_photo_contract", case10?.result?.status === "GREEN"
  && case10?.result?.evidence?.uploadRequest201 === true
  && case10?.result?.evidence?.uploadBytes201 === true
  && case10?.result?.evidence?.finalize200 === true
  && case10?.result?.evidence?.attachmentBoundExact === true
  && case10?.result?.evidence?.coldReopenExact === true
  && case10?.result?.evidence?.thumbnailVisibleAfterLogoutLogin === true
  && case10?.result?.evidence?.otherTenantAccessDenied === true
  && case10?.result?.evidence?.parentRevisionAndOldPdfUnchanged === true
  && case10?.result?.evidence?.runtimeErrorAttribution?.appRuntimeErrors?.length === 0
  && case10Assertions.get("permission_denied_once")?.passed === true
  && case10Assertions.get("reentry_after_denial")?.passed === true
  && case10Assertions.get("permission_allowed")?.passed === true);

for (const [name, path] of [["case4_mutation", PATHS.case4Mutation], ["case10_photo", PATHS.case10Photo]] as const) {
  const proof = readJson(path);
  check(`${name}_green`, String(proof.status).startsWith("GREEN"), proof.status);
  check(`${name}_assertions`, Array.isArray(proof.assertions) && proof.assertions.every((entry: Json) => entry.passed === true));
  check(`${name}_binding`, proof.manifest?.sha256 === fileSha(PATHS.androidMatrix)
    && proof.buildManifest?.sha256 === fileSha(PATHS.build)
    && proof.authProof?.sha256 === fileSha(PATHS.auth)
    && proof.apkSha256Full === EXPECTED.apkSha256);
  check(`${name}_no_release`, noReleaseMutation(proof));
}

const processAudit = readJson(PATHS.processAudit);
check("runner_single_flight", processAudit.duplicateConcurrentRunners === 0
  && processAudit.staleLockRecovered === false
  && processAudit.lockReleased === true, processAudit);
check("runner_binding", processAudit.manifestSha256 === fileSha(PATHS.androidMatrix)
  && processAudit.apkSha256Full === EXPECTED.apkSha256
  && processAudit.buildManifestSha256 === fileSha(PATHS.build)
  && processAudit.authProofSha256 === fileSha(PATHS.auth));

const dumpAttestation = readJson(PATHS.postAndroidAttestation);
check("post_android_dump_attestation", dumpAttestation.status === "GREEN_R56_BATCH004_POST_ANDROID_RECOVERABLE_DUMP"
  && dumpAttestation.master_contract?.sha256 === MASTER_SHA256
  && dumpAttestation.accepted_frozen_android_contract_sha256 === FROZEN_MASTER_SHA256
  && dumpAttestation.database?.definitions === 393
  && dumpAttestation.database?.revisions === 1_188
  && dumpAttestation.database?.failed_jobs === 0
  && dumpAttestation.database?.photo_attachments === 1
  && dumpAttestation.database?.revision_request_bindings === 1
  && dumpAttestation.dump?.pg_restore_list_exit_code === 0
  && dumpAttestation.dump?.toc_entries === 489);
check("post_android_dump_exact", existsSync(PATHS.postAndroidDump)
  && fileSha(PATHS.postAndroidDump) === EXPECTED.postAndroidDumpSha256
  && readFileSync(PATHS.postAndroidDump).length === dumpAttestation.dump?.bytes);

const cleanup = inspectCleanup();
check("cleanup_ports_free", cleanup.listeners.every((entry: Json) => entry.owning_processes.length === 0), cleanup.listeners);
check("cleanup_runtime_processes", cleanup.task_owned_runtime_processes.length === 0, cleanup.task_owned_runtime_processes);
check("cleanup_container", cleanup.temporary_container_present === false);
check("cleanup_runner_lock", cleanup.android_runner_lock_present === false);
cleanup.recovery_dumps = {
  post_backend: { path: canonicalPath(PATHS.postBackendDump), sha256: fileSha(PATHS.postBackendDump) },
  post_android: { path: canonicalPath(PATHS.postAndroidDump), sha256: fileSha(PATHS.postAndroidDump) },
};
cleanup.removed_task_owned_pids = [6568, 20224, 5208, 11356];
cleanup.status = "GREEN_BATCH004_R56_LOCAL_RUNTIME_CLEANUP_RECOVERABLE";
atomicJson(PATHS.cleanup, cleanup);

const masterBytes = readFileSync(MASTER);
if (existsSync(PATHS.masterSnapshot)) check("master_snapshot_existing_sha", fileSha(PATHS.masterSnapshot) === MASTER_SHA256);
else atomicBytes(PATHS.masterSnapshot, masterBytes);
check("master_snapshot_sha", fileSha(PATHS.masterSnapshot) === MASTER_SHA256);

const reconciliation = {
  schema_version: "real-professional-estimates-r5.6.batch004-master-r1-reconciliation.v1",
  generated_at: new Date().toISOString(),
  current_master: { path: canonicalPath(PATHS.masterSnapshot), sha256: MASTER_SHA256 },
  accepted_frozen_contract: {
    original_path: FROZEN_MASTER,
    sha256: FROZEN_MASTER_SHA256,
    scope: "BATCH004_STATIC_BACKEND_WEB_APK_ANDROID_FROZEN_EVIDENCE",
  },
  reconciliation_basis: [
    "Current master section 2 accepts the completed BATCH004 static/backend/Web/APK identities.",
    "Current master section 19 commands continuation of the existing BATCH004 clean-baseline Android run without rebuilding unchanged bytes.",
    "The final 50/50 result preserves the exact frozen source, release, APK, matrix, harness, and auth identities.",
  ],
  identities: {
    backend_source_state_id: backend.sourceStateId,
    definition_set_sha256: backend.definitionSetSha256,
    release_id: backend.releaseId,
    matrix_sha256: fileSha(PATHS.androidMatrix),
    harness_state_id: matrix.harness_state_id,
    build_manifest_sha256: fileSha(PATHS.build),
    auth_proof_sha256: fileSha(PATHS.auth),
    apk_sha256: EXPECTED.apkSha256,
    android_result_sha256: fileSha(PATHS.android),
  },
  denominator: { expected: 50, passed: 50, failed: 0, blockers: 0 },
  repeat_forbidden_without_byte_drift: true,
  release_performed: false,
  deploy_performed: false,
  ota_performed: false,
  merge_performed: false,
  push_performed: false,
  batch009_performed: false,
  status: "GREEN_R56_BATCH004_MASTER_R1_RECONCILED_NO_REPLAY_NO_RELEASE",
};
atomicJson(PATHS.reconciliation, reconciliation);

const webScreenshots = [10, 20, 30, 40, 50].map((entry) => resolve(WEB, `batch004-r56-${entry}.png`));
const primaryPaths = [
  PATHS.masterSnapshot, PATHS.reconciliation, PATHS.static, PATHS.verdicts, PATHS.durableJest,
  PATHS.componentIdentities, PATHS.content, PATHS.contentCards, PATHS.backend, PATHS.postBackendDump,
  PATHS.androidMatrix, PATHS.webMatrix, PATHS.web, PATHS.webTrace, ...webScreenshots,
  PATHS.build, PATHS.auth, PATHS.sourceAttestation, PATHS.case4Mutation, PATHS.case10Photo,
  PATHS.android, PATHS.processAudit, PATHS.postAndroidDump, PATHS.postAndroidAttestation,
  PATHS.buildArchiveManifest, PATHS.archivedApk, PATHS.archivedBundle, PATHS.archivedSourceMap,
  PATHS.cleanup, resolve("scripts/e2e/buildBatch004R56TerminalCheckpoint.ts"),
  ...PRIOR_TERMINALS.map((entry) => entry.path),
];
const primary = primaryPaths.map(indexed);
const artifactMap = new Map<string, IndexedArtifact>();
for (const artifact of [...primary, ...rawArtifacts]) artifactMap.set(artifact.path.toLowerCase(), artifact);
const artifacts = [...artifactMap.values()].sort((left, right) => left.path.localeCompare(right.path));
const evidenceIndex = {
  schema_version: "real-professional-estimates-r5.6.batch004-exact-sha-evidence-index.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  accepted_frozen_contract_sha256: FROZEN_MASTER_SHA256,
  artifact_count: artifacts.length,
  artifacts,
};
atomicJson(PATHS.evidenceIndex, evidenceIndex);

const checkpointWithoutHash = {
  schema_version: "real-professional-estimates-r5.6.batch004-terminal-checkpoint.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  accepted_frozen_contract_sha256: FROZEN_MASTER_SHA256,
  master_reconciliation: { path: canonicalPath(PATHS.reconciliation), sha256: fileSha(PATHS.reconciliation) },
  accepted_prior_terminal_checkpoints: PRIOR_TERMINALS.map((entry) => ({
    batch: entry.batch,
    status: entry.status,
    path: canonicalPath(entry.path),
    sha256: entry.sha256,
  })),
  source: {
    accepted_backend_component_state_id: backend.sourceStateId,
    definition_content_state_id: matrix.definition_content_state_id,
    backend_runtime_state_id: matrix.backend_runtime_state_id,
    app_source_component_state_id: matrix.app_source_component_state_id,
    harness_state_id: matrix.harness_state_id,
    evidence_tool_state_id: matrix.evidence_tool_state_id,
  },
  backend: {
    report_sha256: fileSha(PATHS.backend),
    definition_set_sha256: backend.definitionSetSha256,
    definitions: 393,
    revisions: 1_179,
    child_revisions: 786,
    artifacts: 786,
    jobs: 1_965,
    failed_jobs: 0,
  },
  content: { definitions_audited: 393, role_verdicts: 1_179, rows: 2_768, defect_counters: 15, defect_counter_sum: 0 },
  durable_jest: { suites: 1, tests: 7, failed: 0 },
  web: { full: "50/50", distinct_catalogs: 50, blockers: 0, external_requests: 0 },
  android: {
    api_level: 34,
    full: "50/50",
    distinct_catalogs: 50,
    failed: 0,
    skipped: 0,
    blockers: 0,
    external_requests: 0,
    case9_material_replace: "GREEN_POST_202_EXACT_CHILD",
    case10_photo: "GREEN_PERMISSION_UPLOAD_PERSISTENCE_ISOLATION",
  },
  release: {
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    capability_id: backend.capabilityId,
    status: backend.releaseStatus,
    activated: backend.releaseActivated,
  },
  archives: {
    post_backend: { path: canonicalPath(PATHS.postBackendDump), sha256: fileSha(PATHS.postBackendDump) },
    post_android: { path: canonicalPath(PATHS.postAndroidDump), sha256: fileSha(PATHS.postAndroidDump) },
    accepted_apk: { path: canonicalPath(PATHS.archivedApk), sha256: fileSha(PATHS.archivedApk) },
    accepted_bundle: { path: canonicalPath(PATHS.archivedBundle), sha256: fileSha(PATHS.archivedBundle) },
    accepted_source_map: { path: canonicalPath(PATHS.archivedSourceMap), sha256: fileSha(PATHS.archivedSourceMap) },
  },
  cleanup,
  evidence_index: { path: canonicalPath(PATHS.evidenceIndex), sha256: fileSha(PATHS.evidenceIndex), artifact_count: artifacts.length },
  checks_total: checks.length,
  checks_failed: checks.filter((entry) => !entry.passed).length,
  checks,
  release_performed: false,
  deploy_performed: false,
  ota_performed: false,
  merge_performed: false,
  push_performed: false,
  batch009_performed: false,
  status: "GREEN_R56_BATCH004_TERMINAL_CHECKPOINT_NO_RELEASE",
  BATCH004_STATUS: "BATCH004_TERMINAL_GREEN_NO_RELEASE",
};
const checkpoint = { ...checkpointWithoutHash, payload_sha256: sha256(JSON.stringify(checkpointWithoutHash)) };
atomicJson(PATHS.checkpoint, checkpoint);
process.stdout.write(`${JSON.stringify({
  status: checkpoint.status,
  batchStatus: checkpoint.BATCH004_STATUS,
  checkpoint: canonicalPath(PATHS.checkpoint),
  checkpointSha256: fileSha(PATHS.checkpoint),
  evidenceIndex: canonicalPath(PATHS.evidenceIndex),
  evidenceIndexSha256: fileSha(PATHS.evidenceIndex),
  checks: checks.length,
  artifacts: artifacts.length,
}, null, 2)}\n`);
