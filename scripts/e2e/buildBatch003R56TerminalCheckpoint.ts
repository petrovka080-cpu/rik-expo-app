import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Check = { name: string; passed: boolean; details?: unknown };
type IndexedArtifact = { path: string; sha256: string; bytes: number };

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56");
const STATIC = resolve(ROOT, "static");
const BACKEND = resolve(ROOT, "backend");
const MATRIX = resolve(ROOT, "matrix");
const WEB = resolve(ROOT, "web");
const ANDROID = resolve(ROOT, "android");
const FINAL = resolve(ROOT, "final");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const RUNNER_LOCK = resolve(ANDROID, "runtime/BATCH003_ANDROID_API34_50.lock.json");

const EXPECTED = {
  acceptedBackendSourceStateId: "4a78a1650154cb49494777a03b2c8ec026998c054645766fdeda9737a77215b6",
  releaseId: "725e3629-cc99-4c07-a2d1-fdb5e2173970",
  searchReleaseId: "08dbe0e7-1562-4e61-aaed-4b91a74d4fd5",
  capabilityId: "e47bc7a2-933b-4b6e-a187-b1657684a303",
  apkSha256: "3b3312edf34f4276cc6ca46ee8ad278a96e33c140efe9d02fa98cca1826e5e74",
  postBackendDumpSha256: "3fa8596030dccba78ca80956df86b4636aef3160aadd31ab4b50398bbdad7e45",
  postAndroidDumpSha256: "15776336bc0c9a6074c4a17022d57fd9db28bef4917fc060f3f8e7f397d0a944",
} as const;

const PATHS = {
  static: resolve(STATIC, "BATCH003_R56_STATIC_RECONCILIATION.json"),
  verdicts: resolve(STATIC, "BATCH003_R56_CATALOG_VERDICTS.jsonl"),
  durableJest: resolve(STATIC, "BATCH003_R56_DURABLE_JEST.json"),
  componentIdentities: resolve(STATIC, "BATCH003_R56_COMPONENT_IDENTITIES.json"),
  backend: resolve(BACKEND, "BATCH003_BACKEND_REVISION_PARITY_R56.json"),
  postBackendDump: resolve(BACKEND, "batch003-r56-post-backend-green.dump"),
  matrix: resolve(MATRIX, "BATCH003_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"),
  web: resolve(WEB, "BATCH003_R56_WEB_50_RESULT.json"),
  build: resolve(ANDROID, "ANDROID_PROOF_BUILD_MANIFEST.json"),
  auth: resolve(ANDROID, "ANDROID_AUTH_BOOTSTRAP_PROOF.json"),
  case4Mutation: resolve(ANDROID, "BATCH002_ANDROID_CASE4_MUTATION_PROOF.json"),
  case10Photo: resolve(ANDROID, "BATCH002_ANDROID_CASE10_PHOTO_PROOF.json"),
  android: resolve(ANDROID, "BATCH003_R56_ANDROID_API34_50_RESULT.json"),
  processAudit: resolve(ANDROID, "RUNNER_SINGLE_FLIGHT_AND_PROCESS_AUDIT_R55.json"),
  postAndroidDump: resolve(ANDROID, "batch003-r56-post-android-green.dump"),
  cleanup: resolve(FINAL, "BATCH003_R56_LOCAL_CLEANUP_AUDIT.json"),
  evidenceIndex: resolve(FINAL, "BATCH003_R56_EXACT_SHA_EVIDENCE_INDEX.json"),
  checkpoint: resolve(FINAL, "BATCH003_R56_TERMINAL_CHECKPOINT.json"),
} as const;

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

function check(name: string, condition: boolean, details?: unknown): void {
  checks.push({ name, passed: condition, ...(details === undefined ? {} : { details }) });
  if (!condition) throw new Error(`BATCH003_R56_TERMINAL_CHECK_FAILED:${name}`);
}

function indexed(path: string): IndexedArtifact {
  check(`${path}_exists`, existsSync(path), path);
  const bytes = readFileSync(path);
  return { path, sha256: sha256(bytes), bytes: bytes.length };
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
  return flags.every((entry) => entry === false);
}

