import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE,
  PRODUCTION_GRADE_CRITICAL_CASE_SET,
  STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_INCOMPLETE_NO_GREEN,
} from "./productionGradeLayerSealCore";

const ROOT = path.join(".release-runtime", "ai-estimate-production-grade-layer-seal");
const AUDIT_ROOT = path.join(ROOT, "audit");

type MatrixSummary = {
  source_sha: string;
  production_grade_layer_matrix_created: boolean;
  templates_scanned: number;
  ready_production_grade_technical_count: number;
  blocked_templates_count: number;
  generic_rows_count: number;
  template_only_generic_rows_count: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  empty_estimate_count: number;
  raw_dump_ui_count: number;
  fake_price_count: number;
  fake_final_total_count: number;
  critical_cases_count: number;
  critical_cases_passed: number;
  critical_cases_failed: number;
  request_runtime_verified: boolean;
  grouped_ui_verified: boolean;
  snapshot_verified: boolean;
  pdf_from_snapshot_verified: boolean;
  buyer_handoff_verified: boolean;
  sample_outputs_created: boolean;
  sample_outputs_count: number;
  blocking_reasons: string[];
};

type WebSummary = {
  source_sha: string;
  final_status: string;
  actual_web_browser_production_grade_smoke_passed: boolean;
  web_production_grade_cases_passed: string;
  web_cases_total: number;
  web_cases_passed_count: number;
  web_cases_failed_count: number;
  web_empty_estimate_count: number;
  web_refusal_count: number;
  web_drawings_required_stop_count: number;
  web_raw_dump_ui_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
  web_console_errors_count: number;
  route_equivalent_smoke_passed: false;
  blockers: string[];
};

type AndroidSummary = {
  source_sha: string;
  final_status: string;
  actual_android_emulator_production_grade_smoke_passed: boolean;
  android_production_grade_cases_passed: string;
  android_cases_total: number;
  android_cases_passed_count: number;
  android_cases_failed_count: number;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_console_errors_count: number;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_emulator_health_degraded: boolean;
  route_equivalent_smoke_passed: false;
  env_browser_green_rejected: true;
  blockers: string[];
};

type ParitySummary = {
  source_sha: string;
  final_status: string;
  same_source_sha: boolean;
  same_corpus_used_for_web_and_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  web_cases_passed: string | null;
  android_cases_passed: string | null;
  web_route_equivalent_used: false;
  android_env_only_green_used: false;
  blockers: string[];
};

type BackendLayerSummary = {
  source_sha: string;
  final_status: string;
  backend_layer_verification_created: boolean;
  all_major_families_verified: boolean;
  all_major_families_have_family_pack: boolean;
  all_major_families_have_calculator: boolean;
  all_major_families_have_recipe_pack: boolean;
  all_major_families_have_norm_pack: boolean;
  all_major_families_have_parameter_schema: boolean;
  all_major_families_have_pdf_mapping: boolean;
  all_major_families_have_buyer_mapping: boolean;
  all_major_families_have_golden_cases: boolean;
  blocked_families_count: number;
  blocking_reasons: string[];
};

export type ProductionGradeLayerSealFinalSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_INCOMPLETE_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: typeof PRODUCTION_GRADE_CRITICAL_CASE_SET;
  production_grade_technical_green_claimed: boolean;
  templates_scanned: number;
  ready_production_grade_technical_count: number;
  blocked_templates_count: number;
  critical_cases_passed: string;
  web_cases_passed: string;
  android_cases_passed: string;
  matrix_summary_path: string | null;
  web_summary_path: string | null;
  android_summary_path: string | null;
  parity_summary_path: string | null;
  backend_layer_summary_path: string | null;
  matrix_fresh_for_source_sha: boolean;
  web_fresh_for_source_sha: boolean;
  android_fresh_for_source_sha: boolean;
  parity_fresh_for_source_sha: boolean;
  backend_layer_fresh_for_source_sha: boolean;
  backend_layer_verification_passed: boolean;
  all_major_families_have_family_pack: boolean;
  all_major_families_have_calculator: boolean;
  all_major_families_have_recipe_pack: boolean;
  all_major_families_have_norm_pack: boolean;
  all_major_families_have_parameter_schema: boolean;
  all_major_families_have_pdf_mapping: boolean;
  all_major_families_have_buyer_mapping: boolean;
  production_grade_layer_matrix_created: boolean;
  request_runtime_verified: boolean;
  grouped_ui_verified: boolean;
  snapshot_verified: boolean;
  pdf_from_snapshot_verified: boolean;
  buyer_handoff_verified: boolean;
  actual_web_browser_production_grade_smoke_passed: boolean;
  actual_android_emulator_production_grade_smoke_passed: boolean;
  same_corpus_used_for_web_and_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  generic_rows_count: number;
  template_only_generic_rows_count: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  empty_estimate_count: number;
  raw_dump_ui_count: number;
  fake_price_count: number;
  fake_final_total_count: number;
  web_empty_estimate_count: number;
  web_refusal_count: number;
  web_drawings_required_stop_count: number;
  web_raw_dump_ui_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_emulator_health_degraded: boolean;
  focused_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  sample_outputs_created: boolean;
  sample_outputs_count: number;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  render_staging_started: false;
  owner_go_no_go_started: false;
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
  fake_green_claimed: false;
  blockers: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function envBoolean(name: string): boolean {
  return /^(1|true|yes|green|passed)$/i.test(String(process.env[name] ?? ""));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function walkSummaries(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) files.push(...walkSummaries(fullPath));
    if (stats.isFile() && entry === "summary.json") files.push(fullPath);
  }
  return files;
}

