import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Check = { name: string; passed: boolean; details?: unknown };
type IndexedArtifact = { path: string; sha256: string; bytes: number };

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56");
const STATIC = resolve(ROOT, "static");
const BACKEND = resolve(ROOT, "backend");
const MATRIX = resolve(ROOT, "matrix");
const WEB = resolve(ROOT, "web");
const ANDROID = resolve(ROOT, "android");
const FINAL = resolve(ROOT, "final");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const FINAL_DUMP = resolve(process.env.BATCH001_R56_FINAL_DUMP
  ?? resolve(FINAL, "batch001-r56-post-android-final.dump"));
const RUNNER_LOCK = resolve(ANDROID, "runtime/BATCH001_ANDROID_API34_50.lock.json");

const PATHS = {
  static: resolve(STATIC, "BATCH001_R56_STATIC_RECONCILIATION.json"),
  verdicts: resolve(STATIC, "BATCH001_R56_CATALOG_VERDICTS.jsonl"),
  backend: resolve(BACKEND, "BATCH001_BACKEND_REVISION_PARITY_R56.json"),
  matrix: resolve(MATRIX, "BATCH001_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"),
  web: resolve(WEB, "BATCH001_R56_WEB_50_RESULT.json"),
  build: resolve(ANDROID, "ANDROID_PROOF_BUILD_MANIFEST.json"),
  auth: resolve(ANDROID, "ANDROID_AUTH_BOOTSTRAP_PROOF.json"),
  case4Mutation: resolve(ANDROID, "BATCH002_ANDROID_CASE4_MUTATION_PROOF.json"),
  case10Photo: resolve(ANDROID, "BATCH002_ANDROID_CASE10_PHOTO_PROOF.json"),
  android: resolve(ANDROID, "BATCH001_R56_ANDROID_API34_50_RESULT.json"),
  processAudit: resolve(ANDROID, "RUNNER_SINGLE_FLIGHT_AND_PROCESS_AUDIT_R55.json"),
  registry: resolve(FINAL, "BATCH001_R56_REGISTRY_DISPOSITIONS.json"),
  cleanup: resolve(FINAL, "BATCH001_R56_LOCAL_CLEANUP_AUDIT.json"),
  evidenceIndex: resolve(FINAL, "BATCH001_R56_EXACT_SHA_EVIDENCE_INDEX.json"),
  checkpoint: resolve(FINAL, "BATCH001_R56_TERMINAL_CHECKPOINT.json"),
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
  if (!condition) throw new Error(`BATCH001_R56_TERMINAL_CHECK_FAILED:${name}`);
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
$ports = @(8172,8173,8183,8767,55433)
$listeners = @($ports | ForEach-Object {
  $port = $_
  $rows = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  [pscustomobject]@{ port = $port; owning_processes = @($rows | ForEach-Object { $_.OwningProcess }) }
})
$taskProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -and
  $_.CommandLine -match 'serveExpoWebStaging|serveBatch002R4LocalSupabaseStub|serveCanonicalEstimateLocalR1|runBatch002R52AndroidApi34Matrix50|runBatch002R4WebRoleMatrix80'
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
    required_free_ports: [8172, 8173, 8183, 8767, 55433],
    ...runtime,
    temporary_container: "rik-batch001-r56-parity-temp",
    temporary_container_present: containers.includes("rik-batch001-r56-parity-temp"),
    android_runner_lock: RUNNER_LOCK,
    android_runner_lock_present: existsSync(RUNNER_LOCK),
  };
}

check("master_exists", existsSync(MASTER), MASTER);
check("master_sha256", fileSha(MASTER) === MASTER_SHA256, fileSha(MASTER));

const staticReport = readJson(PATHS.static);
check("static_status", staticReport.status === "GREEN_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING", staticReport.status);
check("static_master", staticReport.masterSha256 === MASTER_SHA256);
check("static_denominators", staticReport.denominators?.definitions === "16/16"
  && staticReport.denominators?.catalogVerdicts === "16/16"
  && staticReport.denominators?.roleVerdicts === "48/48"
  && staticReport.denominators?.goldOracle === "16/16"
  && staticReport.denominators?.lowerBoundariesRejected === "16/16"
  && staticReport.denominators?.upperBoundariesRejected === "16/16"
  && staticReport.denominators?.mutations === "16/16"
  && staticReport.denominators?.negativeCrossDomainRejected === "16/16", staticReport.denominators);
