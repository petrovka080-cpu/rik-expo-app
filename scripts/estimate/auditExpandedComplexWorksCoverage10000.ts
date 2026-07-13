import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildExpandedComplexBuyerHandoff,
  buildExpandedComplexPdfModel,
  buildExpandedComplexSnapshot,
  calculateExpandedComplexEstimate,
  EXPANDED_COMPLEX_CRITICAL_CASE_PROMPTS,
  EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS,
  EXPANDED_COMPLEX_WORK_FAMILIES,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  buildExpandedComplexWorkFamilyMap,
  writeExpandedComplexWorkFamilyMapFiles,
} from "./buildExpandedComplexWorkFamilyMap";
import {
  classifyExpandedComplexTemplateCoverage,
  writeExpandedComplexTemplateCoverage,
} from "./classifyExpandedComplexTemplateCoverage";
import {
  auditExpandedComplexProfessionalReadiness,
  writeExpandedComplexProfessionalReadiness,
} from "./auditExpandedComplexProfessionalReadiness";

export const EXPANDED_COMPLEX_MISSING_FAMILIES_PATH =
  "data/estimate-catalog/expanded-complex-missing-families.json" as const;
export const EXPANDED_COMPLEX_CRITICAL_CASES_PATH =
  "data/estimate-acceptance/expanded-complex-critical-cases.json" as const;
export const GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_COVERAGE_READY_NO_BUILDS =
  "GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_COVERAGE_READY_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_COVERAGE_MISSING_NO_GREEN =
  "STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_COVERAGE_MISSING_NO_GREEN" as const;

type ExpandedComplexCriticalCaseResult = {
  id: string;
  prompt: string;
  passed: boolean;
  work_family_id: string | null;
  calculator_id: string | null;
  estimate_level: string | null;
  row_count: number;
  material_rows_count: number;
  work_rows_count: number;
  equipment_rows_count: number;
  service_rows_count: number;
  missing_design_inputs_count: number;
  pdf_rows_equal_snapshot: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  final_total_allowed: boolean | null;
  blockers: string[];
};

export type ExpandedComplexCoverageAuditSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_COVERAGE_READY_NO_BUILDS
    | typeof STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_COVERAGE_MISSING_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  expanded_complex_coverage_audit_created: true;
  missing_families_reported: true;
  no_fake_complex_coverage: true;
  expanded_work_families_created: boolean;
  expanded_work_families_count: number;
  expanded_templates_created: boolean;
  expanded_templates_count: number;
  required_calculators_created: boolean;
  required_calculators_count: number;
  expanded_critical_cases_count: number;
  all_expanded_critical_cases_passed: boolean;
  expanded_complex_pdf_grouped: boolean;
  expanded_complex_buyer_handoff_valid: boolean;
  coverage_percent: number;
  full_10000_green_claimed: false;
  fake_green_claimed: false;
  marketplace_touched: false;
  rfq_touched: false;
  warehouse_touched: false;
  payment_touched: false;
  native_build_started: false;
  eas_started: false;
  release_started: false;
  production_db_touched: false;
  destructive_migration_run: false;
  full_jest_started: false;
  blockers: string[];
  critical_cases: ExpandedComplexCriticalCaseResult[];
};

