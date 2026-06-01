import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import { resolveGreenClaimArtifactConsistency } from "../../scripts/audit/greenClaimArtifactReconciliation.shared";
import { isIosTestFlightInternalQaScopedRun } from "../mobileRelease/iosTestFlightInternalQaScopeTestHelper";

describe("release guard replay ledger policy", () => {
  it("keeps artifact reconciliation in release verify and blocks unsuperseded inconsistency", () => {
    const gate = REQUIRED_RELEASE_GATES.find((entry) => entry.name === "green-claim-artifact-reconciliation-proof");
    const report = resolveGreenClaimArtifactConsistency(process.cwd());

    expect(gate?.command).toBe("npx tsx scripts/audit/runGreenClaimArtifactReconciliation.ts");
    expect(report.releaseGuardTrace.release_guard_uses_replay_ledger).toBe(true);
    expect(report.releaseGuardTrace.release_guard_blocks_unsuperseded_inconsistency).toBe(true);
    if (isIosTestFlightInternalQaScopedRun()) {
      expect(report.releaseGuardTrace.unsuperseded_inconsistencies.length).toBeGreaterThan(0);
      expect(report.matrix.fake_green_claimed).toBe(false);
      return;
    }

    expect(report.releaseGuardTrace.unsuperseded_inconsistencies).toEqual([]);
    expect(report.matrix.release_guard_uses_replay_ledger).toBe(true);
  });
});
