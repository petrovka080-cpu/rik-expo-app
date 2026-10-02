import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const SLUDGE_DEWATERING_CATALOG_ID = "canonical-work:expanded:sludge_dewatering";
export const SLUDGE_DEWATERING_SOURCE_ID = "project_multi_disc_screw_press_sludge_dewatering_balance_v1";
export const SLUDGE_DEWATERING_NORM_ID = "norm:project:multi_disc_screw_press_sludge_dewatering_balance:v1";
export const SLUDGE_DEWATERING_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый технологический проект обезвоживания осадка на мультидисковых шнековых прессах, спецификации поставщиков и программа пусконаладки",
  source_authority: "Проектировщик обработки осадка, поставщик шнековых прессов и полимерной станции, изготовители оборудования, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_MULTI_DISC_SCREW_PRESS_SLUDGE_DEWATERING_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "fa470e7a011e0494008774bd0009da5d3daa75a4934cec23dc75e0a86ce68fe8",
  exact_locator: "1 комплекс SD-MDSP-2X10-D20, MULTI_DISC_SCREW_PRESS, 10 м3/ч, сухое вещество вход 2%, кек 20%, 8 ч/сут, 2 пресса MDSP-10M3H",
  use_restriction: "Расход осадка, содержание сухого вещества и часы работы не определяют автоматически оборудование, сооружения, реагенты, труд, механизмы или логистику. Удаление запахов, хранение кека и резервное питание включаются только по проекту. Полные КОС, аэротенки, сбраживание, иловые площадки, сжигание, наружные сети и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "fa470e7a011e0494008774bd0009da5d3daa75a4934cec23dc75e0a86ce68fe8",
});
const KNOWN_SCOPE = ["sdw_system_count", "sdw_system_designation", "sdw_dewatering_technology",
  "sdw_sludge_feed_flow_m3_h", "sdw_inlet_dry_solids_percent", "sdw_cake_dry_solids_percent",
  "sdw_operating_hours_day", "sdw_press_unit_installed_piece", "sdw_press_unit_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "sdw_press_unit_retained_spare_piece", "sdw_press_unit_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "sdw_odor_control_designation", "sdw_odor_control_quantity_set",
  "sdw_cake_storage_designation", "sdw_cake_storage_quantity_set",
  "sdw_standby_power_designation", "sdw_standby_power_quantity_set",
]);
const PARAMETER_SPECS = Object.freeze([
  ["sdw_system_count", "Количество комплексов обезвоживания осадка", "integer", "piece", null],
  ["sdw_system_designation", "Марка комплекса обезвоживания", "text", null, null],
  ["sdw_dewatering_technology", "Технология обезвоживания", "enum", null, ["MULTI_DISC_SCREW_PRESS"]],
  ["sdw_sludge_feed_flow_m3_h", "Расчётная подача осадка", "decimal", "m3_per_h", null],
  ["sdw_inlet_dry_solids_percent", "Сухое вещество исходного осадка", "decimal", "percent", null],
  ["sdw_cake_dry_solids_percent", "Сухое вещество обезвоженного кека", "decimal", "percent", null],
  ["sdw_operating_hours_day", "Рабочее время в сутки", "decimal", "hour_per_day", null],
  ["sdw_press_unit_installed_piece", "Устанавливаемые шнековые прессы", "integer", "piece", null],
  ["sdw_press_unit_designation", "Марка шнекового пресса", "text", null, null],
  ["sdw_press_unit_retained_spare_piece", "Сохраняемый запас шнековых прессов", "integer", "piece", null],
  ["sdw_press_unit_supplier_package_quantity_piece", "Прессов в поставочном пакете", "integer", "piece", null],
  ["sdw_feed_pump_designation", "Марка насоса подачи осадка", "text", null, null],
  ["sdw_feed_pump_quantity_piece", "Количество насосов подачи осадка", "integer", "piece", null],
  ["sdw_polymer_preparation_designation", "Марка станции приготовления полимера", "text", null, null],
  ["sdw_polymer_preparation_quantity_set", "Количество станций приготовления полимера", "integer", "set", null],
  ["sdw_polymer_dosing_pump_designation", "Марка насоса дозирования полимера", "text", null, null],
  ["sdw_polymer_dosing_pump_quantity_piece", "Количество насосов дозирования полимера", "integer", "piece", null],
  ["sdw_flocculation_tank_designation", "Марка флокуляционного резервуара", "text", null, null],
  ["sdw_flocculation_tank_quantity_piece", "Количество флокуляционных резервуаров", "integer", "piece", null],
  ["sdw_cake_conveyor_designation", "Марка транспортёра кека", "text", null, null],
  ["sdw_cake_conveyor_quantity_piece", "Количество транспортёров кека", "integer", "piece", null],
  ["sdw_filtrate_piping_designation", "Марка трубопровода фильтрата", "text", null, null],
  ["sdw_filtrate_piping_length_m", "Длина трубопровода фильтрата", "decimal", "m", null],
  ["sdw_process_piping_designation", "Марка внутренних технологических трубопроводов", "text", null, null],
  ["sdw_process_piping_length_m", "Длина внутренних технологических трубопроводов", "decimal", "m", null],
  ["sdw_process_valve_designation", "Марка технологической арматуры", "text", null, null],
  ["sdw_process_valve_quantity_piece", "Количество технологической арматуры", "integer", "piece", null],
  ["sdw_instrumentation_designation", "Марка технологических КИП", "text", null, null],
  ["sdw_instrumentation_quantity_set", "Количество комплектов КИП", "integer", "set", null],
  ["sdw_control_panel_designation", "Марка шкафа управления", "text", null, null],
  ["sdw_control_panel_quantity_piece", "Количество шкафов управления", "integer", "piece", null],
  ["sdw_access_safety_designation", "Марка площадок и ограждений", "text", null, null],
  ["sdw_access_safety_quantity_set", "Количество комплектов доступа и безопасности", "integer", "set", null],
  ["sdw_base_concrete_volume_m3", "Объём бетона оснований оборудования", "decimal", "m3", null],
  ["sdw_nonshrink_grout_volume_m3", "Объём безусадочного раствора", "decimal", "m3", null],
  ["sdw_commissioning_polymer_designation", "Марка пусконаладочного полимера", "text", null, null],
  ["sdw_commissioning_polymer_quantity_kg", "Количество пусконаладочного полимера", "decimal", "kg", null],
  ["sdw_wash_water_volume_m3", "Объём промывочной воды для пусконаладки", "decimal", "m3", null],
  ["sdw_cake_sample_count", "Количество проб обезвоженного кека", "integer", "sample", null],
  ["sdw_functional_test_count", "Количество функциональных испытаний", "integer", "test", null],
  ["sdw_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["sdw_civil_base_labor_h", "Труд на основания оборудования", "decimal", "man_hour", null],
  ["sdw_mechanical_installation_labor_h", "Труд на механический монтаж", "decimal", "man_hour", null],
  ["sdw_piping_installation_labor_h", "Труд на трубопроводы и арматуру", "decimal", "man_hour", null],
  ["sdw_electrical_controls_labor_h", "Труд на электромонтаж и автоматику", "decimal", "man_hour", null],
  ["sdw_qa_commissioning_labor_h", "Труд на пуск, контроль и оформление", "decimal", "man_hour", null],
  ["sdw_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["sdw_forklift_machine_h", "Работа погрузчика", "decimal", "machine_hour", null],
  ["sdw_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["sdw_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["sdw_test_equipment_machine_h", "Работа пусконаладочного оборудования", "decimal", "machine_hour", null],
  ["sdw_material_delivery_trip_count", "Рейсы доставки оборудования и материалов", "integer", "trip", null],
  ["sdw_waste_removal_trip_count", "Рейсы вывоза тары и отходов", "integer", "trip", null],
  ["sdw_odor_control_mode", "Удаление запахов требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sdw_odor_control_designation", "Марка системы удаления запахов", "text", null, null],
  ["sdw_odor_control_quantity_set", "Количество комплектов удаления запахов", "integer", "set", null],
  ["sdw_cake_storage_mode", "Накопление кека входит в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["sdw_cake_storage_designation", "Марка накопителя кека", "text", null, null],
  ["sdw_cake_storage_quantity_set", "Количество комплектов накопления кека", "integer", "set", null],
  ["sdw_standby_power_mode", "Резервное питание требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sdw_standby_power_designation", "Марка резервного источника питания", "text", null, null],
  ["sdw_standby_power_quantity_set", "Количество комплектов резервного питания", "integer", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branches = [
    { stem: "sdw_odor_control_", mode: "sdw_odor_control_mode", on: "REQUIRED", off: "NOT_REQUIRED" },
    { stem: "sdw_cake_storage_", mode: "sdw_cake_storage_mode", on: "INCLUDED", off: "NOT_INCLUDED" },
    { stem: "sdw_standby_power_", mode: "sdw_standby_power_mode", on: "REQUIRED", off: "NOT_REQUIRED" },
  ];
  const branch = branches.find((candidate) => parameterId.startsWith(candidate.stem)
    && parameterId !== candidate.mode);
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch.mode, value: branch.on },
    forbiddenWhen: { kind: "equals", parameterId: branch.mode, value: branch.off } } : {};
}
export type SludgeDewateringParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const SLUDGE_DEWATERING_PARAMETERS: readonly SludgeDewateringParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "sdw_press_unit_retained_spare_piece" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.sludge-dewatering-r1",
      semantic_parameter_key: `sludge-dewatering:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_SLUDGE_DEWATERING_PROJECT_MANUFACTURER_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, проекту и спецификации комплекса обезвоживания.`
          : `${titleRu}: укажите по проекту, спецификации поставщика, ведомости объёмов, ППР или программе пусконаладки.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_SLUDGE_DEWATERING_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_SLUDGE_DEWATERING_PROJECT_DOCUMENTATION",
        source_document: SLUDGE_DEWATERING_SOURCE_ID,
        source_locator: SLUDGE_DEWATERING_SOURCE_METADATA.exact_locator,
        guide_version: "sludge-dewatering-r1",
        source_snapshot_hash: SLUDGE_DEWATERING_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранный комплекс шнекового обезвоживания; полные КОС, аэротенки, сбраживание, иловые площадки и наружные сети исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);
export const SLUDGE_DEWATERING_RUNTIME_INPUT = Object.freeze({
  sdw_press_unit_retained_spare_piece: 0, sdw_press_unit_supplier_package_quantity_piece: 1,
});
export const SLUDGE_DEWATERING_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(SLUDGE_DEWATERING_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const SLUDGE_DEWATERING_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(SLUDGE_DEWATERING_RUNTIME_INPUT).map((id) => [id, [SLUDGE_DEWATERING_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:sdw_acceptance", section: "Работы", category: "construction_work", titleRu: "Монтаж, пуск и приёмка комплекса обезвоживания осадка", unitId: "piece", formulaId: "sdw_acceptance_count_v1", expression: "sdw_system_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw_press_units", section: "Оборудование", category: "equipment", titleRu: "Мультидисковые шнековые прессы", unitId: "piece", formulaId: "sdw_press_unit_order_quantity_v1", expression: "ceil((sdw_press_unit_installed_piece+sdw_press_unit_retained_spare_piece)/sdw_press_unit_supplier_package_quantity_piece)*sdw_press_unit_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_press_unit_designation"] },
  { rowId: "rc09:sdw_feed_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы подачи осадка", unitId: "piece", formulaId: "sdw_feed_pump_quantity_v1", expression: "sdw_feed_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_feed_pump_designation"] },
  { rowId: "rc09:sdw_polymer_preparation", section: "Оборудование", category: "equipment", titleRu: "Станция приготовления полимера", unitId: "set", formulaId: "sdw_polymer_preparation_quantity_v1", expression: "sdw_polymer_preparation_quantity_set", procurementEligible: true, titleParameterIds: ["sdw_polymer_preparation_designation"] },
  { rowId: "rc09:sdw_polymer_dosing_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы дозирования полимера", unitId: "piece", formulaId: "sdw_polymer_dosing_pump_quantity_v1", expression: "sdw_polymer_dosing_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_polymer_dosing_pump_designation"] },
  { rowId: "rc09:sdw_flocculation_tanks", section: "Оборудование", category: "equipment", titleRu: "Флокуляционные резервуары", unitId: "piece", formulaId: "sdw_flocculation_tank_quantity_v1", expression: "sdw_flocculation_tank_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_flocculation_tank_designation"] },
  { rowId: "rc09:sdw_cake_conveyors", section: "Оборудование", category: "equipment", titleRu: "Транспортёры обезвоженного кека", unitId: "piece", formulaId: "sdw_cake_conveyor_quantity_v1", expression: "sdw_cake_conveyor_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_cake_conveyor_designation"] },
  { rowId: "rc09:sdw_filtrate_piping", section: "Материалы", category: "material", titleRu: "Трубопровод фильтрата", unitId: "m", formulaId: "sdw_filtrate_piping_length_v1", expression: "sdw_filtrate_piping_length_m", procurementEligible: true, titleParameterIds: ["sdw_filtrate_piping_designation"] },
  { rowId: "rc09:sdw_process_piping", section: "Материалы", category: "material", titleRu: "Внутренние технологические трубопроводы", unitId: "m", formulaId: "sdw_process_piping_length_v1", expression: "sdw_process_piping_length_m", procurementEligible: true, titleParameterIds: ["sdw_process_piping_designation"] },
  { rowId: "rc09:sdw_process_valves", section: "Комплектующие", category: "material", titleRu: "Технологическая арматура", unitId: "piece", formulaId: "sdw_process_valve_quantity_v1", expression: "sdw_process_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_process_valve_designation"] },
  { rowId: "rc09:sdw_instrumentation", section: "Автоматика", category: "equipment", titleRu: "Технологические КИП", unitId: "set", formulaId: "sdw_instrumentation_quantity_v1", expression: "sdw_instrumentation_quantity_set", procurementEligible: true, titleParameterIds: ["sdw_instrumentation_designation"] },
  { rowId: "rc09:sdw_control_panel", section: "Автоматика", category: "equipment", titleRu: "Шкаф управления", unitId: "piece", formulaId: "sdw_control_panel_quantity_v1", expression: "sdw_control_panel_quantity_piece", procurementEligible: true, titleParameterIds: ["sdw_control_panel_designation"] },
  { rowId: "rc09:sdw_access_safety", section: "Комплектующие", category: "material", titleRu: "Площадки и ограждения", unitId: "set", formulaId: "sdw_access_safety_quantity_v1", expression: "sdw_access_safety_quantity_set", procurementEligible: true, titleParameterIds: ["sdw_access_safety_designation"] },
  { rowId: "rc09:sdw_base_concrete", section: "Материалы", category: "material", titleRu: "Бетон оснований оборудования", unitId: "m3", formulaId: "sdw_base_concrete_volume_v1", expression: "sdw_base_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:sdw_nonshrink_grout", section: "Расходники", category: "material", titleRu: "Безусадочный раствор", unitId: "m3", formulaId: "sdw_nonshrink_grout_volume_v1", expression: "sdw_nonshrink_grout_volume_m3", procurementEligible: true },
  { rowId: "rc09:sdw_commissioning_polymer", section: "Расходники", category: "material", titleRu: "Пусконаладочный полимер", unitId: "kg", formulaId: "sdw_commissioning_polymer_quantity_v1", expression: "sdw_commissioning_polymer_quantity_kg", procurementEligible: true, titleParameterIds: ["sdw_commissioning_polymer_designation"] },
  { rowId: "rc09:sdw_wash_water", section: "Расходники", category: "material", titleRu: "Промывочная вода для пусконаладки", unitId: "m3", formulaId: "sdw_wash_water_volume_v1", expression: "sdw_wash_water_volume_m3", procurementEligible: true },
  { rowId: "rc09:sdw_cake_samples", section: "Контроль", category: "service", titleRu: "Лабораторные пробы обезвоженного кека", unitId: "sample", formulaId: "sdw_cake_sample_count_v1", expression: "sdw_cake_sample_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw_functional_tests", section: "Контроль", category: "service", titleRu: "Функциональные испытания комплекса", unitId: "test", formulaId: "sdw_functional_test_count_v1", expression: "sdw_functional_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация", unitId: "document", formulaId: "sdw_asbuilt_document_count_v1", expression: "sdw_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw_odor_control", section: "Условное оборудование", category: "equipment", titleRu: "Система удаления запахов", unitId: "set", formulaId: "sdw_odor_control_quantity_v1", expression: "sdw_odor_control_quantity_set", procurementEligible: true, inclusionAst: equals("sdw_odor_control_mode", "REQUIRED"), titleParameterIds: ["sdw_odor_control_designation"] },
  { rowId: "rc09:sdw_cake_storage", section: "Условное оборудование", category: "equipment", titleRu: "Накопитель обезвоженного кека", unitId: "set", formulaId: "sdw_cake_storage_quantity_v1", expression: "sdw_cake_storage_quantity_set", procurementEligible: true, inclusionAst: equals("sdw_cake_storage_mode", "INCLUDED"), titleParameterIds: ["sdw_cake_storage_designation"] },
  { rowId: "rc09:sdw_standby_power", section: "Условное оборудование", category: "equipment", titleRu: "Резервный источник питания", unitId: "set", formulaId: "sdw_standby_power_quantity_v1", expression: "sdw_standby_power_quantity_set", procurementEligible: true, inclusionAst: equals("sdw_standby_power_mode", "REQUIRED"), titleParameterIds: ["sdw_standby_power_designation"] },
  { rowId: "rc09:sdw-press-balance:installed-net", section: "Баланс прессов", category: "equipment", titleRu: "Установленные шнековые прессы", unitId: "piece", formulaId: "sdw_press_installed_net_v1", expression: "sdw_press_unit_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw-press-balance:retained-spare", section: "Баланс прессов", category: "equipment", titleRu: "Сохраняемый запас прессов", unitId: "piece", formulaId: "sdw_press_retained_spare_v1", expression: "sdw_press_unit_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw-press-balance:total-need", section: "Баланс прессов", category: "equipment", titleRu: "Общая потребность в прессах", unitId: "piece", formulaId: "sdw_press_total_need_v1", expression: "sdw_press_unit_installed_piece+sdw_press_unit_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw-press-balance:package-count", section: "Баланс прессов", category: "equipment", titleRu: "Количество поставочных пакетов", unitId: "package", formulaId: "sdw_press_package_count_v1", expression: "ceil((sdw_press_unit_installed_piece+sdw_press_unit_retained_spare_piece)/sdw_press_unit_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw-press-balance:remainder", section: "Баланс прессов", category: "equipment", titleRu: "Остаток прессов после установки", unitId: "piece", formulaId: "sdw_press_remainder_v1", expression: "ceil((sdw_press_unit_installed_piece+sdw_press_unit_retained_spare_piece)/sdw_press_unit_supplier_package_quantity_piece)*sdw_press_unit_supplier_package_quantity_piece-sdw_press_unit_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:sdw-press-balance:surplus-beyond-spare", section: "Баланс прессов", category: "equipment", titleRu: "Свободный остаток прессов сверх запаса", unitId: "piece", formulaId: "sdw_press_surplus_v1", expression: "max(0,ceil((sdw_press_unit_installed_piece+sdw_press_unit_retained_spare_piece)/sdw_press_unit_supplier_package_quantity_piece)*sdw_press_unit_supplier_package_quantity_piece-sdw_press_unit_installed_piece-sdw_press_unit_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:sdw-civil-base", section: "Труд", category: "construction_work", titleRu: "Основания оборудования", unitId: "man_hour", formulaId: "sdw_civil_base_labor_v1", expression: "sdw_civil_base_labor_h" },
  { rowId: "rc09:labor:sdw-mechanical-installation", section: "Труд", category: "construction_work", titleRu: "Механический монтаж", unitId: "man_hour", formulaId: "sdw_mechanical_installation_labor_v1", expression: "sdw_mechanical_installation_labor_h" },
  { rowId: "rc09:labor:sdw-piping-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж трубопроводов и арматуры", unitId: "man_hour", formulaId: "sdw_piping_installation_labor_v1", expression: "sdw_piping_installation_labor_h" },
  { rowId: "rc09:labor:sdw-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Электромонтаж и автоматика", unitId: "man_hour", formulaId: "sdw_electrical_controls_labor_v1", expression: "sdw_electrical_controls_labor_h" },
  { rowId: "rc09:labor:sdw-qa-commissioning", section: "Труд", category: "construction_work", titleRu: "Пуск, контроль и оформление", unitId: "man_hour", formulaId: "sdw_qa_commissioning_labor_v1", expression: "sdw_qa_commissioning_labor_h" },
  { rowId: "rc09:equipment:sdw-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "sdw_crane_machine_v1", expression: "sdw_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sdw-forklift", section: "Механизмы", category: "equipment", titleRu: "Погрузчик", unitId: "machine_hour", formulaId: "sdw_forklift_machine_v1", expression: "sdw_forklift_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sdw-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "sdw_concrete_pump_machine_v1", expression: "sdw_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sdw-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "sdw_welding_machine_v1", expression: "sdw_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:sdw-test", section: "Механизмы", category: "equipment", titleRu: "Пусконаладочное оборудование", unitId: "machine_hour", formulaId: "sdw_test_equipment_machine_v1", expression: "sdw_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:sdw-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов", unitId: "trip", formulaId: "sdw_material_delivery_trip_v1", expression: "sdw_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:sdw-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз тары и отходов", unitId: "trip", formulaId: "sdw_waste_removal_trip_v1", expression: "sdw_waste_removal_trip_count", procurementEligible: true },
]);
export const SLUDGE_DEWATERING_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const SLUDGE_DEWATERING_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `sludge-dewatering:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_SLUDGE_DEWATERING_PROJECT_MANUFACTURER_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: SLUDGE_DEWATERING_SOURCE_ID, source_id: SLUDGE_DEWATERING_SOURCE_ID,
        normId: SLUDGE_DEWATERING_NORM_ID, norm_id: SLUDGE_DEWATERING_NORM_ID,
        normVersion: SLUDGE_DEWATERING_SOURCE_METADATA.source_document_version,
        source_title: SLUDGE_DEWATERING_SOURCE_METADATA.source_title,
        exact_locator: SLUDGE_DEWATERING_SOURCE_METADATA.exact_locator,
        source_definition_hash: SLUDGE_DEWATERING_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["complete treatment plant, aeration tanks, digestion, drying beds, incineration or external network",
        "flow-solids-or-hours-derived equipment, material, labor, mechanism or logistics quantity",
        "automatic odor control, cake storage or standby power",
        "automatic retained spare or supplier package", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId, ordinal,
      section: row.section, category: row.category, title_ru: row.titleRu, unit_id: row.unitId,
      formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const SLUDGE_DEWATERING_SHORT_INPUT = Object.freeze({
  sdw_system_count: 1, sdw_system_designation: "SD-MDSP-2X10-D20",
  sdw_dewatering_technology: "MULTI_DISC_SCREW_PRESS", sdw_sludge_feed_flow_m3_h: 10,
  sdw_inlet_dry_solids_percent: 2, sdw_cake_dry_solids_percent: 20,
  sdw_operating_hours_day: 8, sdw_press_unit_installed_piece: 2,
  sdw_press_unit_designation: "MDSP-10M3H", ...SLUDGE_DEWATERING_RUNTIME_INPUT,
});
export const SLUDGE_DEWATERING_ACCEPTANCE_INPUT = Object.freeze({
  ...SLUDGE_DEWATERING_SHORT_INPUT,
  sdw_feed_pump_designation: "PROGRESSIVE-CAVITY-Q12", sdw_feed_pump_quantity_piece: 3,
  sdw_polymer_preparation_designation: "POLYMER-AUTO-1000L", sdw_polymer_preparation_quantity_set: 1,
  sdw_polymer_dosing_pump_designation: "DOSING-0.5M3H", sdw_polymer_dosing_pump_quantity_piece: 2,
  sdw_flocculation_tank_designation: "FLOC-SS316-1500L", sdw_flocculation_tank_quantity_piece: 2,
  sdw_cake_conveyor_designation: "SCREW-CONVEYOR-4M", sdw_cake_conveyor_quantity_piece: 2,
  sdw_filtrate_piping_designation: "HDPE-PE100-DN110", sdw_filtrate_piping_length_m: 85,
  sdw_process_piping_designation: "SS316-HDPE-SLUDGE-POLYMER", sdw_process_piping_length_m: 190,
  sdw_process_valve_designation: "SLUDGE-POLYMER-VALVE-SET", sdw_process_valve_quantity_piece: 36,
  sdw_instrumentation_designation: "FLOW-DS-PRESSURE-LEVEL", sdw_instrumentation_quantity_set: 2,
  sdw_control_panel_designation: "MCC-PLC-SDW-2X", sdw_control_panel_quantity_piece: 1,
  sdw_access_safety_designation: "HDG-PLATFORM-STAIR-RAIL", sdw_access_safety_quantity_set: 1,
  sdw_base_concrete_volume_m3: 18, sdw_nonshrink_grout_volume_m3: 0.8,
  sdw_commissioning_polymer_designation: "CATIONIC-PAM-STARTUP", sdw_commissioning_polymer_quantity_kg: 280,
  sdw_wash_water_volume_m3: 120, sdw_cake_sample_count: 12,
  sdw_functional_test_count: 6, sdw_asbuilt_document_count: 1,
  sdw_civil_base_labor_h: 180, sdw_mechanical_installation_labor_h: 420,
  sdw_piping_installation_labor_h: 360, sdw_electrical_controls_labor_h: 280,
  sdw_qa_commissioning_labor_h: 240, sdw_crane_machine_h: 56,
  sdw_forklift_machine_h: 48, sdw_concrete_pump_machine_h: 12,
  sdw_welding_machine_h: 96, sdw_test_equipment_machine_h: 80,
  sdw_material_delivery_trip_count: 28, sdw_waste_removal_trip_count: 12,
  sdw_odor_control_mode: "NOT_REQUIRED", sdw_cake_storage_mode: "NOT_INCLUDED",
  sdw_standby_power_mode: "NOT_REQUIRED",
});
export async function compileSludgeDewateringR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SLUDGE_DEWATERING_CATALOG_ID;
  if (catalogId !== SLUDGE_DEWATERING_CATALOG_ID) {
    throw new Error(`SLUDGE_DEWATERING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.sludge-dewatering-r1", catalogId,
    primaryMeasureParameterId: "sdw_system_count",
    parameterDefinitions: [...SLUDGE_DEWATERING_PARAMETERS],
    formulaDefinitions: [...SLUDGE_DEWATERING_FORMULAS],
    resourceDefinitions: [...SLUDGE_DEWATERING_RESOURCES], submittedParameters,
    confirmedParameters: { ...SLUDGE_DEWATERING_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
