import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

describe("no green claim without replay evidence", () => {
  it("requires replay runtime, full Jest, release verify, and fake-green=false for reconciliation green", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    expect(report.matrix.final_status).toBe("GREEN_GREEN_CLAIM_ARTIFACT_RECONCILIATION_READY");
    expect(report.matrix.current_replay_runtime_passed).toBe(true);
    expect(report.matrix.current_replay_full_jest_passed).toBe(true);
    expect(report.matrix.current_replay_release_verify_passed).toBe(true);
    expect(report.matrix.artifact_reconciliation_proof_passed).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
