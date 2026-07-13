import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE,
  runAiEstimateParameterDurableHistoryAndroidSmoke,
} from "./runAiEstimateParameterDurableHistoryAndroidSmoke";
import { argValue, hasFlag } from "./renderStagingAcceptanceCore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES,
  runAiEstimateNormativeProfessionalGoldenCases,
} from "../estimate/runAiEstimateNormativeProfessionalGoldenCases";

export const GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "android-chrome");

export type AiEstimateNormativeCompletenessAndroidSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE
    | typeof STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "android-chrome";
  cases: "normative-parameter-completeness-50";
  actual_android_emulator_smoke_passed: boolean;
  android_parameter_cards_visible: boolean;
  android_parameter_cards_are_clickable: boolean;
  android_parameter_cards_edit_inline: boolean;
  android_parameter_edit_recalculates_boq: boolean;
  android_history_not_limited_to_13: boolean;
  android_all_created_estimates_preserved: boolean;
  android_pdf_from_history_passed: boolean;
  android_buyer_package_from_history_passed: boolean;
  android_visible_english_words_count: number;
  android_raw_internal_ids_visible_count: number;
  android_console_errors_count: number;
  android_normative_golden_cases_passed: string;
  android_normative_questions_lte_5: boolean;
  android_quantity_trace_current: boolean;
  android_summary_path: string;
  golden_summary_path: string;
  fake_green_claimed: false;
  blockers: string[];
};

export async function runAiEstimateNormativeCompletenessAndroidSmoke(options: {
  requireRealBrowser?: boolean;
  requireEmulator?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}) {
  const android = await runAiEstimateParameterDurableHistoryAndroidSmoke({
    target: "android-chrome",
    cases: "parameter-durable-history",
    requireRealBrowser: options.requireRealBrowser,
    requireEmulator: options.requireEmulator,
    baseUrl: options.baseUrl,
    writeSummary: true,
  });
  const golden = runAiEstimateNormativeProfessionalGoldenCases({ writeSummary: true });
  const blockers = [
    android.artifact.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE ? "" : "actual_android_emulator_smoke_failed",
    golden.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES ? "" : "normative_golden_cases_failed",
  ].filter(Boolean);
  const summary: AiEstimateNormativeCompletenessAndroidSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "android-chrome",
    cases: "normative-parameter-completeness-50",
    actual_android_emulator_smoke_passed:
      android.artifact.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_ANDROID_SMOKE,
    android_parameter_cards_visible: android.artifact.android_parameter_cards_visible,
    android_parameter_cards_are_clickable: android.artifact.android_parameter_cards_are_clickable,
    android_parameter_cards_edit_inline: android.artifact.android_parameter_cards_edit_inline,
    android_parameter_edit_recalculates_boq: android.artifact.android_parameter_edit_recalculates_boq,
    android_history_not_limited_to_13: android.artifact.android_history_not_limited_to_13,
    android_all_created_estimates_preserved: android.artifact.android_all_created_estimates_preserved,
    android_pdf_from_history_passed: android.artifact.android_pdf_from_history_passed,
    android_buyer_package_from_history_passed: android.artifact.android_buyer_package_from_history_passed,
    android_visible_english_words_count: android.artifact.android_visible_english_words_count,
    android_raw_internal_ids_visible_count: android.artifact.android_raw_internal_ids_visible_count,
    android_console_errors_count: android.artifact.android_console_errors_count,
    android_normative_golden_cases_passed: golden.summary.golden_50_passed,
    android_normative_questions_lte_5: golden.summary.all_missing_questions_ranked_lte_5,
    android_quantity_trace_current: golden.summary.all_quantity_traces_current,
    android_summary_path: android.artifactPath,
    golden_summary_path: golden.summaryPath,
    fake_green_claimed: false,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  runAiEstimateNormativeCompletenessAndroidSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    requireEmulator: hasFlag("require-emulator"),
    baseUrl: argValue("base-url"),
    writeSummary: true,
  }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE) process.exitCode = 1;
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
