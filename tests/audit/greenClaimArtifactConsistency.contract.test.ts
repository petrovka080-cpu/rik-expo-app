import {
  REQUIRED_SUPERSESSIONS,
  resolveGreenClaimArtifactConsistency,
} from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

describe("green claim artifact consistency", () => {
  it("preserves stale historical matrices but blocks supersession without current receipts", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    expect(report.inventory.current_replay_audit_found).toBe(false);
    expect(report.inventory.current_replay_status).toBe("BLOCKED_CURRENT_RELEASE_RECEIPT_BUNDLE");
    expect(report.inventory.runtime_replay_passed).toBe(false);
    expect(report.inventory.historical_replay_audit_found).toBe(true);
    expect(report.inventory.inconsistent_old_matrices_found).toBe(true);
    expect(report.inventory.old_matrices_count).toBe(REQUIRED_SUPERSESSIONS.length);
    expect(report.oldMatrices.historical_matrices_deleted).toBe(false);
    expect(report.oldMatrices.historical_matrices_silently_mutated).toBe(false);
    expect(report.matrix.final_status).toBe("BLOCKED_GREEN_CLAIM_ARTIFACT_RECONCILIATION");
    expect(report.matrix.all_inconsistent_matrices_superseded).toBe(false);
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
