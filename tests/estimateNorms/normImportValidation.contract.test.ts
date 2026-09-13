import {
  buildEstimateNormImportPlan,
  STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
} from "../../src/lib/ai/estimateTemplate10000";

describe("estimate norm import validation", () => {
  it("plans a dry-run import without production side effects", () => {
    const plan = buildEstimateNormImportPlan({ mode: "dry-run" });

    expect(plan.final_status).toBe(STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED);
    expect(plan.work_templates_count).toBe(10000);
    expect(plan.row_bindings_count).toBeGreaterThan(10000);
    expect(plan.production_db_touched).toBe(false);
    expect(plan.native_build_started).toBe(false);
    expect(plan.full_jest_started).toBe(false);
    expect(plan.failures).toContain("unverified_norm_items:599000");
  });
});
