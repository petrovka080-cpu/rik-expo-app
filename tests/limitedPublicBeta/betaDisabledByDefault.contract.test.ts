import { validateLimitedPublicBetaPolicy } from "../../src/lib/ai/productionCanary";

test("limited public beta is disabled by default", () => {
  const policy = validateLimitedPublicBetaPolicy();
  expect(policy.full_public_rollout_enabled).toBe(false);
  expect(policy.public_beta_enabled).toBe(false);
  expect(policy.limited_public_beta_enabled_by_default).toBe(false);
  expect(policy.limited_public_beta_ready).toBe(true);
});
