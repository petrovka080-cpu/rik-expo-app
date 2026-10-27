import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  SETTLEMENT_WATER_NETWORK_FORMULAS,
  SETTLEMENT_WATER_NETWORK_PARAMETERS,
  SETTLEMENT_WATER_NETWORK_RESOURCES,
} from "./settlementWaterNetworkR1";

type Json = Record<string, unknown>;

export const DISTRIBUTION_PIPELINE_CATALOG_ID =
  "canonical-work:expanded:distribution_pipeline";
export const DISTRIBUTION_PIPELINE_SOURCE_ID =
  "project_potable_water_distribution_main_geometric_automatic_balance_v2";
export const DISTRIBUTION_PIPELINE_NORM_ID =
  "norm:project:potable_water_distribution_main_geometric_automatic_balance:v2";

export const DISTRIBUTION_PIPELINE_SOURCE_METADATA = Object.freeze({
  source_title: "Видимый предварительный инженерный профиль распределительной магистрали питьевой воды S27.25",
  source_authority: "Предварительный сценарий canonical compiler; все числовые нормы и проектные решения требуют замены или подтверждения проектной организацией, инженерной геологией, изготовителями и лабораторией",
  source_document_version: "VISIBLE_PRELIMINARY_DISTRIBUTION_MAIN_GEOMETRY_TO_RESOURCES_CONTRACT_S27_25_REQUIRES_PROJECT_CONFIRMATION",
  definition_hash: "7c039a6cbb60a6a351d33b596ac03e997dbf7dd190a7763b5327afc3f4bbdb44",
  exact_locator: "Прозрачный сценарий DPM-HDPE-PE100-RC-SDR17-OD225-PN10: 1800 м; первичные сечение траншеи, слои, топология, способ поставки и удельные нормы отделены от автоматически вычисляемых объёмов, труда, машин и закупки",
  use_restriction: "Сценарные числовые значения не являются утверждённым original или универсальной нормой. Геометрические формулы и преобразования единиц выполняются автоматически; сечение, топология, технология, удельные нормы, упаковка и условные ветви требуют подтверждённого проекта или явно выбранного предварительного профиля. Поселковая сеть целиком, вводы в здания, внутренний водопровод, канализация и ливневая сеть исключены.",
  source_kind: "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
  artifact_sha256: "7c039a6cbb60a6a351d33b596ac03e997dbf7dd190a7763b5327afc3f4bbdb44",
});

const KNOWN_SCOPE = [
  "dpm_main_count", "dpm_route_length_m", "dpm_pipe_material", "dpm_pipe_grade",
  "dpm_sdr_class", "dpm_pipe_outside_diameter_mm", "dpm_pressure_class",
  "dpm_pipe_designation",
] as const;
const COMPUTED_OUTPUT_PARAMETER_IDS = new Set([
  "dpm_trench_excavation_volume_m3",
  "dpm_bedding_volume_m3",
  "dpm_surround_volume_m3",
  "dpm_backfill_volume_m3",
  "dpm_excess_soil_volume_m3",
  "dpm_joint_quantity_piece",
  "dpm_cover_quantity_piece",
  "dpm_warning_tape_length_m",
  "dpm_flushing_water_volume_m3",
  "dpm_pressure_test_length_m",
  "dpm_disinfection_length_m",
  "dpm_asbuilt_document_count",
  "dpm_survey_labor_h",
  "dpm_earthworks_labor_h",
  "dpm_pipe_appurtenance_install_labor_h",
  "dpm_qa_documentation_labor_h",
  "dpm_excavator_machine_h",
  "dpm_compactor_machine_h",
  "dpm_jointing_machine_h",
  "dpm_crane_machine_h",
  "dpm_removal_trip_count",
  "dpm_thrust_block_concrete_volume_m3",
  "dpm_disinfection_reagent_mass_kg",
  "dpm_hydrotest_pump_machine_h",
]);

function rewriteString(value: string): string {
  return value
    .replaceAll("settlement_water_network", "distribution_pipeline")
    .replaceAll("settlement-water-network", "distribution-pipeline")
    .replaceAll("swn_network_count", "dpm_main_count")
    .replaceAll("swn_", "dpm_")
    .replaceAll("swn-", "dpm-")
    .replaceAll("поселковых водопроводных сетей", "распределительных магистралей питьевой воды")
    .replaceAll("поселковой водопроводной сети", "распределительной магистрали питьевой воды")
    .replaceAll("поселковой водопроводной сетью", "распределительной магистралью питьевой воды")
    .replaceAll("поселковой водопроводной сеть", "распределительную магистраль питьевой воды")
    .replaceAll("водопроводной сети", "распределительной магистрали")
    .replaceAll("водопроводная сеть", "распределительная магистраль");
}

function rewriteValue(value: unknown): unknown {
  if (typeof value === "string") return rewriteString(value);
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(
      ([key, item]) => [rewriteString(key), rewriteValue(item)],
    ));
  }
  return value;
}

function sourceTrace(sourceRole: string): Json {
  return {
    sourceId: DISTRIBUTION_PIPELINE_SOURCE_ID,
    source_id: DISTRIBUTION_PIPELINE_SOURCE_ID,
    normId: DISTRIBUTION_PIPELINE_NORM_ID,
    norm_id: DISTRIBUTION_PIPELINE_NORM_ID,
    normVersion: DISTRIBUTION_PIPELINE_SOURCE_METADATA.source_document_version,
    source_title: DISTRIBUTION_PIPELINE_SOURCE_METADATA.source_title,
    exact_locator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
    source_definition_hash: DISTRIBUTION_PIPELINE_SOURCE_METADATA.definition_hash,
    sourceRole,
  };
}

