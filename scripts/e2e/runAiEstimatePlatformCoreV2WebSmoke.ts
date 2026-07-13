import path from "node:path";

import { validateAiEstimateE2eEvidence } from "./validateAiEstimateE2eEvidence";
import {
  runAiEstimatePlatformCoreV2Harness,
  writeAiEstimatePlatformCoreV2HarnessSummary,
} from "./aiEstimateE2eHarness.shared";

export const GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE =
  "GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE" as const;
export const STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE_FAILED =
  "STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-platform-core-v2-semantic-scale-refactor", "web");

export function runAiEstimatePlatformCoreV2WebSmoke(input: { writeSummary?: boolean } = {}) {
  const base = runAiEstimatePlatformCoreV2Harness({ target: "web", cases: 100 });
  const blockers = validateAiEstimateE2eEvidence(base) ? [] : ["web_harness_evidence_failed"];
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE
      : STOP_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE_FAILED,
    ...base,
    actual_web_browser_platform_core_v2_smoke_passed: blockers.length === 0,
    web_core_v2_cases_passed: `${base.cases_passed}/${base.cases_total}`,
    web_work_classifier_passed: base.work_classifier_passed,
    web_parameter_passport_passed: base.parameter_passport_passed,
    web_incremental_recalc_passed: base.incremental_recalc_passed,
    web_pdf_snapshot_parity_passed: base.pdf_snapshot_parity_passed,
    web_buyer_package_parity_passed: base.buyer_package_parity_passed,
    web_history_reload_passed: base.history_reload_passed,
    web_visible_english_words_count: base.visible_english_words_count,
    web_console_errors_count: base.console_errors_count,
    blockers,
  };
  const summaryPath = input.writeSummary === false ? "" : writeAiEstimatePlatformCoreV2HarnessSummary(ROOT, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimatePlatformCoreV2WebSmoke({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PLATFORM_CORE_V2_WEB_SMOKE) process.exitCode = 1;
}
