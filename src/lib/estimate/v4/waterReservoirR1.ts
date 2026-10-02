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

export const WATER_RESERVOIR_CATALOG_ID = "canonical-work:expanded:water_reservoir";
export const WATER_RESERVOIR_SOURCE_ID =
  "project_rc_clean_water_reservoir_waterstop_balance_v1";
export const WATER_RESERVOIR_NORM_ID =
  "norm:project:rc_clean_water_reservoir_waterstop_balance:v1";
export const WATER_RESERVOIR_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект железобетонных резервуаров чистой воды, конструктивные чертежи, спецификации трубопроводов и программа испытаний",
  source_authority: "Проектировщики водоснабжения и железобетонных конструкций, поставщики гидроизоляции и трубопроводов, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_RC_CLEAN_WATER_RESERVOIR_CIVIL_WATERPROOFING_PIPING_QA_LOGISTICS_WATERSTOP_BALANCE_S27_24",
  definition_hash: "5a260b88d06ae4ae6ad18ff041160a249e783c0fd8bc559f1e7d02b5168b4198",
  exact_locator: "2 подземных железобетонных резервуара WR-RC-BURIED-2X1000-CW общей ёмкостью 2000 м3, 420 м PVC-WATERSTOP-250MM, по 64 м входного и выходного трубопровода SS304-DN300-PN10",
  use_restriction: "Ёмкость резервуара не определяет автоматически бетон, арматуру, опалубку, гидроизоляцию, трубопроводы, труд, механизмы или логистику. Крепление котлована, водопонижение и восстановление дороги включаются только по проекту. Стальной резервуар, силос, водозабор, водоподготовка, насосная, сеть, башня, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "5a260b88d06ae4ae6ad18ff041160a249e783c0fd8bc559f1e7d02b5168b4198",
});

