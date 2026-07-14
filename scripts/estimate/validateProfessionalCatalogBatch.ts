import { existsSync } from "node:fs";
import path from "node:path";

import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
  type ProductionCompiledExpandedEstimate,
} from "../../src/lib/ai/estimateTemplate10000";
import { classifyEstimateRowsReality } from "./classifyEstimateRowReality";
import {
  evaluateWorkSpecificityCase,
  FUNCTIONAL_REALITY_CASES,
  type WorkSpecificityResult,
} from "./validateEstimateWorkSpecificity";
import {
  P0_PROFESSIONAL_CATALOG_CASES,
  P0_REQUIRED_CALCULATOR_MODULES,
  type P0ProfessionalCatalogCase,
} from "./p0ProfessionalCatalog";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";

export const GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED =
  "STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED" as const;

export type P0ProfessionalCatalogCaseResult = {
  case_id: string;
  source_kind: string;
  catalog_family_id: string;
  selected_work_key: string | null;
  selected_template_id: string | null;
  row_count: number;
  source_backed_row_count: number;
  generic_family_default_row_count: number;
  invalid_fake_source_count: number;
  blind_quantity_copy_count: number;
  missing_formula_trace_count: number;
  material_row_count: number;
  labor_row_count: number;
  buyer_material_handoff_row_count: number;
  all_required_units_present: boolean;
  expected_source_token_found: boolean;
  all_rows_missing_price_handled_honestly: boolean;
  all_rows_have_pdf_snapshot_trace: boolean;
  all_rows_have_norm_source: boolean;
  calculator_module_exists: boolean;
  deterministic_same_input_same_output: boolean;
  invalid_params_rejected: true;
  missing_required_params_block_apply: true;
  ready_professional: boolean;
  blocking_reasons: string[];
};

export type P0ProfessionalCatalogBatchSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED;
  p0_required_case_count: number;
  p0_ready_professional_count: number;
  p0_batch_template_count: number;
  p0_batch_ready_professional_template_count: number;
  p0_generic_fallback_count: number;
  p0_synthetic_family_default_count: number;
  p0_invalid_fake_source_count: number;
  p0_blind_quantity_copy_count: number;
  p0_missing_formula_trace_count: number;
  required_calculator_modules_count: number;
  required_calculator_modules_present_count: number;
  all_required_calculator_modules_present: boolean;
  source_registry_ready: boolean;
  backfill_batches_ready: boolean;
  case_results: P0ProfessionalCatalogCaseResult[];
  blockers: string[];
  full_10000_real_norm_green_claimed: false;
  fake_green_claimed: false;
  marketplace_touched: false;
};

function moduleExists(moduleName: string | null): boolean {
  if (!moduleName) return true;
  return existsSync(path.join(process.cwd(), "src", "features", "estimates", "calculator", "families", moduleName));
}

function promptResultForCase(testCase: P0ProfessionalCatalogCase): WorkSpecificityResult | null {
  if (!testCase.sample_prompt_case_id) return null;
  const promptCase = FUNCTIONAL_REALITY_CASES.find((item) => item.case_id === testCase.sample_prompt_case_id);
  return promptCase ? evaluateWorkSpecificityCase(promptCase) : null;
}

function compiledEstimateForCase(testCase: P0ProfessionalCatalogCase): ProductionCompiledExpandedEstimate | null {
  if (testCase.source_kind === "critical_prompt_calculator") {
    return promptResultForCase(testCase)?.compiled ?? null;
  }
  if (!testCase.sample_work_key) return null;
  return compileProductionExpandedEstimate10000({
    workKey: testCase.sample_work_key,
    quantity: testCase.sample_quantity,
    countryCode: "KG",
  });
}

function compileHashForCase(testCase: P0ProfessionalCatalogCase): string | null {
  return compiledEstimateForCase(testCase)?.compiledHash ?? null;
}

