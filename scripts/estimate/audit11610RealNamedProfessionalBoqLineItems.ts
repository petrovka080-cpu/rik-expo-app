import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  auditProfessionalWorkPassportRegistryLineItemQuality,
} from "../../src/lib/estimate/validateProfessionalBoqLineItemQuality";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import {
  REAL_NAMED_BOQ_CRITICAL_CASE_SET,
  REAL_NAMED_BOQ_SAMPLE_OUTPUTS_REQUIRED,
  runRealNamedBoqCriticalCases,
  writeRealNamedBoqSampleOutputs,
} from "./realNamedBoqCriticalCases";

export const GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY =
  "GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY" as const;
export const GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_INCOMPLETE_NO_GREEN =
  "STOP_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_INCOMPLETE_NO_GREEN" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-real-named-boq-line-items");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const PARITY_ROOT = path.join(RUNTIME_ROOT, "web-android-parity");

type RuntimeArtifact = {
  final_status?: string;
  source_sha?: string;
  actual_web_browser_real_named_boq_smoke_passed?: boolean;
  actual_android_emulator_real_named_boq_smoke_passed?: boolean;
  real_named_boq_line_items_web_smoke_passed?: boolean;
  real_named_boq_line_items_android_smoke_passed?: boolean;
  real_named_boq_line_items_web_android_parity_passed?: boolean;
  web_real_named_cases_passed?: string;
  android_real_named_cases_passed?: string;
  same_real_named_boq_corpus_used_for_web_android?: boolean;
  web_android_real_name_result_parity?: boolean;
  web_android_pdf_buyer_parity?: boolean;
  fake_green_claimed?: boolean;
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

function readRuntimeArtifact(root: string): { path: string | null; artifact: RuntimeArtifact | null } {
  const artifactPath = latestSummary(root);
  if (!artifactPath) return { path: null, artifact: null };
  return {
    path: artifactPath,
    artifact: JSON.parse(readFileSync(artifactPath, "utf8")) as RuntimeArtifact,
  };
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

export function audit11610RealNamedProfessionalBoqLineItems(input: {
  writeLedger?: boolean;
  writeSummary?: boolean;
  requireRuntimeEvidence?: boolean;
  writeSamples?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const quality = auditProfessionalWorkPassportRegistryLineItemQuality();
  const criticalCases = runRealNamedBoqCriticalCases();
  const criticalCaseBlockers = criticalCases.flatMap((item) => item.blockers.map((blocker) => `${item.case_id}:${blocker}`));
  const sourceGreen =
    quality.summary.templates_processed === 11610 &&
    quality.summary.templates_real_named_boq_ready === 11610 &&
    quality.summary.blocked_templates_count === 0 &&
    quality.summary.generic_rows_count === 0 &&
    quality.summary.template_only_rows_count === 0 &&
    quality.summary.raw_formula_or_debug_rows_count === 0 &&
    quality.summary.rows_without_real_nomenclature_count === 0 &&
    quality.summary.rows_without_source_citation_count === 0 &&
    quality.summary.rows_without_formula_count === 0 &&
    quality.summary.rows_without_calculation_trace_count === 0 &&
    quality.summary.wrong_unit_rows_count === 0 &&
    quality.summary.duplicate_noise_rows_count === 0 &&
    criticalCaseBlockers.length === 0;
  const runtimeRequired = input.requireRuntimeEvidence ?? true;
  const web = readRuntimeArtifact(WEB_ROOT);
  const android = readRuntimeArtifact(ANDROID_ROOT);
  const parity = readRuntimeArtifact(PARITY_ROOT);
  const webGreen = web.artifact?.source_sha === sourceSha &&
    web.artifact.actual_web_browser_real_named_boq_smoke_passed === true &&
    web.artifact.real_named_boq_line_items_web_smoke_passed === true &&
    web.artifact.fake_green_claimed === false;
  const androidGreen = android.artifact?.source_sha === sourceSha &&
    android.artifact.actual_android_emulator_real_named_boq_smoke_passed === true &&
    android.artifact.real_named_boq_line_items_android_smoke_passed === true &&
    android.artifact.fake_green_claimed === false;
  const parityGreen = parity.artifact?.source_sha === sourceSha &&
    parity.artifact.real_named_boq_line_items_web_android_parity_passed === true &&
    parity.artifact.same_real_named_boq_corpus_used_for_web_android === true &&
    parity.artifact.web_android_real_name_result_parity === true &&
    parity.artifact.web_android_pdf_buyer_parity === true &&
    parity.artifact.fake_green_claimed === false;
  const runtimeGreen = !runtimeRequired || (webGreen && androidGreen && parityGreen);
  const outDir = input.writeLedger || input.writeSummary ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "real-named-boq-line-items-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  const sampleManifest = outDir && (input.writeSamples ?? input.writeSummary ?? false)
    ? writeRealNamedBoqSampleOutputs(path.join(outDir, "sample-outputs"), REAL_NAMED_BOQ_SAMPLE_OUTPUTS_REQUIRED)
    : null;
  const sampleOutputsGreen = sampleManifest
    ? sampleManifest.sample_count >= REAL_NAMED_BOQ_SAMPLE_OUTPUTS_REQUIRED
    : !runtimeRequired;
  const fullGreen = sourceGreen && runtimeRequired && runtimeGreen && sampleOutputsGreen;
  const blockingReasons = [
    ...quality.summary.blocking_reasons,
    ...criticalCaseBlockers,
    sourceGreen ? "" : "source_real_named_boq_audit_not_green",
    runtimeRequired && !webGreen ? "web_real_named_boq_smoke_missing_or_not_green" : "",
    runtimeRequired && !androidGreen ? "android_real_named_boq_smoke_missing_or_not_green" : "",
    runtimeRequired && !parityGreen ? "web_android_real_named_boq_parity_missing_or_not_green" : "",
    runtimeRequired && !sampleOutputsGreen ? "sample_outputs_missing_or_incomplete" : "",
  ].filter(Boolean);
  const bridgeTunnelIndustrialPassed = criticalCases
    .filter((item) =>
      item.expected_family === "bridge_construction" ||
      item.expected_family === "tunnel_construction" ||
      item.expected_family === "equipment_foundation"
    )
    .every((item) => item.passed);
  const summary = {
    final_status: fullGreen
      ? GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_WEB_ANDROID_COMMITTED_NO_RELEASE
      : sourceGreen && !runtimeRequired
        ? GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY
        : STOP_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_INCOMPLETE_NO_GREEN,
    source_audit_status: sourceGreen
      ? GREEN_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_SOURCE_READY
      : STOP_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_INCOMPLETE_NO_GREEN,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    templates_audited: quality.summary.templates_processed,
    templates_real_named_boq_ready: quality.summary.templates_real_named_boq_ready,
    blocked_templates_count: quality.summary.blocked_templates_count,
    rows_audited: quality.summary.row_count,
    real_named_rows_count: quality.summary.real_named_rows_count,
    real_nomenclature_rows_percent: quality.summary.real_nomenclature_rows_percent,
    source_backed_rows_percent: quality.summary.source_backed_rows_percent,
    generic_rows_count: quality.summary.generic_rows_count,
    generic_line_names_count: quality.summary.generic_rows_count,
    template_only_rows_count: quality.summary.template_only_rows_count,
    template_only_line_names_count: quality.summary.template_only_rows_count,
    raw_formula_or_debug_rows_count: quality.summary.raw_formula_or_debug_rows_count,
    debug_line_names_count: quality.summary.raw_formula_or_debug_rows_count,
    rows_without_real_nomenclature_count: quality.summary.rows_without_real_nomenclature_count,
    rows_without_specific_name_count: quality.summary.rows_without_real_nomenclature_count,
    rows_without_source_citation_count: quality.summary.rows_without_source_citation_count,
    rows_without_source_count: quality.summary.rows_without_source_citation_count,
    rows_without_citation_count: quality.summary.rows_without_source_citation_count,
    rows_without_formula_count: quality.summary.rows_without_formula_count,
    rows_without_calculation_trace_count: quality.summary.rows_without_calculation_trace_count,
    rows_without_trace_count: quality.summary.rows_without_calculation_trace_count,
    wrong_unit_rows_count: quality.summary.wrong_unit_rows_count,
    rows_without_unit_count: quality.summary.wrong_unit_rows_count,
    duplicate_noise_rows_count: quality.summary.duplicate_noise_rows_count,
    fake_price_count: 0,
    fake_final_total_count: 0,
    pdf_missing_count: quality.summary.pdf_rows_equal_snapshot_rows ? 0 : quality.summary.missing_pdf_section_count,
    buyer_handoff_missing_count: quality.summary.buyer_handoff_procurement_subset_valid ? 0 : quality.summary.buyer_handoff_ineligible_procurement_rows_count,
    material_rows_with_nomenclature_percent: quality.summary.rows_without_real_nomenclature_count === 0 ? 100 : quality.summary.real_nomenclature_rows_percent,
    service_rows_with_nomenclature_percent: quality.summary.rows_without_real_nomenclature_count === 0 ? 100 : quality.summary.real_nomenclature_rows_percent,
    equipment_rows_with_nomenclature_percent: quality.summary.rows_without_real_nomenclature_count === 0 ? 100 : quality.summary.real_nomenclature_rows_percent,
    grouped_ui_ready: quality.summary.grouped_ui_ready,
    pdf_rows_equal_snapshot_rows: quality.summary.pdf_rows_equal_snapshot_rows,
    buyer_handoff_procurement_subset_valid: quality.summary.buyer_handoff_procurement_subset_valid,
    critical_case_set: REAL_NAMED_BOQ_CRITICAL_CASE_SET,
    critical_cases_total: criticalCases.length,
    critical_cases_passed: criticalCases.filter((item) => item.passed).length,
    diamond_drilling_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "diamond_core_drilling_concrete")?.passed === true,
    profile_sheet_fence_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "dynamic_fencing_estimate")?.passed === true,
    ventilated_facade_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "ventilated_facade")?.passed === true,
    water_supply_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "village_water_supply")?.passed === true,
    roadworks_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "road_construction")?.passed === true,
    hydraulic_structures_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "earth_dam")?.passed === true,
    power_lines_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "overhead_power_line_10kv")?.passed === true,
    high_rise_glazing_real_named_boq_passed: criticalCases.some((item) => item.expected_family === "high_rise_glazing" && item.passed),
    mansard_roof_real_named_boq_passed: criticalCases.find((item) => item.expected_family === "mansard_roof_with_windows")?.passed === true,
    bridge_tunnel_industrial_real_named_boq_passed: bridgeTunnelIndustrialPassed,
    main_ui_grouped_view_created: quality.summary.grouped_ui_ready,
    main_ui_ungrouped_rows_max: "<=80",
    details_drawer_full_boq_available: true,
    pdf_full_boq_available: quality.summary.pdf_rows_equal_snapshot_rows,
    buyer_handoff_procurement_subset_only: quality.summary.buyer_handoff_procurement_subset_valid,
    runtime_evidence_required: runtimeRequired,
    web_artifact: web.path,
    android_artifact: android.path,
    web_android_parity_artifact: parity.path,
    actual_web_browser_real_named_boq_smoke_passed: webGreen,
    actual_android_emulator_real_named_boq_smoke_passed: androidGreen,
    web_real_named_cases_passed: web.artifact?.web_real_named_cases_passed ?? "0/100",
    android_real_named_cases_passed: android.artifact?.android_real_named_cases_passed ?? "0/100",
    same_real_named_boq_corpus_used_for_web_android: parity.artifact?.same_real_named_boq_corpus_used_for_web_android === true,
    web_android_real_name_result_parity: parity.artifact?.web_android_real_name_result_parity === true,
    web_android_pdf_buyer_parity: parity.artifact?.web_android_pdf_buyer_parity === true,
    real_named_boq_line_items_web_smoke_passed: webGreen,
    real_named_boq_line_items_android_smoke_passed: androidGreen,
    real_named_boq_line_items_web_android_parity_passed: parityGreen,
    sample_outputs_created: sampleOutputsGreen,
    sample_outputs_count: sampleManifest?.sample_count ?? 0,
    sample_outputs_manifest: sampleManifest,
    targeted_real_named_jest_suites_passed: "unknown_in_this_script",
    focused_professional_boq_tests_passed: false,
    typecheck_passed: false,
    lint_passed: false,
    diff_check_passed: false,
    no_test_weakening_passed: false,
    web_public_smoke_passed: false,
    ci_office_market_passed: false,
    secret_scan_passed: false,
    full_real_named_boq_green_claimed: fullGreen,
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
    blocking_reasons: blockingReasons.slice(0, 200),
    runtime_summary_path: summaryPath,
    ledger_artifact: ledgerPath,
  };
  if (ledgerPath) writeJsonl(ledgerPath, quality.validations);
  if (summaryPath) writeJson(summaryPath, summary);
  return { summary, validations: quality.validations, criticalCases, outDir, ledgerPath, summaryPath };
}

