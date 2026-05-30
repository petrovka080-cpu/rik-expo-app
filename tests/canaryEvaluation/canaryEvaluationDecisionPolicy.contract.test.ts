import {
  AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS,
  AI_ESTIMATE_CANARY_EVALUATION_WAVE,
  validateAiEstimateRolloutDecisionPolicy,
} from "../../src/lib/ai/productionCanary";

test("canary evaluation has a rollout decision identity and safe policy", () => {
  const policy = validateAiEstimateRolloutDecisionPolicy();
  expect(AI_ESTIMATE_CANARY_EVALUATION_WAVE).toContain("CANARY_EVALUATION");
  expect(AI_ESTIMATE_CANARY_EVALUATION_GREEN_STATUS)
    .toBe("GREEN_AI_ESTIMATE_CANARY_EVALUATION_PUBLIC_ROLLOUT_DECISION_READY");
  expect(policy.valid).toBe(true);
  expect(policy.controlled_public_canary_ready).toBe(true);
  expect(policy.manual_approval_required).toBe(true);
});
