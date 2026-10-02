import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const SEWER_PUMPING_STATION_CATALOG_ID = "canonical-work:expanded:sewer_pumping_station";
export const SEWER_PUMPING_STATION_SOURCE_ID = "project_prefabricated_grp_sewer_pumping_station_balance_v1";
export const SEWER_PUMPING_STATION_NORM_ID = "norm:project:prefabricated_grp_sewer_pumping_station_balance:v1";
export const SEWER_PUMPING_STATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидравлический, конструктивный и электрический проект комплектной канализационной насосной станции, спецификация производителя, ведомость объёмов и программа испытаний",
  source_authority: "Проектировщик систем водоотведения, изготовитель КНС, поставщики насосов и автоматики, электролаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_PREFABRICATED_GRP_SPS_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "55ff44ce01f98cdf0790c98de8ef5cf752396888f1db14ee45cf617003427bd0",
  exact_locator: "1 комплектная подземная КНС SPS-GRP-D2400-H6500-Q45-H18-2D1S, стеклопластиковая мокрая камера D2400 H6500, 45 л/с при 18 м, 3 насоса FLYGT-N-3153-22KW по схеме 2 рабочих + 1 резервный",
  use_restriction: "Количество станции, расход, напор и размеры не определяют автоматически материалы, земляные работы, труд, механизмы или логистику. Байпасная перекачка, водоотлив и удаление запахов включаются только по проекту. Наружные сети, колодцы, внешнее электроснабжение, невыбранные здания и очистное оборудование исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "55ff44ce01f98cdf0790c98de8ef5cf752396888f1db14ee45cf617003427bd0",
});

