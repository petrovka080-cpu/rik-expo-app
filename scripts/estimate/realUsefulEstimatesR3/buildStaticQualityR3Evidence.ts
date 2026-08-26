import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
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
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json");
const PERFORMANCE_TEST = resolve("tests/perf/performance-budget.test.ts");
const NO_WEAKENING_TEST = resolve("scripts/release/noTestWeakeningPolicy.test.ts");
const NO_WEAKENING_AUDIT = resolve("scripts/release/auditCurrentCoreNoTestWeakening.ts");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildStaticQualityR3Evidence.ts");

const CANONICAL_CONSUMER_OWNER_FILES = [
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/features/consumerRepair/consumerCanonicalParameterEditor.ts",
  "src/features/consumerRepair/consumerEstimateActionRouter.ts",
  "src/features/consumerRepair/consumerRepairBackendOwnership.ts",
  "src/features/consumerRepair/consumerRepairCanonicalSessionPreview.ts",
  "src/features/consumerRepair/consumerRepairDraftAnswer.ts",
  "src/features/consumerRepair/consumerRepairQuantityEditTrace.ts",
  "src/lib/consumerRequests/consumerCanonicalBackendRevisionProjection.ts",
  "src/lib/consumerRequests/consumerRequestEstimateApplicationService.ts",
  "src/lib/consumerRequests/consumerRequestExactRoadworksCalculationStateMigration.ts",
] as const;

const CONSUMER_BOUNDARIES = {
  boq_catalog_view: [
    "src/features/consumerRepair/requestEstimateViewModel.ts",
    "src/features/consumerRepair/RequestEstimateSummaryCard.tsx",
    "src/features/consumerRepair/RequestEstimateItemsEditor.tsx",
  ],
  state_payload: [
    "src/lib/consumerRequests/consumerRequestDraftStateMachine.ts",
    "src/lib/consumerRequests/consumerRequestPayloadParity.ts",
  ],
  feature_state_machine: [
    "src/features/consumerRepair/requestEstimateDraftTypes.ts",
    "src/features/consumerRepair/requestEstimateStateMachine.ts",
    "src/features/consumerRepair/requestEstimateDraftReducer.ts",
    "src/features/consumerRepair/buildRequestEstimatePayload.ts",
    "src/features/consumerRepair/validateRequestEstimateDraft.ts",
    "src/features/consumerRepair/requestEstimateScreenActions.ts",
  ],
  editable_workspace: [
    "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
    "src/lib/consumerRequests/consumerRequestEditableEstimateSnapshot.ts",
  ],
  request_screen_owner_split: [
    "src/features/consumerRepair/ConsumerRepairRequestScreenView.tsx",
    "src/features/consumerRepair/ConsumerRepairRequestScreenContainer.tsx",
    "src/features/consumerRepair/useConsumerRepairPhotoCaptureController.tsx",
  ],
  governance_persistence: [
    "src/lib/consumerRequests/approvedHistoryScaleMatrix.ts",
    "src/lib/consumerRequests/consumerRequestAccessPolicy.ts",
    "src/lib/consumerRequests/consumerRequestAuditTrail.ts",
    "src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts",
    "src/lib/consumerRequests/consumerRequestLedgerBridge.ts",
    "src/lib/consumerRequests/consumerRequestLegacyEstimateGuard.ts",
    "src/lib/consumerRequests/consumerRequestPdfStorage.ts",
    "src/lib/consumerRequests/consumerRequestRepository.ts",
    "src/lib/consumerRequests/replayApprovedEstimateHistory.ts",
  ],
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
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
  const payload = { ...value, payload_sha256: sha256(JSON.stringify(stable(value))) };
  atomicWrite(path, `${JSON.stringify(payload, null, 2)}\n`);
  return hashFile(path);
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

function commandProof(result: CommandResult): Json {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  return {
    command: result.command,
    exit_code: result.exit_code,
    output_sha256: sha256(output),
    output_lines: output ? output.split(/\r?\n/u).length : 0,
  };
}

function countFilesRecursive(dir: string, pattern: RegExp): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) count += countFilesRecursive(path, pattern);
    else if (pattern.test(entry.name)) count += 1;
  }
  return count;
}

