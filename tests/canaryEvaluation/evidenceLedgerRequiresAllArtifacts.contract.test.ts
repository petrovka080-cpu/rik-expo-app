import { writeCanaryEvaluationEvidenceLedgerAudit } from "../../scripts/e2e/aiEstimateCanaryEvaluationCore";
import {
  IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
  expectIosTestFlightScopedOutNoFakeGreen,
  isIosTestFlightInternalQaScopedRun,
} from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

test("canary evaluation evidence ledger requires every internal canary artifact", () => {
  const audit = writeCanaryEvaluationEvidenceLedgerAudit();
  if (isIosTestFlightInternalQaScopedRun()) {
    expect(audit.evidence_ledger_passed).toBe(false);
    expect(audit.required_artifacts_present).toBeLessThan(audit.required_artifacts_total);
    expect(audit.issues.length).toBeGreaterThan(0);
    expectIosTestFlightScopedOutNoFakeGreen({
      wave: IOS_TESTFLIGHT_INTERNAL_QA_SCOPED_OUT_STATUS,
      fakeGreenClaimed: audit.fake_green_claimed,
      productionRolloutEnabled: audit.production_rollout_enabled,
    });
    return;
  }

  expect(audit.evidence_ledger_passed).toBe(true);
  expect(audit.required_artifacts_present).toBe(audit.required_artifacts_total);
  expect(audit.failures_empty).toBe(true);
});
