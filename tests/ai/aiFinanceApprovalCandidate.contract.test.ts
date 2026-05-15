import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";
import {
  AI_FINANCE_APPROVAL_CANDIDATE_CONTRACT,
  buildAiFinanceApprovalCandidate,
} from "../../src/features/ai/finance/aiFinanceApprovalCandidate";
import { resolveAiFinanceEvidence } from "../../src/features/ai/finance/aiFinanceEvidenceResolver";
import { buildAiPaymentDraftRationale } from "../../src/features/ai/finance/aiPaymentDraftRationale";
import { classifyAiPaymentRisk } from "../../src/features/ai/finance/aiPaymentRiskClassifier";

const financeSummary: GetFinanceSummaryToolOutput = {
  totals: { payable: 160000, paid: 40000, debt: 120000, overdue: 30000, currency: "KGS" },
  debt_buckets: { current: 90000, overdue: 30000, critical: 10000 },
  overdue_count: 1,
  document_gaps: ["invoice_missing"],
  risk_flags: ["debt_present", "overdue_debt_present", "document_gap_present"],
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

describe("AI finance approval candidate", () => {
  it("routes payment candidates through the approval ledger with redacted payload only", async () => {
    const auth = { userId: "accountant", role: "accountant" } as const;
    const evidence = await resolveAiFinanceEvidence({
      auth,
      screenId: "accountant.payment",
      input: { financeSummary },
    });
    const risk = classifyAiPaymentRisk(evidence);
    const draft = await buildAiPaymentDraftRationale({ auth, evidence, risk });
    const result = buildAiFinanceApprovalCandidate({ auth, evidence, risk, draft });

    expect(AI_FINANCE_APPROVAL_CANDIDATE_CONTRACT).toMatchObject({
      approvalRequired: true,
      executeOnlyAfterApprovedStatus: true,
      directExecuteAllowed: false,
      redactedPayloadOnly: true,
      paymentExecutionAllowed: false,
      financePostingAllowed: false,
      ledgerBypassAllowed: false,
      dbWrites: 0,
      finalExecution: 0,
      mutationCount: 0,
    });
    expect(result.status).toBe("ready");
    expect(result.actionId).toBe("accountant.payment.approval");
    expect(result.route?.actionType).toBe("change_payment_status");
    expect(result.redactedPayload).toMatchObject({
      paymentRequested: false,
      financePostingRequested: false,
      invoiceMutationRequested: false,
    });
    expect(result.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.finalExecution).toBe(0);
  });
});
