import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildReinforcementEquipmentCompletionS2733, REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733 as owners } from "../../../src/lib/estimate/v4/reinforcementEquipmentCompletionS2733";
import { REINFORCEMENT_EQUIPMENT_COMPLETION_TARGETS_S2733 } from "./s2733ReinforcementEquipmentCompletionTargets";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export { REINFORCEMENT_EQUIPMENT_COMPLETION_TARGETS_S2733 } from "./s2733ReinforcementEquipmentCompletionTargets";
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_REINFORCEMENT_EQUIPMENT:${code}`); }

export function overlayS2733ReinforcementEquipmentCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("concrete_slab_form_") || catalogId.includes("stairs_concrete_form_");
  invariant(REINFORCEMENT_EQUIPMENT_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const expected = !composite ? [16, 41] : catalogId.endsWith("stairs_concrete_form_standard") ? [81, 164] : catalogId.includes("concrete_slab_form_") ? [100, 253] : [71, 170];
  invariant(parent.resources.length === expected[0] && parent.parameters.length === expected[1], "DELIVERED_ENVELOPE");
  const prefix = composite ? "reinforcement_" : "";
  for (const p of owners) { const row = parent.resources.find(row => row.row_id === p.rowId);
    invariant(row && row.unit_id === "machine_hour" && !row.resource_graph.inputParameterIds, "PHYSICAL_OWNER_DRIFT");
    invariant(hash(parent.formulas.find(f => f.formula_id === row.formula_id)?.input_parameter_ids) === hash([prefix + p.hoursId]), "EXISTING_PROJECT_HOURS_DRIFT"); }
  const guide = parent.parameters.find(p => p.parameter_id === prefix + owners[0].hoursId)!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "99a269e1e5bbd007ff603c2e824bcf09a95bb0b061f4da772121d2b9513fedcd", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const parentApplicability = parent.parameters.some(p => p.parameter_id === "reinforcement_applicable") ? "reinforcement_applicable" : null;
  const next = structuredClone(parent), addition = buildReinforcementEquipmentCompletionS2733(catalogId, prefix, guide.source_snapshot_hash, parentApplicability);
  const oldParameters = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldParameters.has(p.parameter_id));
  invariant(added.length === 17 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 7 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = parent.resources.find(row => row.row_id === owners[0].rowId)!.resource_graph.operationCompositionV1;
  invariant(operation && owners.every(p => hash(parent.resources.find(row => row.row_id === p.rowId)!.resource_graph.operationCompositionV1) === hash(operation)), "EXISTING_OPERATION_DRIFT");
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  for (const p of owners) { const row = next.resources.find(row => row.row_id === p.rowId)!;
    const specification = p.key === "lifting" ? prefix + "lifting_equipment_designation" : `reinforcement_${p.key}_equipment_specification`;
    row.resource_graph = { ...row.resource_graph, inputParameterIds: [prefix + p.hoursId, specification, `reinforcement_${p.key}_price_scope_reference`,
      `reinforcement_${p.key}_accessories_pricing_mode`, "reinforcement_equipment_delivery_mode", "reinforcement_equipment_delivery_reference"],
      ...(p.key === "lifting" ? {} : { titleSpecificationParameterIds: [specification] }) };
    // Composite predecessors declared these project hours optional. Require
    // the physical schedule only while its ORIGINAL equipment branch is on;
    // a manual equipment quantity must not conceal an absent schedule fact.
    const hours = next.parameters.find(parameter => parameter.parameter_id === prefix + p.hoursId)!;
    if (!hours.required) hours.constraints_json = { ...hours.constraints_json, requiredWhen: row.inclusion_ast };
    if (p.key === "lifting") {
      const specificationParameter = next.parameters.find(parameter => parameter.parameter_id === specification)!;
      if (!specificationParameter.required) specificationParameter.constraints_json = { ...specificationParameter.constraints_json,
        requiredWhen: addition.parameters.find(parameter => parameter.parameter_id === "reinforcement_lifting_price_scope_reference")!.constraints_json!.requiredWhen };
    }
  }
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  const previousIds = [prefix + "fabrication_mode", prefix + "lifting_equipment_applicable", prefix + "lifting_equipment_designation", ...owners.map(p => prefix + p.hoursId), ...(parentApplicability ? [parentApplicability] : [])];
  for (const id of [...added.map(p => p.parameter_id), ...previousIds]) {
    const p = next.parameters.find(p => p.parameter_id === id)!, formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows }; next.baseline.formula_consumer_ids[id] = formulas; next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameters.has(id)) { next.baseline.uom_by_parameter[id] = p.unit_id; next.baseline.normative_source_ids[id] = [];
      next.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru; }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type,
    constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [...owners.map(p => p.rowId), ...addition.resources.map(row => row.row_id)], addedParameterIds: added.map(p => p.parameter_id),
    addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(row => row.row_id) };
}
