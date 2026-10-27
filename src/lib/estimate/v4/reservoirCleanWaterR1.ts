import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

import { RESERVOIR_CLEAN_WATER_CATALOG_ID } from "./reservoirCleanWaterPromptR1";
export { RESERVOIR_CLEAN_WATER_CATALOG_ID, parseReservoirCleanWaterOrdinaryPromptR1 } from "./reservoirCleanWaterPromptR1";
export const RESERVOIR_CLEAN_WATER_SOURCE_ID =
  "visible_preliminary_rc_clean_water_reservoir_geometric_automatic_v1";
export const RESERVOIR_CLEAN_WATER_NORM_ID =
  "norm:preliminary:rc_clean_water_reservoir_geometric_automatic:v1";
export const RESERVOIR_CLEAN_WATER_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный геометрический профиль подземного монолитного ЖБ резервуара чистой воды S27.26",
  source_authority: "Предварительный сценарий canonical compiler; геометрия вычисляется автоматически, конструктивные толщины и нормы требуют подтверждения проектом, геологией и ППР",
  source_document_version: "VISIBLE_PRELIMINARY_RC_CLEAN_WATER_RESERVOIR_GEOMETRIC_AUTOMATIC_S27_26",
  definition_hash: "909a8cbf0f892fa43a7fc6b5b960a738b4b0bb704ebbb0f289dd40277a9ca7eb",
  exact_locator: "2 подземных монолитных ЖБ резервуара RC-CWR-2X1000, внутренние размеры каждого 20x10 м, рабочая глубина воды 5 м, по 2 секции; ёмкость, земляные и конструктивные объёмы, материалы, труд, механизмы и закупочные балансы вычисляются из семи первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённым конструктивным проектом, геотехническим заключением, ППР или универсальной нормой. Для одного физического резервуара является альтернативой, а не дополнением к legacy-владельцу water_reservoir с утверждённой ведомостью объёмов. Внешние сети, насосные, водоподготовка, отдельные камеры, дороги, сваи и скальные работы исключены.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "909a8cbf0f892fa43a7fc6b5b960a738b4b0bb704ebbb0f289dd40277a9ca7eb",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcw_reservoir_count", title: "Количество отдельных резервуаров", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "rcw_reservoir_designation", title: "Марка резервуара по проекту", valueType: "text", unitId: null, kind: "ordinary", resourceBranchConsumers: ["rc14:rcw_acceptance"] },
  { id: "rcw_internal_length_m", title: "Внутренняя длина одного резервуара", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "rcw_internal_width_m", title: "Внутренняя ширина одного резервуара", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "rcw_operating_water_depth_m", title: "Рабочая глубина воды", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "rcw_cell_count_per_reservoir", title: "Количество переключаемых секций в одном резервуаре", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "rcw_structural_system", title: "Подтверждённая конструктивная схема", valueType: "enum", unitId: null, kind: "ordinary", values: ["BURIED_CAST_IN_PLACE_RC"], resourceBranchConsumers: ["rc14:rcw_acceptance"] },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcw_freeboard_m", title: "Свободная высота над рабочим уровнем воды", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "rcw_external_wall_thickness_m", title: "Толщина наружных стен", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0.000_001 },
  { id: "rcw_partition_wall_thickness_m", title: "Толщина разделительных стен", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0.000_001 },
  { id: "rcw_base_slab_thickness_m", title: "Толщина фундаментной плиты", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.4, min: 0.000_001 },
  { id: "rcw_roof_slab_thickness_m", title: "Толщина плиты покрытия", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0.000_001 },
  { id: "rcw_blinding_thickness_m", title: "Толщина бетонной подготовки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0 },
  { id: "rcw_blinding_projection_m", title: "Выпуск бетонной подготовки за конструкцию", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "rcw_excavation_working_clearance_m", title: "Рабочий зазор котлована от наружной грани", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 1, min: 0 },
  { id: "rcw_roof_soil_cover_m", title: "Толщина грунта над покрытием", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.8, min: 0 },
  { id: "rcw_column_grid_spacing_m", title: "Предварительный шаг внутренних колонн", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 5, min: 0.000_001 },
  { id: "rcw_column_side_m", title: "Сторона квадратной колонны", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.4, min: 0.000_001 },
  { id: "rcw_structural_concrete_designation", title: "Класс конструкционного бетона", valueType: "text", unitId: null, kind: "profile", defaultValue: "C30/37-W8-F150", resourceBranchConsumers: ["rc14:rcw_structural_concrete_order"] },
  { id: "rcw_concrete_order_factor", title: "Коэффициент заказа бетона с технологическим запасом", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.03, min: 1 },
  { id: "rcw_rebar_designation", title: "Класс арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "A500C", resourceBranchConsumers: ["rc14:rcw_rebar_order"] },
  { id: "rcw_rebar_kg_per_structural_concrete_m3", title: "Масса арматуры на объём конструкционного бетона", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 140, min: 0 },
  { id: "rcw_rebar_loss_fraction", title: "Доля технологических потерь арматуры", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0 },
  { id: "rcw_rebar_retained_spare_kg", title: "Сохраняемый резерв арматуры", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 500, min: 0 },
  { id: "rcw_rebar_available_stock_kg", title: "Подтверждённый складской остаток арматуры", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 0, min: 0 },
  { id: "rcw_rebar_supplier_lot_kg", title: "Поставочная партия арматуры", valueType: "decimal", unitId: "kg", kind: "profile", defaultValue: 1000, min: 0.000_001 },
  { id: "rcw_waterproofing_designation", title: "Система наружной гидроизоляции", valueType: "text", unitId: null, kind: "profile", defaultValue: "RC-CWR-EXTERNAL-MEMBRANE", resourceBranchConsumers: ["rc14:rcw_external_waterproofing_order"] },
  { id: "rcw_potable_coating_designation", title: "Система внутреннего покрытия для питьевой воды", valueType: "text", unitId: null, kind: "profile", defaultValue: "POTABLE-WATER-CEMENTITIOUS-COATING", resourceBranchConsumers: ["rc14:rcw_internal_coating_order"] },
  { id: "rcw_surface_material_order_factor", title: "Коэффициент заказа гидроизоляции и покрытия", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "rcw_waterstop_designation", title: "Марка гидрошпонки рабочих швов", valueType: "text", unitId: null, kind: "profile", defaultValue: "PVC-WATERSTOP-250MM", resourceBranchConsumers: ["rc14:rcw_waterstop_order"] },
  { id: "rcw_vertical_joint_count_per_reservoir", title: "Вертикальных рабочих швов на резервуар", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 8, min: 0 },
  { id: "rcw_waterstop_loss_fraction", title: "Доля потерь гидрошпонки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "rcw_waterstop_retained_spare_m", title: "Сохраняемый резерв гидрошпонки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 10, min: 0 },
  { id: "rcw_waterstop_available_stock_m", title: "Подтверждённый складской остаток гидрошпонки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "rcw_waterstop_supplier_roll_m", title: "Длина гидрошпонки в поставочном рулоне", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 25, min: 0.000_001 },
  { id: "rcw_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.85, min: 0, max: 1 },
  { id: "rcw_imported_backfill_order_factor", title: "Коэффициент заказа привозного грунта", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "rcw_binding_wire_kg_per_rebar_kg", title: "Вязальная проволока на массу арматуры", valueType: "decimal", unitId: "kg_per_kg", kind: "profile", defaultValue: 0.012, min: 0 },
  { id: "rcw_spacer_piece_per_base_area_m2", title: "Фиксаторы защитного слоя на площадь основания", valueType: "decimal", unitId: "pcs_per_m2", kind: "profile", defaultValue: 4, min: 0 },
  { id: "rcw_formwork_consumable_kg_per_m2", title: "Опалубочные расходники на площадь контакта", valueType: "decimal", unitId: "kg_per_m2", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "rcw_curing_compound_kg_per_m2", title: "Материал ухода за бетоном на открытую площадь", valueType: "decimal", unitId: "kg_per_m2", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "rcw_appurtenance_kit_designation", title: "Комплект внутренних трубопроводов, арматуры и вводов", valueType: "text", unitId: null, kind: "profile", defaultValue: "SS304-DN200-300-CWR-APPURTENANCE-KIT", resourceBranchConsumers: ["rc14:rcw_appurtenance_kits"] },
  { id: "rcw_penetration_seal_per_reservoir", title: "Герметизаторов вводов на резервуар", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "rcw_hatch_per_cell", title: "Люков доступа на секцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "rcw_ladder_per_cell", title: "Лестниц на секцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "rcw_vent_per_cell", title: "Вентиляционных узлов на секцию", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "rcw_hydrostatic_fill_turnovers", title: "Кратность объёма воды для гидроиспытания", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1, min: 0 },
  { id: "rcw_disinfection_active_chlorine_mg_l", title: "Доза активного хлора для дезинфекции", valueType: "decimal", unitId: "mg_per_l", kind: "profile", defaultValue: 50, min: 0 },
  { id: "rcw_disinfectant_active_fraction", title: "Массовая доля активного вещества в реагенте", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.125, min: 0.000_001, max: 1 },
  { id: "rcw_water_quality_sample_per_cell", title: "Проб воды на секцию", valueType: "decimal", unitId: "test_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "rcw_survey_labor_h_per_reservoir", title: "Труд геодезии на резервуар", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 16, min: 0 },
  { id: "rcw_excavation_labor_h_per_m3", title: "Труд земляных работ на кубометр", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "rcw_rebar_labor_h_per_kg", title: "Труд армирования на килограмм", valueType: "decimal", unitId: "man_hour_per_kg", kind: "profile", defaultValue: 0.012, min: 0 },
  { id: "rcw_formwork_labor_h_per_m2", title: "Труд опалубочных работ на площадь контакта", valueType: "decimal", unitId: "man_hour_per_m2", kind: "profile", defaultValue: 0.3, min: 0 },
  { id: "rcw_concrete_labor_h_per_m3", title: "Труд бетонирования на кубометр", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.4, min: 0 },
  { id: "rcw_surface_labor_h_per_m2", title: "Труд гидроизоляции и покрытия на квадратный метр", valueType: "decimal", unitId: "man_hour_per_m2", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "rcw_appurtenance_labor_h_per_reservoir", title: "Труд монтажа закладных и оснащения на резервуар", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 48, min: 0 },
  { id: "rcw_commissioning_labor_h_per_reservoir", title: "Труд испытаний, дезинфекции и оформления на резервуар", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 32, min: 0 },
  { id: "rcw_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 45, min: 0.000_001 },
  { id: "rcw_compactor_productivity_m3_h", title: "Производительность уплотняющего механизма", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 30, min: 0.000_001 },
  { id: "rcw_concrete_pump_productivity_m3_h", title: "Производительность бетононасоса", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 30, min: 0.000_001 },
  { id: "rcw_crane_h_per_rebar_t", title: "Работа крана на тонну арматуры", valueType: "decimal", unitId: "machine_hour_per_t", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "rcw_dump_truck_capacity_m3", title: "Вместимость самосвала", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "rcw_concrete_truck_capacity_m3", title: "Вместимость автобетоносмесителя", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 7, min: 0.000_001 },
  { id: "rcw_rebar_delivery_kg_per_trip", title: "Масса арматуры на один рейс", valueType: "decimal", unitId: "kg_per_trip", kind: "profile", defaultValue: 10000, min: 0.000_001 },
  { id: "rcw_shoring_mode", title: "Крепление котлована требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "rcw_dewatering_mode", title: "Водоотлив требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "rcw_shoring_designation", title: "Система крепления котлована", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "rcw_shoring_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc14:rcw_shoring"] },
  { id: "rcw_dewatering_pump_designation", title: "Насос водоотлива", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "rcw_dewatering_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc14:rcw_dewatering_pump"] },
  { id: "rcw_dewatering_duration_h", title: "Продолжительность водоотлива", valueType: "decimal", unitId: "hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "rcw_dewatering_mode", value: "REQUIRED" } },
  { id: "rcw_dewatering_flow_m3_h", title: "Фактическая подача водоотлива", valueType: "decimal", unitId: "m3_per_hour", kind: "conditional", min: 0, requiredWhen: { parameterId: "rcw_dewatering_mode", value: "REQUIRED" } },
]);

const N = "rcw_reservoir_count";
const L = "rcw_internal_length_m";
const W = "rcw_internal_width_m";
const H = "(rcw_operating_water_depth_m+rcw_freeboard_m)";
const EL = `(rcw_internal_length_m+2*rcw_external_wall_thickness_m)`;
const EW = `(rcw_internal_width_m+2*rcw_external_wall_thickness_m)`;
const XL = `((${EL})+2*rcw_excavation_working_clearance_m)`;
const XW = `((${EW})+2*rcw_excavation_working_clearance_m)`;
const XD = `(rcw_blinding_thickness_m+rcw_base_slab_thickness_m+(${H})+rcw_roof_slab_thickness_m+rcw_roof_soil_cover_m)`;
const CAPACITY = `${N}*${L}*${W}*rcw_operating_water_depth_m`;
const EXCAVATION = `${N}*(${XL})*(${XW})*(${XD})`;
const BLINDING = `${N}*((${EL})+2*rcw_blinding_projection_m)*((${EW})+2*rcw_blinding_projection_m)*rcw_blinding_thickness_m`;
const BASE = `${N}*(${EL})*(${EW})*rcw_base_slab_thickness_m`;
const WALLS = `${N}*(((${EL})*(${EW}))-${L}*${W})*(${H})`;
const PARTITIONS = `${N}*max(0,rcw_cell_count_per_reservoir-1)*${W}*(${H})*rcw_partition_wall_thickness_m`;
const ROOF = `${N}*(${EL})*(${EW})*rcw_roof_slab_thickness_m`;
const COLUMN_COUNT = `${N}*max(0,ceil(${L}/rcw_column_grid_spacing_m)-1)*max(0,ceil(${W}/rcw_column_grid_spacing_m)-1)`;
const COLUMNS = `(${COLUMN_COUNT})*rcw_column_side_m*rcw_column_side_m*(${H})`;
const STRUCTURAL = `((${BASE})+(${WALLS})+(${PARTITIONS})+(${ROOF})+(${COLUMNS}))`;
const REBAR_INSTALLED = `(${STRUCTURAL})*rcw_rebar_kg_per_structural_concrete_m3`;
const REBAR_LOSS = `(${REBAR_INSTALLED})*rcw_rebar_loss_fraction`;
const REBAR_TOTAL = `((${REBAR_INSTALLED})+(${REBAR_LOSS})+rcw_rebar_retained_spare_kg)`;
const REBAR_NET = `max(0,(${REBAR_TOTAL})-rcw_rebar_available_stock_kg)`;
const REBAR_LOTS = `ceil((${REBAR_NET})/rcw_rebar_supplier_lot_kg)`;
const REBAR_ORDER = `((${REBAR_LOTS})*rcw_rebar_supplier_lot_kg)`;
const BASE_AREA = `${N}*(${EL})*(${EW})`;
const INNER_WALL_AREA = `${N}*2*(${L}+${W})*(${H})`;
const PARTITION_FACE_AREA = `${N}*2*max(0,rcw_cell_count_per_reservoir-1)*${W}*(${H})`;
const COLUMN_FACE_AREA = `(${COLUMN_COUNT})*4*rcw_column_side_m*(${H})`;
const FORMWORK = `(${N}*2*((${EL})+(${EW}))*rcw_base_slab_thickness_m+${N}*(2*((${EL})+(${EW}))+2*(${L}+${W}))*(${H})+(${PARTITION_FACE_AREA})+${N}*${L}*${W}+(${COLUMN_FACE_AREA}))`;
const EXTERNAL_WATERPROOF = `(${N}*(2*(${EL})*(${EW})+2*((${EL})+(${EW}))*((${H})+rcw_base_slab_thickness_m+rcw_roof_slab_thickness_m)))`;
const INTERNAL_COATING = `(${N}*${L}*${W}+(${INNER_WALL_AREA})+(${PARTITION_FACE_AREA})+(${COLUMN_FACE_AREA}))`;
const WATERSTOP_INSTALLED = `${N}*(2*((${EL})+(${EW}))+max(0,rcw_cell_count_per_reservoir-1)*${W}+rcw_vertical_joint_count_per_reservoir*(${H}))`;
const WATERSTOP_LOSS = `(${WATERSTOP_INSTALLED})*rcw_waterstop_loss_fraction`;
const WATERSTOP_TOTAL = `((${WATERSTOP_INSTALLED})+(${WATERSTOP_LOSS})+rcw_waterstop_retained_spare_m)`;
const WATERSTOP_NET = `max(0,(${WATERSTOP_TOTAL})-rcw_waterstop_available_stock_m)`;
const WATERSTOP_ROLLS = `ceil((${WATERSTOP_NET})/rcw_waterstop_supplier_roll_m)`;
const WATERSTOP_ORDER = `((${WATERSTOP_ROLLS})*rcw_waterstop_supplier_roll_m)`;
const ENVELOPE = `${N}*(${EL})*(${EW})*(rcw_base_slab_thickness_m+(${H})+rcw_roof_slab_thickness_m)`;
const BACKFILL = `max(0,(${EXCAVATION})-(${ENVELOPE})-(${BLINDING}))`;
const NATIVE_BACKFILL = `min((${BACKFILL}),(${EXCAVATION})*rcw_excavated_soil_reuse_fraction)`;
const IMPORTED_BACKFILL = `max(0,(${BACKFILL})-(${NATIVE_BACKFILL}))`;
const EXCESS_SOIL = `max(0,(${EXCAVATION})-(${NATIVE_BACKFILL}))`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc14:rcw_acceptance", section: "Работы", category: "construction_work", title: "Строительство подземных монолитных ЖБ резервуаров чистой воды", unitId: "piece", formulaId: "rcw_acceptance_v1", expression: N, costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["rcw_reservoir_designation", "rcw_structural_system"] },
  { rowId: "rc14:rcw_useful_capacity", section: "Расчётная геометрия", category: "service", title: "Расчётная полезная ёмкость", unitId: "m3", formulaId: "rcw_useful_capacity_v1", expression: CAPACITY, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_clear_height", section: "Расчётная геометрия", category: "service", title: "Внутренняя высота до покрытия", unitId: "m", formulaId: "rcw_clear_height_v1", expression: H, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_external_length", section: "Расчётная геометрия", category: "service", title: "Наружная длина резервуара", unitId: "m", formulaId: "rcw_external_length_v1", expression: EL, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_external_width", section: "Расчётная геометрия", category: "service", title: "Наружная ширина резервуара", unitId: "m", formulaId: "rcw_external_width_v1", expression: EW, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_excavation_depth", section: "Расчётная геометрия", category: "service", title: "Расчётная глубина котлована", unitId: "m", formulaId: "rcw_excavation_depth_v1", expression: XD, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка котлована", unitId: "m3", formulaId: "rcw_excavation_v1", expression: EXCAVATION, procurement: true },
  { rowId: "rc14:rcw_blinding_installed", section: "Расчётная геометрия", category: "material", title: "Бетонная подготовка в проектном положении", unitId: "m3", formulaId: "rcw_blinding_installed_v1", expression: BLINDING, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_blinding_order", section: "Материалы", category: "material", title: "Бетон подготовки к поставке", unitId: "m3", formulaId: "rcw_blinding_order_v1", expression: `(${BLINDING})*rcw_concrete_order_factor`, procurement: true },
  { rowId: "rc14:rcw_base_concrete", section: "Расчётная геометрия", category: "material", title: "Бетон фундаментных плит", unitId: "m3", formulaId: "rcw_base_concrete_v1", expression: BASE, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_wall_concrete", section: "Расчётная геометрия", category: "material", title: "Бетон наружных стен", unitId: "m3", formulaId: "rcw_wall_concrete_v1", expression: WALLS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_partition_concrete", section: "Расчётная геометрия", category: "material", title: "Бетон разделительных стен", unitId: "m3", formulaId: "rcw_partition_concrete_v1", expression: PARTITIONS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_roof_concrete", section: "Расчётная геометрия", category: "material", title: "Бетон плит покрытия", unitId: "m3", formulaId: "rcw_roof_concrete_v1", expression: ROOF, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_column_count", section: "Расчётная геометрия", category: "material", title: "Расчётное количество внутренних колонн", unitId: "piece", formulaId: "rcw_column_count_v1", expression: COLUMN_COUNT, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_column_concrete", section: "Расчётная геометрия", category: "material", title: "Бетон внутренних колонн", unitId: "m3", formulaId: "rcw_column_concrete_v1", expression: COLUMNS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_structural_concrete_installed", section: "Баланс бетона", category: "material", title: "Конструкционный бетон в проектном положении", unitId: "m3", formulaId: "rcw_structural_concrete_installed_v1", expression: STRUCTURAL, costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["rcw_structural_concrete_designation"] },
  { rowId: "rc14:rcw_structural_concrete_order", section: "Материалы", category: "material", title: "Конструкционный бетон к поставке", unitId: "m3", formulaId: "rcw_structural_concrete_order_v1", expression: `(${STRUCTURAL})*rcw_concrete_order_factor`, procurement: true, titleParameterIds: ["rcw_structural_concrete_designation"] },
  { rowId: "rc14:rcw_rebar_installed", section: "Баланс арматуры", category: "material", title: "Арматура в проектном положении", unitId: "kg", formulaId: "rcw_rebar_installed_v1", expression: REBAR_INSTALLED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_loss", section: "Баланс арматуры", category: "material", title: "Технологические потери арматуры", unitId: "kg", formulaId: "rcw_rebar_loss_v1", expression: REBAR_LOSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_spare", section: "Баланс арматуры", category: "material", title: "Сохраняемый резерв арматуры", unitId: "kg", formulaId: "rcw_rebar_spare_v1", expression: "rcw_rebar_retained_spare_kg", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_stock", section: "Баланс арматуры", category: "material", title: "Подтверждённый складской остаток арматуры", unitId: "kg", formulaId: "rcw_rebar_stock_v1", expression: "rcw_rebar_available_stock_kg", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_total_need", section: "Баланс арматуры", category: "material", title: "Общая потребность в арматуре", unitId: "kg", formulaId: "rcw_rebar_total_need_v1", expression: REBAR_TOTAL, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_net_need", section: "Баланс арматуры", category: "material", title: "Чистая потребность арматуры к заказу", unitId: "kg", formulaId: "rcw_rebar_net_need_v1", expression: REBAR_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_lot_count", section: "Баланс арматуры", category: "material", title: "Количество поставочных партий арматуры", unitId: "piece", formulaId: "rcw_rebar_lot_count_v1", expression: REBAR_LOTS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_order", section: "Материалы", category: "material", title: "Арматура к поставке", unitId: "kg", formulaId: "rcw_rebar_order_v1", expression: REBAR_ORDER, procurement: true, titleParameterIds: ["rcw_rebar_designation"] },
  { rowId: "rc14:rcw_rebar_remainder", section: "Баланс арматуры", category: "material", title: "Остаток арматуры после монтажа и потерь", unitId: "kg", formulaId: "rcw_rebar_remainder_v1", expression: `rcw_rebar_available_stock_kg+(${REBAR_ORDER})-(${REBAR_INSTALLED})-(${REBAR_LOSS})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_rebar_surplus", section: "Баланс арматуры", category: "material", title: "Свободный остаток арматуры сверх резерва", unitId: "kg", formulaId: "rcw_rebar_surplus_v1", expression: `max(0,rcw_rebar_available_stock_kg+(${REBAR_ORDER})-(${REBAR_TOTAL}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_formwork", section: "Работы", category: "construction_work", title: "Монтаж и демонтаж опалубки", unitId: "m2", formulaId: "rcw_formwork_v1", expression: FORMWORK, procurement: true },
  { rowId: "rc14:rcw_external_waterproofing_installed", section: "Расчётная геометрия", category: "material", title: "Наружная гидроизоляция в проектном положении", unitId: "m2", formulaId: "rcw_external_waterproofing_installed_v1", expression: EXTERNAL_WATERPROOF, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_external_waterproofing_order", section: "Материалы", category: "material", title: "Наружная гидроизоляция к поставке", unitId: "m2", formulaId: "rcw_external_waterproofing_order_v1", expression: `(${EXTERNAL_WATERPROOF})*rcw_surface_material_order_factor`, procurement: true, titleParameterIds: ["rcw_waterproofing_designation"] },
  { rowId: "rc14:rcw_internal_coating_installed", section: "Расчётная геометрия", category: "material", title: "Внутреннее покрытие для питьевой воды в проектном положении", unitId: "m2", formulaId: "rcw_internal_coating_installed_v1", expression: INTERNAL_COATING, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_internal_coating_order", section: "Материалы", category: "material", title: "Внутреннее покрытие для питьевой воды к поставке", unitId: "m2", formulaId: "rcw_internal_coating_order_v1", expression: `(${INTERNAL_COATING})*rcw_surface_material_order_factor`, procurement: true, titleParameterIds: ["rcw_potable_coating_designation"] },
  { rowId: "rc14:rcw_waterstop_installed", section: "Баланс гидрошпонки", category: "material", title: "Гидрошпонка в проектном положении", unitId: "m", formulaId: "rcw_waterstop_installed_v1", expression: WATERSTOP_INSTALLED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_loss", section: "Баланс гидрошпонки", category: "material", title: "Технологические потери гидрошпонки", unitId: "m", formulaId: "rcw_waterstop_loss_v1", expression: WATERSTOP_LOSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_spare", section: "Баланс гидрошпонки", category: "material", title: "Сохраняемый резерв гидрошпонки", unitId: "m", formulaId: "rcw_waterstop_spare_v1", expression: "rcw_waterstop_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_stock", section: "Баланс гидрошпонки", category: "material", title: "Подтверждённый складской остаток гидрошпонки", unitId: "m", formulaId: "rcw_waterstop_stock_v1", expression: "rcw_waterstop_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_total_need", section: "Баланс гидрошпонки", category: "material", title: "Общая потребность в гидрошпонке", unitId: "m", formulaId: "rcw_waterstop_total_need_v1", expression: WATERSTOP_TOTAL, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_net_need", section: "Баланс гидрошпонки", category: "material", title: "Чистая потребность гидрошпонки к заказу", unitId: "m", formulaId: "rcw_waterstop_net_need_v1", expression: WATERSTOP_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_roll_count", section: "Баланс гидрошпонки", category: "material", title: "Количество поставочных рулонов гидрошпонки", unitId: "piece", formulaId: "rcw_waterstop_roll_count_v1", expression: WATERSTOP_ROLLS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_order", section: "Материалы", category: "material", title: "Гидрошпонка к поставке", unitId: "m", formulaId: "rcw_waterstop_order_v1", expression: WATERSTOP_ORDER, procurement: true, titleParameterIds: ["rcw_waterstop_designation"] },
  { rowId: "rc14:rcw_waterstop_remainder", section: "Баланс гидрошпонки", category: "material", title: "Остаток гидрошпонки после монтажа и потерь", unitId: "m", formulaId: "rcw_waterstop_remainder_v1", expression: `rcw_waterstop_available_stock_m+(${WATERSTOP_ORDER})-(${WATERSTOP_INSTALLED})-(${WATERSTOP_LOSS})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_waterstop_surplus", section: "Баланс гидрошпонки", category: "material", title: "Свободный остаток гидрошпонки сверх резерва", unitId: "m", formulaId: "rcw_waterstop_surplus_v1", expression: `max(0,rcw_waterstop_available_stock_m+(${WATERSTOP_ORDER})-(${WATERSTOP_TOTAL}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc14:rcw_native_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка пригодным грунтом", unitId: "m3", formulaId: "rcw_native_backfill_v1", expression: NATIVE_BACKFILL, procurement: true },
  { rowId: "rc14:rcw_imported_backfill", section: "Материалы", category: "material", title: "Привозной грунт к поставке", unitId: "m3", formulaId: "rcw_imported_backfill_v1", expression: `(${IMPORTED_BACKFILL})*rcw_imported_backfill_order_factor`, procurement: true },
  { rowId: "rc14:rcw_excess_soil", section: "Земляные работы", category: "service", title: "Излишний грунт к вывозу", unitId: "m3", formulaId: "rcw_excess_soil_v1", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc14:rcw_binding_wire", section: "Расходники", category: "material", title: "Вязальная проволока", unitId: "kg", formulaId: "rcw_binding_wire_v1", expression: `(${REBAR_INSTALLED})*rcw_binding_wire_kg_per_rebar_kg`, procurement: true },
  { rowId: "rc14:rcw_spacers", section: "Расходники", category: "material", title: "Фиксаторы защитного слоя бетона", unitId: "piece", formulaId: "rcw_spacers_v1", expression: `ceil((${BASE_AREA})*rcw_spacer_piece_per_base_area_m2)`, procurement: true },
  { rowId: "rc14:rcw_formwork_consumables", section: "Расходники", category: "material", title: "Опалубочные расходники, смазка и герметизация стяжек", unitId: "kg", formulaId: "rcw_formwork_consumables_v1", expression: `(${FORMWORK})*rcw_formwork_consumable_kg_per_m2`, procurement: true },
  { rowId: "rc14:rcw_curing_compound", section: "Расходники", category: "material", title: "Материал ухода за бетоном", unitId: "kg", formulaId: "rcw_curing_compound_v1", expression: `(${BASE_AREA})*2*rcw_curing_compound_kg_per_m2`, procurement: true },
  { rowId: "rc14:rcw_appurtenance_kits", section: "Комплектующие", category: "material", title: "Внутренние входные, выходные, переливные и дренажные трубопроводы с арматурой", unitId: "set", formulaId: "rcw_appurtenance_kits_v1", expression: N, procurement: true, titleParameterIds: ["rcw_appurtenance_kit_designation"] },
  { rowId: "rc14:rcw_penetration_seals", section: "Комплектующие", category: "material", title: "Герметизаторы трубных вводов", unitId: "piece", formulaId: "rcw_penetration_seals_v1", expression: `${N}*rcw_penetration_seal_per_reservoir`, procurement: true },
  { rowId: "rc14:rcw_access_hatches", section: "Комплектующие", category: "material", title: "Запираемые люки доступа из нержавеющей стали", unitId: "piece", formulaId: "rcw_access_hatches_v1", expression: `${N}*rcw_cell_count_per_reservoir*rcw_hatch_per_cell`, procurement: true },
  { rowId: "rc14:rcw_ladders", section: "Комплектующие", category: "material", title: "Лестницы резервуара из нержавеющей стали", unitId: "piece", formulaId: "rcw_ladders_v1", expression: `${N}*rcw_cell_count_per_reservoir*rcw_ladder_per_cell`, procurement: true },
  { rowId: "rc14:rcw_vents", section: "Комплектующие", category: "material", title: "Вентиляционные узлы с защитной сеткой", unitId: "piece", formulaId: "rcw_vents_v1", expression: `${N}*rcw_cell_count_per_reservoir*rcw_vent_per_cell`, procurement: true },
  { rowId: "rc14:rcw_commissioning_seal_kits", section: "Расходники", category: "material", title: "Прокладки, крепёж и герметики для монтажа и пуска", unitId: "set", formulaId: "rcw_commissioning_seal_kits_v1", expression: N, procurement: true },
  { rowId: "rc14:rcw_hydrostatic_fill_water", section: "Испытания и пуск", category: "material", title: "Вода для гидростатического испытания", unitId: "m3", formulaId: "rcw_hydrostatic_fill_water_v1", expression: `(${CAPACITY})*rcw_hydrostatic_fill_turnovers`, procurement: true },
  { rowId: "rc14:rcw_disinfectant", section: "Испытания и пуск", category: "material", title: "Дезинфицирующий реагент по активному веществу", unitId: "kg", formulaId: "rcw_disinfectant_v1", expression: `((${CAPACITY})*rcw_disinfection_active_chlorine_mg_l/1000)/rcw_disinfectant_active_fraction`, procurement: true },
  { rowId: "rc14:rcw_water_quality_samples", section: "Испытания и пуск", category: "service", title: "Лабораторные пробы качества воды", unitId: "test", formulaId: "rcw_water_quality_samples_v1", expression: `${N}*rcw_cell_count_per_reservoir*rcw_water_quality_sample_per_cell`, procurement: true },
  { rowId: "rc14:labor:rcw-survey", section: "Труд", category: "labor", title: "Разбивка и исполнительная геодезическая съёмка", unitId: "man_hour", formulaId: "rcw_survey_labor_v1", expression: `${N}*rcw_survey_labor_h_per_reservoir`, procurement: true },
  { rowId: "rc14:labor:rcw-excavation", section: "Труд", category: "labor", title: "Земляные работы и обратная засыпка", unitId: "man_hour", formulaId: "rcw_excavation_labor_v1", expression: `((${EXCAVATION})+(${BACKFILL}))*rcw_excavation_labor_h_per_m3`, procurement: true },
  { rowId: "rc14:labor:rcw-rebar", section: "Труд", category: "labor", title: "Заготовка и монтаж арматуры", unitId: "man_hour", formulaId: "rcw_rebar_labor_v1", expression: `(${REBAR_INSTALLED})*rcw_rebar_labor_h_per_kg`, procurement: true },
  { rowId: "rc14:labor:rcw-formwork", section: "Труд", category: "labor", title: "Опалубочные работы", unitId: "man_hour", formulaId: "rcw_formwork_labor_v1", expression: `(${FORMWORK})*rcw_formwork_labor_h_per_m2`, procurement: true },
  { rowId: "rc14:labor:rcw-concrete", section: "Труд", category: "labor", title: "Укладка, вибрирование и уход за бетоном", unitId: "man_hour", formulaId: "rcw_concrete_labor_v1", expression: `((${BLINDING})+(${STRUCTURAL}))*rcw_concrete_labor_h_per_m3`, procurement: true },
  { rowId: "rc14:labor:rcw-surfaces", section: "Труд", category: "labor", title: "Наружная гидроизоляция и внутреннее питьевое покрытие", unitId: "man_hour", formulaId: "rcw_surface_labor_v1", expression: `((${EXTERNAL_WATERPROOF})+(${INTERNAL_COATING}))*rcw_surface_labor_h_per_m2`, procurement: true },
  { rowId: "rc14:labor:rcw-appurtenances", section: "Труд", category: "labor", title: "Монтаж закладных, трубопроводов, люков, лестниц и вентиляции", unitId: "man_hour", formulaId: "rcw_appurtenance_labor_v1", expression: `${N}*rcw_appurtenance_labor_h_per_reservoir`, procurement: true },
  { rowId: "rc14:labor:rcw-commissioning", section: "Труд", category: "labor", title: "Испытание, очистка, дезинфекция и оформление", unitId: "man_hour", formulaId: "rcw_commissioning_labor_v1", expression: `${N}*rcw_commissioning_labor_h_per_reservoir`, procurement: true },
  { rowId: "rc14:equipment:rcw-excavator", section: "Механизмы", category: "equipment", title: "Экскаватор", unitId: "machine_hour", formulaId: "rcw_excavator_machine_v1", expression: `(${EXCAVATION})/rcw_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc14:equipment:rcw-compactor", section: "Механизмы", category: "equipment", title: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "rcw_compactor_machine_v1", expression: `(${BACKFILL})/rcw_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc14:equipment:rcw-concrete-pump", section: "Механизмы", category: "equipment", title: "Бетононасос", unitId: "machine_hour", formulaId: "rcw_concrete_pump_machine_v1", expression: `((${BLINDING})+(${STRUCTURAL}))/rcw_concrete_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc14:equipment:rcw-crane", section: "Механизмы", category: "equipment", title: "Кран для арматуры, опалубки и комплектующих", unitId: "machine_hour", formulaId: "rcw_crane_machine_v1", expression: `((${REBAR_INSTALLED})/1000)*rcw_crane_h_per_rebar_t`, procurement: true },
  { rowId: "rc14:logistics:rcw-soil-removal", section: "Логистика", category: "service", title: "Вывоз излишнего грунта", unitId: "trip", formulaId: "rcw_soil_removal_trip_v1", expression: `ceil((${EXCESS_SOIL})/rcw_dump_truck_capacity_m3)`, procurement: true },
  { rowId: "rc14:logistics:rcw-backfill-delivery", section: "Логистика", category: "service", title: "Доставка привозного грунта", unitId: "trip", formulaId: "rcw_backfill_delivery_trip_v1", expression: `ceil(((${IMPORTED_BACKFILL})*rcw_imported_backfill_order_factor)/rcw_dump_truck_capacity_m3)`, procurement: true },
  { rowId: "rc14:logistics:rcw-concrete-delivery", section: "Логистика", category: "service", title: "Доставка бетонных смесей", unitId: "trip", formulaId: "rcw_concrete_delivery_trip_v1", expression: `ceil(((${BLINDING})+(${STRUCTURAL}))*rcw_concrete_order_factor/rcw_concrete_truck_capacity_m3)`, procurement: true },
  { rowId: "rc14:logistics:rcw-rebar-delivery", section: "Логистика", category: "service", title: "Доставка арматуры", unitId: "trip", formulaId: "rcw_rebar_delivery_trip_v1", expression: `ceil((${REBAR_ORDER})/rcw_rebar_delivery_kg_per_trip)`, procurement: true },
  { rowId: "rc14:rcw_hidden_works", section: "Контроль качества", category: "service", title: "Акты скрытых работ по резервуарам", unitId: "set", formulaId: "rcw_hidden_works_v1", expression: N, procurement: true },
  { rowId: "rc14:rcw_concrete_quality", section: "Контроль качества", category: "service", title: "Контроль бетонных смесей и прочности конструкций", unitId: "set", formulaId: "rcw_concrete_quality_v1", expression: N, procurement: true },
  { rowId: "rc14:rcw_asbuilt", section: "Контроль качества", category: "service", title: "Исполнительная документация и паспорт резервуара", unitId: "set", formulaId: "rcw_asbuilt_v1", expression: N, procurement: true },
  { rowId: "rc14:rcw_shoring", section: "Условные работы", category: "equipment", title: "Инвентарное крепление стен котлована", unitId: "m2", formulaId: "rcw_shoring_v1", expression: `${N}*2*((${XL})+(${XW}))*(${XD})`, procurement: true, inclusion: { kind: "equals", parameterId: "rcw_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["rcw_shoring_designation"] },
  { rowId: "rc14:labor:rcw-shoring", section: "Условные работы", category: "labor", title: "Монтаж и перестановка крепления котлована", unitId: "man_hour", formulaId: "rcw_shoring_labor_v1", expression: `${N}*2*((${XL})+(${XW}))*(${XD})*0.15`, procurement: true, inclusion: { kind: "equals", parameterId: "rcw_shoring_mode", value: "REQUIRED" } },
  { rowId: "rc14:rcw_dewatering_pump", section: "Условные работы", category: "equipment", title: "Работа насоса водоотлива", unitId: "machine_hour", formulaId: "rcw_dewatering_pump_v1", expression: "rcw_dewatering_duration_h", procurement: true, inclusion: { kind: "equals", parameterId: "rcw_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["rcw_dewatering_pump_designation"] },
  { rowId: "rc14:rcw_dewatering_volume", section: "Условные работы", category: "service", title: "Откачанная вода", unitId: "m3", formulaId: "rcw_dewatering_volume_v1", expression: "rcw_dewatering_duration_h*rcw_dewatering_flow_m3_h", procurement: true, inclusion: { kind: "equals", parameterId: "rcw_dewatering_mode", value: "REQUIRED" } },
  { rowId: "rc14:labor:rcw-dewatering", section: "Условные работы", category: "labor", title: "Обслуживание водоотлива", unitId: "man_hour", formulaId: "rcw_dewatering_labor_v1", expression: "rcw_dewatering_duration_h*0.5", procurement: true, inclusion: { kind: "equals", parameterId: "rcw_dewatering_mode", value: "REQUIRED" } },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.reservoir-clean-water-r1",
  semanticOwner: "reservoir-clean-water",
  sourceId: RESERVOIR_CLEAN_WATER_SOURCE_ID,
  normId: RESERVOIR_CLEAN_WATER_NORM_ID,
  sourceMetadata: RESERVOIR_CLEAN_WATER_SOURCE_METADATA,
  applicabilityRu: "Подземный монолитный железобетонный резервуар чистой воды прямоугольной формы",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "simultaneous legacy water_reservoir BOQ owner for the same physical reservoir",
    "external pipeline, pump station, treatment plant or separate valve chamber",
    "automatic rock excavation, piling, road restoration or permanent dewatering",
    "invented price",
  ],
});

export const RESERVOIR_CLEAN_WATER_PARAMETERS = definition.parameters;
export const RESERVOIR_CLEAN_WATER_FORMULAS = definition.formulas;
export const RESERVOIR_CLEAN_WATER_RESOURCES = definition.resources;
export const RESERVOIR_CLEAN_WATER_RUNTIME_INPUT = definition.runtimeInput;
export const RESERVOIR_CLEAN_WATER_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const RESERVOIR_CLEAN_WATER_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const RESERVOIR_CLEAN_WATER_KNOWN_SCOPE_PARAMETERS = Object.freeze(
  ordinary.map((parameter) => parameter.id),
);

export const RESERVOIR_CLEAN_WATER_SHORT_INPUT = Object.freeze({
  rcw_reservoir_count: 2,
  rcw_reservoir_designation: "RC-CWR-2X1000",
  rcw_internal_length_m: 20,
  rcw_internal_width_m: 10,
  rcw_operating_water_depth_m: 5,
  rcw_cell_count_per_reservoir: 2,
  rcw_structural_system: "BURIED_CAST_IN_PLACE_RC",
});

export const RESERVOIR_CLEAN_WATER_ACCEPTANCE_INPUT = Object.freeze({
  ...RESERVOIR_CLEAN_WATER_SHORT_INPUT,
  ...RESERVOIR_CLEAN_WATER_RUNTIME_INPUT,
});

export async function compileReservoirCleanWaterR1(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.reservoir-clean-water-r1",
    catalogId: RESERVOIR_CLEAN_WATER_CATALOG_ID,
    primaryMeasureParameterId: "rcw_reservoir_count",
    definition,
    submittedParameters,
  });
}
