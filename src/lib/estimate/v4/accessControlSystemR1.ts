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

export const ACCESS_CONTROL_SYSTEM_CATALOG_ID =
  "canonical-work:expanded:access_control_system";
export const ACCESS_CONTROL_SYSTEM_SOURCE_ID =
  "project_access_control_door_device_power_method_qa_v1";
export const ACCESS_CONTROL_SYSTEM_NORM_ID =
  "norm:project:access_control_system:door_device_power_method_qa:v1";

export const ACCESS_CONTROL_SYSTEM_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость контролируемых дверей, спецификация устройств СКУД, кабельный журнал, расчёт локального питания, ППР и программа ПНР",
  source_authority: "Проектная организация систем безопасности, интегратор СКУД, изготовитель оборудования, служба ПНР и утверждающий инженер проекта",
  source_document_version: "PROJECT_ACCESS_CONTROL_DOOR_CONTROLLER_READER_LOCK_POWER_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "5a002ececa1b96e1eb0c242534c7a25dccc1a527657e819ea882133e491a06b3",
  exact_locator: "Одна система СКУД, 8 контролируемых дверей, 2 контроллера ACS-CTRL-4D, 16 считывателей READER-MF, 8 замков MAGLOCK-300 и 8 кнопок EXIT-NO; кабели, локальное питание, комплектующие, расходники, труд, механизмы, контроль и логистика — только по утверждённому проектному комплекту",
  use_restriction: "Площадь здания не определяет двери, устройства, питание или трассы. Логика доступа, тип замка, аварийное открытие и интеграции требуют прямого проектного основания. CCTV, оборудование пожарной сигнализации, общая LAN и общая UPS исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "5a002ececa1b96e1eb0c242534c7a25dccc1a527657e819ea882133e491a06b3",
});

const KNOWN_SCOPE = [
  "acs_system_count", "acs_controlled_door_count", "acs_controller_count",
  "acs_controller_designation", "acs_reader_count", "acs_reader_designation",
  "acs_lock_count", "acs_lock_designation", "acs_exit_device_count",
  "acs_exit_device_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "acs_controller_retained_spare_piece",
  "acs_controller_supplier_pack_size_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "intercom_gateway_designation", "intercom_gateway_quantity_piece",
  "fire_release_interface_designation", "fire_release_interface_quantity_piece",
]);

