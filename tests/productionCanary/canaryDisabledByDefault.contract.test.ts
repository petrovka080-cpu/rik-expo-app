import { resolveAiEstimateCanaryEligibility, validateAiEstimateCanaryPolicy } from "../../src/lib/ai/productionCanary";
import { canaryConfig } from "./productionCanaryTestHelpers";

test("AI estimate canary is disabled by default", () => {
  const config = canaryConfig();
  const policy = validateAiEstimateCanaryPolicy(config);
  const eligibility = resolveAiEstimateCanaryEligibility({
    config,
    isInternalStaff: true,
    manualOptIn: true,
    percentBucket: 0,
  });

  expect(policy.canary_disabled_by_default).toBe(true);
  expect(config.production_rollout_enabled).toBe(false);
  expect(config.public_canary_enabled).toBe(false);
  expect(config.internal_canary_enabled).toBe(false);
  expect(eligibility.eligible).toBe(false);
  expect(eligibility.status).toBe("disabled");
});
