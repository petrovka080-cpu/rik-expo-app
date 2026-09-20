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

export const STEEL_PANEL_RADIATOR_CATALOG_ID =
  "canonical-work:base:heating_hvac_interior_radiator_install_standard";
export const STEEL_PANEL_RADIATOR_SOURCE_ID = "project_steel_panel_radiator_package_v1";
export const STEEL_PANEL_RADIATOR_NORM_ID = "norm:project:steel_panel_radiator:package:v1";

export const STEEL_PANEL_RADIATOR_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая спецификация отопительных приборов и арматуры, узлы подключения, монтажная схема, ППР и программа гидравлических испытаний",
  source_authority: "Проектная организация, производитель радиаторной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_STEEL_PANEL_RADIATOR_PRODUCT_CONNECTION_METHOD_AND_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_steel_panel_radiator_package_r1",
  exact_locator: "Количество, тип, высота, длина и схема подключения радиаторов; ведомость приборов, кронштейнов, клапанов, воздухоотводчиков и фитингов; термоголовки и скрытая изоляция по проекту; ППР и программа проверки герметичности",
  use_restriction: "Известное количество радиаторов определяет только объём монтажной работы; количества приборов, кронштейнов, клапанов, воздухоотводчиков, фитингов, проверок и условных элементов берутся из проектной спецификации, паспортов, узлов, ППР и программы испытаний без переноса исторического коэффициента 1",
});

const CONDITIONAL_DETAILS = new Set([
  "thermostatic_head_designation", "thermostatic_head_quantity_piece",
  "concealed_pipe_insulation_designation", "concealed_pipe_insulation_length_m",
]);