const PARAMETER_SPECS = Object.freeze([
  ["acs_system_count", "Количество систем СКУД", "integer", "system", null],
  ["acs_controlled_door_count", "Количество контролируемых дверей", "integer", "door", null],
  ["acs_controller_count", "Количество устанавливаемых контроллеров СКУД", "integer", "pcs", null],
  ["acs_controller_designation", "Марка и обозначение контроллера СКУД", "text", null, null],
  ["acs_reader_count", "Количество считывателей СКУД", "integer", "pcs", null],
  ["acs_reader_designation", "Марка и обозначение считывателя СКУД", "text", null, null],
  ["acs_lock_count", "Количество электрозамков СКУД", "integer", "pcs", null],
  ["acs_lock_designation", "Марка и обозначение электрозамка СКУД", "text", null, null],
  ["acs_exit_device_count", "Количество кнопок выхода СКУД", "integer", "pcs", null],
  ["acs_exit_device_designation", "Марка и обозначение кнопки выхода СКУД", "text", null, null],
  ["acs_controller_retained_spare_piece", "Сохраняемый резерв контроллеров СКУД", "decimal", "pcs", null],
  ["acs_controller_supplier_pack_size_piece", "Количество контроллеров СКУД в поставочной упаковке", "decimal", "pcs", null],
  ["acs_door_contact_designation", "Датчик состояния двери по ведомости", "text", null, null],
  ["acs_door_contact_quantity_piece", "Количество датчиков состояния двери", "decimal", "pcs", null],
  ["acs_emergency_release_designation", "Устройство аварийного разблокирования двери", "text", null, null],
  ["acs_emergency_release_quantity_piece", "Количество устройств аварийного разблокирования", "decimal", "pcs", null],
  ["acs_power_supply_designation", "Локальный блок питания СКУД по расчёту", "text", null, null],
  ["acs_power_supply_quantity_piece", "Количество локальных блоков питания СКУД", "decimal", "pcs", null],
  ["acs_standby_battery_designation", "Аккумулятор локального питания СКУД", "text", null, null],
  ["acs_standby_battery_quantity_piece", "Количество аккумуляторов локального питания", "decimal", "pcs", null],
  ["acs_network_cable_designation", "Сетевой кабель СКУД по кабельному журналу", "text", null, null],
  ["acs_network_cable_length_m", "Длина сетевого кабеля СКУД", "decimal", "m", null],
  ["acs_reader_cable_designation", "Кабель считывателей СКУД", "text", null, null],
  ["acs_reader_cable_length_m", "Длина кабеля считывателей СКУД", "decimal", "m", null],
  ["acs_lock_cable_designation", "Кабель электрозамков и выходных устройств", "text", null, null],
  ["acs_lock_cable_length_m", "Длина кабеля электрозамков и выходных устройств", "decimal", "m", null],
  ["acs_mounting_box_designation", "Монтажная коробка устройств СКУД", "text", null, null],
  ["acs_mounting_box_quantity_piece", "Количество монтажных коробок СКУД", "decimal", "pcs", null],
  ["acs_termination_designation", "Оконцевание кабелей СКУД", "text", null, null],
  ["acs_termination_quantity_piece", "Количество окончаний кабелей СКУД", "decimal", "pcs", null],
  ["acs_label_designation", "Маркировка устройств и кабелей СКУД", "text", null, null],
  ["acs_label_quantity_piece", "Количество элементов маркировки СКУД", "decimal", "pcs", null],
  ["acs_fastening_designation", "Крепёж устройств и кабелей СКУД", "text", null, null],
  ["acs_fastening_quantity_set", "Количество комплектов крепежа СКУД", "decimal", "set", null],
  ["acs_consumable_designation", "Монтажные расходники СКУД", "text", null, null],
  ["acs_consumable_quantity_kg", "Масса монтажных расходников СКУД", "decimal", "kg", null],
  ["acs_grounding_conductor_designation", "Защитный проводник оборудования СКУД", "text", null, null],
  ["acs_grounding_conductor_length_m", "Длина защитного проводника СКУД", "decimal", "m", null],
  ["acs_test_report_designation", "Протокол функциональной проверки и ПНР СКУД", "text", null, null],
  ["acs_test_report_quantity_document", "Количество протоколов проверки СКУД", "decimal", "document", null],
  ["acs_device_install_labor_h", "Труд по монтажу дверных устройств и оборудования СКУД", "decimal", "man_hour", null],
  ["acs_cabling_termination_labor_h", "Труд по прокладке и окончанию кабелей СКУД", "decimal", "man_hour", null],
  ["acs_configuration_commissioning_labor_h", "Труд по настройке логики и ПНР СКУД", "decimal", "man_hour", null],
  ["acs_lifting_equipment_machine_h", "Работа подъёмного средства для монтажа СКУД", "decimal", "machine_hour", null],
  ["acs_cable_device_tester_machine_h", "Работа кабельного и функционального тестера СКУД", "decimal", "machine_hour", null],
  ["acs_delivery_trip_count", "Рейсы доставки оборудования и материалов СКУД", "integer", "trip", null],
  ["acs_packaging_removal_trip_count", "Рейсы вывоза упаковки и монтажных отходов СКУД", "integer", "trip", null],
  ["intercom_integration_mode", "Интеграция СКУД с домофонией входит в объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["intercom_gateway_designation", "Шлюз или модуль интеграции СКУД с домофонией", "text", null, null],
  ["intercom_gateway_quantity_piece", "Количество шлюзов интеграции с домофонией", "decimal", "pcs", null],
  ["fire_release_integration_mode", "Интерфейс сигнала аварийного открытия входит в объём СКУД", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fire_release_interface_designation", "Интерфейс приёма сигнала аварийного открытия", "text", null, null],
  ["fire_release_interface_quantity_piece", "Количество интерфейсов аварийного открытия", "decimal", "pcs", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("intercom_gateway_")
    ? "intercom_integration_mode"
    : parameterId.startsWith("fire_release_interface_")
      ? "fire_release_integration_mode"
      : null;
  if (!branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type AccessControlSystemParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const ACCESS_CONTROL_SYSTEM_PARAMETERS: readonly AccessControlSystemParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
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
            ? { min: parameterId === "acs_controller_retained_spare_piece"
              ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.access-control-system-r1",
        semantic_parameter_key: `access-control-system:${parameterId}`,
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
            : "APPROVED_ACCESS_CONTROL_DOOR_DEVICE_POWER_METHOD_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу или утверждённой ведомости дверей и устройств.`
            : `${titleRu}: укажите по проекту СКУД, кабельному журналу, расчёту питания, ППР или программе ПНР.`,
          source_role: KNOWN_SCOPE.includes(parameterId)
            ? "USER_SUPPLIED_OR_APPROVED_ACCESS_CONTROL_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
              : "APPROVED_ACCESS_CONTROL_DOOR_DEVICE_POWER_METHOD_OR_QA_DOCUMENTATION",
          source_document: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
          source_locator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
          guide_version: "access-control-system-r1",
          source_snapshot_hash: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.artifact_sha256,
          applicability: "Только для явно определённой СКУД; CCTV, пожарная сигнализация, общая LAN и общая UPS исключены.",
          verified_at: "2026-10-01T00:00:00+06:00",
          guide_validation_policy:
            "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        synthetic: false,
      },
    }),
  ));

export const ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT = Object.freeze({
  acs_controller_retained_spare_piece: 0,
  acs_controller_supplier_pack_size_piece: 1,
});
export const ACCESS_CONTROL_SYSTEM_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const ACCESS_CONTROL_SYSTEM_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [ACCESS_CONTROL_SYSTEM_SOURCE_ID]],
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

export const ACCESS_CONTROL_SYSTEM_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze([
    formula("acs_system_install_count_v1", "system", "acs_system_count"),
    formula("acs_controller_order_v1", "pcs", "ceil((acs_controller_count+acs_controller_retained_spare_piece)/acs_controller_supplier_pack_size_piece)*acs_controller_supplier_pack_size_piece"),
    formula("acs_reader_quantity_v1", "pcs", "acs_reader_count"),
    formula("acs_lock_quantity_v1", "pcs", "acs_lock_count"),
    formula("acs_exit_device_quantity_v1", "pcs", "acs_exit_device_count"),
    formula("acs_door_contact_quantity_v1", "pcs", "acs_door_contact_quantity_piece"),
    formula("acs_emergency_release_quantity_v1", "pcs", "acs_emergency_release_quantity_piece"),
    formula("acs_power_supply_quantity_v1", "pcs", "acs_power_supply_quantity_piece"),
    formula("acs_standby_battery_quantity_v1", "pcs", "acs_standby_battery_quantity_piece"),
    formula("acs_network_cable_length_v1", "m", "acs_network_cable_length_m"),
    formula("acs_reader_cable_length_v1", "m", "acs_reader_cable_length_m"),
    formula("acs_lock_cable_length_v1", "m", "acs_lock_cable_length_m"),
    formula("acs_mounting_box_quantity_v1", "pcs", "acs_mounting_box_quantity_piece"),
    formula("acs_termination_quantity_v1", "pcs", "acs_termination_quantity_piece"),
    formula("acs_label_quantity_v1", "pcs", "acs_label_quantity_piece"),
    formula("acs_fastening_quantity_v1", "set", "acs_fastening_quantity_set"),
    formula("acs_consumable_quantity_v1", "kg", "acs_consumable_quantity_kg"),
    formula("acs_grounding_conductor_length_v1", "m", "acs_grounding_conductor_length_m"),
    formula("acs_door_test_count_v1", "test", "acs_controlled_door_count"),
    formula("acs_door_register_count_v1", "door", "acs_controlled_door_count"),
    formula("acs_intercom_gateway_quantity_v1", "pcs", "intercom_gateway_quantity_piece"),
    formula("acs_fire_release_interface_quantity_v1", "pcs", "fire_release_interface_quantity_piece"),
    formula("acs_controller_installed_net_v1", "pcs", "acs_controller_count"),
    formula("acs_controller_retained_spare_v1", "pcs", "acs_controller_retained_spare_piece"),
    formula("acs_controller_total_need_v1", "pcs", "acs_controller_count+acs_controller_retained_spare_piece"),
    formula("acs_controller_package_count_v1", "package", "ceil((acs_controller_count+acs_controller_retained_spare_piece)/acs_controller_supplier_pack_size_piece)"),
    formula("acs_controller_remainder_v1", "pcs", "ceil((acs_controller_count+acs_controller_retained_spare_piece)/acs_controller_supplier_pack_size_piece)*acs_controller_supplier_pack_size_piece-acs_controller_count"),
    formula("acs_controller_surplus_v1", "pcs", "max(0,ceil((acs_controller_count+acs_controller_retained_spare_piece)/acs_controller_supplier_pack_size_piece)*acs_controller_supplier_pack_size_piece-acs_controller_count-acs_controller_retained_spare_piece)"),
    formula("acs_test_report_quantity_v1", "document", "acs_test_report_quantity_document"),
    formula("acs_device_install_labor_v1", "man_hour", "acs_device_install_labor_h"),
    formula("acs_cabling_termination_labor_v1", "man_hour", "acs_cabling_termination_labor_h"),
    formula("acs_configuration_commissioning_labor_v1", "man_hour", "acs_configuration_commissioning_labor_h"),
    formula("acs_lifting_equipment_v1", "machine_hour", "acs_lifting_equipment_machine_h"),
    formula("acs_cable_device_tester_v1", "machine_hour", "acs_cable_device_tester_machine_h"),
    formula("acs_delivery_v1", "trip", "acs_delivery_trip_count"),
    formula("acs_packaging_removal_v1", "trip", "acs_packaging_removal_trip_count"),
  ]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals", parameterId, value,
});

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; sourceRole: string; procurementEligible: boolean;
  inclusionAst?: Json; titleParameterIds?: string[];
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `access-control-system:${input.rowId}`,
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
      sourceId: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
      source_id: ACCESS_CONTROL_SYSTEM_SOURCE_ID,
      normId: ACCESS_CONTROL_SYSTEM_NORM_ID,
      norm_id: ACCESS_CONTROL_SYSTEM_NORM_ID,
      normVersion: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.source_document_version,
      source_title: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.source_title,
      exact_locator: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.exact_locator,
      source_definition_hash: ACCESS_CONTROL_SYSTEM_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "floor-area-derived door, device, power or cable quantity",
      "static 432-m route or generic electrical productivity",
      "automatic access logic, lock mode, power or integration selection",
      "automatic retained spare or supplier package",
      "CCTV, fire alarm equipment, general LAN or building UPS",
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

