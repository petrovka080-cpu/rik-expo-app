import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildVibrationOperationCompletionS2733, VIBRATION_COMPLETION_ROWS, VIBRATION_COMPLETION_S2733_CONTRACT } from "../../../src/lib/estimate/v4/vibrationOperationCompletionS2733";
import { CONCRETE_SLAB_VIBRATION_SOURCE_ID } from "../../../src/lib/estimate/v4/concreteSlabVibrationR1";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const STANDALONE_VIBRATION_COMPLETION_TARGETS_S2733 = ["anchor_group", "belt", "column_base", "concrete_slab", "pedestal", "pile_cap", "slab_foundation"]
  .flatMap(family => ["standard", "high_load", "repair", "technical_room", "wet_zone"]
    .map(context => `canonical-work:base:concrete_foundation_interior_${family}_vibrate_${context}`));
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_VIBRATION_COMPLETION:${code}`); }

export function overlayS2733StandaloneVibrationCompletion(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(STANDALONE_VIBRATION_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  const pileCap = catalogId.includes("_pile_cap_vibrate_");
  invariant(parent.resources.length === 4 && parent.parameters.length === (pileCap ? 12 : 13), "DELIVERED_SCOPE_DRIFT");
  const volumeWorkOwner = pileCap ? parent.resources.find(r => r.category === "construction_work" && r.unit_id === "m3") : null;
  invariant(!pileCap || volumeWorkOwner, "PILE_CAP_VOLUME_WORK_OWNER_REQUIRED");
  invariant(parent.parameters.every(p => p.default_value == null), "HIDDEN_DEFAULT");
  invariant(/^[0-9a-f-]{36}$/u.test(locatorId), "METHOD_LOCATOR_REQUIRED");
  const result: PurchaseGroupRepresentative = structuredClone(parent);
  const equipmentOwner = parent.resources.find(r => r.category === "equipment")!;
  invariant(equipmentOwner?.row_id === VIBRATION_COMPLETION_ROWS.equipment, "EQUIPMENT_OWNER_DRIFT");
  const addition = buildVibrationOperationCompletionS2733(catalogId, pileCap ? String(volumeWorkOwner!.row_id) : undefined);
  const oldParameterIds = new Set(parent.parameters.map(p => String(p.parameter_id)));
  const addedParameters = addition.parameters.filter(p => !oldParameterIds.has(p.parameter_id));
  const addedResources = addition.resources;
  const addedFormulaIds = new Set(addedResources.map(r => r.formula_id));
  const addedFormulas = addition.formulas.filter(f => addedFormulaIds.has(f.formula_id));
  invariant(addedResources.every(r => !parent.resources.some(old => old.row_id === r.row_id)), "RESOURCE_COLLISION");
  invariant(addedFormulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  // Pile-cap's delivered schema retains a gap after removing the old labor
  // input. Preserve its ordinals and append after the highest existing one.
  const nextParameterOrdinal = Math.max(...parent.parameters.map(p => Number(p.ordinal))) + 1;
  result.parameters.push(...addedParameters.map((p, i) => ({ ...p, ordinal: nextParameterOrdinal + i })));
  invariant(new Set(result.parameters.map(p => p.ordinal)).size === result.parameters.length, "PARAMETER_ORDINAL_COLLISION");
  result.formulas.push(...addedFormulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  result.resources.push(...addedResources.map((r, i) => ({ ...r, ordinal: parent.resources.length + i,
    row_type: r.category === "delivery" ? "service" : r.category === "construction_work" ? "labor" : r.category,
    semantic_owner: `${catalogId}:${r.row_id}` })));
  result.bindings.push(...addedResources.map(r => ({ row_id: r.row_id, locator_id: locatorId,
    applicability: { contract: VIBRATION_COMPLETION_S2733_CONTRACT, quantity_basis: "APPROVED_PROJECT_METHOD_STATEMENT_AND_EQUIPMENT_SCHEDULE",
      universal_consumption_claimed: false, universal_productivity_claimed: false } })));
  for (const r of result.resources) {
    const operationId = r.category === "service" ? "control" : r.category === "delivery" ? "equipment-logistics" : "vibration";
    r.resource_graph = { ...r.resource_graph, operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru,
      operationId, operationTitleRu: operationId === "control" ? "Контроль выполнения виброуплотнения"
        : operationId === "equipment-logistics" ? "Доставка и возврат оборудования" : "Виброуплотнение бетона",
      completionCriterionRu: operationId === "control" ? "Режим виброуплотнения проверен и записан по принятому плану качества."
        : operationId === "equipment-logistics" ? "Подтверждены маршрут, число рейсов и состав оплачиваемой мобилизации."
          : "Выбранный способ виброуплотнения обеспечен трудом, вибратором, его совместимыми принадлежностями и расходниками; результат проверен по проекту.",
    } };
  }
  result.definition.applicability = { ...result.definition.applicability, deferMissingProjectFactsToRows: true };
  const oldAndNewInputs = new Set([...addedParameters.map(p => p.parameter_id), "internal_vibrator_machine_h"]);
  for (const id of oldAndNewInputs) {
    const p = result.parameters.find(value => value.parameter_id === id)!;
    const formulas = [...new Set([...(result.baseline.formula_consumer_ids[id] ?? []),
      ...addedFormulas.filter(f => f.input_parameter_ids?.includes(id)).map(f => f.formula_id)])];
    const rows = [...new Set([...(result.baseline.resource_consumer_row_ids[id] ?? []),
      ...addedResources.filter(r => JSON.stringify([r.resource_graph, r.inclusion_ast]).includes(`"${id}"`) || formulas.includes(r.formula_id)).map(r => r.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows };
    result.baseline.formula_consumer_ids[id] = formulas; result.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameterIds.has(id)) {
      result.baseline.uom_by_parameter[id] = p.unit_id; result.baseline.normative_source_ids[id] = [CONCRETE_SLAB_VIBRATION_SOURCE_ID];
      result.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru;
    }
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: result, targetRowIds: addedResources.map(r => r.row_id), addedParameterIds: addedParameters.map(p => p.parameter_id),
    addedFormulaIds: addedFormulas.map(f => f.formula_id), changedFormulaIds: [], contract: VIBRATION_COMPLETION_S2733_CONTRACT };
}
