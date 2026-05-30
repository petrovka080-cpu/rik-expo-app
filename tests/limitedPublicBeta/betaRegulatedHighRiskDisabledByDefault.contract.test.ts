import {
  buildAiEstimateLimitedPublicBetaPolicy,
  resolveLimitedPublicBetaCohort,
  resolveLimitedPublicBetaEligibility,
} from "../../src/lib/ai/productionCanary";

test("regulated high-risk work is disabled by default for limited public beta", () => {
  const cohort = resolveLimitedPublicBetaCohort("passenger_elevators");
  const eligibility = resolveLimitedPublicBetaEligibility({
    policy: buildAiEstimateLimitedPublicBetaPolicy({
      user_allowlist_ids: ["beta-user-1"],
      user_allowlist_source: "test_staging",
    }),
    userId: "beta-user-1",
    country: "Kyrgyzstan",
    city: "Bishkek",
    entrypoint: "/ai?context=request",
    manualEnable: true,
    percentBucket: 0.05,
    regulatedHighRisk: true,
  });

  expect(cohort.excludedByDefault).toBe(true);
  expect(cohort.regulatedSafeClassification).toBe("REGULATED_SAFE_PROFESSIONAL_ESTIMATE");
  expect(eligibility.status).toBe("blocked_regulated_high_risk");
});
