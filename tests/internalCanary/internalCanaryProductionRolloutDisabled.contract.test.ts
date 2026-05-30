import { validateInternalCanaryExecutionPolicy } from "../../src/lib/ai/productionCanary";

test("internal canary does not enable production rollout", () => {
  const policy = validateInternalCanaryExecutionPolicy();
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
});
