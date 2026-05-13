import {
  AI_ACCOUNTING_EVIDENCE_CONTRACT,
  buildAiFinanceEvidenceRefs,
} from "../../src/features/ai/finance/aiAccountingEvidence";
import {
  AI_DEBT_SUMMARY_BUILDER_CONTRACT,
  buildAiFinanceDebtCards,
} from "../../src/features/ai/finance/aiDebtSummaryBuilder";
import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";

const baseSummary: GetFinanceSummaryToolOutput = {
  totals: { payable: 100000, paid: 10000, debt: 90000, overdue: 40000, currency: "KGS" },
  debt_buckets: { current: 50000, overdue: 40000, critical: 15000 },
  overdue_count: 1,
  document_gaps: ["act_without_invoice"],
  risk_flags: ["debt_present", "overdue_debt_present"],
  redacted_breakdown: {
    scope: "company",
    supplier_count: 2,
    document_count: 4,
    supplier_names_redacted: true,
    bank_details_redacted: true,
    tokens_redacted: true,
    raw_rows_exposed: false,
  },
  evidence_refs: ["finance:summary:totals"],
  route_operation: "director.finance.rpc.scope",
  bounded: true,
  mutation_count: 0,
  payment_mutation: 0,
  status_mutation: 0,
  raw_finance_rows_exposed: false,
};

describe("AI debt summary builder", () => {
  it("creates evidence-backed debt cards only from redacted finance summary", () => {
    const refs = buildAiFinanceEvidenceRefs(baseSummary);
    const cards = buildAiFinanceDebtCards(baseSummary);

    expect(AI_ACCOUNTING_EVIDENCE_CONTRACT.rawRowsReturned).toBe(false);
    expect(AI_DEBT_SUMMARY_BUILDER_CONTRACT.fakeFinanceCards).toBe(false);
    expect(refs.map((ref) => ref.ref)).toEqual(
      expect.arrayContaining([
        "finance:summary:totals:redacted",
        "finance:debt:overdue:redacted",
        "finance:document_gap:redacted",
      ]),
    );
    expect(cards.map((card) => card.debtId)).toEqual(
      expect.arrayContaining(["finance.debt.total", "finance.debt.overdue", "finance.documents.gaps"]),
    );
    expect(cards.every((card) => card.evidenceRefs.length > 0)).toBe(true);
    expect(cards.every((card) => card.mutationCount === 0)).toBe(true);
    expect(cards.every((card) => !card.paymentCreated && !card.postingCreated && !card.invoiceMutated)).toBe(true);
  });

  it("returns no fake cards when summary has no debt or document gaps", () => {
    const cards = buildAiFinanceDebtCards({
      ...baseSummary,
      totals: { payable: 0, paid: 0, debt: 0, overdue: 0, currency: "KGS" },
      debt_buckets: { current: 0, overdue: 0, critical: 0 },
      overdue_count: 0,
      document_gaps: [],
      risk_flags: ["no_finance_risk_flags"],
    });

    expect(cards).toEqual([]);
  });
});