function resourceSourceMetadata(
  sourceRole = "VISIBLE_PRELIMINARY_ENGINEERING_PROFILE_REQUIRES_PROJECT_CONFIRMATION",
): Json {
  return {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole,
    normativeTrace: [sourceTrace(sourceRole)],
    excludedUnownedAssumptions: [
      "generic length-derived trench, bedding, appurtenance, labor or mechanism coefficient",
      "automatic fitting, valve, hydrant or chamber spacing",
      "automatic crossing casing, dewatering or road-restoration selection",
      "automatic retained spare or supplier segment length",
      "complete village or settlement network, house connection, internal plumbing, sewer or stormwater network",
      "invented price",
    ],
  };
}

export type DistributionPipelineParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

function rewriteBaseParameter(parameter: unknown): DistributionPipelineParameter {
  const rewritten = rewriteValue(parameter) as DistributionPipelineParameter;
  const truth = { ...(rewritten.truth_metadata ?? {}) } as Json;
  const guide = { ...((truth.guide as Json | undefined) ?? {}) };
  guide.source_document = DISTRIBUTION_PIPELINE_SOURCE_ID;
  guide.source_locator = DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator;
  guide.source_snapshot_hash = DISTRIBUTION_PIPELINE_SOURCE_METADATA.artifact_sha256;
  guide.applicability = "Только для явно определённой наружной распределительной магистрали питьевой воды; поселковая сеть целиком, вводы в здания, внутренний водопровод, канализация и ливневая сеть исключены.";
  truth.guide = guide;
  truth.contract = "rik-expo-app.distribution-pipeline-r1";
  return { ...rewritten, truth_metadata: truth };
}

