import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import {
  BIA_TN10_MASONRY_NORM_ID,
  BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  BIA_TN10_MASONRY_REQUIRED_IDS,
  BIA_TN10_MASONRY_SOURCE_ID,
  BIA_TN10_MASONRY_SOURCE_METADATA,
} from "./domainFactory";

export const MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID =
  "canonical-work:base:masonry_interior_brick_wall_lay_standard" as const;
export const MASONRY_BRICK_WALL_BIA_TN10_TITLE_RU =
  "Кладка стены из обожжённого глиняного кирпича по BIA TN 10 Table 4" as const;
export const MASONRY_BRICK_WALL_BIA_TN10_SOURCE_PACK_SHA256 =
  "719fb6aaef220d986eefd6a0104253f08257a17e669923fbce9edca9ae7b52c1" as const;

export type MasonryBrickWallBiaTn10InputValue = string | number | boolean;

export type MasonryBrickWallBiaTn10Parameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Record<string, unknown>;
};

export type MasonryBrickWallBiaTn10Formula = CanonicalEstimateFormulaDefinition & {
  output_unit_id: string;
  expression_source: string;
};

const PARAMETER_TITLES_RU: Readonly<Record<string, string>> = Object.freeze({
  product_profile_id: "Профиль нормативного расчёта",
  measured_net_brick_wall_area_m2: "Чистая площадь кирпичной стены после вычета проёмов, м²",
  gross_wall_area_and_opening_deductions: "Проверка общей площади, проёмов и чистой площади",
  fired_clay_brick_confirmed: "Подтверждён обожжённый глиняный кирпич",
  brick_manufacturer_and_designation: "Производитель и точное обозначение кирпича",
  specified_and_nominal_dimensions: "Заданные и номинальные размеры кирпича",
  joint_width_mm: "Толщина растворного шва, мм",
  wall_thickness_and_wythe_configuration: "Толщина стены и число слоёв кладки",
  bond_pattern: "Тип перевязки кладки",
  selected_bia_tn10_table_4_row: "Выбранная строка BIA TN 10 Table 4",
  selected_brick_quantity_per_m2: "Количество кирпича из выбранной строки, шт/м²",
  selected_mortar_quantity_per_m2: "Количество раствора из выбранной строки, м³/м²",
  applicable_bond_correction_factors: "Применимые поправочные коэффициенты перевязки",
  selected_project_breakage_and_waste_allowances: "Проектный бой кирпича и запас раствора",
  supplier_package_quantities: "Размеры упаковок поставщика",
  project_architect_engineer_or_estimator_approval_reference: "Ссылка на согласование архитектора, инженера или сметчика",
  brick_bond_correction_factor: "Числовой коэффициент кирпича из согласованной поправки",
  mortar_bond_correction_factor: "Числовой коэффициент раствора из согласованной поправки",
  brick_breakage_percent: "Согласованный проектный бой кирпича, %",
  mortar_waste_percent: "Согласованный проектный запас раствора, %",
  brick_supplier_package_pieces: "Количество кирпича в упаковке поставщика, шт.",
  mortar_supplier_package_m3: "Объём поставочной партии раствора, м³",
});

const PARAMETER_UNITS: Readonly<Record<string, string>> = Object.freeze({
  measured_net_brick_wall_area_m2: "m2",
  joint_width_mm: "mm",
  selected_brick_quantity_per_m2: "piece_per_m2",
  selected_mortar_quantity_per_m2: "m3_per_m2",
  brick_bond_correction_factor: "ratio",
  mortar_bond_correction_factor: "ratio",
  brick_breakage_percent: "percent",
  mortar_waste_percent: "percent",
  brick_supplier_package_pieces: "piece",
  mortar_supplier_package_m3: "m3",
});

const EXTRA_NUMERIC_PARAMETER_IDS = Object.freeze([
  "brick_bond_correction_factor",
  "mortar_bond_correction_factor",
  "brick_breakage_percent",
  "mortar_waste_percent",
  "brick_supplier_package_pieces",
  "mortar_supplier_package_m3",
] as const);

export const MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  "selected_bia_tn10_table_4_row",
  "selected_brick_quantity_per_m2",
  "selected_mortar_quantity_per_m2",
  "applicable_bond_correction_factors",
  "brick_bond_correction_factor",
  "mortar_bond_correction_factor",
] as const);
const BIA_NORMATIVE_PARAMETER_ID_SET = new Set<string>(
  MASONRY_BRICK_WALL_BIA_TN10_NORMATIVE_PARAMETER_IDS,
);

const ALL_PARAMETER_IDS = Object.freeze([
  "product_profile_id",
  ...BIA_TN10_MASONRY_REQUIRED_IDS,
  ...EXTRA_NUMERIC_PARAMETER_IDS,
].filter((value, index, values) => values.indexOf(value) === index));

