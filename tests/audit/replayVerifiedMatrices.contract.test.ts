import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";
import { createSyntheticActualReleaseReceiptFixture } from "./releaseReceiptBundleTestSupport";

describe("replay verified matrices", () => {
  it("remain blocked without a current actual receipt bundle", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());
    const matrices = [
      report.replayMatrices.rls,
      report.replayMatrices.allScreens,
      report.replayMatrices.releaseCandidate,
    ];

    for (const matrix of matrices) {
      expect(matrix.replay_verified).toBe(false);
      expect(matrix.supersedes_historical_matrix).toBe(false);
      expect(matrix.historical_matrix_was_inconsistent).toBe(true);
      expect(matrix.fake_green_claimed).toBe(false);
      expect(matrix.full_jest_passed).toBe(false);
      expect(matrix.release_verify_passed).toBe(false);
      expect(String(matrix.final_status)).toMatch(/^BLOCKED_/);
    }
  });

  it("do not promote an actual-shaped synthetic bundle without current-workspace provenance", () => {
    const actual = createSyntheticActualReleaseReceiptFixture();
    try {
      const report = resolveGreenClaimArtifactConsistency(actual.rootDir, {
        receiptBundle: actual.bundle,
        validationContext: actual.context,
      });
      for (const matrix of Object.values(report.replayMatrices)) {
        expect(matrix.replay_verified).toBe(false);
        expect(matrix.supersedes_historical_matrix).toBe(false);
        expect(matrix.actual_environment_passed).toBe(false);
        expect(matrix.full_jest_passed).toBe(false);
        expect(matrix.release_verify_passed).toBe(false);
        expect(matrix.fake_green_claimed).toBe(false);
        expect(String(matrix.final_status)).toMatch(/^BLOCKED_/);
      }
      expect(report.receiptValidation.errors).toContain("RECEIPT_ACTUAL_CONTEXT_NOT_CURRENT_WORKSPACE");
      expect(report.matrix.final_status).toBe("BLOCKED_GREEN_CLAIM_ARTIFACT_RECONCILIATION");
    } finally {
      actual.cleanup();
    }
  });
});
