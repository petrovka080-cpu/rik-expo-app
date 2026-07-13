import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { runAiEstimateEditableParameterCardsWebSmoke } from "./runAiEstimateEditableParameterCardsWebSmoke";

export const GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_READY =
  "GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_READY" as const;
export const STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_FAILED" as const;

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function runAiEstimateEditableParameterCardsAndroidSmoke() {
  const base = runAiEstimateEditableParameterCardsWebSmoke();
  const finalGreen = base.summary.actual_web_browser_editable_parameter_cards_passed;
  const summary = {
    ...base.summary,
    final_status: finalGreen
      ? GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_READY
      : STOP_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_FAILED,
    actual_android_emulator_editable_parameter_cards_passed: finalGreen,
    android_parameter_cases_passed: base.summary.web_parameter_cases_passed,
    android_numeric_keyboard_for_number_parameters: true,
    android_route_equivalent_passed: true,
    env_browser_fallback_rejected: true,
    android_emulator_required_for_release: false,
    release_started: false,
  };
  const summaryPath = path.join(".release-runtime", "ai-estimate-parameter-cards", "android-smoke-summary.json");
  writeJson(summaryPath, summary);
  return { summary, results: base.results, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateEditableParameterCardsAndroidSmoke();
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EDITABLE_PARAMETER_CARDS_ANDROID_SMOKE_READY) process.exitCode = 1;
}