function projectParameter(
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer",
  unitId: string,
  ordinal: number,
): DistributionPipelineParameter {
  return {
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: true,
    default_value: null,
    constraints_json: { min: valueType === "integer" ? 1 : 0.000_001 },
    truth_metadata: {
      contract: "rik-expo-app.distribution-pipeline-r1",
      semantic_parameter_key: `distribution-pipeline:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: "PROJECT_SPECIFIC_INPUT",
      input_origin_class: "APPROVED_DISTRIBUTION_MAIN_PROJECT_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: true,
      guide: {
        guide_kind: "PROJECT_DEFINED",
        guide_short_ru: `${titleRu}: укажите по проекту, спецификации, ведомости объёмов, ППР или программе контроля.`,
        source_role: "APPROVED_DISTRIBUTION_MAIN_PROJECT_OR_QA_DOCUMENTATION",
        source_document: DISTRIBUTION_PIPELINE_SOURCE_ID,
        source_locator: DISTRIBUTION_PIPELINE_SOURCE_METADATA.exact_locator,
        guide_version: "distribution-pipeline-r1",
        source_snapshot_hash: DISTRIBUTION_PIPELINE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для выбранной распределительной магистрали питьевой воды.",
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: false,
      synthetic: false,
    },
  };
}

const BASE_PARAMETERS = SETTLEMENT_WATER_NETWORK_PARAMETERS
  .map(rewriteBaseParameter)
  .filter((parameter) => !COMPUTED_OUTPUT_PARAMETER_IDS.has(parameter.parameter_id));
const EXTRA_PARAMETERS = [
  projectParameter("dpm_thrust_restraint_quantity_piece", "Количество узлов анкерного закрепления трубы", "integer", "pcs", 56),
  projectParameter("dpm_valve_extension_quantity_piece", "Количество удлинителей штока арматуры", "integer", "pcs", 57),
  projectParameter("dpm_marker_post_quantity_piece", "Количество опознавательных столбиков магистрали", "integer", "pcs", 58),
  projectParameter("dpm_potable_water_sample_count", "Количество проб питьевой воды", "integer", "sample", 60),
  projectParameter("dpm_laboratory_analysis_count", "Количество лабораторных анализов воды", "integer", "analysis", 61),
  projectParameter("dpm_temporary_work_zone_safety_set_count", "Количество комплектов временного ограждения и знаков рабочей зоны", "integer", "set", 62),
  projectParameter("dpm_pressure_test_measurement_set_count", "Количество поверенных комплектов измерений гидравлического испытания", "integer", "set", 63),
] as const;

function cloneConditionalParameter(
  sourceParameterId: string,
  targetParameterId: string,
  titleRu: string,
): DistributionPipelineParameter {
  const source = BASE_PARAMETERS.find((parameter) => parameter.parameter_id === sourceParameterId);
  if (!source) throw new Error(`DISTRIBUTION_PIPELINE_CONDITIONAL_SOURCE_MISSING:${sourceParameterId}`);
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") return value.replaceAll("dpm_crossing_casing", "dpm_trench_support");
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]));
    }
    return value;
  };
  return { ...(replace(source) as DistributionPipelineParameter), parameter_id: targetParameterId, title_ru: titleRu };
}

const CONDITIONAL_PARAMETERS = [
  cloneConditionalParameter(
    "dpm_crossing_casing_mode",
    "dpm_trench_support_mode",
    "Крепление стенок траншеи требуется по проекту и условиям грунта",
  ),
  cloneConditionalParameter(
    "dpm_crossing_casing_designation",
    "dpm_trench_support_designation",
    "Система инвентарного крепления стенок траншеи",
  ),
  cloneConditionalParameter(
    "dpm_crossing_casing_length_m",
    "dpm_trench_support_length_m",
    "Длина участков с креплением стенок траншеи",
  ),
] as const;

function boundedParameter(
  parameterId: string,
  titleRu: string,
  unitId: string,
  minimum: number,
  maximum?: number,
): DistributionPipelineParameter {
  const parameter = projectParameter(parameterId, titleRu, "decimal", unitId, 0);
  return {
    ...parameter,
    constraints_json: { min: minimum, ...(maximum == null ? {} : { max: maximum }) },
  };
}

const PRIMARY_CALCULATION_PARAMETERS = [
  boundedParameter("dpm_trench_bottom_width_m", "Ширина траншеи по дну", "m", 0.000_001),
  boundedParameter("dpm_trench_depth_m", "Проектная глубина траншеи", "m", 0.000_001),
  boundedParameter("dpm_bedding_thickness_m", "Толщина постели под трубой", "m", 0.000_001),
  boundedParameter("dpm_surround_width_m", "Ширина зоны защитной обсыпки", "m", 0.000_001),
  boundedParameter("dpm_surround_cover_above_pipe_m", "Толщина защитной обсыпки над трубой", "m", 0.000_001),
  boundedParameter("dpm_pipe_inside_diameter_mm", "Внутренний диаметр выбранной трубы", "mm", 0.000_001),
  boundedParameter("dpm_excavated_soil_reuse_fraction", "Доля разработанного грунта, пригодного для обратной засыпки", "ratio", 0, 1),
  boundedParameter("dpm_installed_pipe_piece_length_m", "Монтажная длина одного элемента трубы", "m", 0.000_001),
  boundedParameter("dpm_covers_per_chamber", "Количество люков на одну выбранную камеру", "pcs_per_piece", 0.000_001),
  boundedParameter("dpm_warning_tape_length_factor", "Отношение длины сигнальной ленты к длине трассы", "ratio", 0.000_001),
  boundedParameter("dpm_flushing_volume_multiplier", "Кратность объёма воды для промывки", "ratio", 0.000_001),
  boundedParameter("dpm_disinfection_reagent_dose_mg_l", "Доза реагента для дезинфекции", "mg_l", 0.000_001),
  boundedParameter("dpm_survey_labor_h_per_m", "Удельный труд геодезического сопровождения", "man_hour_per_m", 0.000_001),
  boundedParameter("dpm_earthworks_labor_h_per_m3", "Удельный труд земляных работ", "man_hour_per_m3", 0.000_001),
  boundedParameter("dpm_pipe_install_labor_h_per_m", "Удельный труд монтажа трубы", "man_hour_per_m", 0.000_001),
  boundedParameter("dpm_fitting_install_labor_h_per_piece", "Удельный труд монтажа фасонной части", "man_hour_per_piece", 0.000_001),
  boundedParameter("dpm_valve_install_labor_h_per_piece", "Удельный труд монтажа запорной арматуры", "man_hour_per_piece", 0.000_001),
  boundedParameter("dpm_hydrant_install_labor_h_per_piece", "Удельный труд монтажа гидранта", "man_hour_per_piece", 0.000_001),
  boundedParameter("dpm_chamber_install_labor_h_per_piece", "Удельный труд монтажа камеры", "man_hour_per_piece", 0.000_001),
  boundedParameter("dpm_qa_labor_h_per_m", "Удельный труд испытаний и документации", "man_hour_per_m", 0.000_001),
  boundedParameter("dpm_excavator_productivity_m3_h", "Производительность экскаватора", "m3_h", 0.000_001),
  boundedParameter("dpm_compactor_productivity_m3_h", "Производительность механизма уплотнения", "m3_h", 0.000_001),
  boundedParameter("dpm_jointing_machine_h_per_joint", "Машинное время сварки одного стыка", "machine_hour_per_joint", 0.000_001),
  boundedParameter("dpm_crane_machine_h_per_node", "Машинное время крана на один тяжёлый узел", "machine_hour_per_piece", 0.000_001),
  boundedParameter("dpm_removal_truck_capacity_m3", "Полезный объём рейса вывоза грунта", "m3_per_trip", 0.000_001),
  projectParameter("dpm_thrust_block_quantity_piece", "Количество упорных блоков по топологии", "integer", "pcs", 0),
  boundedParameter("dpm_thrust_block_concrete_m3_per_piece", "Объём бетона одного упорного блока", "m3_per_piece", 0.000_001),
  projectParameter("dpm_hydrotest_section_count", "Количество участков гидравлического испытания", "integer", "section", 0),
  boundedParameter("dpm_hydrotest_duration_h_per_section", "Продолжительность работы насоса на один участок испытания", "machine_hour_per_section", 0.000_001),
  projectParameter("dpm_flanged_connection_quantity_piece", "Количество фланцевых соединений по топологии", "integer", "pcs", 0),
  boundedParameter("dpm_fusion_consumable_set_per_joint", "Комплект расходников сварки на один прямой стык", "set_per_joint", 0.000_001),
  boundedParameter("dpm_flange_kit_per_connection", "Комплект фланцевого крепежа и прокладки на одно соединение", "set_per_connection", 0.000_001),
  boundedParameter("dpm_temporary_end_closure_per_test_section", "Количество временных заглушек на участок испытания", "pcs_per_section", 0.000_001),
  projectParameter("dpm_test_water_connection_set_count", "Количество временных комплектов заполнения и слива", "integer", "set", 0),
  boundedParameter("dpm_pipe_expected_loss_fraction", "Ожидаемая доля потерь трубы", "ratio", 0, 1),
  boundedParameter("dpm_pipe_available_stock_m", "Подтверждённый доступный остаток трубы", "m", 0),
  boundedParameter("dpm_section_2_length_m", "Длина второго участка с отличающимся поперечным сечением", "m", 0),
  boundedParameter("dpm_section_2_trench_bottom_width_m", "Ширина траншеи по дну второго участка", "m", 0.000_001),
  boundedParameter("dpm_section_2_trench_depth_m", "Проектная глубина траншеи второго участка", "m", 0.000_001),
  boundedParameter("dpm_section_2_bedding_thickness_m", "Толщина постели второго участка", "m", 0.000_001),
  boundedParameter("dpm_section_2_surround_width_m", "Ширина зоны защитной обсыпки второго участка", "m", 0.000_001),
  boundedParameter("dpm_section_2_surround_cover_above_pipe_m", "Толщина защитной обсыпки над трубой второго участка", "m", 0.000_001),
  boundedParameter("dpm_route_marking_set_per_100m", "Комплект разметочных расходников на 100 м трассы", "set_per_100m", 0.000_001),
  boundedParameter("dpm_compaction_water_m3_per_backfill_m3", "Расход воды для увлажнения при уплотнении на объём засыпки", "m3_per_m3", 0),
  boundedParameter("dpm_chamber_joint_sealant_kg_per_chamber", "Расход герметизирующего материала на одну камеру", "kg_per_piece", 0),
  boundedParameter("dpm_cover_bedding_mortar_kg_per_cover", "Расход посадочного раствора на один люк", "kg_per_piece", 0),
] as const;

export const DISTRIBUTION_PIPELINE_PARAMETERS: readonly DistributionPipelineParameter[] =
  Object.freeze([
    ...BASE_PARAMETERS, ...EXTRA_PARAMETERS, ...CONDITIONAL_PARAMETERS,
    ...PRIMARY_CALCULATION_PARAMETERS,
  ]
    .map((parameter, ordinal) => ({ ...parameter, ordinal })));

export const DISTRIBUTION_PIPELINE_PRELIMINARY_PROFILE_INPUT = Object.freeze({
  dpm_pipe_retained_spare_m: 24,
  dpm_pipe_expected_loss_fraction: 0.02,
  dpm_pipe_available_stock_m: 0,
  dpm_pipe_supplier_segment_length_m: 12,
  dpm_trench_bottom_width_m: 1.2,
  dpm_trench_depth_m: 2,
  dpm_bedding_thickness_m: 0.15,
  dpm_surround_width_m: 0.7,
  dpm_surround_cover_above_pipe_m: 0.3,
  dpm_pipe_inside_diameter_mm: 198.5,
  dpm_excavated_soil_reuse_fraction: 0.75,
  dpm_installed_pipe_piece_length_m: 12,
  dpm_covers_per_chamber: 1,
  dpm_warning_tape_length_factor: 1.05,
  dpm_flushing_volume_multiplier: 2,
  dpm_disinfection_reagent_dose_mg_l: 50,
  dpm_bedding_designation: "Песок мытый по предварительному профилю DPM-T1",
  dpm_surround_designation: "Песок защитной обсыпки по предварительному профилю DPM-T1",
  dpm_backfill_designation: "Привозной материал обратной засыпки по балансу DPM-T1",
  dpm_joint_designation: "Стыковое сварное соединение PE100-RC OD225",
  dpm_fitting_designation: "Фасонные части PE100-RC OD225 по предварительной топологии DPM-T1",
  dpm_fitting_quantity_piece: 34,
  dpm_valve_designation: "Задвижка DN200 PN10 по предварительной топологии DPM-T1",
  dpm_valve_quantity_piece: 12,
  dpm_hydrant_designation: "Гидрант пожарный по предварительной топологии DPM-T1",
  dpm_hydrant_quantity_piece: 8,
  dpm_chamber_designation: "Камера водопроводная КС-25 по предварительной топологии DPM-T1",
  dpm_chamber_quantity_piece: 14,
  dpm_cover_designation: "Люк тяжёлый D400 по предварительному профилю DPM-T1",
  dpm_warning_tape_designation: "Лента сигнальная Водопровод",
  dpm_survey_labor_h_per_m: 0.1333333333,
  dpm_earthworks_labor_h_per_m3: 0.2731481481,
  dpm_pipe_install_labor_h_per_m: 0.6,
  dpm_fitting_install_labor_h_per_piece: 2,
  dpm_valve_install_labor_h_per_piece: 6,
  dpm_hydrant_install_labor_h_per_piece: 8,
  dpm_chamber_install_labor_h_per_piece: 12,
  dpm_qa_labor_h_per_m: 0.1444444444,
  dpm_excavator_productivity_m3_h: 10.2857142857,
  dpm_compactor_productivity_m3_h: 10.1045454545,
  dpm_jointing_machine_h_per_joint: 1.4765100671,
  dpm_crane_machine_h_per_node: 2.8235294118,
  dpm_removal_truck_capacity_m3: 11.0204081633,
  dpm_delivery_trip_count: 42,
  dpm_thrust_block_quantity_piece: 12,
  dpm_thrust_block_concrete_m3_per_piece: 1.55,
  dpm_thrust_restraint_quantity_piece: 22,
  dpm_valve_extension_quantity_piece: 12,
  dpm_marker_post_quantity_piece: 20,
  dpm_potable_water_sample_count: 6,
  dpm_laboratory_analysis_count: 6,
  dpm_hydrotest_section_count: 6,
  dpm_hydrotest_duration_h_per_section: 8,
  dpm_flanged_connection_quantity_piece: 20,
  dpm_fusion_consumable_set_per_joint: 1,
  dpm_flange_kit_per_connection: 1,
  dpm_temporary_end_closure_per_test_section: 2,
  dpm_test_water_connection_set_count: 1,
  dpm_temporary_work_zone_safety_set_count: 1,
  dpm_pressure_test_measurement_set_count: 1,
  dpm_section_2_length_m: 0,
  dpm_section_2_trench_bottom_width_m: 1.2,
  dpm_section_2_trench_depth_m: 2,
  dpm_section_2_bedding_thickness_m: 0.15,
  dpm_section_2_surround_width_m: 0.7,
  dpm_section_2_surround_cover_above_pipe_m: 0.3,
  dpm_route_marking_set_per_100m: 1,
  dpm_compaction_water_m3_per_backfill_m3: 0.05,
  dpm_chamber_joint_sealant_kg_per_chamber: 8,
  dpm_cover_bedding_mortar_kg_per_cover: 25,
  dpm_trench_support_mode: "NOT_REQUIRED",
  dpm_crossing_casing_mode: "NOT_REQUIRED",
  dpm_dewatering_mode: "NOT_REQUIRED",
  dpm_road_restoration_mode: "NOT_REQUIRED",
});
export const DISTRIBUTION_PIPELINE_RUNTIME_INPUT = DISTRIBUTION_PIPELINE_PRELIMINARY_PROFILE_INPUT;
export const DISTRIBUTION_PIPELINE_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(DISTRIBUTION_PIPELINE_RUNTIME_INPUT).map((parameterId) => [parameterId, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const DISTRIBUTION_PIPELINE_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(DISTRIBUTION_PIPELINE_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [DISTRIBUTION_PIPELINE_SOURCE_ID]],
  ),
) as Readonly<Record<string, readonly string[]>>);

const EXTRA_ROWS = [
  ["rc09:dpm_thrust_block_concrete", "Упорные блоки", "material", "Бетон упорных блоков распределительной магистрали", "m3", "dpm_thrust_block_concrete_v2", "dpm_thrust_block_quantity_piece*dpm_thrust_block_concrete_m3_per_piece", true],
  ["rc09:dpm_thrust_restraint", "Комплектующие", "material", "Узел анкерного закрепления напорной трубы", "pcs", "dpm_thrust_restraint_v1", "dpm_thrust_restraint_quantity_piece", true],
  ["rc09:dpm_valve_extension", "Комплектующие", "material", "Удлинитель штока запорной арматуры", "pcs", "dpm_valve_extension_v1", "dpm_valve_extension_quantity_piece", true],
  ["rc09:dpm_marker_post", "Материалы", "material", "Опознавательный столбик распределительной магистрали", "pcs", "dpm_marker_post_v1", "dpm_marker_post_quantity_piece", true],
  ["rc09:dpm_disinfection_reagent", "Расходники", "material", "Реагент для дезинфекции магистрали", "kg", "dpm_disinfection_reagent_v2", "dpm_route_length_m*3.141592653589793*pow(dpm_pipe_inside_diameter_mm/1000,2)/4*dpm_flushing_volume_multiplier*dpm_disinfection_reagent_dose_mg_l/1000", true],
  ["rc09:dpm_potable_water_samples", "Контроль", "service", "Отбор проб питьевой воды", "sample", "dpm_potable_water_sample_v1", "dpm_potable_water_sample_count", true],
  ["rc09:dpm_laboratory_analysis", "Контроль", "service", "Лабораторный анализ питьевой воды", "analysis", "dpm_laboratory_analysis_v1", "dpm_laboratory_analysis_count", true],
  ["rc09:equipment:dpm-hydrotest-pump", "Механизмы", "equipment", "Насос гидравлического испытания магистрали", "machine_hour", "dpm_hydrotest_pump_v2", "dpm_hydrotest_section_count*dpm_hydrotest_duration_h_per_section", true],
  ["rc09:dpm_fusion_consumables", "Расходники", "material", "Комплект очистки и подготовки прямого сварного стыка", "set", "dpm_fusion_consumables_v2", "max(0,ceil(dpm_route_length_m/dpm_installed_pipe_piece_length_m)-1)*dpm_fusion_consumable_set_per_joint", true],
  ["rc09:dpm_flange_connection_kits", "Комплектующие", "material", "Фланцевый комплект: ответные элементы, болты, гайки, шайбы и прокладка", "set", "dpm_flange_connection_kit_v2", "dpm_flanged_connection_quantity_piece*dpm_flange_kit_per_connection", true],
  ["rc09:dpm_temporary_test_end_closures", "Испытания", "material", "Временная заглушка участка гидравлического испытания", "pcs", "dpm_temporary_test_end_closure_v2", "dpm_hydrotest_section_count*dpm_temporary_end_closure_per_test_section", true],
  ["rc09:dpm_test_water_connection_set", "Испытания", "material", "Временный комплект заполнения, выпуска воздуха и слива испытательной воды", "set", "dpm_test_water_connection_set_v2", "dpm_test_water_connection_set_count", true],
  ["rc09:dpm_backfill_placement", "Земляные работы", "construction_work", "Объём послойной обратной засыпки и уплотнения", "m3", "dpm_backfill_placement_v2", "max(0,dpm_route_length_m*dpm_trench_bottom_width_m*dpm_trench_depth_m-dpm_route_length_m*dpm_trench_bottom_width_m*dpm_bedding_thickness_m-dpm_route_length_m*dpm_surround_width_m*(dpm_pipe_outside_diameter_mm/1000+dpm_surround_cover_above_pipe_m))", false, "INFORMATIONAL_SCOPE"],
  ["rc09:dpm-pipe-balance:expected-loss", "Баланс трубы", "material", "Ожидаемые технологические потери трубы", "m", "dpm_pipe_expected_loss_v2", "dpm_route_length_m*dpm_pipe_expected_loss_fraction", false, "INFORMATIONAL_SCOPE"],
  ["rc09:dpm-pipe-balance:available-stock", "Баланс трубы", "material", "Подтверждённый доступный остаток трубы", "m", "dpm_pipe_available_stock_v2", "dpm_pipe_available_stock_m", false, "INFORMATIONAL_SCOPE"],
  ["rc09:dpm-pipe-balance:net-order-need", "Баланс трубы", "material", "Потребность к заказу после учёта наличия", "m", "dpm_pipe_net_order_need_v2", "max(0,dpm_route_length_m*(1+dpm_pipe_expected_loss_fraction)+dpm_pipe_retained_spare_m-dpm_pipe_available_stock_m)", false, "INFORMATIONAL_SCOPE"],
  ["rc09:dpm_route_marking_consumables", "Подготовка трассы", "material", "Комплект разметочных расходников трассы", "set", "dpm_route_marking_consumables_v2", "ceil(dpm_route_length_m/100)*dpm_route_marking_set_per_100m", true],
  ["rc09:dpm_temporary_work_zone_safety", "Подготовка трассы", "equipment", "Комплект временного ограждения и знаков рабочей зоны", "set", "dpm_temporary_work_zone_safety_v2", "dpm_temporary_work_zone_safety_set_count", true],
  ["rc09:dpm_compaction_water", "Засыпка и уплотнение", "material", "Вода для увлажнения материала при послойном уплотнении", "m3", "dpm_compaction_water_v2", "max(0,((dpm_route_length_m-dpm_section_2_length_m)*dpm_trench_bottom_width_m*dpm_trench_depth_m+dpm_section_2_length_m*dpm_section_2_trench_bottom_width_m*dpm_section_2_trench_depth_m)-((dpm_route_length_m-dpm_section_2_length_m)*dpm_trench_bottom_width_m*dpm_bedding_thickness_m+dpm_section_2_length_m*dpm_section_2_trench_bottom_width_m*dpm_section_2_bedding_thickness_m)-((dpm_route_length_m-dpm_section_2_length_m)*dpm_surround_width_m*(dpm_pipe_outside_diameter_mm/1000+dpm_surround_cover_above_pipe_m)+dpm_section_2_length_m*dpm_section_2_surround_width_m*(dpm_pipe_outside_diameter_mm/1000+dpm_section_2_surround_cover_above_pipe_m)))*dpm_compaction_water_m3_per_backfill_m3", true],
  ["rc09:dpm_chamber_joint_sealant", "Камеры и узлы", "material", "Герметизирующий материал стыков водопроводных камер", "kg", "dpm_chamber_joint_sealant_v2", "dpm_chamber_quantity_piece*dpm_chamber_joint_sealant_kg_per_chamber", true],
  ["rc09:dpm_cover_bedding_mortar", "Камеры и узлы", "material", "Посадочный раствор для установки люков", "kg", "dpm_cover_bedding_mortar_v2", "dpm_chamber_quantity_piece*dpm_covers_per_chamber*dpm_cover_bedding_mortar_kg_per_cover", true],
  ["rc09:dpm_pressure_test_measurement_set", "Испытания", "equipment", "Поверенный комплект манометра, регистратора и соединительной арматуры", "set", "dpm_pressure_test_measurement_set_v2", "dpm_pressure_test_measurement_set_count", true],
  ["rc09:dpm_trench_support", "Условные материалы", "material", "Инвентарное крепление стенок траншеи", "m2", "dpm_trench_support_area_v2", "dpm_trench_support_length_m*dpm_trench_depth_m*2", true],
] as const;

function formula(formulaId: string, unitId: string, expression: string): CanonicalEstimateFormulaDefinition {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: unitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const SECTION_1_LENGTH = "(dpm_route_length_m-dpm_section_2_length_m)";
const TRENCH_VOLUME = `(${SECTION_1_LENGTH}*dpm_trench_bottom_width_m*dpm_trench_depth_m+dpm_section_2_length_m*dpm_section_2_trench_bottom_width_m*dpm_section_2_trench_depth_m)`;
const BEDDING_VOLUME = `(${SECTION_1_LENGTH}*dpm_trench_bottom_width_m*dpm_bedding_thickness_m+dpm_section_2_length_m*dpm_section_2_trench_bottom_width_m*dpm_section_2_bedding_thickness_m)`;
const SURROUND_GROSS_VOLUME = `(${SECTION_1_LENGTH}*dpm_surround_width_m*(dpm_pipe_outside_diameter_mm/1000+dpm_surround_cover_above_pipe_m)+dpm_section_2_length_m*dpm_section_2_surround_width_m*(dpm_pipe_outside_diameter_mm/1000+dpm_section_2_surround_cover_above_pipe_m))`;
const PIPE_EXTERNAL_VOLUME = "dpm_route_length_m*3.141592653589793*pow(dpm_pipe_outside_diameter_mm/1000,2)/4";
const BACKFILL_PLACEMENT_VOLUME = `max(0,${TRENCH_VOLUME}-${BEDDING_VOLUME}-${SURROUND_GROSS_VOLUME})`;
const STRAIGHT_JOINT_COUNT = "max(0,ceil(dpm_route_length_m/dpm_installed_pipe_piece_length_m)-1)";
const PIPE_GROSS_NEED = "dpm_route_length_m*(1+dpm_pipe_expected_loss_fraction)+dpm_pipe_retained_spare_m";
const PIPE_NET_ORDER_NEED = `max(0,${PIPE_GROSS_NEED}-dpm_pipe_available_stock_m)`;
const PIPE_ORDERED = `ceil(${PIPE_NET_ORDER_NEED}/dpm_pipe_supplier_segment_length_m)*dpm_pipe_supplier_segment_length_m`;
const AUTOMATIC_FORMULA_EXPRESSIONS: Readonly<Record<string, string>> = Object.freeze({
  dpm_pipe_order_length_v1: PIPE_ORDERED,
  dpm_trench_excavation_v1: TRENCH_VOLUME,
  dpm_bedding_volume_v1: BEDDING_VOLUME,
  dpm_surround_volume_v1: `max(0,${SURROUND_GROSS_VOLUME}-${PIPE_EXTERNAL_VOLUME})`,
  dpm_backfill_volume_v1: `max(0,${BACKFILL_PLACEMENT_VOLUME}-${TRENCH_VOLUME}*dpm_excavated_soil_reuse_fraction)`,
  dpm_excess_soil_volume_v1: `max(0,${TRENCH_VOLUME}-min(${TRENCH_VOLUME}*dpm_excavated_soil_reuse_fraction,${BACKFILL_PLACEMENT_VOLUME}))`,
  dpm_joint_quantity_v1: STRAIGHT_JOINT_COUNT,
  dpm_cover_quantity_v1: "dpm_chamber_quantity_piece*dpm_covers_per_chamber",
  dpm_warning_tape_length_v1: "dpm_route_length_m*dpm_warning_tape_length_factor",
  dpm_flushing_water_volume_v1: "dpm_route_length_m*3.141592653589793*pow(dpm_pipe_inside_diameter_mm/1000,2)/4*dpm_flushing_volume_multiplier",
  dpm_pressure_test_length_v1: "dpm_route_length_m",
  dpm_disinfection_length_v1: "dpm_route_length_m",
  dpm_asbuilt_document_count_v1: "dpm_main_count",
  dpm_pipe_installed_net_v1: "dpm_route_length_m",
  dpm_pipe_retained_spare_v1: "dpm_pipe_retained_spare_m",
  dpm_pipe_total_need_v1: PIPE_GROSS_NEED,
  dpm_pipe_segment_count_v1: `ceil(${PIPE_NET_ORDER_NEED}/dpm_pipe_supplier_segment_length_m)`,
  dpm_pipe_remainder_v1: `dpm_pipe_available_stock_m+${PIPE_ORDERED}-dpm_route_length_m-dpm_route_length_m*dpm_pipe_expected_loss_fraction`,
  dpm_pipe_surplus_v1: `max(0,dpm_pipe_available_stock_m+${PIPE_ORDERED}-dpm_route_length_m-dpm_route_length_m*dpm_pipe_expected_loss_fraction-dpm_pipe_retained_spare_m)`,
  dpm_survey_labor_v1: "dpm_route_length_m*dpm_survey_labor_h_per_m",
  dpm_earthworks_labor_v1: `${TRENCH_VOLUME}*dpm_earthworks_labor_h_per_m3`,
  dpm_pipe_appurtenance_install_labor_v1: "dpm_route_length_m*dpm_pipe_install_labor_h_per_m+dpm_fitting_quantity_piece*dpm_fitting_install_labor_h_per_piece+dpm_valve_quantity_piece*dpm_valve_install_labor_h_per_piece+dpm_hydrant_quantity_piece*dpm_hydrant_install_labor_h_per_piece+dpm_chamber_quantity_piece*dpm_chamber_install_labor_h_per_piece",
  dpm_qa_documentation_labor_v1: "dpm_route_length_m*dpm_qa_labor_h_per_m",
  dpm_excavator_machine_v1: `${TRENCH_VOLUME}/dpm_excavator_productivity_m3_h`,
  dpm_compactor_machine_v1: `${BACKFILL_PLACEMENT_VOLUME}/dpm_compactor_productivity_m3_h`,
  dpm_jointing_machine_v1: `${STRAIGHT_JOINT_COUNT}*dpm_jointing_machine_h_per_joint`,
  dpm_crane_machine_v1: "(dpm_valve_quantity_piece+dpm_hydrant_quantity_piece+dpm_chamber_quantity_piece)*dpm_crane_machine_h_per_node",
  dpm_removal_trip_v1: `ceil(max(0,${TRENCH_VOLUME}-min(${TRENCH_VOLUME}*dpm_excavated_soil_reuse_fraction,${BACKFILL_PLACEMENT_VOLUME}))/dpm_removal_truck_capacity_m3)`,
});

const BASE_FORMULAS = (rewriteValue(SETTLEMENT_WATER_NETWORK_FORMULAS) as CanonicalEstimateFormulaDefinition[]).map((sourceFormula) => {
  const expression = AUTOMATIC_FORMULA_EXPRESSIONS[sourceFormula.formula_id];
  return expression
    ? formula(sourceFormula.formula_id, sourceFormula.output_unit_id ?? "unit", expression)
    : sourceFormula;
});
export const DISTRIBUTION_PIPELINE_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze([
    ...BASE_FORMULAS,
    ...EXTRA_ROWS.map((row) => formula(row[5], row[4], row[6])),
  ]);

function rewriteBaseResource(resource: CanonicalEstimateResourceDefinition): CanonicalEstimateResourceDefinition {
  const rewritten = rewriteValue(resource) as CanonicalEstimateResourceDefinition;
  const resourceGraph = {
    ...rewritten.resource_graph,
    ...(rewritten.row_id === "rc09:dpm_trench_excavation"
      ? { costTreatment: "INFORMATIONAL_SCOPE" }
      : {}),
  };
  const result = {
    ...rewritten,
    ...(rewritten.row_id === "rc09:dpm_backfill"
      ? { title_ru: "Привозной материал обратной засыпки после учёта пригодного грунта" }
      : {}),
    resource_graph: resourceGraph,
    source_metadata: resourceSourceMetadata(),
    row_sha256: "",
  };
  return { ...result, row_sha256: estimateDeterministicHash(result) };
}

function extraResource(
  row: typeof EXTRA_ROWS[number],
  ordinal: number,
): CanonicalEstimateResourceDefinition {
  const [rowId, section, category, titleRu, unitId, formulaId, , procurementEligible, costTreatment] = row;
  const resourceGraph = {
    formulaId,
    normalizedUom: unitId,
    semanticOwnerId: `distribution-pipeline:${rowId}`,
    costOwner: "resource",
    scopeContextParameterIds: [...KNOWN_SCOPE],
    costTreatment: costTreatment ?? "OWN_COST",
    ...(rowId === "rc09:dpm_trench_support" ? {
      titleSpecificationParameterIds: ["dpm_trench_support_designation"],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
  };
  const result: CanonicalEstimateResourceDefinition = {
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    ordinal,
    section,
    category,
    title_ru: titleRu,
    unit_id: unitId,
    formula_id: formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resourceGraph,
    procurement_eligible: procurementEligible,
    cost_owner_id: rowId,
    source_metadata: resourceSourceMetadata(),
    row_sha256: "",
  };
  if (rowId === "rc09:dpm_trench_support") {
    result.inclusion_ast = {
      kind: "equals",
      parameterId: "dpm_trench_support_mode",
      value: "REQUIRED",
    };
  }
  return { ...result, row_sha256: estimateDeterministicHash(result) };
}

const BASE_RESOURCES = SETTLEMENT_WATER_NETWORK_RESOURCES.map(rewriteBaseResource);
export const DISTRIBUTION_PIPELINE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze([
    ...BASE_RESOURCES,
    ...EXTRA_ROWS.map((row, index) => extraResource(row, BASE_RESOURCES.length + index)),
  ]);

export const DISTRIBUTION_PIPELINE_SHORT_INPUT = Object.freeze({
  dpm_main_count: 1,
  dpm_route_length_m: 1800,
  dpm_pipe_material: "HDPE",
  dpm_pipe_grade: "PE100-RC",
  dpm_sdr_class: "SDR17",
  dpm_pipe_outside_diameter_mm: 225,
  dpm_pressure_class: "PN10",
  dpm_pipe_designation: "PE100-RC-SDR17-OD225-PN10",
});

export const DISTRIBUTION_PIPELINE_ACCEPTANCE_INPUT = Object.freeze({
  ...DISTRIBUTION_PIPELINE_SHORT_INPUT,
  ...DISTRIBUTION_PIPELINE_PRELIMINARY_PROFILE_INPUT,
});

export async function compileDistributionPipelineR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? DISTRIBUTION_PIPELINE_CATALOG_ID;
  if (catalogId !== DISTRIBUTION_PIPELINE_CATALOG_ID) {
    throw new Error(`DISTRIBUTION_PIPELINE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  const routeLength = Number(submittedParameters.dpm_route_length_m);
  const secondSectionLength = Number(
    submittedParameters.dpm_section_2_length_m
      ?? DISTRIBUTION_PIPELINE_RUNTIME_INPUT.dpm_section_2_length_m,
  );
  if (Number.isFinite(routeLength) && Number.isFinite(secondSectionLength)
    && secondSectionLength > routeLength) {
    throw new Error("DISTRIBUTION_PIPELINE_SECTION_LENGTH_EXCEEDS_ROUTE");
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.distribution-pipeline-r1",
    catalogId,
    primaryMeasureParameterId: "dpm_main_count",
    parameterDefinitions: [...DISTRIBUTION_PIPELINE_PARAMETERS],
    formulaDefinitions: [...DISTRIBUTION_PIPELINE_FORMULAS],
    resourceDefinitions: [...DISTRIBUTION_PIPELINE_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...DISTRIBUTION_PIPELINE_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: DISTRIBUTION_PIPELINE_RESOURCES.length,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const DISTRIBUTION_PIPELINE_KNOWN_SCOPE_PARAMETERS = KNOWN_SCOPE;
export const DISTRIBUTION_PIPELINE_VISIBLE_PRELIMINARY_PROFILE = new Set(
  Object.keys(DISTRIBUTION_PIPELINE_PRELIMINARY_PROFILE_INPUT),
);
