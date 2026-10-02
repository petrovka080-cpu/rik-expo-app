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

export const WATER_TOWER_CATALOG_ID = "canonical-work:expanded:water_tower";
export const WATER_TOWER_SOURCE_ID = "project_rozhovsky_water_tower_coating_balance_v1";
export const WATER_TOWER_NORM_ID = "norm:project:rozhovsky_water_tower_coating_balance:v1";
export const WATER_TOWER_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект стальной водонапорной башни Рожновского, чертежи фундамента и металлоконструкций, спецификации трубопроводов, КИП и покрытия",
  source_authority: "Проектировщики водоснабжения и металлоконструкций, завод-изготовитель башни, поставщики покрытия и КИП, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_ROZHNOVSKY_WATER_TOWER_FOUNDATION_STEEL_PIPING_CONTROLS_QA_LOGISTICS_COATING_BALANCE_S27_24",
  definition_hash: "c1e21dfa2a7127537af297beffe8b169ea17b9e0677242af02a31e9aa56d6dcf",
  exact_locator: "1 башня WT-ROZHNOVSKY-VBR50-18, бак 50 м3, высота опоры 18 м, 620 м2 JOTUN-TANKGUARD-DW-SYSTEM, 38 м STEEL-EPOXY-DN150-PN16 и 22 м STEEL-GALV-DN100",
  use_restriction: "Ёмкость и высота не определяют автоматически фундамент, металлоконструкции, трубопроводы, покрытие, труд, механизмы или логистику. Крепление котлована, водопонижение и восстановление дороги включаются только по проекту. Наружная сеть, траншея, колодцы, гидранты, водозабор, водоподготовка, резервуар, канализация и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "c1e21dfa2a7127537af297beffe8b169ea17b9e0677242af02a31e9aa56d6dcf",
});

