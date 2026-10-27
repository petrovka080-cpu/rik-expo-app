import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { buildCuringOperationCompletionS2733, CURING_COMPLETION_ROWS, CURING_COMPLETION_S2733_CONTRACT } from "../../../src/lib/estimate/v4/curingOperationCompletionS2733";
import { CONCRETE_SLAB_CURING_SOURCE_ID } from "../../../src/lib/estimate/v4/concreteSlabCuringR1";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";

export const STANDALONE_CURING_COMPLETION_TARGETS_S2733 = ["anchor_group", "belt", "column_base", "concrete_slab", "pedestal", "pile_cap"]
  .flatMap(family => ["standard", "high_load", "technical_room", "wet_zone"]
    .map(context => `canonical-work:base:concrete_foundation_interior_${family}_cure_${context}`));
const hash = (v: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(v)).digest("hex");
function invariant(v: unknown, code: string): asserts v { if (!v) throw Error(`S2733_CURING_COMPLETION:${code}`); }

export function overlayS2733StandaloneCuringCompletion(parent: PurchaseGroupRepresentative, locatorId: string) {
  const catalogId = String(parent.definition.catalog_id);
  invariant(STANDALONE_CURING_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(parent.resources.length === 8 && parent.parameters.length === 24, "DELIVERED_SCOPE_DRIFT");
  invariant(parent.parameters.every(p => p.default_value == null), "HIDDEN_DEFAULT");
  invariant(/^[0-9a-f-]{36}$/u.test(locatorId), "METHOD_LOCATOR_REQUIRED");
  const result: PurchaseGroupRepresentative = structuredClone(parent);
  const addition = buildCuringOperationCompletionS2733(catalogId);
  const oldParameterIds = new Set(parent.parameters.map(p => String(p.parameter_id)));
  const addedParameters = addition.parameters.filter(p => !oldParameterIds.has(p.parameter_id));
  const addedResources = addition.resources.filter(r => r.row_id !== CURING_COMPLETION_ROWS.water);
  const addedFormulaIds = new Set(addedResources.map(r => r.formula_id));
  const addedFormulas = addition.formulas.filter(f => addedFormulaIds.has(f.formula_id));
  invariant(addedResources.every(r => !parent.resources.some(old => old.row_id === r.row_id)), "RESOURCE_COLLISION");
  invariant(addedFormulas.every(f => !parent.formulas.some(old => old.formula_id === f.formula_id)), "FORMULA_COLLISION");
  result.parameters.push(...addedParameters.map((p, i) => ({ ...p, ordinal: parent.parameters.length + i })));
  result.formulas.push(...addedFormulas.map(f => ({ ...f, ast_sha256: hash(f.ast) })));
  result.resources.push(...addedResources.map((r, i) => ({ ...r, ordinal: parent.resources.length + i,
    row_type: r.category === "delivery" ? "service" : r.category, semantic_owner: `${catalogId}:${r.row_id}` })));
  result.bindings.push(...addedResources.map(r => ({ row_id: r.row_id, locator_id: locatorId,
    applicability: { contract: CURING_COMPLETION_S2733_CONTRACT, quantity_basis: "APPROVED_PROJECT_CURING_METHOD_AND_DIRECT_PROJECT_SCHEDULE",
      universal_consumption_claimed: false, universal_productivity_claimed: false } })));
  const existingWater = result.resources.find(r => r.row_id === CURING_COMPLETION_ROWS.water);
  const waterMetadata = addition.resources.find(r => r.row_id === CURING_COMPLETION_ROWS.water)!;
  invariant(existingWater && !existingWater.resource_graph.purchaseBalanceV1, "EXISTING_WATER_OWNER_DRIFT");
  existingWater.resource_graph = { ...existingWater.resource_graph,
    purchaseBalanceV1: waterMetadata.resource_graph!.purchaseBalanceV1,
    effectiveQuantityOutputV1: waterMetadata.resource_graph!.effectiveQuantityOutputV1 };
  for (const r of result.resources) {
    const operationId = r.row_id.includes("quality-control") ? "control"
      : r.row_id === "delivery:concrete:curing-equipment-mobilization" ? "equipment-logistics" : "curing";
    r.resource_graph = { ...r.resource_graph, operationCompositionV1: {
      contractVersion: "canonical-operation-resource/v1", groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru,
      operationId, operationTitleRu: operationId === "control" ? "Контроль выполнения ухода"
        : operationId === "equipment-logistics" ? "Доставка и возврат оборудования" : "Уход за бетоном",
      completionCriterionRu: operationId === "control" ? "Режим ухода проверен и записан по принятому плану качества."
        : operationId === "equipment-logistics" ? "Подтверждены транспорт, маршрут, число рейсов и состав оплачиваемой мобилизации."
          : "Выбранный способ ухода обеспечен материалами, трудом, применимой техникой, её комплектностью и поставкой воды; завершение подтверждено по проекту.",
    } };
  }
  result.definition.applicability = { ...result.definition.applicability, deferMissingProjectFactsToRows: true };
  const oldAndNewInputs = new Set([...addedParameters.map(p => p.parameter_id), "approved_external_curing_method", "application_equipment_required", "application_equipment_machine_h"]);
  for (const id of oldAndNewInputs) {
    const p = result.parameters.find(value => value.parameter_id === id)!;
    const formulas = [...new Set([...(result.baseline.formula_consumer_ids[id] ?? []),
      ...addedFormulas.filter(f => f.input_parameter_ids?.includes(id)).map(f => f.formula_id)])];
    const rows = [...new Set([...(result.baseline.resource_consumer_row_ids[id] ?? []),
      ...addedResources.filter(r => JSON.stringify([r.resource_graph, r.inclusion_ast]).includes(`"${id}"`) || formulas.includes(r.formula_id)).map(r => r.row_id)])];
    p.truth_metadata = { ...p.truth_metadata, formula_consumers: formulas, resource_branch_consumers: rows };
    result.baseline.formula_consumer_ids[id] = formulas; result.baseline.resource_consumer_row_ids[id] = rows;
    if (!oldParameterIds.has(id)) {
      result.baseline.uom_by_parameter[id] = p.unit_id; result.baseline.normative_source_ids[id] = [CONCRETE_SLAB_CURING_SOURCE_ID];
      result.baseline.guide_provenance_ru[id] = p.truth_metadata.guide.guide_short_ru;
    }
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  return { representative: result, targetRowIds: addedResources.map(r => r.row_id), addedParameterIds: addedParameters.map(p => p.parameter_id),
    addedFormulaIds: addedFormulas.map(f => f.formula_id), changedFormulaIds: [], contract: CURING_COMPLETION_S2733_CONTRACT };
}