const PARAMETER_SPECS = Object.freeze([
  ["radiator_count", "Количество устанавливаемых радиаторов", "integer", "pcs", null],
  ["radiator_type", "Тип панельного радиатора", "text", null, null],
  ["radiator_height_mm", "Высота панельного радиатора", "decimal", "mm", null],
  ["radiator_length_mm", "Длина панельного радиатора", "decimal", "mm", null],
  ["connection_type", "Схема подключения радиатора", "text", null, null],
  ["radiator_designation", "Радиатор по спецификации отопительных приборов", "text", null, null],
  ["radiator_quantity_piece", "Количество радиаторов по спецификации", "decimal", "pcs", null],
  ["bracket_designation", "Комплект кронштейнов по паспорту радиатора", "text", null, null],
  ["bracket_quantity_set", "Количество комплектов кронштейнов", "decimal", "set", null],
  ["thermostatic_valve_designation", "Термостатический радиаторный клапан по узлу", "text", null, null],
  ["thermostatic_valve_quantity_piece", "Количество термостатических клапанов", "decimal", "pcs", null],
  ["lockshield_valve_designation", "Запорно-настроечный клапан по узлу", "text", null, null],
  ["lockshield_valve_quantity_piece", "Количество запорно-настроечных клапанов", "decimal", "pcs", null],
  ["air_vent_designation", "Ручной воздухоотводчик по спецификации", "text", null, null],
  ["air_vent_quantity_piece", "Количество ручных воздухоотводчиков", "decimal", "pcs", null],
  ["fitting_set_designation", "Комплект переходников и фитингов подключения", "text", null, null],
  ["fitting_set_quantity_set", "Количество комплектов фитингов подключения", "decimal", "set", null],
  ["leak_test_designation", "Проверка герметичности подключения по программе", "text", null, null],
  ["leak_test_count_test", "Количество проверок герметичности", "decimal", "test", null],
  ["thermostatic_head_mode", "Термостатическая головка требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["thermostatic_head_designation", "Термостатическая головка по проекту", "text", null, null],
  ["thermostatic_head_quantity_piece", "Количество термостатических головок", "decimal", "pcs", null],
  ["concealed_pipe_insulation_mode", "Изоляция скрытой подводки требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["concealed_pipe_insulation_designation", "Изоляция скрытой подводки по проекту", "text", null, null],
  ["concealed_pipe_insulation_length_m", "Длина изоляции скрытой подводки", "decimal", "m", null],
] as const);

const KNOWN_SCOPE = [
  "radiator_count", "radiator_type", "radiator_height_mm", "radiator_length_mm",
  "connection_type",
];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("thermostatic_head_")
    ? "thermostatic_head_mode"
    : parameterId.startsWith("concealed_pipe_insulation_")
      ? "concealed_pipe_insulation_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type SteelPanelRadiatorParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const STEEL_PANEL_RADIATOR_PARAMETERS:
readonly SteelPanelRadiatorParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.steel-panel-radiator-r1",
      semantic_parameter_key: `steel-panel-radiator:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PRODUCT_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "radiator_count"
          ? "Укажите подтверждённое количество устанавливаемых радиаторов по заданию или спецификации."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке прибора и принятой схеме подключения.`
            : `${titleRu}: укажите по спецификации отопительных приборов и арматуры, узлу подключения, ППР или программе испытаний.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_RADIATOR_SCOPE"
          : "APPROVED_PROJECT_PRODUCT_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
        source_document: STEEL_PANEL_RADIATOR_SOURCE_ID,
        source_locator: STEEL_PANEL_RADIATOR_SOURCE_METADATA.exact_locator,
        guide_version: "steel-panel-radiator-r1",
        source_snapshot_hash: "9f1f57c27f46207b3ce067f8f7987c012b10525a4e620facf13c6d3657af7e6e",
        applicability: "Только для монтажа указанных стальных панельных радиаторов тип 22, 500×1000 мм, с нижним подключением; полная разводка отопления и балансировка здания не включаются.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
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

export const STEEL_PANEL_RADIATOR_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("panel_radiator_install_count_v1", "pcs", "radiator_count"),
  formula("steel_panel_radiator_type22_500x1000_quantity_v1", "pcs", "radiator_quantity_piece"),
  formula("radiator_wall_bracket_quantity_v1", "set", "bracket_quantity_set"),
  formula("thermostatic_radiator_valve_quantity_v1", "pcs", "thermostatic_valve_quantity_piece"),
  formula("radiator_lockshield_valve_quantity_v1", "pcs", "lockshield_valve_quantity_piece"),
  formula("manual_air_vent_quantity_v1", "pcs", "air_vent_quantity_piece"),
  formula("radiator_connection_fitting_set_quantity_v1", "set", "fitting_set_quantity_set"),
  formula("radiator_connection_leak_test_count_v1", "test", "leak_test_count_test"),
  formula("radiator_thermostatic_head_quantity_v1", "pcs", "thermostatic_head_quantity_piece"),
  formula("concealed_pipe_insulation_length_v1", "m", "concealed_pipe_insulation_length_m"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

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
    semanticOwnerId: `steel-panel-radiator:${input.rowId}`,
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
      sourceId: STEEL_PANEL_RADIATOR_SOURCE_ID,
      source_id: STEEL_PANEL_RADIATOR_SOURCE_ID,
      normId: STEEL_PANEL_RADIATOR_NORM_ID,
      norm_id: STEEL_PANEL_RADIATOR_NORM_ID,
      normVersion: STEEL_PANEL_RADIATOR_SOURCE_METADATA.source_document_version,
      source_title: STEEL_PANEL_RADIATOR_SOURCE_METADATA.source_title,
      exact_locator: STEEL_PANEL_RADIATOR_SOURCE_METADATA.exact_locator,
      source_definition_hash: STEEL_PANEL_RADIATOR_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic one-to-one radiator or accessory consumption",
      "automatic bracket set or valve count",
      "automatic fitting set or leak-test interval",
      "automatic thermostatic head or concealed-pipe insulation",
      "full heating distribution or whole-building balancing",
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

export const STEEL_PANEL_RADIATOR_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:panel_radiator_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и подключение стального панельного радиатора тип 22, 500×1000 мм", unitId: "pcs", formulaId: "panel_radiator_install_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_RADIATOR_SCOPE" }),
  resource({ rowId: "rc09:steel_panel_radiator_type22_500x1000", ordinal: 1, section: "Материалы", category: "material", titleRu: "Радиатор стальной панельный тип 22, 500×1000 мм", unitId: "pcs", formulaId: "steel_panel_radiator_type22_500x1000_quantity_v1", procurementEligible: true, titleParameterIds: ["radiator_designation"], sourceRole: "APPROVED_RADIATOR_SCHEDULE" }),
  resource({ rowId: "rc09:radiator_wall_bracket", ordinal: 2, section: "Материалы", category: "material", titleRu: "Комплект расчётных настенных кронштейнов для панельного радиатора", unitId: "set", formulaId: "radiator_wall_bracket_quantity_v1", procurementEligible: true, titleParameterIds: ["bracket_designation"], sourceRole: "APPROVED_RADIATOR_PRODUCT_DOCUMENTATION" }),
  resource({ rowId: "rc09:thermostatic_radiator_valve", ordinal: 3, section: "Материалы", category: "material", titleRu: "Клапан радиаторный термостатический для нижнего подключения", unitId: "pcs", formulaId: "thermostatic_radiator_valve_quantity_v1", procurementEligible: true, titleParameterIds: ["thermostatic_valve_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:radiator_lockshield_valve", ordinal: 4, section: "Материалы", category: "material", titleRu: "Клапан радиаторный запорно-настроечный", unitId: "pcs", formulaId: "radiator_lockshield_valve_quantity_v1", procurementEligible: true, titleParameterIds: ["lockshield_valve_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:manual_air_vent", ordinal: 5, section: "Материалы", category: "material", titleRu: "Воздухоотводчик ручной радиаторный", unitId: "pcs", formulaId: "manual_air_vent_quantity_v1", procurementEligible: true, titleParameterIds: ["air_vent_designation"], sourceRole: "APPROVED_RADIATOR_SCHEDULE" }),
  resource({ rowId: "rc09:radiator_connection_fitting_set", ordinal: 6, section: "Материалы", category: "material", titleRu: "Комплект переходников и фитингов подключения радиатора", unitId: "set", formulaId: "radiator_connection_fitting_set_quantity_v1", procurementEligible: true, titleParameterIds: ["fitting_set_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:radiator_connection_leak_test", ordinal: 7, section: "Контроль", category: "service", titleRu: "Проверка герметичности подключения радиатора", unitId: "test", formulaId: "radiator_connection_leak_test_count_v1", procurementEligible: true, titleParameterIds: ["leak_test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:radiator_thermostatic_head", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Термостатическая головка радиаторного клапана", unitId: "pcs", formulaId: "radiator_thermostatic_head_quantity_v1", inclusionAst: equals("thermostatic_head_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["thermostatic_head_designation"], sourceRole: "APPROVED_RADIATOR_SCHEDULE" }),
  resource({ rowId: "rc09:concealed_pipe_insulation", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Теплоизоляция скрытой подводки к радиатору", unitId: "m", formulaId: "concealed_pipe_insulation_length_v1", inclusionAst: equals("concealed_pipe_insulation_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["concealed_pipe_insulation_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
]);

export const STEEL_PANEL_RADIATOR_SHORT_INPUT = Object.freeze({
  radiator_count: 8,
  radiator_type: "22",
  radiator_height_mm: 500,
  radiator_length_mm: 1000,
  connection_type: "нижнее подключение",
});

export const STEEL_PANEL_RADIATOR_ACCEPTANCE_INPUT = Object.freeze({
  ...STEEL_PANEL_RADIATOR_SHORT_INPUT,
  radiator_designation: "Радиатор стальной панельный тип 22, 500×1000 мм по спецификации",
  radiator_quantity_piece: 8,
  bracket_designation: "Комплект настенных кронштейнов по паспорту выбранного радиатора",
  bracket_quantity_set: 8,
  thermostatic_valve_designation: "Клапан термостатический для нижнего подключения по узлу",
  thermostatic_valve_quantity_piece: 8,
  lockshield_valve_designation: "Клапан запорно-настроечный по узлу подключения",
  lockshield_valve_quantity_piece: 8,
  air_vent_designation: "Воздухоотводчик ручной по спецификации",
  air_vent_quantity_piece: 8,
  fitting_set_designation: "Комплект переходников и фитингов по узлу подключения",
  fitting_set_quantity_set: 8,
  leak_test_designation: "Проверка герметичности подключения по программе испытаний",
  leak_test_count_test: 8,
  thermostatic_head_mode: "NOT_REQUIRED",
  concealed_pipe_insulation_mode: "NOT_REQUIRED",
});

export async function compileSteelPanelRadiatorR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? STEEL_PANEL_RADIATOR_CATALOG_ID;
  if (catalogId !== STEEL_PANEL_RADIATOR_CATALOG_ID) {
    throw new Error(`STEEL_PANEL_RADIATOR_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.steel-panel-radiator-r1",
    catalogId,
    primaryMeasureParameterId: "radiator_count",
    parameterDefinitions: [...STEEL_PANEL_RADIATOR_PARAMETERS],
    formulaDefinitions: [...STEEL_PANEL_RADIATOR_FORMULAS],
    resourceDefinitions: [...STEEL_PANEL_RADIATOR_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 14,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const STEEL_PANEL_RADIATOR_SOURCE_SUMMARY = Object.freeze({
  sourceId: STEEL_PANEL_RADIATOR_SOURCE_ID,
  normId: STEEL_PANEL_RADIATOR_NORM_ID,
  formula: "known radiator count, type, dimensions and connection identity give installation work only; exact radiator, bracket, valve, vent, fitting, test and conditional quantities come from the approved project package",
});
