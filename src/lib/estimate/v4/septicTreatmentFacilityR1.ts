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
export const SEPTIC_TREATMENT_FACILITY_CATALOG_ID =
  "canonical-work:expanded:septic_treatment_facility";
export const SEPTIC_TREATMENT_FACILITY_SOURCE_ID =
  "project_three_chamber_precast_rc_septic_ring_balance_v1";
export const SEPTIC_TREATMENT_FACILITY_NORM_ID =
  "norm:project:three_chamber_precast_rc_septic_ring_balance:v1";
export const SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект трёхкамерного септического очистного сооружения, спецификация сборного железобетона и программа испытаний",
  source_authority: "Проектировщик канализации и железобетонных сооружений, поставщик сборных элементов, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_THREE_CHAMBER_PRECAST_RC_SEPTIC_MATERIAL_LABOR_EQUIPMENT_QA_LOGISTICS_RING_BALANCE_S27_24",
  definition_hash: "a55fc6fa9fcbe283c24f5e55dd865b1f6478d734614dd546473274e8a6fc34e4",
  exact_locator: "1 септическое сооружение STF-RC-3C-30M3-KS20, трёхкамерное анаэробное отстаивание, 12 м3/сут, 30 м3, 3 камеры, 18 колец KS20.9",
  use_restriction: "Расход, рабочий объём и число камер не определяют автоматически земляные, бетонные, сборные, трудовые, механизированные или логистические объёмы. Крепление котлована, водопонижение и поле рассеивания включаются только по проекту. Полные муниципальные КОС, аэротенки, обезвоживание осадка, наружная сеть и цены исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "a55fc6fa9fcbe283c24f5e55dd865b1f6478d734614dd546473274e8a6fc34e4",
});