function newestMatching<T>(root: string, predicate: (summary: T) => boolean): { path: string; summary: T } | null {
  const candidates = walkSummaries(root)
    .map((filePath) => ({ filePath, mtimeMs: statSync(filePath).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const candidate of candidates) {
    const summary = readJson<T>(candidate.filePath);
    if (predicate(summary)) return { path: candidate.filePath, summary };
  }
  return null;
}

export function auditProductionGradeEstimateLayerSeal(input: {
  writeSummary?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const matrix = newestMatching<MatrixSummary>(ROOT, (summary) => summary.production_grade_layer_matrix_created === true);
  const web = newestMatching<WebSummary>(path.join(ROOT, "web"), (summary) => summary.web_cases_total === 100);
  const android = newestMatching<AndroidSummary>(path.join(ROOT, "android-chrome"), (summary) => summary.android_cases_total === 100);
  const parity = newestMatching<ParitySummary>(path.join(ROOT, "web-android-parity"), (summary) => summary.final_status != null);
  const backend = newestMatching<BackendLayerSummary>(path.join(ROOT, "backend-layers"), (summary) => summary.backend_layer_verification_created === true);
  const matrixFresh = matrix?.summary.source_sha === sourceSha;
  const webFresh = web?.summary.source_sha === sourceSha;
  const androidFresh = android?.summary.source_sha === sourceSha;
  const parityFresh = parity?.summary.source_sha === sourceSha;
  const backendFresh = backend?.summary.source_sha === sourceSha;
  const focusedTestsPassed = envBoolean("PRODUCTION_GRADE_FOCUSED_TESTS_PASSED");
  const typecheckPassed = envBoolean("PRODUCTION_GRADE_TYPECHECK_PASSED");
  const lintPassed = envBoolean("PRODUCTION_GRADE_LINT_PASSED");
  const diffCheckPassed = envBoolean("PRODUCTION_GRADE_DIFF_CHECK_PASSED");
  const noTestWeakeningPassed = envBoolean("PRODUCTION_GRADE_NO_TEST_WEAKENING_PASSED");
  const webPublicSmokePassed = envBoolean("PRODUCTION_GRADE_WEB_PUBLIC_SMOKE_PASSED");
  const ciOfficeMarketPassed = envBoolean("PRODUCTION_GRADE_CI_OFFICE_MARKET_PASSED");
  const secretScanPassed = envBoolean("PRODUCTION_GRADE_SECRET_SCAN_PASSED");
  const blockers = [
    matrix ? "" : "matrix_summary_missing",
    web ? "" : "web_summary_missing",
    android ? "" : "android_summary_missing",
    parity ? "" : "parity_summary_missing",
    backend ? "" : "backend_layer_summary_missing",
    matrixFresh ? "" : "matrix_summary_stale_or_wrong_source_sha",
    webFresh ? "" : "web_summary_stale_or_wrong_source_sha",
    androidFresh ? "" : "android_summary_stale_or_wrong_source_sha",
    parityFresh ? "" : "parity_summary_stale_or_wrong_source_sha",
    backendFresh ? "" : "backend_layer_summary_stale_or_wrong_source_sha",
    backend?.summary.all_major_families_verified === true ? "" : "backend_major_families_not_verified",
    backend?.summary.blocked_families_count === 0 ? "" : "backend_blocked_families_not_zero",
    matrix?.summary.templates_scanned === 11610 ? "" : "templates_scanned_not_11610",
    matrix?.summary.ready_production_grade_technical_count === 11610 ? "" : "ready_production_grade_technical_not_11610",
    matrix?.summary.blocked_templates_count === 0 ? "" : "blocked_templates_not_zero",
    matrix?.summary.critical_cases_passed === 100 ? "" : "matrix_critical_cases_not_100",
    matrix?.summary.generic_rows_count === 0 ? "" : "generic_rows_not_zero",
    matrix?.summary.template_only_generic_rows_count === 0 ? "" : "template_only_generic_rows_not_zero",
    matrix?.summary.wrong_unit_rows_count === 0 ? "" : "wrong_unit_rows_not_zero",
    matrix?.summary.unknown_unit_rows_count === 0 ? "" : "unknown_unit_rows_not_zero",
    matrix?.summary.empty_estimate_count === 0 ? "" : "empty_estimate_not_zero",
    matrix?.summary.raw_dump_ui_count === 0 ? "" : "raw_dump_ui_not_zero",
    matrix?.summary.fake_price_count === 0 ? "" : "fake_price_not_zero",
    matrix?.summary.fake_final_total_count === 0 ? "" : "fake_final_total_not_zero",
    web?.summary.actual_web_browser_production_grade_smoke_passed === true ? "" : "web_browser_smoke_not_green",
    web?.summary.web_cases_passed_count === 100 ? "" : "web_cases_not_100",
    web?.summary.web_empty_estimate_count === 0 ? "" : "web_empty_estimate_not_zero",
    web?.summary.web_refusal_count === 0 ? "" : "web_refusal_not_zero",
    web?.summary.web_drawings_required_stop_count === 0 ? "" : "web_drawings_stop_not_zero",
    web?.summary.web_raw_dump_ui_count === 0 ? "" : "web_raw_dump_not_zero",
    web?.summary.web_pdf_missing_count === 0 ? "" : "web_pdf_missing_not_zero",
    web?.summary.web_buyer_handoff_missing_count === 0 ? "" : "web_buyer_missing_not_zero",
    android?.summary.actual_android_emulator_production_grade_smoke_passed === true ? "" : "android_emulator_smoke_not_green",
    android?.summary.android_cases_passed_count === 100 ? "" : "android_cases_not_100",
    android?.summary.android_emulator_detected === true ? "" : "android_emulator_not_detected",
    android?.summary.android_chrome_launched_or_attached === true ? "" : "android_chrome_not_launched",
    android?.summary.android_emulator_health_degraded === false ? "" : "android_emulator_health_degraded",
    android?.summary.android_empty_estimate_count === 0 ? "" : "android_empty_estimate_not_zero",
    android?.summary.android_refusal_count === 0 ? "" : "android_refusal_not_zero",
    android?.summary.android_drawings_required_stop_count === 0 ? "" : "android_drawings_stop_not_zero",
    android?.summary.android_raw_dump_ui_count === 0 ? "" : "android_raw_dump_not_zero",
    android?.summary.android_pdf_missing_count === 0 ? "" : "android_pdf_missing_not_zero",
    android?.summary.android_buyer_handoff_missing_count === 0 ? "" : "android_buyer_missing_not_zero",
    parity?.summary.same_source_sha === true ? "" : "parity_source_sha_mismatch",
    parity?.summary.same_corpus_used_for_web_and_android === true ? "" : "parity_corpus_mismatch",
    parity?.summary.web_android_case_id_parity === true ? "" : "parity_case_id_failed",
    parity?.summary.web_android_result_parity === true ? "" : "parity_result_failed",
    parity?.summary.web_android_pdf_buyer_parity === true ? "" : "parity_pdf_buyer_failed",
    parity?.summary.web_route_equivalent_used === false ? "" : "web_route_equivalent_used",
    parity?.summary.android_env_only_green_used === false ? "" : "android_env_only_green_used",
    focusedTestsPassed ? "" : "focused_tests_not_passed",
    typecheckPassed ? "" : "typecheck_not_passed",
    lintPassed ? "" : "lint_not_passed",
    diffCheckPassed ? "" : "diff_check_not_passed",
    noTestWeakeningPassed ? "" : "no_test_weakening_not_passed",
    webPublicSmokePassed ? "" : "web_public_smoke_not_passed",
    ciOfficeMarketPassed ? "" : "ci_office_market_not_passed",
    secretScanPassed ? "" : "secret_scan_not_passed",
    matrix?.summary.sample_outputs_created === true && (matrix?.summary.sample_outputs_count ?? 0) >= 25 ? "" : "sample_outputs_not_created",
    ...(matrix?.summary.blocking_reasons.map((blocker) => `matrix:${blocker}`) ?? []),
    ...(web?.summary.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(android?.summary.blockers.map((blocker) => `android:${blocker}`) ?? []),
    ...(parity?.summary.blockers.map((blocker) => `parity:${blocker}`) ?? []),
    ...(backend?.summary.blocking_reasons.map((blocker) => `backend:${blocker}`) ?? []),
  ].filter(Boolean);
  const green = blockers.length === 0;
  const summary: ProductionGradeLayerSealFinalSummary = {
    final_status: green
      ? GREEN_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_PRODUCTION_GRADE_LAYER_SEAL_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: PRODUCTION_GRADE_CRITICAL_CASE_SET,
    production_grade_technical_green_claimed: green,
    templates_scanned: matrix?.summary.templates_scanned ?? 0,
    ready_production_grade_technical_count: matrix?.summary.ready_production_grade_technical_count ?? 0,
    blocked_templates_count: matrix?.summary.blocked_templates_count ?? -1,
    critical_cases_passed: `${matrix?.summary.critical_cases_passed ?? 0}/${matrix?.summary.critical_cases_count ?? 100}`,
    web_cases_passed: web?.summary.web_production_grade_cases_passed ?? "0/100",
    android_cases_passed: android?.summary.android_production_grade_cases_passed ?? "0/100",
    matrix_summary_path: matrix?.path ?? null,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    parity_summary_path: parity?.path ?? null,
    backend_layer_summary_path: backend?.path ?? null,
    matrix_fresh_for_source_sha: matrixFresh,
    web_fresh_for_source_sha: webFresh,
    android_fresh_for_source_sha: androidFresh,
    parity_fresh_for_source_sha: parityFresh,
    backend_layer_fresh_for_source_sha: backendFresh,
    backend_layer_verification_passed: backendFresh && backend?.summary.all_major_families_verified === true,
    all_major_families_have_family_pack: backend?.summary.all_major_families_have_family_pack === true,
    all_major_families_have_calculator: backend?.summary.all_major_families_have_calculator === true,
    all_major_families_have_recipe_pack: backend?.summary.all_major_families_have_recipe_pack === true,
    all_major_families_have_norm_pack: backend?.summary.all_major_families_have_norm_pack === true,
    all_major_families_have_parameter_schema: backend?.summary.all_major_families_have_parameter_schema === true,
    all_major_families_have_pdf_mapping: backend?.summary.all_major_families_have_pdf_mapping === true,
    all_major_families_have_buyer_mapping: backend?.summary.all_major_families_have_buyer_mapping === true,
    production_grade_layer_matrix_created: matrix?.summary.production_grade_layer_matrix_created === true,
    request_runtime_verified: matrix?.summary.request_runtime_verified === true,
    grouped_ui_verified: matrix?.summary.grouped_ui_verified === true,
    snapshot_verified: matrix?.summary.snapshot_verified === true,
    pdf_from_snapshot_verified: matrix?.summary.pdf_from_snapshot_verified === true,
    buyer_handoff_verified: matrix?.summary.buyer_handoff_verified === true,
    actual_web_browser_production_grade_smoke_passed: web?.summary.actual_web_browser_production_grade_smoke_passed === true,
    actual_android_emulator_production_grade_smoke_passed: android?.summary.actual_android_emulator_production_grade_smoke_passed === true,
    same_corpus_used_for_web_and_android: parity?.summary.same_corpus_used_for_web_and_android === true,
    web_android_case_id_parity: parity?.summary.web_android_case_id_parity === true,
    web_android_result_parity: parity?.summary.web_android_result_parity === true,
    web_android_pdf_buyer_parity: parity?.summary.web_android_pdf_buyer_parity === true,
    generic_rows_count: matrix?.summary.generic_rows_count ?? -1,
    template_only_generic_rows_count: matrix?.summary.template_only_generic_rows_count ?? -1,
    wrong_unit_rows_count: matrix?.summary.wrong_unit_rows_count ?? -1,
    unknown_unit_rows_count: matrix?.summary.unknown_unit_rows_count ?? -1,
    empty_estimate_count: matrix?.summary.empty_estimate_count ?? -1,
    raw_dump_ui_count: matrix?.summary.raw_dump_ui_count ?? -1,
    fake_price_count: matrix?.summary.fake_price_count ?? -1,
    fake_final_total_count: matrix?.summary.fake_final_total_count ?? -1,
    web_empty_estimate_count: web?.summary.web_empty_estimate_count ?? -1,
    web_refusal_count: web?.summary.web_refusal_count ?? -1,
    web_drawings_required_stop_count: web?.summary.web_drawings_required_stop_count ?? -1,
    web_raw_dump_ui_count: web?.summary.web_raw_dump_ui_count ?? -1,
    web_pdf_missing_count: web?.summary.web_pdf_missing_count ?? -1,
    web_buyer_handoff_missing_count: web?.summary.web_buyer_handoff_missing_count ?? -1,
    android_empty_estimate_count: android?.summary.android_empty_estimate_count ?? -1,
    android_refusal_count: android?.summary.android_refusal_count ?? -1,
    android_drawings_required_stop_count: android?.summary.android_drawings_required_stop_count ?? -1,
    android_raw_dump_ui_count: android?.summary.android_raw_dump_ui_count ?? -1,
    android_pdf_missing_count: android?.summary.android_pdf_missing_count ?? -1,
    android_buyer_handoff_missing_count: android?.summary.android_buyer_handoff_missing_count ?? -1,
    android_emulator_detected: android?.summary.android_emulator_detected === true,
    android_chrome_launched_or_attached: android?.summary.android_chrome_launched_or_attached === true,
    android_emulator_health_degraded: android?.summary.android_emulator_health_degraded ?? true,
    focused_tests_passed: focusedTestsPassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    diff_check_passed: diffCheckPassed,
    no_test_weakening_passed: noTestWeakeningPassed,
    web_public_smoke_passed: webPublicSmokePassed,
    ci_office_market_passed: ciOfficeMarketPassed,
    secret_scan_passed: secretScanPassed,
    sample_outputs_created: matrix?.summary.sample_outputs_created === true,
    sample_outputs_count: matrix?.summary.sample_outputs_count ?? 0,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    render_staging_started: false,
    owner_go_no_go_started: false,
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
    fake_green_claimed: false,
    blockers,
  };
  const outDir = path.join(AUDIT_ROOT, timestampForPath());
  const artifactPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(artifactPath, summary);
  return { artifactPath, artifact: summary };
}

if (require.main === module) {
  const result = auditProductionGradeEstimateLayerSeal({ writeSummary: !hasFlag("no-write-summary") });
  console.log(JSON.stringify({
    final_status: result.artifact.final_status,
    production_grade_technical_green_claimed: result.artifact.production_grade_technical_green_claimed,
    templates_scanned: result.artifact.templates_scanned,
    ready_production_grade_technical_count: result.artifact.ready_production_grade_technical_count,
    web_cases_passed: result.artifact.web_cases_passed,
    android_cases_passed: result.artifact.android_cases_passed,
    blockers: result.artifact.blockers.slice(0, 30),
    artifact: result.artifactPath,
  }, null, 2));
  if (result.artifact.blockers.length > 0) process.exitCode = 1;
}
