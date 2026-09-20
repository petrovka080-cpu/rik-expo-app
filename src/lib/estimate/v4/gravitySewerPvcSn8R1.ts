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

export const GRAVITY_SEWER_PVC_SN8_CATALOG_ID =
  "canonical-work:base:plumbing_interior_sewer_route_standard";
export const GRAVITY_SEWER_PVC_SN8_SOURCE_ID = "project_gravity_sewer_pvc_sn8_package_v1";
export const GRAVITY_SEWER_PVC_SN8_NORM_ID = "norm:project:gravity_sewer_pvc_sn8:package:v1";

export const GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план трассы самотечной канализации, спецификация трубной системы, узлы основания и пересечений, ППР и программа контроля",
  source_authority: "Проектная организация, производитель трубной системы, строительная лаборатория и утверждающий инженер проекта",
  source_document_version: "PROJECT_GRAVITY_SEWER_PVC_SN8_ROUTE_PRODUCT_BEDDING_METHOD_AND_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_gravity_sewer_pvc_sn8_package_r1",
  exact_locator: "Длина, материал, SN, диаметр и уклон трассы; ведомость труб, колец, смазки и фасонных частей; профиль основания; пересечения; ППР контроля уклона и программа испытаний",
  use_restriction: "Известная длина определяет только объём укладки; количества трубы, колец, смазки, песка, смен прибора, испытаний и условных элементов берутся из проекта, паспорта системы, узлов, ППР и программы контроля без переноса исторических коэффициентов",
});

