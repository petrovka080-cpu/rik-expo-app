import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const FLUSHING_DISINFECTION_CATALOG_ID =
  "canonical-work:expanded:flushing_disinfection";
export const FLUSHING_DISINFECTION_SOURCE_ID =
  "project_flushing_disinfection_volume_automatic_v1";
export const FLUSHING_DISINFECTION_NORM_ID =
  "norm:project:flushing_disinfection_volume_automatic:v1";
export const FLUSHING_DISINFECTION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный объёмный профиль промывки и дезинфекции водопровода S27.26",
  source_authority: "Предварительный сценарий canonical compiler; метод промывки, доза, выдержка, лабораторный контроль и сброс требуют подтверждения проектом, оператором и санитарными требованиями",
  source_document_version: "VISIBLE_PRELIMINARY_PIPE_VOLUME_TO_FLUSHING_DISINFECTION_RESOURCES_S27_26_REQUIRES_CONFIRMATION",
  definition_hash: "e89c97023f79f2a3ee117e9c73a185553325e0e59f271bc8b46227b197b9e237",
  exact_locator: "1000 м трубопровода ID100, два изолированных участка, гипохлорит натрия 12,5%, активный хлор 50 мг/л и выдержка 24 ч; вода, реагент, временные узлы, труд и механизмы рассчитываются из восьми первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной санитарной инструкцией. Строительство и опрессовка трубопровода, устранение утечек, постоянная станция хлорирования и контактный резервуар исключены; подвоз воды, дехлорирование и вывоз стока включаются только по условным проектным ветвям.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "e89c97023f79f2a3ee117e9c73a185553325e0e59f271bc8b46227b197b9e237",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "fld_pipeline_length_m", title: "Длина промываемого трубопровода", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "fld_pipeline_internal_diameter_mm", title: "Фактический внутренний диаметр трубопровода", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "fld_pipeline_designation", title: "Обозначение трубопровода по проекту", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "fld_isolated_section_count", title: "Количество изолированных участков обработки", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "fld_disinfectant_technology", title: "Подтверждённая технология дезинфекции", valueType: "enum", unitId: null, kind: "ordinary", values: ["SODIUM_HYPOCHLORITE"] },
  { id: "fld_target_active_chlorine_mg_l", title: "Проектная концентрация активного хлора", valueType: "decimal", unitId: "mg_per_l", kind: "ordinary", min: 0.000_001 },
  { id: "fld_solution_concentration_percent", title: "Концентрация поставочного раствора гипохлорита", valueType: "decimal", unitId: "percent", kind: "ordinary", min: 0.000_001, max: 100 },
  { id: "fld_contact_time_hour", title: "Проектная продолжительность контакта", valueType: "decimal", unitId: "hour", kind: "ordinary", min: 0.000_001 },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "fld_flushing_turnovers", title: "Кратность объёма воды для промывки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 2, min: 0.000_001 },
  { id: "fld_disinfection_fill_turnovers", title: "Кратность заполнения раствором при дезинфекции", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1, min: 0.000_001 },
  { id: "fld_water_loss_fraction", title: "Запас воды на заполнение и переключения", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "fld_target_flushing_velocity_m_s", title: "Целевая скорость промывки", valueType: "decimal", unitId: "m_per_s", kind: "profile", defaultValue: 1, min: 0.000_001 },
  { id: "fld_flushing_pump_designation", title: "Марка временного промывочного насоса", valueType: "text", unitId: null, kind: "profile", defaultValue: "DIESEL-FLUSH-PUMP-40M3H-30M" },
  { id: "fld_flushing_pump_capacity_m3_h", title: "Производительность одного промывочного насоса", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 40, min: 0.000_001 },
  { id: "fld_dosing_skid_designation", title: "Марка временной установки дозирования", valueType: "text", unitId: null, kind: "profile", defaultValue: "TEMP-NAOCL-DOSING-SKID-20LPH" },
  { id: "fld_dosing_skid_piece_per_section", title: "Установок дозирования на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_fill_connection_set_per_section", title: "Временных узлов наполнения на участок", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_injection_connection_set_per_section", title: "Временных узлов ввода реагента на участок", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_drain_connection_set_per_section", title: "Временных узлов сброса на участок", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_sampling_connection_set_per_section", title: "Временных точек отбора проб на участок", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_supply_hose_designation", title: "Марка рукава подачи воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "POTABLE-WATER-HOSE-DN80-PN10" },
  { id: "fld_supply_hose_m_per_section", title: "Рукава подачи воды на участок", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 20, min: 0 },
  { id: "fld_discharge_hose_designation", title: "Марка рукава сброса", valueType: "text", unitId: null, kind: "profile", defaultValue: "FLAT-HOSE-DN100-PN10" },
  { id: "fld_discharge_hose_m_per_section", title: "Рукава сброса на участок", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 30, min: 0 },
  { id: "fld_temporary_valve_piece_per_section", title: "Временных клапанов на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "fld_backflow_preventer_piece_per_section", title: "Устройств защиты от обратного потока на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_fitting_piece_per_section", title: "Переходников и фитингов на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 12, min: 0 },
  { id: "fld_support_piece_per_hose_m", title: "Опор и фиксаторов на метр рукава", valueType: "decimal", unitId: "pcs_per_m", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "fld_consumable_set_per_section", title: "Комплектов прокладок, крепежа и расходников", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_reagent_retained_reserve_fraction", title: "Сохраняемый резерв реагента", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.1, min: 0 },
  { id: "fld_reagent_available_stock_kg", title: "Подтверждённый складской остаток реагента", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 0, min: 0 },
  { id: "fld_reagent_supplier_package_kg", title: "Масса реагента в поставочной упаковке", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 30, min: 0.000_001 },
  { id: "fld_flowmeter_piece_per_section", title: "Расходомеров на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_chlorine_meter_piece_per_section", title: "Полевых измерителей хлора на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_turbidity_meter_piece_per_section", title: "Полевых мутномеров на участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_sample_round_count", title: "Количество раундов лабораторного отбора проб", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 2, min: 1 },
  { id: "fld_sample_piece_per_section_round", title: "Проб на участок в одном раунде", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_bottle_piece_per_sample", title: "Стерильных ёмкостей на пробу", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_dpd_test_piece_per_sample", title: "Полевых DPD-тестов на пробу", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_dpd_kit_test_capacity", title: "Число тестов в комплекте DPD", valueType: "decimal", unitId: "pcs_per_set", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "fld_ppe_set_per_crew", title: "Комплектов СИЗ на бригаду", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_spill_kit_set_per_operation", title: "Комплектов локализации пролива", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "fld_crew_count", title: "Количество параллельных бригад", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 1 },
  { id: "fld_setup_labor_h_per_section", title: "Труд устройства временных узлов на участок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "fld_flushing_labor_h_per_pump_h", title: "Труд сопровождения на машино-час промывки", valueType: "decimal", unitId: "man_hour_per_machine_hour", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_dosing_labor_h_per_section", title: "Труд приготовления и дозирования на участок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 6, min: 0 },
  { id: "fld_sampling_labor_h_per_sample", title: "Труд отбора и маркировки одной пробы", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "fld_documentation_labor_h_per_section", title: "Труд оформления протоколов на участок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "fld_pump_setup_machine_h_per_section", title: "Работа оснастки при установке насоса", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "fld_pump_fuel_l_per_machine_h", title: "Топливо промывочного насоса", valueType: "decimal", unitId: "l_per_machine_hour", kind: "profile", defaultValue: 3, min: 0 },
  { id: "fld_dosing_skid_machine_h_per_section", title: "Работа дозирующей установки на участок", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "fld_test_instrument_h_per_sample", title: "Работа измерительных приборов на пробу", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "fld_water_tanker_capacity_m3", title: "Вместимость цистерны подвоза воды", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "fld_disposal_tanker_capacity_m3", title: "Вместимость цистерны вывоза стока", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "fld_reagent_package_per_delivery_trip", title: "Упаковок реагента на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 20, min: 0.000_001 },
  { id: "fld_equipment_piece_per_delivery_trip", title: "Единиц оборудования на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 8, min: 0.000_001 },
  { id: "fld_water_source_mode", title: "Источник промывочной воды", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NETWORK", values: ["NETWORK", "TANKER"] },
  { id: "fld_disposal_mode", title: "Способ отвода промывочной воды", valueType: "enum", unitId: null, kind: "profile", defaultValue: "APPROVED_DISCHARGE", values: ["APPROVED_DISCHARGE", "TANKER"] },
  { id: "fld_dechlorination_mode", title: "Дехлорирование перед сбросом требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "fld_water_tanker_designation", title: "Цистерна подвоза питьевой воды", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "fld_water_source_mode", value: "TANKER" } },
  { id: "fld_disposal_tanker_designation", title: "Цистерна сбора и вывоза промывочной воды", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "fld_disposal_mode", value: "TANKER" } },
  { id: "fld_dechlorination_reagent_designation", title: "Реагент дехлорирования", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "fld_dechlorination_mode", value: "REQUIRED" } },
  { id: "fld_dechlorination_kg_per_active_chlorine_kg", title: "Расход реагента на массу активного хлора", valueType: "decimal", unitId: "kg_per_kg", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "fld_dechlorination_mode", value: "REQUIRED" } },
]);

const AREA = "0.7853981634*(fld_pipeline_internal_diameter_mm/1000)*(fld_pipeline_internal_diameter_mm/1000)";
const VOLUME = `(${AREA})*fld_pipeline_length_m`;
const FLUSH_FLOW = `(${AREA})*fld_target_flushing_velocity_m_s*3600`;
const FLUSH_WATER = `(${VOLUME})*fld_flushing_turnovers*(1+fld_water_loss_fraction)`;
const DISINFECTION_WATER = `(${VOLUME})*fld_disinfection_fill_turnovers*(1+fld_water_loss_fraction)`;
const TOTAL_WATER = `((${FLUSH_WATER})+(${DISINFECTION_WATER}))`;
const ACTIVE_CHLORINE = `(${DISINFECTION_WATER})*fld_target_active_chlorine_mg_l/1000`;
const SOLUTION_NEED = `((${ACTIVE_CHLORINE})*100/fld_solution_concentration_percent)`;
const RETAINED_REAGENT = `((${SOLUTION_NEED})*fld_reagent_retained_reserve_fraction)`;
const TOTAL_REAGENT = `((${SOLUTION_NEED})+(${RETAINED_REAGENT}))`;
const NET_REAGENT = `max(0,(${TOTAL_REAGENT})-fld_reagent_available_stock_kg)`;
const REAGENT_PACKAGES = `ceil((${NET_REAGENT})/fld_reagent_supplier_package_kg)`;
const REAGENT_ORDER = `((${REAGENT_PACKAGES})*fld_reagent_supplier_package_kg)`;
const PUMPS = `fld_isolated_section_count*ceil((${FLUSH_FLOW})/fld_flushing_pump_capacity_m3_h)`;
const PUMP_MACHINE_H = `((${FLUSH_WATER})/fld_flushing_pump_capacity_m3_h)`;
const SUPPLY_HOSE = "fld_isolated_section_count*fld_supply_hose_m_per_section";
const DISCHARGE_HOSE = "fld_isolated_section_count*fld_discharge_hose_m_per_section";
const SAMPLES = "fld_isolated_section_count*fld_sample_round_count*fld_sample_piece_per_section_round";
const FIELD_INSTRUMENTS = "fld_isolated_section_count*(fld_flowmeter_piece_per_section+fld_chlorine_meter_piece_per_section+fld_turbidity_meter_piece_per_section)";

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc12:fld_acceptance", section: "Работы", category: "construction_work", title: "Промывка, дезинфекция, контроль и сдача водопровода", unitId: "m", formulaId: "fld_acceptance_v1", expression: "fld_pipeline_length_m", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["fld_pipeline_designation"] },
  { rowId: "rc12:fld_pipeline_volume", section: "Расчётные показатели", category: "service", title: "Внутренний объём трубопровода", unitId: "m3", formulaId: "fld_pipeline_volume_v1", expression: VOLUME, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld_required_flush_flow", section: "Расчётные показатели", category: "service", title: "Расход воды для целевой скорости промывки", unitId: "m3_per_hour", formulaId: "fld_required_flush_flow_v1", expression: FLUSH_FLOW, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld_flush_water", section: "Вода и реагенты", category: "material", title: "Вода для промывки", unitId: "m3", formulaId: "fld_flush_water_v1", expression: FLUSH_WATER, procurement: true },
  { rowId: "rc12:fld_disinfection_water", section: "Вода и реагенты", category: "material", title: "Вода для заполнения при дезинфекции", unitId: "m3", formulaId: "fld_disinfection_water_v1", expression: DISINFECTION_WATER, procurement: true },
  { rowId: "rc12:fld_total_water", section: "Расчётные показатели", category: "service", title: "Общая потребность в воде", unitId: "m3", formulaId: "fld_total_water_v1", expression: TOTAL_WATER, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld_active_chlorine", section: "Расчётные показатели", category: "service", title: "Масса активного хлора для заполнения", unitId: "kg", formulaId: "fld_active_chlorine_v1", expression: ACTIVE_CHLORINE, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld_reagent_order", section: "Вода и реагенты", category: "material", title: "Раствор гипохлорита натрия к поставке", unitId: "kg", formulaId: "fld_reagent_order_v1", expression: REAGENT_ORDER, procurement: true, titleParameterIds: ["fld_disinfectant_technology"] },
  { rowId: "rc12:fld_fill_connections", section: "Временные узлы", category: "equipment", title: "Временные узлы наполнения", unitId: "set", formulaId: "fld_fill_connections_v1", expression: "fld_isolated_section_count*fld_fill_connection_set_per_section", procurement: true },
  { rowId: "rc12:fld_injection_connections", section: "Временные узлы", category: "equipment", title: "Временные узлы ввода реагента", unitId: "set", formulaId: "fld_injection_connections_v1", expression: "fld_isolated_section_count*fld_injection_connection_set_per_section", procurement: true },
  { rowId: "rc12:fld_drain_connections", section: "Временные узлы", category: "equipment", title: "Временные узлы контролируемого сброса", unitId: "set", formulaId: "fld_drain_connections_v1", expression: "fld_isolated_section_count*fld_drain_connection_set_per_section", procurement: true },
  { rowId: "rc12:fld_sampling_connections", section: "Временные узлы", category: "equipment", title: "Временные точки отбора проб", unitId: "set", formulaId: "fld_sampling_connections_v1", expression: "fld_isolated_section_count*fld_sampling_connection_set_per_section", procurement: true },
  { rowId: "rc12:fld_supply_hose", section: "Временные трубопроводы", category: "material", title: "Рукава подачи питьевой воды", unitId: "m", formulaId: "fld_supply_hose_v1", expression: SUPPLY_HOSE, procurement: true, titleParameterIds: ["fld_supply_hose_designation"] },
  { rowId: "rc12:fld_discharge_hose", section: "Временные трубопроводы", category: "material", title: "Рукава контролируемого сброса", unitId: "m", formulaId: "fld_discharge_hose_v1", expression: DISCHARGE_HOSE, procurement: true, titleParameterIds: ["fld_discharge_hose_designation"] },
  { rowId: "rc12:fld_temporary_valves", section: "Временные узлы", category: "equipment", title: "Временная запорная арматура", unitId: "piece", formulaId: "fld_temporary_valves_v1", expression: "fld_isolated_section_count*fld_temporary_valve_piece_per_section", procurement: true },
  { rowId: "rc12:fld_backflow_preventers", section: "Временные узлы", category: "equipment", title: "Защита источника воды от обратного потока", unitId: "piece", formulaId: "fld_backflow_preventers_v1", expression: "fld_isolated_section_count*fld_backflow_preventer_piece_per_section", procurement: true },
  { rowId: "rc12:fld_fittings", section: "Временные узлы", category: "material", title: "Переходники, фитинги и соединения", unitId: "piece", formulaId: "fld_fittings_v1", expression: "fld_isolated_section_count*fld_fitting_piece_per_section", procurement: true },
  { rowId: "rc12:fld_hose_supports", section: "Временные трубопроводы", category: "material", title: "Опоры и фиксаторы временных рукавов", unitId: "piece", formulaId: "fld_hose_supports_v1", expression: `ceil(((${SUPPLY_HOSE})+(${DISCHARGE_HOSE}))*fld_support_piece_per_hose_m)`, procurement: true },
  { rowId: "rc12:fld_consumables", section: "Расходные материалы", category: "material", title: "Прокладки, крепёж, маркировка и монтажные расходники", unitId: "set", formulaId: "fld_consumables_v1", expression: "fld_isolated_section_count*fld_consumable_set_per_section", procurement: true },
  { rowId: "rc12:fld_flushing_pumps", section: "Оборудование", category: "equipment", title: "Временные промывочные насосы", unitId: "piece", formulaId: "fld_flushing_pumps_v1", expression: PUMPS, procurement: true, titleParameterIds: ["fld_flushing_pump_designation"] },
  { rowId: "rc12:fld_dosing_skids", section: "Оборудование", category: "equipment", title: "Временные установки дозирования гипохлорита", unitId: "piece", formulaId: "fld_dosing_skids_v1", expression: "fld_isolated_section_count*fld_dosing_skid_piece_per_section", procurement: true, titleParameterIds: ["fld_dosing_skid_designation"] },
  { rowId: "rc12:fld_flowmeters", section: "Контроль", category: "equipment", title: "Временные расходомеры", unitId: "piece", formulaId: "fld_flowmeters_v1", expression: "fld_isolated_section_count*fld_flowmeter_piece_per_section", procurement: true },
  { rowId: "rc12:fld_chlorine_meters", section: "Контроль", category: "equipment", title: "Полевые измерители свободного хлора", unitId: "piece", formulaId: "fld_chlorine_meters_v1", expression: "fld_isolated_section_count*fld_chlorine_meter_piece_per_section", procurement: true },
  { rowId: "rc12:fld_turbidity_meters", section: "Контроль", category: "equipment", title: "Полевые мутномеры", unitId: "piece", formulaId: "fld_turbidity_meters_v1", expression: "fld_isolated_section_count*fld_turbidity_meter_piece_per_section", procurement: true },
  { rowId: "rc12:fld_sample_bottles", section: "Лабораторный контроль", category: "material", title: "Стерильные ёмкости и консервация проб", unitId: "piece", formulaId: "fld_sample_bottles_v1", expression: `(${SAMPLES})*fld_bottle_piece_per_sample`, procurement: true },
  { rowId: "rc12:fld_dpd_kits", section: "Лабораторный контроль", category: "material", title: "Комплекты реагентов DPD", unitId: "set", formulaId: "fld_dpd_kits_v1", expression: `ceil(((${SAMPLES})*fld_dpd_test_piece_per_sample)/fld_dpd_kit_test_capacity)`, procurement: true },
  { rowId: "rc12:fld_lab_analyses", section: "Лабораторный контроль", category: "service", title: "Химические и микробиологические анализы воды", unitId: "piece", formulaId: "fld_lab_analyses_v1", expression: SAMPLES, procurement: true },
  { rowId: "rc12:fld_ppe", section: "Безопасность", category: "material", title: "Комплекты СИЗ для работы с реагентом", unitId: "set", formulaId: "fld_ppe_v1", expression: "fld_crew_count*fld_ppe_set_per_crew", procurement: true },
  { rowId: "rc12:fld_spill_kits", section: "Безопасность", category: "material", title: "Комплекты локализации пролива", unitId: "set", formulaId: "fld_spill_kits_v1", expression: "fld_spill_kit_set_per_operation", procurement: true },
  { rowId: "rc12:labor:fld-setup", section: "Труд", category: "labor", title: "Монтаж и демонтаж временных узлов", unitId: "man_hour", formulaId: "fld_setup_labor_v1", expression: "fld_isolated_section_count*fld_setup_labor_h_per_section", procurement: true },
  { rowId: "rc12:labor:fld-flushing", section: "Труд", category: "labor", title: "Сопровождение промывки и переключений", unitId: "man_hour", formulaId: "fld_flushing_labor_v1", expression: `(${PUMP_MACHINE_H})*fld_flushing_labor_h_per_pump_h`, procurement: true },
  { rowId: "rc12:labor:fld-dosing", section: "Труд", category: "labor", title: "Приготовление, дозирование и выдержка", unitId: "man_hour", formulaId: "fld_dosing_labor_v1", expression: "fld_isolated_section_count*fld_dosing_labor_h_per_section", procurement: true },
  { rowId: "rc12:labor:fld-sampling", section: "Труд", category: "labor", title: "Отбор, маркировка и доставка проб", unitId: "man_hour", formulaId: "fld_sampling_labor_v1", expression: `(${SAMPLES})*fld_sampling_labor_h_per_sample`, procurement: true },
  { rowId: "rc12:labor:fld-documentation", section: "Труд", category: "labor", title: "Оформление журналов, актов и протоколов", unitId: "man_hour", formulaId: "fld_documentation_labor_v1", expression: "fld_isolated_section_count*fld_documentation_labor_h_per_section", procurement: true },
  { rowId: "rc12:equipment:fld-pumps", section: "Механизмы", category: "equipment", title: "Работа промывочных насосов", unitId: "machine_hour", formulaId: "fld_pump_machine_h_v1", expression: PUMP_MACHINE_H, procurement: true },
  { rowId: "rc12:equipment:fld-pump-setup", section: "Механизмы", category: "equipment", title: "Оснастка установки и обвязки насосов", unitId: "machine_hour", formulaId: "fld_pump_setup_machine_h_v1", expression: "fld_isolated_section_count*fld_pump_setup_machine_h_per_section", procurement: true },
  { rowId: "rc12:equipment:fld-dosing", section: "Механизмы", category: "equipment", title: "Работа временной дозирующей установки", unitId: "machine_hour", formulaId: "fld_dosing_machine_h_v1", expression: "fld_isolated_section_count*fld_dosing_skid_machine_h_per_section", procurement: true },
  { rowId: "rc12:equipment:fld-test", section: "Механизмы", category: "equipment", title: "Работа полевых контрольных приборов", unitId: "machine_hour", formulaId: "fld_test_machine_h_v1", expression: `(${SAMPLES})*fld_test_instrument_h_per_sample`, procurement: true },
  { rowId: "rc12:fld_pump_fuel", section: "Расходные материалы", category: "material", title: "Топливо промывочных насосов", unitId: "l", formulaId: "fld_pump_fuel_v1", expression: `(${PUMP_MACHINE_H})*fld_pump_fuel_l_per_machine_h`, procurement: true },
  { rowId: "rc12:fld_contact_hold", section: "Технологический цикл", category: "service", title: "Контролируемая выдержка дезинфицирующего раствора", unitId: "hour", formulaId: "fld_contact_hold_v1", expression: "fld_isolated_section_count*fld_contact_time_hour", procurement: true },
  { rowId: "rc12:fld_asbuilt", section: "Контроль качества", category: "service", title: "Журнал промывки, акты, схемы и паспорта", unitId: "set", formulaId: "fld_asbuilt_v1", expression: "fld_isolated_section_count", procurement: true },
  { rowId: "rc12:fld_acceptance_protocol", section: "Контроль качества", category: "service", title: "Итоговый протокол лабораторного допуска", unitId: "set", formulaId: "fld_acceptance_protocol_v1", expression: "fld_isolated_section_count", procurement: true },
  { rowId: "rc12:logistics:fld-reagent", section: "Логистика", category: "service", title: "Доставка реагента и лабораторных расходников", unitId: "trip", formulaId: "fld_reagent_delivery_v1", expression: `ceil((${REAGENT_PACKAGES})/fld_reagent_package_per_delivery_trip)`, procurement: true },
  { rowId: "rc12:logistics:fld-equipment", section: "Логистика", category: "service", title: "Доставка насосов, рукавов и контрольного оборудования", unitId: "trip", formulaId: "fld_equipment_delivery_v1", expression: `ceil(((${PUMPS})+(${FIELD_INSTRUMENTS})+fld_isolated_section_count)/fld_equipment_piece_per_delivery_trip)`, procurement: true },
  { rowId: "rc12:fld-reagent-balance:installed", section: "Баланс реагента", category: "material", title: "Раствор для проектной концентрации", unitId: "kg", formulaId: "fld_reagent_installed_v1", expression: SOLUTION_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:retained-spare", section: "Баланс реагента", category: "material", title: "Сохраняемый резерв реагента", unitId: "kg", formulaId: "fld_reagent_spare_v1", expression: RETAINED_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:available-stock", section: "Баланс реагента", category: "material", title: "Подтверждённый складской остаток", unitId: "kg", formulaId: "fld_reagent_stock_v1", expression: "fld_reagent_available_stock_kg", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:total-need", section: "Баланс реагента", category: "material", title: "Общая потребность в реагенте", unitId: "kg", formulaId: "fld_reagent_total_need_v1", expression: TOTAL_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:net-order-need", section: "Баланс реагента", category: "material", title: "Чистая потребность к заказу", unitId: "kg", formulaId: "fld_reagent_net_need_v1", expression: NET_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:package-count", section: "Баланс реагента", category: "material", title: "Количество поставочных упаковок", unitId: "piece", formulaId: "fld_reagent_packages_v1", expression: REAGENT_PACKAGES, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:remainder", section: "Баланс реагента", category: "material", title: "Остаток после приготовления раствора", unitId: "kg", formulaId: "fld_reagent_remainder_v1", expression: `fld_reagent_available_stock_kg+(${REAGENT_ORDER})-(${SOLUTION_NEED})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld-reagent-balance:surplus-beyond-spare", section: "Баланс реагента", category: "material", title: "Свободный остаток сверх резерва", unitId: "kg", formulaId: "fld_reagent_surplus_v1", expression: `max(0,fld_reagent_available_stock_kg+(${REAGENT_ORDER})-(${TOTAL_REAGENT}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc12:fld_water_tanker", section: "Условная логистика", category: "service", title: "Подвоз питьевой воды автоцистернами", unitId: "trip", formulaId: "fld_water_tanker_v1", expression: `ceil((${TOTAL_WATER})/fld_water_tanker_capacity_m3)`, procurement: true, inclusion: { kind: "equals", parameterId: "fld_water_source_mode", value: "TANKER" }, titleParameterIds: ["fld_water_tanker_designation"] },
  { rowId: "rc12:fld_disposal_tanker", section: "Условная логистика", category: "service", title: "Сбор и вывоз промывочной воды", unitId: "trip", formulaId: "fld_disposal_tanker_v1", expression: `ceil((${TOTAL_WATER})/fld_disposal_tanker_capacity_m3)`, procurement: true, inclusion: { kind: "equals", parameterId: "fld_disposal_mode", value: "TANKER" }, titleParameterIds: ["fld_disposal_tanker_designation"] },
  { rowId: "rc12:fld_dechlorination_reagent", section: "Условные материалы", category: "material", title: "Реагент дехлорирования перед сбросом", unitId: "kg", formulaId: "fld_dechlorination_v1", expression: `(${ACTIVE_CHLORINE})*fld_dechlorination_kg_per_active_chlorine_kg`, procurement: true, inclusion: { kind: "equals", parameterId: "fld_dechlorination_mode", value: "REQUIRED" }, titleParameterIds: ["fld_dechlorination_reagent_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.flushing-disinfection-r1.automatic-s27-26",
  semanticOwner: "flushing-disinfection",
  sourceId: FLUSHING_DISINFECTION_SOURCE_ID,
  normId: FLUSHING_DISINFECTION_NORM_ID,
  sourceMetadata: FLUSHING_DISINFECTION_SOURCE_METADATA,
  applicabilityRu: "Промывка, заполнение раствором гипохлорита натрия, выдержка, повторная промывка, отбор проб и лабораторный допуск уже смонтированного питьевого водопровода после успешной опрессовки.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "pipeline construction, excavation, bedding, permanent valves, chambers and hydrants",
    "hydrostatic pressure testing and leak repair",
    "permanent chlorination station and contact reservoir",
    "automatic disinfectant technology, concentration or contact-time selection",
    "automatic discharge, dechlorination or tanker assumption",
    "invented price or manufacturer performance",
  ],
});

export const FLUSHING_DISINFECTION_PARAMETERS = definition.parameters;
export const FLUSHING_DISINFECTION_FORMULAS = definition.formulas;
export const FLUSHING_DISINFECTION_RESOURCES = definition.resources;
export const FLUSHING_DISINFECTION_RUNTIME_INPUT = definition.runtimeInput;
export const FLUSHING_DISINFECTION_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const FLUSHING_DISINFECTION_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const FLUSHING_DISINFECTION_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;

function promptDecimal(value: string | undefined): string | undefined {
  return value?.replace(",", ".");
}

export function parseFlushingDisinfectionOrdinaryPromptR1(
  prompt: string,
): Record<string, string> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
  const entries: Record<string, string | undefined> = {
    fld_pipeline_length_m: promptDecimal(
      /(?:длин\p{L}*|протяж[её]нност\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*м/iu.exec(normalized)?.[1]
      ?? /(\d+(?:[,.]\d+)?)\s*м\s+трубопровод/iu.exec(normalized)?.[1],
    ),
    fld_pipeline_internal_diameter_mm: promptDecimal(
      /внутренн\p{L}*\s+диаметр\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мм/iu.exec(normalized)?.[1],
    ),
    fld_pipeline_designation: new RegExp(
      `трубопровод\\p{L}*\\s+${identifier}\\s+(?:длин|протяж)`, "iu",
    ).exec(normalized)?.[1],
    fld_isolated_section_count: /(\d+)\s+изолированн\p{L}*\s+участ/iu.exec(normalized)?.[1],
    fld_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(normalized)
      ? "SODIUM_HYPOCHLORITE" : undefined,
    fld_target_active_chlorine_mg_l: promptDecimal(
      /активн\p{L}*\s+хлор\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(normalized)?.[1],
    ),
    fld_solution_concentration_percent: promptDecimal(
      /(?:раствор\p{L}*\s+)?(?:концентрац\p{L}*|крепост\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(normalized)?.[1],
    ),
    fld_contact_time_hour: promptDecimal(
      /(?:контакт\p{L}*|выдержк\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*(?:ч|час)/iu
        .exec(normalized)?.[1],
    ),
  };
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => entry[1] != null),
  );
}

export const FLUSHING_DISINFECTION_SHORT_INPUT = Object.freeze({
  fld_pipeline_length_m: 1000,
  fld_pipeline_internal_diameter_mm: 100,
  fld_pipeline_designation: "PE100-RC-SDR17-OD110-ID100",
  fld_isolated_section_count: 2,
  fld_disinfectant_technology: "SODIUM_HYPOCHLORITE",
  fld_target_active_chlorine_mg_l: 50,
  fld_solution_concentration_percent: 12.5,
  fld_contact_time_hour: 24,
});

export const FLUSHING_DISINFECTION_ACCEPTANCE_INPUT = Object.freeze({
  ...FLUSHING_DISINFECTION_SHORT_INPUT,
  ...FLUSHING_DISINFECTION_RUNTIME_INPUT,
});

export async function compileFlushingDisinfectionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FLUSHING_DISINFECTION_CATALOG_ID;
  if (catalogId !== FLUSHING_DISINFECTION_CATALOG_ID) {
    throw new Error(`FLUSHING_DISINFECTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.flushing-disinfection-volume-automatic-s27-26-r1",
    catalogId,
    primaryMeasureParameterId: "fld_pipeline_length_m",
    definition,
    submittedParameters,
  });
}
