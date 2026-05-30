import {
  buildAiEstimateLimitedPublicBetaPolicy,
  resolveLimitedPublicBetaEligibility,
} from "../../src/lib/ai/productionCanary";

test("limited public beta kill switch overrides allowlist and manual enable", () => {
  const eligibility = resolveLimitedPublicBetaEligibility({
    policy: buildAiEstimateLimitedPublicBetaPolicy({
      user_allowlist_ids: ["beta-user-1"],
      user_allowlist_source: "test_staging",
    }),
    userId: "beta-user-1",
    country: "Kyrgyzstan",
    city: "Bishkek",
    entrypoint: "/request",
    manualEnable: true,
    percentBucket: 0.05,
    regulatedHighRisk: false,
    killSwitchActive: true,
  });

  expect(eligibility.eligible).toBe(false);
  expect(eligibility.status).toBe("blocked_kill_switch");
});
