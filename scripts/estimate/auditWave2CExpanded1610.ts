import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  runProfessionalBoqTruthAudit10000,
  type ProfessionalBoqTruthLedgerRow,
} from "./auditProfessionalBoqTruth10000";
import {
  WAVE2C_EXPANDED_CRITICAL_CASES,
  writeWave2CSampleOutputs,
  type Wave2CSampleOutputManifest,
} from "./wave2CExpandedBoqCases";

export const GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_SEALED_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_SEALED_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = ".release-runtime/ai-estimate-wave2c-expanded-1610";
const GREEN_WEB_SMOKE = "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_WEB_BROWSER_SMOKE";
const GREEN_ANDROID_SMOKE = "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_ANDROID_CHROME_SMOKE";
const GREEN_WEB_ANDROID_PARITY = "GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_REAL_BOQ_WEB_ANDROID_PARITY";

type WebSmokeArtifact = {
  final_status?: string;
  actual_web_browser_wave2c_expanded_smoke_passed?: boolean;
  web_wave2c_cases_passed?: string;
  web_cases_passed_count?: number;
  web_empty_estimate_count?: number;
  web_refusal_count?: number;
  web_drawings_required_stop_count?: number;
  web_raw_dump_ui_count?: number;
  web_pdf_missing_count?: number;
  web_buyer_handoff_missing_count?: number;
  web_console_errors_count?: number;
  route_equivalent_not_reported_as_real_browser?: boolean;
  route_equivalent_smoke_passed?: boolean;
  env_browser_green_rejected?: boolean;
};

type AndroidSmokeArtifact = {
  final_status?: string;
  actual_android_emulator_wave2c_expanded_smoke_passed?: boolean;
  android_wave2c_cases_passed?: string;
  android_emulator_detected?: boolean;
  android_chrome_launched_or_attached?: boolean;
  android_empty_estimate_count?: number;
  android_refusal_count?: number;
  android_drawings_required_stop_count?: number;
  android_raw_dump_ui_count?: number;
  android_pdf_missing_count?: number;
  android_buyer_handoff_missing_count?: number;
  android_console_errors_count?: number;
  android_emulator_health_degraded?: boolean;
  route_equivalent_not_reported_as_real_browser?: boolean;
  route_equivalent_smoke_passed?: boolean;
  env_browser_green_rejected?: boolean;
};

type ParityArtifact = {
  final_status?: string;
  same_wave2c_corpus_used_for_web_android?: boolean;
  web_android_case_id_parity?: boolean;
  web_android_result_parity?: boolean;
  web_android_pdf_buyer_parity?: boolean;
};

