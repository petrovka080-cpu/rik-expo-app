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

export const WASTEWATER_TREATMENT_PLANT_CATALOG_ID =
  "canonical-work:expanded:wastewater_treatment_plant";
export const WASTEWATER_TREATMENT_PLANT_SOURCE_ID =
  "project_two_train_mbr_wastewater_treatment_plant_balance_v1";
export const WASTEWATER_TREATMENT_PLANT_NORM_ID =
  "norm:project:two_train_mbr_wastewater_treatment_plant_balance:v1";
export const WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый технологический и строительный проект двухлинейных очистных сооружений MBR, спецификации поставщиков и программа пусконаладки",
  source_authority: "Проектировщик очистных сооружений, поставщик MBR, изготовители оборудования, пусконаладочная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_TWO_TRAIN_MBR_WWTP_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "d2de05f964d874448ddf8ee92db3e13c823d9a663dab5a82109b09b9ce2cb5be",
  exact_locator: "1 КОС WWTP-MBR-1000-2T, SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV, 2 линии, 1000/1500 м3/сут, вход БПК5 250/ВВ 300/N 45 мг/л, выход БПК5 10/ВВ 10/N 10 мг/л, 8 кассет MBR-CASSETTE-50M3H",
  use_restriction: "Расход, число линий и показатели качества не определяют автоматически оборудование, сооружения, материалы, труд, механизмы или логистику. Удаление запахов, третичная доочистка и резервное питание включаются только по проекту. Наружная сеть, отдельные КНС, невыбранное обезвоживание осадка и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "d2de05f964d874448ddf8ee92db3e13c823d9a663dab5a82109b09b9ce2cb5be",
});

const KNOWN_SCOPE = [
  "wtp_plant_count", "wtp_plant_designation", "wtp_process_technology",
  "wtp_design_flow_m3_day", "wtp_peak_flow_m3_day", "wtp_process_train_count",
  "wtp_influent_bod5_mg_l", "wtp_influent_tss_mg_l", "wtp_influent_tn_mg_l",
  "wtp_effluent_bod5_mg_l", "wtp_effluent_tss_mg_l", "wtp_effluent_tn_mg_l",
  "wtp_membrane_cassette_installed_piece", "wtp_membrane_cassette_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wtp_membrane_cassette_retained_spare_piece",
  "wtp_membrane_cassette_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "wtp_odor_control_designation", "wtp_odor_control_quantity_set",
  "wtp_tertiary_polishing_designation", "wtp_tertiary_polishing_capacity_m3_day",
  "wtp_standby_power_designation", "wtp_standby_power_quantity_set",
]);

