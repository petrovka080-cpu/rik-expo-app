import { writeCanaryEvaluationManualEstimatorReviewSample } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

test("manual estimator review sample meets the 300 estimate threshold", () => {
  const review = writeCanaryEvaluationManualEstimatorReviewSample();
  if (isIosTestFlightInternalQaScopedRun()) {
    expect(review.sample_total).toBe(0);
    expect(review.passed).toBe(false);
    expect(review.issues).toContain("MANUAL_REVIEW_SAMPLE_NOT_300");
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: review.fake_green_claimed,
      productionRolloutEnabled: false,
    });
    return;
  }

  expect(review.sample_total).toBe(300);
  expect(review.acceptable_rate).toBeGreaterThanOrEqual(0.98);
  expect(review.passed).toBe(true);
});
