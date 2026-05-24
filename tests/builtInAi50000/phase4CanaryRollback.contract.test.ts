import { buildBuiltInAi50000Phase4CanaryPlan } from "../../src/lib/ai/builtInAi50000";

describe("built-in AI 50000 Phase 4 rollback", () => {
  it("protects legacy PDF/routes and preserves estimate snapshots", () => {
    const plan = buildBuiltInAi50000Phase4CanaryPlan();
    expect(plan.rollback.rollbackAction).toBe("set flags false");
    expect(plan.rollback.rollbackTimeTargetMinutes).toBeLessThanOrEqual(10);
    expect(plan.rollback.oldPdfRemainsDefault).toBe(true);
    expect(plan.rollback.oldRoutesRemainDefault).toBe(true);
    expect(plan.rollback.noDataDestruction).toBe(true);
    expect(plan.rollback.estimateSnapshotsPreserved).toBe(true);
  });
});
