import { compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition, type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const HYDRAULIC_TESTING_CATALOG_ID = "canonical-work:expanded:hydraulic_testing";
export const HYDRAULIC_TESTING_SOURCE_ID = "project_pipeline_hydraulic_pressure_leak_test_balance_v1";
export const HYDRAULIC_TESTING_NORM_ID = "norm:project:pipeline:hydraulic_pressure_leak_test_balance:v1";
export const HYDRAULIC_TESTING_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая программа гидравлического испытания трубопровода на давление и герметичность, ведомость объёмов и схема изоляции участков",
  source_authority: "Проектировщик трубопровода, разработчик программы испытаний, поверочная лаборатория, поставщик воды, организация утилизации и утверждающий инженер проекта",
  source_document_version: "PROJECT_PIPELINE_HYDRAULIC_TEST_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "ece0792ee1576f9db9419ab2ffe43051b9f5dfe8ed2eac9d71ee1e6b71d89c0a",
  exact_locator: "Гидравлическое испытание 1200 м напорного канализационного трубопровода PE100 SDR17 OD 250 PN10, 4 изолированных участка, 8 временных заглушек PE250-PN10-TEST-CAP, давление 1,0 МПа, выдержка 120 мин, процедура HT-PE250-PN10-4S-1.0MPA-120MIN",
  use_restriction: "Длина, диаметр и число участков не определяют автоматически воду, труд, механизмы или логистику. Привозная вода, обработка и вывоз воды включаются только по проекту. Поставка и укладка трубы, траншея, постель, засыпка, колодцы и пусконаладка за пределами выбранного испытания исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "ece0792ee1576f9db9419ab2ffe43051b9f5dfe8ed2eac9d71ee1e6b71d89c0a",
});

const KNOWN_SCOPE = ["hyd_tested_length_m", "hyd_pipe_material", "hyd_pipe_sdr",
  "hyd_pipe_outside_diameter_mm", "hyd_pressure_class", "hyd_test_section_count",
  "hyd_temporary_closure_installed_piece", "hyd_closure_designation",
  "hyd_test_pressure_mpa", "hyd_hold_duration_min", "hyd_procedure_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "hyd_closure_retained_spare_piece", "hyd_closure_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "hyd_imported_water_designation", "hyd_imported_water_volume_m3",
  "hyd_water_treatment_designation", "hyd_water_treatment_volume_m3",
  "hyd_offsite_disposal_designation", "hyd_offsite_disposal_volume_m3",
]);