function parameterValueType(parameterId: string): string {
  if (parameterId === "fired_clay_brick_confirmed") return "boolean";
  if (parameterId === "product_profile_id") return "enum";
  if (parameterId.endsWith("_m2") || parameterId.endsWith("_mm")
    || parameterId.includes("quantity_per_m2") || EXTRA_NUMERIC_PARAMETER_IDS.includes(parameterId as never)) {
    return "decimal";
  }
  return "text";
}

function parameterConstraints(parameterId: string): Record<string, unknown> {
  if (parameterId === "product_profile_id") return { values: [BIA_TN10_MASONRY_PRODUCT_PROFILE_ID] };
  if (parameterId === "fired_clay_brick_confirmed") return {};
  if (["brick_breakage_percent", "mortar_waste_percent"].includes(parameterId)) return { min: 0, max: 100 };
  if (parameterValueType(parameterId) === "decimal") return { min: 0.000001 };
  return { maxLength: 500 };
}

export const MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS: readonly MasonryBrickWallBiaTn10Parameter[] =
  Object.freeze(ALL_PARAMETER_IDS.map((parameterId, ordinal) => {
    const normative = BIA_NORMATIVE_PARAMETER_ID_SET.has(parameterId);
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: parameterValueType(parameterId),
      unit_id: PARAMETER_UNITS[parameterId] ?? null,
      title_ru: PARAMETER_TITLES_RU[parameterId] ?? parameterId,
      required: true,
      default_value: null,
      constraints_json: parameterConstraints(parameterId),
      truth_metadata: {
        semantic_parameter_key: `${MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID}:${parameterId}`,
        visibility_role: "USER_INPUT",
        value_source_role: normative ? "SELECTED_NORMATIVE_TABLE_INPUT" : "PROJECT_SPECIFIC_INPUT",
        preliminary_compilation_allowed: false,
        source_confirmation_required: true,
        guide: {
          guide_kind: normative ? "NORMATIVE_SOURCE" : "PROJECT_DEFINED",
          guide_short_ru: `Укажите подтверждённое значение: ${PARAMETER_TITLES_RU[parameterId] ?? parameterId}.`,
          source_role: normative ? "SELECTED_BIA_TABLE" : "PROJECT_DOCUMENTATION_OR_SUPPLIER_QUOTE",
          source_document: normative ? BIA_TN10_MASONRY_SOURCE_ID : null,
          source_locator: normative ? BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator : null,
          guide_version: "masonry-brick-wall-bia-tn10-r1",
          source_snapshot_hash: normative ? MASONRY_BRICK_WALL_BIA_TN10_SOURCE_PACK_SHA256 : null,
          applicability: normative
            ? "Только выбранная строка BIA TN 10 Table 4 для подтверждённого обожжённого глиняного кирпича."
            : "Значение относится к конкретному проекту или поставщику и не выводится из BIA TN 10.",
          verified_at: "2026-09-15T00:00:00+06:00",
          guide_validation_policy: "REJECT_OUTSIDE_EXACT_BIA_TN10_APPLICABILITY",
        },
        synthetic: false,
      },
    };
  }));

