import { argValue, hasFlag } from "./renderStagingAcceptanceCore";
import {
  GREEN_STAGING_RC_WEB_SMOKE_READY,
  STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN,
  runRealStagingRcWebEvidence,
  writeSyntheticStopSummary,
} from "./stagingRcRealEvidenceHarness";

export { GREEN_STAGING_RC_WEB_SMOKE_READY, STOP_STAGING_RC_WEB_SMOKE_FAILED_NO_GREEN };

export async function runAiEstimateStagingReleaseCandidateWebSmoke(input: {
  url?: string | null;
  writeSummary?: boolean;
  actualBrowserEvidence?: boolean;
} = {}) {
  if (input.actualBrowserEvidence === true) {
    return writeSyntheticStopSummary({
      target: "web",
      blocker: "MANUAL_BROWSER_EVIDENCE_FLAG_REJECTED",
      writeSummary: input.writeSummary,
    });
  }
  return runRealStagingRcWebEvidence({
    url: input.url,
    writeSummary: input.writeSummary,
  });
}

if (require.main === module) {
  void runAiEstimateStagingReleaseCandidateWebSmoke({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  }).then((result) => {
    console.info(JSON.stringify({
      final_status: result.summary.final_status,
      web_staging_rc_cases_passed: result.summary.web_staging_rc_cases_passed,
      blocking_reasons: result.summary.blocking_reasons.slice(0, 20),
      artifact: result.summaryPath,
    }, null, 2));
    if (result.summary.blocking_reasons.length > 0) process.exitCode = 1;
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
