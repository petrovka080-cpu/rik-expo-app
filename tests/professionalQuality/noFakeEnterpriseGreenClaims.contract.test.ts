import {
  buildAuditReport,
  ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR,
} from "../enterpriseProductionSafeAppAudit/enterpriseProductionSafeAppAuditTestHelpers";

describe("enterprise audit green-claim policy", () => {
  it("does not claim green without full release evidence", () => {
    const report = buildAuditReport();

    expect(report.current_truth.fake_green_claimed).toBe(false);
    expect(report.final_status).toBe("BLOCKED_ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT");
    expect(report.verification_matrix).toMatchObject({
      fake_green_claimed: false,
      no_eas_build_triggered: true,
      no_eas_submit_triggered: true,
      no_app_review_triggered: true,
    });
    expect(report.failures.some((failure) => failure.path === `${ENTERPRISE_PRODUCTION_SAFE_APP_AUDIT_DIR}/current_truth.json`)).toBe(true);
  });
});
