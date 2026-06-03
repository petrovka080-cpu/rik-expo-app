import { readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - Android API36", () => {
  it("keeps API34 canonical and never records API36 as green", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const latestValid = readReconciliationArtifact("latest_valid_evidence.json");
    const androidApi34 = latestValid.android_api34_current_state as Record<string, unknown>;
    const summary = androidApi34.summary as Record<string, unknown>;

    expect(matrix.api34_canonical_current).toBe(true);
    expect(matrix.api36_green_claimed).toBe(false);
    expect(matrix.api36_rejected_for_acceptance).toBe(true);
    expect(summary.android_sdk).toBe(34);
    expect(summary.api34_required_for_acceptance).toBe(true);
    expect(summary.api34_android_replay_passed).toBe(true);
    expect(summary.api36_rejected_for_acceptance).toBe(true);
  });
});