function inspectCleanup(): Json {
  const powershell = String.raw`
$ports = @(8184,8185,8768,55435)
$listeners = @($ports | ForEach-Object {
  $port = $_
  $rows = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  [pscustomobject]@{ port = $port; owning_processes = @($rows | ForEach-Object { $_.OwningProcess }) }
})
$taskProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -and
  $_.CommandLine -match 'serveExpoWebStaging|serveBatch002R4LocalSupabaseStub|serveCanonicalEstimateLocalR1|start-clean-snapshot-backend|runBatch002R52AndroidApi34Matrix50'
} | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; name = $_.Name; command_line = $_.CommandLine } })
$browserProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -and $_.CommandLine -match 'rik-expo-app-p0-estimate-truth-remediation-r1' -and
  ($_.Name -match '^(chrome|chromium|msedge)' -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'playwright'))
} | ForEach-Object { [pscustomobject]@{ pid = $_.ProcessId; name = $_.Name; command_line = $_.CommandLine } })
[pscustomobject]@{ listeners = $listeners; task_owned_runtime_processes = $taskProcesses; task_owned_browser_processes = $browserProcesses } | ConvertTo-Json -Depth 8 -Compress
`;
  const runtime = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command", powershell], {
    encoding: "utf8",
  })) as Json;
  const docker = spawnSync("docker", ["ps", "-a", "--format", "{{.Names}}"], { encoding: "utf8" });
  check("docker_inventory_available", docker.status === 0, docker.stderr);
  const containers = String(docker.stdout).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean);
  return {
    generated_at: new Date().toISOString(),
    required_free_ports: [8184, 8185, 8768, 55435],
    ...runtime,
    temporary_container: "rik-batch003-r56-parity-temp",
    temporary_container_present: containers.includes("rik-batch003-r56-parity-temp"),
    android_runner_lock: RUNNER_LOCK,
    android_runner_lock_present: existsSync(RUNNER_LOCK),
  };
}

check("master_exists", existsSync(MASTER), MASTER);
check("master_sha256", fileSha(MASTER) === MASTER_SHA256, fileSha(MASTER));

const staticReport = readJson(PATHS.static);
check("static_status", staticReport.status === "GREEN_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING", staticReport.status);
check("static_master", staticReport.masterSha256 === MASTER_SHA256);
check("static_denominators", staticReport.denominators?.definitions === "36/36"
  && staticReport.denominators?.catalogVerdicts === "36/36"
  && staticReport.denominators?.roleVerdicts === "108/108"
  && staticReport.denominators?.sharedCoreCompiles === "36/36"
  && staticReport.denominators?.independentMaterialOracles === "36/36"
  && staticReport.denominators?.independentCustomFormulaOracles === "36/36"
  && staticReport.denominators?.failClosedQuantityChecks === "36/36"
  && staticReport.denominators?.failClosedPriceChecks === "36/36"
  && staticReport.denominators?.mutationChecks === "36/36", staticReport.denominators);
check("static_defect_counters_15_zero", Object.keys(staticReport.defectCounters ?? {}).length === 15
  && Object.values(staticReport.defectCounters as Json).every((value) => value === 0), staticReport.defectCounters);
check("static_projection_498_clean_rows", staticReport.totals?.successorRows === 498
  && staticReport.totals?.materialRows === 354
  && staticReport.totals?.measuredOperationRows === 36
  && staticReport.totals?.deliveryRows === 36
  && staticReport.totals?.wasteHaulRows === 36
  && staticReport.totals?.conditionalAccessRows === 36, staticReport.totals);
check("static_verdicts_36", Array.isArray(staticReport.verdicts)
  && staticReport.verdicts.length === 36
  && staticReport.verdicts.every((entry: Json) => String(entry.status).startsWith("GREEN")));
check("static_no_runtime_mutation", staticReport.runtimeMutation?.databaseWrites === 0
  && staticReport.runtimeMutation?.release === false
  && staticReport.runtimeMutation?.deploy === false
  && staticReport.runtimeMutation?.ota === false
  && staticReport.runtimeMutation?.merge === false, staticReport.runtimeMutation);

const durable = readJson(PATHS.durableJest);
check("durable_jest_green", durable.success === true
  && durable.numPassedTestSuites === 1
  && durable.numPassedTests === 7
  && durable.numFailedTestSuites === 0
  && durable.numFailedTests === 0
  && durable.wasInterrupted === false, durable);

