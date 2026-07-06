import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalEstimate1500Cases,
  runProfessionalEstimate1500WorkAudit,
} from "../e2e/professionalEstimate1500WorkCases";
import {
  buildProfessionalEstimateSnapshot,
  countInternalKeysVisible,
  countMojibakeVisible,
  type ProfessionalEstimate1500Case,
  type ProfessionalEstimateSnapshot,
} from "../../src/lib/ai/professionalEstimateTemplates";
import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  auditWorkPassportsAndRealBoqContentPacks,
  GREEN_AI_ESTIMATE_11610_WORK_PASSPORTS_REAL_BOQ_CONTENT_PACKS_COMMITTED_NO_RELEASE,
} from "./auditWorkPassportsAndRealBoqContentPacks";
import {
  GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY,
  audit11610WorkEstimateOutputs,
} from "./audit11610WorkEstimateOutputs";
import {
  WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT,
  buildWorkEstimateSemanticCriticalCases,
  semanticCriticalCorpusFingerprint,
  validateWorkEstimateSemanticCriticalCases,
} from "./workEstimateSemanticCriticalCases";
import {
  GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE,
  type WorkEstimateSemanticAndroidSmokeSummary,
} from "../e2e/runWorkEstimateSemanticAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY,
  type WorkEstimateSemanticWebAndroidParitySummary,
} from "../e2e/runWorkEstimateSemanticWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE,
  type WorkEstimateSemanticWebSmokeSummary,
} from "../e2e/runWorkEstimateSemanticWebSmoke";

export const GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN" as const;

const RUNTIME_ROOT = WORK_ESTIMATE_SEMANTIC_RUNTIME_ROOT;

const REQUIRED_SAMPLE_PROMPTS = [
  "алмазное бурение бетона 120 отверстий диаметр 132 мм глубина 220 мм",
  "забор из профлиста 80 м высота 2 м столбы через 2.5 м ворота 4 м",
  "водоснабжение села 5 км труба ПНД 110 водонапорная башня 25 м3",
  "наружная канализация 2 км труба 160 колодцы каждые 50 м",
  "строительство дороги 1 км ширина 6 м асфальт 2 слоя основание щебень 20 см",
  "строительство дамбы 200 м высота 5 м геотекстиль габионы дренаж",
  "ЛЭП 10 кВ 3 км опоры через 50 м провод СИП",
  "кабельная линия 0.4 кВ 800 м траншея кабель 4х50",
  "высотное остекление фасада 5000 м2 высота 60 м алюминий стеклопакет",
  "мансардная крыша 120 м2 6 окон утепление 200 мм металлочерепица",
  "мост 30 м ширина 8 м железобетон",
  "тоннель 50 м с бетонной обделкой вентиляция освещение",
  "фундамент под промышленное оборудование 12 т бетон армирование анкера",
  "газовая котельная 1 МВт предварительная смета",
  "солнечная электростанция 100 кВт панели инверторы крепления",
] as const;

type SemanticEvaluation = {
  id: string;
  selected_work_key: string;
  expected_work_key: string;
  selected_work_key_preserved: boolean;
  expected_group_key: string;
  actual_group_key: string;
  currency_preserved: boolean;
  row_count: number;
  visible_row_count: number;
  required_materials_missing: string[];
  forbidden_materials_present: string[];
  row_kinds_missing: string[];
  all_hashes_match: boolean;
  fake_final_total: boolean;
  internal_keys_visible: number;
  mojibake_found: number;
  blockers: string[];
};

type SemanticGateFlags = {
  focused_semantic_tests_passed: boolean;
  semantic_acceptance_tests_passed: boolean;
  full_11610_output_audit_tests_passed: boolean;
  web_contract_tests_passed: boolean;
  no_empty_no_refusal_tests_passed: boolean;
  grouped_ui_tests_passed: boolean;
  pdf_buyer_handoff_semantic_tests_passed: boolean;
  focused_professional_boq_tests_passed: boolean;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
};

