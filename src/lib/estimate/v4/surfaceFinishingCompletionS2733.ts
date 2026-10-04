import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const SURFACE_FINISHING_COMPLETION_CONTRACT_S2733 = "surface-finishing-completion:s27-33.v1";
export const SURFACE_FINISHING_COMPLETION_ROWS_S2733 = {
  manualIncludedKit: "material:concrete:surface-finishing-manual-included-kit",
  equipmentIncludedKit: "material:concrete:surface-finishing-equipment-included-kit",
  separateKit: "material:concrete:surface-finishing-separate-kit",
  equipment: "equipment:concrete:surface-finishing",
  delivery: "delivery:concrete:surface-finishing-equipment-and-kits",
} as const;
const methodId = "surface_finishing_method", modeId = "surface_finishing_accessories_pricing_mode",
  specId = "surface_finishing_accessories_specification", countId = "surface_finishing_accessories_set_count";
const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
const equals = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value });

/** Completes an existing project-hours finishing operation. The project selects
 * its method, full tool/consumable BOM, actual equipment time and price scope;
 * no surface-area productivity or universal accessory consumption is inferred. */
export function buildSurfaceFinishingCompletionS2733(catalogId: string,
  laborHoursId: "finishing_worker_h" | "placement_finishing_worker_h", projectSourceSha256: string) {
  const active: AutomaticInclusionCondition = { kind: "greater_than", parameterId: laborHoursId, value: 0 };
  const manual = and(active, equals(methodId, "MANUAL_TOOLS")), equipment = and(active, equals(methodId, "PROJECT_SELECTED_EQUIPMENT"));
  const delivery = and(active, equals("surface_finishing_delivery_mode", "SEPARATE_CONFIRMED_TRIPS"));
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
    ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.separateKit,
    orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    { rowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.manualIncludedKit, formulaId: "surface_finishing_manual_included_kit_v1", expression: countId,
      section: "Отделка поверхности бетона", category: "material", title: "Полный комплект ручного инструмента, принадлежностей и расходников отделки, включённый в ставку труда", unitId: "set",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: and(manual, equals(modeId, "INCLUDED_IN_SELECTED_RATE")), inputParameterIds: [specId, countId], titleParameterIds: [specId] },
    { rowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.equipmentIncludedKit, formulaId: "surface_finishing_equipment_included_kit_v1", expression: countId,
      section: "Отделка поверхности бетона", category: "material", title: "Полный совместимый комплект инструмента, принадлежностей и расходников отделки, включённый в ставку оборудования", unitId: "set",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: and(equipment, equals(modeId, "INCLUDED_IN_SELECTED_RATE")), inputParameterIds: [specId, countId], titleParameterIds: [specId] },
    { rowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.separateKit, formulaId: "surface_finishing_separate_kit_v1", expression: countId,
      section: "Отделка поверхности бетона", category: "material", title: "Отдельная поставка полного комплекта инструмента, принадлежностей и расходников отделки", unitId: "set",
      procurement: true, inclusion: and(active, equals(modeId, "SEPARATE_SUPPLY")), inputParameterIds: [methodId, specId], titleParameterIds: [specId], purchaseBalance: balance.owner.purchaseBalance },
    { rowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.equipment, formulaId: "surface_finishing_project_equipment_v1", expression: "surface_finishing_equipment_machine_h",
      section: "Отделка поверхности бетона", category: "equipment", title: "Выбранное проектное оборудование отделки поверхности бетона", unitId: "machine_hour",
      procurement: true, inclusion: equipment, inputParameterIds: ["surface_finishing_equipment_specification", "surface_finishing_equipment_machine_h", "surface_finishing_price_scope_reference"], titleParameterIds: ["surface_finishing_equipment_specification"] },
    { rowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.delivery, formulaId: "surface_finishing_confirmed_delivery_v1", expression: "surface_finishing_delivery_trip_count",
      section: "Отделка поверхности бетона", category: "delivery", title: "Подтверждённая отдельная перевозка и возврат оборудования и комплектов отделки", unitId: "trip",
      procurement: true, inclusion: delivery, inputParameterIds: ["surface_finishing_delivery_reference"], titleParameterIds: ["surface_finishing_delivery_reference"],
      manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: SURFACE_FINISHING_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_concrete_placement_schedule", normId: "approved-project-surface-finishing-method-bom-and-price-scope",
    sourceMetadata: { source_title: "Проектная ведомость отделки поверхности бетона и подтверждённые условия цены",
      source_document_version: "project-concrete-placement-schedule-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий контракт проектных часов отделки; выбранный способ, полный совместимый состав инструмента/расходников, оборудование и перевозка по конкретной ведомости" },
    applicabilityRu: "Ресурсы отделки при положительных существующих проектных часах труда; способ и оборудование выбираются по проекту, без повторной оплаты оператора и энергии.",
    ordinary: [{ id: laborHoursId, title: "Существующие проектные часы труда отделки", valueType: "decimal", unitId: "man_hour", kind: "ordinary", min: 0 }],
    profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      parameter(methodId, "Проектный способ отделки поверхности: ручной инструмент или выбранное оборудование", "enum", null, active,
        { values: ["MANUAL_TOOLS", "PROJECT_SELECTED_EQUIPMENT"] }),
      parameter(modeId, "Полный комплект инструмента и расходников отделки: включён в ставку выбранного способа или отдельная поставка", "enum", null, active,
        { values: ["INCLUDED_IN_SELECTED_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specId, "Полная ведомость одного комплекта отделки: совместимый инструмент, принадлежности и расходники с фактическим количеством каждого изделия", "text", null, active),
      parameter(countId, "Фактическое целое число одинаковых полных комплектов отделки поверхности", "integer", "set", active, { min: 1 }),
      parameter("surface_finishing_price_scope_reference", "Условия цены отделки: труд/оператор в существующих часах труда, энергия в выбранной ставке, включённые или отдельные комплекты и перевозка", "text", null, active),
      parameter("surface_finishing_equipment_specification", "Конкретное оборудование отделки, применимость к проектной поверхности и полный совместимый состав", "text", null, equipment),
      parameter("surface_finishing_equipment_machine_h", "Фактические проектные машино-часы выбранного оборудования отделки", "decimal", "machine_hour", equipment, { min: 0 }),
      parameter("surface_finishing_delivery_mode", "Перевозка/возврат оборудования и комплектов отделки: включены в выбранную ставку или отдельные подтверждённые рейсы", "enum", null, active,
        { values: ["INCLUDED_IN_SELECTED_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter("surface_finishing_delivery_reference", "Подтверждённые условия перевозки/возврата отделки: маршрут, водитель, состав груза и владелец оплаты", "text", null, active),
      parameter("surface_finishing_delivery_trip_count", "Фактическое число отдельно подтверждённых рейсов оборудования и комплектов отделки", "integer", "trip", delivery, { min: 1 }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => ({ ...row, resource_graph: { ...row.resource_graph,
      ...(row.row_id === SURFACE_FINISHING_COMPLETION_ROWS_S2733.manualIncludedKit ? { includedInResourceOwnerRowId: "work:concrete:finish-surface" } : {}),
      ...(row.row_id === SURFACE_FINISHING_COMPLETION_ROWS_S2733.equipmentIncludedKit ? { includedInResourceOwnerRowId: SURFACE_FINISHING_COMPLETION_ROWS_S2733.equipment } : {}) },
      source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_FINISHING_METHOD_BOM_AND_DIRECT_PROJECT_HOURS" } })) };
}
