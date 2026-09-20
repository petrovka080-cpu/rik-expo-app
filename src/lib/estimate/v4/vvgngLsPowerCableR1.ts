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

export const VVGNG_LS_POWER_CABLE_CATALOG_ID =
  "canonical-work:base:electrical_interior_vvg_cable_lay_standard";
export const VVGNG_LS_POWER_CABLE_SOURCE_ID = "project_vvgng_ls_power_cable_package_v1";
export const VVGNG_LS_POWER_CABLE_NORM_ID = "norm:project:vvgng_ls_power_cable:package:v1";

export const VVGNG_LS_POWER_CABLE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый кабельный журнал, план трассы, узлы крепления, ведомость вводов и оконцеваний, проходки и программа электроизмерений",
  source_authority: "Проектная электротехническая организация и утверждающий инженер проекта",
  source_document_version: "PROJECT_VVGNG_LS_CABLE_ROUTE_TERMINATION_FIRESTOP_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_vvgng_ls_power_cable_package_r1",
  exact_locator: "Марка и сечение кабеля, длина маршрута; кабельный журнал и маркировка; раскладка крепежа; ведомость кабельных вводов и наконечников; огнезащитные проходки; программа измерения изоляции и непрерывности PE; лоток, защитная труба и смазка по условным ветвям",
  use_restriction: "Известная длина маршрута определяет работу и чистую длину кабеля без неуказанного запаса. Маркеры, крепёж, вводы, наконечники, огнезащитный состав и испытания берутся только из утверждённых проектных и QA-документов; щит и полная система электроснабжения не включаются.",
});

const CONDITIONAL_DETAILS = new Set([
  "cable_tray_designation", "cable_tray_length_m",
  "protective_pipe_designation", "protective_pipe_length_m",
  "pulling_lubricant_designation", "pulling_lubricant_quantity_kg",
]);
const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина маршрута кабеля", "decimal", "m", null],
  ["cable_mark", "Марка силового кабеля", "text", null, null],
  ["core_count", "Количество жил кабеля", "integer", "pcs", null],
  ["conductor_area_mm2", "Сечение одной жилы", "decimal", "mm2", null],
  ["marker_designation", "Кабельная бирка по кабельному журналу", "text", null, null],
  ["marker_quantity_piece", "Количество кабельных бирок", "decimal", "pcs", null],
  ["clamp_designation", "Безгалогенный крепёж по раскладке", "text", null, null],
  ["clamp_quantity_piece", "Количество креплений кабеля", "decimal", "pcs", null],
  ["gland_designation", "Кабельный ввод по ведомости подключений", "text", null, null],
  ["gland_quantity_piece", "Количество кабельных вводов", "decimal", "pcs", null],
  ["lug_designation", "Медный наконечник 6 мм² по схеме оконцевания", "text", null, null],
  ["lug_quantity_piece", "Количество кабельных наконечников", "decimal", "pcs", null],
  ["firestop_designation", "Огнезащитный состав по паспорту проходки", "text", null, null],
  ["firestop_quantity_kg", "Масса огнезащитного состава", "decimal", "kg", null],
  ["test_designation", "Измерение изоляции и непрерывности PE по программе", "text", null, null],
  ["test_count", "Количество комплектов электроизмерений", "decimal", "test", null],
  ["cable_tray_mode", "Кабельный лоток требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["cable_tray_designation", "Кабельный лоток по проекту", "text", null, null],
  ["cable_tray_length_m", "Длина кабельного лотка", "decimal", "m", null],
  ["protective_pipe_mode", "Защитная труба требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["protective_pipe_designation", "Защитная труба по проекту", "text", null, null],
  ["protective_pipe_length_m", "Длина защитной трубы", "decimal", "m", null],
  ["pulling_lubricant_mode", "Смазка для протяжки требуется по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pulling_lubricant_designation", "Смазка для протяжки по ППР", "text", null, null],
  ["pulling_lubricant_quantity_kg", "Масса смазки для протяжки", "decimal", "kg", null],
] as const);
const KNOWN_SCOPE = ["length_m", "cable_mark", "core_count", "conductor_area_mm2"];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("cable_tray_")
    ? "cable_tray_mode"
    : parameterId.startsWith("protective_pipe_")
      ? "protective_pipe_mode"
      : parameterId.startsWith("pulling_lubricant_")
        ? "pulling_lubricant_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type VvgngLsPowerCableParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
