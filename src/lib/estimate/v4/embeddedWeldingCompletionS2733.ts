import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const EMBEDDED_WELDING_COMPLETION_CONTRACT_S2733 = "embedded-welding-completion:s27-33.v1";
export const EMBEDDED_WELDING_COMPLETION_ROWS_S2733 = {
  includedPost: "equipment:concrete:embedded-welding-post-included",
  separatePost: "equipment:concrete:embedded-welding-post-separate",
  laborIncludedKit: "material:concrete:embedded-welding-labor-included-kit",
  equipmentIncludedKit: "material:concrete:embedded-welding-equipment-included-kit",
  separateKit: "material:concrete:embedded-welding-separate-kit",
  delivery: "delivery:concrete:embedded-welding-post-and-kits",
} as const;

/** Complete only the existing project-selected welding operation. Actual
 * machine hours and counted kits are project facts, never kg productivity.
 * The existing kg welding consumable stays separate from the post tool BOM. */
export function buildEmbeddedWeldingCompletionS2733(catalogId: string, prefix: "" | "embedded_",
  projectSourceSha256: string, laborRowId: string, parentApplicability: "embedded_items_applicable" | null = null) {
  const ids = EMBEDDED_WELDING_COMPLETION_ROWS_S2733;
  const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
  const equals = (parameterId: string, value: string | boolean): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value: value as string });
  const selected = and(equals(prefix + "field_welding_required", true),
    ...(parentApplicability ? [equals(parentApplicability, true)] : []));
  const active = and(selected, { kind: "greater_than", parameterId: prefix + "welding_worker_h", value: 0 });
  const equipmentSeparate = equals("welding_post_pricing_mode", "SEPARATE_EQUIPMENT_RATE");
  const equipmentIncluded = equals("welding_post_pricing_mode", "INCLUDED_IN_WELDING_LABOR_RATE");
  const kitIncluded = equals("welding_post_accessories_pricing_mode", "INCLUDED_IN_SELECTED_POST_RATE");
  const deliverySeparate = and(active, equals("welding_post_delivery_mode", "SEPARATE_CONFIRMED_TRIPS"));
  const parameter = (id: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
    extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id, title, valueType, unitId, kind: "conditional", requiredWhen: active, ...extra });
  const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: ids.separateKit, orderUnitId: "set", consumed: "welding_post_accessories_set_count", stock: "0", reserve: "0", quantum: "1" });
  const rows: AutomaticRowSpec[] = [];
  for (const included of [true, false]) rows.push({ rowId: included ? ids.includedPost : ids.separatePost,
    formulaId: `embedded_welding_post_${included ? "included" : "separate"}_v1`, expression: "welding_post_machine_h",
    section: "Сварка закладных деталей", category: "equipment", unitId: "machine_hour",
    title: `Сварочный пост по утверждённой процедуре, ${included ? "включённый в существующую оплату сварщика" : "отдельная оплата оборудования"}`,
    procurement: !included, costTreatment: included ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST",
    inclusion: and(active, included ? equipmentIncluded : equipmentSeparate),
    inputParameterIds: [prefix + "approved_welding_procedure_reference", "welding_post_machine_h", "welding_post_specification", "welding_post_price_scope_reference"],
    titleParameterIds: ["welding_post_specification", "welding_post_price_scope_reference"] });
  const kits = [
    { rowId: ids.laborIncludedKit, suffix: "labor_included", inclusion: and(active, kitIncluded, equipmentIncluded), owner: laborRowId },
    { rowId: ids.equipmentIncludedKit, suffix: "equipment_included", inclusion: and(active, kitIncluded, equipmentSeparate), owner: ids.separatePost },
    { rowId: ids.separateKit, suffix: "separate", inclusion: and(active, equals("welding_post_accessories_pricing_mode", "SEPARATE_SUPPLY")), owner: null },
  ];
  for (const kit of kits) rows.push({ rowId: kit.rowId, formulaId: `embedded_welding_${kit.suffix}_kit_v1`, expression: "welding_post_accessories_set_count",
    section: "Сварка закладных деталей", category: "material", unitId: "set",
    title: `Полный комплект оснастки, защиты, контроля и расходников сварочного поста без отдельно учтённых сварочных материалов в кг, ${kit.owner ? "включённый в выбранную ставку" : "отдельная поставка"}`,
    procurement: !kit.owner, costTreatment: kit.owner ? "INCLUDED_IN_RESOURCE_ROWS" : "OWN_COST", inclusion: kit.inclusion,
    inputParameterIds: [prefix + "approved_welding_procedure_reference", "welding_post_specification", "welding_post_accessories_specification", "welding_post_accessories_set_count", "welding_post_price_scope_reference"],
    titleParameterIds: ["welding_post_accessories_specification"], ...(kit.owner ? {} : { purchaseBalance: balance.owner.purchaseBalance }) });
  rows.push({ rowId: ids.delivery, formulaId: "embedded_welding_post_confirmed_delivery_v1", expression: "welding_post_delivery_trip_count",
    section: "Сварка закладных деталей", category: "delivery", unitId: "trip", title: "Подтверждённая отдельная перевозка и возврат сварочного поста и его комплектов",
    procurement: true, inclusion: deliverySeparate, inputParameterIds: ["welding_post_delivery_reference"], titleParameterIds: ["welding_post_delivery_reference"],
    manualTransportQuantityPolicy: { unitId: "trip", minimum: "calculated_quantity", integer: true } });
  const addition = buildAutomaticConstructionOwnerR1({ contract: EMBEDDED_WELDING_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_embedded_welding_execution_schedule", normId: "approved-project-embedded-welding-post-and-component-bom",
    sourceMetadata: { source_title: "Утверждённая проектная процедура сварки закладных и фактическая ведомость оснащения",
      source_document_version: "embedded-items-direct-project-schedule-r1", definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующий проектный контракт монтажной сварки закладных: утверждённая процедура, фактические часы поста, полный поштучный состав оснастки и условия оплаты/перевозки" },
    applicabilityRu: "Только существующая выбранная монтажная сварка закладных. Оператор в прежнем труде, энергия работы в подтверждённой ставке поста; существующий сварочный материал в кг исключён из дополнительного комплекта. Перевозка поста различима с прежней доставкой изделий и подъёмной техники.",
    ordinary: [{ id: prefix + "field_welding_required", title: "Существующий выбор проектной сварки закладных", valueType: "enum", unitId: null, kind: "ordinary" },
      { id: prefix + "welding_worker_h", title: "Существующие проектные часы сварщика", valueType: "decimal", unitId: "man_hour", kind: "ordinary" },
      { id: prefix + "approved_welding_procedure_reference", title: "Существующая утверждённая процедура сварки", valueType: "text", unitId: null, kind: "ordinary" },
      ...(parentApplicability ? [{ id: parentApplicability, title: "Существующий выбор установки закладных", valueType: "enum" as const, unitId: null, kind: "ordinary" as const }] : [])],
    profile: [], conditional: [
      parameter("welding_post_pricing_mode", "Сварочный пост включён в существующую оплату сварщика или оплачивается отдельно", "enum", null, { values: ["INCLUDED_IN_WELDING_LABOR_RATE", "SEPARATE_EQUIPMENT_RATE"] }),
      parameter("welding_post_specification", "Конкретный совместимый сварочный пост по утверждённой процедуре", "text", null),
      parameter("welding_post_machine_h", "Фактические часы работы сварочного поста по ведомости; не выводятся из массы или часов сварщика", "decimal", "machine_hour", { min: 0.001 }),
      parameter("welding_post_price_scope_reference", "Подтверждённая ставка поста включает энергию работы; оператор в прежнем труде, оснастка и перевозка по указанным условиям; сварочный материал в кг отдельно", "text", null),
      parameter("welding_post_accessories_pricing_mode", "Полный комплект оснастки/защиты/контроля включён в выбранную ставку поста или поставляется отдельно", "enum", null, { values: ["INCLUDED_IN_SELECTED_POST_RATE", "SEPARATE_SUPPLY"] }),
      parameter("welding_post_accessories_specification", "Поштучный полный состав одного совместимого комплекта: кабели/соединения, крепления, защита, контроль, инструмент, зачистка и уборка; без отдельно учтённых сварочных материалов в кг", "text", null),
      parameter("welding_post_accessories_set_count", "Фактическое целое число одинаковых полных комплектов сварочного поста", "integer", "set", { min: 1 }),
      parameter("welding_post_delivery_mode", "Перевозка/возврат поста и комплектов включены в выбранную ставку или отдельные подтверждённые рейсы", "enum", null, { values: ["INCLUDED_IN_SELECTED_POST_RATE", "SEPARATE_CONFIRMED_TRIPS"] }),
      parameter("welding_post_delivery_reference", "Подтверждённые условия перевозки поста: груз, маршрут, водитель и возврат; отделены от доставки закладных и подъёмной техники", "text", null),
      parameter("welding_post_delivery_trip_count", "Число отдельно подтверждённых рейсов сварочного поста и его комплектов", "integer", "trip", { min: 1, requiredWhen: deliverySeparate }),
    ], rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: ["automatic welding approval", "universal welding productivity", "energy consumption derived from machine hours"] });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => { const owner = row.row_id === ids.includedPost ? laborRowId : kits.find(kit => kit.rowId === row.row_id)?.owner;
      return { ...row, resource_graph: { ...row.resource_graph, ...(owner ? { includedInResourceOwnerRowId: owner } : {}) },
        source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
          quantity_basis: "ACTUAL_APPROVED_EMBEDDED_WELDING_POST_SCHEDULE_AND_COMPONENT_BOM" } }; }) };
}
