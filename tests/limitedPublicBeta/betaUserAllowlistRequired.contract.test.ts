import {
  buildAiEstimateLimitedPublicBetaPolicy,
  resolveLimitedPublicBetaEligibility,
  validateLimitedPublicBetaPolicy,
} from "../../src/lib/ai/productionCanary";

test("limited public beta requires explicit user allowlist IDs for execution green", () => {
  const policy = buildAiEstimateLimitedPublicBetaPolicy();
  const validation = validateLimitedPublicBetaPolicy(policy, { requireAllowlistIds: true });
  const eligibility = resolveLimitedPublicBetaEligibility({
    policy,
    userId: "missing-user",
    country: "Kyrgyzstan",
    city: "Bishkek",
    entrypoint: "/request",
    manualEnable: true,
    percentBucket: 0.05,
    regulatedHighRisk: false,
  });

  expect(policy.user_allowlist_required).toBe(true);
  expect(validation.issues).toContain("USER_ALLOWLIST_IDS_MISSING");
  expect(eligibility.reason).toBe("BLOCKED_LIMITED_PUBLIC_BETA_ALLOWLIST_IDS_MISSING");
});
