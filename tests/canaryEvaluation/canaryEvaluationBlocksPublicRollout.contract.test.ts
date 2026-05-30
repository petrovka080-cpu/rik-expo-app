import {
  buildAiEstimateCanaryEvaluationPolicy,
  validateAiEstimateRolloutDecisionPolicy,
} from "../../src/lib/ai/productionCanary";

test("canary evaluation keeps public rollout and public canary disabled", () => {
  const policy = validateAiEstimateRolloutDecisionPolicy();
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
  expect(policy.public_rollout_authorized).toBe(false);
  expect(validateAiEstimateRolloutDecisionPolicy(buildAiEstimateCanaryEvaluationPolicy({
    production_rollout_enabled: true,
  })).issues).toContain("PRODUCTION_ROLLOUT_ENABLED");
});
