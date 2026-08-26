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
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_CURRENT_PRODUCT_SOURCE_MANIFEST_R3.json");
const SQL_BEHAVIOR = resolve(EVIDENCE_ROOT, "28_HUMAN_ACCEPTANCE_PROMOTION_SQL_BEHAVIOR_R3.json");
const SQL_BEHAVIOR_REPEAT = resolve(EVIDENCE_ROOT, "28_HUMAN_ACCEPTANCE_PROMOTION_SQL_BEHAVIOR_R3_REPEAT_A.json");
const RLS_BEHAVIOR = resolve(EVIDENCE_ROOT, "29_HUMAN_ACCEPTANCE_RLS_TENANT_R3.json");
const RLS_BEHAVIOR_REPEAT = resolve(EVIDENCE_ROOT, "29_HUMAN_ACCEPTANCE_RLS_TENANT_R3_REPEAT_A.json");
const R2_PLATFORM = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/TECHNOLOGY_PASSPORT_PLATFORM_R2.json");
const R2_SQL_PROOF = resolve(".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/SQL_BEHAVIOR_PROBE_R2.json");
const TOOL = resolve("scripts/estimate/realUsefulEstimatesR3/buildHumanAcceptancePlatformR3Evidence.ts");

const FILES = {
  acceptance_gate_r2: resolve("src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2.ts"),
  acceptance_test_r2: resolve("src/lib/estimate/backendPlatform/technologyPassportAcceptanceR2.test.ts"),
  sql_contract_test_r2: resolve("tests/estimateBackend/technologyPassportHumanAcceptanceR2.contract.test.ts"),
  sql_contract_test_r3: resolve("tests/estimateBackend/technologyPassportHumanAcceptanceR3.contract.test.ts"),
  migration_r2: resolve("supabase/migrations/20260821130000_r2_technology_passport_human_acceptance.sql"),
  migration_r3: resolve("supabase/migrations/20260821140000_r3_technology_passport_tenant_acceptance.sql"),
  behavior_sql_r3: resolve("scripts/estimate/realUsefulEstimatesR3/technologyPassportAcceptanceR3Behavior.sql"),
  verifier_r3: resolve("scripts/estimate/realUsefulEstimatesR3/verifyTechnologyPassportHumanAcceptanceR3Sql.ps1"),
} as const;

const R2_CHECKPOINT_HASHES: Record<string, string> = {
  acceptance_gate_r2: "76ad3d0c430e8f0d1011832049c94c0230640f55d920ab488cb0504412179398",
  acceptance_test_r2: "189e5ee226b0c2aed82caa521b45dcf876cb3580cde1f28e509d1ba1e2b1725d",
  sql_contract_test_r2: "a0edddab1022b12c534a20bbd71728b109dc005f5df7878e26edc673dde4e5c0",
  migration_r2: "c56c2a52e7f55acaed65460cf5d1257ea60c1441cbf306ce9d71522ac9a10482",
  r2_sql_behavior_evidence: "5261deac904df4e259c2eee10ffa973d2a4da8b3384bf3ea0a65e7bdc0de2bbf",
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path: string): string {
  return sha256(readFileSync(path));
}

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll("\\", "/");
}

function atomicWrite(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, body, "utf8");
  renameSync(temporary, path);
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

