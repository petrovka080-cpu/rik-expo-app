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

export const INSPECTION_CHAMBERS_CATALOG_ID =
  "canonical-work:expanded:inspection_chambers";
export const INSPECTION_CHAMBERS_SOURCE_ID =
  "project_inspection_chamber_assembly_earthwork_qa_balance_v1";
export const INSPECTION_CHAMBERS_NORM_ID =
  "norm:project:inspection_chamber:assembly_earthwork_qa_balance:v1";
export const INSPECTION_CHAMBERS_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план и ведомость смотровых камер, спецификации сборных элементов, люков, соединений и программа контроля",
  source_authority: "Проектная организация канализации, изготовители сборных камер и люков, инженер-геолог, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_INSPECTION_CHAMBER_ASSEMBLY_EARTHWORK_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "85c1ddee8c94540f126b816ac50b7a8a92ae8366c6e0abdae9d8438301571b14",
  exact_locator: "12 круглых сборных железобетонных смотровых камер KS-15-RC-H2.5-D400-DN200 внутренним диаметром 1500 мм и глубиной 2,5 м; элементы камер, люки, соединения, земляные объёмы, труд, механизмы и логистика — только по проекту",
  use_restriction: "Количество камер не определяет автоматически кольца, земляные объёмы, материалы, труд или механизмы. Водоотлив, крепление и восстановление покрытия включаются только по проекту. Трубопроводная сеть и автоматический шаг камер исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "85c1ddee8c94540f126b816ac50b7a8a92ae8366c6e0abdae9d8438301571b14",
});