const PARAMETER_SPECS = Object.freeze([
  ["wtp_plant_count", "Количество очистных сооружений", "integer", "piece", null],
  ["wtp_plant_designation", "Марка очистных сооружений", "text", null, null],
  ["wtp_process_technology", "Технологическая схема очистки", "enum", null, ["SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV"]],
  ["wtp_design_flow_m3_day", "Расчётный суточный расход", "decimal", "m3_per_day", null],
  ["wtp_peak_flow_m3_day", "Пиковый суточный расход", "decimal", "m3_per_day", null],
  ["wtp_process_train_count", "Количество технологических линий", "integer", "piece", null],
  ["wtp_influent_bod5_mg_l", "БПК5 входящих стоков", "decimal", "mg_per_l", null],
  ["wtp_influent_tss_mg_l", "Взвешенные вещества входящих стоков", "decimal", "mg_per_l", null],
  ["wtp_influent_tn_mg_l", "Общий азот входящих стоков", "decimal", "mg_per_l", null],
  ["wtp_effluent_bod5_mg_l", "БПК5 очищенной воды", "decimal", "mg_per_l", null],
  ["wtp_effluent_tss_mg_l", "Взвешенные вещества очищенной воды", "decimal", "mg_per_l", null],
  ["wtp_effluent_tn_mg_l", "Общий азот очищенной воды", "decimal", "mg_per_l", null],
  ["wtp_membrane_cassette_installed_piece", "Устанавливаемые мембранные кассеты", "integer", "piece", null],
  ["wtp_membrane_cassette_designation", "Марка мембранной кассеты", "text", null, null],
  ["wtp_membrane_cassette_retained_spare_piece", "Сохраняемый запас мембранных кассет", "integer", "piece", null],
  ["wtp_membrane_cassette_supplier_package_quantity_piece", "Кассет в упаковке поставщика", "integer", "piece", null],
  ["wtp_screen_designation", "Марка механической решётки", "text", null, null],
  ["wtp_screen_quantity_piece", "Количество механических решёток", "integer", "piece", null],
  ["wtp_grit_unit_designation", "Марка песколовки", "text", null, null],
  ["wtp_grit_unit_quantity_piece", "Количество песколовок", "integer", "piece", null],
  ["wtp_equalization_tank_volume_m3", "Проектный объём усреднителя", "decimal", "m3", null],
  ["wtp_anoxic_tank_volume_m3", "Проектный объём аноксидной зоны", "decimal", "m3", null],
  ["wtp_aerobic_tank_volume_m3", "Проектный объём аэробной зоны", "decimal", "m3", null],
  ["wtp_aeration_diffuser_designation", "Марка аэрационных диффузоров", "text", null, null],
  ["wtp_aeration_diffuser_quantity_piece", "Количество аэрационных диффузоров", "integer", "piece", null],
  ["wtp_blower_designation", "Марка воздуходувки", "text", null, null],
  ["wtp_blower_quantity_piece", "Количество воздуходувок", "integer", "piece", null],
  ["wtp_internal_recycle_pump_designation", "Марка насоса внутреннего рецикла", "text", null, null],
  ["wtp_internal_recycle_pump_quantity_piece", "Количество насосов внутреннего рецикла", "integer", "piece", null],
  ["wtp_waste_sludge_pump_designation", "Марка насоса избыточного ила", "text", null, null],
  ["wtp_waste_sludge_pump_quantity_piece", "Количество насосов избыточного ила", "integer", "piece", null],
  ["wtp_uv_unit_designation", "Марка УФ-установки", "text", null, null],
  ["wtp_uv_unit_quantity_piece", "Количество УФ-установок", "integer", "piece", null],
  ["wtp_chemical_dosing_designation", "Марка реагентного дозирования", "text", null, null],
  ["wtp_chemical_dosing_quantity_set", "Количество комплектов реагентного дозирования", "integer", "set", null],
  ["wtp_instrumentation_designation", "Марка КИП процесса", "text", null, null],
  ["wtp_instrumentation_quantity_set", "Количество комплектов КИП", "integer", "set", null],
  ["wtp_scada_designation", "Марка SCADA и автоматики", "text", null, null],
  ["wtp_scada_quantity_set", "Количество комплектов SCADA", "integer", "set", null],
  ["wtp_process_piping_designation", "Марка внутренних технологических трубопроводов", "text", null, null],
  ["wtp_process_piping_length_m", "Длина внутренних технологических трубопроводов", "decimal", "m", null],
  ["wtp_process_valve_designation", "Марка технологической арматуры", "text", null, null],
  ["wtp_process_valve_quantity_piece", "Количество технологической арматуры", "integer", "piece", null],
  ["wtp_structural_concrete_volume_m3", "Проектный объём конструкционного бетона", "decimal", "m3", null],
  ["wtp_reinforcement_mass_kg", "Проектная масса арматуры", "decimal", "kg", null],
  ["wtp_formwork_contact_area_m2", "Проектная площадь контакта опалубки", "decimal", "m2", null],
  ["wtp_seed_sludge_volume_m3", "Объём затравочного активного ила", "decimal", "m3", null],
  ["wtp_commissioning_chemical_designation", "Марка пусконаладочных реагентов", "text", null, null],
  ["wtp_commissioning_chemical_quantity_kg", "Количество пусконаладочных реагентов", "decimal", "kg", null],
  ["wtp_effluent_sample_count", "Количество проб очищенной воды", "integer", "sample", null],
  ["wtp_functional_test_count", "Количество функциональных испытаний", "integer", "test", null],
  ["wtp_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wtp_earthworks_civil_labor_h", "Труд на земляные и строительные работы", "decimal", "man_hour", null],
  ["wtp_process_mechanical_labor_h", "Труд на технологический и механический монтаж", "decimal", "man_hour", null],
  ["wtp_electrical_controls_labor_h", "Труд на электромонтаж и автоматику", "decimal", "man_hour", null],
  ["wtp_commissioning_labor_h", "Труд на пусконаладку", "decimal", "man_hour", null],
  ["wtp_qa_documentation_labor_h", "Труд на контроль и документацию", "decimal", "man_hour", null],
  ["wtp_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wtp_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wtp_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["wtp_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["wtp_test_instrument_machine_h", "Работа пусконаладочных приборов", "decimal", "machine_hour", null],
  ["wtp_material_delivery_trip_count", "Рейсы доставки оборудования и материалов", "integer", "trip", null],
  ["wtp_waste_removal_trip_count", "Рейсы вывоза тары и отходов", "integer", "trip", null],
  ["wtp_odor_control_mode", "Система удаления запахов требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_odor_control_designation", "Марка системы удаления запахов", "text", null, null],
  ["wtp_odor_control_quantity_set", "Количество комплектов удаления запахов", "integer", "set", null],
  ["wtp_tertiary_polishing_mode", "Третичная доочистка требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_tertiary_polishing_designation", "Марка третичной доочистки", "text", null, null],
  ["wtp_tertiary_polishing_capacity_m3_day", "Проектная производительность третичной доочистки", "decimal", "m3_per_day", null],
  ["wtp_standby_power_mode", "Резервное питание требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_standby_power_designation", "Марка резервного источника питания", "text", null, null],
  ["wtp_standby_power_quantity_set", "Количество комплектов резервного питания", "integer", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("wtp_odor_control_")
    && parameterId !== "wtp_odor_control_mode" ? "wtp_odor_control_mode"
    : parameterId.startsWith("wtp_tertiary_polishing_")
      && parameterId !== "wtp_tertiary_polishing_mode" ? "wtp_tertiary_polishing_mode"
      : parameterId.startsWith("wtp_standby_power_")
        && parameterId !== "wtp_standby_power_mode" ? "wtp_standby_power_mode" : null;
  return branch ? {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  } : {};
}

export type WastewaterTreatmentPlantParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WASTEWATER_TREATMENT_PLANT_PARAMETERS: readonly WastewaterTreatmentPlantParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "wtp_membrane_cassette_retained_spare_piece" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.wastewater-treatment-plant-r1",
        semantic_parameter_key: `wastewater-treatment-plant:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_WWTP_PROJECT_MANUFACTURER_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу, утверждённой технологии и спецификации КОС.`
            : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе пусконаладки.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_WWTP_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_WWTP_PROJECT_DOCUMENTATION",
          source_document: WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
          source_locator: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
          guide_version: "wastewater-treatment-plant-r1",
          source_snapshot_hash: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранная технологическая линия КОС и прямые внутренние сооружения; наружная сеть, отдельные КНС и невыбранное обезвоживание осадка исключены.",
          verified_at: "2026-10-01T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        synthetic: false,
      },
    }),
  ));

