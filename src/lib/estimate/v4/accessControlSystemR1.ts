import acsDoorSourceR1 from '../../../../data/estimate-benchmarks/source-packs/access-control-single-door-method-r1.json';
import {unresolvedApplicationNormTruthR1} from './automaticConstructionOwnerR1';
import acsWholeOperations from '../../../../data/estimate-benchmarks/source-packs/access-control-six-whole-operation-references-r1.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec} from './automaticConstructionOwnerR1';
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

export function withAccessControlWholeOperationReferencesR1(input:Readonly<{
  catalogId:string;definition:AutomaticOwnerDefinition;objectScopeR5?:true;
}>):AutomaticOwnerDefinition{
  if(input.catalogId!==acsWholeOperations.catalogId)throw Error('ACS_WHOLE_OPERATIONS_EXISTING_CATALOG_REQUIRED');
  const base=input.definition;
  const declarations=[...acsWholeOperations.operations,acsWholeOperations.sharedOwnerOperation];
  const reference=(key:string)=>{
    const operation=declarations.find(candidate=>candidate.key===key);
    if(!operation)throw Error('ACS_WHOLE_OPERATIONS_DECLARATION_REQUIRED:'+key);
    return{operationId:operation.operationId,operationTitleRu:operation.titleRu,
      completionCriterionRu:operation.completionCriterionRu,processRole:operation.processRole,
      ...('whenResourcePresent' in operation?{whenResourcePresent:operation.whenResourcePresent}:{})};
  };
  for(const expected of acsWholeOperations.nativeResourceMap){
    const rows=base.resources.filter(row=>row.row_id===expected.rowId),row=rows[0];
    if(rows.length!==1||!row||row.row_sha256!==expected.expectedRowSha256||row.formula_id!==expected.formulaId
      ||row.unit_id!==expected.unitId||row.cost_owner_id!==expected.costOwnerId
      ||row.procurement_eligible!==expected.procurementEligible||row.resource_graph.costTreatment!==expected.costTreatment)
      throw Error('ACS_WHOLE_OPERATIONS_EXACT_NATIVE_OWNER_REQUIRED:'+expected.rowId);
  }
  const resources:CanonicalEstimateResourceDefinition[]=base.resources.map(row=>{
    const native=acsWholeOperations.nativeResourceMap.find(candidate=>candidate.rowId===row.row_id);
    const included=acsWholeOperations.optionalIncludedPartPrefixes.find(candidate=>row.row_id.startsWith(candidate.prefix));
    if(!native&&!included)return row;
    if(row.resource_graph.operationCompositionV1!=null)
      throw Error('ACS_WHOLE_OPERATIONS_EXISTING_DECLARATION_REQUIRES_REVIEW:'+row.row_id);
    if(included&&(row.cost_owner_id!==included.ownerRowId||row.resource_graph.costTreatment!=='INCLUDED_IN_RESOURCE_ROWS'
      ||row.procurement_eligible!==false))throw Error('ACS_WHOLE_OPERATIONS_INCLUDED_OWNER_CHANGED:'+row.row_id);
    const operationKey=native?.primaryOperationKey??included?.operationKey;
    if(!operationKey)throw Error('ACS_WHOLE_OPERATIONS_OWNER_REFERENCE_REQUIRED:'+row.row_id);
    const primary=reference(operationKey);
    const related=native?.relatedOperationKeys.map(key=>reference(key))??[];
    const{row_sha256:_old,...original}=row;
    const body={...original,resource_graph:{...row.resource_graph,operationCompositionV1:{
      contractVersion:'canonical-operation-resource/v1',groupId:acsWholeOperations.groupId,
      groupTitleRu:acsWholeOperations.groupTitleRu,...primary,...(related.length?{additionalOperations:related}:{})},
      sourceWholeOperationBoundaryV1:{contract:acsWholeOperations.contract,sourceEvidence:acsWholeOperations.sourceEvidence,
        relationshipsOnly:true,quantityAllocationAdded:false,toolCountsOrNormsInvented:false,
        sourceAdmission:false,projectApproval:false,wholeOperationAccepted:false,FULL:false}}};
    return{...body,row_sha256:estimateDeterministicHash(body)};
  });
  if(input.objectScopeR5!==true)return{...base,resources};
  const nativeContract=base.parameters[0]?.truth_metadata.contract;
  if(typeof nativeContract!=='string'||!nativeContract.trim()
    ||new Set(base.parameters.map(p=>p.truth_metadata.contract)).size!==1
    ||!base.parameters.every(p=>p.truth_metadata.semantic_parameter_key===`${input.catalogId}:${p.parameter_id}`))
    throw Error('ACS_WHOLE_SCOPE_NATIVE_PARAMETER_IDENTITY_REQUIRED');
  const c=acsWholeOperations.wholeOperationObjectScopeR5;
  const owner=resources.find(row=>row.row_id===c.rowId);
  if(!owner||owner.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'||owner.resource_graph.scopeRequirementV1!=null)
    throw Error('ACS_WHOLE_OBJECT_SCOPE_EXISTING_INFORMATIONAL_OWNER_REQUIRED');
  const ids=[...c.facts.map(f=>f.id),c.decisionId];
  if(base.parameters.some(p=>ids.includes(p.parameter_id)))throw Error('ACS_WHOLE_OBJECT_SCOPE_PARAMETER_COLLISION');
  const active={kind:'greater_than' as const,parameterId:'acs_system_count',value:0};
  for(const id of c.nativeContextParameterIds)if(!base.parameters.some(p=>p.parameter_id===id&&['decimal','integer'].includes(p.value_type)))
    throw Error('ACS_WHOLE_OBJECT_SCOPE_NATIVE_CONTEXT_REQUIRED:'+id);
  const specs:AutomaticParameterSpec[]=[...c.facts.map(f=>({id:f.id,title:f.titleRu,kind:'conditional' as const,valueType:'text' as const,
    unitId:null,resourceBranchConsumers:[c.rowId]})),
    {id:c.decisionId,title:'Какой документированный итог проверки методов и обеспечения СКУД?',kind:'conditional',valueType:'enum',unitId:null,
      values:[c.unknown,c.approved,c.incompatible],resourceBranchConsumers:[c.rowId]}];
  const questions=buildAutomaticConstructionOwnerR1({contract:c.contract,semanticOwner:acsWholeOperations.groupId,
    sourceId:ACCESS_CONTROL_SYSTEM_SOURCE_ID,normId:ACCESS_CONTROL_SYSTEM_NORM_ID,sourceMetadata:ACCESS_CONTROL_SYSTEM_SOURCE_METADATA,
    applicabilityRu:c.reasonRu,ordinary:[],profile:[],conditional:specs,rows:[],excludedUnownedAssumptions:[
      'Документальная запись не вычисляет физические количества, наличие, норму труда, калибровку, напряжение или автономию.'],deferMissingProjectFactsToRows:true});
  const parameters=[...base.parameters,...questions.parameters.map((p,index)=>({...p,ordinal:base.parameters.length+index,
    constraints_json:{...p.constraints_json,requiredWhen:p.parameter_id===c.decisionId?active:c.facts.find(f=>f.id===p.parameter_id)!.when},
    truth_metadata:{...p.truth_metadata,contract:nativeContract,semantic_parameter_key:`${input.catalogId}:${p.parameter_id}`,value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
      provenance:{consumer_input_role_v1:'OBJECT_FACT'},...(p.parameter_id===c.decisionId?{unknown_enum_values:[c.unknown]}:{})}}))];
  const nextResources=resources.map(row=>{
    if(row.row_id!==c.rowId)return row;
    const {row_sha256:_old,...body}=row;
    const next={...body,resource_graph:{...row.resource_graph,inputParameterIds:[...ids,...c.nativeContextParameterIds],
      operationCompositionV1:{...(row.resource_graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:[...new Set(c.facts.map(f=>f.operationKey))].map(reference)},
      scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:acsWholeOperations.groupId+':whole-object-r5',
        groupTitleRu:'Полнота фактического обеспечения СКУД',titleRu:'Методы и обеспечение выбранных подработ',reasonRu:c.reasonRu,
        exactScopeWhen:{kind:'and',operands:[active,{kind:'equals',parameterId:c.decisionId,value:c.approved}]},
        objectFactMode:'PROJECT_APPLICABILITY_ONLY',objectFactParameterId:c.decisionId,unknownObjectValues:[c.unknown],
        requiredFactParameterIds:[c.decisionId,...c.nativeContextParameterIds],coveringRowIds:[],
        originalRowIds:acsWholeOperations.nativeResourceMap.map(r=>r.rowId).filter(id=>id!==c.rowId),sourceEvidence:c.sourceEvidence,
        projectOperationContextsV1:c.facts.map(f=>({when:f.when,resourceRowIds:f.anchorRowIds,
          applicabilityWhen:{kind:'equals',parameterId:c.decisionId,value:c.approved},requiredFactParameterIds:[f.id]}))},
      sourceWholeObjectBoundaryR5:{sameExistingRow:true,declaredUnresolvedResourceGroups:13,newPaidOrProcurementOwners:false,
        numericNormAccepted:false,documentAuthenticityAttested:false,sourceAdmission:false,FULL:false}}};
    return{...next,row_sha256:estimateDeterministicHash(next)};
  });
  return{...base,parameters,resources:nextResources};
}

export const ACCESS_CONTROL_SINGLE_DOOR_SOURCE_R1=acsDoorSourceR1;
/** Source-domain precondition, before requesting an ordinary estimate. All
 * evidence arrives through the existing trusted project-binding owner, never
 * inferred from a consumer's generic device name or a manufacturer example.
 * A source-compatible input is still not source/physical/runtime admission. */
export function assessAccessControlSingleDoorMethodR1(boundActual:unknown){
 const source=acsDoorSourceR1,record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
 const actual=record(boundActual)?boundActual:{},records=record(actual.records)?actual.records:{};
 const missing=source.requiredObjectRecords.filter(r=>typeof records[r.id]!=='string'||!String(records[r.id]).trim()).map(r=>r.id);
 const issues:string[]=[];
 if(actual.methodId!==source.candidateMethodId)issues.push('ACTUAL_SUPPORTED_WHOLE_TECHNOLOGY_NOT_SELECTED');
 if(actual.bindingChannel!=='SERVER_REVIEWED_PROJECT_RECORDS')issues.push('TRUSTED_ACTUAL_BINDING_REQUIRED');
 if(actual.controllerModel!=='С2000-2'||actual.controllerVersion!=='2.75'||actual.readerModel!=='Proxy-3M'||actual.lockModel!=='AL-300 PRemium-12V')issues.push('EXACT_DEVICE_VERSION_COMPATIBILITY_REQUIRED');
 const counts=record(actual.counts)?actual.counts:{};
 if(Object.entries(source.conditionalTopology).filter(([key])=>key!=='notDoorQuantityNorm').some(([key,value])=>counts[key]!==value))issues.push('ACTUAL_ONE_DOOR_TWO_READER_INVENTORY_REQUIRED');
 if(!['WIEGAND26','WIEGAND44'].includes(String(actual.readerInterface))||actual.controllerInterface!==actual.readerInterface)issues.push('MATCHED_INTERFACE_AND_ACTUAL_CARD_CODES_REQUIRED');
 if(actual.cardStandard!=='MIFARE')issues.push('ACTUAL_CARD_READER_STANDARD_MISMATCH');
 if(actual.supplyTopology!=='COMMON_SOURCE_STAR_WITH_SEPARATE_LOCK_PAIR')issues.push('EXACT_POWER_BRANCH_TOPOLOGY_REQUIRED');
 if(actual.lockControl!=='AL300_COMMAND_CLOSE_COMMON_FIG3'||actual.relayProgram!=='ON_FOR_TIME')issues.push('LOCK_COMMAND_AND_RELAY_PROGRAM_MISMATCH');
 if(actual.doorDirection!=='OUTWARD_SWING')issues.push('OTHER_DOOR_MOUNTING_WHOLE_METHOD_REQUIRED');
 if(actual.readerMetalBase!==true&&actual.readerMetalBase!==false)issues.push('ACTUAL_READER_BASE_REQUIRED');
 const numeric=record(actual.electricalAndGeometry)?actual.electricalAndGeometry:{};
 const value=(id:string):number|null=>typeof numeric[id]==='number'&&Number.isFinite(numeric[id])?numeric[id] as number:null;
 const absent=source.compatibilityFields.filter(id=>value(id)===null);if(absent.length)issues.push('MISSING_MEASURED_COMPATIBILITY:'+absent.join(','));
 const lower=[['lockMinV',source.limits.lockMinV],['controllerMinV',source.limits.controllerMinV],['readerMinV',source.limits.readerMinV],
  ['readerSeparationM',source.limits.readerSeparationMinM],['readerLockSeparationM',source.limits.readerLockSeparationMinM],['doorThicknessMm',source.limits.doorThicknessMinMm]] as const;
 const upper=[['lockMaxV',source.limits.lockMaxV],['controllerMaxV',source.limits.controllerMaxV],['readerMaxV',source.limits.readerMaxV],
  ['readerGroundDifferenceV',source.limits.readerGroundDifferenceMaxV],['maxReaderDistanceM',source.limits.readerDistanceMaxM],['doorThicknessMm',source.limits.doorThicknessMaxMm],
  ['psuLoadA',source.limits.selectedPsuLoadMaxA],['relayCurrentA',source.limits.controllerRelayMaxA],['relayVoltageV',source.limits.controllerRelayMaxV],['relayPowerW',source.limits.controllerRelayMaxW]] as const;
 for(const[id,min]of lower){const measured=value(id);if(measured!==null&&measured<min)issues.push('BELOW_SOURCE_LIMIT:'+id);}
 for(const[id,max]of upper){const measured=value(id);if(measured!==null&&(measured<0||measured>max))issues.push('ABOVE_OR_INVALID_SOURCE_LIMIT:'+id);}
 for(const[minId,maxId]of [['lockMinV','lockMaxV'],['controllerMinV','controllerMaxV'],['readerMinV','readerMaxV']]as const){
  const min=value(minId),max=value(maxId);if(min!==null&&max!==null&&min>max)issues.push('REVERSED_MEASURED_INTERVAL:'+minId);
 }
 if(actual.readerMetalBase===true&&(typeof actual.spacerThicknessMm!=='number'||!Number.isFinite(actual.spacerThicknessMm)||actual.spacerThicknessMm<source.limits.metalSpacerMinMm))issues.push('METAL_BASE_NONMETALLIC_SPACER_REQUIRED');
 const blocked=missing.length>0||issues.length>0;
 return{contract:'acs-single-door-source-method-assessment/r1',status:blocked?'BLOCKED':'COMPATIBILITY_INPUTS_PRESENT',
  ownerRowId:source.existingOwnerRowId,missingActualRecordIds:missing,issues,visibleBlocked:blocked,
  estimateCompilationAllowed:false,sourceAdmission:false,documentAuthenticityAttested:false,quantityNormAccepted:false,
  physicalProvisionAccepted:false,executionOrCommissioningPass:false,fullTechnicalAcceptance:false,
  next:'Existing ROOT ordinary owner must validate full current source/physical/selector bindings before any estimate. This assessment alone never opens a compile/PDF route.'} as const;
}

export const ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2=acsDoorSourceR1.wholeDoorR2;

/** Explicit internal source candidate over the saved broad R737 owner. This is
 * not the broad catalog factory, a second compiler or an admission route. */
export function accessControlWholeDoorModelR2(profileId:string):AutomaticOwnerDefinition{
 const s=acsDoorSourceR1.wholeDoorR2;if(profileId!==s.profileId)throw Error('ACS_EXPLICIT_INTERNAL_WHOLE_DOOR_PROFILE_REQUIRED');
 const p=s.currentParentModel,active={kind:'greater_than' as const,parameterId:'acs_controlled_door_count',value:0},unknown=s.resources.filter(x=>x.quantityParameterId!==null);
 const nativeParameters=p.parameters as unknown as AutomaticOwnerDefinition['parameters'];
 const controls=[{id:s.decisionId,title:'Применимость полного метода контролируемого прохода',values:s.decisions},{id:s.retentionId,title:'Фактическое закрепление резьбы замка',values:s.retentionMethods},{id:s.markingId,title:'Фактический метод маркировки',values:s.markingMethods},{id:s.quantityForwardR3.mountMethodId,title:'Подтверждённый заводской настенный метод контроллера',values:s.quantityForwardR3.mountMethods}];
 const nativeSpecs:AutomaticParameterSpec[]=nativeParameters.map(x=>{if(!['decimal','integer','text','enum'].includes(x.value_type))throw Error('ACS_NATIVE_SPEC_TYPE_REVIEW_REQUIRED:'+x.parameter_id);const constraints=x.constraints_json??{};return{id:x.parameter_id,title:x.title_ru,kind:'internal' as const,valueType:x.value_type as AutomaticParameterSpec['valueType'],unitId:x.unit_id,...(Array.isArray(constraints.values)?{values:constraints.values as string[]}:{})};});
 const specs:AutomaticParameterSpec[]=[...nativeSpecs,
  ...unknown.map(x=>({id:x.quantityParameterId!,title:x.nameRu,kind:'ordinary' as const,valueType:['pcs','pair','trip'].includes(x.unitId)?'integer' as const:'decimal' as const,unitId:x.unitId,min:0})),
  ...s.organisationalInputs.map(x=>({id:x.id,title:x.titleRu,kind:'conditional' as const,valueType:'integer' as const,unitId:x.unitId,min:x.min,resourceBranchConsumers:[s.scopeRowId]})),
  ...s.actualRecords.map(x=>({id:x.id,title:x.titleRu,kind:'conditional' as const,valueType:'text' as const,unitId:null,resourceBranchConsumers:[s.scopeRowId]})),
  ...controls.map(x=>({id:x.id,title:x.title,kind:'conditional' as const,valueType:'enum' as const,unitId:null,values:x.values,resourceBranchConsumers:[s.scopeRowId]}))];
 const condition=(r:typeof s.resources[number])=>r.key==='controller-mount-fix'?{kind:'and' as const,operands:[active,{kind:'not' as const,operand:{kind:'in' as const,parameterId:s.quantityForwardR3.mountMethodId,values:s.quantityForwardR3.mountMethods}}]}:'conditionalDecision'in r?{kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:r.conditionalDecision!.parameterId,value:r.conditionalDecision!.value}]}:active;
 const built=buildAutomaticConstructionOwnerR1({contract:s.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'EXACT_WHOLE_CONTROLLED_DOOR_SOURCE_CANDIDATE_NOT_UNIVERSAL_DEVICE_OR_LABOUR_NORM',
  sourceMetadata:{source_title:s.titleRu,source_document_version:s.contract,definition_hash:s.projectDocumentSha256,artifact_sha256:s.projectDocumentSha256,exact_locator:'R737 actual61/36/36; existing source-methodR1; captured exact controller/reader/AL300/RIP/AB/AT-H805A/AT-H200GN primaries'},
  applicabilityRu:'Один фактически выбранный полный дверной проход с двумя считывателями и независимым аварийным освобождением. Схема объекта, питание, эвакуационные условия и текущая привязка источников требуют самостоятельного подтверждения.',
  ordinary:specs.filter(x=>x.kind!=='conditional'),profile:[],conditional:specs.filter(x=>x.kind==='conditional'),deferMissingProjectFactsToRows:true,
  rows:[...s.effectiveOwners.map(x=>({rowId:x.rowId,formulaId:x.formulaId,title:'Фактическое устройство дверного прохода',section:'Оборудование',category:'equipment' as const,unitId:x.unitId,expression:x.expression,procurement:true,costTreatment:'OWN_COST' as const,effectiveQuantityOutput:{parameterId:x.parameterId,unitId:x.unitId}})),
   ...s.resources.map(x=>({rowId:x.rowId,formulaId:x.formulaId,title:x.nameRu,section:'Ресурсы дверного прохода',category:x.resourceKind==='SERVICE'?'service' as const:x.resourceKind==='LABOR'?'construction_work' as const:'material' as const,unitId:x.unitId,expression:x.expression,inclusion:condition(x),procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:x.costOwnerRowId})),
   {rowId:s.scopeRowId,formulaId:s.scopeFormulaId,title:'Применимость и полный состав дверного прохода',section:'Контроль состава',category:'service',unitId:'door',expression:'acs_controlled_door_count',inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE'}],
  excludedUnownedAssumptions:['No fixture8doors/2controllers','No devicecount from door area or multiplier','No one-reader topology by excluding second reader','No EXIT as emergencyrelease','No 10V fullreserve as compatible10.8Vlock','No17Ah as autonomy','No B-M5torque for H-M5','No factory screw count from grouped kit','No complete pack per singleUDP','No extra externalcontact ifbuiltin','No labour/machinehour from30min/5s/2min','No perdoor tools/posts/PPE/logistics','No source-only or diagnosticPASS as actualwholePASS','No broadprimary replacement/READY']});
 const nativeIds=new Set(nativeParameters.map(x=>x.parameter_id)),unknownIds=new Set(unknown.map(x=>x.quantityParameterId)),orgIds=new Set(s.organisationalInputs.map(x=>x.id)),effectiveIds=new Set(s.effectiveOwners.map(x=>x.parameterId));
 const parameterForwards=new Map(s.nativeParameterForwards.map(x=>[x.parameterId,x.after]));
 const parameters=[...nativeParameters.map(x=>parameterForwards.has(x.parameter_id)?parameterForwards.get(x.parameter_id)! as unknown as typeof x:x),...built.parameters.filter(x=>!nativeIds.has(x.parameter_id)).map((x,i)=>{
  const base={...x,ordinal:nativeParameters.length+i,required:false,default_value:null};
  if(effectiveIds.has(x.parameter_id))return{...base,constraints_json:{...x.constraints_json,conditionalWholeIntegerV1:{contractVersion:'canonical-conditional-whole-integer/v1',when:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}}},truth_metadata:{...x.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
  if(unknownIds.has(x.parameter_id))return{...base,truth_metadata:{...unresolvedApplicationNormTruthR1(x.truth_metadata,'Точный расход, состав, запас или применимая норма этой позиции не подтверждены. Число дверей, паспортные интервалы, ёмкость и часы не являются количеством.'),visible_when:{kind:'literal',value:false},runtime_profile_value:false,hidden_default_forbidden:true}};
  return{...base,constraints_json:{...x.constraints_json,requiredWhen:active},truth_metadata:{...x.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',runtime_profile_value:false,hidden_default_forbidden:true,source_confirmation_required:orgIds.has(x.parameter_id),provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'},...(controls.some(c=>c.id===x.parameter_id)&&x.parameter_id!==s.quantityForwardR3.mountMethodId?{unknown_enum_values:['UNKNOWN']}:{})}};
 })];
 const ops=new Map(s.operationRoster.map(x=>[x.operationId,x])),nativeBinding=new Map(s.nativeBindings.map(x=>[x.rowId,x])),sourceRows=new Map(s.resources.map(x=>[x.rowId,x]));
 const op=(id:string)=>{const x=ops.get(id);if(!x)throw Error('ACS_WHOLE_OPERATION_MISSING:'+id);return x;};
 const hash=(r:CanonicalEstimateResourceDefinition)=>{const{row_sha256:_old,...v}=r;return{...v,row_sha256:estimateDeterministicHash(v)};};
 const saved=p.resources as unknown as readonly CanonicalEstimateResourceDefinition[],savedFormulas=p.formulas as unknown as readonly CanonicalEstimateFormulaDefinition[];
 const native=saved.map(r=>{
  const d=nativeBinding.get(r.row_id);if(!d)throw Error('ACS_ACTUAL_NATIVE_ROW_MISSING:'+r.row_id);const linked=d.operationIds.map(op),old=r.resource_graph.operationCompositionV1 as Record<string,unknown>|undefined;
  const prior=Array.isArray(old?.additionalOperations)?old!.additionalOperations as readonly Record<string,unknown>[]:[],seen=new Set([old?.operationId,...prior.map(x=>x.operationId)]);
  if(old&&linked.length&&old.groupId!==s.operationRoster[0]!.groupId)throw Error('ACS_NATIVE_OPERATION_GROUP_MISMATCH:'+r.row_id);
  const operation=old?{...old,additionalOperations:[...prior,...linked.filter(x=>!seen.has(x.operationId))]}:linked.length?{...linked[0]!,additionalOperations:linked.slice(1)}:undefined;
  const effective=s.effectiveOwners.find(x=>x.rowId===r.row_id),shadow=effective?built.resources.find(x=>x.row_id===r.row_id):undefined,isContact=r.row_id===s.builtInContactForward.rowId;
  return hash({...r,...(isContact?{cost_owner_id:s.builtInContactForward.afterPhysicalOwnerRowId,procurement_eligible:false}:{}),source_metadata:{...r.source_metadata,acsWholeProfileSourceR2:{profileId:s.profileId,sourceAdmission:false,explicitBuiltInContactCostForward:isContact}},resource_graph:{...r.resource_graph,
   ...(operation?{operationCompositionV1:operation}:{}),...(shadow?{effectiveQuantityOutputV1:shadow.resource_graph.effectiveQuantityOutputV1}:{}),
   ...(r.row_id==='rc09:acs_controller'?{purchaseBalanceV1:{unitId:'pcs',balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',consumedExpression:'acs_controller_count+acs_controller_retained_spare_piece',plannedConsumptionExpression:'acs_controller_count',stockExpression:'0',reserveExpression:'0',orderQuantumExpression:'acs_controller_supplier_pack_size_piece',manualQuantumViolationPolicy:'retain-raw-and-block-quantum'}}:{}),
   ...(isContact?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:s.builtInContactForward.afterPhysicalOwnerRowId,includedInResourceOwnerRowId:s.builtInContactForward.afterPhysicalOwnerRowId,purchaseBalanceOwnerRowId:s.builtInContactForward.afterPhysicalOwnerRowId,sourceOnlyBuiltInContactForwardR2:true}:{}),
   acsWholeSourceRelationshipR2:{sameSavedRow:true,nativeUnitFormulaAndPriceBindingPreserved:true,existingBroadR5ScopeRetained:true,physicalCompositionAccepted:false}}});
 });
 const extras=built.resources.filter(x=>!s.effectiveOwners.some(y=>y.rowId===x.row_id)).map((r,i)=>{
  const d=sourceRows.get(r.row_id),linked=d?d.operationIds.map(op):[...s.operationRoster],first=linked[0]!;
  let next=hash({...r,ordinal:native.length+i,procurement_eligible:false,source_metadata:{...r.source_metadata,sourceAdmission:false},resource_graph:{...r.resource_graph,operationCompositionV1:{...first,additionalOperations:linked.slice(1)},physicalPriceCoverageAccepted:false,actualExecutedWholePass:false,
   ...(d?{costTreatment:'INCLUDED_IN_RESOURCE_ROWS',parentCostOwnerId:d.costOwnerRowId,includedInResourceOwnerRowId:d.costOwnerRowId,purchaseBalanceOwnerRowId:d.costOwnerRowId,acsWholeSourceQuantityR2:{authority:d.authority,quantityUnknown:d.quantityUnknown,inventoryNotConsumption:d.inventoryNotConsumption,sourceRuleNotPhysicalClosure:true,...('installedConsumptionExpression'in d?{installedConsumptionExpression:d.installedConsumptionExpression,installedConsumptionNotAdditionalPhysicalResource:true}:{})},...(!d.quantityUnknown?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:d.unitId,parameterIds:compileFormulaGraph(d.expression).inputParameterIds,reasonRu:'Источник количества — фактический измеритель или поставка существующего владельца. Явная ручная правка сохраняется без второй оплаты и без признания состава.'}}:{})}:{})}});
  if(r.row_id===s.scopeRowId)next=hash({...next,resource_graph:{...next.resource_graph,inputParameterIds:[...s.actualRecords.map(x=>x.id),...s.organisationalInputs.map(x=>x.id),...controls.map(x=>x.id)],scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:s.operationRoster[0]!.groupId,groupTitleRu:'Полный метод контролируемого прохода',titleRu:'Совместимость и полное обеспечение выбранной двери',reasonRu:'Только целая подтверждённая схема двери, аварийного освобождения, питания, ресурсов и контроля; исключение строки оплаты или известное ручное количество не заменяют обязательный факт.',
   exactScopeWhen:{kind:'and',operands:[active,{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}]},objectFactParameterId:s.decisionId,unknownObjectValues:['UNKNOWN'],requiredFactParameterIds:[...s.actualRecords.map(x=>x.id),...s.organisationalInputs.map(x=>x.id),...controls.map(x=>x.id)],coveringRowIds:[],originalRowIds:[...s.nativeBindings.filter(x=>!x.rowId.includes('acs-controller-balance:')).map(x=>x.rowId),...s.resources.map(x=>x.rowId)],sourceEvidence:[{sha256:s.projectDocumentSha256,locator:'Source-only whole door method R2 over actual R737; allobject/source/supply/runtime admission remains required'}]}}});
  return next;
 });
 const formulaForwards=new Map(s.nativeFormulaForwards.map(x=>[x.formulaId,x]));
 const profileFormulas=savedFormulas.map(x=>{const f=formulaForwards.get(x.formula_id);if(!f)return x;const c=compileFormulaGraph(f.afterExpression);return{...x,expression_source:f.afterExpression,ast:c.ast,input_parameter_ids:c.inputParameterIds,ast_sha256:estimateDeterministicHash(c.ast)};});
 const resources=[...native,...extras],formulas=[...profileFormulas,...built.formulas.filter(x=>!s.effectiveOwners.some(y=>y.formulaId===x.formula_id))];
 if(new Set(parameters.map(x=>x.parameter_id)).size!==parameters.length||new Set(formulas.map(x=>x.formula_id)).size!==formulas.length||new Set(resources.map(x=>x.row_id)).size!==resources.length)throw Error('ACS_WHOLE_SOURCE_ID_COLLISION');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['acs_system_count','acs_controlled_door_count','acs_controller_count','acs_reader_count','acs_lock_count','acs_exit_device_count']};
}