function formula(formulaId: string, outputUnitId: string, expressionSource: string): MasonryBrickWallBiaTn10Formula {
  const compiled = compileFormulaGraph(expressionSource);
  return Object.freeze({
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

export const MASONRY_BRICK_WALL_BIA_TN10_FORMULAS: readonly MasonryBrickWallBiaTn10Formula[] = Object.freeze([
  formula(
    "bia_tn10_brick_net_need_v1",
    "piece",
    "measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor",
  ),
  formula(
    "bia_tn10_brick_procurement_v1",
    "piece",
    "ceil((measured_net_brick_wall_area_m2 * selected_brick_quantity_per_m2 * brick_bond_correction_factor * (1 + brick_breakage_percent / 100)) / brick_supplier_package_pieces) * brick_supplier_package_pieces",
  ),
  formula(
    "bia_tn10_mortar_net_need_v1",
    "m3",
    "measured_net_brick_wall_area_m2 * selected_mortar_quantity_per_m2 * mortar_bond_correction_factor",
  ),
  formula(
    "bia_tn10_mortar_procurement_v1",
    "m3",
    "ceil((measured_net_brick_wall_area_m2 * selected_mortar_quantity_per_m2 * mortar_bond_correction_factor * (1 + mortar_waste_percent / 100)) / mortar_supplier_package_m3) * mortar_supplier_package_m3",
  ),
  formula("bia_tn10_measured_wall_area_v1", "m2", "measured_net_brick_wall_area_m2"),
]);

const NORMATIVE_TRACE = Object.freeze([{
  document_code: BIA_TN10_MASONRY_SOURCE_ID,
  source_id: BIA_TN10_MASONRY_SOURCE_ID,
  sourceId: BIA_TN10_MASONRY_SOURCE_ID,
  norm_id: BIA_TN10_MASONRY_NORM_ID,
  normId: BIA_TN10_MASONRY_NORM_ID,
  source_title: BIA_TN10_MASONRY_SOURCE_METADATA.source_title,
  source_document_version: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
  normVersion: BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version,
  source_definition_hash: BIA_TN10_MASONRY_SOURCE_METADATA.definition_hash,
  exact_locator: BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator,
  source_url: BIA_TN10_MASONRY_SOURCE_METADATA.source_url,
  applicability: {
    selectedProductProfileId: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
    firedClayBrickOnly: true,
    aacAdhesiveAndMeshExcluded: true,
    automaticGenericBinding: false,
  },
}]);

function materialQuantityPolicy(input: {
  materialType: "piece_material" | "wet_mix";
  unit: "piece" | "m3";
  wastePercentParameterId: string;
  procurementPackageSizeParameterId: string;
  formula: string;
  formulaInputParameterIds: readonly string[];
}) {
  return {
    version: "canonical-material-quantity-policy:v1",
    basisVersion: "professional-material-quantity-basis:v1",
    materialType: input.materialType,
    unit: input.unit,
    wastePercent: 0,
    wastePercentParameterId: input.wastePercentParameterId,
    lossPercent: 0,
    procurementUnit: input.unit,
    procurementPackageSize: 1,
    procurementPackageSizeParameterId: input.procurementPackageSizeParameterId,
    formula: input.formula,
    formulaInputs: {},
    formulaInputParameterIds: input.formulaInputParameterIds,
    sourceId: BIA_TN10_MASONRY_SOURCE_ID,
    citationLabel: `${BIA_TN10_MASONRY_SOURCE_METADATA.exact_locator} (${BIA_TN10_MASONRY_SOURCE_METADATA.source_document_version})`,
    quantityDependsOnParams: input.formulaInputParameterIds.filter((id) =>
      id !== input.wastePercentParameterId && id !== input.procurementPackageSizeParameterId),
  };
}

const PHYSICAL_BINDING_BASE = Object.freeze({
  technology_class: "BIA_TN10_FIRED_CLAY_BRICK_MEASUREMENT",
  operation_class: "MEASURE",
  material_system: "BIA_TN10_FIRED_CLAY_BRICK",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
  source_id: BIA_TN10_MASONRY_SOURCE_ID,
  applicability_parameter_ids: [...BIA_TN10_MASONRY_REQUIRED_IDS],
  activation: { parameter_id: "product_profile_id", equals: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID },
});

function resource(input: {
  id: string;
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  procurementEligible: boolean;
  resourceGraph?: Record<string, unknown>;
  normative?: boolean;
}): CanonicalEstimateResourceDefinition {
  return Object.freeze({
    id: input.id,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: { contract: "masonry-brick-wall-bia-tn10-r1", synthetic: false, ...input.resourceGraph },
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: {
      truth_contract_version: "R3",
      synthetic: false,
      sourceRole: input.normative ? "SELECTED_BIA_TABLE_AND_PROJECT_DOCUMENTATION" : "PROJECT_DOCUMENTATION",
      normativeTrace: input.normative ? NORMATIVE_TRACE : [],
      excludedUnownedMaterials: ["AAC", "thin-bed adhesive", "masonry mesh", "transport mass or trips"],
    },
    row_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  });
}

const BRICK_INPUT_IDS = [
  "measured_net_brick_wall_area_m2",
  "selected_brick_quantity_per_m2",
  "brick_bond_correction_factor",
  "brick_breakage_percent",
  "brick_supplier_package_pieces",
] as const;
const MORTAR_INPUT_IDS = [
  "measured_net_brick_wall_area_m2",
  "selected_mortar_quantity_per_m2",
  "mortar_bond_correction_factor",
  "mortar_waste_percent",
  "mortar_supplier_package_m3",
] as const;

export const MASONRY_BRICK_WALL_BIA_TN10_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({
    id: "resource-bia-tn10-fired-clay-brick",
    rowId: "material:bia-tn10:fired-clay-brick",
    ordinal: 0,
    section: "Материалы",
    category: "material",
    titleRu: "Обожжённый глиняный кирпич",
    unitId: "piece",
    formulaId: "bia_tn10_brick_net_need_v1",
    procurementEligible: true,
    normative: true,
    resourceGraph: {
      titleSpecificationParameterIds: ["brick_manufacturer_and_designation", "specified_and_nominal_dimensions"],
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
      professionalMaterialQuantityPolicyV1: materialQuantityPolicy({
        materialType: "piece_material",
        unit: "piece",
        wastePercentParameterId: "brick_breakage_percent",
        procurementPackageSizeParameterId: "brick_supplier_package_pieces",
        formula: "net selected-table brick need; project breakage; supplier package rounding",
        formulaInputParameterIds: BRICK_INPUT_IDS,
      }),
      professionalPhysicalNormBindingV1: {
        ...PHYSICAL_BINDING_BASE,
        quantity_output_parameter_id: "masonry_selected_brick_procurement_quantity_piece",
        quantity_output_formula_id: "bia_tn10_brick_procurement_v1",
      },
    },
  }),
  resource({
    id: "resource-bia-tn10-masonry-mortar",
    rowId: "material:bia-tn10:masonry-mortar",
    ordinal: 1,
    section: "Материалы",
    category: "material",
    titleRu: "Кладочный раствор по выбранной строке BIA TN 10 Table 4",
    unitId: "m3",
    formulaId: "bia_tn10_mortar_net_need_v1",
    procurementEligible: true,
    normative: true,
    resourceGraph: {
      professionalMaterialQuantityPolicyV1: materialQuantityPolicy({
        materialType: "wet_mix",
        unit: "m3",
        wastePercentParameterId: "mortar_waste_percent",
        procurementPackageSizeParameterId: "mortar_supplier_package_m3",
        formula: "net selected-table mortar need; project waste; supplier batch rounding",
        formulaInputParameterIds: MORTAR_INPUT_IDS,
      }),
      professionalPhysicalNormBindingV1: {
        ...PHYSICAL_BINDING_BASE,
        quantity_output_parameter_id: "masonry_selected_mortar_procurement_quantity_m3",
        quantity_output_formula_id: "bia_tn10_mortar_procurement_v1",
      },
    },
  }),
  resource({
    id: "resource-bia-tn10-brick-laying-work",
    rowId: "work:bia-tn10:brick-wall-laying",
    ordinal: 2,
    section: "Работы",
    category: "construction_work",
    titleRu: "Кладка стены из обожжённого глиняного кирпича по проектной геометрии",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
  resource({
    id: "resource-bia-tn10-joint-and-geometry-control",
    rowId: "work:bia-tn10:joint-and-geometry-control",
    ordinal: 3,
    section: "Работы",
    category: "construction_work",
    titleRu: "Контроль геометрии стены, толщины швов и перевязки",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
  resource({
    id: "resource-bia-tn10-cleaning-and-handover",
    rowId: "work:bia-tn10:cleaning-and-handover",
    ordinal: 4,
    section: "Работы",
    category: "construction_work",
    titleRu: "Очистка кладки и сдача выполненного участка",
    unitId: "m2",
    formulaId: "bia_tn10_measured_wall_area_v1",
    procurementEligible: false,
  }),
]);

export const MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT: Readonly<Record<string, MasonryBrickWallBiaTn10InputValue>> =
  Object.freeze({
    product_profile_id: BIA_TN10_MASONRY_PRODUCT_PROFILE_ID,
    measured_net_brick_wall_area_m2: 90,
    gross_wall_area_and_opening_deductions: "GROSS_M2=100; OPENINGS_M2=10; NET_M2=90",
    fired_clay_brick_confirmed: true,
    brick_manufacturer_and_designation: "Acme Brick Modular A-101",
    specified_and_nominal_dimensions: "specified=194x92x57mm; nominal=200x100x67mm",
    joint_width_mm: 10,
    wall_thickness_and_wythe_configuration: "WYTHE:single; THICKNESS_MM=100",
    bond_pattern: "RUNNING_BOND",
    selected_bia_tn10_table_4_row: "BIA_TN10_TABLE4:modular-single-wythe-running-bond-10mm",
    selected_brick_quantity_per_m2: 60,
    selected_mortar_quantity_per_m2: 0.02,
    applicable_bond_correction_factors: "BRICK_FACTOR=1.05; MORTAR_FACTOR=1.10",
    selected_project_breakage_and_waste_allowances: "BRICK_PERCENT=3; MORTAR_PERCENT=5",
    supplier_package_quantities: "BRICK_PIECES=500; MORTAR_M3=0.25",
    project_architect_engineer_or_estimator_approval_reference: "A-E-EST-BRICK-REV-C",
    brick_bond_correction_factor: 1.05,
    mortar_bond_correction_factor: 1.1,
    brick_breakage_percent: 3,
    mortar_waste_percent: 5,
    brick_supplier_package_pieces: 500,
    mortar_supplier_package_m3: 0.25,
  });

export async function compileMasonryBrickWallBiaTn10R1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.masonry-brick-wall-bia-tn10-r1",
    catalogId: options.catalogId ?? MASONRY_BRICK_WALL_BIA_TN10_CATALOG_ID,
    primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
    parameterDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS],
    formulaDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_FORMULAS],
    resourceDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 20,
    hashJson: async (value) => JSON.stringify(value),
  });
}
