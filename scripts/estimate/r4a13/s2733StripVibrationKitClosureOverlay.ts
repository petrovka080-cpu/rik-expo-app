import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { anchorGroupVibrationAcceptanceInputR1 } from "../../../src/lib/estimate/v4/anchorGroupVibrationR1";
import { CONCRETE_SLAB_VIBRATION_SOURCE_ID, type ConcreteSlabVibrationContextKey } from "../../../src/lib/estimate/v4/concreteSlabVibrationR1";
import { FOUNDATION_CURING_PROFILE_TARGETS_S2733 } from "./s2733FoundationCuringProfileOverlay";
import { STANDALONE_LEVELING_COMPLETION_TARGETS_S2733 } from "./s2733StandaloneLevelingCompletionOverlay";
import { STANDALONE_VIBRATION_COMPLETION_TARGETS_S2733 } from "./s2733StandaloneVibrationCompletionOverlay";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const STRIP_VIBRATION_KIT_CLOSURE_S2733_CONTRACT = "strip-vibration-and-actual-kit-closure:s27-33.v1";
const contexts = { standard: "в стандартной зоне", high_load: "в зоне высокой нагрузки", large_area: "на большом участке",
  small_area: "на малом участке", technical_room: "в техническом помещении", wet_zone: "во влажной зоне" } as const;
