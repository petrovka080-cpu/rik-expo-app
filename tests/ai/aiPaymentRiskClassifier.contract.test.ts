import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";
import { resolveAiFinanceEvidence } from "../../src/features/ai/finance/aiFinanceEvidenceResolver";
import {
  AI_PAYMENT_RISK_CLASSIFIER_CONTRACT,
  classifyAiPaymentRisk,
} from "../../src/features/ai/finance/aiPaymentRiskClassifier";

const financeSummary: GetFinanceSummaryToolOutput = {
  totals: { payable: 240000, paid: 40000, debt: 200000, overdue: 75000, currency: "KGS" },
  debt_buckets: { current: 125000, overdue: 75000, critical: 50000 },
  overdue_count: 3,
  document_gaps: ["invoice_missing", "act_missing"],
  risk_flags: ["debt_present", "overdue_debt_present", "document_gap_present"],
  redacted_breakdown: {
    scope: "company",
    supplier_count: 4,
    document_count: 8,
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

describe("AI payment risk classifier", () => {
  it("classifies payment risk from finance evidence without allowing payment or posting", async () => {
    const evidence = await resolveAiFinanceEvidence({
      auth: { userId: "accountant", role: "accountant" },
      screenId: "accountant.payment",
      input: { financeSummary },
    });
    const result = classifyAiPaymentRisk(evidence);

    expect(AI_PAYMENT_RISK_CLASSIFIER_CONTRACT).toMatchObject({
      approvalRequiredForPayment: true,
      draftOnly: true,
      directPaymentAllowed: false,
      directFinancePostingAllowed: false,
      ledgerBypassAllowed: false,
      paymentCreated: false,
      postingCreated: false,
      invoiceMutated: false,
      mutationCount: 0,
    });
    expect(result.status).toBe("classified");
    expect(result.riskLevel).toBe("high");
    expect(result.riskSignals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining(["debt_present", "overdue_payment", "critical_debt_bucket", "document_gap"]),
    );
    expect(result.riskSignals.every((signal) => signal.evidenceRefs.length > 0)).toBe(true);
    expect(result.approvalRequiredForPayment).toBe(true);
    expect(result.directPaymentAllowed).toBe(false);
    expect(result.directFinancePostingAllowed).toBe(false);
    expect(result.mutationCount).toBe(0);
  });
});
