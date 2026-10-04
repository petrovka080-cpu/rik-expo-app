import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildEmbeddedCoatingCompletionS2733, EMBEDDED_COATING_COMPLETION_ROWS_S2733 as ids } from "../../../src/lib/estimate/v4/embeddedCoatingCompletionS2733";
import { EMBEDDED_COATING_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedCoatingCompletionTargets";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export { EMBEDDED_COATING_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedCoatingCompletionTargets";
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_EMBEDDED_COATING:${code}`); }

export function overlayS2733EmbeddedCoatingCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("concrete_slab_form_");
  invariant(EMBEDDED_COATING_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(parent.resources.length === (composite ? 117 : 24) && parent.parameters.length === (composite ? 289 : 53), "DELIVERED_ENVELOPE");
  const prefix = composite ? "embedded_" : "";
  const labor = parent.resources.find(row => row.source_metadata?.sourceRole === "APPROVED_PROJECT_COATING_TOUCHUP_LABOR_SCHEDULE");
  invariant(labor && labor.unit_id === "man_hour", "EXISTING_COATING_LABOR_REQUIRED");
  invariant(hash(parent.formulas.find(f => f.formula_id === labor.formula_id)?.input_parameter_ids) === hash([prefix + "coating_touchup_worker_h"]), "EXISTING_PROJECT_LABOR_DRIFT");
  const consumable = parent.resources.find(row => row.source_metadata?.sourceRole === "APPROVED_PROJECT_COATING_TOUCHUP_TAKEOFF");
  invariant(consumable && consumable.unit_id === "kg", "EXISTING_COATING_MATERIAL_REQUIRED");
  const guide = parent.parameters.find(p => p.parameter_id === prefix + "coating_touchup_worker_h")!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const parentApplicability = parent.parameters.some(p => p.parameter_id === "embedded_items_applicable") ? "embedded_items_applicable" : null;
  const next = structuredClone(parent), addition = buildEmbeddedCoatingCompletionS2733(catalogId, prefix, guide.source_snapshot_hash, labor.row_id, parentApplicability);
  const oldIds = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldIds.has(p.parameter_id));
  invariant(added.length === 12 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 6 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = { ...(labor.resource_graph.operationCompositionV1 ?? {}), contractVersion: "canonical-operation-resource/v1",
    groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru, operationId: "embedded-coating", operationTitleRu: "Проектное восстановление покрытия закладных",
    completionCriterionRu: "Выбранное восстановление покрытия выполнено по совместимой технологической карте: материал и труд, полная оснастка подготовки/нанесения/контроля/уборки, фактические часы выбранной техники и подтверждённая перевозка раскрыты без двойной оплаты." };
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  for (const row of next.resources) {
    if (row.row_id === labor.row_id || row.row_id === consumable.row_id) row.resource_graph = { ...row.resource_graph, operationCompositionV1: operation };
  }
  // Preserve original formulas and selections; restore source-shaped guards
  // that the composite predecessor had made optional. Manual rows never turn
  // an absent physical labor/material takeoff into an approved fact.
  const selected = { kind: "and", operands: [{ kind: "equals", parameterId: prefix + "coating_touchup_required", value: true },
    ...(parentApplicability ? [{ kind: "equals", parameterId: parentApplicability, value: true }] : [])] };
  for (const suffix of ["coating_touchup_worker_h", "coating_touchup_designation", "coating_touchup_quantity_kg"]) {
    const p = next.parameters.find(p => p.parameter_id === prefix + suffix)!;
    if (!p.required) p.constraints_json = { ...p.constraints_json, requiredWhen: selected };
  }
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  const affectedIds = new Set([...added.map(p => p.parameter_id), prefix + "coating_touchup_required", prefix + "coating_touchup_worker_h",
    prefix + "coating_touchup_designation", prefix + "coating_touchup_quantity_kg", ...(parentApplicability ? [parentApplicability] : [])]);
  for (const p of next.parameters.filter(p => affectedIds.has(p.parameter_id))) {
    const id = p.parameter_id, formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    const rows = [...new Set([...(next.baseline.resource_consumer_row_ids[id] ?? []), ...next.resources.filter(row =>
      formulas.includes(row.formula_id) || JSON.stringify([row.resource_graph, row.inclusion_ast]).includes(`"${id}"`)).map(row => row.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows }; next.baseline.formula_consumer_ids[id] = formulas; next.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldIds.has(id)) { next.baseline.uom_by_parameter[id] = p.unit_id; next.baseline.normative_source_ids[id] = [];
      next.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru; }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: next, targetRowIds: [labor.row_id, consumable.row_id, ...Object.values(ids)], addedParameterIds: added.map(p => p.parameter_id),
    addedFormulaIds: addition.formulas.map(f => f.formula_id), changedFormulaIds: [], addedResourceRowIds: addition.resources.map(row => row.row_id) };
}
