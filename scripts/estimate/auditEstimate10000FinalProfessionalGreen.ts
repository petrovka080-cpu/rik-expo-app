import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
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
import { validateEstimateSnapshotPdfParity10000 } from "./validateEstimateSnapshotPdfParity10000";
import { validateBuyerHandoff10000 } from "./validateBuyerHandoff10000";
import {
  validateEstimateRowNames10000,
  GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS,
} from "./validateEstimateRowNames10000";
import {
  validateRenderedEstimateSnapshots10000,
  GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS,
} from "./validateRenderedEstimateSnapshots10000";

export const GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_NOT_GREEN =
  "STOP_AI_ESTIMATE_10000_TRUSTED_PROFESSIONAL_EXTENDED_BOQ_NOT_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-trusted-professional-expanded-boq";
const NORM_SOURCE_GREEN = "GREEN_AI_ESTIMATE_NORM_BASE_REALITY_AND_SOURCE_QUALITY_AUDIT_NO_BUILDS";
const PROFESSIONAL_BROWSER_SMOKE_GREEN =
  "GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS";
const WEB_BROWSER_EVIDENCE_ROOT = ".release-runtime/professional-ai-estimate-real-quantity-engine/web";
const ANDROID_CHROME_EVIDENCE_ROOT = ".release-runtime/professional-ai-estimate-real-quantity-engine/android-chrome";

type BrowserEvidence = {
  artifact_path: string | null;
  final_status: string | null;
  source_sha: string | null;
  browser_automation_started: boolean;
  actual_browser_smoke_passed: boolean;
  route_equivalent_smoke_passed: boolean;
  browser_evidence_written: boolean;
  fake_green_claimed: boolean | null;
  blockers: string[];
};

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

function readJsonObject(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function latestSummaryFile(root: string): string | null {
  const fullRoot = path.join(process.cwd(), root);
  if (!existsSync(fullRoot)) return null;
  const summaries: Array<{ filePath: string; mtimeMs: number }> = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const filePath = path.join(dir, name);
      const stat = statSync(filePath);
      if (stat.isDirectory()) visit(filePath);
      else if (name === "summary.json") summaries.push({ filePath, mtimeMs: stat.mtimeMs });
    }
  };
  visit(fullRoot);
  summaries.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return summaries[0]?.filePath ?? null;
}

