import { buildUatGoNoGoDecision } from "../../scripts/estimate/buildRoleBasedUatDashboard";

describe("role based UAT go/no-go policy", () => {
  it("blocks P0 and requires owner acceptance for P1", () => {
    const p0 = buildUatGoNoGoDecision({
      p0_defects_count: 1,
      p1_defects_count: 0,
      web_uat_passed: true,
      android_uat_passed: true,
      support_package_secret_scan_passed: true,
      feedback_queue_created: true,
    });
    const p1 = buildUatGoNoGoDecision({
      p0_defects_count: 0,
      p1_defects_count: 1,
      web_uat_passed: true,
      android_uat_passed: true,
      support_package_secret_scan_passed: true,
      feedback_queue_created: true,
    });

    expect(p0.can_proceed).toBe(false);
    expect(p0.blockers).toContain("p0_defects_block_pilot");
    expect(p1.can_proceed).toBe(false);
    expect(p1.blockers).toContain("p1_owner_acceptance_required");
    expect(p0.web_android_uat_required_for_go).toBe(true);
    expect(p0.support_package_secret_scan_required).toBe(true);
    expect(p0.owner_acceptance_required_for_p1).toBe(true);
  });
});
