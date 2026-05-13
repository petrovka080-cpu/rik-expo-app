import {
  AI_FINANCE_RISK_ENGINE_CONTRACT,
  buildAiFinanceCopilotSummary,
  previewAiFinanceRisk,
} from "../../src/features/ai/finance/aiFinanceRiskEngine";
import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";

const financeSummary: GetFinanceSummaryToolOutput = {
  totals: {
    payable: 200000,
    paid: 50000,
    debt: 150000,
    overdue: 60000,
    currency: "KGS",
  },
  debt_buckets: {
    current: 90000,
    overdue: 60000,
    critical: 25000,
  },
  overdue_count: 2,
  document_gaps: ["missing_invoice"],
  risk_flags: ["debt_present", "overdue_debt_present", "document_gap_present"],
  redacted_breakdown: {
    scope: "company",
    supplier_count: 3,
    document_count: 7,
    supplier_names_redacted: true,
    bank_details_redacted: true,
    tokens_redacted: true,
    raw_rows_exposed: false,
  },
  evidence_refs: ["finance:summary:totals", "finance:summary:supplier_breakdown:redacted"],
  route_operation: "director.finance.rpc.scope",
  bounded: true,
  mutation_count: 0,
  payment_mutation: 0,
  status_mutation: 0,
  raw_finance_rows_exposed: false,
};

describe("AI finance risk engine", () => {
  it("builds role-scoped redacted finance risk cards without mutation", async () => {
    const result = await buildAiFinanceCopilotSummary({
      auth: { userId: "accountant", role: "accountant" },
      input: { financeSummary },
    });

    expect(AI_FINANCE_RISK_ENGINE_CONTRACT).toMatchObject({
      backendFirst: true,
      directSupabaseFromUi: false,
      mutationCount: 0,
      paymentCreated: false,
      postingCreated: false,
      invoiceMutated: false,
      fakeFinanceCards: false,
    });
    expect(result.status).toBe("loaded");
    expect(result.debtCards.length).toBeGreaterThanOrEqual(2);
    expect(result.debtCards.every((card) => card.suggestedToolId === "get_finance_summary")).toBe(true);
    expect(result.allCardsHaveEvidence).toBe(true);
    expect(result.mutationCount).toBe(0);
    expect(result.paymentCreated).toBe(false);
    expect(result.postingCreated).toBe(false);
    expect(result.invoiceMutated).toBe(false);
    expect(result.rawRowsReturned).toBe(false);
  });

  it("previews deterministic safe-read finance risk and blocks non-finance roles", async () => {
    const preview = await previewAiFinanceRisk({
      auth: { userId: "director", role: "director" },
      input: { financeSummary },
    });
    const buyer = await previewAiFinanceRisk({
      auth: { userId: "buyer", role: "buyer" },
      input: { financeSummary },
    });

    expect(preview).toMatchObject({
      status: "preview",
      suggestedToolId: "get_finance_summary",
      suggestedMode: "safe_read",
      approvalRequired: false,
      mutationCount: 0,
      providerCalled: false,
      paymentCreated: false,
    });
    expect(preview.evidenceRefs.length).toBeGreaterThan(0);
    expect(buyer.status).toBe("blocked");
    expect(buyer.suggestedMode).toBe("forbidden");
    expect(buyer.fakeFinanceCards).toBe(false);
  });
});
