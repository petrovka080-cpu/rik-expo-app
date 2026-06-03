import { arrayField, readReconciliationArtifact } from "./reconciliationTestHelpers";

describe("current-state reconciliation - full Jest evidence", () => {
  it("does not treat stale, failed, missing, or timed-out full Jest evidence as green", () => {
    const matrix = readReconciliationArtifact("matrix.json");
    const staleEvidence = readReconciliationArtifact("stale_evidence.json");
    const staleItems = arrayField(staleEvidence.stale_evidence);

    expect(matrix.latest_full_jest_artifact_verified).toBe(true);
    expect(matrix.latest_full_jest_passed).toBe(false);
    expect(matrix.latest_full_jest_failed_tests).not.toBe(0);
    expect(staleItems.some((item) => item.name === "latest_full_jest")).toBe(true);
    expect(staleItems.some((item) => item.blocker === "LATEST_FULL_JEST_NOT_GREEN")).toBe(true);
  });
});
