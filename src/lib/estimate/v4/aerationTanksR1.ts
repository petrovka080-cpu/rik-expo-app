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
export const AERATION_TANKS_CATALOG_ID = "canonical-work:expanded:aeration_tanks";
export const AERATION_TANKS_SOURCE_ID = "project_two_train_fine_bubble_aeration_tanks_balance_v1";
export const AERATION_TANKS_NORM_ID = "norm:project:two_train_fine_bubble_aeration_tanks_balance:v1";
export const AERATION_TANKS_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый технологический и конструктивный проект двух монолитных аэротенков, спецификация аэрационной решётки и программа испытаний",
  source_authority: "Проектировщик технологии и железобетонных сооружений, поставщик аэрационной решётки, изготовители оборудования, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_TWO_TRAIN_FINE_BUBBLE_AERATION_TANKS_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "a2167bab717dcb2886f00891230124d0e15e0668541391720e4e6df75446309b",
  exact_locator: "2 аэротенка AT-RC-2X30X8X5-FB, монолитный прямоугольный ЖБ, 2 линии, каждый 30x8 м, рабочая глубина 5 м, 9000 Нм3/ч, 240 диффузоров EPDM-FB-9IN",
  use_restriction: "Размеры, число линий и расход воздуха не определяют автоматически строительные объёмы, аэрационную решётку, труд, механизмы или логистику. Воздуходувки, мешалки, насосы рецикла, дренирование или байпас и удаление запахов включаются только по проекту. Полные КОС, входные сооружения, MBR, УФ, обезвоживание осадка, наружные сети и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "a2167bab717dcb2886f00891230124d0e15e0668541391720e4e6df75446309b",
});

