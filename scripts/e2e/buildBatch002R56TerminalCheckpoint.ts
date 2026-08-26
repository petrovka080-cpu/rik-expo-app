import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type Json = Record<string, any>;
type Check = { name: string; passed: boolean; details?: unknown };
type IndexedArtifact = { path: string; sha256: string; bytes: number };

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const EVIDENCE = resolve(".release-runtime/real-professional-estimates-r4/evidence");
const REPAIR = resolve(EVIDENCE, "04-repair/batch002");
const WEB = resolve(EVIDENCE, "05-web/batch002");
const ANDROID = resolve(EVIDENCE, "06-android/batch002");
const CLOSEOUT = resolve(EVIDENCE, "07-closeout/batch002");
const APK = resolve("android/app/build/outputs/apk/waterProof/app-waterProof.apk");
const RUNNER_LOCK = resolve(ANDROID, "runtime/BATCH002_ANDROID_API34_50.lock.json");

const EXPECTED = {
  backend: "aa89fe47f59fe610dcd48cdff3a21706c0031f2fb73a00a6845b77037697d444",
  content: "d08140abe4119d7318bdd364bf9e8430b7722aefba2f2e1fcbe9e7a0499694d4",
  matrix: "030d9d332eb44fbc6ea7ef2a2c0822ea4a01681c44969049321957d8bc47e85d",
  binding: "104619eb913faeb5ae5832fb9957e43d73bc09ba037a1dd9438f2486ef9fa103",
  ledger: "be98a69b7874595597147871fbd1819414f20d07c74d08747a658117a29865bf",
  sourceFreeze: "7684eb67b8d335c9137145f175b37d549e9801e5eaefcaf0012d74bd2bba8529",
  webSmoke: "f83fe20fd6ec25237da68f0e2fb2b2dc109e2c91dc051a4ff5821cc90d0a2b7e",
  web80: "b3a6ee1f83ee28c423e152d48451ba1e267cd67174454b1d9f27384687f8a7ec",
  apk: "a3876a2a4468ec23c9459b99caff6f16d6faeb11877e78cdb9dd6d8cab1c8af7",
  build: "82c40d85cb231e1d770e94e46c44206c4a97960385325040681e6f513d13a728",
  auth: "ea60a08c9045c7b52bdad8608a89a1fe9830382787099753a50718f8b62c415c",
  case4: "4f0ea18d76a3e7a51656d19440a4a3ca1ab6cd4195212664c9b17c3a4907c30c",
  case4Mutation: "35b67699ac5c4b183d0d1fd79cb4d679efa5724f5dc17d44bc8a712ae315ab1e",
  case10: "3efaf2231f694cda728641f9afd748525df683ebd545c4c43d1e3a6f793068d1",
  case10Photo: "8a7cb3d2a9ee31e1bf247cee00a42e5f1485f0ce9313ca2ed44f3614ee65ed41",
  android50: "c91fbc4b4414b002506bc4565c0faeaabac3d94377f63cf3ca492aab30f5fe1f",
  processAudit: "ecc8c34f05a6cb7d9f4728de6da7ceb0062f7b363d6e4336b1eb7c481837d311",
  baselineDump: "275a43711c9872c54dc9733479c9c3065f5efd0325d034c27545ec29ac4f48c3",
  postUiDump: "f94ed83b4d99978afc3d5ed74f102fba5146c136a5dc7ba9c5e892b8340254d0",
  releaseId: "f9f6fc5c-7a49-410f-951a-c4d385b33831",
  searchReleaseId: "3b99d225-5648-4a30-b48f-4bd3948e9f15",
  definitionSet: "39ccb9c5d7abee29b7d39d9061874d5c140cbaad9ce4c990423d48791e3225d3",
  acceptedBackendSource: "7a025382610f4b6f53591682444495f2e755da4bc0e70084cac039a95fa40b96",
  appSource: "34fcb4bc171a6d4227900326fcdc5deadf90bf7d84ff0020aaf9b63d269db3c9",
  harnessSource: "6fc24a3e1f52e3a102bc20a7a866cda32053af212ad1c0554ba8f947a5a24914",
} as const;

