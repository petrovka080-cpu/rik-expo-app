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
export const MANHOLES_CATALOG_ID = "canonical-work:expanded:manholes";
export const MANHOLES_SOURCE_ID = "project_cast_in_place_rc_manhole_assembly_qa_balance_v1";
export const MANHOLES_NORM_ID = "norm:project:manhole:cast_in_place_rc_assembly_qa_balance:v1";
export const MANHOLES_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект монолитных железобетонных канализационных колодцев, спецификации конструкций, люков и соединений, ППР и программа контроля",
  source_authority: "Проектные организации канализации и железобетонных конструкций, поставщики бетона, арматуры и люков, инженер-геолог, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_CAST_IN_PLACE_RC_MANHOLE_STRUCTURE_EARTHWORK_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "7403c534e40d899afeec9ae3eb20f9c2e9834b1d378fb3a6517320655e0e3e36",
  exact_locator: "6 монолитных прямоугольных железобетонных канализационных колодцев MH-RC-1800x1200-H3.0-C30/37-D400-DN300; конструктивные объёмы, люки, соединения, земляные работы, труд, механизмы и логистика — только по проекту",
  use_restriction: "Количество колодцев не определяет автоматически бетон, арматуру, опалубку, земляные объёмы, труд или механизмы. Водоотлив, крепление и восстановление покрытия включаются только по проекту. Трубопроводная сеть и шаг колодцев исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "7403c534e40d899afeec9ae3eb20f9c2e9834b1d378fb3a6517320655e0e3e36",
});

