import { buildBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 no production rollout", () => {
  it("does not enable production rollout as part of the canary gate", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(plan.productionRolloutEnabled).toBe(false);
    expect(plan.flags.find((flag) => flag.flag === "AI_50000_PRODUCTION_ROLLOUT_ENABLED")).toEqual(
      expect.objectContaining({
        defaultEnabled: false,
        canaryAllowed: false,
        productionRolloutAllowed: false,
      }),
    );
  });
});
