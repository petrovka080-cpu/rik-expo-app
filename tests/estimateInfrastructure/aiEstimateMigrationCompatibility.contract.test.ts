import { validateAiEstimateMigration } from "../../src/lib/estimate/migrations/validateAiEstimateMigration";

describe("AI estimate migration compatibility", () => {
  it("migrates legacy draft, history, revision, PDF, buyer, and partial records idempotently without destructive cleanup", () => {
    const result = validateAiEstimateMigration();

    expect(result.ok).toBe(true);
    expect(result.legacy_draft_migrated).toBe(true);
    expect(result.legacy_history_migrated).toBe(true);
    expect(result.legacy_revision_migrated).toBe(true);
    expect(result.legacy_pdf_migrated).toBe(true);
    expect(result.legacy_buyer_migrated).toBe(true);
    expect(result.partial_record_skipped_without_throw).toBe(true);
    expect(result.rollback_safe_no_legacy_delete).toBe(true);
  });
});