export const STRIP_VIBRATION_NEW_TARGETS_S2733 = Object.keys(contexts).map(context => `canonical-work:base:concrete_foundation_interior_strip_foundation_vibrate_${context}`);
export const STRIP_VIBRATION_KIT_CLOSURE_TARGETS_S2733 = [...FOUNDATION_CURING_PROFILE_TARGETS_S2733,
  ...STANDALONE_LEVELING_COMPLETION_TARGETS_S2733, ...STANDALONE_VIBRATION_COMPLETION_TARGETS_S2733, ...STRIP_VIBRATION_NEW_TARGETS_S2733].sort();
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_STRIP_VIBRATION_KIT_CLOSURE:${code}`); }
const kitCounts = {
  "material:concrete:curing-application-included-kit": "application_equipment_accessories_set_count",
  "material:concrete:leveling-guide-included-kit": "leveling_guide_accessories_set_count",
  "material:concrete:leveling-equipment-included-kit": "leveling_equipment_accessories_set_count",
  "material:concrete:vibration-equipment-included-kit": "vibration_equipment_accessories_set_count",
} as const;
function protectCount(r: PurchaseGroupRepresentative) {
  const rows = r.resources.filter(row => Object.prototype.hasOwnProperty.call(kitCounts, row.row_id));
  invariant(rows.length === (String(r.definition.catalog_id).includes("_level_") ? 2 : 1), "INCLUDED_KIT_SCOPE_DRIFT");
  for (const row of rows) {
    const countId = kitCounts[row.row_id as keyof typeof kitCounts];
    const count = r.parameters.find(p => p.parameter_id === countId), formula = r.formulas.find(f => f.formula_id === row.formula_id);
    invariant(count?.value_type === "integer" && count.unit_id === "set" && count.default_value == null
      && formula?.expression_source === countId && formula.input_parameter_ids.includes(countId), "ACTUAL_COUNT_OWNER_DRIFT");
    invariant(row.unit_id === "set" && row.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS"
      && row.resource_graph.includedInResourceOwnerRowId && row.procurement_eligible === false, "INCLUDED_COST_OWNER_DRIFT");
    invariant(Array.isArray(row.resource_graph.inputParameterIds) && !row.resource_graph.inputParameterIds.includes(countId), "ALREADY_CLOSED_OR_UNKNOWN_KIT");
    row.resource_graph = { ...row.resource_graph, inputParameterIds: [...row.resource_graph.inputParameterIds, countId] };
  }
  return rows.map(row => row.row_id);
}
const publicText = (value: string) => value.replaceAll("основания анкерной группы", "ленточного фундамента")
  .replaceAll("оснований анкерных групп", "ленточного фундамента").replaceAll("Основание анкерной группы", "Ленточный фундамент");

/** Reuse the delivered internal-vibration owner for a fresh cast strip
 * foundation. The obsolete all-concrete recipe is not a physical source.
 * Actual complete-kit counts are mandatory facts in every affected included
 * resource; a supplier quantity override cannot invent a project takeoff. */
export function overlayS2733StripVibrationKitClosure(parent: PurchaseGroupRepresentative, source: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(STRIP_VIBRATION_KIT_CLOSURE_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  if (!STRIP_VIBRATION_NEW_TARGETS_S2733.includes(catalogId)) {
    const expected = FOUNDATION_CURING_PROFILE_TARGETS_S2733.includes(catalogId) ? [15, 37]
      : STANDALONE_LEVELING_COMPLETION_TARGETS_S2733.includes(catalogId) ? [9, 27] : [parent.resources.length === 7 ? 7 : 6, 16];
    invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_SCOPE_DRIFT");
    const r = structuredClone(parent), targetRowIds = protectCount(r);
    return { representative: r, targetRowIds, addedParameterIds: [], addedFormulaIds: [], changedFormulaIds: [], retiredLegacyResourceRowIds: [], contract: STRIP_VIBRATION_KIT_CLOSURE_S2733_CONTRACT };
  }
  invariant(parent.resources.length === 59 && parent.parameters.length === 1 && parent.parameters[0]?.parameter_id === "q"
    && parent.parameters[0]?.default_value === 100 && parent.definition.source_metadata.contract === "rik-expo-app.r568.r4-a6-group50-default-binding-remediation.v2"
    && parent.formulas.every(f => f.input_parameter_ids.every((id: string) => id === "q")), "EXACT_OBSOLETE_RECIPE_REQUIRED");
  invariant(source.definition.catalog_id === "canonical-work:base:concrete_foundation_interior_anchor_group_vibrate_high_load"
    && source.resources.length === 6 && source.parameters.length === 16 && source.parameters.every(p => p.default_value == null)
    && source.definition.applicability.approvedMethod === "INTERNAL_VIBRATION"
    && source.definition.applicability.universalProductivityClaimed === false, "EXACT_DELIVERED_PHYSICAL_SOURCE_REQUIRED");
  const context = (Object.keys(contexts) as ConcreteSlabVibrationContextKey[]).find(key => catalogId.endsWith(`_vibrate_${key}`))!;
  const title = `Виброуплотнение бетона ленточного фундамента ${contexts[context as keyof typeof contexts]}`;
  const r: PurchaseGroupRepresentative = structuredClone(source);
  r.definition = { ...parent.definition, passport: { ...source.definition.passport, workKey: catalogId.replace("canonical-work:base:", ""), catalogId,
    canonicalRuName: title, physicalResultRu: title, stripVibrationKitClosureContract: STRIP_VIBRATION_KIT_CLOSURE_S2733_CONTRACT },
    source_metadata: { ...source.definition.source_metadata, reusedSourceDefinitionId: source.definition.id, retiredLegacyDefinitionId: parent.definition.id },
    applicability: { ...source.definition.applicability, contextKey: context, contextRu: contexts[context as keyof typeof contexts],
      operationClass: "CONSOLIDATE_FRESH_CAST_STRIP_FOUNDATION_CONCRETE", universalConsumptionClaimed: false } };
  r.passport.physical_result_ru = title;
  r.passport.included_scope_ru = ["Виброуплотнение свежеуложенного бетона ленточного фундамента в выбранной захватке по утверждённому проектному способу",
    "Фактические трудозатраты, глубинный вибратор с полным составом принадлежностей и расходников, контроль и применимая мобилизация"];
  r.passport.excluded_scope_ru = ["Поставка смеси, армирование, опалубка, укладка и последующий уход — отдельные операции"];
  for (const p of r.parameters) {
    p.title_ru = publicText(String(p.title_ru));
    const guide = { ...p.truth_metadata.guide, guide_short_ru: publicText(String(p.truth_metadata.guide.guide_short_ru)) };
    p.truth_metadata = { ...p.truth_metadata, guide, semantic_parameter_key: `${catalogId}:${p.parameter_id}` };
    r.baseline.guide_provenance_ru[p.parameter_id] = guide.guide_short_ru;
  }
  for (const row of r.resources) {
    row.title_ru = publicText(String(row.title_ru)); row.semantic_owner = `${catalogId}:${row.row_id}`;
    const operation = row.resource_graph.operationCompositionV1;
    invariant(operation?.operationId, "DELIVERED_OPERATION_REFERENCE_REQUIRED");
    row.resource_graph = { ...row.resource_graph, semanticOwnerId: row.semantic_owner,
      operationCompositionV1: { ...operation, groupId: catalogId, groupTitleRu: title } };
  }
  const fixture = anchorGroupVibrationAcceptanceInputR1(context);
  r.baseline.input_values = { ...fixture, placement_location: `DEMO: ${title}; контрольная захватка`,
    concrete_mix_reference: `DEMO-STRIP-VIB-${context}-MIX-REV-A`, method_statement_reference: `DEMO-STRIP-VIB-${context}-METHOD-REV-A` };
  r.baseline.input_classification = Object.fromEntries(Object.keys(r.baseline.input_values).map(id => [id, "VALIDATION_FIXTURE"]));
  r.baseline.proposal_source_refs = [...r.baseline.proposal_source_refs, { contract: STRIP_VIBRATION_KIT_CLOSURE_S2733_CONTRACT,
    reusedDefinitionId: source.definition.id, reusedCatalogId: source.definition.catalog_id, reusedDefinitionSha256: source.definition.definition_sha256,
    sourceId: CONCRETE_SLAB_VIBRATION_SOURCE_ID, controlValuesAreValidationFixtures: true, legacyRecipeReplacedForInapplicableScope: true }];
  for (const binding of r.bindings) binding.applicability = { ...binding.applicability, context_key: context,
    operation_class: "CONSOLIDATE_FRESH_CAST_STRIP_FOUNDATION_CONCRETE", material_system: "FRESH_CONCRETE" };
  protectCount(r);
  r.baseline.parameter_schema_sha256 = hash(r.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: r, targetRowIds: r.resources.map(row => row.row_id), addedParameterIds: r.parameters.map(p => p.parameter_id),
    addedFormulaIds: r.formulas.map(f => f.formula_id), changedFormulaIds: [], retiredLegacyResourceRowIds: parent.resources.map(row => row.row_id), contract: STRIP_VIBRATION_KIT_CLOSURE_S2733_CONTRACT };
}
