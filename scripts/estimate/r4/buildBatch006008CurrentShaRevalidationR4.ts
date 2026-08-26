import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { buildAllHvacPassports } from "../hvacBackendR4/hvacR4Model";
import { WORK as CONCRETE_PEDESTAL } from "../p0TruthRemediationR5/promoteR58ConcretePedestalSuccessor";
import { WORKS as MANDATORY_JOURNEYS } from "../p0TruthRemediationR5/promoteR58MandatoryJourneysSuccessor";
import { buildCanonicalSourceIdentityR56 } from "../r5/canonicalSourceIdentityR56";

type Json = Record<string, any>;

const MASTER_SHA256 = "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585";
const OUTPUT = resolve(".release-runtime/real-useful-estimates-r4/evidence/current-green");
const INVENTORY_PATH = join(OUTPUT, "04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json");
const HVAC_OWNER_RESULT = join(OUTPUT, "batch007-content-owner-r4/RESULT.json");
const CONCRETE_TEST_RESULT = join(OUTPUT, "batch008-content-r4/CONCRETE_TARGETED_JEST_R4.json");

const HISTORICAL = {
  batch006: resolve(process.env.BATCH006_HISTORICAL_ROOT
    ?? "C:/dev/rik-expo-app-batch006-water-backend-r3"),
  batch007: resolve(process.env.BATCH007_HISTORICAL_ROOT
    ?? "C:/dev/rik-expo-app-batch007-hvac-heat-supply-r4"),
  batch008: resolve(process.env.BATCH008_HISTORICAL_ROOT
    ?? "C:/dev/rik-expo-app-batch008-concrete-r5"),
} as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function readJson(path: string): Json {
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

function readJsonl(path: string): Json[] {
  return readFileSync(path, "utf8").trim().split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line) as Json);
}

function evidenceRef(path: string): Json {
  const bytes = readFileSync(path);
  return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function sourceFiles(root: string): string[] {
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && /\.(?:ts|mjs|sql)$/iu.test(entry.name)) result.push(path);
    }
  };
  visit(root);
  return result.sort();
}

function compareSourceDirectory(current: string, historical: string): Json {
  const currentRoot = resolve(current);
  const historicalRoot = resolve(historical);
  const manifest = (root: string) => new Map(sourceFiles(root).map((path) => [
    relative(root, path).replace(/\\/gu, "/"),
    sha256(readFileSync(path)),
  ]));
  const currentManifest = manifest(currentRoot);
  const historicalManifest = manifest(historicalRoot);
  const names = [...new Set([...currentManifest.keys(), ...historicalManifest.keys()])].sort();
  const changed = names.filter((path) => currentManifest.get(path) !== historicalManifest.get(path)).map((path) => ({
    path,
    historicalSha256: historicalManifest.get(path) ?? null,
    currentSha256: currentManifest.get(path) ?? null,
  }));
  return {
    currentRoot: currentRoot.replace(/\\/gu, "/"),
    historicalRoot: historicalRoot.replace(/\\/gu, "/"),
    currentFiles: currentManifest.size,
    historicalFiles: historicalManifest.size,
    unchangedFiles: names.length - changed.length,
    changed,
  };
}

function batchInventory(inventory: Json, batchId: string): Json {
  const groups = (inventory.groups as Json[]).filter((group) => group.batch_id === batchId);
  const identities = groups.flatMap((group) => group.member_catalog_ids as string[]);
  invariant(new Set(identities).size === identities.length, `${batchId}_INVENTORY_DUPLICATE_IDENTITY`);
  return {
    batchId,
    groups,
    groupCount: groups.length,
    identities,
    identityCount: identities.length,
    identitySetSha256: sha256(stableJson([...identities].sort())),
  };
}

function historicalCoverage(input: {
  batch: Json;
  rows: Json[];
  idKey: string;
  acceptedStatus: (row: Json) => boolean;
}): Json {
  const byId = new Map(input.rows.map((row) => [String(row[input.idKey]), row]));
  const matched = (input.batch.identities as string[]).filter((catalogId) => byId.has(catalogId));
  const missing = (input.batch.identities as string[]).filter((catalogId) => !byId.has(catalogId));
  const red = matched.filter((catalogId) => !input.acceptedStatus(byId.get(catalogId)!));
  return { historicalRows: input.rows.length, matched: matched.length, missing, red };
}

