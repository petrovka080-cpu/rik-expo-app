import { resolveAiEstimateCanaryEligibility, validateAiEstimateCanaryPolicy } from "../../src/lib/ai/productionCanary";
import { enabledInternalCanaryConfig } from "./productionCanaryTestHelpers";

test("internal canary accepts only internal staff with manual opt-in", () => {
  const config = enabledInternalCanaryConfig();
  expect(validateAiEstimateCanaryPolicy(config).internal_staff_only).toBe(true);
  expect(resolveAiEstimateCanaryEligibility({ config, isInternalStaff: true, manualOptIn: true, percentBucket: 0 }).eligible).toBe(true);
  expect(resolveAiEstimateCanaryEligibility({ config, isInternalStaff: false, manualOptIn: true, percentBucket: 0 }).status).toBe("blocked_external_user");
  expect(resolveAiEstimateCanaryEligibility({ config, isInternalStaff: true, manualOptIn: false, percentBucket: 0 }).status).toBe("blocked_missing_manual_opt_in");
});
