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
type ParameterKind = "ordinary" | "profile" | "conditional";
type ParameterValueType = "decimal" | "integer" | "text" | "enum";
type ParameterSpec = Readonly<{
  id: string;
  title: string;
  valueType: ParameterValueType;
  unitId: string | null;
  kind: ParameterKind;
  defaultValue?: string | number;
  values?: readonly string[];
  min?: number;
  max?: number;
  requiredWhen?: Readonly<{ parameterId: string; value: string }>;
}>;

export const HOUSE_WATER_CONNECTION_CATALOG_ID =
  "canonical-work:expanded:house_connection_water";
export const HOUSE_WATER_CONNECTION_SOURCE_ID =
  "project_house_water_connection_geometric_automatic_balance_v1";
export const HOUSE_WATER_CONNECTION_NORM_ID =
  "norm:project:house_water_connection_geometric_automatic_balance:v1";

export const HOUSE_WATER_CONNECTION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный инженерный профиль ввода питьевого водопровода в дом S27.25",
  source_authority: "Предварительный сценарий canonical compiler; геометрия, узлы, удельные нормы и условные решения требуют проверки проектом, владельцем сети и изготовителями",
  source_document_version: "VISIBLE_PRELIMINARY_HOUSE_WATER_CONNECTION_GEOMETRY_TO_RESOURCES_S27_25_REQUIRES_PROJECT_CONFIRMATION",
  definition_hash: "6de4e5259133d67849eca92821c0b0d09ee4800160772d407e413c5374b87a29",
  exact_locator: "Сценарий HCW-PE100-RC-OD32-PN16-28M-MAIN-OD225: одна врезка в существующую напорную магистраль, сервисная труба, герметичный ввод и водомерный узел; конечные количества выводятся из первичных размеров и видимых норм",
  use_restriction: "Не является утверждённым original или универсальной нормой. Не включает строительство магистрали, внутреннюю разводку после водомерного узла, пожарный ввод и проектирование несущего проёма. Водоотлив, дорога, наружная камера и крепление траншеи включаются только по применимости.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "6de4e5259133d67849eca92821c0b0d09ee4800160772d407e413c5374b87a29",
});

const ORDINARY_PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { id: "hcw_connection_count", title: "Количество вводов воды в дом", valueType: "integer", unitId: "system", kind: "ordinary", min: 1 },
  { id: "hcw_service_route_length_m", title: "Измеренная длина трассы сервисной трубы", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "hcw_pipe_material", title: "Материал сервисной трубы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_pipe_grade", title: "Марка материала сервисной трубы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_sdr_class", title: "Класс SDR сервисной трубы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_pipe_outside_diameter_mm", title: "Наружный диаметр сервисной трубы", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "hcw_pressure_class", title: "Класс давления сервисной трубы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_pipe_designation", title: "Обозначение выбранной сервисной трубы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_existing_main_material", title: "Материал существующей распределительной магистрали", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "hcw_existing_main_outside_diameter_mm", title: "Наружный диаметр существующей магистрали", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
]);

