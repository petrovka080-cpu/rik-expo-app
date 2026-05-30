import { buildInternalCanaryEnabledConfig, resolveInternalCanaryEligibility } from "../../src/lib/ai/productionCanary";

test("internal canary excludes public users", () => {
  const result = resolveInternalCanaryEligibility({
    config: buildInternalCanaryEnabledConfig(),
    internalStaffFlag: false,
    manualOptIn: true,
    percentBucket: 0,
  });

  expect(result.eligible).toBe(false);
  expect(result.status).toBe("blocked_external_user");
  expect(result.public_users_excluded).toBe(true);
});
