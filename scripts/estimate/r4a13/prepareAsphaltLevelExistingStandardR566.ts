import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { appendAsphaltLevelExistingStandardR566, asphaltLevelExistingStandardR566 as profile, type AsphaltLevelCapturedParentR566 } from "../../../src/lib/estimate/v4/asphaltLevelExistingStandardR566";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { estimateDeterministicHash } from "../../../src/lib/estimate/estimateDeterministicHash";
import { masterRetainedParentCaptureSha256R1, prepareMasterRetainedBindingRepresentativeR1, type MasterRetainParentBindingsR1 } from "./masterSingleDefinitionRetainParentBindingsR1";
import { resolveMasterExistingNormativeRegistryReuseR1, validateIndependentCompletenessMapReferences,
  runMasterSingleDefinitionSuccessorR1, type MasterSingleDefinitionSuccessorConfig } from "./prepareMasterSingleDefinitionSuccessorR1";
import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from "./catalogFirstEstimateMinimumInputAudit.shared";
import {makeMasterDeferredProjectQuantityBasisR1} from './masterTypedPartialQuantityBasisR1';

type Json = Record<string, any>;
type Pin = Readonly<{ path: string; sha256: string }>;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const prefix = profile.namespace, id = (value: string) => prefix + value;
const sourcePackPath = "data/estimate-benchmarks/source-packs/asphalt-level-existing-standard-r566.json";
const contract = "gox-build.asphalt-level-existing-standard/r566", stopCode = "ASPHALT_LEVEL_EXISTING_STANDARD_R566";

/** Pure staged configuration on the exact existing standard and immutable registry rows.
 * Current manifests, protected-history proof and normal/locked rereads are owned by the sole publisher. */
