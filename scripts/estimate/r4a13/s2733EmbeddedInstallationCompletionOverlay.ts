import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildEmbeddedInstallationCompletionS2733, EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733 as owners } from "../../../src/lib/estimate/v4/embeddedInstallationCompletionS2733";
import { effectivePurchaseBalanceExpressionsR1 } from "../../../src/lib/estimate/v4/effectivePurchaseBalanceR1";
import { EMBEDDED_INSTALLATION_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedInstallationCompletionTargets";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export { EMBEDDED_INSTALLATION_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedInstallationCompletionTargets";
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_EMBEDDED_INSTALLATION:${code}`); }
const materialRoles = [
  ["APPROVED_PROJECT_EMBEDDED_ITEM_TAKEOFF", null, "embedded_item_designation", "embedded_item_total_mass_kg"],
  ["APPROVED_WELDING_CONSUMABLE_TAKEOFF", "field_welding_required", "welding_consumable_designation", "welding_consumable_quantity_kg"],
  ["APPROVED_TEMPORARY_SUPPORT_TAKEOFF", "temporary_support_required", "temporary_support_designation", "temporary_support_quantity_kg"],
  ["APPROVED_PROJECT_COATING_TOUCHUP_TAKEOFF", "coating_touchup_required", "coating_touchup_designation", "coating_touchup_quantity_kg"],
] as const;

export function overlayS2733EmbeddedInstallationCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("concrete_slab_form_");
  invariant(EMBEDDED_INSTALLATION_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(parent.resources.length === (composite ? 113 : 20) && parent.parameters.length === (composite ? 280 : 44), "DELIVERED_ENVELOPE");
  const prefix = composite ? "embedded_" : "", parentApplicability = composite ? "embedded_items_applicable" : null;
  const ownerRows = { installation: parent.resources.find(r => r.source_metadata?.sourceRole === "APPROVED_PROJECT_FIXING_LABOR_SCHEDULE"),
    lifting: parent.resources.find(r => r.source_metadata?.sourceRole === "APPROVED_PROJECT_LIFTING_EQUIPMENT_SCHEDULE") };
  invariant(ownerRows.installation && ownerRows.lifting, "EXISTING_OWNERS_REQUIRED");
  for (const p of owners) invariant(hash(parent.formulas.find(f => f.formula_id === ownerRows[p.key]!.formula_id)?.input_parameter_ids) === hash([prefix + p.hoursId]), "PHYSICAL_OWNER_DRIFT");
  const guide = parent.parameters.find(p => p.parameter_id === prefix + "fixing_worker_h")!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const next = structuredClone(parent), addition = buildEmbeddedInstallationCompletionS2733(catalogId, prefix, guide.source_snapshot_hash,
    { installation: ownerRows.installation.row_id, lifting: ownerRows.lifting.row_id }, parentApplicability);
  const oldIds = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldIds.has(p.parameter_id));
  invariant(added.length === 9 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 4 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = ownerRows.installation.resource_graph.operationCompositionV1;
  invariant(operation && hash(ownerRows.lifting.resource_graph.operationCompositionV1) === hash(operation), "EXISTING_OPERATION_DRIFT");
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  const scope = parentApplicability ? { kind: "equals", parameterId: parentApplicability, value: true } : { kind: "literal", value: true };
  const selected = (selector: string | null, separate = false) => ({ kind: "and", operands: [scope,
    ...(selector ? [{ kind: "equals", parameterId: prefix + selector, value: true }] : []),
    ...(separate ? [{ kind: "equals", parameterId: prefix + "equipment_mobilization_pricing_mode", value: "SEPARATE" }] : [])] });
  const affected = new Set(added.map(p => p.parameter_id));
  const requireWhen = (id: string, condition: unknown) => { const p = next.parameters.find(p => p.parameter_id === id)!; invariant(p, "EXPECTED_PARAMETER");
    if (!p.required) p.constraints_json = { ...p.constraints_json, requiredWhen: condition }; affected.add(id); };
  const newBalanceRows: string[] = [];
  for (const [role, selector, designation, quantity] of materialRoles) {
    const row = next.resources.find(r => r.source_metadata?.sourceRole === role)!;
    invariant(row && row.category === "material" && row.unit_id === "kg" && row.procurement_eligible, "PHYSICAL_MATERIAL_REQUIRED");
    requireWhen(prefix + designation, selected(selector)); requireWhen(prefix + quantity, selected(selector));
    row.resource_graph = { ...row.resource_graph, titleSpecificationParameterIds: [prefix + designation] };
    if (!row.resource_graph.purchaseBalanceV1) {
      const formula = parent.formulas.find(f => f.formula_id === row.formula_id)!;
      invariant(formula.expression_source === prefix + quantity, "DIRECT_PHYSICAL_MATERIAL_FORMULA_REQUIRED");
      const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: row.row_id, orderUnitId: "kg", consumed: formula.expression_source,
        stock: "0", reserve: "0", quantityMode: "canonical_decimal", balanceScope: "new_order_vs_required_consumption" });
      row.resource_graph = { ...row.resource_graph, purchaseBalanceV1: balance.owner.purchaseBalance }; newBalanceRows.push(row.row_id);
    }
  }
  for (const p of owners) {
    const row = next.resources.find(r => r.row_id === ownerRows[p.key]!.row_id)!;
    const key = "embedded_" + p.key;
    row.resource_graph = { ...row.resource_graph, inputParameterIds: [...new Set([...(row.resource_graph.inputParameterIds ?? []), prefix + p.hoursId,
      key + "_price_scope_reference", key + "_accessories_pricing_mode"])],
      ...(p.key === "lifting" ? { titleSpecificationParameterIds: [prefix + "lifting_equipment_designation"] } : {}) };
    requireWhen(prefix + p.hoursId, selected(p.key === "lifting" ? "lifting_equipment_required" : null));
  }
  requireWhen(prefix + "installation_method_statement_reference", selected(null));
  requireWhen(prefix + "lifting_equipment_designation", selected("lifting_equipment_required"));
  requireWhen(prefix + "equipment_mobilization_pricing_mode", selected("lifting_equipment_required"));
  requireWhen(prefix + "mobilization_scope_reference", selected("lifting_equipment_required", true));
  requireWhen(prefix + "equipment_mobilization_trip_count", selected("lifting_equipment_required", true));
  requireWhen(prefix + "embedded_items_delivery_trip_count", selected(null));
  for (const suffix of ["embedded_items_delivery_trip_count", "equipment_mobilization_trip_count"]) {
    const p = next.parameters.find(p => p.parameter_id === prefix + suffix)!; p.value_type = "integer"; p.constraints_json = { ...p.constraints_json, min: 1 };
    const row = next.resources.find(r => parent.formulas.find(f => f.formula_id === r.formula_id)?.input_parameter_ids.includes(p.parameter_id) && r.category === "delivery")!;
    invariant(row && row.unit_id === "trip", "EXISTING_CONFIRMED_TRIP_ROW_REQUIRED");
    row.resource_graph = { ...row.resource_graph, manualTransportQuantityPolicyV1: { unitId: "trip", minimum: "calculated_quantity", integer: true },
      ...(suffix === "embedded_items_delivery_trip_count" ? { inputParameterIds: [...new Set([...(row.resource_graph.inputParameterIds ?? []), "embedded_installation_delivery_reference"])], titleSpecificationParameterIds: ["embedded_installation_delivery_reference"] }
        : { titleSpecificationParameterIds: [prefix + "mobilization_scope_reference"] }) };
  }
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  for (const id of affected) {
    const p = next.parameters.find(p => p.parameter_id === id)!, formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows }; next.baseline.formula_consumer_ids[id] = formulas; next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldIds.has(id)) { next.baseline.uom_by_parameter[id] = p.unit_id; next.baseline.normative_source_ids[id] = []; next.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru; }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [...Object.values(ownerRows).map(r => r!.row_id), ...addition.resources.map(r => r.row_id)],
    addedParameterIds: added.map(p => p.parameter_id), addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(r => r.row_id), newBalanceRowIds: newBalanceRows };
}
