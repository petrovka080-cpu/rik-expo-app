import {
  buildUatGoNoGoDecision,
  evaluateNegativeUatGates,
  supportPackageContainsSecretOrPrivate,
} from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT negative gates", () => {
  it("rejects fake browser proof, leaked support package, fake signoff and P0 go", () => {
    const negative = evaluateNegativeUatGates();
    const go = buildUatGoNoGoDecision({
      p0_defects_count: 1,
      p1_defects_count: 0,
      web_uat_passed: true,
      android_uat_passed: true,
      support_package_secret_scan_passed: true,
      feedback_queue_created: true,
    });

    expect(negative.route_marker_web_uat_rejected).toBe(true);
    expect(negative.env_android_green_rejected).toBe(true);
    expect(negative.pdf_not_from_snapshot_rejected).toBe(true);
    expect(negative.buyer_work_rows_rejected).toBe(true);
    expect(negative.support_package_secret_leak_rejected).toBe(true);
    expect(negative.unversioned_feedback_fix_rejected).toBe(true);
    expect(negative.fake_human_signoff_rejected).toBe(true);
    expect(negative.p0_go_rejected).toBe(true);
    expect(supportPackageContainsSecretOrPrivate({ token: "sk-live", email: "a@example.com" })).toBe(true);
    expect(go.can_proceed).toBe(false);
  });
});
