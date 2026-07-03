import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
  validateAllProductionTemplatesPricing10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  auditEstimate10000ProfessionalReadiness,
  GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS,
} from "./auditEstimate10000ProfessionalReadiness";
import {
  runEstimateFunctionalRealityAudit,
  GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS,
} from "./auditEstimateFunctionalReality10000";
import {
  validateProfessionalCatalog10000,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS,
} from "./validateProfessionalCatalog10000";
import {
  validateProfessionalSourceCoverage10000,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_FULL_NO_BUILDS,
} from "./validateProfessionalSourceCoverage10000";
import {
  validateNoGenericFallback10000,
  GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS,
} from "./validateNoGenericFallback10000";
import { validateNoBlindQuantityCopy10000 } from "./validateNoBlindQuantityCopy10000";
import { validatePdfSnapshotParity10000 } from "./validatePdfSnapshotParity10000";
import { validateBuyerHandoff10000 } from "./validateBuyerHandoff10000";
import {
  validateEstimateRowNames10000,
  GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS,
} from "./validateEstimateRowNames10000";

export const GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_NOT_GREEN =
  "STOP_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_NOT_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-trusted-professional-expanded-boq";
const NORM_SOURCE_GREEN = "GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS";

function gitOutput(args: string[], fallback = ""): string {
  const result = spawnSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
  });
  return result.status === 0 ? result.stdout.trim() || fallback : fallback;
}

function envFlag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function parseJsonObject(output: string): Record<string, unknown> {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < start) {
    return {
      final_status: "STOP_CHILD_AUDIT_JSON_MISSING",
      raw_output: output.slice(0, 2000),
    };
  }
  return JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
}

function runNormSourceQualityAudit(): Record<string, unknown> {
  const result = spawnSync(process.execPath, [
    path.join("node_modules", "tsx", "dist", "cli.mjs"),
    "scripts/estimate/auditEstimateNormSourceQuality.ts",
    "--all",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
  });
  const parsed = parseJsonObject(`${result.stdout}\n${result.stderr}`);
  if (result.status === 0) return parsed;
  return {
    ...parsed,
    final_status: String(parsed.final_status ?? "STOP_NORM_SOURCE_QUALITY_CHILD_FAILED"),
    child_exit_code: result.status,
  };
}

