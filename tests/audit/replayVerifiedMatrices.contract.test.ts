import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("replay verified matrices", () => {
  it("carry replay proof gates and do not fake green", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());
    const matrices = [
      report.replayMatrices.rls,
      report.replayMatrices.allScreens,
      report.replayMatrices.releaseCandidate,
    ];

    for (const matrix of matrices) {
      expect(matrix.replay_verified).toBe(true);
      expect(matrix.supersedes_historical_matrix).toBe(true);
      expect(matrix.historical_matrix_was_inconsistent).toBe(true);
      if (isIosTestFlightInternalQaScopedRun()) {
        expect(matrix.fake_green_claimed).toBe(false);
        expect(String(matrix.final_status)).toMatch(/^GREEN_/);
        expect(matrix.full_jest_passed).toBe(false);
        expect(matrix.release_verify_passed).toBe(false);
        continue;
      }

      expect(matrix.typecheck_passed).toBe(true);
      expect(matrix.lint_passed).toBe(true);
      expect(matrix.git_diff_check_passed).toBe(true);
      expect(matrix.full_jest_passed).toBe(true);
      expect(matrix.release_verify_passed).toBe(true);
      expect(matrix.fake_green_claimed).toBe(false);
      expect(String(matrix.final_status)).toMatch(/^GREEN_/);
    }
  });
});
