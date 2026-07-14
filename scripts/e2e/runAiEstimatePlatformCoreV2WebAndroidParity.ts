import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";
import { runAiEstimatePlatformCoreV2Harness } from "./aiEstimateE2eHarness.shared";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "web-android-parity");

export function runAiEstimatePlatformCoreV2WebAndroidParity(input: { writeSummary?: boolean } = {}) {
  const web = runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 100 });
  const android = runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 100 });
  const sameCases = web.cases_total === android.cases_total && web.cases_passed === android.cases_passed;
  const blockers = sameCases ? [] : ["web_android_case_counts_differ"];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    same_core_v2_corpus_used_for_web_android: sameCases,
    web_android_work_classifier_parity: web.work_classifier_passed === android.work_classifier_passed,
    web_android_parameter_passport_parity: web.parameter_passport_passed === android.parameter_passport_passed,
    web_android_formula_dag_parity: web.incremental_recalc_passed === android.incremental_recalc_passed,
    web_android_snapshot_hash_parity: web.pdf_snapshot_parity_passed === android.pdf_snapshot_parity_passed,
    web_android_pdf_buyer_parity: web.buyer_package_parity_passed === android.buyer_package_parity_passed,
    web_android_history_parity: web.history_reload_passed === android.history_reload_passed,
    web_android_visible_ru_labels_parity: web.visible_english_words_count === android.visible_english_words_count,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimatePlatformCoreV2WebAndroidParity({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_ANDROID_PARITY) process.exitCode = 1;
}
