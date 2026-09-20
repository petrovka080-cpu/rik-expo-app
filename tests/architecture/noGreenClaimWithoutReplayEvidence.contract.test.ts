import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";
import {
  fixtureReleaseReceiptContext,
  readGoodReleaseReceiptFixture,
} from "../audit/releaseReceiptBundleTestSupport";

describe("no green claim without replay evidence", () => {
  it("requires replay runtime, full Jest, release verify, and fake-green=false for reconciliation green", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    expect(report.matrix.final_status).toBe("BLOCKED_GREEN_CLAIM_ARTIFACT_RECONCILIATION");
    expect(report.matrix.current_replay_full_jest_passed).toBe(false);
    expect(report.matrix.current_replay_release_verify_passed).toBe(false);
    expect(report.matrix.artifact_reconciliation_proof_passed).toBe(false);
    expect(report.matrix.fake_green_claimed).toBe(false);
  });

  it("does not treat a valid fixture bundle as actual environment evidence", () => {
    const report = resolveGreenClaimArtifactConsistency(process.cwd(), {
      receiptBundle: readGoodReleaseReceiptFixture(),
      validationContext: fixtureReleaseReceiptContext(),
    });

    expect(report.receiptValidation.contract_valid).toBe(true);
    expect(report.receiptValidation.actual_environment_passed).toBe(false);
    expect(report.matrix.current_replay_runtime_passed).toBe(false);
    expect(report.matrix.final_status).toBe("BLOCKED_GREEN_CLAIM_ARTIFACT_RECONCILIATION");
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
