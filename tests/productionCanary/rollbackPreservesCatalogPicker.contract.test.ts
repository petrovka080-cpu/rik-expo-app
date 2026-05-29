import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";

test("rollback preserves manual catalog material picker", () => {
  expect(validateAiEstimateRollbackPlan().manual_catalog_picker_preserved).toBe(true);
});
