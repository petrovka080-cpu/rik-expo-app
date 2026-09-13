import {
  buildTemplateNormBindingPlan,
  STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
} from "../../src/lib/ai/estimateTemplate10000";

describe("estimate template norm binding", () => {
  it("does not certify source-like metadata without registered professional norms", () => {
    const plan = buildTemplateNormBindingPlan({ mode: "verify" });

    expect(plan.final_status).toBe(STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED);
    expect(plan.work_templates_count).toBe(10000);
    expect(plan.row_bindings_count).toBeGreaterThan(10000);
    expect(plan.failures).toContain("unverified_norm_items:599000");
  });
});
