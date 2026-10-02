import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const BOOSTER_PUMPING_STATION_CATALOG_ID =
  "canonical-work:expanded:booster_pumping_station";
export const BOOSTER_PUMPING_STATION_SOURCE_ID =
  "project_booster_pumping_station_skid_automatic_v2";
export const BOOSTER_PUMPING_STATION_NORM_ID =
  "norm:project:booster_pumping_station_skid_automatic:v2";
export const BOOSTER_PUMPING_STATION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный профиль монтажа заводской повысительной насосной установки S27.25",
  source_authority: "Предварительный сценарий canonical compiler; состав skid, габариты, удельные нормы и условные решения требуют подтверждения изготовителем и проектом",
  source_document_version: "VISIBLE_PRELIMINARY_FACTORY_BOOSTER_SKID_ASSEMBLY_TO_RESOURCES_S27_25_REQUIRES_CONFIRMATION",
  definition_hash: "81f62a4ec23cf1e942e16c613bd174127418202ec3c2caa01bd422e4d89aaa84",
  exact_locator: "BPS-SKID-Q90-H45-2D1S: 1 заводской skid в подготовленном помещении, 90 м3/ч при 45 м, измеренные подключения 6 м всасывание, 8 м напор и 160 м кабель; ресурсы рассчитываются из семи первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной нормой или спецификацией изготовителя. Отдельное здание, земляные работы и внешние сети исключены; изменения помещения и резервное питание только по условным ветвям.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "81f62a4ec23cf1e942e16c613bd174127418202ec3c2caa01bd422e4d89aaa84",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "bps_skid_count", title: "Количество повысительных skid-установок", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "bps_skid_designation", title: "Обозначение выбранной skid-установки", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "bps_design_flow_m3_h", title: "Расчётная подача установки", valueType: "decimal", unitId: "m3_h", kind: "ordinary", min: 0.000_001 },
  { id: "bps_design_head_m", title: "Расчётный напор установки", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "bps_suction_tie_in_length_m", title: "Измеренная длина всасывающего подключения", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "bps_discharge_tie_in_length_m", title: "Измеренная длина напорного подключения", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "bps_power_cable_route_length_m", title: "Измеренная длина силовой кабельной трассы", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "bps_pump_installed_piece_per_skid", title: "Насосов в составе одного skid", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 3, min: 1 },
  { id: "bps_duty_pump_count_per_skid", title: "Рабочих насосов в одном skid", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 2, min: 1, resourceBranchConsumers: ["rc09:bps_pump_units"] },
  { id: "bps_standby_pump_count_per_skid", title: "Резервных насосов в одном skid", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 0, resourceBranchConsumers: ["rc09:bps_pump_units"] },
  { id: "bps_pump_designation", title: "Марка насосного агрегата", valueType: "text", unitId: null, kind: "profile", defaultValue: "VM-45M3H-45M-30KW" },
  { id: "bps_motor_power_kw", title: "Мощность двигателя одного насоса", valueType: "decimal", unitId: "kW", kind: "profile", defaultValue: 30, min: 0.000_001 },
  { id: "bps_skid_length_m", title: "Длина рамы skid", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 3, min: 0.000_001 },
  { id: "bps_skid_width_m", title: "Ширина рамы skid", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 1.5, min: 0.000_001 },
  { id: "bps_skid_mass_t", title: "Монтажная масса одного skid", valueType: "decimal", unitId: "t", kind: "profile", defaultValue: 4.5, min: 0.000_001 },
  { id: "bps_suction_manifold_designation", title: "Марка всасывающего трубопровода", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN200-PN16" },
  { id: "bps_discharge_manifold_designation", title: "Марка напорного трубопровода", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN150-PN16" },
  { id: "bps_pressure_vessel_designation", title: "Марка гидропневматического бака", valueType: "text", unitId: null, kind: "profile", defaultValue: "VESSEL-1000L-PN10" },
  { id: "bps_pressure_vessel_per_skid", title: "Гидропневматических баков на skid", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "bps_isolation_valve_designation", title: "Марка запорной арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "BUTTERFLY-VALVE-PN16" },
  { id: "bps_isolation_valve_per_pump", title: "Запорная арматура на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 2, min: 0 },
  { id: "bps_header_isolation_valve_per_skid", title: "Запорная арматура коллекторов на skid", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "bps_check_valve_designation", title: "Марка обратного клапана", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHECK-VALVE-PN16" },
  { id: "bps_check_valve_per_pump", title: "Обратные клапаны на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_flexible_connector_designation", title: "Марка гибкого соединителя", valueType: "text", unitId: null, kind: "profile", defaultValue: "FLEXIBLE-CONNECTOR-PN16" },
  { id: "bps_flexible_connector_per_pump", title: "Гибкие соединители на насос", valueType: "decimal", unitId: "pcs_per_pump", kind: "profile", defaultValue: 2, min: 0 },
  { id: "bps_flanged_joint_set_per_pump", title: "Комплекты крепежа и прокладок на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 6, min: 0 },
  { id: "bps_instrument_set_designation", title: "Комплект КИП давления и расхода", valueType: "text", unitId: null, kind: "profile", defaultValue: "BPS-FLOW-PRESSURE-INSTRUMENT-SET" },
  { id: "bps_instrument_set_per_skid", title: "Комплекты КИП на skid", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_anchor_designation", title: "Анкер рамы skid", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHEMICAL-ANCHOR-M20" },
  { id: "bps_anchor_piece_per_skid", title: "Анкеры на skid", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "bps_grout_designation", title: "Безусадочный раствор под рамой", valueType: "text", unitId: null, kind: "profile", defaultValue: "NONSHRINK-GROUT-R4" },
  { id: "bps_grout_thickness_m", title: "Средняя толщина подливки под рамой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "bps_grout_expected_loss_fraction", title: "Технологический запас раствора", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.05, min: 0, max: 1 },
  { id: "bps_mcc_vfd_designation", title: "Шкаф управления и частотного регулирования", valueType: "text", unitId: null, kind: "profile", defaultValue: "MCC-VFD-2D1S" },
  { id: "bps_plc_gateway_designation", title: "ПЛК и шлюз диспетчеризации", valueType: "text", unitId: null, kind: "profile", defaultValue: "PLC-GATEWAY-BPS" },
  { id: "bps_cable_designation", title: "Марка силового кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "N2XH-4X70-0.6/1KV" },
  { id: "bps_cable_expected_loss_fraction", title: "Технологический запас кабеля", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "bps_cable_retained_spare_m", title: "Сохраняемый резерв кабеля", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 15, min: 0 },
  { id: "bps_cable_available_stock_m", title: "Подтверждённый доступный остаток кабеля", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "bps_cable_supplier_drum_length_m", title: "Длина кабеля на барабане", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "bps_cable_termination_set_per_pump", title: "Комплекты оконцевания кабеля на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_earthing_designation", title: "Заземление и уравнивание потенциалов skid", valueType: "text", unitId: null, kind: "profile", defaultValue: "BPS-EQUIPOTENTIAL-BONDING" },
  { id: "bps_cable_tray_designation", title: "Марка кабельного лотка", valueType: "text", unitId: null, kind: "profile", defaultValue: "HOT-DIP-GALVANIZED-CABLE-TRAY" },
  { id: "bps_cable_tray_length_fraction", title: "Доля кабельной трассы в лотке", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.2625, min: 0 },
  { id: "bps_acoustic_enclosure_designation", title: "Акустический кожух skid", valueType: "text", unitId: null, kind: "profile", defaultValue: "BPS-ACOUSTIC-ENCLOSURE" },
  { id: "bps_acoustic_enclosure_per_skid", title: "Акустические кожухи на skid", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_drainage_tray_designation", title: "Поддон и аварийный дренаж", valueType: "text", unitId: null, kind: "profile", defaultValue: "BPS-DRAINAGE-TRAY-SET" },
  { id: "bps_drainage_tray_per_skid", title: "Комплекты поддона и дренажа на skid", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_mechanical_consumable_set_per_pump", title: "Механические расходники на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_electrical_consumable_set_per_pump", title: "Электромонтажные расходники на насос", valueType: "decimal", unitId: "set_per_pump", kind: "profile", defaultValue: 1, min: 0 },
  { id: "bps_test_water_m3_per_skid", title: "Вода на испытание и промывку skid", valueType: "decimal", unitId: "m3_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "bps_disinfection_reagent_kg_per_m3", title: "Реагент на кубометр промывочной воды", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "bps_rigging_base_labor_h_per_skid", title: "Базовый труд на такелаж skid", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 32, min: 0 },
  { id: "bps_rigging_labor_h_per_t", title: "Дополнительный труд на тонну skid", valueType: "decimal", unitId: "man_hour_per_t", kind: "profile", defaultValue: 7.111111111111, min: 0 },
  { id: "bps_mechanical_labor_h_per_pipe_m", title: "Труд на метр механического подключения", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 6, min: 0 },
  { id: "bps_mechanical_labor_h_per_pump", title: "Труд на насос и комплект арматуры", valueType: "decimal", unitId: "man_hour_per_pump", kind: "profile", defaultValue: 20, min: 0 },
  { id: "bps_electrical_labor_h_per_cable_m", title: "Труд на метр кабельной трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.6, min: 0 },
  { id: "bps_electrical_labor_h_per_termination", title: "Труд на комплект оконцевания", valueType: "decimal", unitId: "man_hour_per_set", kind: "profile", defaultValue: 5.333333333333, min: 0 },
  { id: "bps_controls_labor_h_per_skid", title: "Труд на автоматику и диспетчеризацию skid", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 72, min: 0 },
  { id: "bps_qa_labor_h_per_skid", title: "Труд на испытания и документацию skid", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 56, min: 0 },
  { id: "bps_lifting_base_h_per_skid", title: "Базовое время подъёмного оборудования", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 12, min: 0 },
  { id: "bps_lifting_h_per_t", title: "Дополнительное время подъёма на тонну", valueType: "decimal", unitId: "machine_hour_per_t", kind: "profile", defaultValue: 2.666666666667, min: 0 },
  { id: "bps_test_equipment_h_per_skid", title: "Испытательное оборудование на skid", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 20, min: 0 },
  { id: "bps_delivery_capacity_t_per_trip", title: "Грузоподъёмность рейса доставки", valueType: "decimal", unitId: "t_per_trip", kind: "profile", defaultValue: 1, min: 0.000_001 },
  { id: "bps_packaging_waste_m3_per_skid", title: "Объём упаковки и отходов на skid", valueType: "decimal", unitId: "m3_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "bps_waste_truck_capacity_m3", title: "Вместимость рейса вывоза отходов", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 4, min: 0.000_001 },
  { id: "bps_room_ventilation_upgrade_mode", title: "Модернизация вентиляции помещения требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "bps_floor_strengthening_mode", title: "Усиление пола требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "bps_standby_generator_mode", title: "Резервный генератор требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "bps_room_ventilation_upgrade_designation", title: "Комплект модернизации вентиляции", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "bps_room_ventilation_upgrade_mode", value: "REQUIRED" } },
  { id: "bps_room_ventilation_upgrade_quantity_set", title: "Количество комплектов модернизации вентиляции", valueType: "integer", unitId: "set", kind: "conditional", min: 1, requiredWhen: { parameterId: "bps_room_ventilation_upgrade_mode", value: "REQUIRED" } },
  { id: "bps_floor_strengthening_designation", title: "Система усиления пола", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "bps_floor_strengthening_mode", value: "REQUIRED" } },
  { id: "bps_floor_strengthening_quantity_set", title: "Количество комплектов усиления пола", valueType: "integer", unitId: "set", kind: "conditional", min: 1, requiredWhen: { parameterId: "bps_floor_strengthening_mode", value: "REQUIRED" } },
  { id: "bps_standby_generator_designation", title: "Марка резервного генератора", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "bps_standby_generator_mode", value: "REQUIRED" } },
  { id: "bps_standby_generator_quantity_set", title: "Количество резервных генераторов", valueType: "integer", unitId: "set", kind: "conditional", min: 1, requiredWhen: { parameterId: "bps_standby_generator_mode", value: "REQUIRED" } },
]);

const PUMPS = "bps_skid_count*bps_pump_installed_piece_per_skid";
const ISOLATION = `${PUMPS}*bps_isolation_valve_per_pump+bps_skid_count*bps_header_isolation_valve_per_skid`;
const TERMINATIONS = `${PUMPS}*bps_cable_termination_set_per_pump`;
const GROUT_NET = "bps_skid_count*bps_skid_length_m*bps_skid_width_m*bps_grout_thickness_m";
const GROUT_ORDER = `(${GROUT_NET})*(1+bps_grout_expected_loss_fraction)`;
const CABLE_GROSS = "bps_power_cable_route_length_m*(1+bps_cable_expected_loss_fraction)+bps_cable_retained_spare_m";
const CABLE_NET = `max(0,${CABLE_GROSS}-bps_cable_available_stock_m)`;
const CABLE_DRUMS = `ceil((${CABLE_NET})/bps_cable_supplier_drum_length_m)`;
const CABLE_ORDER = `(${CABLE_DRUMS})*bps_cable_supplier_drum_length_m`;

const included = "INCLUDED_IN_RESOURCE_ROWS" as const;
const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc09:bps_skid_package", section: "Оборудование", category: "equipment", title: "Заводская повысительная насосная skid-установка", unitId: "piece", formulaId: "bps_skid_package_v2", expression: "bps_skid_count", procurement: true, titleParameterIds: ["bps_skid_designation"] },
  { rowId: "rc09:bps_pump_units", section: "Состав skid", category: "equipment", title: "Насосные агрегаты в составе skid", unitId: "piece", formulaId: "bps_pump_units_v2", expression: PUMPS, costTreatment: included, titleParameterIds: ["bps_pump_designation"] },
  { rowId: "rc09:bps_suction_manifold", section: "Подключения", category: "material", title: "Всасывающий трубопровод подключения", unitId: "m", formulaId: "bps_suction_manifold_v2", expression: "bps_suction_tie_in_length_m", procurement: true, titleParameterIds: ["bps_suction_manifold_designation"] },
  { rowId: "rc09:bps_discharge_manifold", section: "Подключения", category: "material", title: "Напорный трубопровод подключения", unitId: "m", formulaId: "bps_discharge_manifold_v2", expression: "bps_discharge_tie_in_length_m", procurement: true, titleParameterIds: ["bps_discharge_manifold_designation"] },
  { rowId: "rc09:bps_pressure_vessels", section: "Состав skid", category: "equipment", title: "Гидропневматические баки", unitId: "piece", formulaId: "bps_pressure_vessels_v2", expression: "bps_skid_count*bps_pressure_vessel_per_skid", costTreatment: included, titleParameterIds: ["bps_pressure_vessel_designation"] },
  { rowId: "rc09:bps_isolation_valves", section: "Состав skid", category: "material", title: "Запорная арматура", unitId: "piece", formulaId: "bps_isolation_valves_v2", expression: ISOLATION, costTreatment: included, titleParameterIds: ["bps_isolation_valve_designation"] },
  { rowId: "rc09:bps_check_valves", section: "Состав skid", category: "material", title: "Обратные клапаны", unitId: "piece", formulaId: "bps_check_valves_v2", expression: `${PUMPS}*bps_check_valve_per_pump`, costTreatment: included, titleParameterIds: ["bps_check_valve_designation"] },
  { rowId: "rc09:bps_flexible_connectors", section: "Состав skid", category: "material", title: "Гибкие соединители", unitId: "piece", formulaId: "bps_flexible_connectors_v2", expression: `${PUMPS}*bps_flexible_connector_per_pump`, costTreatment: included, titleParameterIds: ["bps_flexible_connector_designation"] },
  { rowId: "rc09:bps_flanged_joint_sets", section: "Комплектующие", category: "material", title: "Прокладки и крепёж фланцевых соединений", unitId: "set", formulaId: "bps_flanged_joint_sets_v2", expression: `${PUMPS}*bps_flanged_joint_set_per_pump`, procurement: true },
  { rowId: "rc09:bps_instruments", section: "Состав skid", category: "equipment", title: "КИП давления и расхода", unitId: "set", formulaId: "bps_instruments_v2", expression: "bps_skid_count*bps_instrument_set_per_skid", costTreatment: included, titleParameterIds: ["bps_instrument_set_designation"] },
  { rowId: "rc09:bps_anchors", section: "Крепление skid", category: "material", title: "Анкеры рамы skid", unitId: "piece", formulaId: "bps_anchors_v2", expression: "bps_skid_count*bps_anchor_piece_per_skid", procurement: true, titleParameterIds: ["bps_anchor_designation"] },
  { rowId: "rc09:bps_nonshrink_grout", section: "Крепление skid", category: "material", title: "Безусадочный раствор под рамой с технологическим запасом", unitId: "m3", formulaId: "bps_grout_order_v2", expression: GROUT_ORDER, procurement: true, titleParameterIds: ["bps_grout_designation"] },
  { rowId: "rc09:bps-grout-balance:installed-net", section: "Баланс раствора", category: "material", title: "Чистый геометрический объём подливки", unitId: "m3", formulaId: "bps_grout_net_v2", expression: GROUT_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_mcc_vfd", section: "Состав skid", category: "equipment", title: "Шкаф управления и частотного регулирования", unitId: "set", formulaId: "bps_mcc_vfd_v2", expression: "bps_skid_count", costTreatment: included, titleParameterIds: ["bps_mcc_vfd_designation"] },
  { rowId: "rc09:bps_plc_gateway", section: "Состав skid", category: "equipment", title: "ПЛК и шлюз диспетчеризации", unitId: "set", formulaId: "bps_plc_gateway_v2", expression: "bps_skid_count", costTreatment: included, titleParameterIds: ["bps_plc_gateway_designation"] },
  { rowId: "rc09:bps_power_cable", section: "Электрика", category: "material", title: "Силовой кабель к закупке", unitId: "m", formulaId: "bps_power_cable_order_v2", expression: CABLE_ORDER, procurement: true, titleParameterIds: ["bps_cable_designation"] },
  { rowId: "rc09:bps_cable_terminations", section: "Электрика", category: "material", title: "Оконцевания силовых кабелей", unitId: "set", formulaId: "bps_cable_terminations_v2", expression: TERMINATIONS, procurement: true },
  { rowId: "rc09:bps_earthing", section: "Электрика", category: "material", title: "Заземление и уравнивание потенциалов skid", unitId: "set", formulaId: "bps_earthing_v2", expression: "bps_skid_count", procurement: true, titleParameterIds: ["bps_earthing_designation"] },
  { rowId: "rc09:bps_cable_tray", section: "Электрика", category: "material", title: "Кабельный лоток", unitId: "m", formulaId: "bps_cable_tray_v2", expression: "bps_power_cable_route_length_m*bps_cable_tray_length_fraction", procurement: true, titleParameterIds: ["bps_cable_tray_designation"] },
  { rowId: "rc09:bps_acoustic_enclosure", section: "Состав skid", category: "material", title: "Акустический кожух skid", unitId: "set", formulaId: "bps_acoustic_enclosure_v2", expression: "bps_skid_count*bps_acoustic_enclosure_per_skid", costTreatment: included, titleParameterIds: ["bps_acoustic_enclosure_designation"] },
  { rowId: "rc09:bps_drainage_tray", section: "Состав skid", category: "material", title: "Поддон и аварийный дренаж skid", unitId: "set", formulaId: "bps_drainage_tray_v2", expression: "bps_skid_count*bps_drainage_tray_per_skid", costTreatment: included, titleParameterIds: ["bps_drainage_tray_designation"] },
  { rowId: "rc09:bps_mechanical_consumables", section: "Расходники", category: "material", title: "Механические монтажные расходники", unitId: "set", formulaId: "bps_mechanical_consumables_v2", expression: `${PUMPS}*bps_mechanical_consumable_set_per_pump`, procurement: true },
  { rowId: "rc09:bps_electrical_consumables", section: "Расходники", category: "material", title: "Электромонтажные и пусковые расходники", unitId: "set", formulaId: "bps_electrical_consumables_v2", expression: `${PUMPS}*bps_electrical_consumable_set_per_pump`, procurement: true },
  { rowId: "rc09:bps_test_water", section: "Испытания", category: "material", title: "Вода для испытаний, промывки и дезинфекции", unitId: "m3", formulaId: "bps_test_water_v2", expression: "bps_skid_count*bps_test_water_m3_per_skid", procurement: true },
  { rowId: "rc09:bps_disinfection_reagent", section: "Испытания", category: "material", title: "Реагент для дезинфекции", unitId: "kg", formulaId: "bps_disinfection_reagent_v2", expression: "bps_skid_count*bps_test_water_m3_per_skid*bps_disinfection_reagent_kg_per_m3", procurement: true },
  { rowId: "rc09:bps_acceptance", section: "Работы", category: "construction_work", title: "Монтаж и приёмка заводской повысительной установки", unitId: "piece", formulaId: "bps_acceptance_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["bps_skid_designation"] },
  { rowId: "rc09:bps_design_flow", section: "Гидравлический режим", category: "service", title: "Расчётная подача skid", unitId: "m3_h", formulaId: "bps_design_flow_v2", expression: "bps_design_flow_m3_h", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_design_head", section: "Гидравлический режим", category: "service", title: "Расчётный напор skid", unitId: "m", formulaId: "bps_design_head_v2", expression: "bps_design_head_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_total_motor_power", section: "Электрика", category: "service", title: "Суммарная установленная мощность двигателей", unitId: "kW", formulaId: "bps_total_motor_power_v2", expression: `${PUMPS}*bps_motor_power_kw`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_pressure_test", section: "Контроль", category: "service", title: "Гидравлические испытания skid и подключений", unitId: "test", formulaId: "bps_pressure_test_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_functional_commissioning", section: "Контроль", category: "service", title: "Функциональная наладка skid", unitId: "test", formulaId: "bps_functional_commissioning_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_electrical_tests", section: "Контроль", category: "service", title: "Электрические испытания и проверка защит", unitId: "test", formulaId: "bps_electrical_tests_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_disinfection", section: "Контроль", category: "service", title: "Промывка и дезинфекция", unitId: "cycle", formulaId: "bps_disinfection_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_asbuilt", section: "Документы", category: "service", title: "Исполнительная документация и передача", unitId: "document", formulaId: "bps_asbuilt_v2", expression: "bps_skid_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:bps-rigging", section: "Труд", category: "construction_work", title: "Такелаж и установка skid", unitId: "man_hour", formulaId: "bps_rigging_labor_v2", expression: "bps_skid_count*(bps_rigging_base_labor_h_per_skid+bps_skid_mass_t*bps_rigging_labor_h_per_t)" },
  { rowId: "rc09:labor:bps-mechanical", section: "Труд", category: "construction_work", title: "Механические подключения и арматура", unitId: "man_hour", formulaId: "bps_mechanical_labor_v2", expression: `(bps_suction_tie_in_length_m+bps_discharge_tie_in_length_m)*bps_mechanical_labor_h_per_pipe_m+(${PUMPS})*bps_mechanical_labor_h_per_pump` },
  { rowId: "rc09:labor:bps-electrical", section: "Труд", category: "construction_work", title: "Силовой электромонтаж", unitId: "man_hour", formulaId: "bps_electrical_labor_v2", expression: `bps_power_cable_route_length_m*bps_electrical_labor_h_per_cable_m+(${TERMINATIONS})*bps_electrical_labor_h_per_termination` },
  { rowId: "rc09:labor:bps-controls", section: "Труд", category: "construction_work", title: "Автоматика и диспетчеризация", unitId: "man_hour", formulaId: "bps_controls_labor_v2", expression: "bps_skid_count*bps_controls_labor_h_per_skid" },
  { rowId: "rc09:labor:bps-qa-documentation", section: "Труд", category: "construction_work", title: "Испытания и документация", unitId: "man_hour", formulaId: "bps_qa_labor_v2", expression: "bps_skid_count*bps_qa_labor_h_per_skid" },
  { rowId: "rc09:equipment:bps-lifting", section: "Механизмы", category: "equipment", title: "Подъёмное оборудование", unitId: "machine_hour", formulaId: "bps_lifting_equipment_v2", expression: "bps_skid_count*(bps_lifting_base_h_per_skid+bps_skid_mass_t*bps_lifting_h_per_t)", procurement: true },
  { rowId: "rc09:equipment:bps-test", section: "Механизмы", category: "equipment", title: "Испытательное оборудование", unitId: "machine_hour", formulaId: "bps_test_equipment_v2", expression: "bps_skid_count*bps_test_equipment_h_per_skid", procurement: true },
  { rowId: "rc09:logistics:bps-delivery", section: "Логистика", category: "service", title: "Доставка skid и материалов", unitId: "trip", formulaId: "bps_delivery_v2", expression: "max(1,ceil(bps_skid_count*bps_skid_mass_t/bps_delivery_capacity_t_per_trip))", procurement: true },
  { rowId: "rc09:logistics:bps-waste-removal", section: "Логистика", category: "service", title: "Вывоз тары и отходов", unitId: "trip", formulaId: "bps_waste_removal_v2", expression: "ceil(bps_skid_count*bps_packaging_waste_m3_per_skid/bps_waste_truck_capacity_m3)", procurement: true },
  { rowId: "rc09:bps-cable-balance:installed-net", section: "Баланс кабеля", category: "material", title: "Устанавливаемая длина кабеля", unitId: "m", formulaId: "bps_cable_installed_v2", expression: "bps_power_cable_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:expected-loss", section: "Баланс кабеля", category: "material", title: "Технологический запас кабеля", unitId: "m", formulaId: "bps_cable_loss_v2", expression: "bps_power_cable_route_length_m*bps_cable_expected_loss_fraction", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:retained-spare", section: "Баланс кабеля", category: "material", title: "Сохраняемый резерв кабеля", unitId: "m", formulaId: "bps_cable_spare_v2", expression: "bps_cable_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:available-stock", section: "Баланс кабеля", category: "material", title: "Подтверждённый доступный остаток кабеля", unitId: "m", formulaId: "bps_cable_stock_v2", expression: "bps_cable_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:total-need", section: "Баланс кабеля", category: "material", title: "Общая потребность в кабеле", unitId: "m", formulaId: "bps_cable_total_need_v2", expression: CABLE_GROSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:net-order-need", section: "Баланс кабеля", category: "material", title: "Чистая потребность к заказу", unitId: "m", formulaId: "bps_cable_net_need_v2", expression: CABLE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:drum-count", section: "Баланс кабеля", category: "material", title: "Количество кабельных барабанов", unitId: "piece", formulaId: "bps_cable_drums_v2", expression: CABLE_DRUMS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:remainder", section: "Баланс кабеля", category: "material", title: "Остаток кабеля после монтажа и потерь", unitId: "m", formulaId: "bps_cable_remainder_v2", expression: `bps_cable_available_stock_m+${CABLE_ORDER}-bps_power_cable_route_length_m-bps_power_cable_route_length_m*bps_cable_expected_loss_fraction`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps-cable-balance:surplus-beyond-spare", section: "Баланс кабеля", category: "material", title: "Свободный остаток кабеля сверх резерва", unitId: "m", formulaId: "bps_cable_surplus_v2", expression: `max(0,bps_cable_available_stock_m+${CABLE_ORDER}-(${CABLE_GROSS}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:bps_room_ventilation_upgrade", section: "Условные системы", category: "equipment", title: "Модернизация вентиляции помещения", unitId: "set", formulaId: "bps_room_ventilation_upgrade_v2", expression: "bps_room_ventilation_upgrade_quantity_set", procurement: true, inclusion: { kind: "equals", parameterId: "bps_room_ventilation_upgrade_mode", value: "REQUIRED" }, titleParameterIds: ["bps_room_ventilation_upgrade_designation"] },
  { rowId: "rc09:bps_floor_strengthening", section: "Условные работы", category: "construction_work", title: "Усиление существующего пола", unitId: "set", formulaId: "bps_floor_strengthening_v2", expression: "bps_floor_strengthening_quantity_set", procurement: true, inclusion: { kind: "equals", parameterId: "bps_floor_strengthening_mode", value: "REQUIRED" }, titleParameterIds: ["bps_floor_strengthening_designation"] },
  { rowId: "rc09:bps_standby_generator", section: "Условное оборудование", category: "equipment", title: "Резервная дизель-генераторная установка", unitId: "set", formulaId: "bps_standby_generator_v2", expression: "bps_standby_generator_quantity_set", procurement: true, inclusion: { kind: "equals", parameterId: "bps_standby_generator_mode", value: "REQUIRED" }, titleParameterIds: ["bps_standby_generator_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.booster-pumping-station-r1.automatic-s27-25",
  semanticOwner: "booster-pumping-station",
  sourceId: BOOSTER_PUMPING_STATION_SOURCE_ID,
  normId: BOOSTER_PUMPING_STATION_NORM_ID,
  sourceMetadata: BOOSTER_PUMPING_STATION_SOURCE_METADATA,
  applicabilityRu: "Заводская повысительная насосная skid-установка питьевой воды в существующем подготовленном помещении.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "freestanding station building, excavation or external network",
    "sewer or fire pumping station",
    "automatic room alteration or standby generation",
    "invented price",
  ],
});

export const BOOSTER_PUMPING_STATION_PARAMETERS = definition.parameters;
export const BOOSTER_PUMPING_STATION_FORMULAS = definition.formulas;
export const BOOSTER_PUMPING_STATION_RESOURCES = definition.resources;
export const BOOSTER_PUMPING_STATION_RUNTIME_INPUT = definition.runtimeInput;
export const BOOSTER_PUMPING_STATION_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const BOOSTER_PUMPING_STATION_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const BOOSTER_PUMPING_STATION_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;
export const BOOSTER_PUMPING_STATION_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(BOOSTER_PUMPING_STATION_RUNTIME_INPUT),
);

export const BOOSTER_PUMPING_STATION_SHORT_INPUT = Object.freeze({
  bps_skid_count: 1,
  bps_skid_designation: "BPS-SKID-Q90-H45-2D1S",
  bps_design_flow_m3_h: 90,
  bps_design_head_m: 45,
  bps_suction_tie_in_length_m: 6,
  bps_discharge_tie_in_length_m: 8,
  bps_power_cable_route_length_m: 160,
});

export const BOOSTER_PUMPING_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...BOOSTER_PUMPING_STATION_SHORT_INPUT,
  ...BOOSTER_PUMPING_STATION_RUNTIME_INPUT,
});

export async function compileBoosterPumpingStationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? BOOSTER_PUMPING_STATION_CATALOG_ID;
  if (catalogId !== BOOSTER_PUMPING_STATION_CATALOG_ID) {
    throw new Error(`BOOSTER_PUMPING_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const merged = { ...BOOSTER_PUMPING_STATION_RUNTIME_INPUT, ...submittedParameters };
  const installed = Number(merged.bps_pump_installed_piece_per_skid);
  const duty = Number(merged.bps_duty_pump_count_per_skid);
  const standby = Number(merged.bps_standby_pump_count_per_skid);
  if ([installed, duty, standby].every(Number.isFinite) && duty + standby !== installed) {
    throw new Error("BOOSTER_PUMPING_STATION_PUMP_ARRANGEMENT_MISMATCH");
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.booster-pumping-station-automatic-s27-25-r1",
    catalogId,
    primaryMeasureParameterId: "bps_skid_count",
    definition,
    submittedParameters,
  });
}
