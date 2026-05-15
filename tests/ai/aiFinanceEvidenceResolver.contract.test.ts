import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";
import {
  AI_FINANCE_EVIDENCE_RESOLVER_CONTRACT,
  resolveAiFinanceEvidence,
} from "../../src/features/ai/finance/aiFinanceEvidenceResolver";

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

describe("AI finance evidence resolver", () => {
  it("covers accountant and director finance screens with redacted safe-read evidence", async () => {
    const auth = { userId: "accountant", role: "accountant" } as const;

    const results = await Promise.all(
      (["accountant.main", "accountant.payment", "accountant.history"] as const).map((screenId) =>
        resolveAiFinanceEvidence({
          auth,
          screenId,
          input: { financeSummary },
        }),
      ),
    );
    const director = await resolveAiFinanceEvidence({
      auth: { userId: "director", role: "director" },
      screenId: "director.finance",
      input: { financeSummary },
    });

    expect(AI_FINANCE_EVIDENCE_RESOLVER_CONTRACT).toMatchObject({
      safeReadOnly: true,
      draftOnly: true,
      approvalRequiredForPayment: true,
      directPaymentAllowed: false,
      directFinancePostingAllowed: false,
      ledgerBypassAllowed: false,
      mutationCount: 0,
      dbWrites: 0,
      fakeFinanceEvidence: false,
    });
    expect([...results, director].every((result) => result.status === "loaded")).toBe(true);
    expect([...results, director].every((result) => result.coversAccountantMain)).toBe(true);
    expect([...results, director].every((result) => result.coversAccountantPayment)).toBe(true);
    expect([...results, director].every((result) => result.coversAccountantHistory)).toBe(true);
    expect([...results, director].every((result) => result.coversDirectorFinance)).toBe(true);
    expect([...results, director].every((result) => result.evidenceBacked)).toBe(true);
    expect([...results, director].every((result) => result.rawRowsReturned === false)).toBe(true);
    expect([...results, director].every((result) => result.directPaymentAllowed === false)).toBe(true);
    expect([...results, director].every((result) => result.mutationCount === 0)).toBe(true);
  });

  it("blocks unsupported screens without fabricating finance evidence", async () => {
    const result = await resolveAiFinanceEvidence({
      auth: { userId: "accountant", role: "accountant" },
      screenId: "accountant.fake",
      input: { financeSummary },
    });

    expect(result).toMatchObject({
      status: "blocked",
      screenId: "accountant.main",
      fakeFinanceEvidence: false,
      directPaymentAllowed: false,
      mutationCount: 0,
    });
    expect(result.exactReason).toContain("accountant.payment");
  });
});
