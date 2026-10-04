import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const REINFORCEMENT_EQUIPMENT_COMPLETION_CONTRACT_S2733 = "reinforcement-equipment-completion:s27-33.v1";
export const REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733 = [
  { key: "cutting", rowId: "equipment:reinforcement:cutting-machine", hoursId: "rebar_cutting_machine_h", title: "Станок резки арматуры" },
  { key: "bending", rowId: "equipment:reinforcement:bending-machine", hoursId: "rebar_bending_machine_h", title: "Станок гибки арматуры" },
  { key: "lifting", rowId: "equipment:reinforcement:lifting", hoursId: "lifting_machine_h", title: "Подъёмное оборудование армирования" },
] as const;
export const REINFORCEMENT_EQUIPMENT_COMPLETION_DELIVERY_S2733 = "delivery:reinforcement:equipment-and-kits";

/** Full counted kits follow the actual selected project equipment and time.
 * Their quote includes operation energy in the equipment rate and the operator
 * in existing labor; neither quantity nor productivity is derived from steel. */
export function buildReinforcementEquipmentCompletionS2733(catalogId: string,
  prefix: "" | "reinforcement_", projectSourceSha256: string, parentApplicability: "reinforcement_applicable" | null = null) {
  const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
  const equals = (parameterId: string, value: string): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value });
  const active = (key: string, hoursId: string): AutomaticInclusionCondition => and(key === "lifting"
    ? equals(prefix + "lifting_equipment_applicable", true as unknown as string) : equals(prefix + "fabrication_mode", "SITE_FABRICATED"),
    { kind: "greater_than", parameterId: prefix + hoursId, value: 0 },
    ...(parentApplicability ? [equals(parentApplicability, true as unknown as string)] : []));
  const anyEquipment: AutomaticInclusionCondition = { kind: "or", operands: REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733.map(p => active(p.key, p.hoursId)) };
  const separateDelivery = and(anyEquipment, equals("reinforcement_equipment_delivery_mode", "SEPARATE_CONFIRMED_TRIPS"));
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    requiredWhen: AutomaticInclusionCondition, extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec =>
    ({ id, title, valueType, unitId, kind: "conditional", requiredWhen, ...extra });
  const conditional: AutomaticParameterSpec[] = [], rows: AutomaticRowSpec[] = [];
  for (const p of REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733) {
    const branch = active(p.key, p.hoursId), factPrefix = "reinforcement_" + p.key,
      modeId = factPrefix + "_accessories_pricing_mode", specId = factPrefix + "_accessories_specification", countId = factPrefix + "_accessories_set_count";
    const equipmentSpec = p.key === "lifting" ? prefix + "lifting_equipment_designation" : factPrefix + "_equipment_specification";
    if (p.key !== "lifting") conditional.push(parameter(equipmentSpec, `${p.title}: конкретная спецификация и совместимость с утверждённой ведомостью стержней`, "text", null, branch));
    conditional.push(
      parameter(factPrefix + "_price_scope_reference", `${p.title}: подтверждённая ставка включает энергию работы; оператор в существующем труде, комплект и перевозка по указанным условиям без двойной оплаты`, "text", null, branch),
      parameter(modeId, `${p.title}: полный комплект инструмента и расходников включён в ставку оборудования или поставляется отдельно`, "enum", null, branch, { values: ["INCLUDED_IN_EQUIPMENT_RATE", "SEPARATE_SUPPLY"] }),
      parameter(specId, `${p.title}: полный совместимый инструмент/оснастка/расходники и фактическое количество каждого изделия в одном комплекте`, "text", null, branch),
      parameter(countId, `${p.title}: фактическое целое число одинаковых полных комплектов`, "integer", "set", branch, { min: 1 }),
    );
    const separateRow = `material:reinforcement:${p.key}-equipment-separate-kit`;
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: separateRow, orderUnitId: "set", consumed: countId, stock: "0", reserve: "0", quantum: "1" });
    for (const separate of [false, true]) rows.push({ rowId: separate ? separateRow : `material:reinforcement:${p.key}-equipment-included-kit`,
      formulaId: `reinforcement_${p.key}_equipment_${separate ? "separate" : "included"}_kit_v1`, expression: countId,
      section: "Оборудование армирования", category: "material", title: `${p.title}: полный комплект оснастки и расходников, ${separate ? "отдельная поставка" : "включённый в ставку оборудования"}`,
      unitId: "set", procurement: separate, costTreatment: separate ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: and(branch, equals(modeId, separate ? "SEPARATE_SUPPLY" : "INCLUDED_IN_EQUIPMENT_RATE")),
      inputParameterIds: [specId, countId, equipmentSpec, factPrefix + "_price_scope_reference"], titleParameterIds: [specId],
      ...(separate ? { purchaseBalance: balance.owner.purchaseBalance } : {}) });
  }
  conditional.push(
    parameter("reinforcement_equipment_delivery_mode", "Оборудование армирования и комплекты: перевозка/возврат включены в выбранные ставки или отдельные подтверждённые рейсы", "enum", null, anyEquipment,
      { values: ["INCLUDED_IN_EQUIPMENT_RATES", "SEPARATE_CONFIRMED_TRIPS"] }),
    parameter("reinforcement_equipment_delivery_reference", "Подтверждённая перевозка/возврат оборудования армирования: водитель, маршрут, состав груза, владельцы оплаты; отдельно от доставки стали", "text", null, anyEquipment),
    parameter("reinforcement_equipment_delivery_trip_count", "Фактическое число отдельно подтверждённых рейсов оборудования армирования и его комплектов", "integer", "trip", separateDelivery, { min: 1 }),
  );
  rows.push({ rowId: REINFORCEMENT_EQUIPMENT_COMPLETION_DELIVERY_S2733, formulaId: "reinforcement_equipment_confirmed_delivery_v1", expression: "reinforcement_equipment_delivery_trip_count",
    section: "Оборудование армирования", category: "delivery", title: "Подтверждённая отдельная перевозка и возврат станков/подъёмной техники армирования и их комплектов", unitId: "trip",
    procurement: true, inclusion: separateDelivery, inputParameterIds: ["reinforcement_equipment_delivery_reference"], titleParameterIds: ["reinforcement_equipment_delivery_reference"],
    manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } });
  const addition = buildAutomaticConstructionOwnerR1({ contract: REINFORCEMENT_EQUIPMENT_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_reinforcement_execution_schedule", normId: "approved-project-reinforcement-equipment-bom-and-price-scope",
    sourceMetadata: { source_title: "Утверждённая ведомость выполнения армирования и подтверждённые условия оборудования",
      source_document_version: "strip-foundation-reinforcement-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий контракт фактических часов станков резки/гибки и подъёмной техники; полная совместимая оснастка/расходники и условия цены по проектной ведомости" },
    applicabilityRu: "Комплектность только применимого оборудования с положительными проектными часами; энергия в подтверждённых ставках, оператор в существующих часах труда, сталь и её доставка не пересчитываются.",
    ordinary: [...(parentApplicability ? [{ id: parentApplicability, title: "Существующая применимость армирования", valueType: "enum" as const, unitId: null, kind: "ordinary" as const }] : []),
      { id: prefix + "fabrication_mode", title: "Существующий способ изготовления арматуры", valueType: "enum", unitId: null, kind: "ordinary", values: ["READY_CAGES", "SITE_FABRICATED"] },
      { id: prefix + "lifting_equipment_applicable", title: "Существующий выбор подъёмной техники", valueType: "enum", unitId: null, kind: "ordinary" },
      { id: prefix + "lifting_equipment_designation", title: "Существующая спецификация подъёмной техники", valueType: "text", unitId: null, kind: "ordinary" },
      ...REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733.map(p => ({ id: prefix + p.hoursId, title: `${p.title}: существующие проектные часы`, valueType: "decimal" as const, unitId: "machine_hour", kind: "ordinary" as const, min: 0 }))],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: [] });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => { const owner = REINFORCEMENT_EQUIPMENT_COMPLETION_OWNERS_S2733.find(p => row.row_id === `material:reinforcement:${p.key}-equipment-included-kit`);
      return { ...row, resource_graph: { ...row.resource_graph, ...(owner ? { includedInResourceOwnerRowId: owner.rowId } : {}) },
        source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
          quantity_basis: "APPROVED_PROJECT_REINFORCEMENT_EQUIPMENT_SCHEDULE_AND_FULL_COMPONENT_BOM" } }; }) };
}
