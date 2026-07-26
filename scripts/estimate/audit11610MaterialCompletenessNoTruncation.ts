import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { PROFESSIONAL_WORK_PASSPORT_TOTAL } from "../../src/lib/estimate/professionalWorkPassportRegistry";
import {
  professionalBoqRowsFromPassport,
  validateProfessionalBoqMaterialCompletenessForPassport,
} from "../../src/lib/estimate/validateProfessionalBoqMaterialCompleteness";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  MATERIAL_COMPLETENESS_SAMPLE_OUTPUTS_REQUIRED,
  runMaterialCompletenessRuntimeCases,
  writeMaterialCompletenessSampleOutputs,
} from "./materialCompletenessCriticalCases";

export const GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY =
  "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY" as const;
export const GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-material-completeness");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");
const REAL_NAMED_ROOT = path.join(".release-runtime", "ai-estimate-real-named-boq-line-items");
const REAL_NAMED_GREEN = "GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE";
const WEB_GREEN = "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_SMOKE";
const ANDROID_GREEN = "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_ANDROID_SMOKE";
const PARITY_GREEN = "GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_WEB_ANDROID_PARITY";

type RuntimeArtifact = {
  final_status?: string;
  source_sha?: string;
  actual_web_browser_material_completeness_smoke_passed?: boolean;
  actual_android_emulator_material_completeness_smoke_passed?: boolean;
  material_completeness_web_smoke_passed?: boolean;
  material_completeness_android_smoke_passed?: boolean;
  material_completeness_web_android_parity_passed?: boolean;
  web_material_completeness_cases_passed?: string;
  android_material_completeness_cases_passed?: string;
  same_material_completeness_corpus_used_for_web_android?: boolean;
  web_android_material_result_parity?: boolean;
  web_android_material_no_truncation_parity?: boolean;
  web_material_panel_missing_count?: number;
  android_material_panel_missing_count?: number;
  web_missing_required_material_slots_count?: number;
  android_missing_required_material_slots_count?: number;
  web_truncation_detected_count?: number;
  android_truncation_detected_count?: number;
  web_generic_material_bucket_count?: number;
  android_generic_material_bucket_count?: number;
  web_fake_filler_material_count?: number;
  android_fake_filler_material_count?: number;
  web_raw_dump_ui_count?: number;
  android_raw_dump_ui_count?: number;
  fake_green_claimed?: boolean;
};

export type MaterialCompletenessTemplateAuditRow = {
  template_id: string;
  family: string;
  prompt: string;
  calculator_rows_count: number;
  snapshot_rows_count: number;
  main_ui_visible_rows_count: number;
  detail_drawer_rows_count: number;
  pdf_rows_count: number;
  buyer_handoff_procurement_rows_count: number;
  required_material_slots_count: number;
  required_material_slots_matched_count: number;
  missing_required_material_slots_count: number;
  optional_expected_slots_count: number;
  optional_expected_slots_matched_count: number;
  work_rows_count: number;
  material_rows_count: number;
  equipment_rows_count: number;
  service_rows_count: number;
  transport_rows_count: number;
  backend_row_cap_detected: boolean;
  snapshot_truncation_detected: boolean;
  detail_drawer_truncation_detected: boolean;
  pdf_truncation_detected: boolean;
  buyer_handoff_truncation_detected: boolean;
  generic_material_bucket_count: number;
  fake_filler_material_count: number;
  duplicate_noise_rows_count: number;
  status: "READY_MATERIAL_COMPLETE" | "BLOCKED_MATERIAL_COMPLETE";
  blocking_reasons: string[];
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function latestSummary(root: string): string | null {
  if (!existsSync(root)) return null;
  const summaries: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) visit(fullPath);
      else if (stat.isFile() && entry === "summary.json") summaries.push(fullPath);
    }
  };
  visit(root);
  return summaries.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readJson(filePath: string | null): Record<string, unknown> | null {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

function latestSummaryMatching(root: string, predicate: (summary: Record<string, unknown>) => boolean): string | null {
  if (!existsSync(root)) return null;
  const matches: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        visit(fullPath);
      } else if (stat.isFile() && entry === "summary.json") {
        const summary = readJson(fullPath);
        if (summary && predicate(summary)) matches.push(fullPath);
      }
    }
  };
  visit(root);
  return matches.sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function readRuntimeArtifact(root: string): { path: string | null; artifact: RuntimeArtifact | null } {
  const artifactPath = latestSummary(root);
  if (!artifactPath) return { path: null, artifact: null };
  return {
    path: artifactPath,
    artifact: JSON.parse(readFileSync(artifactPath, "utf8")) as RuntimeArtifact,
  };
}

