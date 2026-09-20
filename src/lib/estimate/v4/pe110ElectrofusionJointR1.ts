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

export const PE110_ELECTROFUSION_JOINT_CATALOG_ID =
  "canonical-work:base:plumbing_interior_pnd_pipe_connect_standard";
export const PE110_ELECTROFUSION_JOINT_SOURCE_ID =
  "project_pe110_electrofusion_joint_package_v1";
export const PE110_ELECTROFUSION_JOINT_NORM_ID =
  "norm:project:pe110_electrofusion_joint:package:v1";

export const PE110_ELECTROFUSION_JOINT_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость электромуфтовых соединений ПЭ, паспорт совместимой муфты, технологическая карта сварки и программа контроля",
  source_authority: "Проектная организация, производитель трубной системы, аттестованная сварочная служба и утверждающий инженер проекта",
  source_document_version: "PROJECT_PE110_ELECTROFUSION_JOINT_SCHEDULE_WPS_EQUIPMENT_AND_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_pe110_electrofusion_joint_package_r1",
  exact_locator: "Количество и спецификация стыков; совместимая муфта; очистка, салфетки и маркировка; аппарат, скребок, протокол и условные генератор/позиционер",
  use_restriction: "Количество стыков определяет только объём сварочной операции; материалы, расходники, машино-часы и документы берутся из проекта, паспорта системы, WPS и программы контроля без переноса исторических коэффициентов",
});

const CONDITIONAL_DETAILS = new Set([
  "generator_designation",
  "generator_machine_h",
  "positioner_designation",
  "positioner_machine_h",
]);

