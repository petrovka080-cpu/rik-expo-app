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

export const SETTLEMENT_WATER_NETWORK_CATALOG_ID =
  "canonical-work:expanded:settlement_water_network";
export const SETTLEMENT_WATER_NETWORK_SOURCE_ID =
  "project_settlement_water_network_pipe_trench_appurtenance_qa_balance_v1";
export const SETTLEMENT_WATER_NETWORK_NORM_ID =
  "norm:project:settlement_water_network:pipe_trench_appurtenance_qa_balance:v1";

export const SETTLEMENT_WATER_NETWORK_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план и профиль поселковой водопроводной сети, спецификации труб, арматуры, гидрантов и камер, ППР и программа контроля воды",
  source_authority: "Проектная организация водоснабжения, инженер-геолог, изготовитель напорной трубной системы, аккредитованная лаборатория воды и утверждающий инженер проекта",
  source_document_version: "PROJECT_SETTLEMENT_WATER_NETWORK_PIPE_TRENCH_APPURTENANCE_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "4bae435a2cc3b6a17222f55c59a26e188218d66a6d050f2be187d6d8833d5ec2",
  exact_locator: "Одна сеть, 1200 м выбранной трубы HDPE PE100-RC SDR17 OD 160 PN10; земляные объёмы, соединения, арматура, гидранты, камеры, испытания, труд, механизмы и логистика — только по утверждённому проектному комплекту",
  use_restriction: "Длина трассы не определяет траншею, число фитингов, задвижек, гидрантов или камер. Футляры, водоотлив и восстановление дороги включаются только по прямому проектному основанию. Внутренний водопровод, канализация и ливневая сеть исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "4bae435a2cc3b6a17222f55c59a26e188218d66a6d050f2be187d6d8833d5ec2",
});

