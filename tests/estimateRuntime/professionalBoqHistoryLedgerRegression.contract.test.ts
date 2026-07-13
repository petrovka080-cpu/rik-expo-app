import { auditProfessionalBoq11610HistoryLedgerRegression } from "../../scripts/estimate/auditProfessionalBoq11610HistoryLedgerRegression";
import { GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY } from "../../scripts/estimate/professionalBoq11610RegressionSealCore";

jest.setTimeout(180000);

describe("professional BOQ history ledger regression", () => {
  it("preserves history beyond old caps and paginates 50000 records without loading payloads", () => {
    const summary = auditProfessionalBoq11610HistoryLedgerRegression();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_PROFESSIONAL_BOQ_11610_SECTION_READY);
    expect(summary.history_ledger_regression_created).toBe(true);
    expect(summary.history_count_reaches_14).toBe(true);
    expect(summary.history_count_reaches_25).toBe(true);
    expect(summary.history_count_reaches_100).toBe(true);
    expect(summary.history_not_limited_to_13).toBe(true);
    expect(summary.history_not_limited_to_25).toBe(true);
    expect(summary.history_persists_after_reload).toBe(true);
    expect(summary.revision_chain_preserved).toBe(true);
    expect(summary.pdf_buyer_refs_preserved).toBe(true);
    expect(summary.history_50000_pagination_passed).toBe(true);
    expect(summary.history_does_not_load_all_payloads).toBe(true);
  });
});
