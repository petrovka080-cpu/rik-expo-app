import { buildAiEnterpriseReleaseCloseoutReport } from "../../scripts/release/runAiEnterpriseReleaseCloseoutChangeControl";

describe("AI enterprise release closeout gate audit", () => {
  it("requires release verify to include all AI wave gates", () => {
    const report = buildAiEnterpriseReleaseCloseoutReport();

    expect(report.releaseGateAudit.missingCommands).toEqual([]);
    expect(report.matrix.release_gate_audit_passed).toBe(true);
    expect(report.matrix.all_ai_gates_in_release_verify).toBe(true);
  });
});
