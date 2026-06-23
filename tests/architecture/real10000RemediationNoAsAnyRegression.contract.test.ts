import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

test("Real10000 P0 remediation does not introduce any-cast regression", () => {
  if (isIosTestFlightInternalQaScopedRun()) {
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: false,
    });
    return;
  }

  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.after.as_any_regression_found).toBe(false);
  expect(result.after.as_any_total).toBeLessThanOrEqual(result.after.allowed_total);
});