const PATHS = {
  backend: resolve(REPAIR, "BATCH002_BACKEND_REVISION_PARITY_R55.json"),
  content: resolve(REPAIR, "BATCH002_R55_CONTENT_ACCEPTANCE.json"),
  contentCards: resolve(REPAIR, "batch002_r55_content_audit_cards.jsonl"),
  engineeringSources: resolve(REPAIR, "BATCH002_R55_ENGINEERING_SOURCE_PACK.json"),
  baselineDump: resolve(REPAIR, "runtime/batch002-r55-identity-final-7a025382-20260820.dump"),
  matrix: resolve(ANDROID, "BATCH002_R55_ANDROID_API34_MATRIX_50_MANIFEST.json"),
  connectionAudit: resolve(ANDROID, "MATRIX_BOOTSTRAP_CONNECTION_AUDIT.json"),
  binding: resolve(ANDROID, "FINAL_RELEASE_REVISION_BINDING_MANIFEST.json"),
  ledger: resolve(ANDROID, "COMPONENT_SOURCE_IDENTITY_AND_IMPACT_LEDGER.json"),
  sourceFreeze: resolve(ANDROID, "runtime/ANDROID_PROOF_SOURCE_FREEZE_R55_FINAL.json"),
  webSmoke: resolve(WEB, "smoke/BATCH002_R52_WEB_SMOKE_RESULT.json"),
  web80: resolve(WEB, "BATCH002_WEB_80_RESULT.json"),
  build: resolve(ANDROID, "ANDROID_PROOF_BUILD_MANIFEST.json"),
  auth: resolve(ANDROID, "ANDROID_AUTH_BOOTSTRAP_PROOF.json"),
  case4: resolve(ANDROID, "BATCH002_ANDROID_CASE_4_RESULT.json"),
  case4Mutation: resolve(ANDROID, "BATCH002_ANDROID_CASE4_MUTATION_PROOF.json"),
  case10: resolve(ANDROID, "BATCH002_ANDROID_CASE_10_RESULT.json"),
  case10Photo: resolve(ANDROID, "BATCH002_ANDROID_CASE10_PHOTO_PROOF.json"),
  android50: resolve(ANDROID, "BATCH002_R55_ANDROID_API34_50_RESULT.json"),
  processAudit: resolve(ANDROID, "RUNNER_SINGLE_FLIGHT_AND_PROCESS_AUDIT_R55.json"),
  postUiDump: resolve(CLOSEOUT, "batch002-r56-post-ui-final.dump"),
  cleanupAudit: resolve(CLOSEOUT, "BATCH002_LOCAL_CLEANUP_AUDIT.json"),
  evidenceIndex: resolve(CLOSEOUT, "BATCH002_R56_EXACT_SHA_EVIDENCE_INDEX.json"),
  checkpoint: resolve(CLOSEOUT, "BATCH002_TERMINAL_CHECKPOINT_R56.json"),
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
  if (!condition) throw new Error(`BATCH002_R56_TERMINAL_CHECK_FAILED:${name}`);
}

function verifyHash(name: string, path: string, expected: string): void {
  check(`${name}_exists`, existsSync(path), path);
  const actual = fileSha(path);
  check(`${name}_sha256`, actual === expected, { expected, actual, path });
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
$ports = @(8172,8173,8767,55434)
$listeners = @($ports | ForEach-Object {
  $port = $_
  $rows = @(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
  [pscustomobject]@{ port = $port; owning_processes = @($rows | ForEach-Object { $_.OwningProcess }) }
})
$taskProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -in @('node.exe','cmd.exe') -and $_.CommandLine -and
  $_.CommandLine -match 'serveExpoWebStaging|serveBatch002R4LocalSupabaseStub|serveCanonicalEstimateLocalR1|runBatch002R52AndroidApi34Matrix50'
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
  check("docker_process_inventory_available", docker.status === 0, docker.stderr);
  const containers = String(docker.stdout).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean);
  return {
    generated_at: new Date().toISOString(),
    required_free_ports: [8172, 8173, 8767, 55434],
    ...runtime,
    temporary_container: "rik-batch002-r4-parity-temp",
    temporary_container_present: containers.includes("rik-batch002-r4-parity-temp"),
    android_runner_lock: RUNNER_LOCK,
    android_runner_lock_present: existsSync(RUNNER_LOCK),
  };
}

function indexed(path: string): IndexedArtifact {
  const bytes = readFileSync(path);
  return { path, sha256: sha256(bytes), bytes: bytes.length };
}

