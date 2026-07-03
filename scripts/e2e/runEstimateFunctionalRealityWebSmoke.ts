import { runEstimateFunctionalRealityAudit } from "../estimate/auditEstimateFunctionalReality10000";

export const STOP_ESTIMATE_FUNCTIONAL_REALITY_WEB_SMOKE_NOT_ACTUAL_BROWSER =
  "STOP_ESTIMATE_FUNCTIONAL_REALITY_WEB_SMOKE_NOT_ACTUAL_BROWSER" as const;

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/runEstimateFunctionalRealityWebSmoke.ts")) {
  const summary = runEstimateFunctionalRealityAudit({ writeSummary: false });
  console.log(JSON.stringify({
    final_status: STOP_ESTIMATE_FUNCTIONAL_REALITY_WEB_SMOKE_NOT_ACTUAL_BROWSER,
    source_sha: summary.source_sha,
    actual_web_browser_smoke_passed: false,
    browser_automation_started: false,
    diamond_drilling_live_pdf_passed: false,
    profile_fence_live_pdf_passed: false,
    mansard_roof_live_pdf_passed: false,
    apartment_54_live_missing_params_passed: false,
    pdf_text_extraction_passed: summary.pdf_extraction_done,
    pdf_snapshot_parity_passed: false,
    console_error_count: null,
    fake_green_claimed: false,
  }, null, 2));
  process.exitCode = 1;
}
