import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const FILTRATION_STATION_CATALOG_ID =
  "canonical-work:expanded:filtration_station";
export const FILTRATION_STATION_SOURCE_ID =
  "project_filtration_station_geometric_automatic_v1";
export const FILTRATION_STATION_NORM_ID =
  "norm:project:filtration_station_geometric_automatic:v1";
export const FILTRATION_STATION_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный геометрический профиль фильтровальной станции S27.26",
  source_authority: "Предварительный сценарий canonical compiler; конструкция, технология фильтрации, оборудование и удельные нормы требуют подтверждения проектом и поставщиком",
  source_document_version: "VISIBLE_PRELIMINARY_FILTRATION_STATION_GEOMETRY_TO_RESOURCES_S27_26_REQUIRES_CONFIRMATION",
  definition_hash: "fa4cb187b1fdabd2ecd00be07d2b22f1de8b926e14668b7bc5b52438f0e52f25",
  exact_locator: "FS-RGF-5000-4C: одна станция, четыре ячейки 8x5 м, двухслойная загрузка 0,8 м, блочный дренаж и промывочный водовоздушный пакет; ресурсы рассчитываются из десяти первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной нормой или проектом. Водозабор, коагуляция, отстаивание, обеззараживание, резервуары и наружные сети исключены; крепление котлована, водопонижение и резервное питание включаются только по условным проектным ветвям.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "fa4cb187b1fdabd2ecd00be07d2b22f1de8b926e14668b7bc5b52438f0e52f25",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "flt_station_count", title: "Количество фильтровальных станций", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "flt_station_designation", title: "Обозначение выбранной фильтровальной станции", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "flt_design_capacity_m3_day", title: "Расчётная производительность станции", valueType: "decimal", unitId: "m3_day", kind: "ordinary", min: 0.000_001 },
  { id: "flt_filter_cell_count", title: "Количество фильтровальных ячеек на станцию", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "flt_filter_internal_length_m", title: "Внутренняя длина фильтровальной ячейки", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "flt_filter_internal_width_m", title: "Внутренняя ширина фильтровальной ячейки", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "flt_filter_media_designation", title: "Тип и марка фильтрующей загрузки", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "flt_filter_media_depth_m", title: "Общая глубина фильтрующей загрузки", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "flt_underdrain_designation", title: "Тип дренажно-распределительной системы", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "flt_backwash_package_designation", title: "Тип промывочного водовоздушного пакета", valueType: "text", unitId: null, kind: "ordinary" },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "flt_cell_water_depth_m", title: "Рабочая глубина воды в ячейке", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 3.2, min: 0.000_001 },
  { id: "flt_wall_thickness_m", title: "Толщина стен и перегородок", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0.000_001 },
  { id: "flt_base_slab_thickness_m", title: "Толщина днища фильтровального блока", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.35, min: 0.000_001 },
  { id: "flt_building_floor_slab_thickness_m", title: "Толщина пола технологического здания вне ячеек", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.2, min: 0.000_001 },
  { id: "flt_service_aisle_m", title: "Ширина технологического прохода вокруг блока", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 2, min: 0 },
  { id: "flt_building_clear_height_m", title: "Чистая высота технологического здания", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 6, min: 0.000_001 },
  { id: "flt_excavation_depth_m", title: "Глубина разработки под сооружение", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 1.2, min: 0.000_001 },
  { id: "flt_excavation_working_clearance_m", title: "Рабочий зазор котлована", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.8, min: 0 },
  { id: "flt_blinding_thickness_m", title: "Толщина бетонной подготовки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "flt_blinding_designation", title: "Марка бетонной подготовки", valueType: "text", unitId: null, kind: "profile", defaultValue: "B7.5-W4" },
  { id: "flt_concrete_designation", title: "Марка конструкционного бетона", valueType: "text", unitId: null, kind: "profile", defaultValue: "B30-W10-F200" },
  { id: "flt_concrete_expected_loss_fraction", title: "Технологический запас бетона", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "flt_reinforcement_designation", title: "Класс арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "A500C" },
  { id: "flt_reinforcement_kg_per_concrete_m3", title: "Арматура на объём железобетона", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 140, min: 0 },
  { id: "flt_formwork_designation", title: "Система опалубки", valueType: "text", unitId: null, kind: "profile", defaultValue: "PANEL-FORMWORK-WATER-RETAINING-RC" },
  { id: "flt_internal_lining_designation", title: "Система внутренней водостойкой облицовки", valueType: "text", unitId: null, kind: "profile", defaultValue: "POTABLE-WATER-EPOXY-LINING" },
  { id: "flt_external_waterproofing_designation", title: "Система наружной гидроизоляции", valueType: "text", unitId: null, kind: "profile", defaultValue: "2L-BITUMEN-POLYMER-WATERPROOFING" },
  { id: "flt_waterstop_designation", title: "Гидрошпонка рабочих швов", valueType: "text", unitId: null, kind: "profile", defaultValue: "PVC-WATERSTOP-320MM" },
  { id: "flt_joint_sealant_designation", title: "Герметик рабочих швов", valueType: "text", unitId: null, kind: "profile", defaultValue: "PU-POTABLE-WATER-JOINT-SEALANT" },
  { id: "flt_joint_sealant_kg_per_waterstop_m", title: "Герметик на метр шва", valueType: "decimal", unitId: "kg_per_m", kind: "profile", defaultValue: 0.18, min: 0 },
  { id: "flt_structural_steel_designation", title: "Металлокаркас технологического здания", valueType: "text", unitId: null, kind: "profile", defaultValue: "S355-HDG-FILTER-HALL-FRAME" },
  { id: "flt_structural_steel_kg_per_floor_m2", title: "Металлокаркас на площадь здания", valueType: "decimal", unitId: "kg_per_m2", kind: "profile", defaultValue: 32, min: 0 },
  { id: "flt_wall_panel_designation", title: "Стеновые панели здания", valueType: "text", unitId: null, kind: "profile", defaultValue: "MINERAL-WOOL-SANDWICH-PANEL-100MM" },
  { id: "flt_roof_panel_designation", title: "Кровельные панели здания", valueType: "text", unitId: null, kind: "profile", defaultValue: "MINERAL-WOOL-ROOF-PANEL-150MM" },
  { id: "flt_floor_coating_designation", title: "Защитное покрытие пола", valueType: "text", unitId: null, kind: "profile", defaultValue: "CHEMICAL-RESISTANT-EPOXY-FLOOR" },
  { id: "flt_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.7, min: 0, max: 1 },
  { id: "flt_excavated_soil_swell_factor", title: "Коэффициент разрыхления грунта", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "flt_imported_backfill_designation", title: "Материал привозной обратной засыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "SELECTED-SAND-GRAVEL-BACKFILL" },
  { id: "flt_filter_media_bulk_density_t_m3", title: "Насыпная плотность фильтрующей загрузки", valueType: "decimal", unitId: "t_per_m3", kind: "profile", defaultValue: 1.3, min: 0.000_001 },
  { id: "flt_filter_media_expected_loss_fraction", title: "Технологический запас загрузки при укладке", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "flt_filter_media_retained_spare_t", title: "Сохраняемый резерв фильтрующей загрузки", valueType: "decimal", unitId: "t", kind: "profile", defaultValue: 2, min: 0 },
  { id: "flt_filter_media_available_stock_t", title: "Подтверждённый складской остаток загрузки", valueType: "decimal", unitId: "t", kind: "profile", defaultValue: 0, min: 0 },
  { id: "flt_filter_media_supplier_package_t", title: "Масса загрузки в поставочной упаковке", valueType: "decimal", unitId: "t", kind: "profile", defaultValue: 1, min: 0.000_001 },
  { id: "flt_support_gravel_designation", title: "Марка поддерживающего гравия", valueType: "text", unitId: null, kind: "profile", defaultValue: "WASHED-GRADED-GRAVEL-2-32MM" },
  { id: "flt_support_gravel_depth_m", title: "Глубина поддерживающего слоя", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0 },
  { id: "flt_support_gravel_bulk_density_t_m3", title: "Насыпная плотность поддерживающего гравия", valueType: "decimal", unitId: "t_per_m3", kind: "profile", defaultValue: 1.7, min: 0.000_001 },
  { id: "flt_support_gravel_expected_loss_fraction", title: "Технологический запас гравия", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "flt_underdrain_block_coverage_m2_piece", title: "Площадь на один дренажный блок", valueType: "decimal", unitId: "m2_per_piece", kind: "profile", defaultValue: 0.25, min: 0.000_001 },
  { id: "flt_nozzle_designation", title: "Марка дренажной форсунки", valueType: "text", unitId: null, kind: "profile", defaultValue: "PP-FILTER-NOZZLE-0.25MM" },
  { id: "flt_nozzle_piece_per_filter_m2", title: "Количество форсунок на площадь фильтра", valueType: "decimal", unitId: "pcs_per_m2", kind: "profile", defaultValue: 36, min: 0 },
  { id: "flt_wash_trough_designation", title: "Марка промывного желоба", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS316L-WASH-TROUGH" },
  { id: "flt_wash_trough_count_per_cell", title: "Количество промывных желобов на ячейку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 3, min: 0 },
  { id: "flt_inlet_pipe_designation", title: "Марка внутреннего подающего трубопровода", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN300-PN10" },
  { id: "flt_outlet_pipe_designation", title: "Марка внутреннего отвода фильтрата", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN300-PN10" },
  { id: "flt_backwash_pipe_designation", title: "Марка трубопровода промывной воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN400-PN10" },
  { id: "flt_air_pipe_designation", title: "Марка трубопровода промывочного воздуха", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN200-PN10" },
  { id: "flt_drain_pipe_designation", title: "Марка трубопровода грязной промывной воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "HDPE-PE100-RC-SDR17-OD400" },
  { id: "flt_pipe_allowance_m_per_cell", title: "Монтажный запас каждого внутреннего трубопровода на ячейку", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 3, min: 0 },
  { id: "flt_process_valve_designation", title: "Марка технологической запорной арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "BUTTERFLY-VALVE-PN10-ACTUATED" },
  { id: "flt_process_valve_piece_per_cell", title: "Технологических клапанов на ячейку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 5, min: 0 },
  { id: "flt_dismantling_joint_piece_per_valve", title: "Демонтажных вставок на клапан", valueType: "decimal", unitId: "pcs_per_valve", kind: "profile", defaultValue: 1, min: 0 },
  { id: "flt_pipe_support_piece_per_pipe_m", title: "Опор на метр внутреннего трубопровода", valueType: "decimal", unitId: "pcs_per_m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "flt_backwash_pump_designation", title: "Марка насоса промывной воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "BW-PUMP-250LPS-18M" },
  { id: "flt_backwash_pump_piece_per_station", title: "Насосов промывной воды на станцию", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 2, min: 1 },
  { id: "flt_backwash_blower_designation", title: "Марка воздуходувки промывки", valueType: "text", unitId: null, kind: "profile", defaultValue: "BW-BLOWER-6000M3H-60KPA" },
  { id: "flt_backwash_blower_piece_per_station", title: "Воздуходувок промывки на станцию", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 2, min: 1 },
  { id: "flt_air_receiver_designation", title: "Марка ресивера промывочного воздуха", valueType: "text", unitId: null, kind: "profile", defaultValue: "AIR-RECEIVER-5M3-10BAR" },
  { id: "flt_flowmeter_piece_per_cell", title: "Расходомеров на ячейку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "flt_turbidity_meter_piece_per_cell", title: "Мутномеров фильтрата на ячейку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "flt_level_instrument_piece_per_cell", title: "Датчиков уровня на ячейку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "flt_mcc_designation", title: "Шкаф управления электроприводами", valueType: "text", unitId: null, kind: "profile", defaultValue: "MCC-IP54-FILTRATION-BACKWASH" },
  { id: "flt_plc_designation", title: "Шкаф автоматизации фильтров", valueType: "text", unitId: null, kind: "profile", defaultValue: "PLC-SCADA-FILTRATION-4CELL" },
  { id: "flt_power_cable_designation", title: "Марка силового кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "N2XH-0.6/1KV-FILTER-PLANT" },
  { id: "flt_power_cable_m_per_driven_unit", title: "Силовой кабель на приводной агрегат", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 35, min: 0 },
  { id: "flt_control_cable_designation", title: "Марка контрольного кабеля", valueType: "text", unitId: null, kind: "profile", defaultValue: "LSZH-INSTRUMENTATION-CABLE" },
  { id: "flt_control_cable_m_per_instrument", title: "Контрольный кабель на прибор или привод", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 25, min: 0 },
  { id: "flt_cable_tray_designation", title: "Система кабельных лотков", valueType: "text", unitId: null, kind: "profile", defaultValue: "HDG-CABLE-TRAY-IP54" },
  { id: "flt_cable_tray_fraction_of_total_cable", title: "Доля трассы кабелей в лотке", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.35, min: 0, max: 1 },
  { id: "flt_earthing_designation", title: "Система уравнивания потенциалов", valueType: "text", unitId: null, kind: "profile", defaultValue: "CU-BARE-25MM2-EARTHING" },
  { id: "flt_earthing_m_per_cell", title: "Заземляющий проводник на ячейку", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 18, min: 0 },
  { id: "flt_process_consumable_set_per_cell", title: "Комплект технологических расходников на ячейку", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "flt_electrical_consumable_set_per_station", title: "Комплект электромонтажных расходников на станцию", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "flt_test_water_turnovers", title: "Кратность воды для испытания и промывки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 2, min: 0 },
  { id: "flt_disinfection_reagent_kg_per_test_water_m3", title: "Реагент на объём испытательной воды", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "flt_civil_labor_h_per_concrete_m3", title: "Труд общестроительных работ на бетон", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 8, min: 0 },
  { id: "flt_media_labor_h_per_t", title: "Труд по устройству загрузки", valueType: "decimal", unitId: "man_hour_per_t", kind: "profile", defaultValue: 3, min: 0 },
  { id: "flt_process_labor_h_per_pipe_m", title: "Труд технологического монтажа на метр труб", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 3.5, min: 0 },
  { id: "flt_electrical_labor_h_per_cable_m", title: "Труд электромонтажа на метр кабеля", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.35, min: 0 },
  { id: "flt_commissioning_labor_h_per_cell", title: "Труд ПНР на ячейку", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 32, min: 0 },
  { id: "flt_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 20, min: 0.000_001 },
  { id: "flt_compactor_productivity_m3_h", title: "Производительность уплотнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 14, min: 0.000_001 },
  { id: "flt_concrete_pump_productivity_m3_h", title: "Производительность бетононасоса", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 14, min: 0.000_001 },
  { id: "flt_crane_h_per_equipment_piece", title: "Работа крана на единицу оборудования", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "flt_welding_h_per_pipe_m", title: "Работа сварочного оборудования на метр трубы", valueType: "decimal", unitId: "machine_hour_per_m", kind: "profile", defaultValue: 0.45, min: 0 },
  { id: "flt_test_equipment_h_per_cell", title: "Испытательное оборудование на ячейку", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "flt_concrete_delivery_capacity_m3_trip", title: "Вместимость рейса бетона", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 7, min: 0.000_001 },
  { id: "flt_media_delivery_capacity_t_trip", title: "Масса загрузки на рейс", valueType: "decimal", unitId: "t_per_trip", kind: "profile", defaultValue: 20, min: 0.000_001 },
  { id: "flt_equipment_piece_per_delivery_trip", title: "Единиц оборудования на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 4, min: 0.000_001 },
  { id: "flt_soil_truck_capacity_m3", title: "Вместимость рейса вывоза грунта", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "flt_excavation_shoring_mode", title: "Крепление котлована требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "flt_groundwater_dewatering_mode", title: "Строительное водопонижение требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "flt_standby_power_mode", title: "Резервное питание входит в границу", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "flt_excavation_shoring_designation", title: "Система крепления котлована", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "flt_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "flt_excavation_shoring_area_m2", title: "Площадь крепления котлована", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "flt_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "flt_groundwater_dewatering_designation", title: "Система водопонижения", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "flt_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "flt_groundwater_dewatering_machine_h", title: "Работа системы водопонижения", valueType: "decimal", unitId: "machine_hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "flt_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "flt_standby_power_designation", title: "Комплект резервного питания", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "flt_standby_power_mode", value: "REQUIRED" } },
  { id: "flt_standby_power_kva", title: "Номинальная мощность резервного питания", valueType: "decimal", unitId: "kva", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "flt_standby_power_mode", value: "REQUIRED" } },
]);

const BLOCK_LENGTH = "(flt_filter_cell_count*flt_filter_internal_length_m+(flt_filter_cell_count+1)*flt_wall_thickness_m)";
const BLOCK_WIDTH = "(flt_filter_internal_width_m+2*flt_wall_thickness_m)";
const BUILDING_LENGTH = `(${BLOCK_LENGTH}+2*flt_service_aisle_m)`;
const BUILDING_WIDTH = `(${BLOCK_WIDTH}+2*flt_service_aisle_m)`;
const BUILDING_FLOOR = `flt_station_count*${BUILDING_LENGTH}*${BUILDING_WIDTH}`;
const FILTER_AREA = "flt_station_count*flt_filter_cell_count*flt_filter_internal_length_m*flt_filter_internal_width_m";
const EXCAVATION = `flt_station_count*(${BUILDING_LENGTH}+2*flt_excavation_working_clearance_m)*(${BUILDING_WIDTH}+2*flt_excavation_working_clearance_m)*(flt_excavation_depth_m+flt_blinding_thickness_m)`;
const BLINDING = `flt_station_count*(${BUILDING_LENGTH}+0.4)*(${BUILDING_WIDTH}+0.4)*flt_blinding_thickness_m`;
const CELL_WALL_LENGTH = `(2*${BLOCK_LENGTH}+2*${BLOCK_WIDTH}+(flt_filter_cell_count-1)*${BLOCK_WIDTH})`;
const CONCRETE_NET = `flt_station_count*(${BLOCK_LENGTH}*${BLOCK_WIDTH}*flt_base_slab_thickness_m+${CELL_WALL_LENGTH}*flt_cell_water_depth_m*flt_wall_thickness_m+(${BUILDING_LENGTH}*${BUILDING_WIDTH}-${BLOCK_LENGTH}*${BLOCK_WIDTH})*flt_building_floor_slab_thickness_m)`;
const CONCRETE_ORDER = `(${CONCRETE_NET})*(1+flt_concrete_expected_loss_fraction)`;
const FORMWORK = `flt_station_count*(2*${CELL_WALL_LENGTH}*flt_cell_water_depth_m+2*${BLOCK_LENGTH}*${BLOCK_WIDTH})`;
const LINING = `flt_station_count*flt_filter_cell_count*(flt_filter_internal_length_m*flt_filter_internal_width_m+2*(flt_filter_internal_length_m+flt_filter_internal_width_m)*flt_cell_water_depth_m)`;
const WATERSTOP = `flt_station_count*(2*(${BLOCK_LENGTH}+${BLOCK_WIDTH})+(flt_filter_cell_count-1)*${BLOCK_WIDTH})`;
const WALL_PANELS = `flt_station_count*2*(${BUILDING_LENGTH}+${BUILDING_WIDTH})*flt_building_clear_height_m`;
const BACKFILL = `max(0,${EXCAVATION}-flt_station_count*${BUILDING_LENGTH}*${BUILDING_WIDTH}*flt_excavation_depth_m)`;
const EXCESS_SOIL = `max(0,(${EXCAVATION})*flt_excavated_soil_swell_factor-(${BACKFILL})*flt_excavated_soil_reuse_fraction)`;
const MEDIA_INSTALLED = `(${FILTER_AREA})*flt_filter_media_depth_m*flt_filter_media_bulk_density_t_m3*(1+flt_filter_media_expected_loss_fraction)`;
const MEDIA_TOTAL_NEED = `(${MEDIA_INSTALLED})+flt_filter_media_retained_spare_t`;
const MEDIA_NET_NEED = `max(0,(${MEDIA_TOTAL_NEED})-flt_filter_media_available_stock_t)`;
const MEDIA_PACKAGES = `ceil((${MEDIA_NET_NEED})/flt_filter_media_supplier_package_t)`;
const MEDIA_ORDER = `(${MEDIA_PACKAGES})*flt_filter_media_supplier_package_t`;
const SUPPORT_GRAVEL = `(${FILTER_AREA})*flt_support_gravel_depth_m*flt_support_gravel_bulk_density_t_m3*(1+flt_support_gravel_expected_loss_fraction)`;
const CELL_COUNT = "flt_station_count*flt_filter_cell_count";
const PIPE_PER_SERVICE = `(${CELL_COUNT})*(2*flt_filter_internal_width_m+flt_pipe_allowance_m_per_cell)`;
const TOTAL_PIPE = `5*(${PIPE_PER_SERVICE})`;
const PROCESS_VALVES = `(${CELL_COUNT})*flt_process_valve_piece_per_cell`;
const PUMPS = "flt_station_count*flt_backwash_pump_piece_per_station";
const BLOWERS = "flt_station_count*flt_backwash_blower_piece_per_station";
const INSTRUMENTS = `(${CELL_COUNT})*(flt_flowmeter_piece_per_cell+flt_turbidity_meter_piece_per_cell+flt_level_instrument_piece_per_cell)`;
const POWER_CABLE = `((${PUMPS})+(${BLOWERS}))*flt_power_cable_m_per_driven_unit`;
const CONTROL_CABLE = `((${INSTRUMENTS})+(${PROCESS_VALVES}))*flt_control_cable_m_per_instrument`;
const TEST_WATER = `(${FILTER_AREA})*(flt_cell_water_depth_m+flt_filter_media_depth_m+flt_support_gravel_depth_m)*flt_test_water_turnovers`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc10:flt_acceptance", section: "Работы", category: "construction_work", title: "Строительство, оснащение и приёмка фильтровальной станции", unitId: "piece", formulaId: "flt_acceptance_v1", expression: "flt_station_count", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["flt_station_designation"] },
  { rowId: "rc10:flt_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка котлована фильтровальной станции", unitId: "m3", formulaId: "flt_excavation_v1", expression: EXCAVATION, procurement: true },
  { rowId: "rc10:flt_blinding", section: "Железобетон", category: "material", title: "Бетонная подготовка", unitId: "m3", formulaId: "flt_blinding_v1", expression: BLINDING, procurement: true, titleParameterIds: ["flt_blinding_designation"] },
  { rowId: "rc10:flt_structural_concrete", section: "Железобетон", category: "material", title: "Конструкционный бетон фильтровального блока и пола", unitId: "m3", formulaId: "flt_structural_concrete_v1", expression: CONCRETE_ORDER, procurement: true, titleParameterIds: ["flt_concrete_designation"] },
  { rowId: "rc10:flt_reinforcement", section: "Железобетон", category: "material", title: "Арматура фильтровального блока", unitId: "t", formulaId: "flt_reinforcement_v1", expression: `(${CONCRETE_NET})*flt_reinforcement_kg_per_concrete_m3/1000`, procurement: true, titleParameterIds: ["flt_reinforcement_designation"] },
  { rowId: "rc10:flt_formwork", section: "Железобетон", category: "construction_work", title: "Опалубка фильтровального блока", unitId: "m2", formulaId: "flt_formwork_v1", expression: FORMWORK, procurement: true, titleParameterIds: ["flt_formwork_designation"] },
  { rowId: "rc10:flt_internal_lining", section: "Защитные покрытия", category: "material", title: "Внутренняя водостойкая облицовка ячеек", unitId: "m2", formulaId: "flt_internal_lining_v1", expression: LINING, procurement: true, titleParameterIds: ["flt_internal_lining_designation"] },
  { rowId: "rc10:flt_external_waterproofing", section: "Защитные покрытия", category: "material", title: "Наружная гидроизоляция подземной части", unitId: "m2", formulaId: "flt_external_waterproofing_v1", expression: `flt_station_count*(2*(${BUILDING_LENGTH}+${BUILDING_WIDTH})*flt_excavation_depth_m+${BUILDING_LENGTH}*${BUILDING_WIDTH})`, procurement: true, titleParameterIds: ["flt_external_waterproofing_designation"] },
  { rowId: "rc10:flt_waterstop", section: "Герметизация", category: "material", title: "Гидрошпонка рабочих швов", unitId: "m", formulaId: "flt_waterstop_v1", expression: WATERSTOP, procurement: true, titleParameterIds: ["flt_waterstop_designation"] },
  { rowId: "rc10:flt_joint_sealant", section: "Герметизация", category: "material", title: "Герметик рабочих швов", unitId: "kg", formulaId: "flt_joint_sealant_v1", expression: `(${WATERSTOP})*flt_joint_sealant_kg_per_waterstop_m`, procurement: true, titleParameterIds: ["flt_joint_sealant_designation"] },
  { rowId: "rc10:flt_structural_steel", section: "Здание", category: "material", title: "Металлокаркас технологического здания", unitId: "t", formulaId: "flt_structural_steel_v1", expression: `(${BUILDING_FLOOR})*flt_structural_steel_kg_per_floor_m2/1000`, procurement: true, titleParameterIds: ["flt_structural_steel_designation"] },
  { rowId: "rc10:flt_wall_panels", section: "Здание", category: "material", title: "Стеновые панели технологического здания", unitId: "m2", formulaId: "flt_wall_panels_v1", expression: WALL_PANELS, procurement: true, titleParameterIds: ["flt_wall_panel_designation"] },
  { rowId: "rc10:flt_roof_panels", section: "Здание", category: "material", title: "Кровельные панели технологического здания", unitId: "m2", formulaId: "flt_roof_panels_v1", expression: BUILDING_FLOOR, procurement: true, titleParameterIds: ["flt_roof_panel_designation"] },
  { rowId: "rc10:flt_floor_coating", section: "Здание", category: "material", title: "Химстойкое покрытие технологического пола", unitId: "m2", formulaId: "flt_floor_coating_v1", expression: BUILDING_FLOOR, procurement: true, titleParameterIds: ["flt_floor_coating_designation"] },
  { rowId: "rc10:flt_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка и уплотнение", unitId: "m3", formulaId: "flt_backfill_v1", expression: BACKFILL, procurement: true },
  { rowId: "rc10:flt_imported_backfill", section: "Земляные работы", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "flt_imported_backfill_v1", expression: `(${BACKFILL})*(1-flt_excavated_soil_reuse_fraction)`, procurement: true, titleParameterIds: ["flt_imported_backfill_designation"] },
  { rowId: "rc10:flt_excess_soil", section: "Земляные работы", category: "construction_work", title: "Погрузка и вывоз лишнего грунта", unitId: "m3", formulaId: "flt_excess_soil_v1", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc10:flt_filter_media", section: "Фильтрующая загрузка", category: "material", title: "Фильтрующая загрузка к поставке", unitId: "t", formulaId: "flt_filter_media_order_v1", expression: MEDIA_ORDER, procurement: true, titleParameterIds: ["flt_filter_media_designation"] },
  { rowId: "rc10:flt_support_gravel", section: "Фильтрующая загрузка", category: "material", title: "Поддерживающий гравий", unitId: "t", formulaId: "flt_support_gravel_v1", expression: SUPPORT_GRAVEL, procurement: true, titleParameterIds: ["flt_support_gravel_designation"] },
  { rowId: "rc10:flt_underdrain_blocks", section: "Дренажно-распределительная система", category: "material", title: "Дренажно-распределительные блоки", unitId: "piece", formulaId: "flt_underdrain_blocks_v1", expression: `ceil((${FILTER_AREA})/flt_underdrain_block_coverage_m2_piece)`, procurement: true, titleParameterIds: ["flt_underdrain_designation"] },
  { rowId: "rc10:flt_underdrain_nozzles", section: "Дренажно-распределительная система", category: "material", title: "Дренажные форсунки", unitId: "piece", formulaId: "flt_underdrain_nozzles_v1", expression: `ceil((${FILTER_AREA})*flt_nozzle_piece_per_filter_m2)`, procurement: true, titleParameterIds: ["flt_nozzle_designation"] },
  { rowId: "rc10:flt_wash_troughs", section: "Дренажно-распределительная система", category: "material", title: "Промывные желоба", unitId: "m", formulaId: "flt_wash_troughs_v1", expression: `(${CELL_COUNT})*flt_filter_internal_length_m*flt_wash_trough_count_per_cell`, procurement: true, titleParameterIds: ["flt_wash_trough_designation"] },
  { rowId: "rc10:flt_inlet_pipe", section: "Технологические трубопроводы", category: "material", title: "Подающий трубопровод внутри станции", unitId: "m", formulaId: "flt_inlet_pipe_v1", expression: PIPE_PER_SERVICE, procurement: true, titleParameterIds: ["flt_inlet_pipe_designation"] },
  { rowId: "rc10:flt_outlet_pipe", section: "Технологические трубопроводы", category: "material", title: "Трубопровод фильтрата внутри станции", unitId: "m", formulaId: "flt_outlet_pipe_v1", expression: PIPE_PER_SERVICE, procurement: true, titleParameterIds: ["flt_outlet_pipe_designation"] },
  { rowId: "rc10:flt_backwash_pipe", section: "Технологические трубопроводы", category: "material", title: "Трубопровод промывной воды", unitId: "m", formulaId: "flt_backwash_pipe_v1", expression: PIPE_PER_SERVICE, procurement: true, titleParameterIds: ["flt_backwash_pipe_designation"] },
  { rowId: "rc10:flt_air_pipe", section: "Технологические трубопроводы", category: "material", title: "Трубопровод промывочного воздуха", unitId: "m", formulaId: "flt_air_pipe_v1", expression: PIPE_PER_SERVICE, procurement: true, titleParameterIds: ["flt_air_pipe_designation"] },
  { rowId: "rc10:flt_drain_pipe", section: "Технологические трубопроводы", category: "material", title: "Трубопровод грязной промывной воды", unitId: "m", formulaId: "flt_drain_pipe_v1", expression: PIPE_PER_SERVICE, procurement: true, titleParameterIds: ["flt_drain_pipe_designation"] },
  { rowId: "rc10:flt_process_valves", section: "Технологическая арматура", category: "equipment", title: "Клапаны фильтровальных ячеек", unitId: "piece", formulaId: "flt_process_valves_v1", expression: PROCESS_VALVES, procurement: true, titleParameterIds: ["flt_process_valve_designation"] },
  { rowId: "rc10:flt_dismantling_joints", section: "Технологическая арматура", category: "material", title: "Демонтажные вставки клапанов", unitId: "piece", formulaId: "flt_dismantling_joints_v1", expression: `(${PROCESS_VALVES})*flt_dismantling_joint_piece_per_valve`, procurement: true },
  { rowId: "rc10:flt_pipe_supports", section: "Технологические трубопроводы", category: "material", title: "Опоры внутренних трубопроводов", unitId: "piece", formulaId: "flt_pipe_supports_v1", expression: `ceil((${TOTAL_PIPE})*flt_pipe_support_piece_per_pipe_m)`, procurement: true },
  { rowId: "rc10:flt_process_consumables", section: "Расходные материалы", category: "material", title: "Комплекты прокладок, крепежа, сварочных и монтажных расходников", unitId: "set", formulaId: "flt_process_consumables_v1", expression: `(${CELL_COUNT})*flt_process_consumable_set_per_cell`, procurement: true },
  { rowId: "rc10:flt_design_capacity", section: "Расчётные показатели", category: "service", title: "Расчётная производительность станции", unitId: "m3_day", formulaId: "flt_design_capacity_v1", expression: "flt_station_count*flt_design_capacity_m3_day", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt_hydraulic_loading", section: "Расчётные показатели", category: "service", title: "Средняя гидравлическая нагрузка на площадь фильтров", unitId: "m_per_hour", formulaId: "flt_hydraulic_loading_v1", expression: `(flt_station_count*flt_design_capacity_m3_day)/((${FILTER_AREA})*24)`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt_backwash_pumps", section: "Промывочное оборудование", category: "equipment", title: "Насосы промывной воды", unitId: "piece", formulaId: "flt_backwash_pumps_v1", expression: PUMPS, procurement: true, titleParameterIds: ["flt_backwash_pump_designation", "flt_backwash_package_designation"] },
  { rowId: "rc10:flt_backwash_blowers", section: "Промывочное оборудование", category: "equipment", title: "Воздуходувки промывки", unitId: "piece", formulaId: "flt_backwash_blowers_v1", expression: BLOWERS, procurement: true, titleParameterIds: ["flt_backwash_blower_designation", "flt_backwash_package_designation"] },
  { rowId: "rc10:flt_air_receiver", section: "Промывочное оборудование", category: "equipment", title: "Ресивер промывочного воздуха", unitId: "piece", formulaId: "flt_air_receiver_v1", expression: "flt_station_count", procurement: true, titleParameterIds: ["flt_air_receiver_designation", "flt_backwash_package_designation"] },
  { rowId: "rc10:flt_flowmeters", section: "КИП и автоматизация", category: "equipment", title: "Расходомеры подачи и фильтрата", unitId: "piece", formulaId: "flt_flowmeters_v1", expression: `(${CELL_COUNT})*flt_flowmeter_piece_per_cell`, procurement: true },
  { rowId: "rc10:flt_turbidity_meters", section: "КИП и автоматизация", category: "equipment", title: "Поточные мутномеры фильтрата", unitId: "piece", formulaId: "flt_turbidity_meters_v1", expression: `(${CELL_COUNT})*flt_turbidity_meter_piece_per_cell`, procurement: true },
  { rowId: "rc10:flt_level_instruments", section: "КИП и автоматизация", category: "equipment", title: "Датчики уровня фильтров", unitId: "piece", formulaId: "flt_level_instruments_v1", expression: `(${CELL_COUNT})*flt_level_instrument_piece_per_cell`, procurement: true },
  { rowId: "rc10:flt_mcc", section: "Электроснабжение", category: "equipment", title: "Шкаф управления электроприводами", unitId: "set", formulaId: "flt_mcc_v1", expression: "flt_station_count", procurement: true, titleParameterIds: ["flt_mcc_designation"] },
  { rowId: "rc10:flt_plc", section: "КИП и автоматизация", category: "equipment", title: "Шкаф ПЛК и диспетчеризации", unitId: "set", formulaId: "flt_plc_v1", expression: "flt_station_count", procurement: true, titleParameterIds: ["flt_plc_designation"] },
  { rowId: "rc10:flt_power_cable", section: "Электроснабжение", category: "material", title: "Силовой кабель приводов", unitId: "m", formulaId: "flt_power_cable_v1", expression: POWER_CABLE, procurement: true, titleParameterIds: ["flt_power_cable_designation"] },
  { rowId: "rc10:flt_control_cable", section: "КИП и автоматизация", category: "material", title: "Контрольный и приборный кабель", unitId: "m", formulaId: "flt_control_cable_v1", expression: CONTROL_CABLE, procurement: true, titleParameterIds: ["flt_control_cable_designation"] },
  { rowId: "rc10:flt_cable_tray", section: "Электроснабжение", category: "material", title: "Кабельные лотки", unitId: "m", formulaId: "flt_cable_tray_v1", expression: `((${POWER_CABLE})+(${CONTROL_CABLE}))*flt_cable_tray_fraction_of_total_cable`, procurement: true, titleParameterIds: ["flt_cable_tray_designation"] },
  { rowId: "rc10:flt_earthing", section: "Электроснабжение", category: "material", title: "Заземление и уравнивание потенциалов", unitId: "m", formulaId: "flt_earthing_v1", expression: `(${CELL_COUNT})*flt_earthing_m_per_cell`, procurement: true, titleParameterIds: ["flt_earthing_designation"] },
  { rowId: "rc10:flt_electrical_consumables", section: "Расходные материалы", category: "material", title: "Электромонтажные расходники", unitId: "set", formulaId: "flt_electrical_consumables_v1", expression: "flt_station_count*flt_electrical_consumable_set_per_station", procurement: true },
  { rowId: "rc10:flt_test_water", section: "Испытания и промывка", category: "material", title: "Вода для испытания, промывки и первичного пуска", unitId: "m3", formulaId: "flt_test_water_v1", expression: TEST_WATER, procurement: true },
  { rowId: "rc10:flt_disinfection_reagent", section: "Испытания и промывка", category: "material", title: "Реагент для санитарной обработки", unitId: "kg", formulaId: "flt_disinfection_reagent_v1", expression: `(${TEST_WATER})*flt_disinfection_reagent_kg_per_test_water_m3`, procurement: true },
  { rowId: "rc10:labor:flt-civil", section: "Труд", category: "labor", title: "Общестроительные и железобетонные работы", unitId: "man_hour", formulaId: "flt_civil_labor_v1", expression: `((${CONCRETE_ORDER})+(${BLINDING}))*flt_civil_labor_h_per_concrete_m3`, procurement: true },
  { rowId: "rc10:labor:flt-media", section: "Труд", category: "labor", title: "Монтаж дренажа и послойная укладка загрузки", unitId: "man_hour", formulaId: "flt_media_labor_v1", expression: `((${MEDIA_INSTALLED})+(${SUPPORT_GRAVEL}))*flt_media_labor_h_per_t`, procurement: true },
  { rowId: "rc10:labor:flt-process", section: "Труд", category: "labor", title: "Монтаж трубопроводов, арматуры и промывочного оборудования", unitId: "man_hour", formulaId: "flt_process_labor_v1", expression: `(${TOTAL_PIPE})*flt_process_labor_h_per_pipe_m+(${PROCESS_VALVES})*4+((${PUMPS})+(${BLOWERS}))*12`, procurement: true },
  { rowId: "rc10:labor:flt-electrical", section: "Труд", category: "labor", title: "Монтаж электрики, КИП и автоматизации", unitId: "man_hour", formulaId: "flt_electrical_labor_v1", expression: `((${POWER_CABLE})+(${CONTROL_CABLE}))*flt_electrical_labor_h_per_cable_m`, procurement: true },
  { rowId: "rc10:labor:flt-commissioning", section: "Труд", category: "labor", title: "Пусконаладка и режимная настройка фильтров", unitId: "man_hour", formulaId: "flt_commissioning_labor_v1", expression: `(${CELL_COUNT})*flt_commissioning_labor_h_per_cell`, procurement: true },
  { rowId: "rc10:equipment:flt-excavator", section: "Механизмы", category: "equipment", title: "Экскаватор", unitId: "machine_hour", formulaId: "flt_excavator_v1", expression: `(${EXCAVATION})/flt_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc10:equipment:flt-compactor", section: "Механизмы", category: "equipment", title: "Уплотняющая техника", unitId: "machine_hour", formulaId: "flt_compactor_v1", expression: `(${BACKFILL})/flt_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc10:equipment:flt-concrete-pump", section: "Механизмы", category: "equipment", title: "Бетононасос", unitId: "machine_hour", formulaId: "flt_concrete_pump_v1", expression: `(${CONCRETE_ORDER})/flt_concrete_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc10:equipment:flt-crane", section: "Механизмы", category: "equipment", title: "Кран для монтажа оборудования и металлоконструкций", unitId: "machine_hour", formulaId: "flt_crane_v1", expression: `((${PUMPS})+(${BLOWERS})+flt_station_count)*flt_crane_h_per_equipment_piece`, procurement: true },
  { rowId: "rc10:equipment:flt-welding", section: "Механизмы", category: "equipment", title: "Сварочное оборудование", unitId: "machine_hour", formulaId: "flt_welding_v1", expression: `(${TOTAL_PIPE})*flt_welding_h_per_pipe_m`, procurement: true },
  { rowId: "rc10:equipment:flt-test", section: "Механизмы", category: "equipment", title: "Испытательное и наладочное оборудование", unitId: "machine_hour", formulaId: "flt_test_equipment_v1", expression: `(${CELL_COUNT})*flt_test_equipment_h_per_cell`, procurement: true },
  { rowId: "rc10:flt_asbuilt", section: "Контроль качества", category: "service", title: "Исполнительная документация, акты скрытых работ и паспорта", unitId: "set", formulaId: "flt_asbuilt_v1", expression: "flt_station_count", procurement: true },
  { rowId: "rc10:flt_process_commissioning", section: "Контроль качества", category: "service", title: "Комплексное опробование и подтверждение режима фильтрации", unitId: "set", formulaId: "flt_process_commissioning_v1", expression: "flt_station_count", procurement: true },
  { rowId: "rc10:logistics:flt-concrete", section: "Логистика", category: "service", title: "Доставка бетонных смесей", unitId: "trip", formulaId: "flt_concrete_delivery_v1", expression: `ceil(((${CONCRETE_ORDER})+(${BLINDING}))/flt_concrete_delivery_capacity_m3_trip)`, procurement: true },
  { rowId: "rc10:logistics:flt-media", section: "Логистика", category: "service", title: "Доставка фильтрующей загрузки и гравия", unitId: "trip", formulaId: "flt_media_delivery_v1", expression: `ceil(((${MEDIA_ORDER})+(${SUPPORT_GRAVEL}))/flt_media_delivery_capacity_t_trip)`, procurement: true },
  { rowId: "rc10:logistics:flt-equipment", section: "Логистика", category: "service", title: "Доставка технологического и электрического оборудования", unitId: "trip", formulaId: "flt_equipment_delivery_v1", expression: `ceil(((${PUMPS})+(${BLOWERS})+(${INSTRUMENTS})+2*flt_station_count)/flt_equipment_piece_per_delivery_trip)`, procurement: true },
  { rowId: "rc10:logistics:flt-soil", section: "Логистика", category: "service", title: "Вывоз лишнего грунта", unitId: "trip", formulaId: "flt_soil_delivery_v1", expression: `ceil((${EXCESS_SOIL})/flt_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc10:flt-media-balance:installed", section: "Баланс фильтрующей загрузки", category: "material", title: "Загрузка к укладке с технологическим запасом", unitId: "t", formulaId: "flt_media_installed_v1", expression: MEDIA_INSTALLED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:retained-spare", section: "Баланс фильтрующей загрузки", category: "material", title: "Сохраняемый резерв загрузки", unitId: "t", formulaId: "flt_media_spare_v1", expression: "flt_filter_media_retained_spare_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:available-stock", section: "Баланс фильтрующей загрузки", category: "material", title: "Подтверждённый складской остаток", unitId: "t", formulaId: "flt_media_stock_v1", expression: "flt_filter_media_available_stock_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:total-need", section: "Баланс фильтрующей загрузки", category: "material", title: "Общая потребность в загрузке", unitId: "t", formulaId: "flt_media_total_need_v1", expression: MEDIA_TOTAL_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:net-order-need", section: "Баланс фильтрующей загрузки", category: "material", title: "Чистая потребность к заказу", unitId: "t", formulaId: "flt_media_net_need_v1", expression: MEDIA_NET_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:package-count", section: "Баланс фильтрующей загрузки", category: "material", title: "Количество поставочных упаковок", unitId: "piece", formulaId: "flt_media_packages_v1", expression: MEDIA_PACKAGES, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:remainder", section: "Баланс фильтрующей загрузки", category: "material", title: "Остаток после укладки", unitId: "t", formulaId: "flt_media_remainder_v1", expression: `flt_filter_media_available_stock_t+(${MEDIA_ORDER})-(${MEDIA_INSTALLED})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt-media-balance:surplus-beyond-spare", section: "Баланс фильтрующей загрузки", category: "material", title: "Свободный остаток сверх резерва", unitId: "t", formulaId: "flt_media_surplus_v1", expression: `max(0,flt_filter_media_available_stock_t+(${MEDIA_ORDER})-(${MEDIA_TOTAL_NEED}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc10:flt_excavation_shoring", section: "Условные работы", category: "construction_work", title: "Крепление котлована", unitId: "m2", formulaId: "flt_excavation_shoring_v1", expression: "flt_excavation_shoring_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "flt_excavation_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["flt_excavation_shoring_designation"] },
  { rowId: "rc10:flt_groundwater_dewatering", section: "Условные механизмы", category: "equipment", title: "Строительное водопонижение", unitId: "machine_hour", formulaId: "flt_groundwater_dewatering_v1", expression: "flt_groundwater_dewatering_machine_h", procurement: true, inclusion: { kind: "equals", parameterId: "flt_groundwater_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["flt_groundwater_dewatering_designation"] },
  { rowId: "rc10:flt_standby_power", section: "Условное оборудование", category: "equipment", title: "Резервный источник питания", unitId: "kva", formulaId: "flt_standby_power_v1", expression: "flt_standby_power_kva", procurement: true, inclusion: { kind: "equals", parameterId: "flt_standby_power_mode", value: "REQUIRED" }, titleParameterIds: ["flt_standby_power_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.filtration-station-r1.automatic-s27-26",
  semanticOwner: "filtration-station",
  sourceId: FILTRATION_STATION_SOURCE_ID,
  normId: FILTRATION_STATION_NORM_ID,
  sourceMetadata: FILTRATION_STATION_SOURCE_METADATA,
  applicabilityRu: "Фильтровальная станция питьевой воды с быстрыми гравитационными фильтрами, технологическим зданием, загрузкой, дренажом, промывочным оборудованием, внутренними трубопроводами, КИП, электрикой и полным пусковым циклом.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "raw-water intake, coagulation, flocculation and sedimentation",
    "disinfection block, clean-water reservoirs and external networks",
    "automatic process-package selection from capacity alone",
    "automatic inclusion of shoring, dewatering or standby power",
    "invented price or manufacturer performance",
  ],
});

export const FILTRATION_STATION_PARAMETERS = definition.parameters;
export const FILTRATION_STATION_FORMULAS = definition.formulas;
export const FILTRATION_STATION_RESOURCES = definition.resources;
export const FILTRATION_STATION_RUNTIME_INPUT = definition.runtimeInput;
export const FILTRATION_STATION_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const FILTRATION_STATION_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const FILTRATION_STATION_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;
export const FILTRATION_STATION_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(FILTRATION_STATION_RUNTIME_INPUT),
);

export const FILTRATION_STATION_SHORT_INPUT = Object.freeze({
  flt_station_count: 1,
  flt_station_designation: "FS-RGF-5000-4C",
  flt_design_capacity_m3_day: 5000,
  flt_filter_cell_count: 4,
  flt_filter_internal_length_m: 8,
  flt_filter_internal_width_m: 5,
  flt_filter_media_designation: "DUAL-MEDIA-ANTHRACITE-SAND-POTABLE",
  flt_filter_media_depth_m: 0.8,
  flt_underdrain_designation: "HDPE-BLOCK-UNDERDRAIN-AIR-WATER",
  flt_backwash_package_designation: "BW-2P2B-AIR-WATER-5000",
});

export const FILTRATION_STATION_ACCEPTANCE_INPUT = Object.freeze({
  ...FILTRATION_STATION_SHORT_INPUT,
  ...FILTRATION_STATION_RUNTIME_INPUT,
});

export async function compileFiltrationStationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? FILTRATION_STATION_CATALOG_ID;
  if (catalogId !== FILTRATION_STATION_CATALOG_ID) {
    throw new Error(`FILTRATION_STATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.filtration-station-automatic-s27-26-r1",
    catalogId,
    primaryMeasureParameterId: "flt_station_count",
    definition,
    submittedParameters,
  });
}
