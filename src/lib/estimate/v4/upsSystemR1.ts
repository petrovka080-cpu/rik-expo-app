import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const UPS_SYSTEM_CATALOG_ID = "canonical-work:expanded:UPS_system";
export const UPS_SYSTEM_SOURCE_ID =
  "project_ups_load_battery_power_distribution_method_qa_v1";
export const UPS_SYSTEM_NORM_ID =
  "norm:project:ups_system:load_battery_power_distribution_method_qa:v1";

export const UPS_SYSTEM_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая однолинейная схема UPS, расчёт нагрузки и автономии, спецификация оборудования и батарей, кабельный журнал, ППР и программа ПНР",
  source_authority: "Проектная электротехническая организация, интегратор UPS, изготовитель UPS и батарей, служба ПНР и утверждающий инженер проекта",
  source_document_version: "PROJECT_UPS_LOAD_BATTERY_PROTECTION_BYPASS_CABLE_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "4634172dcd91571231797da2adb9ca9d00e47bc2a7dfb2cdbd803821b30b86bb",
  exact_locator: "Одна система UPS, 2 выбранные установки UPS-20KVA-3P, online double-conversion, 20 кВА каждая и требование автономии 30 минут; батареи, защита, байпас, кабели, окончания, расходники, труд, механизмы, контроль и логистика — только по утверждённому проектному комплекту",
  use_restriction: "Площадь здания не определяет нагрузку, мощность UPS, батареи, защиту или кабельные трассы. Автономия, токи КЗ, селективность, байпас и мониторинг требуют прямого проектного основания. Нагрузки, общее распределение, генераторы и другие слаботочные системы исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "4634172dcd91571231797da2adb9ca9d00e47bc2a7dfb2cdbd803821b30b86bb",
});

