import {
  AI_ESTIMATE_EVIDENCE_REGISTRY,
  isEvidenceSummaryAcceptedForCurrentHead,
  validateAiEstimateEvidenceRegistry,
} from "../../src/lib/platform/evidenceRegistry";

describe("AI estimate evidence registry anti-stale gate", () => {
  const head = "head-sha";
  const green = (name: string) => ({
    final_status: `GREEN_${name}`,
    source_sha: head,
    fake_green_claimed: false,
  });

  it("accepts only current-head, non-manual, real-browser summaries for current scope", () => {
    const validation = validateAiEstimateEvidenceRegistry({
      headSha: head,
      currentScopeSummaries: [green("WEB"), green("ANDROID"), green("PARITY")],
      currentWebSummary: green("WEB"),
      currentAndroidSummary: green("ANDROID"),
      currentParitySummary: green("PARITY"),
    });

    expect(AI_ESTIMATE_EVIDENCE_REGISTRY.length).toBeGreaterThan(0);
    expect(validation.evidence_registry_created).toBe(true);
    expect(validation.no_stale_green_accepted).toBe(true);
    expect(validation.source_sha_matches_head_for_current_scope).toBe(true);
    expect(validation.web_android_artifacts_current).toBe(true);
    expect(validation.route_equivalent_rejected_as_real_browser).toBe(true);
    expect(validation.manual_summary_green_rejected).toBe(true);
    expect(validation.passed).toBe(true);
  });

  it("rejects stale, route-equivalent, and manual green claims", () => {
    expect(isEvidenceSummaryAcceptedForCurrentHead({
      final_status: "GREEN_STALE",
      source_sha: "old-sha",
      fake_green_claimed: false,
    }, head)).toBe(false);
    expect(isEvidenceSummaryAcceptedForCurrentHead({
      final_status: "GREEN_ROUTE",
      source_sha: head,
      route_equivalent_claimed_as_real_browser: true,
      fake_green_claimed: false,
    }, head)).toBe(false);
    expect(isEvidenceSummaryAcceptedForCurrentHead({
      final_status: "GREEN_MANUAL",
      source_sha: head,
      manual_summary_green_detected: true,
      fake_green_claimed: false,
    }, head)).toBe(false);
  });
});