const KNOWN_SCOPE = [
  "aer_tank_count", "aer_tank_designation", "aer_tank_type", "aer_process_duty",
  "aer_process_train_count", "aer_tank_length_m", "aer_tank_width_m",
  "aer_operating_water_depth_m", "aer_design_air_flow_nm3_h",
  "aer_diffuser_installed_piece", "aer_diffuser_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "aer_diffuser_retained_spare_piece", "aer_diffuser_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "aer_blower_designation", "aer_blower_quantity_piece",
  "aer_mixer_designation", "aer_mixer_quantity_piece",
  "aer_recycle_pump_designation", "aer_recycle_pump_quantity_piece",
  "aer_draining_bypass_designation", "aer_draining_bypass_machine_h",
  "aer_odor_control_designation", "aer_odor_control_quantity_set",
]);
const PARAMETER_SPECS = Object.freeze([
  ["aer_tank_count", "Количество аэротенков", "integer", "piece", null],
  ["aer_tank_designation", "Марка аэротенков", "text", null, null],
  ["aer_tank_type", "Тип аэротенка", "enum", null, ["CAST_IN_PLACE_RC_RECTANGULAR"]],
  ["aer_process_duty", "Технологическое назначение", "enum", null, ["ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION"]],
  ["aer_process_train_count", "Количество технологических линий", "integer", "piece", null],
  ["aer_tank_length_m", "Длина одного аэротенка", "decimal", "m", null],
  ["aer_tank_width_m", "Ширина одного аэротенка", "decimal", "m", null],
  ["aer_operating_water_depth_m", "Рабочая глубина воды", "decimal", "m", null],
  ["aer_design_air_flow_nm3_h", "Расчётный расход воздуха", "decimal", "Nm3_per_h", null],
  ["aer_diffuser_installed_piece", "Устанавливаемые аэрационные диффузоры", "integer", "piece", null],
  ["aer_diffuser_designation", "Марка аэрационного диффузора", "text", null, null],
  ["aer_diffuser_retained_spare_piece", "Сохраняемый запас аэрационных диффузоров", "integer", "piece", null],
  ["aer_diffuser_supplier_package_quantity_piece", "Диффузоров в упаковке поставщика", "integer", "piece", null],
  ["aer_structural_concrete_volume_m3", "Проектный объём конструкционного бетона", "decimal", "m3", null],
  ["aer_reinforcement_mass_kg", "Проектная масса арматуры", "decimal", "kg", null],
  ["aer_formwork_contact_area_m2", "Проектная площадь контакта опалубки", "decimal", "m2", null],
  ["aer_waterstop_length_m", "Длина гидрошпонки рабочих и деформационных швов", "decimal", "m", null],
  ["aer_waterproofing_designation", "Марка гидроизоляции", "text", null, null],
  ["aer_waterproofing_area_m2", "Площадь гидроизоляции", "decimal", "m2", null],
  ["aer_air_header_designation", "Марка воздушных коллекторов", "text", null, null],
  ["aer_air_header_length_m", "Длина воздушных коллекторов", "decimal", "m", null],
  ["aer_header_support_designation", "Марка опор воздушных коллекторов", "text", null, null],
  ["aer_header_support_quantity_piece", "Количество опор воздушных коллекторов", "integer", "piece", null],
  ["aer_instrumentation_designation", "Марка технологических КИП", "text", null, null],
  ["aer_instrumentation_quantity_set", "Количество комплектов технологических КИП", "integer", "set", null],
  ["aer_internal_cable_designation", "Марка внутреннего силового и контрольного кабеля", "text", null, null],
  ["aer_internal_cable_length_m", "Длина внутреннего кабеля", "decimal", "m", null],
  ["aer_access_safety_designation", "Марка площадок, лестниц и ограждений", "text", null, null],
  ["aer_access_safety_quantity_set", "Количество комплектов доступа и безопасности", "integer", "set", null],
  ["aer_installation_consumable_designation", "Марка монтажных расходников", "text", null, null],
  ["aer_installation_consumable_quantity_set", "Количество комплектов монтажных расходников", "integer", "set", null],
  ["aer_leak_test_count", "Количество испытаний резервуаров на герметичность", "integer", "test", null],
  ["aer_air_distribution_test_count", "Количество испытаний распределения воздуха", "integer", "test", null],
  ["aer_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["aer_civil_labor_h", "Труд на монолитные и гидроизоляционные работы", "decimal", "man_hour", null],
  ["aer_diffuser_grid_labor_h", "Труд на монтаж аэрационной решётки", "decimal", "man_hour", null],
  ["aer_process_mechanical_labor_h", "Труд на механический монтаж", "decimal", "man_hour", null],
  ["aer_electrical_instrumentation_labor_h", "Труд на электромонтаж и КИП", "decimal", "man_hour", null],
  ["aer_qa_commissioning_labor_h", "Труд на испытания, пуск и оформление", "decimal", "man_hour", null],
  ["aer_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["aer_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["aer_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["aer_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["aer_test_equipment_machine_h", "Работа испытательного оборудования", "decimal", "machine_hour", null],
  ["aer_material_delivery_trip_count", "Рейсы доставки оборудования и материалов", "integer", "trip", null],
  ["aer_waste_removal_trip_count", "Рейсы вывоза тары и отходов", "integer", "trip", null],
  ["aer_blower_mode", "Воздуходувки входят в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["aer_blower_designation", "Марка воздуходувки", "text", null, null],
  ["aer_blower_quantity_piece", "Количество воздуходувок", "integer", "piece", null],
  ["aer_mixer_mode", "Погружные мешалки входят в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["aer_mixer_designation", "Марка погружной мешалки", "text", null, null],
  ["aer_mixer_quantity_piece", "Количество погружных мешалок", "integer", "piece", null],
  ["aer_recycle_pump_mode", "Насосы рецикла входят в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["aer_recycle_pump_designation", "Марка насоса рецикла", "text", null, null],
  ["aer_recycle_pump_quantity_piece", "Количество насосов рецикла", "integer", "piece", null],
  ["aer_draining_bypass_mode", "Дренирование или байпас требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["aer_draining_bypass_designation", "Оборудование дренирования или байпаса", "text", null, null],
  ["aer_draining_bypass_machine_h", "Работа оборудования дренирования или байпаса", "decimal", "machine_hour", null],
  ["aer_odor_control_mode", "Удаление запахов требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["aer_odor_control_designation", "Марка системы удаления запахов", "text", null, null],
  ["aer_odor_control_quantity_set", "Количество комплектов удаления запахов", "integer", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const includedBranches = ["blower", "mixer", "recycle_pump"];
  const includedBranch = includedBranches.find((name) => parameterId.startsWith(`aer_${name}_`)
    && parameterId !== `aer_${name}_mode`);
  if (includedBranch) return {
    requiredWhen: { kind: "equals", parameterId: `aer_${includedBranch}_mode`, value: "INCLUDED" },
    forbiddenWhen: { kind: "equals", parameterId: `aer_${includedBranch}_mode`, value: "NOT_INCLUDED" },
  };
  const requiredBranches = ["draining_bypass", "odor_control"];
  const requiredBranch = requiredBranches.find((name) => parameterId.startsWith(`aer_${name}_`)
    && parameterId !== `aer_${name}_mode`);
  return requiredBranch ? {
    requiredWhen: { kind: "equals", parameterId: `aer_${requiredBranch}_mode`, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: `aer_${requiredBranch}_mode`, value: "NOT_REQUIRED" },
  } : {};
}

export type AerationTanksParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const AERATION_TANKS_PARAMETERS: readonly AerationTanksParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "aer_diffuser_retained_spare_piece" ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.aeration-tanks-r1",
      semantic_parameter_key: `aeration-tanks:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_AERATION_TANK_PROJECT_MANUFACTURER_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, проекту и спецификации аэротенка.`
          : `${titleRu}: укажите по проекту, спецификации аэрации, ведомости объёмов, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_AERATION_TANK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_AERATION_TANK_PROJECT_DOCUMENTATION",
        source_document: AERATION_TANKS_SOURCE_ID,
        source_locator: AERATION_TANKS_SOURCE_METADATA.exact_locator,
        guide_version: "aeration-tanks-r1",
        source_snapshot_hash: AERATION_TANKS_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранные аэротенки и их внутренняя аэрационная решётка; полные КОС, соседние процессы и наружные сети исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
    },
  })),
);

export const AERATION_TANKS_RUNTIME_INPUT = Object.freeze({
  aer_diffuser_retained_spare_piece: 0,
  aer_diffuser_supplier_package_quantity_piece: 1,
});
export const AERATION_TANKS_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(AERATION_TANKS_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const AERATION_TANKS_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(AERATION_TANKS_RUNTIME_INPUT).map((id) => [id, [AERATION_TANKS_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{
  rowId: string; section: string; category: string; titleRu: string; unitId: string;
  formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:aer_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, монтаж и приёмка аэротенков", unitId: "piece", formulaId: "aer_acceptance_count_v1", expression: "aer_tank_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer_diffusers", section: "Оборудование", category: "equipment", titleRu: "Мелкопузырчатые аэрационные диффузоры", unitId: "piece", formulaId: "aer_diffuser_order_quantity_v1", expression: "ceil((aer_diffuser_installed_piece+aer_diffuser_retained_spare_piece)/aer_diffuser_supplier_package_quantity_piece)*aer_diffuser_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["aer_diffuser_designation"] },
  { rowId: "rc09:aer_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон аэротенков", unitId: "m3", formulaId: "aer_structural_concrete_volume_v1", expression: "aer_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:aer_reinforcement", section: "Материалы", category: "material", titleRu: "Арматура аэротенков", unitId: "kg", formulaId: "aer_reinforcement_mass_v1", expression: "aer_reinforcement_mass_kg", procurementEligible: true },
  { rowId: "rc09:aer_formwork", section: "Материалы", category: "material", titleRu: "Опалубка аэротенков", unitId: "m2", formulaId: "aer_formwork_contact_area_v1", expression: "aer_formwork_contact_area_m2", procurementEligible: true },
  { rowId: "rc09:aer_waterstop", section: "Комплектующие", category: "material", titleRu: "Гидрошпонка швов", unitId: "m", formulaId: "aer_waterstop_length_v1", expression: "aer_waterstop_length_m", procurementEligible: true },
  { rowId: "rc09:aer_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция аэротенков", unitId: "m2", formulaId: "aer_waterproofing_area_v1", expression: "aer_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["aer_waterproofing_designation"] },
  { rowId: "rc09:aer_air_headers", section: "Комплектующие", category: "material", titleRu: "Внутренние воздушные коллекторы", unitId: "m", formulaId: "aer_air_header_length_v1", expression: "aer_air_header_length_m", procurementEligible: true, titleParameterIds: ["aer_air_header_designation"] },
  { rowId: "rc09:aer_header_supports", section: "Комплектующие", category: "material", titleRu: "Опоры воздушных коллекторов", unitId: "piece", formulaId: "aer_header_support_quantity_v1", expression: "aer_header_support_quantity_piece", procurementEligible: true, titleParameterIds: ["aer_header_support_designation"] },
  { rowId: "rc09:aer_instrumentation", section: "Автоматика", category: "equipment", titleRu: "Технологические КИП аэротенков", unitId: "set", formulaId: "aer_instrumentation_quantity_v1", expression: "aer_instrumentation_quantity_set", procurementEligible: true, titleParameterIds: ["aer_instrumentation_designation"] },
  { rowId: "rc09:aer_internal_cable", section: "Материалы", category: "material", titleRu: "Внутренний силовой и контрольный кабель", unitId: "m", formulaId: "aer_internal_cable_length_v1", expression: "aer_internal_cable_length_m", procurementEligible: true, titleParameterIds: ["aer_internal_cable_designation"] },
  { rowId: "rc09:aer_access_safety", section: "Комплектующие", category: "material", titleRu: "Площадки, лестницы и ограждения", unitId: "set", formulaId: "aer_access_safety_quantity_v1", expression: "aer_access_safety_quantity_set", procurementEligible: true, titleParameterIds: ["aer_access_safety_designation"] },
  { rowId: "rc09:aer_installation_consumables", section: "Расходники", category: "material", titleRu: "Монтажные расходники аэрационной решётки", unitId: "set", formulaId: "aer_installation_consumable_quantity_v1", expression: "aer_installation_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["aer_installation_consumable_designation"] },
  { rowId: "rc09:aer_leak_tests", section: "Контроль", category: "service", titleRu: "Испытания резервуаров на герметичность", unitId: "test", formulaId: "aer_leak_test_count_v1", expression: "aer_leak_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer_air_distribution_tests", section: "Контроль", category: "service", titleRu: "Испытания равномерности распределения воздуха", unitId: "test", formulaId: "aer_air_distribution_test_count_v1", expression: "aer_air_distribution_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация аэротенков", unitId: "document", formulaId: "aer_asbuilt_document_count_v1", expression: "aer_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer_blowers", section: "Условное оборудование", category: "equipment", titleRu: "Воздуходувки", unitId: "piece", formulaId: "aer_blower_quantity_v1", expression: "aer_blower_quantity_piece", procurementEligible: true, inclusionAst: equals("aer_blower_mode", "INCLUDED"), titleParameterIds: ["aer_blower_designation"] },
  { rowId: "rc09:aer_mixers", section: "Условное оборудование", category: "equipment", titleRu: "Погружные мешалки", unitId: "piece", formulaId: "aer_mixer_quantity_v1", expression: "aer_mixer_quantity_piece", procurementEligible: true, inclusionAst: equals("aer_mixer_mode", "INCLUDED"), titleParameterIds: ["aer_mixer_designation"] },
  { rowId: "rc09:aer_recycle_pumps", section: "Условное оборудование", category: "equipment", titleRu: "Насосы рецикла", unitId: "piece", formulaId: "aer_recycle_pump_quantity_v1", expression: "aer_recycle_pump_quantity_piece", procurementEligible: true, inclusionAst: equals("aer_recycle_pump_mode", "INCLUDED"), titleParameterIds: ["aer_recycle_pump_designation"] },
  { rowId: "rc09:aer_draining_bypass", section: "Условные механизмы", category: "equipment", titleRu: "Дренирование или байпас аэротенков", unitId: "machine_hour", formulaId: "aer_draining_bypass_machine_v1", expression: "aer_draining_bypass_machine_h", procurementEligible: true, inclusionAst: equals("aer_draining_bypass_mode", "REQUIRED"), titleParameterIds: ["aer_draining_bypass_designation"] },
  { rowId: "rc09:aer_odor_control", section: "Условное оборудование", category: "equipment", titleRu: "Система удаления запахов", unitId: "set", formulaId: "aer_odor_control_quantity_v1", expression: "aer_odor_control_quantity_set", procurementEligible: true, inclusionAst: equals("aer_odor_control_mode", "REQUIRED"), titleParameterIds: ["aer_odor_control_designation"] },
  { rowId: "rc09:aer-diffuser-balance:installed-net", section: "Баланс диффузоров", category: "equipment", titleRu: "Установленные аэрационные диффузоры", unitId: "piece", formulaId: "aer_diffuser_installed_net_v1", expression: "aer_diffuser_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer-diffuser-balance:retained-spare", section: "Баланс диффузоров", category: "equipment", titleRu: "Сохраняемый запас диффузоров", unitId: "piece", formulaId: "aer_diffuser_retained_spare_v1", expression: "aer_diffuser_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer-diffuser-balance:total-need", section: "Баланс диффузоров", category: "equipment", titleRu: "Общая потребность в диффузорах", unitId: "piece", formulaId: "aer_diffuser_total_need_v1", expression: "aer_diffuser_installed_piece+aer_diffuser_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer-diffuser-balance:package-count", section: "Баланс диффузоров", category: "equipment", titleRu: "Количество упаковок диффузоров", unitId: "package", formulaId: "aer_diffuser_package_count_v1", expression: "ceil((aer_diffuser_installed_piece+aer_diffuser_retained_spare_piece)/aer_diffuser_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer-diffuser-balance:remainder", section: "Баланс диффузоров", category: "equipment", titleRu: "Остаток диффузоров после установки", unitId: "piece", formulaId: "aer_diffuser_remainder_v1", expression: "ceil((aer_diffuser_installed_piece+aer_diffuser_retained_spare_piece)/aer_diffuser_supplier_package_quantity_piece)*aer_diffuser_supplier_package_quantity_piece-aer_diffuser_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:aer-diffuser-balance:surplus-beyond-spare", section: "Баланс диффузоров", category: "equipment", titleRu: "Свободный остаток диффузоров сверх запаса", unitId: "piece", formulaId: "aer_diffuser_surplus_v1", expression: "max(0,ceil((aer_diffuser_installed_piece+aer_diffuser_retained_spare_piece)/aer_diffuser_supplier_package_quantity_piece)*aer_diffuser_supplier_package_quantity_piece-aer_diffuser_installed_piece-aer_diffuser_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:aer-civil", section: "Труд", category: "construction_work", titleRu: "Монолитные и гидроизоляционные работы", unitId: "man_hour", formulaId: "aer_civil_labor_v1", expression: "aer_civil_labor_h" },
  { rowId: "rc09:labor:aer-diffuser-grid", section: "Труд", category: "construction_work", titleRu: "Монтаж аэрационной решётки", unitId: "man_hour", formulaId: "aer_diffuser_grid_labor_v1", expression: "aer_diffuser_grid_labor_h" },
  { rowId: "rc09:labor:aer-process-mechanical", section: "Труд", category: "construction_work", titleRu: "Механический монтаж", unitId: "man_hour", formulaId: "aer_process_mechanical_labor_v1", expression: "aer_process_mechanical_labor_h" },
  { rowId: "rc09:labor:aer-electrical-instrumentation", section: "Труд", category: "construction_work", titleRu: "Электромонтаж и КИП", unitId: "man_hour", formulaId: "aer_electrical_instrumentation_labor_v1", expression: "aer_electrical_instrumentation_labor_h" },
  { rowId: "rc09:labor:aer-qa-commissioning", section: "Труд", category: "construction_work", titleRu: "Испытания, пуск и оформление", unitId: "man_hour", formulaId: "aer_qa_commissioning_labor_v1", expression: "aer_qa_commissioning_labor_h" },
  { rowId: "rc09:equipment:aer-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "aer_excavator_machine_v1", expression: "aer_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:aer-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "aer_crane_machine_v1", expression: "aer_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:aer-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "aer_concrete_pump_machine_v1", expression: "aer_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:aer-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "aer_welding_machine_v1", expression: "aer_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:aer-test", section: "Механизмы", category: "equipment", titleRu: "Испытательное оборудование", unitId: "machine_hour", formulaId: "aer_test_equipment_machine_v1", expression: "aer_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:aer-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов и оборудования", unitId: "trip", formulaId: "aer_material_delivery_trip_v1", expression: "aer_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:aer-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз тары и отходов", unitId: "trip", formulaId: "aer_waste_removal_trip_v1", expression: "aer_waste_removal_trip_count", procurementEligible: true },
]);

export const AERATION_TANKS_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }),
);
export const AERATION_TANKS_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `aeration-tanks:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_AERATION_TANK_PROJECT_MANUFACTURER_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: AERATION_TANKS_SOURCE_ID, source_id: AERATION_TANKS_SOURCE_ID,
        normId: AERATION_TANKS_NORM_ID, norm_id: AERATION_TANKS_NORM_ID,
        normVersion: AERATION_TANKS_SOURCE_METADATA.source_document_version,
        source_title: AERATION_TANKS_SOURCE_METADATA.source_title,
        exact_locator: AERATION_TANKS_SOURCE_METADATA.exact_locator,
        source_definition_hash: AERATION_TANKS_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "complete treatment plant, inlet works, MBR, UV, sludge dewatering or external network",
        "dimension-train-or-air-flow-derived civil, equipment, labor, mechanism or logistics quantity",
        "automatic blower, mixer, recycle pump, draining bypass or odor control",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);

export const AERATION_TANKS_SHORT_INPUT = Object.freeze({
  aer_tank_count: 2, aer_tank_designation: "AT-RC-2X30X8X5-FB",
  aer_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
  aer_process_duty: "ACTIVATED_SLUDGE_FINE_BUBBLE_AERATION",
  aer_process_train_count: 2, aer_tank_length_m: 30, aer_tank_width_m: 8,
  aer_operating_water_depth_m: 5, aer_design_air_flow_nm3_h: 9000,
  aer_diffuser_installed_piece: 240, aer_diffuser_designation: "EPDM-FB-9IN",
  ...AERATION_TANKS_RUNTIME_INPUT,
});
export const AERATION_TANKS_ACCEPTANCE_INPUT = Object.freeze({
  ...AERATION_TANKS_SHORT_INPUT,
  aer_structural_concrete_volume_m3: 980, aer_reinforcement_mass_kg: 138000,
  aer_formwork_contact_area_m2: 4600, aer_waterstop_length_m: 420,
  aer_waterproofing_designation: "CEMENT-POLYMER-WWTP", aer_waterproofing_area_m2: 2800,
  aer_air_header_designation: "SS316-AIR-DN200-DN50", aer_air_header_length_m: 520,
  aer_header_support_designation: "SS316-AIR-HEADER-SUPPORT", aer_header_support_quantity_piece: 180,
  aer_instrumentation_designation: "DO-AIRFLOW-PRESSURE-TEMP", aer_instrumentation_quantity_set: 2,
  aer_internal_cable_designation: "N2XH-CONTROL-AERATION", aer_internal_cable_length_m: 460,
  aer_access_safety_designation: "HDG-GRATING-LADDER-RAIL", aer_access_safety_quantity_set: 2,
  aer_installation_consumable_designation: "SS316-ANCHOR-GASKET-SEAL", aer_installation_consumable_quantity_set: 12,
  aer_leak_test_count: 2, aer_air_distribution_test_count: 2, aer_asbuilt_document_count: 1,
  aer_civil_labor_h: 5200, aer_diffuser_grid_labor_h: 1280,
  aer_process_mechanical_labor_h: 920, aer_electrical_instrumentation_labor_h: 520,
  aer_qa_commissioning_labor_h: 360, aer_excavator_machine_h: 240,
  aer_crane_machine_h: 180, aer_concrete_pump_machine_h: 190,
  aer_welding_machine_h: 160, aer_test_equipment_machine_h: 96,
  aer_material_delivery_trip_count: 72, aer_waste_removal_trip_count: 24,
  aer_blower_mode: "NOT_INCLUDED", aer_mixer_mode: "NOT_INCLUDED",
  aer_recycle_pump_mode: "NOT_INCLUDED", aer_draining_bypass_mode: "NOT_REQUIRED",
  aer_odor_control_mode: "NOT_REQUIRED",
});

export async function compileAerationTanksR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? AERATION_TANKS_CATALOG_ID;
  if (catalogId !== AERATION_TANKS_CATALOG_ID) {
    throw new Error(`AERATION_TANKS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.aeration-tanks-r1", catalogId,
    primaryMeasureParameterId: "aer_tank_count",
    parameterDefinitions: [...AERATION_TANKS_PARAMETERS],
    formulaDefinitions: [...AERATION_TANKS_FORMULAS],
    resourceDefinitions: [...AERATION_TANKS_RESOURCES], submittedParameters,
    confirmedParameters: { ...AERATION_TANKS_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
