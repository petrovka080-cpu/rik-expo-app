import { arrayField, readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - release verify evidence", () => {
  it("records release verify as current green while keeping full closeout blocked on full Jest", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const blockers = readReconciliationArtifact("blockers.json");
    const currentBlockers = Array.isArray(blockers.current_blockers) ? blockers.current_blockers : [];
    const ledger = readReconciliationArtifact("current_state_ledger.json");
    const ledgerBlockers = arrayField(ledger.current_blockers);

    expect(matrix.latest_release_verify_artifact_verified).toBe(true);
    if (matrix.worktree_clean === true) {
      expect(matrix.latest_release_verify_passed).toBe(true);
      expect(matrix.latest_release_verify_final_status).toBe("GREEN_RELEASE_CORE_BASELINE_READY");
      expect(currentBlockers).not.toContain("BLOCKED_MIXED_WAVE_DIRTY_WORKTREE");
    } else {
      expect(matrix.latest_release_verify_passed).toBe(false);
      expect(String(matrix.latest_release_verify_final_status)).toMatch(/^BLOCKED_/);
      expect(currentBlockers.length).toBeGreaterThan(0);
    }
    expect(matrix.latest_full_jest_passed).toBe(false);
    expect(currentBlockers).toContain("LATEST_FULL_JEST_NOT_GREEN");
    expect(ledgerBlockers.length).toBeGreaterThan(0);
  });
});