export const VVGNG_LS_POWER_CABLE_PARAMETERS:
readonly VvgngLsPowerCableParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.vvgng-ls-power-cable-r1",
      semantic_parameter_key: `vvgng-ls-power-cable:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId) ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE" : "APPROVED_CABLE_ROUTE_TERMINATION_FIRESTOP_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите чистую длину маршрута по плану трассы; запас добавляется только отдельным подтверждённым значением."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по кабельному журналу и маркировке кабеля.`
            : `${titleRu}: укажите по кабельному журналу, узлу, ведомости оконцеваний или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE"
          : "APPROVED_PROJECT_CABLE_ROUTE_TERMINATION_FIRESTOP_OR_QA_DOCUMENTATION",
        source_document: VVGNG_LS_POWER_CABLE_SOURCE_ID,
        source_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
        guide_version: "vvgng-ls-power-cable-r1",
        source_snapshot_hash: "48776a3acdd089c18a4556180c62c649c0badbdfab8cca30d81e8b413d428c19",
        applicability: "Только для прокладки ВВГнг(А)-LS 5×6 мм² по указанному маршруту; щит и полная система электроснабжения здания не включаются.",
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
export const VVGNG_LS_POWER_CABLE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("vvgng_ls_cable_lay_length_v1", "m", "length_m"),
  formula("vvgng_a_ls_5x6_cable_net_length_v1", "m", "length_m"),
  formula("fire_resistant_cable_marker_quantity_v1", "pcs", "marker_quantity_piece"),
  formula("halogen_free_cable_clamp_quantity_v1", "pcs", "clamp_quantity_piece"),
  formula("cable_gland_for_5x6_quantity_v1", "pcs", "gland_quantity_piece"),
  formula("copper_lug_6mm2_quantity_v1", "pcs", "lug_quantity_piece"),
  formula("firestop_cable_compound_quantity_v1", "kg", "firestop_quantity_kg"),
  formula("power_cable_test_count_v1", "test", "test_count"),
  formula("cable_tray_length_v1", "m", "cable_tray_length_m"),
  formula("cable_protective_pipe_length_v1", "m", "protective_pipe_length_m"),
  formula("cable_pulling_lubricant_quantity_v1", "kg", "pulling_lubricant_quantity_kg"),
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
    semanticOwnerId: `vvgng-ls-power-cable:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: VVGNG_LS_POWER_CABLE_SOURCE_ID,
      source_id: VVGNG_LS_POWER_CABLE_SOURCE_ID, normId: VVGNG_LS_POWER_CABLE_NORM_ID,
      norm_id: VVGNG_LS_POWER_CABLE_NORM_ID,
      normVersion: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.source_document_version,
      source_title: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.source_title,
      exact_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
      source_definition_hash: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic cable reserve", "automatic marker or clamp spacing",
      "automatic glands, lugs, penetration compound or test count",
      "automatic tray, protective pipe or pulling lubricant",
      "switchboard or full building power system", "invented price",
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

