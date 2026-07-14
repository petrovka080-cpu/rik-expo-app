import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { newestSummary } from "./renderStagingAcceptanceCore";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE,
  type AiEstimateNormativeCompletenessAndroidSummary,
} from "./runAiEstimateNormativeCompletenessAndroidSmoke";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE,
  type AiEstimateNormativeCompletenessWebSummary,
} from "./runAiEstimateNormativeCompletenessWebSmoke";

export const GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness");

export type AiEstimateNormativeCompletenessParitySummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY
    | typeof STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  cases: "normative-parameter-completeness-50";
  same_normative_corpus_used_for_web_android: boolean;
  web_android_normative_50_parity: boolean;
  web_android_questions_lte_5_parity: boolean;
  web_android_quantity_trace_parity: boolean;
  web_android_parameter_cards_parity: boolean;
  web_android_history_count_parity: boolean;
  web_android_pdf_buyer_state_parity: boolean;
  web_android_visible_text_parity: boolean;
  web_summary_path: string | null;
  android_summary_path: string | null;
  blockers: string[];
};

function latestWeb(sourceSha: string) {
  return newestSummary<AiEstimateNormativeCompletenessWebSummary>(
    path.join(ROOT, "web"),
    (summary) => summary.source_sha === sourceSha && summary.cases === "normative-parameter-completeness-50",
  );
}

function latestAndroid(sourceSha: string) {
  return newestSummary<AiEstimateNormativeCompletenessAndroidSummary>(
    path.join(ROOT, "android-chrome"),
    (summary) => summary.source_sha === sourceSha && summary.cases === "normative-parameter-completeness-50",
  );
}

export function runAiEstimateNormativeCompletenessWebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const web = latestWeb(sourceSha);
  const android = latestAndroid(sourceSha);
  const webSummary = web?.summary ?? null;
  const androidSummary = android?.summary ?? null;
  const checks = {
    web_green: webSummary?.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE,
    android_green: androidSummary?.final_status === GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_ANDROID_SMOKE,
    same_normative_corpus_used_for_web_android:
      webSummary?.cases === androidSummary?.cases &&
      webSummary?.web_normative_golden_cases_passed === androidSummary?.android_normative_golden_cases_passed,
    web_android_normative_50_parity:
      webSummary?.web_normative_golden_cases_passed === "50/50" &&
      androidSummary?.android_normative_golden_cases_passed === "50/50",
    web_android_questions_lte_5_parity:
      webSummary?.web_normative_questions_lte_5 === true &&
      androidSummary?.android_normative_questions_lte_5 === true,
    web_android_quantity_trace_parity:
      webSummary?.web_quantity_trace_current === true &&
      androidSummary?.android_quantity_trace_current === true,
    web_android_parameter_cards_parity:
      webSummary?.web_parameter_cards_visible === true &&
      androidSummary?.android_parameter_cards_visible === true &&
      webSummary?.web_parameter_cards_are_clickable === true &&
      androidSummary?.android_parameter_cards_are_clickable === true,
    web_android_history_count_parity:
      webSummary?.web_history_not_limited_to_13 === true &&
      androidSummary?.android_history_not_limited_to_13 === true &&
      webSummary?.web_all_created_estimates_preserved === true &&
      androidSummary?.android_all_created_estimates_preserved === true,
    web_android_pdf_buyer_state_parity:
      webSummary?.web_pdf_from_history_passed === true &&
      androidSummary?.android_pdf_from_history_passed === true &&
      webSummary?.web_buyer_package_from_history_passed === true &&
      androidSummary?.android_buyer_package_from_history_passed === true,
    web_android_visible_text_parity:
      webSummary?.web_visible_english_words_count === 0 &&
      androidSummary?.android_visible_english_words_count === 0 &&
      webSummary?.web_raw_internal_ids_visible_count === 0 &&
      androidSummary?.android_raw_internal_ids_visible_count === 0,
  };
  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);
  const summary: AiEstimateNormativeCompletenessParitySummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY_FAILED,
    source_sha: sourceSha,
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    cases: "normative-parameter-completeness-50",
    same_normative_corpus_used_for_web_android: checks.same_normative_corpus_used_for_web_android,
    web_android_normative_50_parity: checks.web_android_normative_50_parity,
    web_android_questions_lte_5_parity: checks.web_android_questions_lte_5_parity,
    web_android_quantity_trace_parity: checks.web_android_quantity_trace_parity,
    web_android_parameter_cards_parity: checks.web_android_parameter_cards_parity,
    web_android_history_count_parity: checks.web_android_history_count_parity,
    web_android_pdf_buyer_state_parity: checks.web_android_pdf_buyer_state_parity,
    web_android_visible_text_parity: checks.web_android_visible_text_parity,
    web_summary_path: web?.path ?? null,
    android_summary_path: android?.path ?? null,
    blockers,
  };
  const summaryPath = path.join(ROOT, "web-android-parity", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateNormativeCompletenessWebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_ANDROID_PARITY) process.exitCode = 1;
}