verifyHash("master_contract", MASTER, MASTER_SHA256);
verifyHash("backend_report", PATHS.backend, EXPECTED.backend);
verifyHash("content_acceptance", PATHS.content, EXPECTED.content);
verifyHash("matrix_manifest", PATHS.matrix, EXPECTED.matrix);
verifyHash("release_revision_binding", PATHS.binding, EXPECTED.binding);
verifyHash("component_ledger", PATHS.ledger, EXPECTED.ledger);
verifyHash("source_freeze", PATHS.sourceFreeze, EXPECTED.sourceFreeze);
verifyHash("web_smoke", PATHS.webSmoke, EXPECTED.webSmoke);
verifyHash("web_80", PATHS.web80, EXPECTED.web80);
verifyHash("apk", APK, EXPECTED.apk);
verifyHash("build_manifest", PATHS.build, EXPECTED.build);
verifyHash("auth_proof", PATHS.auth, EXPECTED.auth);
verifyHash("bounded_case_4", PATHS.case4, EXPECTED.case4);
verifyHash("bounded_case_4_mutation", PATHS.case4Mutation, EXPECTED.case4Mutation);
verifyHash("bounded_case_10", PATHS.case10, EXPECTED.case10);
verifyHash("bounded_case_10_photo", PATHS.case10Photo, EXPECTED.case10Photo);
verifyHash("android_50", PATHS.android50, EXPECTED.android50);
verifyHash("runner_process_audit", PATHS.processAudit, EXPECTED.processAudit);
verifyHash("accepted_baseline_dump", PATHS.baselineDump, EXPECTED.baselineDump);
verifyHash("post_ui_dump", PATHS.postUiDump, EXPECTED.postUiDump);

const backend = readJson(PATHS.backend);
check("backend_status", backend.status === "GREEN_R55_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE", backend.status);
check("backend_counts", backend.counts?.definitions === 55
  && backend.counts?.revisions === 165
  && backend.counts?.child_revisions === 110
  && backend.counts?.artifacts === 110
  && backend.counts?.succeeded_jobs === 275, backend.counts);
