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

export const BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID =
  "canonical-work:expanded:BMS_system";
export const BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID =
  "project_building_management_system_architecture_point_list_method_qa_v1";
export const BUILDING_MANAGEMENT_SYSTEM_NORM_ID =
  "norm:project:building_management_system:architecture_point_list_method_qa:v1";

export const BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая архитектура BMS, перечень точек, спецификация шкафов и контроллеров, кабельный журнал, ППР и программа пусконаладки",
  source_authority: "Проектная организация автоматизации, системный интегратор, изготовитель оборудования, служба ПНР и утверждающий инженер проекта",
  source_document_version: "PROJECT_BMS_CONTROLLER_POINT_NETWORK_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "8fc164ebfb95c4757bf7878de4764f96463b6153512f7aeced720fa098719ac6",
  exact_locator: "Одна система BMS, 2 выбранных контроллера DDC-24IO, 120 физических точек, одно АРМ WS-BMS-01 и BACnet/IP; шкафы, модули I/O, кабели, лотки, окончания, маркировка, крепёж, расходники, заземление, труд, инструмент, ПНР и документы — только по утверждённому проектному комплекту",
  use_restriction: "Площадь здания сама по себе не определяет контроллеры, точки, длины трасс и интеграции. Полевые датчики/приводы и шлюзы входят только по явным проектным ветвям. Оборудование HVAC, силовое распределение, пожарная сигнализация и СКУД исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "8fc164ebfb95c4757bf7878de4764f96463b6153512f7aeced720fa098719ac6",
});

