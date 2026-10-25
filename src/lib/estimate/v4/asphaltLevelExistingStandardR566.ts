import recipe from "../../../../data/estimate-benchmarks/source-packs/asphalt-level-existing-standard-r566.json";
import type { CanonicalEstimateParameterDefinition, CanonicalEstimateFormulaDefinition, CanonicalEstimateResourceDefinition } from "../backendPlatform/canonicalEstimateCompileCore";
import { namespaceAutomaticOwnerDefinitionR1 } from "./optionalAutomaticOwnerCompositionR1";
import type { AutomaticOwnerDefinition } from "./automaticConstructionOwnerR1";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import { buildMasterParameterCalculationConsumers } from "../backendPlatform/canonicalDefinitionParameterConsumersR1";

type Json = Record<string, any>;
type AuthoringParameter = CanonicalEstimateParameterDefinition & Json & {ordinal:number;title_ru:string;constraints_json:Json;truth_metadata:Json};
export type AsphaltLevelCapturedParentR566 = Readonly<{
  definition: Json; baseline: Json; parameters: readonly Json[]; formulas: readonly Json[];
  resources: readonly Json[]; bindings: readonly Json[]; normativeSources: readonly Json[]; normativeLocators: readonly Json[];
}>;
export const asphaltLevelExistingStandardR566 = recipe;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const equal = (left: unknown, right: unknown) => estimateDeterministicHash(left) === estimateDeterministicHash(right);
const requireThat = (value: unknown, code: string): void => { if (!value) throw Error("ASPHALT_LEVEL_R566_" + code); };
const selected = { kind: "equals", parameterId: recipe.methodParameterId, value: recipe.methodRu };
const legacy = { kind: "equals", parameterId: recipe.methodParameterId, value: recipe.legacyMethodRu };
const ready = { kind: "and", operands: [selected, { kind: "equals", parameterId: recipe.siteParameterId, value: recipe.siteRu }] };
const and = (left: unknown, right: unknown) => ({ kind: "and", operands: [left, right ?? { kind: "literal", value: true }] });

/** Pure retained-method authoring; all arithmetic still runs in the shared canonical compiler.
 * Historical recipe evidence cannot create a catalog work or replace the standard's old graph. */
