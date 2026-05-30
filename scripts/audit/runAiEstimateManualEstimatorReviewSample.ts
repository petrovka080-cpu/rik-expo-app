import { writeCanaryEvaluationManualEstimatorReviewSample } from "../e2e/aiEstimateCanaryEvaluationCore";

export function runAiEstimateManualEstimatorReviewSample() {
  const review = writeCanaryEvaluationManualEstimatorReviewSample();
  if (!review.passed) {
    throw new Error(`NO_GO_MANUAL_REVIEW_FAILED:${review.issues.join(";")}`);
  }
  return review;
}

if (require.main === module) {
  runAiEstimateManualEstimatorReviewSample();
}
