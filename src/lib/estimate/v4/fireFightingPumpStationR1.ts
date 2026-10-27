import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
type InputValue = string | number | boolean;
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "CONTROL_OR_DOCUMENT";

export const FIRE_FIGHTING_PUMP_STATION_CATALOG_ID =
  "canonical-work:expanded:fire_fighting_pump_station";
export const FIRE_FIGHTING_PUMP_STATION_SOURCE_ID =
  "official_sp_kr_21_101_2024_fire_pump_station_v1";
export const FIRE_FIGHTING_PUMP_STATION_NORM_ID =
  "norm:kg:sp_kr_21_101_2024:fire_pump_station_project_inputs:v1";
export const FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256 =
  "0eab462536d90bf329f9b1c6605b0a8527e941b18f6e563776ff3eddc44ff33c";

export const FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA = Object.freeze({
  source_title:
    "СП КР 21-101:2024 «Пожарная автоматика зданий и сооружений»",
  source_authority:
    "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики (Госстрой)",
  source_document_version: "SP_KR_21_101_2024_EFFECTIVE_2024_07_05",
  definition_hash: FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256,
  exact_locator:
    "СП КР 21-101:2024: §§5.69–5.76 — категория надёжности насосной, отдельное помещение, наружные соединения для передвижной пожарной техники, не менее двух пожарных насосов включая резервный, проектные задвижки и контроль уровня огнетушащего вещества",
  use_restriction:
    "Источник задаёт обязательную техническую границу насосной и минимальное количество пожарных насосов, но не устанавливает универсальные длины трубопроводов, количество арматуры, трудозатраты или время машин. Все количества, типы и марки принимаются из утверждённого гидравлического расчёта, рабочей документации, спецификации, паспортов, ППР и программы испытаний.",
  source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
  official_url: "https://minstroy.gov.kg/ru/kyzmat/217/show",
  artifact_sha256: FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256,
  effective_from: "2024-07-05",
});

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer" | "text" | "enum",
  unitId: string | null,
  minimum?: number,
  enumValues?: readonly string[],
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["station_count", "Количество пожарных насосных станций", "integer", "pcs", 1],
  ["fire_pump_designation", "Рабочий и резервный пожарные насосы по спецификации", "text", null],
  ["fire_pump_count", "Количество пожарных насосов, включая резервный", "integer", "pcs", 2],
  ["jockey_pump_designation", "Поддерживающий насос по спецификации", "text", null],
  ["jockey_pump_count", "Количество поддерживающих насосов", "integer", "pcs", 1],
  ["pump_controller_designation", "Шкаф управления насосом по спецификации", "text", null],
  ["pump_controller_count", "Количество шкафов управления насосами", "integer", "pcs", 1],
  ["suction_manifold_designation", "Всасывающий коллектор и трубопровод по проекту", "text", null],
  ["suction_manifold_length_m", "Длина всасывающего коллектора и трубопровода", "decimal", "m", 0.000_001],
  ["discharge_manifold_designation", "Напорный коллектор и трубопровод по проекту", "text", null],
  ["discharge_manifold_length_m", "Длина напорного коллектора и трубопровода", "decimal", "m", 0.000_001],
  ["station_valve_designation", "Запорная и обратная арматура по спецификации", "text", null],
  ["station_valve_count", "Количество единиц запорной и обратной арматуры", "integer", "pcs", 1],
  ["pressure_instrument_designation", "Контрольно-измерительные приборы давления по спецификации", "text", null],
  ["pressure_instrument_count", "Количество контрольно-измерительных приборов давления", "integer", "pcs", 1],
  ["test_header_flow_meter_designation", "Испытательный коллектор или расходомерное устройство", "text", null],
  ["test_header_flow_meter_count", "Количество испытательных и расходомерных устройств", "integer", "pcs", 1],
  ["fire_brigade_connection_designation", "Наружное соединение для пожарной техники", "text", null],
  ["fire_brigade_connection_count", "Количество наружных соединительных головок", "integer", "pcs", 2],
  ["vibration_isolation_designation", "Виброизоляторы насосных агрегатов по проекту", "text", null],
  ["vibration_isolation_set_count", "Количество комплектов виброизоляции", "integer", "set", 1],
  ["anchor_system_designation", "Анкерная система насосных агрегатов по проекту", "text", null],
  ["anchor_system_set_count", "Количество комплектов анкеровки", "integer", "set", 1],
  ["diesel_interface_mode", "Дизельный привод и его топливные, охлаждающие и выхлопные интерфейсы входят в объём", "enum", null, undefined, ["NOT_REQUIRED", "REQUIRED"]],
  ["diesel_interface_designation", "Комплект интерфейсов дизельного привода по проекту", "text", null],
  ["diesel_interface_set_count", "Количество комплектов интерфейсов дизельного привода", "integer", "set", 1],
  ["automation_interface_count", "Количество интерфейсов управления и обратной связи", "integer", "pcs", 1],
  ["installation_commissioning_labor_man_hour", "Трудоёмкость монтажа и пусконаладки насосной", "decimal", "man_hour", 0.000_001],
  ["lifting_alignment_equipment_machine_hour", "Время подъёмного и центровочного оборудования", "decimal", "machine_hour", 0.000_001],
  ["hydraulic_test_count", "Количество гидравлических испытаний", "integer", "test", 1],
  ["flow_performance_test_count", "Количество испытаний расхода и напора", "integer", "test", 1],
  ["automatic_start_test_count", "Количество сценариев автоматического запуска и резерва", "integer", "test", 1],
  ["commissioning_protocol_document_count", "Количество протоколов пусконаладки", "integer", "document", 1],
  ["handover_document_count", "Количество комплектов исполнительной документации и передачи", "integer", "document", 1],
]);

