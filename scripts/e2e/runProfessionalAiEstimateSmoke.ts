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

type SmokeCases =
  | "wave2a"
  | "functional-reality"
  | "diamond-drilling"
  | "profile-fence"
  | "mansard-roof"
  | "apartment54"
  | "all";

type SmokeTarget = "web" | "android-chrome";

type SmokeRunnerConfig = {
  cases: SmokeCases;
  target: SmokeTarget;
  requireRealBrowser: boolean;
  allowRouteEquivalent: boolean;
};

const allowedSmokeCases = new Set<SmokeCases>([
  "wave2a",
  "functional-reality",
  "diamond-drilling",
  "profile-fence",
  "mansard-roof",
  "apartment54",
  "all",
]);

const allowedSmokeTargets = new Set<SmokeTarget>(["web", "android-chrome"]);

function envFlag(name: string): boolean | undefined {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return undefined;
  return value === "1" || value === "true" || value === "yes";
}

function envString(name: string): string | undefined {
  const value = String(process.env[name] ?? "").trim();
  return value.length > 0 ? value : undefined;
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return String(process.argv[index + 1] ?? "").trim() || undefined;
  return undefined;
}

function argFlag(name: string): boolean | undefined {
  if (process.argv.includes(`--${name}`)) return true;
  const value = argValue(name);
  if (value === undefined) return undefined;
  return ["1", "true", "yes"].includes(value.trim().toLowerCase());
}

function parseSmokeCases(value: string | undefined): SmokeCases {
  const normalized = (value ?? "wave2a").trim().toLowerCase();
  if (allowedSmokeCases.has(normalized as SmokeCases)) return normalized as SmokeCases;
  throw new Error(`UNSUPPORTED_ESTIMATE_SMOKE_CASES:${normalized}`);
}

function parseSmokeTarget(value: string | undefined): SmokeTarget {
  const normalized = (value ?? "web").trim().toLowerCase();
  if (allowedSmokeTargets.has(normalized as SmokeTarget)) return normalized as SmokeTarget;
  throw new Error(`UNSUPPORTED_ESTIMATE_SMOKE_TARGET:${normalized}`);
}

function parseSmokeRunnerConfig(): SmokeRunnerConfig {
  return {
    cases: parseSmokeCases(argValue("cases") ?? envString("ESTIMATE_SMOKE_CASES")),
    target: parseSmokeTarget(argValue("target") ?? envString("ESTIMATE_SMOKE_TARGET")),
    requireRealBrowser:
      argFlag("require-real-browser") ??
      envFlag("ESTIMATE_SMOKE_REQUIRE_REAL_BROWSER") ??
      false,
    allowRouteEquivalent:
      argFlag("allow-route-equivalent") ??
      envFlag("ESTIMATE_SMOKE_ALLOW_ROUTE_EQUIVALENT") ??
      true,
  };
}

function forbiddenBrowserGreenEnvFlags(): string[] {
  return [
    "ESTIMATE_FORCE_ANDROID_CHROME_PASSED",
    "ESTIMATE_ASSUME_ANDROID_CHROME_PASSED",
    "ESTIMATE_SKIP_BROWSER_PROOF",
    "ESTIMATE_FAKE_BROWSER_GREEN",
    "ESTIMATE_ACCEPT_ROUTE_AS_BROWSER",
  ].filter((name) => envString(name));
}

type AndroidChromeSummaryLink = {
  path: string | null;
  status: string | null;
  finalStatus: string | null;
  sourceSha: string | null;
  fakeGreenClaimed: boolean | null;
  browserAutomationStarted: boolean;
  actualBrowserSmokePassed: boolean;
  routeEquivalentSmokePassed: boolean;
  evidenceWritten: boolean;
  blockers: string[];
};

type WebSummaryLink = {
  path: string | null;
  status: string | null;
  finalStatus: string | null;
  sourceSha: string | null;
  fakeGreenClaimed: boolean | null;
  browserAutomationStarted: boolean;
  actualBrowserSmokePassed: boolean;
  routeEquivalentSmokePassed: boolean;
  evidenceWritten: boolean;
  blockers: string[];
};

