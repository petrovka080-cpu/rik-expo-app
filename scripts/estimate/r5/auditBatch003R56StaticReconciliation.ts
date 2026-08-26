import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
  type Batch003R56CanonicalSuccessorDefinition,
} from "./batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "./batch003R56Fixtures";
import { buildCanonicalSourceIdentityR56 } from "./canonicalSourceIdentityR56";

const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const OUTPUT_DIR = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/static",
);
const REPORT_PATH = resolve(OUTPUT_DIR, "BATCH003_R56_STATIC_RECONCILIATION.json");
const VERDICTS_PATH = resolve(OUTPUT_DIR, "BATCH003_R56_CATALOG_VERDICTS.jsonl");
const COMPONENT_IDENTITIES_PATH = resolve(OUTPUT_DIR, "BATCH003_R56_COMPONENT_IDENTITIES.json");
const DURABLE_JEST_PATH = resolve(OUTPUT_DIR, "BATCH003_R56_DURABLE_JEST.json");
const DURABLE_JEST_SHA256 = "7e7bd4424f924503519a30dbc5679aec803b77b3e0e20db22d778a3982c14371";
const FORBIDDEN_CATEGORIES = new Set(["documentation", "testing", "temporary_work", "subcontract_service"]);
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);
const FORBIDDEN_TEXT = /(?:worker_h|machine_h|man_hour|журнал|акт\b|протокол|фото(?:фиксац|отчет)|обмер\s+и\s+подтвержден|входн(?:ой|ого)\s+контрол|испытани|комплект\s+(?:приемочн|исполнительн|закупочн)|согласовани|сдача\s+заказчику|ппе|сиз\b|временн(?:ое|ая)\s+(?:освещ|электр|огражд))/iu;

type Scalar = string | number | boolean;

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalEstimateStableJson(value), "utf8").digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicWrite(path: string, bytes: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, bytes, "utf8");
  renameSync(temporary, path);
}

function keyFromSuccessorRowId(rowId: string): string {
  return rowId.split(":").at(-1) ?? rowId;
}

function keyFromPredecessorRowId(rowId: string): string {
  return rowId.split(":row:")[1] ?? rowId;
}

function closeEnough(left: unknown, right: unknown): boolean {
  return Math.abs(Number(left) - Number(right)) <= 0.000001;
}

function expectedCustomQuantity(
  key: string,
  definition: Batch003R56CanonicalSuccessorDefinition,
  fixture: Readonly<Record<string, Scalar>>,
): number {
  if (key === "operation_work") {
    const parameterId = definition.operation === "FINISH_JOINT"
      ? "joint_length_m"
      : definition.operation === "REPAIR" ? "defect_area_m2" : "area_m2";
    return Number(fixture[parameterId]);
  }
  if (key === "incoming_delivery") {
    return Number(fixture.delivery_mass_kg) / 1_000 * Number(fixture.delivery_distance_km);
  }
  if (key === "waste_haul") {
    return Number(fixture.waste_mass_kg) / 1_000 * Number(fixture.waste_haul_distance_km);
  }
  if (key === "access_equipment") return Number(fixture.access_equipment_shift_count);
  throw new Error(`BATCH003_R56_CUSTOM_ORACLE_KEY_UNKNOWN:${definition.catalogId}:${key}`);
}

function rawRows(definition: Batch003R56CanonicalSuccessorDefinition) {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === definition.catalogId);
  invariant(inventory, `BATCH003_R56_ORACLE_INVENTORY_MISSING:${definition.catalogId}`);
  const parts = buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory);
  invariant(parts, `BATCH003_R56_ORACLE_PARTS_MISSING:${definition.catalogId}`);
  return parts.child_assemblies.flatMap((child) => child.rows);
}

async function rejectsCompile(input: {
  definition: Batch003R56CanonicalSuccessorDefinition;
  values: Readonly<Record<string, Scalar>>;
}): Promise<boolean> {
  try {
    await compileBatch003R56ThroughSharedCore(input);
    return false;
  } catch {
    return true;
  }
}

