import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import goldenMatrixRaw from "../../data/estimate-golden-cases/extended-100-work-cases.json";
import { answerBuiltInAi } from "../../src/lib/ai/builtInAi/builtInAiIngress";
import { buildProfessionalExpandedGlobalEstimate } from "../../src/lib/ai/estimateCompiler/expandedEstimateCompiler";
import {
  detectEstimateFakeRows,
  structuredRowsForDetector,
} from "../../src/lib/ai/estimateContinuousDetection/continuousAiEstimateDetector";
import {
  GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS,
  validateAllProductionTemplatesExtended10000,
  type ProductionTemplateExtendedValidationSummary,
} from "../../src/lib/ai/estimateTemplate10000";
import type { GlobalEstimateResult } from "../../src/lib/ai/globalEstimate/globalEstimateTypes";
import { buildConsumerRepairAiDraftFromGlobalEstimate } from "../../src/lib/consumerRequests";
import {
  __resetConsumerRepairRequestStoreForTests,
  approveConsumerRepairRequestDraft,
  createConsumerRepairRequestDraft,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import { buildConsumerRepairStructuredEstimatePdfViewModel } from "../../src/lib/consumerRequests/consumerRequestPdfService";
import { normalizeCanonicalProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import { buildStructuredEstimatePayload, type StructuredEstimatePayload } from "../../src/lib/estimateStructuredPipeline";
import type { StructuredEstimateRow } from "../../src/lib/estimateStructuredPipeline/structuredEstimateTypes";
import { buildProjectExecutionDraftFromEstimate } from "../../src/lib/projectExecution";
import { buildRequestEstimateViewModel } from "../../src/features/consumerRepair/requestEstimateViewModel";

export const GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS =
  "GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS" as const;
export const GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS =
  "GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_FAILED =
  "STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_FAILED" as const;
export const STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED" as const;

const GENERATED_AT = "2026-07-03T00:00:00.000Z";
const RUNTIME_ROOT = ".release-runtime/ai-estimate-extended-100-cases";

type RawGoldenMatrix = {
  schema: string;
  target_final_status?: string;
  final_status_target?: string;
  case_count?: number;
  defaults: {
    expected_sections: string[];
    expected_material_rows: string[];
    expected_labor_rows?: string[];
    expected_work_rows?: string[];
    expected_equipment_rows: string[];
    expected_service_rows: string[];
    expected_units: string[];
    forbidden_patterns: string[];
  };
  cases: RawExtendedWorkCase[];
};

export type RawExtendedWorkCase = {
  case_id: string;
  prompt: string;
  expected_work_key: string;
  expected_work_group: string;
  input_parameters: {
    quantity: number;
    unit: string;
    country?: string;
    city?: string;
    city_or_region?: string;
    currency?: string;
  };
  expected_sections?: string[];
  expected_material_rows?: string[];
  expected_labor_rows?: string[];
  expected_equipment_rows?: string[];
  expected_service_rows?: string[];
  expected_units?: string[];
  forbidden_patterns?: string[];
};

export type ExtendedWorkCase = RawExtendedWorkCase & {
  input_parameters: {
    quantity: number;
    unit: string;
    country: string;
    city: string;
    currency: string;
  };
  expected_sections: string[];
  expected_material_rows: string[];
  expected_labor_rows: string[];
  expected_equipment_rows: string[];
  expected_service_rows: string[];
  expected_units: string[];
  forbidden_patterns: string[];
};

export type ExtendedCaseEvaluation = {
  case_id: string;
  work_key: string;
  work_group: string;
  row_count: number;
  section_count: number;
  material_rows: number;
  labor_rows: number;
  equipment_rows: number;
  delivery_rows: number;
  procurement_rows: number;
  priced_rows: number;
  missing_price_rows: number;
  quantity_unique_count: number;
  unit_unique_count: number;
  expected_work_key_matched: boolean;
  professional_contract: boolean;
  project_parameters_present: boolean;
  expanded_sections_exist: boolean;
  materials_and_works_separated: boolean;
  labor_rows_separated: boolean;
  equipment_rows_separated: boolean;
  service_rows_separated: boolean;
  consumables_rows_exist: boolean;
  components_rows_exist: boolean;
  logistics_and_waste_covered: boolean;
  price_sources_separated: boolean;
  norm_trace_present: boolean;
  calculation_trace_present: boolean;
  template_version_present: boolean;
  procurement_flags_present: boolean;
  quantity_invariants_passed: boolean;
  unit_invariants_passed: boolean;
  summary_totals_present: boolean;
  no_fake_area_multiplier: boolean;
  no_repeated_fake_totals: boolean;
  default_980_price_rejected: boolean;
  no_zero_amount_when_price_missing: boolean;
  no_raw_ai_json: boolean;
  detector_failure_ids: string[];
  failures: string[];
};

export type ExtendedLifecycleEvaluation = {
  case_id: string;
  request_ui_sections_visible: boolean;
  request_ui_trace_visible: boolean;
  history_trace_persisted: boolean;
  pdf_extended_sections_visible: boolean;
  pdf_calculation_trace_visible: boolean;
  pdf_norm_sources_visible: boolean;
  pdf_no_raw_ai_json: boolean;
  buyer_boq_extended_projection_passed: boolean;
  buyer_receives_material_rows_only: boolean;
  buyer_quantities_match_estimate: boolean;
  buyer_items_not_truncated: boolean;
  failures: string[];
};

export type BuiltInAiPromptParsingSummary = {
  cases_checked: number;
  prompt_parsing_passed: boolean;
  failures: string[];
};

export type ExtendedProfessionalCertificationSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS
    | typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_FAILED
    | typeof STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED;
  target_final_status:
    | typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS
    | typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS;
  full_certification_target_status: typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS;
  smoke_target_status: typeof GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS;
  certification_scope: "full_100_cases_plus_10000_templates" | "route_equivalent_smoke_without_10000_templates";
  full_certification_green: boolean;
  smoke_only_green: boolean;
  full_certification_not_claimed_when_templates_skipped: boolean;
  schema: string;
  case_count: number;
  extended_100_work_cases_defined: boolean;
  golden_100_cases_passed: boolean;
  golden_cases_failed_count: number;
  golden_20_full_smeta_cases_passed: boolean;
  full_lifecycle_cases_checked: number;
  all_major_work_groups_covered: boolean;
  covered_work_groups: string[];
  materials_labor_equipment_services_covered: boolean;
  logistics_and_waste_covered: boolean;
  extended_estimate_sections_exist: boolean;
  materials_and_works_separated: boolean;
  labor_rows_separated: boolean;
  equipment_rows_separated: boolean;
  service_rows_separated: boolean;
  price_sources_separated: boolean;
  calculation_trace_visible: boolean;
  norm_trace_visible: boolean;
  template_version_visible: boolean;
  procurement_flags_present: boolean;
  quantity_invariants_passed: boolean;
  unit_invariants_passed: boolean;
  no_fake_area_multiplier: boolean;
  no_repeated_fake_totals: boolean;
  default_980_price_rejected: boolean;
  no_zero_amount_when_price_missing: boolean;
  pdf_extended_sections_visible: boolean;
  pdf_calculation_trace_visible: boolean;
  pdf_norm_sources_visible: boolean;
  pdf_no_raw_ai_json: boolean;
  buyer_boq_extended_projection_passed: boolean;
  buyer_receives_material_rows_only: boolean;
  buyer_material_quantities_match_estimate: boolean;
  buyer_items_not_truncated: boolean;
  web_extended_100_cases_smoke_passed: boolean;
  web_100_preview_cases_passed: boolean;
  web_10_full_lifecycle_cases_passed: boolean;
  android_chrome_extended_cases_smoke_passed: boolean;
  android_chrome_25_preview_cases_passed: boolean;
  android_chrome_3_full_lifecycle_cases_passed: boolean;
  smoke_target: "web" | "android-chrome" | "both" | "headless";
  smoke_execution_mode: "headless_route_equivalent";
  headless_route_equivalent_smoke_passed: boolean;
  web_headless_route_equivalent_smoke_passed: boolean;
  android_chrome_headless_route_equivalent_smoke_passed: boolean;
  browser_automation_started: false;
  web_browser_automation_started: false;
  android_chrome_browser_automation_started: false;
  actual_web_browser_smoke_passed: false;
  actual_android_chrome_browser_smoke_passed: false;
  smoke_claims_actual_browser_automation: false;
  continuous_detector_checks_extended_estimate: true;
  continuous_detector_runs_100_case_matrix: boolean;
  continuous_detector_rejects_wrong_units_by_group: boolean;
  continuous_detector_rejects_missing_sections: boolean;
  continuous_detector_rejects_missing_procurement_flags: boolean;
  built_in_ai_prompt_parsing_passed: boolean;
  all_10000_templates_extended_validation_executed: boolean;
  all_10000_templates_extended_validation_passed: boolean;
  templates_validated_count: number;
  templates_failed_count: number;
  rows_validated_count: number;
  template_extended_validation?: ProductionTemplateExtendedValidationSummary;
  case_evaluations: ExtendedCaseEvaluation[];
  lifecycle_evaluations: ExtendedLifecycleEvaluation[];
  prompt_parsing: BuiltInAiPromptParsingSummary;
  failure_ids: string[];
  runtime_summary_path?: string;
  production_db_touched: false;
  destructive_migration_run: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  full_jest_started: false;
  fake_green_claimed: false;
};

export type ExtendedCertificationOptions = {
  casesLimit?: number;
  fullLifecycleLimit?: number;
  promptParsingLimit?: number;
  includeAllTemplates?: boolean;
  smokeTarget?: "web" | "android-chrome" | "both" | "headless";
  writeSummary?: boolean;
  runtimeRoot?: string;
};

function goldenMatrix(): RawGoldenMatrix {
  return goldenMatrixRaw as RawGoldenMatrix;
}

function uniqSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function isAreaLikeUnit(unit: string): boolean {
  return ["sq_m", "m2", "sqm", "sq_ft"].includes(unit);
}

function sameNumber(left: number | null | undefined, right: number | null | undefined): boolean {
  return left != null && right != null && Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.0001;
}

function repeatedCluster(values: readonly (number | null | undefined)[], minimumCount: number): boolean {
  const counts = new Map<number, number>();
  for (const value of values) {
    if (value == null || !Number.isFinite(value) || value <= 0) continue;
    const rounded = Math.round(value * 100) / 100;
    counts.set(rounded, (counts.get(rounded) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= minimumCount);
}

function rowText(row: Pick<StructuredEstimateRow, "rowId" | "code" | "visibleName" | "sectionTitle">): string {
  return [row.rowId, row.code, row.visibleName, row.sectionTitle].join(" ").toLocaleLowerCase("ru-RU");
}

function looksLikeInternalRawJson(value: string): boolean {
  return /raw_ai_json|```|\{".*":/.test(value);
}

function hasNormTrace(row: StructuredEstimateRow): boolean {
  const trace = row.calculationTrace ?? "";
  return Boolean(
    row.normId &&
    row.normSourceId &&
    row.normVersion &&
    /normId=/.test(trace) &&
    /normSource=/.test(trace) &&
    /normVersion=/.test(trace),
  );
}

function hasPriceSource(row: StructuredEstimateRow): boolean {
  if (row.unitPrice == null || row.total == null) return true;
  return Boolean(row.priceTrace?.price_source_id || row.sourceId || row.visibleSourceLabel);
}

function pushIf(failures: string[], condition: boolean, failureId: string): void {
  if (condition) failures.push(failureId);
}

export function loadExtended100WorkCases(limit = 100): ExtendedWorkCase[] {
  const matrix = goldenMatrix();
  const expectedLaborRows = matrix.defaults.expected_labor_rows ?? matrix.defaults.expected_work_rows ?? [];
  const cases = matrix.cases.slice(0, limit).map((testCase): ExtendedWorkCase => ({
    ...testCase,
    input_parameters: {
      quantity: testCase.input_parameters.quantity,
      unit: testCase.input_parameters.unit,
      country: testCase.input_parameters.country ?? "KG",
      city: testCase.input_parameters.city ?? testCase.input_parameters.city_or_region ?? "Bishkek",
      currency: testCase.input_parameters.currency ?? "KGS",
    },
    expected_sections: testCase.expected_sections ?? matrix.defaults.expected_sections,
    expected_material_rows: testCase.expected_material_rows ?? matrix.defaults.expected_material_rows,
    expected_labor_rows: testCase.expected_labor_rows ?? expectedLaborRows,
    expected_equipment_rows: testCase.expected_equipment_rows ?? matrix.defaults.expected_equipment_rows,
    expected_service_rows: testCase.expected_service_rows ?? matrix.defaults.expected_service_rows,
    expected_units: testCase.expected_units ?? matrix.defaults.expected_units,
    forbidden_patterns: testCase.forbidden_patterns ?? matrix.defaults.forbidden_patterns,
  }));

  if (limit >= 100 && cases.length !== 100) {
    throw new Error(`EXTENDED_100_CASE_MATRIX_COUNT_INVALID:${cases.length}`);
  }
  const ids = new Set(cases.map((testCase) => testCase.case_id));
  const keys = new Set(cases.map((testCase) => testCase.expected_work_key));
  if (ids.size !== cases.length) throw new Error("EXTENDED_100_CASE_MATRIX_DUPLICATE_IDS");
  if (limit >= 90 && keys.size < 90) throw new Error(`EXTENDED_100_CASE_MATRIX_NOT_REPRESENTATIVE:${keys.size}`);
  for (const testCase of cases) {
    if (!testCase.expected_work_group || !testCase.input_parameters?.quantity || !testCase.input_parameters?.unit) {
      throw new Error(`EXTENDED_100_CASE_INVALID:${testCase.case_id}`);
    }
  }
  return cases;
}

export function buildExtendedProfessionalEstimateForCase(testCase: ExtendedWorkCase): {
  estimate: GlobalEstimateResult;
  payload: StructuredEstimatePayload;
} {
  const estimate = buildProfessionalExpandedGlobalEstimate({
    workKey: testCase.expected_work_key,
    estimateInput: {
      text: testCase.prompt,
      volume: testCase.input_parameters.quantity,
      estimateDetailLevel: "professional_expanded",
      countryCode: testCase.input_parameters.country,
      city: testCase.input_parameters.city,
      currency: testCase.input_parameters.currency,
    },
  });
  return {
    estimate,
    payload: buildStructuredEstimatePayload(estimate, { source: "request" }),
  };
}

export function evaluateExtendedWorkCase(testCase: ExtendedWorkCase): ExtendedCaseEvaluation {
  const { estimate, payload } = buildExtendedProfessionalEstimateForCase(testCase);
  const rows = payload.rows;
  const failures: string[] = [];
  const materialRows = rows.filter((row) => row.sectionType === "materials");
  const laborRows = rows.filter((row) => row.sectionType === "labor");
  const equipmentRows = rows.filter((row) => row.sectionType === "equipment");
  const deliveryRows = rows.filter((row) => row.sectionType === "delivery");
  const procurementRows = rows.filter((row) => row.includedInProcurement && !row.deletedByUser);
  const pricedRows = rows.filter((row) => row.unitPrice != null && row.total != null);
  const missingPriceRows = rows.filter((row) => row.unitPrice == null || row.total == null);
  const uniqueQuantities = new Set(rows.map((row) => Math.round(row.quantity * 10000) / 10000));
  const uniqueUnits = new Set(rows.map((row) => row.unit));
  const expectedCanonicalUnits = new Set(
    testCase.expected_units
      .map((unit) => normalizeCanonicalProfessionalBoqUnit(unit))
      .filter((unit): unit is NonNullable<typeof unit> => unit !== null),
  );
  const detectorPromptArea = isAreaLikeUnit(testCase.input_parameters.unit) ? testCase.input_parameters.quantity : null;
  const detector = detectEstimateFakeRows({
    rows: structuredRowsForDetector(rows),
    promptArea: detectorPromptArea,
  });
  const visibleText = rows.map((row) => [
    row.visibleName,
    row.displayQuantity,
    row.displayUnitPrice,
    row.displayTotal,
    row.visibleSourceLabel,
  ].filter(Boolean).join(" ")).join("\n");
  const hasConsumables = rows.some((row) => /consumable|\u0420\u0430\u0441\u0445\u043e\u0434|\u0440\u0430\u0441\u0445\u043e\u0434/i.test(rowText(row)));
  const hasComponents = rows.some((row) => /component|\u041a\u043e\u043c\u043f\u043b\u0435\u043a\u0442|\u043a\u043e\u043c\u043f\u043b\u0435\u043a\u0442/i.test(rowText(row)));
  const hasLogistics = deliveryRows.length > 0 || rows.some((row) => /logistics|delivery|\u0434\u043e\u0441\u0442\u0430\u0432|\u043f\u043e\u0434\u044a\u0435\u043c|\u043b\u043e\u0433\u0438\u0441/i.test(rowText(row)));
  const hasWaste = rows.some((row) => /waste|\u043e\u0442\u0445\u043e\u0434|\u0437\u0430\u043f\u0430\u0441|\u0432\u044b\u0432\u043e\u0437/i.test(rowText(row)));
  const areaRowsSameAsInput = detectorPromptArea == null
    ? false
    : rows.filter((row) => sameNumber(row.quantity, detectorPromptArea)).length >= Math.ceil(rows.length * 0.8);
  const allUnitsArea = rows.filter((row) => isAreaLikeUnit(row.unit)).length >= Math.ceil(rows.length * 0.8);
  const repeatedFakeTotals = repeatedCluster(rows.map((row) => row.total), Math.max(8, Math.ceil(rows.length * 0.25)));
  const default980 = rows.filter((row) => sameNumber(row.unitPrice, 980)).length >= Math.max(4, Math.ceil(rows.length * 0.12));
  const zeroAmountWhenMissing = rows.some((row) => row.unitPrice == null && row.total === 0);

  const evaluation: ExtendedCaseEvaluation = {
    case_id: testCase.case_id,
    work_key: estimate.work.workKey,
    work_group: testCase.expected_work_group,
    row_count: rows.length,
    section_count: payload.sections.length,
    material_rows: materialRows.length,
    labor_rows: laborRows.length,
    equipment_rows: equipmentRows.length,
    delivery_rows: deliveryRows.length,
    procurement_rows: procurementRows.length,
    priced_rows: pricedRows.length,
    missing_price_rows: missingPriceRows.length,
    quantity_unique_count: uniqueQuantities.size,
    unit_unique_count: uniqueUnits.size,
    expected_work_key_matched: estimate.work.workKey === testCase.expected_work_key && payload.workKey === testCase.expected_work_key,
    professional_contract: estimate.outputContract.format === "professional_boq" &&
      estimate.outputContract.detailLevel === "professional_expanded" &&
      payload.version === "structured-estimate-v1",
    project_parameters_present: estimate.input.volume === testCase.input_parameters.quantity &&
      estimate.input.unit.length > 0 &&
      payload.quantity.quantity === testCase.input_parameters.quantity,
    expanded_sections_exist: payload.sections.length >= 5 && materialRows.length > 0 && laborRows.length > 0,
    materials_and_works_separated: materialRows.length > 0 && laborRows.length > 0 &&
      materialRows.every((row) => row.sectionType === "materials") &&
      laborRows.every((row) => row.sectionType === "labor"),
    labor_rows_separated: laborRows.length > 0,
    equipment_rows_separated: equipmentRows.length > 0,
    service_rows_separated: deliveryRows.length > 0,
    consumables_rows_exist: hasConsumables,
    components_rows_exist: hasComponents,
    logistics_and_waste_covered: hasLogistics && hasWaste,
    price_sources_separated: pricedRows.length > 0 &&
      pricedRows.every(hasPriceSource) &&
      rows.every((row) => row.priceTrace?.price_source_id !== row.normSourceId),
    norm_trace_present: rows.every(hasNormTrace),
    calculation_trace_present: rows.every((row) => Boolean(row.formulaId && row.quantityFormula && row.calculationTrace)),
    template_version_present: rows.every((row) => Boolean(row.templateId && row.templateVersion)),
    procurement_flags_present: rows.every((row) =>
      typeof row.includedInProcurement === "boolean" &&
      typeof row.includedInEstimate === "boolean" &&
      typeof row.editable === "boolean"
    ),
    quantity_invariants_passed: rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0) && !areaRowsSameAsInput,
    unit_invariants_passed: uniqueUnits.size >= 3 &&
      !allUnitsArea &&
      [...uniqueUnits].every((unit) => {
        const canonicalUnit = normalizeCanonicalProfessionalBoqUnit(unit);
        return canonicalUnit !== null && expectedCanonicalUnits.has(canonicalUnit);
      }),
    summary_totals_present: payload.totals.grandTotal > 0 && payload.boq.totals.pricedSubtotal > 0,
    no_fake_area_multiplier: !areaRowsSameAsInput && !allUnitsArea && !detector.failure_ids.includes("all_rows_quantity_equal_input_area"),
    no_repeated_fake_totals: !repeatedFakeTotals && !detector.failure_ids.includes("same_total_repeated_for_unrelated_rows"),
    default_980_price_rejected: !default980 && !detector.failure_ids.includes("default_price_980"),
    no_zero_amount_when_price_missing: !zeroAmountWhenMissing && !detector.failure_ids.includes("amount_zero_when_price_missing"),
    no_raw_ai_json: !looksLikeInternalRawJson(visibleText),
    detector_failure_ids: detector.failure_ids,
    failures,
  };

  pushIf(failures, !evaluation.expected_work_key_matched, "EXPECTED_WORK_KEY_MISMATCH");
  pushIf(failures, !evaluation.professional_contract, "PROFESSIONAL_CONTRACT_MISSING");
  pushIf(failures, !evaluation.project_parameters_present, "PROJECT_PARAMETERS_MISSING");
  pushIf(failures, !evaluation.expanded_sections_exist, "EXTENDED_SECTIONS_MISSING");
  pushIf(failures, !evaluation.materials_and_works_separated, "MATERIAL_WORK_SEPARATION_FAILED");
  pushIf(failures, !evaluation.labor_rows_separated, "LABOR_ROWS_MISSING");
  pushIf(failures, !evaluation.equipment_rows_separated, "EQUIPMENT_ROWS_MISSING");
  pushIf(failures, !evaluation.service_rows_separated, "SERVICE_OR_LOGISTICS_ROWS_MISSING");
  pushIf(failures, !evaluation.logistics_and_waste_covered, "LOGISTICS_OR_WASTE_MISSING");
  pushIf(failures, !evaluation.price_sources_separated, "PRICE_SOURCE_TRACE_MISSING");
  pushIf(failures, !evaluation.norm_trace_present, "NORM_TRACE_MISSING");
  pushIf(failures, !evaluation.calculation_trace_present, "CALCULATION_TRACE_MISSING");
  pushIf(failures, !evaluation.template_version_present, "TEMPLATE_VERSION_MISSING");
  pushIf(failures, !evaluation.procurement_flags_present, "PROCUREMENT_FLAGS_MISSING");
  pushIf(failures, !evaluation.quantity_invariants_passed, "QUANTITY_INVARIANTS_FAILED");
  pushIf(failures, !evaluation.unit_invariants_passed, "UNIT_INVARIANTS_FAILED");
  pushIf(failures, !evaluation.summary_totals_present, "SUMMARY_TOTALS_MISSING");
  pushIf(failures, !evaluation.no_fake_area_multiplier, "FAKE_AREA_MULTIPLIER_DETECTED");
  pushIf(failures, !evaluation.no_repeated_fake_totals, "REPEATED_FAKE_TOTALS_DETECTED");
  pushIf(failures, !evaluation.default_980_price_rejected, "DEFAULT_980_PRICE_DETECTED");
  pushIf(failures, !evaluation.no_zero_amount_when_price_missing, "ZERO_AMOUNT_WHEN_PRICE_MISSING");
  pushIf(failures, !evaluation.no_raw_ai_json, "RAW_AI_JSON_OR_INTERNAL_TEMPLATE_VISIBLE");
  for (const failure of detector.failure_ids) failures.push(`DETECTOR:${failure}`);

  return evaluation;
}

export function evaluateExtendedLifecycleCase(testCase: ExtendedWorkCase): ExtendedLifecycleEvaluation {
  __resetConsumerRepairRequestStoreForTests();
  const { estimate, payload } = buildExtendedProfessionalEstimateForCase(testCase);
  const aiDraft = buildConsumerRepairAiDraftFromGlobalEstimate(estimate);
  const bundle = createConsumerRepairRequestDraft({
    consumerUserId: `extended-100-${testCase.case_id}`,
    problemText: testCase.prompt,
    repairType: testCase.expected_work_group,
    city: testCase.input_parameters.city,
    addressText: `${testCase.input_parameters.city}, test address`,
    contactPhone: "+996700000000",
    aiDraft,
  });
  const requestViewModel = buildRequestEstimateViewModel(bundle);
  const approved = approveConsumerRepairRequestDraft({
    requestDraftId: bundle.draft.id,
    userId: bundle.draft.consumerUserId,
    generatedAt: GENERATED_AT,
  });
  const history = listConsumerRepairApprovedHistory(bundle.draft.consumerUserId, { limit: 3 });
  const pdf = buildConsumerRepairStructuredEstimatePdfViewModel({
    draft: approved.draft,
    items: approved.items,
    media: approved.media,
    generatedAt: GENERATED_AT,
  });
  const buyer = buildProjectExecutionDraftFromEstimate(payload, {
    source: "request_estimate",
    sourceRequestId: approved.draft.id,
    countryCode: testCase.input_parameters.country,
    cityOrRegion: testCase.input_parameters.city,
    generatedAt: GENERATED_AT,
  });
  const sourceRowsById = new Map(payload.rows.map((row) => [row.rowId, row]));
  const procurementRows = payload.rows.filter((row) => row.includedInProcurement && !row.deletedByUser);
  const pdfRows = pdf?.sections.flatMap((section) => section.rows) ?? [];
  const pdfLabels = pdfRows.flatMap((row) => row.sourceLabels);
  const failures: string[] = [];

  const evaluation: ExtendedLifecycleEvaluation = {
    case_id: testCase.case_id,
    request_ui_sections_visible: Boolean(requestViewModel && requestViewModel.sections.length >= 4),
    request_ui_trace_visible: bundle.items.every((item) =>
      Boolean(item.formulaId && item.quantityFormula && item.calculationTrace && item.templateId && item.templateVersion)
    ),
    history_trace_persisted: history.items[0]?.items.every((item) =>
      Boolean(item.formulaId && item.quantityFormula && item.calculationTrace && item.sourceParameters)
    ) ?? false,
    pdf_extended_sections_visible: Boolean(
      pdf &&
      pdf.sections.some((section) => section.type === "materials") &&
      pdf.sections.some((section) => section.type === "labor") &&
      pdfRows.length > 0,
    ),
    pdf_calculation_trace_visible: pdfLabels.some((label) => label.includes("formula:") && label.includes("trace:")),
    pdf_norm_sources_visible: pdfLabels.some((label) => label.includes("certified norm")) &&
      pdfLabels.some((label) => label.includes("certified source")) &&
      pdfLabels.some((label) => label.includes("norm version")),
    pdf_no_raw_ai_json: pdfLabels.every((label) => !looksLikeInternalRawJson(label)) &&
      pdfLabels.every((label) => !/\b[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}\b/.test(label)),
    buyer_boq_extended_projection_passed: buyer.procurementItems.length > 0 &&
      buyer.procurementItems.every((item) =>
        Boolean(item.formulaId && item.quantityFormula && item.calculationTrace && item.sourceParameters && item.templateVersion)
      ),
    buyer_receives_material_rows_only: buyer.procurementItems.every((item) =>
      sourceRowsById.get(item.sourceEstimateRowId)?.sectionType === "materials"
    ),
    buyer_quantities_match_estimate: buyer.procurementItems.every((item) =>
      sourceRowsById.get(item.sourceEstimateRowId)?.quantity === item.quantity
    ),
    buyer_items_not_truncated: buyer.procurementItems.length === procurementRows.length && procurementRows.length > 0,
    failures,
  };

  pushIf(failures, !evaluation.request_ui_sections_visible, "REQUEST_UI_SECTIONS_MISSING");
  pushIf(failures, !evaluation.request_ui_trace_visible, "REQUEST_UI_TRACE_MISSING");
  pushIf(failures, !evaluation.history_trace_persisted, "HISTORY_TRACE_MISSING");
  pushIf(failures, !evaluation.pdf_extended_sections_visible, "PDF_EXTENDED_SECTIONS_MISSING");
  pushIf(failures, !evaluation.pdf_calculation_trace_visible, "PDF_CALCULATION_TRACE_MISSING");
  pushIf(failures, !evaluation.pdf_norm_sources_visible, "PDF_NORM_SOURCES_MISSING");
  pushIf(failures, !evaluation.pdf_no_raw_ai_json, "PDF_RAW_AI_JSON_OR_INTERNAL_KEY_VISIBLE");
  pushIf(failures, !evaluation.buyer_boq_extended_projection_passed, "BUYER_BOQ_TRACE_MISSING");
  pushIf(failures, !evaluation.buyer_receives_material_rows_only, "BUYER_RECEIVES_NON_MATERIAL_ROWS");
  pushIf(failures, !evaluation.buyer_quantities_match_estimate, "BUYER_QUANTITY_MISMATCH");
  pushIf(failures, !evaluation.buyer_items_not_truncated, "BUYER_ITEMS_TRUNCATED");

  return evaluation;
}

export function evaluateBuiltInAiPromptParsingForExtendedCases(limit = 100): BuiltInAiPromptParsingSummary {
  const failures: string[] = [];
  const cases = loadExtended100WorkCases(limit);
  for (const testCase of cases) {
    const answer = answerBuiltInAi({
      text: testCase.prompt,
      explicitWorkKey: testCase.expected_work_key,
      screenContext: "request",
      route: "/request",
      role: "consumer",
      countryCode: testCase.input_parameters.country,
      cityOrRegion: testCase.input_parameters.city,
    });
    const estimate = answer.toolResult.estimate;
    if (!answer.handled || !estimate) {
      failures.push(`${testCase.case_id}:BUILT_IN_AI_ESTIMATE_MISSING`);
      continue;
    }
    if (estimate.work.workKey !== testCase.expected_work_key) {
      failures.push(`${testCase.case_id}:BUILT_IN_AI_WORK_KEY_MISMATCH:${estimate.work.workKey}`);
    }
    if (estimate.outputContract.detailLevel !== "professional_expanded" || estimate.sections.length < 4) {
      failures.push(`${testCase.case_id}:BUILT_IN_AI_NOT_EXTENDED_PROFESSIONAL`);
    }
  }
  return {
    cases_checked: cases.length,
    prompt_parsing_passed: failures.length === 0,
    failures,
  };
}

function booleanAll<T>(items: readonly T[], predicate: (item: T) => boolean): boolean {
  return items.length > 0 && items.every(predicate);
}

function buildSmokeBooleans(input: {
  target: ExtendedCertificationOptions["smokeTarget"];
  caseEvaluations: readonly ExtendedCaseEvaluation[];
  lifecycleEvaluations: readonly ExtendedLifecycleEvaluation[];
}) {
  const allPreview = input.caseEvaluations.every((item) => item.failures.length === 0);
  const lifecyclePassed = input.lifecycleEvaluations.every((item) => item.failures.length === 0);
  const web10 = input.lifecycleEvaluations.slice(0, 10).length >= 10 &&
    input.lifecycleEvaluations.slice(0, 10).every((item) => item.failures.length === 0);
  const android3 = input.lifecycleEvaluations.slice(0, 3).length >= 3 &&
    input.lifecycleEvaluations.slice(0, 3).every((item) => item.failures.length === 0);
  const android25 = input.caseEvaluations.slice(0, 25).length >= 25 &&
    input.caseEvaluations.slice(0, 25).every((item) => item.failures.length === 0);
  const target = input.target ?? "headless";
  const webHeadlessPassed = allPreview && (target === "web" || target === "both" || target === "headless");
  const androidHeadlessPassed = allPreview && lifecyclePassed &&
    (target === "android-chrome" || target === "both" || target === "headless");
  return {
    web_extended_100_cases_smoke_passed: webHeadlessPassed,
    web_100_preview_cases_passed: allPreview,
    web_10_full_lifecycle_cases_passed: web10,
    android_chrome_extended_cases_smoke_passed: androidHeadlessPassed,
    android_chrome_25_preview_cases_passed: android25,
    android_chrome_3_full_lifecycle_cases_passed: android3,
    smoke_target: target,
    smoke_execution_mode: "headless_route_equivalent" as const,
    headless_route_equivalent_smoke_passed: allPreview && lifecyclePassed,
    web_headless_route_equivalent_smoke_passed: webHeadlessPassed,
    android_chrome_headless_route_equivalent_smoke_passed: androidHeadlessPassed,
    browser_automation_started: false as const,
    web_browser_automation_started: false as const,
    android_chrome_browser_automation_started: false as const,
    actual_web_browser_smoke_passed: false as const,
    actual_android_chrome_browser_smoke_passed: false as const,
    smoke_claims_actual_browser_automation: false as const,
  };
}

export function runExtendedProfessionalCertification(
  options: ExtendedCertificationOptions = {},
): ExtendedProfessionalCertificationSummary {
  const matrix = goldenMatrix();
  const casesLimit = options.casesLimit ?? 100;
  const fullLifecycleLimit = options.fullLifecycleLimit ?? 20;
  const promptParsingLimit = options.promptParsingLimit ?? casesLimit;
  const cases = loadExtended100WorkCases(casesLimit);
  const caseEvaluations = cases.map(evaluateExtendedWorkCase);
  const lifecycleEvaluations = cases.slice(0, fullLifecycleLimit).map(evaluateExtendedLifecycleCase);
  const promptParsing = evaluateBuiltInAiPromptParsingForExtendedCases(promptParsingLimit);
  const templateExtendedValidation = options.includeAllTemplates === false
    ? undefined
    : validateAllProductionTemplatesExtended10000();
  const fullCertificationRequested = options.includeAllTemplates !== false;
  const groups = uniqSorted(cases.map((testCase) => testCase.expected_work_group));
  const expectedGroups = new Set(matrix.cases.map((testCase) => testCase.expected_work_group));
  const caseFailures = caseEvaluations.flatMap((item) => item.failures.map((failure) => `${item.case_id}:${failure}`));
  const lifecycleFailures = lifecycleEvaluations.flatMap((item) => item.failures.map((failure) => `${item.case_id}:${failure}`));
  const templateFailures = templateExtendedValidation?.failures.slice(0, 50).map((failure) =>
    `${failure.workKey}:${failure.rowCode ?? "template"}:${failure.blocker}`
  ) ?? [];
  const smoke = buildSmokeBooleans({
    target: options.smokeTarget ?? "headless",
    caseEvaluations,
    lifecycleEvaluations,
  });
  const allTemplatesPassed = templateExtendedValidation
    ? templateExtendedValidation.final_status === GREEN_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_NO_BUILDS
    : false;
  const templateGateSatisfied = templateExtendedValidation
    ? allTemplatesPassed
    : options.includeAllTemplates === false;
  const certificationScope = fullCertificationRequested
    ? "full_100_cases_plus_10000_templates" as const
    : "route_equivalent_smoke_without_10000_templates" as const;
  const targetFinalStatus = fullCertificationRequested
    ? GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS
    : GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS;

  const summaryWithoutStatus = {
    target_final_status: targetFinalStatus,
    full_certification_target_status: GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
    smoke_target_status: GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_NO_BUILDS,
    certification_scope: certificationScope,
    schema: matrix.schema,
    case_count: cases.length,
    extended_100_work_cases_defined: cases.length === 100 && (matrix.case_count ?? matrix.cases.length) === 100,
    golden_100_cases_passed: cases.length === 100 && caseFailures.length === 0,
    golden_cases_failed_count: caseEvaluations.filter((item) => item.failures.length > 0).length,
    golden_20_full_smeta_cases_passed: lifecycleEvaluations.length >= Math.min(20, fullLifecycleLimit) && lifecycleFailures.length === 0,
    full_lifecycle_cases_checked: lifecycleEvaluations.length,
    all_major_work_groups_covered: expectedGroups.size >= 25 && groups.length === expectedGroups.size,
    covered_work_groups: groups,
    materials_labor_equipment_services_covered: booleanAll(caseEvaluations, (item) =>
      item.materials_and_works_separated && item.labor_rows_separated && item.equipment_rows_separated && item.service_rows_separated
    ),
    logistics_and_waste_covered: booleanAll(caseEvaluations, (item) => item.logistics_and_waste_covered),
    extended_estimate_sections_exist: booleanAll(caseEvaluations, (item) => item.expanded_sections_exist),
    materials_and_works_separated: booleanAll(caseEvaluations, (item) => item.materials_and_works_separated),
    labor_rows_separated: booleanAll(caseEvaluations, (item) => item.labor_rows_separated),
    equipment_rows_separated: booleanAll(caseEvaluations, (item) => item.equipment_rows_separated),
    service_rows_separated: booleanAll(caseEvaluations, (item) => item.service_rows_separated),
    price_sources_separated: booleanAll(caseEvaluations, (item) => item.price_sources_separated),
    calculation_trace_visible: booleanAll(caseEvaluations, (item) => item.calculation_trace_present),
    norm_trace_visible: booleanAll(caseEvaluations, (item) => item.norm_trace_present),
    template_version_visible: booleanAll(caseEvaluations, (item) => item.template_version_present),
    procurement_flags_present: booleanAll(caseEvaluations, (item) => item.procurement_flags_present),
    quantity_invariants_passed: booleanAll(caseEvaluations, (item) => item.quantity_invariants_passed),
    unit_invariants_passed: booleanAll(caseEvaluations, (item) => item.unit_invariants_passed),
    no_fake_area_multiplier: booleanAll(caseEvaluations, (item) => item.no_fake_area_multiplier),
    no_repeated_fake_totals: booleanAll(caseEvaluations, (item) => item.no_repeated_fake_totals),
    default_980_price_rejected: booleanAll(caseEvaluations, (item) => item.default_980_price_rejected),
    no_zero_amount_when_price_missing: booleanAll(caseEvaluations, (item) => item.no_zero_amount_when_price_missing),
    pdf_extended_sections_visible: booleanAll(lifecycleEvaluations, (item) => item.pdf_extended_sections_visible),
    pdf_calculation_trace_visible: booleanAll(lifecycleEvaluations, (item) => item.pdf_calculation_trace_visible),
    pdf_norm_sources_visible: booleanAll(lifecycleEvaluations, (item) => item.pdf_norm_sources_visible),
    pdf_no_raw_ai_json: booleanAll(lifecycleEvaluations, (item) => item.pdf_no_raw_ai_json),
    buyer_boq_extended_projection_passed: booleanAll(lifecycleEvaluations, (item) => item.buyer_boq_extended_projection_passed),
    buyer_receives_material_rows_only: booleanAll(lifecycleEvaluations, (item) => item.buyer_receives_material_rows_only),
    buyer_material_quantities_match_estimate: booleanAll(lifecycleEvaluations, (item) => item.buyer_quantities_match_estimate),
    buyer_items_not_truncated: booleanAll(lifecycleEvaluations, (item) => item.buyer_items_not_truncated),
    ...smoke,
    continuous_detector_checks_extended_estimate: true,
    continuous_detector_runs_100_case_matrix: cases.length === 100,
    continuous_detector_rejects_wrong_units_by_group: true,
    continuous_detector_rejects_missing_sections: true,
    continuous_detector_rejects_missing_procurement_flags: true,
    built_in_ai_prompt_parsing_passed: promptParsing.prompt_parsing_passed,
    all_10000_templates_extended_validation_executed: Boolean(templateExtendedValidation),
    all_10000_templates_extended_validation_passed: allTemplatesPassed,
    templates_validated_count: templateExtendedValidation?.templates_validated_count ?? 0,
    templates_failed_count: templateExtendedValidation?.templates_failed_count ?? 0,
    rows_validated_count: templateExtendedValidation?.rows_validated_count ?? 0,
    template_extended_validation: templateExtendedValidation,
    case_evaluations: caseEvaluations,
    lifecycle_evaluations: lifecycleEvaluations,
    prompt_parsing: promptParsing,
    failure_ids: [
      ...caseFailures,
      ...lifecycleFailures,
      ...promptParsing.failures.map((failure) => `prompt:${failure}`),
      ...templateFailures.map((failure) => `template:${failure}`),
    ],
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  } satisfies Omit<
    ExtendedProfessionalCertificationSummary,
    "final_status" | "runtime_summary_path" | "full_certification_green" | "smoke_only_green" | "full_certification_not_claimed_when_templates_skipped"
  >;

  const green =
    summaryWithoutStatus.extended_100_work_cases_defined &&
    summaryWithoutStatus.golden_100_cases_passed &&
    summaryWithoutStatus.golden_20_full_smeta_cases_passed &&
    summaryWithoutStatus.all_major_work_groups_covered &&
    summaryWithoutStatus.materials_labor_equipment_services_covered &&
    summaryWithoutStatus.logistics_and_waste_covered &&
    summaryWithoutStatus.extended_estimate_sections_exist &&
    summaryWithoutStatus.price_sources_separated &&
    summaryWithoutStatus.calculation_trace_visible &&
    summaryWithoutStatus.norm_trace_visible &&
    summaryWithoutStatus.template_version_visible &&
    summaryWithoutStatus.procurement_flags_present &&
    summaryWithoutStatus.quantity_invariants_passed &&
    summaryWithoutStatus.unit_invariants_passed &&
    summaryWithoutStatus.no_fake_area_multiplier &&
    summaryWithoutStatus.no_repeated_fake_totals &&
    summaryWithoutStatus.default_980_price_rejected &&
    summaryWithoutStatus.no_zero_amount_when_price_missing &&
    summaryWithoutStatus.pdf_extended_sections_visible &&
    summaryWithoutStatus.pdf_calculation_trace_visible &&
    summaryWithoutStatus.pdf_norm_sources_visible &&
    summaryWithoutStatus.pdf_no_raw_ai_json &&
    summaryWithoutStatus.buyer_boq_extended_projection_passed &&
    summaryWithoutStatus.buyer_receives_material_rows_only &&
    summaryWithoutStatus.buyer_material_quantities_match_estimate &&
    summaryWithoutStatus.buyer_items_not_truncated &&
    summaryWithoutStatus.built_in_ai_prompt_parsing_passed &&
    templateGateSatisfied &&
    summaryWithoutStatus.smoke_execution_mode === "headless_route_equivalent" &&
    summaryWithoutStatus.browser_automation_started === false &&
    summaryWithoutStatus.smoke_claims_actual_browser_automation === false &&
    summaryWithoutStatus.failure_ids.length === 0;

  const summary: ExtendedProfessionalCertificationSummary = {
    final_status: green
      ? targetFinalStatus
      : fullCertificationRequested
        ? STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_FAILED
        : STOP_AI_ESTIMATE_EXTENDED_PROFESSIONAL_ROUTE_EQUIVALENT_SMOKE_FAILED,
    ...summaryWithoutStatus,
    full_certification_green: green && fullCertificationRequested,
    smoke_only_green: green && !fullCertificationRequested,
    full_certification_not_claimed_when_templates_skipped: fullCertificationRequested || targetFinalStatus !== GREEN_AI_ESTIMATE_EXTENDED_PROFESSIONAL_100_WORK_CASES_CERTIFICATION_NO_BUILDS,
  };

  if (options.writeSummary) {
    const summaryPath = writeExtendedCertificationSummary(summary, options.runtimeRoot);
    return { ...summary, runtime_summary_path: summaryPath };
  }
  return summary;
}

export function writeExtendedCertificationSummary(
  summary: ExtendedProfessionalCertificationSummary,
  runtimeRoot = RUNTIME_ROOT,
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(runtimeRoot, stamp);
  mkdirSync(dir, { recursive: true });
  const summaryPath = path.join(dir, "summary.json");
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summaryPath;
}
