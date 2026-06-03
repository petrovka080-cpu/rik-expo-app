import { readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - Android API36", () => {
  it("keeps API34 canonical and never records API36 as green", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const latestValid = readReconciliationArtifact("latest_valid_evidence.json");
    const androidApi34 = latestValid.android_api34_current_state as Record<string, unknown>;
    const summary = androidApi34.summary as Record<string, unknown>;

    expect(matrix.api36_green_claimed).toBe(false);
    expect(matrix.api36_rejected_for_acceptance).toBe(true);
    expect(summary.canonical_api34_blocker).toBe("CANONICAL_API34_EVIDENCE_STALE_FOR_DIRTY_PRODUCT_WORKTREE");
    expect(summary.stale_android_evidence_found).toBe(true);
  });
});