const KNOWN_SCOPE = [
  "swn_network_count", "swn_route_length_m", "swn_pipe_material",
  "swn_pipe_grade", "swn_sdr_class", "swn_pipe_outside_diameter_mm",
  "swn_pressure_class", "swn_pipe_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "swn_pipe_retained_spare_m", "swn_pipe_supplier_segment_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "swn_crossing_casing_designation", "swn_crossing_casing_length_m",
  "swn_dewatering_designation", "swn_dewatering_machine_h",
  "swn_road_restoration_designation", "swn_road_restoration_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["swn_network_count", "Количество поселковых водопроводных сетей", "integer", "system", null],
  ["swn_route_length_m", "Проектная длина водопроводной сети", "decimal", "m", null],
  ["swn_pipe_material", "Материал напорной трубы", "text", null, null],
  ["swn_pipe_grade", "Марка материала напорной трубы", "text", null, null],
  ["swn_sdr_class", "Класс SDR напорной трубы", "text", null, null],
  ["swn_pipe_outside_diameter_mm", "Наружный диаметр напорной трубы", "decimal", "mm", null],
  ["swn_pressure_class", "Класс рабочего давления трубы", "text", null, null],
  ["swn_pipe_designation", "Марка выбранной напорной трубы", "text", null, null],
  ["swn_pipe_retained_spare_m", "Сохраняемый резерв трубы", "decimal", "m", null],
  ["swn_pipe_supplier_segment_length_m", "Поставочная длина сегмента трубы", "decimal", "m", null],
  ["swn_trench_excavation_volume_m3", "Проектный объём разработки траншеи", "decimal", "m3", null],
  ["swn_bedding_designation", "Материал основания трубы", "text", null, null],
  ["swn_bedding_volume_m3", "Проектный объём основания трубы", "decimal", "m3", null],
  ["swn_surround_designation", "Материал защитной обсыпки трубы", "text", null, null],
  ["swn_surround_volume_m3", "Проектный объём защитной обсыпки", "decimal", "m3", null],
  ["swn_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["swn_backfill_volume_m3", "Проектный объём обратной засыпки", "decimal", "m3", null],
  ["swn_excess_soil_volume_m3", "Проектный объём вывоза лишнего грунта", "decimal", "m3", null],
  ["swn_joint_designation", "Соединение выбранной трубной системы", "text", null, null],
  ["swn_joint_quantity_piece", "Количество соединений трубы", "decimal", "pcs", null],
  ["swn_fitting_designation", "Фасонные части водопроводной сети", "text", null, null],
  ["swn_fitting_quantity_piece", "Количество фасонных частей", "decimal", "pcs", null],
  ["swn_valve_designation", "Запорная арматура сети", "text", null, null],
  ["swn_valve_quantity_piece", "Количество единиц запорной арматуры", "decimal", "pcs", null],
  ["swn_hydrant_designation", "Пожарный гидрант сети", "text", null, null],
  ["swn_hydrant_quantity_piece", "Количество пожарных гидрантов", "decimal", "pcs", null],
  ["swn_chamber_designation", "Водопроводная камера или колодец", "text", null, null],
  ["swn_chamber_quantity_piece", "Количество камер или колодцев", "decimal", "pcs", null],
  ["swn_cover_designation", "Люк водопроводной камеры", "text", null, null],
  ["swn_cover_quantity_piece", "Количество люков", "decimal", "pcs", null],
  ["swn_warning_tape_designation", "Сигнальная лента водопровода", "text", null, null],
  ["swn_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["swn_flushing_water_volume_m3", "Объём воды для промывки", "decimal", "m3", null],
  ["swn_pressure_test_length_m", "Длина сети для гидравлического испытания", "decimal", "m", null],
  ["swn_disinfection_length_m", "Длина сети для дезинфекции", "decimal", "m", null],
  ["swn_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["swn_survey_labor_h", "Труд геодезического сопровождения", "decimal", "man_hour", null],
  ["swn_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["swn_pipe_appurtenance_install_labor_h", "Труд по монтажу труб и арматуры", "decimal", "man_hour", null],
  ["swn_qa_documentation_labor_h", "Труд по испытаниям и документации", "decimal", "man_hour", null],
  ["swn_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["swn_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["swn_jointing_machine_h", "Работа сварочного оборудования трубы", "decimal", "machine_hour", null],
  ["swn_crane_machine_h", "Работа крана при монтаже камер и арматуры", "decimal", "machine_hour", null],
  ["swn_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["swn_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["swn_crossing_casing_mode", "Футляр на пересечении требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swn_crossing_casing_designation", "Футляр водопровода на пересечении", "text", null, null],
  ["swn_crossing_casing_length_m", "Длина футляра на пересечении", "decimal", "m", null],
  ["swn_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swn_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["swn_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["swn_road_restoration_mode", "Восстановление дороги требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swn_road_restoration_designation", "Конструкция восстановления дороги", "text", null, null],
  ["swn_road_restoration_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("swn_crossing_casing_")
    && parameterId !== "swn_crossing_casing_mode" ? "swn_crossing_casing_mode"
    : parameterId.startsWith("swn_dewatering_") && parameterId !== "swn_dewatering_mode"
      ? "swn_dewatering_mode"
      : parameterId.startsWith("swn_road_restoration_")
        && parameterId !== "swn_road_restoration_mode" ? "swn_road_restoration_mode" : null;
  if (!branch) return {};
  return { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } };
}

export type SettlementWaterNetworkParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};

export const SETTLEMENT_WATER_NETWORK_PARAMETERS:
readonly SettlementWaterNetworkParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "swn_pipe_retained_spare_m"
            ? 0 : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.settlement-water-network-r1",
      semantic_parameter_key: `settlement-water-network:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_NETWORK_TRENCH_APPURTENANCE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану и профилю водопроводной сети.`
          : `${titleRu}: укажите по проекту, спецификации, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_WATER_NETWORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_NETWORK_TRENCH_APPURTENANCE_METHOD_OR_QA_DOCUMENTATION",
        source_document: SETTLEMENT_WATER_NETWORK_SOURCE_ID,
        source_locator: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.exact_locator,
        guide_version: "settlement-water-network-r1",
        source_snapshot_hash: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой наружной поселковой водопроводной сети; внутренние сети, канализация и ливневая сеть исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
    },
  })),
);

export const SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT = Object.freeze({
  swn_pipe_retained_spare_m: 0,
  swn_pipe_supplier_segment_length_m: 1,
});
export const SETTLEMENT_WATER_NETWORK_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const SETTLEMENT_WATER_NETWORK_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [SETTLEMENT_WATER_NETWORK_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{
  rowId: string; section: string; category: string; titleRu: string; unitId: string;
  formulaId: string; expression: string; sourceRole?: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:swn_network_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка поселковой водопроводной сети", unitId: "system", formulaId: "swn_network_count_v1", expression: "swn_network_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn_pipe", section: "Материалы", category: "material", titleRu: "Труба поселковой водопроводной сети", unitId: "m", formulaId: "swn_pipe_order_length_v1", expression: "ceil((swn_route_length_m+swn_pipe_retained_spare_m)/swn_pipe_supplier_segment_length_m)*swn_pipe_supplier_segment_length_m", procurementEligible: true, titleParameterIds: ["swn_pipe_designation", "swn_pipe_material", "swn_pipe_grade", "swn_sdr_class", "swn_pressure_class"] },
  { rowId: "rc09:swn_trench_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншеи водопроводной сети", unitId: "m3", formulaId: "swn_trench_excavation_v1", expression: "swn_trench_excavation_volume_m3" },
  { rowId: "rc09:swn_bedding", section: "Материалы", category: "material", titleRu: "Основание под водопроводную трубу", unitId: "m3", formulaId: "swn_bedding_volume_v1", expression: "swn_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["swn_bedding_designation"] },
  { rowId: "rc09:swn_surround", section: "Материалы", category: "material", titleRu: "Защитная обсыпка водопроводной трубы", unitId: "m3", formulaId: "swn_surround_volume_v1", expression: "swn_surround_volume_m3", procurementEligible: true, titleParameterIds: ["swn_surround_designation"] },
  { rowId: "rc09:swn_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка траншеи водопровода", unitId: "m3", formulaId: "swn_backfill_volume_v1", expression: "swn_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["swn_backfill_designation"] },
  { rowId: "rc09:swn_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "swn_excess_soil_volume_v1", expression: "swn_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:swn_pipe_joint", section: "Комплектующие", category: "material", titleRu: "Соединение напорной трубной системы", unitId: "pcs", formulaId: "swn_joint_quantity_v1", expression: "swn_joint_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_joint_designation"] },
  { rowId: "rc09:swn_fitting", section: "Комплектующие", category: "material", titleRu: "Фасонная часть водопроводной сети", unitId: "pcs", formulaId: "swn_fitting_quantity_v1", expression: "swn_fitting_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_fitting_designation"] },
  { rowId: "rc09:swn_valve", section: "Оборудование", category: "equipment", titleRu: "Запорная арматура водопроводной сети", unitId: "pcs", formulaId: "swn_valve_quantity_v1", expression: "swn_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_valve_designation"] },
  { rowId: "rc09:swn_hydrant", section: "Оборудование", category: "equipment", titleRu: "Пожарный гидрант водопроводной сети", unitId: "pcs", formulaId: "swn_hydrant_quantity_v1", expression: "swn_hydrant_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_hydrant_designation"] },
  { rowId: "rc09:swn_chamber", section: "Сооружения", category: "material", titleRu: "Водопроводная камера или колодец", unitId: "pcs", formulaId: "swn_chamber_quantity_v1", expression: "swn_chamber_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_chamber_designation"] },
  { rowId: "rc09:swn_chamber_cover", section: "Комплектующие", category: "material", titleRu: "Люк водопроводной камеры", unitId: "pcs", formulaId: "swn_cover_quantity_v1", expression: "swn_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["swn_cover_designation"] },
  { rowId: "rc09:swn_warning_tape", section: "Материалы", category: "material", titleRu: "Сигнальная лента водопровода", unitId: "m", formulaId: "swn_warning_tape_length_v1", expression: "swn_warning_tape_length_m", procurementEligible: true, titleParameterIds: ["swn_warning_tape_designation"] },
  { rowId: "rc09:swn_flushing_water", section: "Расходники", category: "material", titleRu: "Вода для промывки сети", unitId: "m3", formulaId: "swn_flushing_water_volume_v1", expression: "swn_flushing_water_volume_m3", procurementEligible: true },
  { rowId: "rc09:swn_pressure_test", section: "Контроль", category: "service", titleRu: "Гидравлическое испытание водопроводной сети", unitId: "m", formulaId: "swn_pressure_test_length_v1", expression: "swn_pressure_test_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn_disinfection", section: "Контроль", category: "service", titleRu: "Промывка и дезинфекция водопроводной сети", unitId: "m", formulaId: "swn_disinfection_length_v1", expression: "swn_disinfection_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn_asbuilt_documents", section: "Документы", category: "service", titleRu: "Комплект исполнительной документации водопровода", unitId: "document", formulaId: "swn_asbuilt_document_count_v1", expression: "swn_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn_crossing_casing", section: "Условные материалы", category: "material", titleRu: "Футляр водопровода на пересечении", unitId: "m", formulaId: "swn_crossing_casing_length_v1", expression: "swn_crossing_casing_length_m", procurementEligible: true, inclusionAst: equals("swn_crossing_casing_mode", "REQUIRED"), titleParameterIds: ["swn_crossing_casing_designation"] },
  { rowId: "rc09:swn_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив при строительстве водопровода", unitId: "machine_hour", formulaId: "swn_dewatering_machine_v1", expression: "swn_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("swn_dewatering_mode", "REQUIRED"), titleParameterIds: ["swn_dewatering_designation"] },
  { rowId: "rc09:swn_road_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дороги над водопроводом", unitId: "m2", formulaId: "swn_road_restoration_area_v1", expression: "swn_road_restoration_area_m2", inclusionAst: equals("swn_road_restoration_mode", "REQUIRED"), titleParameterIds: ["swn_road_restoration_designation"] },
  { rowId: "rc09:swn-pipe-balance:installed-net", section: "Баланс трубы", category: "material", titleRu: "Чистая длина укладываемой трубы", unitId: "m", formulaId: "swn_pipe_installed_net_v1", expression: "swn_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn-pipe-balance:retained-spare", section: "Баланс трубы", category: "material", titleRu: "Сохраняемый резерв трубы", unitId: "m", formulaId: "swn_pipe_retained_spare_v1", expression: "swn_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn-pipe-balance:total-need", section: "Баланс трубы", category: "material", titleRu: "Общая потребность в трубе", unitId: "m", formulaId: "swn_pipe_total_need_v1", expression: "swn_route_length_m+swn_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn-pipe-balance:segment-count", section: "Баланс трубы", category: "material", titleRu: "Количество поставочных сегментов трубы", unitId: "pcs", formulaId: "swn_pipe_segment_count_v1", expression: "ceil((swn_route_length_m+swn_pipe_retained_spare_m)/swn_pipe_supplier_segment_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn-pipe-balance:remainder", section: "Баланс трубы", category: "material", titleRu: "Остаток трубы после монтажа", unitId: "m", formulaId: "swn_pipe_remainder_v1", expression: "ceil((swn_route_length_m+swn_pipe_retained_spare_m)/swn_pipe_supplier_segment_length_m)*swn_pipe_supplier_segment_length_m-swn_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swn-pipe-balance:surplus-beyond-spare", section: "Баланс трубы", category: "material", titleRu: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "swn_pipe_surplus_v1", expression: "max(0,ceil((swn_route_length_m+swn_pipe_retained_spare_m)/swn_pipe_supplier_segment_length_m)*swn_pipe_supplier_segment_length_m-swn_route_length_m-swn_pipe_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:swn-survey", section: "Труд", category: "construction_work", titleRu: "Труд по геодезическому сопровождению водопровода", unitId: "man_hour", formulaId: "swn_survey_labor_v1", expression: "swn_survey_labor_h" },
  { rowId: "rc09:labor:swn-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам водопровода", unitId: "man_hour", formulaId: "swn_earthworks_labor_v1", expression: "swn_earthworks_labor_h" },
  { rowId: "rc09:labor:swn-pipe-appurtenance-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу труб, арматуры и гидрантов", unitId: "man_hour", formulaId: "swn_pipe_appurtenance_install_labor_v1", expression: "swn_pipe_appurtenance_install_labor_h" },
  { rowId: "rc09:labor:swn-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по испытаниям и исполнительной документации", unitId: "man_hour", formulaId: "swn_qa_documentation_labor_v1", expression: "swn_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:swn-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки траншеи", unitId: "machine_hour", formulaId: "swn_excavator_machine_v1", expression: "swn_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swn-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "swn_compactor_machine_v1", expression: "swn_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swn-jointing", section: "Механизмы", category: "equipment", titleRu: "Оборудование сварки напорной трубы", unitId: "machine_hour", formulaId: "swn_jointing_machine_v1", expression: "swn_jointing_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swn-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа камер и арматуры", unitId: "machine_hour", formulaId: "swn_crane_machine_v1", expression: "swn_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:swn-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб, арматуры и материалов", unitId: "trip", formulaId: "swn_delivery_trip_v1", expression: "swn_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:swn-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "swn_removal_trip_v1", expression: "swn_removal_trip_count", procurementEligible: true },
]);

export const SETTLEMENT_WATER_NETWORK_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(ROW_SPECS.map((row) => {
  const compiled = compileFormulaGraph(row.expression);
  return { formula_id: row.formulaId, output_unit_id: row.unitId,
    expression_source: row.expression, ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}));

export const SETTLEMENT_WATER_NETWORK_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(ROW_SPECS.map((row, ordinal) => {
  const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
    semanticOwnerId: `settlement-water-network:${row.rowId}`, costOwner: "resource",
    ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
  const sourceRole = row.sourceRole ?? "APPROVED_WATER_NETWORK_PROJECT_PACKAGE";
  const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
    normativeTrace: [{ sourceId: SETTLEMENT_WATER_NETWORK_SOURCE_ID,
      source_id: SETTLEMENT_WATER_NETWORK_SOURCE_ID,
      normId: SETTLEMENT_WATER_NETWORK_NORM_ID,
      norm_id: SETTLEMENT_WATER_NETWORK_NORM_ID,
      normVersion: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.source_document_version,
      source_title: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.source_title,
      exact_locator: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.exact_locator,
      source_definition_hash: SETTLEMENT_WATER_NETWORK_SOURCE_METADATA.definition_hash,
      sourceRole }], excludedUnownedAssumptions: [
      "generic length-derived trench, bedding, appurtenance, labor or mechanism coefficient",
      "automatic fitting, valve, hydrant or chamber spacing",
      "automatic crossing casing, dewatering or road-restoration selection",
      "automatic retained spare or supplier segment length",
      "building plumbing, sewer or stormwater network", "invented price",
    ] };
  return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
    ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
    unit_id: row.unitId, formula_id: row.formulaId,
    inclusion_ast: row.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: row.procurementEligible ?? false, cost_owner_id: row.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
}));

export const SETTLEMENT_WATER_NETWORK_SHORT_INPUT = Object.freeze({
  swn_network_count: 1,
  swn_route_length_m: 1200,
  swn_pipe_material: "HDPE",
  swn_pipe_grade: "PE100-RC",
  swn_sdr_class: "SDR17",
  swn_pipe_outside_diameter_mm: 160,
  swn_pressure_class: "PN10",
  swn_pipe_designation: "PE100-RC-SDR17-OD160-PN10",
  ...SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT,
});

export const SETTLEMENT_WATER_NETWORK_ACCEPTANCE_INPUT = Object.freeze({
  ...SETTLEMENT_WATER_NETWORK_SHORT_INPUT,
  swn_trench_excavation_volume_m3: 2520,
  swn_bedding_designation: "Песок мытый по проекту",
  swn_bedding_volume_m3: 216,
  swn_surround_designation: "Песок для защитной обсыпки по проекту",
  swn_surround_volume_m3: 504,
  swn_backfill_designation: "Грунт обратной засыпки по балансу",
  swn_backfill_volume_m3: 1560,
  swn_excess_soil_volume_m3: 744,
  swn_joint_designation: "Стыковое сварное соединение PE100-RC OD 160",
  swn_joint_quantity_piece: 99,
  swn_fitting_designation: "Фасонные части PE100-RC OD 160 по ведомости",
  swn_fitting_quantity_piece: 28,
  swn_valve_designation: "Задвижка DN150 PN10 по спецификации",
  swn_valve_quantity_piece: 8,
  swn_hydrant_designation: "Гидрант пожарный по проекту",
  swn_hydrant_quantity_piece: 6,
  swn_chamber_designation: "Камера водопроводная КС-20 по профилю",
  swn_chamber_quantity_piece: 10,
  swn_cover_designation: "Люк тяжёлый D400 по проекту",
  swn_cover_quantity_piece: 10,
  swn_warning_tape_designation: "Лента сигнальная Водопровод",
  swn_warning_tape_length_m: 1260,
  swn_flushing_water_volume_m3: 85,
  swn_pressure_test_length_m: 1200,
  swn_disinfection_length_m: 1200,
  swn_asbuilt_document_count: 1,
  swn_survey_labor_h: 160,
  swn_earthworks_labor_h: 780,
  swn_pipe_appurtenance_install_labor_h: 920,
  swn_qa_documentation_labor_h: 180,
  swn_excavator_machine_h: 280,
  swn_compactor_machine_h: 220,
  swn_jointing_machine_h: 140,
  swn_crane_machine_h: 64,
  swn_delivery_trip_count: 28,
  swn_removal_trip_count: 62,
  swn_crossing_casing_mode: "NOT_REQUIRED",
  swn_dewatering_mode: "NOT_REQUIRED",
  swn_road_restoration_mode: "NOT_REQUIRED",
});

export async function compileSettlementWaterNetworkR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SETTLEMENT_WATER_NETWORK_CATALOG_ID;
  if (catalogId !== SETTLEMENT_WATER_NETWORK_CATALOG_ID) {
    throw new Error(`SETTLEMENT_WATER_NETWORK_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile", compilerVersion: "canonical-estimate-compiler.settlement-water-network-r1",
    catalogId, primaryMeasureParameterId: "swn_network_count",
    parameterDefinitions: [...SETTLEMENT_WATER_NETWORK_PARAMETERS],
    formulaDefinitions: [...SETTLEMENT_WATER_NETWORK_FORMULAS],
    resourceDefinitions: [...SETTLEMENT_WATER_NETWORK_RESOURCES], submittedParameters,
    confirmedParameters: { ...SETTLEMENT_WATER_NETWORK_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value),
  });
}
