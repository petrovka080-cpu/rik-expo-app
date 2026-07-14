import { real10000Evaluation, real10000Summary } from "./real10000TestHelpers";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

test("real 10000 runtime returns expanded estimates for all cases", () => {
  if (isIosTestFlightInternalQaScopedRun()) {
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: false,
      productionRolloutEnabled: false,
    });
    return;
  }

  const evaluation = real10000Evaluation();
  const summary = real10000Summary();
  expect(summary.cases_total).toBe(10_000);
  expect(summary.cases_passed).toBe(10_000);
  expect(evaluation.failures).toEqual([]);
});
