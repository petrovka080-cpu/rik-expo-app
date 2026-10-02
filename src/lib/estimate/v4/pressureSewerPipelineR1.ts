import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const PRESSURE_SEWER_PIPELINE_CATALOG_ID =
  "canonical-work:expanded:pressure_sewer_pipeline";
export const PRESSURE_SEWER_PIPELINE_SOURCE_ID =
  "project_pressure_sewer_pipeline_pipe_trench_appurtenance_qa_balance_v1";
export const PRESSURE_SEWER_PIPELINE_NORM_ID =
  "norm:project:pressure_sewer_pipeline:pipe_trench_appurtenance_qa_balance:v1";
export const PRESSURE_SEWER_PIPELINE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план и профиль напорной канализации, спецификации труб, арматуры, воздушных и промывных узлов, ППР и программа испытаний",
  source_authority: "Проектная организация водоотведения, инженер-геолог, изготовитель напорной трубной системы, строительная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_PRESSURE_SEWER_PIPELINE_PIPE_TRENCH_APPURTENANCE_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "5721be89132957a7e497564caaac6048bf533830eb1f44b8415e0b874a27ebe2",
  exact_locator: "Один напорный канализационный трубопровод, 800 м выбранной трубы HDPE PE100-RC SDR17 OD 110 PN10; земляные объёмы, соединения, арматура, узлы, камеры, испытания, труд, механизмы и логистика — только по проекту",
  use_restriction: "Длина не определяет траншею, колодцы, узлы, арматуру или труд. Футляры, водоотлив и восстановление дороги включаются только по проекту. КНС, самотечный коллектор и внутридомовая канализация исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "5721be89132957a7e497564caaac6048bf533830eb1f44b8415e0b874a27ebe2",
});

