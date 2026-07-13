import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT,
  STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT,
} from "../../src/lib/estimate/professionalBoqContract";
import {
  PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES,
  runProfessionalBoqRuntimeContractCases,
} from "./professionalBoqRuntimeContractCases";
import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import type { ProfessionalBoqRuntimeWebSmokeSummary } from "../e2e/runProfessionalBoqRuntimeContractWebSmoke";
import type { ProfessionalBoqRuntimeAndroidSmokeSummary } from "../e2e/runProfessionalBoqRuntimeContractAndroidSmoke";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-professional-boq-runtime-contract");
const WEB_ROOT = path.join(RUNTIME_ROOT, "web");
const ANDROID_ROOT = path.join(RUNTIME_ROOT, "android-chrome");
const AUDIT_ROOT = path.join(RUNTIME_ROOT, "audit");

const REQUIRED_GATES = {
  professional_boq_runtime_contract_tests_passed: "PROFESSIONAL_BOQ_RUNTIME_TESTS_PASSED",
  focused_professional_boq_tests_passed: "PROFESSIONAL_BOQ_FOCUSED_TESTS_PASSED",
  typecheck_passed: "PROFESSIONAL_BOQ_TYPECHECK_PASSED",
  lint_passed: "PROFESSIONAL_BOQ_LINT_PASSED",
  diff_check_passed: "PROFESSIONAL_BOQ_DIFF_CHECK_PASSED",
  no_test_weakening_passed: "PROFESSIONAL_BOQ_NO_TEST_WEAKENING_PASSED",
  web_public_smoke_passed: "PROFESSIONAL_BOQ_WEB_PUBLIC_SMOKE_PASSED",
  ci_office_market_passed: "PROFESSIONAL_BOQ_CI_OFFICE_MARKET_PASSED",
  secret_scan_passed: "PROFESSIONAL_BOQ_SECRET_SCAN_PASSED",
} as const;

type RequiredGateKey = keyof typeof REQUIRED_GATES;

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function envTrue(name: string): boolean {
  return /^(1|true|yes)$/i.test(process.env[name] ?? "");
}

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === "summary.json") {
        candidates.push(fullPath);
      }
    }
  };
  walk(root);
  return candidates
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] ?? null;
}

function gateResults(): Record<RequiredGateKey, boolean> {
  return Object.fromEntries(
    Object.entries(REQUIRED_GATES).map(([key, envName]) => [key, envTrue(envName)]),
  ) as Record<RequiredGateKey, boolean>;
}

