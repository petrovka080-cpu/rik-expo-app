import { runEstimateRuntimeAuditSummary } from "./estimateRuntimeAuditTestHelpers";

jest.setTimeout(180_000);

const GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE =
  "GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE";

describe("work estimate semantic acceptance", () => {
  it("proves the 1500-case semantic corpus and keeps runtime evidence explicit", () => {
    const summary = runEstimateRuntimeAuditSummary<Record<string, unknown>>("semantic-acceptance-source");

    expect(summary.final_status).toBe(
      GREEN_AI_ESTIMATE_11610_WORK_ESTIMATE_SEMANTIC_ACCEPTANCE_WEB_ANDROID_COMMITTED_NO_RELEASE,
    );
    expect(summary.runtime_evidence_required).toBe(false);
    expect(summary.semantic_cases_total).toBe(1500);
    expect(summary.semantic_cases_passed).toBe(1500);
    expect(summary.semantic_golden_cases_passed_ratio).toBe("1500/1500");
    expect(summary.semantic_critical_cases_total).toBe(150);
    expect(summary.semantic_critical_case_fixture_valid).toBe(true);
    expect(summary.semantic_critical_cases_cover_all_major_families).toBe(true);
    expect(summary.templates_processed).toBe(11610);
    expect(summary.templates_audited).toBe(11610);
    expect(summary.templates_with_estimate_generated).toBe(11610);
    expect(summary.work_passports_created).toBe(11610);
    expect(summary.blocked_templates_count).toBe(0);
    expect(summary.empty_estimate_count).toBe(0);
    expect(summary.refusal_count).toBe(0);
    expect(summary.drawings_required_stop_count).toBe(0);
    expect(summary.pdf_missing_count).toBe(0);
    expect(summary.buyer_handoff_missing_count).toBe(0);
    expect(summary.actual_web_browser_work_estimate_semantic_smoke_passed).toBe(false);
    expect(summary.actual_android_emulator_work_estimate_semantic_smoke_passed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blocking_reasons).toEqual([]);
  });
});
