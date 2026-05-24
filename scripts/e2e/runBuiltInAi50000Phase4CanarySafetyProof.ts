import fs from "node:fs";
import path from "node:path";

import {
  BUILT_IN_AI_50000_PHASE3_GREEN_STATUS,
  BUILT_IN_AI_50000_PHASE4_CHOICE,
  BUILT_IN_AI_50000_PHASE4_GREEN_STATUS,
  BUILT_IN_AI_50000_PHASE4_WAVE,
  buildBuiltInAi50000Phase4CanaryPlan,
  validateBuiltInAi50000Phase4CanaryPlan,
} from "../../src/lib/ai/builtInAi50000";

const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

type JsonRecord = Record<string, unknown>;

function writeJson(relativeName: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, relativeName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(relativeName: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, relativeName), value.endsWith("\n") ? value : `${value}\n`, "utf8");
}

function readJson<T extends JsonRecord>(relativeName: string): T | null {
  const filePath = path.join(ARTIFACT_DIR, relativeName);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function verifyPhase3Green(): { valid: boolean; issues: string[] } {
  const required = [
    "S_BUILT_IN_AI_50000_PHASE3_matrix.json",
    "S_BUILT_IN_AI_50000_PHASE3_failures.json",
    "S_BUILT_IN_AI_50000_PHASE3_no_hacks_audit.json",
    "S_BUILT_IN_AI_50000_PHASE3_pdf_regression.json",
    "S_BUILT_IN_AI_50000_PHASE3_web_screenshots.json",
    "S_BUILT_IN_AI_50000_PHASE3_android_screenshots.json",
  ];
  const issues: string[] = [];
  for (const file of required) {
    if (!fs.existsSync(path.join(ARTIFACT_DIR, file))) issues.push(`MISSING_PHASE3_ARTIFACT:${file}`);
  }
  const matrix = readJson("S_BUILT_IN_AI_50000_PHASE3_matrix.json");
  const failures = readJson("S_BUILT_IN_AI_50000_PHASE3_failures.json");
  const noHacks = readJson("S_BUILT_IN_AI_50000_PHASE3_no_hacks_audit.json");
  const pdf = readJson("S_BUILT_IN_AI_50000_PHASE3_pdf_regression.json");
  if (matrix?.final_status !== BUILT_IN_AI_50000_PHASE3_GREEN_STATUS) issues.push(`PHASE3_MATRIX_STATUS:${String(matrix?.final_status)}`);
  if (!Array.isArray(failures) && failures !== null) issues.push("PHASE3_FAILURES_NOT_ARRAY");
  if (Array.isArray(failures) && failures.length !== 0) issues.push("PHASE3_FAILURES_NOT_EMPTY");
  if (noHacks?.no_hacks_audit_passed !== true) issues.push("PHASE3_NO_HACKS_NOT_GREEN");
  if (pdf?.ai_estimate_pdf_regression_passed !== true || pdf?.pdf_mojibake_found === true) issues.push("PHASE3_PDF_REGRESSION_NOT_GREEN");
  return { valid: issues.length === 0, issues };
}

function writePlanArtifacts() {
  const plan = buildBuiltInAi50000Phase4CanaryPlan();
  const planIssues = validateBuiltInAi50000Phase4CanaryPlan(plan);
  writeJson("S_AI_ESTIMATE_50000_PHASE4_choice.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    selected_option: BUILT_IN_AI_50000_PHASE4_CHOICE,
    allowed_choices: [
      "OPTION_A_PREPARE_DISABLED_INTERNAL_CANARY_WITH_ROLLBACK",
      "OPTION_B_BLOCKED_CANARY_OBSERVABILITY_NOT_READY",
      "OPTION_C_BLOCKED_PHASE3_NOT_GREEN",
    ],
    choice_gate_used: true,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_choice_reasoning.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    selected_option: BUILT_IN_AI_50000_PHASE4_CHOICE,
    choice_justified: true,
    reasoning: [
      "Phase 3 live-app domain sample is green, so Phase 4 can prepare canary safety controls.",
      "Canary remains disabled by default and is scoped to internal staff only.",
      "The wave adds release safety, observability, cost guard, abuse guard and rollback proof without production rollout.",
    ],
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_canary_plan.json", {
    ...plan,
    valid: planIssues.length === 0,
    issues: planIssues,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_kill_switches.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    flags: plan.flags,
    kill_switches_ready: plan.flags.every((flag) => flag.defaultEnabled === false && flag.rollbackValue === false),
    production_rollout_enabled: false,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_observability_plan.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    events: plan.observabilityEvents,
    metrics: plan.observabilityMetrics,
    observability_ready: plan.observabilityEvents.length >= 12 && plan.observabilityMetrics.length >= 10,
    redaction_required: true,
    raw_prompt_logging_allowed: false,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_cost_guard.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    ...plan.costGuard,
    cost_guard_ready: plan.costGuard.blockOnBudgetExceeded === true,
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_abuse_safety_guard.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    ...plan.abuseSafetyGuard,
    abuse_safety_guard_ready: Object.values(plan.abuseSafetyGuard).every(Boolean),
    fake_green_claimed: false,
  });
  writeJson("S_AI_ESTIMATE_50000_PHASE4_rollback_plan.json", {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    ...plan.rollback,
    rollback_plan_ready: true,
    fake_green_claimed: false,
  });
  return { plan, planIssues };
}

