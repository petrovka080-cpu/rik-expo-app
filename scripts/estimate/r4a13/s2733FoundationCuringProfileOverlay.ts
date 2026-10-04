import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { concreteSlabCuringAcceptanceInputR1, type ConcreteSlabCuringContextKey, CONCRETE_SLAB_CURING_SOURCE_ID } from "../../../src/lib/estimate/v4/concreteSlabCuringR1";
import { overlayS2732PurchaseGroup, S2733_CURING_MATERIAL_PURCHASE_CATALOG_IDS, type PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const FOUNDATION_CURING_PROFILE_S2733_CONTRACT = "foundation-curing-existing-profile:s27-33.v1";
const contexts = { standard: "в стандартной зоне", high_load: "в зоне высокой нагрузки", large_area: "на большом участке",
  small_area: "на малом участке", technical_room: "в техническом помещении", wet_zone: "во влажной зоне" } as const;
const families = { slab_foundation: "плитного фундамента", stairs_concrete: "монолитной лестницы", strip_foundation: "ленточного фундамента" } as const;
export const FOUNDATION_CURING_NEW_PROFILE_TARGETS_S2733 = Object.keys(families).flatMap(family => Object.keys(contexts)
  .map(context => `canonical-work:base:concrete_foundation_interior_${family}_cure_${context}`));
export const FOUNDATION_CURING_PROFILE_TARGETS_S2733 = S2733_CURING_MATERIAL_PURCHASE_CATALOG_IDS;
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_FOUNDATION_CURING_PROFILE:${code}`); }

/** Forward replacement of the exact obsolete all-concrete 59-row recipe.
 * Reuse the already delivered ACI project-method owner and its equipment/water
 * completion. No existing estimate/revision is rewritten. Control baseline
 * values are fixtures, never defaults or a kg/m3/area/productivity norm. */
export function overlayS2733FoundationCuringProfile(parent: PurchaseGroupRepresentative, source: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(FOUNDATION_CURING_PROFILE_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  if (!FOUNDATION_CURING_NEW_PROFILE_TARGETS_S2733.includes(catalogId)) {
    const balance = overlayS2732PurchaseGroup(parent, { curingMaterialOwners: true });
    return { ...balance, addedFormulaIds: [], retiredLegacyResourceRowIds: [], contract: FOUNDATION_CURING_PROFILE_S2733_CONTRACT };
  }
  invariant(parent.resources.length === 59 && parent.parameters.length === 1 && parent.parameters[0]?.parameter_id === "q"
    && parent.parameters[0]?.default_value === 100, "OBSOLETE_RECIPE_SCOPE_DRIFT");
  invariant(parent.definition.source_metadata.contract === "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2", "OBSOLETE_RECIPE_IDENTITY");
  invariant(parent.formulas.every(f => f.input_parameter_ids.every((id: string) => id === "q")), "NON_GENERIC_PHYSICAL_SOURCE_MUST_NOT_BE_REPLACED");
  invariant(source.definition.catalog_id === "canonical-work:base:concrete_foundation_interior_concrete_slab_cure_high_load"
    && source.resources.length === 11 && source.parameters.length === 31 && source.parameters.every(p => p.default_value == null)
    && source.definition.applicability.universalConsumptionClaimed === false && source.definition.applicability.universalProductivityClaimed === false, "ACCEPTED_SOURCE_PROFILE_REQUIRED");
  const family = (Object.keys(families) as (keyof typeof families)[]).find(key => catalogId.includes(`_${key}_cure_`))!;
  const context = (Object.keys(contexts) as ConcreteSlabCuringContextKey[]).find(key => catalogId.endsWith(`_cure_${key}`))!;
  const title = `Уход за бетоном ${families[family]} ${contexts[context]}`;
  const r: PurchaseGroupRepresentative = structuredClone(source);
  r.definition = { ...parent.definition, passport: { ...source.definition.passport, workKey: catalogId.replace("canonical-work:base:", ""), catalogId,
    canonicalRuName: title, physicalResultRu: title, foundationCuringProfileContract: FOUNDATION_CURING_PROFILE_S2733_CONTRACT },
    source_metadata: { ...source.definition.source_metadata, reusedSourceDefinitionId: source.definition.id, retiredLegacyDefinitionId: parent.definition.id },
    applicability: { ...source.definition.applicability, contextKey: context, contextRu: contexts[context], materialSystem: "FRESH_CAST_IN_PLACE_CONCRETE" } };
  r.passport.physical_result_ru = title;
  r.passport.included_scope_ru = ["Объём бетона и измеренная открытая поверхность только в границе ухода за выбранной конструкцией",
    "Материалы, труд, оборудование, полная комплектность оборудования и логистика выбранного проектом способа внешнего ухода",
    "Контроль результата по проектной спецификации; расход и производительность не выводятся из объёма бетона"];
  for (const p of r.parameters) {
    p.title_ru = String(p.title_ru).replaceAll("бетонной плиты", "бетона выбранной конструкции").replaceAll("бетонной плитой", "бетоном выбранной конструкции");
    const guide = { ...p.truth_metadata.guide,
      guide_short_ru: String(p.truth_metadata.guide.guide_short_ru).replaceAll("бетонной плиты", "бетона выбранной конструкции").replaceAll("бетонной плитой", "бетоном выбранной конструкции") };
    p.truth_metadata = { ...p.truth_metadata, guide, semantic_parameter_key: `${catalogId}:${p.parameter_id}` };
    r.baseline.guide_provenance_ru[p.parameter_id] = guide.guide_short_ru;
  }
  for (const row of r.resources) {
    row.title_ru = String(row.title_ru).replaceAll("бетонной плиты", "бетона выбранной конструкции");
    row.semantic_owner = `${catalogId}:${row.row_id}`;
    const operation = row.resource_graph.operationCompositionV1;
    invariant(operation?.operationId, "DELIVERED_OPERATION_REFERENCE_REQUIRED");
    row.resource_graph = { ...row.resource_graph, semanticOwnerId: row.semantic_owner,
      operationCompositionV1: { ...operation, groupId: catalogId, groupTitleRu: title } };
  }
  for (const b of r.bindings) b.applicability = { ...b.applicability, context_key: context,
    operation_class: "EXTERNAL_CURING_OF_CAST_IN_PLACE_CONCRETE", material_system: "FRESH_CAST_IN_PLACE_CONCRETE" };
  r.baseline.input_values = { ...concreteSlabCuringAcceptanceInputR1(context), curing_location: `DEMO: ${title}; контрольная захватка`,
    concrete_mix_reference: `DEMO-${family}-${context}-MIX-REV-A`, curing_method_statement_reference: `DEMO-${family}-${context}-CURE-REV-A` };
  r.baseline.input_classification = Object.fromEntries(Object.keys(r.baseline.input_values).map(id => [id, "VALIDATION_FIXTURE"]));
  r.baseline.parameter_schema_sha256 = hash(r.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  r.baseline.proposal_source_refs = [...r.baseline.proposal_source_refs, { contract: FOUNDATION_CURING_PROFILE_S2733_CONTRACT,
    reusedDefinitionId: source.definition.id, reusedCatalogId: source.definition.catalog_id, reusedDefinitionSha256: source.definition.definition_sha256,
    sourceId: CONCRETE_SLAB_CURING_SOURCE_ID, controlValuesAreValidationFixtures: true, legacyRecipeReplacedForInapplicableScope: true }];
  const balance = overlayS2732PurchaseGroup(r, { curingMaterialOwners: true });
  return { representative: balance.representative, targetRowIds: r.resources.map(row => row.row_id), addedParameterIds: balance.representative.parameters.map(p => p.parameter_id),
    addedFormulaIds: r.formulas.map(f => f.formula_id), changedFormulaIds: [], retiredLegacyResourceRowIds: parent.resources.map(row => row.row_id),
    contract: FOUNDATION_CURING_PROFILE_S2733_CONTRACT };
}
