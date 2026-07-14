import { refreshReal10000InfrastructureRuntimeEvidence } from "../../scripts/audit/real10000AuditP0RemediationCore";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

jest.setTimeout(120_000);

test("Real10000 remediation closes infrastructure BOQ depth", () => {
  if (isIosTestFlightInternalQaScopedRun()) {
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: false,
    });
    return;
  }

  const result = refreshReal10000InfrastructureRuntimeEvidence();

  expect(result.paving_stone_depth_passed).toBe(true);
  expect(result.drainage_channels_depth_passed).toBe(true);
  expect(result.paving_stone_min_rows).toBeGreaterThanOrEqual(45);
  expect(result.drainage_channels_min_rows).toBeGreaterThanOrEqual(45);
});
