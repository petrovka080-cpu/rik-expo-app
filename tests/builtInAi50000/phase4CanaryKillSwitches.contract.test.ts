import { buildBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 kill switches", () => {
  it("keeps all canary flags default-off and rollback-safe", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(plan.flags.length).toBeGreaterThanOrEqual(5);
    expect(plan.flags.every((flag) => flag.defaultEnabled === false)).toBe(true);
    expect(plan.flags.every((flag) => flag.rollbackValue === false)).toBe(true);
    expect(plan.flags.every((flag) => flag.productionRolloutAllowed === false)).toBe(true);
  });
});
