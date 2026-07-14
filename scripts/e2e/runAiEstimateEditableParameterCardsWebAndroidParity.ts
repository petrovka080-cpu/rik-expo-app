import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runAiEstimateEditableParameterCardsWebSmoke } from "./runAiEstimateEditableParameterCardsWebSmoke";
import { runAiEstimateEditableParameterCardsAndroidSmoke } from "./runAiEstimateEditableParameterCardsAndroidSmoke";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_READY =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_READY" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_FAILED" as const;

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAiEstimateEditableParameterCardsWebAndroidParity() {
  const web = runAiEstimateEditableParameterCardsWebSmoke();
  const android = runAiEstimateEditableParameterCardsAndroidSmoke();
  const webIds = web.results.map((item) => item.template_id).join("|");
  const androidIds = android.results.map((item) => item.template_id).join("|");
  const finalGreen =
    web.summary.actual_web_browser_editable_parameter_cards_passed &&
    android.summary.actual_android_emulator_editable_parameter_cards_passed &&
    webIds === androidIds;
  const summary = {
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_READY
      : STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_FAILED,
    source_sha: web.summary.source_sha,
    web_android_same_case_corpus: webIds === androidIds,
    web_parameter_cases_passed: web.summary.web_parameter_cases_passed,
    android_parameter_cases_passed: android.summary.android_parameter_cases_passed,
    cards_and_recalc_parity_passed: finalGreen,
    release_started: false,
    blockers: finalGreen ? [] : ["web_android_parameter_card_parity_failed"],
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards", "web-android-parity-summary.json");
  writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateEditableParameterCardsWebAndroidParity();
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_WEB_ANDROID_PARITY_READY) process.exitCode = 1;
}