const KNOWN_SCOPE = [
  "mnh_manhole_count", "mnh_manhole_type", "mnh_manhole_material",
  "mnh_internal_length_mm", "mnh_internal_width_mm", "mnh_depth_m",
  "mnh_concrete_class", "mnh_cover_frame_designation", "mnh_cover_load_class",
  "mnh_connector_diameter_mm", "mnh_manhole_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "mnh_cover_retained_spare_piece", "mnh_cover_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "mnh_dewatering_designation", "mnh_dewatering_machine_h",
  "mnh_shoring_designation", "mnh_shoring_area_m2",
  "mnh_pavement_restoration_designation", "mnh_pavement_restoration_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["mnh_manhole_count", "Количество строящихся канализационных колодцев", "integer", "pcs", null],
  ["mnh_manhole_type", "Тип канализационного колодца", "text", null, null],
  ["mnh_manhole_material", "Материал конструкции колодца", "text", null, null],
  ["mnh_internal_length_mm", "Внутренняя длина колодца", "decimal", "mm", null],
  ["mnh_internal_width_mm", "Внутренняя ширина колодца", "decimal", "mm", null],
  ["mnh_depth_m", "Глубина колодца", "decimal", "m", null],
  ["mnh_concrete_class", "Класс конструкционного бетона", "text", null, null],
  ["mnh_cover_frame_designation", "Марка комплекта люка и рамы", "text", null, null],
  ["mnh_cover_load_class", "Класс нагрузки люка", "text", null, null],
  ["mnh_connector_diameter_mm", "Диаметр присоединений колодца", "decimal", "mm", null],
  ["mnh_manhole_designation", "Марка выбранного колодца", "text", null, null],
  ["mnh_cover_retained_spare_piece", "Сохраняемый резерв комплектов люка", "integer", "pcs", null],
  ["mnh_cover_supplier_package_quantity_piece", "Комплектов люка в поставочной упаковке", "integer", "pcs", null],
  ["mnh_structural_concrete_designation", "Конструкционный бетон", "text", null, null],
  ["mnh_structural_concrete_volume_m3", "Объём конструкционного бетона", "decimal", "m3", null],
  ["mnh_reinforcement_designation", "Арматура колодца", "text", null, null],
  ["mnh_reinforcement_mass_kg", "Масса арматуры колодца", "decimal", "kg", null],
  ["mnh_formwork_designation", "Опалубка колодца", "text", null, null],
  ["mnh_formwork_area_m2", "Площадь опалубки колодца", "decimal", "m2", null],
  ["mnh_waterstop_designation", "Гидрошпонка рабочих швов", "text", null, null],
  ["mnh_waterstop_length_m", "Длина гидрошпонки", "decimal", "m", null],
  ["mnh_step_designation", "Марка ходовых скоб или ступеней", "text", null, null],
  ["mnh_step_quantity_piece", "Количество ходовых скоб или ступеней", "decimal", "pcs", null],
  ["mnh_inlet_connector_designation", "Марка входного соединителя", "text", null, null],
  ["mnh_inlet_connector_quantity_piece", "Количество входных соединителей", "decimal", "pcs", null],
  ["mnh_outlet_connector_designation", "Марка выходного соединителя", "text", null, null],
  ["mnh_outlet_connector_quantity_piece", "Количество выходных соединителей", "decimal", "pcs", null],
  ["mnh_connector_seal_designation", "Уплотнение присоединений", "text", null, null],
  ["mnh_connector_seal_quantity_piece", "Количество уплотнений присоединений", "decimal", "pcs", null],
  ["mnh_benching_concrete_designation", "Бетон лотковой части", "text", null, null],
  ["mnh_benching_concrete_volume_m3", "Объём бетона лотковой части", "decimal", "m3", null],
  ["mnh_waterproofing_designation", "Система гидроизоляции", "text", null, null],
  ["mnh_waterproofing_area_m2", "Площадь гидроизоляции", "decimal", "m2", null],
  ["mnh_bedding_designation", "Материал основания колодца", "text", null, null],
  ["mnh_bedding_volume_m3", "Объём основания колодца", "decimal", "m3", null],
  ["mnh_excavation_volume_m3", "Объём разработки котлованов", "decimal", "m3", null],
  ["mnh_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["mnh_backfill_volume_m3", "Объём обратной засыпки", "decimal", "m3", null],
  ["mnh_excess_soil_volume_m3", "Объём вывоза лишнего грунта", "decimal", "m3", null],
  ["mnh_test_count", "Количество испытаний колодцев", "decimal", "test", null],
  ["mnh_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["mnh_survey_labor_h", "Труд по разбивке и исполнительной съёмке", "decimal", "man_hour", null],
  ["mnh_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["mnh_rebar_formwork_labor_h", "Труд по арматуре и опалубке", "decimal", "man_hour", null],
  ["mnh_concrete_install_labor_h", "Труд по бетонированию и монтажу", "decimal", "man_hour", null],
  ["mnh_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["mnh_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["mnh_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["mnh_concrete_pump_machine_h", "Работа бетононасоса", "decimal", "machine_hour", null],
  ["mnh_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["mnh_test_pump_machine_h", "Работа оборудования испытаний", "decimal", "machine_hour", null],
  ["mnh_delivery_trip_count", "Рейсы доставки", "integer", "trip", null],
  ["mnh_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["mnh_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["mnh_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["mnh_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["mnh_shoring_mode", "Крепление котлованов требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["mnh_shoring_designation", "Система крепления котлованов", "text", null, null],
  ["mnh_shoring_area_m2", "Площадь крепления котлованов", "decimal", "m2", null],
  ["mnh_pavement_restoration_mode", "Восстановление покрытия требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["mnh_pavement_restoration_designation", "Конструкция восстановления покрытия", "text", null, null],
  ["mnh_pavement_restoration_area_m2", "Площадь восстановления покрытия", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("mnh_dewatering_") && parameterId !== "mnh_dewatering_mode"
    ? "mnh_dewatering_mode" : parameterId.startsWith("mnh_shoring_") && parameterId !== "mnh_shoring_mode"
      ? "mnh_shoring_mode" : parameterId.startsWith("mnh_pavement_restoration_")
        && parameterId !== "mnh_pavement_restoration_mode" ? "mnh_pavement_restoration_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type ManholesParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const MANHOLES_PARAMETERS: readonly ManholesParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "mnh_cover_retained_spare_piece" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.manholes-r1",
      semantic_parameter_key: `manholes:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_MANHOLE_STRUCTURAL_ASSEMBLY_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану и конструктивной спецификации колодцев.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_MANHOLE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_MANHOLE_PROJECT_DOCUMENTATION",
        source_document: MANHOLES_SOURCE_ID, source_locator: MANHOLES_SOURCE_METADATA.exact_locator,
        guide_version: "manholes-r1", source_snapshot_hash: MANHOLES_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для выбранных монолитных прямоугольных колодцев; сборные круглые камеры и трубопроводная сеть исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);
export const MANHOLES_RUNTIME_INPUT = Object.freeze({
  mnh_cover_retained_spare_piece: 0, mnh_cover_supplier_package_quantity_piece: 1,
});
export const MANHOLES_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(MANHOLES_RUNTIME_INPUT).map((parameterId) => [parameterId, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const MANHOLES_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(MANHOLES_RUNTIME_INPUT).map((parameterId) => [parameterId, [MANHOLES_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:mnh_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Строительство и приёмка канализационных колодцев", unitId: "pcs", formulaId: "mnh_install_count_v1", expression: "mnh_manhole_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh_structural_concrete", section: "Материалы", category: "material", titleRu: "Конструкционный бетон колодцев", unitId: "m3", formulaId: "mnh_structural_concrete_volume_v1", expression: "mnh_structural_concrete_volume_m3", procurementEligible: true, titleParameterIds: ["mnh_structural_concrete_designation", "mnh_concrete_class"] },
  { rowId: "rc09:mnh_reinforcement", section: "Материалы", category: "material", titleRu: "Арматура колодцев", unitId: "kg", formulaId: "mnh_reinforcement_mass_v1", expression: "mnh_reinforcement_mass_kg", procurementEligible: true, titleParameterIds: ["mnh_reinforcement_designation"] },
  { rowId: "rc09:mnh_formwork", section: "Материалы", category: "material", titleRu: "Опалубка колодцев", unitId: "m2", formulaId: "mnh_formwork_area_v1", expression: "mnh_formwork_area_m2", procurementEligible: true, titleParameterIds: ["mnh_formwork_designation"] },
  { rowId: "rc09:mnh_waterstop", section: "Расходники", category: "material", titleRu: "Гидрошпонка рабочих швов", unitId: "m", formulaId: "mnh_waterstop_length_v1", expression: "mnh_waterstop_length_m", procurementEligible: true, titleParameterIds: ["mnh_waterstop_designation"] },
  { rowId: "rc09:mnh_cover_frame", section: "Комплектующие", category: "material", titleRu: "Комплект люка и рамы", unitId: "pcs", formulaId: "mnh_cover_order_quantity_v1", expression: "ceil((mnh_manhole_count+mnh_cover_retained_spare_piece)/mnh_cover_supplier_package_quantity_piece)*mnh_cover_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["mnh_cover_frame_designation", "mnh_cover_load_class"] },
  { rowId: "rc09:mnh_steps", section: "Комплектующие", category: "material", titleRu: "Ходовые скобы или ступени", unitId: "pcs", formulaId: "mnh_step_quantity_v1", expression: "mnh_step_quantity_piece", procurementEligible: true, titleParameterIds: ["mnh_step_designation"] },
  { rowId: "rc09:mnh_inlet_connector", section: "Комплектующие", category: "material", titleRu: "Входной соединитель колодца", unitId: "pcs", formulaId: "mnh_inlet_connector_quantity_v1", expression: "mnh_inlet_connector_quantity_piece", procurementEligible: true, titleParameterIds: ["mnh_inlet_connector_designation"] },
  { rowId: "rc09:mnh_outlet_connector", section: "Комплектующие", category: "material", titleRu: "Выходной соединитель колодца", unitId: "pcs", formulaId: "mnh_outlet_connector_quantity_v1", expression: "mnh_outlet_connector_quantity_piece", procurementEligible: true, titleParameterIds: ["mnh_outlet_connector_designation"] },
  { rowId: "rc09:mnh_connector_seal", section: "Расходники", category: "material", titleRu: "Уплотнения присоединений", unitId: "pcs", formulaId: "mnh_connector_seal_quantity_v1", expression: "mnh_connector_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["mnh_connector_seal_designation"] },
  { rowId: "rc09:mnh_benching_concrete", section: "Материалы", category: "material", titleRu: "Бетон лотковой части", unitId: "m3", formulaId: "mnh_benching_concrete_volume_v1", expression: "mnh_benching_concrete_volume_m3", procurementEligible: true, titleParameterIds: ["mnh_benching_concrete_designation"] },
  { rowId: "rc09:mnh_waterproofing", section: "Материалы", category: "material", titleRu: "Гидроизоляция колодцев", unitId: "m2", formulaId: "mnh_waterproofing_area_v1", expression: "mnh_waterproofing_area_m2", procurementEligible: true, titleParameterIds: ["mnh_waterproofing_designation"] },
  { rowId: "rc09:mnh_bedding", section: "Материалы", category: "material", titleRu: "Основание колодцев", unitId: "m3", formulaId: "mnh_bedding_volume_v1", expression: "mnh_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["mnh_bedding_designation"] },
  { rowId: "rc09:mnh_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлованов колодцев", unitId: "m3", formulaId: "mnh_excavation_volume_v1", expression: "mnh_excavation_volume_m3" },
  { rowId: "rc09:mnh_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка колодцев", unitId: "m3", formulaId: "mnh_backfill_volume_v1", expression: "mnh_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["mnh_backfill_designation"] },
  { rowId: "rc09:mnh_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "mnh_excess_soil_volume_v1", expression: "mnh_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:mnh_test", section: "Контроль", category: "service", titleRu: "Испытание и приёмка колодцев", unitId: "test", formulaId: "mnh_test_count_v1", expression: "mnh_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация колодцев", unitId: "document", formulaId: "mnh_asbuilt_document_count_v1", expression: "mnh_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из котлованов", unitId: "machine_hour", formulaId: "mnh_dewatering_machine_v1", expression: "mnh_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("mnh_dewatering_mode", "REQUIRED"), titleParameterIds: ["mnh_dewatering_designation"] },
  { rowId: "rc09:mnh_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление котлованов", unitId: "m2", formulaId: "mnh_shoring_area_v1", expression: "mnh_shoring_area_m2", procurementEligible: true, inclusionAst: equals("mnh_shoring_mode", "REQUIRED"), titleParameterIds: ["mnh_shoring_designation"] },
  { rowId: "rc09:mnh_pavement_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление покрытия у колодцев", unitId: "m2", formulaId: "mnh_pavement_restoration_area_v1", expression: "mnh_pavement_restoration_area_m2", inclusionAst: equals("mnh_pavement_restoration_mode", "REQUIRED"), titleParameterIds: ["mnh_pavement_restoration_designation"] },
  { rowId: "rc09:mnh-cover-balance:installed-net", section: "Баланс люков", category: "material", titleRu: "Количество устанавливаемых комплектов люка", unitId: "pcs", formulaId: "mnh_cover_installed_net_v1", expression: "mnh_manhole_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh-cover-balance:retained-spare", section: "Баланс люков", category: "material", titleRu: "Сохраняемый резерв комплектов люка", unitId: "pcs", formulaId: "mnh_cover_retained_spare_v1", expression: "mnh_cover_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh-cover-balance:total-need", section: "Баланс люков", category: "material", titleRu: "Общая потребность в комплектах люка", unitId: "pcs", formulaId: "mnh_cover_total_need_v1", expression: "mnh_manhole_count+mnh_cover_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh-cover-balance:package-count", section: "Баланс люков", category: "material", titleRu: "Количество поставочных упаковок люка", unitId: "package", formulaId: "mnh_cover_package_count_v1", expression: "ceil((mnh_manhole_count+mnh_cover_retained_spare_piece)/mnh_cover_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh-cover-balance:remainder", section: "Баланс люков", category: "material", titleRu: "Остаток комплектов люка после монтажа", unitId: "pcs", formulaId: "mnh_cover_remainder_v1", expression: "ceil((mnh_manhole_count+mnh_cover_retained_spare_piece)/mnh_cover_supplier_package_quantity_piece)*mnh_cover_supplier_package_quantity_piece-mnh_manhole_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:mnh-cover-balance:surplus-beyond-spare", section: "Баланс люков", category: "material", titleRu: "Свободный остаток люков сверх резерва", unitId: "pcs", formulaId: "mnh_cover_surplus_v1", expression: "max(0,ceil((mnh_manhole_count+mnh_cover_retained_spare_piece)/mnh_cover_supplier_package_quantity_piece)*mnh_cover_supplier_package_quantity_piece-mnh_manhole_count-mnh_cover_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:mnh-survey", section: "Труд", category: "construction_work", titleRu: "Разбивка и исполнительная съёмка", unitId: "man_hour", formulaId: "mnh_survey_labor_v1", expression: "mnh_survey_labor_h" },
  { rowId: "rc09:labor:mnh-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "mnh_earthworks_labor_v1", expression: "mnh_earthworks_labor_h" },
  { rowId: "rc09:labor:mnh-rebar-formwork", section: "Труд", category: "construction_work", titleRu: "Труд по арматуре и опалубке", unitId: "man_hour", formulaId: "mnh_rebar_formwork_labor_v1", expression: "mnh_rebar_formwork_labor_h" },
  { rowId: "rc09:labor:mnh-concrete-install", section: "Труд", category: "construction_work", titleRu: "Труд по бетонированию и монтажу", unitId: "man_hour", formulaId: "mnh_concrete_install_labor_v1", expression: "mnh_concrete_install_labor_h" },
  { rowId: "rc09:labor:mnh-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по контролю и документации", unitId: "man_hour", formulaId: "mnh_qa_documentation_labor_v1", expression: "mnh_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:mnh-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для котлованов", unitId: "machine_hour", formulaId: "mnh_excavator_machine_v1", expression: "mnh_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:mnh-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для арматуры, опалубки и люков", unitId: "machine_hour", formulaId: "mnh_crane_machine_v1", expression: "mnh_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:mnh-concrete-pump", section: "Механизмы", category: "equipment", titleRu: "Бетононасос", unitId: "machine_hour", formulaId: "mnh_concrete_pump_machine_v1", expression: "mnh_concrete_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:mnh-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм уплотнения обратной засыпки", unitId: "machine_hour", formulaId: "mnh_compactor_machine_v1", expression: "mnh_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:mnh-test-pump", section: "Механизмы", category: "equipment", titleRu: "Оборудование испытаний колодцев", unitId: "machine_hour", formulaId: "mnh_test_pump_machine_v1", expression: "mnh_test_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:mnh-delivery", section: "Логистика", category: "service", titleRu: "Доставка бетона, арматуры и комплектующих", unitId: "trip", formulaId: "mnh_delivery_trip_v1", expression: "mnh_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:mnh-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, опалубочных отходов и тары", unitId: "trip", formulaId: "mnh_removal_trip_v1", expression: "mnh_removal_trip_count", procurementEligible: true },
]);
export const MANHOLES_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const MANHOLES_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `manholes:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_CAST_IN_PLACE_RC_MANHOLE_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: MANHOLES_SOURCE_ID, source_id: MANHOLES_SOURCE_ID,
        normId: MANHOLES_NORM_ID, norm_id: MANHOLES_NORM_ID,
        normVersion: MANHOLES_SOURCE_METADATA.source_document_version,
        source_title: MANHOLES_SOURCE_METADATA.source_title,
        exact_locator: MANHOLES_SOURCE_METADATA.exact_locator,
        source_definition_hash: MANHOLES_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["whole sewer pipe or network scope",
        "route-derived manhole spacing or structural, earthwork, labor or mechanism quantity",
        "precast round inspection-chamber scope",
        "automatic dewatering, shoring or pavement-restoration selection",
        "automatic retained spare or supplier package quantity", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const MANHOLES_SHORT_INPUT = Object.freeze({
  mnh_manhole_count: 6, mnh_manhole_type: "CAST_IN_PLACE_RC_RECTANGULAR",
  mnh_manhole_material: "CAST_IN_PLACE_RC", mnh_internal_length_mm: 1800,
  mnh_internal_width_mm: 1200, mnh_depth_m: 3, mnh_concrete_class: "C30/37",
  mnh_cover_frame_designation: "TM-D400", mnh_cover_load_class: "D400",
  mnh_connector_diameter_mm: 300,
  mnh_manhole_designation: "MH-RC-1800x1200-H3.0-C30/37-D400-DN300",
  ...MANHOLES_RUNTIME_INPUT,
});
export const MANHOLES_ACCEPTANCE_INPUT = Object.freeze({
  ...MANHOLES_SHORT_INPUT,
  mnh_structural_concrete_designation: "Бетон C30/37 W8 F200", mnh_structural_concrete_volume_m3: 72,
  mnh_reinforcement_designation: "Арматура A500C по КЖ", mnh_reinforcement_mass_kg: 8640,
  mnh_formwork_designation: "Щитовая опалубка стен и перекрытий", mnh_formwork_area_m2: 540,
  mnh_waterstop_designation: "Гидрошпонка PVC 240 мм", mnh_waterstop_length_m: 144,
  mnh_step_designation: "Скоба ходовая полимерная", mnh_step_quantity_piece: 60,
  mnh_inlet_connector_designation: "Муфта проходная DN 300", mnh_inlet_connector_quantity_piece: 6,
  mnh_outlet_connector_designation: "Муфта проходная DN 300", mnh_outlet_connector_quantity_piece: 6,
  mnh_connector_seal_designation: "Уплотнение EPDM DN 300", mnh_connector_seal_quantity_piece: 12,
  mnh_benching_concrete_designation: "Бетон C20/25 лотковой части", mnh_benching_concrete_volume_m3: 7.2,
  mnh_waterproofing_designation: "Обмазочная гидроизоляция в два слоя", mnh_waterproofing_area_m2: 300,
  mnh_bedding_designation: "Щебёночное основание 20-40", mnh_bedding_volume_m3: 18,
  mnh_excavation_volume_m3: 540,
  mnh_backfill_designation: "Песчано-гравийная смесь", mnh_backfill_volume_m3: 330,
  mnh_excess_soil_volume_m3: 210, mnh_test_count: 6, mnh_asbuilt_document_count: 1,
  mnh_survey_labor_h: 36, mnh_earthworks_labor_h: 420, mnh_rebar_formwork_labor_h: 720,
  mnh_concrete_install_labor_h: 360, mnh_qa_documentation_labor_h: 72,
  mnh_excavator_machine_h: 144, mnh_crane_machine_h: 96, mnh_concrete_pump_machine_h: 72,
  mnh_compactor_machine_h: 66, mnh_test_pump_machine_h: 18,
  mnh_delivery_trip_count: 24, mnh_removal_trip_count: 18,
  mnh_dewatering_mode: "NOT_REQUIRED", mnh_shoring_mode: "NOT_REQUIRED",
  mnh_pavement_restoration_mode: "NOT_REQUIRED",
});
export async function compileManholesR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? MANHOLES_CATALOG_ID;
  if (catalogId !== MANHOLES_CATALOG_ID) throw new Error(`MANHOLES_CATALOG_UNSUPPORTED:${catalogId}`);
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.manholes-r1", catalogId,
    primaryMeasureParameterId: "mnh_manhole_count", parameterDefinitions: [...MANHOLES_PARAMETERS],
    formulaDefinitions: [...MANHOLES_FORMULAS], resourceDefinitions: [...MANHOLES_RESOURCES],
    submittedParameters, confirmedParameters: { ...MANHOLES_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 45, hashJson: async (value) => JSON.stringify(value) });
}