const KNOWN_SCOPE = [
  "ups_system_count", "ups_unit_count", "ups_unit_designation", "ups_topology",
  "ups_rated_power_kva", "ups_autonomy_min",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "ups_unit_retained_spare_piece", "ups_unit_supplier_pack_size_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "external_battery_cabinet_designation", "external_battery_cabinet_quantity_piece",
  "ups_monitoring_gateway_designation", "ups_monitoring_gateway_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["ups_system_count", "Количество систем UPS", "integer", "system", null],
  ["ups_unit_count", "Количество устанавливаемых UPS", "integer", "pcs", null],
  ["ups_unit_designation", "Марка и обозначение UPS", "text", null, null],
  ["ups_topology", "Топология UPS", "enum", null, ["ONLINE_DOUBLE_CONVERSION", "LINE_INTERACTIVE"]],
  ["ups_rated_power_kva", "Номинальная мощность одного UPS", "decimal", "kVA", null],
  ["ups_autonomy_min", "Требуемое время автономии", "decimal", "min", null],
  ["ups_unit_retained_spare_piece", "Сохраняемый резерв UPS", "decimal", "pcs", null],
  ["ups_unit_supplier_pack_size_piece", "Количество UPS в поставочной упаковке", "decimal", "pcs", null],
  ["ups_input_protection_designation", "Вводная защита UPS по однолинейной схеме", "text", null, null],
  ["ups_input_protection_quantity_piece", "Количество аппаратов вводной защиты UPS", "decimal", "pcs", null],
  ["ups_output_panel_designation", "Выходной распределительный щит UPS", "text", null, null],
  ["ups_output_panel_quantity_piece", "Количество выходных щитов UPS", "decimal", "pcs", null],
  ["ups_maintenance_bypass_designation", "Сервисный байпас UPS", "text", null, null],
  ["ups_maintenance_bypass_quantity_piece", "Количество сервисных байпасов UPS", "decimal", "pcs", null],
  ["ups_input_cable_designation", "Вводной кабель UPS по кабельному журналу", "text", null, null],
  ["ups_input_cable_length_m", "Длина вводного кабеля UPS", "decimal", "m", null],
  ["ups_output_cable_designation", "Выходной кабель UPS по кабельному журналу", "text", null, null],
  ["ups_output_cable_length_m", "Длина выходного кабеля UPS", "decimal", "m", null],
  ["ups_battery_cable_designation", "Батарейный кабель UPS по расчёту", "text", null, null],
  ["ups_battery_cable_length_m", "Длина батарейного кабеля UPS", "decimal", "m", null],
  ["ups_battery_module_designation", "Батарейный модуль UPS по расчёту автономии", "text", null, null],
  ["ups_battery_module_quantity_piece", "Количество батарейных модулей UPS", "decimal", "pcs", null],
  ["ups_termination_designation", "Оконцевание силовых и батарейных кабелей UPS", "text", null, null],
  ["ups_termination_quantity_piece", "Количество окончаний кабелей UPS", "decimal", "pcs", null],
  ["ups_label_designation", "Маркировка оборудования и кабелей UPS", "text", null, null],
  ["ups_label_quantity_piece", "Количество элементов маркировки UPS", "decimal", "pcs", null],
  ["ups_fastening_designation", "Крепёж оборудования и кабелей UPS", "text", null, null],
  ["ups_fastening_quantity_set", "Количество комплектов крепежа UPS", "decimal", "set", null],
  ["ups_consumable_designation", "Монтажные расходники UPS", "text", null, null],
  ["ups_consumable_quantity_kg", "Масса монтажных расходников UPS", "decimal", "kg", null],
  ["ups_grounding_conductor_designation", "Защитный проводник оборудования UPS", "text", null, null],
  ["ups_grounding_conductor_length_m", "Длина защитного проводника UPS", "decimal", "m", null],
  ["ups_test_report_designation", "Протокол проверки и ПНР UPS", "text", null, null],
  ["ups_test_report_quantity_document", "Количество протоколов проверки UPS", "decimal", "document", null],
  ["ups_equipment_install_labor_h", "Труд по монтажу UPS, батарей и щитов", "decimal", "man_hour", null],
  ["ups_cabling_termination_labor_h", "Труд по прокладке и окончанию кабелей UPS", "decimal", "man_hour", null],
  ["ups_configuration_commissioning_labor_h", "Труд по настройке и ПНР UPS", "decimal", "man_hour", null],
  ["ups_handling_equipment_machine_h", "Работа такелажного и подъёмного оборудования UPS", "decimal", "machine_hour", null],
  ["ups_load_battery_tester_machine_h", "Работа нагрузочного и батарейного тестера UPS", "decimal", "machine_hour", null],
  ["ups_delivery_trip_count", "Рейсы доставки оборудования и материалов UPS", "integer", "trip", null],
  ["ups_packaging_removal_trip_count", "Рейсы вывоза упаковки и монтажных отходов UPS", "integer", "trip", null],
  ["external_battery_cabinet_mode", "Внешний батарейный шкаф входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["external_battery_cabinet_designation", "Внешний батарейный шкаф UPS", "text", null, null],
  ["external_battery_cabinet_quantity_piece", "Количество внешних батарейных шкафов UPS", "decimal", "pcs", null],
  ["ups_monitoring_mode", "Внешний мониторинг UPS входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["ups_monitoring_gateway_designation", "Карта или шлюз мониторинга UPS", "text", null, null],
  ["ups_monitoring_gateway_quantity_piece", "Количество карт или шлюзов мониторинга UPS", "decimal", "pcs", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("external_battery_cabinet_")
    && parameterId !== "external_battery_cabinet_mode"
    ? "external_battery_cabinet_mode"
    : parameterId.startsWith("ups_monitoring_gateway_")
      ? "ups_monitoring_mode"
      : null;
  if (!branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type UpsSystemParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};

export const UPS_SYSTEM_PARAMETERS: readonly UpsSystemParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "ups_unit_retained_spare_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.ups-system-r1",
      semantic_parameter_key: `ups-system:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_UPS_LOAD_BATTERY_DISTRIBUTION_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, однолинейной схеме или выбранному UPS.`
          : `${titleRu}: укажите по расчёту нагрузки и автономии, спецификации, кабельному журналу, ППР или программе ПНР.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_UPS_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_UPS_LOAD_BATTERY_DISTRIBUTION_METHOD_OR_QA_DOCUMENTATION",
        source_document: UPS_SYSTEM_SOURCE_ID,
        source_locator: UPS_SYSTEM_SOURCE_METADATA.exact_locator,
        guide_version: "ups-system-r1",
        source_snapshot_hash: UPS_SYSTEM_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой UPS; нагрузки, общее распределение, генераторы и другие слаботочные системы исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const UPS_SYSTEM_RUNTIME_INPUT = Object.freeze({
  ups_unit_retained_spare_piece: 0,
  ups_unit_supplier_pack_size_piece: 1,
});
export const UPS_SYSTEM_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(UPS_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const UPS_SYSTEM_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(UPS_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [UPS_SYSTEM_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const UPS_SYSTEM_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("ups_system_install_count_v1", "system", "ups_system_count"),
  formula("ups_unit_order_v1", "pcs", "ceil((ups_unit_count+ups_unit_retained_spare_piece)/ups_unit_supplier_pack_size_piece)*ups_unit_supplier_pack_size_piece"),
  formula("ups_input_protection_quantity_v1", "pcs", "ups_input_protection_quantity_piece"),
  formula("ups_output_panel_quantity_v1", "pcs", "ups_output_panel_quantity_piece"),
  formula("ups_maintenance_bypass_quantity_v1", "pcs", "ups_maintenance_bypass_quantity_piece"),
  formula("ups_input_cable_length_v1", "m", "ups_input_cable_length_m"),
  formula("ups_output_cable_length_v1", "m", "ups_output_cable_length_m"),
  formula("ups_battery_cable_length_v1", "m", "ups_battery_cable_length_m"),
  formula("ups_battery_module_quantity_v1", "pcs", "ups_battery_module_quantity_piece"),
  formula("ups_termination_quantity_v1", "pcs", "ups_termination_quantity_piece"),
  formula("ups_label_quantity_v1", "pcs", "ups_label_quantity_piece"),
  formula("ups_fastening_quantity_v1", "set", "ups_fastening_quantity_set"),
  formula("ups_consumable_quantity_v1", "kg", "ups_consumable_quantity_kg"),
  formula("ups_grounding_conductor_length_v1", "m", "ups_grounding_conductor_length_m"),
  formula("ups_acceptance_test_count_v1", "test", "ups_unit_count"),
  formula("ups_protocol_register_count_v1", "unit", "ups_unit_count"),
  formula("ups_external_battery_cabinet_quantity_v1", "pcs", "external_battery_cabinet_quantity_piece"),
  formula("ups_monitoring_gateway_quantity_v1", "pcs", "ups_monitoring_gateway_quantity_piece"),
  formula("ups_unit_installed_net_v1", "pcs", "ups_unit_count"),
  formula("ups_unit_retained_spare_v1", "pcs", "ups_unit_retained_spare_piece"),
  formula("ups_unit_total_need_v1", "pcs", "ups_unit_count+ups_unit_retained_spare_piece"),
  formula("ups_unit_package_count_v1", "package", "ceil((ups_unit_count+ups_unit_retained_spare_piece)/ups_unit_supplier_pack_size_piece)"),
  formula("ups_unit_remainder_v1", "pcs", "ceil((ups_unit_count+ups_unit_retained_spare_piece)/ups_unit_supplier_pack_size_piece)*ups_unit_supplier_pack_size_piece-ups_unit_count"),
  formula("ups_unit_surplus_v1", "pcs", "max(0,ceil((ups_unit_count+ups_unit_retained_spare_piece)/ups_unit_supplier_pack_size_piece)*ups_unit_supplier_pack_size_piece-ups_unit_count-ups_unit_retained_spare_piece)"),
  formula("ups_test_report_quantity_v1", "document", "ups_test_report_quantity_document"),
  formula("ups_equipment_install_labor_v1", "man_hour", "ups_equipment_install_labor_h"),
  formula("ups_cabling_termination_labor_v1", "man_hour", "ups_cabling_termination_labor_h"),
  formula("ups_configuration_commissioning_labor_v1", "man_hour", "ups_configuration_commissioning_labor_h"),
  formula("ups_handling_equipment_v1", "machine_hour", "ups_handling_equipment_machine_h"),
  formula("ups_load_battery_tester_v1", "machine_hour", "ups_load_battery_tester_machine_h"),
  formula("ups_delivery_v1", "trip", "ups_delivery_trip_count"),
  formula("ups_packaging_removal_v1", "trip", "ups_packaging_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; sourceRole: string; procurementEligible: boolean;
  inclusionAst?: Json; titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `ups-system:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: UPS_SYSTEM_SOURCE_ID, source_id: UPS_SYSTEM_SOURCE_ID,
      normId: UPS_SYSTEM_NORM_ID, norm_id: UPS_SYSTEM_NORM_ID,
      normVersion: UPS_SYSTEM_SOURCE_METADATA.source_document_version,
      source_title: UPS_SYSTEM_SOURCE_METADATA.source_title,
      exact_locator: UPS_SYSTEM_SOURCE_METADATA.exact_locator,
      source_definition_hash: UPS_SYSTEM_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "floor-area-derived UPS, battery, protection or cable quantity",
      "static 432-m route or generic electrical productivity",
      "automatic load, autonomy, battery, bypass or monitoring selection",
      "automatic retained spare or supplier package",
      "downstream loads, general distribution, generators or other low-voltage systems",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId, ordinal: input.ordinal, section: input.section,
    category: input.category, title_ru: input.titleRu, unit_id: input.unitId,
    formula_id: input.formulaId, inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph, procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId, source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const UPS_SYSTEM_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:ups_system_install_commission", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и пусконаладка системы бесперебойного электропитания", unitId: "system", formulaId: "ups_system_install_count_v1", sourceRole: "USER_SUPPLIED_OR_APPROVED_UPS_SCOPE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups_unit", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "Источник бесперебойного питания", unitId: "pcs", formulaId: "ups_unit_order_v1", titleParameterIds: ["ups_unit_designation", "ups_topology"], sourceRole: "USER_SELECTED_AND_APPROVED_UPS_UNIT", procurementEligible: true }),
  resource({ rowId: "rc09:ups_input_protection", ordinal: 2, section: "Оборудование", category: "equipment", titleRu: "Аппарат вводной защиты UPS", unitId: "pcs", formulaId: "ups_input_protection_quantity_v1", titleParameterIds: ["ups_input_protection_designation"], sourceRole: "APPROVED_UPS_SINGLE_LINE_AND_PROTECTION_STUDY", procurementEligible: true }),
  resource({ rowId: "rc09:ups_output_panel", ordinal: 3, section: "Оборудование", category: "equipment", titleRu: "Выходной распределительный щит UPS", unitId: "pcs", formulaId: "ups_output_panel_quantity_v1", titleParameterIds: ["ups_output_panel_designation"], sourceRole: "APPROVED_UPS_SINGLE_LINE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_maintenance_bypass", ordinal: 4, section: "Оборудование", category: "equipment", titleRu: "Сервисный байпас UPS", unitId: "pcs", formulaId: "ups_maintenance_bypass_quantity_v1", titleParameterIds: ["ups_maintenance_bypass_designation"], sourceRole: "APPROVED_UPS_SINGLE_LINE_AND_MAINTENANCE_SCHEME", procurementEligible: true }),
  resource({ rowId: "rc09:ups_input_cable", ordinal: 5, section: "Материалы", category: "material", titleRu: "Вводной кабель UPS", unitId: "m", formulaId: "ups_input_cable_length_v1", titleParameterIds: ["ups_input_cable_designation"], sourceRole: "APPROVED_UPS_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_output_cable", ordinal: 6, section: "Материалы", category: "material", titleRu: "Выходной кабель UPS", unitId: "m", formulaId: "ups_output_cable_length_v1", titleParameterIds: ["ups_output_cable_designation"], sourceRole: "APPROVED_UPS_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_battery_cable", ordinal: 7, section: "Материалы", category: "material", titleRu: "Батарейный кабель UPS", unitId: "m", formulaId: "ups_battery_cable_length_v1", titleParameterIds: ["ups_battery_cable_designation"], sourceRole: "APPROVED_UPS_BATTERY_CALCULATION_AND_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_battery_module", ordinal: 8, section: "Оборудование", category: "equipment", titleRu: "Батарейный модуль UPS", unitId: "pcs", formulaId: "ups_battery_module_quantity_v1", titleParameterIds: ["ups_battery_module_designation"], sourceRole: "APPROVED_UPS_AUTONOMY_AND_BATTERY_CALCULATION", procurementEligible: true }),
  resource({ rowId: "rc09:ups_termination", ordinal: 9, section: "Комплектующие", category: "material", titleRu: "Оконцевание силовых и батарейных кабелей UPS", unitId: "pcs", formulaId: "ups_termination_quantity_v1", titleParameterIds: ["ups_termination_designation"], sourceRole: "APPROVED_UPS_CABLE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_label", ordinal: 10, section: "Комплектующие", category: "material", titleRu: "Маркировка оборудования и кабелей UPS", unitId: "pcs", formulaId: "ups_label_quantity_v1", titleParameterIds: ["ups_label_designation"], sourceRole: "APPROVED_UPS_LABELING_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_fastening", ordinal: 11, section: "Крепёж", category: "material", titleRu: "Комплект крепления оборудования и кабелей UPS", unitId: "set", formulaId: "ups_fastening_quantity_v1", titleParameterIds: ["ups_fastening_designation"], sourceRole: "APPROVED_UPS_INSTALLATION_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:ups_consumable", ordinal: 12, section: "Расходники", category: "material", titleRu: "Монтажные расходники UPS", unitId: "kg", formulaId: "ups_consumable_quantity_v1", titleParameterIds: ["ups_consumable_designation"], sourceRole: "APPROVED_UPS_RESOURCE_SCHEDULE", procurementEligible: true }),
  resource({ rowId: "rc09:ups_grounding_conductor", ordinal: 13, section: "Материалы", category: "material", titleRu: "Защитный проводник оборудования UPS", unitId: "m", formulaId: "ups_grounding_conductor_length_v1", titleParameterIds: ["ups_grounding_conductor_designation"], sourceRole: "APPROVED_UPS_GROUNDING_DETAIL", procurementEligible: true }),
  resource({ rowId: "rc09:ups_acceptance_test", ordinal: 14, section: "Контроль", category: "service", titleRu: "Проверка запуска, переключения, байпаса, батарей и автономии UPS", unitId: "test", formulaId: "ups_acceptance_test_count_v1", sourceRole: "USER_SUPPLIED_UPS_COUNT_AND_APPROVED_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups_protocol_register", ordinal: 15, section: "Документы", category: "service", titleRu: "Запись UPS в исполнительном реестре и протоколе", unitId: "unit", formulaId: "ups_protocol_register_count_v1", sourceRole: "USER_SUPPLIED_UPS_COUNT_AND_APPROVED_ASBUILT_REGISTER", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups_external_battery_cabinet", ordinal: 16, section: "Условное оборудование", category: "equipment", titleRu: "Внешний батарейный шкаф UPS", unitId: "pcs", formulaId: "ups_external_battery_cabinet_quantity_v1", inclusionAst: equals("external_battery_cabinet_mode", "REQUIRED"), titleParameterIds: ["external_battery_cabinet_designation"], sourceRole: "APPROVED_UPS_BATTERY_LAYOUT", procurementEligible: true }),
  resource({ rowId: "rc09:ups_monitoring_gateway", ordinal: 17, section: "Условное оборудование", category: "equipment", titleRu: "Карта или шлюз мониторинга UPS", unitId: "pcs", formulaId: "ups_monitoring_gateway_quantity_v1", inclusionAst: equals("ups_monitoring_mode", "REQUIRED"), titleParameterIds: ["ups_monitoring_gateway_designation"], sourceRole: "APPROVED_UPS_MONITORING_ARCHITECTURE", procurementEligible: true }),
  resource({ rowId: "rc09:ups-unit-balance:installed-net", ordinal: 18, section: "Баланс UPS", category: "equipment", titleRu: "Количество устанавливаемых UPS", unitId: "pcs", formulaId: "ups_unit_installed_net_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups-unit-balance:retained-spare", ordinal: 19, section: "Баланс UPS", category: "equipment", titleRu: "Сохраняемый резерв UPS", unitId: "pcs", formulaId: "ups_unit_retained_spare_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups-unit-balance:total-need", ordinal: 20, section: "Баланс UPS", category: "equipment", titleRu: "Общая потребность в UPS", unitId: "pcs", formulaId: "ups_unit_total_need_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups-unit-balance:package-count", ordinal: 21, section: "Баланс UPS", category: "equipment", titleRu: "Количество поставочных упаковок UPS", unitId: "package", formulaId: "ups_unit_package_count_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups-unit-balance:remainder", ordinal: 22, section: "Баланс UPS", category: "equipment", titleRu: "Остаток UPS после монтажа", unitId: "pcs", formulaId: "ups_unit_remainder_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups-unit-balance:surplus-beyond-spare", ordinal: 23, section: "Баланс UPS", category: "equipment", titleRu: "Свободный остаток UPS сверх резерва", unitId: "pcs", formulaId: "ups_unit_surplus_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:ups_test_report", ordinal: 24, section: "Контроль", category: "service", titleRu: "Протокол проверки и пусконаладки UPS", unitId: "document", formulaId: "ups_test_report_quantity_v1", titleParameterIds: ["ups_test_report_designation"], sourceRole: "APPROVED_UPS_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:ups-equipment-install", ordinal: 25, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу UPS, батарей и щитов", unitId: "man_hour", formulaId: "ups_equipment_install_labor_v1", sourceRole: "APPROVED_UPS_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:ups-cabling-termination", ordinal: 26, section: "Труд", category: "construction_work", titleRu: "Труд по прокладке и окончанию кабелей UPS", unitId: "man_hour", formulaId: "ups_cabling_termination_labor_v1", sourceRole: "APPROVED_UPS_INSTALLATION_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:labor:ups-configuration-commissioning", ordinal: 27, section: "Труд", category: "construction_work", titleRu: "Труд по настройке и пусконаладке UPS", unitId: "man_hour", formulaId: "ups_configuration_commissioning_labor_v1", sourceRole: "APPROVED_UPS_COMMISSIONING_METHOD", procurementEligible: false }),
  resource({ rowId: "rc09:equipment:ups-handling", ordinal: 28, section: "Механизмы и инструмент", category: "equipment", titleRu: "Такелажное и подъёмное оборудование для монтажа UPS", unitId: "machine_hour", formulaId: "ups_handling_equipment_v1", sourceRole: "APPROVED_UPS_INSTALLATION_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:equipment:ups-load-battery-tester", ordinal: 29, section: "Механизмы и инструмент", category: "equipment", titleRu: "Нагрузочный и батарейный тестер UPS", unitId: "machine_hour", formulaId: "ups_load_battery_tester_v1", sourceRole: "APPROVED_UPS_COMMISSIONING_METHOD", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:ups-delivery", ordinal: 30, section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов UPS", unitId: "trip", formulaId: "ups_delivery_v1", sourceRole: "APPROVED_UPS_LOGISTICS_PLAN", procurementEligible: true }),
  resource({ rowId: "rc09:logistics:ups-packaging-removal", ordinal: 31, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и монтажных отходов UPS", unitId: "trip", formulaId: "ups_packaging_removal_v1", sourceRole: "APPROVED_UPS_WASTE_PLAN", procurementEligible: true }),
]);

export const UPS_SYSTEM_SHORT_INPUT = Object.freeze({
  ups_system_count: 1,
  ups_unit_count: 2,
  ups_unit_designation: "UPS-20KVA-3P",
  ups_topology: "ONLINE_DOUBLE_CONVERSION",
  ups_rated_power_kva: 20,
  ups_autonomy_min: 30,
  ...UPS_SYSTEM_RUNTIME_INPUT,
});

export const UPS_SYSTEM_ACCEPTANCE_INPUT = Object.freeze({
  ...UPS_SYSTEM_SHORT_INPUT,
  ups_input_protection_designation: "Автоматический выключатель ввода UPS по расчёту",
  ups_input_protection_quantity_piece: 2,
  ups_output_panel_designation: "Щит распределения гарантированного питания",
  ups_output_panel_quantity_piece: 1,
  ups_maintenance_bypass_designation: "Сервисный байпас UPS по однолинейной схеме",
  ups_maintenance_bypass_quantity_piece: 2,
  ups_input_cable_designation: "Кабель ввода UPS по кабельному журналу",
  ups_input_cable_length_m: 120,
  ups_output_cable_designation: "Кабель выхода UPS по кабельному журналу",
  ups_output_cable_length_m: 180,
  ups_battery_cable_designation: "Гибкий батарейный кабель по расчёту",
  ups_battery_cable_length_m: 80,
  ups_battery_module_designation: "Батарейный модуль по расчёту автономии 30 минут",
  ups_battery_module_quantity_piece: 16,
  ups_termination_designation: "Наконечники силовых и батарейных кабелей",
  ups_termination_quantity_piece: 48,
  ups_label_designation: "Маркировка UPS, батарей и кабелей по схеме",
  ups_label_quantity_piece: 40,
  ups_fastening_designation: "Комплект крепления оборудования и кабелей UPS",
  ups_fastening_quantity_set: 80,
  ups_consumable_designation: "Стяжки, термоусадка, паста и монтажная мелочёвка",
  ups_consumable_quantity_kg: 6,
  ups_grounding_conductor_designation: "Проводник PE по схеме заземления UPS",
  ups_grounding_conductor_length_m: 25,
  ups_test_report_designation: "Протокол запуска, байпаса, батарей и автономии UPS",
  ups_test_report_quantity_document: 1,
  ups_equipment_install_labor_h: 48,
  ups_cabling_termination_labor_h: 72,
  ups_configuration_commissioning_labor_h: 40,
  ups_handling_equipment_machine_h: 16,
  ups_load_battery_tester_machine_h: 20,
  ups_delivery_trip_count: 2,
  ups_packaging_removal_trip_count: 1,
  external_battery_cabinet_mode: "NOT_REQUIRED",
  ups_monitoring_mode: "NOT_REQUIRED",
});

export async function compileUpsSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? UPS_SYSTEM_CATALOG_ID;
  if (catalogId !== UPS_SYSTEM_CATALOG_ID) {
    throw new Error(`UPS_SYSTEM_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.ups-system-r1",
    catalogId,
    primaryMeasureParameterId: "ups_system_count",
    parameterDefinitions: [...UPS_SYSTEM_PARAMETERS],
    formulaDefinitions: [...UPS_SYSTEM_FORMULAS],
    resourceDefinitions: [...UPS_SYSTEM_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...UPS_SYSTEM_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