const KNOWN_SCOPE = [
  "stf_facility_count", "stf_facility_designation", "stf_treatment_technology",
  "stf_design_flow_m3_day", "stf_working_volume_m3", "stf_chamber_count",
  "stf_ring_installed_piece", "stf_ring_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "stf_ring_retained_spare_piece", "stf_ring_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "stf_excavation_shoring_designation", "stf_excavation_shoring_area_m2",
  "stf_groundwater_dewatering_designation", "stf_groundwater_dewatering_machine_h",
  "stf_effluent_dispersal_designation", "stf_effluent_dispersal_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["stf_facility_count", "Количество септических сооружений", "integer", "piece", null],
  ["stf_facility_designation", "Марка септического сооружения", "text", null, null],
  ["stf_treatment_technology", "Технология очистки", "enum", null, ["THREE_CHAMBER_ANAEROBIC_SETTLING"]],
  ["stf_design_flow_m3_day", "Расчётный расход", "decimal", "m3_per_day", null],
  ["stf_working_volume_m3", "Рабочий объём", "decimal", "m3", null],
  ["stf_chamber_count", "Количество камер", "integer", "piece", null],
  ["stf_ring_installed_piece", "Устанавливаемые стеновые кольца", "integer", "piece", null],
  ["stf_ring_designation", "Марка стеновых колец", "text", null, null],
  ["stf_ring_retained_spare_piece", "Сохраняемый запас стеновых колец", "integer", "piece", null],
  ["stf_ring_supplier_package_quantity_piece", "Колец в транспортном пакете поставщика", "integer", "piece", null],
  ["stf_excavation_volume_m3", "Проектный объём разработки грунта", "decimal", "m3", null],
  ["stf_bedding_aggregate_volume_m3", "Проектный объём щебёночной подготовки", "decimal", "m3", null],
  ["stf_blinding_concrete_volume_m3", "Проектный объём бетонной подготовки", "decimal", "m3", null],
  ["stf_base_slab_concrete_volume_m3", "Проектный объём бетона плит оснований", "decimal", "m3", null],
  ["stf_cover_slab_designation", "Марка плит перекрытия", "text", null, null],
  ["stf_cover_slab_quantity_piece", "Количество плит перекрытия", "integer", "piece", null],
  ["stf_hatch_designation", "Марка люков", "text", null, null],
  ["stf_hatch_quantity_piece", "Количество люков", "integer", "piece", null],
  ["stf_joint_mortar_mass_kg", "Масса раствора для монтажных швов", "decimal", "kg", null],
  ["stf_joint_sealant_mass_kg", "Масса герметика стыков", "decimal", "kg", null],
  ["stf_external_waterproofing_designation", "Марка наружной гидроизоляции", "text", null, null],
  ["stf_external_waterproofing_area_m2", "Площадь наружной гидроизоляции", "decimal", "m2", null],
  ["stf_internal_coating_designation", "Марка внутреннего защитного покрытия", "text", null, null],
  ["stf_internal_coating_area_m2", "Площадь внутреннего защитного покрытия", "decimal", "m2", null],
  ["stf_internal_piping_designation", "Марка внутренних трубопроводов", "text", null, null],
  ["stf_internal_piping_length_m", "Длина внутренних трубопроводов", "decimal", "m", null],
  ["stf_baffle_tee_designation", "Марка перегородок и тройников", "text", null, null],
  ["stf_baffle_tee_quantity_set", "Количество комплектов перегородок и тройников", "integer", "set", null],
  ["stf_ventilation_riser_designation", "Марка вентиляционных стояков", "text", null, null],
  ["stf_ventilation_riser_quantity_set", "Количество комплектов вентиляционных стояков", "integer", "set", null],
  ["stf_selected_backfill_volume_m3", "Проектный объём отобранной обратной засыпки", "decimal", "m3", null],
  ["stf_commissioning_consumable_designation", "Марка пусковых и дезинфекционных расходников", "text", null, null],
  ["stf_commissioning_consumable_quantity_set", "Количество комплектов пусковых и дезинфекционных расходников", "integer", "set", null],
  ["stf_concrete_test_count", "Количество испытаний бетона", "integer", "test", null],
  ["stf_watertightness_test_count", "Количество испытаний камер на герметичность", "integer", "test", null],
  ["stf_internal_piping_test_count", "Количество испытаний внутренних трубопроводов", "integer", "test", null],
  ["stf_asbuilt_document_count", "Комплекты исполнительной документации", "integer", "document", null],
  ["stf_earthworks_labor_h", "Труд на земляные работы и основание", "decimal", "man_hour", null],
  ["stf_precast_installation_labor_h", "Труд на монтаж сборного железобетона", "decimal", "man_hour", null],
  ["stf_piping_component_labor_h", "Труд на трубопроводы и внутренние компоненты", "decimal", "man_hour", null],
  ["stf_waterproofing_joint_labor_h", "Труд на гидроизоляцию, стыки и покрытия", "decimal", "man_hour", null],
  ["stf_qa_commissioning_labor_h", "Труд на контроль, пуск и документацию", "decimal", "man_hour", null],
  ["stf_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["stf_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["stf_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["stf_compactor_machine_h", "Работа грунтового уплотнителя", "decimal", "machine_hour", null],
  ["stf_test_equipment_machine_h", "Работа испытательного оборудования", "decimal", "machine_hour", null],
  ["stf_material_delivery_trip_count", "Рейсы доставки материалов и сборных элементов", "integer", "trip", null],
  ["stf_waste_removal_trip_count", "Рейсы вывоза грунта, тары и отходов", "integer", "trip", null],
  ["stf_excavation_shoring_mode", "Крепление котлована требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["stf_excavation_shoring_designation", "Марка крепления котлована", "text", null, null],
  ["stf_excavation_shoring_area_m2", "Площадь крепления котлована", "decimal", "m2", null],
  ["stf_groundwater_dewatering_mode", "Водопонижение требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["stf_groundwater_dewatering_designation", "Оборудование водопонижения", "text", null, null],
  ["stf_groundwater_dewatering_machine_h", "Работа оборудования водопонижения", "decimal", "machine_hour", null],
  ["stf_effluent_dispersal_mode", "Поле рассеивания входит в границу", "enum", null, ["NOT_INCLUDED", "INCLUDED"]],
  ["stf_effluent_dispersal_designation", "Марка системы рассеивания стока", "text", null, null],
  ["stf_effluent_dispersal_area_m2", "Площадь поля рассеивания", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  for (const branch of ["excavation_shoring", "groundwater_dewatering"] as const) {
    if (parameterId.startsWith(`stf_${branch}_`) && parameterId !== `stf_${branch}_mode`) return {
      requiredWhen: { kind: "equals", parameterId: `stf_${branch}_mode`, value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: `stf_${branch}_mode`, value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("stf_effluent_dispersal_")
    && parameterId !== "stf_effluent_dispersal_mode") return {
    requiredWhen: { kind: "equals", parameterId: "stf_effluent_dispersal_mode", value: "INCLUDED" },
    forbiddenWhen: { kind: "equals", parameterId: "stf_effluent_dispersal_mode", value: "NOT_INCLUDED" },
  };
  return {};
}

export type SepticTreatmentFacilityParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const SEPTIC_TREATMENT_FACILITY_PARAMETERS: readonly SepticTreatmentFacilityParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
      title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "stf_ring_retained_spare_piece" ? 0
              : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.septic-treatment-facility-r1",
        semantic_parameter_key: `septic-treatment-facility:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_SEPTIC_PROJECT_BOQ_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу, проекту и спецификации септика.`
            : `${titleRu}: укажите по проекту, спецификации, ведомости объёмов, ППР или программе испытаний.`,
          source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_SEPTIC_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "APPROVED_SEPTIC_PROJECT_DOCUMENTATION",
          source_document: SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
          source_locator: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.exact_locator,
          guide_version: "septic-treatment-facility-r1",
          source_snapshot_hash: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.artifact_sha256,
          applicability: "Только выбранное трёхкамерное септическое сооружение и прямые проектные ресурсы; полные КОС, аэротенки, обезвоживание осадка и наружная сеть исключены.",
          verified_at: "2026-10-01T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false,
      },
    }),
  ));

export const SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT = Object.freeze({
  stf_ring_retained_spare_piece: 0,
  stf_ring_supplier_package_quantity_piece: 1,
});
export const SEPTIC_TREATMENT_FACILITY_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const SEPTIC_TREATMENT_FACILITY_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT)
    .map((id) => [id, [SEPTIC_TREATMENT_FACILITY_SOURCE_ID]]),
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
  { rowId: "rc09:stf_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство, пуск и приёмка септического сооружения", unitId: "piece", formulaId: "stf_acceptance_count_v1", expression: "stf_facility_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf_rings", section: "Комплектующие", category: "material", titleRu: "Сборные железобетонные стеновые кольца", unitId: "piece", formulaId: "stf_ring_order_quantity_v1", expression: "ceil((stf_ring_installed_piece+stf_ring_retained_spare_piece)/stf_ring_supplier_package_quantity_piece)*stf_ring_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["stf_ring_designation"] },
  { rowId: "rc09:stf_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлована септического сооружения", unitId: "m3", formulaId: "stf_excavation_volume_v1", expression: "stf_excavation_volume_m3" },
  { rowId: "rc09:stf_bedding", section: "Материалы", category: "material", titleRu: "Щебёночная подготовка основания", unitId: "m3", formulaId: "stf_bedding_aggregate_volume_v1", expression: "stf_bedding_aggregate_volume_m3", procurementEligible: true },
  { rowId: "rc09:stf_blinding_concrete", section: "Материалы", category: "material", titleRu: "Бетонная подготовка основания", unitId: "m3", formulaId: "stf_blinding_concrete_volume_v1", expression: "stf_blinding_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:stf_base_slab_concrete", section: "Материалы", category: "material", titleRu: "Бетон плит оснований камер", unitId: "m3", formulaId: "stf_base_slab_concrete_volume_v1", expression: "stf_base_slab_concrete_volume_m3", procurementEligible: true },
  { rowId: "rc09:stf_cover_slabs", section: "Комплектующие", category: "material", titleRu: "Сборные плиты перекрытия камер", unitId: "piece", formulaId: "stf_cover_slab_quantity_v1", expression: "stf_cover_slab_quantity_piece", procurementEligible: true, titleParameterIds: ["stf_cover_slab_designation"] },
  { rowId: "rc09:stf_hatches", section: "Комплектующие", category: "material", titleRu: "Смотровые люки", unitId: "piece", formulaId: "stf_hatch_quantity_v1", expression: "stf_hatch_quantity_piece", procurementEligible: true, titleParameterIds: ["stf_hatch_designation"] },
  { rowId: "rc09:stf_joint_mortar", section: "Материалы", category: "material", titleRu: "Раствор для монтажных швов", unitId: "kg", formulaId: "stf_joint_mortar_mass_v1", expression: "stf_joint_mortar_mass_kg", procurementEligible: true },
  { rowId: "rc09:stf_joint_sealant", section: "Расходники", category: "material", titleRu: "Герметик стыков сборных элементов", unitId: "kg", formulaId: "stf_joint_sealant_mass_v1", expression: "stf_joint_sealant_mass_kg", procurementEligible: true },
  { rowId: "rc09:stf_external_waterproofing", section: "Материалы", category: "material", titleRu: "Наружная гидроизоляция камер", unitId: "m2", formulaId: "stf_external_waterproofing_area_v1", expression: "stf_external_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["stf_external_waterproofing_designation"] },
  { rowId: "rc09:stf_internal_coating", section: "Материалы", category: "material", titleRu: "Внутреннее защитное покрытие камер", unitId: "m2", formulaId: "stf_internal_coating_area_v1", expression: "stf_internal_coating_area_m2", procurementEligible: true, titleParameterIds: ["stf_internal_coating_designation"] },
  { rowId: "rc09:stf_internal_piping", section: "Комплектующие", category: "material", titleRu: "Внутренние переливные и выпускные трубопроводы", unitId: "m", formulaId: "stf_internal_piping_length_v1", expression: "stf_internal_piping_length_m", procurementEligible: true, titleParameterIds: ["stf_internal_piping_designation"] },
  { rowId: "rc09:stf_baffle_tees", section: "Комплектующие", category: "material", titleRu: "Перегородки и тройники камер", unitId: "set", formulaId: "stf_baffle_tee_quantity_v1", expression: "stf_baffle_tee_quantity_set", procurementEligible: true, titleParameterIds: ["stf_baffle_tee_designation"] },
  { rowId: "rc09:stf_ventilation_risers", section: "Комплектующие", category: "material", titleRu: "Вентиляционные стояки", unitId: "set", formulaId: "stf_ventilation_riser_quantity_v1", expression: "stf_ventilation_riser_quantity_set", procurementEligible: true, titleParameterIds: ["stf_ventilation_riser_designation"] },
  { rowId: "rc09:stf_selected_backfill", section: "Материалы", category: "material", titleRu: "Отобранный материал обратной засыпки", unitId: "m3", formulaId: "stf_selected_backfill_volume_v1", expression: "stf_selected_backfill_volume_m3", procurementEligible: true },
  { rowId: "rc09:stf_commissioning_consumables", section: "Расходники", category: "material", titleRu: "Пусковые и дезинфекционные расходники", unitId: "set", formulaId: "stf_commissioning_consumable_quantity_v1", expression: "stf_commissioning_consumable_quantity_set", procurementEligible: true, titleParameterIds: ["stf_commissioning_consumable_designation"] },
  { rowId: "rc09:stf_concrete_tests", section: "Контроль", category: "service", titleRu: "Испытания бетона", unitId: "test", formulaId: "stf_concrete_test_count_v1", expression: "stf_concrete_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf_watertightness_tests", section: "Контроль", category: "service", titleRu: "Испытания камер на герметичность", unitId: "test", formulaId: "stf_watertightness_test_count_v1", expression: "stf_watertightness_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf_internal_piping_tests", section: "Контроль", category: "service", titleRu: "Испытания внутренних трубопроводов", unitId: "test", formulaId: "stf_internal_piping_test_count_v1", expression: "stf_internal_piping_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация септического сооружения", unitId: "document", formulaId: "stf_asbuilt_document_count_v1", expression: "stf_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf_excavation_shoring", section: "Условные материалы", category: "material", titleRu: "Крепление котлована", unitId: "m2", formulaId: "stf_excavation_shoring_area_v1", expression: "stf_excavation_shoring_area_m2", procurementEligible: true, inclusionAst: equals("stf_excavation_shoring_mode", "REQUIRED"), titleParameterIds: ["stf_excavation_shoring_designation"] },
  { rowId: "rc09:stf_groundwater_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водопонижение котлована", unitId: "machine_hour", formulaId: "stf_groundwater_dewatering_machine_v1", expression: "stf_groundwater_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("stf_groundwater_dewatering_mode", "REQUIRED"), titleParameterIds: ["stf_groundwater_dewatering_designation"] },
  { rowId: "rc09:stf_effluent_dispersal", section: "Условные материалы", category: "material", titleRu: "Поле рассеивания очищенного стока", unitId: "m2", formulaId: "stf_effluent_dispersal_area_v1", expression: "stf_effluent_dispersal_area_m2", procurementEligible: true, inclusionAst: equals("stf_effluent_dispersal_mode", "INCLUDED"), titleParameterIds: ["stf_effluent_dispersal_designation"] },
  { rowId: "rc09:stf-ring-balance:installed-net", section: "Баланс стеновых колец", category: "material", titleRu: "Установленные стеновые кольца", unitId: "piece", formulaId: "stf_ring_installed_net_v1", expression: "stf_ring_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf-ring-balance:retained-spare", section: "Баланс стеновых колец", category: "material", titleRu: "Сохраняемый запас стеновых колец", unitId: "piece", formulaId: "stf_ring_retained_spare_v1", expression: "stf_ring_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf-ring-balance:total-need", section: "Баланс стеновых колец", category: "material", titleRu: "Общая потребность в стеновых кольцах", unitId: "piece", formulaId: "stf_ring_total_need_v1", expression: "stf_ring_installed_piece+stf_ring_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf-ring-balance:package-count", section: "Баланс стеновых колец", category: "material", titleRu: "Количество транспортных пакетов колец", unitId: "package", formulaId: "stf_ring_package_count_v1", expression: "ceil((stf_ring_installed_piece+stf_ring_retained_spare_piece)/stf_ring_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf-ring-balance:remainder", section: "Баланс стеновых колец", category: "material", titleRu: "Остаток колец после монтажа", unitId: "piece", formulaId: "stf_ring_remainder_v1", expression: "ceil((stf_ring_installed_piece+stf_ring_retained_spare_piece)/stf_ring_supplier_package_quantity_piece)*stf_ring_supplier_package_quantity_piece-stf_ring_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:stf-ring-balance:surplus-beyond-spare", section: "Баланс стеновых колец", category: "material", titleRu: "Свободный остаток колец сверх запаса", unitId: "piece", formulaId: "stf_ring_surplus_v1", expression: "max(0,ceil((stf_ring_installed_piece+stf_ring_retained_spare_piece)/stf_ring_supplier_package_quantity_piece)*stf_ring_supplier_package_quantity_piece-stf_ring_installed_piece-stf_ring_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:stf-earthworks", section: "Труд", category: "construction_work", titleRu: "Земляные работы и подготовка основания", unitId: "man_hour", formulaId: "stf_earthworks_labor_v1", expression: "stf_earthworks_labor_h" },
  { rowId: "rc09:labor:stf-precast-installation", section: "Труд", category: "construction_work", titleRu: "Монтаж сборного железобетона", unitId: "man_hour", formulaId: "stf_precast_installation_labor_v1", expression: "stf_precast_installation_labor_h" },
  { rowId: "rc09:labor:stf-piping-components", section: "Труд", category: "construction_work", titleRu: "Монтаж трубопроводов и внутренних компонентов", unitId: "man_hour", formulaId: "stf_piping_component_labor_v1", expression: "stf_piping_component_labor_h" },
  { rowId: "rc09:labor:stf-waterproofing-joints", section: "Труд", category: "construction_work", titleRu: "Гидроизоляция, стыки и покрытия", unitId: "man_hour", formulaId: "stf_waterproofing_joint_labor_v1", expression: "stf_waterproofing_joint_labor_h" },
  { rowId: "rc09:labor:stf-qa-commissioning", section: "Труд", category: "construction_work", titleRu: "Контроль, пуск и документация", unitId: "man_hour", formulaId: "stf_qa_commissioning_labor_v1", expression: "stf_qa_commissioning_labor_h" },
  { rowId: "rc09:equipment:stf-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "stf_excavator_machine_v1", expression: "stf_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stf-crane", section: "Механизмы", category: "equipment", titleRu: "Кран", unitId: "machine_hour", formulaId: "stf_crane_machine_v1", expression: "stf_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stf-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "stf_concrete_pump_machine_v1", expression: "stf_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stf-compactor", section: "Механизмы", category: "equipment", titleRu: "Грунтовый уплотнитель", unitId: "machine_hour", formulaId: "stf_compactor_machine_v1", expression: "stf_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:stf-test", section: "Механизмы", category: "equipment", titleRu: "Испытательное оборудование", unitId: "machine_hour", formulaId: "stf_test_equipment_machine_v1", expression: "stf_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:stf-material-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов и сборных элементов", unitId: "trip", formulaId: "stf_material_delivery_trip_v1", expression: "stf_material_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:stf-waste-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, тары и отходов", unitId: "trip", formulaId: "stf_waste_removal_trip_v1", expression: "stf_waste_removal_trip_count", procurementEligible: true },
]);

export const SEPTIC_TREATMENT_FACILITY_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
  }));
