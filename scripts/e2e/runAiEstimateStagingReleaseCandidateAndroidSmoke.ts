import { argValue, hasFlag } from "./renderStagingAcceptanceCore";
import {
  GREEN_STAGING_RC_ANDROID_SMOKE_READY,
  STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN,
  STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN,
  runRealStagingRcAndroidEvidence,
  writeSyntheticStopSummary,
} from "./stagingRcRealEvidenceHarness";

export {
  GREEN_STAGING_RC_ANDROID_SMOKE_READY,
  STOP_ANDROID_EMULATOR_NOT_AVAILABLE_NO_GREEN,
  STOP_STAGING_RC_ANDROID_SMOKE_FAILED_NO_GREEN,
};

export async function runAiEstimateStagingReleaseCandidateAndroidSmoke(input: {
  url?: string | null;
  writeSummary?: boolean;
  actualAndroidEvidence?: boolean;
} = {}) {
  if (input.actualAndroidEvidence === true) {
    return writeSyntheticStopSummary({
      target: "android-chrome",
      blocker: "MANUAL_ANDROID_EVIDENCE_FLAG_REJECTED",
      writeSummary: input.writeSummary,
    });
  }
  return runRealStagingRcAndroidEvidence({
    url: input.url,
    writeSummary: input.writeSummary,
  });
}

if (require.main === module) {
  void runAiEstimateStagingReleaseCandidateAndroidSmoke({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      android_staging_rc_cases_passed: result.summary.android_staging_rc_cases_passed,
      android_emulator_detected: result.summary.android_emulator_detected,
      android_chrome_launched_or_attached: result.summary.android_chrome_launched_or_attached,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
