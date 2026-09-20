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

export const LED_LUMINAIRE_INSTALLATION_CATALOG_ID =
  "canonical-work:base:electrical_interior_lighting_install_standard";
export const LED_LUMINAIRE_INSTALLATION_SOURCE_ID =
  "project_led_luminaire_installation_package_v1";
export const LED_LUMINAIRE_INSTALLATION_NORM_ID =
  "norm:project:led_luminaire_installation:package:v1";

export const LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость светильников, план потолков, узел крепления и подключения, ППР и программа электроизмерений",
  source_authority: "Проектная электротехническая организация, изготовитель светильника и утверждающий инженер проекта",
  source_document_version: "PROJECT_LED_LUMINAIRE_SCHEDULE_MOUNTING_CONNECTION_METHOD_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_led_luminaire_installation_package_r1",
  exact_locator: "Количество и маркировка накладных LED-светильников 36 Вт IP40; основание и комплект крепления; клеммный соединитель и присоединительный провод; PE-наконечник; высота и средство доступа; программа проверки защитного соединения; отдельный драйвер и адаптер усиления потолка только по условным проектным ветвям",
  use_restriction: "Известное количество и точная идентичность светильников определяют монтаж и количество самих светильников. Крепёж, соединители, провод, PE-наконечники, средство доступа и испытания берутся только из утверждённых проектных, продуктовых, ППР и QA-документов; линия освещения, выключатели и распределительный щит не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "separate_driver_designation", "separate_driver_quantity_piece",
  "ceiling_adapter_designation", "ceiling_adapter_quantity_set",
]);
const PARAMETER_SPECS = Object.freeze([
  ["luminaire_count", "Количество монтируемых светильников", "integer", "pcs", null],
  ["rated_power", "Номинальная мощность светильника", "enum", null, ["36_W"]],
  ["ingress_protection", "Степень защиты светильника", "enum", null, ["IP40"]],
  ["mounting_type", "Способ монтажа светильника", "enum", null, ["SURFACE"]],
  ["anchor_set_designation", "Комплект крепления по основанию и узлу", "text", null, null],
  ["anchor_set_quantity_set", "Количество комплектов крепления", "decimal", "set", null],
  ["terminal_connector_designation", "Клеммный соединитель по схеме подключения", "text", null, null],
  ["terminal_connector_quantity_piece", "Количество клеммных соединителей", "decimal", "pcs", null],
  ["connection_wire_designation", "Присоединительный провод по узлу", "text", null, null],
  ["connection_wire_length_m", "Длина присоединительного провода", "decimal", "m", null],
  ["pe_lug_designation", "Наконечник защитного проводника по схеме", "text", null, null],
  ["pe_lug_quantity_piece", "Количество PE-наконечников", "decimal", "pcs", null],
  ["work_platform_designation", "Средство доступа по ППР и высоте монтажа", "text", null, null],
  ["work_platform_shift", "Количество смен средства доступа", "decimal", "shift", null],
  ["pe_test_designation", "Проверка защитного соединения по программе", "text", null, null],
  ["pe_test_count", "Количество проверок защитного соединения", "decimal", "test", null],
  ["separate_driver_mode", "Отдельный LED-драйвер требуется по ведомости", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["separate_driver_designation", "Отдельный LED-драйвер по ведомости", "text", null, null],
  ["separate_driver_quantity_piece", "Количество отдельных LED-драйверов", "decimal", "pcs", null],
  ["ceiling_adapter_mode", "Адаптер усиления потолка требуется по узлу", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["ceiling_adapter_designation", "Адаптер усиления потолка по узлу", "text", null, null],
  ["ceiling_adapter_quantity_set", "Количество адаптеров усиления потолка", "decimal", "set", null],
] as const);
const KNOWN_SCOPE = ["luminaire_count", "rated_power", "ingress_protection", "mounting_type"];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("separate_driver_")
    ? "separate_driver_mode"
    : parameterId.startsWith("ceiling_adapter_")
      ? "ceiling_adapter_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type LedLuminaireInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const LED_LUMINAIRE_INSTALLATION_PARAMETERS:
readonly LedLuminaireInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.led-luminaire-installation-r1",
      semantic_parameter_key: `led-luminaire-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_LUMINAIRE_SCHEDULE_MOUNTING_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "luminaire_count"
          ? "Укажите подтверждённое количество устанавливаемых светильников по ведомости."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке и типу выбранного светильника.`
            : `${titleRu}: укажите по ведомости, узлу крепления/подключения, ППР или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE"
          : "APPROVED_PROJECT_LUMINAIRE_SCHEDULE_MOUNTING_CONNECTION_METHOD_OR_QA_DOCUMENTATION",
        source_document: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
        source_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "led-luminaire-installation-r1",
        source_snapshot_hash: "1841cca324f1cddf7cec1af130221a003d646b7c04eba1864c3863326ae07ae4",
        applicability: "Только для монтажа накладных LED-светильников 36 Вт IP40; кабельная линия освещения, выключатели и распределительный щит исключены.",
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
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256" };
}
export const LED_LUMINAIRE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("led_luminaire_install_count_v1", "pcs", "luminaire_count"),
  formula("led_luminaire_36w_ip40_count_v1", "pcs", "luminaire_count"),
  formula("luminaire_mounting_anchor_set_quantity_v1", "set", "anchor_set_quantity_set"),
  formula("luminaire_terminal_connector_quantity_v1", "pcs", "terminal_connector_quantity_piece"),
  formula("luminaire_connection_wire_length_v1", "m", "connection_wire_length_m"),
  formula("luminaire_pe_lug_quantity_v1", "pcs", "pe_lug_quantity_piece"),
  formula("luminaire_work_platform_shift_v1", "shift", "work_platform_shift"),
  formula("luminaire_pe_continuity_test_count_v1", "test", "pe_test_count"),
  formula("separate_led_driver_quantity_v1", "pcs", "separate_driver_quantity_piece"),
  formula("ceiling_reinforcement_adapter_quantity_v1", "set", "ceiling_adapter_quantity_set"),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `led-luminaire-installation:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
      source_id: LED_LUMINAIRE_INSTALLATION_SOURCE_ID,
      normId: LED_LUMINAIRE_INSTALLATION_NORM_ID,
      norm_id: LED_LUMINAIRE_INSTALLATION_NORM_ID,
      normVersion: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: LED_LUMINAIRE_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic anchor set or terminal connector per luminaire",
      "historical connection-wire, work-platform or test rate",
      "automatic PE lug, separate LED driver or ceiling reinforcement adapter",
      "lighting cable line, light switch or distribution board",
      "invented price",
    ],
  };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