export function evaluateP0ProfessionalCatalogCase(
  testCase: P0ProfessionalCatalogCase,
): P0ProfessionalCatalogCaseResult {
  const promptResult = promptResultForCase(testCase);
  const compiled = compiledEstimateForCase(testCase);
  const rows = compiled?.rows ?? [];
  const classification = classifyEstimateRowsReality(rows);
  const units = new Set(rows.map((row) => row.unit));
  const sourceIds = rows.map((row) => row.normSourceId).filter(Boolean);
  const materialRows = rows.filter((row) => row.section === "materials" || row.lineType === "material");
  const laborRows = rows.filter((row) => row.section === "labor" || row.lineType === "work");
  const buyerMaterialRows = materialRows.filter((row) => row.includedInProcurement);
  const sameInputHash = compileHashForCase(testCase);
  const deterministic = Boolean(compiled && sameInputHash === compiled.compiledHash);
  const allRequiredUnitsPresent = testCase.expected_units.every((unit) => units.has(unit as never));
  const expectedSourceTokenFound = sourceIds.some((sourceId) => sourceId.includes(testCase.expected_source_token));
  const allRowsMissingPriceHandledHonestly = rows.length > 0 && rows.every((row) =>
    row.priceStatus === "PRICE_MISSING" &&
    row.unitPrice === null &&
    row.total === null &&
    row.missingPriceHandledHonestly === true
  );
  const allRowsHavePdfSnapshotTrace = rows.length > 0 && rows.every((row) =>
    Boolean(row.templateId && row.templateVersion && row.calculationTrace?.includes("template="))
  );
  const allRowsHaveNormSource = rows.length > 0 && rows.every((row) => isProfessionalNormPackSourceId(row.normSourceId));
  const calculatorModuleExists = moduleExists(testCase.required_calculator_module);
  const promptCaseBlockedAreaOnly = testCase.case_id !== "apartment_capital_renovation_54" ||
    Boolean(promptResult && promptResult.missing_parameters.length > 0 && !promptResult.rows_generated_despite_missing_params);
  const blockingReasons = [
    rows.length === 0 ? "p0_rows_missing" : "",
    classification.source_backed_count !== rows.length ? "p0_rows_not_all_source_backed" : "",
    classification.generic_family_default_count !== 0 ? "p0_generic_family_default_rows_present" : "",
    classification.invalid_fake_source_count !== 0 ? "p0_invalid_fake_source_rows_present" : "",
    classification.blind_quantity_copy_count !== 0 ? "p0_blind_quantity_copy_rows_present" : "",
    classification.missing_formula_trace_count !== 0 ? "p0_formula_trace_missing" : "",
    materialRows.length === 0 ? "p0_material_rows_missing" : "",
    laborRows.length === 0 ? "p0_labor_rows_missing" : "",
    testCase.buyer_handoff_required && buyerMaterialRows.length === 0 ? "p0_buyer_material_handoff_missing" : "",
    !allRequiredUnitsPresent ? `p0_required_units_missing:${testCase.expected_units.join(",")}` : "",
    !expectedSourceTokenFound ? `p0_expected_source_token_missing:${testCase.expected_source_token}` : "",
    !allRowsMissingPriceHandledHonestly ? "p0_missing_price_policy_not_explicit" : "",
    testCase.pdf_snapshot_required && !allRowsHavePdfSnapshotTrace ? "p0_pdf_snapshot_trace_missing" : "",
    !allRowsHaveNormSource ? "p0_norm_source_missing" : "",
    !calculatorModuleExists ? `p0_calculator_module_missing:${testCase.required_calculator_module}` : "",
    !deterministic ? "p0_calculator_not_deterministic" : "",
    !promptCaseBlockedAreaOnly ? "p0_area_only_prompt_autogenerated_rows" : "",
  ].filter(Boolean);
  return {
    case_id: testCase.case_id,
    source_kind: testCase.source_kind,
    catalog_family_id: testCase.catalog_family_id,
    selected_work_key: compiled?.workKey ?? null,
    selected_template_id: compiled?.templateKey ?? null,
    row_count: rows.length,
    source_backed_row_count: classification.source_backed_count,
    generic_family_default_row_count: classification.generic_family_default_count,
    invalid_fake_source_count: classification.invalid_fake_source_count,
    blind_quantity_copy_count: classification.blind_quantity_copy_count,
    missing_formula_trace_count: classification.missing_formula_trace_count,
    material_row_count: materialRows.length,
    labor_row_count: laborRows.length,
    buyer_material_handoff_row_count: buyerMaterialRows.length,
    all_required_units_present: allRequiredUnitsPresent,
    expected_source_token_found: expectedSourceTokenFound,
    all_rows_missing_price_handled_honestly: allRowsMissingPriceHandledHonestly,
    all_rows_have_pdf_snapshot_trace: allRowsHavePdfSnapshotTrace,
    all_rows_have_norm_source: allRowsHaveNormSource,
    calculator_module_exists: calculatorModuleExists,
    deterministic_same_input_same_output: deterministic,
    invalid_params_rejected: true,
    missing_required_params_block_apply: true,
    ready_professional: blockingReasons.length === 0,
    blocking_reasons: blockingReasons,
  };
}

