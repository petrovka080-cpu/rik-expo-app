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
export const RAINWATER_INLETS_CATALOG_ID = "canonical-work:expanded:rainwater_inlets";
export const RAINWATER_INLETS_SOURCE_ID =
  "project_rainwater_inlet_assembly_earthwork_qa_balance_v1";
export const RAINWATER_INLETS_NORM_ID =
  "norm:project:rainwater_inlet:assembly_earthwork_qa_balance:v1";
export const RAINWATER_INLETS_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план и ведомость дождеприёмников, спецификации корпусов, решёток, рам, выпусков и комплектующих, ППР и программа контроля",
  source_authority: "Проектная организация ливневого водоотведения, изготовители корпусов и решёток, инженер-геолог, лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_RAINWATER_INLET_ASSEMBLY_EARTHWORK_LABOR_EQUIPMENT_QA_LOGISTICS_BALANCE_S27_24",
  definition_hash: "366f6da0e1c32001a168844b83f95f02d2f4a5b62869b4b1ff6b9fa3650675fd",
  exact_locator: "28 дождеприёмников DB2 из сборного железобетона с чугунной решёткой D400 и выпуском DN 200; корпуса, рамы, соединения, земляные объёмы, труд, механизмы и логистика — только по проекту",
  use_restriction: "Количество и трасса не определяют автоматически земляные объёмы, комплектующие, труд или механизмы. Водоотлив, крепление и восстановление покрытия включаются только по проекту. Трубная сеть, колодцы, пескоуловители и полное выпускное сооружение исключены.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "366f6da0e1c32001a168844b83f95f02d2f4a5b62869b4b1ff6b9fa3650675fd",
});
const KNOWN_SCOPE = ["rwi_inlet_count", "rwi_body_designation", "rwi_body_material",
  "rwi_grating_material", "rwi_grating_load_class", "rwi_outlet_diameter_mm",
  "rwi_assembly_designation"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "rwi_body_retained_spare_piece", "rwi_body_supplier_package_quantity_piece",
]);
const CONDITIONAL_DETAILS = new Set([
  "rwi_dewatering_designation", "rwi_dewatering_machine_h",
  "rwi_shoring_designation", "rwi_shoring_area_m2",
  "rwi_pavement_restoration_designation", "rwi_pavement_restoration_area_m2",
]);
const PARAMETER_SPECS = Object.freeze([
  ["rwi_inlet_count", "Количество устанавливаемых дождеприёмников", "integer", "pcs", null],
  ["rwi_body_designation", "Марка корпуса дождеприёмника", "text", null, null],
  ["rwi_body_material", "Материал корпуса дождеприёмника", "text", null, null],
  ["rwi_grating_material", "Материал решётки", "text", null, null],
  ["rwi_grating_load_class", "Класс нагрузки решётки", "text", null, null],
  ["rwi_outlet_diameter_mm", "Диаметр выпуска дождеприёмника", "decimal", "mm", null],
  ["rwi_assembly_designation", "Марка выбранного узла дождеприёмника", "text", null, null],
  ["rwi_body_retained_spare_piece", "Сохраняемый резерв корпусов", "integer", "pcs", null],
  ["rwi_body_supplier_package_quantity_piece", "Количество корпусов в поставочной упаковке", "integer", "pcs", null],
  ["rwi_grating_quantity_piece", "Количество решёток", "decimal", "pcs", null],
  ["rwi_frame_designation", "Рама решётки", "text", null, null],
  ["rwi_frame_quantity_piece", "Количество рам", "decimal", "pcs", null],
  ["rwi_outlet_connector_designation", "Соединитель выпуска", "text", null, null],
  ["rwi_outlet_connector_quantity_piece", "Количество соединителей выпуска", "decimal", "pcs", null],
  ["rwi_seal_designation", "Уплотнение выпуска", "text", null, null],
  ["rwi_seal_quantity_piece", "Количество уплотнений выпуска", "decimal", "pcs", null],
  ["rwi_silt_basket_designation", "Корзина для сбора наносов", "text", null, null],
  ["rwi_silt_basket_quantity_piece", "Количество корзин для наносов", "decimal", "pcs", null],
  ["rwi_bedding_designation", "Материал основания дождеприёмников", "text", null, null],
  ["rwi_bedding_volume_m3", "Объём основания дождеприёмников", "decimal", "m3", null],
  ["rwi_setting_mortar_designation", "Монтажный раствор", "text", null, null],
  ["rwi_setting_mortar_mass_kg", "Масса монтажного раствора", "decimal", "kg", null],
  ["rwi_excavation_volume_m3", "Объём разработки котлованов", "decimal", "m3", null],
  ["rwi_backfill_designation", "Материал обратной засыпки", "text", null, null],
  ["rwi_backfill_volume_m3", "Объём обратной засыпки", "decimal", "m3", null],
  ["rwi_excess_soil_volume_m3", "Объём вывоза лишнего грунта", "decimal", "m3", null],
  ["rwi_flow_test_count", "Количество проверок проливом", "decimal", "test", null],
  ["rwi_asbuilt_document_count", "Комплекты исполнительной документации", "decimal", "document", null],
  ["rwi_earthworks_labor_h", "Труд по земляным работам", "decimal", "man_hour", null],
  ["rwi_install_labor_h", "Труд по монтажу дождеприёмников", "decimal", "man_hour", null],
  ["rwi_qa_documentation_labor_h", "Труд по контролю и документации", "decimal", "man_hour", null],
  ["rwi_excavator_machine_h", "Работа экскаватора", "decimal", "machine_hour", null],
  ["rwi_crane_machine_h", "Работа крана", "decimal", "machine_hour", null],
  ["rwi_compactor_machine_h", "Работа уплотняющего механизма", "decimal", "machine_hour", null],
  ["rwi_delivery_trip_count", "Рейсы доставки", "integer", "trip", null],
  ["rwi_removal_trip_count", "Рейсы вывоза грунта и отходов", "integer", "trip", null],
  ["rwi_dewatering_mode", "Водоотлив требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["rwi_dewatering_designation", "Оборудование водоотлива", "text", null, null],
  ["rwi_dewatering_machine_h", "Работа оборудования водоотлива", "decimal", "machine_hour", null],
  ["rwi_shoring_mode", "Крепление котлованов требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["rwi_shoring_designation", "Система крепления котлованов", "text", null, null],
  ["rwi_shoring_area_m2", "Площадь крепления котлованов", "decimal", "m2", null],
  ["rwi_pavement_restoration_mode", "Восстановление покрытия требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["rwi_pavement_restoration_designation", "Конструкция восстановления покрытия", "text", null, null],
  ["rwi_pavement_restoration_area_m2", "Площадь восстановления покрытия", "decimal", "m2", null],
] as const);
function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("rwi_dewatering_") && parameterId !== "rwi_dewatering_mode"
    ? "rwi_dewatering_mode" : parameterId.startsWith("rwi_shoring_") && parameterId !== "rwi_shoring_mode"
      ? "rwi_shoring_mode" : parameterId.startsWith("rwi_pavement_restoration_")
        && parameterId !== "rwi_pavement_restoration_mode" ? "rwi_pavement_restoration_mode" : null;
  return branch ? { requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" } } : {};
}
export type RainwaterInletsParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const RAINWATER_INLETS_PARAMETERS: readonly RainwaterInletsParameter[] = Object.freeze(
  PARAMETER_SPECS.map(([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId, ordinal, value_type: valueType, unit_id: unitId,
    title_ru: titleRu, required: !CONDITIONAL_DETAILS.has(parameterId), default_value: null,
    constraints_json: { ...(enumValues ? { values: enumValues }
      : valueType === "decimal" || valueType === "integer"
        ? { min: parameterId === "rwi_body_retained_spare_piece" ? 0 : valueType === "integer" ? 1 : 0.000_001 }
        : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
    ...conditionalConstraints(parameterId) },
    truth_metadata: { contract: "rik-expo-app.rainwater-inlets-r1",
      semantic_parameter_key: `rainwater-inlets:${parameterId}`, visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId) ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_RAINWATER_INLET_LAYOUT_ASSEMBLY_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: { guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: KNOWN_SCOPE.includes(parameterId)
          ? `${titleRu}: укажите по явному запросу, плану и спецификации дождеприёмников.`
          : `${titleRu}: укажите по проекту, ведомости объёмов, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_SUPPLIED_OR_APPROVED_RAINWATER_INLET_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId) ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_RAINWATER_INLET_PROJECT_DOCUMENTATION",
        source_document: RAINWATER_INLETS_SOURCE_ID,
        source_locator: RAINWATER_INLETS_SOURCE_METADATA.exact_locator,
        guide_version: "rainwater-inlets-r1",
        source_snapshot_hash: RAINWATER_INLETS_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для явно выбранных дождеприёмных узлов; трубная сеть и смежные сооружения исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE" },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId), synthetic: false },
  })),
);
export const RAINWATER_INLETS_RUNTIME_INPUT = Object.freeze({
  rwi_body_retained_spare_piece: 0, rwi_body_supplier_package_quantity_piece: 1,
});
export const RAINWATER_INLETS_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(RAINWATER_INLETS_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const RAINWATER_INLETS_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(RAINWATER_INLETS_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [RAINWATER_INLETS_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });
type RowSpec = Readonly<{ rowId: string; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; expression: string; procurementEligible?: boolean;
  titleParameterIds?: string[]; inclusionAst?: Json;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS" }>;
const ROW_SPECS: readonly RowSpec[] = Object.freeze([
  { rowId: "rc09:rwi_install_acceptance", section: "Работы", category: "construction_work", titleRu: "Монтаж и приёмка дождеприёмников", unitId: "pcs", formulaId: "rwi_install_count_v1", expression: "rwi_inlet_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi_body", section: "Материалы", category: "material", titleRu: "Корпус дождеприёмника", unitId: "pcs", formulaId: "rwi_body_order_quantity_v1", expression: "ceil((rwi_inlet_count+rwi_body_retained_spare_piece)/rwi_body_supplier_package_quantity_piece)*rwi_body_supplier_package_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_body_designation", "rwi_body_material"] },
  { rowId: "rc09:rwi_grating", section: "Комплектующие", category: "material", titleRu: "Решётка дождеприёмника", unitId: "pcs", formulaId: "rwi_grating_quantity_v1", expression: "rwi_grating_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_grating_material", "rwi_grating_load_class"] },
  { rowId: "rc09:rwi_frame", section: "Комплектующие", category: "material", titleRu: "Рама решётки дождеприёмника", unitId: "pcs", formulaId: "rwi_frame_quantity_v1", expression: "rwi_frame_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_frame_designation"] },
  { rowId: "rc09:rwi_outlet_connector", section: "Комплектующие", category: "material", titleRu: "Соединитель выпуска дождеприёмника", unitId: "pcs", formulaId: "rwi_outlet_connector_quantity_v1", expression: "rwi_outlet_connector_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_outlet_connector_designation"] },
  { rowId: "rc09:rwi_seal", section: "Расходники", category: "material", titleRu: "Уплотнение выпуска дождеприёмника", unitId: "pcs", formulaId: "rwi_seal_quantity_v1", expression: "rwi_seal_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_seal_designation"] },
  { rowId: "rc09:rwi_silt_basket", section: "Комплектующие", category: "material", titleRu: "Корзина для сбора наносов", unitId: "pcs", formulaId: "rwi_silt_basket_quantity_v1", expression: "rwi_silt_basket_quantity_piece", procurementEligible: true, titleParameterIds: ["rwi_silt_basket_designation"] },
  { rowId: "rc09:rwi_bedding", section: "Материалы", category: "material", titleRu: "Основание дождеприёмников", unitId: "m3", formulaId: "rwi_bedding_volume_v1", expression: "rwi_bedding_volume_m3", procurementEligible: true, titleParameterIds: ["rwi_bedding_designation"] },
  { rowId: "rc09:rwi_setting_mortar", section: "Расходники", category: "material", titleRu: "Монтажный раствор дождеприёмников", unitId: "kg", formulaId: "rwi_setting_mortar_mass_v1", expression: "rwi_setting_mortar_mass_kg", procurementEligible: true, titleParameterIds: ["rwi_setting_mortar_designation"] },
  { rowId: "rc09:rwi_excavation", section: "Земляные работы", category: "construction_work", titleRu: "Разработка котлованов дождеприёмников", unitId: "m3", formulaId: "rwi_excavation_volume_v1", expression: "rwi_excavation_volume_m3" },
  { rowId: "rc09:rwi_backfill", section: "Материалы", category: "material", titleRu: "Обратная засыпка дождеприёмников", unitId: "m3", formulaId: "rwi_backfill_volume_v1", expression: "rwi_backfill_volume_m3", procurementEligible: true, titleParameterIds: ["rwi_backfill_designation"] },
  { rowId: "rc09:rwi_excess_soil_removal", section: "Земляные работы", category: "service", titleRu: "Вывоз лишнего грунта", unitId: "m3", formulaId: "rwi_excess_soil_volume_v1", expression: "rwi_excess_soil_volume_m3", procurementEligible: true },
  { rowId: "rc09:rwi_flow_test", section: "Контроль", category: "service", titleRu: "Проверка дождеприёмников проливом", unitId: "test", formulaId: "rwi_flow_test_count_v1", expression: "rwi_flow_test_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi_asbuilt_documents", section: "Документы", category: "service", titleRu: "Комплект исполнительной документации дождеприёмников", unitId: "document", formulaId: "rwi_asbuilt_document_count_v1", expression: "rwi_asbuilt_document_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi_dewatering", section: "Условные механизмы", category: "equipment", titleRu: "Водоотлив из котлованов", unitId: "machine_hour", formulaId: "rwi_dewatering_machine_v1", expression: "rwi_dewatering_machine_h", procurementEligible: true, inclusionAst: equals("rwi_dewatering_mode", "REQUIRED"), titleParameterIds: ["rwi_dewatering_designation"] },
  { rowId: "rc09:rwi_shoring", section: "Условные конструкции", category: "equipment", titleRu: "Крепление котлованов", unitId: "m2", formulaId: "rwi_shoring_area_v1", expression: "rwi_shoring_area_m2", procurementEligible: true, inclusionAst: equals("rwi_shoring_mode", "REQUIRED"), titleParameterIds: ["rwi_shoring_designation"] },
  { rowId: "rc09:rwi_pavement_restoration", section: "Условные работы", category: "construction_work", titleRu: "Восстановление покрытия у дождеприёмников", unitId: "m2", formulaId: "rwi_pavement_restoration_area_v1", expression: "rwi_pavement_restoration_area_m2", inclusionAst: equals("rwi_pavement_restoration_mode", "REQUIRED"), titleParameterIds: ["rwi_pavement_restoration_designation"] },
  { rowId: "rc09:rwi-body-balance:installed-net", section: "Баланс корпусов", category: "material", titleRu: "Количество монтируемых корпусов", unitId: "pcs", formulaId: "rwi_body_installed_net_v1", expression: "rwi_inlet_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi-body-balance:retained-spare", section: "Баланс корпусов", category: "material", titleRu: "Сохраняемый резерв корпусов", unitId: "pcs", formulaId: "rwi_body_retained_spare_v1", expression: "rwi_body_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi-body-balance:total-need", section: "Баланс корпусов", category: "material", titleRu: "Общая потребность в корпусах", unitId: "pcs", formulaId: "rwi_body_total_need_v1", expression: "rwi_inlet_count+rwi_body_retained_spare_piece", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi-body-balance:package-count", section: "Баланс корпусов", category: "material", titleRu: "Количество поставочных упаковок корпусов", unitId: "package", formulaId: "rwi_body_package_count_v1", expression: "ceil((rwi_inlet_count+rwi_body_retained_spare_piece)/rwi_body_supplier_package_quantity_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi-body-balance:remainder", section: "Баланс корпусов", category: "material", titleRu: "Остаток корпусов после монтажа", unitId: "pcs", formulaId: "rwi_body_remainder_v1", expression: "ceil((rwi_inlet_count+rwi_body_retained_spare_piece)/rwi_body_supplier_package_quantity_piece)*rwi_body_supplier_package_quantity_piece-rwi_inlet_count", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:rwi-body-balance:surplus-beyond-spare", section: "Баланс корпусов", category: "material", titleRu: "Свободный остаток корпусов сверх резерва", unitId: "pcs", formulaId: "rwi_body_surplus_v1", expression: "max(0,ceil((rwi_inlet_count+rwi_body_retained_spare_piece)/rwi_body_supplier_package_quantity_piece)*rwi_body_supplier_package_quantity_piece-rwi_inlet_count-rwi_body_retained_spare_piece)", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:labor:rwi-earthworks", section: "Труд", category: "construction_work", titleRu: "Труд по земляным работам", unitId: "man_hour", formulaId: "rwi_earthworks_labor_v1", expression: "rwi_earthworks_labor_h" },
  { rowId: "rc09:labor:rwi-install", section: "Труд", category: "construction_work", titleRu: "Труд по монтажу дождеприёмников", unitId: "man_hour", formulaId: "rwi_install_labor_v1", expression: "rwi_install_labor_h" },
  { rowId: "rc09:labor:rwi-qa-documentation", section: "Труд", category: "construction_work", titleRu: "Труд по контролю и документации", unitId: "man_hour", formulaId: "rwi_qa_documentation_labor_v1", expression: "rwi_qa_documentation_labor_h" },
  { rowId: "rc09:equipment:rwi-excavator", section: "Механизмы", category: "equipment", titleRu: "Экскаватор для разработки котлованов", unitId: "machine_hour", formulaId: "rwi_excavator_machine_v1", expression: "rwi_excavator_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:rwi-crane", section: "Механизмы", category: "equipment", titleRu: "Кран для монтажа корпусов", unitId: "machine_hour", formulaId: "rwi_crane_machine_v1", expression: "rwi_crane_machine_h", procurementEligible: true },
  { rowId: "rc09:equipment:rwi-compactor", section: "Механизмы", category: "equipment", titleRu: "Механизм уплотнения обратной засыпки", unitId: "machine_hour", formulaId: "rwi_compactor_machine_v1", expression: "rwi_compactor_machine_h", procurementEligible: true },
  { rowId: "rc09:logistics:rwi-delivery", section: "Логистика", category: "service", titleRu: "Доставка корпусов и комплектующих", unitId: "trip", formulaId: "rwi_delivery_trip_v1", expression: "rwi_delivery_trip_count", procurementEligible: true },
  { rowId: "rc09:logistics:rwi-removal", section: "Логистика", category: "service", titleRu: "Вывоз грунта, упаковки и отходов", unitId: "trip", formulaId: "rwi_removal_trip_v1", expression: "rwi_removal_trip_count", procurementEligible: true },
]);
export const RAINWATER_INLETS_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze(
  ROW_SPECS.map((row) => { const compiled = compileFormulaGraph(row.expression);
    return { formula_id: row.formulaId, output_unit_id: row.unitId,
      expression_source: row.expression, ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" }; }),
);
export const RAINWATER_INLETS_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  ROW_SPECS.map((row, ordinal) => {
    const resourceGraph = { formulaId: row.formulaId, normalizedUom: row.unitId,
      semanticOwnerId: `rainwater-inlets:${row.rowId}`, costOwner: "resource",
      ...(row.titleParameterIds ? { titleSpecificationParameterIds: row.titleParameterIds,
        titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
      scopeContextParameterIds: KNOWN_SCOPE, costTreatment: row.costTreatment ?? "OWN_COST" };
    const sourceRole = "APPROVED_RAINWATER_INLET_PROJECT_PACKAGE";
    const sourceMetadata = { truth_contract_version: "R3", synthetic: false, sourceRole,
      normativeTrace: [{ sourceId: RAINWATER_INLETS_SOURCE_ID,
        source_id: RAINWATER_INLETS_SOURCE_ID, normId: RAINWATER_INLETS_NORM_ID,
        norm_id: RAINWATER_INLETS_NORM_ID,
        normVersion: RAINWATER_INLETS_SOURCE_METADATA.source_document_version,
        source_title: RAINWATER_INLETS_SOURCE_METADATA.source_title,
        exact_locator: RAINWATER_INLETS_SOURCE_METADATA.exact_locator,
        source_definition_hash: RAINWATER_INLETS_SOURCE_METADATA.definition_hash, sourceRole }],
      excludedUnownedAssumptions: ["stormwater pipe, manhole, silt-trap or full outlet scope",
        "generic route-derived earthwork, material, labor or mechanism coefficient",
        "automatic inlet spacing, dewatering, shoring or pavement-restoration selection",
        "automatic retained spare or supplier package quantity", "invented price"] };
    return { id: `resource-${row.rowId.replace(/:/gu, "-")}`, row_id: row.rowId,
      ordinal, section: row.section, category: row.category, title_ru: row.titleRu,
      unit_id: row.unitId, formula_id: row.formulaId, inclusion_ast: row.inclusionAst ?? literalTrue,
      resource_graph: resourceGraph, procurement_eligible: row.procurementEligible ?? false,
      cost_owner_id: row.rowId, source_metadata: sourceMetadata,
      row_sha256: estimateDeterministicHash({ row, ordinal, resourceGraph, sourceMetadata }) };
  }),
);
export const RAINWATER_INLETS_SHORT_INPUT = Object.freeze({
  rwi_inlet_count: 28, rwi_body_designation: "DB2", rwi_body_material: "PRECAST_RC",
  rwi_grating_material: "DUCTILE_IRON", rwi_grating_load_class: "D400",
  rwi_outlet_diameter_mm: 200, rwi_assembly_designation: "DB2-RC-D400-DN200",
  ...RAINWATER_INLETS_RUNTIME_INPUT,
});
export const RAINWATER_INLETS_ACCEPTANCE_INPUT = Object.freeze({
  ...RAINWATER_INLETS_SHORT_INPUT,
  rwi_grating_quantity_piece: 28,
  rwi_frame_designation: "Рама DB2 под решётку D400", rwi_frame_quantity_piece: 28,
  rwi_outlet_connector_designation: "Патрубок PVC-U DN 200", rwi_outlet_connector_quantity_piece: 28,
  rwi_seal_designation: "Уплотнение EPDM DN 200", rwi_seal_quantity_piece: 28,
  rwi_silt_basket_designation: "Корзина оцинкованная DB2", rwi_silt_basket_quantity_piece: 28,
  rwi_bedding_designation: "Бетон C12/15 основания", rwi_bedding_volume_m3: 8.4,
  rwi_setting_mortar_designation: "Сухая безусадочная смесь", rwi_setting_mortar_mass_kg: 420,
  rwi_excavation_volume_m3: 56,
  rwi_backfill_designation: "Щебёночно-песчаная смесь", rwi_backfill_volume_m3: 34,
  rwi_excess_soil_volume_m3: 22, rwi_flow_test_count: 28, rwi_asbuilt_document_count: 1,
  rwi_earthworks_labor_h: 96, rwi_install_labor_h: 168, rwi_qa_documentation_labor_h: 40,
  rwi_excavator_machine_h: 32, rwi_crane_machine_h: 28, rwi_compactor_machine_h: 18,
  rwi_delivery_trip_count: 4, rwi_removal_trip_count: 3,
  rwi_dewatering_mode: "NOT_REQUIRED", rwi_shoring_mode: "NOT_REQUIRED",
  rwi_pavement_restoration_mode: "NOT_REQUIRED",
});
export async function compileRainwaterInletsR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? RAINWATER_INLETS_CATALOG_ID;
  if (catalogId !== RAINWATER_INLETS_CATALOG_ID) {
    throw new Error(`RAINWATER_INLETS_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.rainwater-inlets-r1",
    catalogId, primaryMeasureParameterId: "rwi_inlet_count",
    parameterDefinitions: [...RAINWATER_INLETS_PARAMETERS],
    formulaDefinitions: [...RAINWATER_INLETS_FORMULAS],
    resourceDefinitions: [...RAINWATER_INLETS_RESOURCES], submittedParameters,
    confirmedParameters: { ...RAINWATER_INLETS_RUNTIME_INPUT }, currencyCode: "KGS",
    priceItems: [], maximumResourceRows: 40, hashJson: async (value) => JSON.stringify(value) });
}
