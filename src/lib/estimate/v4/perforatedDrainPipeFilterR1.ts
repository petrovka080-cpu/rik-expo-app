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

export const PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_drainage_lay_standard";
export const PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID =
  "project_perforated_drain_pipe_filter_package_v1";
export const PERFORATED_DRAIN_PIPE_FILTER_NORM_ID =
  "norm:project:perforated_drain_pipe_filter:package:v1";

export const PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённый план дренажной трассы, спецификация дренажной системы, узел фильтрующей обсыпки, ППР и программа контроля",
  source_authority: "Проектная организация, производитель дренажной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_PERFORATED_DRAIN_PIPE_FILTER_ROUTE_PRODUCT_FILTER_METHOD_AND_QA_REVISION_EXPLICIT",
  definition_hash: "eh_project_perforated_drain_pipe_filter_package_r1",
  exact_locator: "Длина, тип перфорации и диаметр трубы; ведомость труб и муфт; марка и раскрой геотекстиля; фракция и объём промытого щебня; колодцы и песчаная постель по трассе; ППР контроля уклона и программа промывки",
  use_restriction: "Известная длина определяет только объём укладки; количества трубы, муфт, геотекстиля, щебня, смен прибора, испытаний и условных элементов берутся из проекта, спецификации, узлов, ППР и программы контроля без переноса исторических коэффициентов",
});

const CONDITIONAL_DETAILS = new Set([
  "inspection_chamber_designation", "inspection_chamber_quantity_piece",
  "sand_bedding_designation", "sand_bedding_volume_m3",
]);

const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина участка дренажной трубы", "decimal", "m", null],
  ["pipe_construction", "Конструкция дренажной трубы", "text", null, null],
  ["perforation_type", "Тип перфорации дренажной трубы", "text", null, null],
  ["pipe_outside_diameter_mm", "Наружный диаметр дренажной трубы", "decimal", "mm", null],
  ["geotextile_areal_density_g_m2", "Поверхностная плотность геотекстиля", "decimal", "g_per_m2", null],
  ["aggregate_fraction", "Фракция фильтрующего щебня", "text", null, null],
  ["pipe_designation", "Труба выбранной дренажной системы", "text", null, null],
  ["pipe_quantity_m", "Количество дренажной трубы по раскладке", "decimal", "m", null],
  ["coupler_designation", "Муфта выбранной дренажной системы", "text", null, null],
  ["coupler_quantity_piece", "Количество соединительных муфт", "decimal", "pcs", null],
  ["geotextile_designation", "Геотекстиль по проектному узлу фильтра", "text", null, null],
  ["geotextile_area_m2", "Площадь геотекстиля по раскрою", "decimal", "m2", null],
  ["aggregate_designation", "Промытый щебень по проектному узлу фильтра", "text", null, null],
  ["aggregate_volume_m3", "Объём промытого щебня", "decimal", "m3", null],
  ["laser_designation", "Прибор контроля уклона дренажа", "text", null, null],
  ["laser_shift", "Смены прибора контроля уклона", "decimal", "shift", null],
  ["flow_test_designation", "Промывка и проверка водопропускания участка", "text", null, null],
  ["flow_test_count_test", "Количество проверок водопропускания", "decimal", "test", null],
  ["inspection_chamber_mode", "Смотровой дренажный колодец требуется по трассе", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["inspection_chamber_designation", "Смотровой дренажный колодец по проекту", "text", null, null],
  ["inspection_chamber_quantity_piece", "Количество смотровых дренажных колодцев", "decimal", "pcs", null],
  ["sand_bedding_mode", "Песчаная постель требуется по проектному узлу", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["sand_bedding_designation", "Песок для дренажной постели по проекту", "text", null, null],
  ["sand_bedding_volume_m3", "Объём песка для дренажной постели", "decimal", "m3", null],
] as const);

const KNOWN_SCOPE = [
  "length_m", "pipe_construction", "perforation_type", "pipe_outside_diameter_mm",
  "geotextile_areal_density_g_m2", "aggregate_fraction",
];