/** Document-input preconditions only. It does not approve an egress design,
 * authenticate a record, calculate an estimate or attest an executed test. */
export function assessAccessControlWholeDoorInputsR2(value:unknown){
 const rec=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),s=acsDoorSourceR1.wholeDoorR2,a=rec(value)?value:{},docs=rec(a.records)?a.records:{},issues:string[]=[];
 const missing=s.actualRecords.filter(x=>typeof docs[x.id]!=='string'||!String(docs[x.id]).trim()).map(x=>x.id);
 if(a.profileId!==s.profileId||a.bindingChannel!=='SERVER_REVIEWED_PROJECT_RECORDS'||a.allControllerFactoryPartsFromSelectedNewOrder!==true)issues.push('EXPLICIT_REVIEWED_INTERNAL_DOOR_PROFILE_REQUIRED');
 if(a.scope!=='WHOLE_CONTROLLED_PASSAGE'||a.topology!=='ONE_DOOR_TWO_READER_ENTRY_EXIT')issues.push('WHOLE_PASSAGE_REQUIRED_NOT_DEVICE_BENCH_OR_BROAD_EIGHT_DOORS');
 const exact={doorCount:1,controllerInstalledCount:1,readerCount:2,lockCount:1,psuCount:1,batteryCount:1,exitCount:1,emergencyCount:1};
 if(Object.entries(exact).some(([k,v])=>a[k]!==v))issues.push('EXACT_ACTUAL_TOPOLOGY_INVENTORY_REQUIRED_NOT_DOOR_MULTIPLIER');
 if(a.controller!=='C2000_2_FW2_75'||a.reader!=='PROXY3M'||a.lock!=='AL300_PREMIUM_12V'||a.psu!=='RIP12_ISP101'||a.battery!=='AB1217K_12V_17AH_H_M5'||a.exit!=='AT_H805A_NON_LED'||a.emergency!=='AT_H200_GN')issues.push('EXACT_COMPATIBLE_WHOLE_DEVICE_EXECUTIONS_REQUIRED');
 if(a.doorDirection!=='OUTWARD_SWING'||typeof a.doorThicknessMm!=='number'||!Number.isFinite(a.doorThicknessMm)||a.doorThicknessMm<35||a.doorThicknessMm>47)issues.push('OTHER_COMPLETE_DOOR_MOUNTING_METHOD_REQUIRED');
 for(const [k,min,max]of[['lockMinimumTerminalV',10.8,14.4],['lockMaximumTerminalV',10.8,14.4],['controllerMinimumTerminalV',10.2,15],['controllerMaximumTerminalV',10.2,15],['readerMinimumTerminalV',8,15],['readerMaximumTerminalV',8,15]]as const){const n=a[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)issues.push('ACTUAL_TERMINAL_VOLTAGE_OUTSIDE_EXECUTION:'+k);}
 for(const [lo,hi]of[['lockMinimumTerminalV','lockMaximumTerminalV'],['controllerMinimumTerminalV','controllerMaximumTerminalV'],['readerMinimumTerminalV','readerMaximumTerminalV']]as const)if(typeof a[lo]==='number'&&typeof a[hi]==='number'&&(a[lo]as number)>(a[hi]as number))issues.push('MALFORMED_TERMINAL_VOLTAGE_ENVELOPE');
 for(const [k,min,max]of[['readerGroundDifferenceV',0,0.5],['readerDistanceM',0,100],['readerSeparationM',0.5,Number.MAX_VALUE],['readerLockSeparationM',1,Number.MAX_VALUE],['psuMaxLoadA',0,5],['emergencySwitchedA',0,2],['emergencySwitchedV',0,30]]as const){const n=a[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)issues.push('ACTUAL_COMPATIBILITY_LIMIT:'+k);}
 if(a.batteryTerminal!=='H_M5_PLATE_BOLT_AND_NUT'||typeof a.batteryTorqueNm!=='number'||!Number.isFinite(a.batteryTorqueNm)||a.batteryTorqueNm<2.375||a.batteryTorqueNm>2.625)issues.push('EXACT_H_M5_TERMINAL_AND_2_5NM_TORQUE_REQUIRED_NOT_INTERNAL_B_M5');
 if(a.lockRelayProgram!=='ON_FOR_TIME_APPROVED_COMMAND_CLOSE'||a.independentEmergencyPowerInterruption!==true||a.controllerExitUsedAsEmergencyRelease===true)issues.push('INDEPENDENT_APPROVED_EMERGENCY_POWER_RELEASE_REQUIRED');
 if(a.builtinReedUsed!==true||a.externalContactExtraOrdered===true||a.hallConflatedWithDoorReed===true)issues.push('BUILTIN_REED_AND_HALL_DISTINCT_SINGLE_SUPPLY_OWNER_REQUIRED');
 if(a.actualReaderExternalPowerAndGndReviewed!==true||a.readerPoweredFromControllerTerminals!==false)issues.push('EXTERNAL_READER_POWER_AND_COMMON_GND_REQUIRED_180MA_GT_100MA');
 if(a.readerFormat!==a.controllerReaderFormat||a.readerFormat!=='WIEGAND26')issues.push('EXACT_SAME_SUPPORTED_CREDENTIAL_FORMAT_REQUIRED');
 for(const k of ['actualElectricalPosts','actualDrillingPosts','actualTestPosts','actualBatteryPosts','actualConfigurationPosts'])if(typeof a[k]!=='number'||!Number.isSafeInteger(a[k])||(a[k]as number)<1)issues.push('ACTUAL_EQUIPPED_POST_INVENTORY_REQUIRED:'+k);
 if(typeof a.actualMetalReaderCount!=='number'||!Number.isSafeInteger(a.actualMetalReaderCount)||a.actualMetalReaderCount<0||a.actualMetalReaderCount>2)issues.push('ACTUAL_METAL_READER_COUNT_REQUIRED');
 if(a.routeVariant!=='ACTUAL_READY_ROUTE_SEPARATE_LOCK_PAIR_NO_NEW_FIRE_BARRIER')issues.push('OTHER_ROUTE_REQUIRES_COMPLETE_METHOD');
 for(const k of ['actualDoorAndEgressReviewed','actualEmergencyContactMapAndIndependentMonitorReviewed','actualFireReleaseDecisionReviewed','actualTerminalEnvelopeAndCutoffReviewed','actualFullLoadAutonomyAndTransferReviewed','actualBatteryFitHardwareAndProtectionReviewed','actualNoSharedControllerLockSupplyPair','actualMeasuredRouteCableSectionAndEndsReviewed','actualReaderMetalSpacersAndDistancesReviewed','actualProtectionAndSuppressionReviewed','actualNativeAggregatesExcludeFactoryPartsReviewed','actualEquippedPostsAndStockReviewed','actualSafetyIsolationPpeAndAccessReviewed','actualSourceRevisionAndSoftwareResolved','actualCredentialProgrammeReviewed','actualFullDoorPowerFaultProgrammeReviewed','actualResultsBackupRestoreHandoverReviewed','actualCleanupAndWasteReviewed'])if(a[k]!==true)issues.push('ACTUAL_CONDITION_REQUIRED:'+k);
 const bindings=rec(a.sourceBindings)?a.sourceBindings:{};
 for(const name of ['bolid-s2000-2-v275-ret-aug25.pdf','accordtec-at-h200-gn-passport.pdf','accordtec-at-h805a-linked-passport.pdf']){const p=s.primarySources.find(x=>'path'in x&&x.path.replace(/\\/g,'/').endsWith('/'+name));if(!p||!('sha256'in p)||bindings[name]!==p.sha256)issues.push('EXACT_PRIMARY_BINDING_REQUIRED:'+name);}
 if(a.deviceBenchPassUsedAsWholePass===true||a.plannedDoorCounterUsedAsExecutedPass===true||a.manualKnownQuantityUsedAsSafetyFact===true||a.reserveTwoMinutesUsedAsAutonomy===true)issues.push('FALSE_WHOLE_PASS_OR_SAFETY_PROMOTION_FORBIDDEN');
 return{status:missing.length||issues.length?'BLOCKED':'DOCUMENT_INPUTS_PRESENT',missingActualRecordIds:missing,issues,sourceAdmission:false,projectApproval:false,egressDesignApproved:false,documentAuthenticityAttested:false,estimateCompilationAllowed:false,physicalCompositionAccepted:false,executedWholeDoorPass:false,deviceBenchPassIsWholeDoorPass:false,nativeDoorTestCountIsExecution:false,factorySupplyGuardPassed:false,fullBroadAcsAccepted:false,FULL:false}as const;
}


