import {
  buildAiEstimateLimitedPublicBetaRolloutContract,
  validateLimitedPublicBetaRolloutContract,
} from "../../src/lib/ai/productionCanary";

test("limited beta rollout contract requires a rollback owner", () => {
  const validation = validateLimitedPublicBetaRolloutContract(
    buildAiEstimateLimitedPublicBetaRolloutContract({ rollback_owner: "" }),
  );

  expect(validation.rollback_owner_present).toBe(false);
  expect(validation.issues).toContain("ROLLBACK_OWNER_MISSING");
});

