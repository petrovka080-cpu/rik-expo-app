import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const EMBEDDED_COATING_COMPLETION_CONTRACT_S2733 = "embedded-coating-completion:s27-33.v1";
export const EMBEDDED_COATING_COMPLETION_ROWS_S2733 = {
  includedEquipment: "equipment:concrete:embedded-coating-included",
  separateEquipment: "equipment:concrete:embedded-coating-separate",
  laborIncludedKit: "material:concrete:embedded-coating-labor-included-kit",
  equipmentIncludedKit: "material:concrete:embedded-coating-equipment-included-kit",
  separateKit: "material:concrete:embedded-coating-separate-kit",
  delivery: "delivery:concrete:embedded-coating-equipment-and-kits",
} as const;

/** The existing project selects coating restoration. Complete preparation,
 * application, control and cleaning from its counted compatible BOM and actual
 * hours; retain the separately paid coating kg and original labor schedule. */
export function buildEmbeddedCoatingCompletionS2733(catalogId: string, prefix: "" | "embedded_",
  projectSourceSha256: string, laborRowId: string, parentApplicability: "embedded_items_applicable" | null = null) {
  const ids = EMBEDDED_COATING_COMPLETION_ROWS_S2733, key = (suffix: string) => "embedded_coating_" + suffix;
  const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
  const or = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "or", operands });
  const equals = (parameterId: string, value: string | boolean): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value: value as string });
  const selected = and(equals(prefix + "coating_touchup_required", true), ...(parentApplicability ? [equals(parentApplicability, true)] : []));
  const active = and(selected, { kind: "greater_than", parameterId: prefix + "coating_touchup_worker_h", value: 0 });
  const manual = and(active, equals(key("method"), "MANUAL_TOOLS"));
  const equipment = and(active, equals(key("method"), "PROJECT_SELECTED_EQUIPMENT"));
  const separate = equals(key("equipment_pricing_mode"), "SEPARATE_EQUIPMENT_RATE");
  const included = equals(key("equipment_pricing_mode"), "INCLUDED_IN_EXISTING_LABOR_RATE");
  const kitIncluded = equals(key("accessories_pricing_mode"), "INCLUDED_IN_SELECTED_RATE");
  const freight = and(active, equals(key("delivery_mode"), "SEPARATE_CONFIRMED_TRIPS"));
  const parameter = (suffix: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id: key(suffix), title, valueType, unitId, kind: "conditional", requiredWhen: active, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: ids.separateKit, orderUnitId: "set",
    consumed: key("accessories_set_count"), stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [];
  for (const costIncluded of [true, false]) rows.push({ rowId: costIncluded ? ids.includedEquipment : ids.separateEquipment,
    formulaId: `embedded_coating_equipment_${costIncluded ? "included" : "separate"}_v1`, expression: key("equipment_machine_h"),
    section: "Восстановление покрытия закладных", category: "equipment", unitId: "machine_hour",
    title: `Совместимое проектное оборудование восстановления покрытия закладных, ${costIncluded ? "включённое в существующую оплату труда" : "отдельная оплата оборудования"}`,
    procurement: !costIncluded, costTreatment: costIncluded ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST", inclusion: and(equipment, costIncluded ? included : separate),
    inputParameterIds: [key("method_reference"), key("equipment_machine_h"), key("equipment_specification"), key("price_scope_reference")],
    titleParameterIds: [key("equipment_specification"), key("price_scope_reference")] });
  const kits = [
    { rowId: ids.laborIncludedKit, suffix: "labor_included", inclusion: and(kitIncluded, or(manual, and(equipment, included))), owner: laborRowId },
    { rowId: ids.equipmentIncludedKit, suffix: "equipment_included", inclusion: and(equipment, separate, kitIncluded), owner: ids.separateEquipment },
    { rowId: ids.separateKit, suffix: "separate", inclusion: and(active, equals(key("accessories_pricing_mode"), "SEPARATE_SUPPLY")), owner: null },
  ];
  for (const kit of kits) rows.push({ rowId: kit.rowId, formulaId: `embedded_coating_${kit.suffix}_kit_v1`, expression: key("accessories_set_count"),
    section: "Восстановление покрытия закладных", category: "material", unitId: "set",
    title: `Полный комплект подготовки, нанесения, защиты, контроля и уборки покрытия закладных без отдельно учтённого материала покрытия в кг, ${kit.owner ? "включённый в выбранную ставку" : "отдельная поставка"}`,
    procurement: !kit.owner, costTreatment: kit.owner ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST", inclusion: kit.inclusion,
    inputParameterIds: [key("method"), key("method_reference"), key("accessories_specification"), key("accessories_set_count"), key("price_scope_reference")],
    titleParameterIds: [key("accessories_specification")], ...(kit.owner ? {} : { purchaseBalance: balance.owner.purchaseBalance }) });
  rows.push({ rowId: ids.delivery, formulaId: "embedded_coating_confirmed_delivery_v1", expression: key("delivery_trip_count"),
    section: "Восстановление покрытия закладных", category: "delivery", unitId: "trip", title: "Подтверждённая отдельная перевозка и возврат оснащения восстановления покрытия закладных",
    procurement: true, inclusion: freight, inputParameterIds: [key("delivery_reference")], titleParameterIds: [key("delivery_reference")],
    manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } });
  const addition = buildAutomaticConstructionOwnerR1({ contract: EMBEDDED_COATING_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_embedded_coating_execution_schedule", normId: "approved-project-embedded-coating-method-and-component-bom",
    sourceMetadata: { source_title: "Утверждённая проектная ведомость восстановления покрытия закладных и совместимого оснащения",
      source_document_version: "embedded-items-direct-project-schedule-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий проектный контракт восстановления покрытия: совместимость материала, подготовка/нанесение/контроль/уборка, фактические часы и поштучный состав оснащения, условия оплаты и перевозки" },
    applicabilityRu: "Только выбранное восстановление покрытия закладных. Материал покрытия в кг и труд уже учтены. Оператор в прежнем труде, энергия выбранной техники в подтверждённой ставке. Дополнительный комплект исключает прежние изделия, опоры, сварочные материалы и материал покрытия. Перевозка отделена от существующих рейсов изделий, подъёмной техники и сварочного поста.",
    ordinary: [{ id: prefix + "coating_touchup_required", title: "Существующий проектный выбор восстановления покрытия", valueType: "enum", unitId: null, kind: "ordinary" },
      { id: prefix + "coating_touchup_worker_h", title: "Существующие фактические часы труда восстановления покрытия", valueType: "decimal", unitId: "man_hour", kind: "ordinary" },
      { id: prefix + "coating_touchup_designation", title: "Существующий совместимый проектный материал покрытия", valueType: "text", unitId: null, kind: "ordinary" },
      ...(parentApplicability ? [{ id: parentApplicability, title: "Существующий выбор установки закладных", valueType: "enum" as const, unitId: null, kind: "ordinary" as const }] : [])],
    profile: [], deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: ["universal coating productivity", "automatic coating compatibility approval", "coating consumption from equipment hours"],
    conditional: [
      parameter("method", "Проектный способ восстановления покрытия: ручной инструмент или выбранное оборудование", "enum", null, { values: ["MANUAL_TOOLS", "PROJECT_SELECTED_EQUIPMENT"] }),
      parameter("method_reference", "Утверждённая технологическая карта восстановления: совместимость покрытия, подготовка, нанесение, контроль и уборка; их труд включён в существующие проектные часы", "text", null),
      parameter("price_scope_reference", "Подтверждённые условия цены восстановления: оператор в прежнем труде, энергия в ставке техники, комплект и перевозка по выбранным условиям; материал покрытия в кг отдельно", "text", null),
      parameter("equipment_pricing_mode", "Выбранная техника восстановления включена в существующую оплату труда или имеет отдельную ставку", "enum", null, { values: ["INCLUDED_IN_EXISTING_LABOR_RATE", "SEPARATE_EQUIPMENT_RATE"], requiredWhen: equipment }),
      parameter("equipment_specification", "Конкретное совместимое оборудование подготовки/нанесения/контроля по технологической карте", "text", null, { requiredWhen: equipment }),
      parameter("equipment_machine_h", "Фактические часы выбранного оснащения по ведомости; не выводятся из массы покрытия или часов рабочего", "decimal", "machine_hour", { min: 0.001, requiredWhen: equipment }),
      parameter("accessories_pricing_mode", "Полный комплект оснащения восстановления включён в выбранную ставку или поставляется отдельно", "enum", null, { values: ["INCLUDED_IN_SELECTED_RATE", "SEPARATE_SUPPLY"] }),
      parameter("accessories_specification", "Поштучный полный состав одного совместимого комплекта подготовки, нанесения, защиты, контроля и уборки с количеством каждого изделия; без уже оплаченного покрытия в кг и сварочных/монтажных ресурсов", "text", null),
      parameter("accessories_set_count", "Фактическое целое число одинаковых полных комплектов восстановления покрытия", "integer", "set", { min: 1 }),
      parameter("delivery_mode", "Перевозка и возврат оснащения восстановления включены в выбранную ставку или отдельные подтверждённые рейсы", "enum", null, { values: ["INCLUDED_IN_SELECTED_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter("delivery_reference", "Подтверждённые условия перевозки восстановления: груз, маршрут, водитель и возврат; прежние рейсы изделий, подъёмной техники и сварочного поста исключены", "text", null),
      parameter("delivery_trip_count", "Число отдельно подтверждённых рейсов оснащения восстановления покрытия", "integer", "trip", { min: 1, requiredWhen: freight }),
    ], rows });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => { const owner = row.row_id === ids.includedEquipment ? laborRowId : kits.find(kit => kit.rowId === row.row_id)?.owner;
      return { ...row, resource_graph: { ...row.resource_graph, ...(owner ? { includedInResourceOwnerRowId: owner } : {}) },
        source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
          quantity_basis: "ACTUAL_APPROVED_EMBEDDED_COATING_METHOD_COMPONENT_BOM_AND_SCHEDULE" } }; }) };
}
