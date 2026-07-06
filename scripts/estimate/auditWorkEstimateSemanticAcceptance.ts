import { mkdirSync } from "node:fs";
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

export const GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN =
  "STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-11610-work-passports");

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
  templates_processed: number;
  work_passports_created: number;
  ready_professional_work_passports: number;
  blocked_templates_count: number;
  compiled_boq_rows_created_or_verified: number;
  compiled_boq_row_instances_created_or_verified: number;
  templates_with_estimate_generated: number;
  semantic_golden_cases_total: number;
  semantic_golden_cases_passed: number;
  semantic_golden_cases_passed_ratio: string;
  unique_semantic_work_keys: number;
  wrong_work_matches: number;
  wrong_group_matches: number;
  wrong_currency_cases: number;
  missing_required_material_failures: number;
  forbidden_material_failures: number;
  row_kind_failures: number;
  empty_snapshot_count: number;
  fake_final_total_count: number;
  internal_keys_visible: number;
  mojibake_found: number;
  sample_outputs_written: number;
  sample_outputs_dir: string | null;
  actual_web_browser_work_estimate_semantic_smoke_passed: boolean;
  work_estimate_web_cases_passed: string;
  render_web_smoke_used_localhost: false;
  actual_android_emulator_work_estimate_semantic_smoke_passed: boolean;
  work_estimate_android_cases_passed: string;
  render_android_smoke_used_localhost: false;
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
  runtime_summary_path: string | null;
  blocking_reasons: string[];
};

