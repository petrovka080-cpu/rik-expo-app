import { validateInternalCanaryExecutionPolicy } from "../../src/lib/ai/productionCanary";

test("internal canary max percent is capped at one", () => {
  const policy = validateInternalCanaryExecutionPolicy();
  expect(policy.max_canary_percent_lte_1).toBe(true);
});
