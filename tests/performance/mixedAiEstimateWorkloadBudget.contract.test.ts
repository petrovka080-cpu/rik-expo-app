import { AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS, AI_ESTIMATE_STEP_BUDGETS_MS } from "../../src/lib/ai/performance";

describe("mixed AI estimate workload budget", () => {
  it("defines bounded workload sizes and full-estimate budget", () => {
    expect(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_estimate_requests).toBe(100);
    expect(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.concurrent_pdf_generations).toBe(25);
    expect(AI_ESTIMATE_LOAD_SCENARIO_MINIMUMS.catalog_binding_calls).toBe(100);
    expect(AI_ESTIMATE_STEP_BUDGETS_MS.full_visible_estimate).toBeLessThanOrEqual(3000);
  });
});
