import { validateAiEstimateCanaryPolicy } from "../../src/lib/ai/productionCanary";
import { canaryConfig } from "./productionCanaryTestHelpers";

test("production rollout and public canary remain disabled", () => {
  const policy = validateAiEstimateCanaryPolicy(canaryConfig());
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
  expect(validateAiEstimateCanaryPolicy(canaryConfig({ production_rollout_enabled: true })).issues).toContain("PRODUCTION_ROLLOUT_ENABLED");
  expect(validateAiEstimateCanaryPolicy(canaryConfig({ public_canary_enabled: true })).issues).toContain("PUBLIC_CANARY_ENABLED");
});
