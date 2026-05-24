import { buildBuiltInAi50000Phase4CanaryPlan, validateBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 canary plan", () => {
  it("builds a valid disabled internal canary plan", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(validateBuiltInAi50000Phase4CanaryPlan(plan)).toEqual([]);
    expect(plan.canaryInitialState).toBe("disabled");
    expect(plan.productionRolloutEnabled).toBe(false);
    expect(plan.eligibleCohort).toBe("internal_staff_only");
  });
});
