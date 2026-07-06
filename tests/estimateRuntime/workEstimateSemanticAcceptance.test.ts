import {
  auditWorkEstimateSemanticAcceptance,
  GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
} from "../../scripts/estimate/auditWorkEstimateSemanticAcceptance";

jest.setTimeout(180_000);

describe("work estimate semantic acceptance", () => {
  it("proves the 1500-case semantic corpus and keeps runtime evidence explicit", () => {
    const result = auditWorkEstimateSemanticAcceptance({
      requireGateFlags: false,
      requireRuntimeEvidence: false,
      writeSummary: false,
      writeSamples: false,
    });

    expect(result.summary.final_status).toBe(
      GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
    );
    expect(result.summary.runtime_evidence_required).toBe(false);
    expect(result.summary.semantic_golden_cases_passed_ratio).toBe("1500/1500");
    expect(result.summary.templates_processed).toBe(11610);
    expect(result.summary.work_passports_created).toBe(11610);
    expect(result.summary.blocked_templates_count).toBe(0);
    expect(result.summary.actual_web_browser_work_estimate_semantic_smoke_passed).toBe(false);
    expect(result.summary.actual_android_emulator_work_estimate_semantic_smoke_passed).toBe(false);
    expect(result.summary.fake_green_claimed).toBe(false);
    expect(result.summary.blocking_reasons).toEqual([]);
  });
});
