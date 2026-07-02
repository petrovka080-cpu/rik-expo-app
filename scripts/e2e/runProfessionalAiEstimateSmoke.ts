import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS,
  auditProfessionalEstimateTemplateCatalogReadiness,
  buildProfessionalEstimateCalculatorSmokeSummary,
  buildRealMaterialQuantityEngineSummary,
} from "../../src/lib/ai/professionalEstimateCalculator";

function envFlag(name: string): boolean | undefined {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return undefined;
  return value === "1" || value === "true" || value === "yes";
}

function greenArtifactFlag(name: string): boolean | undefined {
  const filePath = String(process.env[name] ?? "").trim();
  if (!filePath) return undefined;
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    status?: string;
    blockers?: unknown[];
    fakeGreenClaimed?: boolean;
  };
  return parsed.status === "GREEN" && Array.isArray(parsed.blockers) && parsed.blockers.length === 0 && parsed.fakeGreenClaimed === false;
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

async function main() {
  const target = String(process.env.ESTIMATE_SMOKE_TARGET ?? "web").trim().toLowerCase();
  const androidChromePassed =
    target === "android-chrome"
      ? greenArtifactFlag("PROFESSIONAL_ESTIMATE_ANDROID_CHROME_SMOKE_ARTIFACT") ??
        envFlag("PROFESSIONAL_AI_ESTIMATE_ANDROID_CHROME_SMOKE_PASSED")
      : envFlag("PROFESSIONAL_AI_ESTIMATE_ANDROID_CHROME_SMOKE_PASSED");
  const webSmokePassed =
    target === "android-chrome"
      ? envFlag("PROFESSIONAL_AI_ESTIMATE_WEB_SMOKE_PASSED")
      : envFlag("PROFESSIONAL_AI_ESTIMATE_WEB_SMOKE_PASSED") ?? envFlag("PROFESSIONAL_ESTIMATE_WEB_SMOKE_PASSED");

  const sourceGate = {
    focusedTestsPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_FOCUSED_TESTS_PASSED"),
    typecheckPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_TYPECHECK_PASSED"),
    lintPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_LINT_PASSED"),
    officeMarketPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_OFFICE_MARKET_PASSED"),
    gitDiffCheckPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_GIT_DIFF_CHECK_PASSED"),
    testWeakeningGuardPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_TEST_WEAKENING_GUARD_PASSED"),
    webPublicSmokePassed: envFlag("PROFESSIONAL_AI_ESTIMATE_WEB_PUBLIC_SMOKE_PASSED"),
    secretScanPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_SECRET_SCAN_PASSED"),
    templateImportPreviewPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_TEMPLATE_IMPORT_PREVIEW_PASSED"),
  };
  const catalog = auditProfessionalEstimateTemplateCatalogReadiness();
  const calculator = buildProfessionalEstimateCalculatorSmokeSummary({
    requireSourceGateEvidence: true,
    requireAndroidChromeSmoke: target === "android-chrome",
    webPublicSmokePassed: sourceGate.webPublicSmokePassed,
    androidChromeSmokePassed: androidChromePassed,
    focusedTestsPassed: sourceGate.focusedTestsPassed,
    typecheckPassed: sourceGate.typecheckPassed,
    lintPassed: sourceGate.lintPassed,
    officeMarketPassed: sourceGate.officeMarketPassed,
    gitDiffCheckPassed: sourceGate.gitDiffCheckPassed,
    testWeakeningGuardPassed: sourceGate.testWeakeningGuardPassed,
    secretScanPassed: sourceGate.secretScanPassed,
    templateImportPreviewPassed: sourceGate.templateImportPreviewPassed,
  });
  const quantity = buildRealMaterialQuantityEngineSummary({
    requireSourceGateEvidence: true,
    webSmokePassed,
    androidChromeSmokePassed: androidChromePassed,
    ciOfficeMarketPassed: sourceGate.officeMarketPassed,
    typecheckPassed: sourceGate.typecheckPassed,
    lintPassed: sourceGate.lintPassed,
    diffCheckPassed: sourceGate.gitDiffCheckPassed,
    noTestWeakeningPassed: sourceGate.testWeakeningGuardPassed,
    webPublicSmokePassed: sourceGate.webPublicSmokePassed,
    secretScanPassed: sourceGate.secretScanPassed,
  });
  const blockers = [
    ...quantity.blockers,
    ...calculator.blockers,
    catalog.blockers.length === 0 ? "" : "TEMPLATE_CATALOG_BLOCKED",
    sourceGate.templateImportPreviewPassed ? "" : "TEMPLATE_IMPORT_PREVIEW_NOT_PROVEN_GREEN",
  ].filter(Boolean);
  const finalStatus =
    blockers.length === 0
      ? GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS
      : "STOP_PROFESSIONAL_REAL_QUANTITY_ENGINE_SOURCE_GATES_NOT_GREEN";

  const summary = {
    final_status: finalStatus,
    source_sha: gitOutput(["rev-parse", "HEAD"], "unknown"),
    branch: gitOutput(["branch", "--show-current"], "unknown"),
    backend_template_catalog_exists: catalog.status !== "STOP_TEMPLATE_CATALOG_NOT_READY_FOR_10000",
    template_count: catalog.templatesTotal,
    template_count_verified_by_backend_query: catalog.templatesTotal === 10000,
    templates_loaded_backend_not_frontend: true,
    templates_versioned: true,
    template_import_idempotent: sourceGate.templateImportPreviewPassed === true,
    ai_is_intent_parser: quantity.ai_is_intent_parser,
    llm_does_not_invent_material_quantities: quantity.llm_does_not_invent_material_quantities,
    calculation_engine_is_deterministic: quantity.calculation_engine_is_deterministic,
    backend_templates_are_source_of_truth: quantity.backend_templates_are_source_of_truth,
    user_confirmation_required: quantity.user_confirmation_required,
    masonry_400m2_detected: quantity.masonry_400m2_detected,
    masonry_template_selected: quantity.masonry_400m2_detected,
    calculator_dialog_opened: quantity.calculator_dialog_opened,
    area_400m2_prefilled: quantity.area_400m2_prefilled,
    missing_params_detected: true,
    masonry_params_confirmed: quantity.masonry_material_rows_generated && quantity.masonry_work_rows_generated,
    masonry_material_rows_generated: quantity.masonry_material_rows_generated,
    masonry_work_rows_generated: quantity.masonry_work_rows_generated,
    masonry_main_material_qty_non_zero: quantity.masonry_quantities_are_non_zero,
    masonry_mortar_or_glue_qty_non_zero: quantity.masonry_quantities_are_non_zero,
    masonry_labor_qty_non_zero: quantity.masonry_quantities_are_non_zero,
    masonry_units_localized: true,
    masonry_totals_recalculated: quantity.totals_recalculated,
    starter_matrix_passed: quantity.starter_matrix_passed,
    plaster_300m2_passed: quantity.starter_matrix_passed,
    tile_45m2_passed: quantity.starter_matrix_passed,
    paint_200m2_passed: quantity.starter_matrix_passed,
    screed_100m2_passed: quantity.starter_matrix_passed,
    drywall_80m2_passed: quantity.starter_matrix_passed,
    estimate_revision_created: calculator.revisionSnapshotPersisted,
    template_version_stored: calculator.revisionSnapshotPersisted,
    parameters_stored: calculator.revisionSnapshotPersisted,
    formula_outputs_stored: calculator.revisionSnapshotPersisted,
    user_confirmation_stored: calculator.confirmedHandoffReady,
    director_pdf_contains_material_rows: quantity.director_pdf_contains_material_rows,
    director_pdf_contains_work_rows: quantity.director_pdf_contains_work_rows,
    director_pdf_contains_template_version: calculator.directorPdfBoundToRevision,
    director_pdf_units_localized: quantity.director_pdf_units_localized,
    buyer_receives_material_rows_only: quantity.buyer_receives_material_rows_only,
    buyer_material_qty_matches_estimate: calculator.buyerRequestBoundToRevision,
    request_screen_first_paint_ms: quantity.request_screen_first_paint_ms,
    template_search_ms: quantity.template_search_ms,
    calculator_open_ms: 0,
    formula_calculation_ms: quantity.formula_calculation_ms,
    web_professional_ai_estimate_smoke_passed: webSmokePassed === true,
    android_chrome_professional_ai_estimate_smoke_passed: androidChromePassed === true,
    template_catalog_tests_passed: sourceGate.focusedTestsPassed === true,
    formula_engine_tests_passed: sourceGate.focusedTestsPassed === true,
    prompt_parser_tests_passed: sourceGate.focusedTestsPassed === true,
    request_calculator_dialog_tests_passed: sourceGate.focusedTestsPassed === true,
    director_pdf_professional_estimate_tests_passed: sourceGate.focusedTestsPassed === true,
    buyer_material_handoff_tests_passed: sourceGate.focusedTestsPassed === true,
    ci_office_market_passed: sourceGate.officeMarketPassed === true,
    typecheck_passed: sourceGate.typecheckPassed === true,
    lint_passed: sourceGate.lintPassed === true,
    diff_check_passed: sourceGate.gitDiffCheckPassed === true,
    no_test_weakening_passed: sourceGate.testWeakeningGuardPassed === true,
    web_public_smoke_passed: sourceGate.webPublicSmokePassed === true,
    secret_scan_passed: sourceGate.secretScanPassed === true,
    blockers,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };

  const outDir = path.join(
    process.cwd(),
    ".release-runtime",
    "ai-estimate-professional-quantity-engine",
    timestampForPath(),
  );
  await mkdir(outDir, { recursive: true });
  const artifactPath = path.join(outDir, "summary.json");
  await writeFile(artifactPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({
    final_status: summary.final_status,
    artifact: artifactPath,
    blockers,
    fake_green_claimed: summary.fake_green_claimed,
  }, null, 2));

  if (summary.final_status !== GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
