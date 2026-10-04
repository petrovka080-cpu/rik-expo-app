import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const WINTER_HEATING_COMPLETION_CONTRACT_S2733 = "winter-heating-completion:s27-33.v1";
export const WINTER_HEATING_COMPLETION_ROWS_S2733 = {
  includedKit: "material:concrete:winter-heating-included-kit",
  separateKit: "material:concrete:winter-heating-separate-kit",
  includedEnergy: "material:concrete:winter-heating-included-energy",
  separateEnergy: "material:concrete:winter-heating-separate-energy",
  delivery: "delivery:concrete:winter-heating-equipment-and-kits",
} as const;
const kitMode = "winter_heating_accessories_pricing_mode", specId = "winter_heating_accessories_specification", countId = "winter_heating_accessories_set_count";

/** Actual project system/BOM and metered or explicitly scheduled energy.
 * Transformer-hours and cable length never stand in for power consumption,
 * connection layout, electrical protection or confirmed transport. */
export function buildWinterHeatingCompletionS2733(catalogId: string,
  winterModeId: "winter_mode" | "placement_winter_mode", projectSourceSha256: string) {
  const active: AutomaticInclusionCondition = { kind: "equals", parameterId: winterModeId, value: true as unknown as string };
  const mode = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: "and", operands: [active, { kind: "equals", parameterId, value }] });
  const separateDelivery = mode("winter_heating_delivery_mode", "SEPARATE_CONFIRMED_TRIPS");
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition = active, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
    ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: WINTER_HEATING_COMPLETION_ROWS_S2733.separateKit,
    orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [
    { rowId: WINTER_HEATING_COMPLETION_ROWS_S2733.includedKit, formulaId: "winter_heating_included_kit_v1", expression: countId,
      section: "Зимний прогрев бетона", category: "material", title: "Полный совместимый комплект соединений, подключения, контроля и расходников прогрева, включённый в ставку оборудования", unitId: "set",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: mode(kitMode, "INCLUDED_IN_EQUIPMENT_RATE"), inputParameterIds: [specId, countId, "winter_heating_system_reference"], titleParameterIds: [specId] },
    { rowId: WINTER_HEATING_COMPLETION_ROWS_S2733.separateKit, formulaId: "winter_heating_separate_kit_v1", expression: countId,
      section: "Зимний прогрев бетона", category: "material", title: "Отдельный полный комплект соединений, подключения, контроля и расходников прогрева", unitId: "set",
      procurement: true, inclusion: mode(kitMode, "SEPARATE_SUPPLY"), inputParameterIds: [specId, "winter_heating_system_reference"], titleParameterIds: [specId], purchaseBalance: balance.owner.purchaseBalance },
    { rowId: WINTER_HEATING_COMPLETION_ROWS_S2733.includedEnergy, formulaId: "winter_heating_included_energy_v1", expression: "winter_heating_energy_kwh",
      section: "Зимний прогрев бетона", category: "material", title: "Фактическая или явно запланированная энергия прогрева, включённая в ставку оборудования", unitId: "kwh",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS", inclusion: mode("winter_heating_energy_pricing_mode", "INCLUDED_IN_EQUIPMENT_RATE"),
      inputParameterIds: ["winter_heating_energy_kwh", "winter_heating_energy_reference"], titleParameterIds: ["winter_heating_energy_reference"] },
    { rowId: WINTER_HEATING_COMPLETION_ROWS_S2733.separateEnergy, formulaId: "winter_heating_separate_energy_v1", expression: "winter_heating_energy_kwh",
      section: "Зимний прогрев бетона", category: "material", title: "Отдельно оплачиваемая энергия прогрева по фактическому учёту или явной проектной ведомости", unitId: "kwh",
      procurement: true, inclusion: mode("winter_heating_energy_pricing_mode", "SEPARATE_ENERGY_RATE"),
      inputParameterIds: ["winter_heating_energy_kwh", "winter_heating_energy_reference"], titleParameterIds: ["winter_heating_energy_reference"] },
    { rowId: WINTER_HEATING_COMPLETION_ROWS_S2733.delivery, formulaId: "winter_heating_confirmed_delivery_v1", expression: "winter_heating_delivery_trip_count",
      section: "Зимний прогрев бетона", category: "delivery", title: "Подтверждённая отдельная перевозка и возврат оборудования прогрева и его комплектов", unitId: "trip",
      procurement: true, inclusion: separateDelivery, inputParameterIds: ["winter_heating_delivery_reference"], titleParameterIds: ["winter_heating_delivery_reference"],
      manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } },
  ];
  const addition = buildAutomaticConstructionOwnerR1({ contract: WINTER_HEATING_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_concrete_placement_schedule", normId: "approved-project-winter-heating-system-bom-energy-and-price-scope",
    sourceMetadata: { source_title: "Проектная ведомость зимнего прогрева бетона и подтверждённые условия цены",
      source_document_version: "project-concrete-placement-schedule-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий контракт проектных метража кабеля и часов электропрогрева; совместимость системы, полный комплект подключения/контроля, энергия и перевозка по конкретной ведомости" },
    applicabilityRu: "Только выбранный существующий зимний режим; состав/электрическая схема и потребление подтверждаются проектом, новые нормы мощности, раскладки и выработки не вводятся.",
    ordinary: [{ id: winterModeId, title: "Существующий выбранный зимний режим", valueType: "enum", unitId: null, kind: "ordinary" }],
    profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [],
    conditional: [
      parameter("winter_heating_system_reference", "Подтверждённый проектный способ и схема прогрева: совместимость кабеля/оборудования, подключение, защита и контроль", "text", null),
      parameter("winter_heating_cable_specification", "Конкретная марка и спецификация прогревочного кабеля по подтверждённой схеме", "text", null),
      parameter("winter_heating_equipment_specification", "Выбранный трансформатор/комплект прогрева и его совместимость с проектной схемой", "text", null),
      parameter("winter_heating_price_scope_reference", "Состав ставок прогрева: существующий труд монтажа/контроля и оператор, оборудование, комплектующие, энергия и перевозка без повторной оплаты", "text", null),
      parameter(kitMode, "Полная комплектация прогрева: включена в ставку оборудования или отдельная поставка", "enum", null, active, { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specId, "Полная ведомость одного комплекта прогрева: соединения, крепления, подключение, защита, контроль, расходники с фактическим количеством каждого изделия", "text", null),
      parameter(countId, "Фактическое целое число одинаковых полных комплектов прогрева", "integer", "set", active, { min: 1 }),
      parameter("winter_heating_energy_pricing_mode", "Энергия прогрева: включена в ставку оборудования или оплачивается отдельно", "enum", null, active, { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_ENERGY_RATE"] }),
      parameter("winter_heating_energy_kwh", "Фактическая по учёту или явно запланированная ведомостью энергия прогрева без вывода из машино-часов", "decimal", "kwh", active, { min: 0 }),
      parameter("winter_heating_energy_reference", "Основание количества энергии, источник и условия цены: учёт или явная проектная ведомость", "text", null),
      parameter("winter_heating_delivery_mode", "Перевозка/возврат оборудования и комплектов прогрева: включены в ставку оборудования или отдельные подтверждённые рейсы", "enum", null, active, { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter("winter_heating_delivery_reference", "Подтверждённая перевозка/возврат прогрева: водитель, маршрут, состав груза и условия цены", "text", null),
      parameter("winter_heating_delivery_trip_count", "Фактическое число отдельно подтверждённых рейсов прогрева", "integer", "trip", separateDelivery, { min: 1 }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => ({ ...row, resource_graph: { ...row.resource_graph,
      ...([WINTER_HEATING_COMPLETION_ROWS_S2733.includedKit, WINTER_HEATING_COMPLETION_ROWS_S2733.includedEnergy].includes(row.row_id as typeof WINTER_HEATING_COMPLETION_ROWS_S2733.includedKit)
        ? { includedInResourceOwnerRowId: "equipment:concrete:heating-transformer" } : {}) },
      source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
        quantity_basis: "APPROVED_PROJECT_HEATING_SYSTEM_AND_EXPLICIT_ENERGY_SCHEDULE_OR_METER" } })) };
}
