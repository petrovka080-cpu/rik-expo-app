import {
  GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS,
  runEstimateFunctionalRealityAudit,
} from "../../scripts/estimate/auditEstimateFunctionalReality10000";

describe("functional reality audit green status", () => {
  it("claims full 10k readiness only when broken cases, PDF, and norm coverage are green", () => {
    const summary = runEstimateFunctionalRealityAudit({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_READY_NO_BUILDS);
    expect(summary.green_revoked).toBe(false);
    expect(summary.broken_cases_reproduced).toBe(true);
    expect(summary.diamond_drilling_professional).toBe(true);
    expect(summary.profile_sheet_fence_professional).toBe(true);
    expect(summary.mansard_roof_professional).toBe(true);
    expect(summary.manifest_total_templates).toBe(10000);
    expect(summary.ready_professional_count).toBe(10000);
    expect(summary.not_ready_count).toBe(0);
    expect(summary.generic_fallback_count).toBe(0);
    expect(summary.generic_norm_rows_count).toBe(0);
    expect(summary.templates_only_generic_norms_count).toBe(0);
    expect(summary.full_10000_real_norm_green_claimed).toBe(true);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blockers).toEqual([]);
  });
});
