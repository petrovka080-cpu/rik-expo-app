import {
  GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS,
  runGoldenBenchmarkAcceptance,
} from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark runner", () => {
  it("passes all golden benchmark cases without claiming runtime smoke evidence", () => {
    const summary = runGoldenBenchmarkAcceptance();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_GOLDEN_BENCHMARK_EXPERT_ACCEPTANCE_COMMITTED_NO_BUILDS);
    expect(summary.golden_cases_count).toBeGreaterThanOrEqual(250);
    expect(summary.golden_cases_passed).toBe(summary.golden_cases_count);
    expect(summary.critical_cases_passed).toBe(true);
    expect(summary.zero_tolerance_violations).toBe(0);
    expect(summary.pdf_snapshot_mismatches).toBe(0);
    expect(summary.buyer_handoff_invalid_count).toBe(0);
    expect(summary.generic_fallback_count).toBe(0);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.actual_web_browser_golden_benchmark_smoke_passed).toBe(false);
    expect(summary.actual_android_chrome_golden_benchmark_smoke_passed).toBe(false);
    expect(summary.route_equivalent_not_reported_as_real_browser).toBe(true);
  });
});