const KNOWN_SCOPE = [
  "wr_reservoir_count", "wr_reservoir_designation", "wr_reservoir_type",
  "wr_total_storage_capacity_m3", "wr_unit_capacity_m3",
  "wr_waterstop_installed_m", "wr_waterstop_designation",
  "wr_inlet_pipe_installed_m", "wr_inlet_pipe_designation",
  "wr_outlet_pipe_installed_m", "wr_outlet_pipe_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wr_waterstop_retained_spare_m", "wr_waterstop_supplier_roll_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "wr_excavation_shoring_designation", "wr_excavation_shoring_area_m2",
  "wr_groundwater_dewatering_designation", "wr_groundwater_dewatering_machine_h",
  "wr_road_reinstatement_designation", "wr_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wr_reservoir_count", "Количество резервуаров чистой воды", "integer", "piece", null],
  ["wr_reservoir_designation", "Марка резервуаров чистой воды", "text", null, null],
  ["wr_reservoir_type", "Тип резервуаров", "enum", null, ["BURIED_RC_CLEAN_WATER_RESERVOIR"]],
  ["wr_total_storage_capacity_m3", "Общая ёмкость резервуаров", "decimal", "m3", null],
  ["wr_unit_capacity_m3", "Ёмкость одного резервуара", "decimal", "m3", null],
  ["wr_waterstop_installed_m", "Проектная длина гидрошпонки", "decimal", "m", null],
  ["wr_waterstop_designation", "Марка гидрошпонки", "text", null, null],
  ["wr_inlet_pipe_installed_m", "Длина входных трубопроводов", "decimal", "m", null],
  ["wr_inlet_pipe_designation", "Марка входных трубопроводов", "text", null, null],
  ["wr_outlet_pipe_installed_m", "Длина выходных трубопроводов", "decimal", "m", null],
  ["wr_outlet_pipe_designation", "Марка выходных трубопроводов", "text", null, null],
  ["wr_waterstop_retained_spare_m", "Сохраняемый запас гидрошпонки", "decimal", "m", null],
  ["wr_waterstop_supplier_roll_length_m", "Длина гидрошпонки в рулоне поставщика", "decimal", "m", null],
  ["wr_structural_concrete_volume_m3", "Объём конструкционного бетона", "decimal", "m3", null],
  ["wr_blinding_concrete_volume_m3", "Объём подготовительного бетона", "decimal", "m3", null],
  ["wr_rebar_mass_kg", "Масса арматуры резервуаров", "decimal", "kg", null],
  ["wr_formwork_area_m2", "Площадь опалубки резервуаров", "decimal", "m2", null],
  ["wr_external_waterproofing_area_m2", "Площадь наружной гидроизоляции", "decimal", "m2", null],
  ["wr_internal_potable_coating_area_m2", "Площадь внутреннего покрытия для питьевой воды", "decimal", "m2", null],
  ["wr_overflow_pipe_designation", "Марка переливных трубопроводов", "text", null, null],
  ["wr_overflow_pipe_length_m", "Длина переливных трубопроводов", "decimal", "m", null],
  ["wr_drain_pipe_designation", "Марка дренажных трубопроводов", "text", null, null],
  ["wr_drain_pipe_length_m", "Длина дренажных трубопроводов", "decimal", "m", null],
  ["wr_isolation_valve_designation", "Марка запорной арматуры", "text", null, null],
  ["wr_isolation_valve_quantity_piece", "Количество единиц запорной арматуры", "integer", "piece", null],
  ["wr_pipe_fitting_designation", "Марка фасонных частей", "text", null, null],
  ["wr_pipe_fitting_quantity_set", "Количество комплектов фасонных частей", "integer", "set", null],
  ["wr_access_hatch_designation", "Марка люков доступа", "text", null, null],
  ["wr_access_hatch_quantity_piece", "Количество люков доступа", "integer", "piece", null],
  ["wr_ladder_designation", "Марка лестниц", "text", null, null],
  ["wr_ladder_quantity_piece", "Количество лестниц", "integer", "piece", null],
  ["wr_ventilation_assembly_designation", "Марка вентиляционных узлов", "text", null, null],
  ["wr_ventilation_assembly_quantity_piece", "Количество вентиляционных узлов", "integer", "piece", null],
  ["wr_pipe_support_designation", "Марка опор трубопроводов", "text", null, null],
  ["wr_pipe_support_quantity_piece", "Количество опор трубопроводов", "integer", "piece", null],
  ["wr_penetration_seal_designation", "Марка герметизаторов вводов", "text", null, null],
  ["wr_penetration_seal_quantity_piece", "Количество герметизаторов вводов", "integer", "piece", null],
  ["wr_disinfectant_designation", "Марка дезинфицирующего реагента", "text", null, null],
  ["wr_disinfectant_mass_kg", "Масса дезинфицирующего реагента", "decimal", "kg", null],
  ["wr_commissioning_consumable_designation", "Марка монтажных и пусковых расходников", "text", null, null],
  ["wr_commissioning_consumable_quantity_set", "Количество комплектов монтажных и пусковых расходников", "integer", "set", null],
  ["wr_backfill_volume_m3", "Объём обратной засыпки", "decimal", "m3", null],
  ["wr_hydrostatic_test_count", "Количество гидростатических испытаний", "integer", "test", null],
  ["wr_disinfection_cycle_count", "Количество циклов дезинфекции", "integer", "cycle", null],
  ["wr_water_quality_test_count", "Количество анализов качества воды", "integer", "test", null],
  ["wr_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wr_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wr_civil_labor_h", "Труд на железобетонные конструкции", "decimal", "man_hour", null],
  ["wr_piping_labor_h", "Труд на трубопроводы и арматуру", "decimal", "man_hour", null],
  ["wr_waterproofing_labor_h", "Труд на гидроизоляцию и внутреннее покрытие", "decimal", "man_hour", null],
  ["wr_qa_documentation_labor_h", "Труд на испытания, дезинфекцию и документацию", "decimal", "man_hour", null],
  ["wr_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wr_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wr_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["wr_material_delivery_trip_count", "Рейсы доставки материалов и оборудования", "integer", "trip", null],
  ["wr_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["wr_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wr_excavation_shoring_designation", "Конструкция крепления котлована", "text", null, null],
  ["wr_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["wr_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wr_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["wr_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["wr_road_reinstatement_mode", "Восстановление дороги требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wr_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["wr_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering",
    "road_reinstatement"] as const) {
    if (parameterId.startsWith(`wr_${branch}_`) && parameterId !== `wr_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `wr_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `wr_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type WaterReservoirParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WATER_RESERVOIR_PARAMETERS: readonly WaterReservoirParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "wr_waterstop_retained_spare_m" ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.water-reservoir-r1",
      semantic_parameter_key: `water-reservoir:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_CLEAN_WATER_RESERVOIR_PROJECT_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу и утверждённому проекту резервуаров.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_RESERVOIR_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_CLEAN_WATER_RESERVOIR_PROJECT_DOCUMENTATION",
        source_document: WATER_RESERVOIR_SOURCE_ID,
        source_locator: WATER_RESERVOIR_SOURCE_METADATA.exact_locator,
        guide_version: "water-reservoir-r1",
        source_snapshot_hash: WATER_RESERVOIR_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранные железобетонные резервуары чистой воды; смежные сооружения и сети исключены.",
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const WATER_RESERVOIR_RUNTIME_INPUT = Object.freeze({
  wr_waterstop_retained_spare_m: 0,
  wr_waterstop_supplier_roll_length_m: 1,
});
export const WATER_RESERVOIR_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WATER_RESERVOIR_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WATER_RESERVOIR_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WATER_RESERVOIR_RUNTIME_INPUT).map((id) => [id, [WATER_RESERVOIR_SOURCE_ID]]),
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
  { rowId: "rc09:wr_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, испытание и приёмка резервуаров чистой воды", unitId: "piece", formulaId: "wr_acceptance_count_v1", expression: "wr_reservoir_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон резервуаров", unitId: "m3", formulaId: "wr_structural_concrete_volume_v1", expression: "wr_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wr_blinding_concrete", section: "Материалы", category: "material", titleRu: "Подготовительный бетон", unitId: "m3", formulaId: "wr_blinding_concrete_volume_v1", expression: "wr_blinding_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wr_rebar", section: "Материалы", category: "material", titleRu: "Арматура резервуаров", unitId: "kg", formulaId: "wr_rebar_mass_v1", expression: "wr_rebar_mass_kg", procurementEligible: true },
  { rowId: "rc09:wr_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка резервуаров", unitId: "m2", formulaId: "wr_formwork_area_v1", expression: "wr_formwork_area_m2" },
  { rowId: "rc09:wr_external_waterproofing", section: "Материалы", category: "material", titleRu: "Наружная гидроизоляция резервуаров", unitId: "m2", formulaId: "wr_external_waterproofing_area_v1", expression: "wr_external_waterproofing_area_m2", procurementEligible: true },
  { rowId: "rc09:wr_internal_potable_coating", section: "Материалы", category: "material", titleRu: "Внутреннее покрытие для питьевой воды", unitId: "m2", formulaId: "wr_internal_potable_coating_area_v1", expression: "wr_internal_potable_coating_area_m2", procurementEligible: true },
  { rowId: "rc09:wr_waterstop", section: "Материалы", category: "material", titleRu: "Гидрошпонка рабочих швов", unitId: "m", formulaId: "wr_waterstop_order_length_v1", expression: "ceil((wr_waterstop_installed_m+wr_waterstop_retained_spare_m)/wr_waterstop_supplier_roll_length_m)*wr_waterstop_supplier_roll_length_m", procurementEligible: true, titleParameterIds: ["wr_waterstop_designation"] },
  { rowId: "rc09:wr_inlet_pipe", section: "Материалы", category: "material", titleRu: "Входные трубопроводы", unitId: "m", formulaId: "wr_inlet_pipe_length_v1", expression: "wr_inlet_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wr_inlet_pipe_designation"] },
  { rowId: "rc09:wr_outlet_pipe", section: "Материалы", category: "material", titleRu: "Выходные трубопроводы", unitId: "m", formulaId: "wr_outlet_pipe_length_v1", expression: "wr_outlet_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wr_outlet_pipe_designation"] },
  { rowId: "rc09:wr_overflow_pipe", section: "Материалы", category: "material", titleRu: "Переливные трубопроводы", unitId: "m", formulaId: "wr_overflow_pipe_length_v1", expression: "wr_overflow_pipe_length_m", procurementEligible: true, titleParameterIds: ["wr_overflow_pipe_designation"] },
  { rowId: "rc09:wr_drain_pipe", section: "Материалы", category: "material", titleRu: "Дренажные трубопроводы", unitId: "m", formulaId: "wr_drain_pipe_length_v1", expression: "wr_drain_pipe_length_m", procurementEligible: true, titleParameterIds: ["wr_drain_pipe_designation"] },
  { rowId: "rc09:wr_isolation_valves", section: "Комплектующие", category: "material", titleRu: "Запорная арматура", unitId: "piece", formulaId: "wr_isolation_valve_quantity_v1", expression: "wr_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_isolation_valve_designation"] },
  { rowId: "rc09:wr_pipe_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части трубопроводов", unitId: "set", formulaId: "wr_pipe_fitting_quantity_v1", expression: "wr_pipe_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["wr_pipe_fitting_designation"] },
  { rowId: "rc09:wr_access_hatches", section: "Комплектующие", category: "material", titleRu: "Люки доступа", unitId: "piece", formulaId: "wr_access_hatch_quantity_v1", expression: "wr_access_hatch_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_access_hatch_designation"] },
  { rowId: "rc09:wr_ladders", section: "Комплектующие", category: "material", titleRu: "Лестницы резервуаров", unitId: "piece", formulaId: "wr_ladder_quantity_v1", expression: "wr_ladder_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_ladder_designation"] },
  { rowId: "rc09:wr_ventilation_assemblies", section: "Комплектующие", category: "material", titleRu: "Вентиляционные узлы", unitId: "piece", formulaId: "wr_ventilation_assembly_quantity_v1", expression: "wr_ventilation_assembly_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_ventilation_assembly_designation"] },
  { rowId: "rc09:wr_pipe_supports", section: "Комплектующие", category: "material", titleRu: "Опоры трубопроводов", unitId: "piece", formulaId: "wr_pipe_support_quantity_v1", expression: "wr_pipe_support_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_pipe_support_designation"] },
  { rowId: "rc09:wr_penetration_seals", section: "Расходники", category: "material", titleRu: "Герметизаторы вводов", unitId: "piece", formulaId: "wr_penetration_seal_quantity_v1", expression: "wr_penetration_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["wr_penetration_seal_designation"] },
  { rowId: "rc09:wr_disinfectant", section: "Расходники", category: "material", titleRu: "Реагент для дезинфекции", unitId: "kg", formulaId: "wr_disinfectant_mass_v1", expression: "wr_disinfectant_mass_kg", procurementEligible: true, titleParameterIds: ["wr_disinfectant_designation"] },
  { rowId: "rc09:wr_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "wr_commissioning_consumable_quantity_v1", expression: "wr_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wr_commissioning_consumable_designation"] },
  { rowId: "rc09:wr_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка резервуаров", unitId: "m3", formulaId: "wr_backfill_volume_v1", expression: "wr_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:wr_hydrostatic_tests", section: "Контроль", category: "service", titleRu: "Гидростатические испытания резервуаров", unitId: "test", formulaId: "wr_hydrostatic_test_v1", expression: "wr_hydrostatic_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr_disinfection_cycles", section: "Контроль", category: "service", titleRu: "Дезинфекция резервуаров", unitId: "cycle", formulaId: "wr_disinfection_cycle_v1", expression: "wr_disinfection_cycle_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr_water_quality_tests", section: "Контроль", category: "service", titleRu: "Лабораторный контроль качества воды", unitId: "test", formulaId: "wr_water_quality_test_v1", expression: "wr_water_quality_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация резервуаров", unitId: "document", formulaId: "wr_asbuilt_document_v1", expression: "wr_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr_excavation_shoring", section: "Условные работы", category: "construction_work", titleRu: "Крепление котлована", unitId: "m2", formulaId: "wr_excavation_shoring_area_v1", expression: "wr_excavation_shoring_area_m2", inclusionAst: equals("wr_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["wr_excavation_shoring_designation"] },
  { rowId: "rc09:wr_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлована", unitId: "machine_hour", formulaId: "wr_groundwater_dewatering_machine_v1", expression: "wr_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wr_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["wr_groundwater_dewatering_designation"] },
  { rowId: "rc09:wr_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "wr_road_reinstatement_area_v1", expression: "wr_road_reinstatement_area_m2", inclusionAst: equals("wr_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["wr_road_reinstatement_designation"] },
  { rowId: "rc09:wr-waterstop-balance:installed-net", section: "Баланс гидрошпонки", category: "material", titleRu: "Проектная длина гидрошпонки", unitId: "m", formulaId: "wr_waterstop_installed_net_v1", expression: "wr_waterstop_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr-waterstop-balance:retained-spare", section: "Баланс гидрошпонки", category: "material", titleRu: "Сохраняемый запас гидрошпонки", unitId: "m", formulaId: "wr_waterstop_retained_spare_v1", expression: "wr_waterstop_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr-waterstop-balance:total-need", section: "Баланс гидрошпонки", category: "material", titleRu: "Общая потребность в гидрошпонке", unitId: "m", formulaId: "wr_waterstop_total_need_v1", expression: "wr_waterstop_installed_m+wr_waterstop_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr-waterstop-balance:roll-count", section: "Баланс гидрошпонки", category: "material", titleRu: "Количество рулонов гидрошпонки", unitId: "roll", formulaId: "wr_waterstop_roll_count_v1", expression: "ceil((wr_waterstop_installed_m+wr_waterstop_retained_spare_m)/wr_waterstop_supplier_roll_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr-waterstop-balance:remainder", section: "Баланс гидрошпонки", category: "material", titleRu: "Остаток гидрошпонки после монтажа", unitId: "m", formulaId: "wr_waterstop_remainder_v1", expression: "ceil((wr_waterstop_installed_m+wr_waterstop_retained_spare_m)/wr_waterstop_supplier_roll_length_m)*wr_waterstop_supplier_roll_length_m-wr_waterstop_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wr-waterstop-balance:surplus-beyond-spare", section: "Баланс гидрошпонки", category: "material", titleRu: "Свободный остаток гидрошпонки сверх запаса", unitId: "m", formulaId: "wr_waterstop_surplus_v1", expression: "max(0,ceil((wr_waterstop_installed_m+wr_waterstop_retained_spare_m)/wr_waterstop_supplier_roll_length_m)*wr_waterstop_supplier_roll_length_m-wr_waterstop_installed_m-wr_waterstop_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wr-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wr_survey_labor_v1", expression: "wr_survey_labor_h" },
  { rowId: "rc09:labor:wr-civil", section: "Труд", category: "construction_work", titleRu: "Железобетонные конструкции резервуаров", unitId: "man_hour", formulaId: "wr_civil_labor_v1", expression: "wr_civil_labor_h" },
  { rowId: "rc09:labor:wr-piping", section: "Труд", category: "construction_work", titleRu: "Монтаж трубопроводов и арматуры", unitId: "man_hour", formulaId: "wr_piping_labor_v1", expression: "wr_piping_labor_h" },
  { rowId: "rc09:labor:wr-waterproofing", section: "Труд", category: "construction_work", titleRu: "Гидроизоляция и внутреннее покрытие", unitId: "man_hour", formulaId: "wr_waterproofing_labor_v1", expression: "wr_waterproofing_labor_h" },
  { rowId: "rc09:labor:wr-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, дезинфекция и документация", unitId: "man_hour", formulaId: "wr_qa_documentation_labor_v1", expression: "wr_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wr-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wr_excavator_machine_v1", expression: "wr_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wr-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "wr_crane_machine_v1", expression: "wr_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wr-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "wr_compactor_machine_v1", expression: "wr_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wr-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов и оборудования", unitId: "trip", formulaId: "wr_material_delivery_trip_v1", expression: "wr_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wr-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wr_waste_removal_trip_v1", expression: "wr_waste_removal_trip_count", procurementEligible: true },
]);

export const WATER_RESERVOIR_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const WATER_RESERVOIR_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `water-reservoir:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_CLEAN_WATER_RESERVOIR_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: WATER_RESERVOIR_SOURCE_ID,
        source_id: WATER_RESERVOIR_SOURCE_ID, normId: WATER_RESERVOIR_NORM_ID,
        norm_id: WATER_RESERVOIR_NORM_ID,
        normVersion: WATER_RESERVOIR_SOURCE_METADATA.source_document_version,
        source_title: WATER_RESERVOIR_SOURCE_METADATA.source_title,
        exact_locator: WATER_RESERVOIR_SOURCE_METADATA.exact_locator,
        source_definition_hash: WATER_RESERVOIR_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "steel tank, silo, intake, treatment, pump station, network, tower or sewer",
        "capacity-derived civil, piping, labor, mechanism or logistics quantity",
        "automatic shoring, dewatering or road reinstatement",
        "automatic retained spare or supplier roll", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId,
      inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const WATER_RESERVOIR_SHORT_INPUT = Object.freeze({
  wr_reservoir_count: 2,
  wr_reservoir_designation: "WR-RC-BURIED-2X1000-CW",
  wr_reservoir_type: "BURIED_RC_CLEAN_WATER_RESERVOIR",
  wr_total_storage_capacity_m3: 2000,
  wr_unit_capacity_m3: 1000,
  wr_waterstop_installed_m: 420,
  wr_waterstop_designation: "PVC-WATERSTOP-250MM",
  wr_inlet_pipe_installed_m: 64,
  wr_inlet_pipe_designation: "SS304-DN300-PN10",
  wr_outlet_pipe_installed_m: 64,
  wr_outlet_pipe_designation: "SS304-DN300-PN10",
  ...WATER_RESERVOIR_RUNTIME_INPUT,
});
export const WATER_RESERVOIR_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_RESERVOIR_SHORT_INPUT,
  wr_structural_concrete_volume_m3: 1850,
  wr_blinding_concrete_volume_m3: 180,
  wr_rebar_mass_kg: 260000,
  wr_formwork_area_m2: 7600,
  wr_external_waterproofing_area_m2: 4200,
  wr_internal_potable_coating_area_m2: 5200,
  wr_overflow_pipe_designation: "SS304-DN300-PN10", wr_overflow_pipe_length_m: 48,
  wr_drain_pipe_designation: "SS304-DN200-PN10", wr_drain_pipe_length_m: 32,
  wr_isolation_valve_designation: "BUTTERFLY-VALVE-DN300-PN10",
  wr_isolation_valve_quantity_piece: 12,
  wr_pipe_fitting_designation: "SS304-RESERVOIR-PIPE-FITTING-KIT",
  wr_pipe_fitting_quantity_set: 8,
  wr_access_hatch_designation: "SS304-LOCKABLE-800X800", wr_access_hatch_quantity_piece: 8,
  wr_ladder_designation: "SS304-RESERVOIR-LADDER", wr_ladder_quantity_piece: 8,
  wr_ventilation_assembly_designation: "SS304-DN200-INSECT-SCREEN-VENT",
  wr_ventilation_assembly_quantity_piece: 8,
  wr_pipe_support_designation: "SS304-DN200-300-PIPE-SUPPORT",
  wr_pipe_support_quantity_piece: 64,
  wr_penetration_seal_designation: "LINK-SEAL-DN200-300",
  wr_penetration_seal_quantity_piece: 24,
  wr_disinfectant_designation: "SODIUM-HYPOCHLORITE-12PCT", wr_disinfectant_mass_kg: 600,
  wr_commissioning_consumable_designation: "RESERVOIR-GASKET-BOLT-SEAL-KIT",
  wr_commissioning_consumable_quantity_set: 2,
  wr_backfill_volume_m3: 6800,
  wr_hydrostatic_test_count: 2, wr_disinfection_cycle_count: 2,
  wr_water_quality_test_count: 8, wr_asbuilt_document_count: 1,
  wr_survey_labor_h: 320, wr_civil_labor_h: 14800, wr_piping_labor_h: 3200,
  wr_waterproofing_labor_h: 4600, wr_qa_documentation_labor_h: 1600,
  wr_excavator_machine_h: 640, wr_crane_machine_h: 520, wr_compactor_machine_h: 480,
  wr_material_delivery_trip_count: 240, wr_waste_removal_trip_count: 120,
  wr_excavation_shoring_mode: "NOT_REQUIRED",
  wr_groundwater_dewatering_mode: "NOT_REQUIRED",
  wr_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileWaterReservoirR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WATER_RESERVOIR_CATALOG_ID;
  if (catalogId !== WATER_RESERVOIR_CATALOG_ID) {
    throw new Error(`WATER_RESERVOIR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.water-reservoir-r1", catalogId,
    primaryMeasureParameterId: "wr_reservoir_count",
    parameterDefinitions: [...WATER_RESERVOIR_PARAMETERS],
    formulaDefinitions: [...WATER_RESERVOIR_FORMULAS],
    resourceDefinitions: [...WATER_RESERVOIR_RESOURCES], submittedParameters,
    confirmedParameters: { ...WATER_RESERVOIR_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value) });
}