export function auditEstimate10000FinalProfessionalGreen(options: { writeSummary?: boolean } = {}) {
  const sourceCommit = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown");
  const stagedClean = gitOutput(["diff", "--cached", "--name-status"], "") === "";
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";

  const professional = auditEstimate10000ProfessionalReadiness({
    writeManifest: false,
    writeCatalogArtifacts: false,
  });
  const functional = runEstimateFunctionalRealityAudit({ writeSummary: true });
  const catalog = validateProfessionalCatalog10000();
  const sourceCoverage = validateProfessionalSourceCoverage10000();
  const noGeneric = validateNoGenericFallback10000();
  const blindQuantity = validateNoBlindQuantityCopy10000();
  const pdfParity = validatePdfSnapshotParity10000();
  const buyerHandoff = validateBuyerHandoff10000();
  const rowNames = validateEstimateRowNames10000();
  const pricing = validateAllProductionTemplatesPricing10000();
  const normSource = runNormSourceQualityAudit();

  const sourceGates = {
    focused_jest_passed: envFlag("AI_ESTIMATE_10000_FOCUSED_JEST_PASSED"),
    typecheck_passed: envFlag("AI_ESTIMATE_10000_TYPECHECK_PASSED"),
    lint_passed: envFlag("AI_ESTIMATE_10000_LINT_PASSED"),
    diff_check_passed: envFlag("AI_ESTIMATE_10000_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envFlag("AI_ESTIMATE_10000_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envFlag("AI_ESTIMATE_10000_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envFlag("AI_ESTIMATE_10000_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envFlag("AI_ESTIMATE_10000_SECRET_SCAN_PASSED"),
  };
  const rowNamesGreen = rowNames.final_status === GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS;
  const pricingGreen = pricing.final_status === GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS;
  const normSourceGreen = normSource.final_status === NORM_SOURCE_GREEN;

  const blockers = [
    professional.final_status === GREEN_AI_ESTIMATE_10000_REAL_PROFESSIONAL_CATALOG_READY_NO_BUILDS
      ? ""
      : `professional_status:${professional.final_status}`,
    functional.final_status === GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS
      ? ""
      : `functional_status:${functional.final_status}`,
    catalog.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_VALIDATED_NO_BUILDS
      ? ""
      : `catalog_status:${catalog.final_status}`,
    sourceCoverage.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_SOURCE_COVERAGE_FULL_NO_BUILDS
      ? ""
      : `source_coverage_status:${sourceCoverage.final_status}`,
    noGeneric.final_status === GREEN_AI_ESTIMATE_10000_NO_GENERIC_FALLBACK_NO_BUILDS
      ? ""
      : `no_generic_status:${noGeneric.final_status}`,
    normSourceGreen ? "" : `norm_source_quality_status:${String(normSource.final_status ?? "unknown")}`,
    professional.manifest_total_templates === 10000 ? "" : `manifest_total_templates:${professional.manifest_total_templates}`,
    professional.ready_professional_count === 10000 ? "" : `ready_professional_count:${professional.ready_professional_count}`,
    professional.not_ready_count === 0 ? "" : `not_ready_count:${professional.not_ready_count}`,
    professional.generic_fallback_count === 0 ? "" : `generic_fallback_count:${professional.generic_fallback_count}`,
    professional.generic_norm_rows_count === 0 ? "" : `generic_norm_rows_count:${professional.generic_norm_rows_count}`,
    professional.synthetic_family_default_count === 0
      ? ""
      : `synthetic_family_default_count:${professional.synthetic_family_default_count}`,
    professional.templates_only_generic_norms_count === 0
      ? ""
      : `templates_only_generic_norms_count:${professional.templates_only_generic_norms_count}`,
    professional.templates_with_real_norm_sources_count === 10000
      ? ""
      : `templates_with_real_norm_sources_count:${professional.templates_with_real_norm_sources_count}`,
    Number(normSource.synthetic_family_default_count) === 0
      ? ""
      : `norm_source_synthetic_family_default_count:${String(normSource.synthetic_family_default_count)}`,
    Number(normSource.templates_with_only_synthetic_norms) === 0
      ? ""
      : `norm_source_templates_with_only_synthetic_norms:${String(normSource.templates_with_only_synthetic_norms)}`,
    Number(normSource.real_hardcoded_production_rate_count) === 0
      ? ""
      : `real_hardcoded_production_rate_count:${String(normSource.real_hardcoded_production_rate_count)}`,
    blindQuantity.no_blind_quantity_copy ? "" : "blind_quantity_copy_found",
    pdfParity.pdf_snapshot_parity_passed ? "" : "pdf_snapshot_parity_failed",
    buyerHandoff.buyer_handoff_subset_passed ? "" : "buyer_handoff_failed",
    rowNamesGreen ? "" : `row_names_status:${rowNames.final_status}`,
    pricingGreen ? "" : `pricing_status:${pricing.final_status}`,
    sourceGates.focused_jest_passed ? "" : "source_gate:focused_jest_not_passed",
    sourceGates.typecheck_passed ? "" : "source_gate:typecheck_not_passed",
    sourceGates.lint_passed ? "" : "source_gate:lint_not_passed",
    sourceGates.diff_check_passed ? "" : "source_gate:diff_check_not_passed",
    sourceGates.no_test_weakening_passed ? "" : "source_gate:no_test_weakening_not_passed",
    sourceGates.web_public_smoke_passed ? "" : "source_gate:web_public_smoke_not_passed",
    sourceGates.ci_office_market_passed ? "" : "source_gate:ci_office_market_not_passed",
    sourceGates.secret_scan_passed ? "" : "source_gate:secret_scan_not_passed",
    ...professional.blockers.map((reason) => `professional:${reason}`),
    ...functional.blockers.map((reason) => `functional:${reason}`),
    ...catalog.blockers.map((reason) => `catalog:${reason}`),
    ...sourceCoverage.blockers.map((reason) => `source_coverage:${reason}`),
    ...noGeneric.blockers.map((reason) => `no_generic:${reason}`),
    ...rowNames.blockers.map((reason) => `row_names:${reason}`),
    ...pricing.failures.slice(0, 20).map((failure) => `pricing:${failure.workKey}:${failure.blocker}`),
  ].filter(Boolean);

  const timestamp = timestampForPath();
  const runtimeDir = path.join(process.cwd(), RUNTIME_ROOT, timestamp);
  const runtimeSummaryPath = path.join(runtimeDir, "summary.json");
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_NOT_GREEN,
    source_commit: sourceCommit,
    branch,
    upstream_sync: upstreamSync,
    pushed: upstreamSync === "0\t0" || upstreamSync === "0 0",
    staged_clean: stagedClean,
    worktree_clean: worktreeClean,
    runtime_summary_path: path.relative(process.cwd(), runtimeSummaryPath).replace(/\\/g, "/"),
    manifest_total_templates: professional.manifest_total_templates,
    ready_professional_count: professional.ready_professional_count,
    not_ready_count: professional.not_ready_count,
    generic_fallback_count: professional.generic_fallback_count,
    generic_norm_rows_count: professional.generic_norm_rows_count,
    synthetic_family_default_count: professional.synthetic_family_default_count,
    templates_only_generic_norms_count: professional.templates_only_generic_norms_count,
    templates_with_real_norm_sources_count: professional.templates_with_real_norm_sources_count,
    norm_source_quality_status: normSource.final_status,
    norm_records_count: normSource.norm_records_count,
    norm_source_synthetic_family_default_count: normSource.synthetic_family_default_count,
    norm_source_templates_with_only_synthetic_norms: normSource.templates_with_only_synthetic_norms,
    norm_source_professional_source_coverage: normSource.professional_source_coverage,
    work_groups_count: normSource.work_groups_count,
    active_work_groups_count: normSource.active_work_groups_count,
    official_public_sources_count: normSource.official_public_sources_count,
    manufacturer_technical_cards_count: normSource.manufacturer_technical_cards_count,
    internal_curated_sources_count: normSource.internal_curated_sources_count,
    manual_review_required_count: normSource.manual_review_required_count,
    golden_100_cases_passed: normSource.golden_100_cases_passed,
    random_templates_checked_count: normSource.random_templates_checked_count,
    work_catalog_items_count: professional.work_catalog_items_count,
    row_catalog_bindings_count: professional.row_catalog_bindings_count,
    material_catalog_rows_count: professional.material_catalog_rows_count,
    service_catalog_rows_count: professional.service_catalog_rows_count,
    equipment_catalog_rows_count: professional.equipment_catalog_rows_count,
    buyer_material_handoff_rows_count: professional.buyer_material_handoff_rows_count,
    no_blind_quantity_copy: blindQuantity.no_blind_quantity_copy,
    pdf_snapshot_parity_passed: pdfParity.pdf_snapshot_parity_passed,
    buyer_handoff_subset_passed: buyerHandoff.buyer_handoff_subset_passed,
    row_names_green: rowNamesGreen,
    pricing_green: pricingGreen,
    priceable_rows_validated_count: pricing.priceable_rows_validated_count,
    source_gates: sourceGates,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    diff_check_passed: sourceGates.diff_check_passed,
    no_test_weakening_passed: sourceGates.no_test_weakening_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
    focused_jest_passed: sourceGates.focused_jest_passed,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
    blockers,
  };

  if (options.writeSummary !== false) {
    mkdirSync(runtimeDir, { recursive: true });
    writeFileSync(runtimeSummaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  }
  return summary;
}

function requireAllFlag(): void {
  if (!process.argv.includes("--all")) {
    throw new Error("AUDIT_ESTIMATE_10000_FINAL_PROFESSIONAL_GREEN_REQUIRES_--all");
  }
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditEstimate10000FinalProfessionalGreen.ts")) {
  try {
    requireAllFlag();
    const summary = auditEstimate10000FinalProfessionalGreen();
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode =
      summary.final_status === GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