export function appendAsphaltLevelExistingStandardR566(input: Readonly<{
  capturedParent: AsphaltLevelCapturedParentR566; capturedParentSha256: string;
  recipeParent: AsphaltLevelCapturedParentR566; recipeParentSha256: string;
}>) {
  const parent = clone(input.capturedParent), source = clone(input.recipeParent);
  const check = (value: AsphaltLevelCapturedParentR566, pin: typeof recipe.parents.standard, supplied: string) => {
    requireThat(supplied === pin.capturedParentSha256, "CAPTURE_SHA_PIN");
    requireThat(value.definition.id === pin.definitionId && value.definition.definition_version === pin.definitionVersion
      && value.definition.definition_sha256 === pin.definitionSha256, "DEFINITION_PIN");
    requireThat(equal([value.parameters.length, value.formulas.length, value.resources.length], pin.shape), "PARENT_SHAPE");
    requireThat(estimateDeterministicHash(value) === pin.semanticHash, "FULL_PARENT_SEMANTIC_PIN");
  };
  check(parent, recipe.parents.standard, input.capturedParentSha256);
  check(source, recipe.parents.recipeEvidence, input.recipeParentSha256);
  requireThat(parent.definition.catalog_id === recipe.catalogId && parent.bindings.length === 0, "EXISTING_STANDARD_REQUIRED");
  requireThat(source.bindings.length === 1 && equal(source.normativeSources, [recipe.sourceRegistry])
    && equal(source.normativeLocators, [recipe.locatorRegistry]), "ACTUAL_RECIPE_REGISTRY_PIN");
  requireThat(source.bindings[0]!.locator_id === recipe.locatorRegistry.id
    && equal(source.bindings[0]!.applicability, recipe.historicalBindingEvidence.applicability), "ACTUAL_BINDING_PIN");
  const boundRow = source.resources.find((row) => row.id === source.bindings[0]!.resource_spec_id);
  requireThat(boundRow?.row_id === recipe.historicalBindingEvidence.resourceRowId, "ACTUAL_BOUND_ROW_PIN");

  const prefix = recipe.namespace, parameterId = (id: string) => prefix + id, rowId = (id: string) => prefix + id;
  const originalParameters = new Set(source.parameters.map((parameter) => parameter.parameter_id));
  const originalRows = new Set(source.resources.map((row) => row.row_id));
  const originalFormulas = new Set(source.formulas.map((formula) => formula.formula_id));
  // This subject fix-up covers reference fields beyond the generic composition helper's vocabulary.
  // Source prose, enum values and immutable registry evidence are never interpreted as formulas.
  const referenceKeys = new Set(["primaryMeasureParameterId", "parentCostOwnerId", "costOwnerId", "ownerRowId",
    "sourceRowId", "sourceFormulaId", "parameterId", "parameter_id", "inputParameterIds", "input_parameter_ids",
    "resource_branch_consumers", "sourceScheduleParameterIds", "scopeContextParameterIds", "coveredRowIds",
    "coveringRowIds", "includedInResourceOwnerRowId", "purchaseBalanceOwnerRowId"]);
  const fixReferences = (value: unknown, key = ""): any => {
    if (typeof value === "string") {
      if (value === source.definition.catalog_id) return recipe.catalogId;
      if (referenceKeys.has(key)) {
        if (originalParameters.has(value)) return parameterId(value);
        if (originalRows.has(value)) return rowId(value);
        if (originalFormulas.has(value)) return prefix + value;
      }
      return value;
    }
    if (Array.isArray(value)) return value.map((item) => fixReferences(item, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([field, child]) => [field, fixReferences(child, field)]));
    return value;
  };
  const namespace = namespaceAutomaticOwnerDefinitionR1({
    definition: { parameters: source.parameters, formulas: source.formulas, resources: source.resources,
      runtimeInput: {}, runtimeClassification: {}, runtimeSourceIds: {}, ordinaryParameterIds: ["area_m2", "layer_thickness_mm"] } as unknown as AutomaticOwnerDefinition,
    prefix, titlePrefixRu: "Выравнивающий слой: ",
  });
  const constants = recipe.normativeConstants as Record<string, number>;
  const assumptions = recipe.selectedPreliminaryProfile.declaredValues as Record<string, number>;
  const ordinaryMeasurements = new Set<string>(recipe.ordinaryProjectMeasurements);
  const parameterSources: Record<string, { kind: "KNOWN" | "DERIVED"; sourceIds: string[] }> = {};
  const objectTruth = (ordinary: boolean) => ({ visibility_role: "USER_INPUT", value_source_role: "PROJECT_SPECIFIC_INPUT",
    source_confirmation_required: false, hidden_default_forbidden: true, ordinary_question: ordinary, visible_when: { kind: "literal", value: true },
    provenance: { consumer_input_role_v1: ordinary ? "OBJECT_FACT" : "ADVANCED_OPTION" }, project_fact_not_assumed: true,
    guide: { guide_kind: ordinary ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
      guide_short_ru: "Укажите фактические данные объекта; неподтверждённые значения автоматически не назначаются.",
      source_role: ordinary ? "USER_SUPPLIED_OBJECT_FACT" : "PROJECT_DOCUMENTATION", guide_validation_policy: "MANDATORY_BLOCK",
      applicability: recipe.sourceRegistry.metadata.useRestriction,
      verified_at: source.parameters[0]!.truth_metadata.guide.verified_at,
      source_document: recipe.contract, source_locator: "asphalt-level-existing-standard-r566.json:ordinaryProjectMeasurements/projectFactParameterIds",
      source_snapshot_hash: recipe.captureResultSha256, guide_version: recipe.contract },
  });
  const newParameters = namespace.parameters.map((parameter) => {
    const original = String(parameter.truth_metadata.originalComponentParameterId), normative = Object.hasOwn(constants, original);
    const assumed = Object.hasOwn(assumptions, original), fixed = normative || assumed;
    const { id: _id, definition_version_id: _definition, created_at: _created, ...body } = parameter as Json;
    const truth: Json = { ...parameter.truth_metadata, semantic_parameter_key: prefix + original,
      source_confirmation_required: false, hidden_default_forbidden: true, runtime_profile_value: false,
      guide: { ...(parameter.truth_metadata.guide as Json), guide_version: recipe.contract,
        guide_short_ru: normative ? "Опубликованное значение КРЕР задаётся выбранной технологией; не вводится пользователем."
          : assumed ? "Видимое предварительное значение выбранного логистического профиля; не является нормой КРЕР."
          : original === "area_m2" ? "Укажите измеренную площадь выравнивающего слоя."
          : original === "layer_thickness_mm" ? "Укажите общую проектную толщину: от 30 до 200 мм, шаг 5 мм. Послойную схему подтверждает проект или ППР."
          : "Требуется подтверждённый факт проекта, маршрута или ведомости; автоматически не назначается.",
        source_role: normative ? "OFFICIAL_KRER_RESOURCE_RATE" : assumed ? "VISIBLE_SELECTED_PRELIMINARY_PROFILE" : "PROJECT_OBJECT_FACT",
        source_locator: normative ? recipe.locatorRegistry.locator.exactLocator : recipe.contract,
        normative_claimed: normative },
    };
    if (fixed) {
      const value = normative ? constants[original]! : assumptions[original]!;
      Object.assign(truth, { visibility_role: "USER_DERIVED_READONLY", value_source_role: normative ? "BACKEND_DERIVED_NORMATIVE_CONSTANT" : "BACKEND_DERIVED_VISIBLE_PRELIMINARY_ASSUMPTION",
        runtime_profile_classification: normative ? "NORMATIVE" : "ASSUMPTION", catalogue_owned_lookup_v1: true,
        derived_exact_lookup_v1: { version: "canonical-derived-exact-lookup:v1", inputParameterIds: [recipe.methodParameterId],
          rows: [{ inputValues: [recipe.methodRu], outputValue: value }], interpolation: "FORBIDDEN" },
        provenance: { consumer_input_role_v1: "APPLICATION_TECHNICAL", source_id: recipe.sourceId,
          ...(normative ? { normative_source_id: recipe.sourceId, normative_locator_id: recipe.locatorRegistry.id }
            : { selected_preliminary_profile: recipe.selectedPreliminaryProfile.version, normative_claimed: false, visible_assumption_value: value }) },
      });
      parameterSources[parameter.parameter_id] = { kind: "DERIVED", sourceIds: [recipe.sourceId] };
    } else {
      const factTruth = objectTruth(ordinaryMeasurements.has(original));
      const detail = truth.guide.guide_short_ru;
      Object.assign(truth, factTruth, { runtime_profile_classification: null, guide: { ...factTruth.guide, guide_short_ru: detail } });
      delete truth.derived_exact_lookup_v1; delete truth.catalogue_owned_lookup_v1;
      parameterSources[parameter.parameter_id] = { kind: "KNOWN", sourceIds: [recipe.sourceId] };
    }
    const measuredTitle = ({ area_m2: "Площадь выравнивающего слоя, м²", layer_thickness_mm: "Общая толщина слоя, мм",
      haul_distance_km: "Дальность доставки от завода, км" } as Record<string, string>)[original];
    return { ...body, ...(measuredTitle ? { title_ru: measuredTitle } : {}), parameter_id: parameter.parameter_id, required: false, default_value: null,
      constraints_json: fixReferences(parameter.constraints_json), truth_metadata: truth } as CanonicalEstimateParameterDefinition;
  });
  const selectors: AuthoringParameter[] = [
    { parameter_id: recipe.methodParameterId, ordinal: parent.parameters.length, value_type: "enum", unit_id: null,
      title_ru: recipe.methodRu, required: false, default_value: null,
      constraints_json: { values: [recipe.methodRu] }, truth_metadata: {
        contract: recipe.contract, semantic_parameter_key: recipe.methodParameterId, visibility_role: "INTERNAL_ONLY",
        value_source_role: "BACKEND_DERIVED", visible_when: { kind: "literal", value: false },
        runtime_profile_classification: "RUNTIME_STRUCTURAL_DEFAULT", runtime_profile_value: true, source_confirmation_required: false,
        provenance: { consumer_input_role_v1: "APPLICATION_TECHNICAL", publicSelectedWorkTitleRu: recipe.methodRu,
          physicalMethodFixedByPublicWork: true, historicalOracleValueIsNotAPublicOption: true },
        guide: { ...objectTruth(false).guide, guide_kind: "PROJECT_DEFINED", source_role: "BACKEND_DERIVED",
          guide_short_ru: "Выбранная публичная работа определяет технологию выравнивающего слоя." },
        resource_branch_consumers: [...parent.resources.map((row) => row.row_id), ...namespace.resources.map((row) => row.row_id)] } },
    { parameter_id: recipe.siteParameterId, ordinal: parent.parameters.length + 1, value_type: "enum", unit_id: null,
      title_ru: "Основание принято и доступно механизированной укладке?", required: false, default_value: null,
      constraints_json: { values: [recipe.siteRu] }, truth_metadata: { ...objectTruth(true), contract: recipe.contract, semantic_parameter_key: recipe.siteParameterId,
        resource_branch_consumers: namespace.resources.map((row) => row.row_id) } },
  ];
  for (const parameter of selectors) parameterSources[parameter.parameter_id] = { kind: "KNOWN", sourceIds: [recipe.sourceId] };
  parameterSources[recipe.methodParameterId] = { kind: "DERIVED", sourceIds: [recipe.sourceId] };
  const parameters:AuthoringParameter[] = [...parent.parameters.map((parameter) => ({ ...parameter, required: false,
    truth_metadata: { ...parameter.truth_metadata, visible_when: { kind: "literal", value: false } },
    constraints_json: { ...parameter.constraints_json,
      ...(parameter.required ? { requiredWhen: and(legacy, parameter.constraints_json?.requiredWhen) } : {}) } })),
    ...selectors, ...newParameters].map((parameter, ordinal) => ({ ...parameter as AuthoringParameter, ordinal }));
  const formulas = [...parent.formulas, ...namespace.formulas.map((formula) => {
    const { id: _id, definition_version_id: _definition, created_at: _created, ...body } = formula as Json;
    return body as CanonicalEstimateFormulaDefinition;
  })];
  const newRows = namespace.resources.map((resource) => {
    const { definition_version_id: _definition, created_at: _created, row_sha256: _oldRowHash, ...body } = resource as CanonicalEstimateResourceDefinition & Json;
    const graph = fixReferences(resource.resource_graph);
    const changed = { ...body, inclusion_ast: and(ready, resource.inclusion_ast),
      resource_graph: { ...graph, semanticOwnerId: prefix + resource.source_metadata!.originalComponentRowId,
        primaryMeasureParameterId: parameterId("area_m2"),
        inputParameterIds: [...new Set([...(Array.isArray(graph.inputParameterIds) ? graph.inputParameterIds : []), recipe.methodParameterId, recipe.siteParameterId])],
        visibleAssumptionPolicy: "Числовые нормы задаёт КРЕР. Параметры грузовика — видимый выбранный предварительный профиль. Маршрут, контроль, документы, движение и мобилизация не назначаются автоматически.",
        ordinaryProjectFactBudget: recipe.ordinaryFactBudget },
      source_metadata: { ...fixReferences(resource.source_metadata), selectedCatalogId: recipe.catalogId,
        historicalRecipeDefinitionId: source.definition.id, historicalRecipeCaptureSha256: input.recipeParentSha256,
        retainedMethodTransfer: recipe.contract, automaticLegacyPriceInheritanceAllowed: false, fullTechnicalAcceptance: false },
    };
    return { ...changed, row_sha256: estimateDeterministicHash(changed) } as CanonicalEstimateResourceDefinition;
  });
  const resources = [...parent.resources.map((resource) => {
    const { row_sha256: _oldHash, ...retained } = resource;
    const changed = { ...retained, inclusion_ast: and(legacy, resource.inclusion_ast) };
    return { ...changed, row_sha256: estimateDeterministicHash(changed) };
  }), ...newRows].map((resource, ordinal) => ({ ...resource as CanonicalEstimateResourceDefinition, ordinal }));
  const ordinaryParameterIds = [parameterId("area_m2"), parameterId("layer_thickness_mm"), recipe.siteParameterId, parameterId("haul_distance_km")];
  requireThat(ordinaryParameterIds.length === recipe.ordinaryFactBudget, "ORDINARY_FACT_BUDGET");
  requireThat(new Set(resources.map((row) => row.row_id)).size === resources.length
    && new Set(parameters.map((parameter) => parameter.parameter_id)).size === parameters.length
    && new Set(formulas.map((formula) => formula.formula_id)).size === formulas.length, "COMPOSITION_ID_COLLISION");
  const consumers = buildMasterParameterCalculationConsumers({ parameters, formulas, resources });
  const publishedParameters = parameters.map((parameter) => parent.parameters.some((old) => old.parameter_id === parameter.parameter_id)
    ? parameter : { ...parameter, truth_metadata: { ...parameter.truth_metadata,
      formula_consumers: consumers.formulaConsumers[parameter.parameter_id], resource_branch_consumers: consumers.resourceConsumers[parameter.parameter_id] } });
  return { parameters: publishedParameters, formulas, resources, ordinaryParameterIds, parameterSources,
    newlySourceBoundRowIds: [rowId(recipe.historicalBindingEvidence.resourceRowId)],
    primaryMeasureParameterId: parameterId("area_m2"),
    runtimeProfileInput: { [recipe.methodParameterId]: recipe.methodRu },
    runtimeProfileClassification: { [recipe.methodParameterId]: "RUNTIME_STRUCTURAL_DEFAULT" as const },
    runtimeProfileSourceIds: { [recipe.methodParameterId]: [recipe.sourceId] },
    projectFactParameterIds: recipe.projectFactParameterIds.map(parameterId),
    normativeParameterIds: Object.keys(constants).map(parameterId), assumedProfileParameterIds: Object.keys(assumptions).map(parameterId),
  };
}
