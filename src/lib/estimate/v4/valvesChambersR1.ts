import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

export const VALVES_CHAMBERS_CATALOG_ID =
  "canonical-work:expanded:valves_chambers";
export const VALVES_CHAMBERS_SOURCE_ID =
  "project_valves_chambers_geometric_automatic_v2";
export const VALVES_CHAMBERS_NORM_ID =
  "norm:project:valves_chambers_geometric_automatic:v2";
export const VALVES_CHAMBERS_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный геометрический профиль железобетонных камер запорной арматуры S27.26",
  source_authority: "Предварительный сценарий canonical compiler; конструкция камеры, арматура, удельные нормы и условные решения требуют подтверждения проектом и поставщиком",
  source_document_version: "VISIBLE_PRELIMINARY_VALVE_CHAMBER_GEOMETRY_TO_RESOURCES_S27_26_REQUIRES_CONFIRMATION",
  definition_hash: "8117e4b1873ef013ac154ecedd6e13a0d3a8719c69c5b4ac11477d44993b7fe3",
  exact_locator: "VCH-RC-2.4X1.8-H2.2-DN200: 4 монолитные железобетонные камеры, 4 задвижки DN200 PN16 и стандартная сквозная нитка; ресурсы рассчитываются из девяти первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённой универсальной нормой или проектом. Наружная сеть за стенами камер исключена; крепление котлована, водопонижение и восстановление покрытия включаются только по условным проектным ветвям.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "8117e4b1873ef013ac154ecedd6e13a0d3a8719c69c5b4ac11477d44993b7fe3",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "vch_chamber_count", title: "Количество камер запорной арматуры", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "vch_chamber_designation", title: "Обозначение выбранной камеры", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "vch_internal_length_m", title: "Внутренняя длина камеры", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "vch_internal_width_m", title: "Внутренняя ширина камеры", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "vch_clear_depth_m", title: "Чистая глубина камеры", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "vch_valve_installed_piece", title: "Количество устанавливаемых задвижек", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "vch_valve_designation", title: "Марка и класс устанавливаемой задвижки", valueType: "text", unitId: null, kind: "ordinary" },
  { id: "vch_nominal_diameter_mm", title: "Номинальный диаметр трубопровода", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "vch_pipeline_spool_designation", title: "Материал и класс внутренней трубной вставки", valueType: "text", unitId: null, kind: "ordinary" },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "vch_wall_thickness_m", title: "Толщина стен камеры", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0.000_001 },
  { id: "vch_base_slab_thickness_m", title: "Толщина плиты днища", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0.000_001 },
  { id: "vch_roof_slab_thickness_m", title: "Толщина плиты покрытия", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0.000_001 },
  { id: "vch_excavation_working_clearance_m", title: "Рабочий зазор котлована", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "vch_blinding_extension_m", title: "Выпуск подготовки за контур камеры", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.15, min: 0 },
  { id: "vch_blinding_thickness_m", title: "Толщина бетонной подготовки", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0.000_001 },
  { id: "vch_blinding_designation", title: "Марка бетонной подготовки", valueType: "text", unitId: null, kind: "profile", defaultValue: "B7.5-W4" },
  { id: "vch_concrete_designation", title: "Марка конструкционного бетона", valueType: "text", unitId: null, kind: "profile", defaultValue: "B25-W8-F150" },
  { id: "vch_concrete_expected_loss_fraction", title: "Технологический запас бетона", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.03, min: 0, max: 1 },
  { id: "vch_reinforcement_designation", title: "Класс арматуры камеры", valueType: "text", unitId: null, kind: "profile", defaultValue: "A500C" },
  { id: "vch_reinforcement_kg_per_concrete_m3", title: "Арматура на геометрический объём железобетона", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 130, min: 0 },
  { id: "vch_formwork_designation", title: "Система опалубки", valueType: "text", unitId: null, kind: "profile", defaultValue: "PANEL-FORMWORK-RC-CHAMBER" },
  { id: "vch_waterproofing_designation", title: "Система наружной гидроизоляции", valueType: "text", unitId: null, kind: "profile", defaultValue: "2L-BITUMEN-POLYMER-WATERPROOFING" },
  { id: "vch_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.65, min: 0, max: 1 },
  { id: "vch_imported_backfill_designation", title: "Материал привозной обратной засыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "SELECTED-SAND-GRAVEL-BACKFILL" },
  { id: "vch_hatch_designation", title: "Люк и рама камеры", valueType: "text", unitId: null, kind: "profile", defaultValue: "DUCTILE-IRON-HATCH-D400" },
  { id: "vch_hatch_piece_per_chamber", title: "Люков на камеру", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_ladder_designation", title: "Стационарная лестница камеры", valueType: "text", unitId: null, kind: "profile", defaultValue: "HOT-DIP-GALVANIZED-LADDER" },
  { id: "vch_ladder_top_extension_m", title: "Выпуск лестницы выше чистой глубины", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "vch_sump_designation", title: "Дренажный приямок камеры", valueType: "text", unitId: null, kind: "profile", defaultValue: "RC-DRAINAGE-SUMP-400X400" },
  { id: "vch_sump_piece_per_chamber", title: "Приямков на камеру", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_vent_pipe_designation", title: "Вентиляционная труба камеры", valueType: "text", unitId: null, kind: "profile", defaultValue: "GALVANIZED-VENT-DN100" },
  { id: "vch_vent_pipe_m_per_chamber", title: "Длина вентиляционной трубы на камеру", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 2.5, min: 0 },
  { id: "vch_pipeline_run_per_chamber", title: "Сквозных ниток трубопровода в камере", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 1 },
  { id: "vch_spool_allowance_m_per_chamber", title: "Монтажный запас трубной вставки на камеру", valueType: "decimal", unitId: "m_per_system", kind: "profile", defaultValue: 0.6, min: 0 },
  { id: "vch_penetration_seal_designation", title: "Герметизация прохода трубопровода", valueType: "text", unitId: null, kind: "profile", defaultValue: "MODULAR-LINK-SEAL-DN200" },
  { id: "vch_penetration_piece_per_run", title: "Проходов через стены на одну нитку", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "vch_puddle_flange_designation", title: "Гидроизоляционный фланец прохода", valueType: "text", unitId: null, kind: "profile", defaultValue: "PUDDLE-FLANGE-DN200" },
  { id: "vch_puddle_flange_per_penetration", title: "Гидроизоляционных фланцев на проход", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_dismantling_joint_designation", title: "Демонтажная вставка задвижки", valueType: "text", unitId: null, kind: "profile", defaultValue: "DISMANTLING-JOINT-DN200-PN16" },
  { id: "vch_dismantling_joint_per_valve", title: "Демонтажных вставок на задвижку", valueType: "decimal", unitId: "pcs_per_valve", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_flanged_joint_set_per_valve", title: "Комплектов прокладок и крепежа на задвижку", valueType: "decimal", unitId: "set_per_valve", kind: "profile", defaultValue: 3, min: 0 },
  { id: "vch_support_designation", title: "Опора трубопровода и арматуры", valueType: "text", unitId: null, kind: "profile", defaultValue: "GALVANIZED-VALVE-PIPE-SUPPORT" },
  { id: "vch_support_piece_per_valve", title: "Опор на задвижку", valueType: "decimal", unitId: "pcs_per_valve", kind: "profile", defaultValue: 2, min: 0 },
  { id: "vch_extension_spindle_designation", title: "Удлинитель шпинделя задвижки", valueType: "text", unitId: null, kind: "profile", defaultValue: "VALVE-EXTENSION-SPINDLE-DN200" },
  { id: "vch_extension_spindle_per_valve", title: "Удлинителей шпинделя на задвижку", valueType: "decimal", unitId: "pcs_per_valve", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_valve_retained_spare_piece", title: "Сохраняемый резерв задвижек", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_valve_available_stock_piece", title: "Подтверждённый доступный остаток задвижек", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 0, min: 0 },
  { id: "vch_valve_supplier_package_quantity_piece", title: "Количество задвижек в поставочной партии", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 1 },
  { id: "vch_waterstop_designation", title: "Гидрошпонка рабочих швов", valueType: "text", unitId: null, kind: "profile", defaultValue: "PVC-WATERSTOP-240MM" },
  { id: "vch_waterstop_joint_count", title: "Горизонтальных швов с гидрошпонкой", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 2, min: 0 },
  { id: "vch_joint_sealant_designation", title: "Герметик рабочих швов", valueType: "text", unitId: null, kind: "profile", defaultValue: "PU-JOINT-SEALANT" },
  { id: "vch_joint_sealant_kg_per_waterstop_m", title: "Герметик на метр шва", valueType: "decimal", unitId: "kg_per_m", kind: "profile", defaultValue: 0.15, min: 0 },
  { id: "vch_curing_compound_designation", title: "Материал ухода за бетоном", valueType: "text", unitId: null, kind: "profile", defaultValue: "CURING-COMPOUND-RC" },
  { id: "vch_curing_compound_l_per_formwork_m2", title: "Материал ухода на площадь конструкций", valueType: "decimal", unitId: "l_per_m2", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "vch_civil_consumable_set_per_chamber", title: "Комплекты общестроительных расходников на камеру", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_mechanical_consumable_set_per_valve", title: "Комплекты механических расходников на задвижку", valueType: "decimal", unitId: "set_per_valve", kind: "profile", defaultValue: 1, min: 0 },
  { id: "vch_test_water_min_m3_per_chamber", title: "Минимальный объём воды для испытания камеры", valueType: "decimal", unitId: "m3_per_system", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "vch_flush_volume_turnovers", title: "Кратность промывки внутренней трубной вставки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 3, min: 0 },
  { id: "vch_disinfection_reagent_kg_per_m3", title: "Реагент на кубометр промывочной воды", valueType: "decimal", unitId: "kg_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "vch_earthworks_labor_h_per_m3", title: "Труд на кубометр разработки и засыпки", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.75, min: 0 },
  { id: "vch_concrete_labor_h_per_m3", title: "Труд на кубометр железобетонных конструкций", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 4, min: 0 },
  { id: "vch_rebar_labor_h_per_t", title: "Труд на тонну арматуры", valueType: "decimal", unitId: "man_hour_per_t", kind: "profile", defaultValue: 65, min: 0 },
  { id: "vch_formwork_labor_h_per_m2", title: "Труд на квадратный метр опалубки", valueType: "decimal", unitId: "man_hour_per_m2", kind: "profile", defaultValue: 1.2, min: 0 },
  { id: "vch_waterproofing_labor_h_per_m2", title: "Труд на квадратный метр гидроизоляции", valueType: "decimal", unitId: "man_hour_per_m2", kind: "profile", defaultValue: 0.35, min: 0 },
  { id: "vch_mechanical_labor_h_per_valve", title: "Труд на монтаж задвижки и обвязки", valueType: "decimal", unitId: "man_hour_per_valve", kind: "profile", defaultValue: 12, min: 0 },
  { id: "vch_pipe_labor_h_per_m", title: "Труд на метр внутренней трубной вставки", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 4, min: 0 },
  { id: "vch_access_labor_h_per_chamber", title: "Труд на люк, лестницу, вентиляцию и приямок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 8, min: 0 },
  { id: "vch_qa_labor_h_per_chamber", title: "Труд на испытания, дезинфекцию и документы", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 12, min: 0 },
  { id: "vch_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 18, min: 0.000_001 },
  { id: "vch_compactor_productivity_m3_h", title: "Производительность уплотнения", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 12, min: 0.000_001 },
  { id: "vch_concrete_pump_productivity_m3_h", title: "Производительность бетононасоса", valueType: "decimal", unitId: "m3_per_machine_hour", kind: "profile", defaultValue: 12, min: 0.000_001 },
  { id: "vch_crane_h_per_valve", title: "Работа крана на задвижку", valueType: "decimal", unitId: "machine_hour_per_valve", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "vch_test_equipment_h_per_chamber", title: "Испытательное оборудование на камеру", valueType: "decimal", unitId: "machine_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "vch_concrete_delivery_capacity_m3_per_trip", title: "Вместимость рейса бетонной смеси", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 7, min: 0.000_001 },
  { id: "vch_equipment_units_per_delivery_trip", title: "Комплектов арматуры и доступа на рейс", valueType: "decimal", unitId: "pcs_per_trip", kind: "profile", defaultValue: 6, min: 0.000_001 },
  { id: "vch_soil_truck_capacity_m3", title: "Вместимость рейса вывоза грунта", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "vch_excavation_shoring_mode", title: "Крепление котлована требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "vch_groundwater_dewatering_mode", title: "Строительное водопонижение требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "vch_pavement_reinstatement_mode", title: "Восстановление покрытия требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "vch_excavation_shoring_designation", title: "Система крепления котлована", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "vch_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "vch_excavation_shoring_area_m2", title: "Площадь крепления котлована", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "vch_excavation_shoring_mode", value: "REQUIRED" } },
  { id: "vch_groundwater_dewatering_designation", title: "Система водопонижения", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "vch_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "vch_groundwater_dewatering_machine_h", title: "Работа системы водопонижения", valueType: "decimal", unitId: "machine_hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "vch_groundwater_dewatering_mode", value: "REQUIRED" } },
  { id: "vch_pavement_reinstatement_designation", title: "Конструкция восстанавливаемого покрытия", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "vch_pavement_reinstatement_mode", value: "REQUIRED" } },
  { id: "vch_pavement_reinstatement_area_m2", title: "Площадь восстановления покрытия", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "vch_pavement_reinstatement_mode", value: "REQUIRED" } },
]);

const OUTER_L = "(vch_internal_length_m+2*vch_wall_thickness_m)";
const OUTER_W = "(vch_internal_width_m+2*vch_wall_thickness_m)";
const STRUCTURE_H = "(vch_clear_depth_m+vch_base_slab_thickness_m+vch_roof_slab_thickness_m)";
const EXCAVATION = `vch_chamber_count*(${OUTER_L}+2*vch_excavation_working_clearance_m)*(${OUTER_W}+2*vch_excavation_working_clearance_m)*(${STRUCTURE_H}+vch_blinding_thickness_m)`;
const BLINDING = `vch_chamber_count*(${OUTER_L}+2*vch_blinding_extension_m)*(${OUTER_W}+2*vch_blinding_extension_m)*vch_blinding_thickness_m`;
const CONCRETE_NET = `vch_chamber_count*(${OUTER_L}*${OUTER_W}*(vch_base_slab_thickness_m+vch_roof_slab_thickness_m)+2*(vch_internal_length_m+vch_internal_width_m)*vch_clear_depth_m*vch_wall_thickness_m)`;
const CONCRETE_ORDER = `(${CONCRETE_NET})*(1+vch_concrete_expected_loss_fraction)`;
const BACKFILL = `max(0,${EXCAVATION}-vch_chamber_count*${OUTER_L}*${OUTER_W}*${STRUCTURE_H}-${BLINDING})`;
const IMPORTED_BACKFILL = `(${BACKFILL})*(1-vch_excavated_soil_reuse_fraction)`;
const EXCESS_SOIL = `max(0,${EXCAVATION}-(${BACKFILL})*vch_excavated_soil_reuse_fraction)`;
const WATERPROOFING = `vch_chamber_count*(2*(${OUTER_L}+${OUTER_W})*${STRUCTURE_H}+2*${OUTER_L}*${OUTER_W})`;
const FORMWORK = `vch_chamber_count*(2*(vch_internal_length_m+vch_internal_width_m)*vch_clear_depth_m+2*(${OUTER_L}+${OUTER_W})*vch_clear_depth_m+2*${OUTER_L}*${OUTER_W})`;
const SPOOL = `vch_chamber_count*vch_pipeline_run_per_chamber*(${OUTER_L}+vch_spool_allowance_m_per_chamber)`;
const PENETRATIONS = "vch_chamber_count*vch_pipeline_run_per_chamber*vch_penetration_piece_per_run";
const WATERSTOP = `vch_chamber_count*vch_waterstop_joint_count*2*(${OUTER_L}+${OUTER_W})`;
const PIPE_WATER = `(${SPOOL})*0.785398163397*(vch_nominal_diameter_mm/1000)*(vch_nominal_diameter_mm/1000)`;
const TEST_WATER = `max(vch_chamber_count*vch_test_water_min_m3_per_chamber,(${PIPE_WATER})*vch_flush_volume_turnovers)`;
const VALVE_TOTAL_NEED = "vch_valve_installed_piece+vch_valve_retained_spare_piece";
const VALVE_NET_NEED = `max(0,${VALVE_TOTAL_NEED}-vch_valve_available_stock_piece)`;
const VALVE_PACKAGES = `ceil((${VALVE_NET_NEED})/vch_valve_supplier_package_quantity_piece)`;
const VALVE_ORDER = `(${VALVE_PACKAGES})*vch_valve_supplier_package_quantity_piece`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc09:vch_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка котлованов камер", unitId: "m3", formulaId: "vch_excavation_v2", expression: EXCAVATION },
  { rowId: "rc09:vch_blinding", section: "Основание", category: "material", title: "Бетонная подготовка камер", unitId: "m3", formulaId: "vch_blinding_v2", expression: BLINDING, procurement: true, titleParameterIds: ["vch_blinding_designation"] },
  { rowId: "rc09:vch_structural_concrete", section: "Железобетон", category: "material", title: "Конструкционный бетон с технологическим запасом", unitId: "m3", formulaId: "vch_concrete_order_v2", expression: CONCRETE_ORDER, procurement: true, titleParameterIds: ["vch_concrete_designation"] },
  { rowId: "rc09:vch-concrete-balance:installed-net", section: "Баланс бетона", category: "material", title: "Чистый геометрический объём конструкционного бетона", unitId: "m3", formulaId: "vch_concrete_net_v2", expression: CONCRETE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch_reinforcement", section: "Железобетон", category: "material", title: "Арматура камер", unitId: "t", formulaId: "vch_reinforcement_v2", expression: `(${CONCRETE_NET})*vch_reinforcement_kg_per_concrete_m3/1000`, procurement: true, titleParameterIds: ["vch_reinforcement_designation"] },
  { rowId: "rc09:vch_formwork", section: "Железобетон", category: "material", title: "Опалубка стен и плит", unitId: "m2", formulaId: "vch_formwork_v2", expression: FORMWORK, procurement: true, titleParameterIds: ["vch_formwork_designation"] },
  { rowId: "rc09:vch_waterproofing", section: "Гидроизоляция", category: "material", title: "Наружная гидроизоляция камер", unitId: "m2", formulaId: "vch_waterproofing_v2", expression: WATERPROOFING, procurement: true, titleParameterIds: ["vch_waterproofing_designation"] },
  { rowId: "rc09:vch_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка и уплотнение", unitId: "m3", formulaId: "vch_backfill_v2", expression: BACKFILL },
  { rowId: "rc09:vch_imported_backfill", section: "Материалы основания", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "vch_imported_backfill_v2", expression: IMPORTED_BACKFILL, procurement: true, titleParameterIds: ["vch_imported_backfill_designation"] },
  { rowId: "rc09:vch_excess_soil", section: "Земляные работы", category: "service", title: "Лишний грунт к вывозу", unitId: "m3", formulaId: "vch_excess_soil_v2", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc09:vch_pipeline_spool", section: "Трубопроводы", category: "material", title: "Внутренняя трубная вставка камеры", unitId: "m", formulaId: "vch_pipeline_spool_v2", expression: SPOOL, procurement: true, titleParameterIds: ["vch_pipeline_spool_designation"] },
  { rowId: "rc09:vch_valves", section: "Арматура", category: "material", title: "Задвижки к закупке", unitId: "piece", formulaId: "vch_valves_order_v2", expression: VALVE_ORDER, procurement: true, titleParameterIds: ["vch_valve_designation"] },
  { rowId: "rc09:vch_dismantling_joints", section: "Арматура", category: "material", title: "Демонтажные вставки", unitId: "piece", formulaId: "vch_dismantling_joints_v2", expression: "vch_valve_installed_piece*vch_dismantling_joint_per_valve", procurement: true, titleParameterIds: ["vch_dismantling_joint_designation"] },
  { rowId: "rc09:vch_flanged_joint_sets", section: "Комплектующие", category: "material", title: "Прокладки и крепёж фланцевых соединений", unitId: "set", formulaId: "vch_flanged_joint_sets_v2", expression: "vch_valve_installed_piece*vch_flanged_joint_set_per_valve", procurement: true },
  { rowId: "rc09:vch_penetration_seals", section: "Комплектующие", category: "material", title: "Герметизация проходов трубопровода", unitId: "piece", formulaId: "vch_penetration_seals_v2", expression: PENETRATIONS, procurement: true, titleParameterIds: ["vch_penetration_seal_designation"] },
  { rowId: "rc09:vch_puddle_flanges", section: "Комплектующие", category: "material", title: "Гидроизоляционные фланцы проходов", unitId: "piece", formulaId: "vch_puddle_flanges_v2", expression: `(${PENETRATIONS})*vch_puddle_flange_per_penetration`, procurement: true, titleParameterIds: ["vch_puddle_flange_designation"] },
  { rowId: "rc09:vch_valve_supports", section: "Комплектующие", category: "material", title: "Опоры трубопровода и арматуры", unitId: "piece", formulaId: "vch_valve_supports_v2", expression: "vch_valve_installed_piece*vch_support_piece_per_valve", procurement: true, titleParameterIds: ["vch_support_designation"] },
  { rowId: "rc09:vch_extension_spindles", section: "Комплектующие", category: "material", title: "Удлинители шпинделей задвижек", unitId: "piece", formulaId: "vch_extension_spindles_v2", expression: "vch_valve_installed_piece*vch_extension_spindle_per_valve", procurement: true, titleParameterIds: ["vch_extension_spindle_designation"] },
  { rowId: "rc09:vch_hatches", section: "Доступ", category: "material", title: "Люки и рамы камер", unitId: "piece", formulaId: "vch_hatches_v2", expression: "vch_chamber_count*vch_hatch_piece_per_chamber", procurement: true, titleParameterIds: ["vch_hatch_designation"] },
  { rowId: "rc09:vch_ladders", section: "Доступ", category: "material", title: "Стационарные лестницы", unitId: "m", formulaId: "vch_ladders_v2", expression: "vch_chamber_count*(vch_clear_depth_m+vch_ladder_top_extension_m)", procurement: true, titleParameterIds: ["vch_ladder_designation"] },
  { rowId: "rc09:vch_sumps", section: "Дренаж", category: "material", title: "Дренажные приямки", unitId: "piece", formulaId: "vch_sumps_v2", expression: "vch_chamber_count*vch_sump_piece_per_chamber", procurement: true, titleParameterIds: ["vch_sump_designation"] },
  { rowId: "rc09:vch_vent_pipe", section: "Вентиляция", category: "material", title: "Вентиляционные трубы камер", unitId: "m", formulaId: "vch_vent_pipe_v2", expression: "vch_chamber_count*vch_vent_pipe_m_per_chamber", procurement: true, titleParameterIds: ["vch_vent_pipe_designation"] },
  { rowId: "rc09:vch_waterstop", section: "Гидроизоляция", category: "material", title: "Гидрошпонка рабочих швов", unitId: "m", formulaId: "vch_waterstop_v2", expression: WATERSTOP, procurement: true, titleParameterIds: ["vch_waterstop_designation"] },
  { rowId: "rc09:vch_joint_sealant", section: "Гидроизоляция", category: "material", title: "Герметик рабочих швов", unitId: "kg", formulaId: "vch_joint_sealant_v2", expression: `(${WATERSTOP})*vch_joint_sealant_kg_per_waterstop_m`, procurement: true, titleParameterIds: ["vch_joint_sealant_designation"] },
  { rowId: "rc09:vch_civil_consumables", section: "Расходники", category: "material", title: "Общестроительные расходники", unitId: "set", formulaId: "vch_civil_consumables_v2", expression: "vch_chamber_count*vch_civil_consumable_set_per_chamber", procurement: true },
  { rowId: "rc09:vch_mechanical_consumables", section: "Расходники", category: "material", title: "Механические монтажные расходники", unitId: "set", formulaId: "vch_mechanical_consumables_v2", expression: "vch_valve_installed_piece*vch_mechanical_consumable_set_per_valve", procurement: true },
  { rowId: "rc09:vch_curing_compound", section: "Расходники", category: "material", title: "Материал ухода за бетоном", unitId: "l", formulaId: "vch_curing_compound_v2", expression: `(${FORMWORK})*vch_curing_compound_l_per_formwork_m2`, procurement: true, titleParameterIds: ["vch_curing_compound_designation"] },
  { rowId: "rc09:vch_test_water", section: "Испытания", category: "material", title: "Вода для испытания, промывки и дезинфекции", unitId: "m3", formulaId: "vch_test_water_v2", expression: TEST_WATER, procurement: true },
  { rowId: "rc09:vch_disinfection_reagent", section: "Испытания", category: "material", title: "Реагент для дезинфекции", unitId: "kg", formulaId: "vch_disinfection_reagent_v2", expression: `(${TEST_WATER})*vch_disinfection_reagent_kg_per_m3`, procurement: true },
  { rowId: "rc09:vch_acceptance", section: "Работы", category: "construction_work", title: "Устройство и приёмка камеры запорной арматуры", unitId: "piece", formulaId: "vch_acceptance_v2", expression: "vch_chamber_count", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["vch_chamber_designation"] },
  { rowId: "rc09:vch_nominal_diameter", section: "Гидравлический режим", category: "service", title: "Номинальный диаметр трубопровода", unitId: "mm", formulaId: "vch_nominal_diameter_v2", expression: "vch_nominal_diameter_mm", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch_hydraulic_tests", section: "Контроль", category: "service", title: "Гидравлическое испытание узлов", unitId: "test", formulaId: "vch_hydraulic_tests_v2", expression: "vch_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch_flushing_disinfection", section: "Контроль", category: "service", title: "Промывка и дезинфекция внутренних вставок", unitId: "cycle", formulaId: "vch_flushing_disinfection_v2", expression: "vch_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch_asbuilt", section: "Документы", category: "service", title: "Исполнительная документация и передача", unitId: "document", formulaId: "vch_asbuilt_v2", expression: "vch_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:vch-earthworks", section: "Труд", category: "construction_work", title: "Труд на котлованы, засыпку и уплотнение", unitId: "man_hour", formulaId: "vch_earthworks_labor_v2", expression: `(${EXCAVATION}+${BACKFILL})*vch_earthworks_labor_h_per_m3` },
  { rowId: "rc09:labor:vch-concrete", section: "Труд", category: "construction_work", title: "Труд на бетонные работы", unitId: "man_hour", formulaId: "vch_concrete_labor_v2", expression: `(${CONCRETE_NET})*vch_concrete_labor_h_per_m3` },
  { rowId: "rc09:labor:vch-rebar", section: "Труд", category: "construction_work", title: "Труд на армирование", unitId: "man_hour", formulaId: "vch_rebar_labor_v2", expression: `((${CONCRETE_NET})*vch_reinforcement_kg_per_concrete_m3/1000)*vch_rebar_labor_h_per_t` },
  { rowId: "rc09:labor:vch-formwork", section: "Труд", category: "construction_work", title: "Труд на опалубку", unitId: "man_hour", formulaId: "vch_formwork_labor_v2", expression: `(${FORMWORK})*vch_formwork_labor_h_per_m2` },
  { rowId: "rc09:labor:vch-waterproofing", section: "Труд", category: "construction_work", title: "Труд на гидроизоляцию", unitId: "man_hour", formulaId: "vch_waterproofing_labor_v2", expression: `(${WATERPROOFING})*vch_waterproofing_labor_h_per_m2` },
  { rowId: "rc09:labor:vch-mechanical", section: "Труд", category: "construction_work", title: "Монтаж задвижек, вставок и комплектующих", unitId: "man_hour", formulaId: "vch_mechanical_labor_v2", expression: `vch_valve_installed_piece*vch_mechanical_labor_h_per_valve+(${SPOOL})*vch_pipe_labor_h_per_m` },
  { rowId: "rc09:labor:vch-access", section: "Труд", category: "construction_work", title: "Монтаж люков, лестниц, вентиляции и приямков", unitId: "man_hour", formulaId: "vch_access_labor_v2", expression: "vch_chamber_count*vch_access_labor_h_per_chamber" },
  { rowId: "rc09:labor:vch-qa-documentation", section: "Труд", category: "construction_work", title: "Испытания, дезинфекция и документация", unitId: "man_hour", formulaId: "vch_qa_labor_v2", expression: "vch_chamber_count*vch_qa_labor_h_per_chamber" },
  { rowId: "rc09:equipment:vch-excavator", section: "Механизмы", category: "equipment", title: "Экскаватор", unitId: "machine_hour", formulaId: "vch_excavator_v2", expression: `(${EXCAVATION})/vch_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:vch-compactor", section: "Механизмы", category: "equipment", title: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "vch_compactor_v2", expression: `(${BACKFILL})/vch_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:vch-concrete-pump", section: "Механизмы", category: "equipment", title: "Бетононасос", unitId: "machine_hour", formulaId: "vch_concrete_pump_v2", expression: `(${CONCRETE_ORDER})/vch_concrete_pump_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:vch-crane", section: "Механизмы", category: "equipment", title: "Кран для арматуры и комплектующих", unitId: "machine_hour", formulaId: "vch_crane_v2", expression: "vch_valve_installed_piece*vch_crane_h_per_valve", procurement: true },
  { rowId: "rc09:equipment:vch-test-equipment", section: "Механизмы", category: "equipment", title: "Испытательное и промывочное оборудование", unitId: "machine_hour", formulaId: "vch_test_equipment_v2", expression: "vch_chamber_count*vch_test_equipment_h_per_chamber", procurement: true },
  { rowId: "rc09:logistics:vch-concrete-delivery", section: "Логистика", category: "service", title: "Доставка бетонных смесей", unitId: "trip", formulaId: "vch_concrete_delivery_v2", expression: `ceil((${CONCRETE_ORDER}+${BLINDING})/vch_concrete_delivery_capacity_m3_per_trip)`, procurement: true },
  { rowId: "rc09:logistics:vch-equipment-delivery", section: "Логистика", category: "service", title: "Доставка арматуры и комплектующих", unitId: "trip", formulaId: "vch_equipment_delivery_v2", expression: `max(1,ceil((vch_valve_installed_piece+vch_chamber_count*vch_hatch_piece_per_chamber)/vch_equipment_units_per_delivery_trip))`, procurement: true },
  { rowId: "rc09:logistics:vch-soil-removal", section: "Логистика", category: "service", title: "Вывоз лишнего грунта", unitId: "trip", formulaId: "vch_soil_removal_v2", expression: `ceil((${EXCESS_SOIL})/vch_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc09:vch-valve-balance:installed-net", section: "Баланс задвижек", category: "material", title: "Задвижки к установке", unitId: "piece", formulaId: "vch_valve_installed_v2", expression: "vch_valve_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:retained-spare", section: "Баланс задвижек", category: "material", title: "Сохраняемый резерв задвижек", unitId: "piece", formulaId: "vch_valve_spare_v2", expression: "vch_valve_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:available-stock", section: "Баланс задвижек", category: "material", title: "Подтверждённый доступный остаток задвижек", unitId: "piece", formulaId: "vch_valve_stock_v2", expression: "vch_valve_available_stock_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:total-need", section: "Баланс задвижек", category: "material", title: "Общая потребность в задвижках", unitId: "piece", formulaId: "vch_valve_total_need_v2", expression: VALVE_TOTAL_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:net-order-need", section: "Баланс задвижек", category: "material", title: "Чистая потребность к заказу", unitId: "piece", formulaId: "vch_valve_net_need_v2", expression: VALVE_NET_NEED, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:package-count", section: "Баланс задвижек", category: "material", title: "Количество поставочных партий", unitId: "piece", formulaId: "vch_valve_packages_v2", expression: VALVE_PACKAGES, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:remainder", section: "Баланс задвижек", category: "material", title: "Остаток после монтажа", unitId: "piece", formulaId: "vch_valve_remainder_v2", expression: `vch_valve_available_stock_piece+${VALVE_ORDER}-vch_valve_installed_piece`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch-valve-balance:surplus-beyond-spare", section: "Баланс задвижек", category: "material", title: "Свободный остаток сверх резерва", unitId: "piece", formulaId: "vch_valve_surplus_v2", expression: `max(0,vch_valve_available_stock_piece+${VALVE_ORDER}-(${VALVE_TOTAL_NEED}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:vch_excavation_shoring", section: "Условные работы", category: "construction_work", title: "Крепление котлованов", unitId: "m2", formulaId: "vch_excavation_shoring_v2", expression: "vch_excavation_shoring_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "vch_excavation_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["vch_excavation_shoring_designation"] },
  { rowId: "rc09:vch_groundwater_dewatering", section: "Условные механизмы", category: "equipment", title: "Строительное водопонижение", unitId: "machine_hour", formulaId: "vch_groundwater_dewatering_v2", expression: "vch_groundwater_dewatering_machine_h", procurement: true, inclusion: { kind: "equals", parameterId: "vch_groundwater_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["vch_groundwater_dewatering_designation"] },
  { rowId: "rc09:vch_pavement_reinstatement", section: "Условные работы", category: "construction_work", title: "Восстановление покрытия", unitId: "m2", formulaId: "vch_pavement_reinstatement_v2", expression: "vch_pavement_reinstatement_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "vch_pavement_reinstatement_mode", value: "REQUIRED" }, titleParameterIds: ["vch_pavement_reinstatement_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.valves-chambers-r1.automatic-s27-26",
  semanticOwner: "valves-chambers",
  sourceId: VALVES_CHAMBERS_SOURCE_ID,
  normId: VALVES_CHAMBERS_NORM_ID,
  sourceMetadata: VALVES_CHAMBERS_SOURCE_METADATA,
  applicabilityRu: "Прямоугольные монолитные железобетонные камеры запорной арматуры питьевого водопровода с полным строительным, механическим и приёмочным циклом.",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "external distribution pipeline outside chamber walls",
    "water-meter chamber, pumping station, reservoir or treatment plant",
    "automatic branch topology inferred from network length or capacity",
    "automatic inclusion of shoring, dewatering or pavement reinstatement",
    "invented price",
  ],
});

export const VALVES_CHAMBERS_PARAMETERS = definition.parameters;
export const VALVES_CHAMBERS_FORMULAS = definition.formulas;
export const VALVES_CHAMBERS_RESOURCES = definition.resources;
export const VALVES_CHAMBERS_RUNTIME_INPUT = definition.runtimeInput;
export const VALVES_CHAMBERS_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const VALVES_CHAMBERS_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const VALVES_CHAMBERS_KNOWN_SCOPE_PARAMETERS = definition.ordinaryParameterIds;
export const VALVES_CHAMBERS_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(VALVES_CHAMBERS_RUNTIME_INPUT),
);

export const VALVES_CHAMBERS_SHORT_INPUT = Object.freeze({
  vch_chamber_count: 4,
  vch_chamber_designation: "VCH-RC-2.4X1.8-H2.2-DN200",
  vch_internal_length_m: 2.4,
  vch_internal_width_m: 1.8,
  vch_clear_depth_m: 2.2,
  vch_valve_installed_piece: 4,
  vch_valve_designation: "GATE-VALVE-DN200-PN16-EPDM",
  vch_nominal_diameter_mm: 200,
  vch_pipeline_spool_designation: "STEEL-SPOOL-DN200-PN16-EPOXY",
});

export const VALVES_CHAMBERS_ACCEPTANCE_INPUT = Object.freeze({
  ...VALVES_CHAMBERS_SHORT_INPUT,
  ...VALVES_CHAMBERS_RUNTIME_INPUT,
});

export async function compileValvesChambersR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? VALVES_CHAMBERS_CATALOG_ID;
  if (catalogId !== VALVES_CHAMBERS_CATALOG_ID) {
    throw new Error(`VALVES_CHAMBERS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.valves-chambers-automatic-s27-26-r1",
    catalogId,
    primaryMeasureParameterId: "vch_chamber_count",
    definition,
    submittedParameters,
  });
}
