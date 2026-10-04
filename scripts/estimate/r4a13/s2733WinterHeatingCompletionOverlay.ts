import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildWinterHeatingCompletionS2733, WINTER_HEATING_COMPLETION_ROWS_S2733 as ids } from "../../../src/lib/estimate/v4/winterHeatingCompletionS2733";
import { SURFACE_FINISHING_COMPLETION_TARGETS_S2733 } from "./s2733SurfaceFinishingCompletionOverlay";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export const WINTER_HEATING_COMPLETION_TARGETS_S2733 = SURFACE_FINISHING_COMPLETION_TARGETS_S2733;
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_WINTER_HEATING:${code}`); }

export function overlayS2733WinterHeatingCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("_form_");
  invariant(WINTER_HEATING_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const expected = !composite ? [36, 88] : catalogId.includes("concrete_slab_form_") ? [95, 240] : [66, 157];
  invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_ENVELOPE");
  const prefix = composite ? "placement_" : "", winterId = composite ? "placement_winter_mode" : "winter_mode";
  const cable = parent.resources.find(row => row.row_id === "material:concrete:winter-heating-cable"), labor = parent.resources.find(row => row.row_id === "work:concrete:winter-heating"), equipment = parent.resources.find(row => row.row_id === "equipment:concrete:heating-transformer");
  invariant(cable && labor && equipment && cable.unit_id === "m" && labor.unit_id === "man_hour" && equipment.unit_id === "machine_hour", "PHYSICAL_OWNER_DRIFT");
  invariant([cable, labor, equipment].every(row => !row.resource_graph.inputParameterIds), "PREVIOUS_RESOURCE_FACTS_DRIFT");
  const idsByRow = new Map([[cable.row_id, prefix + "winter_heating_cable_m"], [labor.row_id, prefix + "winter_heating_worker_h"], [equipment.row_id, prefix + "heating_transformer_machine_h"]]);
  for (const row of [cable, labor, equipment]) invariant(hash(parent.formulas.find(f => f.formula_id === row.formula_id)?.input_parameter_ids) === hash([idsByRow.get(row.row_id)]), "EXISTING_PROJECT_QUANTITIES_DRIFT");
  const guide = parent.parameters.find(p => p.parameter_id === winterId)!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const next = structuredClone(parent), addition = buildWinterHeatingCompletionS2733(catalogId, winterId, guide.source_snapshot_hash);
  const oldParameters = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldParameters.has(p.parameter_id));
  invariant(added.length === 13 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 5 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = labor.resource_graph.operationCompositionV1;
  invariant(operation && [cable, equipment].every(row => hash(row.resource_graph.operationCompositionV1) === hash(operation)), "EXISTING_OPERATION_DRIFT");
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  for (const old of [cable, labor, equipment]) {
    const row = next.resources.find(row => row.row_id === old.row_id)!;
    const specification = row.row_id === cable.row_id ? "winter_heating_cable_specification" : row.row_id === equipment.row_id ? "winter_heating_equipment_specification" : null;
    row.resource_graph = { ...row.resource_graph, inputParameterIds: [idsByRow.get(row.row_id)!, "winter_heating_system_reference", "winter_heating_price_scope_reference",
      ...(specification ? [specification] : []), "winter_heating_accessories_pricing_mode", "winter_heating_energy_pricing_mode", "winter_heating_delivery_mode", "winter_heating_delivery_reference"],
      ...(specification ? { titleSpecificationParameterIds: [specification] } : {}) };
  }
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  for (const id of [...added.map(p => p.parameter_id), winterId, ...idsByRow.values()]) {
    const p = next.parameters.find(p => p.parameter_id === id)!, formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows }; next.baseline.formula_consumer_ids[id] = formulas; next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameters.has(id)) { next.baseline.uom_by_parameter[id] = p.unit_id; next.baseline.normative_source_ids[id] = [];
      next.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru; }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type,
    constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [cable.row_id, labor.row_id, equipment.row_id, ...Object.values(ids)], addedParameterIds: added.map(p => p.parameter_id),
    addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(row => row.row_id) };
}
