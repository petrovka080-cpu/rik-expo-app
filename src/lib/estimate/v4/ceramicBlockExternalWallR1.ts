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

export const CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID =
  "canonical-work:base:masonry_interior_block_wall_lay_standard";
export const CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_ID =
  "project_ceramic_block_external_wall_product_schedule_method_statement_v1";
export const CERAMIC_BLOCK_EXTERNAL_WALL_NORM_ID =
  "norm:project:ceramic_block_external_wall:product_schedule_method_statement:v1";

export const CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая раскладка наружной стены, спецификация материалов и ППР кладки",
  source_authority: "Проектная организация, производитель выбранной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_AND_PRODUCT_REVISION_EXPLICIT",
  definition_hash: "eh_ceramic_block_external_wall_project_product_schedule_r1",
  exact_locator: "Наружная стена 440 мм: раскладка блоков, первый ряд, клей, связи, отсечка, подъём и условные узлы",
  use_restriction: "Площадь определяет только объём кладки; расход и количество материалов берутся из раскладки, спецификации производителя и ППР",
});

const CONDITIONAL_DETAILS = new Set([
  "lintel_designation",
  "lintel_quantity_piece",
  "reinforcement_mesh_designation",
  "reinforcement_mesh_quantity_m2",
  "abutment_mineral_wool_designation",
  "abutment_mineral_wool_quantity_m3",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь наружной стены", "decimal", "m2", null],
  ["ceramic_block_designation", "Марка керамического блока 440×250×219 мм", "text", null, null],
  ["ceramic_block_quantity_piece", "Количество керамических блоков по раскладке", "decimal", "piece", null],
  ["first_course_mortar_designation", "Марка раствора первого ряда", "text", null, null],
  ["first_course_mortar_mass_kg", "Масса раствора первого ряда", "decimal", "kg", null],
  ["thin_joint_adhesive_designation", "Марка клея для тонкошовной кладки", "text", null, null],
  ["thin_joint_adhesive_mass_kg", "Масса клея для тонкошовной кладки", "decimal", "kg", null],
  ["stainless_wall_tie_designation", "Тип гибкой связи из нержавеющей стали", "text", null, null],
  ["stainless_wall_tie_quantity_piece", "Количество гибких связей", "decimal", "piece", null],
  ["cutoff_waterproofing_designation", "Тип горизонтальной отсечной гидроизоляции", "text", null, null],
  ["cutoff_waterproofing_quantity_m2", "Количество горизонтальной отсечной гидроизоляции", "decimal", "m2", null],
  ["lifting_platform_designation", "Тип подъёмной площадки", "text", null, null],
  ["lifting_platform_shift", "Количество смен подъёмной площадки", "decimal", "shift", null],
  ["lintel_mode", "Перемычки в границе выбранной кладки", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["lintel_designation", "Тип перемычки", "text", null, null],
  ["lintel_quantity_piece", "Количество перемычек", "decimal", "piece", null],
  ["reinforcement_mesh_mode", "Армирование кладки сеткой по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["reinforcement_mesh_designation", "Тип сетки армирования кладки", "text", null, null],
  ["reinforcement_mesh_quantity_m2", "Количество сетки армирования кладки", "decimal", "m2", null],
  ["abutment_mineral_wool_mode", "Минеральная вата в узлах примыкания", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["abutment_mineral_wool_designation", "Тип минеральной ваты в узлах примыкания", "text", null, null],
  ["abutment_mineral_wool_quantity_m3", "Количество минеральной ваты в узлах примыкания", "decimal", "m3", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("lintel_") && parameterId !== "lintel_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "lintel_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "lintel_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("reinforcement_mesh_") && parameterId !== "reinforcement_mesh_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "reinforcement_mesh_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "reinforcement_mesh_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("abutment_mineral_wool_")
    && parameterId !== "abutment_mineral_wool_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "abutment_mineral_wool_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "abutment_mineral_wool_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type CeramicBlockExternalWallParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const CERAMIC_BLOCK_EXTERNAL_WALL_PARAMETERS:
readonly CeramicBlockExternalWallParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.ceramic-block-external-wall-r1",
      semantic_parameter_key: `ceramic-block-external-wall:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: parameterId === "area_m2" ? "USER_INPUT" : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: parameterId === "area_m2"
        ? "KNOWN_GEOMETRY"
        : "APPROVED_PRODUCT_SCHEDULE_DRAWING_METHOD_STATEMENT",
      preliminary_compilation_allowed: true,
      source_confirmation_required: parameterId !== "area_m2",
      guide: {
        guide_kind: parameterId === "area_m2" ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? "Укажите площадь наружной стены по обмеру или рабочему чертежу."
          : `${titleRu}: укажите значение из утверждённой раскладки, спецификации производителя или ППР.`,
        source_role: parameterId === "area_m2"
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_OR_PRODUCT_DOCUMENTATION",
        source_document: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_ID,
        source_locator: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA.exact_locator,
        guide_version: "ceramic-block-external-wall-r1",
        source_snapshot_hash: "bd92bf91ee35c9f5620d9df4846948770446871412912f56e7ffcb585970d485",
        applicability: "Только для наружной стены из керамических блоков 440×250×219 мм.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  }),
));

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

export const CERAMIC_BLOCK_EXTERNAL_WALL_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("ceramic_block_wall_area_v1", "m2", "area_m2"),
  formula("ceramic_block_quantity_v1", "piece", "ceramic_block_quantity_piece"),
  formula("first_course_mortar_mass_v1", "kg", "first_course_mortar_mass_kg"),
  formula("thin_joint_adhesive_mass_v1", "kg", "thin_joint_adhesive_mass_kg"),
  formula("stainless_wall_tie_quantity_v1", "piece", "stainless_wall_tie_quantity_piece"),
  formula("cutoff_waterproofing_area_v1", "m2", "cutoff_waterproofing_quantity_m2"),
  formula("lifting_platform_shift_v1", "shift", "lifting_platform_shift"),
  formula("masonry_lintel_quantity_v1", "piece", "lintel_quantity_piece"),
  formula("masonry_reinforcement_mesh_area_v1", "m2", "reinforcement_mesh_quantity_m2"),
  formula("abutment_mineral_wool_volume_v1", "m3", "abutment_mineral_wool_quantity_m3"),
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
    semanticOwnerId: `ceramic-block-external-wall:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_ID,
      source_id: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_ID,
      normId: CERAMIC_BLOCK_EXTERNAL_WALL_NORM_ID,
      norm_id: CERAMIC_BLOCK_EXTERNAL_WALL_NORM_ID,
      normVersion: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA.source_document_version,
      source_title: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA.source_title,
      exact_locator: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA.exact_locator,
      source_definition_hash: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic blocks per square metre",
      "automatic mortar, adhesive, tie or waterproofing consumption",
      "automatic lifting-platform productivity",
      "generic enclosing structure substitute",
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

export const CERAMIC_BLOCK_EXTERNAL_WALL_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:ceramic_block_wall_masonry", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Кладка наружной стены из керамических блоков", unitId: "m2", formulaId: "ceramic_block_wall_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAWING" }),
  resource({ rowId: "rc09:ceramic_block_440x250x219", ordinal: 1, section: "Материалы", category: "material", titleRu: "Блок керамический поризованный 440×250×219 мм", unitId: "piece", formulaId: "ceramic_block_quantity_v1", procurementEligible: true, titleParameterIds: ["ceramic_block_designation"], sourceRole: "APPROVED_PRODUCT_SCHEDULE" }),
  resource({ rowId: "rc09:first_course_masonry_mortar_m100", ordinal: 2, section: "Материалы", category: "material", titleRu: "Раствор кладочный цементный М100 для первого ряда", unitId: "kg", formulaId: "first_course_mortar_mass_v1", procurementEligible: true, titleParameterIds: ["first_course_mortar_designation"], sourceRole: "APPROVED_PRODUCT_SCHEDULE" }),
  resource({ rowId: "rc09:thin_joint_masonry_adhesive", ordinal: 3, section: "Материалы", category: "material", titleRu: "Клей для тонкошовной кладки керамических блоков", unitId: "kg", formulaId: "thin_joint_adhesive_mass_v1", procurementEligible: true, titleParameterIds: ["thin_joint_adhesive_designation"], sourceRole: "APPROVED_PRODUCT_SCHEDULE" }),
  resource({ rowId: "rc09:stainless_flexible_wall_tie", ordinal: 4, section: "Материалы", category: "material", titleRu: "Связь гибкая из нержавеющей стали для кладки", unitId: "piece", formulaId: "stainless_wall_tie_quantity_v1", procurementEligible: true, titleParameterIds: ["stainless_wall_tie_designation"], sourceRole: "APPROVED_STRUCTURAL_DRAWING" }),
  resource({ rowId: "rc09:horizontal_cutoff_waterproofing", ordinal: 5, section: "Материалы", category: "material", titleRu: "Горизонтальная отсечная гидроизоляция под кладкой", unitId: "m2", formulaId: "cutoff_waterproofing_area_v1", procurementEligible: true, titleParameterIds: ["cutoff_waterproofing_designation"], sourceRole: "APPROVED_DETAIL_AND_PRODUCT_SCHEDULE" }),
  resource({ rowId: "rc09:masonry_lifting_platform", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Подъёмная площадка для кладки", unitId: "shift", formulaId: "lifting_platform_shift_v1", procurementEligible: true, titleParameterIds: ["lifting_platform_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:masonry_lintel", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Перемычка для проёма в керамической кладке", unitId: "piece", formulaId: "masonry_lintel_quantity_v1", inclusionAst: equals("lintel_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["lintel_designation"], sourceRole: "APPROVED_STRUCTURAL_DRAWING" }),
  resource({ rowId: "rc09:masonry_reinforcement_mesh", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Сетка армирования керамической кладки", unitId: "m2", formulaId: "masonry_reinforcement_mesh_area_v1", inclusionAst: equals("reinforcement_mesh_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["reinforcement_mesh_designation"], sourceRole: "APPROVED_STRUCTURAL_DRAWING" }),
  resource({ rowId: "rc09:abutment_mineral_wool", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Минеральная вата для узлов примыкания кладки", unitId: "m3", formulaId: "abutment_mineral_wool_volume_v1", inclusionAst: equals("abutment_mineral_wool_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["abutment_mineral_wool_designation"], sourceRole: "APPROVED_ARCHITECTURAL_DETAIL" }),
]);

export const CERAMIC_BLOCK_EXTERNAL_WALL_SHORT_INPUT = Object.freeze({
  area_m2: 100,
});

export const CERAMIC_BLOCK_EXTERNAL_WALL_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 100,
  ceramic_block_designation: "Керамический поризованный блок 440×250×219 мм по утверждённой спецификации",
  ceramic_block_quantity_piece: 1680,
  first_course_mortar_designation: "Раствор кладочный цементный М100 по спецификации системы",
  first_course_mortar_mass_kg: 450,
  thin_joint_adhesive_designation: "Клей для тонкошовной кладки по паспорту выбранного блока",
  thin_joint_adhesive_mass_kg: 320,
  stainless_wall_tie_designation: "Гибкая связь из нержавеющей стали по рабочему чертежу",
  stainless_wall_tie_quantity_piece: 500,
  cutoff_waterproofing_designation: "Битумно-полимерная мембрана по узлу отсечки",
  cutoff_waterproofing_quantity_m2: 50,
  lifting_platform_designation: "Подъёмная площадка по ППР кладки",
  lifting_platform_shift: 1.5,
  lintel_mode: "NOT_REQUIRED",
  reinforcement_mesh_mode: "NOT_REQUIRED",
  abutment_mineral_wool_mode: "NOT_REQUIRED",
});

export async function compileCeramicBlockExternalWallR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID;
  if (catalogId !== CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_ID) {
    throw new Error(`CERAMIC_BLOCK_EXTERNAL_WALL_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.ceramic-block-external-wall-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...CERAMIC_BLOCK_EXTERNAL_WALL_PARAMETERS],
    formulaDefinitions: [...CERAMIC_BLOCK_EXTERNAL_WALL_FORMULAS],
    resourceDefinitions: [...CERAMIC_BLOCK_EXTERNAL_WALL_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_SUMMARY = Object.freeze({
  sourceId: CERAMIC_BLOCK_EXTERNAL_WALL_SOURCE_ID,
  normId: CERAMIC_BLOCK_EXTERNAL_WALL_NORM_ID,
  formula: "known wall area gives masonry work; exact materials and equipment come from the approved product schedule, drawings and method statement",
  automaticBlockRateRejected: true,
  automaticMaterialConsumptionRejected: true,
  automaticEquipmentProductivityRejected: true,
  genericEnclosingStructureRejected: true,
});