export const ACCESS_CONTROL_WHOLE_QUANTITY_SOURCE_R3=acsDoorSourceR1.wholeDoorR2.quantityForwardR3;
/** Source-owned projection for the existing ordinary publisher. The same
 * compiler, row IDs, quantities and paid owners are retained. */
export function accessControlWholeDoorOrdinaryModelR3(profileId:string):AutomaticOwnerDefinition{
 const s=acsDoorSourceR1.wholeDoorR2,q=s.quantityForwardR3,base=accessControlWholeDoorModelR2(profileId);
 const declared=new Map(q.resourceDeclarations.map(r=>[r.rowId,r])),ops=new Map(s.operationRoster.map(o=>[o.operationId,o]));
 const resources=base.resources.map(r=>{
  const d=declared.get(r.row_id),scope=r.row_id===s.scopeRowId;
  if(!d&&!scope)throw Error('ACS_R3_EXACT_SOURCE_DECLARATION_REQUIRED:'+r.row_id);
  if(d&&(d.formulaId!==r.formula_id||d.unitId!==r.unit_id))throw Error('ACS_R3_SOURCE_FORMULA_UNIT_MISMATCH:'+r.row_id);
  const linked=(d?.operationIds??s.operationRoster.map(o=>o.operationId)).map(id=>{const op=ops.get(id);if(!op)throw Error('ACS_R3_SOURCE_OPERATION_MISSING:'+id);return op;});
  const{row_sha256:_old,...body}=r;
  const graph={...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,
   nameRu:d?.publicNameRu??'Совместимость и состав контролируемого прохода',brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:d?.resourceKind??'SERVICE',
   ...((d?.rowKind??'PROCESS_NOTE')==='RESOURCE'?{}:{rowKind:d?.rowKind??'PROCESS_NOTE'})},
   ...(linked.length?{operationCompositionV1:{...linked[0]!,...(linked.length>1?{additionalOperations:linked.slice(1)}:{})}}:{}),
   acsQuantitySourceProjectionR3:{contract:q.contract,sourceAdmission:false,physicalClosure:false,sourceClassReviewAccepted:false}};
  const next={...body,resource_graph:graph};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 const parameters=base.parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,contract:q.contract,semantic_parameter_key:s.catalogId+':'+p.parameter_id}}));
 return{...base,parameters,resources};
}

