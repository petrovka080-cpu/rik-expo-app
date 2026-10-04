import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildSurfaceFinishingCompletionS2733, SURFACE_FINISHING_COMPLETION_ROWS_S2733 as ids } from "../../../src/lib/estimate/v4/surfaceFinishingCompletionS2733";
import { PLACEMENT_EQUIPMENT_COMPLETION_TARGETS_S2733 } from "./s2733PlacementEquipmentCompletionOverlay";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export const SURFACE_FINISHING_COMPLETION_TARGETS_S2733 = PLACEMENT_EQUIPMENT_COMPLETION_TARGETS_S2733;
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_SURFACE_FINISHING:${code}`); }

export function overlayS2733SurfaceFinishingCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("_form_");
  invariant(SURFACE_FINISHING_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const expected = !composite ? [31, 78] : catalogId.includes("concrete_slab_form_") ? [90, 230] : [61, 147];
  invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_ENVELOPE");
  const hoursId = composite ? "placement_finishing_worker_h" : "finishing_worker_h";
  const labor = parent.resources.find(row => row.row_id === "work:concrete:finish-surface");
  invariant(labor && labor.unit_id === "man_hour" && !labor.resource_graph.inputParameterIds, "PHYSICAL_OWNER_DRIFT");
  const formula = parent.formulas.find(f => f.formula_id === labor.formula_id);
  invariant(formula && hash(formula.input_parameter_ids) === hash([hoursId]), "EXISTING_PROJECT_HOURS_DRIFT");
  const guide = parent.parameters.find(p => p.parameter_id === hoursId)!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "e2f9581f930330995b67a4fe08cf264756fd3b5b606085062229fd12baf9e437", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const next = structuredClone(parent), addition = buildSurfaceFinishingCompletionS2733(catalogId, hoursId, guide.source_snapshot_hash);
  const oldParameters = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldParameters.has(p.parameter_id));
  invariant(added.length === 10 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 5 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = labor.resource_graph.operationCompositionV1;
  invariant(operation, "EXISTING_OPERATION_DRIFT");
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  // Keep the original project-hours formula, cost owner and normative bindings.
  // Method/price facts are required only while the original labor is active.
  const work = next.resources.find(row => row.row_id === labor.row_id)!;
  work.resource_graph = { ...work.resource_graph, inputParameterIds: [hoursId, "surface_finishing_method", "surface_finishing_price_scope_reference",
    "surface_finishing_accessories_pricing_mode", "surface_finishing_delivery_mode", "surface_finishing_delivery_reference"] };
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  for (const id of [...added.map(p => p.parameter_id), hoursId]) {
    const p = next.parameters.find(p => p.parameter_id === id)!, formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows }; next.baseline.formula_consumer_ids[id] = formulas; next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameters.has(id)) { next.baseline.uom_by_parameter[id] = p.unit_id; next.baseline.normative_source_ids[id] = [];
      next.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru; }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type,
    constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [labor.row_id, ...Object.values(ids)], addedParameterIds: added.map(p => p.parameter_id),
    addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(row => row.row_id) };
}
