import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const OUTFALL_STRUCTURE_CATALOG_ID = "canonical-work:expanded:outfall_structure";
export const OUTFALL_STRUCTURE_SOURCE_ID = "project_rc_river_outfall_structure_balance_v1";
export const OUTFALL_STRUCTURE_NORM_ID = "norm:project:rc_river_outfall_structure_balance:v1";
export const OUTFALL_STRUCTURE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый гидравлический и конструктивный проект выпускного сооружения, ведомость объёмов, ППР и программа контроля качества",
  source_authority: "Проектировщик гидравлической и железобетонной части, геотехнический проектировщик, поставщики бетона и арматуры, строительная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_RC_RIVER_OUTFALL_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "aaea3b667c468781dbfa3c35412172940c19db147978e2a1463962ec2f58f330",
  exact_locator: "1 монолитный железобетонный выпускной оголовок OF-RC-DN600-Q450-C3037 на берегу реки, DN 600, 450 л/с, 4,5x3,2x2,4 м, бетон C30/37 W8 F200, 28 м3 конструкционного бетона",
  use_restriction: "Количество и габариты не определяют автоматически материалы, земляные работы, труд, механизмы или логистику. Водоотлив, укрепление берега и врезка в действующий трубопровод включаются только по проекту. Подводящий трубопровод, колодцы, испытание сети и невыбранное технологическое оборудование исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "aaea3b667c468781dbfa3c35412172940c19db147978e2a1463962ec2f58f330",
});

