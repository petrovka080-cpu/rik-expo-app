import { getAiToolDefinition } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";
import { runGetFinanceSummaryToolSafeRead } from "../../src/features/ai/tools/getFinanceSummaryTool";

describe("get_finance_summary role scope and redaction", () => {
  it("registers only director/control/accountant for finance safe read", () => {
    const tool = getAiToolDefinition("get_finance_summary");

    expect(tool).toMatchObject({
      name: "get_finance_summary",
      domain: "finance",
      riskLevel: "safe_read",
      requiredRoles: ["director", "control", "accountant"],
      approvalRequired: false,
      evidenceRequired: true,
    });
    for (const deniedRole of ["foreman", "buyer", "warehouse", "contractor", "unknown"]) {
      expect(tool?.requiredRoles).not.toContain(deniedRole);
    }
  });

  it("allows finance roles and denies non-finance roles before read", async () => {
    for (const role of ["director", "control", "accountant"] as const) {
      expect(planAiToolUse({ toolName: "get_finance_summary", role })).toMatchObject({
        allowed: true,
        mode: "read_contract_plan",
        mutationAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
      });
    }

    const reads: string[] = [];
    const deniedReader = async () => {
      reads.push("read");
      return { payload: {} };
    };

    for (const role of ["foreman", "buyer", "warehouse", "contractor", "unknown"] as const) {
      expect(planAiToolUse({ toolName: "get_finance_summary", role })).toMatchObject({
        allowed: false,
        mode: "blocked",
      });
      await expect(
        runGetFinanceSummaryToolSafeRead({
          auth: { userId: `${role}-user`, role },
          input: { scope: "company" },
          readFinanceSummary: deniedReader,
        }),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: "GET_FINANCE_SUMMARY_ROLE_NOT_ALLOWED" },
      });
    }
    expect(reads).toEqual([]);
  });

  it("redacts supplier names, bank details, tokens, and full rows while preserving aggregate evidence", async () => {
    const result = await runGetFinanceSummaryToolSafeRead({
      auth: { userId: "control-user", role: "control" },
      input: {
        scope: "supplier",
        entityId: "supplier-1",
        periodStart: "2026-05-01",
        periodEnd: "2026-05-12",
      },
      readFinanceSummary: async ({ input }) => {
        expect(input).toMatchObject({
          scope: "supplier",
          entityId: "supplier-1",
          periodStart: "2026-05-01",
          periodEnd: "2026-05-12",
        });
        return {
          payload: {
            summary: {
              totalPayable: 2000,
              totalPaid: 1500,
              totalDebt: 500,
              overdueAmount: 0,
              supplierCount: 1,
              documentCount: 2,
            },
            suppliers: [
              {
                supplier_name: "Private Supplier",
                bank_account: "PRIVATE_BANK_ACCOUNT",
                access_token: "PRIVATE_TOKEN",
              },
            ],
          },
        };
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        totals: {
          payable: 2000,
          paid: 1500,
          debt: 500,
          overdue: 0,
        },
        debt_buckets: {
          current: 500,
          overdue: 0,
          critical: 0,
        },
        redacted_breakdown: {
          scope: "supplier",
          supplier_count: 1,
          supplier_names_redacted: true,
          bank_details_redacted: true,
          tokens_redacted: true,
          raw_rows_exposed: false,
        },
        evidence_refs: [
          "finance:summary:totals",
          "finance:summary:supplier:scope",
          "finance:summary:supplier_breakdown:redacted",
        ],
        mutation_count: 0,
        payment_mutation: 0,
        status_mutation: 0,
        raw_finance_rows_exposed: false,
      },
    });

    expect(JSON.stringify(result)).not.toContain("Private Supplier");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_BANK_ACCOUNT");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_TOKEN");
  });
});
