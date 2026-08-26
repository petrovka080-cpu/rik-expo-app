import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

type Json = Record<string, any>;
type CommandResult = { command: string; exit_code: number; stdout: string; stderr: string };

const ROOT = resolve(".");
const MASTER_SHA256 = "f617befe4fc22e6c9e4dbaa6ca276bd271b8f021a3cd8825610196471aef3820";
const EVIDENCE_ROOT = resolve(".release-runtime/real-estimates-global-green-r3/evidence");
const SOURCE_IDENTITY = resolve(EVIDENCE_ROOT, "01_CURRENT_SOURCE_IDENTITY_R3.json");
const PRODUCT_MANIFEST = resolve(EVIDENCE_ROOT, "02_PRODUCT_SOURCE_MANIFEST_R3.json");
const HUMAN_ACCEPTANCE = resolve(EVIDENCE_ROOT, "HUMAN_ACCEPTANCE_PLATFORM_R3.json");
const DENOMINATOR = resolve(EVIDENCE_ROOT, "05_CONTENT_AUTHORING_DENOMINATOR_R3.json");
const DRAFT_INVENTORY = resolve(
  ".release-runtime/real-useful-estimates-r2/evidence/phase4-platform/BATCH001_002_DRAFT_PASSPORT_INVENTORY_R2.jsonl",
);
const BATCH001_ROOT = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch001",
);
const BATCH002_ROOT = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch002",
);
const BATCH001_CHECKPOINT = resolve(BATCH001_ROOT, "BATCH001_REMEDIATION_CHECKPOINT_R1.json");
const BATCH002_CHECKPOINT = resolve(BATCH002_ROOT, "BATCH002_REMEDIATION_CHECKPOINT_R1.json");
const BATCH001_DRAFTS = resolve(BATCH001_ROOT, "BATCH001_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl");
const BATCH002_DRAFTS = resolve(BATCH002_ROOT, "BATCH002_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl");
const TOOL = "scripts/estimate/realUsefulEstimatesR3/buildBatch001002ShadowRevalidationR32.ts";

const EXPECTED = {
  draft_inventory: "df4519de4d07c87efd32a4600f4b017cd3b8199a53e34302b285d69a6c6772b7",
  batch001_checkpoint: "50361b42c2f86177be1f8f38bb06c4242bdbc47e4a56a56b09a4d51badc76770",
  batch001_drafts: "f0066d5262e1bb3def908b5bb804371533cb965837582f9a36ba39a92f839d69",
  batch002_checkpoint: "1367c8e826468e76bc12500816a3f5c87502ebdd0cef97a162cb42f501d88690",
  batch002_drafts: "085a8e84fd255741e08808a5e0e8e6fa55535c3a1e9d0e59bfc0c9fe206ecf53",
  batch001_backend_parity: "0b4a1f150a14547590ac8802ea90b63bf4a5f04b74a1a32cc0ac7d24b155466a",
  batch002_backend_parity: "ffa883f706f95d40af1f7482baccd372e203e98fa7bc45e419f49d5eb03360d4",
} as const;

