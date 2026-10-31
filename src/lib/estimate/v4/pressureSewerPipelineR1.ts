import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

import { PRESSURE_SEWER_PIPELINE_CATALOG_ID } from "./pressureSewerPipelinePromptR1";
export { PRESSURE_SEWER_PIPELINE_CATALOG_ID, parsePressureSewerPipelineOrdinaryPromptR1 } from "./pressureSewerPipelinePromptR1";
export const PRESSURE_SEWER_PIPELINE_SOURCE_ID =
  "visible_preliminary_pressure_sewer_open_trench_automatic_v2";
export const PRESSURE_SEWER_PIPELINE_NORM_ID =
  "norm:preliminary:pressure_sewer_open_trench_automatic:v2";
export const PRESSURE_SEWER_PIPELINE_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный профиль строительства напорной канализации S27.27",
  source_authority: "Предварительный сценарий canonical compiler; геометрия, ресурсы, труд, механизмы и логистика вычисляются автоматически, а исходные проектные решения требуют подтверждения",
  source_document_version: "VISIBLE_PRELIMINARY_PRESSURE_SEWER_OPEN_TRENCH_S27_27_REQUIRES_CONFIRMATION",
  definition_hash: "884f673a1baf6c04c5f77e30709c53729b86e3a276fb79c122581061697a9347",
  exact_locator: "Напорная канализация открытой прокладки: длина и семь проектных фактов; траншея, материалы, баланс трубы, труд, механизмы, испытания и рейсы рассчитываются из первичных фактов и явно видимого предварительного профиля",
  use_restriction: "Не является гидравлическим расчётом, утверждённым проектом или универсальной нормой. Диаметр, глубина и проектные количества фасонных частей и арматуры не выводятся только из длины. Футляр, водоотлив и восстановление дороги включаются лишь при явном выборе ветви.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "884f673a1baf6c04c5f77e30709c53729b86e3a276fb79c122581061697a9347",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "psp_route_length_m", title: "Проектная длина напорного канализационного трубопровода", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "psp_pipe_designation", title: "Обозначение выбранной напорной трубы", valueType: "text", unitId: null, kind: "ordinary", resourceBranchConsumers: ["rc09:psp_pipe", "rc09:psp-pipe-balance:installed-net"] },
  { id: "psp_pipe_outside_diameter_mm", title: "Наружный диаметр выбранной трубы", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "psp_average_trench_depth_m", title: "Средняя проектная глубина траншеи", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "psp_fitting_quantity_piece", title: "Количество фасонных частей по проектной спецификации", valueType: "integer", unitId: "pcs", kind: "ordinary", min: 0 },
  { id: "psp_isolation_valve_quantity_piece", title: "Количество единиц запорной арматуры по проекту", valueType: "integer", unitId: "pcs", kind: "ordinary", min: 0 },
  { id: "psp_air_valve_quantity_piece", title: "Количество воздушных клапанов по профилю трассы", valueType: "integer", unitId: "pcs", kind: "ordinary", min: 0 },
  { id: "psp_washout_quantity_piece", title: "Количество промывных узлов по профилю трассы", valueType: "integer", unitId: "pcs", kind: "ordinary", min: 0 },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "psp_installation_technology", title: "Предварительная технология прокладки", valueType: "enum", unitId: null, kind: "profile", defaultValue: "HDPE_BUTT_FUSION_OPEN_TRENCH", values: ["HDPE_BUTT_FUSION_OPEN_TRENCH"], resourceBranchConsumers: ["rc09:psp_pipeline_install_acceptance"] },
  { id: "psp_construction_section_count", title: "Количество самостоятельных строительных участков", valueType: "integer", unitId: "piece", kind: "profile", defaultValue: 1, min: 1 },
  { id: "psp_side_clearance_m", title: "Рабочий зазор от трубы до стенки траншеи", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "psp_bedding_thickness_m", title: "Толщина основания под трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0 },
  { id: "psp_surround_cover_above_pipe_m", title: "Высота защитной обсыпки над трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0 },
  { id: "psp_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.8, min: 0, max: 1 },
  { id: "psp_pipe_expected_loss_fraction", title: "Доля технологических потерь трубы", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.02, min: 0 },
  { id: "psp_pipe_retained_spare_m", title: "Сохраняемый резерв трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 12, min: 0 },
  { id: "psp_pipe_available_stock_m", title: "Подтверждённый складской остаток трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "psp_pipe_supplier_segment_length_m", title: "Поставочная длина одного элемента трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 12, min: 0.000_001 },
  { id: "psp_bedding_designation", title: "Материал основания трубы", valueType: "text", unitId: null, kind: "profile", defaultValue: "Песок для основания напорной трубы по проекту", resourceBranchConsumers: ["rc09:psp_bedding"] },
  { id: "psp_surround_designation", title: "Материал защитной обсыпки трубы", valueType: "text", unitId: null, kind: "profile", defaultValue: "Песок защитной обсыпки напорной трубы по проекту", resourceBranchConsumers: ["rc09:psp_surround"] },
  { id: "psp_imported_backfill_designation", title: "Привозной материал обратной засыпки", valueType: "text", unitId: null, kind: "profile", defaultValue: "Привозной грунт обратной засыпки по проекту", resourceBranchConsumers: ["rc09:psp_backfill"] },
  { id: "psp_joint_designation", title: "Способ соединения выбранной трубы", valueType: "text", unitId: null, kind: "profile", defaultValue: "Стыковая сварка напорной ПНД-трубы", resourceBranchConsumers: ["rc09:psp_joint"] },
  { id: "psp_fitting_designation", title: "Фасонные части напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Фасонные части для выбранной напорной трубы", resourceBranchConsumers: ["rc09:psp_fitting"] },
  { id: "psp_isolation_valve_designation", title: "Запорная арматура напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Запорная арматура для сточных вод по проекту", resourceBranchConsumers: ["rc09:psp_isolation_valve"] },
  { id: "psp_air_valve_designation", title: "Воздушный клапан напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Воздушный клапан для сточных вод по проекту", resourceBranchConsumers: ["rc09:psp_air_valve"] },
  { id: "psp_washout_designation", title: "Промывной узел напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Промывной узел напорной канализации по проекту", resourceBranchConsumers: ["rc09:psp_washout"] },
  { id: "psp_chamber_designation", title: "Камера арматуры напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Камера арматуры напорной канализации по проекту", resourceBranchConsumers: ["rc09:psp_chamber"] },
  { id: "psp_cover_designation", title: "Люк камеры напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Люк камеры по проектной нагрузке", resourceBranchConsumers: ["rc09:psp_cover"] },
  { id: "psp_warning_tape_designation", title: "Сигнальная лента напорной канализации", valueType: "text", unitId: null, kind: "profile", defaultValue: "Лента сигнальная Канализация напорная", resourceBranchConsumers: ["rc09:psp_warning_tape"] },
  { id: "psp_bedding_order_factor", title: "Коэффициент заказа материала основания", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "psp_surround_order_factor", title: "Коэффициент заказа защитной обсыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "psp_imported_backfill_order_factor", title: "Коэффициент заказа привозного грунта", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "psp_warning_tape_length_factor", title: "Коэффициент длины сигнальной ленты", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.05, min: 0 },
  { id: "psp_chamber_per_appurtenance", title: "Камер на единицу арматуры или узел", valueType: "decimal", unitId: "pcs_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "psp_cover_per_chamber", title: "Люков на одну камеру", valueType: "decimal", unitId: "pcs_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "psp_survey_labor_h_per_m", title: "Труд геодезического сопровождения на метр трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.04, min: 0 },
  { id: "psp_earthworks_labor_h_per_m3", title: "Труд земляных работ на кубометр", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.12, min: 0 },
  { id: "psp_pipe_install_labor_h_per_m", title: "Труд укладки напорной трубы на метр", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "psp_joint_labor_h_per_piece", title: "Труд на одно соединение трубы", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 1.2, min: 0 },
  { id: "psp_fitting_labor_h_per_piece", title: "Труд на одну фасонную часть", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "psp_appurtenance_labor_h_per_piece", title: "Труд на единицу арматуры или промывной узел", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 4, min: 0 },
  { id: "psp_chamber_labor_h_per_piece", title: "Труд устройства одной камеры", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 12, min: 0 },
  { id: "psp_qa_labor_h_per_m", title: "Труд испытаний и промывки на метр", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.08, min: 0 },
  { id: "psp_documentation_labor_h_per_section", title: "Труд исполнительной документации на участок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "psp_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 35, min: 0.000_001 },
  { id: "psp_compactor_productivity_m3_h", title: "Производительность уплотняющего механизма", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 22, min: 0.000_001 },
  { id: "psp_jointing_machine_h_per_piece", title: "Работа сварочного оборудования на соединение", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 0.8, min: 0 },
  { id: "psp_crane_machine_h_per_piece", title: "Работа крана на тяжёлый элемент или камеру", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "psp_test_pump_machine_h_per_100m", title: "Работа опрессовочного насоса на 100 метров", valueType: "decimal", unitId: "machine_hour_per_100m", kind: "profile", defaultValue: 0.75, min: 0 },
  { id: "psp_soil_truck_capacity_m3", title: "Вместимость самосвала", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "psp_pipe_delivery_m_per_trip", title: "Длина трубы на один рейс", valueType: "decimal", unitId: "m_per_trip", kind: "profile", defaultValue: 120, min: 0.000_001 },
  { id: "psp_crossing_casing_mode", title: "Футляр на пересечении требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "psp_dewatering_mode", title: "Водоотлив требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "psp_road_restoration_mode", title: "Восстановление дорожного покрытия требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "psp_crossing_casing_designation", title: "Футляр на пересечении", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "psp_crossing_casing_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc09:psp_crossing_casing"] },
  { id: "psp_crossing_casing_length_m", title: "Проектная длина футляра", valueType: "decimal", unitId: "m", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "psp_crossing_casing_mode", value: "REQUIRED" } },
  { id: "psp_dewatering_designation", title: "Оборудование водоотлива", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "psp_dewatering_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc09:psp_dewatering"] },
  { id: "psp_dewatering_duration_h", title: "Продолжительность работы водоотлива", valueType: "decimal", unitId: "hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "psp_dewatering_mode", value: "REQUIRED" } },
  { id: "psp_dewatering_flow_m3_h", title: "Фактическая подача водоотлива", valueType: "decimal", unitId: "m3_per_hour", kind: "conditional", min: 0, requiredWhen: { parameterId: "psp_dewatering_mode", value: "REQUIRED" } },
  { id: "psp_road_restoration_designation", title: "Конструкция восстановления дорожного покрытия", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "psp_road_restoration_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc09:psp_road_restoration"] },
  { id: "psp_road_restoration_area_m2", title: "Проектная площадь восстановления дорожного покрытия", valueType: "decimal", unitId: "m2", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "psp_road_restoration_mode", value: "REQUIRED" } },
]);

const PIPE_D = "psp_pipe_outside_diameter_mm/1000";
const WIDTH = `((${PIPE_D})+2*psp_side_clearance_m)`;
const TRENCH = `psp_route_length_m*(${WIDTH})*psp_average_trench_depth_m`;
const BEDDING = `psp_route_length_m*(${WIDTH})*psp_bedding_thickness_m`;
const PIPE_VOLUME = `psp_route_length_m*0.7853981634*(${PIPE_D})*(${PIPE_D})`;
const SURROUND_GROSS = `psp_route_length_m*(${WIDTH})*((${PIPE_D})+psp_surround_cover_above_pipe_m)`;
const SURROUND = `max(0,(${SURROUND_GROSS})-(${PIPE_VOLUME}))`;
const BACKFILL_ZONE = `max(0,(${TRENCH})-(${BEDDING})-(${SURROUND_GROSS}))`;
const NATIVE_BACKFILL = `min((${BACKFILL_ZONE}),(${TRENCH})*psp_excavated_soil_reuse_fraction)`;
const IMPORTED_BACKFILL = `max(0,(${BACKFILL_ZONE})-(${NATIVE_BACKFILL}))`;
const EXCESS_SOIL = `max(0,(${TRENCH})-(${NATIVE_BACKFILL}))`;
const PIPE_LOSS = "psp_route_length_m*psp_pipe_expected_loss_fraction";
const PIPE_TOTAL = `(psp_route_length_m+(${PIPE_LOSS})+psp_pipe_retained_spare_m)`;
const PIPE_NET = `max(0,(${PIPE_TOTAL})-psp_pipe_available_stock_m)`;
const PIPE_SEGMENTS = `ceil((${PIPE_NET})/psp_pipe_supplier_segment_length_m)`;
const PIPE_ORDER = `((${PIPE_SEGMENTS})*psp_pipe_supplier_segment_length_m)`;
const INSTALLED_SEGMENTS = "ceil(psp_route_length_m/psp_pipe_supplier_segment_length_m)";
const JOINTS = `max(0,(${INSTALLED_SEGMENTS})-psp_construction_section_count)`;
const APPURTENANCES = "psp_isolation_valve_quantity_piece+psp_air_valve_quantity_piece+psp_washout_quantity_piece";
const CHAMBERS = `((${APPURTENANCES})*psp_chamber_per_appurtenance)`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc09:psp_pipeline_install_acceptance", section: "Работы", category: "construction_work", title: "Строительство и приёмка напорного канализационного трубопровода", unitId: "m", formulaId: "psp_pipeline_length_v2", expression: "psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["psp_installation_technology"] },
  { rowId: "rc09:psp_trench_width", section: "Расчётная геометрия", category: "service", title: "Расчётная ширина траншеи по дну", unitId: "m", formulaId: "psp_trench_width_v2", expression: WIDTH, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_trench_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка траншеи напорной канализации", unitId: "m3", formulaId: "psp_trench_excavation_v2", expression: TRENCH, procurement: true },
  { rowId: "rc09:psp-pipe-balance:installed-net", section: "Баланс трубы", category: "material", title: "Чистая длина укладываемой трубы", unitId: "m", formulaId: "psp_pipe_installed_net_v2", expression: "psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["psp_pipe_designation"] },
  { rowId: "rc09:psp-pipe-balance:loss", section: "Баланс трубы", category: "material", title: "Ожидаемые технологические потери трубы", unitId: "m", formulaId: "psp_pipe_loss_v2", expression: PIPE_LOSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:retained-spare", section: "Баланс трубы", category: "material", title: "Сохраняемый резерв трубы", unitId: "m", formulaId: "psp_pipe_retained_spare_v2", expression: "psp_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:stock", section: "Баланс трубы", category: "material", title: "Подтверждённый складской остаток трубы", unitId: "m", formulaId: "psp_pipe_stock_v2", expression: "psp_pipe_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:total-need", section: "Баланс трубы", category: "material", title: "Общая потребность в трубе", unitId: "m", formulaId: "psp_pipe_total_need_v2", expression: PIPE_TOTAL, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:net-need", section: "Баланс трубы", category: "material", title: "Чистая потребность трубы к заказу", unitId: "m", formulaId: "psp_pipe_net_need_v2", expression: PIPE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:segment-count", section: "Баланс трубы", category: "material", title: "Количество поставочных элементов трубы", unitId: "pcs", formulaId: "psp_pipe_segment_count_v2", expression: PIPE_SEGMENTS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_pipe", section: "Материалы", category: "material", title: "Труба напорной канализации к поставке", unitId: "m", formulaId: "psp_pipe_order_v2", expression: PIPE_ORDER, procurement: true, titleParameterIds: ["psp_pipe_designation"] },
  { rowId: "rc09:psp-pipe-balance:remainder", section: "Баланс трубы", category: "material", title: "Остаток трубы после монтажа и потерь", unitId: "m", formulaId: "psp_pipe_remainder_v2", expression: `psp_pipe_available_stock_m+(${PIPE_ORDER})-psp_route_length_m-(${PIPE_LOSS})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:surplus-beyond-spare", section: "Баланс трубы", category: "material", title: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "psp_pipe_surplus_v2", expression: `max(0,psp_pipe_available_stock_m+(${PIPE_ORDER})-(${PIPE_TOTAL}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_bedding_installed", section: "Расчётная геометрия", category: "material", title: "Основание трубы в проектном положении", unitId: "m3", formulaId: "psp_bedding_installed_v2", expression: BEDDING, costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["psp_bedding_designation"] },
  { rowId: "rc09:psp_bedding", section: "Материалы", category: "material", title: "Материал основания трубы к поставке", unitId: "m3", formulaId: "psp_bedding_order_v2", expression: `(${BEDDING})*psp_bedding_order_factor`, procurement: true, titleParameterIds: ["psp_bedding_designation"] },
  { rowId: "rc09:psp_surround_installed", section: "Расчётная геометрия", category: "material", title: "Защитная обсыпка без объёма трубы", unitId: "m3", formulaId: "psp_surround_installed_v2", expression: SURROUND, costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["psp_surround_designation"] },
  { rowId: "rc09:psp_surround", section: "Материалы", category: "material", title: "Материал защитной обсыпки к поставке", unitId: "m3", formulaId: "psp_surround_order_v2", expression: `(${SURROUND})*psp_surround_order_factor`, procurement: true, titleParameterIds: ["psp_surround_designation"] },
  { rowId: "rc09:psp_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка пригодным местным грунтом", unitId: "m3", formulaId: "psp_native_backfill_v2", expression: NATIVE_BACKFILL, procurement: true },
  { rowId: "rc09:psp_imported_backfill", section: "Материалы", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "psp_imported_backfill_v2", expression: `(${IMPORTED_BACKFILL})*psp_imported_backfill_order_factor`, procurement: true, titleParameterIds: ["psp_imported_backfill_designation"] },
  { rowId: "rc09:psp_excess_soil", section: "Земляные работы", category: "waste", title: "Излишний грунт к вывозу", unitId: "m3", formulaId: "psp_excess_soil_v2", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc09:psp_joint", section: "Монтаж трубы", category: "construction_work", title: "Соединения напорной трубы", unitId: "pcs", formulaId: "psp_joint_v2", expression: JOINTS, procurement: true, titleParameterIds: ["psp_joint_designation"] },
  { rowId: "rc09:psp_fitting", section: "Комплектующие", category: "material", title: "Фасонные части напорной канализации", unitId: "pcs", formulaId: "psp_fitting_v2", expression: "psp_fitting_quantity_piece", procurement: true, titleParameterIds: ["psp_fitting_designation"] },
  { rowId: "rc09:psp_isolation_valve", section: "Комплектующие", category: "material", title: "Запорная арматура напорной канализации", unitId: "pcs", formulaId: "psp_isolation_valve_v2", expression: "psp_isolation_valve_quantity_piece", procurement: true, titleParameterIds: ["psp_isolation_valve_designation"] },
  { rowId: "rc09:psp_air_valve", section: "Комплектующие", category: "material", title: "Воздушный клапан напорной канализации", unitId: "pcs", formulaId: "psp_air_valve_v2", expression: "psp_air_valve_quantity_piece", procurement: true, titleParameterIds: ["psp_air_valve_designation"] },
  { rowId: "rc09:psp_washout", section: "Комплектующие", category: "material", title: "Промывной узел напорной канализации", unitId: "pcs", formulaId: "psp_washout_v2", expression: "psp_washout_quantity_piece", procurement: true, titleParameterIds: ["psp_washout_designation"] },
  { rowId: "rc09:psp_chamber", section: "Сооружения", category: "material", title: "Камеры арматуры и узлов", unitId: "pcs", formulaId: "psp_chamber_v2", expression: CHAMBERS, procurement: true, titleParameterIds: ["psp_chamber_designation"] },
  { rowId: "rc09:psp_cover", section: "Комплектующие", category: "material", title: "Люки камер напорной канализации", unitId: "pcs", formulaId: "psp_cover_v2", expression: `(${CHAMBERS})*psp_cover_per_chamber`, procurement: true, titleParameterIds: ["psp_cover_designation"] },
  { rowId: "rc09:psp_warning_tape", section: "Материалы", category: "material", title: "Сигнальная лента напорной канализации", unitId: "m", formulaId: "psp_warning_tape_v2", expression: "psp_route_length_m*psp_warning_tape_length_factor", procurement: true, titleParameterIds: ["psp_warning_tape_designation"] },
  { rowId: "rc09:psp_pressure_test", section: "Контроль качества", category: "service", title: "Гидравлическое испытание напорной канализации", unitId: "m", formulaId: "psp_pressure_test_v2", expression: "psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_flushing", section: "Контроль качества", category: "service", title: "Промывка напорной канализации", unitId: "m", formulaId: "psp_flushing_v2", expression: "psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_asbuilt_documents", section: "Контроль качества", category: "service", title: "Исполнительная документация и журнал сварки", unitId: "document", formulaId: "psp_asbuilt_documents_v2", expression: "psp_construction_section_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:psp-survey", section: "Труд", category: "labor", title: "Геодезическое сопровождение и исполнительная съёмка", unitId: "man_hour", formulaId: "psp_survey_labor_v2", expression: "psp_route_length_m*psp_survey_labor_h_per_m", procurement: true },
  { rowId: "rc09:labor:psp-earthworks", section: "Труд", category: "labor", title: "Земляные работы и устройство засыпок", unitId: "man_hour", formulaId: "psp_earthworks_labor_v2", expression: `(${TRENCH})*psp_earthworks_labor_h_per_m3`, procurement: true },
  { rowId: "rc09:labor:psp-pipe-appurtenance-install", section: "Труд", category: "labor", title: "Монтаж трубы, фасонных частей, арматуры и камер", unitId: "man_hour", formulaId: "psp_pipe_appurtenance_install_labor_v2", expression: `psp_route_length_m*psp_pipe_install_labor_h_per_m+(${JOINTS})*psp_joint_labor_h_per_piece+psp_fitting_quantity_piece*psp_fitting_labor_h_per_piece+(${APPURTENANCES})*psp_appurtenance_labor_h_per_piece+(${CHAMBERS})*psp_chamber_labor_h_per_piece`, procurement: true },
  { rowId: "rc09:labor:psp-qa-documentation", section: "Труд", category: "labor", title: "Испытания, промывка и исполнительная документация", unitId: "man_hour", formulaId: "psp_qa_documentation_labor_v2", expression: "psp_route_length_m*psp_qa_labor_h_per_m+psp_construction_section_count*psp_documentation_labor_h_per_section", procurement: true },
  { rowId: "rc09:equipment:psp-excavator", section: "Механизмы", category: "equipment", title: "Работа экскаватора", unitId: "machine_hour", formulaId: "psp_excavator_machine_v2", expression: `(${TRENCH})/psp_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:psp-compactor", section: "Механизмы", category: "equipment", title: "Работа уплотняющего механизма", unitId: "machine_hour", formulaId: "psp_compactor_machine_v2", expression: `((${NATIVE_BACKFILL})+(${IMPORTED_BACKFILL}))/psp_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc09:equipment:psp-jointing", section: "Механизмы", category: "equipment", title: "Работа сварочного оборудования трубы", unitId: "machine_hour", formulaId: "psp_jointing_machine_v2", expression: `(${JOINTS})*psp_jointing_machine_h_per_piece`, procurement: true },
  { rowId: "rc09:equipment:psp-crane", section: "Механизмы", category: "equipment", title: "Работа крана при монтаже камер и арматуры", unitId: "machine_hour", formulaId: "psp_crane_machine_v2", expression: `(psp_fitting_quantity_piece+(${APPURTENANCES})+(${CHAMBERS}))*psp_crane_machine_h_per_piece`, procurement: true },
  { rowId: "rc09:equipment:psp-test-pump", section: "Механизмы", category: "equipment", title: "Работа опрессовочного насоса", unitId: "machine_hour", formulaId: "psp_test_pump_machine_v2", expression: "psp_route_length_m/100*psp_test_pump_machine_h_per_100m", procurement: true },
  { rowId: "rc09:logistics:psp-pipe-delivery", section: "Логистика", category: "service", title: "Доставка напорной трубы", unitId: "trip", formulaId: "psp_pipe_delivery_v2", expression: `ceil((${PIPE_ORDER})/psp_pipe_delivery_m_per_trip)`, procurement: true },
  { rowId: "rc09:logistics:psp-granular-delivery", section: "Логистика", category: "service", title: "Доставка основания, обсыпки и привозного грунта", unitId: "trip", formulaId: "psp_granular_delivery_v2", expression: `ceil(((${BEDDING})*psp_bedding_order_factor+(${SURROUND})*psp_surround_order_factor+(${IMPORTED_BACKFILL})*psp_imported_backfill_order_factor)/psp_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc09:logistics:psp-removal", section: "Логистика", category: "service", title: "Вывоз излишнего грунта", unitId: "trip", formulaId: "psp_removal_v2", expression: `ceil((${EXCESS_SOIL})/psp_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc09:psp_crossing_casing", section: "Условные работы", category: "material", title: "Футляр на пересечении", unitId: "m", formulaId: "psp_crossing_casing_v2", expression: "psp_crossing_casing_length_m", procurement: true, inclusion: { kind: "equals", parameterId: "psp_crossing_casing_mode", value: "REQUIRED" }, titleParameterIds: ["psp_crossing_casing_designation"] },
  { rowId: "rc09:psp_dewatering", section: "Условные работы", category: "equipment", title: "Работа оборудования водоотлива", unitId: "machine_hour", formulaId: "psp_dewatering_machine_v2", expression: "psp_dewatering_duration_h", procurement: true, inclusion: { kind: "equals", parameterId: "psp_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["psp_dewatering_designation"] },
  { rowId: "rc09:psp_dewatering_volume", section: "Условные работы", category: "service", title: "Откачанная вода", unitId: "m3", formulaId: "psp_dewatering_volume_v2", expression: "psp_dewatering_duration_h*psp_dewatering_flow_m3_h", procurement: true, inclusion: { kind: "equals", parameterId: "psp_dewatering_mode", value: "REQUIRED" } },
  { rowId: "rc09:psp_road_restoration", section: "Условные работы", category: "construction_work", title: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "psp_road_restoration_v2", expression: "psp_road_restoration_area_m2", procurement: true, inclusion: { kind: "equals", parameterId: "psp_road_restoration_mode", value: "REQUIRED" }, titleParameterIds: ["psp_road_restoration_designation"] },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.pressure-sewer-pipeline-r2",
  semanticOwner: "pressure-sewer-pipeline",
  sourceId: PRESSURE_SEWER_PIPELINE_SOURCE_ID,
  normId: PRESSURE_SEWER_PIPELINE_NORM_ID,
  sourceMetadata: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA,
  applicabilityRu: "Подземный напорный канализационный трубопровод открытой траншейной прокладки",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "hydraulic pipe diameter or pressure-class selection from route length",
    "automatic fitting, isolation-valve, air-valve or washout quantity from spacing",
    "automatic crossing casing, dewatering or road restoration without an enabled branch",
    "sewer pumping station, gravity collector or building drainage",
    "invented price",
  ],
});

export const PRESSURE_SEWER_PIPELINE_PARAMETERS = definition.parameters;
export const PRESSURE_SEWER_PIPELINE_FORMULAS = definition.formulas;
export const PRESSURE_SEWER_PIPELINE_RESOURCES = definition.resources;
export const PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT = definition.runtimeInput;
export const PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const PRESSURE_SEWER_PIPELINE_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const PRESSURE_SEWER_PIPELINE_KNOWN_SCOPE_PARAMETERS = Object.freeze(
  ordinary.map((parameter) => parameter.id),
);

export const PRESSURE_SEWER_PIPELINE_SHORT_INPUT = Object.freeze({
  psp_route_length_m: 800,
  psp_pipe_designation: "PE100-RC-SDR17-OD110-PN10",
  psp_pipe_outside_diameter_mm: 110,
  psp_average_trench_depth_m: 1.8,
  psp_fitting_quantity_piece: 24,
  psp_isolation_valve_quantity_piece: 6,
  psp_air_valve_quantity_piece: 4,
  psp_washout_quantity_piece: 3,
});

export const PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT = Object.freeze({
  ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
});

export async function compilePressureSewerPipelineR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PRESSURE_SEWER_PIPELINE_CATALOG_ID;
  if (catalogId !== PRESSURE_SEWER_PIPELINE_CATALOG_ID) {
    throw new Error(`PRESSURE_SEWER_PIPELINE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.pressure-sewer-pipeline-r2",
    catalogId,
    primaryMeasureParameterId: "psp_route_length_m",
    definition,
    submittedParameters,
  });
}
