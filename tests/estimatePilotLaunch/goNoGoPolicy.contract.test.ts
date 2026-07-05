import { buildPilotGoNoGoDecision } from "../../scripts/estimate/buildPilotDefectBurndown";

const greenInput = {
  p0_defects_count: 0,
  p1_defects_count: 0,
  web_passed: true,
  android_passed: true,
  daily_regression_passed: true,
  support_secret_scan_passed: true,
  kill_switch_rehearsal_passed: true,
  rollback_rehearsal_passed: true,
  artifact_lineage_audit_passed: true,
  owner_go_no_go_status: "PENDING_OWNER_REVIEW" as const,
};

describe("pilot launch go/no-go policy", () => {
  it("allows technical readiness with pending owner review and rejects P0 defects", () => {
    const ready = buildPilotGoNoGoDecision(greenInput);
    const p0 = buildPilotGoNoGoDecision({ ...greenInput, p0_defects_count: 1 });

    expect(ready.go_no_go_policy_created).toBe(true);
    expect(ready.technical_go_ready).toBe(true);
    expect(ready.owner_go_no_go_status).toBe("PENDING_OWNER_REVIEW");
    expect(ready.owner_approval_not_faked).toBe(true);
    expect(ready.can_launch_without_owner_approval).toBe(false);
    expect(p0.technical_go_ready).toBe(false);
    expect(p0.blockers).toContain("p0_defects_block_go");
  });
});