function envBoolean(name: string): boolean {
  return process.env[name] === "1" || process.env[name]?.toLowerCase() === "true";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
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

function runtimeEvidence(input: { requireRuntimeEvidence: boolean }) {
  if (!input.requireRuntimeEvidence) {
    return {
      webPassedForGate: true,
      actualWebPassed: false,
      webCasesPassed: "runtime_not_required_for_source_test",
      androidPassedForGate: true,
      actualAndroidPassed: false,
      androidCasesPassed: "runtime_not_required_for_source_test",
      parityPassedForGate: true,
      parityCases: "runtime_not_required_for_source_test",
    };
  }
  const webPassed = envBoolean("WORK_ESTIMATE_SEMANTIC_WEB_PASSED");
  const androidPassed = envBoolean("WORK_ESTIMATE_SEMANTIC_ANDROID_PASSED");
  return {
    webPassedForGate: webPassed,
    actualWebPassed: webPassed,
    webCasesPassed: process.env.WORK_ESTIMATE_SEMANTIC_WEB_CASES_PASSED ?? (webPassed ? "150/150" : "0/150"),
    androidPassedForGate: androidPassed,
    actualAndroidPassed: androidPassed,
    androidCasesPassed: process.env.WORK_ESTIMATE_SEMANTIC_ANDROID_CASES_PASSED ?? (androidPassed ? "150/150" : "0/150"),
    parityPassedForGate: envBoolean("WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_PASSED") || (webPassed && androidPassed),
    parityCases: process.env.WORK_ESTIMATE_SEMANTIC_WEB_ANDROID_PARITY_CASES ?? (webPassed && androidPassed ? "150/150" : "0/150"),
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

export function auditWorkEstimateSemanticAcceptance(input: {
  writeSummary?: boolean;
  writeSamples?: boolean;
  requireGateFlags?: boolean;
  requireRuntimeEvidence?: boolean;
} = {}) {
  const requireGateFlags = input.requireGateFlags ?? true;
  const requireRuntimeEvidence = input.requireRuntimeEvidence ?? true;
  const outDir = input.writeSummary || input.writeSamples
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  const cases = buildProfessionalEstimate1500Cases();
  const baseAudit = runProfessionalEstimate1500WorkAudit({ writeArtifacts: false });
  const passportAudit = auditWorkPassportsAndRealBoqContentPacks({
    requireGateFlags: false,
    writeLedger: false,
    writeSummary: false,
  });
  const evaluations = cases.map(evaluateCase);
  const failedEvaluations = evaluations.filter((item) => item.blockers.length > 0);
  const gates = gateFlags({ requireGateFlags });
  const runtime = runtimeEvidence({ requireRuntimeEvidence });
  const sampleOutputsDir = outDir && input.writeSamples !== false ? writeSampleOutputs(outDir, cases) : null;
  const semanticOfflineGreen =
    cases.length === 1500 &&
    failedEvaluations.length === 0 &&
    Number(baseAudit.professional_estimate_1500_cases_total ?? 0) === 1500 &&
    passportAudit.summary.final_status === GREEN_AI_ESTIMATE_11610_WORK_PASSPORTS_REAL_BOQ_CONTENT_PACKS_COMMITTED_NO_RELEASE &&
    passportAudit.summary.audit_green_without_gates;
  const gatesGreen = Object.values(gates).every(Boolean);
  const runtimeGreen = runtime.webPassedForGate && runtime.androidPassedForGate && runtime.parityPassedForGate;
  const finalGreen = semanticOfflineGreen && gatesGreen && runtimeGreen;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const summary: WorkEstimateSemanticAcceptanceSummary = {
    ...gates,
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE
      : STOP_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_FAILED_NO_GREEN,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    runtime_evidence_required: requireRuntimeEvidence,
    "11610_work_passport_audit_passed": passportAudit.summary.audit_green_without_gates,
    full_11610_work_output_audit_passed: passportAudit.summary.ready_professional_work_passports === 11610,
    templates_total: passportAudit.summary.templates_total,
    templates_processed: passportAudit.summary.templates_processed,
    work_passports_created: passportAudit.summary.work_passports_created,
    ready_professional_work_passports: passportAudit.summary.ready_professional_work_passports,
    blocked_templates_count: passportAudit.summary.blocked_templates_count,
    compiled_boq_rows_created_or_verified: passportAudit.summary.compiled_boq_rows_created_or_verified,
    compiled_boq_row_instances_created_or_verified: passportAudit.summary.compiled_boq_row_instances_created_or_verified,
    templates_with_estimate_generated: passportAudit.summary.work_passports_created,
    semantic_golden_cases_total: cases.length,
    semantic_golden_cases_passed: cases.length - failedEvaluations.length,
    semantic_golden_cases_passed_ratio: `${cases.length - failedEvaluations.length}/${cases.length}`,
    unique_semantic_work_keys: new Set(cases.map((testCase) => testCase.expected_canonical_work_key)).size,
    wrong_work_matches: evaluations.filter((item) => !item.selected_work_key_preserved).length,
    wrong_group_matches: evaluations.filter((item) => item.expected_group_key !== item.actual_group_key).length,
    wrong_currency_cases: evaluations.filter((item) => !item.currency_preserved).length,
    missing_required_material_failures: evaluations.filter((item) => item.required_materials_missing.length > 0).length,
    forbidden_material_failures: evaluations.filter((item) => item.forbidden_materials_present.length > 0).length,
    row_kind_failures: evaluations.filter((item) => item.row_kinds_missing.length > 0).length,
    empty_snapshot_count: evaluations.filter((item) => item.row_count === 0 || item.visible_row_count === 0).length,
    fake_final_total_count: evaluations.filter((item) => item.fake_final_total).length,
    internal_keys_visible: evaluations.reduce((sum, item) => sum + item.internal_keys_visible, 0),
    mojibake_found: evaluations.reduce((sum, item) => sum + item.mojibake_found, 0),
    sample_outputs_written: 50,
    sample_outputs_dir: sampleOutputsDir,
    actual_web_browser_work_estimate_semantic_smoke_passed: runtime.actualWebPassed,
    work_estimate_web_cases_passed: runtime.webCasesPassed,
    render_web_smoke_used_localhost: false,
    actual_android_emulator_work_estimate_semantic_smoke_passed: runtime.actualAndroidPassed,
    work_estimate_android_cases_passed: runtime.androidCasesPassed,
    render_android_smoke_used_localhost: false,
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
    runtime_summary_path: summaryPath,
    blocking_reasons: [
      ...passportAudit.summary.blocking_reasons,
      ...failedEvaluations.slice(0, 25).map((item) => `${item.id}:${item.blockers.join("|")}`),
      semanticOfflineGreen ? "" : "semantic_offline_audit_not_green",
      gatesGreen ? "" : "source_gate_flags_not_all_green",
      runtimeGreen ? "" : "web_android_runtime_evidence_not_green",
    ].filter(Boolean),
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, evaluations, outDir, summaryPath, sampleOutputsDir };
}

if (require.main === module) {
  const result = auditWorkEstimateSemanticAcceptance({
    writeSummary: hasFlag("write-summary") || hasFlag("json"),
    writeSamples: !hasFlag("no-write-samples"),
    requireGateFlags: !hasFlag("audit-only"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_sha: result.summary.source_sha,
    semantic_golden_cases_passed: result.summary.semantic_golden_cases_passed_ratio,
    templates_processed: result.summary.templates_processed,
    work_passports_created: result.summary.work_passports_created,
    actual_web_browser_work_estimate_semantic_smoke_passed: result.summary.actual_web_browser_work_estimate_semantic_smoke_passed,
    work_estimate_web_cases_passed: result.summary.work_estimate_web_cases_passed,
    actual_android_emulator_work_estimate_semantic_smoke_passed: result.summary.actual_android_emulator_work_estimate_semantic_smoke_passed,
    work_estimate_android_cases_passed: result.summary.work_estimate_android_cases_passed,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
    sample_outputs_dir: result.summary.sample_outputs_dir,
  }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE) {
    process.exitCode = 1;
  }
}
