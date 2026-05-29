import { AI_ESTIMATE_ROLLBACK_PLAN, validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";

test("rollback plan exists and is ready", () => {
  expect(AI_ESTIMATE_ROLLBACK_PLAN.previousStableBehaviorRestorable).toBe(true);
  expect(validateAiEstimateRollbackPlan().rollback_ready).toBe(true);
});