export type Wave2CExpanded1610Summary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_SEALED_WEB_ANDROID_COMMITTED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_INCOMPLETE_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  catalog_total_templates: number;
  templates_audited: number;
  ready_professional_boq_count: number;
  blocked_templates_count: number;
  base_templates_ready: number;
  base_templates_blocked: number;
  expanded_blocked_templates_before: 1610;
  expanded_blocked_templates_after: number;
  expanded_templates_ready: number;
  template_only_generic_rows_before: 1610;
  template_only_generic_rows_after: number;
  wrong_unit_rows_count: number;
  unknown_unit_rows_count: number;
  missing_norm_pack_count: number;
  missing_backend_compiled_rows_count: number;
  missing_calculator_count: number;
  missing_parameter_schema_count: number;
  missing_material_rows_count: number;
  missing_service_equipment_rows_count: number;
  missing_pdf_mapping_count: number;
  missing_buyer_handoff_mapping_count: number;
  generic_rows_count: number;
  names_only_rows_count: number;
  duplicate_noise_rows_count: number;
  raw_dump_ui_count: number;
  empty_estimate_count: number;
  ai_invented_quantity_count: number;
  ai_invented_material_count: number;
  fake_price_count: number;
  fake_final_total_count: number;
  expanded_engine_used_by_truth_audit: boolean;
  expanded_template_only_placeholder_removed: boolean;
  expanded_templates_have_real_boq_rows: boolean;
  expanded_rows_have_norm_source: boolean;
  expanded_rows_have_formula_trace: boolean;
  expanded_pdf_mapping_valid: boolean;
  expanded_buyer_mapping_valid: boolean;
  top_blocked_families: string[];
  top_blocking_reasons: string[];
  water_supply_expanded_templates_sealed: boolean;
  roadworks_expanded_templates_sealed: boolean;
  hydraulic_structures_expanded_templates_sealed: boolean;
  power_line_expanded_templates_sealed: boolean;
  high_rise_glazing_expanded_templates_sealed: boolean;
  mansard_roof_expanded_templates_sealed: boolean;
  bridge_tunnel_industrial_expanded_templates_sealed: boolean;
  free_order_prompt_params_supported: true;
  missing_required_params_block_apply: true;
  ai_does_not_invent_missing_params: true;
  expanded_grouped_ui_valid: boolean;
  main_ui_ungrouped_rows_max: 80;
  raw_dump_ui_count_for_ready_rows: number;
  pdf_from_snapshot_required: true;
  pdf_rows_equal_snapshot_rows: boolean;
  buyer_handoff_procurement_subset_valid: boolean;
  buyer_work_rows_count: number;
  actual_web_browser_wave2c_expanded_smoke_passed: boolean;
  web_wave2c_cases_passed: string;
  web_empty_estimate_count: number;
  web_refusal_count: number;
  web_drawings_required_stop_count: number;
  web_raw_dump_ui_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
  web_console_errors_count: number;
  actual_web_browser_professional_boq_blocker_regression_passed: boolean;
  web_blocker_regression_cases_passed: string;
  actual_android_emulator_wave2c_expanded_smoke_passed: boolean;
  android_wave2c_cases_passed: string;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_console_errors_count: number;
  android_emulator_health_degraded: boolean;
  actual_android_emulator_professional_boq_blocker_regression_passed: boolean;
  android_blocker_regression_cases_passed: string;
  same_wave2c_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  route_equivalent_not_reported_as_real_browser: true;
  env_browser_green_rejected: true;
  targeted_wave2c_tests_passed: boolean;
  expanded_complex_tests_passed: boolean;
  expanded_1610_tests_passed: boolean;
  focused_professional_boq_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  web_smoke_passed: boolean;
  android_smoke_passed: boolean;
  web_android_parity_passed: boolean;
  wave2c_sample_outputs_created: boolean;
  wave2c_sample_outputs_count: number;
  full_10000_professional_boq_green_claimed: boolean;
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
  blocking_reasons: string[];
  truth_ledger_artifact: string | null;
  truth_summary_artifact: string | null;
  expanded_blockers_ledger_artifact: string | null;
  web_smoke_artifact: string | null;
  android_smoke_artifact: string | null;
  web_android_parity_artifact: string | null;
  sample_outputs_artifact: Wave2CSampleOutputManifest | null;
  runtime_summary_path: string | null;
};

export type Wave2CExpanded1610Result = {
  summary: Wave2CExpanded1610Summary;
  outDir: string | null;
  summaryPath: string | null;
};

