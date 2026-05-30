import {
  buildAiEstimateLimitedPublicBetaPolicy,
  validateLimitedPublicBetaPolicy,
} from "../../src/lib/ai/productionCanary";
import { validateAiEstimateRollbackPlan } from "../../src/lib/ai/rollback/aiEstimateRollbackPlan";

test("limited public beta requires rollback plan", () => {
  expect(validateLimitedPublicBetaPolicy().rollback_required).toBe(true);
  expect(validateLimitedPublicBetaPolicy(buildAiEstimateLimitedPublicBetaPolicy({
    rollback_required: false,
  })).issues).toContain("ROLLBACK_NOT_REQUIRED");
  expect(validateAiEstimateRollbackPlan().rollback_ready).toBe(true);
});
