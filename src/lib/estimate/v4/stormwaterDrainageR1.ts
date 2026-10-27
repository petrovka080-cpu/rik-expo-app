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
export const STORMWATER_DRAINAGE_CATALOG_ID = "canonical-work:expanded:stormwater_drainage";
export const STORMWATER_DRAINAGE_SOURCE_ID =
  "project_stormwater_drainage_pipe_earthwork_structure_qa_balance_v1";
export const STORMWATER_DRAINAGE_NORM_ID =
  "norm:project:stormwater_drainage:pipe_earthwork_structure_qa_balance:v1";
export const STORMWATER_DRAINAGE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидравлический расчёт, план и профиль ливневой сети, спецификации труб, дождеприёмников, колодцев и пескоуловителей, ППР и программа контроля",
  source_authority: "Проектная организация ливневого водоотведения, гидролог, инженер-геолог, изготовитель трубной системы, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_STORMWATER_DRAINAGE_PIPE_EARTHWORK_STRUCTURE_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "48c8756156b9ba677a3ed7fb0d8bf2f34c8c858a03f0fcda5233c42c0731bd05",
  exact_locator: "Одна ливневая сеть, 900 м выбранной трубы PVC-U SN8 OD 315 с уклоном 0,005 и расходом 80 л/с; земляные объёмы, дождеприёмники, колодцы, пескоуловители, контроль, труд, механизмы и логистика — только по проекту",
  use_restriction: "Длина не определяет траншею, восстановление, дождеприёмники, колодцы, пескоуловители или узлы. Водоотлив, крепление и восстановление дороги включаются только по проекту. Санитарная канализация и полное выпускное сооружение исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "48c8756156b9ba677a3ed7fb0d8bf2f34c8c858a03f0fcda5233c42c0731bd05",
});
const KNOWN_SCOPE = ["swd_network_count", "swd_route_length_m", "swd_pipe_material",
  "swd_ring_stiffness_class", "swd_pipe_outside_diameter_mm", "swd_slope_m_per_m",
  "swd_design_flow_lps", "swd_pipe_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "swd_pipe_retained_spare_m", "swd_pipe_supplier_segment_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "swd_dewatering_designation", "swd_dewatering_machine_h",
  "swd_shoring_designation", "swd_shoring_area_m2",
  "swd_road_restoration_designation", "swd_road_restoration_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["swd_network_count", "Количество ливневых водоотводных сетей", "integer", "system", null],
  ["swd_route_length_m", "Проектная длина ливневой сети", "decimal", "m", null],
  ["swd_pipe_material", "Материал ливневой трубы", "text", null, null],
  ["swd_ring_stiffness_class", "Класс кольцевой жёсткости трубы", "text", null, null],
  ["swd_pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["swd_slope_m_per_m", "Проектный уклон ливневой трубы", "decimal", "m_per_m", null],
  ["swd_design_flow_lps", "Расчётный расход ливневого стока", "decimal", "l_per_s", null],
  ["swd_pipe_designation", "Марка выбранной ливневой трубы", "text", null, null],
  ["swd_pipe_retained_spare_m", "Сохраняемый резерв трубы", "decimal", "m", null],
  ["swd_pipe_supplier_segment_length_m", "Поставочная длина сегмента трубы", "decimal", "m", null],
  ["swd_trench_excavation_volume_m3", "Проектный объём разработки траншеи", "decimal", "m3", null],
  ["swd_bedding_designation", "Материал основания трубы", "text", null, null],
  ["swd_bedding_volume_m3", "Проектный объём основания трубы", "decimal", "m3", null],
  ["swd_surround_designation", "Материал защитной обсыпки", "text", null, null],
  ["swd_surround_volume_m3", "Проектный объём защитной обсыпки", "decimal", "m3", null],
  ["swd_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["swd_backfill_volume_m3", "Проектный объём обратной засыпки", "decimal", "m3", null],
  ["swd_excess_soil_volume_m3", "Проектный объём вывоза лишнего грунта", "decimal", "m3", null],
  ["swd_seal_designation", "Уплотнение выбранной трубной системы", "text", null, null],
  ["swd_seal_quantity_piece", "Количество уплотнений", "decimal", "pcs", null],
  ["swd_fitting_designation", "Фасонные части ливневой сети", "text", null, null],
  ["swd_fitting_quantity_piece", "Количество фасонных частей", "decimal", "pcs", null],
  ["swd_inlet_designation", "Дождеприёмник ливневой сети", "text", null, null],
  ["swd_inlet_quantity_piece", "Количество дождеприёмников", "decimal", "pcs", null],
  ["swd_manhole_designation", "Смотровой колодец ливневой сети", "text", null, null],
  ["swd_manhole_quantity_piece", "Количество смотровых колодцев", "decimal", "pcs", null],
  ["swd_cover_designation", "Люк смотрового колодца", "text", null, null],
  ["swd_cover_quantity_piece", "Количество люков", "decimal", "pcs", null],
  ["swd_silt_trap_designation", "Пескоуловитель ливневой сети", "text", null, null],
  ["swd_silt_trap_quantity_piece", "Количество пескоуловителей", "decimal", "pcs", null],
  ["swd_outlet_interface_designation", "Интерфейс подключения к выпуску или очистке", "text", null, null],
  ["swd_outlet_interface_quantity_piece", "Количество интерфейсов выпуска или очистки", "decimal", "pcs", null],
  ["swd_warning_tape_designation", "Сигнальная лента ливневой сети", "text", null, null],
  ["swd_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["swd_leak_test_count", "Количество испытаний участков", "decimal", "test", null],
  ["swd_cctv_inspection_length_m", "Длина телевизионной инспекции", "decimal", "m", null],
  ["swd_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["swd_survey_labor_h", "Труд геодезического сопровождения", "decimal", "man_hour", null],
  ["swd_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["swd_pipe_structure_install_labor_h", "Труд по монтажу труб и сооружений", "decimal", "man_hour", null],
  ["swd_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["swd_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["swd_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["swd_pipe_laser_machine_h", "Работа прибора контроля уклона", "decimal", "machine_hour", null],
  ["swd_crane_machine_h", "Работа крана при монтаже сооружений", "decimal", "machine_hour", null],
  ["swd_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["swd_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["swd_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swd_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["swd_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["swd_shoring_mode", "Крепление траншеи требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swd_shoring_designation", "Система крепления траншеи", "text", null, null],
  ["swd_shoring_area_m2", "Площадь крепления траншеи", "decimal", "m2", null],
  ["swd_road_restoration_mode", "Восстановление дороги требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["swd_road_restoration_designation", "Конструкция восстановления дороги", "text", null, null],
  ["swd_road_restoration_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);
function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("swd_dewatering_") && parameterId !== "swd_dewatering_mode"
    ? "swd_dewatering_mode" : parameterId.startsWith("swd_shoring_") && parameterId !== "swd_shoring_mode"
      ? "swd_shoring_mode" : parameterId.startsWith("swd_road_restoration_")
        && parameterId !== "swd_road_restoration_mode" ? "swd_road_restoration_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type StormwaterDrainageParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const STORMWATER_DRAINAGE_PARAMETERS: readonly StormwaterDrainageParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "swd_pipe_retained_spare_m" ? 0 : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.stormwater-drainage-r1",
      semantic_parameter_key: `stormwater-drainage:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_STORMWATER_HYDRAULIC_ROUTE_STRUCTURE_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, расчёту, плану и профилю ливневой сети.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_STORMWATER_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_STORMWATER_PROJECT_DOCUMENTATION",
        source_document: STORMWATER_DRAINAGE_SOURCE_ID,
        source_locator: STORMWATER_DRAINAGE_SOURCE_METADATA.exact_locator,
        guide_version: "stormwater-drainage-r1",
        source_snapshot_hash: STORMWATER_DRAINAGE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённой ливневой сети; санитарная канализация и полное выпускное сооружение исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false },
  })),
);
export const STORMWATER_DRAINAGE_RUNTIME_INPUT = Object.freeze({
  swd_pipe_retained_spare_m: 0, swd_pipe_supplier_segment_length_m: 1,
});
export const STORMWATER_DRAINAGE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(STORMWATER_DRAINAGE_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const STORMWATER_DRAINAGE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(STORMWATER_DRAINAGE_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [STORMWATER_DRAINAGE_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:swd_network_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка ливневой канализации", unitId: "system", formulaId: "swd_network_count_v1", expression: "swd_network_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd_pipe", section: "Материалы", category: "material", titleRu: "Труба ливневой сети", unitId: "m", formulaId: "swd_pipe_order_length_v1", expression: "ceil((swd_route_length_m+swd_pipe_retained_spare_m)/swd_pipe_supplier_segment_length_m)*swd_pipe_supplier_segment_length_m", procurementEligible: true, titleParameterIds: ["swd_pipe_designation", "swd_pipe_material", "swd_ring_stiffness_class"] },
  { rowId: "rc09:swd_trench_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка траншеи ливневой сети", unitId: "m3", formulaId: "swd_trench_excavation_v1", expression: "swd_trench_excavation_volume_m3" },
  { rowId: "rc09:swd_bedding", section: "Материалы", category: "material", titleRu: "Основание под ливневую трубу", unitId: "m3", formulaId: "swd_bedding_volume_v1", expression: "swd_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["swd_bedding_designation"] },
  { rowId: "rc09:swd_surround", section: "Материалы", category: "material", titleRu: "Защитная обсыпка ливневой трубы", unitId: "m3", formulaId: "swd_surround_volume_v1", expression: "swd_surround_volume_m3", procurementEligible: true, titleParameterIds: ["swd_surround_designation"] },
  { rowId: "rc09:swd_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка траншеи", unitId: "m3", formulaId: "swd_backfill_volume_v1", expression: "swd_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["swd_backfill_designation"] },
  { rowId: "rc09:swd_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "swd_excess_soil_volume_v1", expression: "swd_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:swd_pipe_seal", section: "Комплектующие", category: "material", titleRu: "Уплотнение трубной системы", unitId: "pcs", formulaId: "swd_seal_quantity_v1", expression: "swd_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_seal_designation"] },
  { rowId: "rc09:swd_fitting", section: "Комплектующие", category: "material", titleRu: "Фасонная часть ливневой сети", unitId: "pcs", formulaId: "swd_fitting_quantity_v1", expression: "swd_fitting_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_fitting_designation"] },
  { rowId: "rc09:swd_inlet", section: "Сооружения", category: "material", titleRu: "Дождеприёмник ливневой сети", unitId: "pcs", formulaId: "swd_inlet_quantity_v1", expression: "swd_inlet_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_inlet_designation"] },
  { rowId: "rc09:swd_manhole", section: "Сооружения", category: "material", titleRu: "Смотровой колодец ливневой сети", unitId: "pcs", formulaId: "swd_manhole_quantity_v1", expression: "swd_manhole_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_manhole_designation"] },
  { rowId: "rc09:swd_manhole_cover", section: "Комплектующие", category: "material", titleRu: "Люк смотрового колодца", unitId: "pcs", formulaId: "swd_cover_quantity_v1", expression: "swd_cover_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_cover_designation"] },
  { rowId: "rc09:swd_silt_trap", section: "Сооружения", category: "equipment", titleRu: "Пескоуловитель ливневой сети", unitId: "pcs", formulaId: "swd_silt_trap_quantity_v1", expression: "swd_silt_trap_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_silt_trap_designation"] },
  { rowId: "rc09:swd_outlet_interface", section: "Сооружения", category: "material", titleRu: "Интерфейс подключения к выпуску или очистке", unitId: "pcs", formulaId: "swd_outlet_interface_quantity_v1", expression: "swd_outlet_interface_quantity_piece", procurementEligible: true, titleParameterIds: ["swd_outlet_interface_designation"] },
  { rowId: "rc09:swd_warning_tape", section: "Материалы", category: "material", titleRu: "Сигнальная лента ливневой сети", unitId: "m", formulaId: "swd_warning_tape_length_v1", expression: "swd_warning_tape_length_m", procurementEligible: true, titleParameterIds: ["swd_warning_tape_designation"] },
  { rowId: "rc09:swd_leak_test", section: "Контроль", category: "service", titleRu: "Испытание участков ливневой сети", unitId: "test", formulaId: "swd_leak_test_count_v1", expression: "swd_leak_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd_cctv_inspection", section: "Контроль", category: "service", titleRu: "Телевизионная инспекция ливневой сети", unitId: "m", formulaId: "swd_cctv_inspection_length_v1", expression: "swd_cctv_inspection_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd_asbuilt_documents", section: "Документы", category: "service", titleRu: "Комплект исполнительной документации ливневой сети", unitId: "document", formulaId: "swd_asbuilt_document_count_v1", expression: "swd_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив при строительстве ливневой сети", unitId: "machine_hour", formulaId: "swd_dewatering_machine_v1", expression: "swd_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("swd_dewatering_mode", "REQUIRED"), titleParameterIds: ["swd_dewatering_designation"] },
  { rowId: "rc09:swd_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление траншеи ливневой сети", unitId: "m2", formulaId: "swd_shoring_area_v1", expression: "swd_shoring_area_m2", procurementEligible: true, inclusionAst: equals("swd_shoring_mode", "REQUIRED"), titleParameterIds: ["swd_shoring_designation"] },
  { rowId: "rc09:swd_road_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дороги над ливневой сетью", unitId: "m2", formulaId: "swd_road_restoration_area_v1", expression: "swd_road_restoration_area_m2", inclusionAst: equals("swd_road_restoration_mode", "REQUIRED"), titleParameterIds: ["swd_road_restoration_designation"] },
  { rowId: "rc09:swd-pipe-balance:installed-net", section: "Баланс трубы", category: "material", titleRu: "Чистая длина укладываемой трубы", unitId: "m", formulaId: "swd_pipe_installed_net_v1", expression: "swd_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd-pipe-balance:retained-spare", section: "Баланс трубы", category: "material", titleRu: "Сохраняемый резерв трубы", unitId: "m", formulaId: "swd_pipe_retained_spare_v1", expression: "swd_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd-pipe-balance:total-need", section: "Баланс трубы", category: "material", titleRu: "Общая потребность в трубе", unitId: "m", formulaId: "swd_pipe_total_need_v1", expression: "swd_route_length_m+swd_pipe_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd-pipe-balance:segment-count", section: "Баланс трубы", category: "material", titleRu: "Количество поставочных сегментов трубы", unitId: "pcs", formulaId: "swd_pipe_segment_count_v1", expression: "ceil((swd_route_length_m+swd_pipe_retained_spare_m)/swd_pipe_supplier_segment_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd-pipe-balance:remainder", section: "Баланс трубы", category: "material", titleRu: "Остаток трубы после монтажа", unitId: "m", formulaId: "swd_pipe_remainder_v1", expression: "ceil((swd_route_length_m+swd_pipe_retained_spare_m)/swd_pipe_supplier_segment_length_m)*swd_pipe_supplier_segment_length_m-swd_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:swd-pipe-balance:surplus-beyond-spare", section: "Баланс трубы", category: "material", titleRu: "Свободный остаток трубы сверх резерва", unitId: "m", formulaId: "swd_pipe_surplus_v1", expression: "max(0,ceil((swd_route_length_m+swd_pipe_retained_spare_m)/swd_pipe_supplier_segment_length_m)*swd_pipe_supplier_segment_length_m-swd_route_length_m-swd_pipe_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:swd-survey", section: "Труд", category: "construction_work", titleRu: "Труд по геодезическому сопровождению", unitId: "man_hour", formulaId: "swd_survey_labor_v1", expression: "swd_survey_labor_h" },
  { rowId: "rc09:labor:swd-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "swd_earthworks_labor_v1", expression: "swd_earthworks_labor_h" },
  { rowId: "rc09:labor:swd-pipe-structure-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу труб и сооружений", unitId: "man_hour", formulaId: "swd_pipe_structure_install_labor_v1", expression: "swd_pipe_structure_install_labor_h" },
  { rowId: "rc09:labor:swd-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по контролю и документации", unitId: "man_hour", formulaId: "swd_qa_documentation_labor_v1", expression: "swd_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:swd-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки траншеи", unitId: "machine_hour", formulaId: "swd_excavator_machine_v1", expression: "swd_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swd-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "swd_compactor_machine_v1", expression: "swd_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swd-pipe-laser", section: "Механизмы", category: "equipment", titleRu: "Лазерный прибор контроля уклона", unitId: "machine_hour", formulaId: "swd_pipe_laser_machine_v1", expression: "swd_pipe_laser_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:swd-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа сооружений", unitId: "machine_hour", formulaId: "swd_crane_machine_v1", expression: "swd_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:swd-delivery", section: "Логистика", category: "service", titleRu: "Доставка труб и сооружений", unitId: "trip", formulaId: "swd_delivery_trip_v1", expression: "swd_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:swd-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "swd_removal_trip_v1", expression: "swd_removal_trip_count", procurementEligible: true },
]);
export const STORMWATER_DRAINAGE_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const STORMWATER_DRAINAGE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `stormwater-drainage:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_STORMWATER_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: STORMWATER_DRAINAGE_SOURCE_ID,
        source_id: STORMWATER_DRAINAGE_SOURCE_ID, normId: STORMWATER_DRAINAGE_NORM_ID,
        norm_id: STORMWATER_DRAINAGE_NORM_ID,
        normVersion: STORMWATER_DRAINAGE_SOURCE_METADATA.source_document_version,
        source_title: STORMWATER_DRAINAGE_SOURCE_METADATA.source_title,
        exact_locator: STORMWATER_DRAINAGE_SOURCE_METADATA.exact_locator,
        source_definition_hash: STORMWATER_DRAINAGE_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["generic length-derived trench, restoration, labor or mechanism coefficient",
        "automatic inlet, manhole, silt-trap or connection-node spacing",
        "automatic dewatering, shoring or road-restoration selection",
        "automatic retained spare or supplier segment length",
        "sanitary sewer, pressure sewer or full outlet structure", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const STORMWATER_DRAINAGE_SHORT_INPUT = Object.freeze({
  swd_network_count: 1, swd_route_length_m: 900, swd_pipe_material: "PVC-U",
  swd_ring_stiffness_class: "SN8", swd_pipe_outside_diameter_mm: 315,
  swd_slope_m_per_m: 0.005, swd_design_flow_lps: 80,
  swd_pipe_designation: "PVC-U-SN8-OD315", ...STORMWATER_DRAINAGE_RUNTIME_INPUT,
});
export const STORMWATER_DRAINAGE_ACCEPTANCE_INPUT = Object.freeze({
  ...STORMWATER_DRAINAGE_SHORT_INPUT,
  swd_trench_excavation_volume_m3: 2160,
  swd_bedding_designation: "Песок мытый по проекту", swd_bedding_volume_m3: 180,
  swd_surround_designation: "Песок защитной обсыпки по проекту", swd_surround_volume_m3: 405,
  swd_backfill_designation: "Грунт обратной засыпки по балансу", swd_backfill_volume_m3: 1320,
  swd_excess_soil_volume_m3: 660,
  swd_seal_designation: "Кольцо уплотнительное PVC-U OD 315", swd_seal_quantity_piece: 155,
  swd_fitting_designation: "Фасонные части PVC-U SN8 OD 315 по ведомости", swd_fitting_quantity_piece: 22,
  swd_inlet_designation: "Дождеприёмник ДБ по плану", swd_inlet_quantity_piece: 30,
  swd_manhole_designation: "Колодец ливневой сети КС-15", swd_manhole_quantity_piece: 16,
  swd_cover_designation: "Люк тяжёлый D400 по проекту", swd_cover_quantity_piece: 16,
  swd_silt_trap_designation: "Пескоуловитель по гидравлической схеме", swd_silt_trap_quantity_piece: 4,
  swd_outlet_interface_designation: "Узел подключения к очистному сооружению", swd_outlet_interface_quantity_piece: 1,
  swd_warning_tape_designation: "Лента сигнальная Ливневая канализация", swd_warning_tape_length_m: 945,
  swd_leak_test_count: 15, swd_cctv_inspection_length_m: 900, swd_asbuilt_document_count: 1,
  swd_survey_labor_h: 140, swd_earthworks_labor_h: 640,
  swd_pipe_structure_install_labor_h: 760, swd_qa_documentation_labor_h: 160,
  swd_excavator_machine_h: 220, swd_compactor_machine_h: 180,
  swd_pipe_laser_machine_h: 110, swd_crane_machine_h: 72,
  swd_delivery_trip_count: 24, swd_removal_trip_count: 54,
  swd_dewatering_mode: "NOT_REQUIRED", swd_shoring_mode: "NOT_REQUIRED",
  swd_road_restoration_mode: "NOT_REQUIRED",
});
export async function compileStormwaterDrainageR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STORMWATER_DRAINAGE_CATALOG_ID;
  if (catalogId !== STORMWATER_DRAINAGE_CATALOG_ID) {
    throw new Error(`STORMWATER_DRAINAGE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.stormwater-drainage-r1",
    catalogId, primaryMeasureParameterId: "swd_network_count",
    parameterDefinitions: [...STORMWATER_DRAINAGE_PARAMETERS],
    formulaDefinitions: [...STORMWATER_DRAINAGE_FORMULAS],
    resourceDefinitions: [...STORMWATER_DRAINAGE_RESOURCES], submittedParameters,
    confirmedParameters: { ...STORMWATER_DRAINAGE_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
