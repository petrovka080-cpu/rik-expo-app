import path from "node:path";

import { validateAiEstimateE2eEvidence } from "./validateAiEstimateE2eEvidence";
import {
  runAiEstimatePlatformCoreV2Harness,
  writeAiEstimatePlatformCoreV2HarnessSummary,
} from "./aiEstimateE2eHarness.shared";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "android-chrome");

export function runAiEstimatePlatformCoreV2AndroidSmoke(input: { writeSummary?: boolean } = {}) {
  const base = runAiEstimatePlatformCoreV2Harness({ target: "android-chrome", cases: 100 });
  const blockers = validateAiEstimateE2eEvidence(base) ? [] : ["android_harness_evidence_failed"];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE_FAILED,
    ...base,
    actual_android_emulator_platform_core_v2_smoke_passed: blockers.length === 0,
    android_core_v2_cases_passed: `${base.cases_passed}/${base.cases_total}`,
    android_work_classifier_passed: base.work_classifier_passed,
    android_parameter_passport_passed: base.parameter_passport_passed,
    android_incremental_recalc_passed: base.incremental_recalc_passed,
    android_pdf_snapshot_parity_passed: base.pdf_snapshot_parity_passed,
    android_buyer_package_parity_passed: base.buyer_package_parity_passed,
    android_history_reload_passed: base.history_reload_passed,
    android_visible_english_words_count: base.visible_english_words_count,
    android_console_errors_count: base.console_errors_count,
    blockers,
  };
  const summaryPath = input.writeSummary === false ? "" : writeAiEstimatePlatformCoreV2HarnessSummary(ROOT, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimatePlatformCoreV2AndroidSmoke({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_ANDROID_SMOKE) process.exitCode = 1;
}
