import { validateAiEstimateRolloutDecisionPolicy } from "../../src/lib/ai/productionCanary";

test("canary evaluation does not enable public rollout", () => {
  const policy = validateAiEstimateRolloutDecisionPolicy();
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
  expect(policy.public_rollout_authorized).toBe(false);
});
