import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildAnchorGroupWaterCuringResourcesS2733, ANCHOR_WATER_CURING_S2733_CONTRACT, ANCHOR_WATER_CURING_ROWS } from "../../../src/lib/estimate/v4/anchorGroupWaterCuringResourcesS2733";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
import { CONCRETE_SLAB_CURING_SOURCE_ID } from "../../../src/lib/estimate/v4/concreteSlabCuringR1";

export const ANCHOR_WATER_CURING_TARGETS_S2733 = ["standard", "repair", "technical_room", "wet_zone"]
  .map(context => `canonical-work:base:concrete_foundation_interior_anchor_group_pour_${context}`);
export const COMPOSITE_WATER_CURING_TARGETS_S2733 = ["concrete_slab", "stairs_concrete"].flatMap(family =>
  ["standard", "high_load", "repair", "technical_room", "wet_zone"]
    .filter(context => family !== "stairs_concrete" || context !== "standard")
    .map(context => `canonical-work:base:concrete_foundation_interior_${family}_form_${context}`));
const hash = (value: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(value)).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2733_ANCHOR_WATER:${code}`); }

/** Add the absent selected-water branch. Never replace the fifteen delivered
 * resources, their formulas or the previous group purchase policies. */
export function overlayS2733AnchorWaterCuring(parent: PurchaseGroupRepresentative, waterNormativeLocatorId: string) {
  return appendS2733WaterCuringResources(parent, waterNormativeLocatorId, {
    catalogIds: ANCHOR_WATER_CURING_TARGETS_S2733,
    groupId: "anchor-group-concrete-placement", groupTitleRu: "Бетонирование основания анкерной группы",
  });
}

export function appendS2733WaterCuringResources(parent: PurchaseGroupRepresentative, waterNormativeLocatorId: string,
  scope: { catalogIds: readonly string[]; groupId: string; groupTitleRu: string; applicabilityRu?: string;
    variant?: "S2733_COMPOSITE_SLAB_STAIRS" }) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(scope.catalogIds.includes(catalogId), "FINITE_SCOPE");
  const composite = scope.variant === "S2733_COMPOSITE_SLAB_STAIRS";
  if (composite) {
    invariant(COMPOSITE_WATER_CURING_TARGETS_S2733.includes(catalogId), "FINITE_COMPOSITE_SCOPE");
    const expected = catalogId.includes("concrete_slab_form_") ? [79, 203] : [50, 120];
    invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_COMPOSITE_ENVELOPE");
  } else invariant(parent.resources.length === 15, "EXPECTED_DELIVERED_SCOPE");
  invariant(/^[0-9a-f-]{36}$/u.test(waterNormativeLocatorId), "CURING_METHOD_LOCATOR_REQUIRED");
  const selectorId = composite ? "placement_curing_method" : "curing_method";
  const selector = parent.parameters.find(p => p.parameter_id === selectorId);
  invariant(selector && JSON.stringify(selector.constraints_json.values) === JSON.stringify(["membrane", "water"]), "EXISTING_WATER_CHOICE_DRIFT");
  const result: PurchaseGroupRepresentative = structuredClone(parent);
  const addition = buildAnchorGroupWaterCuringResourcesS2733(catalogId, scope.applicabilityRu, selectorId);
  const oldParameterIds = new Set(parent.parameters.map(p => String(p.parameter_id)));
  const oldFormulaIds = new Set(parent.formulas.map(f => String(f.formula_id)));
  const oldRowIds = new Set(parent.resources.map(r => String(r.row_id)));
  invariant(addition.formulas.every(f => !oldFormulaIds.has(f.formula_id)) && addition.resources.every(r => !oldRowIds.has(r.row_id)), "OWNER_COLLISION");
  const newParameters = addition.parameters.filter(p => !oldParameterIds.has(p.parameter_id));
  invariant(newParameters.every(p => p.default_value == null), "HIDDEN_DEFAULT");
  const parameterOffset = Math.max(...parent.parameters.map(p => Number(p.ordinal))) + 1;
  result.parameters.push(...newParameters.map((p, index) => ({ ...p, ordinal: parameterOffset + index })));
  result.formulas.push(...addition.formulas.map(formula => ({ ...formula, ast_sha256: hash(formula.ast) })));
  const resourceOffset = Math.max(...parent.resources.map(r => Number(r.ordinal))) + 1;
  const operation = { contractVersion: "canonical-operation-resource/v1", groupId: scope.groupId,
    groupTitleRu: scope.groupTitleRu, operationId: "curing", operationTitleRu: "Уход за бетоном",
    completionCriterionRu: "Выбранный способ ухода обеспечен материалами, трудом и применимым оборудованием; условия и завершение подтверждены по проекту." };
  result.resources.push(...addition.resources.map((r, index) => ({ ...r, ordinal: resourceOffset + index,
    row_type: r.category === "delivery" ? "service" : r.category, semantic_owner: `${catalogId}:${r.row_id}`, cost_owner_id: `${catalogId}:${r.row_id}`,
    resource_graph: { ...r.resource_graph, operationCompositionV1: operation,
      ...(r.row_id === ANCHOR_WATER_CURING_ROWS.accessories ? { includedInResourceOwnerRowId: ANCHOR_WATER_CURING_ROWS.equipment } : {}) } })));
  result.bindings.push(...addition.resources.map(row => ({ row_id: row.row_id, locator_id: waterNormativeLocatorId,
    applicability: { contract: ANCHOR_WATER_CURING_S2733_CONTRACT, quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
      universal_consumption_claimed: false, universal_productivity_claimed: false } })));
  // Existing curing labor remains its own original physical/cost owner.
  const labor = result.resources.find(r => r.row_id === "work:concrete:cure");
  invariant(labor, "EXISTING_CURING_LABOR_MISSING");
  labor.resource_graph = { ...labor.resource_graph, operationCompositionV1: operation };
  result.definition.applicability = { ...result.definition.applicability, deferMissingProjectFactsToRows: true };
  for (const p of newParameters) {
    const target = result.parameters.find(value => value.parameter_id === p.parameter_id)!;
    const formulaConsumers = addition.formulas.filter(f => f.input_parameter_ids?.includes(p.parameter_id)).map(f => f.formula_id);
    const resourceConsumers = addition.resources.filter(r => JSON.stringify(r.resource_graph).includes(`"${p.parameter_id}"`)
      || formulaConsumers.includes(r.formula_id)).map(r => r.row_id);
    target.truth_metadata = { ...target.truth_metadata, formula_consumers: formulaConsumers, resource_branch_consumers: resourceConsumers };
    result.baseline.formula_consumer_ids[p.parameter_id] = formulaConsumers;
    result.baseline.resource_consumer_row_ids[p.parameter_id] = resourceConsumers;
    result.baseline.uom_by_parameter[p.parameter_id] = p.unit_id;
    result.baseline.normative_source_ids[p.parameter_id] = [CONCRETE_SLAB_CURING_SOURCE_ID];
    result.baseline.guide_provenance_ru[p.parameter_id] = (p.truth_metadata.guide as Record<string, unknown>).guide_short_ru;
  }
  // Keep the original selector contract and append its newly reachable rows.
  const selectorTarget = result.parameters.find(p => p.parameter_id === selectorId)!;
  const waterBranchIds = addition.resources.map(r => r.row_id);
  const selectorConsumers = [...new Set([...(result.baseline.resource_consumer_row_ids[selectorId] ?? []), ...waterBranchIds])];
  selectorTarget.truth_metadata = { ...selectorTarget.truth_metadata, resource_branch_consumers: selectorConsumers };
  result.baseline.resource_consumer_row_ids[selectorId] = selectorConsumers;
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id,
    valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: result, targetRowIds: Object.values(ANCHOR_WATER_CURING_ROWS),
    addedParameterIds: newParameters.map(p => p.parameter_id), addedFormulaIds: addition.formulas.map(f => f.formula_id),
    contract: ANCHOR_WATER_CURING_S2733_CONTRACT };
}
