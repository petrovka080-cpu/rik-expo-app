import {
  buildWorkFamilyCoveragePlan,
  STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED,
} from "../../scripts/estimate/buildWorkFamilyCoveragePlan";

jest.setTimeout(60000);

describe("professional catalog coverage 10000", () => {
  it("keeps full 10000 coverage red while P3 remains outside the P1/P2 backfill conveyor", () => {
    const plan = buildWorkFamilyCoveragePlan({ writeFiles: false });

    expect(plan.final_status).toBe(STOP_AI_ESTIMATE_10000_PROFESSIONAL_CATALOG_COVERAGE_FAILED);
    expect(plan.manifest_total_templates).toBe(10000);
    expect(plan.ready_professional_count).toBe(8998);
    expect(plan.not_ready_count).toBe(1002);
    expect(plan.generic_fallback_count).toBe(1002);
    expect(plan.generic_norm_rows_count).toBe(39844);
    expect(plan.synthetic_family_default_count).toBe(39844);
    expect(plan.templates_only_generic_norms_count).toBe(1002);
    expect(plan.templates_with_real_norm_sources_count).toBe(8998);
    expect(plan.work_catalog_items_count).toBe(10000);
    expect(plan.row_catalog_bindings_count).toBeGreaterThan(300000);
    expect(plan.material_catalog_rows_count).toBeGreaterThan(0);
    expect(plan.buyer_material_handoff_rows_count).toBeGreaterThan(0);
    expect(plan.blockers).toEqual(expect.arrayContaining([
      "ready_professional_count:8998",
      "not_ready_count:1002",
      "templates_with_real_norm_sources_count:8998",
    ]));
  });
});