const CONDITIONAL_DETAILS = new Set([
  "diesel_interface_designation",
  "diesel_interface_set_count",
]);
const KNOWN_SCOPE = new Set(["station_count"]);

function parameterConstraints(
  parameterId: string,
  valueType: ParameterSpec[2],
  minimum: number | undefined,
  enumValues: readonly string[] | undefined,
): Json {
  const base = valueType === "enum"
    ? { values: enumValues }
    : valueType === "text"
      ? { minLength: 1, maxLength: 1_000 }
      : { min: minimum ?? (valueType === "integer" ? 1 : 0.000_001) };
  if (!CONDITIONAL_DETAILS.has(parameterId)) return base;
  return {
    ...base,
    requiredWhen: { kind: "equals", parameterId: "diesel_interface_mode", value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: "diesel_interface_mode", value: "NOT_REQUIRED" },
  };
}

export type FireFightingPumpStationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const FIRE_FIGHTING_PUMP_STATION_PARAMETERS:
readonly FireFightingPumpStationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, minimum, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: parameterConstraints(parameterId, valueType, minimum, enumValues),
    truth_metadata: {
      contract: "rik-expo-app.fire-fighting-pump-station-r1",
      semantic_parameter_key: `fire-fighting-pump-station:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.has(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.has(parameterId)
        ? "KNOWN_FIRE_PUMP_STATION_SCOPE"
        : "APPROVED_HYDRAULIC_CALCULATION_PROJECT_SPECIFICATION_METHOD_OR_TEST_PROGRAM",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.has(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.has(parameterId)
          ? "Укажите подтверждённое количество отдельных пожарных насосных станций."
          : `${titleRu}: укажите прямое значение по гидравлическому расчёту, проекту, спецификации, паспорту, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.has(parameterId)
          ? "APPROVED_FIRE_PUMP_STATION_SCOPE"
          : "APPROVED_HYDRAULIC_CALCULATION_PROJECT_SPECIFICATION_METHOD_OR_TEST_PROGRAM",
        source_document: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
        source_locator: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.exact_locator,
        guide_version: "fire-fighting-pump-station-r1",
        source_snapshot_hash: FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256,
        applicability:
          "Только оборудование, трубопроводы, управление, монтаж и испытания пожарной насосной станции; отопление, вентиляция помещения, резервуары и строительные фундаменты исключены.",
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
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

export const FIRE_FIGHTING_PUMP_STATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("fire_pump_station_quantity_v1", "pcs", "station_count"),
  formula("fire_pump_quantity_v1", "pcs", "fire_pump_count"),
  formula("jockey_pump_quantity_v1", "pcs", "jockey_pump_count"),
  formula("pump_controller_quantity_v1", "pcs", "pump_controller_count"),
  formula("suction_manifold_length_v1", "m", "suction_manifold_length_m"),
  formula("discharge_manifold_length_v1", "m", "discharge_manifold_length_m"),
  formula("station_valve_quantity_v1", "pcs", "station_valve_count"),
  formula("pressure_instrument_quantity_v1", "pcs", "pressure_instrument_count"),
  formula("test_header_flow_meter_quantity_v1", "pcs", "test_header_flow_meter_count"),
  formula("fire_brigade_connection_quantity_v1", "pcs", "fire_brigade_connection_count"),
  formula("vibration_isolation_quantity_v1", "set", "vibration_isolation_set_count"),
  formula("anchor_system_quantity_v1", "set", "anchor_system_set_count"),
  formula("diesel_interface_quantity_v1", "set", "diesel_interface_set_count"),
  formula("pump_station_automation_interface_quantity_v1", "pcs", "automation_interface_count"),
  formula("pump_station_installation_commissioning_labor_v1", "man_hour", "installation_commissioning_labor_man_hour"),
  formula("pump_station_lifting_alignment_equipment_time_v1", "machine_hour", "lifting_alignment_equipment_machine_hour"),
  formula("pump_station_hydraulic_test_quantity_v1", "test", "hydraulic_test_count"),
  formula("pump_station_flow_performance_test_quantity_v1", "test", "flow_performance_test_count"),
  formula("pump_station_automatic_start_test_quantity_v1", "test", "automatic_start_test_count"),
  formula("pump_station_commissioning_protocol_quantity_v1", "document", "commissioning_protocol_document_count"),
  formula("pump_station_handover_document_quantity_v1", "document", "handover_document_count"),
]);