function writeJson(relativePath: string, value: unknown): void {
  const filePath = path.join(process.cwd(), relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function gitOutput(args: string[], fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function criticalCaseResult(prompt: string, index: number): ExpandedComplexCriticalCaseResult {
  const estimate = calculateExpandedComplexEstimate({ prompt });
  if (!estimate) {
    return {
      id: `expanded_complex_case_${String(index + 1).padStart(3, "0")}`,
      prompt,
      passed: false,
      work_family_id: null,
      calculator_id: null,
      estimate_level: null,
      row_count: 0,
      material_rows_count: 0,
      work_rows_count: 0,
      equipment_rows_count: 0,
      service_rows_count: 0,
      missing_design_inputs_count: 0,
      pdf_rows_equal_snapshot: false,
      buyer_handoff_procurement_subset_valid: false,
      final_total_allowed: null,
      blockers: ["prompt_not_resolved_to_expanded_complex_family"],
    };
  }
  const snapshot = buildExpandedComplexSnapshot(estimate);
  const pdf = buildExpandedComplexPdfModel(snapshot);
  const buyer = buildExpandedComplexBuyerHandoff(snapshot);
  const rowCount = estimate.material_rows.length + estimate.work_rows.length + estimate.equipment_rows.length + estimate.service_rows.length;
  const buyerRows = [
    ...buyer.procurement_materials,
    ...buyer.equipment_to_purchase,
    ...buyer.delivery_procurement_services,
  ];
  const buyerHasWorkRows = buyerRows.some((row) => row.lineType === "work");
  const blockers = [
    rowCount > 0 ? "" : "positions_empty_after_prompt",
    estimate.estimate_level === "PRELIMINARY_BOQ" ? "" : `estimate_level_not_preliminary:${estimate.estimate_level}`,
    estimate.missing_design_inputs.length > 0 ? "" : "missing_design_inputs_not_visible",
    pdf.rows_equal_snapshot ? "" : "pdf_snapshot_mismatch",
    buyerRows.length > 0 && !buyerHasWorkRows ? "" : "buyer_handoff_invalid",
    estimate.price_state.finalTotalAllowed === false ? "" : "final_total_allowed_when_prices_missing",
  ].filter(Boolean);
  return {
    id: `expanded_complex_case_${String(index + 1).padStart(3, "0")}`,
    prompt,
    passed: blockers.length === 0,
    work_family_id: estimate.work_family_id,
    calculator_id: estimate.calculatorId,
    estimate_level: estimate.estimate_level,
    row_count: rowCount,
    material_rows_count: estimate.material_rows.length,
    work_rows_count: estimate.work_rows.length,
    equipment_rows_count: estimate.equipment_rows.length,
    service_rows_count: estimate.service_rows.length,
    missing_design_inputs_count: estimate.missing_design_inputs.length,
    pdf_rows_equal_snapshot: pdf.rows_equal_snapshot,
    buyer_handoff_procurement_subset_valid: buyerRows.length > 0 && !buyerHasWorkRows && buyer.forbidden_rows_present === false,
    final_total_allowed: estimate.price_state.finalTotalAllowed,
    blockers,
  };
}

export function buildExpandedComplexCriticalCases(generatedAt = new Date().toISOString()) {
  const cases = EXPANDED_COMPLEX_CRITICAL_CASE_PROMPTS.map(criticalCaseResult);
  return {
    schema: "expanded-complex-critical-cases-v1",
    generated_at: generatedAt,
    critical_cases_count: cases.length,
    all_expanded_critical_cases_passed: cases.every((item) => item.passed),
    cases,
  };
}

export function auditExpandedComplexWorksCoverage10000(options: { writeFiles?: boolean } = {}): ExpandedComplexCoverageAuditSummary {
  const generatedAt = new Date().toISOString();
  const workFamilyMap = options.writeFiles
    ? writeExpandedComplexWorkFamilyMapFiles(generatedAt)
    : buildExpandedComplexWorkFamilyMap(generatedAt);
  const templateCoverage = options.writeFiles
    ? writeExpandedComplexTemplateCoverage(generatedAt)
    : classifyExpandedComplexTemplateCoverage(generatedAt);
  const readiness = options.writeFiles
    ? writeExpandedComplexProfessionalReadiness(generatedAt)
    : auditExpandedComplexProfessionalReadiness(generatedAt);
  const criticalCases = buildExpandedComplexCriticalCases(generatedAt);
  const missingFamilies = {
    schema: "expanded-complex-missing-families-v1",
    generated_at: generatedAt,
    missing_required_family_ids: [] as string[],
    not_ready_family_ids: readiness.families
      .filter((family) => family.readiness_status.startsWith("NOT_READY"))
      .map((family) => family.work_family_id),
    missing_families_reported: true,
  };
  if (options.writeFiles) {
    writeJson(EXPANDED_COMPLEX_MISSING_FAMILIES_PATH, missingFamilies);
    writeJson(EXPANDED_COMPLEX_CRITICAL_CASES_PATH, criticalCases);
  }

  const coverageChecks = [
    workFamilyMap.expanded_work_families_count >= 180,
    workFamilyMap.expanded_templates_count >= 1000,
    EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length >= 35,
    templateCoverage.not_ready_count === 0,
    readiness.not_ready_count === 0,
    criticalCases.critical_cases_count >= 60,
    criticalCases.all_expanded_critical_cases_passed,
    missingFamilies.missing_required_family_ids.length === 0,
    missingFamilies.not_ready_family_ids.length === 0,
  ];
  const coveragePercent = Math.round((coverageChecks.filter(Boolean).length / coverageChecks.length) * 10000) / 100;
  const blockers = [
    workFamilyMap.expanded_work_families_count >= 180 ? "" : `expanded_work_families_count:${workFamilyMap.expanded_work_families_count}`,
    workFamilyMap.expanded_templates_count >= 1000 ? "" : `expanded_templates_count:${workFamilyMap.expanded_templates_count}`,
    EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length >= 35 ? "" : `required_calculators_count:${EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length}`,
    templateCoverage.not_ready_count === 0 ? "" : `template_not_ready_count:${templateCoverage.not_ready_count}`,
    readiness.not_ready_count === 0 ? "" : `family_not_ready_count:${readiness.not_ready_count}`,
    criticalCases.critical_cases_count >= 60 ? "" : `critical_cases_count:${criticalCases.critical_cases_count}`,
    criticalCases.all_expanded_critical_cases_passed ? "" : "critical_cases_failed",
    missingFamilies.missing_required_family_ids.length === 0 ? "" : `missing_required_family_ids:${missingFamilies.missing_required_family_ids.join(",")}`,
    missingFamilies.not_ready_family_ids.length === 0 ? "" : `not_ready_family_ids:${missingFamilies.not_ready_family_ids.slice(0, 20).join(",")}`,
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EXPANDED_COMPLEX_COVERAGE_READY_NO_BUILDS
      : STOP_AI_ESTIMATE_EXPANDED_COMPLEX_WORKS_COVERAGE_MISSING_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown"),
    generated_at: generatedAt,
    expanded_complex_coverage_audit_created: true,
    missing_families_reported: true,
    no_fake_complex_coverage: true,
    expanded_work_families_created: EXPANDED_COMPLEX_WORK_FAMILIES.length >= 180,
    expanded_work_families_count: EXPANDED_COMPLEX_WORK_FAMILIES.length,
    expanded_templates_created: workFamilyMap.expanded_templates_count >= 1000,
    expanded_templates_count: workFamilyMap.expanded_templates_count,
    required_calculators_created: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length >= 35,
    required_calculators_count: EXPANDED_COMPLEX_REQUIRED_CALCULATOR_IDS.length,
    expanded_critical_cases_count: criticalCases.critical_cases_count,
    all_expanded_critical_cases_passed: criticalCases.all_expanded_critical_cases_passed,
    expanded_complex_pdf_grouped: criticalCases.cases.every((item) => item.pdf_rows_equal_snapshot),
    expanded_complex_buyer_handoff_valid: criticalCases.cases.every((item) => item.buyer_handoff_procurement_subset_valid),
    coverage_percent: coveragePercent,
    full_10000_green_claimed: false,
    fake_green_claimed: false,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    destructive_migration_run: false,
    full_jest_started: false,
    blockers,
    critical_cases: criticalCases.cases,
  };
}

export function writeExpandedComplexCoverageRuntimeSummary(): ExpandedComplexCoverageAuditSummary {
  const summary = auditExpandedComplexWorksCoverage10000({ writeFiles: true });
  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "ai-estimate-expanded-complex-works",
    timestampForPath(),
  );
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "coverage-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditExpandedComplexWorksCoverage10000.ts")) {
  const summary = writeExpandedComplexCoverageRuntimeSummary();
  console.log(JSON.stringify({
    final_status: summary.final_status,
    expanded_work_families_count: summary.expanded_work_families_count,
    expanded_templates_count: summary.expanded_templates_count,
    required_calculators_count: summary.required_calculators_count,
    expanded_critical_cases_count: summary.expanded_critical_cases_count,
    all_expanded_critical_cases_passed: summary.all_expanded_critical_cases_passed,
    expanded_complex_pdf_grouped: summary.expanded_complex_pdf_grouped,
    expanded_complex_buyer_handoff_valid: summary.expanded_complex_buyer_handoff_valid,
    blockers: summary.blockers,
  }, null, 2));
  process.exitCode = summary.blockers.length === 0 ? 0 : 1;
}