export const SEPTIC_TREATMENT_FACILITY_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `septic-treatment-facility:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_SEPTIC_TREATMENT_FACILITY_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
        source_id: SEPTIC_TREATMENT_FACILITY_SOURCE_ID,
        normId: SEPTIC_TREATMENT_FACILITY_NORM_ID, norm_id: SEPTIC_TREATMENT_FACILITY_NORM_ID,
        normVersion: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.source_document_version,
        source_title: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.source_title,
        exact_locator: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.exact_locator,
        source_definition_hash: SEPTIC_TREATMENT_FACILITY_SOURCE_METADATA.definition_hash,
        sourceRole }],
      excludedUnownedAssumptions: [
        "complete municipal treatment plant, aeration tanks, sludge dewatering or external network",
        "flow-volume-or-chamber-derived material, labor, mechanism or logistics quantity",
        "automatic excavation shoring, groundwater dewatering or effluent dispersal field",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }));

export const SEPTIC_TREATMENT_FACILITY_SHORT_INPUT = Object.freeze({
  stf_facility_count: 1, stf_facility_designation: "STF-RC-3C-30M3-KS20",
  stf_treatment_technology: "THREE_CHAMBER_ANAEROBIC_SETTLING",
  stf_design_flow_m3_day: 12, stf_working_volume_m3: 30, stf_chamber_count: 3,
  stf_ring_installed_piece: 18, stf_ring_designation: "KS20.9",
  ...SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT,
});
export const SEPTIC_TREATMENT_FACILITY_ACCEPTANCE_INPUT = Object.freeze({
  ...SEPTIC_TREATMENT_FACILITY_SHORT_INPUT,
  stf_excavation_volume_m3: 850, stf_bedding_aggregate_volume_m3: 55,
  stf_blinding_concrete_volume_m3: 18, stf_base_slab_concrete_volume_m3: 45,
  stf_cover_slab_designation: "PP20-2", stf_cover_slab_quantity_piece: 3,
  stf_hatch_designation: "D400-DN600", stf_hatch_quantity_piece: 3,
  stf_joint_mortar_mass_kg: 1800, stf_joint_sealant_mass_kg: 240,
  stf_external_waterproofing_designation: "BITUMEN-POLYMER-2L",
  stf_external_waterproofing_area_m2: 180,
  stf_internal_coating_designation: "EPOXY-SEPTIC-CHEM",
  stf_internal_coating_area_m2: 210,
  stf_internal_piping_designation: "HDPE-DN160-DN200",
  stf_internal_piping_length_m: 85,
  stf_baffle_tee_designation: "HDPE-INLET-OUTLET-BAFFLE", stf_baffle_tee_quantity_set: 3,
  stf_ventilation_riser_designation: "HDPE-VENT-DN110",
  stf_ventilation_riser_quantity_set: 3, stf_selected_backfill_volume_m3: 620,
  stf_commissioning_consumable_designation: "DISINFECTION-STARTUP-KIT",
  stf_commissioning_consumable_quantity_set: 6,
  stf_concrete_test_count: 6, stf_watertightness_test_count: 3,
  stf_internal_piping_test_count: 1, stf_asbuilt_document_count: 1,
  stf_earthworks_labor_h: 420, stf_precast_installation_labor_h: 680,
  stf_piping_component_labor_h: 240, stf_waterproofing_joint_labor_h: 310,
  stf_qa_commissioning_labor_h: 160,
  stf_excavator_machine_h: 96, stf_crane_machine_h: 72,
  stf_concrete_pump_machine_h: 18, stf_compactor_machine_h: 48,
  stf_test_equipment_machine_h: 40,
  stf_material_delivery_trip_count: 22, stf_waste_removal_trip_count: 10,
  stf_excavation_shoring_mode: "NOT_REQUIRED",
  stf_groundwater_dewatering_mode: "NOT_REQUIRED",
  stf_effluent_dispersal_mode: "NOT_INCLUDED",
});

export async function compileSepticTreatmentFacilityR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? SEPTIC_TREATMENT_FACILITY_CATALOG_ID;
  if (catalogId !== SEPTIC_TREATMENT_FACILITY_CATALOG_ID) {
    throw new Error(`SEPTIC_TREATMENT_FACILITY_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.septic-treatment-facility-r1", catalogId,
    primaryMeasureParameterId: "stf_facility_count",
    parameterDefinitions: [...SEPTIC_TREATMENT_FACILITY_PARAMETERS],
    formulaDefinitions: [...SEPTIC_TREATMENT_FACILITY_FORMULAS],
    resourceDefinitions: [...SEPTIC_TREATMENT_FACILITY_RESOURCES], submittedParameters,
    confirmedParameters: { ...SEPTIC_TREATMENT_FACILITY_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
