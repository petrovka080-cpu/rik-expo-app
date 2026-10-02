import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const PUMPING_STATION_CATALOG_ID = "canonical-work:expanded:pumping_station";
export const PUMPING_STATION_SOURCE_ID =
  "project_potable_water_pumping_station_geometric_automatic_v2";
export const PUMPING_STATION_NORM_ID =
  "norm:project:potable_water_pumping_station_geometric_automatic:v2";
export const PUMPING_STATION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный инженерный профиль полной станции повышения давления питьевой воды S27.25",
  source_authority: "Предварительный сценарий canonical compiler; геометрия, состав узлов, удельные нормы и условные решения требуют проверки проектировщиком, изготовителями и поставщиками",
  source_document_version: "VISIBLE_PRELIMINARY_POTABLE_WATER_PUMPING_STATION_GEOMETRY_TO_RESOURCES_S27_25_REQUIRES_PROJECT_CONFIRMATION",
  definition_hash: "f0c01b7e48b3b3e63795e71089dfe11002b642ce32abab19b09993152930c124",
  exact_locator: "WPS-RC-Q120-H55-2D1S: 1 железобетонная сухая станция, 120 л/с при 55 м, схема 2+1, внутренние размеры 12x8x4.5 м и измеренная кабельная трасса 240 м; конечные ресурсы выводятся из первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной нормой. Профиль, марки, коэффициенты, производительности и условные ветви подлежат подтверждению проектом, изготовителем и поставщиком. КНС, пожарная станция и внешняя сеть исключены.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "f0c01b7e48b3b3e63795e71089dfe11002b642ce32abab19b09993152930c124",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "wps_station_count", title: "Количество станций", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "wps_station_designation", title: "Обозначение выбранной станции", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "wps_design_flow_lps", title: "Расчётная подача станции", valueType: "decimal", unitId: "l_per_s", kind: "ordinary", min: 0.000_001 },
  { id: "wps_design_head_m", title: "Расчётный напор станции", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "wps_pump_installed_piece", title: "Общее количество насосных агрегатов", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "wps_duty_pump_count", title: "Количество рабочих насосов", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "wps_standby_pump_count", title: "Количество резервных насосов", valueType: "integer", unitId: "piece", kind: "ordinary", min: 0 },
  { id: "wps_internal_length_m", title: "Внутренняя длина станции", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "wps_internal_width_m", title: "Внутренняя ширина станции", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "wps_internal_height_m", title: "Внутренняя высота станции", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "wps_power_cable_route_length_m", title: "Измеренная суммарная длина силовой кабельной трассы", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "wps_pump_designation", title: "Марка насосного агрегата", valueType: "text", unitId: null, kind: "profile", defaultValue: "HSC-60LPS-55M-75KW" },
  { id: "wps_motor_power_kw", title: "Мощность двигателя одного насоса", valueType: "decimal", unitId: "kW", kind: "profile", defaultValue: 75, min: 0.000_001 },
  { id: "wps_wall_thickness_m", title: "Толщина железобетонных стен", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.4, min: 0.000_001 },
  { id: "wps_base_slab_thickness_m", title: "Толщина фундаментной плиты", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.5, min: 0.000_001 },
  { id: "wps_roof_slab_thickness_m", title: "Толщина плиты покрытия", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0.000_001 },
  { id: "wps_excavation_working_clearance_m", title: "Рабочий зазор котлована с каждой стороны", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.8, min: 0 },
  { id: "wps_blinding_thickness_m", title: "Толщина бетонной подготовки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "wps_blinding_extension_m", title: "Выпуск подготовки за грань плиты", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.15, min: 0 },
  { id: "wps_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.75, min: 0, max: 1 },
  { id: "wps_concrete_expected_loss_fraction", title: "Технологический запас бетона", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.025, min: 0, max: 1 },
  { id: "wps_reinforcement_kg_per_concrete_m3", title: "Удельная масса арматуры", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 140.625, min: 0 },
  { id: "wps_concrete_designation", title: "Марка конструкционного бетона", valueType: "text", unitId: null, kind: "profile", defaultValue: "B30-W8-F200" },
  { id: "wps_blinding_designation", title: "Марка бетонной подготовки", valueType: "text", unitId: null, kind: "profile", defaultValue: "B7.5" },
  { id: "wps_reinforcement_designation", title: "Класс арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "A500C" },
  { id: "wps_formwork_designation", title: "Система опалубки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Щитовая опалубка железобетонных конструкций" },
  { id: "wps_waterproofing_designation", title: "Система наружной гидроизоляции", valueType: "text", unitId: null, kind: "profile", defaultValue: "Двухслойная наружная гидроизоляция ЖБ станции" },
  { id: "wps_suction_manifold_designation", title: "Марка всасывающего коллектора", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN400-PN16" },
  { id: "wps_suction_manifold_length_factor", title: "Коэффициент длины всасывающего коллектора к внутренней длине", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "wps_discharge_manifold_designation", title: "Марка напорного коллектора", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN300-PN16" },
  { id: "wps_discharge_manifold_length_factor", title: "Коэффициент длины напорного коллектора к внутренней длине", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.833333333333, min: 0 },
  { id: "wps_isolation_valve_designation", title: "Марка запорной арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "BUTTERFLY-VALVE-PN16" },
  { id: "wps_isolation_valve_per_pump", title: "Запорная арматура на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 2, min: 0 },
  { id: "wps_header_isolation_valve_per_station", title: "Коллекторная запорная арматура на станцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "wps_check_valve_designation", title: "Марка обратного клапана", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHECK-VALVE-PN16" },
  { id: "wps_check_valve_per_pump", title: "Обратные клапаны на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "wps_dismantling_joint_designation", title: "Марка демонтажной вставки", valueType: "text", unitId: null, kind: "profile", defaultValue: "DISMANTLING-JOINT-PN16" },
  { id: "wps_dismantling_joint_per_pump", title: "Демонтажные вставки на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 2, min: 0 },
  { id: "wps_flanged_joint_set_per_pump", title: "Фланцевые соединения с крепежом и прокладками на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 6, min: 0 },
  { id: "wps_instrument_set_designation", title: "Комплект КИП расхода и давления", valueType: "text", unitId: null, kind: "profile", defaultValue: "FLOW-PRESSURE-INSTRUMENT-SET" },
  { id: "wps_instrument_set_per_station", title: "Комплекты КИП на станцию", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "wps_surge_vessel_designation", title: "Марка гидропневматического бака", valueType: "text", unitId: null, kind: "profile", defaultValue: "SURGE-VESSEL-PN16" },
  { id: "wps_surge_vessel_per_station", title: "Гидропневматические баки на станцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "wps_mcc_vfd_designation", title: "Шкаф НКУ и частотного регулирования", valueType: "text", unitId: null, kind: "profile", defaultValue: "MCC-VFD-2D1S" },
  { id: "wps_plc_scada_designation", title: "Комплект ПЛК и диспетчеризации", valueType: "text", unitId: null, kind: "profile", defaultValue: "PLC-SCADA-WPS" },
  { id: "wps_earthing_designation", title: "Система заземления", valueType: "text", unitId: null, kind: "profile", defaultValue: "WPS-EQUIPOTENTIAL-BONDING" },
  { id: "wps_cable_designation", title: "Марка силового кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "N2XH-4X120-0.6/1KV" },
  { id: "wps_cable_expected_loss_fraction", title: "Технологический запас кабеля", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "wps_cable_retained_spare_m", title: "Сохраняемый резерв кабеля", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 20, min: 0 },
  { id: "wps_cable_available_stock_m", title: "Подтверждённый доступный остаток кабеля", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "wps_cable_supplier_drum_length_m", title: "Длина кабеля на барабане", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "wps_cable_tray_designation", title: "Марка кабельного лотка", valueType: "text", unitId: null, kind: "profile", defaultValue: "HOT-DIP-GALVANIZED-CABLE-TRAY" },
  { id: "wps_cable_tray_length_per_cable_m", title: "Доля кабельной трассы в лотке", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.354166666667, min: 0 },
  { id: "wps_cable_termination_set_per_pump", title: "Комплекты оконцевания кабеля на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 2, min: 0 },
  { id: "wps_embedded_parts_set_per_station", title: "Комплекты закладных на станцию", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "wps_nonshrink_grout_m3_per_pump", title: "Безусадочный раствор на насос", valueType: "decimal", unitId: "m3_per_pump", kind: "profile", defaultValue: 0.6, min: 0 },
  { id: "wps_ventilation_designation", title: "Система вентиляции", valueType: "text", unitId: null, kind: "profile", defaultValue: "WPS-SUPPLY-EXHAUST-VENTILATION" },
  { id: "wps_drainage_designation", title: "Система аварийного дренажа", valueType: "text", unitId: null, kind: "profile", defaultValue: "WPS-SUMP-DRAINAGE-SET" },
  { id: "wps_mechanical_consumable_set_per_pump", title: "Монтажные расходники на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "wps_electrical_consumable_set_per_pump", title: "Электромонтажные расходники на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "wps_curing_compound_l_per_m2", title: "Расход материала ухода за бетоном", valueType: "decimal", unitId: "l_per_m2", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "wps_test_water_m3_per_station", title: "Вода на испытание и промывку станции", valueType: "decimal", unitId: "m3_per_system", kind: "profile", defaultValue: 25, min: 0 },
  { id: "wps_disinfection_reagent_kg_per_m3", title: "Реагент на кубометр промывочной воды", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "wps_earthworks_labor_h_per_m3", title: "Труд на земляные работы", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.45, min: 0 },
  { id: "wps_concrete_labor_h_per_m3", title: "Труд на бетонные работы", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 4.2, min: 0 },
  { id: "wps_rebar_labor_h_per_t", title: "Труд на армирование", valueType: "decimal", unitId: "man_hour_per_t", kind: "profile", defaultValue: 32, min: 0 },
  { id: "wps_mechanical_labor_h_per_pump", title: "Труд на монтаж одного насоса и арматуры", valueType: "decimal", unitId: "man_hour_per_pump", kind: "profile", defaultValue: 110, min: 0 },
  { id: "wps_manifold_labor_h_per_m", title: "Труд на метр коллекторов", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 3.75, min: 0 },
  { id: "wps_electrical_labor_h_per_cable_m", title: "Труд на метр силовой кабельной трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "wps_controls_labor_h_per_station", title: "Труд на автоматику станции", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 240, min: 0 },
  { id: "wps_qa_labor_h_per_station", title: "Труд на испытания и документацию", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 160, min: 0 },
  { id: "wps_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 18, min: 0.000_001 },
  { id: "wps_compactor_productivity_m3_h", title: "Производительность уплотнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 8, min: 0.000_001 },
  { id: "wps_concrete_pump_productivity_m3_h", title: "Производительность бетононасоса", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 12, min: 0.000_001 },
  { id: "wps_crane_h_per_pump", title: "Работа крана на насос", valueType: "decimal", unitId: "machine_hour_per_pump", kind: "profile", defaultValue: 24, min: 0 },
  { id: "wps_test_equipment_h_per_station", title: "Испытательное оборудование на станцию", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 40, min: 0 },
  { id: "wps_delivery_capacity_m3_per_trip", title: "Условная вместимость рейса материалов", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 8, min: 0.000_001 },
  { id: "wps_soil_truck_capacity_m3", title: "Вместимость самосвала", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "wps_excavation_shoring_mode", title: "Крепление котлована требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "wps_groundwater_dewatering_mode", title: "Водопонижение требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "wps_standby_generator_mode", title: "Резервный генератор требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "wps_excavation_shoring_designation", title: "Система крепления котлована", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "wps_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "wps_excavation_shoring_area_m2", title: "Площадь крепления котлована", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "wps_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "wps_groundwater_dewatering_designation", title: "Система водопонижения", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "wps_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "wps_groundwater_dewatering_machine_h", title: "Работа водопонижения", valueType: "decimal", unitId: "machine_hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "wps_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "wps_standby_generator_designation", title: "Марка резервного генератора", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "wps_standby_generator_mode", value: "REQUIRED" } },
  { id: "wps_standby_generator_quantity_set", title: "Количество резервных генераторов", valueType: "integer", unitId: "set", kind: "conditional", min: 1, requiredWhen: { parameterId: "wps_standby_generator_mode", value: "REQUIRED" } },
]);

const OUTER_L = "(wps_internal_length_m+2*wps_wall_thickness_m)";
const OUTER_W = "(wps_internal_width_m+2*wps_wall_thickness_m)";
const STRUCTURE_H = "(wps_internal_height_m+wps_base_slab_thickness_m+wps_roof_slab_thickness_m)";
const EXCAVATION = `wps_station_count*(${OUTER_L}+2*wps_excavation_working_clearance_m)*(${OUTER_W}+2*wps_excavation_working_clearance_m)*(${STRUCTURE_H}+wps_blinding_thickness_m)`;
const BLINDING = `wps_station_count*(${OUTER_L}+2*wps_blinding_extension_m)*(${OUTER_W}+2*wps_blinding_extension_m)*wps_blinding_thickness_m`;
const CONCRETE_NET = `wps_station_count*(${OUTER_L}*${OUTER_W}*(wps_base_slab_thickness_m+wps_roof_slab_thickness_m)+2*(wps_internal_length_m+wps_internal_width_m)*wps_internal_height_m*wps_wall_thickness_m)`;
const CONCRETE_ORDER = `(${CONCRETE_NET})*(1+wps_concrete_expected_loss_fraction)`;
const BACKFILL_SPACE = `max(0,${EXCAVATION}-wps_station_count*${OUTER_L}*${OUTER_W}*${STRUCTURE_H}-${BLINDING})`;
const IMPORTED_BACKFILL = `(${BACKFILL_SPACE})*(1-wps_excavated_soil_reuse_fraction)`;
const EXCESS_SOIL = `max(0,${EXCAVATION}-(${BACKFILL_SPACE})*wps_excavated_soil_reuse_fraction)`;
const WATERPROOFING = `wps_station_count*(2*(${OUTER_L}+${OUTER_W})*${STRUCTURE_H}+2*${OUTER_L}*${OUTER_W})`;
const FORMWORK = `wps_station_count*(2*(wps_internal_length_m+wps_internal_width_m)*wps_internal_height_m+2*(${OUTER_L}+${OUTER_W})*wps_internal_height_m+2*${OUTER_L}*${OUTER_W})`;
const SUCTION = "wps_station_count*wps_internal_length_m*wps_suction_manifold_length_factor";
const DISCHARGE = "wps_station_count*wps_internal_length_m*wps_discharge_manifold_length_factor";
const CABLE_GROSS = "wps_power_cable_route_length_m*(1+wps_cable_expected_loss_fraction)+wps_cable_retained_spare_m";
const CABLE_NET = `max(0,${CABLE_GROSS}-wps_cable_available_stock_m)`;
const CABLE_DRUMS = `ceil((${CABLE_NET})/wps_cable_supplier_drum_length_m)`;
const CABLE_ORDER = `(${CABLE_DRUMS})*wps_cable_supplier_drum_length_m`;
const ISOLATION = "wps_pump_installed_piece*wps_isolation_valve_per_pump+wps_station_count*wps_header_isolation_valve_per_station";

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc09:wps_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка котлована станции", unitId: "m3", formulaId: "wps_excavation_v2", expression: EXCAVATION },
  { rowId: "rc09:wps_blinding", section: "Основание", category: "material", title: "Бетонная подготовка", unitId: "m3", formulaId: "wps_blinding_v2", expression: BLINDING, procurement: true, titleParameterIds: ["wps_blinding_designation"] },
  { rowId: "rc09:wps_structural_concrete", section: "Железобетон", category: "material", title: "Конструкционный бетон с технологическим запасом", unitId: "m3", formulaId: "wps_structural_concrete_order_v2", expression: CONCRETE_ORDER, procurement: true, titleParameterIds: ["wps_concrete_designation"] },
  { rowId: "rc09:wps-concrete-balance:installed-net", section: "Баланс бетона", category: "material", title: "Чистый геометрический объём конструкционного бетона", unitId: "m3", formulaId: "wps_concrete_net_v2", expression: CONCRETE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_reinforcement", section: "Железобетон", category: "material", title: "Арматура конструкций станции", unitId: "t", formulaId: "wps_reinforcement_v2", expression: `(${CONCRETE_NET})*wps_reinforcement_kg_per_concrete_m3/1000`, procurement: true, titleParameterIds: ["wps_reinforcement_designation"] },
  { rowId: "rc09:wps_formwork", section: "Железобетон", category: "material", title: "Опалубка стен и плит", unitId: "m2", formulaId: "wps_formwork_v2", expression: FORMWORK, procurement: true, titleParameterIds: ["wps_formwork_designation"] },
  { rowId: "rc09:wps_waterproofing", section: "Гидроизоляция", category: "material", title: "Наружная гидроизоляция подземной части", unitId: "m2", formulaId: "wps_waterproofing_v2", expression: WATERPROOFING, procurement: true, titleParameterIds: ["wps_waterproofing_designation"] },
  { rowId: "rc09:wps_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка и уплотнение", unitId: "m3", formulaId: "wps_backfill_v2", expression: BACKFILL_SPACE },
  { rowId: "rc09:wps_imported_backfill", section: "Материалы основания", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "wps_imported_backfill_v2", expression: IMPORTED_BACKFILL, procurement: true },
  { rowId: "rc09:wps_excess_soil", section: "Земляные работы", category: "service", title: "Лишний грунт к вывозу", unitId: "m3", formulaId: "wps_excess_soil_v2", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc09:wps_pump_units", section: "Оборудование", category: "equipment", title: "Насосные агрегаты", unitId: "piece", formulaId: "wps_pump_units_v2", expression: "wps_pump_installed_piece", procurement: true, titleParameterIds: ["wps_pump_designation"] },
  { rowId: "rc09:wps_suction_manifold", section: "Трубопроводы", category: "material", title: "Всасывающий коллектор", unitId: "m", formulaId: "wps_suction_manifold_v2", expression: SUCTION, procurement: true, titleParameterIds: ["wps_suction_manifold_designation"] },
  { rowId: "rc09:wps_discharge_manifold", section: "Трубопроводы", category: "material", title: "Напорный коллектор", unitId: "m", formulaId: "wps_discharge_manifold_v2", expression: DISCHARGE, procurement: true, titleParameterIds: ["wps_discharge_manifold_designation"] },
  { rowId: "rc09:wps_isolation_valves", section: "Арматура", category: "material", title: "Запорная арматура насосов и коллекторов", unitId: "piece", formulaId: "wps_isolation_valves_v2", expression: ISOLATION, procurement: true, titleParameterIds: ["wps_isolation_valve_designation"] },
  { rowId: "rc09:wps_check_valves", section: "Арматура", category: "material", title: "Обратные клапаны насосов", unitId: "piece", formulaId: "wps_check_valves_v2", expression: "wps_pump_installed_piece*wps_check_valve_per_pump", procurement: true, titleParameterIds: ["wps_check_valve_designation"] },
  { rowId: "rc09:wps_dismantling_joints", section: "Арматура", category: "material", title: "Демонтажные вставки", unitId: "piece", formulaId: "wps_dismantling_joints_v2", expression: "wps_pump_installed_piece*wps_dismantling_joint_per_pump", procurement: true, titleParameterIds: ["wps_dismantling_joint_designation"] },
  { rowId: "rc09:wps_flanged_joint_sets", section: "Комплектующие", category: "material", title: "Прокладки и крепёж фланцевых соединений", unitId: "set", formulaId: "wps_flanged_joint_sets_v2", expression: "wps_pump_installed_piece*wps_flanged_joint_set_per_pump", procurement: true },
  { rowId: "rc09:wps_instruments", section: "КИП", category: "equipment", title: "Расходомеры, манометры и датчики давления", unitId: "set", formulaId: "wps_instruments_v2", expression: "wps_station_count*wps_instrument_set_per_station", procurement: true, titleParameterIds: ["wps_instrument_set_designation"] },
  { rowId: "rc09:wps_surge_vessels", section: "Оборудование", category: "equipment", title: "Гидропневматические баки", unitId: "piece", formulaId: "wps_surge_vessels_v2", expression: "wps_station_count*wps_surge_vessel_per_station", procurement: true, titleParameterIds: ["wps_surge_vessel_designation"] },
  { rowId: "rc09:wps_mcc_vfd", section: "Электрика", category: "equipment", title: "НКУ и частотное регулирование", unitId: "set", formulaId: "wps_mcc_vfd_v2", expression: "wps_station_count", procurement: true, titleParameterIds: ["wps_mcc_vfd_designation"] },
  { rowId: "rc09:wps_plc_scada", section: "Автоматика", category: "equipment", title: "ПЛК и диспетчеризация", unitId: "set", formulaId: "wps_plc_scada_v2", expression: "wps_station_count", procurement: true, titleParameterIds: ["wps_plc_scada_designation"] },
  { rowId: "rc09:wps_earthing", section: "Электрика", category: "material", title: "Заземление и уравнивание потенциалов", unitId: "set", formulaId: "wps_earthing_v2", expression: "wps_station_count", procurement: true, titleParameterIds: ["wps_earthing_designation"] },
  { rowId: "rc09:wps_power_cable", section: "Электрика", category: "material", title: "Силовой кабель к закупке", unitId: "m", formulaId: "wps_power_cable_order_v2", expression: CABLE_ORDER, procurement: true, titleParameterIds: ["wps_cable_designation"] },
  { rowId: "rc09:wps_cable_tray", section: "Электрика", category: "material", title: "Кабельные лотки", unitId: "m", formulaId: "wps_cable_tray_v2", expression: "wps_power_cable_route_length_m*wps_cable_tray_length_per_cable_m", procurement: true, titleParameterIds: ["wps_cable_tray_designation"] },
  { rowId: "rc09:wps_cable_terminations", section: "Электрика", category: "material", title: "Оконцевания силовых кабелей", unitId: "set", formulaId: "wps_cable_terminations_v2", expression: "wps_pump_installed_piece*wps_cable_termination_set_per_pump", procurement: true },
  { rowId: "rc09:wps_embedded_parts", section: "Комплектующие", category: "material", title: "Закладные детали оборудования", unitId: "set", formulaId: "wps_embedded_parts_v2", expression: "wps_station_count*wps_embedded_parts_set_per_station", procurement: true },
  { rowId: "rc09:wps_nonshrink_grout", section: "Расходники", category: "material", title: "Безусадочный раствор под оборудованием", unitId: "m3", formulaId: "wps_nonshrink_grout_v2", expression: "wps_pump_installed_piece*wps_nonshrink_grout_m3_per_pump", procurement: true },
  { rowId: "rc09:wps_ventilation", section: "Инженерные системы", category: "equipment", title: "Вентиляция насосного помещения", unitId: "set", formulaId: "wps_ventilation_v2", expression: "wps_station_count", procurement: true, titleParameterIds: ["wps_ventilation_designation"] },
  { rowId: "rc09:wps_drainage", section: "Инженерные системы", category: "equipment", title: "Аварийный дренаж насосного помещения", unitId: "set", formulaId: "wps_drainage_v2", expression: "wps_station_count", procurement: true, titleParameterIds: ["wps_drainage_designation"] },
  { rowId: "rc09:wps_mechanical_consumables", section: "Расходники", category: "material", title: "Механические монтажные расходники", unitId: "set", formulaId: "wps_mechanical_consumables_v2", expression: "wps_pump_installed_piece*wps_mechanical_consumable_set_per_pump", procurement: true },
  { rowId: "rc09:wps_electrical_consumables", section: "Расходники", category: "material", title: "Электромонтажные и пусковые расходники", unitId: "set", formulaId: "wps_electrical_consumables_v2", expression: "wps_pump_installed_piece*wps_electrical_consumable_set_per_pump", procurement: true },
  { rowId: "rc09:wps_curing_compound", section: "Расходники", category: "material", title: "Материал ухода за бетоном", unitId: "l", formulaId: "wps_curing_compound_v2", expression: `(${FORMWORK})*wps_curing_compound_l_per_m2`, procurement: true },
  { rowId: "rc09:wps_test_water", section: "Испытания", category: "material", title: "Вода для испытания, промывки и дезинфекции", unitId: "m3", formulaId: "wps_test_water_v2", expression: "wps_station_count*wps_test_water_m3_per_station", procurement: true },
  { rowId: "rc09:wps_disinfection_reagent", section: "Испытания", category: "material", title: "Реагент для дезинфекции", unitId: "kg", formulaId: "wps_disinfection_reagent_v2", expression: "wps_station_count*wps_test_water_m3_per_station*wps_disinfection_reagent_kg_per_m3", procurement: true },
  { rowId: "rc09:wps_acceptance", section: "Работы", category: "construction_work", title: "Монтаж и приёмка станции повышения давления", unitId: "piece", formulaId: "wps_acceptance_v2", expression: "wps_station_count", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["wps_station_designation"] },
  { rowId: "rc09:wps_design_flow", section: "Гидравлический режим", category: "service", title: "Расчётная подача станции", unitId: "l_per_s", formulaId: "wps_design_flow_v2", expression: "wps_design_flow_lps", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_design_head", section: "Гидравлический режим", category: "service", title: "Расчётный напор станции", unitId: "m", formulaId: "wps_design_head_v2", expression: "wps_design_head_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_total_motor_power", section: "Электрика", category: "service", title: "Суммарная установленная мощность двигателей", unitId: "kW", formulaId: "wps_total_motor_power_v2", expression: "wps_pump_installed_piece*wps_motor_power_kw", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_hydraulic_functional_tests", section: "Контроль", category: "service", title: "Гидравлические и функциональные испытания", unitId: "test", formulaId: "wps_hydraulic_functional_tests_v2", expression: "wps_station_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_electrical_tests", section: "Контроль", category: "service", title: "Электрические испытания и проверка защит", unitId: "test", formulaId: "wps_electrical_tests_v2", expression: "wps_station_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_disinfection", section: "Контроль", category: "service", title: "Промывка и дезинфекция", unitId: "cycle", formulaId: "wps_disinfection_v2", expression: "wps_station_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_asbuilt", section: "Документы", category: "service", title: "Исполнительная документация и передача", unitId: "document", formulaId: "wps_asbuilt_v2", expression: "wps_station_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wps-earthworks", section: "Труд", category: "construction_work", title: "Труд на котлован, засыпку и уплотнение", unitId: "man_hour", formulaId: "wps_earthworks_labor_v2", expression: `(${EXCAVATION}+${BACKFILL_SPACE})*wps_earthworks_labor_h_per_m3` },
  { rowId: "rc09:labor:wps-concrete", section: "Труд", category: "construction_work", title: "Труд на бетонные и опалубочные работы", unitId: "man_hour", formulaId: "wps_concrete_labor_v2", expression: `(${CONCRETE_NET})*wps_concrete_labor_h_per_m3` },
  { rowId: "rc09:labor:wps-rebar", section: "Труд", category: "construction_work", title: "Труд на армирование", unitId: "man_hour", formulaId: "wps_rebar_labor_v2", expression: `((${CONCRETE_NET})*wps_reinforcement_kg_per_concrete_m3/1000)*wps_rebar_labor_h_per_t` },
  { rowId: "rc09:labor:wps-mechanical", section: "Труд", category: "construction_work", title: "Монтаж насосов, коллекторов и арматуры", unitId: "man_hour", formulaId: "wps_mechanical_labor_v2", expression: `wps_pump_installed_piece*wps_mechanical_labor_h_per_pump+(${SUCTION}+${DISCHARGE})*wps_manifold_labor_h_per_m` },
  { rowId: "rc09:labor:wps-electrical", section: "Труд", category: "construction_work", title: "Силовой электромонтаж", unitId: "man_hour", formulaId: "wps_electrical_labor_v2", expression: "wps_power_cable_route_length_m*wps_electrical_labor_h_per_cable_m" },
  { rowId: "rc09:labor:wps-controls", section: "Труд", category: "construction_work", title: "Автоматика и диспетчеризация", unitId: "man_hour", formulaId: "wps_controls_labor_v2", expression: "wps_station_count*wps_controls_labor_h_per_station" },
  { rowId: "rc09:labor:wps-qa-documentation", section: "Труд", category: "construction_work", title: "Испытания, дезинфекция и документация", unitId: "man_hour", formulaId: "wps_qa_labor_v2", expression: "wps_station_count*wps_qa_labor_h_per_station" },
  { rowId: "rc09:equipment:wps-excavator", section: "Механизмы", category: "equipment", title: "Экскаватор", unitId: "machine_hour", formulaId: "wps_excavator_v2", expression: `(${EXCAVATION})/wps_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:wps-compactor", section: "Механизмы", category: "equipment", title: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "wps_compactor_v2", expression: `(${BACKFILL_SPACE})/wps_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:wps-concrete-pump", section: "Механизмы", category: "equipment", title: "Бетононасос", unitId: "machine_hour", formulaId: "wps_concrete_pump_v2", expression: `(${CONCRETE_ORDER})/wps_concrete_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:wps-crane", section: "Механизмы", category: "equipment", title: "Кран для оборудования", unitId: "machine_hour", formulaId: "wps_crane_v2", expression: "wps_pump_installed_piece*wps_crane_h_per_pump", procurement: true },
  { rowId: "rc09:equipment:wps-test-equipment", section: "Механизмы", category: "equipment", title: "Испытательное оборудование", unitId: "machine_hour", formulaId: "wps_test_equipment_v2", expression: "wps_station_count*wps_test_equipment_h_per_station", procurement: true },
  { rowId: "rc09:logistics:wps-material-delivery", section: "Логистика", category: "service", title: "Доставка оборудования и материалов", unitId: "trip", formulaId: "wps_material_delivery_v2", expression: `max(1,ceil((${CONCRETE_ORDER}+${BLINDING}+wps_pump_installed_piece)/wps_delivery_capacity_m3_per_trip))`, procurement: true },
  { rowId: "rc09:logistics:wps-soil-removal", section: "Логистика", category: "service", title: "Вывоз лишнего грунта и отходов", unitId: "trip", formulaId: "wps_soil_removal_v2", expression: `ceil((${EXCESS_SOIL})/wps_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc09:wps-cable-balance:installed-net", section: "Баланс кабеля", category: "material", title: "Устанавливаемая длина силового кабеля", unitId: "m", formulaId: "wps_cable_installed_v2", expression: "wps_power_cable_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:expected-loss", section: "Баланс кабеля", category: "material", title: "Технологический запас кабеля", unitId: "m", formulaId: "wps_cable_loss_v2", expression: "wps_power_cable_route_length_m*wps_cable_expected_loss_fraction", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:retained-spare", section: "Баланс кабеля", category: "material", title: "Сохраняемый резерв кабеля", unitId: "m", formulaId: "wps_cable_spare_v2", expression: "wps_cable_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:available-stock", section: "Баланс кабеля", category: "material", title: "Подтверждённый доступный остаток кабеля", unitId: "m", formulaId: "wps_cable_stock_v2", expression: "wps_cable_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:total-need", section: "Баланс кабеля", category: "material", title: "Общая потребность в кабеле", unitId: "m", formulaId: "wps_cable_total_need_v2", expression: CABLE_GROSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:net-order-need", section: "Баланс кабеля", category: "material", title: "Чистая потребность к заказу", unitId: "m", formulaId: "wps_cable_net_need_v2", expression: CABLE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:drum-count", section: "Баланс кабеля", category: "material", title: "Количество кабельных барабанов", unitId: "piece", formulaId: "wps_cable_drums_v2", expression: CABLE_DRUMS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:remainder", section: "Баланс кабеля", category: "material", title: "Остаток кабеля после монтажа и потерь", unitId: "m", formulaId: "wps_cable_remainder_v2", expression: `wps_cable_available_stock_m+${CABLE_ORDER}-wps_power_cable_route_length_m-wps_power_cable_route_length_m*wps_cable_expected_loss_fraction`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps-cable-balance:surplus-beyond-spare", section: "Баланс кабеля", category: "material", title: "Свободный остаток кабеля сверх резерва", unitId: "m", formulaId: "wps_cable_surplus_v2", expression: `max(0,wps_cable_available_stock_m+${CABLE_ORDER}-(${CABLE_GROSS}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wps_excavation_shoring", section: "Условные работы", category: "construction_work", title: "Крепление котлована", unitId: "m2", formulaId: "wps_excavation_shoring_v2", expression: "wps_excavation_shoring_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "wps_excavation_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["wps_excavation_shoring_designation"] },
  { rowId: "rc09:wps_groundwater_dewatering", section: "Условные механизмы", category: "equipment", title: "Строительное водопонижение", unitId: "machine_hour", formulaId: "wps_groundwater_dewatering_v2", expression: "wps_groundwater_dewatering_machine_h", procurement: true, inclusion: { kind: "equals", parameterId: "wps_groundwater_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["wps_groundwater_dewatering_designation"] },
  { rowId: "rc09:wps_standby_generator", section: "Условное оборудование", category: "equipment", title: "Резервная дизель-генераторная установка", unitId: "set", formulaId: "wps_standby_generator_v2", expression: "wps_standby_generator_quantity_set", procurement: true, inclusion: { kind: "equals", parameterId: "wps_standby_generator_mode", value: "REQUIRED" }, titleParameterIds: ["wps_standby_generator_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.pumping-station-r1.automatic-s27-25",
  semanticOwner: "pumping-station",
  sourceId: PUMPING_STATION_SOURCE_ID,
  normId: PUMPING_STATION_NORM_ID,
  sourceMetadata: PUMPING_STATION_SOURCE_METADATA,
  applicabilityRu: "Железобетонная сухая станция повышения давления питьевой воды с полным строительным, механическим, электрическим и пусконаладочным циклом.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "sewer or fire pumping station",
    "external distribution network, reservoir, intake or treatment plant",
    "automatic inclusion of shoring, dewatering or standby generation",
    "invented price",
  ],
});

export const PUMPING_STATION_PARAMETERS = definition.parameters;
export const PUMPING_STATION_FORMULAS = definition.formulas;
export const PUMPING_STATION_RESOURCES = definition.resources;
export const PUMPING_STATION_RUNTIME_INPUT = definition.runtimeInput;
export const PUMPING_STATION_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const PUMPING_STATION_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const PUMPING_STATION_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;
export const PUMPING_STATION_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(PUMPING_STATION_RUNTIME_INPUT),
);

export const PUMPING_STATION_SHORT_INPUT = Object.freeze({
  wps_station_count: 1,
  wps_station_designation: "WPS-RC-Q120-H55-2D1S",
  wps_design_flow_lps: 120,
  wps_design_head_m: 55,
  wps_pump_installed_piece: 3,
  wps_duty_pump_count: 2,
  wps_standby_pump_count: 1,
  wps_internal_length_m: 12,
  wps_internal_width_m: 8,
  wps_internal_height_m: 4.5,
  wps_power_cable_route_length_m: 240,
});

export const PUMPING_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...PUMPING_STATION_SHORT_INPUT,
  ...PUMPING_STATION_RUNTIME_INPUT,
});

export async function compilePumpingStationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PUMPING_STATION_CATALOG_ID;
  if (catalogId !== PUMPING_STATION_CATALOG_ID) {
    throw new Error(`PUMPING_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const installed = Number(submittedParameters.wps_pump_installed_piece);
  const duty = Number(submittedParameters.wps_duty_pump_count);
  const standby = Number(submittedParameters.wps_standby_pump_count);
  if ([installed, duty, standby].every(Number.isFinite) && duty + standby !== installed) {
    throw new Error("PUMPING_STATION_PUMP_ARRANGEMENT_MISMATCH");
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.pumping-station-automatic-s27-25-r1",
    catalogId,
    primaryMeasureParameterId: "wps_station_count",
    definition,
    submittedParameters,
  });
}