const KNOWN_SCOPE = [
  "bms_system_count",
  "bms_controller_count",
  "bms_controller_designation",
  "bms_physical_point_count",
  "bms_operator_workstation_count",
  "bms_operator_workstation_designation",
  "bms_integration_protocol",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "bms_controller_retained_spare_piece",
  "bms_controller_supplier_pack_size_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "integration_gateway_designation", "integration_gateway_quantity_piece",
  "field_sensor_designation", "field_sensor_quantity_piece",
  "field_actuator_designation", "field_actuator_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["bms_system_count", "Количество систем BMS", "integer", "system", null],
  ["bms_controller_count", "Количество устанавливаемых DDC-контроллеров", "integer", "pcs", null],
  ["bms_controller_designation", "Марка и каталожное обозначение DDC-контроллера", "text", null, null],
  ["bms_physical_point_count", "Количество физических точек BMS", "integer", "point", null],
  ["bms_operator_workstation_count", "Количество АРМ оператора BMS", "integer", "pcs", null],
  ["bms_operator_workstation_designation", "Марка и обозначение АРМ оператора BMS", "text", null, null],
  ["bms_integration_protocol", "Протокол интеграции BMS", "text", null, null],
  ["bms_controller_retained_spare_piece", "Сохраняемый резерв DDC-контроллеров", "decimal", "pcs", null],
  ["bms_controller_supplier_pack_size_piece", "Количество DDC-контроллеров в поставочной упаковке", "decimal", "pcs", null],
  ["automation_panel_designation", "Шкаф автоматики BMS по спецификации", "text", null, null],
  ["automation_panel_quantity_piece", "Количество шкафов автоматики BMS", "decimal", "pcs", null],
  ["io_module_designation", "Модуль ввода-вывода BMS по спецификации", "text", null, null],
  ["io_module_quantity_piece", "Количество модулей ввода-вывода", "decimal", "pcs", null],
  ["bms_network_cable_designation", "Сетевой кабель BMS по кабельному журналу", "text", null, null],
  ["bms_network_cable_length_m", "Длина сетевого кабеля BMS", "decimal", "m", null],
  ["bms_control_cable_designation", "Контрольный кабель BMS по кабельному журналу", "text", null, null],
  ["bms_control_cable_length_m", "Длина контрольного кабеля BMS", "decimal", "m", null],
  ["bms_containment_designation", "Лоток, труба или короб трасс BMS", "text", null, null],
  ["bms_containment_length_m", "Длина кабеленесущей системы BMS", "decimal", "m", null],
  ["bms_termination_designation", "Оконцевание кабелей BMS", "text", null, null],
  ["bms_termination_quantity_piece", "Количество окончаний кабелей BMS", "decimal", "pcs", null],
  ["bms_label_designation", "Маркировка кабелей и точек BMS", "text", null, null],
  ["bms_label_quantity_piece", "Количество элементов маркировки", "decimal", "pcs", null],
  ["bms_fastening_designation", "Крепёж кабелей и оборудования BMS", "text", null, null],
  ["bms_fastening_quantity_piece", "Количество комплектов крепежа BMS", "decimal", "set", null],
  ["bms_consumable_designation", "Монтажные расходники BMS", "text", null, null],
  ["bms_consumable_quantity_kg", "Масса монтажных расходников BMS", "decimal", "kg", null],
  ["bms_pe_conductor_designation", "Защитный проводник шкафов BMS", "text", null, null],
  ["bms_pe_conductor_length_m", "Длина защитного проводника BMS", "decimal", "m", null],
  ["bms_test_report_designation", "Протокол проверки точек и пусконаладки BMS", "text", null, null],
  ["bms_test_report_quantity_document", "Количество протоколов проверки и ПНР", "decimal", "document", null],
  ["bms_panel_controller_install_labor_h", "Труд по монтажу шкафов, контроллеров и модулей BMS", "decimal", "man_hour", null],
  ["bms_cabling_termination_labor_h", "Труд по прокладке и окончанию кабелей BMS", "decimal", "man_hour", null],
  ["bms_programming_commissioning_labor_h", "Труд по программированию, графике и пусконаладке BMS", "decimal", "man_hour", null],
  ["bms_cable_installation_tool_machine_h", "Работа инструмента прокладки и окончания кабелей BMS", "decimal", "machine_hour", null],
  ["bms_commissioning_analyzer_machine_h", "Работа инженерной станции и анализатора сети BMS", "decimal", "machine_hour", null],
  ["bms_delivery_trip_count", "Рейсы доставки оборудования и материалов BMS", "integer", "trip", null],
  ["bms_packaging_removal_trip_count", "Рейсы вывоза упаковки и монтажных отходов BMS", "integer", "trip", null],
  ["integration_gateway_mode", "Шлюз интеграции входит в объём BMS", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["integration_gateway_designation", "Шлюз интеграции BMS по архитектуре", "text", null, null],
  ["integration_gateway_quantity_piece", "Количество шлюзов интеграции BMS", "decimal", "pcs", null],
  ["field_devices_mode", "Полевые датчики и приводы входят в объём BMS", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["field_sensor_designation", "Полевые датчики BMS по спецификации", "text", null, null],
  ["field_sensor_quantity_piece", "Количество полевых датчиков BMS", "decimal", "pcs", null],
  ["field_actuator_designation", "Полевые приводы BMS по спецификации", "text", null, null],
  ["field_actuator_quantity_piece", "Количество полевых приводов BMS", "decimal", "pcs", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("integration_gateway_")
    ? "integration_gateway_mode"
    : parameterId.startsWith("field_sensor_") || parameterId.startsWith("field_actuator_")
      ? "field_devices_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type BuildingManagementSystemParameter =
CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const BUILDING_MANAGEMENT_SYSTEM_PARAMETERS:
readonly BuildingManagementSystemParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
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
          ? { min: parameterId === "bms_controller_retained_spare_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.building-management-system-r1",
      semantic_parameter_key: `building-management-system:${parameterId}`,
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
          : "APPROVED_BMS_ARCHITECTURE_POINT_LIST_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, архитектуре BMS или перечню точек.`
          : `${titleRu}: укажите по утверждённой архитектуре, спецификации, кабельному журналу, ППР или программе ПНР.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_BMS_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_BMS_ARCHITECTURE_POINT_LIST_METHOD_OR_QA_DOCUMENTATION",
        source_document: BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
        source_locator: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.exact_locator,
        guide_version: "building-management-system-r1",
        source_snapshot_hash: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой системы BMS; оборудование смежных инженерных систем исключено.",
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

export const BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT = Object.freeze({
  bms_controller_retained_spare_piece: 0,
  bms_controller_supplier_pack_size_piece: 1,
});
export const BUILDING_MANAGEMENT_SYSTEM_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const BUILDING_MANAGEMENT_SYSTEM_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const BUILDING_MANAGEMENT_SYSTEM_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("bms_system_install_count_v1", "system", "bms_system_count"),
  formula("bms_automation_panel_quantity_v1", "pcs", "automation_panel_quantity_piece"),
  formula("bms_controller_order_v1", "pcs",
    "ceil((bms_controller_count+bms_controller_retained_spare_piece)/bms_controller_supplier_pack_size_piece)*bms_controller_supplier_pack_size_piece"),
  formula("bms_io_module_quantity_v1", "pcs", "io_module_quantity_piece"),
  formula("bms_operator_workstation_quantity_v1", "pcs", "bms_operator_workstation_count"),
  formula("bms_network_cable_length_v1", "m", "bms_network_cable_length_m"),
  formula("bms_control_cable_length_v1", "m", "bms_control_cable_length_m"),
  formula("bms_containment_length_v1", "m", "bms_containment_length_m"),
  formula("bms_termination_quantity_v1", "pcs", "bms_termination_quantity_piece"),
  formula("bms_label_quantity_v1", "pcs", "bms_label_quantity_piece"),
  formula("bms_fastening_quantity_v1", "set", "bms_fastening_quantity_piece"),
  formula("bms_consumable_quantity_v1", "kg", "bms_consumable_quantity_kg"),
  formula("bms_pe_conductor_length_v1", "m", "bms_pe_conductor_length_m"),
  formula("bms_point_test_count_v1", "test", "bms_physical_point_count"),
  formula("bms_asbuilt_point_register_count_v1", "point", "bms_physical_point_count"),
  formula("bms_integration_gateway_quantity_v1", "pcs", "integration_gateway_quantity_piece"),
  formula("bms_field_sensor_quantity_v1", "pcs", "field_sensor_quantity_piece"),
  formula("bms_field_actuator_quantity_v1", "pcs", "field_actuator_quantity_piece"),
  formula("bms_controller_installed_net_v1", "pcs", "bms_controller_count"),
  formula("bms_controller_retained_spare_v1", "pcs", "bms_controller_retained_spare_piece"),
  formula("bms_controller_total_need_v1", "pcs", "bms_controller_count+bms_controller_retained_spare_piece"),
  formula("bms_controller_package_count_v1", "package",
    "ceil((bms_controller_count+bms_controller_retained_spare_piece)/bms_controller_supplier_pack_size_piece)"),
  formula("bms_controller_remainder_v1", "pcs",
    "ceil((bms_controller_count+bms_controller_retained_spare_piece)/bms_controller_supplier_pack_size_piece)*bms_controller_supplier_pack_size_piece-bms_controller_count"),
  formula("bms_controller_surplus_v1", "pcs",
    "max(0,ceil((bms_controller_count+bms_controller_retained_spare_piece)/bms_controller_supplier_pack_size_piece)*bms_controller_supplier_pack_size_piece-bms_controller_count-bms_controller_retained_spare_piece)"),
  formula("bms_test_report_quantity_v1", "document", "bms_test_report_quantity_document"),
  formula("bms_panel_controller_install_labor_v1", "man_hour", "bms_panel_controller_install_labor_h"),
  formula("bms_cabling_termination_labor_v1", "man_hour", "bms_cabling_termination_labor_h"),
  formula("bms_programming_commissioning_labor_v1", "man_hour", "bms_programming_commissioning_labor_h"),
  formula("bms_cable_installation_tool_v1", "machine_hour", "bms_cable_installation_tool_machine_h"),
  formula("bms_commissioning_analyzer_v1", "machine_hour", "bms_commissioning_analyzer_machine_h"),
  formula("bms_delivery_v1", "trip", "bms_delivery_trip_count"),
  formula("bms_packaging_removal_v1", "trip", "bms_packaging_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  sourceRole: string;
  procurementEligible: boolean;
  inclusionAst?: Json;
  titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `building-management-system:${input.rowId}`,
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
      sourceId: BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
      source_id: BUILDING_MANAGEMENT_SYSTEM_SOURCE_ID,
      normId: BUILDING_MANAGEMENT_SYSTEM_NORM_ID,
      norm_id: BUILDING_MANAGEMENT_SYSTEM_NORM_ID,
      normVersion: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.source_document_version,
      source_title: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.source_title,
      exact_locator: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.exact_locator,
      source_definition_hash: BUILDING_MANAGEMENT_SYSTEM_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "floor-area-derived BMS controller, point, cable or containment quantity",
      "static 432-m route or generic electrical productivity",
      "automatic retained spare or supplier package",
      "automatic field sensor, actuator or integration gateway",
      "HVAC plant, electrical distribution, fire alarm or access control equipment",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const BUILDING_MANAGEMENT_SYSTEM_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:bms_system_install_commission", ordinal: 0,
    section: "Работы", category: "construction_work", titleRu: "Монтаж и пусконаладка системы автоматизации здания BMS",
    unitId: "system", formulaId: "bms_system_install_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_BMS_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms_automation_panel", ordinal: 1,
    section: "Оборудование", category: "equipment", titleRu: "Шкаф автоматики BMS",
    unitId: "pcs", formulaId: "bms_automation_panel_quantity_v1", procurementEligible: true,
    titleParameterIds: ["automation_panel_designation"], sourceRole: "APPROVED_BMS_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:bms_ddc_controller", ordinal: 2,
    section: "Оборудование", category: "equipment", titleRu: "Программируемый DDC-контроллер BMS",
    unitId: "pcs", formulaId: "bms_controller_order_v1", procurementEligible: true,
    titleParameterIds: ["bms_controller_designation", "bms_integration_protocol"], sourceRole: "USER_SELECTED_AND_APPROVED_BMS_CONTROLLER" }),
  resource({ rowId: "rc09:bms_io_module", ordinal: 3,
    section: "Оборудование", category: "equipment", titleRu: "Модуль ввода-вывода BMS",
    unitId: "pcs", formulaId: "bms_io_module_quantity_v1", procurementEligible: true,
    titleParameterIds: ["io_module_designation"], sourceRole: "APPROVED_BMS_POINT_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:bms_operator_workstation", ordinal: 4,
    section: "Оборудование", category: "equipment", titleRu: "Автоматизированное рабочее место оператора BMS",
    unitId: "pcs", formulaId: "bms_operator_workstation_quantity_v1", procurementEligible: true,
    titleParameterIds: ["bms_operator_workstation_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_BMS_WORKSTATION" }),
  resource({ rowId: "rc09:bms_network_cable", ordinal: 5,
    section: "Материалы", category: "material", titleRu: "Сетевой кабель BMS",
    unitId: "m", formulaId: "bms_network_cable_length_v1", procurementEligible: true,
    titleParameterIds: ["bms_network_cable_designation"], sourceRole: "APPROVED_BMS_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:bms_control_cable", ordinal: 6,
    section: "Материалы", category: "material", titleRu: "Контрольный кабель BMS",
    unitId: "m", formulaId: "bms_control_cable_length_v1", procurementEligible: true,
    titleParameterIds: ["bms_control_cable_designation"], sourceRole: "APPROVED_BMS_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:bms_containment", ordinal: 7,
    section: "Материалы", category: "material", titleRu: "Кабеленесущая система трасс BMS",
    unitId: "m", formulaId: "bms_containment_length_v1", procurementEligible: true,
    titleParameterIds: ["bms_containment_designation"], sourceRole: "APPROVED_BMS_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:bms_termination", ordinal: 8,
    section: "Комплектующие", category: "material", titleRu: "Оконцевание кабеля BMS",
    unitId: "pcs", formulaId: "bms_termination_quantity_v1", procurementEligible: true,
    titleParameterIds: ["bms_termination_designation"], sourceRole: "APPROVED_BMS_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:bms_label", ordinal: 9,
    section: "Комплектующие", category: "material", titleRu: "Маркировка кабелей, контроллеров и точек BMS",
    unitId: "pcs", formulaId: "bms_label_quantity_v1", procurementEligible: true,
    titleParameterIds: ["bms_label_designation"], sourceRole: "APPROVED_BMS_LABELING_SCHEDULE" }),
  resource({ rowId: "rc09:bms_fastening", ordinal: 10,
    section: "Крепёж", category: "material", titleRu: "Комплект крепления кабелей и оборудования BMS",
    unitId: "set", formulaId: "bms_fastening_quantity_v1", procurementEligible: true,
    titleParameterIds: ["bms_fastening_designation"], sourceRole: "APPROVED_BMS_INSTALLATION_DETAIL" }),
  resource({ rowId: "rc09:bms_consumable", ordinal: 11,
    section: "Расходники", category: "material", titleRu: "Монтажные расходники BMS",
    unitId: "kg", formulaId: "bms_consumable_quantity_v1", procurementEligible: true,
    titleParameterIds: ["bms_consumable_designation"], sourceRole: "APPROVED_BMS_RESOURCE_SCHEDULE" }),
  resource({ rowId: "rc09:bms_pe_conductor", ordinal: 12,
    section: "Материалы", category: "material", titleRu: "Защитный проводник шкафов и оборудования BMS",
    unitId: "m", formulaId: "bms_pe_conductor_length_v1", procurementEligible: true,
    titleParameterIds: ["bms_pe_conductor_designation"], sourceRole: "APPROVED_BMS_GROUNDING_DETAIL" }),
  resource({ rowId: "rc09:bms_point_test", ordinal: 13,
    section: "Контроль", category: "service", titleRu: "Проверка физической точки BMS от поля до графического интерфейса",
    unitId: "test", formulaId: "bms_point_test_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_POINT_COUNT_AND_APPROVED_COMMISSIONING_PROGRAM", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms_asbuilt_point_register", ordinal: 14,
    section: "Документы", category: "service", titleRu: "Запись точки BMS в исполнительном перечне",
    unitId: "point", formulaId: "bms_asbuilt_point_register_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_POINT_COUNT_AND_APPROVED_ASBUILT_REGISTER", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms_integration_gateway", ordinal: 15,
    section: "Условное оборудование", category: "equipment", titleRu: "Шлюз интеграции BMS",
    unitId: "pcs", formulaId: "bms_integration_gateway_quantity_v1", procurementEligible: true,
    inclusionAst: equals("integration_gateway_mode", "REQUIRED"),
    titleParameterIds: ["integration_gateway_designation"], sourceRole: "APPROVED_BMS_ARCHITECTURE" }),
  resource({ rowId: "rc09:bms_field_sensor", ordinal: 16,
    section: "Условное оборудование", category: "equipment", titleRu: "Полевой датчик BMS",
    unitId: "pcs", formulaId: "bms_field_sensor_quantity_v1", procurementEligible: true,
    inclusionAst: equals("field_devices_mode", "REQUIRED"),
    titleParameterIds: ["field_sensor_designation"], sourceRole: "APPROVED_BMS_FIELD_DEVICE_SCHEDULE" }),
  resource({ rowId: "rc09:bms_field_actuator", ordinal: 17,
    section: "Условное оборудование", category: "equipment", titleRu: "Полевой привод BMS",
    unitId: "pcs", formulaId: "bms_field_actuator_quantity_v1", procurementEligible: true,
    inclusionAst: equals("field_devices_mode", "REQUIRED"),
    titleParameterIds: ["field_actuator_designation"], sourceRole: "APPROVED_BMS_FIELD_DEVICE_SCHEDULE" }),
  resource({ rowId: "rc09:bms-controller-balance:installed-net", ordinal: 18,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Количество устанавливаемых DDC-контроллеров",
    unitId: "pcs", formulaId: "bms_controller_installed_net_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms-controller-balance:retained-spare", ordinal: 19,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Сохраняемый резерв DDC-контроллеров",
    unitId: "pcs", formulaId: "bms_controller_retained_spare_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms-controller-balance:total-need", ordinal: 20,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Общая потребность в DDC-контроллерах",
    unitId: "pcs", formulaId: "bms_controller_total_need_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms-controller-balance:package-count", ordinal: 21,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Количество поставочных упаковок DDC-контроллеров",
    unitId: "package", formulaId: "bms_controller_package_count_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms-controller-balance:remainder", ordinal: 22,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Остаток DDC-контроллеров после монтажа",
    unitId: "pcs", formulaId: "bms_controller_remainder_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms-controller-balance:surplus-beyond-spare", ordinal: 23,
    section: "Баланс DDC-контроллеров", category: "equipment", titleRu: "Свободный остаток контроллеров сверх резерва",
    unitId: "pcs", formulaId: "bms_controller_surplus_v1", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:bms_test_report", ordinal: 24,
    section: "Контроль", category: "service", titleRu: "Протокол проверки точек и пусконаладки BMS",
    unitId: "document", formulaId: "bms_test_report_quantity_v1", procurementEligible: false,
    titleParameterIds: ["bms_test_report_designation"], sourceRole: "APPROVED_BMS_COMMISSIONING_PROGRAM",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:bms-panel-controller-install", ordinal: 25,
    section: "Труд", category: "construction_work", titleRu: "Труд по монтажу шкафов, контроллеров и модулей BMS",
    unitId: "man_hour", formulaId: "bms_panel_controller_install_labor_v1", procurementEligible: false,
    sourceRole: "APPROVED_BMS_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:labor:bms-cabling-termination", ordinal: 26,
    section: "Труд", category: "construction_work", titleRu: "Труд по прокладке, маркировке и окончанию кабелей BMS",
    unitId: "man_hour", formulaId: "bms_cabling_termination_labor_v1", procurementEligible: false,
    sourceRole: "APPROVED_BMS_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:labor:bms-programming-commissioning", ordinal: 27,
    section: "Труд", category: "construction_work", titleRu: "Труд по программированию, графике и пусконаладке BMS",
    unitId: "man_hour", formulaId: "bms_programming_commissioning_labor_v1", procurementEligible: false,
    sourceRole: "APPROVED_BMS_COMMISSIONING_METHOD" }),
  resource({ rowId: "rc09:equipment:bms-cable-installation-tool", ordinal: 28,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Инструмент прокладки и окончания кабелей BMS",
    unitId: "machine_hour", formulaId: "bms_cable_installation_tool_v1", procurementEligible: true,
    sourceRole: "APPROVED_BMS_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:equipment:bms-commissioning-analyzer", ordinal: 29,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Инженерная станция и анализатор сети BMS",
    unitId: "machine_hour", formulaId: "bms_commissioning_analyzer_v1", procurementEligible: true,
    sourceRole: "APPROVED_BMS_COMMISSIONING_METHOD" }),
  resource({ rowId: "rc09:logistics:bms-delivery", ordinal: 30,
    section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов BMS",
    unitId: "trip", formulaId: "bms_delivery_v1", procurementEligible: true,
    sourceRole: "APPROVED_BMS_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:bms-packaging-removal", ordinal: 31,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и монтажных отходов BMS",
    unitId: "trip", formulaId: "bms_packaging_removal_v1", procurementEligible: true,
    sourceRole: "APPROVED_BMS_WASTE_PLAN" }),
]);

export const BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT = Object.freeze({
  bms_system_count: 1,
  bms_controller_count: 2,
  bms_controller_designation: "DDC-24IO",
  bms_physical_point_count: 120,
  bms_operator_workstation_count: 1,
  bms_operator_workstation_designation: "WS-BMS-01",
  bms_integration_protocol: "BACnet/IP",
  ...BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT,
});

export const BUILDING_MANAGEMENT_SYSTEM_ACCEPTANCE_INPUT = Object.freeze({
  ...BUILDING_MANAGEMENT_SYSTEM_SHORT_INPUT,
  automation_panel_designation: "Шкаф автоматики BMS-CP-01 по спецификации", automation_panel_quantity_piece: 1,
  io_module_designation: "Модуль I/O IOM-16DI8DO по перечню точек", io_module_quantity_piece: 8,
  bms_network_cable_designation: "Кабель U/UTP Cat6 LSZH по кабельному журналу", bms_network_cable_length_m: 360,
  bms_control_cable_designation: "Кабель КПСнг(А)-FRLS 2×2×0,75 по кабельному журналу", bms_control_cable_length_m: 850,
  bms_containment_designation: "Лоток и труба трасс BMS по плану", bms_containment_length_m: 280,
  bms_termination_designation: "Наконечник и клеммное окончание по кабельному журналу", bms_termination_quantity_piece: 240,
  bms_label_designation: "Маркировка кабелей и точек по стандарту проекта", bms_label_quantity_piece: 120,
  bms_fastening_designation: "Комплект крепления кабеля и оборудования по узлам", bms_fastening_quantity_piece: 180,
  bms_consumable_designation: "Стяжки, термоусадка и монтажная мелочёвка по ведомости", bms_consumable_quantity_kg: 8,
  bms_pe_conductor_designation: "Проводник PE 6 мм² по схеме заземления", bms_pe_conductor_length_m: 30,
  bms_test_report_designation: "Протокол point-to-point и комплексной ПНР BMS", bms_test_report_quantity_document: 1,
  bms_panel_controller_install_labor_h: 48,
  bms_cabling_termination_labor_h: 120,
  bms_programming_commissioning_labor_h: 80,
  bms_cable_installation_tool_machine_h: 40,
  bms_commissioning_analyzer_machine_h: 32,
  bms_delivery_trip_count: 2,
  bms_packaging_removal_trip_count: 1,
  integration_gateway_mode: "NOT_REQUIRED",
  field_devices_mode: "NOT_REQUIRED",
});

export async function compileBuildingManagementSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID;
  if (catalogId !== BUILDING_MANAGEMENT_SYSTEM_CATALOG_ID) {
    throw new Error(`BUILDING_MANAGEMENT_SYSTEM_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.building-management-system-r1",
    catalogId,
    primaryMeasureParameterId: "bms_system_count",
    parameterDefinitions: [...BUILDING_MANAGEMENT_SYSTEM_PARAMETERS],
    formulaDefinitions: [...BUILDING_MANAGEMENT_SYSTEM_FORMULAS],
    resourceDefinitions: [...BUILDING_MANAGEMENT_SYSTEM_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...BUILDING_MANAGEMENT_SYSTEM_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
