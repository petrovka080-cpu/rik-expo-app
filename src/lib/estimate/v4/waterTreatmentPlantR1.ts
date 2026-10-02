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
export const WATER_TREATMENT_PLANT_CATALOG_ID =
  "canonical-work:expanded:water_treatment_plant";
export const WATER_TREATMENT_PLANT_SOURCE_ID =
  "project_potable_water_treatment_filter_media_balance_v1";
export const WATER_TREATMENT_PLANT_NORM_ID =
  "norm:project:potable_water_treatment_filter_media_balance:v1";
export const WATER_TREATMENT_PLANT_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект водоочистной станции питьевой воды, технологическая схема, гидравлический профиль, строительные чертежи и спецификации оборудования",
  source_authority: "Технолог водоподготовки, проектировщики строительной, механической, электрической и КИП частей, поставщики оборудования и загрузки, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_POTABLE_WTP_PROCESS_CIVIL_MECHANICAL_ELECTRICAL_QA_LOGISTICS_FILTER_MEDIA_BALANCE_S27_24",
  definition_hash: "e7ea45a6b358e335ce254bce261ff2f4b9512c24b91cff4ba2af82dba11bfdb9",
  exact_locator: "1 станция WTP-RGF-5000-4F, 5000 м3/сут, коагуляция-флокуляция-отстаивание-4 скорых фильтра-хлорирование, 80 т ANTHRACITE-0.8-1.6MM-POTABLE, 4 HSC-80LPS-28M и 4 HSC-75LPS-42M",
  use_restriction: "Производительность не определяет автоматически бетон, арматуру, оборудование, трубопроводы, труд, механизмы или логистику. Крепление котлована, водопонижение и восстановление дороги включаются только по проекту. Водозабор, наружная сеть, резервуар, башня, очистка сточных вод и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "e7ea45a6b358e335ce254bce261ff2f4b9512c24b91cff4ba2af82dba11bfdb9",
});

