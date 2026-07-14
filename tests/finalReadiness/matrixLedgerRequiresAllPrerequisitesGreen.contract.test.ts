import { finalReadinessReport } from "./finalReadinessTestHelpers";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

it("requires every prerequisite matrix to be green in the final readiness ledger", () => {
  const report = finalReadinessReport();
  if (isIosTestFlightInternalQaScopedRun()) {
    expect(report.matrix.matrix_ledger_passed).toBe(false);
    expect(report.matrix.all_prerequisites_green).toBe(false);
    expect(report.matrix.fake_green_claimed).toBe(false);
    expect(report.matrix.blockers).toEqual(
      expect.arrayContaining([expect.stringMatching(/^BLOCKED_FINAL_READINESS_PREREQUISITE_NOT_GREEN:/)]),
    );
    return;
  }

  expect(report.matrix.matrix_ledger_passed).toBe(true);
  expect(report.matrix.all_prerequisites_green).toBe(true);
  expect(report.matrices.every((item) => item.green && !item.fake_green_claimed)).toBe(true);
});