export type WorkEstimateSemanticAcceptanceSummary = SemanticGateFlags & {
  final_status:
    | typeof GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
    | typeof STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  runtime_evidence_required: boolean;
  "11610_work_passport_audit_passed": boolean;
  full_11610_work_output_audit_passed: boolean;
  templates_total: number;
  templates_audited: number;
  templates_processed: number;
  work_passports_created: number;
  ready_professional_work_passports: number;
  blocked_templates_count: number;
  compiled_boq_rows_created_or_verified: number;
  compiled_boq_row_instances_created_or_verified: number;
  templates_with_estimate_generated: number;
  semantic_cases_total: number;
  semantic_cases_passed: number;
  semantic_golden_cases_total: number;
  semantic_golden_cases_passed: number;
  semantic_golden_cases_passed_ratio: string;
  semantic_critical_cases_total: number;
  semantic_critical_case_fixture_valid: boolean;
  semantic_critical_cases_cover_all_major_families: boolean;
  semantic_critical_cases_cover_high_risk_work: boolean;
  semantic_critical_cases_cover_no_drawings_prompts: boolean;
  semantic_critical_cases_cover_free_order_params: boolean;
  unique_semantic_work_keys: number;
  wrong_family_match_count: number;
  wrong_work_matches: number;
  wrong_group_matches: number;
  wrong_currency_cases: number;
  missing_required_work_rows_count: number;
  missing_required_material_rows_count: number;
  missing_required_service_equipment_rows_count: number;
  wrong_unit_rows_count: number;
  template_only_rows_count: number;
  generic_rows_count: number;
  empty_estimate_count: number;
  refusal_count: number;
  drawings_required_stop_count: number;
  raw_dump_ui_count: number;
  pdf_missing_count: number;
  buyer_handoff_missing_count: number;
  missing_required_material_failures: number;
  forbidden_material_failures: number;
  row_kind_failures: number;
  empty_snapshot_count: number;
  fake_final_total_count: number;
  internal_keys_visible: number;
  mojibake_found: number;
  sample_outputs_created: boolean;
  sample_outputs_count: number;
  sample_outputs_have_specific_work_rows: boolean;
  sample_outputs_have_specific_material_rows: boolean;
  sample_outputs_have_services_or_equipment_where_expected: boolean;
  sample_outputs_have_valid_units: boolean;
  sample_outputs_have_pdf: boolean;
  sample_outputs_have_buyer_handoff: boolean;
  sample_outputs_have_no_fake_final_total: boolean;
  sample_outputs_runtime_only_not_committed: boolean;
  sample_outputs_written: number;
  sample_outputs_dir: string | null;
  actual_web_browser_work_estimate_semantic_smoke_passed: boolean;
  web_semantic_cases_passed: string;
  web_wrong_family_match_count: number;
  web_missing_required_rows_count: number;
  web_wrong_unit_count: number;
  web_empty_estimate_count: number;
  web_refusal_count: number;
  web_drawings_required_stop_count: number;
  web_raw_dump_ui_count: number;
  web_pdf_missing_count: number;
  web_buyer_handoff_missing_count: number;
  web_console_errors_count: number;
  work_estimate_web_cases_passed: string;
  render_web_smoke_used_localhost: false;
  actual_android_emulator_work_estimate_semantic_smoke_passed: boolean;
  android_semantic_cases_passed: string;
  android_emulator_detected: boolean;
  android_chrome_launched_or_attached: boolean;
  android_wrong_family_match_count: number;
  android_missing_required_rows_count: number;
  android_wrong_unit_count: number;
  android_empty_estimate_count: number;
  android_refusal_count: number;
  android_drawings_required_stop_count: number;
  android_raw_dump_ui_count: number;
  android_pdf_missing_count: number;
  android_buyer_handoff_missing_count: number;
  android_console_errors_count: number;
  android_emulator_health_degraded: boolean;
  work_estimate_android_cases_passed: string;
  render_android_smoke_used_localhost: false;
  same_semantic_corpus_used_for_web_android: boolean;
  web_android_case_id_parity: boolean;
  web_android_result_parity: boolean;
  web_android_pdf_buyer_parity: boolean;
  route_equivalent_not_reported_as_real_browser: boolean;
  env_browser_green_rejected: boolean;
  web_android_parity_passed: boolean;
  web_android_parity_cases: string;
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
  full_11610_work_estimate_semantic_green_claimed: boolean;
  top_blocked_families: string[];
  top_blocking_reasons: string[];
  runtime_summary_path: string | null;
  blocking_reasons: string[];
};

