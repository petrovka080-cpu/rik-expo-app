import {
  runEstimateFunctionalRealityAudit,
  STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN,
} from "../../scripts/estimate/auditEstimateFunctionalReality10000";

describe("functional reality audit stop status", () => {
  it("revokes product green without claiming full 10k readiness", () => {
    const summary = runEstimateFunctionalRealityAudit({ writeSummary: false });

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN);
    expect(summary.green_revoked).toBe(true);
    expect(summary.broken_cases_reproduced).toBe(true);
    expect(summary.diamond_drilling_professional).toBe(false);
    expect(summary.profile_sheet_fence_professional).toBe(false);
    expect(summary.mansard_roof_professional).toBe(false);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
  });
});