const KNOWN_SCOPE = ["psp_pipeline_count", "psp_route_length_m", "psp_pipe_material",
  "psp_pipe_grade", "psp_sdr_class", "psp_pipe_outside_diameter_mm",
  "psp_pressure_class", "psp_pipe_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "psp_pipe_retained_spare_m", "psp_pipe_supplier_segment_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "psp_crossing_casing_designation", "psp_crossing_casing_length_m",
  "psp_dewatering_designation", "psp_dewatering_machine_h",
  "psp_road_restoration_designation", "psp_road_restoration_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["psp_pipeline_count", "Количество напорных канализационных трубопроводов", "integer", "system", null],
  ["psp_route_length_m", "Проектная длина напорного трубопровода", "decimal", "m", null],
  ["psp_pipe_material", "Материал напорной трубы", "text", null, null],
  ["psp_pipe_grade", "Марка материала напорной трубы", "text", null, null],
  ["psp_sdr_class", "Класс SDR напорной трубы", "text", null, null],
  ["psp_pipe_outside_diameter_mm", "Наружный диаметр напорной трубы", "decimal", "mm", null],
  ["psp_pressure_class", "Класс рабочего давления трубы", "text", null, null],
  ["psp_pipe_designation", "Марка выбранной напорной трубы", "text", null, null],
  ["psp_pipe_retained_spare_m", "Сохраняемый резерв трубы", "decimal", "m", null],
  ["psp_pipe_supplier_segment_length_m", "Поставочная длина сегмента трубы", "decimal", "m", null],
  ["psp_trench_excavation_volume_m3", "Проектный объём разработки траншеи", "decimal", "m3", null],
  ["psp_bedding_designation", "Материал основания трубы", "text", null, null],
  ["psp_bedding_volume_m3", "Проектный объём основания трубы", "decimal", "m3", null],
  ["psp_surround_designation", "Материал защитной обсыпки трубы", "text", null, null],
  ["psp_surround_volume_m3", "Проектный объём защитной обсыпки", "decimal", "m3", null],
  ["psp_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["psp_backfill_volume_m3", "Проектный объём обратной засыпки", "decimal", "m3", null],
  ["psp_excess_soil_volume_m3", "Проектный объём вывоза лишнего грунта", "decimal", "m3", null],
  ["psp_joint_designation", "Соединение выбранной трубной системы", "text", null, null],
  ["psp_joint_quantity_piece", "Количество соединений трубы", "decimal", "pcs", null],
  ["psp_fitting_designation", "Фасонные части напорной канализации", "text", null, null],
  ["psp_fitting_quantity_piece", "Количество фасонных частей", "decimal", "pcs", null],
  ["psp_isolation_valve_designation", "Запорная арматура трубопровода", "text", null, null],
  ["psp_isolation_valve_quantity_piece", "Количество единиц запорной арматуры", "decimal", "pcs", null],
  ["psp_air_valve_designation", "Воздушный клапан напорной канализации", "text", null, null],
  ["psp_air_valve_quantity_piece", "Количество воздушных клапанов", "decimal", "pcs", null],
  ["psp_washout_designation", "Промывной узел напорной канализации", "text", null, null],
  ["psp_washout_quantity_piece", "Количество промывных узлов", "decimal", "pcs", null],
  ["psp_chamber_designation", "Камера арматуры напорной канализации", "text", null, null],
  ["psp_chamber_quantity_piece", "Количество камер арматуры", "decimal", "pcs", null],
  ["psp_cover_designation", "Люк камеры напорной канализации", "text", null, null],
  ["psp_cover_quantity_piece", "Количество люков", "decimal", "pcs", null],
  ["psp_warning_tape_designation", "Сигнальная лента напорной канализации", "text", null, null],
  ["psp_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["psp_pressure_test_length_m", "Длина гидравлического испытания", "decimal", "m", null],
  ["psp_flushing_length_m", "Длина промывки трубопровода", "decimal", "m", null],
  ["psp_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["psp_survey_labor_h", "Труд геодезического сопровождения", "decimal", "man_hour", null],
  ["psp_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["psp_pipe_appurtenance_install_labor_h", "Труд по монтажу труб и арматуры", "decimal", "man_hour", null],
  ["psp_qa_documentation_labor_h", "Труд по испытаниям и документации", "decimal", "man_hour", null],
  ["psp_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["psp_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["psp_jointing_machine_h", "Работа сварочного оборудования трубы", "decimal", "machine_hour", null],
  ["psp_crane_machine_h", "Работа крана при монтаже камер и арматуры", "decimal", "machine_hour", null],
  ["psp_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["psp_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["psp_crossing_casing_mode", "Футляр на пересечении требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["psp_crossing_casing_designation", "Футляр на пересечении", "text", null, null],
  ["psp_crossing_casing_length_m", "Длина футляра", "decimal", "m", null],
  ["psp_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["psp_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["psp_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["psp_road_restoration_mode", "Восстановление дороги требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["psp_road_restoration_designation", "Конструкция восстановления дороги", "text", null, null],
  ["psp_road_restoration_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);
function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("psp_crossing_casing_")
    && parameterId !== "psp_crossing_casing_mode" ? "psp_crossing_casing_mode"
    : parameterId.startsWith("psp_dewatering_") && parameterId !== "psp_dewatering_mode"
      ? "psp_dewatering_mode"
      : parameterId.startsWith("psp_road_restoration_")
        && parameterId !== "psp_road_restoration_mode" ? "psp_road_restoration_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type PressureSewerPipelineParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const PRESSURE_SEWER_PIPELINE_PARAMETERS:
readonly PressureSewerPipelineParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "psp_pipe_retained_spare_m" ? 0 : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: {
      contract: "rik-expo-app.pressure-sewer-pipeline-r1",
      semantic_parameter_key: `pressure-sewer-pipeline:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_PRESSURE_SEWER_ROUTE_TRENCH_APPURTENANCE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану и профилю напорной канализации.`
          : `${titleRu}: укажите по проекту, спецификации, ведомости объёмов, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_PRESSURE_SEWER_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PRESSURE_SEWER_PROJECT_DOCUMENTATION",
        source_document: PRESSURE_SEWER_PIPELINE_SOURCE_ID,
        source_locator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
        guide_version: "pressure-sewer-pipeline-r1",
        source_snapshot_hash: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой напорной канализационной линии; КНС, самотечный коллектор и внутридомовая сеть исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
    },
  })),
);
export const PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT = Object.freeze({
  psp_pipe_retained_spare_m: 0, psp_pipe_supplier_segment_length_m: 1,
});
export const PRESSURE_SEWER_PIPELINE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const PRESSURE_SEWER_PIPELINE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [PRESSURE_SEWER_PIPELINE_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:psp_pipeline_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка напорной канализационной линии", unitId: "system", formulaId: "psp_pipeline_count_v1", expression: "psp_pipeline_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_pipe", section: "Материалы", category: "material", titleRu: "Труба напорной канализации", unitId: "m", formulaId: "psp_pipe_order_length_v1", expression: "ceil((psp_route_length_m+psp_pipe_retained_spare_m)/psp_pipe_supplier_segment_length_m)*psp_pipe_supplier_segment_length_m", procurementEligible: true, titleParameterIds: ["psp_pipe_designation", "psp_pipe_material", "psp_pipe_grade", "psp_sdr_class", "psp_pressure_class"] },
  { rowId: "rc09:psp_trench_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншеи напорной канализации", unitId: "m3", formulaId: "psp_trench_excavation_v1", expression: "psp_trench_excavation_volume_m3" },
  { rowId: "rc09:psp_bedding", section: "Материалы", category: "material", titleRu: "Основание под напорную трубу", unitId: "m3", formulaId: "psp_bedding_volume_v1", expression: "psp_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["psp_bedding_designation"] },
  { rowId: "rc09:psp_surround", section: "Материалы", category: "material", titleRu: "Защитная обсыпка напорной трубы", unitId: "m3", formulaId: "psp_surround_volume_v1", expression: "psp_surround_volume_m3", procurementEligible: true, titleParameterIds: ["psp_surround_designation"] },
  { rowId: "rc09:psp_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка траншеи", unitId: "m3", formulaId: "psp_backfill_volume_v1", expression: "psp_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["psp_backfill_designation"] },
  { rowId: "rc09:psp_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "psp_excess_soil_volume_v1", expression: "psp_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:psp_pipe_joint", section: "Комплектующие", category: "material", titleRu: "Соединение напорной трубной системы", unitId: "pcs", formulaId: "psp_joint_quantity_v1", expression: "psp_joint_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_joint_designation"] },
  { rowId: "rc09:psp_fitting", section: "Комплектующие", category: "material", titleRu: "Фасонная часть напорной канализации", unitId: "pcs", formulaId: "psp_fitting_quantity_v1", expression: "psp_fitting_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_fitting_designation"] },
  { rowId: "rc09:psp_isolation_valve", section: "Оборудование", category: "equipment", titleRu: "Запорная арматура напорной канализации", unitId: "pcs", formulaId: "psp_isolation_valve_quantity_v1", expression: "psp_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_isolation_valve_designation"] },
  { rowId: "rc09:psp_air_valve", section: "Оборудование", category: "equipment", titleRu: "Воздушный клапан напорной канализации", unitId: "pcs", formulaId: "psp_air_valve_quantity_v1", expression: "psp_air_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_air_valve_designation"] },
  { rowId: "rc09:psp_washout", section: "Оборудование", category: "equipment", titleRu: "Промывной узел напорной канализации", unitId: "pcs", formulaId: "psp_washout_quantity_v1", expression: "psp_washout_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_washout_designation"] },
  { rowId: "rc09:psp_chamber", section: "Сооружения", category: "material", titleRu: "Камера арматуры напорной канализации", unitId: "pcs", formulaId: "psp_chamber_quantity_v1", expression: "psp_chamber_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_chamber_designation"] },
  { rowId: "rc09:psp_chamber_cover", section: "Комплектующие", category: "material", titleRu: "Люк камеры напорной канализации", unitId: "pcs", formulaId: "psp_cover_quantity_v1", expression: "psp_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["psp_cover_designation"] },
  { rowId: "rc09:psp_warning_tape", section: "Материалы", category: "material", titleRu: "Сигнальная лента напорной канализации", unitId: "m", formulaId: "psp_warning_tape_length_v1", expression: "psp_warning_tape_length_m", procurementEligible: true, titleParameterIds: ["psp_warning_tape_designation"] },
  { rowId: "rc09:psp_pressure_test", section: "Контроль", category: "service", titleRu: "Гидравлическое испытание напорной канализации", unitId: "m", formulaId: "psp_pressure_test_length_v1", expression: "psp_pressure_test_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_flushing", section: "Контроль", category: "service", titleRu: "Промывка напорной канализации", unitId: "m", formulaId: "psp_flushing_length_v1", expression: "psp_flushing_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_asbuilt_documents", section: "Документы", category: "service", titleRu: "Комплект исполнительной документации напорной канализации", unitId: "document", formulaId: "psp_asbuilt_document_count_v1", expression: "psp_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp_crossing_casing", section: "Условные материалы", category: "material", titleRu: "Футляр напорной канализации на пересечении", unitId: "m", formulaId: "psp_crossing_casing_length_v1", expression: "psp_crossing_casing_length_m", procurementEligible: true, inclusionAst: equals("psp_crossing_casing_mode", "REQUIRED"), titleParameterIds: ["psp_crossing_casing_designation"] },
  { rowId: "rc09:psp_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив при строительстве напорной канализации", unitId: "machine_hour", formulaId: "psp_dewatering_machine_v1", expression: "psp_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("psp_dewatering_mode", "REQUIRED"), titleParameterIds: ["psp_dewatering_designation"] },
  { rowId: "rc09:psp_road_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дороги над напорной канализацией", unitId: "m2", formulaId: "psp_road_restoration_area_v1", expression: "psp_road_restoration_area_m2", inclusionAst: equals("psp_road_restoration_mode", "REQUIRED"), titleParameterIds: ["psp_road_restoration_designation"] },
  { rowId: "rc09:psp-pipe-balance:installed-net", section: "Баланс трубы", category: "material", titleRu: "Чистая длина укладываемой трубы", unitId: "m", formulaId: "psp_pipe_installed_net_v1", expression: "psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:retained-spare", section: "Баланс трубы", category: "material", titleRu: "Сохраняемый резерв трубы", unitId: "m", formulaId: "psp_pipe_retained_spare_v1", expression: "psp_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:total-need", section: "Баланс трубы", category: "material", titleRu: "Общая потребность в трубе", unitId: "m", formulaId: "psp_pipe_total_need_v1", expression: "psp_route_length_m+psp_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:segment-count", section: "Баланс трубы", category: "material", titleRu: "Количество поставочных сегментов трубы", unitId: "pcs", formulaId: "psp_pipe_segment_count_v1", expression: "ceil((psp_route_length_m+psp_pipe_retained_spare_m)/psp_pipe_supplier_segment_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:remainder", section: "Баланс трубы", category: "material", titleRu: "Остаток трубы после монтажа", unitId: "m", formulaId: "psp_pipe_remainder_v1", expression: "ceil((psp_route_length_m+psp_pipe_retained_spare_m)/psp_pipe_supplier_segment_length_m)*psp_pipe_supplier_segment_length_m-psp_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:psp-pipe-balance:surplus-beyond-spare", section: "Баланс трубы", category: "material", titleRu: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "psp_pipe_surplus_v1", expression: "max(0,ceil((psp_route_length_m+psp_pipe_retained_spare_m)/psp_pipe_supplier_segment_length_m)*psp_pipe_supplier_segment_length_m-psp_route_length_m-psp_pipe_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:psp-survey", section: "Труд", category: "construction_work", titleRu: "Труд по геодезическому сопровождению", unitId: "man_hour", formulaId: "psp_survey_labor_v1", expression: "psp_survey_labor_h" },
  { rowId: "rc09:labor:psp-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "psp_earthworks_labor_v1", expression: "psp_earthworks_labor_h" },
  { rowId: "rc09:labor:psp-pipe-appurtenance-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу труб, арматуры и узлов", unitId: "man_hour", formulaId: "psp_pipe_appurtenance_install_labor_v1", expression: "psp_pipe_appurtenance_install_labor_h" },
  { rowId: "rc09:labor:psp-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по испытаниям и документации", unitId: "man_hour", formulaId: "psp_qa_documentation_labor_v1", expression: "psp_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:psp-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки траншеи", unitId: "machine_hour", formulaId: "psp_excavator_machine_v1", expression: "psp_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:psp-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "psp_compactor_machine_v1", expression: "psp_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:psp-jointing", section: "Механизмы", category: "equipment", titleRu: "Оборудование сварки напорной трубы", unitId: "machine_hour", formulaId: "psp_jointing_machine_v1", expression: "psp_jointing_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:psp-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа камер и арматуры", unitId: "machine_hour", formulaId: "psp_crane_machine_v1", expression: "psp_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:psp-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб, арматуры и материалов", unitId: "trip", formulaId: "psp_delivery_trip_v1", expression: "psp_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:psp-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "psp_removal_trip_v1", expression: "psp_removal_trip_count", procurementEligible: true },
]);
export const PRESSURE_SEWER_PIPELINE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(ROW_SPECS.map((row) => {
  const compiled = compileFormulaGraph(row.expression);
  return { formula_id: row.formulaId, output_unit_id: row.unitId,
    expression_source: row.expression, ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}));
export const PRESSURE_SEWER_PIPELINE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map((row, ordinal) => {
  const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
    semanticOwnerId: `pressure-sewer-pipeline:${row.rowId}`, costOwner: "resource",
    ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
  const sourceRole = "APPROVED_PRESSURE_SEWER_PROJECT_PACKAGE";
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
    normativeTrace: [{ sourceId: PRESSURE_SEWER_PIPELINE_SOURCE_ID,
      source_id: PRESSURE_SEWER_PIPELINE_SOURCE_ID,
      normId: PRESSURE_SEWER_PIPELINE_NORM_ID, norm_id: PRESSURE_SEWER_PIPELINE_NORM_ID,
      normVersion: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.source_document_version,
      source_title: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.source_title,
      exact_locator: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.exact_locator,
      source_definition_hash: PRESSURE_SEWER_PIPELINE_SOURCE_METADATA.definition_hash,
      sourceRole }], excludedUnownedAssumptions: [
      "generic length-derived trench, bedding, appurtenance, labor or mechanism coefficient",
      "automatic manhole, connection-node, valve, air-release or washout spacing",
      "automatic crossing casing, dewatering or road-restoration selection",
      "automatic retained spare or supplier segment length",
      "pumping station, gravity collector or building drainage", "invented price",
    ] };
  return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
    ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
    unit_id: row.unitId, formula_id: row.formulaId,
    inclusion_ast: row.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: row.procurementEligible ?? false, cost_owner_id: row.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
}));

export const PRESSURE_SEWER_PIPELINE_SHORT_INPUT = Object.freeze({
  psp_pipeline_count: 1, psp_route_length_m: 800, psp_pipe_material: "HDPE",
  psp_pipe_grade: "PE100-RC", psp_sdr_class: "SDR17",
  psp_pipe_outside_diameter_mm: 110, psp_pressure_class: "PN10",
  psp_pipe_designation: "PE100-RC-SDR17-OD110-PN10",
  ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT,
});
export const PRESSURE_SEWER_PIPELINE_ACCEPTANCE_INPUT = Object.freeze({
  ...PRESSURE_SEWER_PIPELINE_SHORT_INPUT,
  psp_trench_excavation_volume_m3: 1760,
  psp_bedding_designation: "Песок мытый по проекту", psp_bedding_volume_m3: 144,
  psp_surround_designation: "Песок защитной обсыпки по проекту", psp_surround_volume_m3: 336,
  psp_backfill_designation: "Грунт обратной засыпки по балансу", psp_backfill_volume_m3: 1080,
  psp_excess_soil_volume_m3: 536,
  psp_joint_designation: "Стыковое сварное соединение PE100-RC OD 110", psp_joint_quantity_piece: 66,
  psp_fitting_designation: "Фасонные части PE100-RC OD 110 по ведомости", psp_fitting_quantity_piece: 24,
  psp_isolation_valve_designation: "Задвижка DN100 PN10 по спецификации", psp_isolation_valve_quantity_piece: 6,
  psp_air_valve_designation: "Клапан воздушный для сточных вод по проекту", psp_air_valve_quantity_piece: 4,
  psp_washout_designation: "Промывной узел напорной канализации", psp_washout_quantity_piece: 3,
  psp_chamber_designation: "Камера арматуры КС-15 по профилю", psp_chamber_quantity_piece: 9,
  psp_cover_designation: "Люк тяжёлый D400 по проекту", psp_cover_quantity_piece: 9,
  psp_warning_tape_designation: "Лента сигнальная Канализация напорная", psp_warning_tape_length_m: 840,
  psp_pressure_test_length_m: 800, psp_flushing_length_m: 800, psp_asbuilt_document_count: 1,
  psp_survey_labor_h: 120, psp_earthworks_labor_h: 560,
  psp_pipe_appurtenance_install_labor_h: 680, psp_qa_documentation_labor_h: 140,
  psp_excavator_machine_h: 190, psp_compactor_machine_h: 160,
  psp_jointing_machine_h: 96, psp_crane_machine_h: 48,
  psp_delivery_trip_count: 20, psp_removal_trip_count: 45,
  psp_crossing_casing_mode: "NOT_REQUIRED", psp_dewatering_mode: "NOT_REQUIRED",
  psp_road_restoration_mode: "NOT_REQUIRED",
});
export async function compilePressureSewerPipelineR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PRESSURE_SEWER_PIPELINE_CATALOG_ID;
  if (catalogId !== PRESSURE_SEWER_PIPELINE_CATALOG_ID) {
    throw new Error(`PRESSURE_SEWER_PIPELINE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pressure-sewer-pipeline-r1",
    catalogId, primaryMeasureParameterId: "psp_pipeline_count",
    parameterDefinitions: [...PRESSURE_SEWER_PIPELINE_PARAMETERS],
    formulaDefinitions: [...PRESSURE_SEWER_PIPELINE_FORMULAS],
    resourceDefinitions: [...PRESSURE_SEWER_PIPELINE_RESOURCES], submittedParameters,
    confirmedParameters: { ...PRESSURE_SEWER_PIPELINE_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