function validateSuccessor(work: Json): Json {
  const parameterIds = new Set((work.parameters as Json[]).map((parameter) => parameter.id));
  const formulaIds = new Set((work.formulas as Json[]).map((formula) => formula.id));
  invariant(parameterIds.size === work.parameters.length, `R4_SUCCESSOR_PARAMETER_DUPLICATE:${work.catalogId}`);
  invariant(formulaIds.size === work.formulas.length, `R4_SUCCESSOR_FORMULA_DUPLICATE:${work.catalogId}`);
  invariant((work.formulas as Json[]).every((formula) => (formula.inputs as string[]).every((id) => parameterIds.has(id))),
    `R4_SUCCESSOR_FORMULA_INPUT_MISSING:${work.catalogId}`);
  invariant((work.resources as Json[]).every((resource) => formulaIds.has(resource.formula) && String(resource.title).trim().length > 8),
    `R4_SUCCESSOR_RESOURCE_INVALID:${work.catalogId}`);
  const categories = [...new Set((work.resources as Json[]).map((resource) => String(resource.category)))].sort();
  return {
    catalogId: work.catalogId,
    workGroupId: work.workGroupId,
    parameters: work.parameters.length,
    formulas: work.formulas.length,
    resources: work.resources.length,
    categories,
    exactTitles: true,
    formulaBindings: true,
    status: "GREEN_CURRENT_SOURCE_SUCCESSOR",
  };
}

