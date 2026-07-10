import { auditStagingDurableLedgerSandbox } from "../../scripts/estimate/auditStagingDurableLedgerSandbox";

describe("staging durable ledger sandbox", () => {
  it("rehearses draft revision approval history and artifact refs without production ledger", () => {
    const { summary } = auditStagingDurableLedgerSandbox({ writeSummary: false });

    expect(summary.staging_durable_ledger_sandbox_created).toBe(true);
    expect(summary.staging_create_draft_passed).toBe(true);
    expect(summary.staging_append_revision_passed).toBe(true);
    expect(summary.staging_approve_revision_passed).toBe(true);
    expect(summary.staging_approved_history_pagination_passed).toBe(true);
    expect(summary.staging_duplicate_approve_idempotent).toBe(true);
    expect(summary.staging_pdf_refs_bound_to_revision).toBe(true);
    expect(summary.staging_buyer_refs_bound_to_revision).toBe(true);
    expect(summary.production_ledger_not_touched).toBe(true);
  });
});