const components = readJson(PATHS.componentIdentities);
check("component_identities_36", Array.isArray(components.definitions)
  && components.definitions.length === 36
  && new Set(components.definitions.map((entry: Json) => entry.catalogId)).size === 36);
check("component_identity_hashes", /^[0-9a-f]{64}$/u.test(String(components.sourceStateId))
  && /^[0-9a-f]{64}$/u.test(String(components.componentManifestSha256))
  && components.definitions.every((entry: Json) => /^[0-9a-f]{64}$/u.test(String(entry.definitionSha256))));

const backend = readJson(PATHS.backend);
check("backend_status", backend.status === "GREEN_R56_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE", backend.status);
check("backend_master", backend.masterSha256 === MASTER_SHA256);
check("backend_identity", backend.sourceStateId === EXPECTED.acceptedBackendSourceStateId
  && backend.releaseId === EXPECTED.releaseId
  && backend.searchReleaseId === EXPECTED.searchReleaseId
  && backend.capabilityId === EXPECTED.capabilityId);
check("backend_counts", backend.counts?.definitions === 36
  && backend.counts?.revisions === 108
  && backend.counts?.child_revisions === 72
  && backend.counts?.artifacts === 72
  && backend.counts?.succeeded_jobs === 180
  && JSON.stringify(backend.counts) === JSON.stringify(backend.expectedCounts), backend.counts);
