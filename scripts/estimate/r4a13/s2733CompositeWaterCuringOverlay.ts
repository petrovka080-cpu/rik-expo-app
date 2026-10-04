import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { ANCHOR_WATER_CURING_ROWS as ids } from "../../../src/lib/estimate/v4/anchorGroupWaterCuringResourcesS2733";
import { appendS2733WaterCuringResources, COMPOSITE_WATER_CURING_TARGETS_S2733 } from "./s2733AnchorWaterCuringOverlay";
import { CONCRETE_WATER_CURING_GROUP_TARGETS_S2733 } from "./s2733ConcreteWaterCuringGroupOverlay";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const COMPOSITE_WATER_COMPLETION_TARGETS_S2733 = [...CONCRETE_WATER_CURING_GROUP_TARGETS_S2733, ...COMPOSITE_WATER_CURING_TARGETS_S2733];
const hash = (value: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(value)).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2733_COMPOSITE_WATER:${code}`); }

/** Preserve the supplied formwork, reinforcement, placement, labor and joint
 * composition. Add only the absent selected-water branch; correct its concrete
 * actual-count bypass together in the 66 already delivered pour profiles. */
export function overlayS2733CompositeWaterCuring(parent: PurchaseGroupRepresentative, waterNormativeLocatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(COMPOSITE_WATER_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const composite = COMPOSITE_WATER_CURING_TARGETS_S2733.includes(catalogId);
  if (composite) return { ...appendS2733WaterCuringResources(parent, waterNormativeLocatorId, {
    catalogIds: COMPOSITE_WATER_CURING_TARGETS_S2733, groupId: catalogId, groupTitleRu: String(parent.passport.physical_result_ru),
    variant: "S2733_COMPOSITE_SLAB_STAIRS",
    applicabilityRu: "Водный уход за выбранной плитой или лестницей по проектному способу и фактической ведомости воды, оборудования и поставки; расход не выводится из объёма бетона.",
  }), changedFormulaIds: [], addedResourceRowIds: Object.values(ids), newWaterBranch: true };
  invariant(parent.resources.length === 24 && parent.parameters.length === 62, "DELIVERED_POUR_ENVELOPE");
  invariant(Object.values(ids).every(id => parent.resources.some(row => row.row_id === id)), "EXISTING_WATER_BRANCH_DRIFT");
  const next = structuredClone(parent), kit = next.resources.find(row => row.row_id === ids.accessories)!;
  invariant(kit.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS" && kit.resource_graph.includedInResourceOwnerRowId === ids.equipment,
    "INCLUDED_COST_OWNER_DRIFT");
  const originalInputs = kit.resource_graph.inputParameterIds;
  invariant(hash(originalInputs) === hash(["curing_water_equipment_kit_specification"]), "COUNT_GUARD_PREDECESSOR_DRIFT");
  kit.resource_graph = { ...kit.resource_graph, inputParameterIds: [...originalInputs, "curing_water_equipment_set_count"] };
  const parameter = next.parameters.find(p => p.parameter_id === "curing_water_equipment_set_count")!;
  invariant(parameter && parameter.value_type === "integer" && parameter.constraints_json.min === 1, "ACTUAL_COUNT_PARAMETER_DRIFT");
  const consumers = [...new Set([...(next.baseline.resource_consumer_row_ids[parameter.parameter_id] ?? []), ids.accessories])];
  parameter.truth_metadata = { ...parameter.truth_metadata, resource_branch_consumers: consumers };
  next.baseline.resource_consumer_row_ids[parameter.parameter_id] = consumers;
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id,
    valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [ids.accessories], addedParameterIds: [], addedFormulaIds: [], changedFormulaIds: [],
    addedResourceRowIds: [], contract: "water-curing-actual-kit-count:s27-33.v1", newWaterBranch: false };
}