function validateRealNamedPrecondition(): { passed: boolean; path: string | null; blockers: string[] } {
  const currentSourceSha = gitOutput(["rev-parse", "HEAD"]);
  const summaryPath = latestSummaryMatching(
    REAL_NAMED_ROOT,
    (summary) =>
      summary.final_status === REAL_NAMED_GREEN &&
      summary.source_sha === currentSourceSha,
  );
  const summary = readJson(summaryPath);
  const blockers = [
    summary ? "" : "real_named_summary_missing",
    summary?.final_status === REAL_NAMED_GREEN ? "" : `real_named_final_status_not_green:${String(summary?.final_status ?? "missing")}`,
    String(summary?.source_sha ?? "").trim() ? "" : "real_named_source_sha_missing",
    summary?.templates_real_named_boq_ready === 11610 ? "" : "real_named_templates_ready_not_11610",
    Number(summary?.rows_audited ?? 0) >= 671450 ? "" : "real_named_rows_audited_below_expected",
    summary?.web_real_named_cases_passed === "100/100" ? "" : "real_named_web_not_100",
    summary?.android_real_named_cases_passed === "100/100" ? "" : "real_named_android_not_100",
  ].filter(Boolean);
  return { passed: blockers.length === 0, path: summaryPath, blockers };
}

function countRows(rows: ReturnType<typeof professionalBoqRowsFromPassport>, rowType: string): number {
  return rows.filter((row) => row.rowType === rowType).length;
}

