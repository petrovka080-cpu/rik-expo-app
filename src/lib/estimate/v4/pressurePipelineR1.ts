import type { CanonicalEstimateCompileCoreResult } from
  "../backendPlatform/canonicalEstimateCompileCore";
import {
  buildAutomaticConstructionOwnerR1,
  compileAutomaticConstructionOwnerR1,
  type AutomaticParameterSpec,
  type AutomaticRowSpec,
} from "./automaticConstructionOwnerR1";

import { PRESSURE_PIPELINE_CATALOG_ID } from "./pressurePipelinePromptR1";
export { PRESSURE_PIPELINE_CATALOG_ID, parsePressurePipelineOrdinaryPromptR1 } from "./pressurePipelinePromptR1";
export const PRESSURE_PIPELINE_SOURCE_ID =
  "project_pressure_pipeline_hdpe_open_trench_automatic_v1";
export const PRESSURE_PIPELINE_NORM_ID =
  "norm:project:pressure_pipeline_hdpe_open_trench_automatic:v1";
export const PRESSURE_PIPELINE_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный профиль строительства напорного ПНД-трубопровода S27.26",
  source_authority: "Предварительный сценарий canonical compiler; геометрия вычисляется автоматически, а профильные нормы требуют подтверждения проектом и ППР",
  source_document_version: "VISIBLE_PRELIMINARY_HDPE_OPEN_TRENCH_PIPELINE_S27_26_REQUIRES_CONFIRMATION",
  definition_hash: "09a29bd5c7e1fed69a28fe99f915f5baac08b3c75c4129fde9b66006a5106286",
  exact_locator: "1000 м PE100-RC-SDR17-OD160-PN10, средняя глубина 1,6 м, два узла подключения и два строительных участка; земляные объёмы, материалы, труд, механизмы и закупка рассчитываются из семи первичных фактов и видимого профиля",
  use_restriction: "Не является утверждённым проектом или универсальной нормой. Арматура и камеры, опрессовка, промывка и дезинфекция, переходы и восстановление покрытий относятся к отдельным владельцам.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "09a29bd5c7e1fed69a28fe99f915f5baac08b3c75c4129fde9b66006a5106286",
});

const ordinary: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "ppl_route_length_m", title: "Длина трассы напорного трубопровода", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "ppl_pipe_designation", title: "Обозначение выбранной трубы", valueType: "text", unitId: null, kind: "ordinary", resourceBranchConsumers: ["rc13:ppl_pipe_installed", "rc13:ppl_pipe_order"] },
  { id: "ppl_pipe_outside_diameter_mm", title: "Наружный диаметр трубы", valueType: "decimal", unitId: "mm", kind: "ordinary", min: 0.000_001 },
  { id: "ppl_average_trench_depth_m", title: "Средняя проектная глубина траншеи", valueType: "decimal", unitId: "m", kind: "ordinary", min: 0.000_001 },
  { id: "ppl_connection_node_count", title: "Количество проектных узлов подключения", valueType: "integer", unitId: "piece", kind: "ordinary", min: 0 },
  { id: "ppl_construction_section_count", title: "Количество самостоятельных строительных участков", valueType: "integer", unitId: "piece", kind: "ordinary", min: 1 },
  { id: "ppl_installation_technology", title: "Подтверждённая технология прокладки", valueType: "enum", unitId: null, kind: "ordinary", values: ["HDPE_BUTT_FUSION_OPEN_TRENCH"], resourceBranchConsumers: ["rc13:ppl_acceptance"] },
]);

