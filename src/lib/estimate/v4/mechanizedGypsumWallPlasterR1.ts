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

export const MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID =
  "canonical-work:base:plaster_paint_interior_wall_plaster_apply_standard";
export const MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_ID =
  "project_mechanized_gypsum_wall_plaster_system_v1";
export const MECHANIZED_GYPSUM_WALL_PLASTER_NORM_ID =
  "norm:project:mechanized_gypsum_wall_plaster:system:v1";

export const MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая ведомость механизированной гипсовой штукатурки, подготовка основания, ППР и карта контроля",
  source_authority: "Проектная организация, изготовитель штукатурной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_PLASTER_SYSTEM_SUBSTRATE_SCHEDULE_METHOD_AND_CONTROL_REVISION_EXPLICIT",
  definition_hash: "eh_project_mechanized_gypsum_wall_plaster_system_r1",
  exact_locator: "Площадь стен и средняя толщина 15 мм; грунт по основанию, смесь, маяки, углы, штукатурная станция, защита примыканий и локальная сетка",
  use_restriction: "Известная площадь определяет объём штукатурной работы; количества материалов, профилей, машино-часы и условная сетка берутся из утверждённой системы, обмеров, ППР и карты контроля",
});

const CONDITIONAL_DETAILS = new Set([
  "plaster_mesh_designation",
  "plaster_mesh_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь механизированного оштукатуривания стен", "decimal", "m2", null],
  ["average_thickness_mm", "Средняя толщина гипсовой штукатурки", "decimal", "mm", null],
  ["concrete_contact_primer_designation", "Адгезионная грунтовка по типу основания", "text", null, null],
  ["concrete_contact_primer_mass_kg", "Масса адгезионной грунтовки", "decimal", "kg", null],
  ["machine_gypsum_plaster_designation", "Гипсовая смесь для машинного нанесения слоем 15 мм", "text", null, null],
  ["machine_gypsum_plaster_mass_kg", "Масса гипсовой штукатурной смеси", "decimal", "kg", null],
  ["plaster_beacon_designation", "Маячковый оцинкованный профиль 10 мм", "text", null, null],
  ["plaster_beacon_length_m", "Длина маячкового профиля", "decimal", "m", null],
  ["plaster_corner_profile_designation", "Углозащитный профиль штукатурной системы", "text", null, null],
  ["plaster_corner_profile_length_m", "Длина углозащитного профиля", "decimal", "m", null],
  ["plastering_station_designation", "Штукатурная станция по ППР", "text", null, null],
  ["plastering_station_machine_h", "Машино-часы штукатурной станции", "decimal", "machine_hour", null],
  ["surface_protection_designation", "Защитная плёнка и лента для примыканий", "text", null, null],
  ["surface_protection_area_m2", "Площадь защитной плёнки и ленты", "decimal", "m2", null],
  ["plaster_mesh_mode", "Щёлочестойкая штукатурная сетка требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["plaster_mesh_designation", "Щёлочестойкая сетка по узлам неоднородных оснований", "text", null, null],
  ["plaster_mesh_area_m2", "Площадь локального армирования сеткой", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("plaster_mesh_") && parameterId !== "plaster_mesh_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "plaster_mesh_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "plaster_mesh_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type MechanizedGypsumWallPlasterParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const MECHANIZED_GYPSUM_WALL_PLASTER_PARAMETERS:
readonly MechanizedGypsumWallPlasterParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.mechanized-gypsum-wall-plaster-r1",
      semantic_parameter_key: `mechanized-gypsum-wall-plaster:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["area_m2", "average_thickness_mm"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["area_m2", "average_thickness_mm"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_PLASTER_SYSTEM_SUBSTRATE_SCHEDULE_METHOD_STATEMENT_OR_CONTROL_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["area_m2", "average_thickness_mm"].includes(parameterId),
      guide: {
        guide_kind: ["area_m2", "average_thickness_mm"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь стен по обмеру или проекту.`
          : parameterId === "average_thickness_mm"
            ? `${titleRu}: укажите среднюю проектную толщину штукатурного слоя.`
            : `${titleRu}: укажите по ведомости системы, обследованию основания, ППР или карте контроля.`,
        source_role: ["area_m2", "average_thickness_mm"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_ID,
        source_locator: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA.exact_locator,
        guide_version: "mechanized-gypsum-wall-plaster-r1",
        source_snapshot_hash: "9132255274636b2af33e7adce904f6580068701f6c8e97f755591228fa41b42c",
        applicability: "Только для механизированного нанесения гипсовой штукатурки на внутренние стены средней толщиной 15 мм без последующих шпаклёвочных и окрасочных слоёв.",
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

export const MECHANIZED_GYPSUM_WALL_PLASTER_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("mechanized_gypsum_wall_plaster_area_v1", "m2", "area_m2"),
  formula("concrete_contact_primer_mass_v1", "kg", "concrete_contact_primer_mass_kg"),
  formula("machine_gypsum_plaster_mass_v1", "kg", "machine_gypsum_plaster_mass_kg"),
  formula("galvanized_plaster_beacon_length_v1", "m", "plaster_beacon_length_m"),
  formula("plaster_corner_profile_length_v1", "m", "plaster_corner_profile_length_m"),
  formula("plastering_station_time_v1", "machine_hour", "plastering_station_machine_h"),
  formula("surface_protection_area_v1", "m2", "surface_protection_area_m2"),
  formula("alkali_resistant_plaster_mesh_area_v1", "m2", "plaster_mesh_area_m2"),
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
    semanticOwnerId: `mechanized-gypsum-wall-plaster:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2", "average_thickness_mm"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_ID,
      source_id: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_ID,
      normId: MECHANIZED_GYPSUM_WALL_PLASTER_NORM_ID,
      norm_id: MECHANIZED_GYPSUM_WALL_PLASTER_NORM_ID,
      normVersion: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA.source_document_version,
      source_title: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA.source_title,
      exact_locator: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA.exact_locator,
      source_definition_hash: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic primer or plaster-mix consumption",
      "automatic beacon or corner-profile spacing",
      "automatic plastering-station productivity",
      "automatic protection area or mesh coverage",
      "cement plaster mix, putty, paint or decorative finish",
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

export const MECHANIZED_GYPSUM_WALL_PLASTER_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:mechanized_gypsum_wall_plaster", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Механизированное оштукатуривание внутренних стен гипсовой смесью слоем 15 мм", unitId: "m2", formulaId: "mechanized_gypsum_wall_plaster_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAWING" }),
  resource({ rowId: "rc09:concrete_contact_primer", ordinal: 1, section: "Материалы", category: "material", titleRu: "Грунтовка адгезионная с кварцевым наполнителем по типу основания", unitId: "kg", formulaId: "concrete_contact_primer_mass_v1", procurementEligible: true, titleParameterIds: ["concrete_contact_primer_designation"], sourceRole: "APPROVED_SUBSTRATE_PREPARATION_SCHEDULE_AND_PRODUCT_SYSTEM" }),
  resource({ rowId: "rc09:machine_gypsum_plaster_15mm", ordinal: 2, section: "Материалы", category: "material", titleRu: "Смесь штукатурная гипсовая для машинного нанесения, слой 15 мм", unitId: "kg", formulaId: "machine_gypsum_plaster_mass_v1", procurementEligible: true, titleParameterIds: ["machine_gypsum_plaster_designation"], sourceRole: "APPROVED_PLASTER_PRODUCT_SYSTEM_AND_QUANTITY_SCHEDULE" }),
  resource({ rowId: "rc09:galvanized_plaster_beacon_10mm", ordinal: 3, section: "Материалы", category: "material", titleRu: "Профиль маячковый оцинкованный 10 мм", unitId: "m", formulaId: "galvanized_plaster_beacon_length_v1", procurementEligible: true, titleParameterIds: ["plaster_beacon_designation"], sourceRole: "APPROVED_WALL_SURVEY_AND_BEACON_LAYOUT" }),
  resource({ rowId: "rc09:plaster_corner_profile", ordinal: 4, section: "Материалы", category: "material", titleRu: "Профиль углозащитный оцинкованный для штукатурки", unitId: "m", formulaId: "plaster_corner_profile_length_v1", procurementEligible: true, titleParameterIds: ["plaster_corner_profile_designation"], sourceRole: "APPROVED_CORNER_AND_OPENING_SURVEY" }),
  resource({ rowId: "rc09:plastering_station", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Штукатурная станция для машинного нанесения гипсовой смеси", unitId: "machine_hour", formulaId: "plastering_station_time_v1", procurementEligible: true, titleParameterIds: ["plastering_station_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:surface_protection_film_and_tape", ordinal: 6, section: "Материалы", category: "material", titleRu: "Плёнка защитная и малярная лента для примыканий", unitId: "m2", formulaId: "surface_protection_area_v1", procurementEligible: true, titleParameterIds: ["surface_protection_designation"], sourceRole: "APPROVED_PROTECTION_LAYOUT_AND_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:alkali_resistant_plaster_mesh", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Сетка штукатурная щёлочестойкая для неоднородных оснований", unitId: "m2", formulaId: "alkali_resistant_plaster_mesh_area_v1", inclusionAst: equals("plaster_mesh_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["plaster_mesh_designation"], sourceRole: "APPROVED_SUBSTRATE_JOINT_DETAILS" }),
]);

export const MECHANIZED_GYPSUM_WALL_PLASTER_SHORT_INPUT = Object.freeze({
  area_m2: 400,
  average_thickness_mm: 15,
});

export const MECHANIZED_GYPSUM_WALL_PLASTER_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 400,
  average_thickness_mm: 15,
  concrete_contact_primer_designation: "Адгезионная грунтовка по ведомости подготовки бетонных оснований",
  concrete_contact_primer_mass_kg: 120,
  machine_gypsum_plaster_designation: "Гипсовая смесь машинного нанесения по ведомости штукатурной системы",
  machine_gypsum_plaster_mass_kg: 6200,
  plaster_beacon_designation: "Маячковый оцинкованный профиль 10 мм по раскладке",
  plaster_beacon_length_m: 140,
  plaster_corner_profile_designation: "Углозащитный оцинкованный профиль по обмеру углов и проёмов",
  plaster_corner_profile_length_m: 48,
  plastering_station_designation: "Штукатурная станция по ППР механизированного нанесения",
  plastering_station_machine_h: 14,
  surface_protection_designation: "Защитная плёнка и малярная лента по схеме защиты примыканий",
  surface_protection_area_m2: 72,
  plaster_mesh_mode: "NOT_REQUIRED",
});

export async function compileMechanizedGypsumWallPlasterR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID;
  if (catalogId !== MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_ID) {
    throw new Error(`MECHANIZED_GYPSUM_WALL_PLASTER_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.mechanized-gypsum-wall-plaster-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...MECHANIZED_GYPSUM_WALL_PLASTER_PARAMETERS],
    formulaDefinitions: [...MECHANIZED_GYPSUM_WALL_PLASTER_FORMULAS],
    resourceDefinitions: [...MECHANIZED_GYPSUM_WALL_PLASTER_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_SUMMARY = Object.freeze({
  sourceId: MECHANIZED_GYPSUM_WALL_PLASTER_SOURCE_ID,
  normId: MECHANIZED_GYPSUM_WALL_PLASTER_NORM_ID,
  formula: "known wall area gives plastering work only; exact primer, plaster mix, profiles, station, protection and conditional mesh come from approved project, product-system, survey and method documents",
});
