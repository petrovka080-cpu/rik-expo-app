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

export const PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID =
  "canonical-work:base:plumbing_interior_pump_install_standard";
export const PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID =
  "project_pump_unit_alignment_connection_package_v1";
export const PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID =
  "norm:project:pump_unit_alignment_connection:package:v1";

export const PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость насосов, чертёж рамы и фундаментов, схема обвязки, ППР центровки и программа испытаний",
  source_authority: "Проектная организация ОВ/ВК, изготовитель насосного агрегата и утверждающий инженер проекта",
  source_document_version: "PROJECT_PUMP_BASEFRAME_MATERIAL_LABOR_EQUIPMENT_TEST_LOGISTICS_BALANCE_S27_24",
  definition_hash: "3cdafc1bd33304837e49955b5681ec45aa6248e418ed83e1e80d64fc36450515",
  exact_locator: "Количество, точная марка, подача 45 м³/ч и напор 55 м насосных агрегатов; паспорт агрегата на раме; ведомость анкеров и регулировочных пластин; карта подливки; спецификация фланцевых соединений; ППР с трудом, грузоподъёмным механизмом, инструментом затяжки и лазерной центровкой; программа контроля вибрации, Q/H и тока, анализатор и акты; логистика; резерв и поставочная упаковка; виброизоляторы и гибкие вставки только по условным проектным ветвям",
  use_restriction: "Приложение не выбирает насос и не выполняет гидравлический расчёт. Видимый нейтральный баланс резерва и упаковки заменяется по проекту и поставщику. Анкеры, пластины, подливка, фланцевые комплекты, труд, механизмы, приборы, испытания и логистика берутся только из утверждённых проектных и ППР-документов. Коллекторы насосной станции, резервуар, автоматика и полная насосная станция не включаются.",
  source_kind: "PROJECT_DOCUMENT_PACKAGE_REQUIRED",
  artifact_sha256: "3cdafc1bd33304837e49955b5681ec45aa6248e418ed83e1e80d64fc36450515",
});

const CONDITIONAL_DETAILS = new Set([
  "vibration_isolator_designation",
  "vibration_isolator_quantity_set",
  "flexible_connector_designation",
  "flexible_connector_quantity_set",
]);

