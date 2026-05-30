import {
  buildAiEstimateOwnerAccountReplayPolicy,
  validateOwnerAccountReplayPolicy,
} from "../../src/lib/ai/productionCanary";

test("owner account replay keeps public beta and production rollout disabled", () => {
  const policy = buildAiEstimateOwnerAccountReplayPolicy();
  const validation = validateOwnerAccountReplayPolicy(policy);

  expect(validation.valid).toBe(true);
  expect(policy.owner_account_only).toBe(true);
  expect(policy.public_beta_enabled).toBe(false);
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.external_users_included).toBe(false);
});
