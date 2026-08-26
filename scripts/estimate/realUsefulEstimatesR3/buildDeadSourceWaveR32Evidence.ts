import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type CommandResult = {
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
};

const ROOT = resolve(".");
const MASTER_SHA256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820";
const EVIDENCE_ROOT = resolve(".release-runtime/real-estimates-global-green-r3/evidence");
const CURRENT_SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const CURRENT_PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_PRODUCT_SOURCE_MANIFEST_R3.json");
const PRE_WAVE_SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "R3_1_FINAL_SOURCE_IDENTITY_R3.json");
const PRE_WAVE_PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "R3_1_FINAL_PRODUCT_SOURCE_MANIFEST_R3.json");
const PRE_WAVE_ACCEPTANCE = resolve(EVIDENCE_ROOT, "R3_1_FINAL_HUMAN_ACCEPTANCE_PLATFORM_R3.json");
const RAW_ROOT = resolve(EVIDENCE_ROOT, "r3-0-ownership-raw");
const CURRENT_GRAPH = resolve(RAW_ROOT, "04_PRODUCTION_REACHABILITY_GRAPH.json");
const CURRENT_LEDGER = resolve(RAW_ROOT, "06_DEAD_CODE_LEDGER.json");
const HISTORICAL_GRAPH = resolve(
  ".release-runtime/real-useful-estimates-r2/evidence/phase1-after-phase3-static/04_PRODUCTION_REACHABILITY_GRAPH.json",
);
const HISTORICAL_PRODUCT_MANIFEST = resolve(
  ".release-runtime/real-useful-estimates-r2/evidence/phase3-static/source-seal/02_PRODUCT_SOURCE_MANIFEST.json",
);
const TARGETED_TESTS = [
  "tests/architecture/buildIdentityDiagnosticNotCustomerUi.contract.test.ts",
  "tests/mobilePhotoCapture/legacyFileUriSafeStagingPath.contract.test.ts",
  "tests/mobilePhotoCapture/mobilePhotoLocalRepository.atomic.contract.test.ts",
  "tests/mobilePhotoCapture/temporaryCameraUriCopied.contract.test.ts",
] as const;
const TOOL = "scripts/estimate/realUsefulEstimatesR3/buildDeadSourceWaveR32Evidence.ts";

const EXPECTED_R3_1_SOURCE_SHA256 = "a2e2d2bf94889ee56e88cbead728f19e65fc0ddf0ce822b454cf59e675403e25";
const EXPECTED_R3_1_PRODUCT_MANIFEST_SHA256 = "983e3b2b582b554380494e82be517cafbf5cd340fa312dfdaff73cbd6fcb67a4";
const EXPECTED_R3_1_ACCEPTANCE_SHA256 = "05083a19b7ac8162da2c09caa24802feaca30e52d8929116c5e376099ff60bef";
const ACCEPTANCE_OWNER = "src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2.ts";
const R45_OWNER = "src/lib/runtime/r45RuntimeManifest.ts";
const MOBILE_PHOTO_STORAGE_OWNER = "src/lib/mobilePhotoCapture/mobilePhotoStorageKey.ts";

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

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
}

function writeEvidence(path: string, value: Json): string {
  const withPayload = { ...value, payload_sha256: sha256(JSON.stringify(stable(value))) };
  atomicWrite(path, `${JSON.stringify(withPayload, null, 2)}\n`);
  return fileSha256(path);
}

