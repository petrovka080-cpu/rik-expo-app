import { arrayField, readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - release verify evidence", () => {
  it("records the latest release verify artifact as blocked, not green", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const blockers = readReconciliationArtifact("blockers.json");
    const currentBlockers = Array.isArray(blockers.current_blockers) ? blockers.current_blockers : [];
    const ledger = readReconciliationArtifact("current_state_ledger.json");
    const ledgerBlockers = arrayField(ledger.current_blockers);

    expect(matrix.latest_release_verify_artifact_verified).toBe(true);
    expect(matrix.latest_release_verify_passed).toBe(false);
    expect(matrix.latest_release_verify_final_status).toBe("BLOCKED_RELEASE_CORE_BASELINE_NOT_READY");
    expect(currentBlockers).toContain("BLOCKED_MIXED_WAVE_DIRTY_WORKTREE");
    expect(ledgerBlockers.length).toBeGreaterThan(0);
  });
});