check("static_expected_pending_only", JSON.stringify(staticReport.blockers) === JSON.stringify([
  "ISOLATED_BACKEND_REPLAY_PENDING",
  "REGISTRY_REAL_WORK_DISPOSITION_PENDING",
  "WEB_50_OF_50_PENDING",
  "ANDROID_API34_50_OF_50_PENDING",
]));
check("static_verdicts", Array.isArray(staticReport.verdicts)
  && staticReport.verdicts.length === 16
  && staticReport.verdicts.every((entry: Json) => entry.status === "GREEN_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING"
    && entry.requestedDisposition === "REAL_WORK"
    && entry.currentDisposition === "PENDING_ISOLATED_REGISTRY_REPLAY"
    && Object.entries(entry.criteria as Json).every(([name, passed]) => name === "disposition" || passed === true)
    && entry.criteria?.disposition === false));

const backend = readJson(PATHS.backend);
check("backend_status", backend.status === "GREEN_R56_BATCH001_ISOLATED_BACKEND_PARITY_NO_RELEASE", backend.status);
check("backend_counts", backend.counts?.definitions === 16
  && backend.counts?.revisions === 48
  && backend.counts?.child_revisions === 32
  && backend.counts?.artifacts === 32
  && backend.counts?.succeeded_jobs === 80, backend.counts);
check("backend_expected_counts", JSON.stringify(backend.counts) === JSON.stringify(backend.expectedCounts));
check("backend_proofs", Array.isArray(backend.proofs)
  && backend.proofs.length === 16
  && backend.proofs.every((entry: Json) => entry.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
    && entry.contentAdmission?.allowed === true
    && entry.contentAdmission?.mode === "legacy_read_only"));
check("backend_invariants", Object.values(backend.invariants as Json).every((value) => value === true), backend.invariants);
check("backend_connections", backend.connectionAudit?.runnerDatabaseClients === 1
  && backend.connectionAudit?.fixtureMaterializationMaxInFlight === 1
  && backend.connectionAudit?.definitionExecution === "SEQUENTIAL"
  && backend.connectionAudit?.burstConnections === false, backend.connectionAudit);
check("backend_prepared_not_active", backend.releaseStatus === "prepared" && backend.releaseActivated === false);
check("backend_no_release", noReleaseMutation(backend));

const matrix = readJson(PATHS.matrix);
check("matrix_status", matrix.status === "FROZEN_R56_BATCH001_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE", matrix.status);
check("matrix_denominator", matrix.expected === 50 && Array.isArray(matrix.cases) && matrix.cases.length === 50);
check("matrix_unique_cases", new Set(matrix.cases.map((entry: Json) => entry.case)).size === 50
  && new Set(matrix.cases.map((entry: Json) => entry.parentRevisionId)).size === 16
  && new Set(matrix.cases.map((entry: Json) => entry.catalogId)).size === 16);
check("matrix_backend_binding", matrix.backend_evidence?.sha256 === fileSha(PATHS.backend)
  && matrix.accepted_backend_source_state_id === backend.sourceStateId
  && matrix.definition_set_sha256 === backend.definitionSetSha256);
check("matrix_release_binding", matrix.release_id === backend.releaseId && matrix.search_release_id === backend.searchReleaseId);
check("matrix_source_binding", matrix.app_source_component_state_id === backend.sourceStateId
  && /^[0-9a-f]{64}$/iu.test(String(matrix.harness_state_id ?? "")));
check("matrix_independent_oracle", matrix.business_oracle_source_is_independent_of_runtime_api === true
  && /^[0-9a-f]{64}$/iu.test(String(matrix.business_oracle_sha256 ?? "")));
check("matrix_no_release", noReleaseMutation(matrix));

