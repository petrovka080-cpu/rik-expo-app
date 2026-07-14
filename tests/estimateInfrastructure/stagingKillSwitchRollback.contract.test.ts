import { buildStagingKillSwitchRehearsalSummary } from "../../scripts/estimate/rehearseStagingAiEstimateKillSwitch";
import { buildStagingRollbackRehearsalSummary } from "../../scripts/estimate/rehearseStagingAiEstimateRollback";

describe("staging kill switch and rollback", () => {
  it("blocks new AI estimates while preserving history and artifacts", () => {
    const summary = buildStagingKillSwitchRehearsalSummary();

    expect(summary.staging_kill_switch_rehearsal_passed).toBe(true);
    expect(summary.staging_kill_switch_blocks_new_ai_estimates).toBe(true);
    expect(summary.staging_kill_switch_preserves_history_read).toBe(true);
    expect(summary.staging_kill_switch_preserves_existing_pdf_read).toBe(true);
    expect(summary.staging_kill_switch_preserves_existing_buyer_package_read).toBe(true);
    expect(summary.staging_reenable_passed).toBe(true);
  });

  it("preserves approved history and ledger on rollback", () => {
    const summary = buildStagingRollbackRehearsalSummary();

    expect(summary.staging_rollback_rehearsal_passed).toBe(true);
    expect(summary.staging_rollback_preserves_approved_history).toBe(true);
    expect(summary.staging_rollback_preserves_ledger).toBe(true);
    expect(summary.production_db_not_touched).toBe(true);
  });
});
