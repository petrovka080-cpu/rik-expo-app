import {
  buildAiEstimateLimitedPublicBetaRolloutContract,
  validateLimitedPublicBetaRolloutContract,
} from "../../src/lib/ai/productionCanary";

test("limited public beta rollout contract requires owners, daily gates, kill switch, rollback, and city policy", () => {
  const valid = validateLimitedPublicBetaRolloutContract(buildAiEstimateLimitedPublicBetaRolloutContract());
  const invalid = validateLimitedPublicBetaRolloutContract(
    buildAiEstimateLimitedPublicBetaRolloutContract({
      monitoring_owner: "",
      rollback_owner: "",
      daily_error_budget_required: false,
      kill_switch_required: false,
      rollback_required: false,
      country_city_allowlist: [],
    } as never),
  );

  expect(valid.valid).toBe(true);
  expect(valid.monitoring_owner_present).toBe(true);
  expect(valid.rollback_owner_present).toBe(true);
  expect(invalid.valid).toBe(false);
  expect(invalid.issues).toEqual(expect.arrayContaining([
    "MONITORING_OWNER_MISSING",
    "ROLLBACK_OWNER_MISSING",
    "DAILY_ERROR_BUDGET_REQUIRED_MISSING",
    "KILL_SWITCH_REQUIRED_MISSING",
    "ROLLBACK_REQUIRED_MISSING",
    "COUNTRY_CITY_ALLOWLIST_MISSING",
  ]));
});

