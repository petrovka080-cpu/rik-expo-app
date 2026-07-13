import type { AiEstimatePlatformCoreV2HarnessSummary } from "./aiEstimateE2eHarness.shared";

export function validateAiEstimateE2eEvidence(summary: AiEstimatePlatformCoreV2HarnessSummary): boolean {
  return summary.cases_passed === summary.cases_total &&
    summary.route_equivalent_not_reported_as_real_browser === true &&
    summary.env_browser_green_rejected === true &&
    summary.source_sha_evidence_shared === true &&
    summary.console_errors_count === 0;
}