export const WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT = Object.freeze({
  wtp_membrane_cassette_retained_spare_piece: 0,
  wtp_membrane_cassette_supplier_package_quantity_piece: 1,
});
export const WASTEWATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WASTEWATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT)
    .map((id) => [id, [WASTEWATER_TREATMENT_PLANT_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{
  rowId: string; section: string; category: string; titleRu: string; unitId: string;
  formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: readonly string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:wtp_acceptance", section: "Работы", category: "construction_work", titleRu: "Монтаж, пуск и приёмка очистных сооружений", unitId: "piece", formulaId: "wtp_acceptance_count_v1", expression: "wtp_plant_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_membrane_cassettes", section: "Оборудование", category: "equipment", titleRu: "Мембранные кассеты MBR", unitId: "piece", formulaId: "wtp_membrane_cassette_order_quantity_v1", expression: "ceil((wtp_membrane_cassette_installed_piece+wtp_membrane_cassette_retained_spare_piece)/wtp_membrane_cassette_supplier_package_quantity_piece)*wtp_membrane_cassette_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_membrane_cassette_designation"] },
  { rowId: "rc09:wtp_screen", section: "Оборудование", category: "equipment", titleRu: "Механические решётки", unitId: "piece", formulaId: "wtp_screen_quantity_v1", expression: "wtp_screen_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_screen_designation"] },
  { rowId: "rc09:wtp_grit_unit", section: "Оборудование", category: "equipment", titleRu: "Песколовки", unitId: "piece", formulaId: "wtp_grit_unit_quantity_v1", expression: "wtp_grit_unit_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_grit_unit_designation"] },
  { rowId: "rc09:wtp_equalization_tank", section: "Сооружения", category: "construction_work", titleRu: "Резервуар-усреднитель", unitId: "m3", formulaId: "wtp_equalization_tank_volume_v1", expression: "wtp_equalization_tank_volume_m3" },
  { rowId: "rc09:wtp_anoxic_tank", section: "Сооружения", category: "construction_work", titleRu: "Аноксидная зона", unitId: "m3", formulaId: "wtp_anoxic_tank_volume_v1", expression: "wtp_anoxic_tank_volume_m3" },
  { rowId: "rc09:wtp_aerobic_tank", section: "Сооружения", category: "construction_work", titleRu: "Аэробная зона", unitId: "m3", formulaId: "wtp_aerobic_tank_volume_v1", expression: "wtp_aerobic_tank_volume_m3" },
  { rowId: "rc09:wtp_aeration_diffusers", section: "Комплектующие", category: "material", titleRu: "Аэрационные диффузоры", unitId: "piece", formulaId: "wtp_aeration_diffuser_quantity_v1", expression: "wtp_aeration_diffuser_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_aeration_diffuser_designation"] },
  { rowId: "rc09:wtp_blowers", section: "Оборудование", category: "equipment", titleRu: "Воздуходувки", unitId: "piece", formulaId: "wtp_blower_quantity_v1", expression: "wtp_blower_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_blower_designation"] },
  { rowId: "rc09:wtp_internal_recycle_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы внутреннего рецикла", unitId: "piece", formulaId: "wtp_internal_recycle_pump_quantity_v1", expression: "wtp_internal_recycle_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_internal_recycle_pump_designation"] },
  { rowId: "rc09:wtp_waste_sludge_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы избыточного ила", unitId: "piece", formulaId: "wtp_waste_sludge_pump_quantity_v1", expression: "wtp_waste_sludge_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_waste_sludge_pump_designation"] },
  { rowId: "rc09:wtp_uv_units", section: "Оборудование", category: "equipment", titleRu: "УФ-обеззараживание", unitId: "piece", formulaId: "wtp_uv_unit_quantity_v1", expression: "wtp_uv_unit_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_uv_unit_designation"] },
  { rowId: "rc09:wtp_chemical_dosing", section: "Оборудование", category: "equipment", titleRu: "Реагентное дозирование", unitId: "set", formulaId: "wtp_chemical_dosing_quantity_v1", expression: "wtp_chemical_dosing_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_chemical_dosing_designation"] },
  { rowId: "rc09:wtp_instrumentation", section: "Автоматика", category: "equipment", titleRu: "Технологические КИП", unitId: "set", formulaId: "wtp_instrumentation_quantity_v1", expression: "wtp_instrumentation_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_instrumentation_designation"] },
  { rowId: "rc09:wtp_scada", section: "Автоматика", category: "equipment", titleRu: "SCADA и система управления", unitId: "set", formulaId: "wtp_scada_quantity_v1", expression: "wtp_scada_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_scada_designation"] },
  { rowId: "rc09:wtp_process_piping", section: "Материалы", category: "material", titleRu: "Внутренние технологические трубопроводы", unitId: "m", formulaId: "wtp_process_piping_length_v1", expression: "wtp_process_piping_length_m", procurementEligible: true, titleParameterIds: ["wtp_process_piping_designation"] },
  { rowId: "rc09:wtp_process_valves", section: "Комплектующие", category: "material", titleRu: "Технологическая арматура", unitId: "piece", formulaId: "wtp_process_valve_quantity_v1", expression: "wtp_process_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_process_valve_designation"] },
  { rowId: "rc09:wtp_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон", unitId: "m3", formulaId: "wtp_structural_concrete_volume_v1", expression: "wtp_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wtp_reinforcement", section: "Материалы", category: "material", titleRu: "Арматура сооружений", unitId: "kg", formulaId: "wtp_reinforcement_mass_v1", expression: "wtp_reinforcement_mass_kg", procurementEligible: true },
  { rowId: "rc09:wtp_formwork", section: "Материалы", category: "material", titleRu: "Опалубка сооружений", unitId: "m2", formulaId: "wtp_formwork_contact_area_v1", expression: "wtp_formwork_contact_area_m2", procurementEligible: true },
  { rowId: "rc09:wtp_seed_sludge", section: "Пусконаладка", category: "material", titleRu: "Затравочный активный ил", unitId: "m3", formulaId: "wtp_seed_sludge_volume_v1", expression: "wtp_seed_sludge_volume_m3", procurementEligible: true },
  { rowId: "rc09:wtp_commissioning_chemicals", section: "Расходники", category: "material", titleRu: "Пусконаладочные реагенты", unitId: "kg", formulaId: "wtp_commissioning_chemical_quantity_v1", expression: "wtp_commissioning_chemical_quantity_kg", procurementEligible: true, titleParameterIds: ["wtp_commissioning_chemical_designation"] },
  { rowId: "rc09:wtp_effluent_samples", section: "Контроль", category: "service", titleRu: "Лабораторные пробы очищенной воды", unitId: "sample", formulaId: "wtp_effluent_sample_count_v1", expression: "wtp_effluent_sample_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_functional_tests", section: "Контроль", category: "service", titleRu: "Функциональные испытания технологической линии", unitId: "test", formulaId: "wtp_functional_test_count_v1", expression: "wtp_functional_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация КОС", unitId: "document", formulaId: "wtp_asbuilt_document_count_v1", expression: "wtp_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_odor_control", section: "Условное оборудование", category: "equipment", titleRu: "Система удаления запахов", unitId: "set", formulaId: "wtp_odor_control_quantity_v1", expression: "wtp_odor_control_quantity_set", procurementEligible: true, inclusionAst: equals("wtp_odor_control_mode", "REQUIRED"), titleParameterIds: ["wtp_odor_control_designation"] },
  { rowId: "rc09:wtp_tertiary_polishing", section: "Условное оборудование", category: "equipment", titleRu: "Третичная доочистка", unitId: "m3_per_day", formulaId: "wtp_tertiary_polishing_capacity_v1", expression: "wtp_tertiary_polishing_capacity_m3_day", procurementEligible: true, inclusionAst: equals("wtp_tertiary_polishing_mode", "REQUIRED"), titleParameterIds: ["wtp_tertiary_polishing_designation"] },
  { rowId: "rc09:wtp_standby_power", section: "Условное оборудование", category: "equipment", titleRu: "Резервный источник питания", unitId: "set", formulaId: "wtp_standby_power_quantity_v1", expression: "wtp_standby_power_quantity_set", procurementEligible: true, inclusionAst: equals("wtp_standby_power_mode", "REQUIRED"), titleParameterIds: ["wtp_standby_power_designation"] },
  { rowId: "rc09:wtp-membrane-balance:installed-net", section: "Баланс мембран", category: "equipment", titleRu: "Установленные мембранные кассеты", unitId: "piece", formulaId: "wtp_membrane_installed_net_v1", expression: "wtp_membrane_cassette_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-membrane-balance:retained-spare", section: "Баланс мембран", category: "equipment", titleRu: "Сохраняемый запас мембранных кассет", unitId: "piece", formulaId: "wtp_membrane_retained_spare_v1", expression: "wtp_membrane_cassette_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-membrane-balance:total-need", section: "Баланс мембран", category: "equipment", titleRu: "Общая потребность в мембранных кассетах", unitId: "piece", formulaId: "wtp_membrane_total_need_v1", expression: "wtp_membrane_cassette_installed_piece+wtp_membrane_cassette_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-membrane-balance:package-count", section: "Баланс мембран", category: "equipment", titleRu: "Количество упаковок мембранных кассет", unitId: "package", formulaId: "wtp_membrane_package_count_v1", expression: "ceil((wtp_membrane_cassette_installed_piece+wtp_membrane_cassette_retained_spare_piece)/wtp_membrane_cassette_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-membrane-balance:remainder", section: "Баланс мембран", category: "equipment", titleRu: "Остаток кассет после установки", unitId: "piece", formulaId: "wtp_membrane_remainder_v1", expression: "ceil((wtp_membrane_cassette_installed_piece+wtp_membrane_cassette_retained_spare_piece)/wtp_membrane_cassette_supplier_package_quantity_piece)*wtp_membrane_cassette_supplier_package_quantity_piece-wtp_membrane_cassette_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-membrane-balance:surplus-beyond-spare", section: "Баланс мембран", category: "equipment", titleRu: "Свободный остаток кассет сверх запаса", unitId: "piece", formulaId: "wtp_membrane_surplus_v1", expression: "max(0,ceil((wtp_membrane_cassette_installed_piece+wtp_membrane_cassette_retained_spare_piece)/wtp_membrane_cassette_supplier_package_quantity_piece)*wtp_membrane_cassette_supplier_package_quantity_piece-wtp_membrane_cassette_installed_piece-wtp_membrane_cassette_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wtp-earthworks-civil", section: "Труд", category: "construction_work", titleRu: "Земляные и строительные работы КОС", unitId: "man_hour", formulaId: "wtp_earthworks_civil_labor_v1", expression: "wtp_earthworks_civil_labor_h" },
  { rowId: "rc09:labor:wtp-process-mechanical", section: "Труд", category: "construction_work", titleRu: "Технологический и механический монтаж", unitId: "man_hour", formulaId: "wtp_process_mechanical_labor_v1", expression: "wtp_process_mechanical_labor_h" },
  { rowId: "rc09:labor:wtp-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Электромонтаж, КИП и автоматика", unitId: "man_hour", formulaId: "wtp_electrical_controls_labor_v1", expression: "wtp_electrical_controls_labor_h" },
  { rowId: "rc09:labor:wtp-commissioning", section: "Труд", category: "construction_work", titleRu: "Пусконаладка технологического процесса", unitId: "man_hour", formulaId: "wtp_commissioning_labor_v1", expression: "wtp_commissioning_labor_h" },
  { rowId: "rc09:labor:wtp-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль качества и документация", unitId: "man_hour", formulaId: "wtp_qa_documentation_labor_v1", expression: "wtp_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wtp-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wtp_excavator_machine_v1", expression: "wtp_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "wtp_crane_machine_v1", expression: "wtp_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "wtp_concrete_pump_machine_v1", expression: "wtp_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "wtp_welding_machine_v1", expression: "wtp_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-test-instruments", section: "Механизмы", category: "equipment", titleRu: "Пусконаладочные приборы", unitId: "machine_hour", formulaId: "wtp_test_instrument_machine_v1", expression: "wtp_test_instrument_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wtp-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов", unitId: "trip", formulaId: "wtp_material_delivery_trip_v1", expression: "wtp_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wtp-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз тары и отходов", unitId: "trip", formulaId: "wtp_waste_removal_trip_v1", expression: "wtp_waste_removal_trip_count", procurementEligible: true },
]);

