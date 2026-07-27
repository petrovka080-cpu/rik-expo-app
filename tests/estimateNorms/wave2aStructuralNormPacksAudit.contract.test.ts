import {
  STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE,
  runWave2aStructuralQuantityAudit,
} from "../../scripts/estimate/auditWave2aStructuralQuantityEngine";

describe("wave2a structural real quantity audit", () => {
  it("proves Wave2A structural packs without promoting the unresolved full 10k catalog", () => {
    const summary = runWave2aStructuralQuantityAudit({ writeSummary: false });

    expect(summary.final_status).toBe(STOP_WAVE2A_STRUCTURAL_NORM_PACKS_NOT_CONSUMED_BY_ENGINE);
    expect(summary.masonry_templates_use_real_norm_pack).toBe(true);
    expect(summary.concrete_templates_use_real_norm_pack).toBe(true);
    expect(summary.reinforcement_templates_use_real_norm_pack).toBe(true);
    expect(summary.formwork_templates_use_real_norm_pack).toBe(true);
    expect(summary.screed_templates_use_real_norm_pack).toBe(true);
    expect(summary.generic_norm_rows_count_after).toBeGreaterThan(0);
    expect(summary.templates_only_generic_norms_count_after).toBeGreaterThan(0);
    expect(summary.generic_norm_rows_count_after).toBeGreaterThanOrEqual(
      summary.generic_norm_rows_count_before
    );
    expect(summary.full_10000_real_norm_green_claimed).toBe(false);
    expect(summary.blockers).toEqual(expect.arrayContaining([
      "generic_counts_not_reduced",
    ]));
  });
});
