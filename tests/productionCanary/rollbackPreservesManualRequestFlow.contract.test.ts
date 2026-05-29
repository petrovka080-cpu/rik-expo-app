import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";

test("rollback preserves manual request flow", () => {
  expect(validateAiEstimateRollbackPlan().manual_request_creation_preserved).toBe(true);
});
