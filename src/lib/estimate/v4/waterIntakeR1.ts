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
export const WATER_INTAKE_CATALOG_ID = "canonical-work:expanded:water_intake";
export const WATER_INTAKE_SOURCE_ID =
  "project_riverbank_water_intake_equipment_schedule_raw_water_pump_balance_v1";
export const WATER_INTAKE_NORM_ID =
  "norm:project:riverbank_water_intake_equipment_schedule_raw_water_pump_balance:v1";
export const WATER_INTAKE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект берегового водозабора, гидравлический и конструктивный расчёты, ведомости решёток, насосов, арматуры и закладных",
  source_authority: "Проектировщик водозабора, гидролог, конструктор, поставщики технологического оборудования и утверждающий инженер проекта",
  source_document_version: "PROJECT_RIVERBANK_WATER_INTAKE_CIVIL_MECHANICAL_ELECTRICAL_QA_LOGISTICS_PUMP_BALANCE_S27_24",
  definition_hash: "c15bc85914a268a6b80f1a7399b10bb150224cb22554cbfaaff34af54d7d614a",
  exact_locator: "1 водозабор WI-RIVERBANK-RC-2B-8000-4P, береговой решётчатый насосный, 8000 м3/сут, 2 камеры, 4 решётки SS316-25MM-2000X3000, 4 насоса VTP-250LPS-32M",
  use_restriction: "Производительность, число камер и насосов не определяют автоматически строительные, технологические, электрические, трудовые или логистические объёмы. Перемычка, отвод русла, строительное водопонижение и рыбозащита включаются только по проекту. Наружная сеть, скважина, станция водоподготовки, резервуар, башня, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "c15bc85914a268a6b80f1a7399b10bb150224cb22554cbfaaff34af54d7d614a",
});

