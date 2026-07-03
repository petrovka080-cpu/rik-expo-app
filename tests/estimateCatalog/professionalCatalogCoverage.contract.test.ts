import {
  buildWorkFamilyCoveragePlan,
  GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS,
} from "../../scripts/estimate/buildWorkFamilyCoveragePlan";

jest.setTimeout(60000);

describe("professional catalog coverage 10000", () => {
  it("keeps full 10000 coverage green only with zero generic fallback", () => {
    const plan = buildWorkFamilyCoveragePlan({ writeFiles: false });

    expect(plan.final_status).toBe(GREEN_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_READY_NO_BUILDS);
    expect(plan.manifest_total_templates).toBe(10000);
    expect(plan.ready_professional_count).toBe(10000);
    expect(plan.not_ready_count).toBe(0);
    expect(plan.generic_fallback_count).toBe(0);
    expect(plan.generic_norm_rows_count).toBe(0);
    expect(plan.synthetic_family_default_count).toBe(0);
    expect(plan.templates_only_generic_norms_count).toBe(0);
    expect(plan.templates_with_real_norm_sources_count).toBe(10000);
    expect(plan.work_catalog_items_count).toBe(10000);
    expect(plan.row_catalog_bindings_count).toBeGreaterThan(300000);
    expect(plan.material_catalog_rows_count).toBeGreaterThan(0);
    expect(plan.buyer_material_handoff_rows_count).toBeGreaterThan(0);
    expect(plan.blockers).toEqual([]);
  });
});
