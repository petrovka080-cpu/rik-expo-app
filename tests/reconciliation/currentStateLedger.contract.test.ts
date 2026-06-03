import { AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS } from "../../scripts/audit/runAiEstimatePlatformCurrentStateReconciliationLedger";
import { readReconciliationArtifact, reconciliationArtifactExists } from "./reconciliationTestHelpers";

describe("AI estimate platform current-state reconciliation ledger", () => {
  it("writes the required truth-ledger artifacts for the current HEAD", () => {
    const requiredArtifacts = [
      "current_state_ledger.json",
      "green_claims.json",
      "blockers.json",
      "stale_evidence.json",
      "latest_valid_evidence.json",
      "matrix.json",
      "proof.md",
    ];

    for (const artifact of requiredArtifacts) {
      expect(reconciliationArtifactExists(artifact)).toBe(true);
    }

    const matrix = readReconciliationArtifact("matrix.json");
    const ledger = readReconciliationArtifact("current_state_ledger.json");

    expect(matrix).toMatchObject({
      final_status: AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS,
      ledger_green_only: true,
      product_full_closeout_green_claimed: false,
      fake_green_claimed: false,
    });
    expect(ledger).toMatchObject({
      final_status: AI_ESTIMATE_PLATFORM_RECONCILIATION_GREEN_STATUS,
      ledger_scope: "CURRENT_STATE_TRUTH_LEDGER_ONLY",
      ledger_is_product_closeout: false,
      fake_green_claimed: false,
    });
    expect(typeof matrix.latest_head_sha).toBe("string");
  });
});
