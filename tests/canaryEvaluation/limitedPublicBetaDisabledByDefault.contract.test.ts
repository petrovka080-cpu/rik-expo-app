import { validateLimitedPublicBetaPolicy } from "../../src/lib/ai/productionCanary";

test("limited public beta is disabled by default", () => {
  const policy = validateLimitedPublicBetaPolicy();
  expect(policy.public_beta_enabled).toBe(false);
  expect(policy.limited_public_beta_ready).toBe(true);
});