export function prepareAsphaltLevelExistingStandardDraftR566(input: Readonly<{
  capturedParent: AsphaltLevelCapturedParentR566; capturedParentSha256: string;
  recipeParent: AsphaltLevelCapturedParentR566; recipeParentSha256: string;
  parentReleaseId: string;
}>) {
  const parent = clone(input.capturedParent), historical = clone(input.recipeParent);
  assert.equal(masterRetainedParentCaptureSha256R1(parent), input.capturedParentSha256);
  assert.equal(masterRetainedParentCaptureSha256R1(historical), input.recipeParentSha256);
  const next = appendAsphaltLevelExistingStandardR566(input);
  const registered = new Set(parent.normativeSources.map((row) => row.source_key));
  const oldFixtureSources = Object.fromEntries(Object.entries(parent.baseline.normative_source_ids as Record<string, string[]>).
    map(([parameter, sources]) => [parameter, sources.filter((source) => !registered.has(source))]).filter(([, sources]) => sources.length > 0));
  const retained: MasterRetainParentBindingsR1 = { capturedParent: parent, capturedParentSha256: input.capturedParentSha256,
    newParameterSources: next.parameterSources, legacyCapturedFixtureSources: {
      contract: "master-retained-captured-fixture-provenance/r1", parameterSources: oldFixtureSources,
    } };
  const source = clone(profile.sourceRegistry), locator = clone(profile.locatorRegistry);
  const { created_at: _createdAt, ...managedSource } = source;
  const binding: MasterSingleDefinitionSuccessorConfig["binding"] = {
    rowId: next.newlySourceBoundRowIds[0]!, applicability: { ...profile.historicalBindingEvidence.applicability,
      selectedOnly: { kind: "equals", parameterId: profile.methodParameterId, value: profile.methodRu },
      originalSourceAndLocatorReused: true, noDensityOrWasteMultiplier: true, fullTechnicalAcceptance: false },
    retainParentBindings: retained, reuseExistingNormativeRegistry: { contract: "master-existing-normative-registry-reuse/r1",
      locatorExcerptHashKind: "SOURCE_LOCATOR_TEXT_SHA256", source, locators: [locator] },
  };
  assert(resolveMasterExistingNormativeRegistryReuseR1({ config: { stopCode, binding }, newSource: managedSource, newLocators: [locator] }));
  const completenessMap = { contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT, sourceKind: "NORMATIVE_OPERATION_MAP",
    generatedFromCurrentRows: false, evidenceSha256: profile.captureResultSha256, evidenceReferences: [sourcePackPath, profile.parents.recipeEvidence.capturedParentSha256],
    coverage: "COMPLETE_CAPTURED_RECIPE_PHYSICS_WITH_UNRESOLVED_PROJECT_SCHEDULES_OLD_STANDARD_RETAINED",
    fullTechnicalAcceptance: false, entries: profile.independentRecipeRows.map((row) => ({ expectedResourceId: row.rowId,
      operationId: "retained-leveling:" + row.rowId, sourceId: profile.sourceId,
      condition: "EXPLICIT_SELECTED_LEVELING_METHOD_ACCEPTED_BASE_AND_MECHANIZED_ACCESS",
      quantityRule: "EXACT_CAPTURED_FORMULA_AND_UNIT; PROJECT_FACTS_REMAIN_UNRESOLVED_WITHOUT_INPUT",
      formulaId: prefix + row.formulaId, resolution: { kind: "ROW", rowId: id(row.rowId) } })) };
  assert.deepEqual(validateIndependentCompletenessMapReferences({ completenessMap, formulaDefinitions: next.formulas, resourceDefinitions: next.resources }), []);
  const facts = { [profile.siteParameterId]: profile.siteRu,
    [id("area_m2")]: 100, [id("layer_thickness_mm")]: 100 };
  const compile = (values: Json) => compileCanonicalEstimateCore({ operation: "recalculate", catalogId: profile.catalogId,
    compilerVersion: contract, primaryMeasureParameterId: id("area_m2"),
    parameterDefinitions: next.parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
    formulaDefinitions: next.formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
    resourceDefinitions: next.resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
    submittedParameters: values, confirmedParameters: next.runtimeProfileInput, priceItems: [], currencyCode: "KGS", maximumResourceRows: 128, hashJson: estimateDeterministicHash });
  const verifyCore = async () => {
    const representative = prepareMasterRetainedBindingRepresentativeR1({ config: { stopCode, catalogId: profile.catalogId,
      parentReleaseId: input.parentReleaseId, binding }, newSource: managedSource, newLocators: [locator] }, {
      ...next, newBindings: [{ row_id: binding.rowId, locator_id: locator.id, applicability: binding.applicability }],
      successorProvenance: { contract, sourceId: profile.sourceId, normId: profile.normId,
        parentDefinitionId: parent.definition.id, parentBaselineId: parent.baseline.id, capturedParentSha256: input.capturedParentSha256 },
    });
    assert.equal(representative.expectedNormativeBindingCount, 1);
    const result = await compile(facts), mix = result.rows.find((row) => row.row_id === id("asphalt:material:hot-dense-fine-mix"));
    assert.equal(mix?.quantity, "23.58"); assert(result.rows.every((row) => row.row_id.startsWith(prefix)));
    const missing = new Set(result.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids));
    assert(next.projectFactParameterIds.every((parameter) => missing.has(parameter)));
    assert(next.normativeParameterIds.every((parameter) => !missing.has(parameter)));
    const legacy = await compileCanonicalEstimateCore({ operation: "recalculate", catalogId: parent.definition.catalog_id,
      compilerVersion: "TEST_ONLY_IMMUTABLE_V9_COMPATIBILITY_ORACLE", primaryMeasureParameterId: "area_m2",
      parameterDefinitions: parent.parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
      formulaDefinitions: parent.formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
      resourceDefinitions: parent.resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
      submittedParameters: parent.baseline.input_values, confirmedParameters: {}, priceItems: [], currencyCode: "KGS",
      maximumResourceRows: 128, hashJson: estimateDeterministicHash });
    assert.equal(legacy.rows.length, 24); assert.equal(legacy.preliminaryNeeds.length, 0);
    return { status: "PASS_EXISTING_STANDARD_RETAINED_METHOD_SOURCE_PHYSICS_ONLY", shape: [51, 48, 81],
      ordinaryFactBudget: 4, currentInputs: 3, inheritedRows: 24, retainedRecipeRows: 57, normativeConstants: 18,
      freshPublicMethodIsStructuralDefault: true, legacyMethodIsPublic: false,
      selectedPreliminaryAssumptions: 3, unresolvedProjectFactIds: next.projectFactParameterIds,
      newBindings: 1, newCatalogIds: 0, registryWrites: false, protectedHistoryWritten: false,
      publicationPerformed: false, fullTechnicalAcceptance: false };
  };
  const partialQuantityBasis=makeMasterDeferredProjectQuantityBasisR1({...next,parameterIds:next.projectFactParameterIds,
    source:{sourceId:source.id,sourceKey:source.source_key,artifactSha256:source.artifact_sha256,
      locatorId:locator.id,locatorExcerptSha256:locator.excerpt_sha256,locatorPayload:clone(locator.locator)},
    method:{parameterId:profile.methodParameterId,value:profile.methodRu,version:profile.contract}});
  return { parent, historical, next, binding, managedSource, locator, completenessMap, facts, verifyCore, partialQuantityBasis };
}

/** Root-reviewed pins are required before the existing publisher can even stage a plan.
 * No script here writes definitions, registry, prices, history or manifests itself. */
