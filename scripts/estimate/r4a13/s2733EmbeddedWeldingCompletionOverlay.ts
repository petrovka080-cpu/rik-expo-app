import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildEmbeddedWeldingCompletionS2733, EMBEDDED_WELDING_COMPLETION_ROWS_S2733 as ids } from "../../../src/lib/estimate/v4/embeddedWeldingCompletionS2733";
import { EMBEDDED_WELDING_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedWeldingCompletionTargets";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export { EMBEDDED_WELDING_COMPLETION_TARGETS_S2733 } from "./s2733EmbeddedWeldingCompletionTargets";
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_EMBEDDED_WELDING:${code}`); }

export function overlayS2733EmbeddedWeldingCompletion(parent: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = catalogId.includes("concrete_slab_form_");
  invariant(EMBEDDED_WELDING_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(parent.resources.length === (composite ? 107 : 14) && parent.parameters.length === (composite ? 270 : 34), "DELIVERED_ENVELOPE");
  const prefix = composite ? "embedded_" : "";
  const labor = parent.resources.find(row => row.source_metadata?.sourceRole === "APPROVED_WELDING_PROCEDURE_AND_LABOR_SCHEDULE");
  invariant(labor && labor.unit_id === "man_hour", "EXISTING_WELDING_LABOR_REQUIRED");
  invariant(hash(parent.formulas.find(f => f.formula_id === labor.formula_id)?.input_parameter_ids) === hash([prefix + "welding_worker_h"]), "EXISTING_PROJECT_LABOR_DRIFT");
  const consumable = parent.resources.find(row => row.source_metadata?.sourceRole === "APPROVED_WELDING_CONSUMABLE_TAKEOFF");
  invariant(consumable && consumable.unit_id === "kg", "EXISTING_WELDING_MATERIAL_REQUIRED");
  const guide = parent.parameters.find(p => p.parameter_id === prefix + "welding_worker_h")!.truth_metadata.guide;
  invariant(guide.source_snapshot_hash === "42123e5d9adcd174b32049da87bcfbe55b0b7f2cd5ef17a09e599b63f4dddb50", "ACCEPTED_PROJECT_SOURCE_DRIFT");
  const parentApplicability = parent.parameters.some(p => p.parameter_id === "embedded_items_applicable") ? "embedded_items_applicable" : null;
  const next = structuredClone(parent), addition = buildEmbeddedWeldingCompletionS2733(catalogId, prefix, guide.source_snapshot_hash, labor.row_id, parentApplicability);
  const oldIds = new Set(parent.parameters.map(p => p.parameter_id)), added = addition.parameters.filter(p => !oldIds.has(p.parameter_id));
  invariant(added.length === 10 && added.every(p => p.default_value == null), "NEW_PARAMETERS_DEFAULT_DRIFT");
  invariant(addition.resources.length === 6 && addition.resources.every(row => !parent.resources.some(old => old.row_id === row.row_id)), "RESOURCE_COLLISION");
  invariant(addition.formulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  const operation = { ...(labor.resource_graph.operationCompositionV1 ?? {}), contractVersion: "canonical-operation-resource/v1",
    groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru, operationId: "embedded-welding", operationTitleRu: "Проектная монтажная сварка закладных деталей",
    completionCriterionRu: "Выбранная сварка имеет утверждённую процедуру, существующие сварочные материалы и труд, фактические часы совместимого поста, полный поштучный комплект и подтверждённую перевозку без двойной оплаты." };
  next.parameters.push(...added.map((p, i) => ({ ...p, ordinal: Math.max(...parent.parameters.map(p => p.ordinal)) + 1 + i })));
  next.formulas.push(...addition.formulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  next.resources.push(...addition.resources.map((row, i) => ({ ...row, ordinal: Math.max(...parent.resources.map(r => r.ordinal)) + 1 + i,
    row_type: row.category === "delivery" ? "service" : row.category, semantic_owner: `${catalogId}:${row.row_id}`, cost_owner_id: `${catalogId}:${row.row_id}`,
    resource_graph: { ...row.resource_graph, operationCompositionV1: operation } })));
  for (const row of next.resources) {
    if (row.row_id === labor.row_id || row.row_id === consumable.row_id) row.resource_graph = { ...row.resource_graph, operationCompositionV1: operation };
    else if (!composite && !row.resource_graph.operationCompositionV1) {
      const role = String(row.source_metadata?.sourceRole), coating = role.includes("COATING_TOUCHUP"), control = role.includes("CONTROL_PLAN") || role.includes("INSPECTION_PLAN"), delivery = row.category === "delivery";
      row.resource_graph = { ...row.resource_graph, operationCompositionV1: { contractVersion: "canonical-operation-resource/v1", groupId: catalogId,
        groupTitleRu: parent.passport.physical_result_ru, operationId: coating ? "embedded-coating" : control ? "embedded-control" : delivery ? "embedded-delivery" : "embedded-installation",
        operationTitleRu: coating ? "Проектное восстановление покрытия закладных" : control ? "Контроль и приёмка закладных" : delivery ? "Доставка изделий и подъёмного оборудования" : "Разметка, установка и фиксация закладных",
        completionCriterionRu: coating ? "Выбранное восстановление покрытия содержит проектные материал и труд." : control ? "Контроль выполнен по существующему проектному плану." : delivery ? "Сохранены фактические поставки изделий и условия отдельной перевозки подъёмной техники." : "Изделия по ведомости установлены и закреплены с применимыми временными опорами, трудом и подъёмной техникой." } };
    }
  }
  // Preserve original formulas and selections; restore source-shaped guards
  // that the composite predecessor had made optional. Manual rows never turn
  // an absent WPS or physical labor/material takeoff into an approved fact.
  const selected = { kind: "and", operands: [{ kind: "equals", parameterId: prefix + "field_welding_required", value: true },
    ...(parentApplicability ? [{ kind: "equals", parameterId: parentApplicability, value: true }] : [])] };
  for (const suffix of ["welding_worker_h", "approved_welding_procedure_reference", "welding_consumable_designation", "welding_consumable_quantity_kg"]) {
    const p = next.parameters.find(p => p.parameter_id === prefix + suffix)!;
    if (!p.required) p.constraints_json = { ...p.constraints_json, requiredWhen: selected };
  }
  next.definition.applicability = { ...next.definition.applicability, deferMissingProjectFactsToRows: true };
  const affectedIds = new Set([...added.map(p => p.parameter_id), prefix + "field_welding_required", prefix + "welding_worker_h",
    prefix + "approved_welding_procedure_reference", prefix + "welding_consumable_designation", prefix + "welding_consumable_quantity_kg", ...(parentApplicability ? [parentApplicability] : [])]);
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
