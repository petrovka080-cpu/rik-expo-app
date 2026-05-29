import { validateAiEstimateCanaryPolicy } from "../../src/lib/ai/productionCanary";

test("production canary does not enable public rollout", () => {
  const policy = validateAiEstimateCanaryPolicy();
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
});
