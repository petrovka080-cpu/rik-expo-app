import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec, type AutomaticRowSpec } from "./automaticConstructionOwnerR1";
import { effectivePurchaseBalanceExpressionsR1 } from "./effectivePurchaseBalanceR1";

export const EMBEDDED_INSTALLATION_COMPLETION_CONTRACT_S2733 = "embedded-installation-completion:s27-33.v1";
export const EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733 = [
  { key: "installation", hoursId: "fixing_worker_h", title: "Установка и фиксация закладных", unitId: "man_hour" },
  { key: "lifting", hoursId: "lifting_equipment_machine_h", title: "Подъёмное оборудование закладных", unitId: "machine_hour" },
] as const;

/** Actual counted installation and rigging kits supplement the selected
 * project method. Existing embedded items, temporary supports, weld materials
 * and coating remain separate physical takeoffs and cost owners. */
export function buildEmbeddedInstallationCompletionS2733(catalogId: string, prefix: "" | "embedded_", projectSourceSha256: string,
  ownerRowIds: Readonly<Record<"installation" | "lifting", string>>, parentApplicability: "embedded_items_applicable" | null = null) {
  const and = (...operands: AutomaticInclusionCondition[]): AutomaticInclusionCondition => ({ kind: "and", operands });
  const equals = (parameterId: string, value: string | boolean): AutomaticInclusionCondition => ({ kind: "equals", parameterId, value: value as string });
  const selected = and({ kind: "greater_than", parameterId: prefix + "embedded_item_count_piece", value: 0 }, ...(parentApplicability ? [equals(parentApplicability, true)] : []));
  const conditional: AutomaticParameterSpec[] = [], rows: AutomaticRowSpec[] = [];
  for (const p of EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733) {
    const branch = and(selected, { kind: "greater_than", parameterId: prefix + p.hoursId, value: 0 },
      ...(p.key === "lifting" ? [equals(prefix + "lifting_equipment_required", true)] : []));
    const key = "embedded_" + p.key;
    const parameter = (suffix: string, title: string, valueType: AutomaticParameterSpec["valueType"], unitId: string | null,
      extra: Partial<AutomaticParameterSpec> = {}): AutomaticParameterSpec => ({ id: key + suffix, title, valueType, unitId, kind: "conditional", requiredWhen: branch, ...extra });
    conditional.push(
      parameter("_price_scope_reference", `${p.title}: подтверждённый состав выбранной ставки, оснастка по указанным условиям; ${p.key === "lifting" ? "энергия работы в ставке оборудования, оператор в существующем труде установки" : "подготовка, фиксация и уборка в существующем труде"}; прежние изделия/опоры/сварочные материалы/покрытие отдельно`, "text", null),
      parameter("_accessories_pricing_mode", `${p.title}: полный совместимый комплект включён в существующую ставку владельца или поставляется отдельно`, "enum", null, { values: ["INCLUDED_IN_SELECTED_RATE", "SEPARATE_SUPPLY"] }),
      parameter("_accessories_specification", `${p.title}: фактический поштучный полный состав одного совместимого комплекта инструмента, ${p.key === "lifting" ? "строповочной оснастки, соединений, защиты и ухода" : "крепления, разметки, контроля, защиты, зачистки и уборки"}; без уже учтённых изделий, временных опор, сварочных материалов и покрытия`, "text", null),
      parameter("_accessories_set_count", `${p.title}: фактическое целое число одинаковых полных комплектов`, "integer", "set", { min: 1 }),
    );
    const separateRow = `material:concrete:embedded-${p.key}-separate-kit`;
    const balance = effectivePurchaseBalanceExpressionsR1({ ownerRowId: separateRow, orderUnitId: "set", consumed: key + "_accessories_set_count", stock: "0", reserve: "0", quantum: "1" });
    for (const separate of [false, true]) rows.push({ rowId: separate ? separateRow : `material:concrete:embedded-${p.key}-included-kit`,
      formulaId: `embedded_${p.key}_${separate ? "separate" : "included"}_kit_v1`, expression: key + "_accessories_set_count",
      section: "Установка закладных деталей", category: "material", title: `${p.title}: полный комплект оснастки и расходников, ${separate ? "отдельная поставка" : "включённый в существующую ставку"}`,
      unitId: "set", procurement: separate, costTreatment: separate ? "OWN_COST" : "INCLUDED_IN_RESOURCE_ROWS",
      inclusion: and(branch, equals(key + "_accessories_pricing_mode", separate ? "SEPARATE_SUPPLY" : "INCLUDED_IN_SELECTED_RATE")),
      inputParameterIds: [key + "_accessories_specification", key + "_accessories_set_count", key + "_price_scope_reference",
        prefix + (p.key === "lifting" ? "lifting_equipment_designation" : "installation_method_statement_reference")],
      titleParameterIds: [key + "_accessories_specification"], ...(separate ? { purchaseBalance: balance.owner.purchaseBalance } : {}) });
  }
  conditional.push({ id: "embedded_installation_delivery_reference", title: "Подтверждённая перевозка закладных изделий: состав принятого заказа, маршрут и водитель в ставке, условия количества рейсов; подъёмная техника и сварочный пост учитываются отдельно",
    valueType: "text", unitId: null, kind: "conditional", requiredWhen: selected });
  const addition = buildAutomaticConstructionOwnerR1({ contract: EMBEDDED_INSTALLATION_COMPLETION_CONTRACT_S2733, semanticOwner: catalogId,
    sourceId: "project_embedded_installation_execution_schedule", normId: "approved-project-embedded-installation-and-lifting-component-bom",
    sourceMetadata: { source_title: "Утверждённая проектная ведомость установки закладных и оснащения", source_document_version: "embedded-items-direct-project-schedule-r1",
      definition_hash: projectSourceSha256, artifact_sha256: projectSourceSha256,
      exact_locator: "Существующие проектные часы установки/фиксации и подъёмной техники; поштучный состав совместимой оснастки, подтверждённые условия оплаты и перевозки" },
    applicabilityRu: "Комплекты только для существующей установки и выбранной подъёмной техники с положительными фактическими часами. Включённые комплектующие не оплачиваются повторно; прежние материальные takeoff и труд не выводятся из количества заказа.",
    ordinary: [{ id: prefix + "embedded_item_count_piece", title: "Существующее количество закладных", valueType: "decimal", unitId: "piece", kind: "ordinary" },
      ...EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733.map(p => ({ id: prefix + p.hoursId, title: `${p.title}: существующие проектные часы`, valueType: "decimal" as const, unitId: p.unitId, kind: "ordinary" as const })),
      { id: prefix + "lifting_equipment_required", title: "Существующий выбор подъёмного оборудования", valueType: "enum", unitId: null, kind: "ordinary" },
      { id: prefix + "lifting_equipment_designation", title: "Существующее подъёмное оборудование", valueType: "text", unitId: null, kind: "ordinary" },
      { id: prefix + "installation_method_statement_reference", title: "Существующий способ установки и фиксации", valueType: "text", unitId: null, kind: "ordinary" },
      ...(parentApplicability ? [{ id: parentApplicability, title: "Существующая применимость закладных", valueType: "enum" as const, unitId: null, kind: "ordinary" as const }] : [])],
    profile: [], conditional, rows, deferMissingProjectFactsToRows: true, excludedUnownedAssumptions: ["universal installation productivity", "rigging scheme derived from mass", "automatic equipment energy consumption"] });
  return { ...addition, formulas: addition.formulas.map((f, i) => ({ ...f, expression_source: rows[i]!.expression, output_unit_id: rows[i]!.unitId })),
    resources: addition.resources.map(row => { const p = EMBEDDED_INSTALLATION_COMPLETION_OWNERS_S2733.find(p => row.row_id === `material:concrete:embedded-${p.key}-included-kit`);
      return { ...row, resource_graph: { ...row.resource_graph, ...(p ? { includedInResourceOwnerRowId: ownerRowIds[p.key] } : {}) },
        source_metadata: { ...row.source_metadata, universal_consumption_claimed: false, universal_productivity_claimed: false,
          quantity_basis: "ACTUAL_APPROVED_EMBEDDED_INSTALLATION_LIFTING_SCHEDULE_AND_COMPONENT_BOM" } }; }) };
}
