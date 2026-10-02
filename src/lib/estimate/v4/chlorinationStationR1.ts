import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const CHLORINATION_STATION_CATALOG_ID =
  "canonical-work:expanded:chlorination_station";
export const CHLORINATION_STATION_SOURCE_ID =
  "project_chlorination_station_hypochlorite_automatic_v1";
export const CHLORINATION_STATION_NORM_ID =
  "norm:project:chlorination_station_hypochlorite_automatic:v1";
export const CHLORINATION_STATION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный профиль станции дозирования гипохлорита натрия S27.26",
  source_authority: "Предварительный сценарий canonical compiler; технология обеззараживания, строительная часть, оборудование и удельные нормы требуют подтверждения проектом и поставщиком",
  source_document_version: "VISIBLE_PRELIMINARY_HYPOCHLORITE_STATION_GEOMETRY_TO_RESOURCES_S27_26_REQUIRES_CONFIRMATION",
  definition_hash: "9c16ca2bd86064e61c41090c6e6f8107efb5d682673dfe49adc493fa20fff1f2",
  exact_locator: "CHL-NAOCL-1000-1IP: одна станция 1000 м3/сут, гипохлорит натрия 12,5%, доза 2 мг/л, один ввод и пакет DS-NAOCL-2X15LPH-PVC; ресурсы рассчитываются из восьми первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной нормой или проектом. Газовый хлор, электролиз, иные реагенты, контактный резервуар, соседние блоки очистки и наружные сети исключены; крепление котлована, водопонижение и резервное питание включаются только по условным проектным ветвям.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "9c16ca2bd86064e61c41090c6e6f8107efb5d682673dfe49adc493fa20fff1f2",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "chl_station_count", title: "Количество станций хлорирования", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "chl_station_designation", title: "Обозначение выбранной станции", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "chl_design_flow_m3_day", title: "Расчётный расход одной станции", valueType: "decimal", unitId: "m3_day", kind: "ordinary", min: 0.000_001 },
  { id: "chl_disinfectant_technology", title: "Подтверждённая технология обеззараживания", valueType: "enum", unitId: null, kind: "ordinary", values: ["SODIUM_HYPOCHLORITE"] },
  { id: "chl_design_dose_mg_l", title: "Расчётная доза активного хлора", valueType: "decimal", unitId: "mg_per_l", kind: "ordinary", min: 0.000_001 },
  { id: "chl_solution_concentration_percent", title: "Концентрация поставочного раствора гипохлорита", valueType: "decimal", unitId: "percent", kind: "ordinary", min: 0.000_001, max: 100 },
  { id: "chl_dosing_package_designation", title: "Обозначение выбранного дозирующего пакета", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "chl_injection_point_count", title: "Количество точек ввода на одну станцию", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "chl_building_length_m", title: "Длина технологического здания", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 6, min: 0.000_001 },
  { id: "chl_building_width_m", title: "Ширина технологического здания", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 4, min: 0.000_001 },
  { id: "chl_building_clear_height_m", title: "Чистая высота технологического здания", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 3, min: 0.000_001 },
  { id: "chl_excavation_depth_m", title: "Глубина разработки под здание", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.6, min: 0.000_001 },
  { id: "chl_excavation_clearance_m", title: "Рабочий зазор котлована", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "chl_blinding_thickness_m", title: "Толщина бетонной подготовки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "chl_blinding_designation", title: "Марка бетонной подготовки", valueType: "text", unitId: null, kind: "profile", defaultValue: "B7.5-W4" },
  { id: "chl_slab_thickness_m", title: "Толщина фундаментной плиты", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.2, min: 0.000_001 },
  { id: "chl_bund_wall_thickness_m", title: "Толщина стенки аварийного поддона", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.2, min: 0.000_001 },
  { id: "chl_bund_height_m", title: "Высота стенки аварийного поддона", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0.000_001 },
  { id: "chl_concrete_designation", title: "Марка конструкционного бетона", valueType: "text", unitId: null, kind: "profile", defaultValue: "B25-W8-F150" },
  { id: "chl_concrete_expected_loss_fraction", title: "Технологический запас бетона", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "chl_reinforcement_designation", title: "Класс арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "A500C" },
  { id: "chl_reinforcement_kg_per_concrete_m3", title: "Арматура на объём железобетона", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 120, min: 0 },
  { id: "chl_formwork_designation", title: "Система опалубки", valueType: "text", unitId: null, kind: "profile", defaultValue: "PANEL-FORMWORK-CHEMICAL-BUND" },
  { id: "chl_floor_coating_designation", title: "Химстойкое покрытие пола и поддона", valueType: "text", unitId: null, kind: "profile", defaultValue: "EPOXY-NOVOLAC-NAOCL-RESISTANT" },
  { id: "chl_structural_steel_designation", title: "Металлокаркас здания", valueType: "text", unitId: null, kind: "profile", defaultValue: "S355-HDG-CHEMICAL-ROOM-FRAME" },
  { id: "chl_structural_steel_kg_per_floor_m2", title: "Металлокаркас на площадь здания", valueType: "decimal", unitId: "kg_per_m2", kind: "profile", defaultValue: 28, min: 0 },
  { id: "chl_wall_panel_designation", title: "Стеновые панели химического помещения", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHEMICAL-RESISTANT-SANDWICH-PANEL-100MM" },
  { id: "chl_roof_panel_designation", title: "Кровельные панели", valueType: "text", unitId: null, kind: "profile", defaultValue: "MINERAL-WOOL-ROOF-PANEL-150MM" },
  { id: "chl_door_designation", title: "Химстойкая наружная дверь", valueType: "text", unitId: null, kind: "profile", defaultValue: "FRP-OUTWARD-OPENING-CHEMICAL-DOOR" },
  { id: "chl_door_piece_per_station", title: "Дверей на станцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_excavated_soil_reuse_fraction", title: "Доля грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.7, min: 0, max: 1 },
  { id: "chl_excavated_soil_swell_factor", title: "Коэффициент разрыхления грунта", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "chl_imported_backfill_designation", title: "Материал привозной обратной засыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "SELECTED-SAND-GRAVEL-BACKFILL" },
  { id: "chl_storage_days", title: "Расчётный запас раствора", valueType: "decimal", unitId: "day", kind: "profile", defaultValue: 15, min: 0.000_001 },
  { id: "chl_solution_density_kg_l", title: "Плотность поставочного раствора", valueType: "decimal", unitId: "kg_per_l", kind: "profile", defaultValue: 1.2, min: 0.000_001 },
  { id: "chl_tank_designation", title: "Марка химстойкой ёмкости хранения", valueType: "text", unitId: null, kind: "profile", defaultValue: "HDPE-NAOCL-TANK-1M3-BUNDED" },
  { id: "chl_tank_usable_capacity_m3", title: "Полезный объём одной ёмкости", valueType: "decimal", unitId: "m3", kind: "profile", defaultValue: 1, min: 0.000_001 },
  { id: "chl_transfer_pump_designation", title: "Марка насоса разгрузки и перекачки", valueType: "text", unitId: null, kind: "profile", defaultValue: "MAG-DRIVE-NAOCL-TRANSFER-PUMP" },
  { id: "chl_transfer_pump_piece_per_station", title: "Насосов перекачки на станцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_dosing_pump_piece_per_injection", title: "Дозирующих насосов на точку, включая резерв", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 1 },
  { id: "chl_calibration_column_piece_per_pump", title: "Калибровочных колонн на дозирующий насос", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_pulsation_damper_piece_per_pump", title: "Гасителей пульсаций на насос", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_backpressure_valve_piece_per_pump", title: "Клапанов противодавления на насос", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_relief_valve_piece_per_pump", title: "Предохранительных клапанов на насос", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_strainer_piece_per_pump", title: "Всасывающих фильтров на насос", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_injection_quill_piece_per_point", title: "Узлов ввода на точку дозирования", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_process_pipe_designation", title: "Марка трубопровода гипохлорита", valueType: "text", unitId: null, kind: "profile", defaultValue: "PVC-U-PN10-NAOCL-SERVICE" },
  { id: "chl_process_pipe_m_per_injection", title: "Трубопровода на точку ввода", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 12, min: 0 },
  { id: "chl_fitting_piece_per_pipe_m", title: "Фитингов на метр трубопровода", valueType: "decimal", unitId: "pcs_per_m", kind: "profile", defaultValue: 0.35, min: 0 },
  { id: "chl_valve_piece_per_injection", title: "Запорных и обратных клапанов на точку ввода", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 3, min: 0 },
  { id: "chl_support_piece_per_pipe_m", title: "Опор на метр трубопровода", valueType: "decimal", unitId: "pcs_per_m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "chl_process_consumable_set_per_station", title: "Монтажных расходных комплектов на станцию", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_exhaust_fan_designation", title: "Марка химстойкого вытяжного вентилятора", valueType: "text", unitId: null, kind: "profile", defaultValue: "FRP-EXHAUST-FAN-1000M3H" },
  { id: "chl_air_changes_per_hour", title: "Расчётная кратность воздухообмена", valueType: "decimal", unitId: "per_hour", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "chl_fan_capacity_m3_h", title: "Производительность одного вентилятора", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 1000, min: 0.000_001 },
  { id: "chl_duct_designation", title: "Марка химстойкого воздуховода", valueType: "text", unitId: null, kind: "profile", defaultValue: "FRP-CHEMICAL-EXHAUST-DUCT" },
  { id: "chl_duct_m_per_station", title: "Воздуховода на станцию", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 12, min: 0 },
  { id: "chl_gas_detector_designation", title: "Сигнализатор выделения хлора", valueType: "text", unitId: null, kind: "profile", defaultValue: "CL2-FIXED-GAS-DETECTOR-ALARM" },
  { id: "chl_gas_detector_piece_per_station", title: "Сигнализаторов на станцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_eyewash_designation", title: "Аварийный душ и фонтан для глаз", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHEMICAL-SAFETY-SHOWER-EYEWASH" },
  { id: "chl_spill_kit_designation", title: "Комплект локализации пролива", valueType: "text", unitId: null, kind: "profile", defaultValue: "NAOCL-COMPATIBLE-SPILL-KIT" },
  { id: "chl_ppe_set_per_station", title: "Комплектов химзащиты на станцию", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "chl_level_instrument_piece_per_tank", title: "Датчиков уровня на ёмкость", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_flowmeter_piece_per_injection", title: "Расходомеров раствора на точку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_residual_analyzer_piece_per_injection", title: "Анализаторов остаточного хлора на точку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_control_panel_designation", title: "Шкаф управления и автоматизации", valueType: "text", unitId: null, kind: "profile", defaultValue: "PLC-DOSING-PANEL-NAOCL-1IP" },
  { id: "chl_power_cable_designation", title: "Марка силового кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "N2XH-0.6/1KV-CHEMICAL-ROOM" },
  { id: "chl_power_cable_m_per_driven_unit", title: "Силового кабеля на приводной агрегат", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 25, min: 0 },
  { id: "chl_control_cable_designation", title: "Марка контрольного кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "LSZH-INSTRUMENTATION-CABLE" },
  { id: "chl_control_cable_m_per_instrument", title: "Контрольного кабеля на прибор", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 20, min: 0 },
  { id: "chl_cable_tray_designation", title: "Система кабельных лотков", valueType: "text", unitId: null, kind: "profile", defaultValue: "FRP-CABLE-TRAY-CHEMICAL-ROOM" },
  { id: "chl_cable_tray_fraction_of_total_cable", title: "Доля кабельной трассы в лотке", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.4, min: 0, max: 1 },
  { id: "chl_earthing_designation", title: "Система заземления", valueType: "text", unitId: null, kind: "profile", defaultValue: "CU-BARE-25MM2-EARTHING" },
  { id: "chl_earthing_m_per_station", title: "Заземляющего проводника на станцию", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 20, min: 0 },
  { id: "chl_lighting_designation", title: "Химстойкие светильники", valueType: "text", unitId: null, kind: "profile", defaultValue: "LED-IP66-CHEMICAL-ROOM" },
  { id: "chl_lighting_piece_per_floor_m2", title: "Светильников на площадь пола", valueType: "decimal", unitId: "pcs_per_m2", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "chl_electrical_consumable_set_per_station", title: "Электромонтажных расходных комплектов", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "chl_flushing_water_m3_per_station", title: "Вода для промывки и испытаний", valueType: "decimal", unitId: "m3_per_system", kind: "profile", defaultValue: 5, min: 0 },
  { id: "chl_calibration_standard_l_per_injection", title: "Калибровочные растворы на точку ввода", valueType: "decimal", unitId: "l_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "chl_reagent_retained_reserve_days", title: "Сохраняемый оперативный резерв реагента", valueType: "decimal", unitId: "day", kind: "profile", defaultValue: 3, min: 0 },
  { id: "chl_reagent_available_stock_kg", title: "Подтверждённый складской остаток реагента", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 0, min: 0 },
  { id: "chl_reagent_supplier_package_kg", title: "Масса реагента в поставочной упаковке", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 30, min: 0.000_001 },
  { id: "chl_civil_labor_h_per_concrete_m3", title: "Труд общестроительных работ на бетон", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 8, min: 0 },
  { id: "chl_process_labor_h_per_pipe_m", title: "Труд монтажа технологического трубопровода", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 1.2, min: 0 },
  { id: "chl_equipment_labor_h_per_piece", title: "Труд монтажа единицы оборудования", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 6, min: 0 },
  { id: "chl_electrical_labor_h_per_cable_m", title: "Труд монтажа кабельной сети", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.22, min: 0 },
  { id: "chl_commissioning_labor_h_per_station", title: "Труд пусконаладки одной станции", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 32, min: 0 },
  { id: "chl_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 18, min: 0.000_001 },
  { id: "chl_compactor_productivity_m3_h", title: "Производительность уплотнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 14, min: 0.000_001 },
  { id: "chl_concrete_pump_productivity_m3_h", title: "Производительность бетононасоса", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 14, min: 0.000_001 },
  { id: "chl_crane_h_per_equipment_piece", title: "Работа крана на единицу оборудования", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "chl_jointing_h_per_pipe_m", title: "Работа оборудования для соединения труб", valueType: "decimal", unitId: "machine_hour_per_m", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "chl_test_equipment_h_per_station", title: "Испытательное оборудование на станцию", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "chl_concrete_delivery_capacity_m3_trip", title: "Вместимость рейса бетона", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 7, min: 0.000_001 },
  { id: "chl_reagent_package_per_delivery_trip", title: "Упаковок реагента на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 20, min: 0.000_001 },
  { id: "chl_equipment_piece_per_delivery_trip", title: "Единиц оборудования на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 6, min: 0.000_001 },
  { id: "chl_soil_truck_capacity_m3", title: "Вместимость рейса вывоза грунта", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "chl_excavation_shoring_mode", title: "Крепление котлована требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "chl_groundwater_dewatering_mode", title: "Строительное водопонижение требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "chl_standby_power_mode", title: "Резервное питание входит в границу", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "chl_excavation_shoring_designation", title: "Система крепления котлована", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "chl_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "chl_excavation_shoring_area_m2", title: "Площадь крепления котлована", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "chl_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "chl_groundwater_dewatering_designation", title: "Система водопонижения", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "chl_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "chl_groundwater_dewatering_machine_h", title: "Работа системы водопонижения", valueType: "decimal", unitId: "machine_hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "chl_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "chl_standby_power_designation", title: "Комплект резервного питания", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "chl_standby_power_mode", value: "REQUIRED" } },
  { id: "chl_standby_power_kva", title: "Номинальная мощность резервного питания", valueType: "decimal", unitId: "kva", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "chl_standby_power_mode", value: "REQUIRED" } },
]);

const FLOOR = "chl_station_count*chl_building_length_m*chl_building_width_m";
const PERIMETER = "2*(chl_building_length_m+chl_building_width_m)";
const EXCAVATION = "chl_station_count*(chl_building_length_m+2*chl_excavation_clearance_m)*(chl_building_width_m+2*chl_excavation_clearance_m)*chl_excavation_depth_m";
const BLINDING = "chl_station_count*chl_building_length_m*chl_building_width_m*chl_blinding_thickness_m";
const CONCRETE_NET = `chl_station_count*(chl_building_length_m*chl_building_width_m*chl_slab_thickness_m+(${PERIMETER})*chl_bund_wall_thickness_m*chl_bund_height_m)`;
const CONCRETE_ORDER = `(${CONCRETE_NET})*(1+chl_concrete_expected_loss_fraction)`;
const BACKFILL = `max(0,(${EXCAVATION})-(${BLINDING})-(${CONCRETE_NET}))`;
const EXCESS_SOIL = `max(0,(${EXCAVATION})*chl_excavated_soil_swell_factor-(${BACKFILL})*chl_excavated_soil_reuse_fraction)`;
const ACTIVE_KG_DAY = "chl_station_count*chl_design_flow_m3_day*chl_design_dose_mg_l/1000";
const SOLUTION_KG_DAY = `((${ACTIVE_KG_DAY})*100/chl_solution_concentration_percent)`;
const SOLUTION_L_DAY = `((${SOLUTION_KG_DAY})/chl_solution_density_kg_l)`;
const STORAGE_M3 = `((${SOLUTION_L_DAY})*chl_storage_days/1000)`;
const TANKS = `chl_station_count*ceil((chl_design_flow_m3_day*chl_design_dose_mg_l/1000*100/chl_solution_concentration_percent/chl_solution_density_kg_l*chl_storage_days/1000)/chl_tank_usable_capacity_m3)`;
const INITIAL_REAGENT = `((${SOLUTION_KG_DAY})*chl_storage_days)`;
const RETAINED_REAGENT = `((${SOLUTION_KG_DAY})*chl_reagent_retained_reserve_days)`;
const TOTAL_REAGENT = `((${INITIAL_REAGENT})+(${RETAINED_REAGENT}))`;
const NET_REAGENT = `max(0,(${TOTAL_REAGENT})-chl_reagent_available_stock_kg)`;
const REAGENT_PACKAGES = `ceil((${NET_REAGENT})/chl_reagent_supplier_package_kg)`;
const REAGENT_ORDER = `((${REAGENT_PACKAGES})*chl_reagent_supplier_package_kg)`;
const INJECTION_POINTS = "chl_station_count*chl_injection_point_count";
const DOSING_PUMPS = `((${INJECTION_POINTS})*chl_dosing_pump_piece_per_injection)`;
const TRANSFER_PUMPS = "chl_station_count*chl_transfer_pump_piece_per_station";
const PROCESS_PIPE = `((${INJECTION_POINTS})*chl_process_pipe_m_per_injection)`;
const TANK_INSTRUMENTS = `((${TANKS})*chl_level_instrument_piece_per_tank)`;
const INJECTION_INSTRUMENTS = `((${INJECTION_POINTS})*(chl_flowmeter_piece_per_injection+chl_residual_analyzer_piece_per_injection))`;
const DRIVEN_UNITS = `((${DOSING_PUMPS})+(${TRANSFER_PUMPS}))`;
const POWER_CABLE = `((${DRIVEN_UNITS})*chl_power_cable_m_per_driven_unit)`;
const CONTROL_CABLE = `((${TANK_INSTRUMENTS})+(${INJECTION_INSTRUMENTS})+(${DRIVEN_UNITS}))*chl_control_cable_m_per_instrument`;
const EQUIPMENT_PIECES = `((${TANKS})+(${DOSING_PUMPS})+(${TRANSFER_PUMPS})+(${INJECTION_POINTS})+(${TANK_INSTRUMENTS})+(${INJECTION_INSTRUMENTS})+chl_station_count)`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc11:chl_acceptance", section: "Работы", category: "construction_work", title: "Строительство, оснащение и приёмка станции дозирования гипохлорита", unitId: "piece", formulaId: "chl_acceptance_v1", expression: "chl_station_count", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["chl_station_designation", "chl_disinfectant_technology"] },
  { rowId: "rc11:chl_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка котлована станции", unitId: "m3", formulaId: "chl_excavation_v1", expression: EXCAVATION, procurement: true },
  { rowId: "rc11:chl_blinding", section: "Железобетон", category: "material", title: "Бетонная подготовка", unitId: "m3", formulaId: "chl_blinding_v1", expression: BLINDING, procurement: true, titleParameterIds: ["chl_blinding_designation"] },
  { rowId: "rc11:chl_structural_concrete", section: "Железобетон", category: "material", title: "Бетон фундаментной плиты и аварийного поддона", unitId: "m3", formulaId: "chl_structural_concrete_v1", expression: CONCRETE_ORDER, procurement: true, titleParameterIds: ["chl_concrete_designation"] },
  { rowId: "rc11:chl_reinforcement", section: "Железобетон", category: "material", title: "Арматура плиты и аварийного поддона", unitId: "t", formulaId: "chl_reinforcement_v1", expression: `(${CONCRETE_NET})*chl_reinforcement_kg_per_concrete_m3/1000`, procurement: true, titleParameterIds: ["chl_reinforcement_designation"] },
  { rowId: "rc11:chl_formwork", section: "Железобетон", category: "construction_work", title: "Опалубка плиты и стен аварийного поддона", unitId: "m2", formulaId: "chl_formwork_v1", expression: `chl_station_count*(2*(${PERIMETER})*chl_bund_height_m+2*(chl_building_length_m+chl_building_width_m)*chl_slab_thickness_m)`, procurement: true, titleParameterIds: ["chl_formwork_designation"] },
  { rowId: "rc11:chl_floor_coating", section: "Защитные покрытия", category: "material", title: "Химстойкое покрытие пола и аварийного поддона", unitId: "m2", formulaId: "chl_floor_coating_v1", expression: `(${FLOOR})+chl_station_count*(${PERIMETER})*chl_bund_height_m`, procurement: true, titleParameterIds: ["chl_floor_coating_designation"] },
  { rowId: "rc11:chl_structural_steel", section: "Здание", category: "material", title: "Металлокаркас технологического здания", unitId: "t", formulaId: "chl_structural_steel_v1", expression: `(${FLOOR})*chl_structural_steel_kg_per_floor_m2/1000`, procurement: true, titleParameterIds: ["chl_structural_steel_designation"] },
  { rowId: "rc11:chl_wall_panels", section: "Здание", category: "material", title: "Химстойкие стеновые панели", unitId: "m2", formulaId: "chl_wall_panels_v1", expression: `chl_station_count*(${PERIMETER})*chl_building_clear_height_m`, procurement: true, titleParameterIds: ["chl_wall_panel_designation"] },
  { rowId: "rc11:chl_roof_panels", section: "Здание", category: "material", title: "Кровельные панели", unitId: "m2", formulaId: "chl_roof_panels_v1", expression: FLOOR, procurement: true, titleParameterIds: ["chl_roof_panel_designation"] },
  { rowId: "rc11:chl_doors", section: "Здание", category: "material", title: "Химстойкие наружные двери", unitId: "piece", formulaId: "chl_doors_v1", expression: "chl_station_count*chl_door_piece_per_station", procurement: true, titleParameterIds: ["chl_door_designation"] },
  { rowId: "rc11:chl_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка и уплотнение", unitId: "m3", formulaId: "chl_backfill_v1", expression: BACKFILL, procurement: true },
  { rowId: "rc11:chl_imported_backfill", section: "Земляные работы", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "chl_imported_backfill_v1", expression: `(${BACKFILL})*(1-chl_excavated_soil_reuse_fraction)`, procurement: true, titleParameterIds: ["chl_imported_backfill_designation"] },
  { rowId: "rc11:chl_excess_soil", section: "Земляные работы", category: "construction_work", title: "Погрузка и вывоз лишнего грунта", unitId: "m3", formulaId: "chl_excess_soil_v1", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc11:chl_design_flow", section: "Расчётные показатели", category: "service", title: "Суммарный расчётный расход воды", unitId: "m3_day", formulaId: "chl_design_flow_v1", expression: "chl_station_count*chl_design_flow_m3_day", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_active_chlorine_demand", section: "Расчётные показатели", category: "service", title: "Расчётная потребность в активном хлоре", unitId: "kg_day", formulaId: "chl_active_chlorine_demand_v1", expression: ACTIVE_KG_DAY, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_solution_daily_mass", section: "Расчётные показатели", category: "service", title: "Суточная масса раствора гипохлорита", unitId: "kg_day", formulaId: "chl_solution_daily_mass_v1", expression: SOLUTION_KG_DAY, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_solution_daily_volume", section: "Расчётные показатели", category: "service", title: "Суточный объём раствора гипохлорита", unitId: "l_day", formulaId: "chl_solution_daily_volume_v1", expression: SOLUTION_L_DAY, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_storage_volume", section: "Расчётные показатели", category: "service", title: "Расчётный рабочий запас раствора", unitId: "m3", formulaId: "chl_storage_volume_v1", expression: STORAGE_M3, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_storage_tanks", section: "Реагентное хозяйство", category: "equipment", title: "Химстойкие ёмкости хранения", unitId: "piece", formulaId: "chl_storage_tanks_v1", expression: TANKS, procurement: true, titleParameterIds: ["chl_tank_designation"] },
  { rowId: "rc11:chl_reagent_order", section: "Реагентное хозяйство", category: "material", title: "Раствор гипохлорита натрия к поставке", unitId: "kg", formulaId: "chl_reagent_order_v1", expression: REAGENT_ORDER, procurement: true, titleParameterIds: ["chl_disinfectant_technology"] },
  { rowId: "rc11:chl_transfer_pumps", section: "Дозирующее оборудование", category: "equipment", title: "Насосы разгрузки и перекачки реагента", unitId: "piece", formulaId: "chl_transfer_pumps_v1", expression: TRANSFER_PUMPS, procurement: true, titleParameterIds: ["chl_transfer_pump_designation"] },
  { rowId: "rc11:chl_dosing_pumps", section: "Дозирующее оборудование", category: "equipment", title: "Рабочие и резервные дозирующие насосы", unitId: "piece", formulaId: "chl_dosing_pumps_v1", expression: DOSING_PUMPS, procurement: true, titleParameterIds: ["chl_dosing_package_designation"] },
  { rowId: "rc11:chl_calibration_columns", section: "Дозирующее оборудование", category: "equipment", title: "Калибровочные колонны", unitId: "piece", formulaId: "chl_calibration_columns_v1", expression: `(${DOSING_PUMPS})*chl_calibration_column_piece_per_pump`, procurement: true },
  { rowId: "rc11:chl_pulsation_dampers", section: "Дозирующее оборудование", category: "equipment", title: "Гасители пульсаций", unitId: "piece", formulaId: "chl_pulsation_dampers_v1", expression: `(${DOSING_PUMPS})*chl_pulsation_damper_piece_per_pump`, procurement: true },
  { rowId: "rc11:chl_backpressure_valves", section: "Дозирующее оборудование", category: "equipment", title: "Клапаны противодавления", unitId: "piece", formulaId: "chl_backpressure_valves_v1", expression: `(${DOSING_PUMPS})*chl_backpressure_valve_piece_per_pump`, procurement: true },
  { rowId: "rc11:chl_relief_valves", section: "Дозирующее оборудование", category: "equipment", title: "Предохранительные клапаны", unitId: "piece", formulaId: "chl_relief_valves_v1", expression: `(${DOSING_PUMPS})*chl_relief_valve_piece_per_pump`, procurement: true },
  { rowId: "rc11:chl_strainers", section: "Дозирующее оборудование", category: "equipment", title: "Всасывающие фильтры реагента", unitId: "piece", formulaId: "chl_strainers_v1", expression: `(${DOSING_PUMPS})*chl_strainer_piece_per_pump`, procurement: true },
  { rowId: "rc11:chl_injection_quills", section: "Узлы ввода", category: "equipment", title: "Узлы ввода реагента", unitId: "piece", formulaId: "chl_injection_quills_v1", expression: `(${INJECTION_POINTS})*chl_injection_quill_piece_per_point`, procurement: true },
  { rowId: "rc11:chl_process_pipe", section: "Технологические трубопроводы", category: "material", title: "Трубопровод раствора гипохлорита", unitId: "m", formulaId: "chl_process_pipe_v1", expression: PROCESS_PIPE, procurement: true, titleParameterIds: ["chl_process_pipe_designation"] },
  { rowId: "rc11:chl_process_fittings", section: "Технологические трубопроводы", category: "material", title: "Химстойкие фитинги", unitId: "piece", formulaId: "chl_process_fittings_v1", expression: `ceil((${PROCESS_PIPE})*chl_fitting_piece_per_pipe_m)`, procurement: true },
  { rowId: "rc11:chl_process_valves", section: "Технологическая арматура", category: "equipment", title: "Запорная и обратная арматура", unitId: "piece", formulaId: "chl_process_valves_v1", expression: `(${INJECTION_POINTS})*chl_valve_piece_per_injection`, procurement: true },
  { rowId: "rc11:chl_pipe_supports", section: "Технологические трубопроводы", category: "material", title: "Опоры трубопроводов", unitId: "piece", formulaId: "chl_pipe_supports_v1", expression: `ceil((${PROCESS_PIPE})*chl_support_piece_per_pipe_m)`, procurement: true },
  { rowId: "rc11:chl_process_consumables", section: "Расходные материалы", category: "material", title: "Прокладки, крепёж, клей и монтажные расходники", unitId: "set", formulaId: "chl_process_consumables_v1", expression: "chl_station_count*chl_process_consumable_set_per_station", procurement: true },
  { rowId: "rc11:chl_exhaust_fans", section: "Вентиляция и безопасность", category: "equipment", title: "Химстойкие вытяжные вентиляторы", unitId: "piece", formulaId: "chl_exhaust_fans_v1", expression: "chl_station_count*ceil((chl_building_length_m*chl_building_width_m*chl_building_clear_height_m*chl_air_changes_per_hour)/chl_fan_capacity_m3_h)", procurement: true, titleParameterIds: ["chl_exhaust_fan_designation"] },
  { rowId: "rc11:chl_exhaust_duct", section: "Вентиляция и безопасность", category: "material", title: "Химстойкий вытяжной воздуховод", unitId: "m", formulaId: "chl_exhaust_duct_v1", expression: "chl_station_count*chl_duct_m_per_station", procurement: true, titleParameterIds: ["chl_duct_designation"] },
  { rowId: "rc11:chl_gas_detectors", section: "Вентиляция и безопасность", category: "equipment", title: "Стационарные сигнализаторы выделения хлора", unitId: "piece", formulaId: "chl_gas_detectors_v1", expression: "chl_station_count*chl_gas_detector_piece_per_station", procurement: true, titleParameterIds: ["chl_gas_detector_designation"] },
  { rowId: "rc11:chl_eyewash", section: "Вентиляция и безопасность", category: "equipment", title: "Аварийный душ и фонтан для глаз", unitId: "set", formulaId: "chl_eyewash_v1", expression: "chl_station_count", procurement: true, titleParameterIds: ["chl_eyewash_designation"] },
  { rowId: "rc11:chl_spill_kits", section: "Вентиляция и безопасность", category: "material", title: "Комплекты локализации пролива", unitId: "set", formulaId: "chl_spill_kits_v1", expression: "chl_station_count", procurement: true, titleParameterIds: ["chl_spill_kit_designation"] },
  { rowId: "rc11:chl_ppe", section: "Вентиляция и безопасность", category: "material", title: "Комплекты химической защиты персонала", unitId: "set", formulaId: "chl_ppe_v1", expression: "chl_station_count*chl_ppe_set_per_station", procurement: true },
  { rowId: "rc11:chl_level_instruments", section: "КИП и автоматизация", category: "equipment", title: "Датчики уровня ёмкостей", unitId: "piece", formulaId: "chl_level_instruments_v1", expression: TANK_INSTRUMENTS, procurement: true },
  { rowId: "rc11:chl_flowmeters", section: "КИП и автоматизация", category: "equipment", title: "Расходомеры раствора", unitId: "piece", formulaId: "chl_flowmeters_v1", expression: `(${INJECTION_POINTS})*chl_flowmeter_piece_per_injection`, procurement: true },
  { rowId: "rc11:chl_residual_analyzers", section: "КИП и автоматизация", category: "equipment", title: "Анализаторы остаточного хлора", unitId: "piece", formulaId: "chl_residual_analyzers_v1", expression: `(${INJECTION_POINTS})*chl_residual_analyzer_piece_per_injection`, procurement: true },
  { rowId: "rc11:chl_control_panels", section: "КИП и автоматизация", category: "equipment", title: "Шкафы управления дозированием", unitId: "set", formulaId: "chl_control_panels_v1", expression: "chl_station_count", procurement: true, titleParameterIds: ["chl_control_panel_designation"] },
  { rowId: "rc11:chl_power_cable", section: "Электроснабжение", category: "material", title: "Силовой кабель", unitId: "m", formulaId: "chl_power_cable_v1", expression: POWER_CABLE, procurement: true, titleParameterIds: ["chl_power_cable_designation"] },
  { rowId: "rc11:chl_control_cable", section: "КИП и автоматизация", category: "material", title: "Контрольный и приборный кабель", unitId: "m", formulaId: "chl_control_cable_v1", expression: CONTROL_CABLE, procurement: true, titleParameterIds: ["chl_control_cable_designation"] },
  { rowId: "rc11:chl_cable_tray", section: "Электроснабжение", category: "material", title: "Химстойкие кабельные лотки", unitId: "m", formulaId: "chl_cable_tray_v1", expression: `((${POWER_CABLE})+(${CONTROL_CABLE}))*chl_cable_tray_fraction_of_total_cable`, procurement: true, titleParameterIds: ["chl_cable_tray_designation"] },
  { rowId: "rc11:chl_earthing", section: "Электроснабжение", category: "material", title: "Заземление и уравнивание потенциалов", unitId: "m", formulaId: "chl_earthing_v1", expression: "chl_station_count*chl_earthing_m_per_station", procurement: true, titleParameterIds: ["chl_earthing_designation"] },
  { rowId: "rc11:chl_lighting", section: "Электроснабжение", category: "equipment", title: "Химстойкие светильники", unitId: "piece", formulaId: "chl_lighting_v1", expression: `ceil((${FLOOR})*chl_lighting_piece_per_floor_m2)`, procurement: true, titleParameterIds: ["chl_lighting_designation"] },
  { rowId: "rc11:chl_electrical_consumables", section: "Расходные материалы", category: "material", title: "Электромонтажные расходники", unitId: "set", formulaId: "chl_electrical_consumables_v1", expression: "chl_station_count*chl_electrical_consumable_set_per_station", procurement: true },
  { rowId: "rc11:chl_flushing_water", section: "Испытания и пуск", category: "material", title: "Вода для промывки и гидравлических испытаний", unitId: "m3", formulaId: "chl_flushing_water_v1", expression: "chl_station_count*chl_flushing_water_m3_per_station", procurement: true },
  { rowId: "rc11:chl_calibration_standard", section: "Испытания и пуск", category: "material", title: "Калибровочные растворы КИП", unitId: "l", formulaId: "chl_calibration_standard_v1", expression: `(${INJECTION_POINTS})*chl_calibration_standard_l_per_injection`, procurement: true },
  { rowId: "rc11:labor:chl-civil", section: "Труд", category: "labor", title: "Земляные, железобетонные и общестроительные работы", unitId: "man_hour", formulaId: "chl_civil_labor_v1", expression: `((${CONCRETE_ORDER})+(${BLINDING}))*chl_civil_labor_h_per_concrete_m3`, procurement: true },
  { rowId: "rc11:labor:chl-process", section: "Труд", category: "labor", title: "Монтаж химического трубопровода и арматуры", unitId: "man_hour", formulaId: "chl_process_labor_v1", expression: `(${PROCESS_PIPE})*chl_process_labor_h_per_pipe_m`, procurement: true },
  { rowId: "rc11:labor:chl-equipment", section: "Труд", category: "labor", title: "Монтаж ёмкостей, насосов, вентиляции и КИП", unitId: "man_hour", formulaId: "chl_equipment_labor_v1", expression: `(${EQUIPMENT_PIECES})*chl_equipment_labor_h_per_piece`, procurement: true },
  { rowId: "rc11:labor:chl-electrical", section: "Труд", category: "labor", title: "Монтаж электрики и автоматизации", unitId: "man_hour", formulaId: "chl_electrical_labor_v1", expression: `((${POWER_CABLE})+(${CONTROL_CABLE}))*chl_electrical_labor_h_per_cable_m`, procurement: true },
  { rowId: "rc11:labor:chl-commissioning", section: "Труд", category: "labor", title: "Пусконаладка, настройка дозы и обучение", unitId: "man_hour", formulaId: "chl_commissioning_labor_v1", expression: "chl_station_count*chl_commissioning_labor_h_per_station", procurement: true },
  { rowId: "rc11:equipment:chl-excavator", section: "Механизмы", category: "equipment", title: "Экскаватор", unitId: "machine_hour", formulaId: "chl_excavator_v1", expression: `(${EXCAVATION})/chl_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc11:equipment:chl-compactor", section: "Механизмы", category: "equipment", title: "Уплотняющая техника", unitId: "machine_hour", formulaId: "chl_compactor_v1", expression: `(${BACKFILL})/chl_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc11:equipment:chl-concrete-pump", section: "Механизмы", category: "equipment", title: "Бетононасос", unitId: "machine_hour", formulaId: "chl_concrete_pump_v1", expression: `(${CONCRETE_ORDER})/chl_concrete_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc11:equipment:chl-crane", section: "Механизмы", category: "equipment", title: "Кран для монтажа ёмкостей и оборудования", unitId: "machine_hour", formulaId: "chl_crane_v1", expression: `((${TANKS})+(${DRIVEN_UNITS})+chl_station_count)*chl_crane_h_per_equipment_piece`, procurement: true },
  { rowId: "rc11:equipment:chl-jointing", section: "Механизмы", category: "equipment", title: "Оборудование для соединения химических труб", unitId: "machine_hour", formulaId: "chl_jointing_v1", expression: `(${PROCESS_PIPE})*chl_jointing_h_per_pipe_m`, procurement: true },
  { rowId: "rc11:equipment:chl-test", section: "Механизмы", category: "equipment", title: "Испытательное и наладочное оборудование", unitId: "machine_hour", formulaId: "chl_test_equipment_v1", expression: "chl_station_count*chl_test_equipment_h_per_station", procurement: true },
  { rowId: "rc11:chl_asbuilt", section: "Контроль качества", category: "service", title: "Исполнительная документация, паспорта и акты", unitId: "set", formulaId: "chl_asbuilt_v1", expression: "chl_station_count", procurement: true },
  { rowId: "rc11:chl_process_commissioning", section: "Контроль качества", category: "service", title: "Комплексное опробование и подтверждение режима дозирования", unitId: "set", formulaId: "chl_process_commissioning_v1", expression: "chl_station_count", procurement: true },
  { rowId: "rc11:logistics:chl-concrete", section: "Логистика", category: "service", title: "Доставка бетонных смесей", unitId: "trip", formulaId: "chl_concrete_delivery_v1", expression: `ceil(((${CONCRETE_ORDER})+(${BLINDING}))/chl_concrete_delivery_capacity_m3_trip)`, procurement: true },
  { rowId: "rc11:logistics:chl-reagent", section: "Логистика", category: "service", title: "Доставка реагента", unitId: "trip", formulaId: "chl_reagent_delivery_v1", expression: `ceil((${REAGENT_PACKAGES})/chl_reagent_package_per_delivery_trip)`, procurement: true },
  { rowId: "rc11:logistics:chl-equipment", section: "Логистика", category: "service", title: "Доставка технологического и электрического оборудования", unitId: "trip", formulaId: "chl_equipment_delivery_v1", expression: `ceil((${EQUIPMENT_PIECES})/chl_equipment_piece_per_delivery_trip)`, procurement: true },
  { rowId: "rc11:logistics:chl-soil", section: "Логистика", category: "service", title: "Вывоз лишнего грунта", unitId: "trip", formulaId: "chl_soil_delivery_v1", expression: `ceil((${EXCESS_SOIL})/chl_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc11:chl-reagent-balance:initial-fill", section: "Баланс реагента", category: "material", title: "Первичное заполнение рабочего запаса", unitId: "kg", formulaId: "chl_reagent_initial_fill_v1", expression: INITIAL_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:retained-spare", section: "Баланс реагента", category: "material", title: "Сохраняемый оперативный резерв", unitId: "kg", formulaId: "chl_reagent_spare_v1", expression: RETAINED_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:available-stock", section: "Баланс реагента", category: "material", title: "Подтверждённый складской остаток", unitId: "kg", formulaId: "chl_reagent_stock_v1", expression: "chl_reagent_available_stock_kg", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:total-need", section: "Баланс реагента", category: "material", title: "Общая потребность в реагенте", unitId: "kg", formulaId: "chl_reagent_total_need_v1", expression: TOTAL_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:net-order-need", section: "Баланс реагента", category: "material", title: "Чистая потребность к заказу", unitId: "kg", formulaId: "chl_reagent_net_need_v1", expression: NET_REAGENT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:package-count", section: "Баланс реагента", category: "material", title: "Количество поставочных упаковок", unitId: "piece", formulaId: "chl_reagent_packages_v1", expression: REAGENT_PACKAGES, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:remainder", section: "Баланс реагента", category: "material", title: "Остаток после первичного заполнения", unitId: "kg", formulaId: "chl_reagent_remainder_v1", expression: `chl_reagent_available_stock_kg+(${REAGENT_ORDER})-(${INITIAL_REAGENT})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl-reagent-balance:surplus-beyond-spare", section: "Баланс реагента", category: "material", title: "Свободный остаток сверх оперативного резерва", unitId: "kg", formulaId: "chl_reagent_surplus_v1", expression: `max(0,chl_reagent_available_stock_kg+(${REAGENT_ORDER})-(${TOTAL_REAGENT}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc11:chl_excavation_shoring", section: "Условные работы", category: "construction_work", title: "Крепление котлована", unitId: "m2", formulaId: "chl_excavation_shoring_v1", expression: "chl_excavation_shoring_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "chl_excavation_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["chl_excavation_shoring_designation"] },
  { rowId: "rc11:chl_groundwater_dewatering", section: "Условные механизмы", category: "equipment", title: "Строительное водопонижение", unitId: "machine_hour", formulaId: "chl_groundwater_dewatering_v1", expression: "chl_groundwater_dewatering_machine_h", procurement: true, inclusion: { kind: "equals", parameterId: "chl_groundwater_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["chl_groundwater_dewatering_designation"] },
  { rowId: "rc11:chl_standby_power", section: "Условное оборудование", category: "equipment", title: "Резервный источник питания", unitId: "kva", formulaId: "chl_standby_power_v1", expression: "chl_standby_power_kva", procurement: true, inclusion: { kind: "equals", parameterId: "chl_standby_power_mode", value: "REQUIRED" }, titleParameterIds: ["chl_standby_power_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.chlorination-station-r1.automatic-s27-26",
  semanticOwner: "chlorination-station",
  sourceId: CHLORINATION_STATION_SOURCE_ID,
  normId: CHLORINATION_STATION_NORM_ID,
  sourceMetadata: CHLORINATION_STATION_SOURCE_METADATA,
  applicabilityRu: "Пакетная станция дозирования готового раствора гипохлорита натрия для питьевой воды с отдельным химическим помещением, хранением, рабочим и резервным дозированием, узлами ввода, вентиляцией, безопасностью, КИП, электрикой и полным пусковым циклом.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "gas chlorine, calcium hypochlorite and on-site electrochlorination",
    "upstream treatment, contact tank and external networks",
    "automatic disinfectant technology or dose selection from flow alone",
    "automatic inclusion of shoring, dewatering or standby power",
    "invented price or manufacturer performance",
  ],
});

export const CHLORINATION_STATION_PARAMETERS = definition.parameters;
export const CHLORINATION_STATION_FORMULAS = definition.formulas;
export const CHLORINATION_STATION_RESOURCES = definition.resources;
export const CHLORINATION_STATION_RUNTIME_INPUT = definition.runtimeInput;
export const CHLORINATION_STATION_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const CHLORINATION_STATION_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const CHLORINATION_STATION_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;
export const CHLORINATION_STATION_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(CHLORINATION_STATION_RUNTIME_INPUT),
);

function promptDecimal(value: string | undefined): string | undefined {
  return value?.replace(",", ".");
}

/** Extracts only facts explicitly stated by the customer. */
export function parseChlorinationStationOrdinaryPromptR1(
  prompt: string,
): Record<string, string> {
  const normalized = prompt.normalize("NFKC").replace(/\u00a0/gu, " ");
  const identifier = "([A-Z0-9](?:[A-Z0-9._/-]*[A-Z0-9])?)";
  const explicitCount = /(?:строительств\p{L}*\s+)?(\d+)\s+станц\p{L}*\s+хлорирован/iu
    .exec(normalized)?.[1];
  const singularStation = /станц\p{L}*\s+хлорирован/iu.test(normalized);
  const entries: Record<string, string | undefined> = {
    chl_station_count: explicitCount ?? (singularStation ? "1" : undefined),
    chl_station_designation: new RegExp(
      `хлорирован\\p{L}*\\s+${identifier}\\s+производительн`, "iu",
    ).exec(normalized)?.[1],
    chl_design_flow_m3_day: promptDecimal(
      /производительн\p{L}*\s+(\d+(?:[,.]\d+)?)\s*(?:м3|м³|куб\.?\s*м)\s*(?:\/|\s+в)?\s*сут/iu
        .exec(normalized)?.[1],
    ),
    chl_disinfectant_technology: /гипохлорит\p{L}*\s+натри\p{L}*/iu.test(normalized)
      ? "SODIUM_HYPOCHLORITE" : undefined,
    chl_design_dose_mg_l: promptDecimal(
      /(?:расч[её]тн\p{L}*\s+)?доз\p{L}*\s+(\d+(?:[,.]\d+)?)\s*мг\s*\/\s*л/iu
        .exec(normalized)?.[1],
    ),
    chl_solution_concentration_percent: promptDecimal(
      /(?:раствор\p{L}*\s+)?(?:концентрац\p{L}*|крепост\p{L}*)\s+(\d+(?:[,.]\d+)?)\s*%/iu
        .exec(normalized)?.[1],
    ),
    chl_dosing_package_designation: new RegExp(
      `дозирующ\\p{L}*\\s+пакет\\p{L}*\\s+${identifier}(?:\\s*[,;.]|$)`, "iu",
    ).exec(normalized)?.[1],
    chl_injection_point_count: /(\d+)\s+точк\p{L}*\s+ввод/iu.exec(normalized)?.[1],
  };
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, string] => entry[1] != null),
  );
}

export const CHLORINATION_STATION_SHORT_INPUT = Object.freeze({
  chl_station_count: 1,
  chl_station_designation: "CHL-NAOCL-1000-1IP",
  chl_design_flow_m3_day: 1000,
  chl_disinfectant_technology: "SODIUM_HYPOCHLORITE",
  chl_design_dose_mg_l: 2,
  chl_solution_concentration_percent: 12.5,
  chl_dosing_package_designation: "DS-NAOCL-2X15LPH-PVC",
  chl_injection_point_count: 1,
});

export const CHLORINATION_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...CHLORINATION_STATION_SHORT_INPUT,
  ...CHLORINATION_STATION_RUNTIME_INPUT,
});

export async function compileChlorinationStationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CHLORINATION_STATION_CATALOG_ID;
  if (catalogId !== CHLORINATION_STATION_CATALOG_ID) {
    throw new Error(`CHLORINATION_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.chlorination-station-hypochlorite-automatic-s27-26-r1",
    catalogId,
    primaryMeasureParameterId: "chl_station_count",
    definition,
    submittedParameters,
  });
}