export const VVGNG_LS_POWER_CABLE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:vvgng_ls_cable_lay", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Прокладка и маркировка силового кабеля ВВГнг(А)-LS 5×6 мм²", unitId: "m", formulaId: "vvgng_ls_cable_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE" }),
  resource({ rowId: "rc09:vvgng_a_ls_5x6_cable", ordinal: 1, section: "Материалы", category: "material", titleRu: "Кабель силовой ВВГнг(А)-LS 5×6 мм² — чистая длина без неуказанного запаса", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_net_length_v1", procurementEligible: true, sourceRole: "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE" }),
  resource({ rowId: "rc09:fire_resistant_cable_marker", ordinal: 2, section: "Материалы", category: "material", titleRu: "Бирка кабельная негорючая с маркировкой линии", unitId: "pcs", formulaId: "fire_resistant_cable_marker_quantity_v1", procurementEligible: true, titleParameterIds: ["marker_designation"], sourceRole: "APPROVED_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:halogen_free_cable_clamp", ordinal: 3, section: "Материалы", category: "material", titleRu: "Крепление кабеля безгалогенное по раскладке", unitId: "pcs", formulaId: "halogen_free_cable_clamp_quantity_v1", procurementEligible: true, titleParameterIds: ["clamp_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_gland_for_5x6", ordinal: 4, section: "Материалы", category: "material", titleRu: "Ввод кабельный герметичный под кабель 5×6 мм²", unitId: "pcs", formulaId: "cable_gland_for_5x6_quantity_v1", procurementEligible: true, titleParameterIds: ["gland_designation"], sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:copper_lug_6mm2", ordinal: 5, section: "Материалы", category: "material", titleRu: "Наконечник кабельный медный лужёный 6 мм²", unitId: "pcs", formulaId: "copper_lug_6mm2_quantity_v1", procurementEligible: true, titleParameterIds: ["lug_designation"], sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:firestop_cable_penetration_compound", ordinal: 6, section: "Материалы", category: "material", titleRu: "Состав огнезащитный для кабельных проходок", unitId: "kg", formulaId: "firestop_cable_compound_quantity_v1", procurementEligible: true, titleParameterIds: ["firestop_designation"], sourceRole: "APPROVED_FIRESTOP_DETAIL" }),
  resource({ rowId: "rc09:power_cable_insulation_continuity_test", ordinal: 7, section: "Контроль", category: "service", titleRu: "Измерение сопротивления изоляции и непрерывности PE-проводника", unitId: "test", formulaId: "power_cable_test_count_v1", procurementEligible: true, titleParameterIds: ["test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:cable_tray", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Кабельный лоток по проекту", unitId: "m", formulaId: "cable_tray_length_v1", inclusionAst: equals("cable_tray_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["cable_tray_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_protective_pipe", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Защитная труба кабеля по проекту", unitId: "m", formulaId: "cable_protective_pipe_length_v1", inclusionAst: equals("protective_pipe_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["protective_pipe_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_pulling_lubricant", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Смазка для протяжки кабеля по ППР", unitId: "kg", formulaId: "cable_pulling_lubricant_quantity_v1", inclusionAst: equals("pulling_lubricant_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["pulling_lubricant_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
]);

export const VVGNG_LS_POWER_CABLE_SHORT_INPUT = Object.freeze({
  length_m: 150, cable_mark: "ВВГнг(А)-LS", core_count: 5, conductor_area_mm2: 6,
});
export const VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT = Object.freeze({
  ...VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  marker_designation: "Негорючая кабельная бирка по кабельному журналу", marker_quantity_piece: 12,
  clamp_designation: "Безгалогенный крепёж по раскладке трассы", clamp_quantity_piece: 300,
  gland_designation: "Герметичный ввод под ВВГнг(А)-LS 5×6 мм²", gland_quantity_piece: 3,
  lug_designation: "Медный лужёный наконечник 6 мм² по схеме", lug_quantity_piece: 11,
  firestop_designation: "Огнезащитный состав по паспорту проходки", firestop_quantity_kg: 3.75,
  test_designation: "Измерение изоляции и непрерывности PE по программе", test_count: 3,
  cable_tray_mode: "NOT_REQUIRED", protective_pipe_mode: "NOT_REQUIRED",
  pulling_lubricant_mode: "NOT_REQUIRED",
});

export async function compileVvgngLsPowerCableR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? VVGNG_LS_POWER_CABLE_CATALOG_ID;
  if (catalogId !== VVGNG_LS_POWER_CABLE_CATALOG_ID) {
    throw new Error(`VVGNG_LS_POWER_CABLE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.vvgng-ls-power-cable-r1", catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...VVGNG_LS_POWER_CABLE_PARAMETERS],
    formulaDefinitions: [...VVGNG_LS_POWER_CABLE_FORMULAS],
    resourceDefinitions: [...VVGNG_LS_POWER_CABLE_RESOURCES], submittedParameters,
    confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 15,
    hashJson: async (value) => JSON.stringify(value) });
}