const PARAMETER_SPECS = Object.freeze([
  ["count", "Количество электромуфтовых стыков", "decimal", "pcs", null],
  ["pipe_material_grade", "Марка полиэтилена трубы", "text", null, null],
  ["pipe_sdr", "Размерное отношение SDR", "text", null, null],
  ["pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["pressure_class", "Класс давления трубы", "text", null, null],
  ["coupler_designation", "Совместимая электромуфта", "text", null, null],
  ["coupler_quantity_piece", "Количество электромуфт", "decimal", "pcs", null],
  ["cleaner_designation", "Очиститель зоны сварки", "text", null, null],
  ["cleaner_volume_l", "Объём очистителя зоны сварки", "decimal", "l", null],
  ["wipe_designation", "Безворсовая салфетка для подготовки стыка", "text", null, null],
  ["wipe_quantity_piece", "Количество безворсовых салфеток", "decimal", "pcs", null],
  ["label_designation", "Маркировочная этикетка сварного стыка", "text", null, null],
  ["label_quantity_piece", "Количество маркировочных этикеток", "decimal", "pcs", null],
  ["control_unit_designation", "Электромуфтовый сварочный аппарат", "text", null, null],
  ["control_unit_machine_h", "Машино-часы электромуфтового аппарата", "decimal", "machine_hour", null],
  ["scraper_designation", "Ротационный скребок для трубы ПЭ", "text", null, null],
  ["scraper_machine_h", "Машино-часы ротационного скребка", "decimal", "machine_hour", null],
  ["protocol_designation", "Протокол электромуфтовой сварки", "text", null, null],
  ["protocol_count_document", "Количество протоколов электромуфтовой сварки", "decimal", "document", null],
  ["generator_mode", "Автономный генератор требуется по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["generator_designation", "Автономный генератор по ППР", "text", null, null],
  ["generator_machine_h", "Машино-часы автономного генератора", "decimal", "machine_hour", null],
  ["positioner_mode", "Позиционер трубы требуется по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["positioner_designation", "Позиционер трубы ПЭ", "text", null, null],
  ["positioner_machine_h", "Машино-часы позиционера трубы", "decimal", "machine_hour", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("generator_")
    ? "generator_mode"
    : parameterId.startsWith("positioner_")
      ? "positioner_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type Pe110ElectrofusionJointParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

const KNOWN_SCOPE = ["count", "pipe_material_grade", "pipe_sdr", "pipe_outside_diameter_mm", "pressure_class"];

export const PE110_ELECTROFUSION_JOINT_PARAMETERS:
readonly Pe110ElectrofusionJointParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
        : valueType === "decimal"
          ? { min: 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.pe110-electrofusion-joint-r1",
      semantic_parameter_key: `pe110-electrofusion-joint:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PIPE_SYSTEM_JOINT_SCHEDULE_WPS_EQUIPMENT_OR_QA_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "count"
          ? "Укажите подтверждённое количество электромуфтовых стыков."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке трубы и проектной спецификации.`
            : `${titleRu}: укажите по ведомости соединений, паспорту системы, WPS, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_PIPE_SCHEDULE"
          : "APPROVED_PROJECT_PRODUCT_WPS_METHOD_OR_QA_DOCUMENTATION",
        source_document: PE110_ELECTROFUSION_JOINT_SOURCE_ID,
        source_locator: PE110_ELECTROFUSION_JOINT_SOURCE_METADATA.exact_locator,
        guide_version: "pe110-electrofusion-joint-r1",
        source_snapshot_hash: "661f113676ac4c465a8ffb673e9ee8fdaf539b1ea052fc1b1a18ee7bf608d25f",
        applicability: "Только для атомарной электромуфтовой сварки указанных стыков ПЭ Ø110; труба трассы, траншея, подготовка, камеры и дезинфекция сети не включаются.",
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

export const PE110_ELECTROFUSION_JOINT_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("pe110_electrofusion_weld_count_v1", "pcs", "count"),
  formula("pe100_electrofusion_coupler_quantity_v1", "pcs", "coupler_quantity_piece"),
  formula("pe_joint_isopropyl_cleaner_volume_v1", "l", "cleaner_volume_l"),
  formula("lint_free_pipe_wipe_quantity_v1", "pcs", "wipe_quantity_piece"),
  formula("pe_joint_identification_label_quantity_v1", "pcs", "label_quantity_piece"),
  formula("electrofusion_control_unit_time_v1", "machine_hour", "control_unit_machine_h"),
  formula("pe_pipe_rotary_scraper_time_v1", "machine_hour", "scraper_machine_h"),
  formula("electrofusion_joint_protocol_count_v1", "document", "protocol_count_document"),
  formula("electrofusion_generator_time_v1", "machine_hour", "generator_machine_h"),
  formula("pe_pipe_positioner_time_v1", "machine_hour", "positioner_machine_h"),
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
    semanticOwnerId: `pe110-electrofusion-joint:${input.rowId}`,
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
      sourceId: PE110_ELECTROFUSION_JOINT_SOURCE_ID,
      source_id: PE110_ELECTROFUSION_JOINT_SOURCE_ID,
      normId: PE110_ELECTROFUSION_JOINT_NORM_ID,
      norm_id: PE110_ELECTROFUSION_JOINT_NORM_ID,
      normVersion: PE110_ELECTROFUSION_JOINT_SOURCE_METADATA.source_document_version,
      source_title: PE110_ELECTROFUSION_JOINT_SOURCE_METADATA.source_title,
      exact_locator: PE110_ELECTROFUSION_JOINT_SOURCE_METADATA.exact_locator,
      source_definition_hash: PE110_ELECTROFUSION_JOINT_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic coupler, cleaner, wipe or label consumption",
      "automatic control-unit, scraper, generator or positioner productivity",
      "automatic welding-protocol count",
      "pipe length, trench, sand bedding, water chamber or network disinfection",
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

export const PE110_ELECTROFUSION_JOINT_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:pe110_electrofusion_weld", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Электромуфтовая сварка трубы ПЭ Ø110 мм", unitId: "pcs", formulaId: "pe110_electrofusion_weld_count_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_JOINT_SCHEDULE" }),
  resource({ rowId: "rc09:pe100_electrofusion_coupler_110_sdr17", ordinal: 1, section: "Материалы", category: "material", titleRu: "Муфта электросварная совместимая с трубой ПЭ Ø110", unitId: "pcs", formulaId: "pe100_electrofusion_coupler_quantity_v1", procurementEligible: true, titleParameterIds: ["coupler_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_BILL_OF_MATERIALS" }),
  resource({ rowId: "rc09:pe_joint_isopropyl_cleaner", ordinal: 2, section: "Расходные материалы", category: "material", titleRu: "Очиститель зоны электромуфтовой сварки ПЭ", unitId: "l", formulaId: "pe_joint_isopropyl_cleaner_volume_v1", procurementEligible: true, titleParameterIds: ["cleaner_designation"], sourceRole: "APPROVED_ELECTROFUSION_WPS" }),
  resource({ rowId: "rc09:lint_free_pipe_wipe", ordinal: 3, section: "Расходные материалы", category: "material", titleRu: "Салфетка безворсовая для подготовки трубы ПЭ", unitId: "pcs", formulaId: "lint_free_pipe_wipe_quantity_v1", procurementEligible: true, titleParameterIds: ["wipe_designation"], sourceRole: "APPROVED_ELECTROFUSION_WPS" }),
  resource({ rowId: "rc09:pe_joint_identification_label", ordinal: 4, section: "Расходные материалы", category: "material", titleRu: "Этикетка идентификации электромуфтового стыка", unitId: "pcs", formulaId: "pe_joint_identification_label_quantity_v1", procurementEligible: true, titleParameterIds: ["label_designation"], sourceRole: "APPROVED_ELECTROFUSION_QA_PLAN" }),
  resource({ rowId: "rc09:electrofusion_control_unit", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Аппарат электромуфтовой сварки с регистрацией параметров", unitId: "machine_hour", formulaId: "electrofusion_control_unit_time_v1", procurementEligible: true, titleParameterIds: ["control_unit_designation"], sourceRole: "APPROVED_WPS_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:pe_pipe_rotary_scraper", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Скребок ротационный для подготовки трубы ПЭ", unitId: "machine_hour", formulaId: "pe_pipe_rotary_scraper_time_v1", procurementEligible: true, titleParameterIds: ["scraper_designation"], sourceRole: "APPROVED_WPS_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:electrofusion_joint_protocol", ordinal: 7, section: "Контроль", category: "service", titleRu: "Протокол электромуфтового сварного соединения", unitId: "document", formulaId: "electrofusion_joint_protocol_count_v1", procurementEligible: true, titleParameterIds: ["protocol_designation"], sourceRole: "APPROVED_ELECTROFUSION_QA_PLAN" }),
  resource({ rowId: "rc09:electrofusion_generator", ordinal: 8, section: "Условное оборудование", category: "equipment", titleRu: "Автономный генератор для электромуфтовой сварки", unitId: "machine_hour", formulaId: "electrofusion_generator_time_v1", inclusionAst: equals("generator_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["generator_designation"], sourceRole: "APPROVED_ELECTROFUSION_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:pe_pipe_positioner", ordinal: 9, section: "Условное оборудование", category: "equipment", titleRu: "Позиционер трубы ПЭ для электромуфтовой сварки", unitId: "machine_hour", formulaId: "pe_pipe_positioner_time_v1", inclusionAst: equals("positioner_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["positioner_designation"], sourceRole: "APPROVED_ELECTROFUSION_METHOD_STATEMENT" }),
]);

export const PE110_ELECTROFUSION_JOINT_SHORT_INPUT = Object.freeze({
  count: 20,
  pipe_material_grade: "PE100",
  pipe_sdr: "SDR17",
  pipe_outside_diameter_mm: 110,
  pressure_class: "PN10",
});

export const PE110_ELECTROFUSION_JOINT_ACCEPTANCE_INPUT = Object.freeze({
  ...PE110_ELECTROFUSION_JOINT_SHORT_INPUT,
  coupler_designation: "Муфта электросварная PE100 Ø110 SDR17 PN10 по паспорту системы",
  coupler_quantity_piece: 20,
  cleaner_designation: "Изопропиловый очиститель по WPS электромуфтовой сварки",
  cleaner_volume_l: 0.4,
  wipe_designation: "Салфетка безворсовая по WPS электромуфтовой сварки",
  wipe_quantity_piece: 40,
  label_designation: "Стойкая идентификационная этикетка сварного стыка",
  label_quantity_piece: 20,
  control_unit_designation: "Аппарат электромуфтовой сварки с протоколированием",
  control_unit_machine_h: 5,
  scraper_designation: "Ротационный скребок Ø110 для трубы ПЭ",
  scraper_machine_h: 3,
  protocol_designation: "Протокол сварки по программе контроля качества",
  protocol_count_document: 20,
  generator_mode: "NOT_REQUIRED",
  positioner_mode: "NOT_REQUIRED",
});

export async function compilePe110ElectrofusionJointR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PE110_ELECTROFUSION_JOINT_CATALOG_ID;
  if (catalogId !== PE110_ELECTROFUSION_JOINT_CATALOG_ID) {
    throw new Error(`PE110_ELECTROFUSION_JOINT_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.pe110-electrofusion-joint-r1",
    catalogId,
    primaryMeasureParameterId: "count",
    parameterDefinitions: [...PE110_ELECTROFUSION_JOINT_PARAMETERS],
    formulaDefinitions: [...PE110_ELECTROFUSION_JOINT_FORMULAS],
    resourceDefinitions: [...PE110_ELECTROFUSION_JOINT_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 14,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const PE110_ELECTROFUSION_JOINT_SOURCE_SUMMARY = Object.freeze({
  sourceId: PE110_ELECTROFUSION_JOINT_SOURCE_ID,
  normId: PE110_ELECTROFUSION_JOINT_NORM_ID,
  formula: "known joint count and PE100 SDR17 110 mm PN10 identity give welding work only; exact coupler, consumables, equipment time, protocol and conditional equipment come from the approved joint schedule, selected system, WPS, method statement and QA plan",
});
