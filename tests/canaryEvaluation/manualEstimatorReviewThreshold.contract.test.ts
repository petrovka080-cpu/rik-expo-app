import { writeCanaryEvaluationManualEstimatorReviewSample } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";

test("manual estimator review sample meets the 300 estimate threshold", () => {
  const review = writeCanaryEvaluationManualEstimatorReviewSample();
  expect(review.sample_total).toBe(300);
  expect(review.acceptable_rate).toBeGreaterThanOrEqual(0.98);
  expect(review.passed).toBe(true);
});
