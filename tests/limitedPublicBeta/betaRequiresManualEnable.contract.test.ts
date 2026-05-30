import {
  buildAiEstimateLimitedPublicBetaPolicy,
  resolveLimitedPublicBetaEligibility,
} from "../../src/lib/ai/productionCanary";

test("limited public beta requires manual enable", () => {
  const policy = buildAiEstimateLimitedPublicBetaPolicy({
    user_allowlist_ids: ["beta-user-1"],
    user_allowlist_source: "test_staging",
  });
  const blocked = resolveLimitedPublicBetaEligibility({
    policy,
    userId: "beta-user-1",
    country: "Kyrgyzstan",
    city: "Bishkek",
    entrypoint: "/request",
    manualEnable: false,
    percentBucket: 0.05,
    regulatedHighRisk: false,
  });
  const allowed = resolveLimitedPublicBetaEligibility({
    policy,
    userId: "beta-user-1",
    country: "Kyrgyzstan",
    city: "Bishkek",
    entrypoint: "/request",
    manualEnable: true,
    percentBucket: 0.05,
    regulatedHighRisk: false,
  });

  expect(blocked.status).toBe("blocked_missing_manual_enable");
  expect(allowed.eligible).toBe(true);
});
