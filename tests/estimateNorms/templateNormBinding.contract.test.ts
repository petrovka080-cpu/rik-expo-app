import {
  buildTemplateNormBindingPlan,
  GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS,
} from "../../src/lib/ai/estimateTemplate10000";

describe("estimate template norm binding", () => {
  it("binds every production template row to a versioned norm", () => {
    const plan = buildTemplateNormBindingPlan({ mode: "verify" });

    expect(plan.final_status).toBe(GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS);
    expect(plan.work_templates_count).toBe(10000);
    expect(plan.row_bindings_count).toBeGreaterThan(10000);
    expect(plan.failures).toEqual([]);
  });
});
