import { buildAiEstimateLimitedPublicBetaPolicy, validateLimitedPublicBetaPolicy } from "../../src/lib/ai/productionCanary";

test("limited public beta percent is capped at 0.5 percent", () => {
  expect(validateLimitedPublicBetaPolicy().max_public_beta_percent_lte_0_5).toBe(true);
  expect(validateLimitedPublicBetaPolicy(buildAiEstimateLimitedPublicBetaPolicy({
    max_public_beta_percent: 0.6,
  })).issues).toContain("PUBLIC_BETA_PERCENT_GT_0_5");
});