const KNOWN_SCOPE = [
  "wtp_facility_count", "wtp_facility_designation", "wtp_process_type",
  "wtp_design_capacity_m3_day", "wtp_filter_train_count",
  "wtp_filter_media_installed_t", "wtp_filter_media_designation",
  "wtp_raw_water_pump_installed_piece", "wtp_raw_water_pump_designation",
  "wtp_treated_water_pump_installed_piece", "wtp_treated_water_pump_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wtp_filter_media_retained_spare_t", "wtp_filter_media_supplier_package_mass_t",
]);
const CONDITIONAL_DETAILS = new Set([
  "wtp_excavation_shoring_designation", "wtp_excavation_shoring_area_m2",
  "wtp_groundwater_dewatering_designation", "wtp_groundwater_dewatering_machine_h",
  "wtp_road_reinstatement_designation", "wtp_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wtp_facility_count", "Количество водоочистных станций", "integer", "piece", null],
  ["wtp_facility_designation", "Марка водоочистной станции", "text", null, null],
  ["wtp_process_type", "Технологическая схема очистки", "enum", null, ["COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION"]],
  ["wtp_design_capacity_m3_day", "Проектная производительность", "decimal", "m3_per_day", null],
  ["wtp_filter_train_count", "Количество скорых фильтров", "integer", "piece", null],
  ["wtp_filter_media_installed_t", "Проектная масса фильтрующей загрузки", "decimal", "t", null],
  ["wtp_filter_media_designation", "Марка фильтрующей загрузки", "text", null, null],
  ["wtp_raw_water_pump_installed_piece", "Количество насосов исходной воды", "integer", "piece", null],
  ["wtp_raw_water_pump_designation", "Марка насосов исходной воды", "text", null, null],
  ["wtp_treated_water_pump_installed_piece", "Количество насосов очищенной воды", "integer", "piece", null],
  ["wtp_treated_water_pump_designation", "Марка насосов очищенной воды", "text", null, null],
  ["wtp_filter_media_retained_spare_t", "Сохраняемый запас фильтрующей загрузки", "decimal", "t", null],
  ["wtp_filter_media_supplier_package_mass_t", "Масса загрузки в упаковке поставщика", "decimal", "t", null],
  ["wtp_coagulant_dosing_designation", "Марка установок дозирования коагулянта", "text", null, null],
  ["wtp_coagulant_dosing_quantity_set", "Количество установок дозирования коагулянта", "integer", "set", null],
  ["wtp_chlorination_designation", "Марка установок хлорирования", "text", null, null],
  ["wtp_chlorination_quantity_set", "Количество установок хлорирования", "integer", "set", null],
  ["wtp_rapid_mixer_designation", "Марка скорых смесителей", "text", null, null],
  ["wtp_rapid_mixer_quantity_piece", "Количество скорых смесителей", "integer", "piece", null],
  ["wtp_flocculator_designation", "Марка флокуляторов", "text", null, null],
  ["wtp_flocculator_quantity_piece", "Количество флокуляторов", "integer", "piece", null],
  ["wtp_clarifier_designation", "Марка отстойников", "text", null, null],
  ["wtp_clarifier_quantity_piece", "Количество отстойников", "integer", "piece", null],
  ["wtp_backwash_pump_designation", "Марка насосов промывки фильтров", "text", null, null],
  ["wtp_backwash_pump_quantity_piece", "Количество насосов промывки фильтров", "integer", "piece", null],
  ["wtp_air_blower_designation", "Марка воздуходувок промывки", "text", null, null],
  ["wtp_air_blower_quantity_piece", "Количество воздуходувок промывки", "integer", "piece", null],
  ["wtp_sludge_pump_designation", "Марка насосов осадка", "text", null, null],
  ["wtp_sludge_pump_quantity_piece", "Количество насосов осадка", "integer", "piece", null],
  ["wtp_process_pipe_designation", "Марка технологических трубопроводов", "text", null, null],
  ["wtp_process_pipe_length_m", "Длина технологических трубопроводов", "decimal", "m", null],
  ["wtp_process_valve_designation", "Марка технологической арматуры", "text", null, null],
  ["wtp_process_valve_quantity_piece", "Количество единиц технологической арматуры", "integer", "piece", null],
  ["wtp_instrument_designation", "Марка контрольно-измерительных приборов", "text", null, null],
  ["wtp_instrument_quantity_piece", "Количество контрольно-измерительных приборов", "integer", "piece", null],
  ["wtp_automation_designation", "Система MCC, ПЛК и SCADA", "text", null, null],
  ["wtp_automation_quantity_set", "Количество комплектов MCC, ПЛК и SCADA", "integer", "set", null],
  ["wtp_structural_concrete_volume_m3", "Объём конструкционного бетона", "decimal", "m3", null],
  ["wtp_rebar_mass_kg", "Масса арматуры", "decimal", "kg", null],
  ["wtp_formwork_area_m2", "Площадь опалубки", "decimal", "m2", null],
  ["wtp_waterproofing_area_m2", "Площадь гидроизоляции", "decimal", "m2", null],
  ["wtp_commissioning_consumable_designation", "Марка монтажных и пусковых расходников", "text", null, null],
  ["wtp_commissioning_consumable_quantity_set", "Количество комплектов монтажных и пусковых расходников", "integer", "set", null],
  ["wtp_mechanical_commissioning_test_count", "Количество механических и пусковых испытаний", "integer", "test", null],
  ["wtp_electrical_test_count", "Количество электрических испытаний", "integer", "test", null],
  ["wtp_water_quality_test_count", "Количество лабораторных анализов воды", "integer", "test", null],
  ["wtp_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wtp_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wtp_civil_labor_h", "Труд на строительные конструкции", "decimal", "man_hour", null],
  ["wtp_mechanical_labor_h", "Труд на технологическое оборудование и трубопроводы", "decimal", "man_hour", null],
  ["wtp_electrical_controls_labor_h", "Труд на электрику, КИП и автоматизацию", "decimal", "man_hour", null],
  ["wtp_qa_documentation_labor_h", "Труд на испытания, наладку и документацию", "decimal", "man_hour", null],
  ["wtp_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wtp_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wtp_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["wtp_material_delivery_trip_count", "Рейсы доставки материалов и оборудования", "integer", "trip", null],
  ["wtp_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["wtp_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_excavation_shoring_designation", "Конструкция крепления котлована", "text", null, null],
  ["wtp_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["wtp_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["wtp_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["wtp_road_reinstatement_mode", "Восстановление дороги требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wtp_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["wtp_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering",
    "road_reinstatement"] as const) {
    if (parameterId.startsWith(`wtp_${branch}_`) && parameterId !== `wtp_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `wtp_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `wtp_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}
export type WaterTreatmentPlantParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WATER_TREATMENT_PLANT_PARAMETERS: readonly WaterTreatmentPlantParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "wtp_filter_media_retained_spare_t" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.water-treatment-plant-r1",
        semantic_parameter_key: `water-treatment-plant:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_POTABLE_WTP_PROJECT_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу и утверждённой технологической схеме.`
            : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_WTP_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
              : "APPROVED_POTABLE_WTP_PROJECT_DOCUMENTATION",
          source_document: WATER_TREATMENT_PLANT_SOURCE_ID,
          source_locator: WATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
          guide_version: "water-treatment-plant-r1",
          source_snapshot_hash: WATER_TREATMENT_PLANT_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранная станция очистки питьевой воды; источники, сети, накопители и очистка сточных вод исключены.",
          verified_at: "2026-10-02T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    })),
  );

export const WATER_TREATMENT_PLANT_RUNTIME_INPUT = Object.freeze({
  wtp_filter_media_retained_spare_t: 0,
  wtp_filter_media_supplier_package_mass_t: 1,
});
export const WATER_TREATMENT_PLANT_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WATER_TREATMENT_PLANT_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WATER_TREATMENT_PLANT_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WATER_TREATMENT_PLANT_RUNTIME_INPUT)
    .map((id) => [id, [WATER_TREATMENT_PLANT_SOURCE_ID]]),
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
  { rowId: "rc09:wtp_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, пуск и приёмка водоочистной станции", unitId: "piece", formulaId: "wtp_acceptance_count_v1", expression: "wtp_facility_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_raw_water_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы исходной воды", unitId: "piece", formulaId: "wtp_raw_water_pump_quantity_v1", expression: "wtp_raw_water_pump_installed_piece", procurementEligible: true, titleParameterIds: ["wtp_raw_water_pump_designation"] },
  { rowId: "rc09:wtp_treated_water_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы очищенной воды", unitId: "piece", formulaId: "wtp_treated_water_pump_quantity_v1", expression: "wtp_treated_water_pump_installed_piece", procurementEligible: true, titleParameterIds: ["wtp_treated_water_pump_designation"] },
  { rowId: "rc09:wtp_filter_media", section: "Материалы", category: "material", titleRu: "Антрацитовая фильтрующая загрузка", unitId: "t", formulaId: "wtp_filter_media_order_mass_v1", expression: "ceil((wtp_filter_media_installed_t+wtp_filter_media_retained_spare_t)/wtp_filter_media_supplier_package_mass_t)*wtp_filter_media_supplier_package_mass_t", procurementEligible: true, titleParameterIds: ["wtp_filter_media_designation"] },
  { rowId: "rc09:wtp_coagulant_dosing", section: "Оборудование", category: "equipment", titleRu: "Установки дозирования коагулянта", unitId: "set", formulaId: "wtp_coagulant_dosing_quantity_v1", expression: "wtp_coagulant_dosing_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_coagulant_dosing_designation"] },
  { rowId: "rc09:wtp_chlorination", section: "Оборудование", category: "equipment", titleRu: "Установки хлорирования", unitId: "set", formulaId: "wtp_chlorination_quantity_v1", expression: "wtp_chlorination_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_chlorination_designation"] },
  { rowId: "rc09:wtp_rapid_mixers", section: "Оборудование", category: "equipment", titleRu: "Скорые смесители", unitId: "piece", formulaId: "wtp_rapid_mixer_quantity_v1", expression: "wtp_rapid_mixer_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_rapid_mixer_designation"] },
  { rowId: "rc09:wtp_flocculators", section: "Оборудование", category: "equipment", titleRu: "Флокуляторы", unitId: "piece", formulaId: "wtp_flocculator_quantity_v1", expression: "wtp_flocculator_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_flocculator_designation"] },
  { rowId: "rc09:wtp_clarifiers", section: "Оборудование", category: "equipment", titleRu: "Тонкослойные отстойники", unitId: "piece", formulaId: "wtp_clarifier_quantity_v1", expression: "wtp_clarifier_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_clarifier_designation"] },
  { rowId: "rc09:wtp_filters", section: "Оборудование", category: "equipment", titleRu: "Скорые гравитационные фильтры", unitId: "piece", formulaId: "wtp_filter_train_quantity_v1", expression: "wtp_filter_train_count", procurementEligible: true, titleParameterIds: ["wtp_facility_designation"] },
  { rowId: "rc09:wtp_backwash_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы промывки фильтров", unitId: "piece", formulaId: "wtp_backwash_pump_quantity_v1", expression: "wtp_backwash_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_backwash_pump_designation"] },
  { rowId: "rc09:wtp_air_blowers", section: "Оборудование", category: "equipment", titleRu: "Воздуходувки промывки фильтров", unitId: "piece", formulaId: "wtp_air_blower_quantity_v1", expression: "wtp_air_blower_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_air_blower_designation"] },
  { rowId: "rc09:wtp_sludge_pumps", section: "Оборудование", category: "equipment", titleRu: "Насосы осадка", unitId: "piece", formulaId: "wtp_sludge_pump_quantity_v1", expression: "wtp_sludge_pump_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_sludge_pump_designation"] },
  { rowId: "rc09:wtp_process_piping", section: "Материалы", category: "material", titleRu: "Технологические трубопроводы", unitId: "m", formulaId: "wtp_process_pipe_length_v1", expression: "wtp_process_pipe_length_m", procurementEligible: true, titleParameterIds: ["wtp_process_pipe_designation"] },
  { rowId: "rc09:wtp_process_valves", section: "Комплектующие", category: "material", titleRu: "Технологическая арматура", unitId: "piece", formulaId: "wtp_process_valve_quantity_v1", expression: "wtp_process_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_process_valve_designation"] },
  { rowId: "rc09:wtp_instruments", section: "Оборудование", category: "equipment", titleRu: "Контрольно-измерительные приборы", unitId: "piece", formulaId: "wtp_instrument_quantity_v1", expression: "wtp_instrument_quantity_piece", procurementEligible: true, titleParameterIds: ["wtp_instrument_designation"] },
  { rowId: "rc09:wtp_automation", section: "Оборудование", category: "equipment", titleRu: "MCC, ПЛК и SCADA", unitId: "set", formulaId: "wtp_automation_quantity_v1", expression: "wtp_automation_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_automation_designation"] },
  { rowId: "rc09:wtp_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон", unitId: "m3", formulaId: "wtp_structural_concrete_volume_v1", expression: "wtp_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wtp_rebar", section: "Материалы", category: "material", titleRu: "Арматура сооружений", unitId: "kg", formulaId: "wtp_rebar_mass_v1", expression: "wtp_rebar_mass_kg", procurementEligible: true },
  { rowId: "rc09:wtp_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка сооружений", unitId: "m2", formulaId: "wtp_formwork_area_v1", expression: "wtp_formwork_area_m2" },
  { rowId: "rc09:wtp_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция сооружений", unitId: "m2", formulaId: "wtp_waterproofing_area_v1", expression: "wtp_waterproofing_area_m2", procurementEligible: true },
  { rowId: "rc09:wtp_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "wtp_commissioning_consumable_quantity_v1", expression: "wtp_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wtp_commissioning_consumable_designation"] },
  { rowId: "rc09:wtp_mechanical_commissioning_tests", section: "Контроль", category: "service", titleRu: "Механические испытания и комплексный пуск", unitId: "test", formulaId: "wtp_mechanical_commissioning_test_v1", expression: "wtp_mechanical_commissioning_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_electrical_tests", section: "Контроль", category: "service", titleRu: "Электрические испытания и проверка автоматизации", unitId: "test", formulaId: "wtp_electrical_test_v1", expression: "wtp_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_water_quality_tests", section: "Контроль", category: "service", titleRu: "Лабораторный контроль качества воды", unitId: "test", formulaId: "wtp_water_quality_test_v1", expression: "wtp_water_quality_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация станции", unitId: "document", formulaId: "wtp_asbuilt_document_v1", expression: "wtp_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp_excavation_shoring", section: "Условные работы", category: "construction_work", titleRu: "Крепление котлована", unitId: "m2", formulaId: "wtp_excavation_shoring_area_v1", expression: "wtp_excavation_shoring_area_m2", inclusionAst: equals("wtp_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["wtp_excavation_shoring_designation"] },
  { rowId: "rc09:wtp_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлована", unitId: "machine_hour", formulaId: "wtp_groundwater_dewatering_machine_v1", expression: "wtp_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wtp_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["wtp_groundwater_dewatering_designation"] },
  { rowId: "rc09:wtp_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "wtp_road_reinstatement_area_v1", expression: "wtp_road_reinstatement_area_m2", inclusionAst: equals("wtp_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["wtp_road_reinstatement_designation"] },
  { rowId: "rc09:wtp-media-balance:installed-net", section: "Баланс загрузки", category: "material", titleRu: "Проектная масса фильтрующей загрузки", unitId: "t", formulaId: "wtp_filter_media_installed_net_v1", expression: "wtp_filter_media_installed_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-media-balance:retained-spare", section: "Баланс загрузки", category: "material", titleRu: "Сохраняемый запас фильтрующей загрузки", unitId: "t", formulaId: "wtp_filter_media_retained_spare_v1", expression: "wtp_filter_media_retained_spare_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-media-balance:total-need", section: "Баланс загрузки", category: "material", titleRu: "Общая потребность в фильтрующей загрузке", unitId: "t", formulaId: "wtp_filter_media_total_need_v1", expression: "wtp_filter_media_installed_t+wtp_filter_media_retained_spare_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-media-balance:package-count", section: "Баланс загрузки", category: "material", titleRu: "Количество упаковок фильтрующей загрузки", unitId: "package", formulaId: "wtp_filter_media_package_count_v1", expression: "ceil((wtp_filter_media_installed_t+wtp_filter_media_retained_spare_t)/wtp_filter_media_supplier_package_mass_t)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-media-balance:remainder", section: "Баланс загрузки", category: "material", titleRu: "Остаток загрузки после монтажа", unitId: "t", formulaId: "wtp_filter_media_remainder_v1", expression: "ceil((wtp_filter_media_installed_t+wtp_filter_media_retained_spare_t)/wtp_filter_media_supplier_package_mass_t)*wtp_filter_media_supplier_package_mass_t-wtp_filter_media_installed_t", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wtp-media-balance:surplus-beyond-spare", section: "Баланс загрузки", category: "material", titleRu: "Свободный остаток загрузки сверх запаса", unitId: "t", formulaId: "wtp_filter_media_surplus_v1", expression: "max(0,ceil((wtp_filter_media_installed_t+wtp_filter_media_retained_spare_t)/wtp_filter_media_supplier_package_mass_t)*wtp_filter_media_supplier_package_mass_t-wtp_filter_media_installed_t-wtp_filter_media_retained_spare_t)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wtp-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wtp_survey_labor_v1", expression: "wtp_survey_labor_h" },
  { rowId: "rc09:labor:wtp-civil", section: "Труд", category: "construction_work", titleRu: "Строительные конструкции станции", unitId: "man_hour", formulaId: "wtp_civil_labor_v1", expression: "wtp_civil_labor_h" },
  { rowId: "rc09:labor:wtp-mechanical", section: "Труд", category: "construction_work", titleRu: "Технологическое оборудование и трубопроводы", unitId: "man_hour", formulaId: "wtp_mechanical_labor_v1", expression: "wtp_mechanical_labor_h" },
  { rowId: "rc09:labor:wtp-electrical-controls", section: "Труд", category: "construction_work", titleRu: "Электрика, КИП и автоматизация", unitId: "man_hour", formulaId: "wtp_electrical_controls_labor_v1", expression: "wtp_electrical_controls_labor_h" },
  { rowId: "rc09:labor:wtp-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, наладка и документация", unitId: "man_hour", formulaId: "wtp_qa_documentation_labor_v1", expression: "wtp_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wtp-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wtp_excavator_machine_v1", expression: "wtp_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "wtp_crane_machine_v1", expression: "wtp_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wtp-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "wtp_welding_machine_v1", expression: "wtp_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wtp-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов и оборудования", unitId: "trip", formulaId: "wtp_material_delivery_trip_v1", expression: "wtp_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wtp-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wtp_waste_removal_trip_v1", expression: "wtp_waste_removal_trip_count", procurementEligible: true },
]);

export const WATER_TREATMENT_PLANT_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const WATER_TREATMENT_PLANT_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `water-treatment-plant:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_POTABLE_WTP_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: WATER_TREATMENT_PLANT_SOURCE_ID,
        source_id: WATER_TREATMENT_PLANT_SOURCE_ID, normId: WATER_TREATMENT_PLANT_NORM_ID,
        norm_id: WATER_TREATMENT_PLANT_NORM_ID,
        normVersion: WATER_TREATMENT_PLANT_SOURCE_METADATA.source_document_version,
        source_title: WATER_TREATMENT_PLANT_SOURCE_METADATA.source_title,
        exact_locator: WATER_TREATMENT_PLANT_SOURCE_METADATA.exact_locator,
        source_definition_hash: WATER_TREATMENT_PLANT_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "intake, distribution network, reservoir, tower or wastewater treatment",
        "capacity-derived civil, equipment, piping, labor, mechanism or logistics quantity",
        "automatic shoring, dewatering or road reinstatement",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId,
      inclusion_ast: row.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
      procurement_eligible: row.procurementEligible ?? false, cost_owner_id: row.rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const WATER_TREATMENT_PLANT_SHORT_INPUT = Object.freeze({
  wtp_facility_count: 1, wtp_facility_designation: "WTP-RGF-5000-4F",
  wtp_process_type: "COAGULATION_FLOCCULATION_SEDIMENTATION_RAPID_GRAVITY_FILTRATION_CHLORINATION",
  wtp_design_capacity_m3_day: 5000, wtp_filter_train_count: 4,
  wtp_filter_media_installed_t: 80,
  wtp_filter_media_designation: "ANTHRACITE-0.8-1.6MM-POTABLE",
  wtp_raw_water_pump_installed_piece: 4, wtp_raw_water_pump_designation: "HSC-80LPS-28M",
  wtp_treated_water_pump_installed_piece: 4,
  wtp_treated_water_pump_designation: "HSC-75LPS-42M",
  ...WATER_TREATMENT_PLANT_RUNTIME_INPUT,
});
export const WATER_TREATMENT_PLANT_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_TREATMENT_PLANT_SHORT_INPUT,
  wtp_coagulant_dosing_designation: "PAC-DOSING-2X100L-H", wtp_coagulant_dosing_quantity_set: 2,
  wtp_chlorination_designation: "NAOCL-DOSING-2X50L-H", wtp_chlorination_quantity_set: 2,
  wtp_rapid_mixer_designation: "RM-5000-SS316", wtp_rapid_mixer_quantity_piece: 2,
  wtp_flocculator_designation: "FLOC-2500-VFD", wtp_flocculator_quantity_piece: 2,
  wtp_clarifier_designation: "LAMELLA-2500", wtp_clarifier_quantity_piece: 2,
  wtp_backwash_pump_designation: "HSC-120LPS-18M", wtp_backwash_pump_quantity_piece: 3,
  wtp_air_blower_designation: "ROOTS-4500M3H-70KPA", wtp_air_blower_quantity_piece: 3,
  wtp_sludge_pump_designation: "SLUDGE-20LPS-20M", wtp_sludge_pump_quantity_piece: 2,
  wtp_process_pipe_designation: "SS304-HDPE-PROCESS-PIPING", wtp_process_pipe_length_m: 620,
  wtp_process_valve_designation: "WTP-BUTTERFLY-DIAPHRAGM-VALVE-SCHEDULE",
  wtp_process_valve_quantity_piece: 80,
  wtp_instrument_designation: "FLOW-PRESSURE-LEVEL-TURBIDITY-CHLORINE-SCHEDULE",
  wtp_instrument_quantity_piece: 45,
  wtp_automation_designation: "MCC-PLC-SCADA-WTP-5000", wtp_automation_quantity_set: 1,
  wtp_structural_concrete_volume_m3: 3200, wtp_rebar_mass_kg: 430000,
  wtp_formwork_area_m2: 12500, wtp_waterproofing_area_m2: 6800,
  wtp_commissioning_consumable_designation: "WTP-GASKET-BOLT-LUBE-REAGENT-KIT",
  wtp_commissioning_consumable_quantity_set: 1,
  wtp_mechanical_commissioning_test_count: 1, wtp_electrical_test_count: 1,
  wtp_water_quality_test_count: 12, wtp_asbuilt_document_count: 1,
  wtp_survey_labor_h: 480, wtp_civil_labor_h: 21000, wtp_mechanical_labor_h: 6800,
  wtp_electrical_controls_labor_h: 4200, wtp_qa_documentation_labor_h: 2000,
  wtp_excavator_machine_h: 900, wtp_crane_machine_h: 780, wtp_welding_machine_h: 600,
  wtp_material_delivery_trip_count: 320, wtp_waste_removal_trip_count: 160,
  wtp_excavation_shoring_mode: "NOT_REQUIRED",
  wtp_groundwater_dewatering_mode: "NOT_REQUIRED", wtp_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileWaterTreatmentPlantR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WATER_TREATMENT_PLANT_CATALOG_ID;
  if (catalogId !== WATER_TREATMENT_PLANT_CATALOG_ID) {
    throw new Error(`WATER_TREATMENT_PLANT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.water-treatment-plant-r1", catalogId,
    primaryMeasureParameterId: "wtp_facility_count",
    parameterDefinitions: [...WATER_TREATMENT_PLANT_PARAMETERS],
    formulaDefinitions: [...WATER_TREATMENT_PLANT_FORMULAS],
    resourceDefinitions: [...WATER_TREATMENT_PLANT_RESOURCES], submittedParameters,
    confirmedParameters: { ...WATER_TREATMENT_PLANT_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value) });
}