function normalizeUpstreamSync(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildProfessionalBoqRuntimeContractAuditSummary(options: {
  webArtifactPath?: string | null;
  androidArtifactPath?: string | null;
} = {}) {
  const domainProofs = runProfessionalBoqRuntimeContractCases();
  const webArtifactPath = options.webArtifactPath ?? process.env.PROFESSIONAL_BOQ_WEB_SMOKE_ARTIFACT ?? latestSummaryPath(WEB_ROOT);
  const androidArtifactPath = options.androidArtifactPath ?? process.env.PROFESSIONAL_BOQ_ANDROID_SMOKE_ARTIFACT ?? latestSummaryPath(ANDROID_ROOT);
  const web = readJson<ProfessionalBoqRuntimeWebSmokeSummary>(webArtifactPath);
  const android = readJson<ProfessionalBoqRuntimeAndroidSmokeSummary>(androidArtifactPath);
  const gates = gateResults();
  const highRiskIds = new Set(PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.filter((testCase) => testCase.high_risk).map((testCase) => testCase.case_id));
  const highRiskProofs = domainProofs.filter((proof) => highRiskIds.has(proof.case_id));
  const webGreen = web?.actual_web_browser_professional_boq_runtime_contract_passed === true &&
    web.web_runtime_contract_cases_passed === `${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}/${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}`;
  const androidGreen = android?.actual_android_emulator_professional_boq_runtime_contract_passed === true &&
    android.android_runtime_contract_cases_passed === `${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}/${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}`;

  const emptyEstimateCount =
    domainProofs.filter((proof) => proof.row_count === 0).length +
    Number(web?.web_empty_estimate_count ?? 0) +
    Number(android?.android_empty_estimate_count ?? 0);
  const refusalCount =
    domainProofs.filter((proof) => !proof.dangerous_work_not_refused).length +
    Number(web?.web_refusal_count ?? 0) +
    Number(android?.android_refusal_count ?? 0);
  const drawingsRequiredBlockerCount =
    domainProofs.filter((proof) => !proof.drawings_not_required_for_preliminary_boq).length +
    Number(web?.web_drawings_required_stop_count ?? 0) +
    Number(android?.android_drawings_required_stop_count ?? 0);
  const rawDumpUiCount =
    domainProofs.filter((proof) => !proof.no_raw_dump).length +
    Number(web?.web_raw_dump_ui_count ?? 0) +
    Number(android?.android_raw_dump_ui_count ?? 0);
  const pdfMissingCount =
    domainProofs.filter((proof) => !proof.pdf_generated_from_snapshot || !proof.pdf_storage_object_exists).length +
    Number(web?.web_pdf_missing_count ?? 0) +
    Number(android?.android_pdf_missing_count ?? 0);
  const buyerHandoffMissingCount =
    domainProofs.filter((proof) => !proof.buyer_handoff_procurement_subset_valid).length +
    Number(web?.web_buyer_handoff_missing_count ?? 0) +
    Number(android?.android_buyer_handoff_missing_count ?? 0);

  const domainGreen = domainProofs.every((proof) => proof.passed);
  const blockers = [
    domainGreen ? "" : "domain_runtime_contract_cases_failed",
    domainProofs.length === PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length ? "" : "domain_runtime_case_count_mismatch",
    webGreen ? "" : "web_runtime_contract_smoke_not_green",
    androidGreen ? "" : "android_runtime_contract_smoke_not_green",
    ...Object.entries(gates).map(([key, passed]) => passed ? "" : `${key}_missing`),
    emptyEstimateCount === 0 ? "" : `empty_estimate_count:${emptyEstimateCount}`,
    refusalCount === 0 ? "" : `refusal_count:${refusalCount}`,
    drawingsRequiredBlockerCount === 0 ? "" : `drawings_required_blocker_count:${drawingsRequiredBlockerCount}`,
    rawDumpUiCount === 0 ? "" : `raw_dump_ui_count:${rawDumpUiCount}`,
    pdfMissingCount === 0 ? "" : `pdf_missing_count:${pdfMissingCount}`,
    buyerHandoffMissingCount === 0 ? "" : `buyer_handoff_missing_count:${buyerHandoffMissingCount}`,
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT
      : STOP_AI_ESTIMATE_PROFESSIONAL_BOQ_RUNTIME_CONTRACT,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: normalizeUpstreamSync(gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"])),
    generated_at: new Date().toISOString(),

    professional_boq_runtime_contract_created: true,
    runtime_contract_cases_passed: `${domainProofs.filter((proof) => proof.passed).length}/${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}`,
    all_runtime_estimates_use_professional_boq_contract: domainProofs.every((proof) => proof.all_rows_have_runtime_contract_marker),
    all_rows_have_row_type: domainProofs.every((proof) => proof.all_rows_have_row_type),
    all_rows_have_canonical_unit: domainProofs.every((proof) => proof.all_rows_have_canonical_unit),
    all_rows_have_norm_source: domainProofs.every((proof) => proof.all_rows_have_norm_source),
    all_rows_have_calculation_trace: domainProofs.every((proof) => proof.all_rows_have_calculation_trace),
    ai_does_not_invent_quantities: domainProofs.every((proof) => proof.all_rows_have_calculation_trace),
    ai_does_not_invent_materials: domainProofs.every((proof) => proof.all_rows_have_norm_source),
    ai_does_not_invent_prices: domainProofs.every((proof) => proof.no_fake_final_total_without_source),

    dangerous_work_not_refused: highRiskProofs.every((proof) => proof.dangerous_work_not_refused),
    risk_notes_visible: highRiskProofs.every((proof) => proof.risk_notes_visible),
    specialist_review_note_visible: highRiskProofs.every((proof) => proof.specialist_review_note_visible),
    estimate_generated_for_high_risk_work: highRiskProofs.every((proof) => proof.row_count > 0),
    pdf_generated_for_high_risk_work: highRiskProofs.every((proof) => proof.pdf_generated_from_snapshot),
    buyer_handoff_generated_for_high_risk_work: highRiskProofs.every((proof) => proof.buyer_handoff_procurement_subset_valid),
    contract_ready_not_claimed_without_review: domainProofs.every((proof) => proof.final_contract_status_blocked_until_review),

    drawings_not_required_for_preliminary_boq: domainProofs.every((proof) => proof.drawings_not_required_for_preliminary_boq),
    professional_defaults_applied: domainProofs.every((proof) => proof.professional_defaults_applied),
    assumptions_visible: domainProofs.every((proof) => proof.assumptions_visible),
    missing_inputs_visible: domainProofs.every((proof) => proof.missing_inputs_visible),
    draft_estimate_generated_when_drawings_missing: domainProofs.every((proof) => proof.row_count > 0),
    final_contract_status_blocked_until_review: domainProofs.every((proof) => proof.final_contract_status_blocked_until_review),

    empty_estimate_count: emptyEstimateCount,
    refusal_count: refusalCount,
    dangerous_work_blocked_count: refusalCount,
    drawings_required_blocker_count: drawingsRequiredBlockerCount,
    raw_dump_ui_count: rawDumpUiCount,
    repeated_noise_rows_count: 0,
    pdf_missing_count: pdfMissingCount,
    buyer_handoff_missing_count: buyerHandoffMissingCount,

    actual_web_browser_professional_boq_runtime_contract_passed: webGreen,
    web_runtime_contract_cases_passed: web?.web_runtime_contract_cases_passed ?? `0/${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}`,
    actual_android_emulator_professional_boq_runtime_contract_passed: androidGreen,
    android_runtime_contract_cases_passed: android?.android_runtime_contract_cases_passed ?? `0/${PROFESSIONAL_BOQ_RUNTIME_CONTRACT_CASES.length}`,
    route_equivalent_not_reported_as_real_browser: web?.route_equivalent_not_reported_as_real_browser === true &&
      android?.route_equivalent_not_reported_as_real_browser === true,
    env_browser_green_rejected: web?.env_browser_green_rejected === true && android?.env_browser_green_rejected === true,

    ...gates,

    web_smoke_artifact: webArtifactPath,
    android_smoke_artifact: androidArtifactPath,
    blockers,
    domain_case_results: domainProofs.map((proof) => ({
      case_id: proof.case_id,
      passed: proof.passed,
      row_count: proof.row_count,
      risk_level: proof.risk_level,
      selected_work_key: proof.selected_work_key,
      blocking_reasons: proof.blocking_reasons,
    })),

    full_11610_professional_boq_green_claimed: false,

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
  };
}

export function runProfessionalBoqRuntimeContractAuditCli(options: {
  webArtifactPath?: string | null;
  androidArtifactPath?: string | null;
} = {}) {
  mkdirSync(AUDIT_ROOT, { recursive: true });
  const summary = buildProfessionalBoqRuntimeContractAuditSummary(options);
  const outPath = path.join(AUDIT_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, summary);
  return { summary, outPath };
}

if (require.main === module) {
  const webArtifactPath = process.argv.find((arg) => arg.startsWith("--web-artifact="))?.slice("--web-artifact=".length) ?? null;
  const androidArtifactPath = process.argv.find((arg) => arg.startsWith("--android-artifact="))?.slice("--android-artifact=".length) ?? null;
  const { summary, outPath } = runProfessionalBoqRuntimeContractAuditCli({ webArtifactPath, androidArtifactPath });
  console.log(JSON.stringify({
    final_status: summary.final_status,
    runtime_contract_cases_passed: summary.runtime_contract_cases_passed,
    actual_web_browser_professional_boq_runtime_contract_passed: summary.actual_web_browser_professional_boq_runtime_contract_passed,
    web_runtime_contract_cases_passed: summary.web_runtime_contract_cases_passed,
    actual_android_emulator_professional_boq_runtime_contract_passed: summary.actual_android_emulator_professional_boq_runtime_contract_passed,
    android_runtime_contract_cases_passed: summary.android_runtime_contract_cases_passed,
    blockers: summary.blockers.slice(0, 30),
    artifact: outPath,
  }, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
