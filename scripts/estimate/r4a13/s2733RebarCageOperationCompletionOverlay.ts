import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildRebarCageOperationCompletionS2733, REBAR_CAGE_COMPLETION_ROWS, REBAR_CAGE_COMPLETION_S2733_CONTRACT } from "../../../src/lib/estimate/v4/rebarCageOperationCompletionS2733";
import { MONOLITHIC_REBAR_CAGE_SOURCE_ID } from "../../../src/lib/estimate/v4/monolithicRebarCageR1";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const REBAR_CAGE_COMPLETION_TARGETS_S2733 = ["canonical-work:base:concrete_foundation_interior_reinforcement_frame_reinforce_standard"];
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_REBAR_CAGE_COMPLETION:${code}`); }

export function overlayS2733RebarCageOperationCompletion(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(REBAR_CAGE_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(parent.resources.length === 9 && parent.parameters.length === 27, "DELIVERED_SCOPE_DRIFT");
  invariant(parent.parameters.every(p => p.default_value == null), "HIDDEN_DEFAULT");
  invariant(parent.bindings.some(b => b.locator_id === locatorId && b.applicability.source_id === MONOLITHIC_REBAR_CAGE_SOURCE_ID), "PROJECT_LOCATOR_REQUIRED");
  invariant(parent.resources[0]?.row_id === REBAR_CAGE_COMPLETION_ROWS.work && parent.resources[0]?.unit_id === "kg", "WORK_OWNER_DRIFT");
  const result: PurchaseGroupRepresentative = structuredClone(parent);
  const addition = buildRebarCageOperationCompletionS2733(catalogId);
  const oldParameterIds = new Set(parent.parameters.map(p => String(p.parameter_id)));
  const addedParameters = addition.parameters.filter(p => !oldParameterIds.has(p.parameter_id));
  const addedResources = addition.resources;
  const addedFormulaIds = new Set(addedResources.map(r => r.formula_id));
  const addedFormulas = addition.formulas.filter(f => addedFormulaIds.has(f.formula_id));
  invariant(addedResources.every(r => !parent.resources.some(old => old.row_id === r.row_id)), "RESOURCE_COLLISION");
  invariant(addedFormulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  // Append after every existing user and internal parameter; keep their ordinals.
  const nextParameterOrdinal = Math.max(...parent.parameters.map(p => Number(p.ordinal))) + 1;
  result.parameters.push(...addedParameters.map((p, i) => ({ ...p, ordinal: nextParameterOrdinal + i })));
  invariant(new Set(result.parameters.map(p => p.ordinal)).size === result.parameters.length, "PARAMETER_ORDINAL_COLLISION");
  result.formulas.push(...addedFormulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  result.resources.push(...addedResources.map((r, i) => ({ ...r, ordinal: parent.resources.length + i,
    row_type: r.category === "delivery" ? "service" : r.category === "construction_work" ? "labor" : r.category,
    semantic_owner: `${catalogId}:${r.row_id}` })));
  result.bindings.push(...addedResources.map(r => ({ row_id: r.row_id, locator_id: locatorId,
    applicability: { contract: REBAR_CAGE_COMPLETION_S2733_CONTRACT, quantity_basis: "ACTUAL_PROJECT_LABOR_AND_APPROVED_WELDING_EQUIPMENT_SCHEDULE",
      universal_consumption_claimed: false, universal_productivity_claimed: false } })));
  const electrodes = result.resources.find(r => r.row_id === "material:rebar-cage:welding-electrodes")!;
  invariant(electrodes && electrodes.unit_id === "kg", "ELECTRODE_OWNER_REQUIRED");
  electrodes.resource_graph = { ...electrodes.resource_graph, inputParameterIds: [...(electrodes.resource_graph.inputParameterIds ?? []), "cage_welding_procedure_reference"] };
  for (const r of result.resources) {
    const operationId = r.row_id.includes("welding-") ? "welding" : r.category === "service" ? "control" : "reinforcement";
    r.resource_graph = { ...r.resource_graph, operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru,
      operationId, operationTitleRu: operationId === "welding" ? "Проектные сварные соединения арматурного каркаса"
        : operationId === "control" ? "Приёмка арматурного каркаса" : "Резка, гибка, сборка и установка арматурного каркаса",
      completionCriterionRu: operationId === "welding" ? "Выбранная проектом сварка имеет утверждённую технологию, электроды, фактический труд и полностью укомплектованный пост; включённая и отдельная оплата различимы."
        : operationId === "control" ? "Подтверждена исполнительная запись приёмки арматурного каркаса."
          : "Арматура, проволока, фиксаторы и применимые муфты обеспечены; раскрыты станок и фактический труд внутри работы в кг без повторной оплаты.",
    } };
  }
  result.definition.applicability = { ...result.definition.applicability, deferMissingProjectFactsToRows: true };
  const oldAndNewInputs = new Set([...addedParameters.map(p => p.parameter_id), "welding_electrode_mode"]);
  for (const id of oldAndNewInputs) {
    const p = result.parameters.find(value => value.parameter_id === id)!;
    const formulas = [...new Set([...(result.baseline.formula_consumer_ids[id] ?? []),
      ...addedFormulas.filter(f => f.input_parameter_ids?.includes(id)).map(f => f.formula_id)])];
    const rows = [...new Set([...(result.baseline.resource_consumer_row_ids[id] ?? []),
      ...result.resources.filter(r => JSON.stringify([r.resource_graph, r.inclusion_ast]).includes(`"${id}"`) || formulas.includes(r.formula_id)).map(r => r.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows };
    result.baseline.formula_consumer_ids[id] = formulas; result.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameterIds.has(id)) {
      result.baseline.uom_by_parameter[id] = p.unit_id; result.baseline.normative_source_ids[id] = [MONOLITHIC_REBAR_CAGE_SOURCE_ID];
      result.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru;
    }
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: result, targetRowIds: addedResources.map(r => r.row_id), addedParameterIds: addedParameters.map(p => p.parameter_id),
    addedFormulaIds: addedFormulas.map(f => f.formula_id), changedFormulaIds: [], contract: REBAR_CAGE_COMPLETION_S2733_CONTRACT };
}
