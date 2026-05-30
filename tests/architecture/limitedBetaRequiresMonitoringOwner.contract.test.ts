import {
  buildAiEstimateLimitedPublicBetaRolloutContract,
  validateLimitedPublicBetaRolloutContract,
} from "../../src/lib/ai/productionCanary";

test("limited beta rollout contract requires a monitoring owner", () => {
  const validation = validateLimitedPublicBetaRolloutContract(
    buildAiEstimateLimitedPublicBetaRolloutContract({ monitoring_owner: "" }),
  );

  expect(validation.monitoring_owner_present).toBe(false);
  expect(validation.issues).toContain("MONITORING_OWNER_MISSING");
});

