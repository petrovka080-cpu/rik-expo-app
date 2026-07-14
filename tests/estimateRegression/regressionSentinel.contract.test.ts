import { runEstimateRegressionSentinel } from "../../scripts/estimate/runEstimateRegressionSentinel";

describe("estimate regression sentinel", () => {
  it("keeps pilot estimates, PDF parity, and buyer handoff green", () => {
    const summary = runEstimateRegressionSentinel();
    expect(summary.final_status).toBe("GREEN_AI_ESTIMATE_REGRESSION_SENTINEL");
    expect(summary.pdf_snapshot_parity_passed).toBe(true);
    expect(summary.buyer_handoff_verified).toBe(true);
    expect(summary.mutation_gates.route_marker_only_smoke_rejected).toBe(true);
    expect(summary.mutation_gates.android_env_fake_green_rejected).toBe(true);
  });
});