export const WASTEWATER_TREATMENT_PLANT_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    };
  }));
export const WASTEWATER_TREATMENT_PLANT_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = {
      formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `wastewater-treatment-plant:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: KNOWN_SCOPE,
      costTreatment: row.costTreatment ?? "OWN_COST",
    };
    const sourceRole = "APPROVED_WWTP_PROJECT_MANUFACTURER_PACKAGE";
    const sourceMetadata = {
      truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{
        sourceId: WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
        source_id: WASTEWATER_TREATMENT_PLANT_SOURCE_ID,
        normId: WASTEWATER_TREATMENT_PLANT_NORM_ID,
        norm_id: WASTEWATER_TREATMENT_PLANT_NORM_ID,
        normVersion: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.source_document_version,
        source_title: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.source_title,
        exact_locator: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
        source_definition_hash: WASTEWATER_TREATMENT_PLANT_SOURCE_METADATA.definition_hash,
        sourceRole,
      }],
      excludedUnownedAssumptions: [
        "external collection network, unrelated pumping station, unselected building or sludge dewatering",
        "flow-or-train-derived process, civil, labor, mechanism or logistics quantity",
        "automatic odor control, tertiary polishing or standby power",
        "automatic retained spare or supplier package", "invented price",
      ],
    };
    return {
      id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId,
      inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }),
    };
  }));

export const WASTEWATER_TREATMENT_PLANT_SHORT_INPUT = Object.freeze({
  wtp_plant_count: 1, wtp_plant_designation: "WWTP-MBR-1000-2T",
  wtp_process_technology: "SCREEN_GRIT_ANOXIC_AEROBIC_MBR_UV",
  wtp_design_flow_m3_day: 1000, wtp_peak_flow_m3_day: 1500,
  wtp_process_train_count: 2, wtp_influent_bod5_mg_l: 250,
  wtp_influent_tss_mg_l: 300, wtp_influent_tn_mg_l: 45,
  wtp_effluent_bod5_mg_l: 10, wtp_effluent_tss_mg_l: 10,
  wtp_effluent_tn_mg_l: 10, wtp_membrane_cassette_installed_piece: 8,
  wtp_membrane_cassette_designation: "MBR-CASSETTE-50M3H",
  ...WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT,
});
export const WASTEWATER_TREATMENT_PLANT_ACCEPTANCE_INPUT = Object.freeze({
  ...WASTEWATER_TREATMENT_PLANT_SHORT_INPUT,
  wtp_screen_designation: "FINE-SCREEN-3MM-SS316", wtp_screen_quantity_piece: 2,
  wtp_grit_unit_designation: "VORTEX-GRIT-50LPS", wtp_grit_unit_quantity_piece: 2,
  wtp_equalization_tank_volume_m3: 420, wtp_anoxic_tank_volume_m3: 360,
  wtp_aerobic_tank_volume_m3: 1200,
  wtp_aeration_diffuser_designation: "EPDM-FINE-BUBBLE-9IN", wtp_aeration_diffuser_quantity_piece: 240,
  wtp_blower_designation: "BLOWER-ROOTS-75KW-VFD", wtp_blower_quantity_piece: 3,
  wtp_internal_recycle_pump_designation: "RECYCLE-Q80-H8", wtp_internal_recycle_pump_quantity_piece: 3,
  wtp_waste_sludge_pump_designation: "WAS-Q10-H12", wtp_waste_sludge_pump_quantity_piece: 2,
  wtp_uv_unit_designation: "UV-750M3D-40MJ", wtp_uv_unit_quantity_piece: 2,
  wtp_chemical_dosing_designation: "DOSING-NAOCL-PAC-2X", wtp_chemical_dosing_quantity_set: 2,
  wtp_instrumentation_designation: "WQ-FLOW-DO-MLSS-PH", wtp_instrumentation_quantity_set: 2,
  wtp_scada_designation: "PLC-SCADA-WWTP-2T", wtp_scada_quantity_set: 1,
  wtp_process_piping_designation: "SS316-HDPE-PROCESS-PIPING", wtp_process_piping_length_m: 680,
  wtp_process_valve_designation: "SS316-HDPE-PROCESS-VALVES", wtp_process_valve_quantity_piece: 86,
  wtp_structural_concrete_volume_m3: 840, wtp_reinforcement_mass_kg: 112000,
  wtp_formwork_contact_area_m2: 4100, wtp_seed_sludge_volume_m3: 180,
  wtp_commissioning_chemical_designation: "STARTUP-NUTRIENT-ALKALINITY", wtp_commissioning_chemical_quantity_kg: 3200,
  wtp_effluent_sample_count: 24, wtp_functional_test_count: 12,
  wtp_asbuilt_document_count: 1, wtp_earthworks_civil_labor_h: 4200,
  wtp_process_mechanical_labor_h: 2800, wtp_electrical_controls_labor_h: 1900,
  wtp_commissioning_labor_h: 960, wtp_qa_documentation_labor_h: 640,
  wtp_excavator_machine_h: 320, wtp_crane_machine_h: 280,
  wtp_concrete_pump_machine_h: 160, wtp_welding_machine_h: 240,
  wtp_test_instrument_machine_h: 180, wtp_material_delivery_trip_count: 96,
  wtp_waste_removal_trip_count: 34, wtp_odor_control_mode: "NOT_REQUIRED",
  wtp_tertiary_polishing_mode: "NOT_REQUIRED", wtp_standby_power_mode: "NOT_REQUIRED",
});

export async function compileWastewaterTreatmentPlantR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WASTEWATER_TREATMENT_PLANT_CATALOG_ID;
  if (catalogId !== WASTEWATER_TREATMENT_PLANT_CATALOG_ID) {
    throw new Error(`WASTEWATER_TREATMENT_PLANT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.wastewater-treatment-plant-r1",
    catalogId, primaryMeasureParameterId: "wtp_plant_count",
    parameterDefinitions: [...WASTEWATER_TREATMENT_PLANT_PARAMETERS],
    formulaDefinitions: [...WASTEWATER_TREATMENT_PLANT_FORMULAS],
    resourceDefinitions: [...WASTEWATER_TREATMENT_PLANT_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...WASTEWATER_TREATMENT_PLANT_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: 50,
    hashJson: async (value) => JSON.stringify(value),
  });
}