const PROFILE_PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { id: "hcw_pipe_inside_diameter_mm", title: "Внутренний диаметр сервисной трубы", valueType: "decimal", unitId: "mm", kind: "profile", defaultValue: 26.2, min: 0.000_001 },
  { id: "hcw_trench_bottom_width_m", title: "Ширина траншеи по дну", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.6, min: 0.000_001 },
  { id: "hcw_trench_depth_m", title: "Глубина траншеи", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 1.5, min: 0.000_001 },
  { id: "hcw_bedding_thickness_m", title: "Толщина постели под трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "hcw_surround_width_m", title: "Ширина зоны защитной обсыпки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.45, min: 0.000_001 },
  { id: "hcw_surround_cover_above_pipe_m", title: "Толщина защитной обсыпки над трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.2, min: 0.000_001 },
  { id: "hcw_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.8, min: 0, max: 1 },
  { id: "hcw_pipe_expected_loss_fraction", title: "Ожидаемая технологическая потеря трубы", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "hcw_pipe_retained_spare_m", title: "Сохраняемый резерв сервисной трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_pipe_available_stock_m", title: "Подтверждённый доступный остаток сервисной трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "hcw_pipe_supplier_package_length_m", title: "Длина поставочной бухты или пакета трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "hcw_installed_pipe_piece_length_m", title: "Монтажная длина непрерывного отрезка трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "hcw_bedding_designation", title: "Материал постели", valueType: "text", unitId: null, kind: "profile", defaultValue: "Песок мытый по предварительному профилю HCW-T1" },
  { id: "hcw_surround_designation", title: "Материал защитной обсыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Песок защитной обсыпки по предварительному профилю HCW-T1" },
  { id: "hcw_imported_backfill_designation", title: "Привозной материал обратной засыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Привозной материал обратной засыпки по балансу HCW-T1" },
  { id: "hcw_warning_tape_designation", title: "Сигнальная лента водопровода", valueType: "text", unitId: null, kind: "profile", defaultValue: "Лента сигнальная Водопровод" },
  { id: "hcw_warning_tape_length_factor", title: "Коэффициент длины сигнальной ленты", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "hcw_tracer_wire_designation", title: "Трассировочный провод неметаллической трубы", valueType: "text", unitId: null, kind: "profile", defaultValue: "Провод трассировочный медный в защитной оболочке" },
  { id: "hcw_tracer_wire_length_factor", title: "Коэффициент длины трассировочного провода", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "hcw_tapping_method", title: "Согласованный способ врезки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Врезка под давлением по согласованию владельца сети" },
  { id: "hcw_tapping_saddle_designation", title: "Седёлка врезки для существующей магистрали", valueType: "text", unitId: null, kind: "profile", defaultValue: "Седёлка электросварная с ответвлением OD32" },
  { id: "hcw_corporation_stop_designation", title: "Вентиль врезки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Вентиль врезки DN25 PN16" },
  { id: "hcw_service_adapter_designation", title: "Переходник сервисной трубы", valueType: "text", unitId: null, kind: "profile", defaultValue: "Адаптер PE100-RC OD32 PN16" },
  { id: "hcw_curb_stop_designation", title: "Наружный отключающий вентиль ввода", valueType: "text", unitId: null, kind: "profile", defaultValue: "Вентиль сервисного ввода DN25 PN16" },
  { id: "hcw_valve_box_designation", title: "Телескопический шток и уличный ковер вентиля", valueType: "text", unitId: null, kind: "profile", defaultValue: "Комплект штока и уличного ковера сервисного вентиля" },
  { id: "hcw_internal_stop_valve_designation", title: "Внутренний запорный кран", valueType: "text", unitId: null, kind: "profile", defaultValue: "Кран шаровой DN25 PN16 для питьевой воды" },
  { id: "hcw_water_meter_designation", title: "Счётчик холодной воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "Счётчик холодной воды DN25 с импульсным выходом" },
  { id: "hcw_strainer_designation", title: "Фильтр грубой очистки водомерного узла", valueType: "text", unitId: null, kind: "profile", defaultValue: "Фильтр сетчатый косой DN25 PN16" },
  { id: "hcw_check_valve_designation", title: "Обратный клапан водомерного узла", valueType: "text", unitId: null, kind: "profile", defaultValue: "Клапан обратный DN25 PN16" },
  { id: "hcw_union_designation", title: "Разъёмное соединение водомерного узла", valueType: "text", unitId: null, kind: "profile", defaultValue: "Соединение разъёмное DN25 PN16" },
  { id: "hcw_wall_sleeve_designation", title: "Гильза ввода через стену", valueType: "text", unitId: null, kind: "profile", defaultValue: "Гильза защитная ввода OD110" },
  { id: "hcw_penetration_seal_designation", title: "Герметизация кольцевого пространства ввода", valueType: "text", unitId: null, kind: "profile", defaultValue: "Модульное герметичное уплотнение гильзы" },
  { id: "hcw_entry_insulation_designation", title: "Теплоизоляция участка ввода", valueType: "text", unitId: null, kind: "profile", defaultValue: "Теплоизоляционная оболочка сервисной трубы" },
  { id: "hcw_tapping_saddle_per_connection", title: "Седёлки на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_corporation_stop_per_connection", title: "Вентили врезки на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_service_adapter_per_connection", title: "Переходники на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_curb_stop_per_connection", title: "Наружные отключающие вентили на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_valve_box_per_connection", title: "Комплекты ковера и штока на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_internal_stop_valve_per_connection", title: "Внутренние запорные краны на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_water_meter_per_connection", title: "Счётчики воды на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_strainer_per_connection", title: "Фильтры на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_check_valve_per_connection", title: "Обратные клапаны на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_union_per_connection", title: "Разъёмные соединения на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_meter_seal_per_connection", title: "Пломбы водомерного узла на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_wall_sleeve_per_connection", title: "Гильзы через стену на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_penetration_seal_per_connection", title: "Комплекты герметизации на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_entry_insulation_m_per_connection", title: "Длина теплоизоляции на один ввод", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_tracer_terminal_per_connection", title: "Контактные выводы трассировочного провода на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_fusion_consumable_set_per_joint", title: "Комплект подготовки на одно сварное соединение", valueType: "decimal", unitId: "set_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_flushing_volume_multiplier", title: "Кратность объёма воды для промывки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 3, min: 1 },
  { id: "hcw_disinfection_dose_mg_l", title: "Доза активного вещества для дезинфекции", valueType: "decimal", unitId: "mg_l", kind: "profile", defaultValue: 50, min: 0 },
  { id: "hcw_reagent_active_fraction", title: "Массовая доля активного вещества реагента", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.1, min: 0.000_001, max: 1 },
  { id: "hcw_test_closure_per_connection", title: "Временные заглушки на один ввод", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_fill_air_drain_set_per_connection", title: "Комплекты заполнения, выпуска воздуха и слива на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_measurement_set_per_connection", title: "Поверенные измерительные комплекты на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_sample_per_connection", title: "Пробы воды на один ввод", valueType: "decimal", unitId: "sample_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_analysis_per_connection", title: "Лабораторные анализы на один ввод", valueType: "decimal", unitId: "analysis_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_route_marking_set_per_connection", title: "Комплекты разметочных расходников на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_work_zone_safety_set_per_connection", title: "Комплекты ограждений и знаков на один ввод", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_compaction_water_m3_per_backfill_m3", title: "Вода для увлажнения на объём засыпки", valueType: "decimal", unitId: "m3_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "hcw_survey_labor_h_per_m", title: "Труд геодезиста на метр трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "hcw_survey_labor_h_per_connection", title: "Труд геодезиста на один ввод", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_earthworks_labor_h_per_m3", title: "Труд на кубометр земляных работ", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.28, min: 0 },
  { id: "hcw_pipe_install_labor_h_per_m", title: "Труд монтажа сервисной трубы на метр", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.22, min: 0 },
  { id: "hcw_joint_labor_h_per_joint", title: "Труд на одно сварное соединение", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 0.75, min: 0 },
  { id: "hcw_tapping_labor_h_per_connection", title: "Труд на один узел врезки", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 6, min: 0 },
  { id: "hcw_entry_meter_labor_h_per_connection", title: "Труд на ввод и водомерный узел", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "hcw_qa_labor_h_per_m", title: "Труд испытаний на метр трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.15, min: 0 },
  { id: "hcw_qa_labor_h_per_connection", title: "Труд испытаний на один ввод", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "hcw_documentation_labor_h_per_connection", title: "Труд исполнительной документации на один ввод", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "hcw_excavator_productivity_m3_h", title: "Производительность мини-экскаватора", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 8, min: 0.000_001 },
  { id: "hcw_compactor_productivity_m3_h", title: "Производительность уплотнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 7, min: 0.000_001 },
  { id: "hcw_fusion_machine_h_per_joint", title: "Работа сварочного оборудования на соединение", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "hcw_core_drill_h_per_connection", title: "Работа алмазного сверления на ввод", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "hcw_test_pump_h_per_connection", title: "Работа опрессовочного насоса на ввод", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "hcw_test_pump_productivity_m3_h", title: "Производительность насоса заполнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 2, min: 0.000_001 },
  { id: "hcw_removal_truck_capacity_m3", title: "Вместимость самосвала для лишнего грунта", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 8, min: 0.000_001 },
  { id: "hcw_delivery_capacity_m_per_trip", title: "Поставочная длина трубы на один рейс", valueType: "decimal", unitId: "m_per_trip", kind: "profile", defaultValue: 500, min: 0.000_001 },
  { id: "hcw_dewatering_mode", title: "Водоотлив требуется по проекту", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "hcw_road_restoration_mode", title: "Восстановление покрытия требуется по проекту", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "hcw_external_meter_chamber_mode", title: "Наружная водомерная камера требуется по проекту", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "hcw_trench_support_mode", title: "Крепление стенок траншеи требуется по проекту", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const CONDITIONAL_PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  { id: "hcw_dewatering_designation", title: "Система водоотлива", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "hcw_dewatering_mode", value: "REQUIRED" } },
  { id: "hcw_dewatering_pump_count", title: "Количество насосов водоотлива", valueType: "integer", unitId: "pcs", kind: "conditional", min: 1, requiredWhen: { parameterId: "hcw_dewatering_mode", value: "REQUIRED" } },
  { id: "hcw_dewatering_duration_h", title: "Продолжительность водоотлива", valueType: "decimal", unitId: "hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "hcw_dewatering_mode", value: "REQUIRED" } },
  { id: "hcw_road_restoration_designation", title: "Конструкция восстановления покрытия", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "hcw_road_restoration_mode", value: "REQUIRED" } },
  { id: "hcw_road_restoration_area_m2", title: "Измеренная площадь восстановления покрытия", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "hcw_road_restoration_mode", value: "REQUIRED" } },
  { id: "hcw_external_meter_chamber_designation", title: "Тип наружной водомерной камеры", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "hcw_external_meter_chamber_mode", value: "REQUIRED" } },
  { id: "hcw_trench_support_designation", title: "Система крепления стенок траншеи", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "hcw_trench_support_mode", value: "REQUIRED" } },
  { id: "hcw_trench_support_length_m", title: "Длина участка с креплением стенок", valueType: "decimal", unitId: "m", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "hcw_trench_support_mode", value: "REQUIRED" } },
]);

const PARAMETER_SPECS = Object.freeze([
  ...ORDINARY_PARAMETER_SPECS,
  ...PROFILE_PARAMETER_SPECS,
  ...CONDITIONAL_PARAMETER_SPECS,
]);
const ORDINARY_IDS = new Set(ORDINARY_PARAMETER_SPECS.map((spec) => spec.id));

export type HouseWaterConnectionParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

function parameterConstraints(spec: ParameterSpec): Json {
  return {
    ...(spec.values ? { values: [...spec.values] } : {}),
    ...(spec.valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...(spec.min == null ? {} : { min: spec.min }),
    ...(spec.max == null ? {} : { max: spec.max }),
    ...(spec.requiredWhen ? {
      requiredWhen: { kind: "equals", ...spec.requiredWhen },
      forbiddenWhen: { kind: "equals", parameterId: spec.requiredWhen.parameterId, value: "NOT_REQUIRED" },
    } : {}),
  };
}

export const HOUSE_WATER_CONNECTION_PARAMETERS: readonly HouseWaterConnectionParameter[] =
  Object.freeze(PARAMETER_SPECS.map((spec, ordinal) => ({
    parameter_id: spec.id,
    ordinal,
    value_type: spec.valueType,
    unit_id: spec.unitId,
    title_ru: spec.title,
    required: spec.kind !== "conditional",
    default_value: null,
    constraints_json: parameterConstraints(spec),
    truth_metadata: {
      contract: "rik-expo-app.house-water-connection-r1",
      semantic_parameter_key: `house-water-connection:${spec.id}`,
      visibility_role: "USER_INPUT",
      value_source_role: spec.kind === "ordinary" ? "USER_INPUT"
        : spec.kind === "profile" ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "CONDITIONAL_PROJECT_FACT",
      input_origin_class: spec.kind === "ordinary" ? "KNOWN_CONNECTION_SCOPE"
        : spec.kind === "profile" ? "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE"
          : "APPROVED_CONNECTION_PROJECT_OR_METHOD_STATEMENT",
      preliminary_compilation_allowed: true,
      source_confirmation_required: spec.kind !== "ordinary",
      guide: {
        guide_kind: spec.kind === "ordinary" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: spec.kind === "ordinary"
          ? `${spec.title}: укажите по запросу, обмеру или условиям подключения.`
          : `${spec.title}: видимое предварительное значение; замените по проекту или спецификации.`,
        source_role: spec.kind === "ordinary" ? "USER_SUPPLIED_OR_APPROVED_CONNECTION_SCOPE"
          : "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
        source_document: HOUSE_WATER_CONNECTION_SOURCE_ID,
        source_locator: HOUSE_WATER_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "house-water-connection-r1",
        source_snapshot_hash: HOUSE_WATER_CONNECTION_SOURCE_METADATA.artifact_sha256,
        applicability: "Один или несколько однотипных вводов питьевой воды от существующей распределительной магистрали до водомерного узла здания.",
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: "DEFER_CONDITIONAL_PROJECT_FACT_CALCULATE_DERIVED_QUANTITIES",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: spec.kind === "profile",
      synthetic: false,
    },
  })));

export const HOUSE_WATER_CONNECTION_RUNTIME_INPUT = Object.freeze(Object.fromEntries(
  PROFILE_PARAMETER_SPECS.map((spec) => [spec.id, spec.defaultValue]),
));
export const HOUSE_WATER_CONNECTION_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT).map((parameterId) => [parameterId, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const HOUSE_WATER_CONNECTION_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [HOUSE_WATER_CONNECTION_SOURCE_ID]],
  ),
) as Readonly<Record<string, readonly string[]>>);

const TRENCH = "hcw_service_route_length_m*hcw_trench_bottom_width_m*hcw_trench_depth_m";
const BEDDING = "hcw_service_route_length_m*hcw_trench_bottom_width_m*hcw_bedding_thickness_m";
const SURROUND_GROSS = "hcw_service_route_length_m*hcw_surround_width_m*(hcw_pipe_outside_diameter_mm/1000+hcw_surround_cover_above_pipe_m)";
const PIPE_EXTERNAL_VOLUME = "hcw_service_route_length_m*3.141592653589793*pow(hcw_pipe_outside_diameter_mm/1000,2)/4";
const BACKFILL_PLACEMENT = `max(0,${TRENCH}-${BEDDING}-${SURROUND_GROSS})`;
const IMPORTED_BACKFILL = `max(0,${BACKFILL_PLACEMENT}-${TRENCH}*hcw_excavated_soil_reuse_fraction)`;
const EXCESS_SOIL = `max(0,${TRENCH}-min(${TRENCH}*hcw_excavated_soil_reuse_fraction,${BACKFILL_PLACEMENT}))`;
const PIPE_JOINTS = "max(0,(ceil(hcw_service_route_length_m/hcw_connection_count/hcw_installed_pipe_piece_length_m)-1)*hcw_connection_count)";
const PIPE_GROSS_NEED = "hcw_service_route_length_m*(1+hcw_pipe_expected_loss_fraction)+hcw_pipe_retained_spare_m";
const PIPE_NET_NEED = `max(0,${PIPE_GROSS_NEED}-hcw_pipe_available_stock_m)`;
const PIPE_PACKAGE_COUNT = `ceil(${PIPE_NET_NEED}/hcw_pipe_supplier_package_length_m)`;
const PIPE_ORDERED = `${PIPE_PACKAGE_COUNT}*hcw_pipe_supplier_package_length_m`;
const FLUSHING_WATER = "hcw_service_route_length_m*3.141592653589793*pow(hcw_pipe_inside_diameter_mm/1000,2)/4*hcw_flushing_volume_multiplier";

type RowSpec = Readonly<{
  rowId: string;
  section: string;
  category: string;
  title: string;
  unitId: string;
  formulaId: string;
  expression: string;
  procurement?: boolean;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE";
  inclusion?: Readonly<{ kind: "equals"; parameterId: string; value: string }>;
  titleParameterIds?: readonly string[];
}>;

const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:hcw_trench_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка траншеи сервисного ввода", unitId: "m3", formulaId: "hcw_trench_excavation_v1", expression: TRENCH, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw_bedding", section: "Материалы основания", category: "material", title: "Материал постели сервисной трубы", unitId: "m3", formulaId: "hcw_bedding_v1", expression: BEDDING, procurement: true, titleParameterIds: ["hcw_bedding_designation"] },
  { rowId: "rc09:hcw_surround", section: "Материалы основания", category: "material", title: "Материал защитной обсыпки сервисной трубы", unitId: "m3", formulaId: "hcw_surround_v1", expression: `max(0,${SURROUND_GROSS}-${PIPE_EXTERNAL_VOLUME})`, procurement: true, titleParameterIds: ["hcw_surround_designation"] },
  { rowId: "rc09:hcw_backfill_placement", section: "Земляные работы", category: "construction_work", title: "Послойная обратная засыпка и уплотнение", unitId: "m3", formulaId: "hcw_backfill_placement_v1", expression: BACKFILL_PLACEMENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw_imported_backfill", section: "Материалы основания", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "hcw_imported_backfill_v1", expression: IMPORTED_BACKFILL, procurement: true, titleParameterIds: ["hcw_imported_backfill_designation"] },
  { rowId: "rc09:hcw_excess_soil_removal", section: "Земляные работы", category: "service", title: "Лишний грунт к вывозу", unitId: "m3", formulaId: "hcw_excess_soil_v1", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc09:hcw_pipe", section: "Трубопровод", category: "material", title: "Сервисная труба с учётом закупочного баланса", unitId: "m", formulaId: "hcw_pipe_ordered_v1", expression: PIPE_ORDERED, procurement: true, titleParameterIds: ["hcw_pipe_designation"] },
  { rowId: "rc09:hcw_pipe_joint", section: "Трубопровод", category: "material", title: "Сварное соединение сервисной трубы", unitId: "pcs", formulaId: "hcw_pipe_joint_v1", expression: PIPE_JOINTS, procurement: true },
  { rowId: "rc09:hcw_fusion_consumables", section: "Расходники", category: "material", title: "Комплект очистки и подготовки сварного соединения", unitId: "set", formulaId: "hcw_fusion_consumables_v1", expression: `${PIPE_JOINTS}*hcw_fusion_consumable_set_per_joint`, procurement: true },
  { rowId: "rc09:hcw_tapping_saddle", section: "Узел врезки", category: "material", title: "Седёлка врезки в существующую магистраль", unitId: "pcs", formulaId: "hcw_tapping_saddle_v1", expression: "hcw_connection_count*hcw_tapping_saddle_per_connection", procurement: true, titleParameterIds: ["hcw_tapping_saddle_designation", "hcw_existing_main_material", "hcw_tapping_method"] },
  { rowId: "rc09:hcw_corporation_stop", section: "Узел врезки", category: "equipment", title: "Вентиль врезки", unitId: "pcs", formulaId: "hcw_corporation_stop_v1", expression: "hcw_connection_count*hcw_corporation_stop_per_connection", procurement: true, titleParameterIds: ["hcw_corporation_stop_designation"] },
  { rowId: "rc09:hcw_service_adapter", section: "Узел врезки", category: "material", title: "Переходник сервисной трубы", unitId: "pcs", formulaId: "hcw_service_adapter_v1", expression: "hcw_connection_count*hcw_service_adapter_per_connection", procurement: true, titleParameterIds: ["hcw_service_adapter_designation"] },
  { rowId: "rc09:hcw_curb_stop", section: "Наружная арматура", category: "equipment", title: "Наружный отключающий вентиль ввода", unitId: "pcs", formulaId: "hcw_curb_stop_v1", expression: "hcw_connection_count*hcw_curb_stop_per_connection", procurement: true, titleParameterIds: ["hcw_curb_stop_designation"] },
  { rowId: "rc09:hcw_valve_box", section: "Наружная арматура", category: "material", title: "Телескопический шток и уличный ковер вентиля", unitId: "set", formulaId: "hcw_valve_box_v1", expression: "hcw_connection_count*hcw_valve_box_per_connection", procurement: true, titleParameterIds: ["hcw_valve_box_designation"] },
  { rowId: "rc09:hcw_internal_stop_valve", section: "Водомерный узел", category: "equipment", title: "Внутренний запорный кран", unitId: "pcs", formulaId: "hcw_internal_stop_valve_v1", expression: "hcw_connection_count*hcw_internal_stop_valve_per_connection", procurement: true, titleParameterIds: ["hcw_internal_stop_valve_designation"] },
  { rowId: "rc09:hcw_water_meter", section: "Водомерный узел", category: "equipment", title: "Счётчик холодной воды", unitId: "pcs", formulaId: "hcw_water_meter_v1", expression: "hcw_connection_count*hcw_water_meter_per_connection", procurement: true, titleParameterIds: ["hcw_water_meter_designation"] },
  { rowId: "rc09:hcw_strainer", section: "Водомерный узел", category: "equipment", title: "Фильтр грубой очистки", unitId: "pcs", formulaId: "hcw_strainer_v1", expression: "hcw_connection_count*hcw_strainer_per_connection", procurement: true, titleParameterIds: ["hcw_strainer_designation"] },
  { rowId: "rc09:hcw_check_valve", section: "Водомерный узел", category: "equipment", title: "Обратный клапан", unitId: "pcs", formulaId: "hcw_check_valve_v1", expression: "hcw_connection_count*hcw_check_valve_per_connection", procurement: true, titleParameterIds: ["hcw_check_valve_designation"] },
  { rowId: "rc09:hcw_union", section: "Водомерный узел", category: "material", title: "Разъёмное соединение водомерного узла", unitId: "pcs", formulaId: "hcw_union_v1", expression: "hcw_connection_count*hcw_union_per_connection", procurement: true, titleParameterIds: ["hcw_union_designation"] },
  { rowId: "rc09:hcw_meter_seal", section: "Водомерный узел", category: "material", title: "Пломба водомерного узла", unitId: "pcs", formulaId: "hcw_meter_seal_v1", expression: "hcw_connection_count*hcw_meter_seal_per_connection", procurement: true },
  { rowId: "rc09:hcw_wall_sleeve", section: "Ввод в здание", category: "material", title: "Защитная гильза ввода через стену", unitId: "pcs", formulaId: "hcw_wall_sleeve_v1", expression: "hcw_connection_count*hcw_wall_sleeve_per_connection", procurement: true, titleParameterIds: ["hcw_wall_sleeve_designation"] },
  { rowId: "rc09:hcw_penetration_seal", section: "Ввод в здание", category: "material", title: "Герметичное уплотнение кольцевого пространства гильзы", unitId: "set", formulaId: "hcw_penetration_seal_v1", expression: "hcw_connection_count*hcw_penetration_seal_per_connection", procurement: true, titleParameterIds: ["hcw_penetration_seal_designation"] },
  { rowId: "rc09:hcw_entry_insulation", section: "Ввод в здание", category: "material", title: "Теплоизоляция участка ввода", unitId: "m", formulaId: "hcw_entry_insulation_v1", expression: "hcw_connection_count*hcw_entry_insulation_m_per_connection", procurement: true, titleParameterIds: ["hcw_entry_insulation_designation"] },
  { rowId: "rc09:hcw_warning_tape", section: "Трассировка", category: "material", title: "Сигнальная лента водопровода", unitId: "m", formulaId: "hcw_warning_tape_v1", expression: "hcw_service_route_length_m*hcw_warning_tape_length_factor", procurement: true, titleParameterIds: ["hcw_warning_tape_designation"] },
  { rowId: "rc09:hcw_tracer_wire", section: "Трассировка", category: "material", title: "Трассировочный провод сервисной трубы", unitId: "m", formulaId: "hcw_tracer_wire_v1", expression: "hcw_service_route_length_m*hcw_tracer_wire_length_factor", procurement: true, titleParameterIds: ["hcw_tracer_wire_designation"] },
  { rowId: "rc09:hcw_tracer_terminal", section: "Трассировка", category: "material", title: "Контактный вывод трассировочного провода", unitId: "pcs", formulaId: "hcw_tracer_terminal_v1", expression: "hcw_connection_count*hcw_tracer_terminal_per_connection", procurement: true },
  { rowId: "rc09:hcw_flushing_water", section: "Испытания и промывка", category: "material", title: "Вода для заполнения и промывки", unitId: "m3", formulaId: "hcw_flushing_water_v1", expression: FLUSHING_WATER, procurement: true },
  { rowId: "rc09:hcw_disinfection_reagent", section: "Испытания и промывка", category: "material", title: "Реагент для дезинфекции", unitId: "kg", formulaId: "hcw_disinfection_reagent_v1", expression: `${FLUSHING_WATER}*hcw_disinfection_dose_mg_l/1000/hcw_reagent_active_fraction`, procurement: true },
  { rowId: "rc09:hcw_test_closure", section: "Испытания и промывка", category: "material", title: "Временная заглушка испытательного участка", unitId: "pcs", formulaId: "hcw_test_closure_v1", expression: "hcw_connection_count*hcw_test_closure_per_connection", procurement: true },
  { rowId: "rc09:hcw_fill_air_drain_set", section: "Испытания и промывка", category: "material", title: "Комплект заполнения, выпуска воздуха и слива", unitId: "set", formulaId: "hcw_fill_air_drain_set_v1", expression: "hcw_connection_count*hcw_fill_air_drain_set_per_connection", procurement: true },
  { rowId: "rc09:hcw_pressure_measurement_set", section: "Испытания и промывка", category: "equipment", title: "Поверенный комплект измерения давления", unitId: "set", formulaId: "hcw_pressure_measurement_set_v1", expression: "hcw_connection_count*hcw_measurement_set_per_connection", procurement: true },
  { rowId: "rc09:hcw_water_sample", section: "Контроль", category: "service", title: "Отбор пробы питьевой воды", unitId: "sample", formulaId: "hcw_water_sample_v1", expression: "hcw_connection_count*hcw_sample_per_connection", procurement: true },
  { rowId: "rc09:hcw_laboratory_analysis", section: "Контроль", category: "service", title: "Лабораторный анализ питьевой воды", unitId: "analysis", formulaId: "hcw_laboratory_analysis_v1", expression: "hcw_connection_count*hcw_analysis_per_connection", procurement: true },
  { rowId: "rc09:hcw_route_marking", section: "Подготовка", category: "material", title: "Разметочные материалы трассы и точки врезки", unitId: "set", formulaId: "hcw_route_marking_v1", expression: "hcw_connection_count*hcw_route_marking_set_per_connection", procurement: true },
  { rowId: "rc09:hcw_work_zone_safety", section: "Подготовка", category: "equipment", title: "Временное ограждение и знаки рабочей зоны", unitId: "set", formulaId: "hcw_work_zone_safety_v1", expression: "hcw_connection_count*hcw_work_zone_safety_set_per_connection", procurement: true },
  { rowId: "rc09:hcw_compaction_water", section: "Земляные работы", category: "material", title: "Вода для увлажнения при уплотнении", unitId: "m3", formulaId: "hcw_compaction_water_v1", expression: `${BACKFILL_PLACEMENT}*hcw_compaction_water_m3_per_backfill_m3`, procurement: true },
  { rowId: "rc09:hcw_pressure_test", section: "Контроль", category: "service", title: "Гидравлическое испытание сервисного ввода", unitId: "m", formulaId: "hcw_pressure_test_v1", expression: "hcw_service_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw_disinfection", section: "Контроль", category: "service", title: "Промывка и дезинфекция сервисного ввода", unitId: "m", formulaId: "hcw_disinfection_v1", expression: "hcw_service_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw_asbuilt_documents", section: "Документы", category: "service", title: "Комплект исполнительной документации и акт ввода", unitId: "document", formulaId: "hcw_asbuilt_documents_v1", expression: "hcw_connection_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:hcw-survey", section: "Труд", category: "construction_work", title: "Разбивка трассы и фиксация существующей магистрали", unitId: "man_hour", formulaId: "hcw_survey_labor_v1", expression: "hcw_service_route_length_m*hcw_survey_labor_h_per_m+hcw_connection_count*hcw_survey_labor_h_per_connection" },
  { rowId: "rc09:labor:hcw-earthworks", section: "Труд", category: "construction_work", title: "Труд по земляным работам и слоям траншеи", unitId: "man_hour", formulaId: "hcw_earthworks_labor_v1", expression: `${TRENCH}*hcw_earthworks_labor_h_per_m3` },
  { rowId: "rc09:labor:hcw-pipe", section: "Труд", category: "construction_work", title: "Монтаж сервисной трубы и соединений", unitId: "man_hour", formulaId: "hcw_pipe_labor_v1", expression: `hcw_service_route_length_m*hcw_pipe_install_labor_h_per_m+${PIPE_JOINTS}*hcw_joint_labor_h_per_joint` },
  { rowId: "rc09:labor:hcw-tapping", section: "Труд", category: "construction_work", title: "Монтаж и согласованная врезка в существующую магистраль", unitId: "man_hour", formulaId: "hcw_tapping_labor_v1", expression: "hcw_connection_count*hcw_tapping_labor_h_per_connection" },
  { rowId: "rc09:labor:hcw-entry-meter", section: "Труд", category: "construction_work", title: "Монтаж ввода, герметизации и водомерного узла", unitId: "man_hour", formulaId: "hcw_entry_meter_labor_v1", expression: "hcw_connection_count*hcw_entry_meter_labor_h_per_connection" },
  { rowId: "rc09:labor:hcw-qa", section: "Труд", category: "construction_work", title: "Испытания, промывка, дезинфекция и отбор проб", unitId: "man_hour", formulaId: "hcw_qa_labor_v1", expression: "hcw_service_route_length_m*hcw_qa_labor_h_per_m+hcw_connection_count*hcw_qa_labor_h_per_connection" },
  { rowId: "rc09:labor:hcw-documents", section: "Труд", category: "construction_work", title: "Исполнительные схемы, акты и передача водомерного узла", unitId: "man_hour", formulaId: "hcw_documents_labor_v1", expression: "hcw_connection_count*hcw_documentation_labor_h_per_connection" },
  { rowId: "rc09:equipment:hcw-excavator", section: "Механизмы", category: "equipment", title: "Мини-экскаватор для траншеи", unitId: "machine_hour", formulaId: "hcw_excavator_v1", expression: `${TRENCH}/hcw_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:hcw-compactor", section: "Механизмы", category: "equipment", title: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "hcw_compactor_v1", expression: `${BACKFILL_PLACEMENT}/hcw_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:hcw-fusion", section: "Механизмы", category: "equipment", title: "Оборудование сварки сервисной трубы", unitId: "machine_hour", formulaId: "hcw_fusion_machine_v1", expression: `${PIPE_JOINTS}*hcw_fusion_machine_h_per_joint`, procurement: true },
  { rowId: "rc09:equipment:hcw-core-drill", section: "Механизмы", category: "equipment", title: "Алмазное сверление подготовленного места ввода", unitId: "machine_hour", formulaId: "hcw_core_drill_v1", expression: "hcw_connection_count*hcw_core_drill_h_per_connection", procurement: true },
  { rowId: "rc09:equipment:hcw-test-pump", section: "Механизмы", category: "equipment", title: "Насос заполнения и гидравлического испытания", unitId: "machine_hour", formulaId: "hcw_test_pump_v1", expression: `hcw_connection_count*hcw_test_pump_h_per_connection+${FLUSHING_WATER}/hcw_test_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc09:logistics:hcw-delivery", section: "Логистика", category: "service", title: "Доставка трубы, узлов и материалов", unitId: "trip", formulaId: "hcw_delivery_v1", expression: `max(1,ceil(${PIPE_ORDERED}/hcw_delivery_capacity_m_per_trip))`, procurement: true },
  { rowId: "rc09:logistics:hcw-removal", section: "Логистика", category: "service", title: "Вывоз лишнего грунта и упаковки", unitId: "trip", formulaId: "hcw_removal_v1", expression: `ceil(${EXCESS_SOIL}/hcw_removal_truck_capacity_m3)`, procurement: true },
  { rowId: "rc09:hcw-pipe-balance:installed-net", section: "Баланс трубы", category: "material", title: "Чистая длина уложенной трубы", unitId: "m", formulaId: "hcw_pipe_installed_v1", expression: "hcw_service_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:expected-loss", section: "Баланс трубы", category: "material", title: "Ожидаемая технологическая потеря трубы", unitId: "m", formulaId: "hcw_pipe_loss_v1", expression: "hcw_service_route_length_m*hcw_pipe_expected_loss_fraction", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:retained-spare", section: "Баланс трубы", category: "material", title: "Сохраняемый резерв трубы", unitId: "m", formulaId: "hcw_pipe_spare_v1", expression: "hcw_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:available-stock", section: "Баланс трубы", category: "material", title: "Подтверждённый доступный остаток", unitId: "m", formulaId: "hcw_pipe_stock_v1", expression: "hcw_pipe_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:total-need", section: "Баланс трубы", category: "material", title: "Общая потребность до учёта наличия", unitId: "m", formulaId: "hcw_pipe_total_need_v1", expression: PIPE_GROSS_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:net-order-need", section: "Баланс трубы", category: "material", title: "Чистая потребность к заказу", unitId: "m", formulaId: "hcw_pipe_net_need_v1", expression: PIPE_NET_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:package-count", section: "Баланс трубы", category: "material", title: "Количество поставочных бухт или пакетов", unitId: "pcs", formulaId: "hcw_pipe_package_count_v1", expression: PIPE_PACKAGE_COUNT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:remainder", section: "Баланс трубы", category: "material", title: "Остаток после монтажа и ожидаемой потери", unitId: "m", formulaId: "hcw_pipe_remainder_v1", expression: `hcw_pipe_available_stock_m+${PIPE_ORDERED}-hcw_service_route_length_m-hcw_service_route_length_m*hcw_pipe_expected_loss_fraction`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw-pipe-balance:surplus-beyond-spare", section: "Баланс трубы", category: "material", title: "Свободный остаток сверх сохраняемого резерва", unitId: "m", formulaId: "hcw_pipe_surplus_v1", expression: `max(0,hcw_pipe_available_stock_m+${PIPE_ORDERED}-(${PIPE_GROSS_NEED}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hcw_dewatering", section: "Условные механизмы", category: "equipment", title: "Водоотлив при устройстве ввода", unitId: "machine_hour", formulaId: "hcw_dewatering_v1", expression: "hcw_dewatering_pump_count*hcw_dewatering_duration_h", procurement: true, inclusion: { kind: "equals", parameterId: "hcw_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["hcw_dewatering_designation"] },
  { rowId: "rc09:hcw_road_restoration", section: "Условные работы", category: "construction_work", title: "Восстановление дорожного или дворового покрытия", unitId: "m2", formulaId: "hcw_road_restoration_v1", expression: "hcw_road_restoration_area_m2", inclusion: { kind: "equals", parameterId: "hcw_road_restoration_mode", value: "REQUIRED" }, titleParameterIds: ["hcw_road_restoration_designation"] },
  { rowId: "rc09:hcw_external_meter_chamber", section: "Условные сооружения", category: "material", title: "Комплект наружной водомерной камеры с основанием, люком, лестницей и герметизацией", unitId: "set", formulaId: "hcw_external_meter_chamber_v1", expression: "hcw_connection_count", procurement: true, inclusion: { kind: "equals", parameterId: "hcw_external_meter_chamber_mode", value: "REQUIRED" }, titleParameterIds: ["hcw_external_meter_chamber_designation"] },
  { rowId: "rc09:hcw_trench_support", section: "Условные материалы", category: "material", title: "Инвентарное крепление стенок траншеи", unitId: "m2", formulaId: "hcw_trench_support_v1", expression: "hcw_trench_support_length_m*hcw_trench_depth_m*2", procurement: true, inclusion: { kind: "equals", parameterId: "hcw_trench_support_mode", value: "REQUIRED" }, titleParameterIds: ["hcw_trench_support_designation"] },
]);

function formula(row: RowSpec): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(row.expression);
  return {
    formula_id: row.formulaId,
    output_unit_id: row.unitId,
    expression_source: row.expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const HOUSE_WATER_CONNECTION_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map(formula));

function sourceMetadata(): Json {
  return {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
    normativeTrace: [{
      sourceId: HOUSE_WATER_CONNECTION_SOURCE_ID,
      source_id: HOUSE_WATER_CONNECTION_SOURCE_ID,
      normId: HOUSE_WATER_CONNECTION_NORM_ID,
      norm_id: HOUSE_WATER_CONNECTION_NORM_ID,
      normVersion: HOUSE_WATER_CONNECTION_SOURCE_METADATA.source_document_version,
      source_title: HOUSE_WATER_CONNECTION_SOURCE_METADATA.source_title,
      exact_locator: HOUSE_WATER_CONNECTION_SOURCE_METADATA.exact_locator,
      source_definition_hash: HOUSE_WATER_CONNECTION_SOURCE_METADATA.definition_hash,
      sourceRole: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
    }],
    excludedUnownedAssumptions: [
      "generic length-derived hydrants, distribution valves or network chambers",
      "automatic road restoration, groundwater lowering, external meter chamber or trench support",
      "building plumbing after the meter assembly",
      "invented price",
    ],
  };
}

export const HOUSE_WATER_CONNECTION_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = {
      formulaId: row.formulaId,
      normalizedUom: row.unitId,
      semanticOwnerId: `house-water-connection:${row.rowId}`,
      costOwner: "resource",
      scopeContextParameterIds: [...ORDINARY_IDS],
      costTreatment: row.costTreatment ?? "OWN_COST",
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: [...row.titleParameterIds],
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
    };
    const metadata = sourceMetadata();
    const result: CanonicalEstimateResourceDefinition = {
      id: `resource-${row.rowId.replace(/:/gu, "-")}`,
      row_id: row.rowId,
      ordinal,
      section: row.section,
      category: row.category,
      title_ru: row.title,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: row.inclusion ?? { kind: "literal", value: true },
      resource_graph: resourceGraph,
      procurement_eligible: row.procurement ?? false,
      cost_owner_id: row.rowId,
      source_metadata: metadata,
      row_sha256: "",
    };
    return { ...result, row_sha256: estimateDeterministicHash(result) };
  }));

