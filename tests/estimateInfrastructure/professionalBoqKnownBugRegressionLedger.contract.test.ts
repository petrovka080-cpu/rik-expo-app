import { auditProfessionalBoqKnownBugRegressionLedger } from "../../scripts/estimate/auditProfessionalBoqKnownBugRegressionLedger";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ known bug regression ledger", () => {
  it("keeps known history, dependency, unit conflict, UI, android fake-green, and staging bugs sealed", () => {
    const summary = auditProfessionalBoqKnownBugRegressionLedger();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.known_bug_regression_ledger_created).toBe(true);
    expect(Number(summary.known_bug_cases_total)).toBeGreaterThanOrEqual(15);
    expect(summary.known_bug_regressions_passed).toBe(true);
    expect(summary.history_13_regression_passed).toBe(true);
    expect(summary.substring_dependency_regressions_passed).toBe(true);
    expect(summary.unit_conflict_regressions_passed).toBe(true);
    expect(summary.ui_nested_button_regression_passed).toBe(true);
    expect(summary.android_fake_green_regression_passed).toBe(true);
  });
});
