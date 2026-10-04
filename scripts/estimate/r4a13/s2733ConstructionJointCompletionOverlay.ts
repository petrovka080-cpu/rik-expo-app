import { createHash } from "node:crypto";
import { stringifyCanonicalEstimateJson } from "../../../src/lib/estimate/estimateDeterministicHash";
import { CONCRETE_WATER_CURING_GROUP_TARGETS_S2733 } from "./s2733ConcreteWaterCuringGroupOverlay";
import { buildConstructionJointCompletionS2733, CONSTRUCTION_JOINT_COMPLETION_ROWS as ids } from "../../../src/lib/estimate/v4/constructionJointCompletionS2733";
import type { PurchaseGroupRepresentative } from "./s2732PurchaseGroupOverlay";
export const CONSTRUCTION_JOINT_COMPOSITE_TARGETS_S2733 = ["concrete_slab", "stairs_concrete"].flatMap(family => ["standard", "high_load", "large_area", "repair", "small_area", "technical_room", "wet_zone"].map(context => `canonical-work:base:concrete_foundation_interior_${family}_form_${context}`));
export const CONSTRUCTION_JOINT_COMPLETION_TARGETS_S2733 = [...CONCRETE_WATER_CURING_GROUP_TARGETS_S2733, ...CONSTRUCTION_JOINT_COMPOSITE_TARGETS_S2733];
const materialId = "material:concrete:construction-joint-waterstop", workId = "work:concrete:construction-joint-waterstop-install";
const parameterSuffixes = ["construction_joint_mode", "construction_joint_waterstop_specification", "construction_joint_waterstop_length_m", "construction_joint_installation_worker_h"];
const sourceCatalog = "canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard";
const hash = (value: unknown) => createHash("sha256").update(stringifyCanonicalEstimateJson(value)).digest("hex");
function invariant(value: unknown, code: string): asserts value { if (!value) throw new Error(`S2733_CONSTRUCTION_JOINT:${code}`); }

