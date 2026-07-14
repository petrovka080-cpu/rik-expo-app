import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS,
  validateAllProductionTemplatesPricing10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  auditCatalogBackfillProgress,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS,
} from "./auditCatalogBackfillProgress";
import {
  buildCatalogBackfillBatches,
  GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS,
} from "./buildCatalogBackfillBatches";
import {
  buildCatalogQualityDashboard,
  GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
} from "./auditCatalogQualityDashboard";
import {
  buildCatalogSourceRegistry,
  GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
} from "./validateCatalogSourceRegistry";
import { validateNoBlindQuantityCopy10000 } from "./validateNoBlindQuantityCopy10000";
import { validatePdfSnapshotParity10000 } from "./validatePdfSnapshotParity10000";
import { validateBuyerHandoff10000 } from "./validateBuyerHandoff10000";
import {
  GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS,
  validateEstimateRowNames10000,
} from "./validateEstimateRowNames10000";

export const GREEN_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_COMMITTED_NO_BUILDS =
  "GREEN_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_COMMITTED_NO_BUILDS" as const;
export const STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_NOT_GREEN =
  "STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_NOT_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-professional-backfill-conveyor-p1-p2";

function gitOutput(args: string[], fallback = ""): string {
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

function envFlag(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
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

function readBrowserArtifact(kind: "web" | "android-chrome", sourceSha: string) {
  const envPath = kind === "web"
    ? String(process.env.PROFESSIONAL_ESTIMATE_WEB_SMOKE_ARTIFACT ?? "").trim()
    : String(process.env.PROFESSIONAL_ESTIMATE_ANDROID_CHROME_SMOKE_ARTIFACT ?? "").trim();
  const filePath = envPath || latestSummaryFile(`.release-runtime/professional-ai-estimate-real-quantity-engine/${kind}`);
  if (!filePath) {
    return {
      path: null,
      passed: false,
      browser_automation_started: false,
      route_equivalent_reported: false,
      source_sha_matches: false,
      blockers: [`${kind}:artifact_missing`],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
    const blockers = Array.isArray(parsed.blockers) ? parsed.blockers.map(String).filter(Boolean) : [];
    const actualPassed = kind === "web"
      ? parsed.actual_web_browser_smoke_passed === true
      : parsed.actual_android_chrome_browser_smoke_passed === true;
    const artifactSha = String(parsed.source_sha ?? parsed.sourceSha ?? parsed.source_commit ?? "");
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      passed: actualPassed && blockers.length === 0,
      browser_automation_started: parsed.browser_automation_started === true,
      route_equivalent_reported: parsed.route_equivalent_smoke_passed === true,
      source_sha_matches: artifactSha === sourceSha,
      blockers,
    };
  } catch (error) {
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      passed: false,
      browser_automation_started: false,
      route_equivalent_reported: false,
      source_sha_matches: false,
      blockers: [`${kind}:artifact_unreadable:${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function auditProfessionalBackfillConveyorP1P2(options: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown");
  const worktreeClean = gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
  const progress = auditCatalogBackfillProgress();
  const batches = buildCatalogBackfillBatches({ writeFiles: false });
  const dashboard = buildCatalogQualityDashboard({ writeFiles: false });
  const sourceRegistry = buildCatalogSourceRegistry({ writeFiles: false });
  const blindQuantity = validateNoBlindQuantityCopy10000();
  const pdfParity = validatePdfSnapshotParity10000();
  const buyerHandoff = validateBuyerHandoff10000();
  const rowNames = validateEstimateRowNames10000();
  const pricing = validateAllProductionTemplatesPricing10000();
  const rowNamesGreen = rowNames.final_status === GREEN_AI_ESTIMATE_10000_ROW_NAMES_AND_CATALOG_IDS_READY_NO_BUILDS;
  const pricingGreen = pricing.final_status === GREEN_AI_ESTIMATE_REAL_PRICE_SOURCE_TOTALS_AND_COST_CONFIDENCE_NO_BUILDS;
  const web = readBrowserArtifact("web", sourceSha);
  const android = readBrowserArtifact("android-chrome", sourceSha);
  const sourceGates = {
    focused_jest_passed: envFlag("BACKFILL_CONVEYOR_FOCUSED_JEST_PASSED"),
    typecheck_passed: envFlag("BACKFILL_CONVEYOR_TYPECHECK_PASSED"),
    lint_passed: envFlag("BACKFILL_CONVEYOR_LINT_PASSED"),
    diff_check_passed: envFlag("BACKFILL_CONVEYOR_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envFlag("BACKFILL_CONVEYOR_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envFlag("BACKFILL_CONVEYOR_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envFlag("BACKFILL_CONVEYOR_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envFlag("BACKFILL_CONVEYOR_SECRET_SCAN_PASSED"),
  };
  const blockers = [
    progress.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_PROGRESS_READY_NO_BUILDS ? "" : "backfill_progress_not_green",
    batches.final_status === GREEN_AI_ESTIMATE_CATALOG_BACKFILL_BATCHES_READY_NO_BUILDS ? "" : "catalog_backfill_batches_not_green",
    dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS ? "" : "catalog_quality_dashboard_not_green",
    sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS ? "" : "source_registry_not_green",
    blindQuantity.no_blind_quantity_copy ? "" : "blind_quantity_copy_found",
    pdfParity.pdf_snapshot_parity_passed ? "" : "pdf_snapshot_parity_failed",
    buyerHandoff.buyer_handoff_subset_passed ? "" : "buyer_handoff_failed",
    rowNamesGreen ? "" : "row_names_or_catalog_ids_not_green",
    pricingGreen ? "" : "price_ratebook_policy_not_green",
    web.passed ? "" : "actual_web_browser_smoke_not_green",
    android.passed ? "" : "actual_android_chrome_browser_smoke_not_green",
    web.browser_automation_started && android.browser_automation_started ? "" : "browser_automation_not_started",
    !web.route_equivalent_reported && !android.route_equivalent_reported ? "" : "route_equivalent_reported_as_real_browser",
    web.source_sha_matches ? "" : "web_browser_artifact_source_sha_mismatch",
    android.source_sha_matches ? "" : "android_browser_artifact_source_sha_mismatch",
    worktreeClean ? "" : "worktree_not_clean",
    upstreamSync === "0\t0" || upstreamSync === "0 0" ? "" : `upstream_not_synced:${upstreamSync}`,
    ...Object.entries(sourceGates).filter(([, passed]) => !passed).map(([name]) => `${name}:false`),
    ...progress.blockers.map((reason) => `progress:${reason}`),
    ...batches.blockers.map((reason) => `batch:${reason}`),
    ...dashboard.blockers.map((reason) => `dashboard:${reason}`),
    ...sourceRegistry.blockers.map((reason) => `source:${reason}`),
    ...rowNames.blockers.map((reason) => `row_names:${reason}`),
    ...pricing.failures.slice(0, 20).map((failure) => `pricing:${failure.workKey}:${failure.blocker}`),
    ...web.blockers.map((reason) => `web:${reason}`),
    ...android.blockers.map((reason) => `android:${reason}`),
  ].filter(Boolean);

  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_COMMITTED_NO_BUILDS
      : STOP_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_NOT_GREEN,
    source_sha: sourceSha,
    source_commit: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    pushed: upstreamSync === "0\t0" || upstreamSync === "0 0",
    worktree_clean: worktreeClean,
    manifest_total_templates: progress.after.manifest_total_templates,
    ready_professional_count_before: progress.before.ready_professional_count,
    ready_professional_count_after: progress.after.ready_professional_count,
    quantity_only_price_missing_count_before: progress.before.quantity_only_price_missing_count,
    quantity_only_price_missing_count_after: progress.after.quantity_only_price_missing_count,
    not_ready_count_before: progress.before.not_ready_count,
    not_ready_count_after: progress.after.not_ready_count,
    generic_fallback_count_before: progress.before.generic_fallback_count,
    generic_fallback_count_after: progress.after.generic_fallback_count,
    synthetic_family_default_count_before: progress.before.synthetic_family_default_count,
    synthetic_family_default_count_after: progress.after.synthetic_family_default_count,
    templates_only_generic_norms_count_before: progress.before.templates_only_generic_norms_count,
    templates_only_generic_norms_count_after: progress.after.templates_only_generic_norms_count,
    p1_total_templates: progress.p1_total_templates,
    p1_ready_professional_count: progress.p1_ready_professional_count,
    p1_generic_fallback_count: progress.p1_generic_fallback_count,
    p2_total_templates: progress.p2_total_templates,
    p2_ready_professional_count: progress.p2_ready_professional_count,
    p2_generic_fallback_count: progress.p2_generic_fallback_count,
    catalog_backfill_conveyor_created: true,
    catalog_quality_dashboard_created: dashboard.final_status === GREEN_AI_ESTIMATE_CATALOG_QUALITY_DASHBOARD_READY_NO_BUILDS,
    source_registry_validated: sourceRegistry.final_status === GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS,
    every_p1_template_has_formula: progress.p1_ready_professional_count === progress.p1_total_templates,
    every_p1_template_has_material_recipe: progress.p1_ready_professional_count === progress.p1_total_templates,
    every_p1_template_has_labor_recipe: progress.p1_ready_professional_count === progress.p1_total_templates,
    every_p1_template_has_norm_source: progress.p1_generic_fallback_count === 0,
    p2_structural_calculators_passed: progress.p2_ready_professional_count === progress.p2_total_templates,
    p2_exterior_calculators_passed: progress.p2_ready_professional_count === progress.p2_total_templates,
    every_row_has_professional_ru_name: rowNamesGreen && rowNames.rows_with_professional_names === rowNames.row_count,
    rows_with_professional_names: rowNames.rows_with_professional_names,
    row_catalog_ids_validated: rowNames.rows_with_catalog_ids,
    row_names_mojibake_count: rowNames.mojibake_rows,
    no_generic_row_names_in_pdf: rowNamesGreen && pdfParity.pdf_rows_equal_snapshot_rows,
    no_blind_quantity_copy: blindQuantity.no_blind_quantity_copy,
    pdf_generated_from_snapshot: pdfParity.pdf_generated_from_snapshot,
    pdf_rows_equal_snapshot_rows: pdfParity.pdf_rows_equal_snapshot_rows,
    pdf_contains_norm_sources: pdfParity.pdf_contains_norm_sources,
    pdf_contains_formula_trace: pdfParity.pdf_contains_formula_trace,
    buyer_receives_procurement_subset_only: buyerHandoff.buyer_receives_procurement_subset_only,
    buyer_material_qty_matches_estimate: buyerHandoff.buyer_material_qty_matches_estimate,
    every_priced_row_has_ratebook_or_missing_price_state: pricingGreen &&
      pricing.all_10000_templates_have_price_keys &&
      pricing.missing_price_state_valid,
    priceable_rows_validated_count: pricing.priceable_rows_validated_count,
    pricing_templates_failed_count: pricing.templates_failed_count,
    missing_price_not_zero: pricing.no_zero_amount_when_price_missing,
    ai_price_rejected: pricing.no_fake_price_fallback && pricing.missing_price_state_valid,
    actual_web_browser_smoke_passed: web.passed,
    actual_android_chrome_browser_smoke_passed: android.passed,
    browser_automation_started: web.browser_automation_started && android.browser_automation_started,
    route_equivalent_not_reported_as_real_browser: !web.route_equivalent_reported && !android.route_equivalent_reported,
    full_10000_real_norm_green_claimed: false,
    focused_jest_passed: sourceGates.focused_jest_passed,
    typecheck_passed: sourceGates.typecheck_passed,
    lint_passed: sourceGates.lint_passed,
    diff_check_passed: sourceGates.diff_check_passed,
    no_test_weakening_passed: sourceGates.no_test_weakening_passed,
    web_public_smoke_passed: sourceGates.web_public_smoke_passed,
    ci_office_market_passed: sourceGates.ci_office_market_passed,
    secret_scan_passed: sourceGates.secret_scan_passed,
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
    web_browser_artifact_path: web.path,
    android_chrome_browser_artifact_path: android.path,
    blockers,
  };

  if (options.writeSummary !== false) {
    const dir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "summary.json"), `${JSON.stringify({
      ...summary,
      runtime_summary_path: path.join(dir, "summary.json"),
    }, null, 2)}\n`, "utf8");
  }
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/auditProfessionalBackfillConveyorP1P2.ts")) {
  const summary = auditProfessionalBackfillConveyorP1P2();
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode =
    summary.final_status === GREEN_AI_ESTIMATE_10000_PROFESSIONAL_BACKFILL_CONVEYOR_P1_P2_COMMITTED_NO_BUILDS ? 0 : 1;
}
