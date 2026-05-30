import { validateInternalCanaryExecutionPolicy } from "../../src/lib/ai/productionCanary";

test("internal canary is disabled by default", () => {
  const policy = validateInternalCanaryExecutionPolicy();
  expect(policy.internal_canary_disabled_by_default).toBe(true);
  expect(policy.production_rollout_enabled).toBe(false);
  expect(policy.public_canary_enabled).toBe(false);
});
