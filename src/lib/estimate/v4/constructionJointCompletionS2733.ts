import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";
export const CONSTRUCTION_JOINT_COMPLETION_S2733_CONTRACT = "construction-joint-counted-resources:s27-33.v1";
export const CONSTRUCTION_JOINT_COMPLETION_ROWS = {
  includedKit: "material:concrete:construction-joint-included-kit", separateKit: "material:concrete:construction-joint-separate-kit",
  includedEquipment: "equipment:concrete:construction-joint-included-tools", separateEquipment: "equipment:concrete:construction-joint-separate-tools",
  delivery: "delivery:concrete:construction-joint-supply",
} as const;
type Source = Parameters<typeof buildAutomaticConstructionOwnerR1>[0]["sourceMetadata"];

/** All quantities are actual project schedules. No universal accessories,
 * welding method, installation productivity or truck capacity is assumed. */
export function buildConstructionJointCompletionS2733(catalogId: string, modeParameterId: string, source: Source) {
  const active: AutomaticInclusionCondition = { kind: "equals", parameterId: modeParameterId, value: "WATERSTOP" };
  const equals = (id: string, value: string): AutomaticInclusionCondition => ({ kind: "and", operands: [active, { kind: "equals", parameterId: id, value }] });
  const kitPricing = "construction_joint_accessories_pricing_mode", kitSpec = "construction_joint_accessories_specification", count = "construction_joint_accessories_set_count";
  const toolPricing = "construction_joint_equipment_pricing_mode", toolSpec = "construction_joint_equipment_specification", toolHours = "construction_joint_equipment_machine_h";
  const deliveryMode = "construction_joint_supply_delivery_mode", deliverySpec = "construction_joint_supply_delivery_reference", trips = "construction_joint_supply_delivery_trip_count";
  const equipment: AutomaticInclusionCondition = { kind: "or", operands: ["INCLUDED_IN_INSTALLATION_LABOR_RATE", "SEPARATE_EQUIPMENT_RATE"].map(v => equals(toolPricing, v)) };
  const separateDelivery = equals(deliveryMode, "SEPARATE_CONFIRMED_TRIPS");
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: CONSTRUCTION_JOINT_COMPLETION_ROWS.separateKit, orderUnitId: "set", consumed: count, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    ...["INCLUDED_IN_WATERSTOP_RATE", "SEPARATE_SUPPLY"].map((v): AutomaticRowSpec => ({ rowId: v === "SEPARATE_SUPPLY" ? CONSTRUCTION_JOINT_COMPLETION_ROWS.separateKit : CONSTRUCTION_JOINT_COMPLETION_ROWS.includedKit,
      formulaId: v === "SEPARATE_SUPPLY" ? "construction_joint_separate_kit_v1" : "construction_joint_included_kit_v1", expression: count,
      section: "Рабочий шов бетонирования", category: "material", title: v === "SEPARATE_SUPPLY" ? "Отдельный полный комплект крепления, соединения и расходников гидрошпонки" : "Комплект крепления, соединения и расходников, включённый в поставку гидрошпонки",
      unitId: "set", procurement: v === "SEPARATE_SUPPLY", costTreatment: v === "SEPARATE_SUPPLY" ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: equals(kitPricing, v), inputParameterIds: [kitSpec, count], titleParameterIds: [kitSpec], ...(v === "SEPARATE_SUPPLY" ? { purchaseBalance: balance.owner.purchaseBalance } : {}) })),
    ...["INCLUDED_IN_INSTALLATION_LABOR_RATE", "SEPARATE_EQUIPMENT_RATE"].map((v): AutomaticRowSpec => ({ rowId: v === "SEPARATE_EQUIPMENT_RATE" ? CONSTRUCTION_JOINT_COMPLETION_ROWS.separateEquipment : CONSTRUCTION_JOINT_COMPLETION_ROWS.includedEquipment,
      formulaId: v === "SEPARATE_EQUIPMENT_RATE" ? "construction_joint_separate_tools_v1" : "construction_joint_included_tools_v1", expression: toolHours,
      section: "Рабочий шов бетонирования", category: "equipment", title: v === "SEPARATE_EQUIPMENT_RATE" ? "Оборудование монтажа гидрошпонки по проектному способу, отдельная оплата" : "Оборудование монтажа гидрошпонки, включённое в цену монтажного труда",
      unitId: "machine_hour", procurement: v === "SEPARATE_EQUIPMENT_RATE", costTreatment: v === "SEPARATE_EQUIPMENT_RATE" ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: equals(toolPricing, v), inputParameterIds: [toolSpec, toolHours], titleParameterIds: [toolSpec] })),
    { rowId: CONSTRUCTION_JOINT_COMPLETION_ROWS.delivery, formulaId: "construction_joint_supply_delivery_v1", expression: trips,
      section: "Рабочий шов бетонирования", category: "delivery", title: "Подтверждённая отдельная перевозка гидрошпонки и её комплекта", unitId: "trip", procurement: true,
      inclusion: separateDelivery, inputParameterIds: [deliverySpec, trips], titleParameterIds: [deliverySpec], manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: CONSTRUCTION_JOINT_COMPLETION_S2733_CONTRACT, semanticOwner: catalogId,
    sourceId: "project_concrete_construction_joint_schedule", normId: "actual-project-waterstop-bom-equipment-and-transport-not-a-norm", sourceMetadata: source,
    applicabilityRu: "Рабочий шов с выбранной гидрошпонкой: фактические крепления, соединения, расходники, труд, инструмент, контроль и поставка по проектному способу; новые нормы не вводятся.",
    ordinary: [], profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [], conditional: [
      parameter(modeParameterId, "Существующий выбранный режим рабочего шва", "enum", null, active, { values: ["NONE", "WATERSTOP"] }),
      parameter(kitPricing, "Комплект гидрошпонки включён в цену материала или поставляется отдельно", "enum", null, active, { values: ["INCLUDED_IN_WATERSTOP_RATE", "SEPARATE_SUPPLY"] }),
      parameter(kitSpec, "Состав одного полного комплекта: совместимые крепления, соединения и расходники, количество каждого по проекту", "text", null, active),
      parameter(count, "Фактическое число одинаковых полных комплектов гидрошпонки", "integer", "set", active, { min: 1 }),
      parameter(toolPricing, "Оборудование монтажа: проектом не требуется, включено в монтажный труд или оплачивается отдельно", "enum", null, active, { values: ["NOT_REQUIRED_BY_PROJECT", "INCLUDED_IN_INSTALLATION_LABOR_RATE", "SEPARATE_EQUIPMENT_RATE"] }),
      parameter(toolSpec, "Подтверждённое оборудование по выбранному способу монтажа и соединения гидрошпонки", "text", null, equipment),
      parameter(toolHours, "Фактическое машинное время монтажа по проектной ведомости", "decimal", "machine_hour", equipment, { min: 0.001 }),
      parameter("construction_joint_method_statement_reference", "Проектный способ монтажа, крепления и соединения гидрошпонки", "text", null, active),
      parameter("construction_joint_quality_program_reference", "План и запись контроля рабочего шва в действующей программе приёмки бетонирования", "text", null, active),
      parameter(deliveryMode, "Перевозка гидрошпонки и полного комплекта включена в поставку или подтверждена отдельно", "enum", null, active, { values: ["INCLUDED_IN_MATERIAL_SUPPLY", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter(deliverySpec, "Подтверждённая перевозка гидрошпонки и комплекта: состав, маршрут и границы включения в цену", "text", null, active),
      parameter(trips, "Фактическое число отдельных рейсов гидрошпонки и комплекта", "integer", "trip", separateDelivery, { min: 1 }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i].expression, output_unit_id: rows[i].unitId })),
    resources: addition.resources.map(row => ({ ...row, resource_graph: { ...row.resource_graph,
      ...(row.row_id === CONSTRUCTION_JOINT_COMPLETION_ROWS.includedKit ? { includedInResourceOwnerRowId: "material:concrete:construction-joint-waterstop" } : {}),
      ...(row.row_id === CONSTRUCTION_JOINT_COMPLETION_ROWS.includedEquipment ? { includedInResourceOwnerRowId: "work:concrete:construction-joint-waterstop-install" } : {}),
    }, source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false, quantity_basis: "ACTUAL_COUNTED_PROJECT_BOM_AND_DIRECT_HOURS_OR_TRIPS" } })) };
}
