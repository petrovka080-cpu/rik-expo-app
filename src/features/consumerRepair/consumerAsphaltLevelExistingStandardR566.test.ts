import standardEvidence from "../../../data/estimate-benchmarks/fixtures/asphalt-level-existing-standard-r566-parent.json";
import historicalEvidence from "../../../data/estimate-benchmarks/fixtures/asphalt-level-r566-historical-recipe-evidence.json";
import { appendAsphaltLevelExistingStandardR566, asphaltLevelExistingStandardR566 as profile, type AsphaltLevelCapturedParentR566 } from "../../lib/estimate/v4/asphaltLevelExistingStandardR566";
import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput } from "../../lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { canonicalApprovedBaselineRuntimeParameters } from "../../lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import type { CanonicalEstimateCatalogItem } from "../../lib/estimate/backendPlatform/contracts";
import { estimateDeterministicHash } from "../../lib/estimate/estimateDeterministicHash";
import { buildCanonicalParameterCards } from "../../lib/estimatePresentation/buildCanonicalParameterCards";
import { buildConsumerCanonicalPrecompileParameterSession, consumerCanonicalPrecompileParameterOverrides } from "./consumerCanonicalParameterEditor";
import {buildCanonicalBaselinePlan} from "../../lib/estimate/backendPlatform/canonicalConsumerPromptPlanServerR1";

const parent = standardEvidence.capturedParent as unknown as AsphaltLevelCapturedParentR566;
const next = appendAsphaltLevelExistingStandardR566({ capturedParent: parent, capturedParentSha256: standardEvidence.capturedParentSha256,
  recipeParent: historicalEvidence.capturedParent as unknown as AsphaltLevelCapturedParentR566, recipeParentSha256: historicalEvidence.capturedParentSha256 });
const id = (value: string) => profile.namespace + value;
const catalog: CanonicalEstimateCatalogItem = {
  catalogId: profile.catalogId, releaseId: "TEST_ONLY_R566_FRESH_FLOW", namespace: "global", domain: "roadworks",
  workKey: "paving_roads_landscape_interior_asphalt_level_standard", titleRu: profile.methodRu, definitionVersion: 10,
  applicability: { primaryMeasureParameterId: next.primaryMeasureParameterId }, professionalMetadata: {},
  parameterSchema: next.parameters.map((parameter) => {
    const truth = parameter.truth_metadata ?? {}, guide = truth.guide as Record<string, any>;
    return { parameterId: parameter.parameter_id, ordinal: parameter.ordinal, valueType: parameter.value_type, unitId: parameter.unit_id,
      titleRu: parameter.title_ru, required: parameter.required, defaultValue: parameter.default_value, constraints: parameter.constraints_json ?? {},
      semanticParameterKey: truth.semantic_parameter_key, visibilityRole: truth.visibility_role, valueSourceRole: truth.value_source_role,
      provenance: truth.provenance, visibleWhen: truth.visible_when, requiredWhen: truth.required_when,
      runtimeProfileClassification: truth.runtime_profile_classification, formulaConsumers: truth.formula_consumers,
      resourceBranchConsumers: truth.resource_branch_consumers, guide: { guideKind: guide.guide_kind, guideShortRu: guide.guide_short_ru,
        guideValidationPolicy: guide.guide_validation_policy, sourceRole: guide.source_role, sourceDocument: guide.source_document,
        sourceLocator: guide.source_locator, sourceSnapshotHash: guide.source_snapshot_hash, guideVersion: guide.guide_version } };
  }) as CanonicalEstimateCatalogItem["parameterSchema"],
};
const fresh = (parameters: Record<string, string> = {}, missingParameterIds: string[] = []) => buildConsumerCanonicalPrecompileParameterSession({
  catalog, draftId: "TEST_ONLY_FRESH_ASPHALT_LEVEL", parameters, missingParameterIds, userExplicitParameterIds: Object.keys(parameters), textExtractedParameterIds: [],
});

it("retains area and thickness from the real ordinary request without populating the inactive predecessor or logistics", () => {
  const plan = buildCanonicalBaselinePlan({ catalog,
    prompt: "Выравнивающий слой асфальтобетона, площадь 1000 м², общая толщина 30 мм. Основание подготовлено, доступна механизированная укладка." });
  expect(plan.parameters[id("area_m2")]).toBe("1000");
  expect(plan.parameters[id("layer_thickness_mm")]).toBe("30");
  expect(plan.parameters).not.toHaveProperty("thickness_mm");
  expect(plan.parameters).not.toHaveProperty("area_m2");
  expect(plan.parameters).not.toHaveProperty(id("haul_distance_km"));
});