const profile: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "ppl_side_clearance_m", title: "Рабочий зазор от трубы до стенки траншеи", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.25, min: 0 },
  { id: "ppl_bedding_thickness_m", title: "Толщина основания под трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.1, min: 0 },
  { id: "ppl_surround_cover_above_pipe_m", title: "Высота защитной обсыпки над трубой", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0.3, min: 0 },
  { id: "ppl_pipe_expected_loss_fraction", title: "Доля технологических потерь трубы", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.02, min: 0 },
  { id: "ppl_pipe_retained_spare_m", title: "Сохраняемый резерв трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 12, min: 0 },
  { id: "ppl_pipe_available_stock_m", title: "Подтверждённый складской остаток трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 0, min: 0 },
  { id: "ppl_pipe_supplier_segment_length_m", title: "Поставочная длина одного элемента трубы", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 12, min: 0.000_001 },
  { id: "ppl_excavated_soil_reuse_fraction", title: "Доля пригодного грунта для обратной засыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 0.8, min: 0, max: 1 },
  { id: "ppl_bedding_order_factor", title: "Коэффициент заказа материала основания", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "ppl_surround_order_factor", title: "Коэффициент заказа защитной обсыпки", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.15, min: 1 },
  { id: "ppl_imported_backfill_order_factor", title: "Коэффициент заказа привозного грунта", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.1, min: 1 },
  { id: "ppl_warning_tape_length_factor", title: "Коэффициент длины сигнальной ленты", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.05, min: 0 },
  { id: "ppl_detectable_wire_length_factor", title: "Коэффициент длины трассировочного провода", valueType: "decimal", unitId: "ratio", kind: "profile", defaultValue: 1.05, min: 0 },
  { id: "ppl_marker_spacing_m", title: "Шаг установки опознавательных столбиков", valueType: "decimal", unitId: "m", kind: "profile", defaultValue: 100, min: 0.000_001 },
  { id: "ppl_fusion_consumable_set_per_joint", title: "Комплектов очистки на сварной стык", valueType: "decimal", unitId: "set_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "ppl_connection_kit_per_node", title: "Комплектов подключения на проектный узел", valueType: "decimal", unitId: "set_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "ppl_temporary_end_cap_per_section", title: "Временных заглушек на строительный участок", valueType: "decimal", unitId: "pcs_per_system", kind: "profile", defaultValue: 2, min: 0 },
  { id: "ppl_route_marking_set_per_100m", title: "Комплектов разметки на 100 м", valueType: "decimal", unitId: "set_per_100m", kind: "profile", defaultValue: 1, min: 0 },
  { id: "ppl_safety_set_per_section", title: "Комплектов ограждения на участок", valueType: "decimal", unitId: "set_per_system", kind: "profile", defaultValue: 1, min: 0 },
  { id: "ppl_compaction_water_m3_per_backfill_m3", title: "Вода для увлажнения на объём засыпки", valueType: "decimal", unitId: "m3_per_m3", kind: "profile", defaultValue: 0.03, min: 0 },
  { id: "ppl_survey_labor_h_per_m", title: "Труд геодезии на метр трассы", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.03, min: 0 },
  { id: "ppl_excavation_labor_h_per_m3", title: "Труд земляных работ на кубометр", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.08, min: 0 },
  { id: "ppl_bedding_labor_h_per_m3", title: "Труд устройства основания и обсыпки", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.12, min: 0 },
  { id: "ppl_fusion_labor_h_per_joint", title: "Труд стыковой сварки одного соединения", valueType: "decimal", unitId: "man_hour_per_piece", kind: "profile", defaultValue: 1.5, min: 0 },
  { id: "ppl_laying_labor_h_per_m", title: "Труд укладки трубы на метр", valueType: "decimal", unitId: "man_hour_per_m", kind: "profile", defaultValue: 0.2, min: 0 },
  { id: "ppl_backfill_labor_h_per_m3", title: "Труд засыпки и уплотнения на кубометр", valueType: "decimal", unitId: "man_hour_per_m3", kind: "profile", defaultValue: 0.05, min: 0 },
  { id: "ppl_qa_labor_h_per_section", title: "Труд контроля и оформления на участок", valueType: "decimal", unitId: "man_hour_per_system", kind: "profile", defaultValue: 4, min: 0 },
  { id: "ppl_excavator_productivity_m3_h", title: "Производительность экскаватора", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 40, min: 0.000_001 },
  { id: "ppl_loader_productivity_m3_h", title: "Производительность погрузчика", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 35, min: 0.000_001 },
  { id: "ppl_compactor_productivity_m3_h", title: "Производительность уплотняющего механизма", valueType: "decimal", unitId: "m3_per_hour", kind: "profile", defaultValue: 25, min: 0.000_001 },
  { id: "ppl_fusion_machine_h_per_joint", title: "Машино-часы сварочной установки на стык", valueType: "decimal", unitId: "machine_hour_per_piece", kind: "profile", defaultValue: 1, min: 0 },
  { id: "ppl_pipe_handling_machine_h_per_100m", title: "Машино-часы манипулятора на 100 м трубы", valueType: "decimal", unitId: "machine_hour_per_100m", kind: "profile", defaultValue: 0.5, min: 0 },
  { id: "ppl_soil_truck_capacity_m3", title: "Вместимость самосвала", valueType: "decimal", unitId: "m3_per_trip", kind: "profile", defaultValue: 10, min: 0.000_001 },
  { id: "ppl_pipe_delivery_m_per_trip", title: "Длина трубы на один рейс", valueType: "decimal", unitId: "m_per_trip", kind: "profile", defaultValue: 120, min: 0.000_001 },
  { id: "ppl_shoring_mode", title: "Крепление стенок траншеи требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "ppl_shoring_labor_h_per_m2", title: "Труд монтажа крепления на квадратный метр", valueType: "decimal", unitId: "man_hour_per_m2", kind: "profile", defaultValue: 0.15, min: 0 },
  { id: "ppl_dewatering_mode", title: "Водоотлив требуется", valueType: "enum", unitId: null, kind: "profile", defaultValue: "NOT_REQUIRED", values: ["NOT_REQUIRED", "REQUIRED"] },
  { id: "ppl_dewatering_labor_h_per_pump_h", title: "Труд обслуживания водоотлива на машино-час", valueType: "decimal", unitId: "man_hour_per_machine_hour", kind: "profile", defaultValue: 0.5, min: 0 },
]);

const conditional: readonly AutomaticParameterSpec[] = Object.freeze([
  { id: "ppl_shoring_designation", title: "Система инвентарного крепления траншеи", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "ppl_shoring_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc13:ppl_shoring"] },
  { id: "ppl_shored_length_m", title: "Длина участков с креплением стенок", valueType: "decimal", unitId: "m", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "ppl_shoring_mode", value: "REQUIRED" } },
  { id: "ppl_dewatering_pump_designation", title: "Насос водоотлива", valueType: "text", unitId: null, kind: "conditional", requiredWhen: { parameterId: "ppl_dewatering_mode", value: "REQUIRED" }, resourceBranchConsumers: ["rc13:ppl_dewatering_pump"] },
  { id: "ppl_dewatering_duration_h", title: "Продолжительность работы водоотлива", valueType: "decimal", unitId: "hour", kind: "conditional", min: 0.000_001, requiredWhen: { parameterId: "ppl_dewatering_mode", value: "REQUIRED" } },
  { id: "ppl_dewatering_flow_m3_h", title: "Фактическая подача водоотлива", valueType: "decimal", unitId: "m3_per_hour", kind: "conditional", min: 0, requiredWhen: { parameterId: "ppl_dewatering_mode", value: "REQUIRED" } },
]);

const PIPE_D = "ppl_pipe_outside_diameter_mm/1000";
const WIDTH = `((${PIPE_D})+2*ppl_side_clearance_m)`;
const TRENCH = `ppl_route_length_m*(${WIDTH})*ppl_average_trench_depth_m`;
const BEDDING = `ppl_route_length_m*(${WIDTH})*ppl_bedding_thickness_m`;
const PIPE_VOLUME = `ppl_route_length_m*0.7853981634*(${PIPE_D})*(${PIPE_D})`;
const SURROUND_GROSS = `ppl_route_length_m*(${WIDTH})*((${PIPE_D})+ppl_surround_cover_above_pipe_m)`;
const SURROUND = `max(0,(${SURROUND_GROSS})-(${PIPE_VOLUME}))`;
const BACKFILL_ZONE = `max(0,(${TRENCH})-(${BEDDING})-(${SURROUND_GROSS}))`;
const NATIVE_BACKFILL = `min((${BACKFILL_ZONE}),(${TRENCH})*ppl_excavated_soil_reuse_fraction)`;
const IMPORTED_BACKFILL = `max(0,(${BACKFILL_ZONE})-(${NATIVE_BACKFILL}))`;
const EXCESS_SOIL = `max(0,(${TRENCH})-(${NATIVE_BACKFILL}))`;
const PIPE_LOSS = "ppl_route_length_m*ppl_pipe_expected_loss_fraction";
const PIPE_TOTAL = `(ppl_route_length_m+(${PIPE_LOSS})+ppl_pipe_retained_spare_m)`;
const PIPE_NET = `max(0,(${PIPE_TOTAL})-ppl_pipe_available_stock_m)`;
const PIPE_SEGMENTS = `ceil((${PIPE_NET})/ppl_pipe_supplier_segment_length_m)`;
const PIPE_ORDER = `((${PIPE_SEGMENTS})*ppl_pipe_supplier_segment_length_m)`;
const INSTALLED_SEGMENTS = "ceil(ppl_route_length_m/ppl_pipe_supplier_segment_length_m)";
const JOINTS = `max(0,(${INSTALLED_SEGMENTS})-ppl_construction_section_count)`;

const rows: readonly AutomaticRowSpec[] = Object.freeze([
  { rowId: "rc13:ppl_acceptance", section: "Работы", category: "construction_work", title: "Строительство напорного ПНД-трубопровода открытым способом", unitId: "m", formulaId: "ppl_acceptance_v1", expression: "ppl_route_length_m", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["ppl_installation_technology"] },
  { rowId: "rc13:ppl_trench_width", section: "Расчётная геометрия", category: "service", title: "Расчётная ширина траншеи по дну", unitId: "m", formulaId: "ppl_trench_width_v1", expression: WIDTH, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_excavation", section: "Земляные работы", category: "construction_work", title: "Разработка траншеи", unitId: "m3", formulaId: "ppl_excavation_v1", expression: TRENCH, procurement: true },
  { rowId: "rc13:ppl_pipe_installed", section: "Баланс трубы", category: "material", title: "Труба в проектное положение", unitId: "m", formulaId: "ppl_pipe_installed_v1", expression: "ppl_route_length_m", costTreatment: "INFORMATIONAL_SCOPE", titleParameterIds: ["ppl_pipe_designation"] },
  { rowId: "rc13:ppl_pipe_loss", section: "Баланс трубы", category: "material", title: "Ожидаемые технологические потери трубы", unitId: "m", formulaId: "ppl_pipe_loss_v1", expression: PIPE_LOSS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_retained_spare", section: "Баланс трубы", category: "material", title: "Сохраняемый резерв трубы", unitId: "m", formulaId: "ppl_pipe_retained_spare_v1", expression: "ppl_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_stock", section: "Баланс трубы", category: "material", title: "Подтверждённый складской остаток трубы", unitId: "m", formulaId: "ppl_pipe_stock_v1", expression: "ppl_pipe_available_stock_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_total_need", section: "Баланс трубы", category: "material", title: "Общая потребность в трубе", unitId: "m", formulaId: "ppl_pipe_total_need_v1", expression: PIPE_TOTAL, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_net_need", section: "Баланс трубы", category: "material", title: "Чистая потребность трубы к заказу", unitId: "m", formulaId: "ppl_pipe_net_need_v1", expression: PIPE_NET, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_segment_count", section: "Баланс трубы", category: "material", title: "Количество поставочных элементов трубы", unitId: "piece", formulaId: "ppl_pipe_segment_count_v1", expression: PIPE_SEGMENTS, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_order", section: "Материалы", category: "material", title: "Труба к поставке", unitId: "m", formulaId: "ppl_pipe_order_v1", expression: PIPE_ORDER, procurement: true, titleParameterIds: ["ppl_pipe_designation"] },
  { rowId: "rc13:ppl_pipe_remainder", section: "Баланс трубы", category: "material", title: "Остаток трубы после монтажа и потерь", unitId: "m", formulaId: "ppl_pipe_remainder_v1", expression: `ppl_pipe_available_stock_m+(${PIPE_ORDER})-ppl_route_length_m-(${PIPE_LOSS})`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_pipe_surplus", section: "Баланс трубы", category: "material", title: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "ppl_pipe_surplus_v1", expression: `max(0,ppl_pipe_available_stock_m+(${PIPE_ORDER})-(${PIPE_TOTAL}))`, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_bedding_installed", section: "Расчётная геометрия", category: "material", title: "Материал основания в проектном положении", unitId: "m3", formulaId: "ppl_bedding_installed_v1", expression: BEDDING, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_bedding_order", section: "Материалы", category: "material", title: "Материал основания к поставке", unitId: "m3", formulaId: "ppl_bedding_order_v1", expression: `(${BEDDING})*ppl_bedding_order_factor`, procurement: true },
  { rowId: "rc13:ppl_surround_installed", section: "Расчётная геометрия", category: "material", title: "Защитная обсыпка без объёма трубы", unitId: "m3", formulaId: "ppl_surround_installed_v1", expression: SURROUND, costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc13:ppl_surround_order", section: "Материалы", category: "material", title: "Материал защитной обсыпки к поставке", unitId: "m3", formulaId: "ppl_surround_order_v1", expression: `(${SURROUND})*ppl_surround_order_factor`, procurement: true },
  { rowId: "rc13:ppl_native_backfill", section: "Земляные работы", category: "construction_work", title: "Обратная засыпка пригодным местным грунтом", unitId: "m3", formulaId: "ppl_native_backfill_v1", expression: NATIVE_BACKFILL, procurement: true },
  { rowId: "rc13:ppl_imported_backfill", section: "Материалы", category: "material", title: "Привозной материал обратной засыпки", unitId: "m3", formulaId: "ppl_imported_backfill_v1", expression: `(${IMPORTED_BACKFILL})*ppl_imported_backfill_order_factor`, procurement: true },
  { rowId: "rc13:ppl_excess_soil", section: "Земляные работы", category: "waste", title: "Излишний грунт к вывозу", unitId: "m3", formulaId: "ppl_excess_soil_v1", expression: EXCESS_SOIL, procurement: true },
  { rowId: "rc13:ppl_warning_tape", section: "Материалы", category: "material", title: "Сигнальная лента водопровода", unitId: "m", formulaId: "ppl_warning_tape_v1", expression: "ppl_route_length_m*ppl_warning_tape_length_factor", procurement: true },
  { rowId: "rc13:ppl_detectable_wire", section: "Материалы", category: "material", title: "Трассировочный провод с выводами", unitId: "m", formulaId: "ppl_detectable_wire_v1", expression: "ppl_route_length_m*ppl_detectable_wire_length_factor", procurement: true },
  { rowId: "rc13:ppl_markers", section: "Материалы", category: "material", title: "Опознавательные столбики трассы", unitId: "piece", formulaId: "ppl_markers_v1", expression: "ceil(ppl_route_length_m/ppl_marker_spacing_m)+1", procurement: true },
  { rowId: "rc13:ppl_fusion_joints", section: "Монтаж трубы", category: "construction_work", title: "Стыковая сварка ПНД-трубы", unitId: "piece", formulaId: "ppl_fusion_joints_v1", expression: JOINTS, procurement: true },
  { rowId: "rc13:ppl_fusion_consumables", section: "Расходные материалы", category: "material", title: "Очистка и подготовка сварных стыков", unitId: "set", formulaId: "ppl_fusion_consumables_v1", expression: `(${JOINTS})*ppl_fusion_consumable_set_per_joint`, procurement: true },
  { rowId: "rc13:ppl_connection_kits", section: "Комплектующие", category: "material", title: "Комплекты проектных подключений", unitId: "set", formulaId: "ppl_connection_kits_v1", expression: "ppl_connection_node_count*ppl_connection_kit_per_node", procurement: true },
  { rowId: "rc13:ppl_end_caps", section: "Комплектующие", category: "material", title: "Временные защитные заглушки участков", unitId: "piece", formulaId: "ppl_end_caps_v1", expression: "ppl_construction_section_count*ppl_temporary_end_cap_per_section", procurement: true },
  { rowId: "rc13:ppl_route_marking", section: "Подготовка трассы", category: "material", title: "Разметочные материалы и вехи", unitId: "set", formulaId: "ppl_route_marking_v1", expression: "ceil(ppl_route_length_m/100)*ppl_route_marking_set_per_100m", procurement: true },
  { rowId: "rc13:ppl_safety", section: "Подготовка трассы", category: "equipment", title: "Ограждение, знаки и безопасные переходы", unitId: "set", formulaId: "ppl_safety_v1", expression: "ppl_construction_section_count*ppl_safety_set_per_section", procurement: true },
  { rowId: "rc13:ppl_compaction_water", section: "Расходные материалы", category: "material", title: "Вода для увлажнения при уплотнении", unitId: "m3", formulaId: "ppl_compaction_water_v1", expression: `((${NATIVE_BACKFILL})+(${IMPORTED_BACKFILL}))*ppl_compaction_water_m3_per_backfill_m3`, procurement: true },
  { rowId: "rc13:labor:ppl-survey", section: "Труд", category: "labor", title: "Разбивка трассы и исполнительная съёмка", unitId: "man_hour", formulaId: "ppl_survey_labor_v1", expression: "ppl_route_length_m*ppl_survey_labor_h_per_m", procurement: true },
  { rowId: "rc13:labor:ppl-excavation", section: "Труд", category: "labor", title: "Сопровождение разработки траншеи", unitId: "man_hour", formulaId: "ppl_excavation_labor_v1", expression: `(${TRENCH})*ppl_excavation_labor_h_per_m3`, procurement: true },
  { rowId: "rc13:labor:ppl-bedding", section: "Труд", category: "labor", title: "Устройство основания и защитной обсыпки", unitId: "man_hour", formulaId: "ppl_bedding_labor_v1", expression: `((${BEDDING})+(${SURROUND}))*ppl_bedding_labor_h_per_m3`, procurement: true },
  { rowId: "rc13:labor:ppl-fusion", section: "Труд", category: "labor", title: "Подготовка и сварка стыков", unitId: "man_hour", formulaId: "ppl_fusion_labor_v1", expression: `(${JOINTS})*ppl_fusion_labor_h_per_joint`, procurement: true },
  { rowId: "rc13:labor:ppl-laying", section: "Труд", category: "labor", title: "Укладка трубы и монтаж узлов подключения", unitId: "man_hour", formulaId: "ppl_laying_labor_v1", expression: "ppl_route_length_m*ppl_laying_labor_h_per_m", procurement: true },
  { rowId: "rc13:labor:ppl-backfill", section: "Труд", category: "labor", title: "Послойная засыпка и уплотнение", unitId: "man_hour", formulaId: "ppl_backfill_labor_v1", expression: `((${NATIVE_BACKFILL})+(${IMPORTED_BACKFILL}))*ppl_backfill_labor_h_per_m3`, procurement: true },
  { rowId: "rc13:labor:ppl-qa", section: "Труд", category: "labor", title: "Входной контроль, акты и исполнительная документация", unitId: "man_hour", formulaId: "ppl_qa_labor_v1", expression: "ppl_construction_section_count*ppl_qa_labor_h_per_section", procurement: true },
  { rowId: "rc13:equipment:ppl-excavator", section: "Механизмы", category: "equipment", title: "Работа экскаватора", unitId: "machine_hour", formulaId: "ppl_excavator_machine_v1", expression: `(${TRENCH})/ppl_excavator_productivity_m3_h`, procurement: true },
  { rowId: "rc13:equipment:ppl-loader", section: "Механизмы", category: "equipment", title: "Работа погрузчика с грунтом и заполнителями", unitId: "machine_hour", formulaId: "ppl_loader_machine_v1", expression: `((${EXCESS_SOIL})+(${BEDDING})+(${SURROUND}))/ppl_loader_productivity_m3_h`, procurement: true },
  { rowId: "rc13:equipment:ppl-compactor", section: "Механизмы", category: "equipment", title: "Послойное уплотнение засыпки", unitId: "machine_hour", formulaId: "ppl_compactor_machine_v1", expression: `((${NATIVE_BACKFILL})+(${IMPORTED_BACKFILL}))/ppl_compactor_productivity_m3_h`, procurement: true },
  { rowId: "rc13:equipment:ppl-fusion", section: "Механизмы", category: "equipment", title: "Работа установки стыковой сварки", unitId: "machine_hour", formulaId: "ppl_fusion_machine_v1", expression: `(${JOINTS})*ppl_fusion_machine_h_per_joint`, procurement: true },
  { rowId: "rc13:equipment:ppl-handling", section: "Механизмы", category: "equipment", title: "Разгрузка и укладка трубы манипулятором", unitId: "machine_hour", formulaId: "ppl_handling_machine_v1", expression: "ppl_route_length_m/100*ppl_pipe_handling_machine_h_per_100m", procurement: true },
  { rowId: "rc13:logistics:ppl-soil-removal", section: "Логистика", category: "service", title: "Вывоз излишнего грунта", unitId: "trip", formulaId: "ppl_soil_removal_trip_v1", expression: `ceil((${EXCESS_SOIL})/ppl_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc13:logistics:ppl-pipe-delivery", section: "Логистика", category: "service", title: "Доставка трубы", unitId: "trip", formulaId: "ppl_pipe_delivery_trip_v1", expression: `ceil((${PIPE_ORDER})/ppl_pipe_delivery_m_per_trip)`, procurement: true },
  { rowId: "rc13:logistics:ppl-granular-delivery", section: "Логистика", category: "service", title: "Доставка основания, обсыпки и привозного грунта", unitId: "trip", formulaId: "ppl_granular_delivery_trip_v1", expression: `ceil(((${BEDDING})*ppl_bedding_order_factor+(${SURROUND})*ppl_surround_order_factor+(${IMPORTED_BACKFILL})*ppl_imported_backfill_order_factor)/ppl_soil_truck_capacity_m3)`, procurement: true },
  { rowId: "rc13:ppl_hidden_works", section: "Контроль качества", category: "service", title: "Акты скрытых работ по строительным участкам", unitId: "set", formulaId: "ppl_hidden_works_v1", expression: "ppl_construction_section_count", procurement: true },
  { rowId: "rc13:ppl_asbuilt", section: "Контроль качества", category: "service", title: "Исполнительная схема и журнал сварки", unitId: "set", formulaId: "ppl_asbuilt_v1", expression: "ppl_construction_section_count", procurement: true },
  { rowId: "rc13:ppl_material_control", section: "Контроль качества", category: "service", title: "Входной контроль трубы и материалов", unitId: "set", formulaId: "ppl_material_control_v1", expression: "ppl_construction_section_count", procurement: true },
  { rowId: "rc13:ppl_shoring", section: "Условные работы", category: "equipment", title: "Инвентарное крепление стенок траншеи", unitId: "m2", formulaId: "ppl_shoring_v1", expression: "ppl_shored_length_m*ppl_average_trench_depth_m*2", procurement: true, inclusion: { kind: "equals", parameterId: "ppl_shoring_mode", value: "REQUIRED" }, titleParameterIds: ["ppl_shoring_designation"] },
  { rowId: "rc13:labor:ppl-shoring", section: "Условные работы", category: "labor", title: "Монтаж и перестановка крепления траншеи", unitId: "man_hour", formulaId: "ppl_shoring_labor_v1", expression: "ppl_shored_length_m*ppl_average_trench_depth_m*2*ppl_shoring_labor_h_per_m2", procurement: true, inclusion: { kind: "equals", parameterId: "ppl_shoring_mode", value: "REQUIRED" } },
  { rowId: "rc13:ppl_dewatering_pump", section: "Условные работы", category: "equipment", title: "Работа насоса водоотлива", unitId: "machine_hour", formulaId: "ppl_dewatering_pump_v1", expression: "ppl_dewatering_duration_h", procurement: true, inclusion: { kind: "equals", parameterId: "ppl_dewatering_mode", value: "REQUIRED" }, titleParameterIds: ["ppl_dewatering_pump_designation"] },
  { rowId: "rc13:ppl_dewatering_volume", section: "Условные работы", category: "service", title: "Откачанная вода", unitId: "m3", formulaId: "ppl_dewatering_volume_v1", expression: "ppl_dewatering_duration_h*ppl_dewatering_flow_m3_h", procurement: true, inclusion: { kind: "equals", parameterId: "ppl_dewatering_mode", value: "REQUIRED" } },
  { rowId: "rc13:labor:ppl-dewatering", section: "Условные работы", category: "labor", title: "Обслуживание водоотлива", unitId: "man_hour", formulaId: "ppl_dewatering_labor_v1", expression: "ppl_dewatering_duration_h*ppl_dewatering_labor_h_per_pump_h", procurement: true, inclusion: { kind: "equals", parameterId: "ppl_dewatering_mode", value: "REQUIRED" } },
]);

const definition = buildAutomaticConstructionOwnerR1({
  contract: "rik-expo-app.pressure-pipeline-r1",
  semanticOwner: "pressure-pipeline",
  sourceId: PRESSURE_PIPELINE_SOURCE_ID,
  normId: PRESSURE_PIPELINE_NORM_ID,
  sourceMetadata: PRESSURE_PIPELINE_SOURCE_METADATA,
  applicabilityRu: "Подземный напорный ПНД-трубопровод открытой траншейной прокладки на непокрытой трассе",
  ordinary,
  profile,
  conditional,
  rows,
  excludedUnownedAssumptions: [
    "automatic valve, hydrant or chamber quantities",
    "pressure testing, flushing, disinfection or laboratory acceptance",
    "automatic road crossing, pavement restoration, rock excavation or trenchless installation",
    "invented price",
  ],
});

export const PRESSURE_PIPELINE_PARAMETERS = definition.parameters;
export const PRESSURE_PIPELINE_FORMULAS = definition.formulas;
export const PRESSURE_PIPELINE_RESOURCES = definition.resources;
export const PRESSURE_PIPELINE_RUNTIME_INPUT = definition.runtimeInput;
export const PRESSURE_PIPELINE_RUNTIME_CLASSIFICATION = definition.runtimeClassification;
export const PRESSURE_PIPELINE_RUNTIME_SOURCE_IDS = definition.runtimeSourceIds;
export const PRESSURE_PIPELINE_KNOWN_SCOPE_PARAMETERS = Object.freeze(
  ordinary.map((parameter) => parameter.id),
);

export const PRESSURE_PIPELINE_SHORT_INPUT = Object.freeze({
  ppl_route_length_m: 1000,
  ppl_pipe_designation: "PE100-RC-SDR17-OD160-PN10",
  ppl_pipe_outside_diameter_mm: 160,
  ppl_average_trench_depth_m: 1.6,
  ppl_connection_node_count: 2,
  ppl_construction_section_count: 2,
  ppl_installation_technology: "HDPE_BUTT_FUSION_OPEN_TRENCH",
});

export const PRESSURE_PIPELINE_ACCEPTANCE_INPUT = Object.freeze({
  ...PRESSURE_PIPELINE_SHORT_INPUT,
  ...PRESSURE_PIPELINE_RUNTIME_INPUT,
});

export async function compilePressurePipelineR1(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileAutomaticConstructionOwnerR1({
    compilerVersion: "canonical-estimate-compiler.pressure-pipeline-r1",
    catalogId: PRESSURE_PIPELINE_CATALOG_ID,
    primaryMeasureParameterId: "ppl_route_length_m",
    definition,
    submittedParameters,
  });
}