const KNOWN_SCOPE = ["out_structure_count", "out_structure_type", "out_structure_designation",
  "out_receiving_environment", "out_outlet_pipe_diameter_mm", "out_design_discharge_lps",
  "out_structure_length_m", "out_structure_width_m", "out_structure_height_m",
  "out_concrete_class", "out_watertightness_class", "out_frost_resistance_class",
  "out_structural_concrete_installed_volume_m3"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "out_concrete_process_allowance_m3", "out_concrete_supplier_batch_m3",
]);
const CONDITIONAL_DETAILS = new Set([
  "out_dewatering_designation", "out_dewatering_machine_h",
  "out_bank_protection_designation", "out_bank_protection_area_m2",
  "out_live_tie_in_designation", "out_live_tie_in_count",
]);
const PARAMETER_SPECS = Object.freeze([
  ["out_structure_count", "Количество выпускных сооружений", "integer", "piece", null],
  ["out_structure_type", "Тип выпускного сооружения", "enum", null, ["CAST_IN_PLACE_RC_HEADWALL"]],
  ["out_structure_designation", "Марка выпускного сооружения", "text", null, null],
  ["out_receiving_environment", "Принимающая среда", "enum", null, ["RIVER_BANK"]],
  ["out_outlet_pipe_diameter_mm", "Диаметр выпускного трубопровода", "decimal", "mm", null],
  ["out_design_discharge_lps", "Расчётный расход выпуска", "decimal", "l_per_s", null],
  ["out_structure_length_m", "Проектная длина сооружения", "decimal", "m", null],
  ["out_structure_width_m", "Проектная ширина сооружения", "decimal", "m", null],
  ["out_structure_height_m", "Проектная высота сооружения", "decimal", "m", null],
  ["out_concrete_class", "Класс конструкционного бетона", "text", null, null],
  ["out_watertightness_class", "Марка бетона по водонепроницаемости", "text", null, null],
  ["out_frost_resistance_class", "Марка бетона по морозостойкости", "text", null, null],
  ["out_structural_concrete_installed_volume_m3", "Проектный объём уложенного конструкционного бетона", "decimal", "m3", null],
  ["out_concrete_process_allowance_m3", "Технологический запас конструкционного бетона", "decimal", "m3", null],
  ["out_concrete_supplier_batch_m3", "Объём одной поставочной партии бетона", "decimal", "m3", null],
  ["out_rebar_designation", "Класс и марка арматуры", "text", null, null],
  ["out_rebar_mass_kg", "Проектная масса арматуры", "decimal", "kg", null],
  ["out_formwork_area_m2", "Площадь опалубки", "decimal", "m2", null],
  ["out_embedded_parts_designation", "Марка закладных деталей", "text", null, null],
  ["out_embedded_parts_quantity_piece", "Количество закладных деталей", "integer", "piece", null],
  ["out_waterproofing_designation", "Марка гидроизоляции", "text", null, null],
  ["out_waterproofing_area_m2", "Площадь гидроизоляции", "decimal", "m2", null],
  ["out_joint_material_designation", "Марка материала рабочих и деформационных швов", "text", null, null],
  ["out_joint_material_length_m", "Длина материала швов", "decimal", "m", null],
  ["out_apron_material_designation", "Материал выпускного фартука", "text", null, null],
  ["out_apron_material_volume_m3", "Объём материала выпускного фартука", "decimal", "m3", null],
  ["out_energy_dissipator_designation", "Марка элементов гашения энергии", "text", null, null],
  ["out_energy_dissipator_quantity_piece", "Количество элементов гашения энергии", "integer", "piece", null],
  ["out_excavation_volume_m3", "Объём разработки котлована", "decimal", "m3", null],
  ["out_backfill_volume_m3", "Объём проектной обратной засыпки", "decimal", "m3", null],
  ["out_spoil_disposal_volume_m3", "Объём вывоза излишнего грунта", "decimal", "m3", null],
  ["out_concrete_test_count", "Количество испытаний бетона", "integer", "test", null],
  ["out_survey_control_set_count", "Комплекты геодезического контроля", "integer", "set", null],
  ["out_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["out_setting_out_preparation_labor_h", "Труд на разбивку и подготовку", "decimal", "man_hour", null],
  ["out_formwork_rebar_labor_h", "Труд на опалубку и армирование", "decimal", "man_hour", null],
  ["out_concrete_labor_h", "Труд на бетонирование", "decimal", "man_hour", null],
  ["out_apron_dissipator_labor_h", "Труд на фартук и гасители энергии", "decimal", "man_hour", null],
  ["out_qa_documentation_labor_h", "Труд на контроль качества и оформление", "decimal", "man_hour", null],
  ["out_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["out_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["out_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["out_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["out_generator_machine_h", "Работа генератора", "decimal", "machine_hour", null],
  ["out_material_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["out_waste_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["out_dewatering_mode", "Водоотлив требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["out_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["out_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["out_bank_protection_mode", "Укрепление берега требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["out_bank_protection_designation", "Конструкция укрепления берега", "text", null, null],
  ["out_bank_protection_area_m2", "Площадь укрепления берега", "decimal", "m2", null],
  ["out_live_tie_in_mode", "Врезка в действующий трубопровод требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["out_live_tie_in_designation", "Узел врезки в действующий трубопровод", "text", null, null],
  ["out_live_tie_in_count", "Количество врезок в действующий трубопровод", "integer", "piece", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("out_dewatering_") && parameterId !== "out_dewatering_mode"
    ? "out_dewatering_mode" : parameterId.startsWith("out_bank_protection_")
      && parameterId !== "out_bank_protection_mode" ? "out_bank_protection_mode"
      : parameterId.startsWith("out_live_tie_in_") && parameterId !== "out_live_tie_in_mode"
        ? "out_live_tie_in_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type OutfallStructureParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const OUTFALL_STRUCTURE_PARAMETERS: readonly OutfallStructureParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "out_concrete_process_allowance_m3" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.outfall-structure-r1",
      semantic_parameter_key: `outfall-structure:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_OUTFALL_HYDRAULIC_STRUCTURAL_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу и утверждённому проекту выпуска.`
          : `${titleRu}: укажите по гидравлическому и конструктивному проекту, ведомости объёмов, ППР или документам качества.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_OUTFALL_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_OUTFALL_PROJECT_DOCUMENTATION",
        source_document: OUTFALL_STRUCTURE_SOURCE_ID,
        source_locator: OUTFALL_STRUCTURE_SOURCE_METADATA.exact_locator,
        guide_version: "outfall-structure-r1",
        source_snapshot_hash: OUTFALL_STRUCTURE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранное выпускное сооружение и его непосредственные конструктивные элементы; подводящая сеть и невыбранное технологическое оборудование исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);

export const OUTFALL_STRUCTURE_RUNTIME_INPUT = Object.freeze({
  out_concrete_process_allowance_m3: 0, out_concrete_supplier_batch_m3: 1,
});
export const OUTFALL_STRUCTURE_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(OUTFALL_STRUCTURE_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const OUTFALL_STRUCTURE_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(OUTFALL_STRUCTURE_RUNTIME_INPUT).map((id) => [id, [OUTFALL_STRUCTURE_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:out_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка выпускного сооружения", unitId: "piece", formulaId: "out_acceptance_count_v1", expression: "out_structure_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон выпускного сооружения", unitId: "m3", formulaId: "out_concrete_order_volume_v1", expression: "ceil((out_structural_concrete_installed_volume_m3+out_concrete_process_allowance_m3)/out_concrete_supplier_batch_m3)*out_concrete_supplier_batch_m3", procurementEligible: true, titleParameterIds: ["out_concrete_class", "out_watertightness_class", "out_frost_resistance_class"] },
  { rowId: "rc09:out_rebar", section: "Материалы", category: "material", titleRu: "Арматура выпускного сооружения", unitId: "kg", formulaId: "out_rebar_mass_v1", expression: "out_rebar_mass_kg", procurementEligible: true, titleParameterIds: ["out_rebar_designation"] },
  { rowId: "rc09:out_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка выпускного сооружения", unitId: "m2", formulaId: "out_formwork_area_v1", expression: "out_formwork_area_m2" },
  { rowId: "rc09:out_embedded_parts", section: "Комплектующие", category: "material", titleRu: "Закладные детали выпускного сооружения", unitId: "piece", formulaId: "out_embedded_parts_quantity_v1", expression: "out_embedded_parts_quantity_piece", procurementEligible: true, titleParameterIds: ["out_embedded_parts_designation"] },
  { rowId: "rc09:out_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция выпускного сооружения", unitId: "m2", formulaId: "out_waterproofing_area_v1", expression: "out_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["out_waterproofing_designation"] },
  { rowId: "rc09:out_joint_material", section: "Расходники", category: "material", titleRu: "Материал рабочих и деформационных швов", unitId: "m", formulaId: "out_joint_material_length_v1", expression: "out_joint_material_length_m", procurementEligible: true, titleParameterIds: ["out_joint_material_designation"] },
  { rowId: "rc09:out_apron_material", section: "Материалы", category: "material", titleRu: "Материал выпускного фартука", unitId: "m3", formulaId: "out_apron_material_volume_v1", expression: "out_apron_material_volume_m3", procurementEligible: true, titleParameterIds: ["out_apron_material_designation"] },
  { rowId: "rc09:out_energy_dissipators", section: "Комплектующие", category: "material", titleRu: "Элементы гашения энергии потока", unitId: "piece", formulaId: "out_energy_dissipator_quantity_v1", expression: "out_energy_dissipator_quantity_piece", procurementEligible: true, titleParameterIds: ["out_energy_dissipator_designation"] },
  { rowId: "rc09:out_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлована выпускного сооружения", unitId: "m3", formulaId: "out_excavation_volume_v1", expression: "out_excavation_volume_m3" },
  { rowId: "rc09:out_backfill", section: "Земляные работы", category: "construction_work", titleRu: "Проектная обратная засыпка", unitId: "m3", formulaId: "out_backfill_volume_v1", expression: "out_backfill_volume_m3" },
  { rowId: "rc09:out_spoil_disposal", section: "Земляные работы", category: "service", titleRu: "Вывоз излишнего грунта", unitId: "m3", formulaId: "out_spoil_disposal_volume_v1", expression: "out_spoil_disposal_volume_m3", procurementEligible: true },
  { rowId: "rc09:out_concrete_tests", section: "Контроль", category: "service", titleRu: "Испытания конструкционного бетона", unitId: "test", formulaId: "out_concrete_test_count_v1", expression: "out_concrete_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out_survey_control", section: "Контроль", category: "service", titleRu: "Геодезический контроль выпускного сооружения", unitId: "set", formulaId: "out_survey_control_count_v1", expression: "out_survey_control_set_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация выпускного сооружения", unitId: "document", formulaId: "out_asbuilt_document_count_v1", expression: "out_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из котлована", unitId: "machine_hour", formulaId: "out_dewatering_machine_v1", expression: "out_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("out_dewatering_mode", "REQUIRED"), titleParameterIds: ["out_dewatering_designation"] },
  { rowId: "rc09:out_bank_protection", section: "Условные конструкции", category: "construction_work", titleRu: "Укрепление берега у выпуска", unitId: "m2", formulaId: "out_bank_protection_area_v1", expression: "out_bank_protection_area_m2", procurementEligible: true, inclusionAst: equals("out_bank_protection_mode", "REQUIRED"), titleParameterIds: ["out_bank_protection_designation"] },
  { rowId: "rc09:out_live_tie_in", section: "Условные работы", category: "construction_work", titleRu: "Врезка в действующий трубопровод", unitId: "piece", formulaId: "out_live_tie_in_count_v1", expression: "out_live_tie_in_count", procurementEligible: true, inclusionAst: equals("out_live_tie_in_mode", "REQUIRED"), titleParameterIds: ["out_live_tie_in_designation"] },
  { rowId: "rc09:out-concrete-balance:installed-net", section: "Баланс бетона", category: "material", titleRu: "Проектный объём уложенного бетона", unitId: "m3", formulaId: "out_concrete_installed_net_v1", expression: "out_structural_concrete_installed_volume_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out-concrete-balance:process-allowance", section: "Баланс бетона", category: "material", titleRu: "Технологический запас бетона", unitId: "m3", formulaId: "out_concrete_process_allowance_v1", expression: "out_concrete_process_allowance_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out-concrete-balance:total-need", section: "Баланс бетона", category: "material", titleRu: "Общая потребность в бетоне", unitId: "m3", formulaId: "out_concrete_total_need_v1", expression: "out_structural_concrete_installed_volume_m3+out_concrete_process_allowance_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out-concrete-balance:batch-count", section: "Баланс бетона", category: "material", titleRu: "Количество поставочных партий бетона", unitId: "batch", formulaId: "out_concrete_batch_count_v1", expression: "ceil((out_structural_concrete_installed_volume_m3+out_concrete_process_allowance_m3)/out_concrete_supplier_batch_m3)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out-concrete-balance:remainder", section: "Баланс бетона", category: "material", titleRu: "Остаток бетона после укладки", unitId: "m3", formulaId: "out_concrete_remainder_v1", expression: "ceil((out_structural_concrete_installed_volume_m3+out_concrete_process_allowance_m3)/out_concrete_supplier_batch_m3)*out_concrete_supplier_batch_m3-out_structural_concrete_installed_volume_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:out-concrete-balance:surplus-beyond-allowance", section: "Баланс бетона", category: "material", titleRu: "Остаток бетона сверх технологического запаса", unitId: "m3", formulaId: "out_concrete_surplus_v1", expression: "max(0,ceil((out_structural_concrete_installed_volume_m3+out_concrete_process_allowance_m3)/out_concrete_supplier_batch_m3)*out_concrete_supplier_batch_m3-out_structural_concrete_installed_volume_m3-out_concrete_process_allowance_m3)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:out-setting-out-preparation", section: "Труд", category: "construction_work", titleRu: "Разбивка и подготовка фронта работ", unitId: "man_hour", formulaId: "out_setting_out_preparation_labor_v1", expression: "out_setting_out_preparation_labor_h" },
  { rowId: "rc09:labor:out-formwork-rebar", section: "Труд", category: "construction_work", titleRu: "Опалубка и армирование", unitId: "man_hour", formulaId: "out_formwork_rebar_labor_v1", expression: "out_formwork_rebar_labor_h" },
  { rowId: "rc09:labor:out-concrete", section: "Труд", category: "construction_work", titleRu: "Бетонирование выпускного сооружения", unitId: "man_hour", formulaId: "out_concrete_labor_v1", expression: "out_concrete_labor_h" },
  { rowId: "rc09:labor:out-apron-dissipator", section: "Труд", category: "construction_work", titleRu: "Устройство фартука и гасителей энергии", unitId: "man_hour", formulaId: "out_apron_dissipator_labor_v1", expression: "out_apron_dissipator_labor_h" },
  { rowId: "rc09:labor:out-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль качества и оформление", unitId: "man_hour", formulaId: "out_qa_documentation_labor_v1", expression: "out_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:out-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "out_excavator_machine_v1", expression: "out_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:out-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "out_crane_machine_v1", expression: "out_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:out-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "out_concrete_pump_machine_v1", expression: "out_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:out-compactor", section: "Механизмы", category: "equipment", titleRu: "Уплотняющий механизм", unitId: "machine_hour", formulaId: "out_compactor_machine_v1", expression: "out_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:out-generator", section: "Механизмы", category: "equipment", titleRu: "Генератор", unitId: "machine_hour", formulaId: "out_generator_machine_v1", expression: "out_generator_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:out-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов и комплектующих", unitId: "trip", formulaId: "out_material_delivery_trip_v1", expression: "out_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:out-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "out_waste_removal_trip_v1", expression: "out_waste_removal_trip_count", procurementEligible: true },
]);

export const OUTFALL_STRUCTURE_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const OUTFALL_STRUCTURE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `outfall-structure:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_OUTFALL_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: OUTFALL_STRUCTURE_SOURCE_ID,
        source_id: OUTFALL_STRUCTURE_SOURCE_ID, normId: OUTFALL_STRUCTURE_NORM_ID,
        norm_id: OUTFALL_STRUCTURE_NORM_ID,
        normVersion: OUTFALL_STRUCTURE_SOURCE_METADATA.source_document_version,
        source_title: OUTFALL_STRUCTURE_SOURCE_METADATA.source_title,
        exact_locator: OUTFALL_STRUCTURE_SOURCE_METADATA.exact_locator,
        source_definition_hash: OUTFALL_STRUCTURE_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "upstream pipeline, manholes, generic network testing or unselected treatment equipment",
        "count-derived or geometry-derived material, earthwork, labor, mechanism or logistics quantity",
        "automatic dewatering, bank protection or live-pipeline tie-in",
        "automatic process allowance or supplier batch", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);

export const OUTFALL_STRUCTURE_SHORT_INPUT = Object.freeze({
  out_structure_count: 1, out_structure_type: "CAST_IN_PLACE_RC_HEADWALL",
  out_structure_designation: "OF-RC-DN600-Q450-C3037", out_receiving_environment: "RIVER_BANK",
  out_outlet_pipe_diameter_mm: 600, out_design_discharge_lps: 450,
  out_structure_length_m: 4.5, out_structure_width_m: 3.2, out_structure_height_m: 2.4,
  out_concrete_class: "C30/37", out_watertightness_class: "W8",
  out_frost_resistance_class: "F200", out_structural_concrete_installed_volume_m3: 28,
  ...OUTFALL_STRUCTURE_RUNTIME_INPUT,
});
export const OUTFALL_STRUCTURE_ACCEPTANCE_INPUT = Object.freeze({
  ...OUTFALL_STRUCTURE_SHORT_INPUT,
  out_rebar_designation: "A500C", out_rebar_mass_kg: 3800, out_formwork_area_m2: 220,
  out_embedded_parts_designation: "EP-OF-DN600", out_embedded_parts_quantity_piece: 12,
  out_waterproofing_designation: "WATERPROOF-MEMBRANE-W8", out_waterproofing_area_m2: 95,
  out_joint_material_designation: "HYDROPHILIC-WATERSTOP", out_joint_material_length_m: 42,
  out_apron_material_designation: "RIPRAP-150-300", out_apron_material_volume_m3: 65,
  out_energy_dissipator_designation: "RC-BAFFLE-DN600", out_energy_dissipator_quantity_piece: 4,
  out_excavation_volume_m3: 180, out_backfill_volume_m3: 110, out_spoil_disposal_volume_m3: 70,
  out_concrete_test_count: 4, out_survey_control_set_count: 1, out_asbuilt_document_count: 1,
  out_setting_out_preparation_labor_h: 96, out_formwork_rebar_labor_h: 256,
  out_concrete_labor_h: 160, out_apron_dissipator_labor_h: 144,
  out_qa_documentation_labor_h: 72, out_excavator_machine_h: 80, out_crane_machine_h: 72,
  out_concrete_pump_machine_h: 32, out_compactor_machine_h: 40, out_generator_machine_h: 24,
  out_material_delivery_trip_count: 18, out_waste_removal_trip_count: 8,
  out_dewatering_mode: "NOT_REQUIRED", out_bank_protection_mode: "NOT_REQUIRED",
  out_live_tie_in_mode: "NOT_REQUIRED",
});

export async function compileOutfallStructureR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? OUTFALL_STRUCTURE_CATALOG_ID;
  if (catalogId !== OUTFALL_STRUCTURE_CATALOG_ID) {
    throw new Error(`OUTFALL_STRUCTURE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.outfall-structure-r1", catalogId,
    primaryMeasureParameterId: "out_structure_count",
    parameterDefinitions: [...OUTFALL_STRUCTURE_PARAMETERS],
    formulaDefinitions: [...OUTFALL_STRUCTURE_FORMULAS],
    resourceDefinitions: [...OUTFALL_STRUCTURE_RESOURCES], submittedParameters,
    confirmedParameters: { ...OUTFALL_STRUCTURE_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