const KNOWN_SCOPE = [
  "ich_chamber_count", "ich_chamber_type", "ich_chamber_material",
  "ich_internal_diameter_mm", "ich_depth_m", "ich_cover_load_class",
  "ich_connector_diameter_mm", "ich_chamber_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "ich_body_retained_spare_piece", "ich_body_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "ich_dewatering_designation", "ich_dewatering_machine_h",
  "ich_shoring_designation", "ich_shoring_area_m2",
  "ich_pavement_restoration_designation", "ich_pavement_restoration_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["ich_chamber_count", "Количество устанавливаемых смотровых камер", "integer", "pcs", null],
  ["ich_chamber_type", "Тип смотровой камеры", "text", null, null],
  ["ich_chamber_material", "Материал корпуса смотровой камеры", "text", null, null],
  ["ich_internal_diameter_mm", "Внутренний диаметр камеры", "decimal", "mm", null],
  ["ich_depth_m", "Глубина камеры", "decimal", "m", null],
  ["ich_cover_load_class", "Класс нагрузки люка", "text", null, null],
  ["ich_connector_diameter_mm", "Диаметр присоединений камеры", "decimal", "mm", null],
  ["ich_chamber_designation", "Марка выбранной камеры", "text", null, null],
  ["ich_body_retained_spare_piece", "Сохраняемый резерв комплектов корпуса", "integer", "pcs", null],
  ["ich_body_supplier_package_quantity_piece", "Комплектов корпуса в поставочной упаковке", "integer", "pcs", null],
  ["ich_base_slab_designation", "Марка плиты днища", "text", null, null],
  ["ich_base_slab_quantity_piece", "Количество плит днища", "decimal", "pcs", null],
  ["ich_cover_slab_designation", "Марка плиты перекрытия", "text", null, null],
  ["ich_cover_slab_quantity_piece", "Количество плит перекрытия", "decimal", "pcs", null],
  ["ich_cover_frame_designation", "Марка люка и рамы", "text", null, null],
  ["ich_cover_frame_quantity_piece", "Количество люков и рам", "decimal", "pcs", null],
  ["ich_step_designation", "Марка ходовых скоб или ступеней", "text", null, null],
  ["ich_step_quantity_piece", "Количество ходовых скоб или ступеней", "decimal", "pcs", null],
  ["ich_joint_seal_designation", "Марка уплотнения стыков", "text", null, null],
  ["ich_joint_seal_quantity_piece", "Количество уплотнений стыков", "decimal", "pcs", null],
  ["ich_inlet_connector_designation", "Марка входного соединителя", "text", null, null],
  ["ich_inlet_connector_quantity_piece", "Количество входных соединителей", "decimal", "pcs", null],
  ["ich_outlet_connector_designation", "Марка выходного соединителя", "text", null, null],
  ["ich_outlet_connector_quantity_piece", "Количество выходных соединителей", "decimal", "pcs", null],
  ["ich_benching_concrete_designation", "Бетон лотковой части", "text", null, null],
  ["ich_benching_concrete_volume_m3", "Объём бетона лотковой части", "decimal", "m3", null],
  ["ich_waterproofing_designation", "Система гидроизоляции камеры", "text", null, null],
  ["ich_waterproofing_area_m2", "Площадь гидроизоляции камеры", "decimal", "m2", null],
  ["ich_bedding_designation", "Материал основания камеры", "text", null, null],
  ["ich_bedding_volume_m3", "Объём основания камеры", "decimal", "m3", null],
  ["ich_excavation_volume_m3", "Объём разработки котлованов", "decimal", "m3", null],
  ["ich_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["ich_backfill_volume_m3", "Объём обратной засыпки", "decimal", "m3", null],
  ["ich_excess_soil_volume_m3", "Объём вывоза лишнего грунта", "decimal", "m3", null],
  ["ich_test_count", "Количество испытаний камер", "decimal", "test", null],
  ["ich_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["ich_survey_labor_h", "Труд по разбивке и исполнительной съёмке", "decimal", "man_hour", null],
  ["ich_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["ich_install_labor_h", "Труд по монтажу камер", "decimal", "man_hour", null],
  ["ich_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["ich_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["ich_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["ich_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["ich_test_pump_machine_h", "Работа оборудования испытаний", "decimal", "machine_hour", null],
  ["ich_delivery_trip_count", "Рейсы доставки", "integer", "trip", null],
  ["ich_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["ich_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["ich_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["ich_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["ich_shoring_mode", "Крепление котлованов требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["ich_shoring_designation", "Система крепления котлованов", "text", null, null],
  ["ich_shoring_area_m2", "Площадь крепления котлованов", "decimal", "m2", null],
  ["ich_pavement_restoration_mode", "Восстановление покрытия требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["ich_pavement_restoration_designation", "Конструкция восстановления покрытия", "text", null, null],
  ["ich_pavement_restoration_area_m2", "Площадь восстановления покрытия", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("ich_dewatering_") && parameterId !== "ich_dewatering_mode"
    ? "ich_dewatering_mode"
    : parameterId.startsWith("ich_shoring_") && parameterId !== "ich_shoring_mode"
      ? "ich_shoring_mode"
      : parameterId.startsWith("ich_pavement_restoration_")
        && parameterId !== "ich_pavement_restoration_mode"
        ? "ich_pavement_restoration_mode" : null;
  return branch ? {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  } : {};
}

export type InspectionChambersParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};
export const INSPECTION_CHAMBERS_PARAMETERS: readonly InspectionChambersParameter[] =
  Object.freeze(PARAMETER_SPECS.map(
    ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
      parameter_id: parameterId,
      ordinal,
      value_type: valueType,
      unit_id: unitId,
      title_ru: titleRu,
      required: !CONDITIONAL_DETAILS.has(parameterId),
      default_value: null,
      constraints_json: {
        ...(enumValues ? { values: enumValues }
          : valueType === "decimal" || valueType === "integer"
            ? { min: parameterId === "ich_body_retained_spare_piece"
              ? 0 : valueType === "integer" ? 1 : 0.000_001 }
            : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
        ...conditionalConstraints(parameterId),
      },
      truth_metadata: {
        contract: "rik-expo-app.inspection-chambers-r1",
        semantic_parameter_key: `inspection-chambers:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_INPUT" : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
        input_origin_class: KNOWN_SCOPE.includes(parameterId)
          ? "KNOWN_WORK_SCOPE" : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
            : "APPROVED_INSPECTION_CHAMBER_LAYOUT_ASSEMBLY_METHOD_OR_QA_DOCUMENTATION",
        preliminary_compilation_allowed: true,
        source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
          && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        guide: {
          guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          guide_short_ru: KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по явному запросу, плану и спецификации смотровых камер.`
            : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
          source_role: KNOWN_SCOPE.includes(parameterId)
            ? "USER_SUPPLIED_OR_APPROVED_INSPECTION_CHAMBER_SCOPE"
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
              : "APPROVED_INSPECTION_CHAMBER_PROJECT_DOCUMENTATION",
          source_document: INSPECTION_CHAMBERS_SOURCE_ID,
          source_locator: INSPECTION_CHAMBERS_SOURCE_METADATA.exact_locator,
          guide_version: "inspection-chambers-r1",
          source_snapshot_hash: INSPECTION_CHAMBERS_SOURCE_METADATA.artifact_sha256,
          applicability: "Только для явно выбранных смотровых камер; трубопроводная сеть и автоматический шаг камер исключены.",
          verified_at: "2026-10-01T00:00:00+06:00",
          guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
        },
        hidden_default_forbidden: true,
        runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
        synthetic: false,
      },
    }),
  ));

export const INSPECTION_CHAMBERS_RUNTIME_INPUT = Object.freeze({
  ich_body_retained_spare_piece: 0,
  ich_body_supplier_package_quantity_piece: 1,
});
export const INSPECTION_CHAMBERS_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(INSPECTION_CHAMBERS_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const INSPECTION_CHAMBERS_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(INSPECTION_CHAMBERS_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [INSPECTION_CHAMBERS_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{
  rowId: string;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  expression: string;
  procurementEligible?: boolean;
  titleParameterIds?: string[];
  inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}>;

const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:ich_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Монтаж и приёмка смотровых камер", unitId: "pcs", formulaId: "ich_install_count_v1", expression: "ich_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich_body", section: "Материалы", category: "material", titleRu: "Комплект корпуса смотровой камеры", unitId: "pcs", formulaId: "ich_body_order_quantity_v1", expression: "ceil((ich_chamber_count+ich_body_retained_spare_piece)/ich_body_supplier_package_quantity_piece)*ich_body_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_chamber_designation", "ich_chamber_type", "ich_chamber_material"] },
  { rowId: "rc09:ich_base_slab", section: "Комплектующие", category: "material", titleRu: "Плита днища камеры", unitId: "pcs", formulaId: "ich_base_slab_quantity_v1", expression: "ich_base_slab_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_base_slab_designation"] },
  { rowId: "rc09:ich_cover_slab", section: "Комплектующие", category: "material", titleRu: "Плита перекрытия камеры", unitId: "pcs", formulaId: "ich_cover_slab_quantity_v1", expression: "ich_cover_slab_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_cover_slab_designation"] },
  { rowId: "rc09:ich_cover_frame", section: "Комплектующие", category: "material", titleRu: "Люк и рама камеры", unitId: "pcs", formulaId: "ich_cover_frame_quantity_v1", expression: "ich_cover_frame_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_cover_frame_designation", "ich_cover_load_class"] },
  { rowId: "rc09:ich_steps", section: "Комплектующие", category: "material", titleRu: "Ходовые скобы или ступени", unitId: "pcs", formulaId: "ich_step_quantity_v1", expression: "ich_step_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_step_designation"] },
  { rowId: "rc09:ich_joint_seal", section: "Расходники", category: "material", titleRu: "Уплотнение стыков камеры", unitId: "pcs", formulaId: "ich_joint_seal_quantity_v1", expression: "ich_joint_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_joint_seal_designation"] },
  { rowId: "rc09:ich_inlet_connector", section: "Комплектующие", category: "material", titleRu: "Входной соединитель камеры", unitId: "pcs", formulaId: "ich_inlet_connector_quantity_v1", expression: "ich_inlet_connector_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_inlet_connector_designation"] },
  { rowId: "rc09:ich_outlet_connector", section: "Комплектующие", category: "material", titleRu: "Выходной соединитель камеры", unitId: "pcs", formulaId: "ich_outlet_connector_quantity_v1", expression: "ich_outlet_connector_quantity_piece", procurementEligible: true, titleParameterIds: ["ich_outlet_connector_designation"] },
  { rowId: "rc09:ich_benching_concrete", section: "Материалы", category: "material", titleRu: "Бетон лотковой части камеры", unitId: "m3", formulaId: "ich_benching_concrete_volume_v1", expression: "ich_benching_concrete_volume_m3", procurementEligible: true, titleParameterIds: ["ich_benching_concrete_designation"] },
  { rowId: "rc09:ich_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция камеры", unitId: "m2", formulaId: "ich_waterproofing_area_v1", expression: "ich_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["ich_waterproofing_designation"] },
  { rowId: "rc09:ich_bedding", section: "Материалы", category: "material", titleRu: "Основание камеры", unitId: "m3", formulaId: "ich_bedding_volume_v1", expression: "ich_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["ich_bedding_designation"] },
  { rowId: "rc09:ich_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлованов камер", unitId: "m3", formulaId: "ich_excavation_volume_v1", expression: "ich_excavation_volume_m3" },
  { rowId: "rc09:ich_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка камер", unitId: "m3", formulaId: "ich_backfill_volume_v1", expression: "ich_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["ich_backfill_designation"] },
  { rowId: "rc09:ich_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "ich_excess_soil_volume_v1", expression: "ich_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:ich_test", section: "Контроль", category: "service", titleRu: "Испытание и приёмка камер", unitId: "test", formulaId: "ich_test_count_v1", expression: "ich_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация камер", unitId: "document", formulaId: "ich_asbuilt_document_count_v1", expression: "ich_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из котлованов", unitId: "machine_hour", formulaId: "ich_dewatering_machine_v1", expression: "ich_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("ich_dewatering_mode", "REQUIRED"), titleParameterIds: ["ich_dewatering_designation"] },
  { rowId: "rc09:ich_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление котлованов", unitId: "m2", formulaId: "ich_shoring_area_v1", expression: "ich_shoring_area_m2", procurementEligible: true, inclusionAst: equals("ich_shoring_mode", "REQUIRED"), titleParameterIds: ["ich_shoring_designation"] },
  { rowId: "rc09:ich_pavement_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление покрытия у камер", unitId: "m2", formulaId: "ich_pavement_restoration_area_v1", expression: "ich_pavement_restoration_area_m2", inclusionAst: equals("ich_pavement_restoration_mode", "REQUIRED"), titleParameterIds: ["ich_pavement_restoration_designation"] },
  { rowId: "rc09:ich-body-balance:installed-net", section: "Баланс корпусов", category: "material", titleRu: "Количество монтируемых комплектов корпуса", unitId: "pcs", formulaId: "ich_body_installed_net_v1", expression: "ich_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich-body-balance:retained-spare", section: "Баланс корпусов", category: "material", titleRu: "Сохраняемый резерв комплектов корпуса", unitId: "pcs", formulaId: "ich_body_retained_spare_v1", expression: "ich_body_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich-body-balance:total-need", section: "Баланс корпусов", category: "material", titleRu: "Общая потребность в комплектах корпуса", unitId: "pcs", formulaId: "ich_body_total_need_v1", expression: "ich_chamber_count+ich_body_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich-body-balance:package-count", section: "Баланс корпусов", category: "material", titleRu: "Количество поставочных упаковок корпуса", unitId: "package", formulaId: "ich_body_package_count_v1", expression: "ceil((ich_chamber_count+ich_body_retained_spare_piece)/ich_body_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich-body-balance:remainder", section: "Баланс корпусов", category: "material", titleRu: "Остаток комплектов корпуса после монтажа", unitId: "pcs", formulaId: "ich_body_remainder_v1", expression: "ceil((ich_chamber_count+ich_body_retained_spare_piece)/ich_body_supplier_package_quantity_piece)*ich_body_supplier_package_quantity_piece-ich_chamber_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:ich-body-balance:surplus-beyond-spare", section: "Баланс корпусов", category: "material", titleRu: "Свободный остаток сверх резерва", unitId: "pcs", formulaId: "ich_body_surplus_v1", expression: "max(0,ceil((ich_chamber_count+ich_body_retained_spare_piece)/ich_body_supplier_package_quantity_piece)*ich_body_supplier_package_quantity_piece-ich_chamber_count-ich_body_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:ich-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "ich_survey_labor_v1", expression: "ich_survey_labor_h" },
  { rowId: "rc09:labor:ich-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "ich_earthworks_labor_v1", expression: "ich_earthworks_labor_h" },
  { rowId: "rc09:labor:ich-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу камер", unitId: "man_hour", formulaId: "ich_install_labor_v1", expression: "ich_install_labor_h" },
  { rowId: "rc09:labor:ich-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по контролю и документации", unitId: "man_hour", formulaId: "ich_qa_documentation_labor_v1", expression: "ich_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:ich-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для котлованов", unitId: "machine_hour", formulaId: "ich_excavator_machine_v1", expression: "ich_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:ich-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа камер", unitId: "machine_hour", formulaId: "ich_crane_machine_v1", expression: "ich_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:ich-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм уплотнения обратной засыпки", unitId: "machine_hour", formulaId: "ich_compactor_machine_v1", expression: "ich_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:ich-test-pump", section: "Механизмы", category: "equipment", titleRu: "Оборудование испытаний камер", unitId: "machine_hour", formulaId: "ich_test_pump_machine_v1", expression: "ich_test_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:ich-delivery", section: "Логистика", category: "service", titleRu: "Доставка элементов камер", unitId: "trip", formulaId: "ich_delivery_trip_v1", expression: "ich_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:ich-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "ich_removal_trip_v1", expression: "ich_removal_trip_count", procurementEligible: true },
]);

export const INSPECTION_CHAMBERS_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] =
  Object.freeze(ROW_SPECS.map((row) => {
    const compiled = compileFormulaGraph(row.expression);
    return {
      formula_id: row.formulaId,
      output_unit_id: row.unitId,
      expression_source: row.expression,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
    };
  }));

export const INSPECTION_CHAMBERS_RESOURCES: readonly CanonicalEstimateResourceDefinition[] =
  Object.freeze(ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = {
      formulaId: row.formulaId,
      normalizedUom: row.unitId,
      semanticOwnerId: `inspection-chambers:${row.rowId}`,
      costOwner: "resource",
      ...(row.titleParameterIds ? {
        titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND",
        titleSpecificationSeparator: " — ",
      } : {}),
      scopeContextParameterIds: KNOWN_SCOPE,
      costTreatment: row.costTreatment ?? "OWN_COST",
    };
    const sourceRole = "APPROVED_INSPECTION_CHAMBER_PROJECT_PACKAGE";
    const sourceMetadata = {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole,
      normativeTrace: [{
        sourceId: INSPECTION_CHAMBERS_SOURCE_ID,
        source_id: INSPECTION_CHAMBERS_SOURCE_ID,
        normId: INSPECTION_CHAMBERS_NORM_ID,
        norm_id: INSPECTION_CHAMBERS_NORM_ID,
        normVersion: INSPECTION_CHAMBERS_SOURCE_METADATA.source_document_version,
        source_title: INSPECTION_CHAMBERS_SOURCE_METADATA.source_title,
        exact_locator: INSPECTION_CHAMBERS_SOURCE_METADATA.exact_locator,
        source_definition_hash: INSPECTION_CHAMBERS_SOURCE_METADATA.definition_hash,
        sourceRole,
      }],
      excludedUnownedAssumptions: [
        "whole sewer pipe or network scope",
        "generic route-derived chamber spacing, earthwork, material, labor or mechanism coefficient",
        "automatic dewatering, shoring or pavement-restoration selection",
        "automatic retained spare or supplier package quantity",
        "invented price",
      ],
    };
    return {
      id: `resource-${row.rowId.replace(/:/gu, "-")}`,
      row_id: row.rowId,
      ordinal,
      section: row.section,
      category: row.category,
      title_ru: row.titleRu,
      unit_id: row.unitId,
      formula_id: row.formulaId,
      inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph,
      procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId,
      source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }),
    };
  }));

export const INSPECTION_CHAMBERS_SHORT_INPUT = Object.freeze({
  ich_chamber_count: 12,
  ich_chamber_type: "PRECAST_RC_CIRCULAR",
  ich_chamber_material: "PRECAST_RC",
  ich_internal_diameter_mm: 1500,
  ich_depth_m: 2.5,
  ich_cover_load_class: "D400",
  ich_connector_diameter_mm: 200,
  ich_chamber_designation: "KS-15-RC-H2.5-D400-DN200",
  ...INSPECTION_CHAMBERS_RUNTIME_INPUT,
});

export const INSPECTION_CHAMBERS_ACCEPTANCE_INPUT = Object.freeze({
  ...INSPECTION_CHAMBERS_SHORT_INPUT,
  ich_base_slab_designation: "ПН-15", ich_base_slab_quantity_piece: 12,
  ich_cover_slab_designation: "ПП-15", ich_cover_slab_quantity_piece: 12,
  ich_cover_frame_designation: "Люк тяжёлый D400", ich_cover_frame_quantity_piece: 12,
  ich_step_designation: "Скоба ходовая полимерная", ich_step_quantity_piece: 72,
  ich_joint_seal_designation: "Кольцо эластомерное KS-15", ich_joint_seal_quantity_piece: 60,
  ich_inlet_connector_designation: "Муфта проходная DN 200", ich_inlet_connector_quantity_piece: 12,
  ich_outlet_connector_designation: "Муфта проходная DN 200", ich_outlet_connector_quantity_piece: 12,
  ich_benching_concrete_designation: "Бетон C20/25 лотковой части", ich_benching_concrete_volume_m3: 9.6,
  ich_waterproofing_designation: "Обмазочная гидроизоляция в два слоя", ich_waterproofing_area_m2: 216,
  ich_bedding_designation: "Щебёночное основание 20-40", ich_bedding_volume_m3: 18,
  ich_excavation_volume_m3: 360,
  ich_backfill_designation: "Песчано-гравийная смесь", ich_backfill_volume_m3: 210,
  ich_excess_soil_volume_m3: 150,
  ich_test_count: 12, ich_asbuilt_document_count: 1,
  ich_survey_labor_h: 48, ich_earthworks_labor_h: 240,
  ich_install_labor_h: 360, ich_qa_documentation_labor_h: 72,
  ich_excavator_machine_h: 96, ich_crane_machine_h: 84,
  ich_compactor_machine_h: 54, ich_test_pump_machine_h: 24,
  ich_delivery_trip_count: 18, ich_removal_trip_count: 13,
  ich_dewatering_mode: "NOT_REQUIRED", ich_shoring_mode: "NOT_REQUIRED",
  ich_pavement_restoration_mode: "NOT_REQUIRED",
});

export async function compileInspectionChambersR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? INSPECTION_CHAMBERS_CATALOG_ID;
  if (catalogId !== INSPECTION_CHAMBERS_CATALOG_ID) {
    throw new Error(`INSPECTION_CHAMBERS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.inspection-chambers-r1",
    catalogId,
    primaryMeasureParameterId: "ich_chamber_count",
    parameterDefinitions: [...INSPECTION_CHAMBERS_PARAMETERS],
    formulaDefinitions: [...INSPECTION_CHAMBERS_FORMULAS],
    resourceDefinitions: [...INSPECTION_CHAMBERS_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...INSPECTION_CHAMBERS_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 45,
    hashJson: async (value) => JSON.stringify(value),
  });
}