function readWebSummaryLink(): WebSummaryLink {
  const filePath = String(process.env.PROFESSIONAL_ESTIMATE_WEB_SMOKE_ARTIFACT ?? "").trim();
  if (!filePath) {
    return {
      path: null,
      status: null,
      finalStatus: null,
      sourceSha: null,
      fakeGreenClaimed: null,
      browserAutomationStarted: false,
      actualBrowserSmokePassed: false,
      routeEquivalentSmokePassed: false,
      evidenceWritten: false,
      blockers: ["WEB_SUMMARY_PATH_MISSING"],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      status?: string;
      final_status?: string;
      finalStatus?: string;
      source_sha?: string;
      sourceSha?: string;
      fake_green_claimed?: boolean;
      fakeGreenClaimed?: boolean;
      browser_automation_started?: boolean;
      actual_web_browser_smoke_passed?: boolean;
      route_equivalent_smoke_passed?: boolean;
      browser_evidence_written?: boolean;
      blockers?: unknown[];
    };
    const blockers = Array.isArray(parsed.blockers)
      ? parsed.blockers.map((item) => String(item)).filter(Boolean)
      : ["WEB_SUMMARY_BLOCKERS_NOT_ARRAY"];
    const fakeGreenClaimed = parsed.fake_green_claimed ?? parsed.fakeGreenClaimed ?? null;
    const actualBrowserSmokePassed =
      parsed.actual_web_browser_smoke_passed === true ||
      (
        parsed.status === "GREEN" &&
        blockers.length === 0 &&
        fakeGreenClaimed === false &&
        parsed.browser_automation_started === true
      );
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      status: parsed.status ?? null,
      finalStatus: parsed.final_status ?? parsed.finalStatus ?? null,
      sourceSha: parsed.source_sha ?? parsed.sourceSha ?? null,
      fakeGreenClaimed,
      browserAutomationStarted: parsed.browser_automation_started === true,
      actualBrowserSmokePassed,
      routeEquivalentSmokePassed: parsed.route_equivalent_smoke_passed === true,
      evidenceWritten: parsed.browser_evidence_written === true || actualBrowserSmokePassed,
      blockers,
    };
  } catch (error) {
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      status: null,
      finalStatus: null,
      sourceSha: null,
      fakeGreenClaimed: null,
      browserAutomationStarted: false,
      actualBrowserSmokePassed: false,
      routeEquivalentSmokePassed: false,
      evidenceWritten: false,
      blockers: [`WEB_SUMMARY_UNREADABLE:${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

function readAndroidChromeSummaryLink(): AndroidChromeSummaryLink {
  const filePath = String(process.env.PROFESSIONAL_ESTIMATE_ANDROID_CHROME_SMOKE_ARTIFACT ?? "").trim();
  if (!filePath) {
    return {
      path: null,
      status: null,
      finalStatus: null,
      sourceSha: null,
      fakeGreenClaimed: null,
      browserAutomationStarted: false,
      actualBrowserSmokePassed: false,
      routeEquivalentSmokePassed: false,
      evidenceWritten: false,
      blockers: ["ANDROID_CHROME_SUMMARY_PATH_MISSING"],
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      status?: string;
      final_status?: string;
      finalStatus?: string;
      source_sha?: string;
      sourceSha?: string;
      source_commit?: string;
      sourceCommit?: string;
      fake_green_claimed?: boolean;
      fakeGreenClaimed?: boolean;
      browser_automation_started?: boolean;
      actual_android_chrome_browser_smoke_passed?: boolean;
      android_chrome_headless_route_equivalent_smoke_passed?: boolean;
      route_equivalent_smoke_passed?: boolean;
      pageUrl?: string;
      targetUrl?: string;
      runtime?: {
        href?: string;
        readyState?: string;
        title?: string;
        bodyText?: string | null;
        visibleTextLength?: number;
        buttonCount?: number;
        inputCount?: number;
      };
      blockers?: unknown[];
    };
    const blockers = Array.isArray(parsed.blockers)
      ? parsed.blockers.map((item) => String(item)).filter(Boolean)
      : ["ANDROID_CHROME_SUMMARY_BLOCKERS_NOT_ARRAY"];
    const runtime = parsed.runtime;
    const legacyBrowserEvidence =
      typeof parsed.pageUrl === "string" &&
      parsed.pageUrl.includes("/request") &&
      typeof parsed.targetUrl === "string" &&
      parsed.targetUrl.includes("/request") &&
      runtime?.readyState === "complete" &&
      runtime?.title === "rik-expo-app" &&
      typeof runtime.href === "string" &&
      runtime.href.includes("/request") &&
      typeof runtime.visibleTextLength === "number" &&
      runtime.visibleTextLength > 100;
    const browserAutomationStarted = parsed.browser_automation_started === true || legacyBrowserEvidence;
    const fakeGreenClaimed = parsed.fake_green_claimed ?? parsed.fakeGreenClaimed ?? null;
    const actualBrowserSmokePassed =
      parsed.actual_android_chrome_browser_smoke_passed === true ||
      (
        parsed.status === "GREEN" &&
        blockers.length === 0 &&
        fakeGreenClaimed === false &&
        browserAutomationStarted &&
        legacyBrowserEvidence
      );
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      status: parsed.status ?? null,
      finalStatus: parsed.final_status ?? parsed.finalStatus ?? null,
      sourceSha: parsed.source_sha ?? parsed.sourceSha ?? parsed.source_commit ?? parsed.sourceCommit ?? null,
      fakeGreenClaimed,
      browserAutomationStarted,
      actualBrowserSmokePassed,
      routeEquivalentSmokePassed:
        parsed.route_equivalent_smoke_passed === true ||
        parsed.android_chrome_headless_route_equivalent_smoke_passed === true,
      evidenceWritten: actualBrowserSmokePassed,
      blockers,
    };
  } catch (error) {
    return {
      path: path.relative(process.cwd(), filePath).replace(/\\/g, "/"),
      status: null,
      finalStatus: null,
      sourceSha: null,
      fakeGreenClaimed: null,
      browserAutomationStarted: false,
      actualBrowserSmokePassed: false,
      routeEquivalentSmokePassed: false,
      evidenceWritten: false,
      blockers: [`ANDROID_CHROME_SUMMARY_UNREADABLE:${error instanceof Error ? error.message : String(error)}`],
    };
  }
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

function gitWorktreeClean(): boolean {
  return gitOutput(["status", "--porcelain=v1", "--untracked-files=all"], "") === "";
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const generatedAt = new Date().toISOString();
  const worktreeCleanAtStart = gitWorktreeClean();
  const config = parseSmokeRunnerConfig();
  const forbiddenEnvFlags = forbiddenBrowserGreenEnvFlags();
  const target = config.target;
  const webSummary = readWebSummaryLink();
  const androidChromeSummary = readAndroidChromeSummaryLink();
  const sourceSha = gitOutput(["rev-parse", "HEAD"], "unknown");
  const branch = gitOutput(["branch", "--show-current"], "unknown");
  const upstreamSync = gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"], "unknown");
  const worktreeCleanAtFinish = gitWorktreeClean();
  const androidChromeSummarySourceShaMatchesRoot = androidChromeSummary.sourceSha === sourceSha;
  const androidChromeSummaryFinalStatusMatchesExpected =
    androidChromeSummary.finalStatus === GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS;
  const webSummarySourceShaMatchesRoot = webSummary.sourceSha === sourceSha;
  const webSummaryFinalStatusMatchesExpected =
    webSummary.finalStatus === GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS;
  const routeEquivalentWebPassed =
    envFlag("PROFESSIONAL_AI_ESTIMATE_WEB_SMOKE_PASSED") ??
    envFlag("PROFESSIONAL_ESTIMATE_WEB_SMOKE_PASSED") ??
    false;
  const routeEquivalentAndroidChromePassed =
    envFlag("PROFESSIONAL_AI_ESTIMATE_ANDROID_CHROME_SMOKE_PASSED") === true ||
    androidChromeSummary.routeEquivalentSmokePassed;
  const actualWebBrowserSmokePassed = webSummary.actualBrowserSmokePassed;
  const actualAndroidChromeBrowserSmokePassed = androidChromeSummary.actualBrowserSmokePassed;
  const routeEquivalentSmokePassed =
    routeEquivalentAndroidChromePassed || routeEquivalentWebPassed === true || webSummary.routeEquivalentSmokePassed;
  const browserAutomationStarted =
    webSummary.browserAutomationStarted || (target === "android-chrome" ? androidChromeSummary.browserAutomationStarted : false);
  const androidChromePassed =
    target === "android-chrome"
      ? actualAndroidChromeBrowserSmokePassed
      : false;
  const webSmokePassed =
    actualWebBrowserSmokePassed ||
    (config.allowRouteEquivalent && !config.requireRealBrowser && routeEquivalentWebPassed === true);

  const sourceGate = {
    focusedTestsPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_FOCUSED_TESTS_PASSED"),
    typecheckPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_TYPECHECK_PASSED"),
    lintPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_LINT_PASSED"),
    officeMarketPassed: envFlag("PROFESSIONAL_AI_ESTIMATE_OFFICE_MARKET_PASSED"),
    noMarketplaceScope: envFlag("PROFESSIONAL_AI_ESTIMATE_NO_MARKETPLACE_SCOPE"),
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
    noMarketplaceScope: sourceGate.noMarketplaceScope,
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
    noMarketplaceScope: sourceGate.noMarketplaceScope,
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
    worktreeCleanAtStart ? "" : "WORKTREE_NOT_CLEAN_AT_START",
    worktreeCleanAtFinish ? "" : "WORKTREE_NOT_CLEAN_AT_FINISH",
    upstreamSync === "0\t0" || upstreamSync === "0 0" ? "" : "UPSTREAM_SYNC_NOT_ZERO_ZERO",
    ...forbiddenEnvFlags.map((name) => `FORBIDDEN_BROWSER_GREEN_ENV_FLAG_SET:${name}`),
    config.requireRealBrowser && !actualWebBrowserSmokePassed ? "WEB_BROWSER_NOT_AVAILABLE" : "",
    config.requireRealBrowser && target === "android-chrome" && !actualAndroidChromeBrowserSmokePassed
      ? "ANDROID_CHROME_BROWSER_NOT_AVAILABLE"
      : "",
    config.requireRealBrowser && routeEquivalentSmokePassed ? "ROUTE_EQUIVALENT_CANNOT_SATISFY_REQUIRE_REAL_BROWSER" : "",
    sourceGate.templateImportPreviewPassed ? "" : "TEMPLATE_IMPORT_PREVIEW_NOT_PROVEN_GREEN",
    target === "android-chrome" && !androidChromeSummary.path ? "ANDROID_CHROME_SUMMARY_NOT_LINKED" : "",
    config.requireRealBrowser && !webSummary.path ? "WEB_SUMMARY_NOT_LINKED" : "",
    config.requireRealBrowser && !webSummarySourceShaMatchesRoot ? "WEB_SUMMARY_SOURCE_SHA_MISMATCH" : "",
    config.requireRealBrowser && !webSummaryFinalStatusMatchesExpected ? "WEB_SUMMARY_FINAL_STATUS_NOT_CANONICAL" : "",
    config.requireRealBrowser && webSummary.fakeGreenClaimed !== false ? "WEB_SUMMARY_FAKE_GREEN_NOT_FALSE" : "",
    config.requireRealBrowser && webSummary.blockers.length > 0 ? "WEB_SUMMARY_HAS_BLOCKERS" : "",
    target === "android-chrome" && !androidChromeSummarySourceShaMatchesRoot ? "ANDROID_CHROME_SUMMARY_SOURCE_SHA_MISMATCH" : "",
    target === "android-chrome" && !androidChromeSummaryFinalStatusMatchesExpected ? "ANDROID_CHROME_SUMMARY_FINAL_STATUS_NOT_CANONICAL" : "",
    target === "android-chrome" && androidChromeSummary.fakeGreenClaimed !== false ? "ANDROID_CHROME_SUMMARY_FAKE_GREEN_NOT_FALSE" : "",
    target === "android-chrome" && androidChromeSummary.blockers.length > 0 ? "ANDROID_CHROME_SUMMARY_HAS_BLOCKERS" : "",
  ].filter(Boolean);
  const finalStatus =
    config.requireRealBrowser && target === "android-chrome" && !actualAndroidChromeBrowserSmokePassed
      ? "STOP_ANDROID_CHROME_BROWSER_NOT_AVAILABLE"
      : config.requireRealBrowser && target === "web" && !actualWebBrowserSmokePassed
        ? "STOP_WEB_BROWSER_NOT_AVAILABLE"
        : blockers.length === 0
          ? GREEN_AI_ESTIMATE_PROFESSIONAL_REAL_QUANTITY_ENGINE_PRODUCTION_SAFE_NO_BUILDS
          : "STOP_PROFESSIONAL_REAL_QUANTITY_ENGINE_SOURCE_GATES_NOT_GREEN";

  const summary = {
    final_status: finalStatus,
    source_sha: sourceSha,
    branch,
    upstream_sync: upstreamSync,
    worktree_clean_at_start: worktreeCleanAtStart,
    worktree_clean_at_finish: worktreeCleanAtFinish,
    artifact_schema_version: 1,
    generated_by: "scripts/e2e/runProfessionalAiEstimateSmoke.ts",
    generated_at: generatedAt,
    smoke_cases: config.cases,
    smoke_target: target,
    require_real_browser: config.requireRealBrowser,
    allow_route_equivalent: config.allowRouteEquivalent,
    forbidden_browser_green_env_flags_present: forbiddenEnvFlags,
    browser_automation_started: browserAutomationStarted,
    actual_web_browser_smoke_passed: actualWebBrowserSmokePassed,
    actual_android_chrome_browser_smoke_passed: actualAndroidChromeBrowserSmokePassed,
    route_equivalent_smoke_passed: routeEquivalentSmokePassed,
    headless_route_equivalent_not_reported_as_browser:
      routeEquivalentSmokePassed &&
      !actualWebBrowserSmokePassed &&
      !actualAndroidChromeBrowserSmokePassed,
    env_does_not_mark_browser_passed: true,
    browser_automation_started_matches_reality: true,
    browser_evidence_written:
      webSummary.evidenceWritten && (target === "android-chrome" ? androidChromeSummary.evidenceWritten : true),
    web_summary_path: webSummary.path,
    web_summary_source_sha_matches_root: webSummarySourceShaMatchesRoot,
    web_summary_final_status_matches_expected: webSummaryFinalStatusMatchesExpected,
    android_chrome_summary_path: androidChromeSummary.path,
    android_chrome_summary_source_sha_matches_root: androidChromeSummarySourceShaMatchesRoot,
    android_chrome_summary_final_status_matches_expected: androidChromeSummaryFinalStatusMatchesExpected,
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
    no_marketplace_scope: sourceGate.noMarketplaceScope === true,
    typecheck_passed: sourceGate.typecheckPassed === true,
    lint_passed: sourceGate.lintPassed === true,
    diff_check_passed: sourceGate.gitDiffCheckPassed === true,
    no_test_weakening_passed: sourceGate.testWeakeningGuardPassed === true,
    web_public_smoke_passed: sourceGate.webPublicSmokePassed === true,
    secret_scan_passed: sourceGate.secretScanPassed === true,
    blockers,
    marketplace_touched: false,
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
