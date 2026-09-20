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

export const ASPHALT_UPPER_COURSE_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard";
export const ASPHALT_UPPER_COURSE_SOURCE_ID =
  "project_asphalt_upper_course_package_v1";
export const ASPHALT_UPPER_COURSE_NORM_ID =
  "norm:project:asphalt_upper_course:package:v1";

export const ASPHALT_UPPER_COURSE_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый проект дорожной одежды, рецепт асфальтобетона, ППР укладки и план лабораторного контроля",
  source_authority: "Проектная организация, дорожная лаборатория, производитель смеси и утверждающий инженер проекта",
  source_document_version: "PROJECT_UPPER_ASPHALT_COURSE_MIX_DESIGN_PAVING_COMPACTION_AND_QA_PLAN_REVISION_EXPLICIT",
  definition_hash: "eh_project_asphalt_upper_course_package_r1",
  exact_locator: "Площадь и толщина верхнего слоя; точная смесь, подгрунтовка, обработка стыков, асфальтоукладчик, каток, температурно-плотностной контроль и условный отбор кернов",
  use_restriction: "Известные площадь и толщина определяют объём работы; количества смеси, эмульсии, мастики, машино-часы и контроль берут из проекта, рецепта, ППР и плана лабораторного контроля без переноса неподтверждённой колонки КРЕР",
});