const web = readJson(PATHS.web);
check("web_status", web.status === "GREEN_R56_BATCH001_REAL_WEB_50_OF_50_NO_RELEASE", web.status);
check("web_denominator", web.expected === 50 && web.executed === 50 && web.green === 50
  && Array.isArray(web.blockers) && web.blockers.length === 0);
check("web_roles", web.roleCounts?.ORDINARY_USER === 18
  && web.roleCounts?.ESTIMATOR === 16
  && web.roleCounts?.CONSTRUCTION_ENGINEER === 16, web.roleCounts);
check("web_catalogs", web.distinctCatalogIds === 16);
check("web_source_release_binding", web.source?.sourceStateId === backend.sourceStateId
  && web.releaseId === backend.releaseId
  && web.backendEvidence?.sha256 === fileSha(PATHS.backend));
check("web_connections", web.runtimeConnectionAudit?.burstConnections === false
  && web.runtimeConnectionAudit?.maximumActiveCheckouts <= web.runtimeConnectionAudit?.poolMaximumPerDatabaseIdentity
  && Array.isArray(web.runtimeConnectionAudit?.pools)
  && web.runtimeConnectionAudit.pools.every((entry: Json) => entry.waiting === 0), web.runtimeConnectionAudit);
check("web_network_boundary", Array.isArray(web.networkBoundary?.externalRequestAttempts)
  && web.networkBoundary.externalRequestAttempts.length === 0);
check("web_no_release", noReleaseMutation(web));

const build = readJson(PATHS.build);
const auth = readJson(PATHS.auth);
const android = readJson(PATHS.android);
check("build_status", build.status === "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE", build.status);
check("build_clean_and_stable", build.source_changed_during_build === false
  && build.clean_predelete?.verified_absent_before_build === true
  && build.build_log_success === true, build.clean_predelete);
check("build_source", build.source_state_id === backend.sourceStateId && build.app_source_state_id === backend.sourceStateId);
check("build_apk", existsSync(APK) && build.apk_sha256_full === fileSha(APK));
check("build_origins", Array.isArray(build.expected_bundle_markers)
  && build.expected_bundle_markers.every((entry: Json) => entry.present_in_bundle === true)
  && Array.isArray(build.forbidden_production_origins)
  && build.forbidden_production_origins.every((entry: Json) => entry.present_in_bundle === false));
check("build_release", build.release_identity?.release_id === backend.releaseId
  && build.release_identity?.release_status === "prepared"
  && build.release_identity?.activated === false);
check("build_no_release", noReleaseMutation(build));