export const ACS_PASSAGE_MEASUREMENT_SOURCE_R5=acsDoorSourceR1.wholeDoorR2.passageForwardR5;
/** Same registered ACS owner and same full passage. These measured balances
 * are source-owned arithmetic over reviewed records, never per-door norms. */
export function accessControlWholePassageMeasuredModelR5(profileId:string):AutomaticOwnerDefinition{
 const s=acsDoorSourceR1.wholeDoorR2,q=s.passageForwardR5,base=accessControlWholeDoorOrdinaryModelR3(profileId),active={kind:'greater_than' as const,parameterId:'acs_controlled_door_count',value:0};
 const addition=buildAutomaticConstructionOwnerR1({contract:q.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'EXACT_ACTUAL_PASSAGE_MATERIAL_BALANCE_NOT_APPLICATION_NORM',sourceMetadata:{source_title:q.titleRu,source_document_version:q.contract,definition_hash:q.projectMethod.sha256,artifact_sha256:q.projectMethod.sha256,exact_locator:'R867 actualwholeparent; AL300PR20260521§2.2/4.5/5.6; actualsamebatchmaterialissue/return andmeasuredcableschedule'},applicabilityRu:'Тот же выбранный полный дверной проход. Измеренные массы одного совместимого материала в кг и фактические длины одного кабельного потребителя в м задаются раздельно. Программа аварийного освобождения учитывает остаточное усилие при снятии питания.',ordinary:[{id:'acs_controlled_door_count',title:'Подтверждённые контролируемые двери',kind:'internal',valueType:'integer',unitId:'door',min:1}],profile:[],conditional:[...q.measurements.map(m=>({id:m.id,title:m.titleRu,kind:'conditional' as const,valueType:'decimal' as const,unitId:m.unitId,min:0})),{id:q.quantityRecordId,title:'Проверенный кабельный журнал и материальный баланс партии',kind:'conditional',valueType:'text',unitId:null,resourceBranchConsumers:[s.scopeRowId]},{id:q.emergencyDecisionId,title:'Допуск независимого освобождения и остаточного усилия',kind:'conditional',valueType:'enum',unitId:null,values:['INDEPENDENT_RELEASE_AND_RESIDUAL_REVIEWED','POWER_CUT_WITHOUT_FORCE_REVIEW','UNKNOWN'],resourceBranchConsumers:[s.scopeRowId]}],deferMissingProjectFactsToRows:true,rows:q.quantityRules.map(x=>({rowId:x.rowId,formulaId:x.formulaId,title:x.nameRu,section:'Измеренное обеспечение дверного прохода',category:x.category,unitId:x.unitId,expression:x.expression,inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:x.costOwnerRowId})),excludedUnownedAssumptions:['No applicationnorm fromissued/returnedmasswithoutactualrecord','No density/kg/litre conversion ordefaultzero','No returnmass>issuedmassclampedtozero','No fourwire/0.4mlocktail asroutecablelength','No extra payment or newprocurement for existing same-owner child','No powercut aszeroresidualforce orwholeegressapproval','No regulatedSKATsource asautomaticreplacement/PSUcount/autonomy']});
 const ids=new Set(base.parameters.map(p=>p.parameter_id)),numeric=new Set(q.measurements.map(m=>m.id)),facts=[q.quantityRecordId,q.emergencyDecisionId],parameters=[...base.parameters,...addition.parameters.filter(p=>!ids.has(p.parameter_id)).map(p=>({...p,required:false,default_value:null,constraints_json:{...p.constraints_json,...(numeric.has(p.parameter_id)?{}:{requiredWhen:active})},truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',runtime_profile_value:false,hidden_default_forbidden:true,source_confirmation_required:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'},...(p.parameter_id===q.emergencyDecisionId?{unknown_enum_values:['UNKNOWN','POWER_CUT_WITHOUT_FORCE_REVIEW']}:{})}}))].map((p,i)=>({...p,ordinal:i})),rebind=new Map(q.quantityRules.map(x=>[x.rowId,x])),reboundFormulaIds=new Set(q.quantityRules.map(x=>x.formulaId));
 const formulas=[...base.formulas.filter(f=>!reboundFormulaIds.has(f.formula_id)),...addition.formulas],sourceRows=new Map(s.resources.map(x=>[x.rowId,x])),declarations=new Map(q.resourceDeclarations.map(x=>[x.rowId,x])),programme=new Map(q.wholeOperationProgrammeR5.operationProgramme.map(x=>[x.operationId,x])),toolSpecs=new Map(q.physicalToolSpecificationsR5.map(x=>[x.rowId,x]));
 const resources=base.resources.map(r=>{
  const rule=rebind.get(r.row_id),physical=sourceRows.get(r.row_id),toolSpec=toolSpecs.get(r.row_id),originalScope=r.resource_graph.scopeRequirementV1 as Record<string,unknown>|undefined,graph:Record<string,unknown>={...r.resource_graph};
  const stageIds=r.row_id===s.scopeRowId?s.operationRoster.map(x=>x.operationId):(declarations.get(r.row_id)?.operationIds??[]),stages=stageIds.map(id=>{const op=s.operationRoster.find(x=>x.operationId===id),proof=programme.get(id);if(!op||!proof)throw Error('ACS_PASSAGE_R5_OPERATION_PROGRAMME_REQUIRED:'+id);return{...op,completionCriterionRu:proof.completionCriterionRu};});
  if(stages.length){graph.operationCompositionV1={...stages[0]!,...(stages.length>1?{additionalOperations:stages.slice(1)}:{})};graph.sourceWholePassageProgrammeR5={contract:q.wholeOperationProgrammeR5.contract,projectMethodSha256:q.projectMethod.sha256,stageIds,sourceProgrammeApproved:false,actualWorkExecuted:false,benchTestIsWholeDoorAcceptance:false};}
  if(rule){const prior=base.formulas.find(f=>f.formula_id===r.formula_id)!;graph.sourceMeasuredQuantityR5={contract:q.contract,sourceMethodSha256:q.projectMethod.sha256,originalParameterId:rule.originalQuantityParameterId,originalFormula:prior,originalSourceMetadata:r.source_metadata,legacySourceMetadataSha256:estimateDeterministicHash(r.source_metadata),quantityRule:rule.expression,validation:'NON_NEGATIVE_ARITHMETIC_OUTPUT_NOT_COMPATIBILITY_PEER',actualLedgerAccepted:false,formulaNotNorm:true,ownerPriceCoverageAccepted:false};graph.formulaOutputBoundsV1={schemaVersion:'canonical_formula_output_bounds_v1',unitId:r.unit_id,minimum:0,reasonRu:r.unit_id==='kg'?'Возврат того же материала не может превышать выданную массу. Проверьте фактический журнал партии.':'Проверьте неотрицательные фактические длины трассы, сервисных петель и окончаний.'};graph.derivedQuantityEditPolicyV1={contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:compileFormulaGraph(rule.expression).inputParameterIds,reasonRu:'Количество следует принятому измеренному журналу или балансу; ручная правка сохраняется без превращения её в норму или второй платёж.'};}
  if(toolSpec){const priorPresentation=r.resource_graph.publicResourcePresentationV1 as Record<string,unknown>|undefined;graph.publicResourcePresentationV1={...priorPresentation,sourceTitleRu:toolSpec.publicNameRu,nameRu:toolSpec.publicNameRu};graph.exactPhysicalToolSpecificationR5={contract:q.contract,sourceEvidence:toolSpec.sourceEvidence,previousTitleRu:r.title_ru,previousPresentation:priorPresentation,sourceMetadataPreserved:true,actualStockAndCompleteExecutionAccepted:false,newQuantityOrPayment:false};}
  if(r.row_id===s.scopeRowId){if(!originalScope)throw Error('ACS_PASSAGE_EXISTING_SCOPE_REQUIRED');const priorFacts=originalScope.requiredFactParameterIds as string[],allFacts=[...new Set([...priorFacts,...facts])];graph.inputParameterIds=[...new Set([...(r.resource_graph.inputParameterIds as string[]??[]),...facts])];graph.scopeRequirementV1={...originalScope,reasonRu:'Принятая полная схема прохода, совместимое питание и независимое аварийное освобождение обязательны. AL300 имеет различное остаточное усилие при штатной команде и снятии питания; известные количества или ручная оплата не подтверждают этот режим.',requiredFactParameterIds:allFacts,projectOperationContextsV1:[{when:active,resourceRowIds:s.quantityForwardR3.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId),applicabilityWhen:active,requiredFactParameterIds:allFacts,unknownFactValues:{[s.decisionId]:['UNKNOWN'],[s.retentionId]:['UNKNOWN'],[s.markingId]:['UNKNOWN'],[s.quantityForwardR3.mountMethodId]:['UNKNOWN'],[q.emergencyDecisionId]:['UNKNOWN','POWER_CUT_WITHOUT_FORCE_REVIEW']}}]};}
  const{row_sha256:_old,...body}=r,next={...body,...(physical?{cost_owner_id:physical.costOwnerRowId}:{}),...(toolSpec?{title_ru:toolSpec.publicNameRu}:{}),resource_graph:graph};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('ACS_PASSAGE_R5_ID_COLLISION');
 return{...base,parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{}};
}