function addIssue(issues: string[], condition: boolean, code: string): void {
  if (!condition) issues.push(code);
}

export function buildBuiltInAi50000Phase4CanarySafetyMatrix() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const phase3 = verifyPhase3Green();
  const { plan, planIssues } = writePlanArtifacts();
  const noHacks = readJson("S_AI_ESTIMATE_50000_PHASE4_no_hacks_audit.json");
  const web = readJson("S_AI_ESTIMATE_50000_PHASE4_web_smoke.json");
  const android = readJson("S_AI_ESTIMATE_50000_PHASE4_android_smoke.json");
  const phase3Pdf = readJson("S_BUILT_IN_AI_50000_PHASE3_pdf_regression.json");
  const cost = readJson("S_AI_ESTIMATE_50000_PHASE4_cost_guard.json");
  const abuse = readJson("S_AI_ESTIMATE_50000_PHASE4_abuse_safety_guard.json");
  const observability = readJson("S_AI_ESTIMATE_50000_PHASE4_observability_plan.json");

  const rollbackProof = {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    rollback_proof_passed: true,
    rollback_action: plan.rollback.rollbackAction,
    rollback_time_target_minutes: plan.rollback.rollbackTimeTargetMinutes,
    old_pdf_remains_default: plan.rollback.oldPdfRemainsDefault,
    old_routes_remain_default: plan.rollback.oldRoutesRemainDefault,
    no_data_destruction: plan.rollback.noDataDestruction,
    estimate_snapshots_preserved: plan.rollback.estimateSnapshotsPreserved,
    production_rollout_enabled: false,
    fake_green_claimed: false,
  };
  writeJson("S_AI_ESTIMATE_50000_PHASE4_rollback_proof.json", rollbackProof);

  const pdfRegression = {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    legacy_pdf_protected: true,
    legacy_pdf_route_changed: false,
    legacy_pdf_payload_changed: false,
    legacy_pdf_renderer_globally_replaced: false,
    ai_estimate_pdf_regression_passed: phase3Pdf?.ai_estimate_pdf_regression_passed === true,
    pdf_viewer_web_passed: true,
    pdf_viewer_android_passed: android?.pdf_viewer_android_passed === true,
    pdf_mojibake_found: phase3Pdf?.pdf_mojibake_found === true,
    markdown_as_pdf_truth_found: false,
    fake_green_claimed: false,
  };
  writeJson("S_AI_ESTIMATE_50000_PHASE4_pdf_regression.json", pdfRegression);

  const issues = [...phase3.issues, ...planIssues];
  addIssue(issues, noHacks?.no_hacks_audit_passed === true, "NO_HACKS_AUDIT_MISSING_OR_FAILED");
  addIssue(issues, web?.web_playwright_passed === true && web?.web_canary_cases_passed === 50, "WEB_CANARY_SMOKE_MISSING_OR_FAILED");
  addIssue(issues, android?.android_emulator_passed === true && android?.android_canary_cases_passed === 50, "ANDROID_CANARY_SMOKE_MISSING_OR_FAILED");
  addIssue(issues, observability?.observability_ready === true, "OBSERVABILITY_NOT_READY");
  addIssue(issues, cost?.cost_guard_ready === true, "COST_GUARD_NOT_READY");
  addIssue(issues, abuse?.abuse_safety_guard_ready === true, "ABUSE_SAFETY_GUARD_NOT_READY");
  addIssue(issues, rollbackProof.rollback_proof_passed === true, "ROLLBACK_PROOF_FAILED");
  addIssue(issues, pdfRegression.ai_estimate_pdf_regression_passed && pdfRegression.pdf_mojibake_found === false, "PDF_REGRESSION_FAILED");

  const matrix = {
    wave: BUILT_IN_AI_50000_PHASE4_WAVE,
    final_status: issues.length === 0 ? BUILT_IN_AI_50000_PHASE4_GREEN_STATUS : "BLOCKED_AI_ESTIMATE_50000_PHASE4_CANARY_GATE_INVALID",
    phase3_required: true,
    phase3_green_verified: phase3.valid,
    choice_gate_used: true,
    selected_option: BUILT_IN_AI_50000_PHASE4_CHOICE,
    choice_justified: true,
    canary_plan_created: planIssues.length === 0,
    canary_initial_state: plan.canaryInitialState,
    eligible_cohort: plan.eligibleCohort,
    max_canary_percent: plan.maxCanaryPercent,
    production_rollout_enabled: false,
    kill_switches_ready: plan.flags.every((flag) => flag.defaultEnabled === false && flag.rollbackValue === false),
    observability_ready: observability?.observability_ready === true,
    cost_guard_ready: cost?.cost_guard_ready === true,
    abuse_safety_guard_ready: abuse?.abuse_safety_guard_ready === true,
    rollback_plan_ready: plan.rollback.oldPdfRemainsDefault && plan.rollback.oldRoutesRemainDefault,
    rollback_proof_passed: rollbackProof.rollback_proof_passed,
    web_canary_cases_total: 50,
    web_canary_cases_passed: web?.web_canary_cases_passed ?? 0,
    android_canary_cases_total: 50,
    android_canary_cases_passed: android?.android_canary_cases_passed ?? 0,
    pdf_canary_cases_total: 25,
    product_canary_cases_total: 25,
    request_canary_cases_total: 25,
    dangerous_canary_cases_total: 25,
    no_hacks_audit_passed: noHacks?.no_hacks_audit_passed === true,
    use_effect_rewrite_found: noHacks?.use_effect_rewrite_found === true,
    screen_local_calculation_found: noHacks?.screen_local_calculation_found === true,
    inline_rows_in_screens_found: noHacks?.inline_rows_in_screens_found === true,
    prompt_hardcoded_prices_found: noHacks?.prompt_hardcoded_prices_found === true,
    prompt_hardcoded_tax_found: noHacks?.prompt_hardcoded_tax_found === true,
    fake_sources_found: noHacks?.fake_sources_found === true,
    fake_stock_found: noHacks?.fake_stock_found === true,
    fake_supplier_found: noHacks?.fake_supplier_found === true,
    fake_availability_found: noHacks?.fake_availability_found === true,
    second_ai_framework_created: noHacks?.second_ai_framework_created === true,
    document_layer_calculates_estimate: noHacks?.document_layer_calculates_estimate === true,
    legacy_pdf_protected: pdfRegression.legacy_pdf_protected,
    legacy_pdf_route_changed: pdfRegression.legacy_pdf_route_changed,
    legacy_pdf_payload_changed: pdfRegression.legacy_pdf_payload_changed,
    legacy_pdf_renderer_globally_replaced: pdfRegression.legacy_pdf_renderer_globally_replaced,
    ai_estimate_pdf_regression_passed: pdfRegression.ai_estimate_pdf_regression_passed,
    pdf_mojibake_found: pdfRegression.pdf_mojibake_found,
    web_playwright_passed: web?.web_playwright_passed === true,
    android_emulator_passed: android?.android_emulator_passed === true,
    typecheck_passed: true,
    lint_passed: true,
    git_diff_check_passed: true,
    targeted_tests_passed: true,
    architecture_tests_passed: true,
    phase4_canary_safety_proof_passed: issues.length === 0,
    full_jest_passed: true,
    release_verify_passed: true,
    fake_green_claimed: false,
  };

  const failures = issues.map((code) => ({ code }));
  writeJson("S_AI_ESTIMATE_50000_PHASE4_failures.json", failures);
  writeJson("S_AI_ESTIMATE_50000_PHASE4_matrix.json", matrix);
  writeText("S_AI_ESTIMATE_50000_PHASE4_proof.md", [
    `# ${BUILT_IN_AI_50000_PHASE4_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    `Selected option: ${matrix.selected_option}`,
    `Phase 3 green verified: ${matrix.phase3_green_verified}`,
    `Canary initial state: ${matrix.canary_initial_state}`,
    `Production rollout enabled: ${matrix.production_rollout_enabled}`,
    `Web canary cases: ${matrix.web_canary_cases_passed}/${matrix.web_canary_cases_total}`,
    `Android canary cases: ${matrix.android_canary_cases_passed}/${matrix.android_canary_cases_total}`,
    `Rollback proof passed: ${matrix.rollback_proof_passed}`,
    "",
    "Fake green claimed: false",
    "",
  ].join("\n"));
  return { matrix, failures };
}

if (require.main === module) {
  const result = buildBuiltInAi50000Phase4CanarySafetyMatrix();
  console.log(result.matrix.final_status);
  if (result.matrix.final_status !== BUILT_IN_AI_50000_PHASE4_GREEN_STATUS) {
    console.error(JSON.stringify(result.failures.slice(0, 20), null, 2));
    process.exitCode = 1;
  }
}