const CONDITIONAL_DETAILS = new Set([
  "core_sampling_count_test",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь верхнего слоя асфальтобетона", "decimal", "m2", null],
  ["layer_thickness_mm", "Толщина верхнего слоя асфальтобетона", "decimal", "mm", null],
  ["asphalt_mix_designation", "Точная горячая плотная асфальтобетонная смесь", "text", null, null],
  ["asphalt_mix_quantity_t", "Масса асфальтобетонной смеси", "decimal", "t", null],
  ["tack_coat_designation", "Катионная битумная эмульсия межслойного сцепления", "text", null, null],
  ["tack_coat_mass_kg", "Масса битумной эмульсии", "decimal", "kg", null],
  ["joint_sealant_designation", "Битумно-полимерная мастика кромок и стыков", "text", null, null],
  ["joint_sealant_mass_kg", "Масса мастики кромок и стыков", "decimal", "kg", null],
  ["asphalt_paver_designation", "Асфальтоукладчик по ППР", "text", null, null],
  ["asphalt_paver_machine_h", "Машино-часы асфальтоукладчика", "decimal", "machine_hour", null],
  ["tandem_roller_designation", "Гладковальцовый каток по схеме уплотнения", "text", null, null],
  ["tandem_roller_machine_h", "Машино-часы гладковальцового катка", "decimal", "machine_hour", null],
  ["density_temperature_control_plan", "План контроля температуры, толщины и плотности", "text", null, null],
  ["density_temperature_control_count_test", "Количество контрольных испытаний", "decimal", "test", null],
  ["core_sampling_mode", "Отбор кернов требуется планом лабораторного контроля", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["core_sampling_count_test", "Количество отбираемых кернов", "decimal", "test", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId === "core_sampling_count_test") {
    return {
      requiredWhen: { kind: "equals", parameterId: "core_sampling_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "core_sampling_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type AsphaltUpperCourseParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const ASPHALT_UPPER_COURSE_PARAMETERS:
readonly AsphaltUpperCourseParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.asphalt-upper-course-r1",
      semantic_parameter_key: `asphalt-upper-course:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["area_m2", "layer_thickness_mm"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["area_m2", "layer_thickness_mm"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PAVEMENT_PROJECT_MIX_DESIGN_PAVING_COMPACTION_OR_QA_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["area_m2", "layer_thickness_mm"].includes(parameterId),
      guide: {
        guide_kind: ["area_m2", "layer_thickness_mm"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь верхнего слоя по проекту или обмеру.`
          : parameterId === "layer_thickness_mm"
            ? `${titleRu}: укажите по проекту дорожной одежды.`
            : `${titleRu}: укажите по рецепту смеси, ППР, схеме уплотнения или плану лабораторного контроля.`,
        source_role: ["area_m2", "layer_thickness_mm"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: ASPHALT_UPPER_COURSE_SOURCE_ID,
        source_locator: ASPHALT_UPPER_COURSE_SOURCE_METADATA.exact_locator,
        guide_version: "asphalt-upper-course-r1",
        source_snapshot_hash: "ea0968e14f00128dbcaa946aa550ad15789c4ce6a3430ef710e069b7c8aa4da8",
        applicability: "Только для укладки и уплотнения верхнего слоя асфальтобетона по известным площади и толщине; основание и нижний слой не включаются.",
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

export const ASPHALT_UPPER_COURSE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("asphalt_upper_course_lay_compact_area_v1", "m2", "area_m2"),
  formula("dense_hot_asphalt_mix_upper_course_quantity_v1", "t", "asphalt_mix_quantity_t"),
  formula("cationic_bitumen_emulsion_tack_coat_mass_v1", "kg", "tack_coat_mass_kg"),
  formula("asphalt_joint_edge_sealant_mass_v1", "kg", "joint_sealant_mass_kg"),
  formula("asphalt_paver_operation_time_v1", "machine_hour", "asphalt_paver_machine_h"),
  formula("tandem_roller_operation_time_v1", "machine_hour", "tandem_roller_machine_h"),
  formula("asphalt_density_temperature_control_count_v1", "test", "density_temperature_control_count_test"),
  formula("asphalt_core_sampling_count_v1", "test", "core_sampling_count_test"),
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
    semanticOwnerId: `asphalt-upper-course:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2", "layer_thickness_mm"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: ASPHALT_UPPER_COURSE_SOURCE_ID,
      source_id: ASPHALT_UPPER_COURSE_SOURCE_ID,
      normId: ASPHALT_UPPER_COURSE_NORM_ID,
      norm_id: ASPHALT_UPPER_COURSE_NORM_ID,
      normVersion: ASPHALT_UPPER_COURSE_SOURCE_METADATA.source_document_version,
      source_title: ASPHALT_UPPER_COURSE_SOURCE_METADATA.source_title,
      exact_locator: ASPHALT_UPPER_COURSE_SOURCE_METADATA.exact_locator,
      source_definition_hash: ASPHALT_UPPER_COURSE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic asphalt-mixture density, waste or consumption",
      "automatic tack-coat or joint-sealant consumption",
      "automatic paver or roller productivity",
      "automatic testing or core-sampling interval",
      "road subgrade, sand base, crushed-stone base or geotextile",
      "asphalt lower course",
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

export const ASPHALT_UPPER_COURSE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:asphalt_upper_course_lay_compact", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Укладка и уплотнение верхнего слоя асфальтобетона", unitId: "m2", formulaId: "asphalt_upper_course_lay_compact_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_PAVEMENT_PROJECT" }),
  resource({ rowId: "rc09:dense_hot_asphalt_mix_upper_course", ordinal: 1, section: "Материалы", category: "material", titleRu: "Смесь асфальтобетонная горячая плотная для верхнего слоя", unitId: "t", formulaId: "dense_hot_asphalt_mix_upper_course_quantity_v1", procurementEligible: true, titleParameterIds: ["asphalt_mix_designation"], sourceRole: "APPROVED_MIX_DESIGN_AND_PAVEMENT_PROJECT" }),
  resource({ rowId: "rc09:cationic_bitumen_emulsion_tack_coat", ordinal: 2, section: "Материалы", category: "material", titleRu: "Эмульсия битумная катионная для межслойного сцепления", unitId: "kg", formulaId: "cationic_bitumen_emulsion_tack_coat_mass_v1", procurementEligible: true, titleParameterIds: ["tack_coat_designation"], sourceRole: "APPROVED_TACK_COAT_SPECIFICATION" }),
  resource({ rowId: "rc09:asphalt_joint_edge_sealant", ordinal: 3, section: "Материалы", category: "material", titleRu: "Мастика битумно-полимерная для обработки кромок и стыков", unitId: "kg", formulaId: "asphalt_joint_edge_sealant_mass_v1", procurementEligible: true, titleParameterIds: ["joint_sealant_designation"], sourceRole: "APPROVED_JOINT_AND_EDGE_TREATMENT_PLAN" }),
  resource({ rowId: "rc09:asphalt_paver_operation", ordinal: 4, section: "Оборудование", category: "equipment", titleRu: "Работа асфальтоукладчика", unitId: "machine_hour", formulaId: "asphalt_paver_operation_time_v1", procurementEligible: true, titleParameterIds: ["asphalt_paver_designation"], sourceRole: "APPROVED_PAVING_METHOD_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:tandem_roller_operation", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Работа гладковальцового катка", unitId: "machine_hour", formulaId: "tandem_roller_operation_time_v1", procurementEligible: true, titleParameterIds: ["tandem_roller_designation"], sourceRole: "APPROVED_COMPACTION_PATTERN_AND_EQUIPMENT_SCHEDULE" }),
  resource({ rowId: "rc09:asphalt_density_temperature_control", ordinal: 6, section: "Контроль", category: "service", titleRu: "Контроль температуры, толщины и плотности верхнего слоя", unitId: "test", formulaId: "asphalt_density_temperature_control_count_v1", procurementEligible: true, titleParameterIds: ["density_temperature_control_plan"], sourceRole: "APPROVED_ASPHALT_QA_PLAN" }),
  resource({ rowId: "rc09:asphalt_core_sampling", ordinal: 7, section: "Условный контроль", category: "service", titleRu: "Отбор кернов верхнего слоя асфальтобетона", unitId: "test", formulaId: "asphalt_core_sampling_count_v1", inclusionAst: equals("core_sampling_mode", "REQUIRED"), procurementEligible: true, sourceRole: "APPROVED_ASPHALT_QA_CORE_SAMPLING_BRANCH" }),
]);

export const ASPHALT_UPPER_COURSE_SHORT_INPUT = Object.freeze({
  area_m2: 120,
  layer_thickness_mm: 50,
});

export const ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 120,
  layer_thickness_mm: 50,
  asphalt_mix_designation: "Горячая плотная асфальтобетонная смесь по утверждённому рецепту",
  asphalt_mix_quantity_t: 14.76,
  tack_coat_designation: "Катионная битумная эмульсия по проекту межслойного сцепления",
  tack_coat_mass_kg: 42,
  joint_sealant_designation: "Битумно-полимерная мастика по плану кромок и стыков",
  joint_sealant_mass_kg: 9.6,
  asphalt_paver_designation: "Асфальтоукладчик по ППР укладки верхнего слоя",
  asphalt_paver_machine_h: 1.44,
  tandem_roller_designation: "Гладковальцовый каток по схеме уплотнения",
  tandem_roller_machine_h: 2.16,
  density_temperature_control_plan: "План лабораторного контроля верхнего слоя",
  density_temperature_control_count_test: 3,
  core_sampling_mode: "NOT_REQUIRED",
});

export async function compileAsphaltUpperCourseR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_UPPER_COURSE_CATALOG_ID;
  if (catalogId !== ASPHALT_UPPER_COURSE_CATALOG_ID) {
    throw new Error(`ASPHALT_UPPER_COURSE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-upper-course-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_UPPER_COURSE_PARAMETERS],
    formulaDefinitions: [...ASPHALT_UPPER_COURSE_FORMULAS],
    resourceDefinitions: [...ASPHALT_UPPER_COURSE_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const ASPHALT_UPPER_COURSE_SOURCE_SUMMARY = Object.freeze({
  sourceId: ASPHALT_UPPER_COURSE_SOURCE_ID,
  normId: ASPHALT_UPPER_COURSE_NORM_ID,
  formula: "known upper-course area and thickness give laying and compaction work only; exact mix, tack coat, joint sealant, paver and roller time, QA tests and conditional core sampling come from approved project, mix design, method and laboratory-control documents",
});