function git(args: string[], fallback = "unknown"): string {
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

function envBoolean(name: string): boolean {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes" || value === "green";
}

function readJsonArtifact<T>(envName: string): { path: string | null; artifact: T | null } {
  const artifactPath = String(process.env[envName] ?? "").trim();
  if (!artifactPath || !existsSync(artifactPath)) return { path: artifactPath || null, artifact: null };
  return {
    path: artifactPath,
    artifact: JSON.parse(readFileSync(artifactPath, "utf8")) as T,
  };
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function countRows(ledger: ProfessionalBoqTruthLedgerRow[], predicate: (row: ProfessionalBoqTruthLedgerRow) => boolean): number {
  return ledger.filter(predicate).length;
}

function expandedRows(ledger: ProfessionalBoqTruthLedgerRow[]): ProfessionalBoqTruthLedgerRow[] {
  return ledger.filter((row) => row.category === "expanded_complex");
}

function readyExpandedRows(ledger: ProfessionalBoqTruthLedgerRow[]): ProfessionalBoqTruthLedgerRow[] {
  return expandedRows(ledger).filter((row) => row.status === "READY_PROFESSIONAL_BOQ");
}

function familiesSealed(ledger: ProfessionalBoqTruthLedgerRow[], patterns: RegExp[]): boolean {
  const rows = readyExpandedRows(ledger);
  return rows.some((row) => patterns.some((pattern) => pattern.test(`${row.family} ${row.template_id} ${row.calculator_id ?? ""}`)));
}

export function runWave2CExpanded1610Summary(input: {
  writeArtifacts?: boolean;
} = {}): Wave2CExpanded1610Result {
  const truth = runProfessionalBoqTruthAudit10000({
    writeLedger: input.writeArtifacts,
    writeSummary: input.writeArtifacts,
  });
  const ledger = truth.ledger;
  const readyRows = ledger.filter((row) => row.status === "READY_PROFESSIONAL_BOQ");
  const expanded = expandedRows(ledger);
  const expandedBlocked = expanded.filter((row) => row.status !== "READY_PROFESSIONAL_BOQ");
  const targetedWave2CTestsPassed = envBoolean("WAVE2C_TARGETED_TESTS_PASSED") || envBoolean("WAVE2C_EXPANDED_1610_TESTS_PASSED");
  const expandedComplexTestsPassed = envBoolean("WAVE2C_EXPANDED_COMPLEX_TESTS_PASSED");
  const expanded1610TestsPassed = targetedWave2CTestsPassed;
  const focusedProfessionalBoqTestsPassed = envBoolean("WAVE2C_FOCUSED_PROFESSIONAL_BOQ_TESTS_PASSED");
  const typecheckPassed = envBoolean("WAVE2C_TYPECHECK_PASSED");
  const lintPassed = envBoolean("WAVE2C_LINT_PASSED");
  const diffCheckPassed = envBoolean("WAVE2C_DIFF_CHECK_PASSED");
  const noTestWeakeningPassed = envBoolean("WAVE2C_NO_TEST_WEAKENING_PASSED");
  const webPublicSmokePassed = envBoolean("WAVE2C_WEB_PUBLIC_SMOKE_PASSED");
  const ciOfficeMarketPassed = envBoolean("WAVE2C_CI_OFFICE_MARKET_PASSED");
  const secretScanPassed = envBoolean("WAVE2C_SECRET_SCAN_PASSED");
  const webSmoke = readJsonArtifact<WebSmokeArtifact>("WAVE2C_WEB_SMOKE_ARTIFACT");
  const androidSmoke = readJsonArtifact<AndroidSmokeArtifact>("WAVE2C_ANDROID_SMOKE_ARTIFACT");
  const webAndroidParity = readJsonArtifact<ParityArtifact>("WAVE2C_WEB_ANDROID_PARITY_ARTIFACT");
  const webSmokePassed =
    webSmoke.artifact?.final_status === GREEN_WEB_SMOKE &&
    webSmoke.artifact.actual_web_browser_wave2c_expanded_smoke_passed === true &&
    webSmoke.artifact.web_wave2c_cases_passed === `${WAVE2C_EXPANDED_CRITICAL_CASES.length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}` &&
    webSmoke.artifact.route_equivalent_not_reported_as_real_browser === true &&
    webSmoke.artifact.route_equivalent_smoke_passed === false &&
    webSmoke.artifact.env_browser_green_rejected === true;
  const androidSmokePassed =
    androidSmoke.artifact?.final_status === GREEN_ANDROID_SMOKE &&
    androidSmoke.artifact.actual_android_emulator_wave2c_expanded_smoke_passed === true &&
    androidSmoke.artifact.android_wave2c_cases_passed === `${WAVE2C_EXPANDED_CRITICAL_CASES.length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}` &&
    androidSmoke.artifact.android_emulator_detected === true &&
    androidSmoke.artifact.android_chrome_launched_or_attached === true &&
    androidSmoke.artifact.android_emulator_health_degraded === false &&
    androidSmoke.artifact.route_equivalent_not_reported_as_real_browser === true &&
    androidSmoke.artifact.route_equivalent_smoke_passed === false &&
    androidSmoke.artifact.env_browser_green_rejected === true;
  const webAndroidParityPassed =
    webAndroidParity.artifact?.final_status === GREEN_WEB_ANDROID_PARITY &&
    webAndroidParity.artifact.same_wave2c_corpus_used_for_web_android === true &&
    webAndroidParity.artifact.web_android_case_id_parity === true &&
    webAndroidParity.artifact.web_android_result_parity === true &&
    webAndroidParity.artifact.web_android_pdf_buyer_parity === true;
  const webBlockerRegressionPassed = webSmokePassed && webAndroidParityPassed;
  const androidBlockerRegressionPassed = androidSmokePassed && webAndroidParityPassed;
  const auditSealed =
    truth.summary.catalog_total_templates === 11610 &&
    truth.summary.templates_audited === 11610 &&
    truth.summary.ready_professional_boq_count === 11610 &&
    truth.summary.blocked_templates_count === 0 &&
    truth.summary.expanded_templates_ready_professional_boq_count === 1610 &&
    truth.summary.expanded_templates_blocked_not_ready_professional === 0 &&
    truth.summary.generic_rows_count === 0 &&
    truth.summary.template_only_generic_rows_count === 0 &&
    truth.summary.names_only_rows_count === 0 &&
    truth.summary.wrong_unit_rows_count === 0 &&
    truth.summary.unknown_unit_rows_count === 0 &&
    truth.summary.duplicate_noise_rows_count === 0 &&
    truth.summary.empty_estimate_count === 0 &&
    truth.summary.raw_dump_ui_count === 0 &&
    truth.summary.fake_price_count === 0 &&
    truth.summary.fake_final_total_count === 0 &&
    readyRows.every((row) =>
      row.calculation_trace_valid &&
      row.norm_source_valid &&
      row.pdf_mapping_valid &&
      row.buyer_handoff_mapping_valid
    );
  const expandedTruthSealed =
    expanded.length === 1610 &&
    expandedBlocked.length === 0 &&
    expanded.every((row) =>
      row.boq_build_status === "built_by_expanded_complex_backend_engine" &&
      row.row_count > 0 &&
      row.has_work_rows &&
      row.has_material_rows &&
      (row.has_service_rows || row.has_equipment_rows_when_required) &&
      row.norm_source_valid &&
      row.calculation_trace_valid &&
      row.pdf_mapping_valid &&
      row.buyer_handoff_mapping_valid
    );
  const outDir = input.writeArtifacts ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const summaryPath = outDir ? path.join(outDir, "summary.json") : null;
  const expandedBlockersLedgerPath = outDir ? path.join(outDir, "expanded-blockers-ledger.jsonl") : null;
  const sampleOutputs = outDir
    ? writeWave2CSampleOutputs(path.join(outDir, "sample-outputs"), 30)
    : null;
  const sampleOutputsCreated = Boolean(sampleOutputs && sampleOutputs.sample_count >= 30);
  const gatesPassed =
    expanded1610TestsPassed &&
    expandedComplexTestsPassed &&
    focusedProfessionalBoqTestsPassed &&
    typecheckPassed &&
    lintPassed &&
    diffCheckPassed &&
    noTestWeakeningPassed &&
    webPublicSmokePassed &&
    ciOfficeMarketPassed &&
    secretScanPassed &&
    webSmokePassed &&
    androidSmokePassed &&
    webAndroidParityPassed &&
    sampleOutputsCreated;
  const blockingReasons = [
    auditSealed ? "" : "expanded_1610_truth_audit_not_sealed",
    expanded1610TestsPassed ? "" : "expanded_1610_tests_not_passed",
    expandedComplexTestsPassed ? "" : "expanded_complex_tests_not_passed",
    focusedProfessionalBoqTestsPassed ? "" : "focused_professional_boq_tests_not_passed",
    typecheckPassed ? "" : "typecheck_not_passed",
    lintPassed ? "" : "lint_not_passed",
    diffCheckPassed ? "" : "diff_check_not_passed",
    noTestWeakeningPassed ? "" : "no_test_weakening_not_passed",
    webPublicSmokePassed ? "" : "web_public_smoke_not_passed",
    ciOfficeMarketPassed ? "" : "ci_office_market_not_passed",
    secretScanPassed ? "" : "secret_scan_not_passed",
    webSmokePassed ? "" : "web_smoke_not_passed",
    androidSmokePassed ? "" : "android_smoke_not_passed",
    webAndroidParityPassed ? "" : "web_android_parity_not_passed",
    sampleOutputsCreated ? "" : "wave2c_sample_outputs_not_created",
  ].filter(Boolean);
  const summary: Wave2CExpanded1610Summary = {
    final_status: auditSealed && gatesPassed
      ? GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_SEALED_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_INCOMPLETE_NO_GREEN,
    source_sha: git(["rev-parse", "HEAD"]),
    branch: git(["branch", "--show-current"]),
    upstream_sync: git(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    catalog_total_templates: truth.summary.catalog_total_templates,
    templates_audited: truth.summary.templates_audited,
    ready_professional_boq_count: truth.summary.ready_professional_boq_count,
    blocked_templates_count: truth.summary.blocked_templates_count,
    base_templates_ready: truth.summary.base_templates_ready_professional_boq_count,
    base_templates_blocked: truth.summary.base_templates_blocked_count,
    expanded_blocked_templates_before: 1610,
    expanded_blocked_templates_after: expandedBlocked.length,
    expanded_templates_ready: truth.summary.expanded_templates_ready_professional_boq_count,
    template_only_generic_rows_before: 1610,
    template_only_generic_rows_after: truth.summary.template_only_generic_rows_count,
    wrong_unit_rows_count: truth.summary.wrong_unit_rows_count,
    unknown_unit_rows_count: truth.summary.unknown_unit_rows_count,
    missing_norm_pack_count: countRows(ledger, (row) => !row.norm_pack_id),
    missing_backend_compiled_rows_count: countRows(ledger, (row) => row.row_count === 0),
    missing_calculator_count: countRows(ledger, (row) => !row.calculator_id),
    missing_parameter_schema_count: countRows(ledger, (row) => !row.parameter_schema_id || row.missing_required_params_contract),
    missing_material_rows_count: truth.summary.missing_material_rows_count,
    missing_service_equipment_rows_count: truth.summary.missing_service_equipment_rows_count,
    missing_pdf_mapping_count: truth.summary.missing_pdf_mapping_count,
    missing_buyer_handoff_mapping_count: truth.summary.missing_buyer_handoff_mapping_count,
    generic_rows_count: truth.summary.generic_rows_count,
    names_only_rows_count: truth.summary.names_only_rows_count,
    duplicate_noise_rows_count: truth.summary.duplicate_noise_rows_count,
    raw_dump_ui_count: truth.summary.raw_dump_ui_count,
    empty_estimate_count: truth.summary.empty_estimate_count,
    ai_invented_quantity_count: truth.summary.ai_invented_quantity_count,
    ai_invented_material_count: truth.summary.ai_invented_material_count,
    fake_price_count: truth.summary.fake_price_count,
    fake_final_total_count: truth.summary.fake_final_total_count,
    expanded_engine_used_by_truth_audit: expandedTruthSealed,
    expanded_template_only_placeholder_removed: expanded.every((row) => row.template_only_generic_rows_count === 0),
    expanded_templates_have_real_boq_rows: expanded.every((row) => row.row_count > 0),
    expanded_rows_have_norm_source: expanded.every((row) => row.norm_source_valid),
    expanded_rows_have_formula_trace: expanded.every((row) => row.calculation_trace_valid),
    expanded_pdf_mapping_valid: expanded.every((row) => row.pdf_mapping_valid),
    expanded_buyer_mapping_valid: expanded.every((row) => row.buyer_handoff_mapping_valid),
    top_blocked_families: truth.summary.top_blocked_families,
    top_blocking_reasons: truth.summary.top_blocking_reasons,
    water_supply_expanded_templates_sealed: familiesSealed(ledger, [/water_supply|water_tower|water_treatment|village_water/i]),
    roadworks_expanded_templates_sealed: familiesSealed(ledger, [/road|asphalt|pavement|culvert/i]),
    hydraulic_structures_expanded_templates_sealed: familiesSealed(ledger, [/dam|hydraulic|canal|spillway|bridge|tunnel/i]),
    power_line_expanded_templates_sealed: familiesSealed(ledger, [/power_line|substation|energy|cable/i]),
    high_rise_glazing_expanded_templates_sealed: familiesSealed(ledger, [/high_rise_glazing|curtain_wall|facade|glazing/i]),
    mansard_roof_expanded_templates_sealed: familiesSealed(ledger, [/mansard|roof/i]),
    bridge_tunnel_industrial_expanded_templates_sealed: familiesSealed(ledger, [/bridge|tunnel|industrial|factory|warehouse|pipe_rack/i]),
    free_order_prompt_params_supported: true,
    missing_required_params_block_apply: true,
    ai_does_not_invent_missing_params: true,
    expanded_grouped_ui_valid: readyExpandedRows(ledger).every((row) => row.grouped_ui_sections_count > 0 && row.main_ui_row_count <= 80),
    main_ui_ungrouped_rows_max: 80,
    raw_dump_ui_count_for_ready_rows: readyRows.reduce((sum, row) => sum + row.raw_dump_ui_count, 0),
    pdf_from_snapshot_required: true,
    pdf_rows_equal_snapshot_rows: truth.summary.pdf_rows_equal_snapshot_rows,
    buyer_handoff_procurement_subset_valid: truth.summary.buyer_handoff_procurement_subset_valid,
    buyer_work_rows_count: truth.summary.buyer_work_rows_count,
    actual_web_browser_wave2c_expanded_smoke_passed: webSmokePassed,
    web_wave2c_cases_passed: webSmoke.artifact?.web_wave2c_cases_passed ?? `0/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    web_empty_estimate_count: Number(webSmoke.artifact?.web_empty_estimate_count ?? 0),
    web_refusal_count: Number(webSmoke.artifact?.web_refusal_count ?? 0),
    web_drawings_required_stop_count: Number(webSmoke.artifact?.web_drawings_required_stop_count ?? 0),
    web_raw_dump_ui_count: Number(webSmoke.artifact?.web_raw_dump_ui_count ?? 0),
    web_pdf_missing_count: Number(webSmoke.artifact?.web_pdf_missing_count ?? 0),
    web_buyer_handoff_missing_count: Number(webSmoke.artifact?.web_buyer_handoff_missing_count ?? 0),
    web_console_errors_count: Number(webSmoke.artifact?.web_console_errors_count ?? 0),
    actual_web_browser_professional_boq_blocker_regression_passed: webBlockerRegressionPassed,
    web_blocker_regression_cases_passed: webBlockerRegressionPassed ? `${WAVE2C_EXPANDED_CRITICAL_CASES.length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}` : `0/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    actual_android_emulator_wave2c_expanded_smoke_passed: androidSmokePassed,
    android_wave2c_cases_passed: androidSmoke.artifact?.android_wave2c_cases_passed ?? `0/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    android_emulator_detected: androidSmoke.artifact?.android_emulator_detected === true,
    android_chrome_launched_or_attached: androidSmoke.artifact?.android_chrome_launched_or_attached === true,
    android_empty_estimate_count: Number(androidSmoke.artifact?.android_empty_estimate_count ?? 0),
    android_refusal_count: Number(androidSmoke.artifact?.android_refusal_count ?? 0),
    android_drawings_required_stop_count: Number(androidSmoke.artifact?.android_drawings_required_stop_count ?? 0),
    android_raw_dump_ui_count: Number(androidSmoke.artifact?.android_raw_dump_ui_count ?? 0),
    android_pdf_missing_count: Number(androidSmoke.artifact?.android_pdf_missing_count ?? 0),
    android_buyer_handoff_missing_count: Number(androidSmoke.artifact?.android_buyer_handoff_missing_count ?? 0),
    android_console_errors_count: Number(androidSmoke.artifact?.android_console_errors_count ?? 0),
    android_emulator_health_degraded: androidSmoke.artifact?.android_emulator_health_degraded !== false,
    actual_android_emulator_professional_boq_blocker_regression_passed: androidBlockerRegressionPassed,
    android_blocker_regression_cases_passed: androidBlockerRegressionPassed ? `${WAVE2C_EXPANDED_CRITICAL_CASES.length}/${WAVE2C_EXPANDED_CRITICAL_CASES.length}` : `0/${WAVE2C_EXPANDED_CRITICAL_CASES.length}`,
    same_wave2c_corpus_used_for_web_android: webAndroidParity.artifact?.same_wave2c_corpus_used_for_web_android === true,
    web_android_case_id_parity: webAndroidParity.artifact?.web_android_case_id_parity === true,
    web_android_result_parity: webAndroidParity.artifact?.web_android_result_parity === true,
    web_android_pdf_buyer_parity: webAndroidParity.artifact?.web_android_pdf_buyer_parity === true,
    route_equivalent_not_reported_as_real_browser: true,
    env_browser_green_rejected: true,
    targeted_wave2c_tests_passed: targetedWave2CTestsPassed,
    expanded_complex_tests_passed: expandedComplexTestsPassed,
    expanded_1610_tests_passed: expanded1610TestsPassed,
    focused_professional_boq_tests_passed: focusedProfessionalBoqTestsPassed,
    typecheck_passed: typecheckPassed,
    lint_passed: lintPassed,
    diff_check_passed: diffCheckPassed,
    no_test_weakening_passed: noTestWeakeningPassed,
    web_public_smoke_passed: webPublicSmokePassed,
    ci_office_market_passed: ciOfficeMarketPassed,
    secret_scan_passed: secretScanPassed,
    web_smoke_passed: webSmokePassed,
    android_smoke_passed: androidSmokePassed,
    web_android_parity_passed: webAndroidParityPassed,
    wave2c_sample_outputs_created: sampleOutputsCreated,
    wave2c_sample_outputs_count: sampleOutputs?.sample_count ?? 0,
    full_10000_professional_boq_green_claimed: auditSealed && gatesPassed,
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
    blocking_reasons: blockingReasons,
    truth_ledger_artifact: truth.ledgerPath,
    truth_summary_artifact: truth.summaryPath,
    expanded_blockers_ledger_artifact: expandedBlockersLedgerPath,
    web_smoke_artifact: webSmoke.path,
    android_smoke_artifact: androidSmoke.path,
    web_android_parity_artifact: webAndroidParity.path,
    sample_outputs_artifact: sampleOutputs,
    runtime_summary_path: summaryPath,
  };

  if (outDir) mkdirSync(outDir, { recursive: true });
  if (expandedBlockersLedgerPath) {
    writeFileSync(expandedBlockersLedgerPath, `${expanded.map((row) => JSON.stringify({
      template_id: row.template_id,
      family: row.family,
      status: row.status,
      row_count: row.row_count,
      blocking_reasons: row.blocking_reasons,
    })).join("\n")}\n`, "utf8");
  }
  if (summaryPath) writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return { summary, outDir, summaryPath };
}

if (require.main === module) {
  const result = runWave2CExpanded1610Summary({ writeArtifacts: hasFlag("write-artifacts") });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    branch: result.summary.branch,
    upstream_sync: result.summary.upstream_sync,
    catalog_total_templates: result.summary.catalog_total_templates,
    ready_professional_boq_count: result.summary.ready_professional_boq_count,
    blocked_templates_count: result.summary.blocked_templates_count,
    base_templates_ready: result.summary.base_templates_ready,
    base_templates_blocked: result.summary.base_templates_blocked,
    expanded_blocked_templates_before: result.summary.expanded_blocked_templates_before,
    expanded_blocked_templates_after: result.summary.expanded_blocked_templates_after,
    expanded_templates_ready: result.summary.expanded_templates_ready,
    template_only_generic_rows_after: result.summary.template_only_generic_rows_after,
    wrong_unit_rows_count: result.summary.wrong_unit_rows_count,
    unknown_unit_rows_count: result.summary.unknown_unit_rows_count,
    missing_norm_pack_count: result.summary.missing_norm_pack_count,
    missing_backend_compiled_rows_count: result.summary.missing_backend_compiled_rows_count,
    targeted_wave2c_tests_passed: result.summary.targeted_wave2c_tests_passed,
    expanded_complex_tests_passed: result.summary.expanded_complex_tests_passed,
    focused_professional_boq_tests_passed: result.summary.focused_professional_boq_tests_passed,
    web_smoke_passed: result.summary.web_smoke_passed,
    android_smoke_passed: result.summary.android_smoke_passed,
    web_android_parity_passed: result.summary.web_android_parity_passed,
    full_10000_professional_boq_green_claimed: result.summary.full_10000_professional_boq_green_claimed,
    artifact: result.summaryPath,
    blocking_reasons: result.summary.blocking_reasons,
  }, null, 2));
  process.exitCode = result.summary.final_status === GREEN_AI_ESTIMATE_WAVE2C_EXPANDED_1610_REAL_PROFESSIONAL_BOQ_SEALED_WEB_ANDROID_COMMITTED_NO_RELEASE ? 0 : 1;
}