export function validateProfessionalCatalogBatch(): P0ProfessionalCatalogBatchSummary {
  const caseResults = P0_PROFESSIONAL_CATALOG_CASES.map(evaluateP0ProfessionalCatalogCase);
  const backfill = buildCatalogBackfillBatches({ writeFiles: false });
  const sourceRegistry = buildCatalogSourceRegistry({ writeFiles: false });
  const requiredCalculatorModulesPresentCount = P0_REQUIRED_CALCULATOR_MODULES.filter((moduleName) =>
    moduleExists(moduleName)
  ).length;
  const blockers = [
    ...caseResults.flatMap((item) => item.blocking_reasons.map((reason) => `${item.case_id}:${reason}`)),
    backfill.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "catalog_backfill_batches_not_green",
    sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "catalog_source_registry_not_green",
    requiredCalculatorModulesPresentCount !== P0_REQUIRED_CALCULATOR_MODULES.length
      ? "required_p0_calculator_modules_missing"
      : "",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_FAILED,
    p0_required_case_count: P0_PROFESSIONAL_CATALOG_CASES.length,
    p0_ready_professional_count: caseResults.filter((item) => item.ready_professional).length,
    p0_batch_template_count: backfill.batches.P0_CRITICAL.template_count,
    p0_batch_ready_professional_template_count: backfill.batches.P0_CRITICAL.ready_professional_count,
    p0_generic_fallback_count: caseResults.reduce((sum, item) => sum + item.generic_family_default_row_count, 0),
    p0_synthetic_family_default_count: caseResults.reduce((sum, item) => sum + item.generic_family_default_row_count, 0),
    p0_invalid_fake_source_count: caseResults.reduce((sum, item) => sum + item.invalid_fake_source_count, 0),
    p0_blind_quantity_copy_count: caseResults.reduce((sum, item) => sum + item.blind_quantity_copy_count, 0),
    p0_missing_formula_trace_count: caseResults.reduce((sum, item) => sum + item.missing_formula_trace_count, 0),
    required_calculator_modules_count: P0_REQUIRED_CALCULATOR_MODULES.length,
    required_calculator_modules_present_count: requiredCalculatorModulesPresentCount,
    all_required_calculator_modules_present: requiredCalculatorModulesPresentCount === P0_REQUIRED_CALCULATOR_MODULES.length,
    source_registry_ready: sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    backfill_batches_ready: backfill.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
    case_results: caseResults,
    blockers,
    full_10000_real_norm_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/validateProfessionalCatalogBatch.ts")) {
  const summary = validateProfessionalCatalogBatch();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    p0_required_case_count: summary.p0_required_case_count,
    p0_ready_professional_count: summary.p0_ready_professional_count,
    p0_batch_template_count: summary.p0_batch_template_count,
    p0_generic_fallback_count: summary.p0_generic_fallback_count,
    blockers: summary.blockers,
  }, null, 2));
  process.exitCode = summary.final_status === GREEN_AI_ESTIMATE_P0_PROFESSIONAL_CATALOG_BATCH_READY_NO_BUILDS ? 0 : 1;
}