export const HOUSE_WATER_CONNECTION_SHORT_INPUT = Object.freeze({
  hcw_connection_count: 1,
  hcw_service_route_length_m: 28,
  hcw_pipe_material: "HDPE",
  hcw_pipe_grade: "PE100-RC",
  hcw_sdr_class: "SDR11",
  hcw_pipe_outside_diameter_mm: 32,
  hcw_pressure_class: "PN16",
  hcw_pipe_designation: "PE100-RC-SDR11-OD32-PN16",
  hcw_existing_main_material: "HDPE-PE100-RC",
  hcw_existing_main_outside_diameter_mm: 225,
});

export const HOUSE_WATER_CONNECTION_ACCEPTANCE_INPUT = Object.freeze({
  ...HOUSE_WATER_CONNECTION_SHORT_INPUT,
  ...HOUSE_WATER_CONNECTION_RUNTIME_INPUT,
});

export async function compileHouseWaterConnectionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? HOUSE_WATER_CONNECTION_CATALOG_ID;
  if (catalogId !== HOUSE_WATER_CONNECTION_CATALOG_ID) {
    throw new Error(`HOUSE_WATER_CONNECTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const serviceDiameter = Number(submittedParameters.hcw_pipe_outside_diameter_mm);
  const mainDiameter = Number(submittedParameters.hcw_existing_main_outside_diameter_mm);
  if (Number.isFinite(serviceDiameter) && Number.isFinite(mainDiameter)
    && serviceDiameter >= mainDiameter) {
    throw new Error("HOUSE_WATER_CONNECTION_SERVICE_DIAMETER_NOT_BELOW_MAIN");
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.house-water-connection-r1",
    catalogId,
    primaryMeasureParameterId: "hcw_connection_count",
    parameterDefinitions: [...HOUSE_WATER_CONNECTION_PARAMETERS],
    formulaDefinitions: [...HOUSE_WATER_CONNECTION_FORMULAS],
    resourceDefinitions: [...HOUSE_WATER_CONNECTION_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...HOUSE_WATER_CONNECTION_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: HOUSE_WATER_CONNECTION_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}

export const HOUSE_WATER_CONNECTION_KNOWN_SCOPE_PARAMETERS = Object.freeze(
  ORDINARY_PARAMETER_SPECS.map((spec) => spec.id),
);
export const HOUSE_WATER_CONNECTION_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(HOUSE_WATER_CONNECTION_RUNTIME_INPUT),
);
