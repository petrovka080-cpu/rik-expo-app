import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildVibrationOperationCompletionS2733, VIBRATION_COMPLETION_ROWS as ids, VIBRATION_COMPLETION_S2733_CONTRACT } from "../../../src/lib/estimate/v4/vibrationOperationCompletionS2733";
import { CONCRETE_SLAB_VIBRATION_SOURCE_ID } from "../../../src/lib/estimate/v4/concreteSlabVibrationR1";
import { COMPOSITE_WATER_COMPLETION_TARGETS_S2733 } from "./s2733CompositeWaterCuringOverlay";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export const PLACEMENT_VIBRATION_COMPLETION_TARGETS_S2733 = COMPOSITE_WATER_COMPLETION_TARGETS_S2733;
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_PLACEMENT_VIBRATION:${code}`); }

export function overlayS2733PlacementVibrationCompletion(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("_form_");
  invariant(PLACEMENT_VIBRATION_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const expected = !composite ? [24, 62] : catalogId.includes("concrete_slab_form_") ? [83, 214] : [54, 131];
  invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_ENVELOPE");
  invariant(/^[0-9a-f-]{36}$/u.test(locatorId), "APPROVED_METHOD_LOCATOR_REQUIRED");
  const hoursId = composite ? "placement_deep_vibrator_machine_h" : "deep_vibrator_machine_h";
  const equipmentId = "equipment:concrete:deep-vibrator", existing = parent.resources.find(row => row.row_id === equipmentId);
  invariant(existing && existing.unit_id === "machine_hour" && !existing.resource_graph.inputParameterIds
    && parent.formulas.find(f => f.formula_id === existing.formula_id)?.input_parameter_ids.includes(hoursId), "PHYSICAL_EQUIPMENT_OWNER_DRIFT");
  const next = structuredClone(parent), addition = buildVibrationOperationCompletionS2733(catalogId, undefined,
    { machineHoursParameterId: hoursId, equipmentOwnerRowId: equipmentId });
  const oldParameters = new Set(parent.parameters.map(p => p.parameter_id));
  const added = addition.parameters.filter(p => !oldParameters.has(p.parameter_id));
  invariant(added.length === 8 && added.every(p => p.default_value == null), "NEW_PARAMETERS_OR_DEFAULT_DRIFT");
  invariant(addition.resources.length === 3 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = existing.resource_graph.operationCompositionV1;
  invariant(operation && parent.resources.some(row => row.row_id === "work:concrete:place-and-compact"), "EXISTING_WORK_OPERATION_REQUIRED");
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  next.bindings.push(...addition.resources.map(row => ({ row_id: row.row_id, locator_id: locatorId,
    applicability: { contract: VIBRATION_COMPLETION_S2733_CONTRACT, quantity_basis: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE",
      universal_consumption_claimed: false, universal_productivity_claimed: false } })));
  const equipment = next.resources.find(row => row.row_id === equipmentId)!;
  equipment.resource_graph = { ...equipment.resource_graph,
    inputParameterIds: ["vibration_equipment_specification", "vibration_equipment_price_scope_reference", "vibration_equipment_delivery_mode", "vibration_equipment_delivery_reference"],
    titleSpecificationParameterIds: ["vibration_equipment_specification"] };
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  for (const id of [...added.map(p => p.parameter_id), hoursId]) {
    const parameter = next.parameters.find(p => p.parameter_id === id)!;
    const formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    parameter.truth_metadata = { ...parameter.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows };
    next.baseline.formula_consumer_ids[id] = formulas;next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameters.has(id)) {next.baseline.uom_by_parameter[id] = parameter.unit_id;next.baseline.normative_source_ids[id] = [CONCRETE_SLAB_VIBRATION_SOURCE_ID];
      next.baseline.guide_provenance_ru[id] = parameter.truth_metadata.guide.guide_short_ru;}
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type,
    constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [equipmentId, ids.includedKit, ids.separateKit, ids.placementDelivery], addedParameterIds: added.map(p => p.parameter_id),
    addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(row => row.row_id) };
}