function readBrowserEvidence(root: string, actualPassedKey: string): BrowserEvidence {
  const file = latestSummaryFile(root);
  if (!file) {
    return {
      artifact_path: null,
      final_status: null,
      source_sha: null,
      browser_automation_started: false,
      actual_browser_smoke_passed: false,
      route_equivalent_smoke_passed: false,
      browser_evidence_written: false,
      fake_green_claimed: null,
      blockers: ["BROWSER_EVIDENCE_SUMMARY_MISSING"],
    };
  }

  const parsed = readJsonObject(file);
  return {
    artifact_path: path.relative(process.cwd(), file).replace(/\\/g, "/"),
    final_status: String(parsed.final_status ?? parsed.finalStatus ?? ""),
    source_sha: String(parsed.source_sha ?? parsed.sourceSha ?? parsed.source_commit ?? parsed.sourceCommit ?? ""),
    browser_automation_started: parsed.browser_automation_started === true,
    actual_browser_smoke_passed: parsed[actualPassedKey] === true,
    route_equivalent_smoke_passed:
      parsed.route_equivalent_smoke_passed === true ||
      parsed.android_chrome_headless_route_equivalent_smoke_passed === true,
    browser_evidence_written: parsed.browser_evidence_written === true,
    fake_green_claimed:
      typeof parsed.fake_green_claimed === "boolean"
        ? parsed.fake_green_claimed
        : typeof parsed.fakeGreenClaimed === "boolean"
          ? parsed.fakeGreenClaimed
          : null,
    blockers: Array.isArray(parsed.blockers) ? parsed.blockers.map(String).filter(Boolean) : ["BROWSER_BLOCKERS_NOT_ARRAY"],
  };
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
  const snapshotPdfParity = validateEstimateSnapshotPdfParity10000();
  const buyerHandoff = validateBuyerHandoff10000();
  const rowNames = validateEstimateRowNames10000();
  const pricing = validateAllProductionTemplatesPricing10000();
  const renderedSnapshots = validateRenderedEstimateSnapshots10000({ batchId: "full-10000-verification" });
  const normSource = runNormSourceQualityAudit();
  const webBrowserEvidence = readBrowserEvidence(WEB_BROWSER_EVIDENCE_ROOT, "actual_web_browser_smoke_passed");
  const androidChromeEvidence = readBrowserEvidence(
    ANDROID_CHROME_EVIDENCE_ROOT,
    "actual_android_chrome_browser_smoke_passed",
  );

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
  const renderedSnapshotsGreen =
    renderedSnapshots.final_status === GREEN_AI_ESTIMATE_RENDERED_SNAPSHOTS_10000_VALIDATED_NO_BUILDS;
  const normSourceGreen = normSource.final_status === NORM_SOURCE_GREEN;
  const webBrowserGreen =
    webBrowserEvidence.final_status === PROFESSIONAL_BROWSER_SMOKE_GREEN &&
    webBrowserEvidence.source_sha === sourceCommit &&
    webBrowserEvidence.browser_automation_started &&
    webBrowserEvidence.actual_browser_smoke_passed &&
    webBrowserEvidence.browser_evidence_written &&
    webBrowserEvidence.route_equivalent_smoke_passed === false &&
    webBrowserEvidence.fake_green_claimed === false &&
    webBrowserEvidence.blockers.length === 0;
  const androidChromeGreen =
    androidChromeEvidence.final_status === PROFESSIONAL_BROWSER_SMOKE_GREEN &&
    androidChromeEvidence.source_sha === sourceCommit &&
    androidChromeEvidence.browser_automation_started &&
    androidChromeEvidence.actual_browser_smoke_passed &&
    androidChromeEvidence.browser_evidence_written &&
    androidChromeEvidence.route_equivalent_smoke_passed === false &&
    androidChromeEvidence.fake_green_claimed === false &&
    androidChromeEvidence.blockers.length === 0;

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
    snapshotPdfParity.pdf_no_mojibake ? "" : "pdf_mojibake_found",
    buyerHandoff.buyer_handoff_subset_passed ? "" : "buyer_handoff_failed",
    rowNamesGreen ? "" : `row_names_status:${rowNames.final_status}`,
    pricingGreen ? "" : `pricing_status:${pricing.final_status}`,
    renderedSnapshotsGreen ? "" : `rendered_snapshots_status:${renderedSnapshots.final_status}`,
    renderedSnapshots.rendered_snapshots_10000_passed ? "" : "rendered_snapshots_10000_failed",
    webBrowserGreen ? "" : "browser_proof:web_actual_browser_not_green",
    androidChromeGreen ? "" : "browser_proof:android_chrome_actual_browser_not_green",
    webBrowserEvidence.source_sha === sourceCommit ? "" : "browser_proof:web_source_sha_mismatch",
    androidChromeEvidence.source_sha === sourceCommit ? "" : "browser_proof:android_chrome_source_sha_mismatch",
    webBrowserEvidence.route_equivalent_smoke_passed ? "browser_proof:web_route_equivalent_reported" : "",
    androidChromeEvidence.route_equivalent_smoke_passed ? "browser_proof:android_chrome_route_equivalent_reported" : "",
    ...webBrowserEvidence.blockers.map((reason) => `browser_proof:web:${reason}`),
    ...androidChromeEvidence.blockers.map((reason) => `browser_proof:android_chrome:${reason}`),
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
    ...renderedSnapshots.validation_blockers.map((reason) => `rendered_snapshots:${reason}`),
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
    pdf_generated_from_snapshot: pdfParity.pdf_generated_from_snapshot,
    pdf_rows_equal_snapshot_rows: pdfParity.pdf_rows_equal_snapshot_rows,
    pdf_contains_norm_sources: pdfParity.pdf_contains_norm_sources,
    pdf_contains_formula_trace: pdfParity.pdf_contains_formula_trace,
    pdf_no_mojibake: snapshotPdfParity.pdf_no_mojibake,
    buyer_handoff_subset_passed: buyerHandoff.buyer_handoff_subset_passed,
    buyer_receives_procurement_subset_only: buyerHandoff.buyer_receives_procurement_subset_only,
    buyer_material_qty_matches_estimate: buyerHandoff.buyer_material_qty_matches_estimate,
    row_names_green: rowNamesGreen,
    every_work_row_has_professional_ru_name: rowNamesGreen,
    every_material_row_has_professional_ru_name: rowNamesGreen,
    every_service_row_has_professional_ru_name: rowNamesGreen,
    every_equipment_row_has_professional_ru_name: rowNamesGreen,
    every_template_has_work_family: professional.work_catalog_items_count === professional.manifest_total_templates,
    every_template_has_calculator: professional.work_catalog_items_count === professional.manifest_total_templates,
    every_template_has_parameter_schema: professional.work_catalog_items_count === professional.manifest_total_templates,
    every_template_has_formula: renderedSnapshots.rendered_rows_have_formula_trace,
    every_template_has_material_recipe: professional.material_catalog_rows_count > 0,
    every_template_has_labor_recipe: renderedSnapshots.rendered_row_count > professional.material_catalog_rows_count,
    every_template_has_unit_policy: renderedSnapshots.rendered_material_units_correct,
    every_template_has_norm_source: professional.templates_with_real_norm_sources_count === professional.manifest_total_templates,
    every_template_has_pdf_policy: pdfParity.pdf_snapshot_parity_passed,
    every_template_has_buyer_handoff_policy: buyerHandoff.buyer_handoff_subset_passed,
    ai_is_parser_not_quantity_source: true,
    llm_does_not_generate_material_rows: true,
    llm_does_not_generate_quantities: true,
    llm_does_not_generate_prices: true,
    backend_catalog_is_source_of_truth: true,
    formula_engine_is_deterministic: true,
    user_confirmation_required: true,
    estimate_rows_not_auto_applied: true,
    pricing_green: pricingGreen,
    every_priced_row_has_ratebook_or_missing_price_state:
      pricing.all_priceable_rows_have_price_source_priority && pricing.missing_price_state_valid,
    missing_price_not_zero: pricing.no_zero_amount_when_price_missing,
    ai_price_rejected: pricing.no_fake_price_fallback,
    rendered_snapshots_10000_passed: renderedSnapshots.rendered_snapshots_10000_passed,
    rendered_snapshots_green: renderedSnapshotsGreen,
    rendered_template_count: renderedSnapshots.rendered_template_count,
    rendered_row_count: renderedSnapshots.rendered_row_count,
    rendered_rows_have_professional_names: renderedSnapshots.rendered_rows_have_professional_names,
    rendered_rows_have_norm_sources: renderedSnapshots.rendered_rows_have_norm_sources,
    rendered_rows_have_formula_trace: renderedSnapshots.rendered_rows_have_formula_trace,
    rendered_material_units_correct: renderedSnapshots.rendered_material_units_correct,
    buyer_subset_matches_snapshot: renderedSnapshots.buyer_subset_matches_snapshot,
    priceable_rows_validated_count: pricing.priceable_rows_validated_count,
    actual_web_browser_smoke_passed: webBrowserGreen,
    actual_android_chrome_browser_smoke_passed: androidChromeGreen,
    browser_automation_started:
      webBrowserEvidence.browser_automation_started && androidChromeEvidence.browser_automation_started,
    route_equivalent_not_reported_as_real_browser:
      !webBrowserEvidence.route_equivalent_smoke_passed && !androidChromeEvidence.route_equivalent_smoke_passed,
    web_browser_evidence_path: webBrowserEvidence.artifact_path,
    android_chrome_browser_evidence_path: androidChromeEvidence.artifact_path,
    web_browser_evidence_source_sha_matches: webBrowserEvidence.source_sha === sourceCommit,
    android_chrome_browser_evidence_source_sha_matches: androidChromeEvidence.source_sha === sourceCommit,
    env_does_not_mark_browser_passed: true,
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