const KNOWN_SCOPE = ["sps_station_count", "sps_station_type", "sps_station_designation",
  "sps_wet_well_material", "sps_wet_well_diameter_mm", "sps_wet_well_depth_mm",
  "sps_design_flow_lps", "sps_design_head_m", "sps_pump_unit_installed_piece",
  "sps_pump_designation", "sps_duty_pump_count", "sps_standby_pump_count",
  "sps_motor_power_kw"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "sps_pump_retained_spare_piece", "sps_pump_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "sps_bypass_pumping_designation", "sps_bypass_pumping_machine_h",
  "sps_dewatering_designation", "sps_dewatering_machine_h",
  "sps_odor_control_designation", "sps_odor_control_set_count",
]);
const PARAMETER_SPECS = Object.freeze([
  ["sps_station_count", "Количество канализационных насосных станций", "integer", "piece", null],
  ["sps_station_type", "Тип канализационной насосной станции", "enum", null, ["PREFABRICATED_GRP_WET_WELL"]],
  ["sps_station_designation", "Марка канализационной насосной станции", "text", null, null],
  ["sps_wet_well_material", "Материал мокрой камеры", "enum", null, ["GRP"]],
  ["sps_wet_well_diameter_mm", "Внутренний диаметр мокрой камеры", "decimal", "mm", null],
  ["sps_wet_well_depth_mm", "Глубина мокрой камеры", "decimal", "mm", null],
  ["sps_design_flow_lps", "Расчётная подача станции", "decimal", "l_per_s", null],
  ["sps_design_head_m", "Расчётный напор станции", "decimal", "m", null],
  ["sps_pump_unit_installed_piece", "Количество устанавливаемых насосных агрегатов", "integer", "piece", null],
  ["sps_pump_designation", "Марка погружного насосного агрегата", "text", null, null],
  ["sps_duty_pump_count", "Количество рабочих насосов", "integer", "piece", null],
  ["sps_standby_pump_count", "Количество резервных насосов", "integer", "piece", null],
  ["sps_motor_power_kw", "Мощность двигателя одного насоса", "decimal", "kW", null],
  ["sps_pump_retained_spare_piece", "Сохраняемый запас насосных агрегатов", "integer", "piece", null],
  ["sps_pump_supplier_package_quantity_piece", "Количество насосов в упаковке поставщика", "integer", "piece", null],
  ["sps_wet_well_shell_designation", "Марка корпуса мокрой камеры", "text", null, null],
  ["sps_wet_well_shell_quantity_piece", "Количество корпусов мокрой камеры", "integer", "piece", null],
  ["sps_guide_rail_lifting_kit_designation", "Марка направляющих и подъёмной оснастки", "text", null, null],
  ["sps_guide_rail_lifting_kit_quantity_set", "Комплекты направляющих и подъёмной оснастки", "integer", "set", null],
  ["sps_inlet_fitting_designation", "Марка входного патрубка", "text", null, null],
  ["sps_inlet_fitting_quantity_set", "Комплекты входного патрубка", "integer", "set", null],
  ["sps_discharge_manifold_designation", "Марка напорного коллектора", "text", null, null],
  ["sps_discharge_manifold_quantity_set", "Комплекты напорного коллектора", "integer", "set", null],
  ["sps_isolation_valve_designation", "Марка запорной арматуры", "text", null, null],
  ["sps_isolation_valve_quantity_piece", "Количество запорной арматуры", "integer", "piece", null],
  ["sps_check_valve_designation", "Марка обратных клапанов", "text", null, null],
  ["sps_check_valve_quantity_piece", "Количество обратных клапанов", "integer", "piece", null],
  ["sps_level_instrument_designation", "Марка уровнемеров и поплавков", "text", null, null],
  ["sps_level_instrument_quantity_set", "Комплекты уровнемеров и поплавков", "integer", "set", null],
  ["sps_control_panel_designation", "Марка шкафа управления", "text", null, null],
  ["sps_control_panel_quantity_piece", "Количество шкафов управления", "integer", "piece", null],
  ["sps_internal_cable_designation", "Марка внутреннего силового и контрольного кабеля", "text", null, null],
  ["sps_internal_cable_length_m", "Длина внутреннего кабеля", "decimal", "m", null],
  ["sps_ventilation_designation", "Марка вентиляционного комплекта", "text", null, null],
  ["sps_ventilation_quantity_set", "Количество вентиляционных комплектов", "integer", "set", null],
  ["sps_access_safety_designation", "Марка лестницы, площадки, люка и ограждений", "text", null, null],
  ["sps_access_safety_quantity_set", "Комплекты доступа и безопасности", "integer", "set", null],
  ["sps_base_concrete_volume_m3", "Объём бетона основания станции", "decimal", "m3", null],
  ["sps_nonshrink_grout_volume_m3", "Объём безусадочного раствора", "decimal", "m3", null],
  ["sps_excavation_volume_m3", "Объём разработки котлована", "decimal", "m3", null],
  ["sps_backfill_volume_m3", "Объём проектной обратной засыпки", "decimal", "m3", null],
  ["sps_spoil_disposal_volume_m3", "Объём вывоза излишнего грунта", "decimal", "m3", null],
  ["sps_functional_test_count", "Количество функциональных испытаний насосов", "integer", "test", null],
  ["sps_electrical_test_count", "Количество комплектов электрических испытаний", "integer", "test", null],
  ["sps_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["sps_excavation_base_labor_h", "Труд на котлован и основание", "decimal", "man_hour", null],
  ["sps_wet_well_installation_labor_h", "Труд на монтаж мокрой камеры", "decimal", "man_hour", null],
  ["sps_mechanical_installation_labor_h", "Труд на монтаж насосов и механического оборудования", "decimal", "man_hour", null],
  ["sps_electrical_controls_labor_h", "Труд на электромонтаж и автоматику", "decimal", "man_hour", null],
  ["sps_qa_testing_documentation_labor_h", "Труд на контроль, испытания и оформление", "decimal", "man_hour", null],
  ["sps_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["sps_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["sps_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["sps_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["sps_test_equipment_machine_h", "Работа испытательного оборудования", "decimal", "machine_hour", null],
  ["sps_material_delivery_trip_count", "Рейсы доставки оборудования и материалов", "integer", "trip", null],
  ["sps_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["sps_bypass_pumping_mode", "Байпасная перекачка требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sps_bypass_pumping_designation", "Оборудование байпасной перекачки", "text", null, null],
  ["sps_bypass_pumping_machine_h", "Работа байпасной перекачки", "decimal", "machine_hour", null],
  ["sps_dewatering_mode", "Водоотлив требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sps_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["sps_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["sps_odor_control_mode", "Удаление запахов требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sps_odor_control_designation", "Марка системы удаления запахов", "text", null, null],
  ["sps_odor_control_set_count", "Количество комплектов удаления запахов", "integer", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("sps_bypass_pumping_")
    && parameterId !== "sps_bypass_pumping_mode" ? "sps_bypass_pumping_mode"
    : parameterId.startsWith("sps_dewatering_") && parameterId !== "sps_dewatering_mode"
      ? "sps_dewatering_mode" : parameterId.startsWith("sps_odor_control_")
        && parameterId !== "sps_odor_control_mode" ? "sps_odor_control_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type SewerPumpingStationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const SEWER_PUMPING_STATION_PARAMETERS: readonly SewerPumpingStationParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "sps_pump_retained_spare_piece" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.sewer-pumping-station-r1",
      semantic_parameter_key: `sewer-pumping-station:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_SPS_PROJECT_MANUFACTURER_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, проекту и спецификации изготовителя КНС.`
          : `${titleRu}: укажите по проекту, спецификации КНС, ведомости объёмов, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_SPS_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_SPS_PROJECT_DOCUMENTATION",
        source_document: SEWER_PUMPING_STATION_SOURCE_ID,
        source_locator: SEWER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
        guide_version: "sewer-pumping-station-r1",
        source_snapshot_hash: SEWER_PUMPING_STATION_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранная комплектная КНС и её внутреннее оборудование; наружные сети, внешнее питание и невыбранные здания или очистное оборудование исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);

export const SEWER_PUMPING_STATION_RUNTIME_INPUT = Object.freeze({
  sps_pump_retained_spare_piece: 0, sps_pump_supplier_package_quantity_piece: 1,
});
export const SEWER_PUMPING_STATION_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(SEWER_PUMPING_STATION_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const SEWER_PUMPING_STATION_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(SEWER_PUMPING_STATION_RUNTIME_INPUT).map((id) => [id, [SEWER_PUMPING_STATION_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:sps_acceptance", section: "Работы", category: "construction_work", titleRu: "Монтаж и приёмка комплектной канализационной насосной станции", unitId: "piece", formulaId: "sps_acceptance_count_v1", expression: "sps_station_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps_pump_units", section: "Оборудование", category: "equipment", titleRu: "Погружные насосные агрегаты", unitId: "piece", formulaId: "sps_pump_order_quantity_v1", expression: "ceil((sps_pump_unit_installed_piece+sps_pump_retained_spare_piece)/sps_pump_supplier_package_quantity_piece)*sps_pump_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["sps_pump_designation"] },
  { rowId: "rc09:sps_wet_well_shell", section: "Оборудование", category: "equipment", titleRu: "Корпус мокрой камеры КНС", unitId: "piece", formulaId: "sps_wet_well_shell_quantity_v1", expression: "sps_wet_well_shell_quantity_piece", procurementEligible: true, titleParameterIds: ["sps_wet_well_shell_designation"] },
  { rowId: "rc09:sps_guide_rail_lifting_kit", section: "Комплектующие", category: "material", titleRu: "Направляющие и подъёмная оснастка насосов", unitId: "set", formulaId: "sps_guide_rail_lifting_kit_quantity_v1", expression: "sps_guide_rail_lifting_kit_quantity_set", procurementEligible: true, titleParameterIds: ["sps_guide_rail_lifting_kit_designation"] },
  { rowId: "rc09:sps_inlet_fitting", section: "Комплектующие", category: "material", titleRu: "Входной патрубок КНС", unitId: "set", formulaId: "sps_inlet_fitting_quantity_v1", expression: "sps_inlet_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["sps_inlet_fitting_designation"] },
  { rowId: "rc09:sps_discharge_manifold", section: "Комплектующие", category: "material", titleRu: "Внутренний напорный коллектор", unitId: "set", formulaId: "sps_discharge_manifold_quantity_v1", expression: "sps_discharge_manifold_quantity_set", procurementEligible: true, titleParameterIds: ["sps_discharge_manifold_designation"] },
  { rowId: "rc09:sps_isolation_valves", section: "Комплектующие", category: "material", titleRu: "Запорная арматура КНС", unitId: "piece", formulaId: "sps_isolation_valve_quantity_v1", expression: "sps_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["sps_isolation_valve_designation"] },
  { rowId: "rc09:sps_check_valves", section: "Комплектующие", category: "material", titleRu: "Обратные клапаны КНС", unitId: "piece", formulaId: "sps_check_valve_quantity_v1", expression: "sps_check_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["sps_check_valve_designation"] },
  { rowId: "rc09:sps_level_instruments", section: "Автоматика", category: "equipment", titleRu: "Уровнемеры и аварийные поплавки", unitId: "set", formulaId: "sps_level_instrument_quantity_v1", expression: "sps_level_instrument_quantity_set", procurementEligible: true, titleParameterIds: ["sps_level_instrument_designation"] },
  { rowId: "rc09:sps_control_panel", section: "Автоматика", category: "equipment", titleRu: "Шкаф управления КНС", unitId: "piece", formulaId: "sps_control_panel_quantity_v1", expression: "sps_control_panel_quantity_piece", procurementEligible: true, titleParameterIds: ["sps_control_panel_designation"] },
  { rowId: "rc09:sps_internal_cable", section: "Материалы", category: "material", titleRu: "Внутренний силовой и контрольный кабель", unitId: "m", formulaId: "sps_internal_cable_length_v1", expression: "sps_internal_cable_length_m", procurementEligible: true, titleParameterIds: ["sps_internal_cable_designation"] },
  { rowId: "rc09:sps_ventilation", section: "Комплектующие", category: "material", titleRu: "Вентиляционный комплект мокрой камеры", unitId: "set", formulaId: "sps_ventilation_quantity_v1", expression: "sps_ventilation_quantity_set", procurementEligible: true, titleParameterIds: ["sps_ventilation_designation"] },
  { rowId: "rc09:sps_access_safety", section: "Комплектующие", category: "material", titleRu: "Лестница, площадка, люк и ограждения", unitId: "set", formulaId: "sps_access_safety_quantity_v1", expression: "sps_access_safety_quantity_set", procurementEligible: true, titleParameterIds: ["sps_access_safety_designation"] },
  { rowId: "rc09:sps_base_concrete", section: "Материалы", category: "material", titleRu: "Бетон основания КНС", unitId: "m3", formulaId: "sps_base_concrete_volume_v1", expression: "sps_base_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:sps_nonshrink_grout", section: "Расходники", category: "material", titleRu: "Безусадочный раствор для монтажа", unitId: "m3", formulaId: "sps_nonshrink_grout_volume_v1", expression: "sps_nonshrink_grout_volume_m3", procurementEligible: true },
  { rowId: "rc09:sps_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлована КНС", unitId: "m3", formulaId: "sps_excavation_volume_v1", expression: "sps_excavation_volume_m3" },
  { rowId: "rc09:sps_backfill", section: "Земляные работы", category: "construction_work", titleRu: "Проектная обратная засыпка КНС", unitId: "m3", formulaId: "sps_backfill_volume_v1", expression: "sps_backfill_volume_m3" },
  { rowId: "rc09:sps_spoil_disposal", section: "Земляные работы", category: "service", titleRu: "Вывоз излишнего грунта", unitId: "m3", formulaId: "sps_spoil_disposal_volume_v1", expression: "sps_spoil_disposal_volume_m3", procurementEligible: true },
  { rowId: "rc09:sps_functional_tests", section: "Контроль", category: "service", titleRu: "Функциональные испытания насосных агрегатов", unitId: "test", formulaId: "sps_functional_test_count_v1", expression: "sps_functional_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания и проверка автоматики", unitId: "test", formulaId: "sps_electrical_test_count_v1", expression: "sps_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация КНС", unitId: "document", formulaId: "sps_asbuilt_document_count_v1", expression: "sps_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps_bypass_pumping", section: "Условные механизмы", category: "equipment", titleRu: "Байпасная перекачка стоков", unitId: "machine_hour", formulaId: "sps_bypass_pumping_machine_v1", expression: "sps_bypass_pumping_machine_h", procurementEligible: true, inclusionAst: equals("sps_bypass_pumping_mode", "REQUIRED"), titleParameterIds: ["sps_bypass_pumping_designation"] },
  { rowId: "rc09:sps_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из котлована КНС", unitId: "machine_hour", formulaId: "sps_dewatering_machine_v1", expression: "sps_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("sps_dewatering_mode", "REQUIRED"), titleParameterIds: ["sps_dewatering_designation"] },
  { rowId: "rc09:sps_odor_control", section: "Условное оборудование", category: "equipment", titleRu: "Система удаления запахов", unitId: "set", formulaId: "sps_odor_control_count_v1", expression: "sps_odor_control_set_count", procurementEligible: true, inclusionAst: equals("sps_odor_control_mode", "REQUIRED"), titleParameterIds: ["sps_odor_control_designation"] },
  { rowId: "rc09:sps-pump-balance:installed-net", section: "Баланс насосов", category: "equipment", titleRu: "Установленные насосные агрегаты", unitId: "piece", formulaId: "sps_pump_installed_net_v1", expression: "sps_pump_unit_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps-pump-balance:retained-spare", section: "Баланс насосов", category: "equipment", titleRu: "Сохраняемый запас насосных агрегатов", unitId: "piece", formulaId: "sps_pump_retained_spare_v1", expression: "sps_pump_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps-pump-balance:total-need", section: "Баланс насосов", category: "equipment", titleRu: "Общая потребность в насосных агрегатах", unitId: "piece", formulaId: "sps_pump_total_need_v1", expression: "sps_pump_unit_installed_piece+sps_pump_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps-pump-balance:package-count", section: "Баланс насосов", category: "equipment", titleRu: "Количество упаковок насосных агрегатов", unitId: "package", formulaId: "sps_pump_package_count_v1", expression: "ceil((sps_pump_unit_installed_piece+sps_pump_retained_spare_piece)/sps_pump_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps-pump-balance:remainder", section: "Баланс насосов", category: "equipment", titleRu: "Остаток насосных агрегатов после установки", unitId: "piece", formulaId: "sps_pump_remainder_v1", expression: "ceil((sps_pump_unit_installed_piece+sps_pump_retained_spare_piece)/sps_pump_supplier_package_quantity_piece)*sps_pump_supplier_package_quantity_piece-sps_pump_unit_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sps-pump-balance:surplus-beyond-spare", section: "Баланс насосов", category: "equipment", titleRu: "Свободный остаток насосов сверх запаса", unitId: "piece", formulaId: "sps_pump_surplus_v1", expression: "max(0,ceil((sps_pump_unit_installed_piece+sps_pump_retained_spare_piece)/sps_pump_supplier_package_quantity_piece)*sps_pump_supplier_package_quantity_piece-sps_pump_unit_installed_piece-sps_pump_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:sps-excavation-base", section: "Труд", category: "construction_work", titleRu: "Котлован и основание КНС", unitId: "man_hour", formulaId: "sps_excavation_base_labor_v1", expression: "sps_excavation_base_labor_h" },
  { rowId: "rc09:labor:sps-wet-well-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж мокрой камеры", unitId: "man_hour", formulaId: "sps_wet_well_installation_labor_v1", expression: "sps_wet_well_installation_labor_h" },
  { rowId: "rc09:labor:sps-mechanical-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж насосов и механического оборудования", unitId: "man_hour", formulaId: "sps_mechanical_installation_labor_v1", expression: "sps_mechanical_installation_labor_h" },
  { rowId: "rc09:labor:sps-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Электромонтаж и автоматика", unitId: "man_hour", formulaId: "sps_electrical_controls_labor_v1", expression: "sps_electrical_controls_labor_h" },
  { rowId: "rc09:labor:sps-qa-testing-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль, испытания и оформление", unitId: "man_hour", formulaId: "sps_qa_testing_documentation_labor_v1", expression: "sps_qa_testing_documentation_labor_h" },
  { rowId: "rc09:equipment:sps-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "sps_excavator_machine_v1", expression: "sps_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sps-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "sps_crane_machine_v1", expression: "sps_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sps-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "sps_concrete_pump_machine_v1", expression: "sps_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sps-compactor", section: "Механизмы", category: "equipment", titleRu: "Уплотняющий механизм", unitId: "machine_hour", formulaId: "sps_compactor_machine_v1", expression: "sps_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sps-test-equipment", section: "Механизмы", category: "equipment", titleRu: "Испытательное оборудование", unitId: "machine_hour", formulaId: "sps_test_equipment_machine_v1", expression: "sps_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:sps-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка станции, оборудования и материалов", unitId: "trip", formulaId: "sps_material_delivery_trip_v1", expression: "sps_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:sps-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "sps_waste_removal_trip_v1", expression: "sps_waste_removal_trip_count", procurementEligible: true },
]);

export const SEWER_PUMPING_STATION_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const SEWER_PUMPING_STATION_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `sewer-pumping-station:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_SPS_PROJECT_MANUFACTURER_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: SEWER_PUMPING_STATION_SOURCE_ID,
        source_id: SEWER_PUMPING_STATION_SOURCE_ID, normId: SEWER_PUMPING_STATION_NORM_ID,
        norm_id: SEWER_PUMPING_STATION_NORM_ID,
        normVersion: SEWER_PUMPING_STATION_SOURCE_METADATA.source_document_version,
        source_title: SEWER_PUMPING_STATION_SOURCE_METADATA.source_title,
        exact_locator: SEWER_PUMPING_STATION_SOURCE_METADATA.exact_locator,
        source_definition_hash: SEWER_PUMPING_STATION_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "external gravity or pressure pipeline, manholes, off-site power, building or treatment equipment",
        "count-flow-head-or-dimension-derived material, civil, labor, mechanism or logistics quantity",
        "automatic bypass pumping, dewatering or odor control",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);

export const SEWER_PUMPING_STATION_SHORT_INPUT = Object.freeze({
  sps_station_count: 1, sps_station_type: "PREFABRICATED_GRP_WET_WELL",
  sps_station_designation: "SPS-GRP-D2400-H6500-Q45-H18-2D1S", sps_wet_well_material: "GRP",
  sps_wet_well_diameter_mm: 2400, sps_wet_well_depth_mm: 6500,
  sps_design_flow_lps: 45, sps_design_head_m: 18, sps_pump_unit_installed_piece: 3,
  sps_pump_designation: "FLYGT-N-3153-22KW", sps_duty_pump_count: 2,
  sps_standby_pump_count: 1, sps_motor_power_kw: 22,
  ...SEWER_PUMPING_STATION_RUNTIME_INPUT,
});
export const SEWER_PUMPING_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...SEWER_PUMPING_STATION_SHORT_INPUT,
  sps_wet_well_shell_designation: "GRP-WW-D2400-H6500", sps_wet_well_shell_quantity_piece: 1,
  sps_guide_rail_lifting_kit_designation: "FLYGT-GUIDE-LIFT-3153", sps_guide_rail_lifting_kit_quantity_set: 3,
  sps_inlet_fitting_designation: "INLET-DN400-GRP", sps_inlet_fitting_quantity_set: 1,
  sps_discharge_manifold_designation: "SS316-MANIFOLD-DN250", sps_discharge_manifold_quantity_set: 1,
  sps_isolation_valve_designation: "GATE-VALVE-DN250-PN16", sps_isolation_valve_quantity_piece: 4,
  sps_check_valve_designation: "SWING-CHECK-DN250-PN16", sps_check_valve_quantity_piece: 3,
  sps_level_instrument_designation: "LEVEL-4-20MA-FLOAT-BACKUP", sps_level_instrument_quantity_set: 1,
  sps_control_panel_designation: "MCC-SPS-3X22KW-VFD", sps_control_panel_quantity_piece: 1,
  sps_internal_cable_designation: "N2XH-POWER-CONTROL-SPS", sps_internal_cable_length_m: 180,
  sps_ventilation_designation: "VENT-GRP-DN160", sps_ventilation_quantity_set: 1,
  sps_access_safety_designation: "SS316-LADDER-PLATFORM-HATCH", sps_access_safety_quantity_set: 1,
  sps_base_concrete_volume_m3: 22, sps_nonshrink_grout_volume_m3: 1.2,
  sps_excavation_volume_m3: 240, sps_backfill_volume_m3: 150, sps_spoil_disposal_volume_m3: 90,
  sps_functional_test_count: 3, sps_electrical_test_count: 1, sps_asbuilt_document_count: 1,
  sps_excavation_base_labor_h: 160, sps_wet_well_installation_labor_h: 96,
  sps_mechanical_installation_labor_h: 160, sps_electrical_controls_labor_h: 128,
  sps_qa_testing_documentation_labor_h: 72, sps_excavator_machine_h: 72,
  sps_crane_machine_h: 48, sps_concrete_pump_machine_h: 16, sps_compactor_machine_h: 32,
  sps_test_equipment_machine_h: 24, sps_material_delivery_trip_count: 14,
  sps_waste_removal_trip_count: 10, sps_bypass_pumping_mode: "NOT_REQUIRED",
  sps_dewatering_mode: "NOT_REQUIRED", sps_odor_control_mode: "NOT_REQUIRED",
});

export async function compileSewerPumpingStationR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SEWER_PUMPING_STATION_CATALOG_ID;
  if (catalogId !== SEWER_PUMPING_STATION_CATALOG_ID) {
    throw new Error(`SEWER_PUMPING_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.sewer-pumping-station-r1", catalogId,
    primaryMeasureParameterId: "sps_station_count",
    parameterDefinitions: [...SEWER_PUMPING_STATION_PARAMETERS],
    formulaDefinitions: [...SEWER_PUMPING_STATION_FORMULAS],
    resourceDefinitions: [...SEWER_PUMPING_STATION_RESOURCES], submittedParameters,
    confirmedParameters: { ...SEWER_PUMPING_STATION_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