const CONDITIONAL_DETAILS = new Set([
  "fitting_designation", "fitting_quantity_piece",
  "casing_designation", "casing_length_m",
  "geotextile_designation", "geotextile_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина участка канализационной трубы", "decimal", "m", null],
  ["pipe_material_grade", "Материал трубы", "text", null, null],
  ["ring_stiffness_class", "Класс кольцевой жёсткости трубы", "text", null, null],
  ["pipe_outside_diameter_mm", "Наружный диаметр трубы", "decimal", "mm", null],
  ["slope_m_per_m", "Проектный уклон трубопровода", "decimal", "m_per_m", null],
  ["pipe_designation", "Труба выбранной канализационной системы", "text", null, null],
  ["pipe_quantity_m", "Количество трубы по раскладке", "decimal", "m", null],
  ["seal_designation", "Уплотнительное кольцо выбранной системы", "text", null, null],
  ["seal_quantity_piece", "Количество уплотнительных колец", "decimal", "pcs", null],
  ["lubricant_designation", "Монтажная смазка выбранной системы", "text", null, null],
  ["lubricant_mass_kg", "Масса монтажной смазки", "decimal", "kg", null],
  ["sand_designation", "Материал постели и защитной обсыпки", "text", null, null],
  ["sand_volume_m3", "Объём материала постели и защитной обсыпки", "decimal", "m3", null],
  ["laser_designation", "Прибор контроля уклона", "text", null, null],
  ["laser_shift", "Смены прибора контроля уклона", "decimal", "shift", null],
  ["leak_test_designation", "Испытание участка на герметичность", "text", null, null],
  ["leak_test_count_test", "Количество испытаний на герметичность", "decimal", "test", null],
  ["fitting_mode", "Фасонные части требуются по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["fitting_designation", "Фасонная часть выбранной системы", "text", null, null],
  ["fitting_quantity_piece", "Количество фасонных частей", "decimal", "pcs", null],
  ["casing_mode", "Футляр на пересечении требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["casing_designation", "Футляр на пересечении", "text", null, null],
  ["casing_length_m", "Длина футляра на пересечении", "decimal", "m", null],
  ["geotextile_mode", "Геотекстиль на слабом грунте требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["geotextile_designation", "Геотекстиль по узлу слабого грунта", "text", null, null],
  ["geotextile_area_m2", "Площадь геотекстиля по узлу слабого грунта", "decimal", "m2", null],
] as const);

const KNOWN_SCOPE = [
  "length_m", "pipe_material_grade", "ring_stiffness_class",
  "pipe_outside_diameter_mm", "slope_m_per_m",
];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("fitting_")
    ? "fitting_mode"
    : parameterId.startsWith("casing_")
      ? "casing_mode"
      : parameterId.startsWith("geotextile_")
        ? "geotextile_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type GravitySewerPvcSn8Parameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const GRAVITY_SEWER_PVC_SN8_PARAMETERS:
readonly GravitySewerPvcSn8Parameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.gravity-sewer-pvc-sn8-r1",
      semantic_parameter_key: `gravity-sewer-pvc-sn8:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_ROUTE_PRODUCT_BEDDING_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите подтверждённую длину укладываемого участка по плану трассы."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке трубы и проектному профилю.`
            : `${titleRu}: укажите по ведомости трубной системы, узлу, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_ROUTE_PROFILE"
          : "APPROVED_PROJECT_PRODUCT_METHOD_OR_QA_DOCUMENTATION",
        source_document: GRAVITY_SEWER_PVC_SN8_SOURCE_ID,
        source_locator: GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA.exact_locator,
        guide_version: "gravity-sewer-pvc-sn8-r1",
        source_snapshot_hash: "a6b6164525b5c2070961a2918e8f46e32a06a565cdc2f21a691c048c91cf059c",
        applicability: "Только для укладки указанного участка самотечной трубы ПВХ SN8 Ø160; колодцы и насосная станция не включаются.",
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

export const GRAVITY_SEWER_PVC_SN8_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("pvc_sn8_sewer_pipe_lay_length_v1", "m", "length_m"),
  formula("pvc_sewer_pipe_sn8_d160_quantity_v1", "m", "pipe_quantity_m"),
  formula("pvc_sewer_socket_seal_d160_quantity_v1", "pcs", "seal_quantity_piece"),
  formula("pvc_sewer_assembly_lubricant_mass_v1", "kg", "lubricant_mass_kg"),
  formula("washed_sand_pipe_bedding_volume_v1", "m3", "sand_volume_m3"),
  formula("pipe_laser_level_shift_v1", "shift", "laser_shift"),
  formula("sewer_pipe_leak_test_count_v1", "test", "leak_test_count_test"),
  formula("sewer_fitting_quantity_v1", "pcs", "fitting_quantity_piece"),
  formula("crossing_casing_length_v1", "m", "casing_length_m"),
  formula("weak_ground_geotextile_area_v1", "m2", "geotextile_area_m2"),
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
    semanticOwnerId: `gravity-sewer-pvc-sn8:${input.rowId}`,
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
      sourceId: GRAVITY_SEWER_PVC_SN8_SOURCE_ID,
      source_id: GRAVITY_SEWER_PVC_SN8_SOURCE_ID,
      normId: GRAVITY_SEWER_PVC_SN8_NORM_ID,
      norm_id: GRAVITY_SEWER_PVC_SN8_NORM_ID,
      normVersion: GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA.source_document_version,
      source_title: GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA.source_title,
      exact_locator: GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA.exact_locator,
      source_definition_hash: GRAVITY_SEWER_PVC_SN8_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic pipe waste or module length",
      "automatic seal, lubricant or bedding rate",
      "automatic laser-shift or leak-test interval",
      "automatic fittings, crossing casing or weak-ground geotextile",
      "sewer manhole or pumping station",
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

export const GRAVITY_SEWER_PVC_SN8_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:pvc_sn8_sewer_pipe_lay", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Укладка канализационной трубы ПВХ SN8 Ø160 мм с контролем уклона", unitId: "m", formulaId: "pvc_sn8_sewer_pipe_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_ROUTE_PROFILE" }),
  resource({ rowId: "rc09:pvc_sewer_pipe_sn8_d160", ordinal: 1, section: "Материалы", category: "material", titleRu: "Труба канализационная ПВХ SN8 Ø160 мм", unitId: "m", formulaId: "pvc_sewer_pipe_sn8_d160_quantity_v1", procurementEligible: true, titleParameterIds: ["pipe_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:pvc_sewer_socket_seal_d160", ordinal: 2, section: "Материалы", category: "material", titleRu: "Кольцо уплотнительное заводское для трубы ПВХ Ø160 мм", unitId: "pcs", formulaId: "pvc_sewer_socket_seal_d160_quantity_v1", procurementEligible: true, titleParameterIds: ["seal_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:pvc_sewer_assembly_lubricant", ordinal: 3, section: "Материалы", category: "material", titleRu: "Смазка монтажная для раструбных соединений ПВХ", unitId: "kg", formulaId: "pvc_sewer_assembly_lubricant_mass_v1", procurementEligible: true, titleParameterIds: ["lubricant_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_METHOD" }),
  resource({ rowId: "rc09:washed_sand_pipe_bedding", ordinal: 4, section: "Материалы", category: "material", titleRu: "Песок мытый для постели и защитной обсыпки трубы", unitId: "m3", formulaId: "washed_sand_pipe_bedding_volume_v1", procurementEligible: true, titleParameterIds: ["sand_designation"], sourceRole: "APPROVED_ROUTE_BEDDING_DETAIL" }),
  resource({ rowId: "rc09:pipe_laser_level", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Лазерный прибор контроля уклона трубопровода", unitId: "shift", formulaId: "pipe_laser_level_shift_v1", procurementEligible: true, titleParameterIds: ["laser_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:sewer_pipe_leak_test", ordinal: 6, section: "Контроль", category: "service", titleRu: "Испытание участка канализационной трубы на герметичность", unitId: "test", formulaId: "sewer_pipe_leak_test_count_v1", procurementEligible: true, titleParameterIds: ["leak_test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:sewer_fitting", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Фасонная часть канализационной трубной системы", unitId: "pcs", formulaId: "sewer_fitting_quantity_v1", inclusionAst: equals("fitting_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["fitting_designation"], sourceRole: "APPROVED_PIPE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:crossing_casing", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Футляр трубопровода на пересечении", unitId: "m", formulaId: "crossing_casing_length_v1", inclusionAst: equals("casing_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["casing_designation"], sourceRole: "APPROVED_CROSSING_DETAIL" }),
  resource({ rowId: "rc09:weak_ground_geotextile", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Геотекстиль по узлу слабого грунта", unitId: "m2", formulaId: "weak_ground_geotextile_area_v1", inclusionAst: equals("geotextile_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["geotextile_designation"], sourceRole: "APPROVED_WEAK_GROUND_DETAIL" }),
]);

export const GRAVITY_SEWER_PVC_SN8_SHORT_INPUT = Object.freeze({
  length_m: 100,
  pipe_material_grade: "PVC-U",
  ring_stiffness_class: "SN8",
  pipe_outside_diameter_mm: 160,
  slope_m_per_m: 0.008,
});

export const GRAVITY_SEWER_PVC_SN8_ACCEPTANCE_INPUT = Object.freeze({
  ...GRAVITY_SEWER_PVC_SN8_SHORT_INPUT,
  pipe_designation: "Труба канализационная PVC-U SN8 Ø160 по паспорту выбранной системы",
  pipe_quantity_m: 102,
  seal_designation: "Кольцо уплотнительное Ø160 по паспорту выбранной системы",
  seal_quantity_piece: 17,
  lubricant_designation: "Смазка монтажная по паспорту выбранной системы",
  lubricant_mass_kg: 1.2,
  sand_designation: "Песок мытый по проектному узлу постели и защитной обсыпки",
  sand_volume_m3: 32,
  laser_designation: "Лазерный прибор контроля уклона по ППР",
  laser_shift: 2,
  leak_test_designation: "Испытание участка на герметичность по программе контроля",
  leak_test_count_test: 1,
  fitting_mode: "NOT_REQUIRED",
  casing_mode: "NOT_REQUIRED",
  geotextile_mode: "NOT_REQUIRED",
});

export async function compileGravitySewerPvcSn8R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? GRAVITY_SEWER_PVC_SN8_CATALOG_ID;
  if (catalogId !== GRAVITY_SEWER_PVC_SN8_CATALOG_ID) {
    throw new Error(`GRAVITY_SEWER_PVC_SN8_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.gravity-sewer-pvc-sn8-r1",
    catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...GRAVITY_SEWER_PVC_SN8_PARAMETERS],
    formulaDefinitions: [...GRAVITY_SEWER_PVC_SN8_FORMULAS],
    resourceDefinitions: [...GRAVITY_SEWER_PVC_SN8_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 14,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const GRAVITY_SEWER_PVC_SN8_SOURCE_SUMMARY = Object.freeze({
  sourceId: GRAVITY_SEWER_PVC_SN8_SOURCE_ID,
  normId: GRAVITY_SEWER_PVC_SN8_NORM_ID,
  formula: "known route length and PVC-U SN8 160 mm slope identity give laying work only; exact pipe, seals, lubricant, bedding, control, tests and conditional route details come from the approved project package",
});