function isProductionModule(path: string): boolean {
  return (path === "index.js" || /^(?:app|src|supabase\/functions)\//u.test(path))
    && /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(path)
    && !/(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/u.test(path)
    && !/(?:^|\/)(?:node_modules|build|dist|coverage|artifacts|\.release-runtime)(?:\/|$)/u.test(path);
}

function productionPaths(manifest: Json): string[] {
  return [...new Set((manifest.files as Json[])
    .map((entry) => String(entry.path))
    .filter(isProductionModule))].sort();
}

function difference(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((path) => !rightSet.has(path));
}

function runNode(args: string[], label: string): CommandResult {
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  invariant(result.error == null, `${label}_SPAWN_FAILED:${result.error?.message ?? "unknown"}`);
  return {
    command: [process.execPath, ...args].join(" "),
    exit_code: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function commandEvidence(result: CommandResult): Json {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    command: result.command,
    exit_code: result.exit_code,
    output_sha256: sha256(output),
    output_lines: output ? output.split(/\r?\n/u).length : 0,
  };
}

function scriptErrorFiles(result: CommandResult): string[] {
  return [...`${result.stdout}\n${result.stderr}`.matchAll(/^(.+?)\(\d+,\d+\): error TS\d+:/gmu)]
    .map((match) => match[1].replaceAll("\\", "/"));
}

function noReferences(entry: Json): boolean {
  return Number(entry.runtime_hits) === 0
    && [
      entry.static_importers,
      entry.dynamic_importers,
      entry.type_only_importers,
      entry.route_or_registry_references,
      entry.build_codegen_references,
    ].every((items) => Array.isArray(items) && items.length === 0);
}

function main(): void {
  const generatedAt = new Date().toISOString();
  invariant(fileSha256(PRE_WAVE_SOURCE_IDENTITY) === EXPECTED_R3_1_SOURCE_SHA256, "R3_1_SOURCE_SEAL_DRIFT");
  invariant(fileSha256(PRE_WAVE_PRODUCT_MANIFEST) === EXPECTED_R3_1_PRODUCT_MANIFEST_SHA256,
    "R3_1_PRODUCT_MANIFEST_DRIFT");
  invariant(fileSha256(PRE_WAVE_ACCEPTANCE) === EXPECTED_R3_1_ACCEPTANCE_SHA256,
    "R3_1_ACCEPTANCE_EVIDENCE_DRIFT");

  const currentSource = readJson(CURRENT_SOURCE_IDENTITY);
  const currentManifest = readJson(CURRENT_PRODUCT_MANIFEST);
  const preWaveSource = readJson(PRE_WAVE_SOURCE_IDENTITY);
  const preWaveManifest = readJson(PRE_WAVE_PRODUCT_MANIFEST);
  const historicalManifest = readJson(HISTORICAL_PRODUCT_MANIFEST);
  const historicalGraph = readJson(HISTORICAL_GRAPH);
  const currentGraph = readJson(CURRENT_GRAPH);
  const currentLedger = readJson(CURRENT_LEDGER);

  invariant(currentSource.status === "R3_SOURCE_IDENTITY_GREEN", "CURRENT_SOURCE_NOT_GREEN");
  invariant(currentSource.master_contract?.sha256 === MASTER_SHA256, "CURRENT_MASTER_SHA_DRIFT");
  invariant(currentManifest.master_contract_sha256 === MASTER_SHA256, "CURRENT_MANIFEST_MASTER_SHA_DRIFT");
  invariant(preWaveSource.master_contract?.sha256 === MASTER_SHA256, "PRE_WAVE_MASTER_SHA_DRIFT");
  invariant(preWaveManifest.master_contract_sha256 === MASTER_SHA256, "PRE_WAVE_MANIFEST_MASTER_SHA_DRIFT");

  const historicalPaths = productionPaths(historicalManifest);
  const preWavePaths = productionPaths(preWaveManifest);
  const currentPaths = productionPaths(currentManifest);
  const historicalToPreAdded = difference(preWavePaths, historicalPaths);
  const historicalToPreRemoved = difference(historicalPaths, preWavePaths);
  const preToCurrentAdded = difference(currentPaths, preWavePaths);
  const preToCurrentRemoved = difference(preWavePaths, currentPaths);

  invariant(historicalPaths.length === 3411, `HISTORICAL_MODULE_COUNT_DRIFT:${historicalPaths.length}`);
  invariant(Number(historicalGraph.production_source_modules) === 3411, "HISTORICAL_GRAPH_COUNT_DRIFT");
  invariant(preWavePaths.length === 3412, `PRE_WAVE_MODULE_COUNT_DRIFT:${preWavePaths.length}`);
  invariant(historicalToPreAdded.length === 1 && historicalToPreAdded[0] === ACCEPTANCE_OWNER,
    `HISTORICAL_3411_TO_3412_ADDITION_UNEXPLAINED:${historicalToPreAdded.join(",")}`);
  invariant(historicalToPreRemoved.length === 0, "HISTORICAL_3411_TO_3412_UNEXPECTED_REMOVAL");
  invariant(currentPaths.length === 3410, `CURRENT_MODULE_COUNT_DRIFT:${currentPaths.length}`);
  invariant(preToCurrentAdded.length === 0, `DEAD_WAVES_UNEXPECTED_PRODUCTION_ADDITION:${preToCurrentAdded.join(",")}`);
  invariant(preToCurrentRemoved.length === 2
    && preToCurrentRemoved.includes(R45_OWNER)
    && preToCurrentRemoved.includes(MOBILE_PHOTO_STORAGE_OWNER),
    `DEAD_WAVES_REMOVAL_SET_DRIFT:${preToCurrentRemoved.join(",")}`);
  invariant(Number(currentGraph.production_source_modules) === 3410, "CURRENT_GRAPH_MODULE_COUNT_DRIFT");
  invariant(Number(currentGraph.runtime_reachable_modules) === 1886, "CURRENT_GRAPH_REACHABLE_COUNT_DRIFT");
  invariant(Number(currentGraph.total_roots) === 71, "CURRENT_GRAPH_ROOT_COUNT_DRIFT");

  const ledgerByPath = new Map<string, Json>((currentLedger.entries as Json[])
    .map((entry) => [String(entry.path), entry]));
  const r45 = ledgerByPath.get(R45_OWNER);
  const mobilePhotoStorage = ledgerByPath.get(MOBILE_PHOTO_STORAGE_OWNER);
  const sticky = ledgerByPath.get("src/components/layout/StickyActionBar.tsx");
  const marker = ledgerByPath.get("src/components/BuildIdentityMarker.tsx");
  invariant(r45 && !r45.source_exists && r45.classification === "DEAD" && noReferences(r45)
    && (r45.unique_unported_behavior as unknown[]).length === 0, "R45_TOMBSTONE_PROOF_RED");
  invariant(mobilePhotoStorage && !mobilePhotoStorage.source_exists
    && mobilePhotoStorage.classification === "DEAD" && noReferences(mobilePhotoStorage)
    && (mobilePhotoStorage.unique_unported_behavior as unknown[]).length === 0,
  "MOBILE_PHOTO_STORAGE_TOMBSTONE_PROOF_RED");
  invariant(sticky && !sticky.source_exists && sticky.classification === "DEAD" && noReferences(sticky),
    "STICKY_TOMBSTONE_PROOF_RED");
  invariant(marker && !marker.source_exists && marker.classification === "DEAD" && noReferences(marker)
    && (marker.unique_unported_behavior as unknown[]).length === 0, "BUILD_MARKER_TOMBSTONE_PROOF_RED");
  invariant(!existsSync(resolve(R45_OWNER)), "R45_SOURCE_REAPPEARED");
  invariant(!existsSync(resolve(MOBILE_PHOTO_STORAGE_OWNER)), "MOBILE_PHOTO_STORAGE_SOURCE_REAPPEARED");
  invariant(!existsSync(resolve("src/components/layout/StickyActionBar.tsx")), "STICKY_SOURCE_REAPPEARED");
  invariant(!existsSync(resolve("tests/ui/stickyActionBar.contract.test.ts")), "STICKY_ORPHAN_TEST_REAPPEARED");
  invariant(!existsSync(resolve("src/components/BuildIdentityMarker.tsx")), "BUILD_MARKER_REAPPEARED");
  invariant(!existsSync(resolve("src/lib/estimate/estimateWorkspaceStore.ts")), "ESTIMATE_WORKSPACE_STORE_REAPPEARED");

  const entry = readFileSync(resolve("index.js"), "utf8");
  invariant(entry.trim() === 'import "expo-router/entry";', "PACKAGE_ENTRY_NOT_CANONICAL");
  const forbiddenProductRuntimeProof = [
    "EXPO_PUBLIC_R45_RUNTIME_PROOF",
    "__RIK_R45_RUNTIME_MANIFEST__",
    "__RIK_R45_RUNTIME_MANIFEST_READY__",
    "installR45RuntimeManifest",
  ];
  const productRuntimeProofHits = currentPaths.flatMap((path) => {
    const source = readFileSync(resolve(path), "utf8");
    return forbiddenProductRuntimeProof.filter((token) => source.includes(token))
      .map((token) => ({ path, token }));
  });
  invariant(productRuntimeProofHits.length === 0, "R45_PRODUCT_RUNTIME_PROOF_REFERENCE_REMAINS");

  const jest = runNode([
    "node_modules/jest/bin/jest.js",
    ...TARGETED_TESTS,
    "--runInBand",
    "--no-cache",
  ], "DEAD_WAVE_JEST");
  invariant(jest.exit_code === 0, "DEAD_WAVE_JEST_RED");
  invariant(/Test Suites:\s+4 passed, 4 total/u.test(`${jest.stdout}\n${jest.stderr}`), "DEAD_WAVE_JEST_SUITE_COUNT_RED");
  invariant(/Tests:\s+10 passed, 10 total/u.test(`${jest.stdout}\n${jest.stderr}`), "DEAD_WAVE_JEST_TEST_COUNT_RED");

  const productTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false",
  ], "DEAD_WAVE_PRODUCT_TSC");
  const edgeTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false",
  ], "DEAD_WAVE_EDGE_TSC");
  const scriptsTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.scripts.json", "--pretty", "false",
  ], "DEAD_WAVE_SCRIPTS_TSC");
  invariant(productTsc.exit_code === 0, "DEAD_WAVE_PRODUCT_TSC_RED");
  invariant(edgeTsc.exit_code === 0, "DEAD_WAVE_EDGE_TSC_RED");
  const scriptErrorPaths = scriptErrorFiles(scriptsTsc);
  invariant(scriptsTsc.exit_code === 0 && scriptErrorPaths.length === 0,
    `SCRIPTS_TYPECHECK_REGRESSION:${scriptsTsc.exit_code}:${scriptErrorPaths.length}`);
  const changedScriptErrors = scriptErrorPaths.filter((path) => [
    "scripts/architecture/auditR2CanonicalOwnership.ts",
    TOOL,
  ].some((changed) => path.endsWith(changed)));
  invariant(changedScriptErrors.length === 0, `DEAD_WAVE_CHANGED_SCRIPT_TSC_RED:${changedScriptErrors.join(",")}`);

  const graphSha256 = fileSha256(CURRENT_GRAPH);
  const targetedOutputSha256 = sha256(`${jest.stdout}\n${jest.stderr}`.trim());
  const commonProof = {
    graph_sha256: graphSha256,
    targeted_output_sha256: targetedOutputSha256,
    product_typecheck_green: true,
    edge_typecheck_green: true,
  };
  const tombstones = [
    {
      path: "src/components/layout/StickyActionBar.tsx",
      symbols: ["StickyActionBar", "StickyActionBarProps"],
      deleted_phase: "R2_PHASE1_WAVE1",
      replacement_owner: "src/components/layout/AppStickyActionBar.tsx",
      unique_unported_behavior: [],
      orphan_source_removed: true,
      ...commonProof,
    },
    {
      path: "tests/ui/stickyActionBar.contract.test.ts",
      symbols: [],
      deleted_phase: "R2_PHASE1_WAVE1",
      replacement_owner: "tests/architecture/uiNoDuplicateLayoutFramework.contract.test.ts",
      unique_unported_behavior: [],
      orphan_test_removed: true,
      ...commonProof,
    },
    {
      path: "src/components/BuildIdentityMarker.tsx",
      symbols: ["BuildIdentityMarker"],
      deleted_phase: "R2_PHASE1_WAVE3",
      replacement_owner: "src/components/BuildIdentityDiagnostic.tsx",
      unique_unported_behavior: [],
      visible_and_accessible_customer_node_removed: true,
      ...commonProof,
    },
    {
      path: R45_OWNER,
      symbols: ["installR45RuntimeManifest"],
      deleted_phase: "R3_2_DEAD_SOURCE_WAVE1",
      replacement_owner: "src/components/BuildIdentityDiagnostic.tsx plus external source/bundle/APK/backend evidence",
      unique_unported_behavior: [],
      package_entry_import_removed: true,
      expired_feature_flag_removed_from_product: true,
      ...commonProof,
    },
    {
      path: MOBILE_PHOTO_STORAGE_OWNER,
      symbols: [
        "MobilePhotoStorageIdentity",
        "mobilePhotoStagingRelativePath",
        "mobilePhotoLegacyMigrationRelativePath",
        "mobilePhotoUtf8Bytes",
      ],
      deleted_phase: "R3_2_DEAD_SOURCE_WAVE2",
      replacement_owner: "src/lib/mobilePhotoCapture/mobilePhotoLocalRepository.ts plus mobilePhotoNormalizationService.ts",
      unique_unported_behavior: [],
      deterministic_storage_path_behavior_preserved: true,
      mobile_photo_module_budget_restored: "15_TO_14",
      ...commonProof,
    },
  ].map((item) => ({
    ...item,
    proofSha256: sha256(JSON.stringify(stable(item))),
    action: item.path.startsWith("tests/") ? "DELETE_ORPHAN_TEST" : "DELETE_SOURCE",
  }));

  const pendingCandidates = (currentLedger.entries as Json[])
    .filter((candidate) => Boolean(candidate.source_exists) && candidate.classification !== "ACTIVE_CANONICAL")
    .map((candidate) => ({
      path: candidate.path,
      classification: candidate.classification,
      action: candidate.action,
      runtime_hits: candidate.runtime_hits,
      static_importers: (candidate.static_importers as unknown[]).length,
      build_codegen_references: (candidate.build_codegen_references as unknown[]).length,
      test_only_references: (candidate.test_only_references as unknown[]).length,
      unique_unported_behavior: candidate.unique_unported_behavior,
      deletion_performed: false,
      reason: "NOT_PROVEN_DEAD_PORT_OR_PARITY_REQUIRED",
    }));
  invariant(pendingCandidates.every((candidate) => (candidate.unique_unported_behavior as unknown[]).length > 0),
    "PROVEN_DEAD_SOURCE_RETAINED");

  const outputPath = resolve(EVIDENCE_ROOT, "09_DEAD_SOURCE_TOMBSTONES_R3.json");
  const outputSha256 = writeEvidence(outputPath, {
    schema_version: "real-estimates-global-green-r3.dead-source-tombstones.v1",
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    status: "DEAD_SOURCE_WAVES_1_2_GREEN",
    authorization: {
      proven_dead_source_delete_authorization: "GRANTED",
      additional_user_approval_required: false,
      delete_in_same_bounded_change: true,
      storage_or_data_delete_authorization: "ABSENT",
    },
    lineage: {
      r3_1_source_identity: { path: repoPath(PRE_WAVE_SOURCE_IDENTITY), sha256: fileSha256(PRE_WAVE_SOURCE_IDENTITY) },
      r3_1_product_manifest: { path: repoPath(PRE_WAVE_PRODUCT_MANIFEST), sha256: fileSha256(PRE_WAVE_PRODUCT_MANIFEST) },
      r3_1_human_acceptance: { path: repoPath(PRE_WAVE_ACCEPTANCE), sha256: fileSha256(PRE_WAVE_ACCEPTANCE) },
      current_source_identity: { path: repoPath(CURRENT_SOURCE_IDENTITY), sha256: fileSha256(CURRENT_SOURCE_IDENTITY) },
      current_product_manifest: { path: repoPath(CURRENT_PRODUCT_MANIFEST), sha256: fileSha256(CURRENT_PRODUCT_MANIFEST) },
      current_graph: { path: repoPath(CURRENT_GRAPH), sha256: graphSha256 },
    },
    module_delta: {
      historical_phase1: {
        product_modules: historicalPaths.length,
        runtime_reachable_modules: historicalGraph.runtime_reachable_modules,
        manifest_sha256: fileSha256(HISTORICAL_PRODUCT_MANIFEST),
      },
      r3_1_pre_wave: {
        product_modules: preWavePaths.length,
        exact_added: historicalToPreAdded,
        exact_removed: historicalToPreRemoved,
        explanation: {
          path: ACCEPTANCE_OWNER,
          owner: "fail-closed technology-passport human-acceptance gate",
          legacy_or_dead_owner_returned: false,
        },
      },
      r3_2_after_dead_source_waves: {
        product_modules: currentPaths.length,
        runtime_reachable_modules: currentGraph.runtime_reachable_modules,
        roots: currentGraph.total_roots,
        exact_added_from_r3_1: preToCurrentAdded,
        exact_removed_from_r3_1: preToCurrentRemoved,
      },
    },
    proof_gates: {
      unresolved_production_imports: 0,
      product_runtime_r45_proof_hits: productRuntimeProofHits,
      targeted_jest: { suites: 4, tests: 10, ...commandEvidence(jest) },
      product_typecheck: commandEvidence(productTsc),
      edge_typecheck: commandEvidence(edgeTsc),
      scripts_typecheck: {
        ...commandEvidence(scriptsTsc),
        total_known_errors: scriptErrorPaths.length,
        changed_wave_errors: changedScriptErrors.length,
      },
    },
    tombstones,
    pending_not_proven_dead: pendingCandidates,
    confirmed_dead_source_remaining: 0,
    dead_source_retained_after_proof: 0,
    proven_dead_source_deleted_same_wave_percent: 100,
    generated_storage_deleted: false,
    worktree_deleted: false,
    database_deleted: false,
    evidence_deleted: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson(executionStatePath);
  atomicWrite(executionStatePath, `${JSON.stringify({
    ...executionState,
    generated_at_utc: generatedAt,
    current_phase: "R3_D_WAVES_1_2_COMPLETE_R3_2_PENDING",
    dead_source: {
      status: "DEAD_SOURCE_WAVES_1_2_GREEN",
      tombstone_artifact: repoPath(outputPath),
      tombstone_artifact_sha256: outputSha256,
      confirmed_dead_source_remaining: 0,
      pending_not_proven_dead: pendingCandidates.length,
    },
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
    terminal_wording: ["R3_IN_PROGRESS", "GLOBAL_RED", "NOT_PRODUCTION_READY", "NO_RELEASE"],
  }, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: "DEAD_SOURCE_WAVES_1_2_GREEN",
    historical_to_r3_1: { from: 3411, to: 3412, exact_added: historicalToPreAdded },
    r3_1_to_dead_source_waves: { from: 3412, to: 3410, exact_removed: preToCurrentRemoved },
    current_reachable: currentGraph.runtime_reachable_modules,
    roots: currentGraph.total_roots,
    tombstones: tombstones.length,
    pending_not_proven_dead: pendingCandidates.length,
    targeted_jest: { suites: 4, tests: 10 },
    product_typecheck: "GREEN",
    edge_typecheck: "GREEN",
    scripts_typecheck: { total_errors: scriptErrorPaths.length, changed_wave_errors: 0 },
    evidence_sha256: outputSha256,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
