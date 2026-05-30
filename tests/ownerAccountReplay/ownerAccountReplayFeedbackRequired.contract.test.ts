import {
  buildAiEstimateOwnerAccountReplayPolicy,
  validateOwnerAccountReplayPolicy,
} from "../../src/lib/ai/productionCanary";

test("owner account replay requires feedback capture", () => {
  const validation = validateOwnerAccountReplayPolicy(
    buildAiEstimateOwnerAccountReplayPolicy({ feedback_required: false }),
  );

  expect(validation.valid).toBe(false);
  expect(validation.issues).toContain("FEEDBACK_NOT_REQUIRED");
});