const KNOWN_SCOPE = [
  "wt_tower_count", "wt_tower_designation", "wt_tower_type",
  "wt_tank_capacity_m3", "wt_support_height_m",
  "wt_coating_installed_area_m2", "wt_coating_designation",
  "wt_riser_pipe_installed_m", "wt_riser_pipe_designation",
  "wt_overflow_pipe_installed_m", "wt_overflow_pipe_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "wt_coating_retained_spare_area_m2", "wt_coating_supplier_package_coverage_m2",
]);
const CONDITIONAL_DETAILS = new Set([
  "wt_excavation_shoring_designation", "wt_excavation_shoring_area_m2",
  "wt_groundwater_dewatering_designation", "wt_groundwater_dewatering_machine_h",
  "wt_road_reinstatement_designation", "wt_road_reinstatement_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["wt_tower_count", "Количество водонапорных башен", "integer", "piece", null],
  ["wt_tower_designation", "Марка водонапорной башни", "text", null, null],
  ["wt_tower_type", "Тип водонапорной башни", "enum", null, ["STEEL_ROZHNOVSKY_WATER_TOWER"]],
  ["wt_tank_capacity_m3", "Ёмкость бака башни", "decimal", "m3", null],
  ["wt_support_height_m", "Высота опоры башни", "decimal", "m", null],
  ["wt_coating_installed_area_m2", "Проектная площадь защитного покрытия", "decimal", "m2", null],
  ["wt_coating_designation", "Система защитного покрытия", "text", null, null],
  ["wt_riser_pipe_installed_m", "Длина стояка башни", "decimal", "m", null],
  ["wt_riser_pipe_designation", "Марка трубы стояка", "text", null, null],
  ["wt_overflow_pipe_installed_m", "Длина переливного трубопровода", "decimal", "m", null],
  ["wt_overflow_pipe_designation", "Марка переливного трубопровода", "text", null, null],
  ["wt_coating_retained_spare_area_m2", "Сохраняемый запас покрытия", "decimal", "m2", null],
  ["wt_coating_supplier_package_coverage_m2", "Площадь покрытия одной упаковкой поставщика", "decimal", "m2", null],
  ["wt_foundation_concrete_volume_m3", "Объём бетона фундамента", "decimal", "m3", null],
  ["wt_blinding_concrete_volume_m3", "Объём подготовительного бетона", "decimal", "m3", null],
  ["wt_rebar_mass_kg", "Масса арматуры фундамента", "decimal", "kg", null],
  ["wt_formwork_area_m2", "Площадь опалубки фундамента", "decimal", "m2", null],
  ["wt_anchor_bolt_designation", "Марка анкерных болтов", "text", null, null],
  ["wt_anchor_bolt_quantity_piece", "Количество анкерных болтов", "integer", "piece", null],
  ["wt_drain_pipe_designation", "Марка дренажного трубопровода", "text", null, null],
  ["wt_drain_pipe_length_m", "Длина дренажного трубопровода", "decimal", "m", null],
  ["wt_isolation_valve_designation", "Марка запорной арматуры", "text", null, null],
  ["wt_isolation_valve_quantity_piece", "Количество единиц запорной арматуры", "integer", "piece", null],
  ["wt_pipe_fitting_designation", "Марка фасонных частей", "text", null, null],
  ["wt_pipe_fitting_quantity_set", "Количество комплектов фасонных частей", "integer", "set", null],
  ["wt_level_control_designation", "Марка приборов контроля уровня", "text", null, null],
  ["wt_level_control_quantity_piece", "Количество приборов контроля уровня", "integer", "piece", null],
  ["wt_lightning_protection_designation", "Система молниезащиты", "text", null, null],
  ["wt_lightning_protection_quantity_set", "Количество комплектов молниезащиты", "integer", "set", null],
  ["wt_earthing_designation", "Система заземления", "text", null, null],
  ["wt_earthing_quantity_set", "Количество комплектов заземления", "integer", "set", null],
  ["wt_ladder_platform_designation", "Марка лестниц и площадок", "text", null, null],
  ["wt_ladder_platform_quantity_set", "Количество комплектов лестниц и площадок", "integer", "set", null],
  ["wt_fencing_designation", "Марка ограждения площадки", "text", null, null],
  ["wt_fencing_length_m", "Длина ограждения площадки", "decimal", "m", null],
  ["wt_pipe_support_designation", "Марка опор трубопроводов", "text", null, null],
  ["wt_pipe_support_quantity_piece", "Количество опор трубопроводов", "integer", "piece", null],
  ["wt_disinfectant_designation", "Марка дезинфицирующего реагента", "text", null, null],
  ["wt_disinfectant_mass_kg", "Масса дезинфицирующего реагента", "decimal", "kg", null],
  ["wt_commissioning_consumable_designation", "Марка монтажных и пусковых расходников", "text", null, null],
  ["wt_commissioning_consumable_quantity_set", "Количество комплектов монтажных и пусковых расходников", "integer", "set", null],
  ["wt_hydrostatic_test_count", "Количество гидростатических испытаний", "integer", "test", null],
  ["wt_disinfection_cycle_count", "Количество циклов дезинфекции", "integer", "cycle", null],
  ["wt_electrical_test_count", "Количество испытаний молниезащиты и заземления", "integer", "test", null],
  ["wt_water_quality_test_count", "Количество анализов качества воды", "integer", "test", null],
  ["wt_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["wt_survey_labor_h", "Труд на разбивку и исполнительную съёмку", "decimal", "man_hour", null],
  ["wt_civil_labor_h", "Труд на устройство фундамента", "decimal", "man_hour", null],
  ["wt_steel_piping_labor_h", "Труд на монтаж башни и трубопроводов", "decimal", "man_hour", null],
  ["wt_coating_electrical_labor_h", "Труд на покрытие, КИП и электрозащиту", "decimal", "man_hour", null],
  ["wt_qa_documentation_labor_h", "Труд на испытания, дезинфекцию и документацию", "decimal", "man_hour", null],
  ["wt_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["wt_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["wt_welding_machine_h", "Работа сварочного оборудования", "decimal", "machine_hour", null],
  ["wt_material_delivery_trip_count", "Рейсы доставки материалов и оборудования", "integer", "trip", null],
  ["wt_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["wt_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wt_excavation_shoring_designation", "Конструкция крепления котлована", "text", null, null],
  ["wt_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["wt_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wt_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["wt_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["wt_road_reinstatement_mode", "Восстановление дороги требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["wt_road_reinstatement_designation", "Конструкция восстановления дороги", "text", null, null],
  ["wt_road_reinstatement_area_m2", "Площадь восстановления дороги", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering",
    "road_reinstatement"] as const) {
    if (parameterId.startsWith(`wt_${branch}_`) && parameterId !== `wt_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `wt_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `wt_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type WaterTowerParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const WATER_TOWER_PARAMETERS: readonly WaterTowerParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: parameterId === "wt_coating_retained_spare_area_m2" ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.water-tower-r1",
      semantic_parameter_key: `water-tower:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_WATER_TOWER_PROJECT_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу и утверждённому проекту башни.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, спецификации, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_WATER_TOWER_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_WATER_TOWER_PROJECT_DOCUMENTATION",
        source_document: WATER_TOWER_SOURCE_ID,
        source_locator: WATER_TOWER_SOURCE_METADATA.exact_locator,
        guide_version: "water-tower-r1",
        source_snapshot_hash: WATER_TOWER_SOURCE_METADATA.artifact_sha256,
        applicability: "Только выбранная стальная башня Рожновского; наружная сеть и смежные сооружения исключены.",
        verified_at: "2026-10-02T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
    },
  })),
);

export const WATER_TOWER_RUNTIME_INPUT = Object.freeze({
  wt_coating_retained_spare_area_m2: 0,
  wt_coating_supplier_package_coverage_m2: 1,
});
export const WATER_TOWER_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(WATER_TOWER_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const WATER_TOWER_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(WATER_TOWER_RUNTIME_INPUT).map((id) => [id, [WATER_TOWER_SOURCE_ID]]),
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
  { rowId: "rc09:wt_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, испытание и приёмка водонапорной башни", unitId: "piece", formulaId: "wt_acceptance_count_v1", expression: "wt_tower_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_tower_assembly", section: "Оборудование", category: "equipment", titleRu: "Стальная водонапорная башня в комплекте", unitId: "piece", formulaId: "wt_tower_assembly_quantity_v1", expression: "wt_tower_count", procurementEligible: true, titleParameterIds: ["wt_tower_designation"] },
  { rowId: "rc09:wt_foundation_concrete", section: "Материалы", category: "material", titleRu: "Бетон фундамента башни", unitId: "m3", formulaId: "wt_foundation_concrete_volume_v1", expression: "wt_foundation_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wt_blinding_concrete", section: "Материалы", category: "material", titleRu: "Подготовительный бетон", unitId: "m3", formulaId: "wt_blinding_concrete_volume_v1", expression: "wt_blinding_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:wt_rebar", section: "Материалы", category: "material", titleRu: "Арматура фундамента", unitId: "kg", formulaId: "wt_rebar_mass_v1", expression: "wt_rebar_mass_kg", procurementEligible: true },
  { rowId: "rc09:wt_formwork", section: "Работы", category: "construction_work", titleRu: "Опалубка фундамента", unitId: "m2", formulaId: "wt_formwork_area_v1", expression: "wt_formwork_area_m2" },
  { rowId: "rc09:wt_anchor_bolts", section: "Комплектующие", category: "material", titleRu: "Анкерные болты башни", unitId: "piece", formulaId: "wt_anchor_bolt_quantity_v1", expression: "wt_anchor_bolt_quantity_piece", procurementEligible: true, titleParameterIds: ["wt_anchor_bolt_designation"] },
  { rowId: "rc09:wt_coating", section: "Материалы", category: "material", titleRu: "Защитное покрытие башни", unitId: "m2", formulaId: "wt_coating_order_area_v1", expression: "ceil((wt_coating_installed_area_m2+wt_coating_retained_spare_area_m2)/wt_coating_supplier_package_coverage_m2)*wt_coating_supplier_package_coverage_m2", procurementEligible: true, titleParameterIds: ["wt_coating_designation"] },
  { rowId: "rc09:wt_riser_pipe", section: "Материалы", category: "material", titleRu: "Стояк водонапорной башни", unitId: "m", formulaId: "wt_riser_pipe_length_v1", expression: "wt_riser_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wt_riser_pipe_designation"] },
  { rowId: "rc09:wt_overflow_pipe", section: "Материалы", category: "material", titleRu: "Переливной трубопровод", unitId: "m", formulaId: "wt_overflow_pipe_length_v1", expression: "wt_overflow_pipe_installed_m", procurementEligible: true, titleParameterIds: ["wt_overflow_pipe_designation"] },
  { rowId: "rc09:wt_drain_pipe", section: "Материалы", category: "material", titleRu: "Дренажный трубопровод", unitId: "m", formulaId: "wt_drain_pipe_length_v1", expression: "wt_drain_pipe_length_m", procurementEligible: true, titleParameterIds: ["wt_drain_pipe_designation"] },
  { rowId: "rc09:wt_isolation_valves", section: "Комплектующие", category: "material", titleRu: "Запорная арматура", unitId: "piece", formulaId: "wt_isolation_valve_quantity_v1", expression: "wt_isolation_valve_quantity_piece", procurementEligible: true, titleParameterIds: ["wt_isolation_valve_designation"] },
  { rowId: "rc09:wt_pipe_fittings", section: "Комплектующие", category: "material", titleRu: "Фасонные части трубопроводов", unitId: "set", formulaId: "wt_pipe_fitting_quantity_v1", expression: "wt_pipe_fitting_quantity_set", procurementEligible: true, titleParameterIds: ["wt_pipe_fitting_designation"] },
  { rowId: "rc09:wt_level_controls", section: "Оборудование", category: "equipment", titleRu: "Приборы контроля уровня", unitId: "piece", formulaId: "wt_level_control_quantity_v1", expression: "wt_level_control_quantity_piece", procurementEligible: true, titleParameterIds: ["wt_level_control_designation"] },
  { rowId: "rc09:wt_lightning_protection", section: "Комплектующие", category: "material", titleRu: "Молниезащита башни", unitId: "set", formulaId: "wt_lightning_protection_quantity_v1", expression: "wt_lightning_protection_quantity_set", procurementEligible: true, titleParameterIds: ["wt_lightning_protection_designation"] },
  { rowId: "rc09:wt_earthing", section: "Комплектующие", category: "material", titleRu: "Заземление башни", unitId: "set", formulaId: "wt_earthing_quantity_v1", expression: "wt_earthing_quantity_set", procurementEligible: true, titleParameterIds: ["wt_earthing_designation"] },
  { rowId: "rc09:wt_ladder_platforms", section: "Комплектующие", category: "material", titleRu: "Лестницы и площадки обслуживания", unitId: "set", formulaId: "wt_ladder_platform_quantity_v1", expression: "wt_ladder_platform_quantity_set", procurementEligible: true, titleParameterIds: ["wt_ladder_platform_designation"] },
  { rowId: "rc09:wt_fencing", section: "Материалы", category: "material", titleRu: "Ограждение площадки башни", unitId: "m", formulaId: "wt_fencing_length_v1", expression: "wt_fencing_length_m", procurementEligible: true, titleParameterIds: ["wt_fencing_designation"] },
  { rowId: "rc09:wt_pipe_supports", section: "Комплектующие", category: "material", titleRu: "Опоры трубопроводов", unitId: "piece", formulaId: "wt_pipe_support_quantity_v1", expression: "wt_pipe_support_quantity_piece", procurementEligible: true, titleParameterIds: ["wt_pipe_support_designation"] },
  { rowId: "rc09:wt_disinfectant", section: "Расходники", category: "material", titleRu: "Реагент для дезинфекции", unitId: "kg", formulaId: "wt_disinfectant_mass_v1", expression: "wt_disinfectant_mass_kg", procurementEligible: true, titleParameterIds: ["wt_disinfectant_designation"] },
  { rowId: "rc09:wt_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Монтажные и пусковые расходники", unitId: "set", formulaId: "wt_commissioning_consumable_quantity_v1", expression: "wt_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["wt_commissioning_consumable_designation"] },
  { rowId: "rc09:wt_hydrostatic_tests", section: "Контроль", category: "service", titleRu: "Гидростатические испытания башни", unitId: "test", formulaId: "wt_hydrostatic_test_v1", expression: "wt_hydrostatic_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_disinfection_cycles", section: "Контроль", category: "service", titleRu: "Дезинфекция бака и трубопроводов", unitId: "cycle", formulaId: "wt_disinfection_cycle_v1", expression: "wt_disinfection_cycle_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_electrical_tests", section: "Контроль", category: "service", titleRu: "Испытания молниезащиты и заземления", unitId: "test", formulaId: "wt_electrical_test_v1", expression: "wt_electrical_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_water_quality_tests", section: "Контроль", category: "service", titleRu: "Лабораторный контроль качества воды", unitId: "test", formulaId: "wt_water_quality_test_v1", expression: "wt_water_quality_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация башни", unitId: "document", formulaId: "wt_asbuilt_document_v1", expression: "wt_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt_excavation_shoring", section: "Условные работы", category: "construction_work", titleRu: "Крепление котлована фундамента", unitId: "m2", formulaId: "wt_excavation_shoring_area_v1", expression: "wt_excavation_shoring_area_m2", inclusionAst: equals("wt_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["wt_excavation_shoring_designation"] },
  { rowId: "rc09:wt_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлована", unitId: "machine_hour", formulaId: "wt_groundwater_dewatering_machine_v1", expression: "wt_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("wt_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["wt_groundwater_dewatering_designation"] },
  { rowId: "rc09:wt_road_reinstatement", section: "Условные работы", category: "construction_work", titleRu: "Восстановление дорожного покрытия", unitId: "m2", formulaId: "wt_road_reinstatement_area_v1", expression: "wt_road_reinstatement_area_m2", inclusionAst: equals("wt_road_reinstatement_mode", "REQUIRED"), titleParameterIds: ["wt_road_reinstatement_designation"] },
  { rowId: "rc09:wt-coating-balance:installed-net", section: "Баланс покрытия", category: "material", titleRu: "Проектная площадь покрытия", unitId: "m2", formulaId: "wt_coating_installed_net_v1", expression: "wt_coating_installed_area_m2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt-coating-balance:retained-spare", section: "Баланс покрытия", category: "material", titleRu: "Сохраняемый запас покрытия", unitId: "m2", formulaId: "wt_coating_retained_spare_v1", expression: "wt_coating_retained_spare_area_m2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt-coating-balance:total-need", section: "Баланс покрытия", category: "material", titleRu: "Общая потребность в покрытии", unitId: "m2", formulaId: "wt_coating_total_need_v1", expression: "wt_coating_installed_area_m2+wt_coating_retained_spare_area_m2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt-coating-balance:package-count", section: "Баланс покрытия", category: "material", titleRu: "Количество упаковок покрытия", unitId: "package", formulaId: "wt_coating_package_count_v1", expression: "ceil((wt_coating_installed_area_m2+wt_coating_retained_spare_area_m2)/wt_coating_supplier_package_coverage_m2)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt-coating-balance:remainder", section: "Баланс покрытия", category: "material", titleRu: "Остаток покрытия после нанесения", unitId: "m2", formulaId: "wt_coating_remainder_v1", expression: "ceil((wt_coating_installed_area_m2+wt_coating_retained_spare_area_m2)/wt_coating_supplier_package_coverage_m2)*wt_coating_supplier_package_coverage_m2-wt_coating_installed_area_m2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:wt-coating-balance:surplus-beyond-spare", section: "Баланс покрытия", category: "material", titleRu: "Свободный остаток покрытия сверх запаса", unitId: "m2", formulaId: "wt_coating_surplus_v1", expression: "max(0,ceil((wt_coating_installed_area_m2+wt_coating_retained_spare_area_m2)/wt_coating_supplier_package_coverage_m2)*wt_coating_supplier_package_coverage_m2-wt_coating_installed_area_m2-wt_coating_retained_spare_area_m2)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:wt-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "wt_survey_labor_v1", expression: "wt_survey_labor_h" },
  { rowId: "rc09:labor:wt-civil", section: "Труд", category: "construction_work", titleRu: "Устройство фундамента башни", unitId: "man_hour", formulaId: "wt_civil_labor_v1", expression: "wt_civil_labor_h" },
  { rowId: "rc09:labor:wt-steel-piping", section: "Труд", category: "construction_work", titleRu: "Монтаж башни и трубопроводов", unitId: "man_hour", formulaId: "wt_steel_piping_labor_v1", expression: "wt_steel_piping_labor_h" },
  { rowId: "rc09:labor:wt-coating-electrical", section: "Труд", category: "construction_work", titleRu: "Покрытие, КИП и электрозащита", unitId: "man_hour", formulaId: "wt_coating_electrical_labor_v1", expression: "wt_coating_electrical_labor_h" },
  { rowId: "rc09:labor:wt-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Испытания, дезинфекция и документация", unitId: "man_hour", formulaId: "wt_qa_documentation_labor_v1", expression: "wt_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:wt-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "wt_excavator_machine_v1", expression: "wt_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wt-crane", section: "Механизмы", category: "equipment", titleRu: "Монтажный кран", unitId: "machine_hour", formulaId: "wt_crane_machine_v1", expression: "wt_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:wt-welding", section: "Механизмы", category: "equipment", titleRu: "Сварочное оборудование", unitId: "machine_hour", formulaId: "wt_welding_machine_v1", expression: "wt_welding_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:wt-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка башни, материалов и оборудования", unitId: "trip", formulaId: "wt_material_delivery_trip_v1", expression: "wt_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:wt-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "wt_waste_removal_trip_v1", expression: "wt_waste_removal_trip_count", procurementEligible: true },
]);

export const WATER_TOWER_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const WATER_TOWER_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `water-tower:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_WATER_TOWER_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: WATER_TOWER_SOURCE_ID, source_id: WATER_TOWER_SOURCE_ID,
        normId: WATER_TOWER_NORM_ID, norm_id: WATER_TOWER_NORM_ID,
        normVersion: WATER_TOWER_SOURCE_METADATA.source_document_version,
        source_title: WATER_TOWER_SOURCE_METADATA.source_title,
        exact_locator: WATER_TOWER_SOURCE_METADATA.exact_locator,
        source_definition_hash: WATER_TOWER_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "village network, trench, chamber, hydrant, intake, treatment, reservoir or sewer",
        "capacity-or-height-derived civil, steel, piping, labor, mechanism or logistics quantity",
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

export const WATER_TOWER_SHORT_INPUT = Object.freeze({
  wt_tower_count: 1, wt_tower_designation: "WT-ROZHNOVSKY-VBR50-18",
  wt_tower_type: "STEEL_ROZHNOVSKY_WATER_TOWER", wt_tank_capacity_m3: 50,
  wt_support_height_m: 18, wt_coating_installed_area_m2: 620,
  wt_coating_designation: "JOTUN-TANKGUARD-DW-SYSTEM",
  wt_riser_pipe_installed_m: 38, wt_riser_pipe_designation: "STEEL-EPOXY-DN150-PN16",
  wt_overflow_pipe_installed_m: 22, wt_overflow_pipe_designation: "STEEL-GALV-DN100",
  ...WATER_TOWER_RUNTIME_INPUT,
});
export const WATER_TOWER_ACCEPTANCE_INPUT = Object.freeze({
  ...WATER_TOWER_SHORT_INPUT,
  wt_foundation_concrete_volume_m3: 145, wt_blinding_concrete_volume_m3: 22,
  wt_rebar_mass_kg: 18500, wt_formwork_area_m2: 520,
  wt_anchor_bolt_designation: "M48-HDG-ANCHOR-CAGE", wt_anchor_bolt_quantity_piece: 24,
  wt_drain_pipe_designation: "STEEL-GALV-DN80", wt_drain_pipe_length_m: 20,
  wt_isolation_valve_designation: "GATE-VALVE-DN80-150-PN16",
  wt_isolation_valve_quantity_piece: 8,
  wt_pipe_fitting_designation: "TOWER-DN80-150-FITTING-KIT", wt_pipe_fitting_quantity_set: 4,
  wt_level_control_designation: "RADAR-LEVEL-TRANSMITTER-IP68", wt_level_control_quantity_piece: 2,
  wt_lightning_protection_designation: "IEC-62305-TOWER-LPS",
  wt_lightning_protection_quantity_set: 1,
  wt_earthing_designation: "GALVANISED-TOWER-EARTH-GRID", wt_earthing_quantity_set: 1,
  wt_ladder_platform_designation: "HDG-SAFETY-LADDER-PLATFORM", wt_ladder_platform_quantity_set: 1,
  wt_fencing_designation: "HDG-MESH-H2400", wt_fencing_length_m: 180,
  wt_pipe_support_designation: "HDG-DN80-150-PIPE-SUPPORT", wt_pipe_support_quantity_piece: 18,
  wt_disinfectant_designation: "SODIUM-HYPOCHLORITE-12PCT", wt_disinfectant_mass_kg: 80,
  wt_commissioning_consumable_designation: "TOWER-GASKET-BOLT-SEAL-KIT",
  wt_commissioning_consumable_quantity_set: 1,
  wt_hydrostatic_test_count: 1, wt_disinfection_cycle_count: 1,
  wt_electrical_test_count: 2, wt_water_quality_test_count: 4, wt_asbuilt_document_count: 1,
  wt_survey_labor_h: 120, wt_civil_labor_h: 2400, wt_steel_piping_labor_h: 780,
  wt_coating_electrical_labor_h: 620, wt_qa_documentation_labor_h: 260,
  wt_excavator_machine_h: 80, wt_crane_machine_h: 160, wt_welding_machine_h: 120,
  wt_material_delivery_trip_count: 32, wt_waste_removal_trip_count: 16,
  wt_excavation_shoring_mode: "NOT_REQUIRED",
  wt_groundwater_dewatering_mode: "NOT_REQUIRED", wt_road_reinstatement_mode: "NOT_REQUIRED",
});

export async function compileWaterTowerR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? WATER_TOWER_CATALOG_ID;
  if (catalogId !== WATER_TOWER_CATALOG_ID) {
    throw new Error(`WATER_TOWER_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.water-tower-r1", catalogId,
    primaryMeasureParameterId: "wt_tower_count",
    parameterDefinitions: [...WATER_TOWER_PARAMETERS],
    formulaDefinitions: [...WATER_TOWER_FORMULAS],
    resourceDefinitions: [...WATER_TOWER_RESOURCES], submittedParameters,
    confirmedParameters: { ...WATER_TOWER_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value) });
}
