import { validateLegacyAiEstimateMigration } from "../../src/lib/estimate/ledger/migration/validateLegacyAiEstimateMigration";

describe("AI estimate legacy local storage migration", () => {
  it("migrates legacy approved bundles into the ledger without deleting legacy state", () => {
    const proof = validateLegacyAiEstimateMigration();

    expect(proof.ok).toBe(true);
    expect(proof.migrated_without_deleting_legacy_records).toBe(true);
    expect(proof.migration_idempotent).toBe(true);
    expect(proof.approved_history_restored_from_ledger).toBe(true);
    expect(proof.buyer_handoff_restored).toBe(true);
  });
});
