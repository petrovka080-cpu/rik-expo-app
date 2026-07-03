import {
  GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS,
  runRealNormPackBindingWave1Audit,
} from "../../scripts/estimate/auditRealNormPackBindingWave1";

describe("wave1 real norm pack binding", () => {
  it("proves professional pack files are loaded into the formula engine", () => {
    const summary = runRealNormPackBindingWave1Audit({ writeSummary: false });

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_REAL_NORM_PACK_BINDING_WAVE1_NO_BUILDS);
    expect(summary.professional_norm_pack_files_count).toBeGreaterThanOrEqual(7);
    expect(summary.source_backed_norm_items_count).toBeGreaterThanOrEqual(12);
    expect(summary.norm_pack_files_parsed).toBe(true);
    expect(summary.norm_pack_items_loaded_into_backend_norm_registry).toBe(true);
    expect(summary.norm_pack_items_available_to_formula_engine).toBe(true);
    expect(summary.wave1_norm_pack_groups_bound).toBe(true);
    expect(summary.wave1_rows_have_source_backed_norm_ids).toBe(true);
    expect(summary.apartment_54_uses_real_norm_packs).toBe(true);
    expect(summary.paint_has_dedicated_template).toBe(true);
    expect(summary.screed_has_dedicated_template).toBe(true);
    expect(summary.blockers).toEqual([]);
  });
});