export const LED_LUMINAIRE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:led_luminaire_install", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Монтаж и подключение накладного светодиодного светильника 36 Вт IP40", unitId: "pcs", formulaId: "led_luminaire_install_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE" }),
  resource({ rowId: "rc09:led_luminaire_36w_ip40", ordinal: 1, section: "Материалы", category: "material", titleRu: "Светильник светодиодный накладной 36 Вт IP40", unitId: "pcs", formulaId: "led_luminaire_36w_ip40_count_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_LUMINAIRE_SCOPE" }),
  resource({ rowId: "rc09:luminaire_mounting_anchor_set", ordinal: 2, section: "Материалы", category: "material", titleRu: "Комплект крепления накладного светильника по основанию", unitId: "set", formulaId: "luminaire_mounting_anchor_set_quantity_v1", procurementEligible: true, titleParameterIds: ["anchor_set_designation"], sourceRole: "APPROVED_MOUNTING_DETAIL" }),
  resource({ rowId: "rc09:luminaire_terminal_connector", ordinal: 3, section: "Материалы", category: "material", titleRu: "Клеммный соединитель светильника по схеме подключения", unitId: "pcs", formulaId: "luminaire_terminal_connector_quantity_v1", procurementEligible: true, titleParameterIds: ["terminal_connector_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_connection_wire_3x1_5", ordinal: 4, section: "Материалы", category: "material", titleRu: "Провод присоединительный негорючий 3×1,5 мм²", unitId: "m", formulaId: "luminaire_connection_wire_length_v1", procurementEligible: true, titleParameterIds: ["connection_wire_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_pe_lug", ordinal: 5, section: "Материалы", category: "material", titleRu: "Наконечник кольцевой для защитного проводника светильника", unitId: "pcs", formulaId: "luminaire_pe_lug_quantity_v1", procurementEligible: true, titleParameterIds: ["pe_lug_designation"], sourceRole: "APPROVED_CONNECTION_DETAIL" }),
  resource({ rowId: "rc09:luminaire_work_platform", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Средство доступа для монтажа светильника", unitId: "shift", formulaId: "luminaire_work_platform_shift_v1", procurementEligible: true, titleParameterIds: ["work_platform_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:luminaire_pe_continuity_test", ordinal: 7, section: "Контроль", category: "service", titleRu: "Проверка защитного соединения и включения светильника", unitId: "test", formulaId: "luminaire_pe_continuity_test_count_v1", procurementEligible: true, titleParameterIds: ["pe_test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:separate_led_driver", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Отдельный LED-драйвер по ведомости светильников", unitId: "pcs", formulaId: "separate_led_driver_quantity_v1", inclusionAst: equals("separate_driver_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["separate_driver_designation"], sourceRole: "APPROVED_LUMINAIRE_SCHEDULE" }),
  resource({ rowId: "rc09:suspended_ceiling_reinforcement_adapter", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Адаптер усиления подвесного потолка под светильник", unitId: "set", formulaId: "ceiling_reinforcement_adapter_quantity_v1", inclusionAst: equals("ceiling_adapter_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["ceiling_adapter_designation"], sourceRole: "APPROVED_MOUNTING_DETAIL" }),
]);

export const LED_LUMINAIRE_INSTALLATION_SHORT_INPUT = Object.freeze({
  luminaire_count: 30, rated_power: "36_W", ingress_protection: "IP40", mounting_type: "SURFACE",
});
export const LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  anchor_set_designation: "Комплект анкеров по бетонному основанию и узлу", anchor_set_quantity_set: 30,
  terminal_connector_designation: "Клеммный соединитель по схеме подключения", terminal_connector_quantity_piece: 30,
  connection_wire_designation: "Негорючий провод 3×1,5 мм² по узлу", connection_wire_length_m: 18,
  pe_lug_designation: "Кольцевой наконечник PE по схеме", pe_lug_quantity_piece: 30,
  work_platform_designation: "Передвижная вышка по высоте и ППР", work_platform_shift: 0.6,
  pe_test_designation: "Проверка защитного соединения по программе", pe_test_count: 30,
  separate_driver_mode: "NOT_REQUIRED", ceiling_adapter_mode: "NOT_REQUIRED",
});

export async function compileLedLuminaireInstallationR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? LED_LUMINAIRE_INSTALLATION_CATALOG_ID;
  if (catalogId !== LED_LUMINAIRE_INSTALLATION_CATALOG_ID) {
    throw new Error(`LED_LUMINAIRE_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.led-luminaire-installation-r1", catalogId,
    primaryMeasureParameterId: "luminaire_count",
    parameterDefinitions: [...LED_LUMINAIRE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...LED_LUMINAIRE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...LED_LUMINAIRE_INSTALLATION_RESOURCES], submittedParameters,
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 14,
    hashJson: async (value) => JSON.stringify(value) });
}