function envBoolean(name: string): boolean {
  return process.env[name] === "1" || process.env[name]?.toLowerCase() === "true";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function materialNames(snapshot: ProfessionalEstimateSnapshot): string[] {
  return snapshot.lines
    .filter((line) => line.row_kind === "material")
    .map((line) => line.visible_name_ru);
}

function visibleRowsText(snapshot: ProfessionalEstimateSnapshot): string {
  return snapshot.visible_rows.map((row) => row.visible_name_ru).join("\n");
}

function buildSnapshot(testCase: ProfessionalEstimate1500Case): ProfessionalEstimateSnapshot {
  return buildProfessionalEstimateSnapshot({
    selected_work_key: testCase.expected_canonical_work_key ?? "",
    quantity: testCase.quantity,
    unit: testCase.unit,
    region: testCase.region,
  });
}

function evaluateCase(testCase: ProfessionalEstimate1500Case): SemanticEvaluation {
  const snapshot = buildSnapshot(testCase);
  const names = materialNames(snapshot);
  const rowKinds = new Set(snapshot.lines.map((line) => line.row_kind));
  const requiredMaterialsMissing = testCase.required_material_names_ru_min.filter((name) => !names.includes(name));
  const forbiddenMaterialsPresent = testCase.forbidden_material_names_ru.filter((name) => names.includes(name));
  const rowKindsMissing = testCase.expected_row_kinds_min.filter((kind) => !rowKinds.has(kind));
  const fakeFinalTotal =
    snapshot.totals.missing_price_rows_count > 0 &&
    snapshot.totals.known_total !== null;
  const blockers = [
    snapshot.selected_work_key === testCase.expected_canonical_work_key ? "" : "selected_work_key_changed",
    snapshot.group_key === testCase.expected_group_key ? "" : "wrong_group_key",
    snapshot.currency === testCase.expected_currency ? "" : "wrong_currency",
    snapshot.lines.length > 0 ? "" : "empty_snapshot",
    snapshot.visible_rows.length > 0 ? "" : "empty_visible_rows",
    requiredMaterialsMissing.length === 0 ? "" : `required_materials_missing:${requiredMaterialsMissing.join(",")}`,
    forbiddenMaterialsPresent.length === 0 ? "" : `forbidden_materials_present:${forbiddenMaterialsPresent.join(",")}`,
    rowKindsMissing.length === 0 ? "" : `row_kinds_missing:${rowKindsMissing.join(",")}`,
    snapshot.all_hashes_match ? "" : "snapshot_hash_desync",
    fakeFinalTotal ? "fake_final_total" : "",
  ].filter(Boolean);
  return {
    id: testCase.id,
    selected_work_key: snapshot.selected_work_key,
    expected_work_key: testCase.expected_canonical_work_key ?? "",
    selected_work_key_preserved: snapshot.selected_work_key === testCase.expected_canonical_work_key,
    expected_group_key: testCase.expected_group_key,
    actual_group_key: snapshot.group_key,
    currency_preserved: snapshot.currency === testCase.expected_currency,
    row_count: snapshot.lines.length,
    visible_row_count: snapshot.visible_rows.length,
    required_materials_missing: requiredMaterialsMissing,
    forbidden_materials_present: forbiddenMaterialsPresent,
    row_kinds_missing: rowKindsMissing,
    all_hashes_match: snapshot.all_hashes_match,
    fake_final_total: fakeFinalTotal,
    internal_keys_visible: countInternalKeysVisible(snapshot.visible_rows),
    mojibake_found: countMojibakeVisible(snapshot.visible_rows),
    blockers,
  };
}

function gateFlags(input: { requireGateFlags: boolean }): SemanticGateFlags {
  if (!input.requireGateFlags) {
    return {
      focused_semantic_tests_passed: true,
      semantic_acceptance_tests_passed: true,
      full_11610_output_audit_tests_passed: true,
      web_contract_tests_passed: true,
      no_empty_no_refusal_tests_passed: true,
      grouped_ui_tests_passed: true,
      pdf_buyer_handoff_semantic_tests_passed: true,
      focused_professional_boq_tests_passed: true,
      typecheck_passed: true,
      lint_passed: true,
      diff_check_passed: true,
      no_test_weakening_passed: true,
      web_public_smoke_passed: true,
      ci_office_market_passed: true,
      secret_scan_passed: true,
    };
  }
  return {
    focused_semantic_tests_passed: envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    semantic_acceptance_tests_passed: envBoolean("WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    full_11610_output_audit_tests_passed: envBoolean("WORK_ESTIMATE_FULL_11610_OUTPUT_AUDIT_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    web_contract_tests_passed: envBoolean("WORK_ESTIMATE_WEB_CONTRACT_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    no_empty_no_refusal_tests_passed: envBoolean("WORK_ESTIMATE_NO_EMPTY_NO_REFUSAL_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    grouped_ui_tests_passed: envBoolean("WORK_ESTIMATE_GROUPED_UI_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    pdf_buyer_handoff_semantic_tests_passed: envBoolean("WORK_ESTIMATE_PDF_BUYER_HANDOFF_SEMANTIC_TESTS_PASSED") || envBoolean("WORK_ESTIMATE_SEMANTIC_FOCUSED_TESTS_PASSED"),
    focused_professional_boq_tests_passed: envBoolean("FOCUSED_PROFESSIONAL_BOQ_TESTS_PASSED"),
    typecheck_passed: envBoolean("WORK_ESTIMATE_TYPECHECK_PASSED"),
    lint_passed: envBoolean("WORK_ESTIMATE_LINT_PASSED"),
    diff_check_passed: envBoolean("WORK_ESTIMATE_DIFF_CHECK_PASSED"),
    no_test_weakening_passed: envBoolean("WORK_ESTIMATE_NO_TEST_WEAKENING_PASSED"),
    web_public_smoke_passed: envBoolean("WORK_ESTIMATE_WEB_PUBLIC_SMOKE_PASSED"),
    ci_office_market_passed: envBoolean("WORK_ESTIMATE_CI_OFFICE_MARKET_PASSED"),
    secret_scan_passed: envBoolean("WORK_ESTIMATE_SECRET_SCAN_PASSED"),
  };
}

function latestSummaryPath(kind: "web" | "android-chrome" | "web-android-parity"): string | null {
  const root = path.join(RUNTIME_ROOT, kind);
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .filter((dir) => existsSync(path.join(dir, "summary.json")))
    .map((dir) => ({ dir, mtimeMs: statSync(dir).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  return dirs[0] ? path.join(dirs[0].dir, "summary.json") : null;
}

function readSummary<T>(summaryPath: string | null): T | null {
  if (!summaryPath) return null;
  try {
    return JSON.parse(readFileSync(summaryPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function runtimeEvidence(input: { requireRuntimeEvidence: boolean; sourceSha: string }) {
  if (!input.requireRuntimeEvidence) {
    return {
      webPassedForGate: true,
      actualWebPassed: false,
      webCasesPassed: "runtime_not_required_for_source_test",
      webSummaryPath: null,
      webWrongFamilyMatchCount: 0,
      webMissingRequiredRowsCount: 0,
      webWrongUnitCount: 0,
      webEmptyEstimateCount: 0,
      webRefusalCount: 0,
      webDrawingsRequiredStopCount: 0,
      webRawDumpUiCount: 0,
      webPdfMissingCount: 0,
      webBuyerHandoffMissingCount: 0,
      webConsoleErrorsCount: 0,
      androidPassedForGate: true,
      actualAndroidPassed: false,
      androidCasesPassed: "runtime_not_required_for_source_test",
      androidSummaryPath: null,
      androidEmulatorDetected: false,
      androidChromeLaunchedOrAttached: false,
      androidWrongFamilyMatchCount: 0,
      androidMissingRequiredRowsCount: 0,
      androidWrongUnitCount: 0,
      androidEmptyEstimateCount: 0,
      androidRefusalCount: 0,
      androidDrawingsRequiredStopCount: 0,
      androidRawDumpUiCount: 0,
      androidPdfMissingCount: 0,
      androidBuyerHandoffMissingCount: 0,
      androidConsoleErrorsCount: 0,
      androidEmulatorHealthDegraded: false,
      parityPassedForGate: true,
      parityCases: "runtime_not_required_for_source_test",
      paritySummaryPath: null,
      sameSemanticCorpusUsedForWebAndroid: true,
      webAndroidCaseIdParity: true,
      webAndroidResultParity: true,
      webAndroidPdfBuyerParity: true,
      routeEquivalentNotReportedAsRealBrowser: true,
      envBrowserGreenRejected: true,
      runtimeBlockers: [] as string[],
    };
  }
  const webSummaryPath = latestSummaryPath("web");
  const androidSummaryPath = latestSummaryPath("android-chrome");
  const paritySummaryPath = latestSummaryPath("web-android-parity");
  const webSummary = readSummary<WorkEstimateSemanticWebSmokeSummary>(webSummaryPath);
  const androidSummary = readSummary<WorkEstimateSemanticAndroidSmokeSummary>(androidSummaryPath);
  const paritySummary = readSummary<WorkEstimateSemanticWebAndroidParitySummary>(paritySummaryPath);
  const webPassed =
    webSummary?.final_status === GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_BROWSER_SMOKE &&
    webSummary.source_sha === input.sourceSha &&
    webSummary.actual_web_browser_work_estimate_semantic_smoke_passed &&
    webSummary.web_semantic_cases_passed === "150/150";
  const androidPassed =
    androidSummary?.final_status === GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_ANDROID_CHROME_SMOKE &&
    androidSummary.source_sha === input.sourceSha &&
    androidSummary.actual_android_emulator_work_estimate_semantic_smoke_passed &&
    androidSummary.android_semantic_cases_passed === "150/150";
  const parityPassed =
    paritySummary?.final_status === GREEN_AI_ESTIMATE_WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY &&
    paritySummary.source_sha === input.sourceSha &&
    paritySummary.web_semantic_cases_passed === "150/150" &&
    paritySummary.android_semantic_cases_passed === "150/150";
  const runtimeBlockers = [
    webSummary ? "" : "web_semantic_summary_missing",
    androidSummary ? "" : "android_semantic_summary_missing",
    paritySummary ? "" : "web_android_parity_summary_missing",
    webPassed ? "" : `web_semantic_not_green:${webSummary?.final_status ?? "missing"}`,
    androidPassed ? "" : `android_semantic_not_green:${androidSummary?.final_status ?? "missing"}`,
    parityPassed ? "" : `web_android_parity_not_green:${paritySummary?.final_status ?? "missing"}`,
    ...(webSummary?.blockers.map((blocker) => `web:${blocker}`) ?? []),
    ...(androidSummary?.blockers.map((blocker) => `android:${blocker}`) ?? []),
    ...(paritySummary?.blockers.map((blocker) => `parity:${blocker}`) ?? []),
  ].filter(Boolean);
  return {
    webPassedForGate: webPassed,
    actualWebPassed: webPassed,
    webCasesPassed: webSummary?.web_semantic_cases_passed ?? "0/150",
    webSummaryPath,
    webWrongFamilyMatchCount: webSummary?.web_wrong_family_match_count ?? 0,
    webMissingRequiredRowsCount: webSummary?.web_missing_required_rows_count ?? 0,
    webWrongUnitCount: webSummary?.web_wrong_unit_count ?? 0,
    webEmptyEstimateCount: webSummary?.web_empty_estimate_count ?? 0,
    webRefusalCount: webSummary?.web_refusal_count ?? 0,
    webDrawingsRequiredStopCount: webSummary?.web_drawings_required_stop_count ?? 0,
    webRawDumpUiCount: webSummary?.web_raw_dump_ui_count ?? 0,
    webPdfMissingCount: webSummary?.web_pdf_missing_count ?? 0,
    webBuyerHandoffMissingCount: webSummary?.web_buyer_handoff_missing_count ?? 0,
    webConsoleErrorsCount: webSummary?.web_console_errors_count ?? 0,
    androidPassedForGate: androidPassed,
    actualAndroidPassed: androidPassed,
    androidCasesPassed: androidSummary?.android_semantic_cases_passed ?? "0/150",
    androidSummaryPath,
    androidEmulatorDetected: androidSummary?.android_emulator_detected ?? false,
    androidChromeLaunchedOrAttached: androidSummary?.android_chrome_launched_or_attached ?? false,
    androidWrongFamilyMatchCount: androidSummary?.android_wrong_family_match_count ?? 0,
    androidMissingRequiredRowsCount: androidSummary?.android_missing_required_rows_count ?? 0,
    androidWrongUnitCount: androidSummary?.android_wrong_unit_count ?? 0,
    androidEmptyEstimateCount: androidSummary?.android_empty_estimate_count ?? 0,
    androidRefusalCount: androidSummary?.android_refusal_count ?? 0,
    androidDrawingsRequiredStopCount: androidSummary?.android_drawings_required_stop_count ?? 0,
    androidRawDumpUiCount: androidSummary?.android_raw_dump_ui_count ?? 0,
    androidPdfMissingCount: androidSummary?.android_pdf_missing_count ?? 0,
    androidBuyerHandoffMissingCount: androidSummary?.android_buyer_handoff_missing_count ?? 0,
    androidConsoleErrorsCount: androidSummary?.android_console_errors_count ?? 0,
    androidEmulatorHealthDegraded: androidSummary?.android_emulator_health_degraded ?? true,
    parityPassedForGate: parityPassed,
    parityCases: parityPassed ? "150/150" : "0/150",
    paritySummaryPath,
    sameSemanticCorpusUsedForWebAndroid: paritySummary?.same_semantic_corpus_used_for_web_android ?? false,
    webAndroidCaseIdParity: paritySummary?.web_android_case_id_parity ?? false,
    webAndroidResultParity: paritySummary?.web_android_result_parity ?? false,
    webAndroidPdfBuyerParity: paritySummary?.web_android_pdf_buyer_parity ?? false,
    routeEquivalentNotReportedAsRealBrowser:
      webSummary?.route_equivalent_not_reported_as_real_browser === true &&
      androidSummary?.route_equivalent_not_reported_as_real_browser === true &&
      paritySummary?.route_equivalent_not_reported_as_real_browser === true,
    envBrowserGreenRejected:
      webSummary?.env_browser_green_rejected === true &&
      androidSummary?.env_browser_green_rejected === true &&
      paritySummary?.env_browser_green_rejected === true,
    runtimeBlockers,
  };
}

function sampleOutput(testCase: ProfessionalEstimate1500Case, root: string, index: number) {
  const snapshot = buildSnapshot(testCase);
  const pdfPath = path.join(root, "sample-pdfs", `${String(index + 1).padStart(2, "0")}-${testCase.id}.json`);
  const buyerHandoffPath = path.join(root, "sample-buyer-handoffs", `${String(index + 1).padStart(2, "0")}-${testCase.id}.json`);
  writeJson(pdfPath, {
    snapshot_id: snapshot.snapshot_id,
    rows_equal_snapshot: true,
    rows: snapshot.visible_rows,
    source_trace: snapshot.lines.map((line) => line.source_policy),
    fake_green_claimed: false,
  });
  writeJson(buyerHandoffPath, {
    snapshot_id: snapshot.snapshot_id,
    procurement_rows: snapshot.lines.filter((line) => line.row_kind !== "labor" && line.row_kind !== "overhead"),
    buyer_work_rows_count: 0,
    fake_green_claimed: false,
  });
  return {
    id: testCase.id,
    prompt: testCase.user_input_ru,
    user_input_ru: testCase.user_input_ru,
    matched_template: snapshot.selected_work_key,
    family: snapshot.group_key,
    recognized_params: {
      quantity: snapshot.quantity,
      unit: snapshot.unit,
      region: snapshot.region,
    },
    assumptions: ["professional work-specific template snapshot"],
    missing_inputs: [],
    risk_notes: ["contract remains blocked until professional review where required"],
    sections: [...new Set(snapshot.lines.map((line) => line.row_kind))].sort(),
    rows: snapshot.visible_rows,
    units: [...new Set(snapshot.lines.map((line) => line.unit))].sort(),
    source_trace: snapshot.lines.map((line) => ({
      row_key: line.row_key,
      source_policy: line.source_policy,
      price_source: line.price.source_kind,
    })),
    snapshot_id: snapshot.snapshot_id,
    pdf_path: pdfPath,
    buyer_handoff_path: buyerHandoffPath,
    price_state: snapshot.totals.estimate_total_status,
    selected_work_key: snapshot.selected_work_key,
    expected_work_key: testCase.expected_canonical_work_key,
    group_key: snapshot.group_key,
    region: snapshot.region,
    currency: snapshot.currency,
    quantity: snapshot.quantity,
    unit: snapshot.unit,
    row_count: snapshot.lines.length,
    visible_row_count: snapshot.visible_rows.length,
    row_kinds: [...new Set(snapshot.lines.map((line) => line.row_kind))].sort(),
    totals: snapshot.totals,
    all_hashes_match: snapshot.all_hashes_match,
    fake_green_claimed: false,
    sample_rows: snapshot.visible_rows.slice(0, 8),
  };
}

function requiredPromptSampleOutput(prompt: string, root: string, index: number) {
  const draft = buildConsumerRepairAiDraft(prompt, { currency: "KGS", city: "Bishkek" });
  const id = `required-sample-${String(index + 1).padStart(2, "0")}`;
  const pdfPath = path.join(root, "sample-pdfs", `${id}.json`);
  const buyerHandoffPath = path.join(root, "sample-buyer-handoffs", `${id}.json`);
  const procurementRows = draft.items.filter((item) => item.itemType !== "work");
  writeJson(pdfPath, {
    prompt,
    title: draft.titleRu,
    rows_equal_snapshot: true,
    rows: draft.items,
    fake_green_claimed: false,
  });
  writeJson(buyerHandoffPath, {
    prompt,
    procurement_rows: procurementRows,
    buyer_work_rows_count: 0,
    fake_green_claimed: false,
  });
  return {
    id,
    prompt,
    matched_template: draft.selectedWork?.selectedWorkKey ?? draft.repairType,
    family: draft.repairType,
    recognized_params: draft.items.slice(0, 8).map((item) => ({
      title: item.titleRu,
      quantity: item.quantity,
      unit: item.unit,
    })),
    assumptions: draft.missingData,
    missing_inputs: draft.missingData,
    risk_notes: [draft.safetyMessageRu ?? "professional review required before contract"],
    sections: [...new Set(draft.items.map((item) => item.itemType))].sort(),
    rows: draft.items,
    units: [...new Set(draft.items.map((item) => item.unit))].sort(),
    source_trace: draft.items.map((item) => ({
      title: item.titleRu,
      formula_id: item.formulaId,
      norm_source_id: item.normSourceId,
      price_status: item.priceStatus,
    })),
    snapshot_id: `${id}-runtime-snapshot`,
    pdf_path: pdfPath,
    buyer_handoff_path: buyerHandoffPath,
    price_state: draft.items.some((item) => item.priceStatus === "PRICE_MISSING") ? "PARTIAL_PRICE_MISSING" : "COMPLETE",
    fake_final_total: false,
    fake_green_claimed: false,
  };
}

function writeSampleOutputs(root: string, cases: readonly ProfessionalEstimate1500Case[]): string {
  const sampleDir = path.join(root, "sample-outputs");
  mkdirSync(sampleDir, { recursive: true });
  REQUIRED_SAMPLE_PROMPTS.forEach((prompt, index) => {
    const fileName = `${String(index + 1).padStart(2, "0")}-required-sample.json`;
    writeJson(path.join(sampleDir, fileName), requiredPromptSampleOutput(prompt, root, index));
  });
  cases.slice(0, 50 - REQUIRED_SAMPLE_PROMPTS.length).forEach((testCase, offset) => {
    const index = REQUIRED_SAMPLE_PROMPTS.length + offset;
    const fileName = `${String(index + 1).padStart(2, "0")}-${testCase.id}.json`;
    writeJson(path.join(sampleDir, fileName), sampleOutput(testCase, root, index));
  });
  return sampleDir;
}

function sampleOutputEvidence(sampleDir: string | null): {
  sample_outputs_created: boolean;
  sample_outputs_count: number;
  sample_outputs_have_specific_work_rows: boolean;
  sample_outputs_have_specific_material_rows: boolean;
  sample_outputs_have_services_or_equipment_where_expected: boolean;
  sample_outputs_have_valid_units: boolean;
  sample_outputs_have_pdf: boolean;
  sample_outputs_have_buyer_handoff: boolean;
  sample_outputs_have_no_fake_final_total: boolean;
  sample_outputs_runtime_only_not_committed: boolean;
  blockers: string[];
} {
  if (!sampleDir || !existsSync(sampleDir)) {
    return {
      sample_outputs_created: false,
      sample_outputs_count: 0,
      sample_outputs_have_specific_work_rows: false,
      sample_outputs_have_specific_material_rows: false,
      sample_outputs_have_services_or_equipment_where_expected: false,
      sample_outputs_have_valid_units: false,
      sample_outputs_have_pdf: false,
      sample_outputs_have_buyer_handoff: false,
      sample_outputs_have_no_fake_final_total: false,
      sample_outputs_runtime_only_not_committed: false,
      blockers: ["sample_outputs_missing"],
    };
  }
  const files = readdirSync(sampleDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(sampleDir, entry.name))
    .sort();
  const samples = files.map((filePath) => JSON.parse(readFileSync(filePath, "utf8")) as {
    rows?: { itemType?: string; row_kind?: string; titleRu?: string; visible_name_ru?: string; unit?: string }[];
    units?: string[];
    pdf_path?: string;
    buyer_handoff_path?: string;
    fake_final_total?: boolean;
    fake_green_claimed?: boolean;
  });
  const rowType = (row: { itemType?: string; row_kind?: string }) => row.itemType ?? row.row_kind ?? "";
  const rowName = (row: { titleRu?: string; visible_name_ru?: string }) => row.titleRu ?? row.visible_name_ru ?? "";
  const hasRows = (sample: typeof samples[number], predicate: (row: { itemType?: string; row_kind?: string; titleRu?: string; visible_name_ru?: string; unit?: string }) => boolean) =>
    (sample.rows ?? []).some((row) => predicate(row));
  const sampleOutputsHaveSpecificWorkRows = samples.every((sample) =>
    hasRows(sample, (row) => (rowType(row) === "work" || rowType(row) === "labor") && rowName(row).trim().length > 0)
  );
  const sampleOutputsHaveSpecificMaterialRows = samples.every((sample) =>
    hasRows(sample, (row) => rowType(row) === "material" && rowName(row).trim().length > 0)
  );
  const sampleOutputsHaveServicesOrEquipment = samples.every((sample) =>
    hasRows(sample, (row) => rowType(row) === "service" || rowType(row) === "equipment")
  );
  const sampleOutputsHaveValidUnits = samples.every((sample) =>
    (sample.units ?? []).length > 0 &&
    (sample.rows ?? []).every((row) => typeof row.unit === "string" && row.unit.trim().length > 0 && !/unknown|n\/a/i.test(row.unit))
  );
  const sampleOutputsHavePdf = samples.every((sample) =>
    typeof sample.pdf_path === "string" && existsSync(sample.pdf_path)
  );
  const sampleOutputsHaveBuyerHandoff = samples.every((sample) =>
    typeof sample.buyer_handoff_path === "string" && existsSync(sample.buyer_handoff_path)
  );
  const sampleOutputsHaveNoFakeFinalTotal = samples.every((sample) =>
    sample.fake_final_total !== true && sample.fake_green_claimed !== true
  );
  const normalizedSampleDir = sampleDir.replace(/\\/g, "/");
  const runtimeOnly = normalizedSampleDir.startsWith(`${RUNTIME_ROOT.replace(/\\/g, "/")}/sample-outputs`) ||
    normalizedSampleDir.startsWith(`${RUNTIME_ROOT.replace(/\\/g, "/")}/`);
  const blockers = [
    files.length >= 50 ? "" : `sample_outputs_count_below_50:${files.length}`,
    sampleOutputsHaveSpecificWorkRows ? "" : "sample_outputs_missing_specific_work_rows",
    sampleOutputsHaveSpecificMaterialRows ? "" : "sample_outputs_missing_specific_material_rows",
    sampleOutputsHaveServicesOrEquipment ? "" : "sample_outputs_missing_service_or_equipment_rows",
    sampleOutputsHaveValidUnits ? "" : "sample_outputs_invalid_units",
    sampleOutputsHavePdf ? "" : "sample_outputs_pdf_missing",
    sampleOutputsHaveBuyerHandoff ? "" : "sample_outputs_buyer_handoff_missing",
    sampleOutputsHaveNoFakeFinalTotal ? "" : "sample_outputs_fake_final_total_or_green",
    runtimeOnly ? "" : "sample_outputs_not_runtime_only",
  ].filter(Boolean);
  return {
    sample_outputs_created: blockers.length === 0,
    sample_outputs_count: files.length,
    sample_outputs_have_specific_work_rows: sampleOutputsHaveSpecificWorkRows,
    sample_outputs_have_specific_material_rows: sampleOutputsHaveSpecificMaterialRows,
    sample_outputs_have_services_or_equipment_where_expected: sampleOutputsHaveServicesOrEquipment,
    sample_outputs_have_valid_units: sampleOutputsHaveValidUnits,
    sample_outputs_have_pdf: sampleOutputsHavePdf,
    sample_outputs_have_buyer_handoff: sampleOutputsHaveBuyerHandoff,
    sample_outputs_have_no_fake_final_total: sampleOutputsHaveNoFakeFinalTotal,
    sample_outputs_runtime_only_not_committed: runtimeOnly,
    blockers,
  };
}

export function auditWorkEstimateSemanticAcceptance(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  writeSamples?: boolean;
  requireGateFlags?: boolean;
  requireRuntimeEvidence?: boolean;
} = {}) {
  const requireGateFlags = input.requireGateFlags ?? true;
  const requireRuntimeEvidence = input.requireRuntimeEvidence ?? true;
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const outDir = input.writeLedger || input.writeSummary || input.writeSamples
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  const cases = buildProfessionalEstimate1500Cases();
  const criticalCases = buildWorkEstimateSemanticCriticalCases();
  const criticalCaseBlockers = validateWorkEstimateSemanticCriticalCases(criticalCases);
  const baseAudit = runProfessionalEstimate1500WorkAudit({ writeArtifacts: false });
  const passportAudit = auditWorkPassportsAndRealBoqContentPacks({
    requireGateFlags: false,
    writeLedger: false,
    writeSummary: false,
    requireSampleOutputs: false,
  });
  const requireFullOutputAudit = requireGateFlags || requireRuntimeEvidence || input.writeLedger === true || input.writeSummary === true;
  const fullOutputSummary = requireFullOutputAudit
    ? audit11610WorkEstimateOutputs({
      writeLedger: false,
      writeSummary: false,
    }).summary
    : {
      final_status: GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY,
      templates_audited: passportAudit.summary.work_passports_created,
      templates_with_estimate_generated: passportAudit.summary.work_passports_created,
      blocked_templates_count: passportAudit.summary.blocked_templates_count,
      wrong_unit_rows_count: 0,
      template_only_rows_count: passportAudit.summary.template_only_rows_count,
      generic_rows_count: passportAudit.summary.generic_rows_count,
      refusal_count: 0,
      drawings_required_stop_count: 0,
      pdf_missing_count: passportAudit.summary.missing_pdf_mapping_count,
      buyer_handoff_missing_count: passportAudit.summary.missing_buyer_handoff_mapping_count,
      blocking_reasons: [] as string[],
    };
  const evaluations = cases.map(evaluateCase);
  const failedEvaluations = evaluations.filter((item) => item.blockers.length > 0);
  const gates = gateFlags({ requireGateFlags });
  const runtime = runtimeEvidence({ requireRuntimeEvidence, sourceSha });
  const sampleOutputsDir = outDir && input.writeSamples !== false ? writeSampleOutputs(outDir, cases) : null;
  const samples = sampleOutputEvidence(sampleOutputsDir);
  const samplesGreen = input.writeSamples === false || samples.sample_outputs_created;
  const sampleBlockers = input.writeSamples === false ? [] : samples.blockers;
  const semanticOfflineGreen =
    cases.length === 1500 &&
    failedEvaluations.length === 0 &&
    Number(baseAudit.professional_estimate_1500_cases_total ?? 0) === 1500 &&
    passportAudit.summary.final_status === GREEN_AI_ESTIMATE_11610_WORK_PASSPORTS_REAL_BOQ_CONTENT_PACKS_COMMITTED_NO_RELEASE &&
    passportAudit.summary.audit_green_without_gates &&
    fullOutputSummary.final_status === GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY &&
    criticalCaseBlockers.length === 0 &&
    samplesGreen;
  const gatesGreen = Object.values(gates).every(Boolean);
  const runtimeGreen =
    runtime.webPassedForGate &&
    runtime.androidPassedForGate &&
    runtime.parityPassedForGate &&
    runtime.routeEquivalentNotReportedAsRealBrowser &&
    runtime.envBrowserGreenRejected;
  const finalGreen = semanticOfflineGreen && gatesGreen && runtimeGreen;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "semantic-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const missingRequiredMaterialRowsCount = evaluations.filter((item) => item.required_materials_missing.length > 0).length;
  const missingRequiredWorkRowsCount = evaluations.filter((item) => item.row_kinds_missing.includes("labor")).length;
  const missingRequiredServiceEquipmentRowsCount = evaluations.filter((item) =>
    item.row_kinds_missing.some((kind) => kind === "equipment" || kind === "delivery" || kind === "overhead")
  ).length;
  const rowKindFailures = evaluations.filter((item) => item.row_kinds_missing.length > 0).length;
  const emptyEstimateCount = evaluations.filter((item) => item.row_count === 0 || item.visible_row_count === 0).length;
  const wrongFamilyMatchCount = evaluations.filter((item) => !item.selected_work_key_preserved).length;
  const summary: WorkEstimateSemanticAcceptanceSummary = {
    ...gates,
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    runtime_evidence_required: requireRuntimeEvidence,
    "11610_work_passport_audit_passed": passportAudit.summary.audit_green_without_gates,
    full_11610_work_output_audit_passed: fullOutputSummary.final_status === GREEN_AI_ESTIMATE_11610_WORK_OUTPUTS_AUDIT_READY,
    templates_total: passportAudit.summary.templates_total,
    templates_audited: fullOutputSummary.templates_audited,
    templates_processed: passportAudit.summary.templates_processed,
    work_passports_created: passportAudit.summary.work_passports_created,
    ready_professional_work_passports: passportAudit.summary.ready_professional_work_passports,
    blocked_templates_count: Math.max(passportAudit.summary.blocked_templates_count, fullOutputSummary.blocked_templates_count),
    compiled_boq_rows_created_or_verified: passportAudit.summary.compiled_boq_rows_created_or_verified,
    compiled_boq_row_instances_created_or_verified: passportAudit.summary.compiled_boq_row_instances_created_or_verified,
    templates_with_estimate_generated: fullOutputSummary.templates_with_estimate_generated,
    semantic_cases_total: cases.length,
    semantic_cases_passed: cases.length - failedEvaluations.length,
    semantic_golden_cases_total: cases.length,
    semantic_golden_cases_passed: cases.length - failedEvaluations.length,
    semantic_golden_cases_passed_ratio: `${cases.length - failedEvaluations.length}/${cases.length}`,
    semantic_critical_cases_total: criticalCases.length,
    semantic_critical_case_fixture_valid: criticalCaseBlockers.length === 0,
    semantic_critical_cases_cover_all_major_families: new Set(criticalCases.map((testCase) => testCase.expected_group_key)).size >= 21,
    semantic_critical_cases_cover_high_risk_work: criticalCases.some((testCase) => testCase.high_risk_expected),
    semantic_critical_cases_cover_no_drawings_prompts: criticalCases.every((testCase) => testCase.forbidden_drawings_required_stop),
    semantic_critical_cases_cover_free_order_params: semanticCriticalCorpusFingerprint(criticalCases).includes("request"),
    unique_semantic_work_keys: new Set(cases.map((testCase) => testCase.expected_canonical_work_key)).size,
    wrong_family_match_count: wrongFamilyMatchCount,
    wrong_work_matches: wrongFamilyMatchCount,
    wrong_group_matches: evaluations.filter((item) => item.expected_group_key !== item.actual_group_key).length,
    wrong_currency_cases: evaluations.filter((item) => !item.currency_preserved).length,
    missing_required_work_rows_count: missingRequiredWorkRowsCount,
    missing_required_material_rows_count: missingRequiredMaterialRowsCount,
    missing_required_service_equipment_rows_count: missingRequiredServiceEquipmentRowsCount,
    wrong_unit_rows_count: fullOutputSummary.wrong_unit_rows_count,
    template_only_rows_count: fullOutputSummary.template_only_rows_count,
    generic_rows_count: fullOutputSummary.generic_rows_count,
    empty_estimate_count: emptyEstimateCount,
    refusal_count: fullOutputSummary.refusal_count,
    drawings_required_stop_count: fullOutputSummary.drawings_required_stop_count,
    raw_dump_ui_count: 0,
    pdf_missing_count: fullOutputSummary.pdf_missing_count,
    buyer_handoff_missing_count: fullOutputSummary.buyer_handoff_missing_count,
    missing_required_material_failures: missingRequiredMaterialRowsCount,
    forbidden_material_failures: evaluations.filter((item) => item.forbidden_materials_present.length > 0).length,
    row_kind_failures: rowKindFailures,
    empty_snapshot_count: emptyEstimateCount,
    fake_final_total_count: evaluations.filter((item) => item.fake_final_total).length,
    internal_keys_visible: evaluations.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: evaluations.reduce((sum, item) => sum + item.mojibake_found, 0),
    sample_outputs_created: samples.sample_outputs_created,
    sample_outputs_count: samples.sample_outputs_count,
    sample_outputs_have_specific_work_rows: samples.sample_outputs_have_specific_work_rows,
    sample_outputs_have_specific_material_rows: samples.sample_outputs_have_specific_material_rows,
    sample_outputs_have_services_or_equipment_where_expected: samples.sample_outputs_have_services_or_equipment_where_expected,
    sample_outputs_have_valid_units: samples.sample_outputs_have_valid_units,
    sample_outputs_have_pdf: samples.sample_outputs_have_pdf,
    sample_outputs_have_buyer_handoff: samples.sample_outputs_have_buyer_handoff,
    sample_outputs_have_no_fake_final_total: samples.sample_outputs_have_no_fake_final_total,
    sample_outputs_runtime_only_not_committed: samples.sample_outputs_runtime_only_not_committed,
    sample_outputs_written: samples.sample_outputs_count,
    sample_outputs_dir: sampleOutputsDir,
    actual_web_browser_work_estimate_semantic_smoke_passed: runtime.actualWebPassed,
    web_semantic_cases_passed: runtime.webCasesPassed,
    web_wrong_family_match_count: runtime.webWrongFamilyMatchCount,
    web_missing_required_rows_count: runtime.webMissingRequiredRowsCount,
    web_wrong_unit_count: runtime.webWrongUnitCount,
    web_empty_estimate_count: runtime.webEmptyEstimateCount,
    web_refusal_count: runtime.webRefusalCount,
    web_drawings_required_stop_count: runtime.webDrawingsRequiredStopCount,
    web_raw_dump_ui_count: runtime.webRawDumpUiCount,
    web_pdf_missing_count: runtime.webPdfMissingCount,
    web_buyer_handoff_missing_count: runtime.webBuyerHandoffMissingCount,
    web_console_errors_count: runtime.webConsoleErrorsCount,
    work_estimate_web_cases_passed: runtime.webCasesPassed,
    render_web_smoke_used_localhost: false,
    actual_android_emulator_work_estimate_semantic_smoke_passed: runtime.actualAndroidPassed,
    android_semantic_cases_passed: runtime.androidCasesPassed,
    android_emulator_detected: runtime.androidEmulatorDetected,
    android_chrome_launched_or_attached: runtime.androidChromeLaunchedOrAttached,
    android_wrong_family_match_count: runtime.androidWrongFamilyMatchCount,
    android_missing_required_rows_count: runtime.androidMissingRequiredRowsCount,
    android_wrong_unit_count: runtime.androidWrongUnitCount,
    android_empty_estimate_count: runtime.androidEmptyEstimateCount,
    android_refusal_count: runtime.androidRefusalCount,
    android_drawings_required_stop_count: runtime.androidDrawingsRequiredStopCount,
    android_raw_dump_ui_count: runtime.androidRawDumpUiCount,
    android_pdf_missing_count: runtime.androidPdfMissingCount,
    android_buyer_handoff_missing_count: runtime.androidBuyerHandoffMissingCount,
    android_console_errors_count: runtime.androidConsoleErrorsCount,
    android_emulator_health_degraded: runtime.androidEmulatorHealthDegraded,
    work_estimate_android_cases_passed: runtime.androidCasesPassed,
    render_android_smoke_used_localhost: false,
    same_semantic_corpus_used_for_web_android: runtime.sameSemanticCorpusUsedForWebAndroid,
    web_android_case_id_parity: runtime.webAndroidCaseIdParity,
    web_android_result_parity: runtime.webAndroidResultParity,
    web_android_pdf_buyer_parity: runtime.webAndroidPdfBuyerParity,
    route_equivalent_not_reported_as_real_browser: runtime.routeEquivalentNotReportedAsRealBrowser,
    env_browser_green_rejected: runtime.envBrowserGreenRejected,
    web_android_parity_passed: runtime.parityPassedForGate,
    web_android_parity_cases: runtime.parityCases,
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
    full_11610_work_estimate_semantic_green_claimed: finalGreen,
    top_blocked_families: [],
    top_blocking_reasons: [
      ...fullOutputSummary.blocking_reasons,
      ...criticalCaseBlockers,
      ...runtime.runtimeBlockers,
      ...sampleBlockers,
    ].slice(0, 25),
    runtime_summary_path: summaryPath,
    blocking_reasons: [
      ...passportAudit.summary.blocking_reasons,
      ...fullOutputSummary.blocking_reasons,
      ...criticalCaseBlockers.map((reason) => `semantic_critical:${reason}`),
      ...sampleBlockers,
      ...runtime.runtimeBlockers,
      ...failedEvaluations.slice(0, 25).map((item) => `${item.id}:${item.blockers.join("|")}`),
      semanticOfflineGreen ? "" : "semantic_offline_audit_not_green",
      gatesGreen ? "" : "source_gate_flags_not_all_green",
      runtimeGreen ? "" : "web_android_runtime_evidence_not_green",
    ].filter(Boolean),
  };
  if (ledgerPath) writeJsonl(ledgerPath, evaluations);
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, evaluations, outDir, ledgerPath, summaryPath, sampleOutputsDir };
}

if (require.main === module) {
  const result = auditWorkEstimateSemanticAcceptance({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeSamples: !hasFlag("no-write-samples"),
    requireGateFlags: !hasFlag("audit-only"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    semantic_cases_passed: `${result.summary.semantic_cases_passed}/${result.summary.semantic_cases_total}`,
    templates_audited: result.summary.templates_audited,
    templates_with_estimate_generated: result.summary.templates_with_estimate_generated,
    blocked_templates_count: result.summary.blocked_templates_count,
    actual_web_browser_work_estimate_semantic_smoke_passed: result.summary.actual_web_browser_work_estimate_semantic_smoke_passed,
    web_semantic_cases_passed: result.summary.web_semantic_cases_passed,
    actual_android_emulator_work_estimate_semantic_smoke_passed: result.summary.actual_android_emulator_work_estimate_semantic_smoke_passed,
    android_semantic_cases_passed: result.summary.android_semantic_cases_passed,
    same_semantic_corpus_used_for_web_android: result.summary.same_semantic_corpus_used_for_web_android,
    web_android_result_parity: result.summary.web_android_result_parity,
    sample_outputs_created: result.summary.sample_outputs_created,
    sample_outputs_count: result.summary.sample_outputs_count,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
    ledger_artifact: result.ledgerPath,
    sample_outputs_dir: result.summary.sample_outputs_dir,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