export function prepareAsphaltLevelExistingStandardR566(input: Readonly<{ rootBindingPin: Pin; outputRoot: string }>): MasterSingleDefinitionSuccessorConfig {
  const readPin = (pin: Pin): Json => {
    assert(!isAbsolute(pin.path) && !pin.path.split(/[\/]/u).includes(".."));
    const bytes = readFileSync(resolve(pin.path)); assert.equal(createHash("sha256").update(bytes).digest("hex"), pin.sha256);
    return JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/u, ""));
  };
  const root = readPin(input.rootBindingPin);
  assert.equal(root.status, "ROOT_ADMITTED_ASPHALT_LEVEL_EXISTING_STANDARD_R566");
  assert.equal(root.catalogId, profile.catalogId); assert.equal(root.newCatalogIds, 0); assert.equal(root.databaseWritesDuringCapture, false);
  const standard = readPin(root.standardParentPin), historical = readPin(root.historicalRecipePin), closed = readPin(root.closedCaptureGuardPin), pointer = readPin(root.currentPointerPin);
  assert.equal(standard.compatibilityEvidenceOnly, true); assert.equal(historical.compatibilityEvidenceOnly, true);
  assert.equal(closed.error, null); assert.equal(closed.completeReadSet, true); assert.equal(closed.allTransactionsRolledBack, true);
  assert.equal(closed.allConnectionsClosed, true); assert.equal(closed.databaseWrites, false);
  assert.equal(pointer.definitionReleaseId, root.definitionReleaseId); assert.equal(pointer.searchReleaseId, root.searchReleaseId);
  for (const pin of root.sharedSourcePins as Pin[]) readPinBytes(pin);
  function readPinBytes(pin: Pin): void { assert(!isAbsolute(pin.path) && !pin.path.split(/[\/]/u).includes(".."));
    assert.equal(createHash("sha256").update(readFileSync(resolve(pin.path))).digest("hex"), pin.sha256); }
  assert.equal(root.masterSha256, "afe7504e30a9383feadb6f6031e9d71891cc275a6492c2933aee356221d5e39b");
  assert.equal(createHash("sha256").update(readFileSync(root.masterPath)).digest("hex"), root.masterSha256);
  const draft = prepareAsphaltLevelExistingStandardDraftR566({ capturedParent: standard.capturedParent,
    capturedParentSha256: standard.capturedParentSha256, recipeParent: historical.capturedParent,
    recipeParentSha256: historical.capturedParentSha256, parentReleaseId: root.definitionReleaseId });
  const source = profile.sourceRegistry, locator = profile.locatorRegistry;
  const included = ["Выравнивающий слой горячей асфальтобетонной смеси по площади и общей толщине; основание принято и доступно технике.",
    "Числовые ресурсы КРЕР 27-06-019-02: база 30 мм и опубликованные поправки по 5 мм; без добавления плотности и коэффициента потерь к нормативной массе.",
    "Материалы, труд и машины рассчитаны для механизированного устройства выбранного слоя; маршрут и проектные мероприятия подтверждаются отдельно."];
  const excluded = ["Проект слоёв, ремонт основания, фрезерование, водоотвод, бордюры и разметка требуют самостоятельного состава.", ...profile.remainingNeedsRu];
  const runtimeKeys = Object.entries(draft.parent.baseline.input_classification).filter(([, kind]) => kind === "DERIVED").map(([key]) => key);
  const runtimeProfileInput = { ...Object.fromEntries(runtimeKeys.map((key) => [key, draft.parent.baseline.input_values[key]])), ...draft.next.runtimeProfileInput };
  const runtimeProfileClassification = { ...Object.fromEntries(runtimeKeys.map((key) => [key, "DERIVED" as const])), ...draft.next.runtimeProfileClassification };
  const runtimeProfileSourceIds = { ...Object.fromEntries(runtimeKeys.map((key) => [key, draft.parent.baseline.normative_source_ids[key]])), ...draft.next.runtimeProfileSourceIds };
  // Old values remain byte-pinned compatibility evidence. New measurements are
  // separate validation fixtures; only the app-owned method is a runtime default.
  const acceptanceInput = { ...draft.parent.baseline.input_values, ...draft.facts, ...draft.next.runtimeProfileInput };
  const sourcePaths = [...new Set([sourcePackPath, "src/lib/estimate/v4/asphaltLevelExistingStandardR566.ts",
    "src/lib/estimate/v4/asphaltLevelExistingStandardR566.test.ts", "scripts/estimate/r4a13/prepareAsphaltLevelExistingStandardR566.ts",
    "src/features/consumerRepair/consumerAsphaltLevelExistingStandardR566.test.ts",
    "src/features/consumerRepair/consumerCanonicalParameterEditor.ts", "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts", "src/lib/estimatePresentation/buildCanonicalParameterCards.ts",
    "src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts", "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts", "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts",
    "scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts", "scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.ts",
    "scripts/estimate/r4a13/masterTypedPartialQuantityBasisR1.test.ts", input.rootBindingPin.path, root.standardParentPin.path,
    root.historicalRecipePin.path, root.closedCaptureGuardPin.path, ...(root.sharedSourcePins as Pin[]).map((pin) => pin.path)])];
  assert(sourcePaths.every((path) => !isAbsolute(path) && !path.split(/[\/]/u).includes("..")));
  return { contract, stopCode, applicationName: "asphalt-level-existing-standard-r566", expectedBranch: root.expectedBranch,
    masterPath: root.masterPath, masterSha256: root.masterSha256, parentReleaseId: root.definitionReleaseId,
    parentSearchReleaseId: root.searchReleaseId, currentReleasePath: root.currentPointerPin.path, outputRoot: input.outputRoot, sourcePaths,
    catalogId: profile.catalogId, sourceId: profile.sourceId, normId: profile.normId,
    sourceMetadata: { source_title: source.title_ru, source_authority: source.authority, official_url: source.official_url,
      source_kind: source.metadata.sourceKind, artifact_sha256: source.artifact_sha256, effective_from: source.effective_from,
      exact_locator: locator.locator.exactLocator, use_restriction: source.metadata.useRestriction },
    parameterDefinitions: draft.next.parameters, formulaDefinitions: draft.next.formulas, resourceDefinitions: draft.next.resources,
    shortInput: draft.facts,
    acceptanceInput, runtimeProfileInput, runtimeProfileClassification, runtimeProfileSourceIds,
    expectedParentShape: [19, 24, 24], benchmarkOrdinal: 0, validationScenario: "FRESH_PUBLIC_LEVELING_LAYER_STRUCTURAL_METHOD_AND_SEPARATE_MEASURED_FACTS_V9_HISTORY_IMMUTABLE",
    passport: { canonicalRuName: profile.methodRu, workKey: "paving_roads_landscape_interior_asphalt_level_standard",
      physicalResultRu: "Выравнивающий слой на принятом основании по отдельно измеренным площади и общей толщине.",
      includedScopeRu: included, excludedScopeRu: excluded, independentCompletenessMap: draft.completenessMap,
      partialQuantityBasis: draft.partialQuantityBasis },
    applicability: { ...Object.fromEntries(Object.entries(clone(draft.parent.definition.applicability)).filter(([key]) => key !== "primaryMeasureSelectionV1")),
      primaryMeasureParameterId: draft.next.primaryMeasureParameterId,
      retainedMethodTransferR566: { contract, ordinaryFactBudget: 4, noAutomaticLegacySwitch: true,
        newMeasuredAreaDefault: null, priorRowsAndPricesPreserved: true, fullTechnicalAcceptance: false } },
    binding: draft.binding, locator: { key: locator.locator_key, payload: clone(locator.locator) },
    search: { primaryUom: "m2", canonicalNameRu: profile.methodRu, aliases: ["Выравнивание асфальтового покрытия"],
      shortScopeRu: included[0]!, keyDistinguishingParameters: draft.next.ordinaryParameterIds, clarificationFields: draft.next.ordinaryParameterIds,
      includedBoundaries: included, excludedBoundaries: excluded, extraSearchTermsRu: "выравнивающий слой асфальтобетон механизированная укладка принятый участок",
      sourceProvenance: { contract, capturedParentSha256: standard.capturedParentSha256,
        recipeEvidenceSha256: historical.capturedParentSha256, originalRegistrySourceId: source.id,
        originalLocatorId: locator.id, fullTechnicalAcceptance: false } },
    forbiddenAdjacentMatchers: [/new_aggregate_base|curb_installation|new_drainage_network|road_marking/iu],
    owner: "ROOT_SINGLE_INTEGRATOR", receiptFileStem: "asphalt_level_existing_standard_r566", verifyCore: draft.verifyCore };
}

if (require.main === module) {
  const value = (name: string) => process.argv.find((argument) => argument.startsWith(name + "="))?.slice(name.length + 1);
  const bindingPath = value("--binding"), bindingSha256 = value("--binding-sha256"), outputRoot = value("--output-root");
  assert(bindingPath && bindingSha256 && outputRoot, "ROOT_REVIEWED_BINDING_PIN_AND_OUTPUT_ROOT_REQUIRED");
  void runMasterSingleDefinitionSuccessorR1(prepareAsphaltLevelExistingStandardR566({ rootBindingPin: { path: bindingPath, sha256: bindingSha256 }, outputRoot }));
}
