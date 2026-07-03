import {
  GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS,
  runWave2aStructuralQuantityAudit,
} from "../../scripts/estimate/auditWave2aStructuralQuantityEngine";

describe("wave2a structural real quantity audit", () => {
  it("proves Wave2A structural norm packs are consumed by the formula engine without claiming full 10k green", () => {
    const summary = runWave2aStructuralQuantityAudit({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_WAVE2A_STRUCTURAL_REAL_QUANTITY_ENGINE_COMMITTED_NO_BUILDS);
    expect(summary.masonry_templates_use_real_norm_pack).toBe(true);
    expect(summary.concrete_templates_use_real_norm_pack).toBe(true);
    expect(summary.reinforcement_templates_use_real_norm_pack).toBe(true);
    expect(summary.formwork_templates_use_real_norm_pack).toBe(true);
    expect(summary.screed_templates_use_real_norm_pack).toBe(true);
    expect(summary.generic_norm_rows_count_after).toBe(39844);
    expect(summary.templates_only_generic_norms_count_after).toBe(1002);
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
    expect(summary.blockers).toEqual([]);
  });
});
