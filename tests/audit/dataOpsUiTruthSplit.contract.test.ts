import {
  DATA_OPS_OPERATOR_UI_FOLLOWUP_WAVE,
  buildDataOpsTruth,
} from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

describe("Data Ops UI truth split", () => {
  it("claims governance core green without claiming the minimal shell as operator-grade UI", () => {
    const truth = buildDataOpsTruth(process.cwd());

    expect(truth.data_ops_governance_core_status).toBe("GREEN");
    expect(truth.data_ops_governance_core_verified).toBe(true);
    expect(truth.data_ops_routes_exist).toBe(true);
    expect(truth.data_ops_minimal_shared_shell).toBe(true);
    expect(truth.operator_grade_admin_ui_status).toBe("NOT_GREEN");
    expect(truth.requires_followup_wave).toBe(true);
    expect(truth.followup_wave).toBe(DATA_OPS_OPERATOR_UI_FOLLOWUP_WAVE);
  });
});