function conditionalConstraints(parameterId: string): Json {
  const branch = parameterId.startsWith("inspection_chamber_")
    ? "inspection_chamber_mode"
    : parameterId.startsWith("sand_bedding_")
      ? "sand_bedding_mode"
      : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type PerforatedDrainPipeFilterParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS:
readonly PerforatedDrainPipeFilterParameter[] = Object.freeze(PARAMETER_SPECS.map(
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
      contract: "rik-expo-app.perforated-drain-pipe-filter-r1",
      semantic_parameter_key: `perforated-drain-pipe-filter:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_ROUTE_PRODUCT_FILTER_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите подтверждённую длину укладываемого дренажного участка по плану трассы."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по маркировке материалов и проектному узлу фильтра.`
            : `${titleRu}: укажите по ведомости дренажной системы, раскрою, узлу фильтра, ППР или программе контроля.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_ROUTE_FILTER_SCOPE"
          : "APPROVED_PROJECT_PRODUCT_FILTER_METHOD_OR_QA_DOCUMENTATION",
        source_document: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
        source_locator: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.exact_locator,
        guide_version: "perforated-drain-pipe-filter-r1",
        source_snapshot_hash: "e44749a100c1da765b316989f18479a689481d93e6c984d1af17cb45e21fc6cd",
        applicability: "Только для укладки указанного участка перфорированной дренажной трубы Ø110 в фильтрующей обсыпке; магистральная ливневая сеть и полный дорожный водоотвод не включаются.",
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

export const PERFORATED_DRAIN_PIPE_FILTER_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("perforated_drain_pipe_lay_length_v1", "m", "length_m"),
  formula("perforated_drain_pipe_d110_quantity_v1", "m", "pipe_quantity_m"),
  formula("drain_pipe_coupler_d110_quantity_v1", "pcs", "coupler_quantity_piece"),
  formula("needle_punched_geotextile_300_area_v1", "m2", "geotextile_area_m2"),
  formula("washed_granite_crushed_stone_20_40_volume_v1", "m3", "aggregate_volume_m3"),
  formula("drainage_laser_level_shift_v1", "shift", "laser_shift"),
  formula("drainage_flush_flow_test_count_v1", "test", "flow_test_count_test"),
  formula("drain_inspection_chamber_quantity_v1", "pcs", "inspection_chamber_quantity_piece"),
  formula("sand_drain_bedding_volume_v1", "m3", "sand_bedding_volume_m3"),
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
    semanticOwnerId: `perforated-drain-pipe-filter:${input.rowId}`,
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
      sourceId: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
      source_id: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
      normId: PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
      norm_id: PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
      normVersion: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.source_document_version,
      source_title: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.source_title,
      exact_locator: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.exact_locator,
      source_definition_hash: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic pipe waste or module length",
      "automatic coupler interval",
      "automatic geotextile width, overlap or area",
      "automatic filter aggregate cross-section or volume",
      "automatic laser-shift or flush-test interval",
      "automatic inspection chamber or sand bedding",
      "stormwater main collector or full road drainage system",
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

export const PERFORATED_DRAIN_PIPE_FILTER_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:perforated_drain_pipe_lay", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Укладка перфорированной дренажной трубы Ø110 мм в фильтрующей обсыпке", unitId: "m", formulaId: "perforated_drain_pipe_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_ROUTE_FILTER_SCOPE" }),
  resource({ rowId: "rc09:perforated_drain_pipe_d110", ordinal: 1, section: "Материалы", category: "material", titleRu: "Труба дренажная перфорированная двухслойная Ø110 мм", unitId: "m", formulaId: "perforated_drain_pipe_d110_quantity_v1", procurementEligible: true, titleParameterIds: ["pipe_designation"], sourceRole: "APPROVED_DRAINAGE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:drain_pipe_coupler_d110", ordinal: 2, section: "Материалы", category: "material", titleRu: "Муфта соединительная для дренажной трубы Ø110 мм", unitId: "pcs", formulaId: "drain_pipe_coupler_d110_quantity_v1", procurementEligible: true, titleParameterIds: ["coupler_designation"], sourceRole: "APPROVED_DRAINAGE_SYSTEM_SCHEDULE" }),
  resource({ rowId: "rc09:needle_punched_geotextile_300", ordinal: 3, section: "Материалы", category: "material", titleRu: "Геотекстиль иглопробивной 300 г/м²", unitId: "m2", formulaId: "needle_punched_geotextile_300_area_v1", procurementEligible: true, titleParameterIds: ["geotextile_designation"], sourceRole: "APPROVED_FILTER_DETAIL_AND_CUTTING_SCHEDULE" }),
  resource({ rowId: "rc09:washed_granite_crushed_stone_20_40", ordinal: 4, section: "Материалы", category: "material", titleRu: "Щебень гранитный промытый фракции 20–40 мм", unitId: "m3", formulaId: "washed_granite_crushed_stone_20_40_volume_v1", procurementEligible: true, titleParameterIds: ["aggregate_designation"], sourceRole: "APPROVED_FILTER_DETAIL" }),
  resource({ rowId: "rc09:drainage_laser_level", ordinal: 5, section: "Оборудование", category: "equipment", titleRu: "Лазерный нивелир для контроля уклона дренажа", unitId: "shift", formulaId: "drainage_laser_level_shift_v1", procurementEligible: true, titleParameterIds: ["laser_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:drainage_flush_flow_test", ordinal: 6, section: "Контроль", category: "service", titleRu: "Промывка и проверка водопропускания дренажного участка", unitId: "test", formulaId: "drainage_flush_flow_test_count_v1", procurementEligible: true, titleParameterIds: ["flow_test_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:drain_inspection_chamber", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Смотровой дренажный колодец по трассе", unitId: "pcs", formulaId: "drain_inspection_chamber_quantity_v1", inclusionAst: equals("inspection_chamber_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["inspection_chamber_designation"], sourceRole: "APPROVED_ROUTE_PLAN" }),
  resource({ rowId: "rc09:sand_drain_bedding", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Песок для дренажной постели по проектному узлу", unitId: "m3", formulaId: "sand_drain_bedding_volume_v1", inclusionAst: equals("sand_bedding_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["sand_bedding_designation"], sourceRole: "APPROVED_FILTER_DETAIL" }),
]);

export const PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT = Object.freeze({
  length_m: 60,
  pipe_construction: "двухслойная дренажная труба",
  perforation_type: "перфорированная",
  pipe_outside_diameter_mm: 110,
  geotextile_areal_density_g_m2: 300,
  aggregate_fraction: "20–40 мм",
});

export const PERFORATED_DRAIN_PIPE_FILTER_ACCEPTANCE_INPUT = Object.freeze({
  ...PERFORATED_DRAIN_PIPE_FILTER_SHORT_INPUT,
  pipe_designation: "Труба дренажная перфорированная двухслойная Ø110 мм по выбранной системе",
  pipe_quantity_m: 61.8,
  coupler_designation: "Муфта соединительная для дренажной трубы Ø110 мм по выбранной системе",
  coupler_quantity_piece: 11,
  geotextile_designation: "Геотекстиль иглопробивной 300 г/м² по проектному раскрою",
  geotextile_area_m2: 168,
  aggregate_designation: "Щебень гранитный промытый фракции 20–40 мм по проектному узлу",
  aggregate_volume_m3: 28.8,
  laser_designation: "Лазерный нивелир для контроля уклона по ППР",
  laser_shift: 1.2,
  flow_test_designation: "Промывка и проверка водопропускания по программе контроля",
  flow_test_count_test: 2,
  inspection_chamber_mode: "NOT_REQUIRED",
  sand_bedding_mode: "NOT_REQUIRED",
});

export async function compilePerforatedDrainPipeFilterR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID;
  if (catalogId !== PERFORATED_DRAIN_PIPE_FILTER_CATALOG_ID) {
    throw new Error(`PERFORATED_DRAIN_PIPE_FILTER_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.perforated-drain-pipe-filter-r1",
    catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...PERFORATED_DRAIN_PIPE_FILTER_PARAMETERS],
    formulaDefinitions: [...PERFORATED_DRAIN_PIPE_FILTER_FORMULAS],
    resourceDefinitions: [...PERFORATED_DRAIN_PIPE_FILTER_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 14,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const PERFORATED_DRAIN_PIPE_FILTER_SOURCE_SUMMARY = Object.freeze({
  sourceId: PERFORATED_DRAIN_PIPE_FILTER_SOURCE_ID,
  normId: PERFORATED_DRAIN_PIPE_FILTER_NORM_ID,
  formula: "known route length and perforated D110 pipe, 300 g/m2 geotextile and 20-40 mm aggregate identity give laying work only; exact pipe, couplers, filter quantities, control, tests and conditional route details come from the approved project package",
});
