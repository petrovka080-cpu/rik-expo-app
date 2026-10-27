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

export const SEWAGE_TREATMENT_TANKS_CATALOG_ID =
  "canonical-work:expanded:sewage_treatment_tanks";
export const SEWAGE_TREATMENT_TANKS_SOURCE_ID =
  "project_rc_sewage_treatment_tanks_waterstop_balance_v1";
export const SEWAGE_TREATMENT_TANKS_NORM_ID =
  "norm:project:rc_sewage_treatment_tanks_waterstop_balance:v1";
export const SEWAGE_TREATMENT_TANKS_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект двух монолитных железобетонных резервуаров очистных сооружений, ведомость объёмов, спецификация гидрошпонки и программа испытаний",
  source_authority: "Проектировщик железобетонных и технологических сооружений, поставщик гидрошпонки, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_RC_SEWAGE_TREATMENT_TANKS_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_WATERSTOP_BALANCE_S27_24",
  definition_hash: "28fb95e8371561cee24427cc6ab9fee537a270aaaed942de1ef1a21256d88aea",
  exact_locator: "2 резервуара STT-RC-2X18X8X5-WT, монолитный прямоугольный ЖБ, усреднение и первичное отстаивание, каждый 18x8 м, рабочая глубина 5 м, 260 м гидрошпонки PVC-P-320",
  use_restriction: "Количество и размеры резервуаров не определяют автоматически земляные, бетонные, арматурные, опалубочные, гидроизоляционные, трудовые, механизированные или логистические объёмы. Крепление котлована, водопонижение и покрытие от запахов включаются только по проекту. Полные КОС, аэрационное и иное технологическое оборудование, обезвоживание осадка, септик, наружные сети и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "28fb95e8371561cee24427cc6ab9fee537a270aaaed942de1ef1a21256d88aea",
});