const KNOWN_SCOPE = [
  "wi_facility_count", "wi_facility_designation", "wi_intake_type",
  "wi_design_capacity_m3_day", "wi_intake_bay_count",
  "wi_coarse_screen_installed_piece", "wi_coarse_screen_designation",
  "wi_raw_water_pump_installed_piece", "wi_raw_water_pump_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wi_raw_water_pump_retained_spare_piece",
  "wi_raw_water_pump_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "wi_cofferdam_designation", "wi_cofferdam_area_m2",
  "wi_river_diversion_designation", "wi_river_diversion_quantity_set",
  "wi_construction_dewatering_designation", "wi_construction_dewatering_machine_h",
  "wi_fish_protection_designation", "wi_fish_protection_quantity_set",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wi_facility_count", "Количество водозаборных сооружений", "integer", "piece", null],
  ["wi_facility_designation", "Марка водозабора", "text", null, null],
  ["wi_intake_type", "Тип водозабора", "enum", null, ["RIVERBANK_SCREENED_PUMP_INTAKE"]],
  ["wi_design_capacity_m3_day", "Проектная производительность", "decimal", "m3_per_day", null],
  ["wi_intake_bay_count", "Количество водоприёмных камер", "integer", "piece", null],
  ["wi_coarse_screen_installed_piece", "Количество устанавливаемых грубых решёток", "integer", "piece", null],
  ["wi_coarse_screen_designation", "Марка грубых решёток", "text", null, null],
  ["wi_raw_water_pump_installed_piece", "Количество устанавливаемых насосов исходной воды", "integer", "piece", null],
  ["wi_raw_water_pump_designation", "Марка насосов исходной воды", "text", null, null],
  ["wi_raw_water_pump_retained_spare_piece", "Сохраняемый запас насосов", "integer", "piece", null],
  ["wi_raw_water_pump_supplier_package_quantity_piece", "Количество насосов в упаковке поставщика", "integer", "piece", null],
  ["wi_stoplog_gate_designation", "Марка шандорных затворов", "text", null, null],
  ["wi_stoplog_gate_quantity_set", "Количество комплектов шандорных затворов", "integer", "set", null],
  ["wi_pump_valve_kit_designation", "Марка комплектов арматуры насосов", "text", null, null],
  ["wi_pump_valve_kit_quantity_set", "Количество комплектов арматуры насосов", "integer", "set", null],
  ["wi_structural_concrete_volume_m3", "Объём конструкционного бетона", "decimal", "m3", null],
  ["wi_rebar_mass_kg", "Масса арматуры железобетона", "decimal", "kg", null],
  ["wi_formwork_area_m2", "Площадь опалубки", "decimal", "m2", null],
  ["wi_waterproofing_area_m2", "Площадь гидроизоляции", "decimal", "m2", null],
  ["wi_protective_coating_area_m2", "Площадь защитного покрытия", "decimal", "m2", null],
  ["wi_embedded_part_quantity_piece", "Количество закладных деталей", "integer", "piece", null],
  ["wi_intake_conduit_designation", "Марка водоприёмных трубопроводов", "text", null, null],
  ["wi_intake_conduit_length_m", "Длина водоприёмных трубопроводов", "decimal", "m", null],
  ["wi_screen_cleaner_designation", "Марка механизмов очистки решёток", "text", null, null],
  ["wi_screen_cleaner_quantity_piece", "Количество механизмов очистки решёток", "integer", "piece", null],
  ["wi_mcc_designation", "Марка щита управления насосами", "text", null, null],
  ["wi_mcc_quantity_set", "Количество щитов управления насосами", "integer", "set", null],
  ["wi_instrumentation_designation", "Марка комплекта КИП", "text", null, null],
  ["wi_instrumentation_quantity_set", "Количество комплектов КИП", "integer", "set", null],
  ["wi_lifting_equipment_designation", "Марка грузоподъёмного оборудования", "text", null, null],
  ["wi_lifting_equipment_quantity_set", "Количество комплектов грузоподъёмного оборудования", "integer", "set", null],
  ["wi_internal_piping_designation", "Марка внутренних трубопроводов", "text", null, null],
  ["wi_internal_piping_length_m", "Длина внутренних трубопроводов", "decimal", "m", null],
  ["wi_drainage_sump_equipment_designation", "Марка оборудования дренажных приямков", "text", null, null],
  ["wi_drainage_sump_equipment_quantity_set", "Комплекты оборудования дренажных приямков", "integer", "set", null],
  ["wi_commissioning_consumable_designation", "Марка пусконаладочных расходников", "text", null, null],
  ["wi_commissioning_consumable_quantity_set", "Комплекты пусконаладочных расходников", "integer", "set", null],
  ["wi_mechanical_test_count", "Количество механических испытаний", "integer", "test", null],
  ["wi_electrical_test_count", "Количество электрических испытаний", "integer", "test", null],
  ["wi_commissioning_test_count", "Количество комплексных пусковых испытаний", "integer", "test", null],
  ["wi_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wi_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wi_civil_labor_h", "Труд на железобетонные и гидроизоляционные работы", "decimal", "man_hour", null],
  ["wi_mechanical_labor_h", "Труд на технологическое оборудование и трубопроводы", "decimal", "man_hour", null],
  ["wi_electrical_labor_h", "Труд на щиты, КИП и электрические подключения", "decimal", "man_hour", null],
  ["wi_qa_documentation_labor_h", "Труд на испытания, контроль и документацию", "decimal", "man_hour", null],
  ["wi_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wi_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wi_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["wi_rebar_processing_machine_h", "Работа оборудования обработки арматуры", "decimal", "machine_hour", null],
  ["wi_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["wi_material_delivery_trip_count", "Рейсы доставки оборудования и материалов", "integer", "trip", null],
  ["wi_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["wi_cofferdam_mode", "Временная водооградительная перемычка требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wi_cofferdam_designation", "Конструкция временной перемычки", "text", null, null],
  ["wi_cofferdam_area_m2", "Площадь временной перемычки", "decimal", "m2", null],
  ["wi_river_diversion_mode", "Временный отвод русла требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wi_river_diversion_designation", "Схема временного отвода русла", "text", null, null],
  ["wi_river_diversion_quantity_set", "Комплекты временного отвода русла", "integer", "set", null],
  ["wi_construction_dewatering_mode", "Строительное водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wi_construction_dewatering_designation", "Оборудование строительного водопонижения", "text", null, null],
  ["wi_construction_dewatering_machine_h", "Работа водопонизительного оборудования", "decimal", "machine_hour", null],
  ["wi_fish_protection_mode", "Рыбозащитное устройство требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wi_fish_protection_designation", "Марка рыбозащитного устройства", "text", null, null],
  ["wi_fish_protection_quantity_set", "Количество комплектов рыбозащиты", "integer", "set", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["cofferdam", "river_diversion",
    "construction_dewatering", "fish_protection"] as const) {
    if (parameterId.startsWith(`wi_${branch}_`) && parameterId !== `wi_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `wi_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `wi_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type WaterIntakeParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WATER_INTAKE_PARAMETERS: readonly WaterIntakeParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "wi_raw_water_pump_retained_spare_piece" ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.water-intake-r1",
      semantic_parameter_key: `water-intake:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_WATER_INTAKE_PROJECT_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу и утверждённой спецификации водозабора.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_INTAKE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_INTAKE_PROJECT_DOCUMENTATION",
        source_document: WATER_INTAKE_SOURCE_ID,
        source_locator: WATER_INTAKE_SOURCE_METADATA.exact_locator,
        guide_version: "water-intake-r1",
        source_snapshot_hash: WATER_INTAKE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранный береговой водозабор; наружные сети, скважины, водоподготовка, резервуары, башни и канализация исключены.",
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
    },
  })),
);

export const WATER_INTAKE_RUNTIME_INPUT = Object.freeze({
  wi_raw_water_pump_retained_spare_piece: 0,
  wi_raw_water_pump_supplier_package_quantity_piece: 1,
});
export const WATER_INTAKE_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WATER_INTAKE_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WATER_INTAKE_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WATER_INTAKE_RUNTIME_INPUT).map((id) => [id, [WATER_INTAKE_SOURCE_ID]]),
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
  { rowId: "rc09:wi_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, испытание и приёмка берегового водозабора", unitId: "piece", formulaId: "wi_acceptance_count_v1", expression: "wi_facility_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi_coarse_screens", section: "Технологическое оборудование", category: "material", titleRu: "Грубые водоприёмные решётки", unitId: "piece", formulaId: "wi_coarse_screen_quantity_v1", expression: "wi_coarse_screen_installed_piece", procurementEligible: true, titleParameterIds: ["wi_coarse_screen_designation"] },
  { rowId: "rc09:wi_stoplog_gates", section: "Технологическое оборудование", category: "material", titleRu: "Шандорные затворы камер", unitId: "set", formulaId: "wi_stoplog_gate_quantity_v1", expression: "wi_stoplog_gate_quantity_set", procurementEligible: true, titleParameterIds: ["wi_stoplog_gate_designation"] },
  { rowId: "rc09:wi_raw_water_pumps", section: "Технологическое оборудование", category: "equipment", titleRu: "Насосы исходной воды", unitId: "piece", formulaId: "wi_raw_water_pump_order_quantity_v1", expression: "ceil((wi_raw_water_pump_installed_piece+wi_raw_water_pump_retained_spare_piece)/wi_raw_water_pump_supplier_package_quantity_piece)*wi_raw_water_pump_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["wi_raw_water_pump_designation"] },
  { rowId: "rc09:wi_pump_valve_kits", section: "Комплектующие", category: "material", titleRu: "Комплекты арматуры насосов", unitId: "set", formulaId: "wi_pump_valve_kit_quantity_v1", expression: "wi_pump_valve_kit_quantity_set", procurementEligible: true, titleParameterIds: ["wi_pump_valve_kit_designation"] },
  { rowId: "rc09:wi_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон камер", unitId: "m3", formulaId: "wi_structural_concrete_volume_v1", expression: "wi_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wi_rebar", section: "Материалы", category: "material", titleRu: "Арматура железобетонных конструкций", unitId: "kg", formulaId: "wi_rebar_mass_v1", expression: "wi_rebar_mass_kg", procurementEligible: true },
  { rowId: "rc09:wi_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка конструкций водозабора", unitId: "m2", formulaId: "wi_formwork_area_v1", expression: "wi_formwork_area_m2" },
  { rowId: "rc09:wi_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция конструкций", unitId: "m2", formulaId: "wi_waterproofing_area_v1", expression: "wi_waterproofing_area_m2", procurementEligible: true },
  { rowId: "rc09:wi_protective_coating", section: "Материалы", category: "material", titleRu: "Защитное покрытие конструкций", unitId: "m2", formulaId: "wi_protective_coating_area_v1", expression: "wi_protective_coating_area_m2", procurementEligible: true },
  { rowId: "rc09:wi_embedded_parts", section: "Комплектующие", category: "material", titleRu: "Закладные детали оборудования", unitId: "piece", formulaId: "wi_embedded_part_quantity_v1", expression: "wi_embedded_part_quantity_piece", procurementEligible: true },
  { rowId: "rc09:wi_intake_conduits", section: "Материалы", category: "material", titleRu: "Водоприёмные трубопроводы", unitId: "m", formulaId: "wi_intake_conduit_length_v1", expression: "wi_intake_conduit_length_m", procurementEligible: true, titleParameterIds: ["wi_intake_conduit_designation"] },
  { rowId: "rc09:wi_screen_cleaners", section: "Технологическое оборудование", category: "equipment", titleRu: "Механизмы очистки решёток", unitId: "piece", formulaId: "wi_screen_cleaner_quantity_v1", expression: "wi_screen_cleaner_quantity_piece", procurementEligible: true, titleParameterIds: ["wi_screen_cleaner_designation"] },
  { rowId: "rc09:wi_mcc", section: "Электрооборудование", category: "equipment", titleRu: "Щит управления насосами", unitId: "set", formulaId: "wi_mcc_quantity_v1", expression: "wi_mcc_quantity_set", procurementEligible: true, titleParameterIds: ["wi_mcc_designation"] },
  { rowId: "rc09:wi_instrumentation", section: "Автоматизация", category: "equipment", titleRu: "Комплект КИП водозабора", unitId: "set", formulaId: "wi_instrumentation_quantity_v1", expression: "wi_instrumentation_quantity_set", procurementEligible: true, titleParameterIds: ["wi_instrumentation_designation"] },
  { rowId: "rc09:wi_lifting_equipment", section: "Технологическое оборудование", category: "equipment", titleRu: "Грузоподъёмное оборудование", unitId: "set", formulaId: "wi_lifting_equipment_quantity_v1", expression: "wi_lifting_equipment_quantity_set", procurementEligible: true, titleParameterIds: ["wi_lifting_equipment_designation"] },
  { rowId: "rc09:wi_internal_piping", section: "Материалы", category: "material", titleRu: "Внутренние технологические трубопроводы", unitId: "m", formulaId: "wi_internal_piping_length_v1", expression: "wi_internal_piping_length_m", procurementEligible: true, titleParameterIds: ["wi_internal_piping_designation"] },
  { rowId: "rc09:wi_drainage_sump_equipment", section: "Технологическое оборудование", category: "equipment", titleRu: "Оборудование дренажных приямков", unitId: "set", formulaId: "wi_drainage_sump_equipment_quantity_v1", expression: "wi_drainage_sump_equipment_quantity_set", procurementEligible: true, titleParameterIds: ["wi_drainage_sump_equipment_designation"] },
  { rowId: "rc09:wi_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Пусконаладочные расходники", unitId: "set", formulaId: "wi_commissioning_consumable_quantity_v1", expression: "wi_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wi_commissioning_consumable_designation"] },
  { rowId: "rc09:wi_mechanical_tests", section: "Контроль", category: "service", titleRu: "Механические испытания оборудования", unitId: "test", formulaId: "wi_mechanical_test_count_v1", expression: "wi_mechanical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания и измерения", unitId: "test", formulaId: "wi_electrical_test_count_v1", expression: "wi_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi_commissioning_tests", section: "Контроль", category: "service", titleRu: "Комплексное пусковое испытание водозабора", unitId: "test", formulaId: "wi_commissioning_test_count_v1", expression: "wi_commissioning_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация водозабора", unitId: "document", formulaId: "wi_asbuilt_document_count_v1", expression: "wi_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi_cofferdam", section: "Условные работы", category: "construction_work", titleRu: "Временная водооградительная перемычка", unitId: "m2", formulaId: "wi_cofferdam_area_v1", expression: "wi_cofferdam_area_m2", inclusionAst: equals("wi_cofferdam_mode", "REQUIRED"), titleParameterIds: ["wi_cofferdam_designation"] },
  { rowId: "rc09:wi_river_diversion", section: "Условные работы", category: "construction_work", titleRu: "Временный отвод русла", unitId: "set", formulaId: "wi_river_diversion_quantity_v1", expression: "wi_river_diversion_quantity_set", inclusionAst: equals("wi_river_diversion_mode", "REQUIRED"), titleParameterIds: ["wi_river_diversion_designation"] },
  { rowId: "rc09:wi_construction_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Строительное водопонижение", unitId: "machine_hour", formulaId: "wi_construction_dewatering_machine_v1", expression: "wi_construction_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wi_construction_dewatering_mode", "REQUIRED"), titleParameterIds: ["wi_construction_dewatering_designation"] },
  { rowId: "rc09:wi_fish_protection", section: "Условное оборудование", category: "equipment", titleRu: "Рыбозащитное устройство", unitId: "set", formulaId: "wi_fish_protection_quantity_v1", expression: "wi_fish_protection_quantity_set", procurementEligible: true, inclusionAst: equals("wi_fish_protection_mode", "REQUIRED"), titleParameterIds: ["wi_fish_protection_designation"] },
  { rowId: "rc09:wi-pump-balance:installed-net", section: "Баланс насосов", category: "equipment", titleRu: "Установленные насосы исходной воды", unitId: "piece", formulaId: "wi_pump_installed_net_v1", expression: "wi_raw_water_pump_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi-pump-balance:retained-spare", section: "Баланс насосов", category: "equipment", titleRu: "Сохраняемый запас насосов", unitId: "piece", formulaId: "wi_pump_retained_spare_v1", expression: "wi_raw_water_pump_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi-pump-balance:total-need", section: "Баланс насосов", category: "equipment", titleRu: "Общая потребность в насосах", unitId: "piece", formulaId: "wi_pump_total_need_v1", expression: "wi_raw_water_pump_installed_piece+wi_raw_water_pump_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi-pump-balance:package-count", section: "Баланс насосов", category: "equipment", titleRu: "Количество упаковок насосов", unitId: "package", formulaId: "wi_pump_package_count_v1", expression: "ceil((wi_raw_water_pump_installed_piece+wi_raw_water_pump_retained_spare_piece)/wi_raw_water_pump_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi-pump-balance:remainder", section: "Баланс насосов", category: "equipment", titleRu: "Остаток насосов после монтажа", unitId: "piece", formulaId: "wi_pump_remainder_v1", expression: "ceil((wi_raw_water_pump_installed_piece+wi_raw_water_pump_retained_spare_piece)/wi_raw_water_pump_supplier_package_quantity_piece)*wi_raw_water_pump_supplier_package_quantity_piece-wi_raw_water_pump_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wi-pump-balance:surplus-beyond-spare", section: "Баланс насосов", category: "equipment", titleRu: "Свободный остаток насосов сверх запаса", unitId: "piece", formulaId: "wi_pump_surplus_v1", expression: "max(0,ceil((wi_raw_water_pump_installed_piece+wi_raw_water_pump_retained_spare_piece)/wi_raw_water_pump_supplier_package_quantity_piece)*wi_raw_water_pump_supplier_package_quantity_piece-wi_raw_water_pump_installed_piece-wi_raw_water_pump_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wi-survey", section: "Труд", category: "construction_work", titleRu: "Геодезическая разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wi_survey_labor_v1", expression: "wi_survey_labor_h" },
  { rowId: "rc09:labor:wi-civil", section: "Труд", category: "construction_work", titleRu: "Железобетонные и гидроизоляционные работы", unitId: "man_hour", formulaId: "wi_civil_labor_v1", expression: "wi_civil_labor_h" },
  { rowId: "rc09:labor:wi-mechanical", section: "Труд", category: "construction_work", titleRu: "Монтаж технологического оборудования и трубопроводов", unitId: "man_hour", formulaId: "wi_mechanical_labor_v1", expression: "wi_mechanical_labor_h" },
  { rowId: "rc09:labor:wi-electrical", section: "Труд", category: "construction_work", titleRu: "Монтаж щитов, КИП и электрических подключений", unitId: "man_hour", formulaId: "wi_electrical_labor_v1", expression: "wi_electrical_labor_h" },
  { rowId: "rc09:labor:wi-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, пусконаладка и документация", unitId: "man_hour", formulaId: "wi_qa_documentation_labor_v1", expression: "wi_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wi-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wi_excavator_machine_v1", expression: "wi_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wi-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "wi_crane_machine_v1", expression: "wi_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wi-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "wi_concrete_pump_machine_v1", expression: "wi_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wi-rebar-processing", section: "Механизмы", category: "equipment", titleRu: "Оборудование обработки арматуры", unitId: "machine_hour", formulaId: "wi_rebar_processing_machine_v1", expression: "wi_rebar_processing_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wi-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "wi_welding_machine_v1", expression: "wi_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wi-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка оборудования и материалов", unitId: "trip", formulaId: "wi_material_delivery_trip_v1", expression: "wi_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wi-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wi_waste_removal_trip_v1", expression: "wi_waste_removal_trip_count", procurementEligible: true },
]);

