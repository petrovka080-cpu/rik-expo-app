import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";
import { resolveAiFinanceEvidence } from "../../src/features/ai/finance/aiFinanceEvidenceResolver";
import {
  AI_PAYMENT_DRAFT_RATIONALE_CONTRACT,
  buildAiPaymentDraftRationale,
} from "../../src/features/ai/finance/aiPaymentDraftRationale";
import { classifyAiPaymentRisk } from "../../src/features/ai/finance/aiPaymentRiskClassifier";

const financeSummary: GetFinanceSummaryToolOutput = {
  totals: { payable: 180000, paid: 60000, debt: 120000, overdue: 30000, currency: "KGS" },
  debt_buckets: { current: 90000, overdue: 30000, critical: 0 },
  overdue_count: 1,
  document_gaps: ["invoice_missing"],
  risk_flags: ["debt_present", "overdue_debt_present", "document_gap_present"],
  redacted_breakdown: {
    scope: "company",
    supplier_count: 2,
    document_count: 5,
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

describe("AI payment draft rationale", () => {
  it("plans draft-only payment rationale with approval expectation and no final finance mutation", async () => {
    const auth = { userId: "accountant", role: "accountant" } as const;
    const evidence = await resolveAiFinanceEvidence({
      auth,
      screenId: "accountant.payment",
      input: { financeSummary },
    });
    const risk = classifyAiPaymentRisk(evidence);
    const result = await buildAiPaymentDraftRationale({ auth, evidence, risk });

    expect(AI_PAYMENT_DRAFT_RATIONALE_CONTRACT).toMatchObject({
      draftOnly: true,
      approvalCandidateExpected: true,
      directExecutionAllowed: false,
      paymentExecutionAllowed: false,
      financePostingAllowed: false,
      ledgerBypassAllowed: false,
      mutationCount: 0,
      fakeDraftCreated: false,
    });
    expect(result.status).toBe("planned");
    expect(result.rationaleItems.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["explain_finance_summary", "draft_payment_rationale"]),
    );
    expect(result.rationaleItems.every((item) => item.evidenceRefs.length > 0)).toBe(true);
    expect(result.draftOnly).toBe(true);
    expect(result.approvalCandidateExpected).toBe(true);
    expect(result.paymentExecutionAllowed).toBe(false);
    expect(result.financePostingAllowed).toBe(false);
    expect(result.ledgerBypassAllowed).toBe(false);
    expect(result.mutationCount).toBe(0);
  });

  it("does not fabricate an auth context for payment rationale drafts", async () => {
    const auth = { userId: "accountant", role: "accountant" } as const;
    const evidence = await resolveAiFinanceEvidence({
      auth,
      screenId: "accountant.history",
      input: { financeSummary },
    });
    const risk = classifyAiPaymentRisk(evidence);
    const result = await buildAiPaymentDraftRationale({ auth: null, evidence, risk });

    expect(result).toMatchObject({
      status: "blocked",
      fakeDraftCreated: false,
      paymentExecutionAllowed: false,
      mutationCount: 0,
    });
    expect(result.exactReason).toContain("original authenticated role context");
  });
});