const LABOR_ROW_ID = "f09:fire_pump_station_installation_commissioning_labor";

type Operation = Readonly<{
  operationId: string;
  rowId: string;
  section: string;
  category: "material" | "equipment" | "service" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  titleParameterIds?: string[];
  parentRowId?: string;
  inclusionParameterId?: string;
  inclusionValue?: InputValue;
}>;

const OPERATIONS: readonly Operation[] = Object.freeze([
  { operationId: "station_scope_review", rowId: "f09:fire_pump_station_scope_review", section: "Проектная проверка", category: "construction_work", titleRu: "Проверка проектной основы пожарной насосной станции", unitId: "pcs", formulaId: "fire_pump_station_quantity_v1", costTreatment: "OWN_COST" },
  { operationId: "fire_pump_product", rowId: "f09:fire_pump", section: "Оборудование", category: "equipment", titleRu: "Пожарный насос, рабочий или резервный", unitId: "pcs", formulaId: "fire_pump_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["fire_pump_designation"] },
  { operationId: "jockey_pump_product", rowId: "f09:jockey_pump", section: "Оборудование", category: "equipment", titleRu: "Поддерживающий пожарный насос", unitId: "pcs", formulaId: "jockey_pump_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["jockey_pump_designation"] },
  { operationId: "pump_controller_product", rowId: "f09:fire_pump_controller", section: "Оборудование", category: "equipment", titleRu: "Шкаф управления пожарным насосом", unitId: "pcs", formulaId: "pump_controller_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["pump_controller_designation"] },
  { operationId: "suction_manifold_product", rowId: "f09:fire_pump_suction_manifold", section: "Материалы", category: "material", titleRu: "Всасывающий коллектор и трубопровод пожарной насосной", unitId: "m", formulaId: "suction_manifold_length_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["suction_manifold_designation"] },
  { operationId: "discharge_manifold_product", rowId: "f09:fire_pump_discharge_manifold", section: "Материалы", category: "material", titleRu: "Напорный коллектор и трубопровод пожарной насосной", unitId: "m", formulaId: "discharge_manifold_length_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["discharge_manifold_designation"] },
  { operationId: "station_valves_product", rowId: "f09:fire_pump_station_valves", section: "Материалы", category: "material", titleRu: "Запорная и обратная арматура пожарной насосной", unitId: "pcs", formulaId: "station_valve_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["station_valve_designation"] },
  { operationId: "pressure_instruments_product", rowId: "f09:fire_pump_pressure_instruments", section: "Оборудование", category: "equipment", titleRu: "Контрольно-измерительные приборы давления", unitId: "pcs", formulaId: "pressure_instrument_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["pressure_instrument_designation"] },
  { operationId: "test_header_flow_meter_product", rowId: "f09:fire_pump_test_header_flow_meter", section: "Оборудование", category: "equipment", titleRu: "Испытательный коллектор или расходомерное устройство", unitId: "pcs", formulaId: "test_header_flow_meter_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["test_header_flow_meter_designation"] },
  { operationId: "fire_brigade_connection_product", rowId: "f09:fire_brigade_connection", section: "Материалы", category: "material", titleRu: "Наружное соединение пожарной насосной для пожарной техники", unitId: "pcs", formulaId: "fire_brigade_connection_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["fire_brigade_connection_designation"] },
  { operationId: "vibration_isolation_product", rowId: "f09:fire_pump_vibration_isolation", section: "Материалы", category: "material", titleRu: "Комплект виброизоляции насосного агрегата", unitId: "set", formulaId: "vibration_isolation_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["vibration_isolation_designation"] },
  { operationId: "anchor_system_product", rowId: "f09:fire_pump_anchor_system", section: "Материалы", category: "material", titleRu: "Комплект анкеровки насосного агрегата", unitId: "set", formulaId: "anchor_system_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["anchor_system_designation"] },
  { operationId: "diesel_interfaces_product", rowId: "f09:fire_pump_diesel_interfaces", section: "Условное оборудование", category: "equipment", titleRu: "Комплект топливных, охлаждающих и выхлопных интерфейсов дизельного привода", unitId: "set", formulaId: "diesel_interface_quantity_v1", costTreatment: "OWN_COST", procurementEligible: true, titleParameterIds: ["diesel_interface_designation"], inclusionParameterId: "diesel_interface_mode", inclusionValue: "REQUIRED" },
  { operationId: "installation_commissioning_labor", rowId: LABOR_ROW_ID, section: "Труд", category: "construction_work", titleRu: "Труд по монтажу и пусконаладке пожарной насосной", unitId: "man_hour", formulaId: "pump_station_installation_commissioning_labor_v1", costTreatment: "OWN_COST" },
  { operationId: "lifting_alignment_equipment", rowId: "f09:fire_pump_lifting_alignment_equipment", section: "Машины и механизмы", category: "equipment", titleRu: "Подъёмное и центровочное оборудование для насосных агрегатов", unitId: "machine_hour", formulaId: "pump_station_lifting_alignment_equipment_time_v1", costTreatment: "OWN_COST", procurementEligible: true },
  { operationId: "fire_pump_install", rowId: "f09:fire_pump_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж и центровка пожарного насоса", unitId: "pcs", formulaId: "fire_pump_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "jockey_pump_install", rowId: "f09:jockey_pump_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж поддерживающего пожарного насоса", unitId: "pcs", formulaId: "jockey_pump_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "pump_controller_install", rowId: "f09:fire_pump_controller_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж шкафа управления пожарным насосом", unitId: "pcs", formulaId: "pump_controller_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "suction_manifold_install", rowId: "f09:fire_pump_suction_manifold_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж всасывающего коллектора и трубопровода", unitId: "m", formulaId: "suction_manifold_length_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "discharge_manifold_install", rowId: "f09:fire_pump_discharge_manifold_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж напорного коллектора и трубопровода", unitId: "m", formulaId: "discharge_manifold_length_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "station_valves_install", rowId: "f09:fire_pump_station_valves_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж запорной и обратной арматуры", unitId: "pcs", formulaId: "station_valve_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "pressure_instruments_install", rowId: "f09:fire_pump_pressure_instruments_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж контрольно-измерительных приборов давления", unitId: "pcs", formulaId: "pressure_instrument_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "test_header_flow_meter_install", rowId: "f09:fire_pump_test_header_flow_meter_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж испытательного коллектора или расходомерного устройства", unitId: "pcs", formulaId: "test_header_flow_meter_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "fire_brigade_connection_install", rowId: "f09:fire_brigade_connection_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж наружного соединения для пожарной техники", unitId: "pcs", formulaId: "fire_brigade_connection_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "vibration_isolation_install", rowId: "f09:fire_pump_vibration_isolation_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж виброизоляции насосного агрегата", unitId: "set", formulaId: "vibration_isolation_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "anchor_system_install", rowId: "f09:fire_pump_anchor_system_install", section: "Состав работ", category: "construction_work", titleRu: "Монтаж анкеровки насосного агрегата", unitId: "set", formulaId: "anchor_system_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "diesel_interfaces_install", rowId: "f09:fire_pump_diesel_interfaces_install", section: "Условный состав работ", category: "construction_work", titleRu: "Монтаж интерфейсов дизельного привода", unitId: "set", formulaId: "diesel_interface_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID, inclusionParameterId: "diesel_interface_mode", inclusionValue: "REQUIRED" },
  { operationId: "automation_interface_configuration", rowId: "f09:fire_pump_automation_interface", section: "Системные интерфейсы", category: "construction_work", titleRu: "Настройка интерфейса управления и обратной связи пожарной насосной", unitId: "pcs", formulaId: "pump_station_automation_interface_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "hydraulic_test", rowId: "f09:fire_pump_station_hydraulic_test", section: "Испытания", category: "construction_work", titleRu: "Гидравлическое испытание пожарной насосной станции", unitId: "test", formulaId: "pump_station_hydraulic_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "flow_performance_test", rowId: "f09:fire_pump_station_flow_performance_test", section: "Испытания", category: "construction_work", titleRu: "Испытание расхода и напора пожарной насосной станции", unitId: "test", formulaId: "pump_station_flow_performance_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "automatic_start_test", rowId: "f09:fire_pump_station_automatic_start_test", section: "Испытания", category: "construction_work", titleRu: "Испытание автоматического запуска и перехода на резерв", unitId: "test", formulaId: "pump_station_automatic_start_test_quantity_v1", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: LABOR_ROW_ID },
  { operationId: "commissioning_protocol", rowId: "f09:fire_pump_station_commissioning_protocol", section: "Документация", category: "service", titleRu: "Протокол пусконаладки пожарной насосной станции", unitId: "document", formulaId: "pump_station_commissioning_protocol_quantity_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
  { operationId: "handover_documentation", rowId: "f09:fire_pump_station_handover_documentation", section: "Документация", category: "service", titleRu: "Комплект исполнительной документации и передачи насосной станции", unitId: "document", formulaId: "pump_station_handover_document_quantity_v1", costTreatment: "CONTROL_OR_DOCUMENT" },
]);

export const FIRE_FIGHTING_PUMP_STATION_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "PROJECT_SYSTEM",
  generatedFromCurrentRows: false,
  evidenceSha256: FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256,
  evidenceReferences: [
    FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.official_url,
    "approved hydraulic calculation and pump-station equipment schedule",
    "approved method statement and commissioning program",
  ],
  entries: OPERATIONS.map((operation) => ({
    operationId: operation.operationId,
    expectedResourceId: `required-operation:${operation.operationId}`,
    category: "fire_pump_station",
    specification: "Direct approved project quantity; only explicit §5.74 and §5.73 minima are validated",
    condition: operation.inclusionParameterId
      ? `${operation.inclusionParameterId}=${String(operation.inclusionValue)}`
      : "fire_fighting_pump_station_selected",
    sourceId: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
    unitId: operation.unitId,
    quantityRule: "DIRECT_APPROVED_PROJECT_INPUT",
    detailPrinciple: "PUMP_STATION_SCOPE_WITH_ADJACENT_HVAC_WATER_CIVIL_ELECTRICAL_OWNERS_PRESERVED",
    priceRelation: operation.costTreatment,
    formulaId: operation.formulaId,
    resolution: operation.costTreatment === "INCLUDED_IN_RESOURCE_ROWS"
      ? { kind: "INCLUDED_COMPONENT_ROW", rowId: operation.rowId, parentRowId: LABOR_ROW_ID }
      : { kind: "ROW", rowId: operation.rowId },
  })),
});

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(operation: Operation, ordinal: number): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: operation.formulaId,
    normalizedUom: operation.unitId,
    semanticOwnerId: `fire-fighting-pump-station:${operation.rowId}`,
    costOwner: operation.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: operation.costTreatment,
    payable: operation.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "station_count",
    ...(operation.parentRowId ? { parentCostOwnerId: operation.parentRowId } : {}),
    ...(operation.titleParameterIds ? {
      titleSpecificationParameterIds: operation.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "OFFICIAL_TECHNICAL_BOUNDARY_PLUS_APPROVED_PROJECT_QUANTITY",
    normativeTrace: [{
      sourceId: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
      source_id: FIRE_FIGHTING_PUMP_STATION_SOURCE_ID,
      normId: FIRE_FIGHTING_PUMP_STATION_NORM_ID,
      norm_id: FIRE_FIGHTING_PUMP_STATION_NORM_ID,
      normVersion: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.source_document_version,
      source_title: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.source_title,
      exact_locator: FIRE_FIGHTING_PUMP_STATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: FIRE_FIGHTING_PUMP_STATION_ARTIFACT_SHA256,
    }],
    quantityBasis: "DIRECT_APPROVED_HYDRAULIC_CALCULATION_PROJECT_OR_TEST_PROGRAM_INPUT",
    excludedAdjacentScope: [
      "pump-room heating, ventilation and drainage physical systems",
      "fire-water reservoir civil structure and water-supply make-up system",
      "pump foundations and building structure",
      "incoming electrical feeders and building-level emergency power",
      "invented consumption, productivity or price",
    ],
  };
  return {
    id: `resource-${operation.rowId.replace(/:/gu, "-")}`,
    row_id: operation.rowId,
    ordinal,
    section: operation.section,
    category: operation.category,
    title_ru: operation.titleRu,
    unit_id: operation.unitId,
    formula_id: operation.formulaId,
    inclusion_ast: operation.inclusionParameterId
      ? equals(operation.inclusionParameterId, operation.inclusionValue!)
      : literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: operation.procurementEligible ?? false,
    cost_owner_id: operation.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ operation, resourceGraph, sourceMetadata }),
  };
}

export const FIRE_FIGHTING_PUMP_STATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  OPERATIONS.map((operation, ordinal) => resource(operation, ordinal)),
);

export const FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT = Object.freeze({
  station_count: 1,
});

export const FIRE_FIGHTING_PUMP_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...FIRE_FIGHTING_PUMP_STATION_SHORT_INPUT,
  fire_pump_designation: "Рабочий и резервный пожарные насосы по утверждённой спецификации",
  fire_pump_count: 2,
  jockey_pump_designation: "Поддерживающий насос по утверждённой спецификации",
  jockey_pump_count: 1,
  pump_controller_designation: "Шкаф управления по утверждённой спецификации",
  pump_controller_count: 2,
  suction_manifold_designation: "Всасывающий коллектор по рабочей документации",
  suction_manifold_length_m: 18,
  discharge_manifold_designation: "Напорный коллектор по рабочей документации",
  discharge_manifold_length_m: 24,
  station_valve_designation: "Запорная и обратная арматура по спецификации",
  station_valve_count: 16,
  pressure_instrument_designation: "Манометры и датчики давления по спецификации",
  pressure_instrument_count: 8,
  test_header_flow_meter_designation: "Испытательный коллектор с расходомерным устройством",
  test_header_flow_meter_count: 1,
  fire_brigade_connection_designation: "Соединительная головка для пожарной техники по проекту",
  fire_brigade_connection_count: 2,
  vibration_isolation_designation: "Комплект виброизоляции насосного агрегата",
  vibration_isolation_set_count: 3,
  anchor_system_designation: "Анкерная система насосного агрегата",
  anchor_system_set_count: 3,
  diesel_interface_mode: "NOT_REQUIRED",
  automation_interface_count: 8,
  installation_commissioning_labor_man_hour: 640,
  lifting_alignment_equipment_machine_hour: 48,
  hydraulic_test_count: 2,
  flow_performance_test_count: 2,
  automatic_start_test_count: 4,
  commissioning_protocol_document_count: 3,
  handover_document_count: 1,
});

export async function compileFireFightingPumpStationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FIRE_FIGHTING_PUMP_STATION_CATALOG_ID;
  if (catalogId !== FIRE_FIGHTING_PUMP_STATION_CATALOG_ID) {
    throw new Error(`FIRE_FIGHTING_PUMP_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.fire-fighting-pump-station-r1",
    catalogId,
    primaryMeasureParameterId: "station_count",
    parameterDefinitions: [...FIRE_FIGHTING_PUMP_STATION_PARAMETERS],
    formulaDefinitions: [...FIRE_FIGHTING_PUMP_STATION_FORMULAS],
    resourceDefinitions: [...FIRE_FIGHTING_PUMP_STATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}