check("backend_proofs", Array.isArray(backend.proofs)
  && backend.proofs.length === 36
  && backend.proofs.every((entry: Json) => entry.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"));
check("backend_invariants", Object.values(backend.invariants as Json).every((value) => value === true), backend.invariants);
check("backend_connections", backend.connectionAudit?.runnerDatabaseClients === 1
  && backend.connectionAudit?.fixtureMaterializationMaxInFlight === 1
  && backend.connectionAudit?.definitionExecution === "SEQUENTIAL"
  && backend.connectionAudit?.burstConnections === false, backend.connectionAudit);
check("backend_prepared_not_active", backend.releaseStatus === "prepared" && backend.releaseActivated === false);
check("backend_dump_exact", existsSync(PATHS.postBackendDump)
  && fileSha(PATHS.postBackendDump) === EXPECTED.postBackendDumpSha256
  && readFileSync(PATHS.postBackendDump).length > 1_000);

const matrix = readJson(PATHS.matrix);
check("matrix_status", matrix.status === "FROZEN_R56_BATCH003_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE", matrix.status);
check("matrix_denominator", matrix.expected === 50
  && matrix.distinct_catalog_ids === 36
  && matrix.distinct_parent_revisions === 36
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
check("matrix_no_release", noReleaseMutation(matrix));

const web = readJson(PATHS.web);
check("web_status", web.status === "GREEN_R56_BATCH003_REAL_WEB_50_OF_50_NO_RELEASE", web.status);
check("web_denominator", web.expected === 50 && web.executed === 50 && web.green === 50
  && web.distinctCatalogIds === 36 && Array.isArray(web.blockers) && web.blockers.length === 0);
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
check("build_status", build.status === "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE", build.status);
check("build_source", build.source_changed_during_build === false
  && build.source_state_id === backend.sourceStateId
  && build.app_source_state_id === backend.sourceStateId
  && build.accepted_backend_component_state_id === backend.sourceStateId);
check("build_apk", existsSync(APK)
  && fileSha(APK) === EXPECTED.apkSha256
  && build.apk_sha256_full === EXPECTED.apkSha256
  && build.apk_size_bytes === readFileSync(APK).length);
check("build_bundle_origins", build.expected_bundle_markers?.every((entry: Json) => entry.present_in_bundle === true)
  && build.forbidden_production_origins?.every((entry: Json) => entry.present_in_bundle === false));
check("build_auth_binding", build.auth_runtime_proof_completed === true
  && build.auth_runtime_proof?.sha256 === fileSha(PATHS.auth)
  && build.auth_runtime_proof?.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE");
check("build_release", build.release_identity?.release_id === backend.releaseId
  && build.release_identity?.release_status === "prepared"
  && build.release_identity?.activated === false);
check("build_no_release", noReleaseMutation(build));

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
check("android_status", android.status === "GREEN_R56_BATCH003_REAL_ANDROID_API34_50_OF_50_NO_RELEASE", android.status);
check("android_denominator", android.expected === 50 && android.executed === 50 && android.passed === 50
  && android.failed === 0 && android.skipped === 0 && android.distinctCatalogIds === 36);
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
  && android.manifest?.sha256 === fileSha(PATHS.matrix)
  && android.buildManifest?.sha256 === fileSha(PATHS.build)
  && android.authProof?.sha256 === fileSha(PATHS.auth)
  && android.apkSha256Full === EXPECTED.apkSha256);
check("android_no_release", noReleaseMutation(android));

const rawArtifacts: IndexedArtifact[] = [];
const rawCases = new Set<number>();
let case14: Json | undefined;
check("android_raw_count", Array.isArray(android.rawCaseEvidence) && android.rawCaseEvidence.length === 50);
for (const reference of android.rawCaseEvidence as Json[]) {
  const path = resolve(String(reference.path));
  check(`raw_case_${reference.case}_exists`, existsSync(path), path);
  check(`raw_case_${reference.case}_sha`, fileSha(path) === reference.report_sha256);
  const raw = readJson(path);
  check(`raw_case_${reference.case}_green`, raw.result?.case === reference.case
    && raw.result?.status === "GREEN"
    && Array.isArray(raw.result?.blockers)
    && raw.result.blockers.length === 0);
  check(`raw_case_${reference.case}_binding`, raw.contract_sha256 === MASTER_SHA256
    && raw.app_source_state_id === backend.sourceStateId
    && raw.harness_state_id === matrix.harness_state_id
    && raw.apk_sha256_full === EXPECTED.apkSha256
    && raw.matrix_manifest_sha256 === fileSha(PATHS.matrix)
    && raw.build_manifest_sha256 === fileSha(PATHS.build)
    && raw.auth_proof_sha256 === fileSha(PATHS.auth));
  if (reference.case === 14) case14 = raw;
  rawCases.add(Number(reference.case));
  rawArtifacts.push(indexed(path));
}
check("raw_cases_1_to_50", rawCases.size === 50
  && Array.from({ length: 50 }, (_, index) => index + 1).every((entry) => rawCases.has(entry)));
const case14Assertions = new Map<string, Json>((case14?.result?.assertions ?? [])
  .map((entry: Json) => [String(entry.name), entry] as [string, Json]));
check("case14_app_process_identity", case14Assertions.get("app_process_identity_captured")?.passed === true);
check("case14_no_app_crash", case14Assertions.get("fatal_js_or_native_crashes_zero")?.passed === true
  && case14Assertions.get("fatal_js_or_native_crashes_zero")?.details?.appRuntimeErrors?.length === 0);
check("case14_restore_immutable_child", case14Assertions.get("historical_revision_restore_as_new")?.passed === true
  && case14Assertions.get("historical_revision_restore_as_new")?.details?.childCreatedThisRun === true
  && case14Assertions.get("historical_revision_restore_as_new")?.details?.parentImmutable === true);

for (const [name, path] of [["case4_mutation", PATHS.case4Mutation], ["case10_photo", PATHS.case10Photo]] as const) {
  const proof = readJson(path);
  check(`${name}_green`, String(proof.status).startsWith("GREEN"), proof.status);
}
const processAudit = readJson(PATHS.processAudit);
check("runner_single_flight", processAudit.duplicateConcurrentRunners === 0
  && processAudit.staleLockRecovered === false
  && processAudit.lockReleased === true, processAudit);
check("runner_binding", processAudit.manifestSha256 === fileSha(PATHS.matrix)
  && processAudit.apkSha256Full === EXPECTED.apkSha256
  && processAudit.buildManifestSha256 === fileSha(PATHS.build)
  && processAudit.authProofSha256 === fileSha(PATHS.auth));
check("post_android_dump_exact", existsSync(PATHS.postAndroidDump)
  && fileSha(PATHS.postAndroidDump) === EXPECTED.postAndroidDumpSha256
  && readFileSync(PATHS.postAndroidDump).length > 1_000);

const cleanup = inspectCleanup();
check("cleanup_ports_free", cleanup.listeners.every((entry: Json) => entry.owning_processes.length === 0), cleanup.listeners);
check("cleanup_runtime_processes", cleanup.task_owned_runtime_processes.length === 0, cleanup.task_owned_runtime_processes);
check("cleanup_browser_processes", cleanup.task_owned_browser_processes.length === 0, cleanup.task_owned_browser_processes);
check("cleanup_container", cleanup.temporary_container_present === false);
check("cleanup_runner_lock", cleanup.android_runner_lock_present === false);
cleanup.status = "GREEN_BATCH003_R56_LOCAL_RUNTIME_CLEANUP";
atomicJson(PATHS.cleanup, cleanup);

const primary = [
  MASTER, PATHS.static, PATHS.verdicts, PATHS.durableJest, PATHS.componentIdentities,
  PATHS.backend, PATHS.postBackendDump, PATHS.matrix, PATHS.web, APK, PATHS.build,
  PATHS.auth, PATHS.case4Mutation, PATHS.case10Photo, PATHS.android, PATHS.processAudit,
  PATHS.postAndroidDump, PATHS.cleanup,
].map(indexed);
const artifactMap = new Map<string, IndexedArtifact>();
for (const artifact of [...primary, ...rawArtifacts]) artifactMap.set(artifact.path.toLowerCase(), artifact);
const artifacts = [...artifactMap.values()].sort((left, right) => left.path.localeCompare(right.path));
const evidenceIndex = {
  schema_version: "real-professional-estimates-r5.6.batch003-exact-sha-evidence-index.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  artifact_count: artifacts.length,
  artifacts,
};
atomicJson(PATHS.evidenceIndex, evidenceIndex);

const checkpointWithoutHash = {
  schema_version: "real-professional-estimates-r5.6.batch003-terminal-checkpoint.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  accepted_backend_contract_sha256: backend.masterSha256,
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
    definitions: 36,
    role_revisions: 108,
    child_revisions: 72,
    artifacts: 72,
    jobs: 180,
    failed_jobs: 0,
  },
  content: { definitions_audited: 36, role_verdicts: 108, rows: 498, defect_counters: 15, defect_counter_sum: 0 },
  durable_jest: { suites: 1, tests: 7, failed: 0 },
  web: { full: "50/50", distinct_catalogs: 36, blockers: 0 },
  android: { api_level: 34, full: "50/50", distinct_catalogs: 36, failed: 0, skipped: 0, blockers: 0 },
  release: {
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    capability_id: backend.capabilityId,
    status: backend.releaseStatus,
    activated: backend.releaseActivated,
  },
  archives: {
    post_backend: { path: PATHS.postBackendDump, sha256: fileSha(PATHS.postBackendDump) },
    post_android: { path: PATHS.postAndroidDump, sha256: fileSha(PATHS.postAndroidDump) },
  },
  cleanup,
  evidence_index: { path: PATHS.evidenceIndex, sha256: fileSha(PATHS.evidenceIndex), artifact_count: artifacts.length },
  checks_total: checks.length,
  checks_failed: checks.filter((entry) => !entry.passed).length,
  checks,
  release_performed: false,
  deploy_performed: false,
  ota_performed: false,
  merge_performed: false,
  push_performed: false,
  batch009_performed: false,
  status: "GREEN_R56_BATCH003_TERMINAL_CHECKPOINT_NO_RELEASE",
  BATCH003_STATUS: "BATCH_TERMINAL_GREEN_NO_RELEASE",
};
const checkpoint = { ...checkpointWithoutHash, payload_sha256: sha256(JSON.stringify(checkpointWithoutHash)) };
atomicJson(PATHS.checkpoint, checkpoint);
process.stdout.write(`${JSON.stringify({
  status: checkpoint.status,
  batchStatus: checkpoint.BATCH003_STATUS,
  checkpoint: PATHS.checkpoint,
  checkpointSha256: fileSha(PATHS.checkpoint),
  evidenceIndex: PATHS.evidenceIndex,
  evidenceIndexSha256: fileSha(PATHS.evidenceIndex),
  checks: checks.length,
  artifacts: artifacts.length,
}, null, 2)}\n`);
