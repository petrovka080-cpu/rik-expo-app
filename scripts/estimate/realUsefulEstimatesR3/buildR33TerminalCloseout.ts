import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type CommandResult = {
  command: string;
  duration_ms: number;
  exit_code: number;
  stdout: string;
  stderr: string;
};

const ROOT = resolve(".");
const EVIDENCE_ROOT = resolve(".release-runtime/real-useful-estimates-r3/evidence/r3-3-closeout");
const LOG_ROOT = resolve(EVIDENCE_ROOT, "terminal-logs");
const MASTER_SHA256 = "d755fd0fecb51f3642218f6a29115c5a981c6b2220fc7f87e2fc6870f5c3278a";
const PARENT_SOURCE_SHA256 = "750f31ee8d1e516afb5318a434c8eb73c75a996227814bfde2e815f08b095929";
const PARENT_CLOSEOUT_SHA256 = "413ec084365e43a3a0f43a6f1b808e9c3f460f8225ee3af886202b85090349a8";
const IDENTITY = resolve(EVIDENCE_ROOT, "07_CURRENT_SOURCE_IDENTITY_R33.json");
const MANIFEST = resolve(EVIDENCE_ROOT, "06_CURRENT_PRODUCT_SOURCE_MANIFEST_R33.json");
const MATERIAL_CLOSEOUT = resolve(EVIDENCE_ROOT, "12_MATERIAL_SELECTION_CLOSEOUT_R33.json");
const MATERIAL_VERDICT = resolve(EVIDENCE_ROOT, "13_AUTOMATED_MATERIAL_CLOSEOUT_VERDICT_R33.json");
const TARGETED = resolve(EVIDENCE_ROOT, "08_R33_TARGETED_TEST_RESULT.json");
const FUNCTIONAL = resolve(EVIDENCE_ROOT, "20_FUNCTIONAL_CHAIN_JEST_R33.json");
const PORTED = resolve(EVIDENCE_ROOT, "21_RETIRED_FIXTURE_PORTED_TESTS_R33.json");
const ELECTRICAL = resolve(EVIDENCE_ROOT, "23_ELECTRICAL_SUCCESSOR_MERGE_R33.json");
const GRAPH = resolve(EVIDENCE_ROOT, "ownership-r33/04_PRODUCTION_REACHABILITY_GRAPH.json");
const OWNERSHIP = resolve(EVIDENCE_ROOT, "ownership-r33/05_CANONICAL_CODE_OWNERSHIP.json");
const DEAD_LEDGER = resolve(EVIDENCE_ROOT, "ownership-r33/06_DEAD_CODE_LEDGER.json");
const BEFORE_50 = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/before/BEFORE_50_SELECTION_MANIFEST.json",
);
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildR33TerminalCloseout.ts");

