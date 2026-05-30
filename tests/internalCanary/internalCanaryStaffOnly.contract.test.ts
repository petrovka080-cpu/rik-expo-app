import { buildInternalCanaryEnabledConfig, resolveInternalCanaryEligibility } from "../../src/lib/ai/productionCanary";

test("internal canary requires internal staff", () => {
  const eligible = resolveInternalCanaryEligibility({
    config: buildInternalCanaryEnabledConfig(),
    internalStaffFlag: true,
    manualOptIn: true,
    percentBucket: 0,
  });

  expect(eligible.eligible).toBe(true);
  expect(eligible.internal_staff_only).toBe(true);
});