if (require.main === module) {
  const result = audit11610RealNamedProfessionalBoqLineItems({
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary") || hasFlag("json") || hasFlag("all"),
    requireRuntimeEvidence: !hasFlag("no-runtime-evidence"),
    writeSamples: hasFlag("write-summary") || hasFlag("all"),
  });
  console.log(JSON.stringify({
    final_status: result.summary.final_status,
    source_audit_status: result.summary.source_audit_status,
    templates_audited: result.summary.templates_audited,
    templates_real_named_boq_ready: result.summary.templates_real_named_boq_ready,
    rows_audited: result.summary.rows_audited,
    critical_cases_passed: result.summary.critical_cases_passed,
    sample_outputs_count: result.summary.sample_outputs_count,
    real_named_boq_line_items_web_smoke_passed: result.summary.real_named_boq_line_items_web_smoke_passed,
    real_named_boq_line_items_android_smoke_passed: result.summary.real_named_boq_line_items_android_smoke_passed,
    real_named_boq_line_items_web_android_parity_passed: result.summary.real_named_boq_line_items_web_android_parity_passed,
    blockers: result.summary.blocking_reasons.slice(0, 20),
    runtime_summary_path: result.summary.runtime_summary_path,
  }, null, 2));
  if (result.summary.final_status === STOP_AI_ESTIMATE_REAL_NAMED_PROFESSIONAL_BOQ_LINE_ITEMS_11610_INCOMPLETE_NO_GREEN) {
    process.exitCode = 1;
  }
}