function existingCount(paths: readonly string[]): number {
  return paths.filter((path) => existsSync(resolve(path))).length;
}

function parseJest(result: CommandResult, suites: number, tests: number, label: string): Json {
  invariant(result.exit_code === 0, `${label}_RED:${result.stderr}`);
  const parsed = JSON.parse(result.stdout) as Json;
  invariant(parsed.success === true, `${label}_SUCCESS_FALSE`);
  invariant(parsed.numPassedTestSuites === suites && parsed.numPassedTests === tests,
    `${label}_COUNT_DRIFT:${parsed.numPassedTestSuites}/${parsed.numPassedTests}`);
  invariant(parsed.numFailedTestSuites === 0 && parsed.numFailedTests === 0, `${label}_FAILURES_PRESENT`);
  return parsed;
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const productManifest = readJson(PRODUCT_MANIFEST);
  invariant(sourceIdentity.status === "R3_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_NOT_GREEN");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(productManifest.master_contract_sha256 === MASTER_SHA256, "PRODUCT_MANIFEST_MASTER_SHA_DRIFT");
  const manifestByPath = new Map<string, Json>((productManifest.files as Json[])
    .map((entry) => [String(entry.path), entry]));
  for (const path of [PERFORMANCE_TEST, NO_WEAKENING_TEST, NO_WEAKENING_AUDIT, TOOL]) {
    const entry = manifestByPath.get(repoPath(path));
    invariant(entry != null, `SEALED_FILE_MISSING:${repoPath(path)}`);
    invariant(entry.sha256 === hashFile(path), `SEALED_FILE_DRIFT:${repoPath(path)}`);
  }

  const performance = runNode([
    "node_modules/jest/bin/jest.js",
    "--runInBand",
    "--no-cache",
    "--runTestsByPath",
    repoPath(PERFORMANCE_TEST),
    "--json",
  ], "PERFORMANCE_JEST");
  parseJest(performance, 1, 14, "PERFORMANCE_JEST");

  const noWeakeningPolicy = runNode([
    "node_modules/jest/bin/jest.js",
    "--runInBand",
    "--no-cache",
    "--runTestsByPath",
    repoPath(NO_WEAKENING_TEST),
    "--json",
  ], "NO_WEAKENING_POLICY_JEST");
  parseJest(noWeakeningPolicy, 1, 8, "NO_WEAKENING_POLICY_JEST");

  const noWeakeningAudit = runNode([
    "node_modules/tsx/dist/cli.mjs",
    repoPath(NO_WEAKENING_AUDIT),
  ], "NO_WEAKENING_AUDIT");
  invariant(noWeakeningAudit.exit_code === 0, `NO_WEAKENING_AUDIT_RED:${noWeakeningAudit.stderr}`);
  const audit = JSON.parse(noWeakeningAudit.stdout) as Json;
  invariant(audit.final_status === "GREEN_CURRENT_CORE_NO_TEST_WEAKENING_AUDIT", "AUDIT_STATUS_RED");
  invariant(audit.changed_test_files_count === 93, `AUDIT_CHANGED_TEST_COUNT_DRIFT:${audit.changed_test_files_count}`);
  invariant((audit.audit_entries as Json[]).length === 367, `AUDIT_ENTRY_COUNT_DRIFT:${audit.audit_entries?.length}`);
  invariant((audit.blockers as Json[]).length === 0, "AUDIT_BLOCKERS_PRESENT");
  invariant((audit.forbidden_focus_changes as Json[]).length === 0, "AUDIT_FOCUS_WEAKENING_PRESENT");
  invariant((audit.timeout_or_memory_weakening_changes as Json[]).length === 0,
    "AUDIT_TIMEOUT_OR_MEMORY_WEAKENING_PRESENT");
  invariant((audit.guarded_fixtures_modified as Json[]).length === 0, "AUDIT_GUARDED_FIXTURE_DRIFT");
  invariant(audit.fake_green_claimed === false, "AUDIT_FAKE_GREEN");
  const auditSummaryPath = resolve(
    `.release-runtime/current-core-no-test-weakening/${String(audit.subject_sha)}/summary.json`,
  );
  const persistedAudit = readJson(auditSummaryPath);
  invariant(persistedAudit.final_status === audit.final_status, "AUDIT_SUMMARY_STATUS_DRIFT");
  invariant((persistedAudit.audit_entries as Json[]).length === (audit.audit_entries as Json[]).length,
    "AUDIT_SUMMARY_ENTRY_COUNT_DRIFT");
  invariant((persistedAudit.blockers as Json[]).length === 0, "AUDIT_SUMMARY_BLOCKERS_PRESENT");

  const scriptsTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.scripts.json", "--pretty", "false",
  ], "SCRIPTS_TYPECHECK");
  const productTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false",
  ], "PRODUCT_TYPECHECK");
  const edgeTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false",
  ], "EDGE_TYPECHECK");
  invariant(scriptsTsc.exit_code === 0, `SCRIPTS_TYPECHECK_RED:${scriptsTsc.stdout}${scriptsTsc.stderr}`);
  invariant(productTsc.exit_code === 0, `PRODUCT_TYPECHECK_RED:${productTsc.stdout}${productTsc.stderr}`);
  invariant(edgeTsc.exit_code === 0, `EDGE_TYPECHECK_RED:${edgeTsc.stdout}${edgeTsc.stderr}`);

  const consumerFiles =
    countFilesRecursive(resolve("src/features/consumerRepair"), /^(?!.*\.test\.tsx?$).*\.tsx?$/u) +
    countFilesRecursive(resolve("src/lib/consumerRequests"), /^(?!.*\.test\.ts$).*\.ts$/u);
  const boundaryCounts = Object.fromEntries(Object.entries(CONSUMER_BOUNDARIES)
    .map(([name, paths]) => [name, existingCount(paths)]));
  const canonicalOwnerCount = existingCount(CANONICAL_CONSUMER_OWNER_FILES);
  const currentAggregate = consumerFiles - canonicalOwnerCount -
    Object.values(boundaryCounts).reduce((sum, count) => sum + count, 0);
  invariant(consumerFiles === 59, `CONSUMER_FILE_COUNT_DRIFT:${consumerFiles}`);
  invariant(canonicalOwnerCount === 10, `CANONICAL_OWNER_COUNT_DRIFT:${canonicalOwnerCount}`);
  invariant(currentAggregate === 24, `PERFORMANCE_AGGREGATE_RED:${currentAggregate}`);
  const mobilePhotoFiles =
    countFilesRecursive(resolve("src/lib/mobilePhotoCapture"), /\.ts$/u) +
    countFilesRecursive(resolve("src/components/photoCapture"), /\.tsx?$/u);
  invariant(mobilePhotoFiles === 14, `MOBILE_PHOTO_BUDGET_RED:${mobilePhotoFiles}`);
  const revisionFiles = countFilesRecursive(resolve("src/lib/ai/estimateRevisions"), /\.ts$/u);
  invariant(revisionFiles === 14 && existsSync(resolve("src/lib/ai/estimateRevisions/index.ts")),
    `ESTIMATE_REVISION_BOUNDARY_RED:${revisionFiles}`);

  const sourceIdentitySha256 = hashFile(SOURCE_IDENTITY);
  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    parent_source_identity_sha256: sourceIdentitySha256,
    exact_product_source_sha256: sourceIdentity.hashes.product_source_sha256,
    tool: { path: repoPath(TOOL), sha256: hashFile(TOOL) },
  };

  const performancePath = resolve(EVIDENCE_ROOT, "70_PERFORMANCE_BUDGET_R3.json");
  const performanceSha = writeEvidence(performancePath, {
    schema_version: "real-estimates-global-green-r3.performance-budget.v1",
    ...common,
    status: "GREEN_R3_PERFORMANCE_BUDGET",
    historical_debt: { aggregate: 34, budget: 24, status: "RED" },
    current: {
      aggregate: currentAggregate,
      budget: 24,
      threshold_raised: false,
      consumer_production_files: consumerFiles,
      exact_named_boundary_files: { ...boundaryCounts, canonical_platform_owner: canonicalOwnerCount },
      mobile_photo_modules: { implementations: mobilePhotoFiles, budget: 14 },
      estimate_revision_modules: { implementations: revisionFiles - 1, barrel_files: 1, budget: 13 },
    },
    targeted_jest: { suites: 1, tests: 14, ...commandProof(performance) },
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const scriptsPath = resolve(EVIDENCE_ROOT, "71_SCRIPTS_TYPECHECK_R3.json");
  const scriptsSha = writeEvidence(scriptsPath, {
    schema_version: "real-estimates-global-green-r3.scripts-typecheck.v1",
    ...common,
    status: "GREEN_R3_SCRIPTS_TYPECHECK_ZERO_ERRORS",
    previous_known_debt_closed: 26,
    current_errors: 0,
    debt_hidden_or_weakened: false,
    proof: commandProof(scriptsTsc),
  });

  const noWeakeningPath = resolve(EVIDENCE_ROOT, "72_NO_TEST_WEAKENING_R3.json");
  const noWeakeningSha = writeEvidence(noWeakeningPath, {
    schema_version: "real-estimates-global-green-r3.no-test-weakening.v1",
    ...common,
    status: "GREEN_R3_NO_TEST_WEAKENING_ZERO_BLOCKERS",
    historical_blockers: 40,
    changed_test_files: audit.changed_test_files_count,
    audit_entries: (audit.audit_entries as Json[]).length,
    blockers: 0,
    forbidden_focus_changes: 0,
    timeout_or_memory_weakening_changes: 0,
    guarded_fixture_changes: 0,
    audit_summary: { path: repoPath(auditSummaryPath), sha256: hashFile(auditSummaryPath) },
    policy_jest: { suites: 1, tests: 8, ...commandProof(noWeakeningPolicy) },
    audit_command: commandProof(noWeakeningAudit),
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const productPath = resolve(EVIDENCE_ROOT, "73_PRODUCT_TYPECHECK_R3.json");
  const productSha = writeEvidence(productPath, {
    schema_version: "real-estimates-global-green-r3.product-and-edge-typecheck.v1",
    ...common,
    status: "GREEN_R3_PRODUCT_AND_EDGE_TYPECHECK",
    product: { config: "tsconfig.typecheck.product.json", errors: 0, ...commandProof(productTsc) },
    edge: { config: "tsconfig.edge.json", errors: 0, ...commandProof(edgeTsc) },
  });

  const indexPath = resolve(EVIDENCE_ROOT, "STATIC_QUALITY_R3.json");
  const indexSha = writeEvidence(indexPath, {
    schema_version: "real-estimates-global-green-r3.static-quality.v1",
    ...common,
    status: "STATIC_QUALITY_GREEN",
    artifacts: {
      performance: { path: repoPath(performancePath), sha256: performanceSha },
      scripts_typecheck: { path: repoPath(scriptsPath), sha256: scriptsSha },
      no_test_weakening: { path: repoPath(noWeakeningPath), sha256: noWeakeningSha },
      product_typecheck: { path: repoPath(productPath), sha256: productSha },
    },
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson(executionStatePath);
  atomicWrite(executionStatePath, `${JSON.stringify({
    ...executionState,
    generated_at_utc: generatedAt,
    static_quality: {
      status: "STATIC_QUALITY_GREEN",
      artifact: repoPath(indexPath),
      artifact_sha256: indexSha,
      performance_aggregate: "24_OF_24",
      scripts_errors: 0,
      no_test_weakening_blockers: 0,
    },
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
    terminal_wording: ["R3_IN_PROGRESS", "GLOBAL_RED", "NOT_PRODUCTION_READY", "NO_RELEASE"],
  }, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: "STATIC_QUALITY_GREEN",
    performance: { historical: 34, current: currentAggregate, budget: 24, suites: 1, tests: 14 },
    scripts_typecheck_errors: 0,
    product_typecheck_errors: 0,
    edge_typecheck_errors: 0,
    no_test_weakening: { historical_blockers: 40, current_blockers: 0, policy_tests: 8 },
    evidence_sha256: indexSha,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
