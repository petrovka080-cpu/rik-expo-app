import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { newestSummary } from "../e2e/renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE,
  type AiEstimateNormativeCompletenessAndroidSummary,
} from "../e2e/runAiEstimateNormativeCompletenessAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY,
  type AiEstimateNormativeCompletenessParitySummary,
} from "../e2e/runAiEstimateNormativeCompletenessWebAndroidParity";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE,
  type AiEstimateNormativeCompletenessWebSummary,
} from "../e2e/runAiEstimateNormativeCompletenessWebSmoke";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX,
  type AiEstimateNormativeCompletenessMatrixSummary,
} from "./runAiEstimateNormativeCompletenessMatrix";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES,
  type AiEstimateNormativeProfessionalGoldenCasesSummary,
} from "./runAiEstimateNormativeProfessionalGoldenCases";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES,
  type AiEstimateNormativeSourceGatesSummary,
} from "./runAiEstimateNormativeSourceGates";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS,
  type AiEstimateNormativeTargetedTestsSummary,
} from "./runAiEstimateNormativeTargetedTests";
import { gitOutput, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_READY_NO_RELEASE =
  "GREEN_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_READY_NO_RELEASE" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness");

function latest<T>(dir: string, sourceSha: string) {
  return newestSummary<T>(
    path.join(ROOT, dir),
    (summary) => (summary as { source_sha?: string }).source_sha === sourceSha,
  );
}

function writeText(filePath: string, value: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value, "utf8");
}

export function auditAiEstimateNormativeParameterCompletenessAndQuantityAccuracy11610(input: {
  writeSummary?: boolean;
} = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const matrix = latest<AiEstimateNormativeCompletenessMatrixSummary>("matrix", sourceSha);
  const golden = latest<AiEstimateNormativeProfessionalGoldenCasesSummary>("golden-cases", sourceSha);
  const targeted = latest<AiEstimateNormativeTargetedTestsSummary>("targeted-tests", sourceSha);
  const web = latest<AiEstimateNormativeCompletenessWebSummary>("web", sourceSha);
  const android = latest<AiEstimateNormativeCompletenessAndroidSummary>("android-chrome", sourceSha);
  const parity = latest<AiEstimateNormativeCompletenessParitySummary>("web-android-parity", sourceSha);
  const sourceGates = latest<AiEstimateNormativeSourceGatesSummary>("source-gates", sourceSha);

  const checks = {
    targeted_tests_green: targeted?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_TARGETED_TESTS,
    matrix_green: matrix?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_MATRIX,
    golden_50_green: golden?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES,
    web_smoke_green: web?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE,
    android_smoke_green: android?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE,
    web_android_parity_green: parity?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY,
    source_gates_green: sourceGates?.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES,
    catalog_11610_covered:
      matrix?.summary.catalog_total_templates === 11610 &&
      matrix?.summary.normative_passport_coverage === "11610/11610",
    matrix_counts_green:
      matrix?.summary.matrix_1000_random_passed === "1000/1000" &&
      matrix?.summary.matrix_200_infrastructure_passed === "200/200" &&
      matrix?.summary.matrix_100_repair_passed === "100/100" &&
      matrix?.summary.matrix_100_expanded_complex_passed === "100/100" &&
      matrix?.summary.matrix_100_critical_passed === "100/100" &&
      matrix?.summary.matrix_50_missing_input_passed === "50/50" &&
      matrix?.summary.matrix_50_quantity_trace_passed === "50/50",
    golden_counts_green: golden?.summary.golden_50_passed === "50/50",
    web_android_50_parity: parity?.summary.web_android_normative_50_parity === true,
    quantity_trace_current:
      matrix?.summary.quantity_trace_uses_current_values === true &&
      golden?.summary.all_quantity_traces_current === true &&
      parity?.summary.web_android_quantity_trace_parity === true,
    missing_questions_capped:
      matrix?.summary.missing_questions_max_lte_5 === true &&
      golden?.summary.all_missing_questions_ranked_lte_5 === true &&
      parity?.summary.web_android_questions_lte_5_parity === true,
  };
  const blocking_reasons = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const finalGreen = blocking_reasons.length === 0;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_READY_NO_RELEASE
      : STOP_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    catalog_total_templates: matrix?.summary.catalog_total_templates ?? -1,
    normative_passport_coverage: matrix?.summary.normative_passport_coverage ?? "missing",
    requirements_connected_to_rows: matrix?.summary.requirements_connected_to_rows ?? "missing",
    matrix_1000_random_passed: matrix?.summary.matrix_1000_random_passed ?? "missing",
    matrix_200_infrastructure_passed: matrix?.summary.matrix_200_infrastructure_passed ?? "missing",
    matrix_100_repair_passed: matrix?.summary.matrix_100_repair_passed ?? "missing",
    matrix_100_expanded_complex_passed: matrix?.summary.matrix_100_expanded_complex_passed ?? "missing",
    matrix_100_critical_passed: matrix?.summary.matrix_100_critical_passed ?? "missing",
    matrix_50_missing_input_passed: matrix?.summary.matrix_50_missing_input_passed ?? "missing",
    matrix_50_quantity_trace_passed: matrix?.summary.matrix_50_quantity_trace_passed ?? "missing",
    golden_50_passed: golden?.summary.golden_50_passed ?? "missing",
    web_normative_golden_cases_passed: web?.summary.web_normative_golden_cases_passed ?? "missing",
    android_normative_golden_cases_passed: android?.summary.android_normative_golden_cases_passed ?? "missing",
    same_normative_corpus_used_for_web_android: parity?.summary.same_normative_corpus_used_for_web_android ?? false,
    targeted_tests_passed: checks.targeted_tests_green,
    source_gates_passed: checks.source_gates_green,
    typecheck_passed: sourceGates?.summary.typecheck_passed === true,
    lint_passed: sourceGates?.summary.lint_passed === true,
    diff_check_passed: sourceGates?.summary.diff_check_passed === true,
    no_test_weakening_passed: sourceGates?.summary.no_test_weakening_passed === true,
    web_public_smoke_passed: sourceGates?.summary.web_public_smoke_passed === true,
    ci_office_market_passed: sourceGates?.summary.ci_office_market_passed === true,
    secret_scan_passed: sourceGates?.summary.secret_scan_passed === true,
    marketplace_touched: false,
    rfq_touched: false,
    warehouse_touched: false,
    payment_touched: false,
    render_started: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    production_db_touched: false,
    fake_green_claimed: false,
    artifact_paths: {
      matrix: matrix?.path ?? null,
      golden: golden?.path ?? null,
      targeted: targeted?.path ?? null,
      web: web?.path ?? null,
      android: android?.path ?? null,
      parity: parity?.path ?? null,
      source_gates: sourceGates?.path ?? null,
    },
    checks,
    blocking_reasons,
  };
  const summaryPath = path.join(ROOT, "final-summary.json");
  if (input.writeSummary) {
    writeJson(summaryPath, summary);
    writeText(path.join(ROOT, "final-blockers.json"), `${JSON.stringify(blocking_reasons, null, 2)}\n`);
  }
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = auditAiEstimateNormativeParameterCompletenessAndQuantityAccuracy11610({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_PARAMETER_COMPLETENESS_AND_QUANTITY_ACCURACY_11610_READY_NO_RELEASE) {
    process.exitCode = 1;
  }
}