check("backend_failed_jobs_zero", Array.isArray(backend.proofs)
  && backend.proofs.length === 55
  && backend.proofs.every((entry: Json) => entry.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"));
check("backend_invariants", Object.values(backend.invariants as Json).every((value) => value === true), backend.invariants);
check("backend_release_prepared_not_active", backend.releaseStatus === "prepared" && backend.releaseActivated === false);
check("backend_identity", backend.sourceStateId === EXPECTED.acceptedBackendSource
  && backend.definitionSetSha256 === EXPECTED.definitionSet
  && backend.releaseId === EXPECTED.releaseId
  && backend.searchReleaseId === EXPECTED.searchReleaseId);

const content = readJson(PATHS.content);
const zeroContentCounters = [
  "noise_rows", "worker_h_rows", "machine_h_rows", "journal_rows", "generic_control_rows",
  "generic_execution_rows", "duplicate_rows", "missing_mandatory_materials", "missing_mandatory_operations",
  "unjustified_equipment", "duplicate_delivery_rows", "cross_domain_rows",
  "mutually_exclusive_rows_active_together", "unbound_parameters", "unexplained_constants",
];
check("content_status", content.status === "GREEN_R55_BATCH002_CONTENT_ACCEPTED", content.status);
check("content_55_of_55", content.metrics?.definitions_audited === 55
  && content.metrics?.definitions_expected === 55
  && content.metrics?.content_green === true
  && Array.isArray(content.cards)
  && content.cards.length === 55, content.metrics);
check("content_15_defect_counters_zero", zeroContentCounters.every((key) => content.metrics?.[key] === 0), content.metrics);
check("content_subject_review", content.subject_review?.regex_or_counter_only === false
  && content.subject_review?.variant_combinations_reviewed === 55, content.subject_review);
check("content_backend_binding", content.authoritative_backend_parity?.accepted === true
  && content.authoritative_backend_parity?.observed_source_state_id === EXPECTED.acceptedBackendSource
  && content.authoritative_backend_parity?.observed_definition_set_sha256 === EXPECTED.definitionSet);
verifyHash("content_cards", PATHS.contentCards, content.evidence.cards_file_sha256);
verifyHash("engineering_sources", PATHS.engineeringSources, content.evidence.engineering_source_pack_file_sha256);

const matrix = readJson(PATHS.matrix);
verifyHash("matrix_connection_audit", PATHS.connectionAudit, matrix.connection_audit.sha256);
const connectionAudit = readJson(PATHS.connectionAudit);
check("matrix_status", matrix.status === "FROZEN_R56_BATCH002_ANDROID_MATRIX_50_FINAL_RELEASE_BINDING_NO_RELEASE");
check("matrix_50_unique", matrix.expected === 50
  && matrix.distinct_catalog_ids === 50
  && matrix.distinct_parent_revisions === 50
  && Array.isArray(matrix.cases)
  && matrix.cases.length === 50
  && new Set(matrix.cases.map((entry: Json) => entry.catalogId)).size === 50);
check("matrix_backend_content_binding", matrix.backend_evidence.sha256 === EXPECTED.backend
  && matrix.content_acceptance.sha256 === EXPECTED.content
  && matrix.accepted_backend_source_state_id === EXPECTED.acceptedBackendSource
  && matrix.definition_set_sha256 === EXPECTED.definitionSet);
check("matrix_component_identities", matrix.app_source_component_state_id === EXPECTED.appSource
  && matrix.harness_state_id === EXPECTED.harnessSource);
check("matrix_release_identity", matrix.release_id === EXPECTED.releaseId
  && matrix.search_release_id === EXPECTED.searchReleaseId);
check("matrix_connections_green", connectionAudit.status === "GREEN_R56_MATRIX_BOOTSTRAP_CONNECTIONS_BOUNDED_NO_LEAKS");
check("matrix_no_release_mutation", noReleaseMutation(matrix));

const verifyWeb = (name: string, report: Json, expected: number, status: string): void => {
  check(`${name}_status`, report.status === status, report.status);
  check(`${name}_denominator`, report.expected === expected && report.executed === expected && report.green === expected);
  check(`${name}_blockers_zero`, Array.isArray(report.blockers) && report.blockers.length === 0);
  check(`${name}_network_boundary`, Array.isArray(report.networkBoundary?.externalRequestAttempts)
    && report.networkBoundary.externalRequestAttempts.length === 0);
  check(`${name}_binding`, report.finalReleaseRevisionBinding?.sha256 === EXPECTED.binding
    && report.componentIdentityLedger?.sha256 === EXPECTED.ledger
    && report.componentIdentityLedger?.appSourceComponentStateId === EXPECTED.appSource);
};
verifyWeb("web_smoke", readJson(PATHS.webSmoke), 3, "GREEN_R56_BATCH002_EXACT_CONTRACT_SMOKE_3_OF_3_NO_RELEASE");
const web80 = readJson(PATHS.web80);
verifyWeb("web_80", web80, 80, "GREEN_R56_REAL_WEB_80_OF_80_NO_RELEASE");
check("web_role_denominators", web80.roleCounts?.ORDINARY_USER === 55
  && web80.roleCounts?.ESTIMATOR === 15
  && web80.roleCounts?.CONSTRUCTION_ENGINEER === 10, web80.roleCounts);

const build = readJson(PATHS.build);
const auth = readJson(PATHS.auth);
check("build_status", build.status === "GREEN_BUILD_AND_AUTH_PROVENANCE_NO_RELEASE");
check("build_source_and_apk", build.source_changed_during_build === false
  && build.source_state_id === EXPECTED.appSource
  && build.app_source_state_id === EXPECTED.appSource
  && build.apk_sha256_full === EXPECTED.apk);
check("build_no_production_origin", build.production_supabase_host_in_bundle === 0
  && build.production_canonical_backend_host_in_bundle === 0
  && build.production_secret_matches_in_bundle === 0);
check("build_auth_binding", build.auth_runtime_proof_completed === true
  && build.auth_runtime_proof?.report_sha256 === EXPECTED.auth
  && build.auth_runtime_proof?.production_requests === 0);
check("build_release_prepared_not_active", build.release_identity?.release_id === EXPECTED.releaseId
  && build.release_identity?.release_status === "prepared"
  && build.release_identity?.activated === false);
check("build_no_release_mutation", noReleaseMutation(build));
check("auth_status", auth.status === "GREEN_ANDROID_AUTH_BOOTSTRAP_NO_RELEASE");
check("auth_source_and_apk", auth.source_state_id === EXPECTED.appSource
  && auth.app_source_state_id === EXPECTED.appSource
  && auth.apk_sha256_full === EXPECTED.apk);
check("auth_real_bootstrap", auth.auth_bootstrap?.persisted_session_assumed === false
  && auth.auth_bootstrap?.app_data_cleared_before_login === true
  && auth.auth_bootstrap?.native_login_ui_used === true
  && auth.auth_bootstrap?.token_post_count === 1
  && auth.auth_bootstrap?.user_lookup_count === 1
  && auth.auth_bootstrap?.role_lookup_count === 2);
check("auth_network_boundary", auth.network_audit?.production_requests === 0
  && auth.network_audit?.unexpected_external_requests === 0);
check("auth_assertions", Array.isArray(auth.assertions) && auth.assertions.every((entry: Json) => entry.passed === true));
check("auth_no_release_mutation", noReleaseMutation(auth));

for (const [name, path] of [["case_4", PATHS.case4], ["case_10", PATHS.case10]] as const) {
  const bounded = readJson(path);
  check(`${name}_green`, bounded.status === "GREEN" || bounded.status?.startsWith("GREEN_"), bounded.status);
  check(`${name}_blockers_zero`, !bounded.blockers || bounded.blockers.length === 0);
}
for (const [name, path] of [["case_4_mutation", PATHS.case4Mutation], ["case_10_photo", PATHS.case10Photo]] as const) {
  const proof = readJson(path);
  check(`${name}_green`, String(proof.status).startsWith("GREEN"), proof.status);
}

const android = readJson(PATHS.android50);
check("android_status", android.status === "GREEN_REAL_ANDROID_API34_50_OF_50_NO_RELEASE", android.status);
check("android_denominator", android.expected === 50 && android.executed === 50 && android.passed === 50
  && android.failed === 0 && android.skipped === 0 && android.distinctCatalogIds === 50);
check("android_completeness", Array.isArray(android.missing) && android.missing.length === 0
  && Array.isArray(android.duplicate) && android.duplicate.length === 0
  && Array.isArray(android.blockers) && android.blockers.length === 0);
check("android_boundary_and_history", android.externalRequests === 0 && android.revisionHistoryBreaks === 0);
check("android_artifact_binding", android.manifest?.sha256 === EXPECTED.matrix
  && android.buildManifest?.sha256 === EXPECTED.build
  && android.authProof?.sha256 === EXPECTED.auth
  && android.apkSha256Full === EXPECTED.apk
  && android.source?.appSourceStateId === EXPECTED.appSource
  && android.source?.harnessStateId === EXPECTED.harnessSource);
check("android_release_identity", android.releaseId === EXPECTED.releaseId);
check("android_no_release_mutation", noReleaseMutation(android));
check("android_raw_count", Array.isArray(android.rawCaseEvidence) && android.rawCaseEvidence.length === 50);
const rawCases = new Set<number>();
const rawArtifacts: IndexedArtifact[] = [];
for (const reference of android.rawCaseEvidence as Json[]) {
  const rawPath = resolve(String(reference.path));
  verifyHash(`android_raw_case_${reference.case}`, rawPath, String(reference.report_sha256));
  const raw = readJson(rawPath);
  check(`android_raw_case_${reference.case}_identity`, raw.contract_sha256 === MASTER_SHA256
    && raw.app_source_state_id === EXPECTED.appSource
    && raw.harness_state_id === EXPECTED.harnessSource
    && raw.apk_sha256_full === EXPECTED.apk
    && raw.matrix_manifest_sha256 === EXPECTED.matrix
    && raw.build_manifest_sha256 === EXPECTED.build
    && raw.auth_proof_sha256 === EXPECTED.auth);
  check(`android_raw_case_${reference.case}_green`, raw.result?.case === reference.case
    && raw.result?.status === "GREEN"
    && Array.isArray(raw.result?.blockers)
    && raw.result.blockers.length === 0);
  rawCases.add(Number(reference.case));
  rawArtifacts.push(indexed(rawPath));
}
check("android_raw_cases_exact_1_to_50", rawCases.size === 50
  && Array.from({ length: 50 }, (_, index) => index + 1).every((value) => rawCases.has(value)));

const processAudit = readJson(PATHS.processAudit);
check("android_single_flight", processAudit.duplicateConcurrentRunners === 0
  && processAudit.staleLockRecovered === false
  && processAudit.lockReleased === true);
check("android_process_audit_binding", processAudit.manifestSha256 === EXPECTED.matrix
  && processAudit.apkSha256Full === EXPECTED.apk
  && processAudit.buildManifestSha256 === EXPECTED.build
  && processAudit.authProofSha256 === EXPECTED.auth);

const cleanup = inspectCleanup();
check("cleanup_ports_free", cleanup.listeners.every((entry: Json) => entry.owning_processes.length === 0), cleanup.listeners);
check("cleanup_task_runtime_processes_closed", cleanup.task_owned_runtime_processes.length === 0, cleanup.task_owned_runtime_processes);
check("cleanup_task_browser_processes_closed", cleanup.task_owned_browser_processes.length === 0, cleanup.task_owned_browser_processes);
check("cleanup_container_removed", cleanup.temporary_container_present === false);
check("cleanup_runner_lock_absent", cleanup.android_runner_lock_present === false);
cleanup.status = "GREEN_BATCH002_LOCAL_RUNTIME_CLEANUP";
atomicJson(PATHS.cleanupAudit, cleanup);

const upstreamArtifacts = [
  MASTER, PATHS.backend, PATHS.content, PATHS.contentCards, PATHS.engineeringSources,
  PATHS.baselineDump, PATHS.matrix, PATHS.connectionAudit, PATHS.binding, PATHS.ledger,
  PATHS.sourceFreeze, PATHS.webSmoke, PATHS.web80, APK, PATHS.build, PATHS.auth,
  PATHS.case4, PATHS.case4Mutation, PATHS.case10, PATHS.case10Photo, PATHS.android50,
  PATHS.processAudit, PATHS.postUiDump, PATHS.cleanupAudit,
].map(indexed);
const artifactMap = new Map<string, IndexedArtifact>();
for (const artifact of [...upstreamArtifacts, ...rawArtifacts]) artifactMap.set(artifact.path.toLowerCase(), artifact);
const artifacts = [...artifactMap.values()].sort((left, right) => left.path.localeCompare(right.path));
const evidenceIndex = {
  schema_version: "real-professional-estimates-r5.6.batch002-exact-sha-evidence-index.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  artifact_count: artifacts.length,
  artifacts,
};
atomicJson(PATHS.evidenceIndex, evidenceIndex);

const checkpointWithoutHash = {
  schema_version: "real-professional-estimates-r5.6.batch002-terminal-checkpoint.v1",
  generated_at: new Date().toISOString(),
  master_sha256: MASTER_SHA256,
  accepted_backend_contract_sha256: backend.masterSha256,
  backend: {
    report_sha256: EXPECTED.backend,
    source_state_id: EXPECTED.acceptedBackendSource,
    definition_set_sha256: EXPECTED.definitionSet,
    definitions: 55,
    role_revisions: 165,
    child_revisions: 110,
    artifacts: 110,
    jobs: 275,
    failed_jobs: 0,
  },
  content: { definitions_audited: 55, defect_counters: 15, defect_counter_sum: 0, content_green: true },
  web: { smoke: "3/3", full: "80/80", blockers: 0 },
  android: { api_level: 34, bounded_cases: [4, 10], full: "50/50", failed: 0, skipped: 0, blockers: 0 },
  release: { release_id: EXPECTED.releaseId, search_release_id: EXPECTED.searchReleaseId, status: "prepared", activated: false },
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
  BATCH002_STATUS: "BATCH_TERMINAL_GREEN_NO_RELEASE",
};
const checkpoint = { ...checkpointWithoutHash, payload_sha256: sha256(JSON.stringify(checkpointWithoutHash)) };
atomicJson(PATHS.checkpoint, checkpoint);
process.stdout.write(`${JSON.stringify({
  status: checkpoint.BATCH002_STATUS,
  checkpoint: PATHS.checkpoint,
  checkpointSha256: fileSha(PATHS.checkpoint),
  evidenceIndex: PATHS.evidenceIndex,
  evidenceIndexSha256: fileSha(PATHS.evidenceIndex),
  checks: checks.length,
  artifacts: artifacts.length,
}, null, 2)}\n`);