const TESTS = [
  "src/lib/estimate/backendPlatform/technologyPassportR1.test.ts",
  "tests/aiEstimateV4/batch001RealUsefulTechnologyPassportR1.contract.test.ts",
  "tests/aiEstimateV4/batch001R3ContentSuccessor.contract.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts",
  "tests/aiEstimateV4/batch001R56Reconciliation.contract.test.ts",
  "tests/aiEstimateV4/batch002RealUsefulGapAuditR1.contract.test.ts",
  "tests/aiEstimateV4/batch002RealUsefulTechnologyPassportR1.contract.test.ts",
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

function readJson(path: string): Json {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  invariant(existsSync(path), `INPUT_MISSING:${repoPath(path)}`);
  return readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean)
    .map((line) => JSON.parse(line) as Json);
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

function scriptErrorPaths(result: CommandResult): string[] {
  return [...`${result.stdout}\n${result.stderr}`.matchAll(/^(.+?)\(\d+,\d+\): error TS\d+:/gmu)]
    .map((match) => match[1].replaceAll("\\", "/"));
}

function verifyCheckpointSources(checkpoint: Json, sources: Json[], batch: string): Json[] {
  return sources.map((source) => {
    const path = resolve(String(source.path));
    const currentSha256 = fileSha256(path);
    invariant(currentSha256 === source.sha256, `${batch}_CHECKPOINT_SOURCE_DRIFT:${repoPath(path)}`);
    return { path: repoPath(path), sha256: currentSha256, exact_checkpoint_match: true };
  });
}

function main(): void {
  const generatedAt = new Date().toISOString();
  invariant(fileSha256(DRAFT_INVENTORY) === EXPECTED.draft_inventory, "DRAFT_INVENTORY_DRIFT");
  invariant(fileSha256(BATCH001_CHECKPOINT) === EXPECTED.batch001_checkpoint, "BATCH001_CHECKPOINT_DRIFT");
  invariant(fileSha256(BATCH001_DRAFTS) === EXPECTED.batch001_drafts, "BATCH001_DRAFTS_DRIFT");
  invariant(fileSha256(BATCH002_CHECKPOINT) === EXPECTED.batch002_checkpoint, "BATCH002_CHECKPOINT_DRIFT");
  invariant(fileSha256(BATCH002_DRAFTS) === EXPECTED.batch002_drafts, "BATCH002_DRAFTS_DRIFT");

  const sourceIdentity = readJson(SOURCE_IDENTITY);
  const productManifest = readJson(PRODUCT_MANIFEST);
  const humanAcceptance = readJson(HUMAN_ACCEPTANCE);
  const denominator = readJson(DENOMINATOR);
  invariant(sourceIdentity.status === "R3_SOURCE_IDENTITY_GREEN", "SOURCE_IDENTITY_NOT_GREEN");
  invariant(sourceIdentity.master_contract?.sha256 === MASTER_SHA256, "MASTER_SHA_DRIFT");
  invariant(productManifest.master_contract_sha256 === MASTER_SHA256, "PRODUCT_MANIFEST_MASTER_DRIFT");
  const sourceIdentitySha256 = fileSha256(SOURCE_IDENTITY);
  const productSourceSha256 = String(productManifest.aggregates?.product_source?.sha256);
  invariant(humanAcceptance.parent_source_identity_sha256 === sourceIdentitySha256,
    "HUMAN_ACCEPTANCE_SOURCE_BINDING_STALE");
  invariant(humanAcceptance.exact_product_source_sha256 === productSourceSha256,
    "HUMAN_ACCEPTANCE_PRODUCT_BINDING_STALE");
  invariant(humanAcceptance.status === "HUMAN_ACCEPTANCE_PLATFORM_GREEN" && humanAcceptance.engineer_accepted === 0,
    "HUMAN_ACCEPTANCE_PLATFORM_OR_COUNT_RED");
  invariant(denominator.parent_source_identity_sha256 === sourceIdentitySha256,
    "DENOMINATOR_SOURCE_BINDING_STALE");
  invariant(denominator.status === "AUTHORITATIVE_DENOMINATOR_GREEN"
    && denominator.content_authoring_denominator === 3367, "DENOMINATOR_NOT_GREEN_3367");

  const batch001Checkpoint = readJson(BATCH001_CHECKPOINT);
  const batch002Checkpoint = readJson(BATCH002_CHECKPOINT);
  const batch001Sources = verifyCheckpointSources(
    batch001Checkpoint,
    batch001Checkpoint.source_files as Json[],
    "BATCH001",
  );
  const batch002Sources = verifyCheckpointSources(
    batch002Checkpoint,
    batch002Checkpoint.evidence.sourceFiles as Json[],
    "BATCH002",
  );

  const inventory = readJsonl(DRAFT_INVENTORY);
  const inventoryBatch001 = inventory.filter((row) => String(row.batch).includes("001"));
  const inventoryBatch002 = inventory.filter((row) => String(row.batch).includes("002"));
  invariant(inventory.length === 71 && inventoryBatch001.length === 16 && inventoryBatch002.length === 55,
    `DRAFT_INVENTORY_DENOMINATOR_RED:${inventory.length}/${inventoryBatch001.length}/${inventoryBatch002.length}`);
  invariant(inventory.every((row) => row.passport_status === "DRAFT"
    && row.human_acceptance_manifest_present === false), "DRAFT_INVENTORY_FALSE_ACCEPTANCE");

  const batch001Rows = readJsonl(BATCH001_DRAFTS);
  const batch002Rows = readJsonl(BATCH002_DRAFTS);
  const batch001Passports = batch001Rows.map((row) => row.passport as Json);
  invariant(batch001Rows.length === 16, "BATCH001_DRAFT_COUNT_RED");
  invariant(new Set(batch001Passports.map((passport) => passport.catalogId)).size === 16,
    "BATCH001_CATALOG_ID_DUPLICATE");
  invariant(new Set(batch001Passports.map((passport) => passport.technologyVariantId)).size === 16,
    "BATCH001_VARIANT_ID_DUPLICATE");
  invariant(batch001Rows.every((row) => /^[a-f0-9]{64}$/u.test(String(row.technology_passport_sha256))),
    "BATCH001_PASSPORT_HASH_RED");
  invariant(batch001Passports.every((passport) => Array.isArray(passport.equipmentRules)
    && passport.equipmentRules.length > 0), "BATCH001_EQUIPMENT_RULES_MISSING");

  invariant(batch002Rows.length === 55, "BATCH002_DRAFT_COUNT_RED");
  invariant(new Set(batch002Rows.map((passport) => passport.catalogId)).size === 55,
    "BATCH002_CATALOG_ID_DUPLICATE");
  invariant(new Set(batch002Rows.map((passport) => passport.technologyVariantId)).size === 55,
    "BATCH002_VARIANT_ID_DUPLICATE");
  invariant(batch002Rows.every((passport) => Array.isArray(passport.equipmentRules)
    && passport.equipmentRules.length > 0), "BATCH002_EQUIPMENT_RULES_MISSING");
  const batch002EquipmentRules = batch002Rows.reduce(
    (total, passport) => total + (passport.equipmentRules as unknown[]).length,
    0,
  );
  invariant(batch002EquipmentRules === 110, `BATCH002_EQUIPMENT_RULE_COUNT_RED:${batch002EquipmentRules}`);

  const jest = runNode([
    "node_modules/jest/bin/jest.js",
    ...TESTS,
    "--runInBand",
    "--no-cache",
  ], "BATCH001002_SHADOW_JEST");
  const jestOutput = `${jest.stdout}\n${jest.stderr}`;
  invariant(jest.exit_code === 0, "BATCH001002_SHADOW_JEST_RED");
  invariant(/Test Suites:\s+7 passed, 7 total/u.test(jestOutput), "BATCH001002_JEST_SUITE_COUNT_RED");
  invariant(/Tests:\s+49 passed, 49 total/u.test(jestOutput), "BATCH001002_JEST_TEST_COUNT_RED");

  const productTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.product.json", "--pretty", "false",
  ], "BATCH001002_PRODUCT_TSC");
  const edgeTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.edge.json", "--pretty", "false",
  ], "BATCH001002_EDGE_TSC");
  const scriptsTsc = runNode([
    "node_modules/typescript/bin/tsc", "--noEmit", "-p", "tsconfig.typecheck.scripts.json", "--pretty", "false",
  ], "BATCH001002_SCRIPTS_TSC");
  invariant(productTsc.exit_code === 0, "BATCH001002_PRODUCT_TSC_RED");
  invariant(edgeTsc.exit_code === 0, "BATCH001002_EDGE_TSC_RED");
  const scriptErrors = scriptErrorPaths(scriptsTsc);
  invariant(scriptsTsc.exit_code === 0 && scriptErrors.length === 0,
    `SCRIPTS_TYPECHECK_REGRESSION:${scriptsTsc.exit_code}:${scriptErrors.length}`);
  invariant(!scriptErrors.some((path) => path.endsWith(TOOL)), "BATCH001002_BUILDER_TSC_RED");

  const common = {
    generated_at_utc: generatedAt,
    master_contract_sha256: MASTER_SHA256,
    parent_source_identity_sha256: sourceIdentitySha256,
    exact_product_source_sha256: productSourceSha256,
    human_acceptance_platform_sha256: fileSha256(HUMAN_ACCEPTANCE),
    denominator_sha256: fileSha256(DENOMINATOR),
    content_authoring_denominator: 3367,
    targeted_jest: { suites: 7, tests: 49, ...commandEvidence(jest) },
    typechecks: {
      product: commandEvidence(productTsc),
      edge: commandEvidence(edgeTsc),
      scripts: { ...commandEvidence(scriptsTsc), errors: 0, previous_known_debt_closed: 26, changed_builder_errors: 0 },
    },
    production_mutated_by_revalidation: false,
    release_performed: false,
    deploy_performed: false,
    engineer_acceptance_fabricated: false,
    content_green_claimed: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  };

  const batch001Output = resolve(EVIDENCE_ROOT, "26_BATCH001_SHADOW_REVALIDATION_R3.json");
  const batch001Sha256 = writeEvidence(batch001Output, {
    schema_version: "real-estimates-global-green-r3.batch001-shadow-revalidation.v1",
    ...common,
    status: "BATCH001_SHADOW_REVALIDATED_CONTENT_RED_HUMAN_ACCEPTANCE_0_OF_16",
    checkpoint: { path: repoPath(BATCH001_CHECKPOINT), sha256: fileSha256(BATCH001_CHECKPOINT) },
    drafts: { path: repoPath(BATCH001_DRAFTS), sha256: fileSha256(BATCH001_DRAFTS), total: 16, unique: 16 },
    checkpoint_source_files: batch001Sources,
    shadow_compiler_contract: "16_OF_16_TARGETED_GREEN",
    exact_equipment_rules_present: "16_OF_16",
    engineer_accepted: 0,
    production_runtime_promoted: 0,
    next_gate: "REAL_INDEPENDENT_ENGINEER_REVIEW_AND_SIGNED_MANIFESTS_16_OF_16",
    historical_backend_parity: {
      path: ".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001/BATCH001_BACKEND_REVISION_PARITY_R3.json",
      sha256: EXPECTED.batch001_backend_parity,
      status: "HISTORICAL_ONLY_NOT_CURRENT_PROMOTION",
    },
  });

  const batch002Output = resolve(EVIDENCE_ROOT, "27_BATCH002_SHADOW_REVALIDATION_R3.json");
  const batch002Sha256 = writeEvidence(batch002Output, {
    schema_version: "real-estimates-global-green-r3.batch002-shadow-revalidation.v1",
    ...common,
    status: "BATCH002_SHADOW_REVALIDATED_CONTENT_RED_HUMAN_ACCEPTANCE_0_OF_55",
    checkpoint: { path: repoPath(BATCH002_CHECKPOINT), sha256: fileSha256(BATCH002_CHECKPOINT) },
    drafts: { path: repoPath(BATCH002_DRAFTS), sha256: fileSha256(BATCH002_DRAFTS), total: 55, unique: 55 },
    checkpoint_source_files: batch002Sources,
    shadow_compiler_contract: "55_OF_55_TARGETED_GREEN",
    expected_equipment_rule_coverage: "55_OF_55",
    exact_equipment_rules: batch002EquipmentRules,
    engineer_accepted: 0,
    production_runtime_equipment_promoted: 0,
    next_gate: "REAL_INDEPENDENT_ENGINEER_REVIEW_AND_SIGNED_MANIFESTS_55_OF_55",
    historical_backend_parity: {
      path: ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002/BATCH002_BACKEND_REVISION_PARITY_R4.json",
      sha256: EXPECTED.batch002_backend_parity,
      status: "HISTORICAL_ONLY_NOT_CURRENT_PROMOTION",
    },
  });

  const executionStatePath = resolve(EVIDENCE_ROOT, "00_EXECUTION_STATE_R3.json");
  const executionState = readJson(executionStatePath);
  atomicWrite(executionStatePath, `${JSON.stringify({
    ...executionState,
    generated_at_utc: generatedAt,
    current_phase: "R3_2_COMPLETE_BATCH001002_SHADOW_REVALIDATED_HUMAN_REVIEW_REQUIRED",
    batch001: {
      shadow_revalidation: "GREEN_16_OF_16",
      engineer_accepted: "0_OF_16",
      artifact_sha256: batch001Sha256,
    },
    batch002: {
      shadow_revalidation: "GREEN_55_OF_55",
      expected_equipment: "GREEN_55_OF_55",
      engineer_accepted: "0_OF_55",
      runtime_equipment_promoted: "0_OF_55",
      artifact_sha256: batch002Sha256,
    },
    global: "GLOBAL_RED",
    production_ready: false,
    release_performed: false,
    terminal_wording: ["R3_IN_PROGRESS", "GLOBAL_RED", "NOT_PRODUCTION_READY", "NO_RELEASE"],
  }, null, 2)}\n`);

  process.stdout.write(`${JSON.stringify({
    status: "BATCH001002_SHADOW_REVALIDATED_CONTENT_RED",
    source_identity_sha256: sourceIdentitySha256,
    batch001: { drafts: "16/16", shadow: "16/16", engineer_accepted: "0/16", artifact_sha256: batch001Sha256 },
    batch002: { drafts: "55/55", equipment: "55/55", shadow: "55/55", engineer_accepted: "0/55", artifact_sha256: batch002Sha256 },
    targeted_jest: { suites: 7, tests: 49 },
    product_typecheck: "GREEN",
    edge_typecheck: "GREEN",
    scripts_typecheck: { total_errors: 0, previous_known_debt_closed: 26, changed_builder_errors: 0 },
    production_mutated: false,
    global_status: "GLOBAL_RED_NOT_PRODUCTION_READY_NO_RELEASE",
  }, null, 2)}\n`);
}

main();