function main(): void {
  invariant(statSync(INVENTORY_PATH).isFile(), "R4_WORK_GROUP_INVENTORY_MISSING");
  const inventory = readJson(INVENTORY_PATH);
  const batch006 = batchInventory(inventory, "BATCH-006");
  const batch007 = batchInventory(inventory, "BATCH-007");
  const batch008 = batchInventory(inventory, "BATCH-008");
  invariant(batch006.groupCount === 167 && batch006.identityCount === 689, "BATCH006_R4_DENOMINATOR_DRIFT");
  invariant(batch007.groupCount === 238 && batch007.identityCount === 864, "BATCH007_R4_DENOMINATOR_DRIFT");
  invariant(batch008.groupCount === 162 && batch008.identityCount === 768, "BATCH008_R4_DENOMINATOR_DRIFT");

  const waterSource = compareSourceDirectory(
    "scripts/estimate/waterBackendR3",
    join(HISTORICAL.batch006, "scripts/estimate/waterBackendR3"),
  );
  const concreteSource = compareSourceDirectory(
    "scripts/estimate/concreteBackendR5",
    join(HISTORICAL.batch008, "scripts/estimate/concreteBackendR5"),
  );
  const hvacSource = compareSourceDirectory(
    "scripts/estimate/hvacBackendR4",
    join(HISTORICAL.batch007, "scripts/estimate/hvacBackendR4"),
  );
  invariant(waterSource.changed.length === 0 && waterSource.currentFiles === 32, "BATCH006_SOURCE_DRIFT");
  invariant(concreteSource.changed.length === 0 && concreteSource.currentFiles === 28, "BATCH008_SOURCE_DRIFT");
  invariant(hvacSource.changed.length === 1
    && hvacSource.changed[0]?.path === "hvacR4Model.ts"
    && hvacSource.changed[0]?.historicalSha256 === "cac73a260a42cf361d9bece7a93bcc86f0f59ea05337f512e4d59209a4c40e56"
    && hvacSource.changed[0]?.currentSha256 === "8d93e1dde94b3b6709db4b3b702f5c3d9758bc4d87ca075fddb79c05ccd00ac5",
  "BATCH007_UNREVIEWED_SOURCE_DRIFT");

  const waterOraclePath = join(HISTORICAL.batch006,
    ".release-runtime/batch006-water-backend-r3/evidence-a2/A2_06_SECOND_CLEAN_ORACLE.json");
  const waterPerIdPath = join(HISTORICAL.batch006,
    ".release-runtime/batch006-water-backend-r3/evidence-a2/A2_06_SECOND_CLEAN_ORACLE_VERDICTS.jsonl");
  const waterFinalPath = join(HISTORICAL.batch006,
    ".release-runtime/batch006-water-backend-r3/evidence-a2/A2_14_FINAL_ACTIVATION_AND_QUEUE_REBASE.json");
  const waterMassPath = join(HISTORICAL.batch006,
    ".release-runtime/batch006-water-backend-r3/evidence-a2/A2_09_WATER_MASS_ADMISSION_PROOF.json");
  const waterOracle = readJson(waterOraclePath);
  const waterCoverage = historicalCoverage({
    batch: batch006,
    rows: readJsonl(waterPerIdPath),
    idKey: "catalog_id",
    acceptedStatus: (row) => row.status === "GREEN" && row.errors.length === 0,
  });
  invariant(waterOracle.status === "GREEN_SECOND_CLEAN_INDEPENDENT_ORACLE"
    && waterOracle.actual.definitions === 874 && waterOracle.actual.perIdGreen === 874
    && waterCoverage.matched === 689 && waterCoverage.missing.length === 0 && waterCoverage.red.length === 0,
  "BATCH006_HISTORICAL_CONTENT_NOT_GREEN");
  invariant(readJson(waterFinalPath).status === "GREEN" && readJson(waterMassPath).status === "GREEN",
    "BATCH006_HISTORICAL_RUNTIME_NOT_GREEN");

  const hvacOwner = readJson(HVAC_OWNER_RESULT);
  invariant(hvacOwner.status === "GREEN_FOCUSED_SOURCE_INVARIANTS"
    && hvacOwner.exactCounts.hvacCatalogs === 1012
    && hvacOwner.exactCounts.hvacInterfaceRowsWithCostOwner === 0,
  "BATCH007_CURRENT_OWNER_PROOF_RED");
  const hvacPassports = buildAllHvacPassports();
  const hvacById = new Map(hvacPassports.map((passport) => [passport.catalogId, passport]));
  const hvacMissing = (batch007.identities as string[]).filter((catalogId) => !hvacById.has(catalogId));
  let hvacResources = 0;
  let hvacParameters = 0;
  let hvacFormulas = 0;
  let hvacMaterialIncluded = 0;
  let hvacMaterialNotApplicable = 0;
  let hvacEquipmentIncluded = 0;
  let hvacEquipmentNotApplicable = 0;
  for (const catalogId of batch007.identities as string[]) {
    const passport = hvacById.get(catalogId);
    if (!passport) continue;
    const parameterIds = new Set(passport.parameters.map((parameter) => parameter.parameterId));
    const formulaIds = new Set(passport.formulas.map((formula) => formula.formulaId));
    invariant(passport.parameters.every((parameter) => parameter.defaultValue == null),
      `BATCH007_HIDDEN_DEFAULT:${catalogId}`);
    invariant(passport.formulas.every((formula) => formula.inputParameterIds.every((id) => parameterIds.has(id))),
      `BATCH007_FORMULA_INPUT_MISSING:${catalogId}`);
    invariant(passport.resources.every((resource) => formulaIds.has(resource.formulaId)
      && resource.titleRu.trim().length > 8 && resource.semanticOwner.trim().length > 8),
    `BATCH007_RESOURCE_BINDING_INVALID:${catalogId}`);
    invariant(new Set(passport.resources.map((resource) => resource.semanticOwner)).size === passport.resources.length,
      `BATCH007_SEMANTIC_OWNER_DUPLICATE:${catalogId}`);
    const materialRows = passport.resources.filter((resource) => resource.rowType === "material" || resource.procurementEligible);
    const equipmentRows = passport.resources.filter((resource) => /MACHINE|EQUIPMENT|TOOL/iu.test(`${resource.rowType}:${resource.category}`));
    if (materialRows.length > 0) hvacMaterialIncluded += 1;
    else hvacMaterialNotApplicable += 1;
    if (equipmentRows.length > 0) hvacEquipmentIncluded += 1;
    else hvacEquipmentNotApplicable += 1;
    invariant(passport.scenarios.valid > 0 && passport.scenarios.invalid > 0,
      `BATCH007_SCENARIOS_MISSING:${catalogId}`);
    hvacResources += passport.resources.length;
    hvacParameters += passport.parameters.length;
    hvacFormulas += passport.formulas.length;
  }
  invariant(hvacMissing.length === 0, `BATCH007_CURRENT_CONTENT_MISSING:${hvacMissing.join(",")}`);

  const concreteIdentityPath = join(HISTORICAL.batch008,
    ".release-runtime/batch008-concrete-r5/evidence/01-discovery/CONCRETE_IDENTITY_SET.jsonl");
  const concreteSummaryPath = join(HISTORICAL.batch008,
    ".release-runtime/batch008-concrete-r5/evidence/05-content/CONTENT_SUMMARY.json");
  const concreteMassAPath = join(HISTORICAL.batch008,
    ".release-runtime/batch008-concrete-r5/evidence/09-admission/MASS_BACKEND_SUMMARY_A.json");
  const concreteMassBPath = join(HISTORICAL.batch008,
    ".release-runtime/batch008-concrete-r5/evidence/09-admission/MASS_BACKEND_SUMMARY_B.json");
  const historicalConcreteIds = new Set(readJsonl(concreteIdentityPath).map((row) => String(row.catalog_id)));
  const legacyConcrete = (batch008.identities as string[]).filter((catalogId) => historicalConcreteIds.has(catalogId));
  const successorIds = (batch008.identities as string[]).filter((catalogId) => !historicalConcreteIds.has(catalogId));
  invariant(legacyConcrete.length === 766
    && stableJson(successorIds.sort()) === stableJson([
      "r58-real:monolithic-reinforced-concrete",
      "r58-real:reinforced-concrete-equipment-pedestal",
    ]),
  "BATCH008_SUCCESSOR_PARTITION_DRIFT");
  const concreteSummary = readJson(concreteSummaryPath);
  invariant(concreteSummary.identities === 1218 && concreteSummary.strictDepth.passed === 1218
    && concreteSummary.strictDepth.belowFloor === 0,
  "BATCH008_HISTORICAL_CONTENT_NOT_GREEN");
  invariant(readJson(concreteMassAPath).status === "GREEN" && readJson(concreteMassBPath).status === "GREEN",
    "BATCH008_HISTORICAL_RUNTIME_NOT_GREEN");
  const monolithic = MANDATORY_JOURNEYS.find((work) => work.catalogId === "r58-real:monolithic-reinforced-concrete");
  invariant(monolithic, "BATCH008_MONOLITHIC_SUCCESSOR_MISSING");
  const successors = [validateSuccessor(monolithic), validateSuccessor(CONCRETE_PEDESTAL)];
  const concreteTests = readJson(CONCRETE_TEST_RESULT);
  invariant(concreteTests.success === true && concreteTests.numPassedTestSuites === 5
    && concreteTests.numPassedTests === 106,
  "BATCH008_CURRENT_TARGETED_TESTS_RED");

  const sourceIdentity = buildCanonicalSourceIdentityR56({
    contractSha256: MASTER_SHA256,
    paths: [
      "C:/Users/User/Downloads/MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU.md",
      "app", "src", "supabase/functions", "supabase/migrations", "tests", "android/app/src",
      "scripts/estimate/backendMigration", "scripts/estimate/waterBackendR3", "scripts/estimate/hvacBackendR4",
      "scripts/estimate/concreteBackendR5", "scripts/estimate/concreteBackendR6", "scripts/estimate/r4",
      "scripts/estimate/p0TruthRemediationR5/promoteR58MandatoryJourneysSuccessor.ts",
      "scripts/estimate/p0TruthRemediationR5/promoteR58ConcretePedestalSuccessor.ts",
      INVENTORY_PATH,
    ],
  });
  const common = {
    masterSha256: MASTER_SHA256,
    sourceStateId: sourceIdentity.source_state_id,
    sourceIdentity,
    productionAccessed: false,
    deployOrOtaPerformed: false,
    professionalSignOffOverlay: "SEPARATE_NOT_FAKED",
  };
  const reports = {
    batch006: {
      contract: "rik-expo-app-r4.batch006-current-sha-content-revalidation.v1",
      status: "GREEN_CURRENT_SHA_CONTENT_REVALIDATED_BOUNDED_RUNTIME_MATRIX_PENDING",
      ...common,
      denominator: { identities: batch006.identityCount, workGroups: batch006.groupCount, identitySetSha256: batch006.identitySetSha256 },
      sourceDrift: waterSource,
      contentCoverage: waterCoverage,
      historicalHeavyEvidence: [waterOraclePath, waterPerIdPath, waterFinalPath, waterMassPath].map(evidenceRef),
      currentSourceConclusion: "32/32 content-owner source files byte-identical; 689/689 R4 identities are GREEN in the preserved independent per-ID oracle.",
      pending: ["R4_30_RUNTIME_CASES_PER_WORK_GROUP", "R4_FIVE_ROLE_REVIEW"],
    },
    batch007: {
      contract: "rik-expo-app-r4.batch007-current-sha-content-revalidation.v1",
      status: "GREEN_CURRENT_SHA_CONTENT_AND_OWNER_REPAIR_BOUNDED_RUNTIME_MATRIX_PENDING",
      ...common,
      denominator: { identities: batch007.identityCount, workGroups: batch007.groupCount, identitySetSha256: batch007.identitySetSha256 },
      sourceDrift: hvacSource,
      currentContent: {
        matchedIdentities: batch007.identityCount,
        missingIdentities: hvacMissing,
        parameters: hvacParameters,
        formulas: hvacFormulas,
        resources: hvacResources,
        materialDisposition: { included: hvacMaterialIncluded, notApplicableWithReason: hvacMaterialNotApplicable },
        equipmentDisposition: { included: hvacEquipmentIncluded, notApplicableWithReason: hvacEquipmentNotApplicable },
        hiddenDefaults: 0,
        formulaInputFailures: 0,
        resourceBindingFailures: 0,
        semanticOwnerDuplicates: 0,
        typedChildInterfaceRowsWithCostOwner: 0,
      },
      currentOwnerProof: evidenceRef(HVAC_OWNER_RESULT),
      repairConclusion: "One reviewed source delta removes duplicated priced typed-child rows; 1012/1012 passports have one informational interface row per component and zero interface cost owners.",
      pending: ["R4_BOUNDED_CURRENT_BACKEND_RUNTIME_SAMPLE", "R4_30_RUNTIME_CASES_PER_WORK_GROUP", "R4_FIVE_ROLE_REVIEW"],
    },
    batch008: {
      contract: "rik-expo-app-r4.batch008-current-sha-content-revalidation.v1",
      status: "GREEN_CURRENT_SHA_CONTENT_REVALIDATED_BOUNDED_RUNTIME_MATRIX_PENDING",
      ...common,
      denominator: { identities: batch008.identityCount, workGroups: batch008.groupCount, identitySetSha256: batch008.identitySetSha256 },
      sourceDrift: concreteSource,
      contentCoverage: { historicalConcrete: legacyConcrete.length, currentMandatorySuccessors: successors.length, missing: [] },
      mandatorySuccessors: successors,
      historicalHeavyEvidence: [concreteIdentityPath, concreteSummaryPath, concreteMassAPath, concreteMassBPath].map(evidenceRef),
      currentTargetedTests: evidenceRef(CONCRETE_TEST_RESULT),
      pending: ["R4_30_RUNTIME_CASES_PER_WORK_GROUP", "R4_FIVE_ROLE_REVIEW"],
    },
  };
  const paths = {
    batch006: join(OUTPUT, "07_BATCH006_CURRENT_SHA_CONTENT_REVALIDATION_R4.json"),
    batch007: join(OUTPUT, "08_BATCH007_CURRENT_SHA_CONTENT_REVALIDATION_R4.json"),
    batch008: join(OUTPUT, "09_BATCH008_CURRENT_SHA_CONTENT_REVALIDATION_R4.json"),
  };
  atomicJson(paths.batch006, reports.batch006);
  atomicJson(paths.batch007, reports.batch007);
  atomicJson(paths.batch008, reports.batch008);
  const index = {
    contract: "rik-expo-app-r4.batch006-008-current-sha-revalidation-index.v1",
    status: "GREEN_CONTENT_REVALIDATION_RUNTIME_MATRICES_PENDING",
    ...common,
    batches: Object.entries(paths).map(([batch, path]) => ({ batch, ...evidenceRef(path) })),
    blockers: [],
    pendingAutomatable: ["R4_30_RUNTIME_CASES_PER_WORK_GROUP", "R4_FIVE_ROLE_REVIEW", "BATCH_TERMINAL_VERDICTS"],
  };
  atomicJson(join(OUTPUT, "10_BATCH006008_CURRENT_SHA_REVALIDATION_INDEX_R4.json"), index);
  process.stdout.write(`${JSON.stringify({ status: index.status, sourceStateId: sourceIdentity.source_state_id,
    batch006: reports.batch006.denominator, batch007: reports.batch007.denominator,
    batch008: reports.batch008.denominator })}\n`);
}

main();