function roleVerdicts(definition: Batch003R56CanonicalSuccessorDefinition, visibleRows: number) {
  const ordinaryUser = {
    russianPhysicalResult: /[а-яё]/iu.test(definition.passport.physicalResultRu),
    explicitIncludedAndExcludedScope: definition.passport.includedScopeRu.length >= 2
      && definition.passport.excludedScopeRu.length >= 3,
    boundedVisibleRows: visibleRows >= 5 && visibleRows <= 32,
    noDocumentOrHourRows: definition.resources.every((row) =>
      !FORBIDDEN_CATEGORIES.has(row.category) && !FORBIDDEN_UNITS.has(row.outputUnitId)),
  };
  const estimator = {
    oneMeasuredOperation: definition.resources.filter((row) => row.rowId.endsWith(":operation_work")).length === 1,
    oneDeliveryAndWasteRoute: definition.resources.filter((row) => row.rowId.endsWith(":incoming_delivery")).length === 1
      && definition.resources.filter((row) => row.rowId.endsWith(":waste_haul")).length === 1,
    uniqueCostAndSemanticOwners: new Set(definition.passport.costOwners).size === definition.resources.length
      && new Set(definition.passport.semanticOwners).size === definition.resources.length,
    procurementOnlyPhysical: definition.resources.filter((row) => row.procurementEligible)
      .every((row) => row.category === "material" || row.category === "transport"),
  };
  const constructionEngineer = {
    exactNormativeTrace: definition.resources.every((row) => row.normativeTrace.length >= 2
      && row.normativeTrace.every((trace) => trace.exact_locator.trim().length >= 10)),
    sourcePackFailClosed: definition.passport.engineeringSourcePack.hiddenQuantitativeAssumptionCount === 0
      && definition.passport.engineeringSourcePack.unboundFormulaInputCount === 0
      && definition.passport.engineeringSourcePack.quantitativeBindings.every((binding) =>
        !binding.hiddenDefault && binding.missingValuePolicy === "FAIL_CLOSED"),
    conditionalAccessByShift: definition.resources.some((row) => row.rowId.endsWith(":access_equipment")
      && row.outputUnitId === "shift"
      && row.inclusionCondition === "work_included=true AND access_equipment_required=true"),
    physicalMaterialTraceability: definition.resources.filter((row) => row.category === "material")
      .every((row) => row.procurementEligible && row.procurementOwnerId != null && row.normativeSourceIds.length >= 2),
  };
  const verdict = (checks: Record<string, boolean>) => Object.values(checks).every(Boolean) ? "GREEN" : "RED";
  return [
    { role: "ORDINARY_USER", checks: ordinaryUser, verdict: verdict(ordinaryUser) },
    { role: "ESTIMATOR", checks: estimator, verdict: verdict(estimator) },
    { role: "CONSTRUCTION_ENGINEER", checks: constructionEngineer, verdict: verdict(constructionEngineer) },
  ];
}

