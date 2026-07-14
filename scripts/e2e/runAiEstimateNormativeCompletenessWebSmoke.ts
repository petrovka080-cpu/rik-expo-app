import path from "node:path";

import {
  GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE,
  runAiEstimateParameterDurableHistoryWebSmoke,
} from "./runAiEstimateParameterDurableHistoryWebSmoke";
import { argValue, hasFlag } from "./renderStagingAcceptanceCore";
import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import {
  GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES,
  runAiEstimateNormativeProfessionalGoldenCases,
} from "../estimate/runAiEstimateNormativeProfessionalGoldenCases";

export const GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "web");

export type AiEstimateNormativeCompletenessWebSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE
    | typeof STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  target: "web";
  cases: "normative-parameter-completeness-50";
  actual_web_browser_smoke_passed: boolean;
  web_parameter_cards_visible: boolean;
  web_parameter_cards_are_clickable: boolean;
  web_parameter_cards_edit_inline: boolean;
  web_parameter_edit_recalculates_boq: boolean;
  web_history_not_limited_to_13: boolean;
  web_all_created_estimates_preserved: boolean;
  web_pdf_from_history_passed: boolean;
  web_buyer_package_from_history_passed: boolean;
  web_visible_english_words_count: number;
  web_raw_internal_ids_visible_count: number;
  web_console_errors_count: number;
  web_normative_golden_cases_passed: string;
  web_normative_questions_lte_5: boolean;
  web_quantity_trace_current: boolean;
  browser_summary_path: string;
  golden_summary_path: string;
  fake_green_claimed: false;
  blockers: string[];
};

export async function runAiEstimateNormativeCompletenessWebSmoke(options: {
  requireRealBrowser?: boolean;
  baseUrl?: string | null;
  writeSummary?: boolean;
} = {}) {
  const browser = await runAiEstimateParameterDurableHistoryWebSmoke({
    target: "web",
    cases: "parameter-durable-history",
    requireRealBrowser: options.requireRealBrowser,
    baseUrl: options.baseUrl,
    writeSummary: true,
  });
  const golden = runAiEstimateNormativeProfessionalGoldenCases({ writeSummary: true });
  const blockers = [
    browser.artifact.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE ? "" : "actual_web_browser_smoke_failed",
    golden.summary.final_status === GREEN_AI_ESTIMATE_NORMATIVE_PROFESSIONAL_GOLDEN_CASES ? "" : "normative_golden_cases_failed",
  ].filter(Boolean);
  const summary: AiEstimateNormativeCompletenessWebSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE
      : STOP_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    target: "web",
    cases: "normative-parameter-completeness-50",
    actual_web_browser_smoke_passed:
      browser.artifact.final_status === GREEN_AI_ESTIMATE_PARAMETER_DURABLE_HISTORY_WEB_SMOKE,
    web_parameter_cards_visible: browser.artifact.web_parameter_cards_visible,
    web_parameter_cards_are_clickable: browser.artifact.web_parameter_cards_are_clickable,
    web_parameter_cards_edit_inline: browser.artifact.web_parameter_cards_edit_inline,
    web_parameter_edit_recalculates_boq: browser.artifact.web_parameter_edit_recalculates_boq,
    web_history_not_limited_to_13: browser.artifact.web_history_not_limited_to_13,
    web_all_created_estimates_preserved: browser.artifact.web_all_created_estimates_preserved,
    web_pdf_from_history_passed: browser.artifact.web_pdf_from_history_passed,
    web_buyer_package_from_history_passed: browser.artifact.web_buyer_package_from_history_passed,
    web_visible_english_words_count: browser.artifact.web_visible_english_words_count,
    web_raw_internal_ids_visible_count: browser.artifact.web_raw_internal_ids_visible_count,
    web_console_errors_count: browser.artifact.web_console_errors_count,
    web_normative_golden_cases_passed: golden.summary.golden_50_passed,
    web_normative_questions_lte_5: golden.summary.all_missing_questions_ranked_lte_5,
    web_quantity_trace_current: golden.summary.all_quantity_traces_current,
    browser_summary_path: browser.artifactPath,
    golden_summary_path: golden.summaryPath,
    fake_green_claimed: false,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (options.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  runAiEstimateNormativeCompletenessWebSmoke({
    requireRealBrowser: hasFlag("require-real-browser"),
    baseUrl: argValue("base-url"),
    writeSummary: true,
  }).then((result) => {
    console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
    if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_COMPLETENESS_WEB_SMOKE) process.exitCode = 1;
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