it("opens the real fresh editor with four physical facts and six advanced details, without a public legacy method or its 19 fields", async () => {
  const initial = fresh(), cards = buildCanonicalParameterCards({ session: initial, revision: null });
  expect(catalog.titleRu).toBe("Выравнивающий слой асфальтобетона");
  expect(cards.filter((card) => card.consumerInputRole === "OBJECT_FACT").map((card) => card.key).sort()).toEqual([...next.ordinaryParameterIds].sort());
  expect(cards.filter((card) => card.consumerInputRole === "ADVANCED_OPTION")).toHaveLength(6);
  expect(cards.filter((card) => card.consumerInputRole === "OBJECT_FACT").every((card) => card.value === null)).toBe(true);
  expect(initial.parameters.some((parameter) => parameter.parameterId === profile.methodParameterId)).toBe(false);
  const oldIds = parent.parameters.map((parameter) => parameter.parameter_id);
  expect(cards.some((card) => oldIds.includes(card.key))).toBe(false);
  const staleNeeds = fresh({}, oldIds);
  expect(staleNeeds.parameters.some((parameter) => oldIds.includes(parameter.parameterId))).toBe(false);
  expect(consumerCanonicalPrecompileParameterOverrides({ session: initial, patches: [] })).toEqual({});

  const measured = { [id("area_m2")]: "100", [id("layer_thickness_mm")]: "100", [profile.siteParameterId]: profile.siteRu };
  const session = fresh(measured), submitted = consumerCanonicalPrecompileParameterOverrides({ session, patches: [] });
  expect(submitted).not.toHaveProperty(profile.methodParameterId); expect(submitted).not.toHaveProperty("area_m2");
  const plan = buildCanonicalBaselinePlan({ catalog, prompt: profile.methodRu, parameterOverrides: submitted });
  expect(plan.primaryMeasureParameterId).toBe(id("area_m2"));
  expect(plan.parameters).not.toHaveProperty(profile.methodParameterId); expect(plan.parameters).not.toHaveProperty("area_m2");
  const runtime = canonicalApprovedBaselineRuntimeParameters({
    input_values: { ...parent.baseline.input_values, ...measured, ...next.runtimeProfileInput },
    input_classification: { ...parent.baseline.input_classification,
      ...Object.fromEntries(Object.keys(measured).map((parameter) => [parameter, "VALIDATION_FIXTURE"])), ...next.runtimeProfileClassification },
  });
  expect(runtime[profile.methodParameterId]).toBe(profile.methodRu);
  for (const parameter of next.ordinaryParameterIds) expect(runtime).not.toHaveProperty(parameter);
  expect(runtime).not.toHaveProperty("area_m2");
  const result = await compileCanonicalEstimateCore({ operation: "compile", compilerVersion: profile.contract,
    catalogId: profile.catalogId, primaryMeasureParameterId: plan.primaryMeasureParameterId,
    parameterDefinitions: next.parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],
    formulaDefinitions: next.formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
    resourceDefinitions: next.resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"],
    submittedParameters: plan.parameters, confirmedParameters: runtime, rowOverrides: {}, priceItems: [], currencyCode: "KGS",
    maximumResourceRows: 128, hashJson: estimateDeterministicHash });
  expect(result.rows.find((row) => row.row_id === id("asphalt:material:hot-dense-fine-mix"))?.quantity).toBe("23.58");
  expect(result.rows.every((row) => row.row_id.startsWith(profile.namespace))).toBe(true);
  expect(result.parameters.area_m2).toBeUndefined();
  const missing = new Set(result.preliminaryNeeds.flatMap((need) => need.missing_parameter_ids));
  for (const parameter of next.projectFactParameterIds) expect(missing.has(parameter)).toBe(true);
  const needsSession = fresh(measured, [...missing]);
  expect(needsSession.parameters.some((parameter) => oldIds.includes(parameter.parameterId) || parameter.parameterId === profile.methodParameterId)).toBe(false);
  expect(buildCanonicalParameterCards({ session: needsSession, revision: null }).filter((card) => card.consumerInputRole === "ADVANCED_OPTION")).toHaveLength(6);
});
