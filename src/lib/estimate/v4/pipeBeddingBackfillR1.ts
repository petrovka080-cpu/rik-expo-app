import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const PIPE_BEDDING_BACKFILL_CATALOG_ID = "canonical-work:expanded:pipe_bedding_backfill";
export const PIPE_BEDDING_BACKFILL_SOURCE_ID = "project_pipe_support_zone_bedding_backfill_qa_balance_v1";
export const PIPE_BEDDING_BACKFILL_NORM_ID = "norm:project:pipe_support_zone:bedding_backfill_qa_balance:v1";
export const PIPE_BEDDING_BACKFILL_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый профиль и конструкция зоны опирания, постели, обсыпки и обратной засыпки трубопровода, ведомость объёмов, ППР и программа контроля",
  source_authority: "Проектные организации трубопровода и геотехники, поставщики материалов, строительная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_PIPE_SUPPORT_ZONE_BEDDING_BACKFILL_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "abf36c44dd1cb2d544f864f21b1bfa90d7646f1d8ba01309614d82a64920c34b",
  exact_locator: "850 м зоны опирания трубопровода OD 315 по конструкции BDF-315-GTX300-SAND-PGS-K095; геотекстиль, основание, проектные 180 м3 постели и обсыпки, выбранная засыпка, уплотнение, труд, механизмы и логистика — только по проекту",
  use_restriction: "Длина и диаметр не определяют автоматически объёмы материалов, земляные работы, труд или механизмы. Замена грунта, водоотлив и крепление включаются только по проекту. Поставка и укладка трубы, колодцы, соединения и испытание сети исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "abf36c44dd1cb2d544f864f21b1bfa90d7646f1d8ba01309614d82a64920c34b",
});
const KNOWN_SCOPE = ["pbb_route_length_m", "pbb_pipe_outside_diameter_mm",
  "pbb_assembly_designation", "pbb_geotextile_designation", "pbb_bedding_material",
  "pbb_bedding_thickness_mm", "pbb_surround_cover_above_pipe_mm", "pbb_backfill_material",
  "pbb_compaction_coefficient", "pbb_bedding_surround_installed_volume_m3"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "pbb_bedding_retained_reserve_m3", "pbb_bedding_supplier_load_m3",
]);
const CONDITIONAL_DETAILS = new Set([
  "pbb_unsuitable_soil_replacement_designation", "pbb_unsuitable_soil_replacement_volume_m3",
  "pbb_dewatering_designation", "pbb_dewatering_machine_h",
  "pbb_shoring_designation", "pbb_shoring_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["pbb_route_length_m", "Длина участка зоны опирания и засыпки", "decimal", "m", null],
  ["pbb_pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["pbb_assembly_designation", "Марка конструкции зоны опирания и засыпки", "text", null, null],
  ["pbb_geotextile_designation", "Марка геотекстиля", "text", null, null],
  ["pbb_bedding_material", "Материал постели и обсыпки", "text", null, null],
  ["pbb_bedding_thickness_mm", "Толщина постели", "decimal", "mm", null],
  ["pbb_surround_cover_above_pipe_mm", "Высота обсыпки над трубой", "decimal", "mm", null],
  ["pbb_backfill_material", "Материал выбранной обратной засыпки", "text", null, null],
  ["pbb_compaction_coefficient", "Требуемый коэффициент уплотнения", "decimal", "ratio", null],
  ["pbb_bedding_surround_installed_volume_m3", "Проектный объём постели и обсыпки", "decimal", "m3", null],
  ["pbb_bedding_retained_reserve_m3", "Сохраняемый резерв материала постели и обсыпки", "decimal", "m3", null],
  ["pbb_bedding_supplier_load_m3", "Объём материала в одной поставочной партии", "decimal", "m3", null],
  ["pbb_geotextile_area_m2", "Площадь геотекстиля", "decimal", "m2", null],
  ["pbb_foundation_aggregate_designation", "Материал нижнего основания", "text", null, null],
  ["pbb_foundation_aggregate_volume_m3", "Объём нижнего основания", "decimal", "m3", null],
  ["pbb_selected_backfill_volume_m3", "Объём выбранной обратной засыпки", "decimal", "m3", null],
  ["pbb_warning_tape_designation", "Марка сигнальной ленты", "text", null, null],
  ["pbb_warning_tape_length_m", "Длина сигнальной ленты", "decimal", "m", null],
  ["pbb_trench_bottom_preparation_area_m2", "Площадь подготовки дна траншеи", "decimal", "m2", null],
  ["pbb_excess_soil_volume_m3", "Объём вывоза вытесненного грунта", "decimal", "m3", null],
  ["pbb_compaction_test_count", "Количество испытаний уплотнения", "decimal", "test", null],
  ["pbb_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["pbb_survey_labor_h", "Труд по контролю отметок", "decimal", "man_hour", null],
  ["pbb_material_placing_labor_h", "Труд по укладке материалов", "decimal", "man_hour", null],
  ["pbb_compaction_labor_h", "Труд по послойному уплотнению", "decimal", "man_hour", null],
  ["pbb_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["pbb_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["pbb_loader_machine_h", "Работа погрузчика", "decimal", "machine_hour", null],
  ["pbb_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["pbb_water_bowser_machine_h", "Работа поливомоечной машины", "decimal", "machine_hour", null],
  ["pbb_test_equipment_machine_h", "Работа оборудования контроля плотности", "decimal", "machine_hour", null],
  ["pbb_delivery_trip_count", "Рейсы доставки материалов", "integer", "trip", null],
  ["pbb_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["pbb_unsuitable_soil_replacement_mode", "Замена непригодного грунта требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pbb_unsuitable_soil_replacement_designation", "Материал замены непригодного грунта", "text", null, null],
  ["pbb_unsuitable_soil_replacement_volume_m3", "Объём замены непригодного грунта", "decimal", "m3", null],
  ["pbb_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pbb_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["pbb_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["pbb_shoring_mode", "Крепление траншеи требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pbb_shoring_designation", "Система крепления траншеи", "text", null, null],
  ["pbb_shoring_area_m2", "Площадь крепления траншеи", "decimal", "m2", null],
] as const);
function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("pbb_unsuitable_soil_replacement_")
    && parameterId !== "pbb_unsuitable_soil_replacement_mode" ? "pbb_unsuitable_soil_replacement_mode"
    : parameterId.startsWith("pbb_dewatering_") && parameterId !== "pbb_dewatering_mode"
      ? "pbb_dewatering_mode" : parameterId.startsWith("pbb_shoring_")
        && parameterId !== "pbb_shoring_mode" ? "pbb_shoring_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type PipeBeddingBackfillParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const PIPE_BEDDING_BACKFILL_PARAMETERS: readonly PipeBeddingBackfillParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "pbb_bedding_retained_reserve_m3" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.pipe-bedding-backfill-r1",
      semantic_parameter_key: `pipe-bedding-backfill:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_PIPE_SUPPORT_ZONE_METHOD_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, профилю и конструкции зоны опирания.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_SUPPORT_ZONE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PIPE_SUPPORT_ZONE_PROJECT_DOCUMENTATION",
        source_document: PIPE_BEDDING_BACKFILL_SOURCE_ID,
        source_locator: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.exact_locator,
        guide_version: "pipe-bedding-backfill-r1",
        source_snapshot_hash: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для зоны опирания, постели, обсыпки и выбранной засыпки; труба, колодцы, соединения и испытание сети исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);
export const PIPE_BEDDING_BACKFILL_RUNTIME_INPUT = Object.freeze({
  pbb_bedding_retained_reserve_m3: 0, pbb_bedding_supplier_load_m3: 1,
});
export const PIPE_BEDDING_BACKFILL_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(PIPE_BEDDING_BACKFILL_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const PIPE_BEDDING_BACKFILL_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(PIPE_BEDDING_BACKFILL_RUNTIME_INPUT).map((id) => [id, [PIPE_BEDDING_BACKFILL_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:pbb_acceptance", section: "Работы", category: "construction_work", titleRu: "Устройство и приёмка зоны опирания и засыпки", unitId: "m", formulaId: "pbb_acceptance_length_v1", expression: "pbb_route_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb_geotextile", section: "Материалы", category: "material", titleRu: "Геотекстиль зоны опирания", unitId: "m2", formulaId: "pbb_geotextile_area_v1", expression: "pbb_geotextile_area_m2", procurementEligible: true, titleParameterIds: ["pbb_geotextile_designation"] },
  { rowId: "rc09:pbb_foundation_aggregate", section: "Материалы", category: "material", titleRu: "Нижнее основание", unitId: "m3", formulaId: "pbb_foundation_aggregate_volume_v1", expression: "pbb_foundation_aggregate_volume_m3", procurementEligible: true, titleParameterIds: ["pbb_foundation_aggregate_designation"] },
  { rowId: "rc09:pbb_bedding_surround", section: "Материалы", category: "material", titleRu: "Материал постели и обсыпки", unitId: "m3", formulaId: "pbb_bedding_order_volume_v1", expression: "ceil((pbb_bedding_surround_installed_volume_m3+pbb_bedding_retained_reserve_m3)/pbb_bedding_supplier_load_m3)*pbb_bedding_supplier_load_m3", procurementEligible: true, titleParameterIds: ["pbb_bedding_material"] },
  { rowId: "rc09:pbb_selected_backfill", section: "Материалы", category: "material", titleRu: "Выбранная обратная засыпка", unitId: "m3", formulaId: "pbb_selected_backfill_volume_v1", expression: "pbb_selected_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["pbb_backfill_material"] },
  { rowId: "rc09:pbb_warning_tape", section: "Комплектующие", category: "material", titleRu: "Сигнальная лента", unitId: "m", formulaId: "pbb_warning_tape_length_v1", expression: "pbb_warning_tape_length_m", procurementEligible: true, titleParameterIds: ["pbb_warning_tape_designation"] },
  { rowId: "rc09:pbb_trench_bottom_preparation", section: "Работы", category: "construction_work", titleRu: "Подготовка дна траншеи", unitId: "m2", formulaId: "pbb_trench_bottom_preparation_area_v1", expression: "pbb_trench_bottom_preparation_area_m2" },
  { rowId: "rc09:pbb_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз вытесненного грунта", unitId: "m3", formulaId: "pbb_excess_soil_volume_v1", expression: "pbb_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:pbb_compaction_tests", section: "Контроль", category: "service", titleRu: "Контроль уплотнения засыпки", unitId: "test", formulaId: "pbb_compaction_test_count_v1", expression: "pbb_compaction_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb_asbuilt_documents", section: "Документы", category: "service", titleRu: "Исполнительная документация зоны опирания и засыпки", unitId: "document", formulaId: "pbb_asbuilt_document_count_v1", expression: "pbb_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb_unsuitable_soil_replacement", section: "Условные материалы", category: "material", titleRu: "Замена непригодного грунта", unitId: "m3", formulaId: "pbb_unsuitable_soil_replacement_volume_v1", expression: "pbb_unsuitable_soil_replacement_volume_m3", procurementEligible: true, inclusionAst: equals("pbb_unsuitable_soil_replacement_mode", "REQUIRED"), titleParameterIds: ["pbb_unsuitable_soil_replacement_designation"] },
  { rowId: "rc09:pbb_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из траншеи", unitId: "machine_hour", formulaId: "pbb_dewatering_machine_v1", expression: "pbb_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("pbb_dewatering_mode", "REQUIRED"), titleParameterIds: ["pbb_dewatering_designation"] },
  { rowId: "rc09:pbb_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление траншеи", unitId: "m2", formulaId: "pbb_shoring_area_v1", expression: "pbb_shoring_area_m2", procurementEligible: true, inclusionAst: equals("pbb_shoring_mode", "REQUIRED"), titleParameterIds: ["pbb_shoring_designation"] },
  { rowId: "rc09:pbb-bedding-balance:installed-net", section: "Баланс материала", category: "material", titleRu: "Проектный объём постели и обсыпки", unitId: "m3", formulaId: "pbb_bedding_installed_net_v1", expression: "pbb_bedding_surround_installed_volume_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb-bedding-balance:retained-reserve", section: "Баланс материала", category: "material", titleRu: "Сохраняемый резерв материала", unitId: "m3", formulaId: "pbb_bedding_retained_reserve_v1", expression: "pbb_bedding_retained_reserve_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb-bedding-balance:total-need", section: "Баланс материала", category: "material", titleRu: "Общая потребность в материале", unitId: "m3", formulaId: "pbb_bedding_total_need_v1", expression: "pbb_bedding_surround_installed_volume_m3+pbb_bedding_retained_reserve_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb-bedding-balance:load-count", section: "Баланс материала", category: "material", titleRu: "Количество поставочных партий", unitId: "load", formulaId: "pbb_bedding_load_count_v1", expression: "ceil((pbb_bedding_surround_installed_volume_m3+pbb_bedding_retained_reserve_m3)/pbb_bedding_supplier_load_m3)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb-bedding-balance:remainder", section: "Баланс материала", category: "material", titleRu: "Остаток материала после укладки", unitId: "m3", formulaId: "pbb_bedding_remainder_v1", expression: "ceil((pbb_bedding_surround_installed_volume_m3+pbb_bedding_retained_reserve_m3)/pbb_bedding_supplier_load_m3)*pbb_bedding_supplier_load_m3-pbb_bedding_surround_installed_volume_m3", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:pbb-bedding-balance:surplus-beyond-reserve", section: "Баланс материала", category: "material", titleRu: "Свободный остаток сверх резерва", unitId: "m3", formulaId: "pbb_bedding_surplus_v1", expression: "max(0,ceil((pbb_bedding_surround_installed_volume_m3+pbb_bedding_retained_reserve_m3)/pbb_bedding_supplier_load_m3)*pbb_bedding_supplier_load_m3-pbb_bedding_surround_installed_volume_m3-pbb_bedding_retained_reserve_m3)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:pbb-survey", section: "Труд", category: "construction_work", titleRu: "Контроль отметок и профиля", unitId: "man_hour", formulaId: "pbb_survey_labor_v1", expression: "pbb_survey_labor_h" },
  { rowId: "rc09:labor:pbb-material-placing", section: "Труд", category: "construction_work", titleRu: "Укладка материалов", unitId: "man_hour", formulaId: "pbb_material_placing_labor_v1", expression: "pbb_material_placing_labor_h" },
  { rowId: "rc09:labor:pbb-compaction", section: "Труд", category: "construction_work", titleRu: "Послойное уплотнение", unitId: "man_hour", formulaId: "pbb_compaction_labor_v1", expression: "pbb_compaction_labor_h" },
  { rowId: "rc09:labor:pbb-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль и документация", unitId: "man_hour", formulaId: "pbb_qa_documentation_labor_v1", expression: "pbb_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:pbb-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор", unitId: "machine_hour", formulaId: "pbb_excavator_machine_v1", expression: "pbb_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:pbb-loader", section: "Механизмы", category: "equipment", titleRu: "Погрузчик", unitId: "machine_hour", formulaId: "pbb_loader_machine_v1", expression: "pbb_loader_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:pbb-compactor", section: "Механизмы", category: "equipment", titleRu: "Уплотняющий механизм", unitId: "machine_hour", formulaId: "pbb_compactor_machine_v1", expression: "pbb_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:pbb-water-bowser", section: "Механизмы", category: "equipment", titleRu: "Поливомоечная машина", unitId: "machine_hour", formulaId: "pbb_water_bowser_machine_v1", expression: "pbb_water_bowser_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:pbb-test-equipment", section: "Механизмы", category: "equipment", titleRu: "Оборудование контроля плотности", unitId: "machine_hour", formulaId: "pbb_test_equipment_machine_v1", expression: "pbb_test_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:pbb-delivery", section: "Логистика", category: "service", titleRu: "Доставка материалов", unitId: "trip", formulaId: "pbb_delivery_trip_v1", expression: "pbb_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:pbb-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "pbb_removal_trip_v1", expression: "pbb_removal_trip_count", procurementEligible: true },
]);
export const PIPE_BEDDING_BACKFILL_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const PIPE_BEDDING_BACKFILL_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `pipe-bedding-backfill:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_PIPE_SUPPORT_ZONE_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: PIPE_BEDDING_BACKFILL_SOURCE_ID,
        source_id: PIPE_BEDDING_BACKFILL_SOURCE_ID, normId: PIPE_BEDDING_BACKFILL_NORM_ID,
        norm_id: PIPE_BEDDING_BACKFILL_NORM_ID,
        normVersion: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.source_document_version,
        source_title: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.source_title,
        exact_locator: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.exact_locator,
        source_definition_hash: PIPE_BEDDING_BACKFILL_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["pipe supply or laying, manholes, connections or network testing",
        "route-derived material, earthwork, labor or mechanism quantity",
        "automatic unsuitable-soil replacement, dewatering or shoring",
        "automatic retained reserve or supplier load", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const PIPE_BEDDING_BACKFILL_SHORT_INPUT = Object.freeze({
  pbb_route_length_m: 850, pbb_pipe_outside_diameter_mm: 315,
  pbb_assembly_designation: "BDF-315-GTX300-SAND-PGS-K095",
  pbb_geotextile_designation: "GEOTEXTILE-300-GSM", pbb_bedding_material: "WASHED_SAND",
  pbb_bedding_thickness_mm: 150, pbb_surround_cover_above_pipe_mm: 300,
  pbb_backfill_material: "SAND_GRAVEL_MIX", pbb_compaction_coefficient: 0.95,
  pbb_bedding_surround_installed_volume_m3: 180, ...PIPE_BEDDING_BACKFILL_RUNTIME_INPUT,
});
export const PIPE_BEDDING_BACKFILL_ACCEPTANCE_INPUT = Object.freeze({
  ...PIPE_BEDDING_BACKFILL_SHORT_INPUT, pbb_geotextile_area_m2: 1100,
  pbb_foundation_aggregate_designation: "Щебень 20-40", pbb_foundation_aggregate_volume_m3: 95,
  pbb_selected_backfill_volume_m3: 620,
  pbb_warning_tape_designation: "Лента сигнальная канализация", pbb_warning_tape_length_m: 880,
  pbb_trench_bottom_preparation_area_m2: 1020, pbb_excess_soil_volume_m3: 275,
  pbb_compaction_test_count: 34, pbb_asbuilt_document_count: 1,
  pbb_survey_labor_h: 80, pbb_material_placing_labor_h: 520,
  pbb_compaction_labor_h: 360, pbb_qa_documentation_labor_h: 96,
  pbb_excavator_machine_h: 70, pbb_loader_machine_h: 85, pbb_compactor_machine_h: 120,
  pbb_water_bowser_machine_h: 48, pbb_test_equipment_machine_h: 34,
  pbb_delivery_trip_count: 58, pbb_removal_trip_count: 24,
  pbb_unsuitable_soil_replacement_mode: "NOT_REQUIRED", pbb_dewatering_mode: "NOT_REQUIRED",
  pbb_shoring_mode: "NOT_REQUIRED",
});
export async function compilePipeBeddingBackfillR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PIPE_BEDDING_BACKFILL_CATALOG_ID;
  if (catalogId !== PIPE_BEDDING_BACKFILL_CATALOG_ID) {
    throw new Error(`PIPE_BEDDING_BACKFILL_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pipe-bedding-backfill-r1", catalogId,
    primaryMeasureParameterId: "pbb_route_length_m",
    parameterDefinitions: [...PIPE_BEDDING_BACKFILL_PARAMETERS],
    formulaDefinitions: [...PIPE_BEDDING_BACKFILL_FORMULAS],
    resourceDefinitions: [...PIPE_BEDDING_BACKFILL_RESOURCES], submittedParameters,
    confirmedParameters: { ...PIPE_BEDDING_BACKFILL_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
