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
  source_document_version: "PROJECT_PUMP_BASEFRAME_ANCHOR_SHIM_GROUT_FLANGE_ALIGNMENT_TEST_REVISION_EXPLICIT",
  definition_hash: "eh_project_pump_unit_alignment_connection_package_r1",
  exact_locator: "Количество насосных агрегатов, подача 45 м³/ч и напор 55 м; паспорт агрегата на раме; ведомость анкеров и регулировочных пластин; карта подливки; спецификация фланцевых соединений; ППР с трудоёмкостью лазерной центровки; программа контроля вибрации, Q/H и тока; виброизоляторы и гибкие вставки только по условным проектным ветвям",
  use_restriction: "Известное количество и паспортные Q/H определяют монтаж, сами агрегаты и индивидуальные испытания. Анкеры, пластины, безусадочная подливка, фланцевые комплекты и смены лазерного прибора берутся только из утверждённых проектных и PPR-документов. Коллекторы насосной станции, резервуар, автоматика и полная насосная станция не включаются.",
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
  ["vibration_isolator_mode", "Виброизоляторы входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["vibration_isolator_designation", "Виброизолятор насосной рамы по проекту", "text", null, null],
  ["vibration_isolator_quantity_set", "Количество комплектов виброизоляторов", "decimal", "set", null],
  ["flexible_connector_mode", "Гибкие вставки входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["flexible_connector_designation", "Гибкая вставка насосного агрегата по проекту", "text", null, null],
  ["flexible_connector_quantity_set", "Количество комплектов гибких вставок", "decimal", "set", null],
] as const);

const KNOWN_SCOPE = ["pump_count", "design_flow_m3_h", "design_head_m", "pump_configuration"];

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
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.pump-unit-alignment-connection-r1",
      semantic_parameter_key: `pump-unit-alignment-connection:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PUMP_SCHEDULE_FOUNDATION_PIPING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "pump_count"
          ? "Укажите подтверждённое количество отдельных насосных агрегатов."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по паспорту выбранного насосного агрегата.`
            : `${titleRu}: укажите по чертежу, спецификации, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE"
          : "APPROVED_PROJECT_PUMP_FOUNDATION_PIPING_METHOD_OR_QA_DOCUMENTATION",
        source_document: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_ID,
        source_locator: PUMP_UNIT_ALIGNMENT_CONNECTION_SOURCE_METADATA.exact_locator,
        guide_version: "pump-unit-alignment-connection-r1",
        source_snapshot_hash: "c444bf8e85ac74058678217f9e2e8877da7d392a5d87a79aea6563cfcd6d11d9",
        applicability: "Только для монтажа, центровки и подключения насосных агрегатов на раме с указанными Q/H; коллекторы, резервуар, автоматика и полная насосная станция исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
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
  formula("pump_motor_baseframe_count_v1", "set", "pump_count"),
  formula("pump_anchor_set_quantity_v1", "set", "anchor_set_quantity"),
  formula("pump_alignment_shim_set_quantity_v1", "set", "shim_set_quantity"),
  formula("non_shrink_pump_base_grout_mass_v1", "kg", "base_grout_mass_kg"),
  formula("pump_flange_set_quantity_v1", "set", "flange_set_quantity"),
  formula("laser_shaft_alignment_tool_shift_v1", "shift", "alignment_tool_shift"),
  formula("pump_vibration_qh_current_test_count_v1", "test", "pump_count"),
  formula("pump_vibration_isolator_quantity_v1", "set", "vibration_isolator_quantity_set"),
  formula("pump_flexible_connector_quantity_v1", "set", "flexible_connector_quantity_set"),
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE" }),
  resource({ rowId: "rc09:pump_motor_baseframe_45m3h_55m", ordinal: 1,
    section: "Оборудование системы", category: "material",
    titleRu: "Насосный агрегат с двигателем на раме, подача и напор по паспорту", unitId: "set",
    formulaId: "pump_motor_baseframe_count_v1", procurementEligible: true,
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
    sourceRole: "USER_SUPPLIED_OR_APPROVED_PUMP_SCOPE" }),
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
]);

export const PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT = Object.freeze({
  pump_count: 2,
  design_flow_m3_h: 45,
  design_head_m: 55,
  pump_configuration: "PUMP_MOTOR_ON_BASEFRAME",
});

export const PUMP_UNIT_ALIGNMENT_CONNECTION_ACCEPTANCE_INPUT = Object.freeze({
  ...PUMP_UNIT_ALIGNMENT_CONNECTION_SHORT_INPUT,
  anchor_set_designation: "Анкеры насосной рамы по чертежу фундамента", anchor_set_quantity: 2,
  shim_set_designation: "Регулировочные пластины по ППР центровки", shim_set_quantity: 2,
  base_grout_designation: "Безусадочная смесь по карте подливки", base_grout_mass_kg: 84,
  flange_set_designation: "Прокладки и крепёж фланцев по схеме обвязки", flange_set_quantity: 4,
  alignment_tool_designation: "Лазерный прибор по ППР центровки", alignment_tool_shift: 1,
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
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value),
  });
}