export function overlayS2733ConstructionJointCompletion(parent: PurchaseGroupRepresentative, source: PurchaseGroupRepresentative) {
  const catalogId = String(parent.definition.catalog_id), composite = CONSTRUCTION_JOINT_COMPOSITE_TARGETS_S2733.includes(catalogId);
  invariant(CONSTRUCTION_JOINT_COMPLETION_TARGETS_S2733.includes(catalogId), "FINITE_SCOPE");
  invariant(source.definition.catalog_id === sourceCatalog && source.resources.length === 76 && source.parameters.length === 153, "SOURCE_ENVELOPE");
  const standardStairs = catalogId === sourceCatalog;
  const expectedShape = !composite ? [19, 51] : standardStairs ? [76, 153] : catalogId.includes("concrete_slab_form_") ? [72, 187] : [43, 104];
  invariant(parent.resources.length === expectedShape[0] && parent.parameters.length === expectedShape[1] && parent.parameters.every(p => p.default_value == null), "DELIVERED_ENVELOPE_DRIFT");
  const next = structuredClone(parent), addedParameterIds: string[] = [], addedFormulaIds: string[] = [], addedResourceRowIds: string[] = [];
  const prefix = composite ? "placement_" : "", mode = `${prefix}construction_joint_mode`, hasJoint = parent.resources.some(row => row.row_id === materialId);
  invariant(hasJoint === (!composite || standardStairs) && parent.resources.some(row => row.row_id === workId) === hasJoint, "ORIGINAL_JOINT_SCOPE_DRIFT");
  if (!hasJoint) {
    const importedParameters = [...parameterSuffixes.map(id => `placement_${id}`), "effective_resource_quantity_material_concrete_construction_joint_waterstop"];
    for (const id of importedParameters) {
      const original = source.parameters.find(p => p.parameter_id === id); invariant(original && !next.parameters.some(p => p.parameter_id === id), "SOURCE_PARAMETER_DRIFT");
      const p = structuredClone(original);p.ordinal = next.parameters.length;
      p.truth_metadata = { ...p.truth_metadata, semantic_parameter_key: `${catalogId}:${id}`, guide: { ...p.truth_metadata.guide,
        applicability: "Проектные сведения о конкретном рабочем шве выбранной плиты или лестницы; метраж, способ и труд не выводятся из универсальной нормы.",
      } };next.parameters.push(p);addedParameterIds.push(id);
    }
    for (const rowId of [materialId, workId]) {
      const original = source.resources.find(row => row.row_id === rowId); invariant(original, "SOURCE_RESOURCE_MISSING");
      const f = source.formulas.find(f => f.formula_id === original.formula_id); invariant(f && !next.formulas.some(old => old.formula_id === f.formula_id), "SOURCE_FORMULA_COLLISION");
      next.formulas.push(structuredClone(f));addedFormulaIds.push(String(f.formula_id));
      const row = structuredClone(original);Object.assign(row, { ordinal: next.resources.length, semantic_owner: `${catalogId}:${rowId}`, cost_owner_id: `${catalogId}:${rowId}` });
      row.resource_graph = { ...row.resource_graph, semanticOwnerId: `${catalogId}:${rowId}` };next.resources.push(row);addedResourceRowIds.push(rowId);
    }
  }
  invariant(next.parameters.some(p => p.parameter_id === mode && hash(p.constraints_json.values) === hash(["NONE", "WATERSTOP"])), "PROJECT_MODE_DRIFT");
  const guide = source.parameters.find(p => p.parameter_id === "placement_construction_joint_waterstop_specification")!.truth_metadata.guide;
  const addition = buildConstructionJointCompletionS2733(catalogId, mode, {
    source_title: "Проектная ведомость рабочего шва, комплектность и производственная логистика", source_document_version: "project-construction-joint-schedule-r1",
    definition_hash: guide.source_snapshot_hash, exact_locator: "Существующий проектный контракт монтажа гидрошпонки; фактическая ведомость изделий, часов, контроля и перевозки", artifact_sha256: guide.source_snapshot_hash,
  });
  for (const parameter of addition.parameters) {
    if (next.parameters.some(p => p.parameter_id === parameter.parameter_id)) { invariant(parameter.parameter_id === mode, "NEW_PARAMETER_COLLISION");continue; }
    next.parameters.push({ ...parameter, ordinal: next.parameters.length });addedParameterIds.push(parameter.parameter_id);
  }
  for (const f of addition.formulas) { invariant(!next.formulas.some(old => old.formula_id === f.formula_id), "NEW_FORMULA_COLLISION");next.formulas.push(f);addedFormulaIds.push(f.formula_id); }
  for (const row of addition.resources) { invariant(!next.resources.some(old => old.row_id === row.row_id), "NEW_ROW_COLLISION");next.resources.push({ ...row,
    ordinal: next.resources.length, row_type: row.category === "delivery" ? "service" : row.category });addedResourceRowIds.push(row.row_id); }
  const operation = { contractVersion: "canonical-operation-resource/v1", groupId: catalogId, groupTitleRu: parent.passport.physical_result_ru,
    operationId: "joint", operationTitleRu: "Герметизация рабочего шва бетонирования", completionCriterionRu: "Проектный рабочий шов обеспечен гидрошпонкой, полным комплектом крепления и соединения, расходниками, трудом, применимым инструментом, программой контроля и подтверждённой поставкой; включённые компоненты не оплачиваются повторно." };
  for (const row of next.resources.filter(row => [materialId, workId, ...Object.values(ids)].includes(row.row_id))) {
    row.resource_graph = { ...row.resource_graph, operationCompositionV1: operation,
      ...(row.row_id === workId ? { inputParameterIds: [...new Set([...(row.resource_graph.inputParameterIds ?? []), "construction_joint_method_statement_reference", "construction_joint_quality_program_reference"])] } : {}),
      ...(row.row_id === materialId ? { inputParameterIds: [...new Set([...(row.resource_graph.inputParameterIds ?? []), "construction_joint_supply_delivery_mode", "construction_joint_supply_delivery_reference"])] } : {}),
    };
  }
  for (const parameter of next.parameters) {
    const id = String(parameter.parameter_id), formulas = next.formulas.filter(f => f.input_parameter_ids.includes(id)).map(f => f.formula_id);
    parameter.truth_metadata.formula_consumers = formulas;next.baseline.formula_consumer_ids[id] = formulas;
    if (addedParameterIds.includes(id)) {
      const rows = next.resources.filter(row => formulas.includes(row.formula_id) || (row.resource_graph.inputParameterIds ?? []).includes(id)).map(row => row.row_id);
      parameter.truth_metadata.resource_branch_consumers = rows;next.baseline.resource_consumer_row_ids[id] = rows;
      next.baseline.uom_by_parameter[id] = parameter.unit_id;next.baseline.normative_source_ids[id] = [];next.baseline.guide_provenance_ru[id] = parameter.truth_metadata.guide.guide_short_ru;
    }
  }
  next.baseline.parameter_schema_sha256 = hash(next.parameters.map(p => ({ parameterId: p.parameter_id, unitId: p.unit_id, valueType: p.value_type, constraints: p.constraints_json, truth: p.truth_metadata })));
  invariant(next.parameters.every(p => p.default_value == null), "HIDDEN_DEFAULT");
  return { representative: next, targetRowIds: [materialId, workId, ...Object.values(ids)], addedParameterIds, addedFormulaIds, changedFormulaIds: [], addedResourceRowIds };
}
