import {
  GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS,
  REQUIRED_SUPERSESSIONS,
  resolveGreenClaimArtifactConsistency,
} from "../../scripts/audit/greenClaimArtifactReconciliation.shared";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("green claim artifact consistency", () => {
  it("classifies stale historical matrices through replay supersession instead of hiding them", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.inventory.current_replay_audit_found).toBe(false);
      expect(report.inventory.inconsistent_old_matrices_found).toBe(true);
      expect(report.inventory.old_matrices_count).toBe(REQUIRED_SUPERSESSIONS.length);
      expect(report.matrix.final_status).not.toBe(GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS);
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(report.inventory.current_replay_audit_found).toBe(true);
    expect(report.inventory.current_replay_status).toBe("BLOCKED_GREEN_CLAIM_ARTIFACT_INCONSISTENT");
    expect(report.inventory.runtime_replay_passed).toBe(true);
    expect(report.inventory.inconsistent_old_matrices_found).toBe(true);
    expect(report.inventory.old_matrices_count).toBe(REQUIRED_SUPERSESSIONS.length);
    expect(report.oldMatrices.historical_matrices_deleted).toBe(false);
    expect(report.oldMatrices.historical_matrices_silently_mutated).toBe(false);
    expect(report.matrix.final_status).toBe(GREEN_CLAIM_ARTIFACT_RECONCILIATION_GREEN_STATUS);
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