const PARAMETER_SPECS = Object.freeze([
  ["pump_count", "Количество насосных агрегатов", "integer", "set", null],
  ["design_flow_m3_h", "Паспортная подача насосного агрегата", "decimal", "m3_h", null],
  ["design_head_m", "Паспортный напор насосного агрегата", "decimal", "m", null],
  ["pump_configuration", "Исполнение насосного агрегата", "enum", null,
    ["PUMP_MOTOR_ON_BASEFRAME"]],
  ["pump_unit_product_designation", "Марка и каталожное обозначение насосного агрегата", "text", null, null],
  ["pump_retained_spare_set", "Сохраняемый резерв насосных агрегатов", "decimal", "set", null],
  ["pump_supplier_pack_size_set", "Количество насосных агрегатов в поставочной упаковке", "integer", "set", null],
  ["anchor_set_designation", "Комплект фундаментных анкеров по чертежу", "text", null, null],
  ["anchor_set_quantity", "Количество комплектов фундаментных анкеров", "decimal", "set", null],
  ["shim_set_designation", "Комплект регулировочных пластин по ППР", "text", null, null],
  ["shim_set_quantity", "Количество комплектов регулировочных пластин", "decimal", "set", null],
  ["base_grout_designation", "Безусадочная смесь для подливки рамы", "text", null, null],
  ["base_grout_mass_kg", "Масса безусадочной смеси для подливки", "decimal", "kg", null],
  ["flange_set_designation", "Комплект прокладок и крепежа фланцев", "text", null, null],
  ["flange_set_quantity", "Количество комплектов фланцевого соединения", "decimal", "set", null],
  ["alignment_tool_designation", "Лазерный прибор центровки по ППР", "text", null, null],
  ["alignment_tool_shift", "Количество смен лазерного прибора центровки", "decimal", "shift", null],
  ["pump_test_record_designation", "Акт индивидуального испытания насосного агрегата", "text", null, null],
  ["pump_test_record_quantity_document", "Количество актов индивидуального испытания", "decimal", "document", null],
  ["pump_installation_alignment_labor_h", "Труд монтажников по установке, обвязке и центровке", "decimal", "man_hour", null],
  ["pump_testing_labor_h", "Труд наладчиков по индивидуальным испытаниям", "decimal", "man_hour", null],
  ["pump_lifting_equipment_machine_h", "Работа грузоподъёмного механизма", "decimal", "machine_hour", null],
  ["pump_torque_tool_machine_h", "Работа инструмента контролируемой затяжки", "decimal", "machine_hour", null],
  ["pump_vibration_analyzer_machine_h", "Работа анализатора вибрации и параметров агрегата", "decimal", "machine_hour", null],
  ["pump_delivery_trip_count", "Рейсы доставки агрегатов и комплектующих", "integer", "trip", null],
  ["pump_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов монтажа", "integer", "trip", null],
  ["vibration_isolator_mode", "Виброизоляторы входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["vibration_isolator_designation", "Виброизолятор насосной рамы по проекту", "text", null, null],
  ["vibration_isolator_quantity_set", "Количество комплектов виброизоляторов", "decimal", "set", null],
  ["flexible_connector_mode", "Гибкие вставки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["flexible_connector_designation", "Гибкая вставка насосного агрегата по проекту", "text", null, null],
  ["flexible_connector_quantity_set", "Количество комплектов гибких вставок", "decimal", "set", null],
] as const);

const KNOWN_SCOPE = [
  "pump_count", "design_flow_m3_h", "design_head_m", "pump_configuration",
  "pump_unit_product_designation",
];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "pump_retained_spare_set", "pump_supplier_pack_size_set",
]);

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["vibration_isolator", "flexible_connector"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type PumpUnitAlignmentConnectionParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS:
readonly PumpUnitAlignmentConnectionParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
          ? { min: parameterId === "pump_retained_spare_set"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.pump-unit-alignment-connection-r1",
      semantic_parameter_key: `pump-unit-alignment-connection:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_PUMP_SCHEDULE_FOUNDATION_PIPING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "pump_count"
          ? "Укажите подтверждённое количество отдельных насосных агрегатов."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по паспорту выбранного насосного агрегата.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: нейтральное предварительное значение видно в смете; замените по резерву и поставочной упаковке.`
              : `${titleRu}: укажите по чертежу, спецификации, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_PUMP_FOUNDATION_PIPING_METHOD_OR_QA_DOCUMENTATION",
        source_document: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
        source_locator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "pump-unit-alignment-connection-r1",
        source_snapshot_hash: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для монтажа, центровки и подключения насосных агрегатов на раме с указанными Q/H; коллекторы, резервуар, автоматика и полная насосная станция исключены.",
        verified_at: "2026-10-01T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT = Object.freeze({
  pump_retained_spare_set: 0,
  pump_supplier_pack_size_set: 1,
});
export const PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, "ASSUMPTION"],
  )) as Readonly<Record<string, "ASSUMPTION">>,
);
export const PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT).map(
    (parameterId) => [parameterId, [PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID]],
  )) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

export const PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("pump_unit_install_align_count_v1", "set", "pump_count"),
  formula("pump_motor_baseframe_order_v2", "set",
    "ceil((pump_count+pump_retained_spare_set)/pump_supplier_pack_size_set)*pump_supplier_pack_size_set"),
  formula("pump_anchor_set_quantity_v1", "set", "anchor_set_quantity"),
  formula("pump_alignment_shim_set_quantity_v1", "set", "shim_set_quantity"),
  formula("non_shrink_pump_base_grout_mass_v1", "kg", "base_grout_mass_kg"),
  formula("pump_flange_set_quantity_v1", "set", "flange_set_quantity"),
  formula("laser_shaft_alignment_tool_shift_v1", "shift", "alignment_tool_shift"),
  formula("pump_vibration_qh_current_test_count_v1", "test", "pump_count"),
  formula("pump_vibration_isolator_quantity_v1", "set", "vibration_isolator_quantity_set"),
  formula("pump_flexible_connector_quantity_v1", "set", "flexible_connector_quantity_set"),
  formula("pump_installed_net_v2", "set", "pump_count"),
  formula("pump_retained_spare_v2", "set", "pump_retained_spare_set"),
  formula("pump_total_need_v2", "set", "pump_count+pump_retained_spare_set"),
  formula("pump_package_count_v2", "package",
    "ceil((pump_count+pump_retained_spare_set)/pump_supplier_pack_size_set)"),
  formula("pump_remainder_v2", "set",
    "ceil((pump_count+pump_retained_spare_set)/pump_supplier_pack_size_set)*pump_supplier_pack_size_set-pump_count"),
  formula("pump_surplus_v2", "set",
    "max(0,ceil((pump_count+pump_retained_spare_set)/pump_supplier_pack_size_set)*pump_supplier_pack_size_set-pump_count-pump_retained_spare_set)"),
  formula("pump_test_record_quantity_v2", "document", "pump_test_record_quantity_document"),
  formula("pump_installation_alignment_labor_v2", "man_hour", "pump_installation_alignment_labor_h"),
  formula("pump_testing_labor_v2", "man_hour", "pump_testing_labor_h"),
  formula("pump_lifting_equipment_v2", "machine_hour", "pump_lifting_equipment_machine_h"),
  formula("pump_torque_tool_v2", "machine_hour", "pump_torque_tool_machine_h"),
  formula("pump_vibration_analyzer_v2", "machine_hour", "pump_vibration_analyzer_machine_h"),
  formula("pump_delivery_v2", "trip", "pump_delivery_trip_count"),
  formula("pump_waste_removal_v2", "trip", "pump_waste_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `pump-unit-alignment-connection:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
      source_id: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
      normId: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
      norm_id: PUMP_UNIT_ALIGNMENT_CONNECTION_NORM_ID,
      normVersion: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.source_document_version,
      source_title: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.source_title,
      exact_locator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
      source_definition_hash: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical anchor, shim, grout, flange or alignment-tool rates",
      "automatic retained spare or supplier package",
      "automatic labor, lifting, test-equipment or logistics quantity",
      "automatic vibration-isolator or flexible-connector quantities",
      "pumping-station collectors, water reservoir, automation or full station",
      "invented price",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:pump_unit_install_align", ordinal: 0,
    section: "Работы", category: "construction_work",
    titleRu: "Монтаж, центровка и подключение насосного агрегата", unitId: "set",
    formulaId: "pump_unit_install_align_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump_motor_baseframe_45m3h_55m", ordinal: 1,
    section: "Оборудование системы", category: "material",
    titleRu: "Насосный агрегат с двигателем на раме, подача и напор по паспорту", unitId: "set",
    formulaId: "pump_motor_baseframe_order_v2", procurementEligible: true,
    titleParameterIds: ["pump_unit_product_designation"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE" }),
  resource({ rowId: "rc09:pump_anchor_bolt_set", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Комплект фундаментных анкерных болтов насосной рамы",
    unitId: "set", formulaId: "pump_anchor_set_quantity_v1", procurementEligible: true,
    titleParameterIds: ["anchor_set_designation"], sourceRole: "APPROVED_PUMP_FOUNDATION_DRAWING" }),
  resource({ rowId: "rc09:pump_alignment_shim_set", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Комплект стальных регулировочных пластин для центровки",
    unitId: "set", formulaId: "pump_alignment_shim_set_quantity_v1", procurementEligible: true,
    titleParameterIds: ["shim_set_designation"], sourceRole: "APPROVED_ALIGNMENT_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:non_shrink_pump_base_grout", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Безусадочная цементная смесь для подливки насосной рамы",
    unitId: "kg", formulaId: "non_shrink_pump_base_grout_mass_v1", procurementEligible: true,
    titleParameterIds: ["base_grout_designation"], sourceRole: "APPROVED_PUMP_BASE_GROUT_DETAIL" }),
  resource({ rowId: "rc09:pump_flange_gasket_fastener_set", ordinal: 5,
    section: "Материалы", category: "material", titleRu: "Комплект прокладок и крепежа присоединительных фланцев насоса",
    unitId: "set", formulaId: "pump_flange_set_quantity_v1", procurementEligible: true,
    titleParameterIds: ["flange_set_designation"], sourceRole: "APPROVED_PUMP_PIPING_SCHEDULE" }),
  resource({ rowId: "rc09:laser_shaft_alignment_tool", ordinal: 6,
    section: "Оборудование", category: "equipment", titleRu: "Лазерный прибор центровки валов насоса и двигателя",
    unitId: "shift", formulaId: "laser_shaft_alignment_tool_shift_v1", procurementEligible: true,
    titleParameterIds: ["alignment_tool_designation"], sourceRole: "APPROVED_ALIGNMENT_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:pump_vibration_qh_current_test", ordinal: 7,
    section: "Контроль", category: "service", titleRu: "Контроль соосности, вибрации, Q/H и тока насосного агрегата",
    unitId: "test", formulaId: "pump_vibration_qh_current_test_count_v1", procurementEligible: true,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump_vibration_isolator", ordinal: 8,
    section: "Условные материалы", category: "material", titleRu: "Комплект виброизоляторов насосной рамы",
    unitId: "set", formulaId: "pump_vibration_isolator_quantity_v1",
    inclusionAst: equals("vibration_isolator_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["vibration_isolator_designation"], sourceRole: "APPROVED_PUMP_FOUNDATION_DRAWING" }),
  resource({ rowId: "rc09:pump_flexible_connector", ordinal: 9,
    section: "Условные материалы", category: "material", titleRu: "Комплект гибких вставок насосного агрегата",
    unitId: "set", formulaId: "pump_flexible_connector_quantity_v1",
    inclusionAst: equals("flexible_connector_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["flexible_connector_designation"], sourceRole: "APPROVED_PUMP_PIPING_SCHEDULE" }),
  resource({ rowId: "rc09:pump-balance:installed-net", ordinal: 10,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Чистое количество смонтированных насосных агрегатов",
    unitId: "set", formulaId: "pump_installed_net_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump-balance:retained-spare", ordinal: 11,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Сохраняемый резерв насосных агрегатов",
    unitId: "set", formulaId: "pump_retained_spare_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump-balance:total-need", ordinal: 12,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Общая потребность в насосных агрегатах",
    unitId: "set", formulaId: "pump_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump-balance:package-count", ordinal: 13,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Количество поставочных упаковок насосных агрегатов",
    unitId: "package", formulaId: "pump_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump-balance:remainder", ordinal: 14,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Остаток насосных агрегатов после монтажа",
    unitId: "set", formulaId: "pump_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump-balance:surplus-beyond-reserve", ordinal: 15,
    section: "Баланс насосных агрегатов", category: "material", titleRu: "Свободный остаток насосных агрегатов сверх резерва",
    unitId: "set", formulaId: "pump_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:pump_test_record", ordinal: 16,
    section: "Контроль", category: "service", titleRu: "Акт индивидуального испытания насосного агрегата",
    unitId: "document", formulaId: "pump_test_record_quantity_v2", procurementEligible: false,
    titleParameterIds: ["pump_test_record_designation"], sourceRole: "APPROVED_TEST_PROGRAM",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:labor:pump-installation-alignment", ordinal: 17,
    section: "Труд", category: "construction_work", titleRu: "Труд монтажников: установка, обвязка и центровка насосных агрегатов",
    unitId: "man_hour", formulaId: "pump_installation_alignment_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_ALIGNMENT_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:labor:pump-testing", ordinal: 18,
    section: "Труд", category: "construction_work", titleRu: "Труд наладчиков: индивидуальные испытания насосных агрегатов",
    unitId: "man_hour", formulaId: "pump_testing_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "rc09:equipment:pump-lifting", ordinal: 19,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Грузоподъёмный механизм для установки насосных агрегатов",
    unitId: "machine_hour", formulaId: "pump_lifting_equipment_v2", procurementEligible: true,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:pump-torque-tool", ordinal: 20,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Инструмент контролируемой затяжки анкеров и фланцев",
    unitId: "machine_hour", formulaId: "pump_torque_tool_v2", procurementEligible: true,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:equipment:pump-vibration-analyzer", ordinal: 21,
    section: "Механизмы и инструмент", category: "equipment", titleRu: "Анализатор вибрации и рабочих параметров насосного агрегата",
    unitId: "machine_hour", formulaId: "pump_vibration_analyzer_v2", procurementEligible: true,
    sourceRole: "APPROVED_TEST_PROGRAM" }),
  resource({ rowId: "rc09:logistics:pump-delivery", ordinal: 22,
    section: "Логистика", category: "service", titleRu: "Доставка насосных агрегатов, материалов и инструмента",
    unitId: "trip", formulaId: "pump_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "rc09:logistics:pump-waste-removal", ordinal: 23,
    section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки и отходов монтажа",
    unitId: "trip", formulaId: "pump_waste_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT = Object.freeze({
  pump_count: 2,
  design_flow_m3_h: 45,
  design_head_m: 55,
  pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
  pump_unit_product_designation: "PUMP-Q45-H55",
});

export const PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT = Object.freeze({
  ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  ...PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT,
  anchor_set_designation: "Анкеры насосной рамы по чертежу фундамента", anchor_set_quantity: 2,
  shim_set_designation: "Регулировочные пластины по ППР центровки", shim_set_quantity: 2,
  base_grout_designation: "Безусадочная смесь по карте подливки", base_grout_mass_kg: 84,
  flange_set_designation: "Прокладки и крепёж фланцев по схеме обвязки", flange_set_quantity: 4,
  alignment_tool_designation: "Лазерный прибор по ППР центровки", alignment_tool_shift: 1,
  pump_test_record_designation: "Акт индивидуального испытания по программе ПНР",
  pump_test_record_quantity_document: 2,
  pump_installation_alignment_labor_h: 36,
  pump_testing_labor_h: 12,
  pump_lifting_equipment_machine_h: 8,
  pump_torque_tool_machine_h: 6,
  pump_vibration_analyzer_machine_h: 4,
  pump_delivery_trip_count: 1,
  pump_waste_removal_trip_count: 1,
  vibration_isolator_mode: "NOT_REQUIRED",
  flexible_connector_mode: "NOT_REQUIRED",
});

export async function compilePumpUnitAlignmentConnectionR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID;
  if (catalogId !== PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_ID) {
    throw new Error(`PUMP_UNIT_ALIGNMENT_CONNECTION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pump-unit-alignment-connection-r1",
    catalogId,
    primaryMeasureParameterId: "pump_count",
    parameterDefinitions: [...PUMP_UNIT_ALIGNMENT_CONNECTION_PARAMETERS],
    formulaDefinitions: [...PUMP_UNIT_ALIGNMENT_CONNECTION_FORMULAS],
    resourceDefinitions: [...PUMP_UNIT_ALIGNMENT_CONNECTION_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...PUMP_UNIT_ALIGNMENT_CONNECTION_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 30,
    hashJson: async (value) => JSON.stringify(value),
  });
}
