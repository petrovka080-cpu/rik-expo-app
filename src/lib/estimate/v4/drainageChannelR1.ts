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
export const DRAINAGE_CHANNEL_CATALOG_ID = "canonical-work:expanded:drainage_channel";
export const DRAINAGE_CHANNEL_SOURCE_ID =
  "project_open_drainage_channel_earthwork_structure_qa_balance_v1";
export const DRAINAGE_CHANNEL_NORM_ID =
  "norm:project:open_drainage_channel:earthwork_structure_qa_balance:v1";
export const DRAINAGE_CHANNEL_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидравлический расчёт, план, профиль и сечение открытого водоотводного канала, спецификация сборных элементов, ППР и программа контроля",
  source_authority: "Проектная организация поверхностного водоотведения, гидролог, инженер-геолог, изготовитель сборных каналов, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_OPEN_DRAINAGE_CHANNEL_EARTHWORK_STRUCTURE_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "0b9b12d24d2e7203cd832343e63a50d420c51b004bfaf6a0e5035c9d6d59c129",
  exact_locator: "Один открытый сборный железобетонный канал длиной 450 м, U600x600-C35/45, уклон 0,003, расчётный расход 250 л/с; земляные объёмы, основание, стыки, переходы, защита, труд, механизмы и логистика — только по проекту",
  use_restriction: "Длина не определяет земляные объёмы, слои основания, стыки, переходы, защиту или восстановление. Водоотлив, крепление выемки и восстановление дороги включаются только по проекту. Трубная ливневая сеть и полное выпускное сооружение исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "0b9b12d24d2e7203cd832343e63a50d420c51b004bfaf6a0e5035c9d6d59c129",
});
const KNOWN_SCOPE = ["dch_channel_count", "dch_route_length_m", "dch_channel_type",
  "dch_channel_material", "dch_internal_width_mm", "dch_internal_depth_mm",
  "dch_slope_m_per_m", "dch_design_flow_lps", "dch_channel_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "dch_channel_retained_spare_m", "dch_channel_supplier_element_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "dch_dewatering_designation", "dch_dewatering_machine_h",
  "dch_shoring_designation", "dch_shoring_area_m2",
  "dch_road_restoration_designation", "dch_road_restoration_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["dch_channel_count", "Количество открытых водоотводных каналов", "integer", "system", null],
  ["dch_route_length_m", "Проектная длина канала", "decimal", "m", null],
  ["dch_channel_type", "Тип канала", "enum", null, ["PRECAST_U_CHANNEL"]],
  ["dch_channel_material", "Материал канала", "text", null, null],
  ["dch_internal_width_mm", "Внутренняя ширина канала", "decimal", "mm", null],
  ["dch_internal_depth_mm", "Внутренняя глубина канала", "decimal", "mm", null],
  ["dch_slope_m_per_m", "Проектный уклон канала", "decimal", "m_per_m", null],
  ["dch_design_flow_lps", "Расчётный расход воды", "decimal", "l_per_s", null],
  ["dch_channel_designation", "Марка выбранного элемента канала", "text", null, null],
  ["dch_channel_retained_spare_m", "Сохраняемый резерв элементов канала по длине", "decimal", "m", null],
  ["dch_channel_supplier_element_length_m", "Поставочная длина элемента канала", "decimal", "m", null],
  ["dch_excavation_volume_m3", "Проектный объём разработки выемки", "decimal", "m3", null],
  ["dch_subbase_designation", "Материал подстилающего слоя", "text", null, null],
  ["dch_subbase_volume_m3", "Проектный объём подстилающего слоя", "decimal", "m3", null],
  ["dch_bedding_designation", "Материал монтажного основания", "text", null, null],
  ["dch_bedding_volume_m3", "Проектный объём монтажного основания", "decimal", "m3", null],
  ["dch_geotextile_designation", "Геотекстиль основания и откосов", "text", null, null],
  ["dch_geotextile_area_m2", "Проектная площадь геотекстиля", "decimal", "m2", null],
  ["dch_joint_seal_designation", "Материал герметизации стыков", "text", null, null],
  ["dch_joint_quantity_piece", "Количество стыков элементов", "decimal", "pcs", null],
  ["dch_cast_concrete_designation", "Монолитный бетон узлов и обойм", "text", null, null],
  ["dch_cast_concrete_volume_m3", "Проектный объём монолитного бетона", "decimal", "m3", null],
  ["dch_inlet_transition_designation", "Входной переход канала", "text", null, null],
  ["dch_inlet_transition_quantity_piece", "Количество входных переходов", "decimal", "pcs", null],
  ["dch_outlet_transition_designation", "Выходной переход канала", "text", null, null],
  ["dch_outlet_transition_quantity_piece", "Количество выходных переходов", "decimal", "pcs", null],
  ["dch_erosion_protection_designation", "Противоэрозионная защита", "text", null, null],
  ["dch_erosion_protection_area_m2", "Площадь противоэрозионной защиты", "decimal", "m2", null],
  ["dch_backfill_designation", "Материал обратной засыпки пазух", "text", null, null],
  ["dch_backfill_volume_m3", "Объём обратной засыпки пазух", "decimal", "m3", null],
  ["dch_excess_soil_volume_m3", "Объём вывоза лишнего грунта", "decimal", "m3", null],
  ["dch_grating_designation", "Защитная решётка участков канала", "text", null, null],
  ["dch_grating_length_m", "Длина защитной решётки", "decimal", "m", null],
  ["dch_flow_test_count", "Количество проверок проливом", "decimal", "test", null],
  ["dch_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["dch_survey_labor_h", "Труд геодезического сопровождения", "decimal", "man_hour", null],
  ["dch_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["dch_channel_install_labor_h", "Труд по монтажу канала и переходов", "decimal", "man_hour", null],
  ["dch_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["dch_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["dch_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["dch_crane_machine_h", "Работа крана при монтаже элементов", "decimal", "machine_hour", null],
  ["dch_survey_equipment_machine_h", "Работа геодезического оборудования", "decimal", "machine_hour", null],
  ["dch_delivery_trip_count", "Рейсы доставки элементов и материалов", "integer", "trip", null],
  ["dch_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["dch_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["dch_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["dch_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["dch_shoring_mode", "Крепление выемки требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["dch_shoring_designation", "Система крепления выемки", "text", null, null],
  ["dch_shoring_area_m2", "Площадь крепления выемки", "decimal", "m2", null],
  ["dch_road_restoration_mode", "Восстановление дороги требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["dch_road_restoration_designation", "Конструкция восстановления дороги", "text", null, null],
  ["dch_road_restoration_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);
function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("dch_dewatering_") && parameterId !== "dch_dewatering_mode"
    ? "dch_dewatering_mode" : parameterId.startsWith("dch_shoring_") && parameterId !== "dch_shoring_mode"
      ? "dch_shoring_mode" : parameterId.startsWith("dch_road_restoration_")
        && parameterId !== "dch_road_restoration_mode" ? "dch_road_restoration_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type DrainageChannelParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const DRAINAGE_CHANNEL_PARAMETERS: readonly DrainageChannelParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "dch_channel_retained_spare_m" ? 0 : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.drainage-channel-r1",
      semantic_parameter_key: `drainage-channel:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_DRAINAGE_CHANNEL_HYDRAULIC_GEOMETRY_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, расчёту, плану, профилю и сечению канала.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_DRAINAGE_CHANNEL_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_DRAINAGE_CHANNEL_PROJECT_DOCUMENTATION",
        source_document: DRAINAGE_CHANNEL_SOURCE_ID,
        source_locator: DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
        guide_version: "drainage-channel-r1",
        source_snapshot_hash: DRAINAGE_CHANNEL_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно определённого открытого водоотводного канала; трубная сеть и полное выпускное сооружение исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false },
  })),
);
export const DRAINAGE_CHANNEL_RUNTIME_INPUT = Object.freeze({
  dch_channel_retained_spare_m: 0, dch_channel_supplier_element_length_m: 1,
});
export const DRAINAGE_CHANNEL_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(DRAINAGE_CHANNEL_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const DRAINAGE_CHANNEL_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(DRAINAGE_CHANNEL_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [DRAINAGE_CHANNEL_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:dch_channel_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка открытого водоотводного канала", unitId: "system", formulaId: "dch_channel_count_v1", expression: "dch_channel_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch_channel_elements", section: "Материалы", category: "material", titleRu: "Сборные элементы водоотводного канала", unitId: "m", formulaId: "dch_channel_order_length_v1", expression: "ceil((dch_route_length_m+dch_channel_retained_spare_m)/dch_channel_supplier_element_length_m)*dch_channel_supplier_element_length_m", procurementEligible: true, titleParameterIds: ["dch_channel_designation", "dch_channel_material"] },
  { rowId: "rc09:dch_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка выемки водоотводного канала", unitId: "m3", formulaId: "dch_excavation_volume_v1", expression: "dch_excavation_volume_m3" },
  { rowId: "rc09:dch_subbase", section: "Материалы", category: "material", titleRu: "Подстилающий слой канала", unitId: "m3", formulaId: "dch_subbase_volume_v1", expression: "dch_subbase_volume_m3", procurementEligible: true, titleParameterIds: ["dch_subbase_designation"] },
  { rowId: "rc09:dch_bedding", section: "Материалы", category: "material", titleRu: "Монтажное основание канала", unitId: "m3", formulaId: "dch_bedding_volume_v1", expression: "dch_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["dch_bedding_designation"] },
  { rowId: "rc09:dch_geotextile", section: "Материалы", category: "material", titleRu: "Геотекстиль основания и откосов", unitId: "m2", formulaId: "dch_geotextile_area_v1", expression: "dch_geotextile_area_m2", procurementEligible: true, titleParameterIds: ["dch_geotextile_designation"] },
  { rowId: "rc09:dch_joint_seal", section: "Расходники", category: "material", titleRu: "Герметизация стыков элементов канала", unitId: "pcs", formulaId: "dch_joint_quantity_v1", expression: "dch_joint_quantity_piece", procurementEligible: true, titleParameterIds: ["dch_joint_seal_designation"] },
  { rowId: "rc09:dch_cast_concrete", section: "Материалы", category: "material", titleRu: "Монолитный бетон узлов и обойм", unitId: "m3", formulaId: "dch_cast_concrete_volume_v1", expression: "dch_cast_concrete_volume_m3", procurementEligible: true, titleParameterIds: ["dch_cast_concrete_designation"] },
  { rowId: "rc09:dch_inlet_transition", section: "Комплектующие", category: "material", titleRu: "Входной переход водоотводного канала", unitId: "pcs", formulaId: "dch_inlet_transition_quantity_v1", expression: "dch_inlet_transition_quantity_piece", procurementEligible: true, titleParameterIds: ["dch_inlet_transition_designation"] },
  { rowId: "rc09:dch_outlet_transition", section: "Комплектующие", category: "material", titleRu: "Выходной переход водоотводного канала", unitId: "pcs", formulaId: "dch_outlet_transition_quantity_v1", expression: "dch_outlet_transition_quantity_piece", procurementEligible: true, titleParameterIds: ["dch_outlet_transition_designation"] },
  { rowId: "rc09:dch_erosion_protection", section: "Материалы", category: "material", titleRu: "Противоэрозионная защита канала", unitId: "m2", formulaId: "dch_erosion_protection_area_v1", expression: "dch_erosion_protection_area_m2", procurementEligible: true, titleParameterIds: ["dch_erosion_protection_designation"] },
  { rowId: "rc09:dch_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка пазух канала", unitId: "m3", formulaId: "dch_backfill_volume_v1", expression: "dch_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["dch_backfill_designation"] },
  { rowId: "rc09:dch_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "dch_excess_soil_volume_v1", expression: "dch_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:dch_grating", section: "Комплектующие", category: "material", titleRu: "Защитная решётка участков канала", unitId: "m", formulaId: "dch_grating_length_v1", expression: "dch_grating_length_m", procurementEligible: true, titleParameterIds: ["dch_grating_designation"] },
  { rowId: "rc09:dch_flow_test", section: "Контроль", category: "service", titleRu: "Проверка канала проливом и актирование уклона", unitId: "test", formulaId: "dch_flow_test_count_v1", expression: "dch_flow_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch_asbuilt_documents", section: "Документы", category: "service", titleRu: "Комплект исполнительной документации канала", unitId: "document", formulaId: "dch_asbuilt_document_count_v1", expression: "dch_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив при строительстве канала", unitId: "machine_hour", formulaId: "dch_dewatering_machine_v1", expression: "dch_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("dch_dewatering_mode", "REQUIRED"), titleParameterIds: ["dch_dewatering_designation"] },
  { rowId: "rc09:dch_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление выемки канала", unitId: "m2", formulaId: "dch_shoring_area_v1", expression: "dch_shoring_area_m2", procurementEligible: true, inclusionAst: equals("dch_shoring_mode", "REQUIRED"), titleParameterIds: ["dch_shoring_designation"] },
  { rowId: "rc09:dch_road_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дороги вдоль канала", unitId: "m2", formulaId: "dch_road_restoration_area_v1", expression: "dch_road_restoration_area_m2", inclusionAst: equals("dch_road_restoration_mode", "REQUIRED"), titleParameterIds: ["dch_road_restoration_designation"] },
  { rowId: "rc09:dch-channel-balance:installed-net", section: "Баланс элементов", category: "material", titleRu: "Чистая длина смонтированного канала", unitId: "m", formulaId: "dch_channel_installed_net_v1", expression: "dch_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch-channel-balance:retained-spare", section: "Баланс элементов", category: "material", titleRu: "Сохраняемый резерв элементов канала", unitId: "m", formulaId: "dch_channel_retained_spare_v1", expression: "dch_channel_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch-channel-balance:total-need", section: "Баланс элементов", category: "material", titleRu: "Общая потребность в элементах канала", unitId: "m", formulaId: "dch_channel_total_need_v1", expression: "dch_route_length_m+dch_channel_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch-channel-balance:element-count", section: "Баланс элементов", category: "material", titleRu: "Количество поставочных элементов канала", unitId: "pcs", formulaId: "dch_channel_element_count_v1", expression: "ceil((dch_route_length_m+dch_channel_retained_spare_m)/dch_channel_supplier_element_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch-channel-balance:remainder", section: "Баланс элементов", category: "material", titleRu: "Остаток элементов после монтажа", unitId: "m", formulaId: "dch_channel_remainder_v1", expression: "ceil((dch_route_length_m+dch_channel_retained_spare_m)/dch_channel_supplier_element_length_m)*dch_channel_supplier_element_length_m-dch_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:dch-channel-balance:surplus-beyond-spare", section: "Баланс элементов", category: "material", titleRu: "Свободный остаток элементов сверх резерва", unitId: "m", formulaId: "dch_channel_surplus_v1", expression: "max(0,ceil((dch_route_length_m+dch_channel_retained_spare_m)/dch_channel_supplier_element_length_m)*dch_channel_supplier_element_length_m-dch_route_length_m-dch_channel_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:dch-survey", section: "Труд", category: "construction_work", titleRu: "Труд по геодезическому сопровождению", unitId: "man_hour", formulaId: "dch_survey_labor_v1", expression: "dch_survey_labor_h" },
  { rowId: "rc09:labor:dch-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "dch_earthworks_labor_v1", expression: "dch_earthworks_labor_h" },
  { rowId: "rc09:labor:dch-channel-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу канала и переходов", unitId: "man_hour", formulaId: "dch_channel_install_labor_v1", expression: "dch_channel_install_labor_h" },
  { rowId: "rc09:labor:dch-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по контролю и документации", unitId: "man_hour", formulaId: "dch_qa_documentation_labor_v1", expression: "dch_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:dch-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки выемки", unitId: "machine_hour", formulaId: "dch_excavator_machine_v1", expression: "dch_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:dch-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм послойного уплотнения", unitId: "machine_hour", formulaId: "dch_compactor_machine_v1", expression: "dch_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:dch-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа элементов канала", unitId: "machine_hour", formulaId: "dch_crane_machine_v1", expression: "dch_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:dch-survey", section: "Механизмы", category: "equipment", titleRu: "Геодезическое оборудование контроля профиля", unitId: "machine_hour", formulaId: "dch_survey_equipment_machine_v1", expression: "dch_survey_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:dch-delivery", section: "Логистика", category: "service", titleRu: "Доставка элементов канала и материалов", unitId: "trip", formulaId: "dch_delivery_trip_v1", expression: "dch_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:dch-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "dch_removal_trip_v1", expression: "dch_removal_trip_count", procurementEligible: true },
]);
export const DRAINAGE_CHANNEL_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const DRAINAGE_CHANNEL_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `drainage-channel:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_DRAINAGE_CHANNEL_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: DRAINAGE_CHANNEL_SOURCE_ID,
        source_id: DRAINAGE_CHANNEL_SOURCE_ID, normId: DRAINAGE_CHANNEL_NORM_ID,
        norm_id: DRAINAGE_CHANNEL_NORM_ID,
        normVersion: DRAINAGE_CHANNEL_SOURCE_METADATA.source_document_version,
        source_title: DRAINAGE_CHANNEL_SOURCE_METADATA.source_title,
        exact_locator: DRAINAGE_CHANNEL_SOURCE_METADATA.exact_locator,
        source_definition_hash: DRAINAGE_CHANNEL_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["stormwater pipe, inlet, manhole, silt-trap or full outlet scope",
        "generic length-derived excavation, lining, restoration, labor or mechanism coefficient",
        "automatic transition, joint, dewatering, shoring or road-restoration selection",
        "automatic retained spare or supplier element length", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const DRAINAGE_CHANNEL_SHORT_INPUT = Object.freeze({
  dch_channel_count: 1, dch_route_length_m: 450, dch_channel_type: "PRECAST_U_CHANNEL",
  dch_channel_material: "RC_C35_45", dch_internal_width_mm: 600,
  dch_internal_depth_mm: 600, dch_slope_m_per_m: 0.003, dch_design_flow_lps: 250,
  dch_channel_designation: "U600x600-C35/45", ...DRAINAGE_CHANNEL_RUNTIME_INPUT,
});
export const DRAINAGE_CHANNEL_ACCEPTANCE_INPUT = Object.freeze({
  ...DRAINAGE_CHANNEL_SHORT_INPUT,
  dch_excavation_volume_m3: 720,
  dch_subbase_designation: "Щебень фракции по проекту", dch_subbase_volume_m3: 90,
  dch_bedding_designation: "Бетонная подготовка B7.5", dch_bedding_volume_m3: 54,
  dch_geotextile_designation: "Геотекстиль 300 г/м²", dch_geotextile_area_m2: 1080,
  dch_joint_seal_designation: "Гидрофильный шнур и герметик по системе", dch_joint_quantity_piece: 224,
  dch_cast_concrete_designation: "Бетон C25/30 узлов и обойм", dch_cast_concrete_volume_m3: 32,
  dch_inlet_transition_designation: "Входной переход по ведомости", dch_inlet_transition_quantity_piece: 12,
  dch_outlet_transition_designation: "Выходной переход к выпуску", dch_outlet_transition_quantity_piece: 1,
  dch_erosion_protection_designation: "Каменная наброска по геотекстилю", dch_erosion_protection_area_m2: 180,
  dch_backfill_designation: "Щебёночно-песчаная смесь пазух", dch_backfill_volume_m3: 250,
  dch_excess_soil_volume_m3: 470,
  dch_grating_designation: "Решётка оцинкованная тяжёлая", dch_grating_length_m: 60,
  dch_flow_test_count: 9, dch_asbuilt_document_count: 1,
  dch_survey_labor_h: 96, dch_earthworks_labor_h: 360,
  dch_channel_install_labor_h: 520, dch_qa_documentation_labor_h: 104,
  dch_excavator_machine_h: 126, dch_compactor_machine_h: 88,
  dch_crane_machine_h: 118, dch_survey_equipment_machine_h: 64,
  dch_delivery_trip_count: 30, dch_removal_trip_count: 39,
  dch_dewatering_mode: "NOT_REQUIRED", dch_shoring_mode: "NOT_REQUIRED",
  dch_road_restoration_mode: "NOT_REQUIRED",
});
export async function compileDrainageChannelR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? DRAINAGE_CHANNEL_CATALOG_ID;
  if (catalogId !== DRAINAGE_CHANNEL_CATALOG_ID) {
    throw new Error(`DRAINAGE_CHANNEL_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.drainage-channel-r1",
    catalogId, primaryMeasureParameterId: "dch_channel_count",
    parameterDefinitions: [...DRAINAGE_CHANNEL_PARAMETERS],
    formulaDefinitions: [...DRAINAGE_CHANNEL_FORMULAS],
    resourceDefinitions: [...DRAINAGE_CHANNEL_RESOURCES], submittedParameters,
    confirmedParameters: { ...DRAINAGE_CHANNEL_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
