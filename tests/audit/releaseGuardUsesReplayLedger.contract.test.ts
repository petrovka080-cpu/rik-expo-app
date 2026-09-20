import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";

describe("release guard replay ledger policy", () => {
  it("keeps artifact reconciliation in release verify and blocks unsuperseded inconsistency", () => {
    const gate = REQUIRED_RELEASE_GATES.find((entry) => entry.name === "green-claim-artifact-reconciliation-proof");
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    expect(gate?.command).toBe("npx tsx scripts/audit/runGreenClaimArtifactReconciliation.ts --policy-check --verify-read-only");
    expect(report.releaseGuardTrace.release_guard_uses_replay_ledger).toBe(true);
    expect(report.releaseGuardTrace.release_guard_uses_current_receipt_bundle).toBe(true);
    expect(report.releaseGuardTrace.release_guard_blocks_unsuperseded_inconsistency).toBe(true);
    expect(report.releaseGuardTrace.unsuperseded_inconsistencies.length).toBeGreaterThan(0);
    expect(report.matrix.release_guard_uses_replay_ledger).toBe(true);
    expect(report.matrix.release_guard_uses_current_receipt_bundle).toBe(true);
    expect(report.matrix.fake_green_claimed).toBe(false);
  });
});