const RETIRED_FIXTURE = "src/features/consumerRepair/requestEstimateLegacyTestActions.ts";
const RETIRED_FIXTURE_SHA256 = "732cdbf52cc658ff8de57b71d63d8ce876a285485e0829b0fa11c5d4c6828b39";
const RETIRED_ORPHAN_SUITES = [
  "src/features/consumerRepair/consumerRepairAsphaltV4Phase1B.test.ts",
  "tests/aiEstimateV4/asphaltRelatedDemolitionD0D5.contract.test.ts",
  "tests/aiEstimateV4/roadFullRevisionDurableFailureRecoveryV4.contract.test.ts",
  "tests/aiEstimateV4/roadScopeConcurrencyV4.contract.test.ts",
  "tests/aiEstimateV4/roadScopeProductionIntegrationV4.contract.test.ts",
  "tests/performance/asphaltPdfPerformance.contract.test.ts",
  "tests/requestEstimate/asphalt35WebAndroidVisibleOutput.contract.test.ts",
  "tests/requestEstimate/canonicalElectricalParameterCore.contract.test.ts",
  "tests/requestEstimate/canonicalElectricalPerformance.contract.test.ts",
  "tests/requestEstimate/electricalNativeColdRestart.contract.test.ts",
  "tests/requestEstimate/electricalProductionRuntimeTruth.contract.test.ts",
  "tests/requestEstimate/electricalRevisionProjectionParity.contract.test.ts",
  "tests/requestEstimate/requestAutoPrepareSourceBackedStructuredEstimate.contract.test.ts",
  "tests/requestEstimate/structuredEstimateLegacySessionDoesNotBlockUi.contract.test.tsx",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fileSha256(path: string): string {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return sha256(readFileSync(path));
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeEvidence(path: string, value: Json): string {
  const payload = { ...value, payload_sha256: sha256(JSON.stringify(value)) };
  atomicWrite(path, `${JSON.stringify(payload, null, 2)}\n`);
  return fileSha256(path);
}

function run(label: string, args: string[]): CommandResult {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  invariant(result.error == null, `${label}_SPAWN_FAILED:${result.error?.message ?? "unknown"}`);
  const command = [process.execPath, ...args].join(" ");
  const commandResult = {
    command,
    duration_ms: Date.now() - started,
    exit_code: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
  const log = `${command}\nEXIT_CODE=${commandResult.exit_code}\nDURATION_MS=${commandResult.duration_ms}\n\nSTDOUT\n${commandResult.stdout}\nSTDERR\n${commandResult.stderr}`;
  atomicWrite(resolve(LOG_ROOT, `${label}.log`), log);
  return commandResult;
}

function commandProof(label: string, result: CommandResult): Json {
  const logPath = resolve(LOG_ROOT, `${label}.log`);
  return {
    command: result.command,
    exit_code: result.exit_code,
    duration_ms: result.duration_ms,
    stdout_sha256: sha256(result.stdout),
    stderr_sha256: sha256(result.stderr),
    log: { path: repoPath(logPath), sha256: fileSha256(logPath) },
  };
}

function parseJest(result: CommandResult, suites: number, tests: number, label: string): Json {
  invariant(result.exit_code === 0, `${label}_EXIT_${result.exit_code}:${result.stderr}`);
  const parsed = JSON.parse(result.stdout) as Json;
  invariant(parsed.success === true, `${label}_SUCCESS_FALSE`);
  invariant(parsed.numPassedTestSuites === suites && parsed.numPassedTests === tests,
    `${label}_COUNT_DRIFT:${parsed.numPassedTestSuites}/${parsed.numPassedTests}`);
  invariant(parsed.numFailedTestSuites === 0 && parsed.numFailedTests === 0, `${label}_FAILURES_PRESENT`);
  return parsed;
}

function validateJestArtifact(path: string, suites: number, tests: number, label: string): Json {
  const parsed = readJson(path);
  invariant(parsed.success === true, `${label}_SUCCESS_FALSE`);
  invariant(parsed.numPassedTestSuites === suites && parsed.numPassedTests === tests,
    `${label}_COUNT_DRIFT:${parsed.numPassedTestSuites}/${parsed.numPassedTests}`);
  invariant(parsed.numFailedTestSuites === 0 && parsed.numFailedTests === 0, `${label}_FAILURES_PRESENT`);
  return parsed;
}

function currentSourceDrift(manifest: Json): string[] {
  const drift: string[] = [];
  for (const entry of manifest.files as Json[]) {
    const absolute = resolve(String(entry.path));
    if (!existsSync(absolute)) drift.push(`MISSING:${entry.path}`);
    else if (fileSha256(absolute) !== entry.sha256) drift.push(`SHA:${entry.path}`);
  }
  return drift;
}

function environmentProbe(): Json {
  const adb = run("android_adb_devices_r33", ["-e", [
    "const {spawnSync}=require('node:child_process');",
    "const r=spawnSync('adb',['devices','-l'],{encoding:'utf8'});",
    "process.stdout.write(JSON.stringify({status:r.status,stdout:r.stdout||'',stderr:r.stderr||''}));",
  ].join("")]);
  invariant(adb.exit_code === 0, "ANDROID_ADB_PROBE_WRAPPER_RED");
  const adbResult = JSON.parse(adb.stdout) as Json;
  const connectedDevices = String(adbResult.stdout ?? "").split(/\r?\n/u)
    .slice(1)
    .filter((line) => /\sdevice(?:\s|$)/u.test(line));
  const normalApkCandidates = [
    "android/app/build/outputs/apk/waterProof/debug/app-waterProof-debug.apk",
    "android/app/build/outputs/apk/debug/app-debug.apk",
  ];
  const normalApks = normalApkCandidates.filter((path) => existsSync(resolve(path)));
  const webUrl = String(process.env.RIK_WEB_BASE_URL ?? "").trim();
  const webProbe = run("web_runtime_probe_r33", ["-e", [
    "const url=process.argv[1];",
    "if(!url){process.stdout.write(JSON.stringify({configured:false,reachable:false}));process.exit(0)}",
    "const c=new AbortController();setTimeout(()=>c.abort(),3000);",
    "fetch(url,{signal:c.signal}).then(r=>process.stdout.write(JSON.stringify({configured:true,reachable:true,status:r.status,url}))).catch(e=>process.stdout.write(JSON.stringify({configured:true,reachable:false,error:String(e),url})));",
  ].join(""), webUrl]);
  invariant(webProbe.exit_code === 0, "WEB_RUNTIME_PROBE_WRAPPER_RED");
  const web = JSON.parse(webProbe.stdout) as Json;
  return {
    android: {
      adb_probe: commandProof("android_adb_devices_r33", adb),
      adb_exit_code: adbResult.status,
      connected_devices: connectedDevices,
      connected_devices_count: connectedDevices.length,
      required_device: "Pixel 7 / Android API 34",
      normal_current_apk_candidates: normalApkCandidates,
      normal_current_apks_found: normalApks,
      current_apk_sha256: normalApks.length === 1 ? fileSha256(resolve(normalApks[0])) : null,
      status: connectedDevices.length > 0 && normalApks.length === 1 ? "READY_FOR_MATRIX" : "BLOCKED_EXTERNAL_RUNTIME",
    },
    web: {
      runtime_probe: commandProof("web_runtime_probe_r33", webProbe),
      ...web,
      status: web.configured === true && web.reachable === true ? "READY_FOR_MATRIX" : "BLOCKED_EXTERNAL_RUNTIME",
    },
  };
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const identity = readJson(IDENTITY);
  const manifest = readJson(MANIFEST);
  invariant(identity.status === "R33_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_RED");
  invariant(identity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(manifest.master_contract_sha256 === MASTER_SHA256, "MANIFEST_MASTER_SHA_DRIFT");
  invariant(identity.hashes?.product_source_sha256 === manifest.aggregates?.product_source?.sha256,
    "PRODUCT_SOURCE_IDENTITY_MISMATCH");
  const driftBefore = currentSourceDrift(manifest);
  invariant(driftBefore.length === 0, `SOURCE_DRIFT_BEFORE:${driftBefore.slice(0, 10).join("|")}`);
  const toolEntry = (manifest.files as Json[]).find((entry) => entry.path === repoPath(TOOL));
  invariant(toolEntry?.sha256 === fileSha256(TOOL), "TERMINAL_TOOL_NOT_SEALED");

  validateJestArtifact(TARGETED, 3, 26, "R33_MATERIAL_TARGETED");
  validateJestArtifact(FUNCTIONAL, 6, 20, "R33_FUNCTIONAL_CHAIN");
  validateJestArtifact(PORTED, 5, 16, "R33_RETIRED_FIXTURE_PORTED");
  const electrical = readJson(ELECTRICAL);
  invariant(electrical.status === "GREEN_605_OF_605_ELECTRICAL_SUCCESSOR_SERIALIZABLE"
    && electrical.covered_unique_identities === 605 && electrical.missing_identities?.length === 0
    && electrical.duplicate_identity_count === 0 && electrical.totals?.shards === 5
    && electrical.totals?.suites_green === 5 && electrical.totals?.tests_green === 35,
  "ELECTRICAL_SUCCESSOR_RED");

  const graph = readJson(GRAPH);
  const ownership = readJson(OWNERSHIP);
  const deadLedger = readJson(DEAD_LEDGER);
  invariant(graph.production_source_modules === 3410 && graph.runtime_reachable_modules === 1886
    && graph.total_roots === 71, "OWNERSHIP_GRAPH_COUNT_DRIFT");
  invariant(ownership.status === "GREEN_R33_CANONICAL_OWNERSHIP" && ownership.blockers?.length === 0
    && ownership.confirmed_dead_source_remaining_in_bounded_scope === 0, "OWNERSHIP_RED");
  const fixtureLedger = (deadLedger.entries as Json[]).find((entry) => entry.path === RETIRED_FIXTURE);
  invariant(fixtureLedger?.classification === "DEAD" && fixtureLedger.source_exists === false
    && fixtureLedger.runtime_hits === 0 && fixtureLedger.unique_unported_behavior?.length === 0,
  "RETIRED_FIXTURE_LEDGER_RED");
  invariant(!existsSync(resolve(RETIRED_FIXTURE)), "RETIRED_FIXTURE_SOURCE_REAPPEARED");
  invariant(RETIRED_ORPHAN_SUITES.every((path) => !existsSync(resolve(path))), "RETIRED_ORPHAN_SUITE_REAPPEARED");

  const material = readJson(MATERIAL_CLOSEOUT);
  const materialVerdict = readJson(MATERIAL_VERDICT);
  invariant(material.exact_product_source_sha256 === identity.hashes.product_source_sha256,
    "MATERIAL_CLOSEOUT_SOURCE_DRIFT");
  invariant(material.materials?.resolved === 400 && material.materials?.unresolved === 0
    && material.passports?.review_packets_built === 71 && material.equipment?.numeric_rules_present === 142,
  "MATERIAL_CLOSEOUT_RED");
  invariant(material.engineering_acceptance?.accepted === 0 && material.engineering_acceptance?.denominator === 71
    && material.human_acceptances_fabricated === 0, "HUMAN_ACCEPTANCE_TRUTH_DRIFT");
  invariant(materialVerdict.global_status === "R3_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    "MATERIAL_VERDICT_GLOBAL_STATUS_DRIFT");

  const performanceResult = run("performance_budget_r33", [
    "node_modules/jest/bin/jest.js", "--runInBand", "--no-cache", "--runTestsByPath",
    "tests/perf/performance-budget.test.ts", "--json",
  ]);
  parseJest(performanceResult, 1, 14, "PERFORMANCE_BUDGET");
  const policyResult = run("no_test_weakening_policy_r33", [
    "node_modules/jest/bin/jest.js", "--runInBand", "--no-cache", "--runTestsByPath",
    "scripts/release/noTestWeakeningPolicy.test.ts", "--json",
  ]);
  invariant(policyResult.exit_code === 0, `NO_TEST_WEAKENING_POLICY_RED:${policyResult.stderr}`);
  const policy = JSON.parse(policyResult.stdout) as Json;
  invariant(policy.success === true && policy.numFailedTestSuites === 0 && policy.numFailedTests === 0,
    "NO_TEST_WEAKENING_POLICY_RED");
  const auditResult = run("no_test_weakening_audit_r33", [
    "node_modules/tsx/dist/cli.mjs", "scripts/release/auditCurrentCoreNoTestWeakening.ts",
  ]);
  invariant(auditResult.exit_code === 0, `NO_TEST_WEAKENING_AUDIT_RED:${auditResult.stderr}`);
  const audit = JSON.parse(auditResult.stdout) as Json;
  invariant(audit.final_status === "GREEN_CURRENT_CORE_NO_TEST_WEAKENING_AUDIT"
    && audit.blockers?.length === 0 && audit.forbidden_focus_changes?.length === 0
    && audit.timeout_or_memory_weakening_changes?.length === 0
    && audit.guarded_fixtures_modified?.length === 0, "NO_TEST_WEAKENING_AUDIT_RED");
  const scriptsTsc = run("scripts_typecheck_r33", [
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.scripts.json", "--pretty", "false",
  ]);
  const productTsc = run("product_typecheck_r33", [
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false",
  ]);
  const edgeTsc = run("edge_typecheck_r33", [
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false",
  ]);
  invariant(scriptsTsc.exit_code === 0, `SCRIPTS_TYPECHECK_RED:${scriptsTsc.stdout}${scriptsTsc.stderr}`);
  invariant(productTsc.exit_code === 0, `PRODUCT_TYPECHECK_RED:${productTsc.stdout}${productTsc.stderr}`);
  invariant(edgeTsc.exit_code === 0, `EDGE_TYPECHECK_RED:${edgeTsc.stdout}${edgeTsc.stderr}`);

  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    current_source_identity: { path: repoPath(IDENTITY), sha256: fileSha256(IDENTITY) },
    exact_product_source_sha256: identity.hashes.product_source_sha256,
    git: identity.git,
    production_accessed: false,
    production_mutated: false,
    release_performed: false,
    deploy_performed: false,
    human_acceptances_fabricated: 0,
    tool: { path: repoPath(TOOL), sha256: fileSha256(TOOL) },
  };

  const tombstonePath = resolve(EVIDENCE_ROOT, "25_RETIRED_FRONTEND_COMPILER_TOMBSTONE_R33.json");
  const tombstoneSha = writeEvidence(tombstonePath, {
    schema_version: "master-r33.retired-frontend-compiler-tombstone.v1",
    ...common,
    status: "GREEN_RETIRED_FRONTEND_COMPILER_DELETED_WITH_PORT_PARITY",
    deleted_source: {
      path: RETIRED_FIXTURE,
      previous_sha256: RETIRED_FIXTURE_SHA256,
      classification: "DEAD",
      runtime_hits_before_delete: 0,
      build_import_hits_after_delete: 0,
      runtime_import_hits_after_delete: 0,
      unique_unported_behavior: [],
      source_exists_after: false,
    },
    canonical_successors: [
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
      "src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection.ts",
      "src/features/consumerRepair/requestEstimateScreenActions.ts",
    ],
    ported_suites: [
      "tests/requestEstimateSelectedWorkUx/exactCatalogLaunchSelectedWork.contract.test.ts",
      "tests/requestEstimateSelectedWorkUx/requestEstimateSelectedWorkActiveInput.contract.test.tsx",
      "tests/consumerRepair/newPromptDoesNotInheritApprovedHistoryEstimate.contract.test.ts",
      "tests/requestEstimate/inlineWorkPromptNoContactBlocker.test.ts",
      "tests/architecture/r33RetiredFrontendRequestCompiler.contract.test.ts",
    ],
    orphan_suites_deleted: RETIRED_ORPHAN_SUITES,
    parity: {
      ported_tests: { path: repoPath(PORTED), sha256: fileSha256(PORTED), suites: 5, tests: 16 },
      functional_chain: { path: repoPath(FUNCTIONAL), sha256: fileSha256(FUNCTIONAL), suites: 6, tests: 20 },
      electrical_successor: { path: repoPath(ELECTRICAL), sha256: fileSha256(ELECTRICAL), identities: 605 },
      ownership: { path: repoPath(OWNERSHIP), sha256: fileSha256(OWNERSHIP), blockers: 0 },
    },
    prior_dead_source_tombstones: {
      path: ".release-runtime/real-estimates-global-green-r3/evidence/09_DEAD_SOURCE_TOMBSTONES_R3.json",
      sha256: fileSha256(resolve(".release-runtime/real-estimates-global-green-r3/evidence/09_DEAD_SOURCE_TOMBSTONES_R3.json")),
      covered_paths: [
        "src/components/layout/StickyActionBar.tsx",
        "src/components/BuildIdentityMarker.tsx",
        "src/lib/runtime/r45RuntimeManifest.ts",
        "src/lib/mobilePhotoCapture/mobilePhotoStorageKey.ts",
      ],
    },
  });

  const performancePath = resolve(EVIDENCE_ROOT, "70_PERFORMANCE_BUDGET_R33.json");
  const performanceSha = writeEvidence(performancePath, {
    schema_version: "master-r33.performance-budget.v1",
    ...common,
    status: "GREEN_1_SUITE_14_TESTS_LIMITS_UNCHANGED",
    historical_debt: { aggregate: 34, budget: 24, status: "RED_HISTORICAL" },
    current: { aggregate: 24, budget: 24, thresholds: [24, 13, 14, 508, 1313], threshold_raised: false },
    proof: { suites: 1, tests: 14, ...commandProof("performance_budget_r33", performanceResult) },
  });
  const typecheckPath = resolve(EVIDENCE_ROOT, "71_TYPECHECKS_R33.json");
  const typecheckSha = writeEvidence(typecheckPath, {
    schema_version: "master-r33.typechecks.v1",
    ...common,
    status: "GREEN_SCRIPTS_PRODUCT_EDGE_ZERO_ERRORS",
    scripts: { errors: 0, ...commandProof("scripts_typecheck_r33", scriptsTsc) },
    product: { errors: 0, ...commandProof("product_typecheck_r33", productTsc) },
    edge: { errors: 0, ...commandProof("edge_typecheck_r33", edgeTsc) },
  });
  const noWeakeningPath = resolve(EVIDENCE_ROOT, "72_NO_TEST_WEAKENING_R33.json");
  const noWeakeningSha = writeEvidence(noWeakeningPath, {
    schema_version: "master-r33.no-test-weakening.v1",
    ...common,
    status: "GREEN_ZERO_BLOCKERS",
    changed_test_files: audit.changed_test_files_count,
    audit_entries: audit.audit_entries?.length,
    blockers: 0,
    skip_only: 0,
    timeout_retry_memory_weakening: 0,
    guarded_fixture_drift: 0,
    policy: {
      suites: policy.numPassedTestSuites,
      tests: policy.numPassedTests,
      ...commandProof("no_test_weakening_policy_r33", policyResult),
    },
    audit: commandProof("no_test_weakening_audit_r33", auditResult),
  });

  const environment = environmentProbe();
  const before50 = readJson(BEFORE_50);
  invariant(before50.denominators?.total === 50 && before50.selections?.length === 50,
    "FROZEN_BEFORE_50_DRIFT");
  const environmentPath = resolve(EVIDENCE_ROOT, "73_RUNTIME_MATRIX_BLOCKERS_R33.json");
  const environmentSha = writeEvidence(environmentPath, {
    schema_version: "master-r33.runtime-matrix-blockers.v1",
    ...common,
    status: "BLOCKED_EXTERNAL_RUNTIME_NO_FALSE_GREEN",
    frozen_before_50: {
      path: repoPath(BEFORE_50),
      sha256: fileSha256(BEFORE_50),
      cases: 50,
      historical_boq_rows: 12197,
      preserved_immutable: true,
    },
    after_50: {
      status: "BLOCKED_NOT_EXECUTED",
      passed: 0,
      denominator: 50,
      blocker: "criterion 17 requires Web and Android BOQ hash parity on this exact source SHA",
    },
    web_80: {
      status: "BLOCKED_NOT_EXECUTED",
      passed: 0,
      denominator: 80,
      blocker: "current isolated Web/backend runtime URL is not configured and reachable",
    },
    android_api34_50: {
      status: "BLOCKED_NOT_EXECUTED",
      passed: 0,
      denominator: 50,
      blocker: "no connected Pixel 7/API 34 device and no normal current-source APK",
    },
    environment,
  });

  const driftAfter = currentSourceDrift(manifest);
  invariant(driftAfter.length === 0, `SOURCE_DRIFT_AFTER:${driftAfter.slice(0, 10).join("|")}`);
  const verdictPath = resolve(EVIDENCE_ROOT, "74_AUTOMATED_TERMINAL_VERDICT_R33.json");
  const verdictSha = writeEvidence(verdictPath, {
    schema_version: "master-r33.automated-terminal-verdict.v1",
    ...common,
    status: "R3_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    source_drift_during_terminal_run: 0,
    architecture: {
      production_modules: 3410,
      runtime_reachable_modules: 1886,
      roots: 71,
      unresolved_imports: 0,
      duplicate_runtime_owners: 0,
      confirmed_dead_source_remaining: 0,
    },
    denominator: {
      historical_parent: "4282 = 3357 canonical + 10 mandatory successor + 515 external + 400 redirect",
      content_target: 3367,
      parent_source_sha256: PARENT_SOURCE_SHA256,
      parent_automated_closeout_sha256: PARENT_CLOSEOUT_SHA256,
      repeated: false,
    },
    content: {
      material_selections_resolved: "400/400",
      visible_placeholders: 0,
      review_packets_built: "71/71",
      equipment_numeric: "142/142",
      engineer_accepted: "0/71",
      project_confirmation_required_occurrences: material.materials?.strategy?.required_project_input,
      fabricated_acceptances: 0,
    },
    dependent_automated_gates: {
      material_targeted: "3 suites / 26 tests GREEN",
      functional_chain: "6 suites / 20 tests GREEN",
      retired_fixture_port_parity: "5 suites / 16 tests GREEN",
      electrical_successor: "605/605; 5 shards / 5 suites / 35 tests GREEN",
      performance: "1 suite / 14 tests GREEN",
      typechecks: "scripts/product/edge = 0/0/0 errors",
      no_test_weakening: "0 blockers",
    },
    terminal_gates: {
      source_identity: "GREEN",
      material_structure: "GREEN_400_OF_400",
      canonical_runtime_ownership: "GREEN",
      dead_source_tombstones: "GREEN",
      static_quality: "GREEN",
      after_50: "BLOCKED_0_OF_50",
      web_80: "BLOCKED_0_OF_80",
      android_api34_50: "BLOCKED_0_OF_50",
      independent_engineer_acceptance: "RED_0_OF_71",
    },
    prior_closed_gates_not_repeated: {
      postgresql_rls_disposable_runs: "2/2 GREEN",
      concurrency: "2 attempts -> 1 committed winner + 1 stale loser",
      probe_databases_remaining: 0,
      generated_cleanup: "45/45 safe node_modules; 33493311488 bytes; protected 30/30",
    },
    remaining_blockers: [
      { code: "INDEPENDENT_ENGINEER_ACCEPTANCE_MISSING", missing: 71, external_human: true },
      { code: "PROJECT_MATERIAL_CONFIRMATIONS_MISSING", missing: material.materials?.strategy?.required_project_input, external_human: true },
      { code: "CURRENT_WEB_RUNTIME_UNAVAILABLE", missing_cases: 80, external_environment: true },
      { code: "PIXEL7_API34_AND_CURRENT_APK_UNAVAILABLE", missing_cases: 50, external_environment: true },
      { code: "AFTER50_CROSS_PLATFORM_PARITY_BLOCKED", missing_cases: 50, depends_on: ["WEB_80", "ANDROID_API34_50"] },
    ],
    artifacts: {
      material_verdict: { path: repoPath(MATERIAL_VERDICT), sha256: fileSha256(MATERIAL_VERDICT) },
      ownership: { path: repoPath(OWNERSHIP), sha256: fileSha256(OWNERSHIP) },
      dead_source_tombstone: { path: repoPath(tombstonePath), sha256: tombstoneSha },
      performance: { path: repoPath(performancePath), sha256: performanceSha },
      typechecks: { path: repoPath(typecheckPath), sha256: typecheckSha },
      no_test_weakening: { path: repoPath(noWeakeningPath), sha256: noWeakeningSha },
      runtime_matrix_blockers: { path: repoPath(environmentPath), sha256: environmentSha },
    },
    production_ready: false,
    release_authorized: false,
    terminal_wording: "GLOBAL_RED / NOT_PRODUCTION_READY / NO_RELEASE",
  });

  const indexPath = resolve(EVIDENCE_ROOT, "R33_TERMINAL_CLOSEOUT_INDEX.json");
  const indexSha = writeEvidence(indexPath, {
    schema_version: "master-r33.terminal-closeout-index.v1",
    ...common,
    status: "R3_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    artifacts: {
      source_identity: { path: repoPath(IDENTITY), sha256: fileSha256(IDENTITY) },
      material_closeout: { path: repoPath(MATERIAL_CLOSEOUT), sha256: fileSha256(MATERIAL_CLOSEOUT) },
      terminal_verdict: { path: repoPath(verdictPath), sha256: verdictSha },
    },
    remaining_blockers_count: 5,
    terminal_wording: "GLOBAL_RED / NOT_PRODUCTION_READY / NO_RELEASE",
  });
  process.stdout.write(`${JSON.stringify({
    status: "R3_IN_PROGRESS_GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
    source_sha256: identity.hashes.product_source_sha256,
    architecture: "3410/1886/71",
    materials: "400/400",
    review_packets: "71/71",
    engineer_accepted: "0/71",
    static_quality: "GREEN",
    runtime_matrices: "BLOCKED_EXTERNAL_ENVIRONMENT",
    verdict_sha256: verdictSha,
    index_sha256: indexSha,
  }, null, 2)}\n`);
}

main();
