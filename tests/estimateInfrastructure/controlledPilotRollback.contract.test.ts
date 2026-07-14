import { rehearseAiEstimatePilotRollback } from "../../scripts/estimate/rehearseAiEstimatePilotRollback";

describe("controlled pilot rollback rehearsal", () => {
  it("disables pilot mode without data loss, production DB writes or destructive migrations", () => {
    const summary = rehearseAiEstimatePilotRollback({ writeRuntime: false }).artifact;

    expect(summary.rollback_rehearsal_created).toBe(true);
    expect(summary.rollback_disables_pilot_without_data_loss).toBe(true);
    expect(summary.approved_history_preserved_after_rollback).toBe(true);
    expect(summary.owner_review_packet_preserved_after_rollback).toBe(true);
    expect(summary.production_db_not_touched).toBe(true);
    expect(summary.destructive_migration_not_run).toBe(true);
  });
});