check("auth_status", auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE", auth.status);
check("auth_source_apk", auth.source_state_id === backend.sourceStateId
  && auth.app_source_state_id === backend.sourceStateId
  && auth.apk_sha256_full === build.apk_sha256_full);
check("auth_bootstrap", auth.auth_bootstrap?.app_data_cleared_before_login === true
  && auth.auth_bootstrap?.persisted_session_assumed === false
  && auth.auth_bootstrap?.native_login_ui_used === true
  && auth.auth_bootstrap?.token_post_count === 1
  && auth.auth_bootstrap?.user_lookup_count === 1
  && auth.auth_bootstrap?.role_lookup_count === 2, auth.auth_bootstrap);
check("auth_network", auth.network_audit?.production_requests === 0
  && auth.network_audit?.unexpected_external_requests === 0);
check("auth_assertions", Array.isArray(auth.assertions) && auth.assertions.every((entry: Json) => entry.passed === true));
check("auth_no_release", noReleaseMutation(auth));

check("android_status", android.status === "GREEN_R56_BATCH001_REAL_ANDROID_API34_50_OF_50_NO_RELEASE", android.status);
check("android_denominator", android.expected === 50 && android.executed === 50 && android.passed === 50
  && android.failed === 0 && android.skipped === 0 && android.distinctCatalogIds === 16);
check("android_complete", Array.isArray(android.missing) && android.missing.length === 0
  && Array.isArray(android.duplicate) && android.duplicate.length === 0
  && Array.isArray(android.blockers) && android.blockers.length === 0
  && Array.isArray(android.missingGreenCoverage) && android.missingGreenCoverage.length === 0);
check("android_boundary", android.externalRequests === 0 && android.revisionHistoryBreaks === 0);
check("android_binding", android.releaseId === backend.releaseId
  && android.source?.appSourceStateId === backend.sourceStateId
  && android.source?.harnessStateId === matrix.harness_state_id
  && android.manifest?.sha256 === fileSha(PATHS.matrix)
  && android.buildManifest?.sha256 === fileSha(PATHS.build)
  && android.authProof?.sha256 === fileSha(PATHS.auth)
  && android.apkSha256Full === build.apk_sha256_full);
check("android_no_release", noReleaseMutation(android));
check("android_raw_count", Array.isArray(android.rawCaseEvidence) && android.rawCaseEvidence.length === 50);

const rawArtifacts: IndexedArtifact[] = [];
const rawCases = new Set<number>();
for (const reference of android.rawCaseEvidence as Json[]) {
  const path = resolve(String(reference.path));
  check(`raw_case_${reference.case}_exists`, existsSync(path), path);
  check(`raw_case_${reference.case}_sha`, fileSha(path) === reference.report_sha256);
  const raw = readJson(path);
  check(`raw_case_${reference.case}_green`, raw.result?.case === reference.case
    && raw.result?.status === "GREEN"
    && Array.isArray(raw.result?.blockers)
    && raw.result.blockers.length === 0);
  check(`raw_case_${reference.case}_binding`, raw.app_source_state_id === backend.sourceStateId
    && raw.harness_state_id === matrix.harness_state_id
    && raw.apk_sha256_full === build.apk_sha256_full
    && raw.matrix_manifest_sha256 === fileSha(PATHS.matrix));
  rawCases.add(Number(reference.case));
  rawArtifacts.push(indexed(path));
}
check("raw_cases_1_to_50", rawCases.size === 50
  && Array.from({ length: 50 }, (_, index) => index + 1).every((entry) => rawCases.has(entry)));

for (const [name, path] of [["case4_mutation", PATHS.case4Mutation], ["case10_photo", PATHS.case10Photo]] as const) {
  const proof = readJson(path);
  check(`${name}_green`, String(proof.status).startsWith("GREEN"), proof.status);
}
const processAudit = readJson(PATHS.processAudit);
check("runner_single_flight", processAudit.duplicateConcurrentRunners === 0
  && processAudit.staleLockRecovered === false
  && processAudit.lockReleased === true, processAudit);

const staticByCatalog = new Map((staticReport.verdicts as Json[]).map((entry) => [entry.catalogId, entry]));
const registryDispositions = (backend.proofs as Json[]).map((proof) => {
  const staticVerdict = staticByCatalog.get(proof.catalogId) as Json | undefined;
  check(`registry_${proof.catalogId}_static_present`, Boolean(staticVerdict));
  return {
    catalog_id: proof.catalogId,
    definition_version_id: proof.definitionVersionId,
    requested_disposition: staticVerdict?.requestedDisposition,
    accepted_disposition: "REAL_WORK_ACCEPTED_ISOLATED_CANDIDATE_NO_RELEASE",
    registry_owner: "CanonicalEstimateDefinitionRegistry",
    backend_proof_status: proof.finalStatus,
    release_id: backend.releaseId,
    release_status: backend.releaseStatus,
    release_activated: backend.releaseActivated,
  };
});
check("registry_exact_16", registryDispositions.length === 16
  && new Set(registryDispositions.map((entry) => entry.catalog_id)).size === 16);
check("registry_real_work_resolved", registryDispositions.every((entry) => entry.requested_disposition === "REAL_WORK"
  && entry.accepted_disposition === "REAL_WORK_ACCEPTED_ISOLATED_CANDIDATE_NO_RELEASE"
  && entry.backend_proof_status === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"
  && entry.release_status === "prepared"
  && entry.release_activated === false));
const registry = {
  schema_version: "real-professional-estimates-r5.6.batch001-registry-dispositions.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  source_state_id: backend.sourceStateId,
  release_id: backend.releaseId,
  release_status: backend.releaseStatus,
  release_activated: backend.releaseActivated,
  expected: 16,
  accepted: 16,
  dispositions: registryDispositions,
  status: "GREEN_BATCH001_REAL_WORK_REGISTRY_DISPOSITIONS_NO_RELEASE",
  release_performed: false,
  deploy_performed: false,
  ota_performed: false,
  merge_performed: false,
  push_performed: false,
  batch009_performed: false,
};
atomicJson(PATHS.registry, { ...registry, content_sha256: sha256(JSON.stringify(registry)) });

check("final_dump_exists", existsSync(FINAL_DUMP), FINAL_DUMP);
check("final_dump_nonempty", readFileSync(FINAL_DUMP).length > 1_000);
const cleanup = inspectCleanup();
check("cleanup_ports_free", cleanup.listeners.every((entry: Json) => entry.owning_processes.length === 0), cleanup.listeners);
check("cleanup_runtime_processes", cleanup.task_owned_runtime_processes.length === 0, cleanup.task_owned_runtime_processes);
check("cleanup_browser_processes", cleanup.task_owned_browser_processes.length === 0, cleanup.task_owned_browser_processes);
check("cleanup_container", cleanup.temporary_container_present === false);
check("cleanup_runner_lock", cleanup.android_runner_lock_present === false);
cleanup.status = "GREEN_BATCH001_LOCAL_RUNTIME_CLEANUP";
atomicJson(PATHS.cleanup, cleanup);

const primary = [
  MASTER, PATHS.static, PATHS.verdicts, PATHS.backend, PATHS.matrix, PATHS.web, APK,
  PATHS.build, PATHS.auth, PATHS.case4Mutation, PATHS.case10Photo, PATHS.android,
  PATHS.processAudit, PATHS.registry, FINAL_DUMP, PATHS.cleanup,
].map(indexed);
const artifactMap = new Map<string, IndexedArtifact>();
for (const artifact of [...primary, ...rawArtifacts]) artifactMap.set(artifact.path.toLowerCase(), artifact);
const artifacts = [...artifactMap.values()].sort((left, right) => left.path.localeCompare(right.path));
const evidenceIndex = {
  schema_version: "real-professional-estimates-r5.6.batch001-exact-sha-evidence-index.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  source_state_id: backend.sourceStateId,
  release_id: backend.releaseId,
  artifact_count: artifacts.length,
  artifacts,
};
atomicJson(PATHS.evidenceIndex, evidenceIndex);

const checkpointWithoutHash = {
  schema_version: "real-professional-estimates-r5.6.batch001-terminal-checkpoint.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  source_state_id: backend.sourceStateId,
  release: {
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    status: backend.releaseStatus,
    activated: backend.releaseActivated,
  },
  static: { definitions: "16/16", role_verdicts: "48/48", independent_gold_oracle: "16/16" },
  backend: { definitions: 16, role_revisions: 48, child_revisions: 32, artifacts: 32, jobs: 80, failed_jobs: 0 },
  registry: { requested: 16, accepted_real_work: 16, activated: 0, report_sha256: fileSha(PATHS.registry) },
  web: { full: "50/50", roles: web.roleCounts, blockers: 0 },
  android: { api_level: 34, full: "50/50", failed: 0, skipped: 0, blockers: 0 },
  apk_sha256: build.apk_sha256_full,
  final_dump: indexed(FINAL_DUMP),
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
  BATCH001_STATUS: "BATCH001_TERMINAL_GREEN_NO_RELEASE",
};
const checkpoint = { ...checkpointWithoutHash, payload_sha256: sha256(JSON.stringify(checkpointWithoutHash)) };
atomicJson(PATHS.checkpoint, checkpoint);
process.stdout.write(`${JSON.stringify({
  status: checkpoint.BATCH001_STATUS,
  checkpoint: PATHS.checkpoint,
  checkpointSha256: fileSha(PATHS.checkpoint),
  evidenceIndex: PATHS.evidenceIndex,
  evidenceIndexSha256: fileSha(PATHS.evidenceIndex),
  registry: PATHS.registry,
  registrySha256: fileSha(PATHS.registry),
  checks: checks.length,
  artifacts: artifacts.length,
}, null, 2)}\n`);