function writeEvidence(path: string, value: Json): string {
  const withPayload = { ...value, payload_sha256: sha256(JSON.stringify(stable(value))) };
  atomicWrite(path, `${JSON.stringify(withPayload, null, 2)}\n`);
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

function main(): void {
  const generatedAt = new Date().toISOString();
  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const productManifest = readJson(PRODUCT_MANIFEST);
  invariant(sourceIdentity.status === "R3_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_NOT_GREEN");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(productManifest.master_contract_sha256 === MASTER_SHA256, "PRODUCT_MANIFEST_MASTER_DRIFT");
  const manifestByPath = new Map<string, Json>(
    productManifest.files.map((entry: Json) => [entry.path as string, entry]),
  );
  for (const path of [...Object.values(FILES), TOOL]) {
    const entry = manifestByPath.get(repoPath(path));
    invariant(entry != null, `SEALED_FILE_MISSING:${repoPath(path)}`);
    invariant(entry.sha256 === hashFile(path), `SEALED_FILE_DRIFT:${repoPath(path)}`);
  }

  for (const [key, expected] of Object.entries(R2_CHECKPOINT_HASHES)) {
    if (key === "r2_sql_behavior_evidence") continue;
    invariant(hashFile(FILES[key as keyof typeof FILES]) === expected, `R2_CHECKPOINT_HASH_DRIFT:${key}`);
  }
  invariant(hashFile(R2_SQL_PROOF) === R2_CHECKPOINT_HASHES.r2_sql_behavior_evidence,
    "R2_SQL_BEHAVIOR_EVIDENCE_HASH_DRIFT");

  const r2Platform = readJson(R2_PLATFORM);
  const sqlBehavior = readJson(SQL_BEHAVIOR);
  const sqlBehaviorRepeat = readJson(SQL_BEHAVIOR_REPEAT);
  const rlsBehavior = readJson(RLS_BEHAVIOR);
  const rlsBehaviorRepeat = readJson(RLS_BEHAVIOR_REPEAT);
  const sourceIdentitySha256 = hashFile(SOURCE_IDENTITY);
  const productSourceSha256 = sourceIdentity.hashes.product_source_sha256 as string;
  for (const [name, evidence, expectedStatus] of [
    ["SQL_BEHAVIOR", sqlBehavior, "GREEN_R3_HUMAN_ACCEPTANCE_SQL_BEHAVIOR"],
    ["SQL_BEHAVIOR_REPEAT", sqlBehaviorRepeat, "GREEN_R3_HUMAN_ACCEPTANCE_SQL_BEHAVIOR"],
    ["RLS_BEHAVIOR", rlsBehavior, "GREEN_R3_HUMAN_ACCEPTANCE_RLS_TENANT"],
    ["RLS_BEHAVIOR_REPEAT", rlsBehaviorRepeat, "GREEN_R3_HUMAN_ACCEPTANCE_RLS_TENANT"],
  ] as const) {
    invariant(evidence.status === expectedStatus, `${name}_STATUS_RED`);
    invariant(evidence.parent_source_identity_sha256 === sourceIdentitySha256, `${name}_SOURCE_IDENTITY_DRIFT`);
    invariant(evidence.exact_product_source_sha256 === productSourceSha256, `${name}_PRODUCT_SOURCE_DRIFT`);
    invariant(evidence.temporary_probe_database?.removed === true, `${name}_PROBE_NOT_REMOVED`);
    invariant(evidence.source?.production_accessed === false, `${name}_PRODUCTION_ACCESSED`);
  }

  const testFiles = [
    repoPath(FILES.acceptance_test_r2),
    repoPath(FILES.sql_contract_test_r2),
    repoPath(FILES.sql_contract_test_r3),
  ];
  const jest = runNode([
    "node_modules/jest/bin/jest.js",
    "--runInBand",
    "--runTestsByPath",
    ...testFiles,
    "--json",
  ], "TARGETED_JEST");
  invariant(jest.exit_code === 0, `TARGETED_JEST_RED:${jest.stderr}`);
  const jestJson = JSON.parse(jest.stdout) as Json;
  invariant(jestJson.success === true, "TARGETED_JEST_SUCCESS_FALSE");
  invariant(jestJson.numPassedTestSuites === 3 && jestJson.numPassedTests === 18,
    `TARGETED_JEST_COUNT_DRIFT:${jestJson.numPassedTestSuites}/${jestJson.numPassedTests}`);
  const r2TestResults = (jestJson.testResults as Json[]).filter((result) =>
    /technologyPassportAcceptanceR2\.test\.ts|technologyPassportHumanAcceptanceR2\.contract\.test\.ts/u
      .test(result.name as string));
  invariant(r2TestResults.length === 2, "R2_CHECKPOINT_SUITE_COUNT_DRIFT");
  invariant(r2TestResults.reduce((sum, result) => sum + (result.assertionResults as Json[]).length, 0) === 12,
    "R2_CHECKPOINT_TEST_COUNT_DRIFT");

  const productTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false",
  ], "PRODUCT_TYPECHECK");
  invariant(productTsc.exit_code === 0, `PRODUCT_TYPECHECK_RED:${productTsc.stdout}${productTsc.stderr}`);
  const edgeTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false",
  ], "EDGE_TYPECHECK");
  invariant(edgeTsc.exit_code === 0, `EDGE_TYPECHECK_RED:${edgeTsc.stdout}${edgeTsc.stderr}`);
  const scriptsTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.scripts.json", "--pretty", "false",
  ], "SCRIPTS_TYPECHECK");
  const scriptsOutput = `${scriptsTsc.stdout}\n${scriptsTsc.stderr}`;
  const scriptErrors = scriptsOutput.split(/\r?\n/u).filter((line) => /error TS\d+:/u.test(line));
  const changedScriptErrors = scriptErrors.filter((line) =>
    /scripts[\\/](?:estimate[\\/]realUsefulEstimatesR3|architecture[\\/](?:auditR2CanonicalOwnership|buildR3Phase0Checkpoint))/u.test(line));
  invariant(scriptsTsc.exit_code === 0 && scriptErrors.length === 0,
    `SCRIPTS_TYPECHECK_REGRESSION:${scriptsTsc.exit_code}:${scriptErrors.length}`);
  invariant(changedScriptErrors.length === 0, `R3_CHANGED_SCRIPT_TYPE_ERRORS:${changedScriptErrors.join("|")}`);

  const migrationR3 = readFileSync(FILES.migration_r3, "utf8");
  for (const marker of [
    "estimate_technology_passport_acceptance_r3",
    "estimate_technology_engineer_authorization_r3",
    "force row level security",
    "ESTIMATE_TECHNOLOGY_R3_AUTHOR_REVIEWER_COLLISION",
    "ESTIMATE_TECHNOLOGY_R3_REVIEWER_NOT_AUTHORIZED",
    "ESTIMATE_TECHNOLOGY_R3_STALE_SUPERSEDES",
    "SERVICE_ROLE_PRODUCT_PATH_FORBIDDEN",
    "p_tenant_id uuid",
    "new.organization_id",
    "v_revision.organization_id",
    "select false;",
  ]) invariant(migrationR3.includes(marker), `R3_SQL_MARKER_MISSING:${marker}`);

  invariant(r2Platform.current_content_truth?.technology_passports_present === 71, "KNOWN_DRAFT_COUNT_NOT_71");
  invariant(r2Platform.current_content_truth?.engineer_accepted_total === 0, "FALSE_ENGINEER_ACCEPTANCE_PRESENT");
  invariant(r2Platform.current_content_truth?.target_content_denominator === 3367, "R2_TARGET_DENOMINATOR_NOT_3367");

  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    parent_source_identity_sha256: sourceIdentitySha256,
    exact_product_source_sha256: productSourceSha256,
    tool: { path: repoPath(TOOL), sha256: hashFile(TOOL) },
  };
  const inputFiles = Object.fromEntries(Object.entries(FILES).map(([key, path]) => [key, {
    path: repoPath(path),
    sha256: hashFile(path),
  }]));

  const testResultPath = resolve(EVIDENCE_ROOT, "R3_1_TARGETED_TEST_RESULT.json");
  writeEvidence(testResultPath, {
    schema_version: "real-estimates-global-green-r3.human-acceptance-targeted-tests.v1",
    ...common,
    status: "GREEN_R3_TARGETED_ACCEPTANCE_3_SUITES_18_TESTS",
    predecessor_checkpoint: { suites: 2, tests: 12, exact_hashes: R2_CHECKPOINT_HASHES, status: "GREEN" },
    current: { suites: 3, tests: 18, passed: true, test_files: testFiles },
    command: jest.command,
  });

  const schemaProofPath = resolve(EVIDENCE_ROOT, "22_HUMAN_ACCEPTANCE_SCHEMA_PROOF_R3.json");
  const schemaProofSha = writeEvidence(schemaProofPath, {
    schema_version: "real-estimates-global-green-r3.human-acceptance-schema-proof.v1",
    ...common,
    status: "GREEN_R3_HUMAN_ACCEPTANCE_SCHEMA",
    input_files: inputFiles,
    r2_checkpoint: { suites: 2, tests: 12, exact_hashes: R2_CHECKPOINT_HASHES, preserved: true },
    r3_extension: {
      targeted_suites: 3,
      targeted_tests: 18,
      tenant_scoped_candidate_table: true,
      append_only_authorization_events: true,
      append_only_acceptance_events: true,
      authenticated_engineer_rpc: true,
      service_role_product_path: "LOGGED_AND_BLOCKED",
      forced_rls: true,
      compile_rollback: true,
      repeat_disposable_clone: true,
    },
    sql_proofs: [SQL_BEHAVIOR, SQL_BEHAVIOR_REPEAT, RLS_BEHAVIOR, RLS_BEHAVIOR_REPEAT].map((path) => ({
      path: repoPath(path), sha256: hashFile(path),
    })),
  });

  const acceptanceIndexPath = resolve(EVIDENCE_ROOT, "23_HUMAN_ACCEPTANCE_INDEX_R3.json");
  const acceptanceIndexSha = writeEvidence(acceptanceIndexPath, {
    schema_version: "real-estimates-global-green-r3.human-acceptance-index.v1",
    ...common,
    status: "GREEN_R3_ACCEPTANCE_INDEX_TRUTHFUL_ZERO_ACCEPTED_CONTENT_RED",
    platform_behavior_acceptance_rows_are_disposable_test_data: true,
    production_or_authoritative_acceptance_manifests: 0,
    agent_generated_acceptance_manifests: 0,
    known_draft_passports: 71,
    batch001: { drafts: 16, engineer_accepted: 0 },
    batch002: { drafts: 55, engineer_accepted: 0 },
    records: [],
    content_green_claimed: false,
  });

  const admissionBindingPath = resolve(EVIDENCE_ROOT, "24_ADMISSION_HASH_BINDING_R3.json");
  const admissionBindingSha = writeEvidence(admissionBindingPath, {
    schema_version: "real-estimates-global-green-r3.admission-hash-binding.v1",
    ...common,
    status: "GREEN_R3_ADMISSION_EXACT_HASH_AND_TENANT_BINDING",
    required_binding: [
      "tenant_id","definition_version_id","release_id","catalog_id","technology_variant_id",
      "definition_sha256","passport_content_sha256","source_set_sha256","author_id","reviewer_id",
      "reviewer_scope","latest_decision_sequence","active_reviewer_authorization",
    ],
    unscoped_overload: "ALWAYS_FALSE",
    runtime_boundaries: ["compile_job.organization_id","revision.organization_id","artifact_revision.organization_id"],
    behavior_evidence: { path: repoPath(SQL_BEHAVIOR), sha256: hashFile(SQL_BEHAVIOR) },
    rls_evidence: { path: repoPath(RLS_BEHAVIOR), sha256: hashFile(RLS_BEHAVIOR) },
  });

  const coveragePath = resolve(EVIDENCE_ROOT, "25_DRAFT_VS_ACCEPTED_COVERAGE_R3.json");
  const coverageSha = writeEvidence(coveragePath, {
    schema_version: "real-estimates-global-green-r3.draft-vs-accepted-coverage.v1",
    ...common,
    status: "RED_R3_CONTENT_ENGINEER_ACCEPTANCE_0_OF_71_KNOWN_DRAFTS",
    authoritative_content_denominator_phase: "R3_2_PENDING_CURRENT_R2_TARGET_3367_NOT_RELABELED",
    known_passport_drafts: 71,
    structurally_validated_drafts: 71,
    engineer_accepted: 0,
    production_runtime_coverage: 0,
    missing_against_current_r2_target: 3296,
    fake_or_generated_acceptance: 0,
    content_green_claimed: false,
  });

  const productTypecheckPath = resolve(EVIDENCE_ROOT, "73_PRODUCT_TYPECHECK_R3.json");
  const productTypecheckSha = writeEvidence(productTypecheckPath, {
    schema_version: "real-estimates-global-green-r3.product-and-edge-typecheck.v1",
    ...common,
    status: "GREEN_R3_PRODUCT_AND_EDGE_TYPECHECK",
    product: { config: "tsconfig.typecheck.product.json", exit_code: productTsc.exit_code, errors: 0 },
    edge: { config: "tsconfig.edge.json", exit_code: edgeTsc.exit_code, errors: 0 },
  });

  const scriptsTypecheckPath = resolve(EVIDENCE_ROOT, "71_SCRIPTS_TYPECHECK_R3.json");
  const scriptsTypecheckSha = writeEvidence(scriptsTypecheckPath, {
    schema_version: "real-estimates-global-green-r3.scripts-typecheck.v1",
    ...common,
    status: "GREEN_R3_SCRIPTS_TYPECHECK_ZERO_ERRORS",
    total_errors: scriptErrors.length,
    expected_errors: 0,
    previous_known_debt_closed: 26,
    changed_r3_file_errors: changedScriptErrors.length,
    debt_hidden_or_weakened: false,
  });

  const platformPath = resolve(EVIDENCE_ROOT, "HUMAN_ACCEPTANCE_PLATFORM_R3.json");
  const platformSha = writeEvidence(platformPath, {
    schema_version: "real-estimates-global-green-r3.human-acceptance-platform.v1",
    ...common,
    status: "HUMAN_ACCEPTANCE_PLATFORM_GREEN",
    artifacts: {
      schema_proof: { path: repoPath(schemaProofPath), sha256: schemaProofSha },
      acceptance_index: { path: repoPath(acceptanceIndexPath), sha256: acceptanceIndexSha },
      admission_binding: { path: repoPath(admissionBindingPath), sha256: admissionBindingSha },
      draft_vs_accepted: { path: repoPath(coveragePath), sha256: coverageSha },
      product_typecheck: { path: repoPath(productTypecheckPath), sha256: productTypecheckSha },
      scripts_typecheck: { path: repoPath(scriptsTypecheckPath), sha256: scriptsTypecheckSha },
      targeted_tests: { path: repoPath(testResultPath), sha256: hashFile(testResultPath) },
    },
    platform_green: true,
    content_green: false,
    engineer_accepted: 0,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  });

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson(executionStatePath);
  atomicWrite(executionStatePath, `${JSON.stringify({
    ...executionState,
    generated_at_utc: generatedAt,
    current_phase: "R3_1_COMPLETE_R3_2_PENDING",
    source_identity: {
      path: repoPath(SOURCE_IDENTITY),
      sha256: sourceIdentitySha256,
      status: sourceIdentity.status,
    },
    architecture: "R3_ARCHITECTURE_REVALIDATED",
    human_acceptance_platform: "HUMAN_ACCEPTANCE_PLATFORM_GREEN",
    human_acceptance_platform_sha256: platformSha,
    engineer_accepted: "0_OF_71_KNOWN_DRAFTS",
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
    terminal_wording: ["R3_IN_PROGRESS","GLOBAL_RED","NOT_PRODUCTION_READY","NO_RELEASE"],
  }, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: "HUMAN_ACCEPTANCE_PLATFORM_GREEN",
    source_identity_sha256: sourceIdentitySha256,
    product_source_sha256: productSourceSha256,
    targeted_jest: { suites: 3, tests: 18 },
    r2_checkpoint: { suites: 2, tests: 12, exact_hashes_preserved: true },
    product_typecheck: "GREEN",
    edge_typecheck: "GREEN",
    scripts_typecheck: { total_errors: 0, previous_known_debt_closed: 26, changed_r3_errors: 0 },
    sql_disposable_clones: 2,
    engineer_accepted: 0,
    platform_evidence_sha256: platformSha,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