export const WATER_INTAKE_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const WATER_INTAKE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `water-intake:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_RIVERBANK_WATER_INTAKE_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: WATER_INTAKE_SOURCE_ID, source_id: WATER_INTAKE_SOURCE_ID,
        normId: WATER_INTAKE_NORM_ID, norm_id: WATER_INTAKE_NORM_ID,
        normVersion: WATER_INTAKE_SOURCE_METADATA.source_document_version,
        source_title: WATER_INTAKE_SOURCE_METADATA.source_title,
        exact_locator: WATER_INTAKE_SOURCE_METADATA.exact_locator,
        source_definition_hash: WATER_INTAKE_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "external network, borehole, treatment plant, reservoir, tower or sewer",
        "capacity-bay-or-pump-derived civil, equipment, labor, mechanism or logistics quantity",
        "automatic cofferdam, river diversion, construction dewatering or fish protection",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const WATER_INTAKE_SHORT_INPUT = Object.freeze({
  wi_facility_count: 1, wi_facility_designation: "WI-RIVERBANK-RC-2B-8000-4P",
  wi_intake_type: "RIVERBANK_SCREENED_PUMP_INTAKE", wi_design_capacity_m3_day: 8000,
  wi_intake_bay_count: 2, wi_coarse_screen_installed_piece: 4,
  wi_coarse_screen_designation: "SS316-25MM-2000X3000",
  wi_raw_water_pump_installed_piece: 4, wi_raw_water_pump_designation: "VTP-250LPS-32M",
  ...WATER_INTAKE_RUNTIME_INPUT,
});
export const WATER_INTAKE_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_INTAKE_SHORT_INPUT,
  wi_stoplog_gate_designation: "SS316-STOPLOG-2000X3000", wi_stoplog_gate_quantity_set: 2,
  wi_pump_valve_kit_designation: "VTP-DN250-PN16-VALVE-KIT", wi_pump_valve_kit_quantity_set: 4,
  wi_structural_concrete_volume_m3: 1850, wi_rebar_mass_kg: 245000,
  wi_formwork_area_m2: 5200, wi_waterproofing_area_m2: 3300,
  wi_protective_coating_area_m2: 1800, wi_embedded_part_quantity_piece: 140,
  wi_intake_conduit_designation: "RC-PRESSURE-PIPE-DN800", wi_intake_conduit_length_m: 120,
  wi_screen_cleaner_designation: "RAKE-CLEANER-2M", wi_screen_cleaner_quantity_piece: 2,
  wi_mcc_designation: "MCC-VTP-4X160KW", wi_mcc_quantity_set: 1,
  wi_instrumentation_designation: "WI-LEVEL-FLOW-PRESSURE-KIT", wi_instrumentation_quantity_set: 1,
  wi_lifting_equipment_designation: "MONORAIL-HOIST-5T", wi_lifting_equipment_quantity_set: 2,
  wi_internal_piping_designation: "SS316-DN250-400", wi_internal_piping_length_m: 260,
  wi_drainage_sump_equipment_designation: "SUMP-PUMP-2X15M3H", wi_drainage_sump_equipment_quantity_set: 2,
  wi_commissioning_consumable_designation: "WI-FLUSH-LUBE-SEAL-KIT", wi_commissioning_consumable_quantity_set: 1,
  wi_mechanical_test_count: 8, wi_electrical_test_count: 12,
  wi_commissioning_test_count: 1, wi_asbuilt_document_count: 1,
  wi_survey_labor_h: 900, wi_civil_labor_h: 8400, wi_mechanical_labor_h: 4600,
  wi_electrical_labor_h: 2200, wi_qa_documentation_labor_h: 1400,
  wi_excavator_machine_h: 1200, wi_crane_machine_h: 520,
  wi_concrete_pump_machine_h: 380, wi_rebar_processing_machine_h: 520,
  wi_welding_machine_h: 460, wi_material_delivery_trip_count: 260,
  wi_waste_removal_trip_count: 140,
  wi_cofferdam_mode: "NOT_REQUIRED", wi_river_diversion_mode: "NOT_REQUIRED",
  wi_construction_dewatering_mode: "NOT_REQUIRED", wi_fish_protection_mode: "NOT_REQUIRED",
});

export async function compileWaterIntakeR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WATER_INTAKE_CATALOG_ID;
  if (catalogId !== WATER_INTAKE_CATALOG_ID) {
    throw new Error(`WATER_INTAKE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.water-intake-r1", catalogId,
    primaryMeasureParameterId: "wi_facility_count",
    parameterDefinitions: [...WATER_INTAKE_PARAMETERS],
    formulaDefinitions: [...WATER_INTAKE_FORMULAS],
    resourceDefinitions: [...WATER_INTAKE_RESOURCES], submittedParameters,
    confirmedParameters: { ...WATER_INTAKE_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
