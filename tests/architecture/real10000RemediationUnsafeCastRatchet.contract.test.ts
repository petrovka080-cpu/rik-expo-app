import { runReal10000P0RemediationTypeRatchetAudit } from "../../scripts/audit/runReal10000P0RemediationTypeRatchetAudit";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

test("Real10000 P0 remediation keeps unsafe cast ratchet within threshold", () => {
  if (isIosTestFlightInternalQaScopedRun()) {
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: false,
    });
    return;
  }

  const result = runReal10000P0RemediationTypeRatchetAudit();

  expect(result.after.after_unsafe_cast_total_lte_allowed).toBe(true);
  expect(result.after.ratchet_errors).toEqual([]);
  expect(result.final_status).toBe("TYPE_RATCHET_REMEDIATED");
});