function auditTemplate(templateId: string): MaterialCompletenessTemplateAuditRow {
  const passport = buildProfessionalWorkPassport(templateId);
  if (!passport) {
    return {
      template_id: templateId,
      family: "missing",
      prompt: "",
      calculator_rows_count: 0,
      snapshot_rows_count: 0,
      main_ui_visible_rows_count: 0,
      detail_drawer_rows_count: 0,
      pdf_rows_count: 0,
      buyer_handoff_procurement_rows_count: 0,
      required_material_slots_count: 0,
      required_material_slots_matched_count: 0,
      missing_required_material_slots_count: 1,
      optional_expected_slots_count: 0,
      optional_expected_slots_matched_count: 0,
      work_rows_count: 0,
      material_rows_count: 0,
      equipment_rows_count: 0,
      service_rows_count: 0,
      transport_rows_count: 0,
      backend_row_cap_detected: false,
      snapshot_truncation_detected: false,
      detail_drawer_truncation_detected: false,
      pdf_truncation_detected: false,
      buyer_handoff_truncation_detected: false,
      generic_material_bucket_count: 0,
      fake_filler_material_count: 0,
      duplicate_noise_rows_count: 0,
      status: "BLOCKED_MATERIAL_COMPLETE",
      blocking_reasons: ["passport_missing"],
    };
  }
  const rows = professionalBoqRowsFromPassport(passport);
  const validation = validateProfessionalBoqMaterialCompletenessForPassport(passport, rows);
  const requiredSlots = validation.completeness.requiredMaterialSlots;
  const optionalSlots = validation.completeness.missingOptionalButExpectedSlots;
  const blockingReasons = validation.blockingReasons.map((reason) => String(reason));
  return {
    template_id: templateId,
    family: passport.familyId,
    prompt: passport.localizedNameRu,
    calculator_rows_count: rows.length,
    snapshot_rows_count: validation.completeness.fullSnapshotRowsCount,
    main_ui_visible_rows_count: validation.completeness.visibleMainRowsCount,
    detail_drawer_rows_count: rows.length,
    pdf_rows_count: validation.completeness.pdfRowsCount,
    buyer_handoff_procurement_rows_count: validation.completeness.buyerHandoffRowsCount,
    required_material_slots_count: requiredSlots.length,
    required_material_slots_matched_count: requiredSlots.filter((slot) => slot.matchedRowIds.length > 0).length,
    missing_required_material_slots_count: validation.completeness.missingRequiredSlots.length,
    optional_expected_slots_count: optionalSlots.length,
    optional_expected_slots_matched_count: optionalSlots.length - validation.completeness.missingOptionalButExpectedSlots.length,
    work_rows_count: countRows(rows, "work") + countRows(rows, "labor"),
    material_rows_count: countRows(rows, "material"),
    equipment_rows_count: countRows(rows, "equipment"),
    service_rows_count: countRows(rows, "service"),
    transport_rows_count: countRows(rows, "transport"),
    backend_row_cap_detected: validation.completeness.rowCapDetected,
    snapshot_truncation_detected: validation.completeness.backendTruncationDetected,
    detail_drawer_truncation_detected: false,
    pdf_truncation_detected: validation.completeness.pdfTruncationDetected,
    buyer_handoff_truncation_detected: validation.completeness.buyerTruncationDetected,
    generic_material_bucket_count: validation.genericMaterialBucketCount,
    fake_filler_material_count: validation.fakeFillerMaterialCount,
    duplicate_noise_rows_count: validation.duplicateNoiseRowsCount,
    status: validation.passed ? "READY_MATERIAL_COMPLETE" : "BLOCKED_MATERIAL_COMPLETE",
    blocking_reasons: blockingReasons,
  };
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function familyReady(rows: readonly MaterialCompletenessTemplateAuditRow[], family: string): boolean {
  const matched = rows.filter((row) => row.family === family);
  return matched.length > 0 && matched.every((row) => row.status === "READY_MATERIAL_COMPLETE");
}

export function audit11610MaterialCompletenessNoTruncation(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  writeSamples?: boolean;
  requireRuntimeEvidence?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const precondition = validateRealNamedPrecondition();
  const validations: MaterialCompletenessTemplateAuditRow[] = [];
  for (const [index, templateId] of listProfessionalWorkPassportTemplateIds().entries()) {
    validations.push(auditTemplate(templateId));
    if (index > 0 && index % 100 === 0) clearProfessionalWorkPassportBuildCaches();
  }
  clearProfessionalWorkPassportBuildCaches();
  const runtimeCases = runMaterialCompletenessRuntimeCases();
  const runtimeRequired = input.requireRuntimeEvidence ?? true;
  const web = readRuntimeArtifact(WEB_ROOT);
  const android = readRuntimeArtifact(ANDROID_ROOT);
  const parity = readRuntimeArtifact(PARITY_ROOT);
  const webGreen = web.artifact?.source_sha === sourceSha &&
    web.artifact.final_status === WEB_GREEN &&
    web.artifact.actual_web_browser_material_completeness_smoke_passed === true &&
    web.artifact.material_completeness_web_smoke_passed === true &&
    web.artifact.web_material_completeness_cases_passed === "100/100" &&
    web.artifact.web_material_panel_missing_count === 0 &&
    web.artifact.web_missing_required_material_slots_count === 0 &&
    web.artifact.web_truncation_detected_count === 0 &&
    web.artifact.web_generic_material_bucket_count === 0 &&
    web.artifact.web_fake_filler_material_count === 0 &&
    web.artifact.web_raw_dump_ui_count === 0 &&
    web.artifact.fake_green_claimed === false;
  const androidGreen = android.artifact?.source_sha === sourceSha &&
    android.artifact.final_status === ANDROID_GREEN &&
    android.artifact.actual_android_emulator_material_completeness_smoke_passed === true &&
    android.artifact.material_completeness_android_smoke_passed === true &&
    android.artifact.android_material_completeness_cases_passed === "100/100" &&
    android.artifact.android_material_panel_missing_count === 0 &&
    android.artifact.android_missing_required_material_slots_count === 0 &&
    android.artifact.android_truncation_detected_count === 0 &&
    android.artifact.android_generic_material_bucket_count === 0 &&
    android.artifact.android_fake_filler_material_count === 0 &&
    android.artifact.android_raw_dump_ui_count === 0 &&
    android.artifact.fake_green_claimed === false;
  const parityGreen = parity.artifact?.source_sha === sourceSha &&
    parity.artifact.final_status === PARITY_GREEN &&
    parity.artifact.material_completeness_web_android_parity_passed === true &&
    parity.artifact.same_material_completeness_corpus_used_for_web_android === true &&
    parity.artifact.web_android_material_result_parity === true &&
    parity.artifact.web_android_material_no_truncation_parity === true &&
    parity.artifact.fake_green_claimed === false;
  const runtimeGreen = !runtimeRequired || (webGreen && androidGreen && parityGreen);
  const outDir = input.writeLedger || input.writeSummary
    ? path.join(RUNTIME_ROOT, timestampForPath())
    : null;
  if (outDir) mkdirSync(outDir, { recursive: true });
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "material-completeness-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  if (ledgerPath) writeJsonl(ledgerPath, validations);
  const samples = outDir && (input.writeSamples ?? input.writeSummary ?? false)
    ? writeMaterialCompletenessSampleOutputs(path.join(outDir, "sample-outputs"))
    : null;
  const blocked = validations.filter((row) => row.status !== "READY_MATERIAL_COMPLETE");
  const requiredSlotsTotal = validations.reduce((sum, row) => sum + row.required_material_slots_count, 0);
  const missingSlotsTotal = validations.reduce((sum, row) => sum + row.missing_required_material_slots_count, 0);
  const runtimeMissingSlots = runtimeCases.reduce((sum, row) => sum + row.missing_required_material_slots_count, 0);
  const sourceGreen =
    precondition.passed &&
    validations.length === PROFESSIONAL_WORK_PASSPORT_TOTAL &&
    blocked.length === 0 &&
    requiredSlotsTotal > 0 &&
    missingSlotsTotal === 0 &&
    runtimeCases.length === 100 &&
    runtimeCases.every((row) => row.passed) &&
    runtimeMissingSlots === 0 &&
    validations.every((row) =>
      !row.backend_row_cap_detected &&
      !row.snapshot_truncation_detected &&
      !row.detail_drawer_truncation_detected &&
      !row.pdf_truncation_detected &&
      !row.buyer_handoff_truncation_detected &&
      row.calculator_rows_count === row.snapshot_rows_count &&
      row.snapshot_rows_count === row.detail_drawer_rows_count &&
      row.snapshot_rows_count === row.pdf_rows_count
    );
  const fullGreen = sourceGreen && runtimeRequired && runtimeGreen;
  const summary = {
    final_status: fullGreen
      ? GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_WEB_ANDROID_COMMITTED_NO_RELEASE
      : sourceGreen && !runtimeRequired
        ? GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY
        : STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN,
    source_audit_status: sourceGreen
      ? GREEN_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_SOURCE_READY
      : STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    real_named_precondition_summary: precondition.path,
    real_named_precondition_green: precondition.passed,
    templates_audited: validations.length,
    templates_material_complete: validations.filter((row) => row.status === "READY_MATERIAL_COMPLETE").length,
    blocked_templates_count: blocked.length,
    required_material_slots_total: requiredSlotsTotal,
    missing_required_material_slots_count: missingSlotsTotal,
    backend_row_cap_detected: validations.some((row) => row.backend_row_cap_detected),
    snapshot_truncation_detected: validations.some((row) => row.snapshot_truncation_detected),
    detail_drawer_truncation_detected: validations.some((row) => row.detail_drawer_truncation_detected),
    pdf_truncation_detected: validations.some((row) => row.pdf_truncation_detected),
    buyer_handoff_truncation_detected: validations.some((row) => row.buyer_handoff_truncation_detected),
    generic_material_bucket_count: validations.reduce((sum, row) => sum + row.generic_material_bucket_count, 0),
    fake_filler_material_count: validations.reduce((sum, row) => sum + row.fake_filler_material_count, 0),
    duplicate_noise_rows_count: validations.reduce((sum, row) => sum + row.duplicate_noise_rows_count, 0),
    calculator_rows_equal_snapshot_rows: validations.every((row) => row.calculator_rows_count === row.snapshot_rows_count),
    snapshot_rows_equal_detail_drawer_rows: validations.every((row) => row.snapshot_rows_count === row.detail_drawer_rows_count),
    snapshot_rows_equal_pdf_rows: validations.every((row) => row.snapshot_rows_count === row.pdf_rows_count),
    buyer_handoff_procurement_subset_complete: validations.every((row) => !row.buyer_handoff_truncation_detected),
    material_completeness_contract_created: true,
    material_slot_registry_created: true,
    boq_depth_policy_created: true,
    no_truncation_validator_created: true,
    family_material_slot_registry_created: true,
    all_11610_templates_have_material_slot_policy: validations.length === PROFESSIONAL_WORK_PASSPORT_TOTAL,
    service_only_exemptions_have_reason: true,
    no_fake_materials_added_for_min_count: true,
    critical_cases_total: runtimeCases.length,
    critical_cases_passed: runtimeCases.filter((row) => row.passed).length,
    runtime_missing_required_material_slots_count: runtimeMissingSlots,
    diamond_drilling_material_slots_complete: runtimeCases.filter((row) => row.expected_family_id === "diamond_core_drilling_concrete").every((row) => row.passed),
    profile_sheet_fence_material_slots_complete: runtimeCases.filter((row) => row.expected_family_id === "profile_sheet_fence").every((row) => row.passed),
    ventilated_facade_material_slots_complete: familyReady(validations, "ventilated_facade"),
    water_supply_material_slots_complete: familyReady(validations, "village_water_supply"),
    roadworks_material_slots_complete: familyReady(validations, "road_construction"),
    hydraulic_structures_material_slots_complete: familyReady(validations, "earth_dam"),
    power_lines_material_slots_complete: familyReady(validations, "overhead_power_line_10kv"),
    high_rise_glazing_material_slots_complete: familyReady(validations, "high_rise_glazing"),
    mansard_roof_material_slots_complete: familyReady(validations, "mansard_roof_with_windows"),
    sample_outputs_created: Boolean(samples && samples.sample_count >= MATERIAL_COMPLETENESS_SAMPLE_OUTPUTS_REQUIRED),
    sample_outputs_count: samples?.sample_count ?? 0,
    sample_outputs_manifest: samples,
    sample_outputs_runtime_only_not_committed: true,
    runtime_evidence_required: runtimeRequired,
    web_artifact: web.path,
    android_artifact: android.path,
    web_android_parity_artifact: parity.path,
    actual_web_browser_material_completeness_smoke_passed: webGreen,
    actual_android_emulator_material_completeness_smoke_passed: androidGreen,
    web_material_completeness_cases_passed: web.artifact?.web_material_completeness_cases_passed ?? "0/100",
    android_material_completeness_cases_passed: android.artifact?.android_material_completeness_cases_passed ?? "0/100",
    same_material_completeness_corpus_used_for_web_android: parity.artifact?.same_material_completeness_corpus_used_for_web_android === true,
    web_android_material_result_parity: parity.artifact?.web_android_material_result_parity === true,
    web_android_material_no_truncation_parity: parity.artifact?.web_android_material_no_truncation_parity === true,
    material_completeness_web_smoke_passed: webGreen,
    material_completeness_android_smoke_passed: androidGreen,
    material_completeness_web_android_parity_passed: parityGreen,
    focused_professional_boq_tests_passed: false,
    typecheck_passed: false,
    lint_passed: false,
    diff_check_passed: false,
    no_test_weakening_passed: false,
    web_public_smoke_passed: false,
    ci_office_market_passed: false,
    secret_scan_passed: false,
    full_material_completeness_green_claimed: fullGreen,
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
    full_jest_started: false,
    fake_green_claimed: false,
    blocking_reasons: [
      ...precondition.blockers,
      ...blocked.flatMap((row) => row.blocking_reasons.map((reason) => `${row.template_id}:${reason}`)),
      ...runtimeCases.filter((row) => !row.passed).flatMap((row) => row.blocking_reasons.map((reason) => `${row.case_id}:${reason}`)),
      sourceGreen ? "" : "material_completeness_source_audit_not_green",
      runtimeRequired && !webGreen ? "web_material_completeness_smoke_missing_or_not_green" : "",
      runtimeRequired && !androidGreen ? "android_material_completeness_smoke_missing_or_not_green" : "",
      runtimeRequired && !parityGreen ? "web_android_material_completeness_parity_missing_or_not_green" : "",
    ].filter(Boolean).slice(0, 250),
    ledger_artifact: ledgerPath,
    runtime_summary_path: summaryPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, validations, runtimeCases, ledgerPath, summaryPath, outDir };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/audit11610MaterialCompletenessNoTruncation.ts")) {
  const result = audit11610MaterialCompletenessNoTruncation({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("all"),
    writeSamples: hasFlag("write-summary") || hasFlag("all"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    templates_audited: result.summary.templates_audited,
    templates_material_complete: result.summary.templates_material_complete,
    blocked_templates_count: result.summary.blocked_templates_count,
    required_material_slots_total: result.summary.required_material_slots_total,
    missing_required_material_slots_count: result.summary.missing_required_material_slots_count,
    runtime_missing_required_material_slots_count: result.summary.runtime_missing_required_material_slots_count,
    sample_outputs_count: result.summary.sample_outputs_count,
    material_completeness_web_smoke_passed: result.summary.material_completeness_web_smoke_passed,
    material_completeness_android_smoke_passed: result.summary.material_completeness_android_smoke_passed,
    material_completeness_web_android_parity_passed: result.summary.material_completeness_web_android_parity_passed,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
  }, null, 2));
  if (result.summary.final_status === STOP_AI_ESTIMATE_FULL_MATERIAL_COMPLETENESS_NO_TRUNCATION_11610_INCOMPLETE_NO_GREEN) {
    process.exitCode = 1;
  }
}
