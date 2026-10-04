import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const PLACEMENT_EQUIPMENT_COMPLETION_CONTRACT_S2733 = "placement-equipment-completion:s27-33.v1";
export const PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733 = {
  pumpIncludedKit: "material:concrete:pump-included-kit",
  craneIncludedKit: "material:concrete:crane-bucket-included-kit",
  separateKit: "material:concrete:placement-equipment-separate-kit",
  delivery: "delivery:concrete:placement-equipment-and-kits",
} as const;
const modeId = "placement_equipment_accessories_pricing_mode", specId = "placement_equipment_accessories_specification", countId = "placement_equipment_accessories_set_count";

/** Equipment schedules supply the full compatible kit and price scope. Pump
 * and crane/bucket alternatives share those facts, never their included cost
 * owner. No productivity, hose length, rigging layout or freight is inferred. */
export function buildPlacementEquipmentCompletionS2733(catalogId: string,
  methodId: "placement_method" | "placement_placement_method", projectSourceSha256: string) {
  const pump: AutomaticInclusionCondition = { kind: "equals", parameterId: methodId, value: "pump" };
  const crane: AutomaticInclusionCondition = { kind: "equals", parameterId: methodId, value: "crane_bucket" };
  const equipment: AutomaticInclusionCondition = { kind: "or", operands: [pump, crane] };
  const included = (branch: AutomaticInclusionCondition): AutomaticInclusionCondition => ({ kind: "and", operands: [branch,
    { kind: "equals", parameterId: modeId, value: "INCLUDED_IN_EQUIPMENT_RATE" }] });
  const separate: AutomaticInclusionCondition = { kind: "and", operands: [equipment,
    { kind: "equals", parameterId: modeId, value: "SEPARATE_SUPPLY" }] };
  const delivery: AutomaticInclusionCondition = { kind: "and", operands: [equipment,
    { kind: "equals", parameterId: "placement_equipment_delivery_mode", value: "SEPARATE_CONFIRMED_TRIPS" }] };
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
    ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.separateKit,
    orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    { rowId: PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.pumpIncludedKit, formulaId: "placement_pump_included_kit_v1", expression: countId,
      section: "Подача бетонной смеси", category: "material", title: "Полная комплектация и расходники бетононасоса, включённые в его ставку", unitId: "set",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: included(pump), inputParameterIds: [specId, countId], titleParameterIds: [specId] },
    { rowId: PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.craneIncludedKit, formulaId: "placement_crane_bucket_included_kit_v1", expression: countId,
      section: "Подача бетонной смеси", category: "material", title: "Полная комплектация бадьи, совместимые приспособления и расходники, включённые в ставку подачи краном", unitId: "set",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: included(crane), inputParameterIds: [specId, countId], titleParameterIds: [specId] },
    { rowId: PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.separateKit, formulaId: "placement_equipment_separate_kit_v1", expression: countId,
      section: "Подача бетонной смеси", category: "material", title: "Отдельный полный комплект принадлежностей и расходников выбранного способа подачи смеси", unitId: "set",
      procurement: true, inclusion: separate, inputParameterIds: [specId], titleParameterIds: [specId], purchaseBalance: balance.owner.purchaseBalance },
    { rowId: PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.delivery, formulaId: "placement_equipment_confirmed_delivery_v1", expression: "placement_equipment_delivery_trip_count",
      section: "Подача бетонной смеси", category: "delivery", title: "Подтверждённая отдельная перевозка и возврат оборудования подачи смеси и его комплектов", unitId: "trip",
      procurement: true, inclusion: delivery, inputParameterIds: ["placement_equipment_delivery_reference"], titleParameterIds: ["placement_equipment_delivery_reference"],
      manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: PLACEMENT_EQUIPMENT_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_concrete_placement_schedule", normId: "approved-project-placing-equipment-kit-and-price-scope",
    sourceMetadata: { source_title: "Проектная ведомость оборудования подачи бетонной смеси и подтверждённое предложение поставщика",
      source_document_version: "project-concrete-placement-schedule-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий контракт проектных часов подачи насосом или краном; состав полного совместимого комплекта и условия цены по конкретной ведомости" },
    applicabilityRu: "Комплектация выбранного способа подачи насосом или краном с бадьёй, расходники, принадлежности, оператор, энергия и перевозка по фактической ведомости и условиям цены.",
    ordinary: [{ id: methodId, title: "Существующий выбранный способ подачи бетонной смеси", valueType: "enum", unitId: null,
      kind: "ordinary", values: ["pump", "crane_bucket", "direct_chute"] }], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      parameter(modeId, "Полный комплект подачи смеси: включён в ставку оборудования или поставляется отдельно", "enum", null, equipment,
        { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specId, "Конкретный полный комплект выбранного насоса или бадьи: совместимые принадлежности, расходники и фактическое количество каждого изделия", "text", null, equipment),
      parameter(countId, "Фактическое целое число одинаковых полных комплектов подачи смеси", "integer", "set", equipment, { min: 1 }),
      parameter("placement_equipment_specification", "Выбранные насос или кран с бадьёй и их применимость по проектному способу подачи", "text", null, equipment),
      parameter("placement_equipment_price_scope_reference", "Состав ставок подачи: оборудование и энергия, труд оператора, включённые или отдельные комплектующие без повторной оплаты", "text", null, equipment),
      parameter("placement_equipment_delivery_mode", "Перевозка и возврат выбранного оборудования и комплектов: включены в ставку или отдельные подтверждённые рейсы", "enum", null, equipment,
        { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter("placement_equipment_delivery_reference", "Подтверждённая перевозка/возврат оборудования и комплектов с водителем, маршрутом и условиями оплаты", "text", null, equipment),
      parameter("placement_equipment_delivery_trip_count", "Фактическое число отдельно подтверждённых рейсов оборудования подачи смеси и комплектов", "integer", "trip", delivery, { min: 1 }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => ({ ...row, resource_graph: { ...row.resource_graph,
      ...(row.row_id === PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.pumpIncludedKit ? { includedInResourceOwnerRowId: "equipment:concrete:pump" } : {}),
      ...(row.row_id === PLACEMENT_EQUIPMENT_COMPLETION_ROWS_S2733.craneIncludedKit ? { includedInResourceOwnerRowId: "equipment:concrete:crane-bucket" } : {}) },
      source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_EQUIPMENT_SCHEDULE_AND_SUPPLIER_PRICE_SCOPE" } })) };
}