const PARAMETER_SPECS = Object.freeze([
  ["hyd_tested_length_m", "Длина испытываемого трубопровода", "decimal", "m", null],
  ["hyd_pipe_material", "Материал трубопровода", "text", null, null],
  ["hyd_pipe_sdr", "Размерное отношение трубы SDR", "text", null, null],
  ["hyd_pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["hyd_pressure_class", "Класс давления трубопровода", "text", null, null],
  ["hyd_test_section_count", "Количество изолированных испытательных участков", "integer", "section", null],
  ["hyd_temporary_closure_installed_piece", "Установленное количество временных заглушек", "integer", "piece", null],
  ["hyd_closure_designation", "Марка временных испытательных заглушек", "text", null, null],
  ["hyd_test_pressure_mpa", "Испытательное давление", "decimal", "MPa", null],
  ["hyd_hold_duration_min", "Продолжительность выдержки", "integer", "minute", null],
  ["hyd_procedure_designation", "Обозначение утверждённой процедуры испытания", "text", null, null],
  ["hyd_closure_retained_spare_piece", "Сохраняемый запас временных заглушек", "integer", "piece", null],
  ["hyd_closure_supplier_package_quantity_piece", "Количество заглушек в упаковке поставщика", "integer", "piece", null],
  ["hyd_pressure_gauge_designation", "Марка поверенного манометра", "text", null, null],
  ["hyd_pressure_gauge_quantity_piece", "Количество поверенных манометров", "integer", "piece", null],
  ["hyd_recorder_designation", "Марка регистратора давления", "text", null, null],
  ["hyd_recorder_quantity_piece", "Количество регистраторов давления", "integer", "piece", null],
  ["hyd_hose_manifold_designation", "Марка рукавов и испытательного коллектора", "text", null, null],
  ["hyd_hose_manifold_quantity_set", "Количество комплектов рукавов и коллекторов", "integer", "set", null],
  ["hyd_fill_water_volume_m3", "Объём воды для заполнения", "decimal", "m3", null],
  ["hyd_approved_onsite_disposal_volume_m3", "Объём контролируемого сброса воды на площадке", "decimal", "m3", null],
  ["hyd_leak_check_count", "Количество проверок герметичности", "integer", "test", null],
  ["hyd_pressure_record_count", "Количество записей давления", "integer", "document", null],
  ["hyd_acceptance_document_count", "Количество комплектов актов испытания", "integer", "document", null],
  ["hyd_preparation_isolation_labor_h", "Труд на подготовку и изоляцию участков", "decimal", "man_hour", null],
  ["hyd_filling_pressurizing_labor_h", "Труд на заполнение и подъём давления", "decimal", "man_hour", null],
  ["hyd_holding_inspection_labor_h", "Труд на выдержку и осмотр", "decimal", "man_hour", null],
  ["hyd_depressurization_restoration_labor_h", "Труд на сброс давления и восстановление схемы", "decimal", "man_hour", null],
  ["hyd_qa_documentation_labor_h", "Труд на контроль качества и оформление", "decimal", "man_hour", null],
  ["hyd_pressure_test_pump_machine_h", "Работа опрессовочного насоса", "decimal", "machine_hour", null],
  ["hyd_water_transfer_pump_machine_h", "Работа насоса заполнения и отвода воды", "decimal", "machine_hour", null],
  ["hyd_generator_machine_h", "Работа генератора", "decimal", "machine_hour", null],
  ["hyd_safety_lighting_machine_h", "Работа оборудования освещения и ограждения", "decimal", "machine_hour", null],
  ["hyd_calibration_equipment_machine_h", "Работа контрольного поверочного оборудования", "decimal", "machine_hour", null],
  ["hyd_equipment_delivery_trip_count", "Рейсы доставки испытательного оборудования", "integer", "trip", null],
  ["hyd_water_logistics_trip_count", "Рейсы водоснабжения и обращения с водой", "integer", "trip", null],
  ["hyd_imported_water_mode", "Привозная вода требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["hyd_imported_water_designation", "Источник привозной воды", "text", null, null],
  ["hyd_imported_water_volume_m3", "Объём привозной воды", "decimal", "m3", null],
  ["hyd_water_treatment_mode", "Обработка испытательной воды требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["hyd_water_treatment_designation", "Способ обработки испытательной воды", "text", null, null],
  ["hyd_water_treatment_volume_m3", "Объём обработки испытательной воды", "decimal", "m3", null],
  ["hyd_offsite_disposal_mode", "Вывоз испытательной воды требуется", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["hyd_offsite_disposal_designation", "Маршрут и способ вывоза испытательной воды", "text", null, null],
  ["hyd_offsite_disposal_volume_m3", "Объём вывоза испытательной воды", "decimal", "m3", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("hyd_imported_water_")
    && parameterId !== "hyd_imported_water_mode" ? "hyd_imported_water_mode"
    : parameterId.startsWith("hyd_water_treatment_")
      && parameterId !== "hyd_water_treatment_mode" ? "hyd_water_treatment_mode"
      : parameterId.startsWith("hyd_offsite_disposal_")
        && parameterId !== "hyd_offsite_disposal_mode" ? "hyd_offsite_disposal_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}

export type HydraulicTestingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const HYDRAULIC_TESTING_PARAMETERS: readonly HydraulicTestingParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "hyd_closure_retained_spare_piece" ? 0
          : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.hydraulic-testing-r1",
      semantic_parameter_key: `hydraulic-testing:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_HYDRAULIC_TEST_PROCEDURE_BOQ_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу и утверждённой программе испытаний.`
          : `${titleRu}: укажите по программе испытаний, ведомости объёмов, ППР или документам качества.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_TEST_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_HYDRAULIC_TEST_PROJECT_DOCUMENTATION",
        source_document: HYDRAULIC_TESTING_SOURCE_ID,
        source_locator: HYDRAULIC_TESTING_SOURCE_METADATA.exact_locator,
        guide_version: "hydraulic-testing-r1",
        source_snapshot_hash: HYDRAULIC_TESTING_SOURCE_METADATA.artifact_sha256,
        applicability: "Только гидравлическое испытание выбранных изолированных участков на давление и герметичность; строительство трубопровода и последующая пусконаладка исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true, runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false },
  })),
);

export const HYDRAULIC_TESTING_RUNTIME_INPUT = Object.freeze({
  hyd_closure_retained_spare_piece: 0, hyd_closure_supplier_package_quantity_piece: 1,
});
export const HYDRAULIC_TESTING_RUNTIME_CLASSIFICATION = Object.freeze(Object.fromEntries(
  Object.keys(HYDRAULIC_TESTING_RUNTIME_INPUT).map((id) => [id, "ASSUMPTION"]),
) as Readonly<Record<string, "ASSUMPTION">>);
export const HYDRAULIC_TESTING_RUNTIME_SOURCE_IDS = Object.freeze(Object.fromEntries(
  Object.keys(HYDRAULIC_TESTING_RUNTIME_INPUT).map((id) => [id, [HYDRAULIC_TESTING_SOURCE_ID]]),
) as Readonly<Record<string, readonly string[]>>);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:hyd_acceptance", section: "Работы", category: "construction_work", titleRu: "Гидравлическое испытание трубопровода на давление и герметичность", unitId: "m", formulaId: "hyd_acceptance_length_v1", expression: "hyd_tested_length_m", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd_closures", section: "Комплектующие", category: "material", titleRu: "Временные испытательные заглушки", unitId: "piece", formulaId: "hyd_closure_order_quantity_v1", expression: "ceil((hyd_temporary_closure_installed_piece+hyd_closure_retained_spare_piece)/hyd_closure_supplier_package_quantity_piece)*hyd_closure_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["hyd_closure_designation"] },
  { rowId: "rc09:hyd_pressure_gauges", section: "Комплектующие", category: "material", titleRu: "Поверенные манометры", unitId: "piece", formulaId: "hyd_pressure_gauge_quantity_v1", expression: "hyd_pressure_gauge_quantity_piece", procurementEligible: true, titleParameterIds: ["hyd_pressure_gauge_designation"] },
  { rowId: "rc09:hyd_recorder", section: "Комплектующие", category: "material", titleRu: "Регистраторы давления", unitId: "piece", formulaId: "hyd_recorder_quantity_v1", expression: "hyd_recorder_quantity_piece", procurementEligible: true, titleParameterIds: ["hyd_recorder_designation"] },
  { rowId: "rc09:hyd_hose_manifold", section: "Комплектующие", category: "material", titleRu: "Рукава высокого давления и испытательный коллектор", unitId: "set", formulaId: "hyd_hose_manifold_quantity_v1", expression: "hyd_hose_manifold_quantity_set", procurementEligible: true, titleParameterIds: ["hyd_hose_manifold_designation"] },
  { rowId: "rc09:hyd_fill_water", section: "Материалы", category: "material", titleRu: "Вода для заполнения испытываемых участков", unitId: "m3", formulaId: "hyd_fill_water_volume_v1", expression: "hyd_fill_water_volume_m3", procurementEligible: true },
  { rowId: "rc09:hyd_onsite_disposal", section: "Услуги", category: "service", titleRu: "Контролируемый сброс испытательной воды на площадке", unitId: "m3", formulaId: "hyd_onsite_disposal_volume_v1", expression: "hyd_approved_onsite_disposal_volume_m3", procurementEligible: true },
  { rowId: "rc09:hyd_leak_checks", section: "Контроль", category: "service", titleRu: "Проверки герметичности изолированных участков", unitId: "test", formulaId: "hyd_leak_check_count_v1", expression: "hyd_leak_check_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd_pressure_records", section: "Контроль", category: "service", titleRu: "Записи давления по испытательным участкам", unitId: "document", formulaId: "hyd_pressure_record_count_v1", expression: "hyd_pressure_record_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd_acceptance_documents", section: "Документы", category: "service", titleRu: "Акты гидравлического испытания", unitId: "document", formulaId: "hyd_acceptance_document_count_v1", expression: "hyd_acceptance_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd_imported_water", section: "Условные услуги", category: "service", titleRu: "Привозное водоснабжение испытаний", unitId: "m3", formulaId: "hyd_imported_water_volume_v1", expression: "hyd_imported_water_volume_m3", procurementEligible: true, inclusionAst: equals("hyd_imported_water_mode", "REQUIRED"), titleParameterIds: ["hyd_imported_water_designation"] },
  { rowId: "rc09:hyd_water_treatment", section: "Условные услуги", category: "service", titleRu: "Обработка испытательной воды", unitId: "m3", formulaId: "hyd_water_treatment_volume_v1", expression: "hyd_water_treatment_volume_m3", procurementEligible: true, inclusionAst: equals("hyd_water_treatment_mode", "REQUIRED"), titleParameterIds: ["hyd_water_treatment_designation"] },
  { rowId: "rc09:hyd_offsite_disposal", section: "Условные услуги", category: "service", titleRu: "Вывоз испытательной воды", unitId: "m3", formulaId: "hyd_offsite_disposal_volume_v1", expression: "hyd_offsite_disposal_volume_m3", procurementEligible: true, inclusionAst: equals("hyd_offsite_disposal_mode", "REQUIRED"), titleParameterIds: ["hyd_offsite_disposal_designation"] },
  { rowId: "rc09:hyd-closure-balance:installed-net", section: "Баланс заглушек", category: "material", titleRu: "Установленные временные заглушки", unitId: "piece", formulaId: "hyd_closure_installed_net_v1", expression: "hyd_temporary_closure_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd-closure-balance:retained-spare", section: "Баланс заглушек", category: "material", titleRu: "Сохраняемый запас временных заглушек", unitId: "piece", formulaId: "hyd_closure_retained_spare_v1", expression: "hyd_closure_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd-closure-balance:total-need", section: "Баланс заглушек", category: "material", titleRu: "Общая потребность во временных заглушках", unitId: "piece", formulaId: "hyd_closure_total_need_v1", expression: "hyd_temporary_closure_installed_piece+hyd_closure_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd-closure-balance:package-count", section: "Баланс заглушек", category: "material", titleRu: "Количество упаковок временных заглушек", unitId: "package", formulaId: "hyd_closure_package_count_v1", expression: "ceil((hyd_temporary_closure_installed_piece+hyd_closure_retained_spare_piece)/hyd_closure_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd-closure-balance:remainder", section: "Баланс заглушек", category: "material", titleRu: "Остаток заглушек после установки", unitId: "piece", formulaId: "hyd_closure_remainder_v1", expression: "ceil((hyd_temporary_closure_installed_piece+hyd_closure_retained_spare_piece)/hyd_closure_supplier_package_quantity_piece)*hyd_closure_supplier_package_quantity_piece-hyd_temporary_closure_installed_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:hyd-closure-balance:surplus-beyond-spare", section: "Баланс заглушек", category: "material", titleRu: "Свободный остаток заглушек сверх запаса", unitId: "piece", formulaId: "hyd_closure_surplus_v1", expression: "max(0,ceil((hyd_temporary_closure_installed_piece+hyd_closure_retained_spare_piece)/hyd_closure_supplier_package_quantity_piece)*hyd_closure_supplier_package_quantity_piece-hyd_temporary_closure_installed_piece-hyd_closure_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:hyd-preparation-isolation", section: "Труд", category: "construction_work", titleRu: "Подготовка и изоляция испытательных участков", unitId: "man_hour", formulaId: "hyd_preparation_isolation_labor_v1", expression: "hyd_preparation_isolation_labor_h" },
  { rowId: "rc09:labor:hyd-filling-pressurizing", section: "Труд", category: "construction_work", titleRu: "Заполнение участков и подъём давления", unitId: "man_hour", formulaId: "hyd_filling_pressurizing_labor_v1", expression: "hyd_filling_pressurizing_labor_h" },
  { rowId: "rc09:labor:hyd-holding-inspection", section: "Труд", category: "construction_work", titleRu: "Выдержка под давлением и осмотр", unitId: "man_hour", formulaId: "hyd_holding_inspection_labor_v1", expression: "hyd_holding_inspection_labor_h" },
  { rowId: "rc09:labor:hyd-depressurization-restoration", section: "Труд", category: "construction_work", titleRu: "Сброс давления и восстановление испытательной схемы", unitId: "man_hour", formulaId: "hyd_depressurization_restoration_labor_v1", expression: "hyd_depressurization_restoration_labor_h" },
  { rowId: "rc09:labor:hyd-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Контроль качества и оформление результатов", unitId: "man_hour", formulaId: "hyd_qa_documentation_labor_v1", expression: "hyd_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:hyd-pressure-test-pump", section: "Механизмы", category: "equipment", titleRu: "Опрессовочный насос", unitId: "machine_hour", formulaId: "hyd_pressure_test_pump_machine_v1", expression: "hyd_pressure_test_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:hyd-water-transfer-pump", section: "Механизмы", category: "equipment", titleRu: "Насос заполнения и отвода воды", unitId: "machine_hour", formulaId: "hyd_water_transfer_pump_machine_v1", expression: "hyd_water_transfer_pump_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:hyd-generator", section: "Механизмы", category: "equipment", titleRu: "Генератор", unitId: "machine_hour", formulaId: "hyd_generator_machine_v1", expression: "hyd_generator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:hyd-safety-lighting", section: "Механизмы", category: "equipment", titleRu: "Оборудование освещения и ограждения", unitId: "machine_hour", formulaId: "hyd_safety_lighting_machine_v1", expression: "hyd_safety_lighting_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:hyd-calibration", section: "Механизмы", category: "equipment", titleRu: "Контрольное поверочное оборудование", unitId: "machine_hour", formulaId: "hyd_calibration_equipment_machine_v1", expression: "hyd_calibration_equipment_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:hyd-equipment-delivery", section: "Логистика", category: "service", titleRu: "Доставка испытательного оборудования", unitId: "trip", formulaId: "hyd_equipment_delivery_trip_v1", expression: "hyd_equipment_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:hyd-water", section: "Логистика", category: "service", titleRu: "Логистика водоснабжения и обращения с водой", unitId: "trip", formulaId: "hyd_water_logistics_trip_v1", expression: "hyd_water_logistics_trip_count", procurementEligible: true },
]);

export const HYDRAULIC_TESTING_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression); return {
    formula_id: row.formulaId, output_unit_id: row.unitId, expression_source: row.expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const HYDRAULIC_TESTING_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `hydraulic-testing:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_HYDRAULIC_TEST_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: HYDRAULIC_TESTING_SOURCE_ID,
        source_id: HYDRAULIC_TESTING_SOURCE_ID, normId: HYDRAULIC_TESTING_NORM_ID,
        norm_id: HYDRAULIC_TESTING_NORM_ID,
        normVersion: HYDRAULIC_TESTING_SOURCE_METADATA.source_document_version,
        source_title: HYDRAULIC_TESTING_SOURCE_METADATA.source_title,
        exact_locator: HYDRAULIC_TESTING_SOURCE_METADATA.exact_locator,
        source_definition_hash: HYDRAULIC_TESTING_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: [
        "pipe supply or laying, trench, bedding, backfill, manholes or later commissioning",
        "tested-length-derived water, labor, mechanism or logistics quantity",
        "automatic imported-water supply, treatment or off-site disposal",
        "automatic retained spare or supplier package", "invented price",
      ] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);

export const HYDRAULIC_TESTING_SHORT_INPUT = Object.freeze({
  hyd_tested_length_m: 1200, hyd_pipe_material: "PE100", hyd_pipe_sdr: "SDR17",
  hyd_pipe_outside_diameter_mm: 250, hyd_pressure_class: "PN10", hyd_test_section_count: 4,
  hyd_temporary_closure_installed_piece: 8, hyd_closure_designation: "PE250-PN10-TEST-CAP",
  hyd_test_pressure_mpa: 1, hyd_hold_duration_min: 120,
  hyd_procedure_designation: "HT-PE250-PN10-4S-1.0MPA-120MIN",
  ...HYDRAULIC_TESTING_RUNTIME_INPUT,
});
export const HYDRAULIC_TESTING_ACCEPTANCE_INPUT = Object.freeze({
  ...HYDRAULIC_TESTING_SHORT_INPUT,
  hyd_pressure_gauge_designation: "PG-1.6MPA-CL0.6", hyd_pressure_gauge_quantity_piece: 8,
  hyd_recorder_designation: "PR-1.6MPA-CAL", hyd_recorder_quantity_piece: 4,
  hyd_hose_manifold_designation: "HM-PE250-PN10", hyd_hose_manifold_quantity_set: 4,
  hyd_fill_water_volume_m3: 75, hyd_approved_onsite_disposal_volume_m3: 75,
  hyd_leak_check_count: 4, hyd_pressure_record_count: 4, hyd_acceptance_document_count: 1,
  hyd_preparation_isolation_labor_h: 80, hyd_filling_pressurizing_labor_h: 120,
  hyd_holding_inspection_labor_h: 96, hyd_depressurization_restoration_labor_h: 64,
  hyd_qa_documentation_labor_h: 64, hyd_pressure_test_pump_machine_h: 80,
  hyd_water_transfer_pump_machine_h: 60, hyd_generator_machine_h: 48,
  hyd_safety_lighting_machine_h: 32, hyd_calibration_equipment_machine_h: 24,
  hyd_equipment_delivery_trip_count: 4, hyd_water_logistics_trip_count: 8,
  hyd_imported_water_mode: "NOT_REQUIRED", hyd_water_treatment_mode: "NOT_REQUIRED",
  hyd_offsite_disposal_mode: "NOT_REQUIRED",
});

export async function compileHydraulicTestingR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? HYDRAULIC_TESTING_CATALOG_ID;
  if (catalogId !== HYDRAULIC_TESTING_CATALOG_ID) {
    throw new Error(`HYDRAULIC_TESTING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.hydraulic-testing-r1", catalogId,
    primaryMeasureParameterId: "hyd_tested_length_m",
    parameterDefinitions: [...HYDRAULIC_TESTING_PARAMETERS],
    formulaDefinitions: [...HYDRAULIC_TESTING_FORMULAS],
    resourceDefinitions: [...HYDRAULIC_TESTING_RESOURCES], submittedParameters,
    confirmedParameters: { ...HYDRAULIC_TESTING_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