export const ACCESS_CONTROL_SYSTEM_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze([
    resource({ rowId: "rc09:acs_system_install_commission", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и пусконаладка системы контроля и управления доступом", unitId: "system", formulaId: "acs_system_install_count_v1", sourceRole: "USER_SUPPLIED_OR_APPROVED_ACCESS_CONTROL_SCOPE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs_controller", ordinal: 1, section: "Оборудование", category: "equipment", titleRu: "Контроллер СКУД", unitId: "pcs", formulaId: "acs_controller_order_v1", titleParameterIds: ["acs_controller_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_ACCESS_CONTROLLER", procurementEligible: true }),
    resource({ rowId: "rc09:acs_reader", ordinal: 2, section: "Оборудование", category: "equipment", titleRu: "Считыватель СКУД", unitId: "pcs", formulaId: "acs_reader_quantity_v1", titleParameterIds: ["acs_reader_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_ACCESS_READER", procurementEligible: true }),
    resource({ rowId: "rc09:acs_lock", ordinal: 3, section: "Оборудование", category: "equipment", titleRu: "Электрозамок СКУД", unitId: "pcs", formulaId: "acs_lock_quantity_v1", titleParameterIds: ["acs_lock_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_ACCESS_LOCK", procurementEligible: true }),
    resource({ rowId: "rc09:acs_exit_device", ordinal: 4, section: "Оборудование", category: "equipment", titleRu: "Кнопка выхода СКУД", unitId: "pcs", formulaId: "acs_exit_device_quantity_v1", titleParameterIds: ["acs_exit_device_designation"], sourceRole: "USER_SELECTED_AND_APPROVED_EXIT_DEVICE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_door_contact", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Датчик состояния двери СКУД", unitId: "pcs", formulaId: "acs_door_contact_quantity_v1", titleParameterIds: ["acs_door_contact_designation"], sourceRole: "APPROVED_CONTROLLED_DOOR_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_emergency_release", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Устройство аварийного разблокирования двери", unitId: "pcs", formulaId: "acs_emergency_release_quantity_v1", titleParameterIds: ["acs_emergency_release_designation"], sourceRole: "APPROVED_ACCESS_AND_LIFE_SAFETY_LOGIC", procurementEligible: true }),
    resource({ rowId: "rc09:acs_power_supply", ordinal: 7, section: "Оборудование", category: "equipment", titleRu: "Локальный блок питания СКУД", unitId: "pcs", formulaId: "acs_power_supply_quantity_v1", titleParameterIds: ["acs_power_supply_designation"], sourceRole: "APPROVED_ACCESS_POWER_CALCULATION", procurementEligible: true }),
    resource({ rowId: "rc09:acs_standby_battery", ordinal: 8, section: "Оборудование", category: "equipment", titleRu: "Аккумулятор локального питания СКУД", unitId: "pcs", formulaId: "acs_standby_battery_quantity_v1", titleParameterIds: ["acs_standby_battery_designation"], sourceRole: "APPROVED_ACCESS_POWER_CALCULATION", procurementEligible: true }),
    resource({ rowId: "rc09:acs_network_cable", ordinal: 9, section: "Материалы", category: "material", titleRu: "Сетевой кабель СКУД", unitId: "m", formulaId: "acs_network_cable_length_v1", titleParameterIds: ["acs_network_cable_designation"], sourceRole: "APPROVED_ACCESS_CABLE_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_reader_cable", ordinal: 10, section: "Материалы", category: "material", titleRu: "Кабель считывателей СКУД", unitId: "m", formulaId: "acs_reader_cable_length_v1", titleParameterIds: ["acs_reader_cable_designation"], sourceRole: "APPROVED_ACCESS_CABLE_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_lock_cable", ordinal: 11, section: "Материалы", category: "material", titleRu: "Кабель электрозамков и выходных устройств", unitId: "m", formulaId: "acs_lock_cable_length_v1", titleParameterIds: ["acs_lock_cable_designation"], sourceRole: "APPROVED_ACCESS_CABLE_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_mounting_box", ordinal: 12, section: "Комплектующие", category: "material", titleRu: "Монтажная коробка устройств СКУД", unitId: "pcs", formulaId: "acs_mounting_box_quantity_v1", titleParameterIds: ["acs_mounting_box_designation"], sourceRole: "APPROVED_ACCESS_INSTALLATION_DETAIL", procurementEligible: true }),
    resource({ rowId: "rc09:acs_termination", ordinal: 13, section: "Комплектующие", category: "material", titleRu: "Оконцевание кабелей СКУД", unitId: "pcs", formulaId: "acs_termination_quantity_v1", titleParameterIds: ["acs_termination_designation"], sourceRole: "APPROVED_ACCESS_CABLE_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_label", ordinal: 14, section: "Комплектующие", category: "material", titleRu: "Маркировка устройств и кабелей СКУД", unitId: "pcs", formulaId: "acs_label_quantity_v1", titleParameterIds: ["acs_label_designation"], sourceRole: "APPROVED_ACCESS_LABELING_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_fastening", ordinal: 15, section: "Крепёж", category: "material", titleRu: "Комплект крепления устройств и кабелей СКУД", unitId: "set", formulaId: "acs_fastening_quantity_v1", titleParameterIds: ["acs_fastening_designation"], sourceRole: "APPROVED_ACCESS_INSTALLATION_DETAIL", procurementEligible: true }),
    resource({ rowId: "rc09:acs_consumable", ordinal: 16, section: "Расходники", category: "material", titleRu: "Монтажные расходники СКУД", unitId: "kg", formulaId: "acs_consumable_quantity_v1", titleParameterIds: ["acs_consumable_designation"], sourceRole: "APPROVED_ACCESS_RESOURCE_SCHEDULE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_grounding_conductor", ordinal: 17, section: "Материалы", category: "material", titleRu: "Защитный проводник оборудования СКУД", unitId: "m", formulaId: "acs_grounding_conductor_length_v1", titleParameterIds: ["acs_grounding_conductor_designation"], sourceRole: "APPROVED_ACCESS_GROUNDING_DETAIL", procurementEligible: true }),
    resource({ rowId: "rc09:acs_door_functional_test", ordinal: 18, section: "Контроль", category: "service", titleRu: "Функциональная проверка контролируемой двери СКУД", unitId: "test", formulaId: "acs_door_test_count_v1", sourceRole: "USER_SUPPLIED_DOOR_COUNT_AND_APPROVED_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs_door_register", ordinal: 19, section: "Документы", category: "service", titleRu: "Запись двери в исполнительном реестре СКУД", unitId: "door", formulaId: "acs_door_register_count_v1", sourceRole: "USER_SUPPLIED_DOOR_COUNT_AND_APPROVED_ASBUILT_REGISTER", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs_intercom_gateway", ordinal: 20, section: "Условное оборудование", category: "equipment", titleRu: "Шлюз или модуль интеграции СКУД с домофонией", unitId: "pcs", formulaId: "acs_intercom_gateway_quantity_v1", inclusionAst: equals("intercom_integration_mode", "REQUIRED"), titleParameterIds: ["intercom_gateway_designation"], sourceRole: "APPROVED_INTERCOM_INTEGRATION_ARCHITECTURE", procurementEligible: true }),
    resource({ rowId: "rc09:acs_fire_release_interface", ordinal: 21, section: "Условное оборудование", category: "equipment", titleRu: "Интерфейс сигнала аварийного открытия дверей", unitId: "pcs", formulaId: "acs_fire_release_interface_quantity_v1", inclusionAst: equals("fire_release_integration_mode", "REQUIRED"), titleParameterIds: ["fire_release_interface_designation"], sourceRole: "APPROVED_FIRE_RELEASE_INTERFACE_ARCHITECTURE", procurementEligible: true }),
    resource({ rowId: "rc09:acs-controller-balance:installed-net", ordinal: 22, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Количество устанавливаемых контроллеров СКУД", unitId: "pcs", formulaId: "acs_controller_installed_net_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs-controller-balance:retained-spare", ordinal: 23, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Сохраняемый резерв контроллеров СКУД", unitId: "pcs", formulaId: "acs_controller_retained_spare_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs-controller-balance:total-need", ordinal: 24, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Общая потребность в контроллерах СКУД", unitId: "pcs", formulaId: "acs_controller_total_need_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs-controller-balance:package-count", ordinal: 25, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Количество поставочных упаковок контроллеров СКУД", unitId: "package", formulaId: "acs_controller_package_count_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs-controller-balance:remainder", ordinal: 26, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Остаток контроллеров СКУД после монтажа", unitId: "pcs", formulaId: "acs_controller_remainder_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs-controller-balance:surplus-beyond-spare", ordinal: 27, section: "Баланс контроллеров СКУД", category: "equipment", titleRu: "Свободный остаток контроллеров сверх резерва", unitId: "pcs", formulaId: "acs_controller_surplus_v1", sourceRole: "VISIBLE_PROCUREMENT_BALANCE", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:acs_test_report", ordinal: 28, section: "Контроль", category: "service", titleRu: "Протокол функциональной проверки и пусконаладки СКУД", unitId: "document", formulaId: "acs_test_report_quantity_v1", titleParameterIds: ["acs_test_report_designation"], sourceRole: "APPROVED_ACCESS_COMMISSIONING_PROGRAM", procurementEligible: false, costTreatment: "INFORMATIONAL_SCOPE" }),
    resource({ rowId: "rc09:labor:acs-device-install", ordinal: 29, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу дверных устройств и оборудования СКУД", unitId: "man_hour", formulaId: "acs_device_install_labor_v1", sourceRole: "APPROVED_ACCESS_INSTALLATION_METHOD", procurementEligible: false }),
    resource({ rowId: "rc09:labor:acs-cabling-termination", ordinal: 30, section: "Труд", category: "construction_work", titleRu: "Труд по прокладке и окончанию кабелей СКУД", unitId: "man_hour", formulaId: "acs_cabling_termination_labor_v1", sourceRole: "APPROVED_ACCESS_INSTALLATION_METHOD", procurementEligible: false }),
    resource({ rowId: "rc09:labor:acs-configuration-commissioning", ordinal: 31, section: "Труд", category: "construction_work", titleRu: "Труд по настройке логики и пусконаладке СКУД", unitId: "man_hour", formulaId: "acs_configuration_commissioning_labor_v1", sourceRole: "APPROVED_ACCESS_COMMISSIONING_METHOD", procurementEligible: false }),
    resource({ rowId: "rc09:equipment:acs-lifting", ordinal: 32, section: "Механизмы и инструмент", category: "equipment", titleRu: "Подъёмное средство для монтажа устройств СКУД", unitId: "machine_hour", formulaId: "acs_lifting_equipment_v1", sourceRole: "APPROVED_ACCESS_INSTALLATION_METHOD", procurementEligible: true }),
    resource({ rowId: "rc09:equipment:acs-cable-device-tester", ordinal: 33, section: "Механизмы и инструмент", category: "equipment", titleRu: "Кабельный и функциональный тестер СКУД", unitId: "machine_hour", formulaId: "acs_cable_device_tester_v1", sourceRole: "APPROVED_ACCESS_COMMISSIONING_METHOD", procurementEligible: true }),
    resource({ rowId: "rc09:logistics:acs-delivery", ordinal: 34, section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов СКУД", unitId: "trip", formulaId: "acs_delivery_v1", sourceRole: "APPROVED_ACCESS_LOGISTICS_PLAN", procurementEligible: true }),
    resource({ rowId: "rc09:logistics:acs-packaging-removal", ordinal: 35, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и монтажных отходов СКУД", unitId: "trip", formulaId: "acs_packaging_removal_v1", sourceRole: "APPROVED_ACCESS_WASTE_PLAN", procurementEligible: true }),
  ]);

export const ACCESS_CONTROL_SYSTEM_SHORT_INPUT = Object.freeze({
  acs_system_count: 1,
  acs_controlled_door_count: 8,
  acs_controller_count: 2,
  acs_controller_designation: "ACS-CTRL-4D",
  acs_reader_count: 16,
  acs_reader_designation: "READER-MF",
  acs_lock_count: 8,
  acs_lock_designation: "MAGLOCK-300",
  acs_exit_device_count: 8,
  acs_exit_device_designation: "EXIT-NO",
  ...ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
});

export const ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT = Object.freeze({
  ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  acs_door_contact_designation: "Магнитоконтактный датчик по ведомости дверей",
  acs_door_contact_quantity_piece: 8,
  acs_emergency_release_designation: "Кнопка аварийного разблокирования по логике безопасности",
  acs_emergency_release_quantity_piece: 8,
  acs_power_supply_designation: "Блок питания СКУД 12 В по расчёту",
  acs_power_supply_quantity_piece: 4,
  acs_standby_battery_designation: "АКБ 12 В 17 А·ч по расчёту автономии",
  acs_standby_battery_quantity_piece: 4,
  acs_network_cable_designation: "Кабель U/UTP Cat6 LSZH по кабельному журналу",
  acs_network_cable_length_m: 180,
  acs_reader_cable_designation: "Кабель считывателей 6×0,22 мм² по журналу",
  acs_reader_cable_length_m: 520,
  acs_lock_cable_designation: "Кабель замков и кнопок 4×0,75 мм² по журналу",
  acs_lock_cable_length_m: 360,
  acs_mounting_box_designation: "Монтажная коробка устройств СКУД по узлу",
  acs_mounting_box_quantity_piece: 32,
  acs_termination_designation: "Наконечники и клеммы кабелей СКУД",
  acs_termination_quantity_piece: 96,
  acs_label_designation: "Маркировка дверей, устройств и кабелей СКУД",
  acs_label_quantity_piece: 80,
  acs_fastening_designation: "Комплект крепления устройств и кабелей по узлам",
  acs_fastening_quantity_set: 120,
  acs_consumable_designation: "Стяжки, термоусадка и монтажная мелочёвка",
  acs_consumable_quantity_kg: 5,
  acs_grounding_conductor_designation: "Проводник PE 6 мм² по схеме",
  acs_grounding_conductor_length_m: 12,
  acs_test_report_designation: "Протокол функциональной проверки дверей и ПНР СКУД",
  acs_test_report_quantity_document: 1,
  acs_device_install_labor_h: 72,
  acs_cabling_termination_labor_h: 88,
  acs_configuration_commissioning_labor_h: 56,
  acs_lifting_equipment_machine_h: 12,
  acs_cable_device_tester_machine_h: 24,
  acs_delivery_trip_count: 2,
  acs_packaging_removal_trip_count: 1,
  intercom_integration_mode: "NOT_REQUIRED",
  fire_release_integration_mode: "NOT_REQUIRED",
});

export async function compileAccessControlSystemR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ACCESS_CONTROL_SYSTEM_CATALOG_ID;
  if (catalogId !== ACCESS_CONTROL_SYSTEM_CATALOG_ID) {
    throw new Error(`ACCESS_CONTROL_SYSTEM_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.access-control-system-r1",
    catalogId,
    primaryMeasureParameterId: "acs_system_count",
    parameterDefinitions: [...ACCESS_CONTROL_SYSTEM_PARAMETERS],
    formulaDefinitions: [...ACCESS_CONTROL_SYSTEM_FORMULAS],
    resourceDefinitions: [...ACCESS_CONTROL_SYSTEM_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}
