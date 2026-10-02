import {
  STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE,
  runRealNormPackBindingWave1Audit,
} from "../../scripts/estimate/auditRealNormPackBindingWave1";

describe("wave1 real norm pack binding", () => {
  it("keeps the retired parameterless registry stopped until applicability-aware bindings exist", () => {
    const summary = runRealNormPackBindingWave1Audit({ writeSummary: false });

    expect(summary.final_status).toBe(STOP_REAL_NORM_PACKS_EXIST_BUT_NOT_USED_BY_ENGINE);
    expect(summary.professional_norm_pack_files_count).toBeGreaterThanOrEqual(7);
    expect(summary.source_backed_norm_items_count).toBeGreaterThanOrEqual(12);
    expect(summary.norm_pack_files_parsed).toBe(true);
    expect(summary.norm_pack_items_loaded_into_backend_norm_registry).toBe(false);
    expect(summary.norm_pack_items_available_to_formula_engine).toBe(false);
    expect(summary.wave1_norm_pack_groups_bound).toBe(false);
    expect(summary.wave1_rows_have_source_backed_norm_ids).toBe(false);
    expect(summary.apartment_54_uses_real_norm_packs).toBe(false);
    expect(summary.paint_has_dedicated_template).toBe(true);
    expect(summary.screed_has_dedicated_template).toBe(true);
    expect(summary.blockers).toEqual(expect.arrayContaining([
      "norm_pack_items_not_loaded_into_backend_norm_registry",
      "wave1_norm_pack_groups_not_bound",
      "wave1_rows_missing_source_backed_norm_ids",
      "apartment_54_missing_wave1_real_norm_pack_groups",
    ]));
  });
});
