import {
  runEstimateFunctionalRealityAudit,
  STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN,
} from "../../scripts/estimate/auditEstimateFunctionalReality10000";

describe("functional reality audit red-gate status", () => {
  it("keeps full 10k green revoked while P3 source coverage remains incomplete", () => {
    const summary = runEstimateFunctionalRealityAudit({ writeSummary: false });

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_10000_FUNCTIONAL_REALITY_AUDIT_FAILED_NO_GREEN);
    expect(summary.green_revoked).toBe(true);
    expect(summary.broken_cases_reproduced).toBe(true);
    expect(summary.diamond_drilling_professional).toBe(true);
    expect(summary.profile_sheet_fence_professional).toBe(true);
    expect(summary.mansard_roof_professional).toBe(true);
    expect(summary.manifest_total_templates).toBe(10000);
    expect(summary.ready_professional_count).toBe(8998);
    expect(summary.not_ready_count).toBe(1002);
    expect(summary.generic_fallback_count).toBe(1002);
    expect(summary.generic_norm_rows_count).toBe(39844);
    expect(summary.templates_only_generic_norms_count).toBe(1002);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
    expect(summary.fake_green_claimed).toBe(false);
    expect(summary.blockers).toEqual(expect.arrayContaining([
      "not_ready_templates:1002",
      "generic_fallback_templates:1002",
      "generic_norm_rows:39844",
    ]));
  });
});
