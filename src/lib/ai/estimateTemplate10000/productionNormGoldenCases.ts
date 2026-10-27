import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
  type ProductionTemplate10000Category,
} from "./productionExpandedWorkCatalog10000";

export type EstimateNormGoldenCase = {
  case_id: string;
  category: ProductionTemplate10000Category;
  quantity: number;
  country_code: "KG" | "KZ";
  source_expectation: "norm_id_source_version_trace";
};

export type EstimateNormGoldenCaseResult = EstimateNormGoldenCase & {
  work_key: string;
  template_key: string;
  row_count: number;
  norm_sources_count: number;
  passed: boolean;
  failures: string[];
};

export const ESTIMATE_NORM_GOLDEN_CASES_20: readonly EstimateNormGoldenCase[] = Object.freeze([
  { case_id: "golden_demolition_54", category: "demolition", quantity: 54, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_earthworks_120", category: "earthworks", quantity: 120, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_concrete_foundation_18", category: "concrete_foundation", quantity: 18, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_masonry_220", category: "masonry", quantity: 220, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_waterproofing_85", category: "waterproofing", quantity: 85, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_roofing_160", category: "roofing", quantity: 160, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_insulation_140", category: "insulation", quantity: 140, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_facade_210", category: "facade", quantity: 210, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_plaster_paint_300", category: "plaster_paint", quantity: 300, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_drywall_ceiling_80", category: "drywall_ceiling", quantity: 80, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_tile_stone_45", category: "tile_stone", quantity: 45, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_flooring_95", category: "flooring", quantity: 95, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_doors_windows_12", category: "doors_windows", quantity: 12, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_carpentry_metal_75", category: "carpentry_metal", quantity: 75, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_electrical_36", category: "electrical", quantity: 36, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_plumbing_24", category: "plumbing", quantity: 24, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_heating_hvac_18", category: "heating_hvac", quantity: 18, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_ventilation_6", category: "ventilation", quantity: 6, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_paving_roads_landscape_500", category: "paving_roads_landscape", quantity: 500, country_code: "KZ", source_expectation: "norm_id_source_version_trace" },
  { case_id: "golden_special_repair_35", category: "special_repair", quantity: 35, country_code: "KG", source_expectation: "norm_id_source_version_trace" },
]);

function firstDefinitionForCategory(category: ProductionTemplate10000Category) {
  const definition = PRODUCTION_WORK_DEFINITIONS_10000.find((item) => item.category === category);
  if (!definition) throw new Error(`ESTIMATE_NORM_GOLDEN_CATEGORY_MISSING:${category}`);
  return definition;
}

export function runEstimateNormGoldenCases20(): EstimateNormGoldenCaseResult[] {
  return ESTIMATE_NORM_GOLDEN_CASES_20.map((testCase) => {
    const definition = firstDefinitionForCategory(testCase.category);
    const compiled = compileProductionExpandedEstimate10000({
      workKey: definition.workKey,
      quantity: testCase.quantity,
      countryCode: testCase.country_code,
    });
    const failures = [
      compiled.rows.length > 0 ? "" : `rows_missing:${testCase.case_id}`,
      compiled.rows.every((row) => row.normId && row.normSourceId && row.normVersion) ? "" : `norm_fields_missing:${testCase.case_id}`,
      compiled.rows.every((row) =>
        row.calculationTrace.includes("normId=") &&
        row.calculationTrace.includes("normSource=") &&
        row.calculationTrace.includes("normVersion=")
      ) ? "" : `norm_trace_missing:${testCase.case_id}`,
      compiled.rows.every((row) => row.sourceParameters.normId && row.sourceParameters.normSourceId && row.sourceParameters.normVersion)
        ? ""
        : `norm_source_parameters_missing:${testCase.case_id}`,
    ].filter(Boolean);
    return {
      ...testCase,
      work_key: definition.workKey,
      template_key: compiled.templateKey,
      row_count: compiled.rows.length,
      norm_sources_count: new Set(compiled.rows.map((row) => row.normSourceId)).size,
      passed: failures.length === 0,
      failures,
    };
  });
}