const KNOWN_SCOPE = [
  "stt_tank_count", "stt_tank_designation", "stt_tank_type", "stt_process_duty",
  "stt_tank_length_m", "stt_tank_width_m", "stt_operating_liquid_depth_m",
  "stt_waterstop_installed_m", "stt_waterstop_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "stt_waterstop_retained_spare_m", "stt_waterstop_supplier_coil_length_m",
]);
const CONDITIONAL_DETAILS = new Set([
  "stt_excavation_shoring_designation", "stt_excavation_shoring_area_m2",
  "stt_groundwater_dewatering_designation", "stt_groundwater_dewatering_machine_h",
  "stt_odor_cover_designation", "stt_odor_cover_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["stt_tank_count", "Количество резервуаров", "integer", "piece", null],
  ["stt_tank_designation", "Марка резервуаров", "text", null, null],
  ["stt_tank_type", "Конструктивный тип резервуаров", "enum", null, ["CAST_IN_PLACE_RC_RECTANGULAR"]],
  ["stt_process_duty", "Технологическое назначение резервуаров", "enum", null, ["EQUALIZATION_AND_PRIMARY_SETTLEMENT"]],
  ["stt_tank_length_m", "Длина одного резервуара", "decimal", "m", null],
  ["stt_tank_width_m", "Ширина одного резервуара", "decimal", "m", null],
  ["stt_operating_liquid_depth_m", "Рабочая глубина жидкости", "decimal", "m", null],
  ["stt_waterstop_installed_m", "Устанавливаемая длина гидрошпонки", "decimal", "m", null],
  ["stt_waterstop_designation", "Марка гидрошпонки", "text", null, null],
  ["stt_waterstop_retained_spare_m", "Сохраняемый запас гидрошпонки", "decimal", "m", null],
  ["stt_waterstop_supplier_coil_length_m", "Длина гидрошпонки в бухте поставщика", "decimal", "m", null],
  ["stt_excavation_volume_m3", "Проектный объём разработки грунта", "decimal", "m3", null],
  ["stt_bedding_aggregate_volume_m3", "Проектный объём щебёночной подготовки", "decimal", "m3", null],
  ["stt_blinding_concrete_volume_m3", "Проектный объём бетонной подготовки", "decimal", "m3", null],
  ["stt_structural_concrete_volume_m3", "Проектный объём конструкционного бетона", "decimal", "m3", null],
  ["stt_reinforcement_mass_kg", "Проектная масса арматуры", "decimal", "kg", null],
  ["stt_formwork_contact_area_m2", "Проектная площадь контакта опалубки", "decimal", "m2", null],
  ["stt_joint_sealant_mass_kg", "Масса герметика рабочих и деформационных швов", "decimal", "kg", null],
  ["stt_external_waterproofing_designation", "Марка наружной гидроизоляции", "text", null, null],
  ["stt_external_waterproofing_area_m2", "Площадь наружной гидроизоляции", "decimal", "m2", null],
  ["stt_internal_coating_designation", "Марка внутреннего защитного покрытия", "text", null, null],
  ["stt_internal_coating_area_m2", "Площадь внутреннего защитного покрытия", "decimal", "m2", null],
  ["stt_embedded_parts_designation", "Марка закладных деталей", "text", null, null],
  ["stt_embedded_parts_mass_kg", "Масса закладных деталей", "decimal", "kg", null],
  ["stt_penetration_sleeve_designation", "Марка герметичных проходок", "text", null, null],
  ["stt_penetration_sleeve_quantity_piece", "Количество герметичных проходок", "integer", "piece", null],
  ["stt_access_safety_designation", "Марка площадок, лестниц и ограждений", "text", null, null],
  ["stt_access_safety_quantity_set", "Количество комплектов доступа и безопасности", "integer", "set", null],
  ["stt_internal_drainage_designation", "Марка внутреннего дренажа", "text", null, null],
  ["stt_internal_drainage_length_m", "Длина внутреннего дренажа", "decimal", "m", null],
  ["stt_installation_consumable_designation", "Марка монтажных расходников", "text", null, null],
  ["stt_installation_consumable_quantity_set", "Количество комплектов монтажных расходников", "integer", "set", null],
  ["stt_concrete_test_count", "Количество испытаний бетона", "integer", "test", null],
  ["stt_watertightness_test_count", "Количество испытаний резервуаров на герметичность", "integer", "test", null],
  ["stt_coating_inspection_count", "Количество приёмок защитного покрытия", "integer", "test", null],
  ["stt_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["stt_earthworks_labor_h", "Труд на земляные работы и подготовку основания", "decimal", "man_hour", null],
  ["stt_reinforcement_formwork_labor_h", "Труд на арматурные и опалубочные работы", "decimal", "man_hour", null],
  ["stt_concrete_labor_h", "Труд на бетонирование и уход", "decimal", "man_hour", null],
  ["stt_waterproofing_joint_labor_h", "Труд на гидроизоляцию, швы и покрытия", "decimal", "man_hour", null],
  ["stt_qa_documentation_labor_h", "Труд на контроль, испытания и документацию", "decimal", "man_hour", null],
  ["stt_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["stt_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["stt_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["stt_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["stt_test_equipment_machine_h", "Работа испытательного оборудования", "decimal", "machine_hour", null],
  ["stt_material_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["stt_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["stt_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["stt_excavation_shoring_designation", "Марка крепления котлована", "text", null, null],
  ["stt_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["stt_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["stt_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["stt_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["stt_odor_cover_mode", "Покрытие резервуаров от запахов входит в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["stt_odor_cover_designation", "Марка покрытия от запахов", "text", null, null],
  ["stt_odor_cover_area_m2", "Площадь покрытия от запахов", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("stt_excavation_shoring_")
    && parameterId !== "stt_excavation_shoring_mode") return {
    requiredWhen: { kind: "equals", parameterId: "stt_excavation_shoring_mode", value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: "stt_excavation_shoring_mode", value: "NOT_REQUIRED" },
  };
  if (parameterId.startsWith("stt_groundwater_dewatering_")
    && parameterId !== "stt_groundwater_dewatering_mode") return {
    requiredWhen: { kind: "equals", parameterId: "stt_groundwater_dewatering_mode", value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: "stt_groundwater_dewatering_mode", value: "NOT_REQUIRED" },
  };
  if (parameterId.startsWith("stt_odor_cover_") && parameterId !== "stt_odor_cover_mode") return {
    requiredWhen: { kind: "equals", parameterId: "stt_odor_cover_mode", value: "INCLUDED" },
    forbiddenWhen: { kind: "equals", parameterId: "stt_odor_cover_mode", value: "NOT_INCLUDED" },
  };
  return {};
}

export type SewageTreatmentTanksParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const SEWAGE_TREATMENT_TANKS_PARAMETERS: readonly SewageTreatmentTanksParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "stt_waterstop_retained_spare_m" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.sewage-treatment-tanks-r1",
        semantic_parameter_key: `sewage-treatment-tanks:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_SEWAGE_TREATMENT_TANK_PROJECT_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу, проекту и спецификации резервуаров.`
            : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_TANK_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_TANK_PROJECT_DOCUMENTATION",
          source_document: SEWAGE_TREATMENT_TANKS_SOURCE_ID,
          source_locator: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.exact_locator,
          guide_version: "sewage-treatment-tanks-r1",
          source_snapshot_hash: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранные железобетонные резервуары и прямо заданные строительные ресурсы; полные КОС, технологическое оборудование, септик и наружные сети исключены.",
          verified_at: "2026-10-01T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    }),
  ));

export const SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT = Object.freeze({
  stt_waterstop_retained_spare_m: 0,
  stt_waterstop_supplier_coil_length_m: 1,
});
export const SEWAGE_TREATMENT_TANKS_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const SEWAGE_TREATMENT_TANKS_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT)
    .map((id) => [id, [SEWAGE_TREATMENT_TANKS_SOURCE_ID]]),
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
  { rowId: "rc09:stt_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка резервуаров очистных сооружений", unitId: "piece", formulaId: "stt_acceptance_count_v1", expression: "stt_tank_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt_waterstop", section: "Комплектующие", category: "material", titleRu: "Гидрошпонка рабочих и деформационных швов", unitId: "m", formulaId: "stt_waterstop_order_quantity_v1", expression: "ceil((stt_waterstop_installed_m+stt_waterstop_retained_spare_m)/stt_waterstop_supplier_coil_length_m)*stt_waterstop_supplier_coil_length_m", procurementEligible: true, titleParameterIds: ["stt_waterstop_designation"] },
  { rowId: "rc09:stt_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлована резервуаров", unitId: "m3", formulaId: "stt_excavation_volume_v1", expression: "stt_excavation_volume_m3" },
  { rowId: "rc09:stt_bedding", section: "Материалы", category: "material", titleRu: "Щебёночная подготовка основания", unitId: "m3", formulaId: "stt_bedding_aggregate_volume_v1", expression: "stt_bedding_aggregate_volume_m3", procurementEligible: true },
  { rowId: "rc09:stt_blinding_concrete", section: "Материалы", category: "material", titleRu: "Бетонная подготовка основания", unitId: "m3", formulaId: "stt_blinding_concrete_volume_v1", expression: "stt_blinding_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:stt_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон резервуаров", unitId: "m3", formulaId: "stt_structural_concrete_volume_v1", expression: "stt_structural_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:stt_reinforcement", section: "Материалы", category: "material", titleRu: "Арматура резервуаров", unitId: "kg", formulaId: "stt_reinforcement_mass_v1", expression: "stt_reinforcement_mass_kg", procurementEligible: true },
  { rowId: "rc09:stt_formwork", section: "Материалы", category: "material", titleRu: "Опалубка резервуаров", unitId: "m2", formulaId: "stt_formwork_contact_area_v1", expression: "stt_formwork_contact_area_m2", procurementEligible: true },
  { rowId: "rc09:stt_joint_sealant", section: "Расходники", category: "material", titleRu: "Герметик рабочих и деформационных швов", unitId: "kg", formulaId: "stt_joint_sealant_mass_v1", expression: "stt_joint_sealant_mass_kg", procurementEligible: true },
  { rowId: "rc09:stt_external_waterproofing", section: "Материалы", category: "material", titleRu: "Наружная гидроизоляция резервуаров", unitId: "m2", formulaId: "stt_external_waterproofing_area_v1", expression: "stt_external_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["stt_external_waterproofing_designation"] },
  { rowId: "rc09:stt_internal_coating", section: "Материалы", category: "material", titleRu: "Внутреннее защитное покрытие резервуаров", unitId: "m2", formulaId: "stt_internal_coating_area_v1", expression: "stt_internal_coating_area_m2", procurementEligible: true, titleParameterIds: ["stt_internal_coating_designation"] },
  { rowId: "rc09:stt_embedded_parts", section: "Комплектующие", category: "material", titleRu: "Закладные детали", unitId: "kg", formulaId: "stt_embedded_parts_mass_v1", expression: "stt_embedded_parts_mass_kg", procurementEligible: true, titleParameterIds: ["stt_embedded_parts_designation"] },
  { rowId: "rc09:stt_penetration_sleeves", section: "Комплектующие", category: "material", titleRu: "Герметичные проходки трубопроводов", unitId: "piece", formulaId: "stt_penetration_sleeve_quantity_v1", expression: "stt_penetration_sleeve_quantity_piece", procurementEligible: true, titleParameterIds: ["stt_penetration_sleeve_designation"] },
  { rowId: "rc09:stt_access_safety", section: "Комплектующие", category: "material", titleRu: "Площадки, лестницы и ограждения", unitId: "set", formulaId: "stt_access_safety_quantity_v1", expression: "stt_access_safety_quantity_set", procurementEligible: true, titleParameterIds: ["stt_access_safety_designation"] },
  { rowId: "rc09:stt_internal_drainage", section: "Комплектующие", category: "material", titleRu: "Внутренний дренаж резервуаров", unitId: "m", formulaId: "stt_internal_drainage_length_v1", expression: "stt_internal_drainage_length_m", procurementEligible: true, titleParameterIds: ["stt_internal_drainage_designation"] },
  { rowId: "rc09:stt_installation_consumables", section: "Расходники", category: "material", titleRu: "Монтажные расходники резервуаров", unitId: "set", formulaId: "stt_installation_consumable_quantity_v1", expression: "stt_installation_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["stt_installation_consumable_designation"] },
  { rowId: "rc09:stt_concrete_tests", section: "Контроль", category: "service", titleRu: "Испытания бетона", unitId: "test", formulaId: "stt_concrete_test_count_v1", expression: "stt_concrete_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt_watertightness_tests", section: "Контроль", category: "service", titleRu: "Испытания резервуаров на герметичность", unitId: "test", formulaId: "stt_watertightness_test_count_v1", expression: "stt_watertightness_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt_coating_inspections", section: "Контроль", category: "service", titleRu: "Приёмка защитного покрытия", unitId: "test", formulaId: "stt_coating_inspection_count_v1", expression: "stt_coating_inspection_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация резервуаров", unitId: "document", formulaId: "stt_asbuilt_document_count_v1", expression: "stt_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt_excavation_shoring", section: "Условные материалы", category: "material", titleRu: "Крепление котлована", unitId: "m2", formulaId: "stt_excavation_shoring_area_v1", expression: "stt_excavation_shoring_area_m2", procurementEligible: true, inclusionAst: equals("stt_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["stt_excavation_shoring_designation"] },
  { rowId: "rc09:stt_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлована", unitId: "machine_hour", formulaId: "stt_groundwater_dewatering_machine_v1", expression: "stt_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("stt_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["stt_groundwater_dewatering_designation"] },
  { rowId: "rc09:stt_odor_cover", section: "Условные комплектующие", category: "material", titleRu: "Покрытие резервуаров от запахов", unitId: "m2", formulaId: "stt_odor_cover_area_v1", expression: "stt_odor_cover_area_m2", procurementEligible: true, inclusionAst: equals("stt_odor_cover_mode", "INCLUDED"), titleParameterIds: ["stt_odor_cover_designation"] },
  { rowId: "rc09:stt-waterstop-balance:installed-net", section: "Баланс гидрошпонки", category: "material", titleRu: "Устанавливаемая гидрошпонка", unitId: "m", formulaId: "stt_waterstop_installed_net_v1", expression: "stt_waterstop_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt-waterstop-balance:retained-spare", section: "Баланс гидрошпонки", category: "material", titleRu: "Сохраняемый запас гидрошпонки", unitId: "m", formulaId: "stt_waterstop_retained_spare_v1", expression: "stt_waterstop_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt-waterstop-balance:total-need", section: "Баланс гидрошпонки", category: "material", titleRu: "Общая потребность в гидрошпонке", unitId: "m", formulaId: "stt_waterstop_total_need_v1", expression: "stt_waterstop_installed_m+stt_waterstop_retained_spare_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt-waterstop-balance:package-count", section: "Баланс гидрошпонки", category: "material", titleRu: "Количество бухт гидрошпонки", unitId: "package", formulaId: "stt_waterstop_coil_count_v1", expression: "ceil((stt_waterstop_installed_m+stt_waterstop_retained_spare_m)/stt_waterstop_supplier_coil_length_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt-waterstop-balance:remainder", section: "Баланс гидрошпонки", category: "material", titleRu: "Остаток гидрошпонки после установки", unitId: "m", formulaId: "stt_waterstop_remainder_v1", expression: "ceil((stt_waterstop_installed_m+stt_waterstop_retained_spare_m)/stt_waterstop_supplier_coil_length_m)*stt_waterstop_supplier_coil_length_m-stt_waterstop_installed_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stt-waterstop-balance:surplus-beyond-spare", section: "Баланс гидрошпонки", category: "material", titleRu: "Свободный остаток гидрошпонки сверх запаса", unitId: "m", formulaId: "stt_waterstop_surplus_v1", expression: "max(0,ceil((stt_waterstop_installed_m+stt_waterstop_retained_spare_m)/stt_waterstop_supplier_coil_length_m)*stt_waterstop_supplier_coil_length_m-stt_waterstop_installed_m-stt_waterstop_retained_spare_m)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:stt-earthworks", section: "Труд", category: "construction_work", titleRu: "Земляные работы и подготовка основания", unitId: "man_hour", formulaId: "stt_earthworks_labor_v1", expression: "stt_earthworks_labor_h" },
  { rowId: "rc09:labor:stt-reinforcement-formwork", section: "Труд", category: "construction_work", titleRu: "Арматурные и опалубочные работы", unitId: "man_hour", formulaId: "stt_reinforcement_formwork_labor_v1", expression: "stt_reinforcement_formwork_labor_h" },
  { rowId: "rc09:labor:stt-concrete", section: "Труд", category: "construction_work", titleRu: "Бетонирование и уход за бетоном", unitId: "man_hour", formulaId: "stt_concrete_labor_v1", expression: "stt_concrete_labor_h" },
  { rowId: "rc09:labor:stt-waterproofing-joints", section: "Труд", category: "construction_work", titleRu: "Гидроизоляция, швы и защитные покрытия", unitId: "man_hour", formulaId: "stt_waterproofing_joint_labor_v1", expression: "stt_waterproofing_joint_labor_h" },
  { rowId: "rc09:labor:stt-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль, испытания и документация", unitId: "man_hour", formulaId: "stt_qa_documentation_labor_v1", expression: "stt_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:stt-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "stt_excavator_machine_v1", expression: "stt_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stt-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "stt_crane_machine_v1", expression: "stt_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stt-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "stt_concrete_pump_machine_v1", expression: "stt_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stt-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "stt_compactor_machine_v1", expression: "stt_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stt-test", section: "Механизмы", category: "equipment", titleRu: "Испытательное оборудование", unitId: "machine_hour", formulaId: "stt_test_equipment_machine_v1", expression: "stt_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:stt-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов", unitId: "trip", formulaId: "stt_material_delivery_trip_v1", expression: "stt_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:stt-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "stt_waste_removal_trip_v1", expression: "stt_waste_removal_trip_count", procurementEligible: true },
]);

export const SEWAGE_TREATMENT_TANKS_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const SEWAGE_TREATMENT_TANKS_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `sewage-treatment-tanks:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_SEWAGE_TREATMENT_TANK_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: SEWAGE_TREATMENT_TANKS_SOURCE_ID,
        source_id: SEWAGE_TREATMENT_TANKS_SOURCE_ID,
        normId: SEWAGE_TREATMENT_TANKS_NORM_ID, norm_id: SEWAGE_TREATMENT_TANKS_NORM_ID,
        normVersion: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.source_document_version,
        source_title: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.source_title,
        exact_locator: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.exact_locator,
        source_definition_hash: SEWAGE_TREATMENT_TANKS_SOURCE_METADATA.definition_hash,
        sourceRole }],
      excludedUnownedAssumptions: [
        "complete treatment plant, aeration equipment, sludge dewatering, septic facility or external network",
        "tank-count-or-dimension-derived material, labor, mechanism or logistics quantity",
        "automatic excavation shoring, groundwater dewatering or odor cover",
        "automatic retained spare or supplier coil length", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const SEWAGE_TREATMENT_TANKS_SHORT_INPUT = Object.freeze({
  stt_tank_count: 2, stt_tank_designation: "STT-RC-2X18X8X5-WT",
  stt_tank_type: "CAST_IN_PLACE_RC_RECTANGULAR",
  stt_process_duty: "EQUALIZATION_AND_PRIMARY_SETTLEMENT",
  stt_tank_length_m: 18, stt_tank_width_m: 8, stt_operating_liquid_depth_m: 5,
  stt_waterstop_installed_m: 260, stt_waterstop_designation: "PVC-P-320",
  ...SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT,
});
export const SEWAGE_TREATMENT_TANKS_ACCEPTANCE_INPUT = Object.freeze({
  ...SEWAGE_TREATMENT_TANKS_SHORT_INPUT,
  stt_excavation_volume_m3: 2200, stt_bedding_aggregate_volume_m3: 180,
  stt_blinding_concrete_volume_m3: 72, stt_structural_concrete_volume_m3: 760,
  stt_reinforcement_mass_kg: 112000, stt_formwork_contact_area_m2: 3200,
  stt_joint_sealant_mass_kg: 950,
  stt_external_waterproofing_designation: "HDPE-MEMBRANE-2MM",
  stt_external_waterproofing_area_m2: 1600,
  stt_internal_coating_designation: "EPOXY-WWTP-CHEM",
  stt_internal_coating_area_m2: 1900,
  stt_embedded_parts_designation: "SS316-HD-GALV-EMBED",
  stt_embedded_parts_mass_kg: 4200,
  stt_penetration_sleeve_designation: "PUDDLE-FLANGE-DN50-DN600",
  stt_penetration_sleeve_quantity_piece: 36,
  stt_access_safety_designation: "HDG-GRATING-LADDER-RAIL",
  stt_access_safety_quantity_set: 2,
  stt_internal_drainage_designation: "HDPE-DRAIN-DN110",
  stt_internal_drainage_length_m: 180,
  stt_installation_consumable_designation: "ANCHOR-SEAL-GROUT-KIT",
  stt_installation_consumable_quantity_set: 18,
  stt_concrete_test_count: 24, stt_watertightness_test_count: 2,
  stt_coating_inspection_count: 2, stt_asbuilt_document_count: 1,
  stt_earthworks_labor_h: 880, stt_reinforcement_formwork_labor_h: 4600,
  stt_concrete_labor_h: 1600, stt_waterproofing_joint_labor_h: 1100,
  stt_qa_documentation_labor_h: 420,
  stt_excavator_machine_h: 180, stt_crane_machine_h: 140,
  stt_concrete_pump_machine_h: 150, stt_compactor_machine_h: 90,
  stt_test_equipment_machine_h: 80,
  stt_material_delivery_trip_count: 64, stt_waste_removal_trip_count: 28,
  stt_excavation_shoring_mode: "NOT_REQUIRED",
  stt_groundwater_dewatering_mode: "NOT_REQUIRED", stt_odor_cover_mode: "NOT_INCLUDED",
});

export async function compileSewageTreatmentTanksR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SEWAGE_TREATMENT_TANKS_CATALOG_ID;
  if (catalogId !== SEWAGE_TREATMENT_TANKS_CATALOG_ID) {
    throw new Error(`SEWAGE_TREATMENT_TANKS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.sewage-treatment-tanks-r1", catalogId,
    primaryMeasureParameterId: "stt_tank_count",
    parameterDefinitions: [...SEWAGE_TREATMENT_TANKS_PARAMETERS],
    formulaDefinitions: [...SEWAGE_TREATMENT_TANKS_FORMULAS],
    resourceDefinitions: [...SEWAGE_TREATMENT_TANKS_RESOURCES], submittedParameters,
    confirmedParameters: { ...SEWAGE_TREATMENT_TANKS_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