async function catalogVerdict(definition: Batch003R56CanonicalSuccessorDefinition) {
  const fixture = { ...batch003R56FixtureValues(definition) };
  const compiled = await compileBatch003R56ThroughSharedCore({ definition, values: fixture });
  const repeated = await compileBatch003R56ThroughSharedCore({ definition, values: fixture });
  const predecessorRows = rawRows(definition);
  const numericFixture = Object.fromEntries(
    Object.entries(fixture).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
  const materialOracle = definition.resources.filter((row) => row.category === "material").every((resource) => {
    const predecessor = predecessorRows.find((row) => keyFromPredecessorRowId(row.row_id) === keyFromSuccessorRowId(resource.rowId));
    if (!predecessor) return false;
    const actual = compiled.rows.find((row) => row.row_id === resource.rowId);
    return actual != null && closeEnough(actual.quantity, predecessor.formula.calculate(numericFixture));
  });
  const customOracle = definition.resources.filter((row) => !row.rowId.includes(":row:material:"))
    .every((resource) => {
      const actual = compiled.rows.find((row) => row.row_id === resource.rowId);
      return actual != null && closeEnough(
        actual.quantity,
        expectedCustomQuantity(keyFromSuccessorRowId(resource.rowId), definition, fixture),
      );
    });
  const accessExcluded = await compileBatch003R56ThroughSharedCore({
    definition,
    values: { ...fixture, access_equipment_required: false },
  });
  const missingQuantity = { ...fixture };
  const operationQuantityId = definition.operation === "FINISH_JOINT"
    ? "joint_length_m"
    : definition.operation === "REPAIR" ? "defect_area_m2" : "area_m2";
  delete missingQuantity[operationQuantityId];
  const missingPrice = { ...fixture };
  delete missingPrice.unit_price_successor_operation_work_kgs;
  const mutation = await compileBatch003R56ThroughSharedCore({
    definition,
    values: { ...fixture, [operationQuantityId]: Number(fixture[operationQuantityId]) + 17 },
  });
  const workRowId = definition.resources.find((row) => row.rowId.endsWith(":operation_work"))?.rowId;
  const originalWork = compiled.rows.find((row) => row.row_id === workRowId);
  const mutatedWork = mutation.rows.find((row) => row.row_id === workRowId);
  const formulaInputs = new Set(definition.formulas.flatMap((formula) => formula.inputParameterIds));
  const priceInputs = new Set(definition.resources.flatMap((resource) =>
    resource.priceRoute?.kind === "RUNTIME_VALIDATED_INPUT" ? [resource.priceRoute.unit_price_parameter_id] : []));
  const sourcePackInputs = new Set(
    definition.passport.engineeringSourcePack.quantitativeBindings.map((binding) => binding.parameterId),
  );
  const declaredParameterIds = new Set(definition.parameters.map((parameter) => parameter.parameterId));
  const requiredParameterIds = new Set([
    ...formulaInputs,
    ...priceInputs,
    "work_included",
    "estimate_scope_mode",
    "project_type",
    "product_profile_id",
    "price_basis_reference",
    "price_basis_date",
    "access_equipment_required",
  ]);
  const roles = roleVerdicts(definition, compiled.rows.length);
  const criteria = {
    physicalScope: definition.passport.physicalResultRu.length >= 30,
    measurableOperation: definition.resources.filter((row) => row.rowId.endsWith(":operation_work")).length === 1,
    applicablePhysicalMaterials: definition.resources.filter((row) => row.category === "material").every((row) =>
      row.procurementEligible && row.procurementOwnerId != null),
    conditionalEquipment: compiled.rows.some((row) => row.row_id.endsWith(":access_equipment"))
      && !accessExcluded.rows.some((row) => row.row_id.endsWith(":access_equipment"))
      && accessExcluded.rows.length === compiled.rows.length - 1,
    consolidatedLogistics: definition.resources.filter((row) => row.rowId.endsWith(":incoming_delivery")).length === 1
      && definition.resources.filter((row) => row.rowId.endsWith(":waste_haul")).length === 1,
    forbiddenNoiseAbsent: definition.resources.every((row) =>
      !FORBIDDEN_CATEGORIES.has(row.category)
      && !FORBIDDEN_UNITS.has(row.outputUnitId)
      && !FORBIDDEN_TEXT.test(row.titleRu)),
    minimumParameters: declaredParameterIds.size === requiredParameterIds.size
      && [...declaredParameterIds].every((parameterId) => requiredParameterIds.has(parameterId)),
    formulaAndUnitProof: definition.resources.every((row) => definition.formulas.some((formula) =>
      formula.formulaId === row.formulaId && formula.outputUnitId === row.outputUnitId)),
    sourcePackExact: sourcePackInputs.size === formulaInputs.size + [...priceInputs].filter((id) => !formulaInputs.has(id)).length
      && [...formulaInputs, ...priceInputs].every((parameterId) => sourcePackInputs.has(parameterId)),
    oracleParity: materialOracle && customOracle,
    failClosed: await rejectsCompile({ definition, values: missingQuantity })
      && await rejectsCompile({ definition, values: missingPrice }),
    deterministicSharedCore: sha256(compiled) === sha256(repeated),
    mutationSensitive: originalWork != null && mutatedWork != null && originalWork.quantity !== mutatedWork.quantity,
    identityUniqueness: new Set(definition.resources.map((row) => row.rowId)).size === definition.resources.length
      && new Set(definition.resources.map((row) => row.costOwnerId)).size === definition.resources.length
      && new Set(definition.resources.map((row) => row.semanticOwnerId)).size === definition.resources.length,
    roleProjection: roles.every((role) => role.verdict === "GREEN"),
    disposition: definition.disposition === "REAL_WORK",
  };
  invariant(Object.values(criteria).every(Boolean), `BATCH003_R56_STATIC_CRITERION_RED:${definition.catalogId}:${JSON.stringify(criteria)}`);
  return {
    contract: "real-professional-estimates-r5.6.batch003-catalog-verdict.v1",
    catalogId: definition.catalogId,
    operation: definition.operation,
    variant: definition.variant,
    definitionSha256: definition.definitionSha256,
    engineeringSourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
    predecessorIdentityHash: definition.predecessorPassport.identityHash,
    counts: {
      predecessorRows: definition.predecessorPassport.boqRowCount,
      removedPredecessorRows: definition.passport.removedPredecessorRowCount,
      parameters: definition.parameters.length,
      formulas: definition.formulas.length,
      resources: definition.resources.length,
      materialRows: definition.resources.filter((row) => row.category === "material").length,
      procurementRows: compiled.rows.filter((row) => row.included_in_procurement).length,
      compiledRows: compiled.rows.length,
    },
    oracles: {
      predecessorMaterialCalculate: materialOracle ? "GREEN" : "RED",
      independentCustomArithmetic: customOracle ? "GREEN" : "RED",
      missingQuantityRejected: await rejectsCompile({ definition, values: missingQuantity }) ? "GREEN_REJECTED" : "RED_ACCEPTED",
      missingPriceRejected: await rejectsCompile({ definition, values: missingPrice }) ? "GREEN_REJECTED" : "RED_ACCEPTED",
      mutationSensitive: criteria.mutationSensitive ? "GREEN" : "RED",
    },
    roles,
    criteria,
    status: "GREEN_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING",
  };
}

async function main(): Promise<void> {
  const durableJestBytes = readFileSync(DURABLE_JEST_PATH);
  invariant(createHash("sha256").update(durableJestBytes).digest("hex") === DURABLE_JEST_SHA256,
    "BATCH003_R56_DURABLE_JEST_IDENTITY_DRIFT");
  const durableJest = JSON.parse(durableJestBytes.toString("utf8")) as {
    success: boolean;
    numTotalTestSuites: number;
    numPassedTestSuites: number;
    numFailedTestSuites: number;
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
  };
  invariant(durableJest.success
    && durableJest.numTotalTestSuites === 1
    && durableJest.numPassedTestSuites === 1
    && durableJest.numFailedTestSuites === 0
    && durableJest.numTotalTests === 7
    && durableJest.numPassedTests === 7
    && durableJest.numFailedTests === 0,
  "BATCH003_R56_DURABLE_JEST_RED");
  const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
  invariant(definitions.length === 36, `BATCH003_R56_DEFINITION_DENOMINATOR:${definitions.length}`);
  invariant(new Set(definitions.map((definition) => definition.definitionSha256)).size === 36,
    "BATCH003_R56_DEFINITION_HASH_COLLISION");
  invariant(new Set(definitions.map((definition) => definition.passport.engineeringSourcePack.sourcePackHash)).size === 36,
    "BATCH003_R56_SOURCE_PACK_HASH_COLLISION");
  const verdicts = [];
  for (const definition of definitions) verdicts.push(await catalogVerdict(definition));
  invariant(verdicts.length === 36 && verdicts.every((verdict) =>
    verdict.status === "GREEN_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING"),
  "BATCH003_R56_STATIC_DENOMINATOR_RED");
  const sourceIdentity = buildCanonicalSourceIdentityR56({
    contractSha256: MASTER_SHA256,
    paths: [
      "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
      "scripts/estimate/r5/auditBatch003R56StaticReconciliation.ts",
      "scripts/estimate/r5/batch003R56Fixtures.ts",
      "scripts/estimate/r5/batch003R56SharedCoreProjection.ts",
      "scripts/estimate/r5/canonicalSourceIdentityR56.ts",
      "scripts/estimate/batch001008R3/runBatch001DrywallBackendParityR3.ts",
      "src/lib/estimate/createEstimateDraftRevision.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
      "src/lib/estimate/backendPlatform/formulaGraph.ts",
      "src/lib/estimate/backendPlatform/inclusionGraph.ts",
      "src/lib/estimate/backendPlatform/parameterConstraints.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsProfessionalV4.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsRevisionMigrationV4.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallFlatCeilingEngineeringSourcePackR56.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts",
      "tests/aiEstimateV4/batch003R56Reconciliation.contract.test.ts",
      "tests/aiEstimateV4/technologyWaveR2DurableProjection.contract.test.ts",
      "tests/aiEstimateV4/technologyWaveR2Production.contract.test.ts",
      "tests/aiEstimateV4/technologyWaveR2TestSupport.ts",
      "tests/aiEstimateV4/technologyWaveR2TraceCompleteness.contract.test.ts",
    ],
  });
  const totals = {
    predecessorRows: verdicts.reduce((sum, verdict) => sum + verdict.counts.predecessorRows, 0),
    removedPredecessorRows: verdicts.reduce((sum, verdict) => sum + verdict.counts.removedPredecessorRows, 0),
    successorRows: verdicts.reduce((sum, verdict) => sum + verdict.counts.resources, 0),
    materialRows: verdicts.reduce((sum, verdict) => sum + verdict.counts.materialRows, 0),
    measuredOperationRows: definitions.filter((definition) => definition.resources.some((row) => row.rowId.endsWith(":operation_work"))).length,
    deliveryRows: definitions.reduce((sum, definition) => sum + definition.resources.filter((row) => row.rowId.endsWith(":incoming_delivery")).length, 0),
    wasteHaulRows: definitions.reduce((sum, definition) => sum + definition.resources.filter((row) => row.rowId.endsWith(":waste_haul")).length, 0),
    conditionalAccessRows: definitions.reduce((sum, definition) => sum + definition.resources.filter((row) => row.rowId.endsWith(":access_equipment")).length, 0),
  };
  const defectCounters = {
    forbiddenTextRows: 0,
    forbiddenCategoryRows: 0,
    forbiddenUnitRows: 0,
    documentationRows: 0,
    genericHourRows: 0,
    duplicateDeliveryRows: 0,
    duplicateWasteHaulRows: 0,
    duplicateSemanticOwners: 0,
    duplicateCostOwners: 0,
    unboundFormulaOrPriceInputs: 0,
    hiddenQuantitativeAssumptions: 0,
    formulaUnitMismatches: 0,
    oracleMismatches: 0,
    failedRoleVerdicts: 0,
    nonRealWorkDispositions: 0,
  };
  const componentIdentities = {
    contract: "real-professional-estimates-r5.6.batch003-component-identities.v1",
    sourceStateId: sourceIdentity.source_state_id,
    componentManifestSha256: sourceIdentity.component_manifest_sha256,
    definitions: definitions.map((definition) => ({
      catalogId: definition.catalogId,
      definitionSha256: definition.definitionSha256,
      engineeringSourcePackHash: definition.passport.engineeringSourcePack.sourcePackHash,
      predecessorIdentityHash: definition.predecessorPassport.identityHash,
    })),
  };
  const report = {
    contract: "real-professional-estimates-r5.6.batch003-static-reconciliation.v1",
    status: "GREEN_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING",
    masterSha256: MASTER_SHA256,
    sourceIdentity,
    denominators: {
      definitions: "36/36",
      catalogVerdicts: "36/36",
      roleVerdicts: "108/108",
      sharedCoreCompiles: "36/36",
      independentMaterialOracles: "36/36",
      independentCustomFormulaOracles: "36/36",
      failClosedQuantityChecks: "36/36",
      failClosedPriceChecks: "36/36",
      mutationChecks: "36/36",
    },
    totals,
    defectCounters,
    durableProjection: {
      path: DURABLE_JEST_PATH.replace(/\\/gu, "/"),
      sha256: DURABLE_JEST_SHA256,
      suites: "1/1",
      tests: "7/7",
      failures: 0,
      status: "GREEN_FINAL_BYTES",
    },
    blockers: [
      "ISOLATED_BACKEND_REPLAY_PENDING",
      "REGISTRY_REAL_WORK_DISPOSITION_PENDING",
      "WEB_50_OF_50_PENDING",
      "ANDROID_API34_50_OF_50_PENDING",
    ],
    runtimeMutation: {
      databaseWrites: 0,
      release: false,
      deploy: false,
      ota: false,
      merge: false,
    },
    verdicts,
  };
  atomicWrite(VERDICTS_PATH, `${verdicts.map((verdict) => JSON.stringify({
    ...verdict,
    payloadSha256: sha256(verdict),
  })).join("\n")}\n`);
  atomicWrite(COMPONENT_IDENTITIES_PATH, `${JSON.stringify({
    ...componentIdentities,
    payloadSha256: sha256(componentIdentities),
  }, null, 2)}\n`);
  atomicWrite(REPORT_PATH, `${JSON.stringify({ ...report, payloadSha256: sha256(report) }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    definitions: verdicts.length,
    totals,
    defectCounters,
    sourceStateId: sourceIdentity.source_state_id,
    report: REPORT_PATH,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
