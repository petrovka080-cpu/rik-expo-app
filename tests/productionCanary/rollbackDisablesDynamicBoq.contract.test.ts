import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";

test("rollback can disable dynamic BOQ", () => {
  expect(validateAiEstimateRollbackPlan().can_disable_dynamic_boq).toBe(true);
});
