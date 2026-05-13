import fs from "fs";
import path from "path";

import {
  GET_FINANCE_SUMMARY_ROUTE_OPERATION,
  runGetFinanceSummaryToolSafeRead,
} from "../../src/features/ai/tools/getFinanceSummaryTool";
import {
  getFinanceSummaryInputSchema,
  getFinanceSummaryOutputSchema,
} from "../../src/features/ai/schemas/aiToolSchemas";

const ROOT = process.cwd();
const sourcePath = path.join(ROOT, "src/features/ai/tools/getFinanceSummaryTool.ts");

const accountantAuth = { userId: "accountant-user", role: "accountant" } as const;
const directorAuth = { userId: "director-user", role: "director" } as const;

describe("get_finance_summary safe-read tool", () => {
  it("keeps the permanent finance summary schema role-safe and redacted", () => {
    expect(getFinanceSummaryInputSchema).toMatchObject({
      required: ["scope"],
      additionalProperties: false,
      properties: {
        scope: expect.objectContaining({ enum: ["company", "project", "supplier"] }),
        entityId: expect.objectContaining({ type: "string", minLength: 1 }),
        periodStart: expect.objectContaining({ type: "string", minLength: 10 }),
        periodEnd: expect.objectContaining({ type: "string", minLength: 10 }),
      },
    });
    expect(getFinanceSummaryOutputSchema).toMatchObject({
      required: [
        "totals",
        "debt_buckets",
        "overdue_count",
        "document_gaps",
        "risk_flags",
        "redacted_breakdown",
        "evidence_refs",
        "route_operation",
        "bounded",
        "mutation_count",
        "payment_mutation",
        "status_mutation",
        "raw_finance_rows_exposed",
      ],
      additionalProperties: false,
      properties: {
        totals: expect.objectContaining({ type: "object" }),
        debt_buckets: expect.objectContaining({ type: "object" }),
        overdue_count: expect.objectContaining({ type: "number" }),
        document_gaps: expect.objectContaining({ type: "array" }),
        risk_flags: expect.objectContaining({ type: "array" }),
        redacted_breakdown: expect.objectContaining({ type: "object" }),
        evidence_refs: expect.objectContaining({ type: "array" }),
        route_operation: expect.objectContaining({ enum: [GET_FINANCE_SUMMARY_ROUTE_OPERATION] }),
      },
    });
    expect(getFinanceSummaryOutputSchema.properties).not.toHaveProperty("raw_rows");
    expect(getFinanceSummaryOutputSchema.properties).not.toHaveProperty("bank_details");
    expect(getFinanceSummaryOutputSchema.properties).not.toHaveProperty("token");
  });

  it("returns aggregates, debt buckets, document gaps, risk flags, and redacted evidence without mutations", async () => {
    const reads: unknown[] = [];
    const result = await runGetFinanceSummaryToolSafeRead({
      auth: accountantAuth,
      input: {
        scope: "company",
        periodStart: "2026-05-01T12:00:00Z",
        periodEnd: "2026-05-12",
      },
      readFinanceSummary: async ({ input }) => {
        reads.push(input);
        return {
          payload: {
            total_amount: 1000,
            total_paid: 450,
            total_debt: 550,
            overdue_amount: 125,
            overdue_count: 2,
            document_count: 4,
            document_gaps: ["missing_invoice"],
            by_supplier: [
              { supplier_id: "supplier-1", supplier_name: "Hidden Supplier", debt: 550 },
            ],
            rows: [
              {
                supplier_name: "Should Not Leak",
                bank_account: "SHOULD_NOT_LEAK",
                access_token: "SHOULD_NOT_LEAK",
              },
            ],
          },
        };
      },
    });

    expect(reads).toEqual([
      {
        scope: "company",
        entityId: null,
        periodStart: "2026-05-01",
        periodEnd: "2026-05-12",
      },
    ]);
    expect(result).toMatchObject({
      ok: true,
      data: {
        totals: {
          payable: 1000,
          paid: 450,
          debt: 550,
          overdue: 125,
          currency: "KGS",
        },
        debt_buckets: {
          current: 425,
          overdue: 125,
          critical: 0,
        },
        overdue_count: 2,
        document_gaps: ["missing_invoice"],
        risk_flags: ["debt_present", "overdue_debt_present", "document_gap_present"],
        redacted_breakdown: {
          scope: "company",
          supplier_count: 1,
          document_count: 4,
          supplier_names_redacted: true,
          bank_details_redacted: true,
          tokens_redacted: true,
          raw_rows_exposed: false,
        },
        evidence_refs: [
          "finance:summary:totals",
          "finance:summary:supplier_breakdown:redacted",
        ],
        route_operation: GET_FINANCE_SUMMARY_ROUTE_OPERATION,
        bounded: true,
        mutation_count: 0,
        payment_mutation: 0,
        status_mutation: 0,
        raw_finance_rows_exposed: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain("Should Not Leak");
    expect(JSON.stringify(result)).not.toContain("SHOULD_NOT_LEAK");
  });

  it("requires auth, visible finance role, and valid scoped input before any finance read", async () => {
    const reads: string[] = [];
    const readFinanceSummary = async () => {
      reads.push("read");
      return { payload: {} };
    };

    await expect(
      runGetFinanceSummaryToolSafeRead({
        auth: null,
        input: { scope: "company" },
        readFinanceSummary,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_FINANCE_SUMMARY_AUTH_REQUIRED" },
    });
    await expect(
      runGetFinanceSummaryToolSafeRead({
        auth: { userId: "buyer-user", role: "buyer" },
        input: { scope: "company" },
        readFinanceSummary,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "GET_FINANCE_SUMMARY_ROLE_NOT_ALLOWED" },
    });
    await expect(
      runGetFinanceSummaryToolSafeRead({
        auth: directorAuth,
        input: { scope: "project" },
        readFinanceSummary,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "GET_FINANCE_SUMMARY_INVALID_INPUT",
        message: "project finance summary requires entityId",
      },
    });
    expect(reads).toEqual([]);
  });

  it("uses the AI finance transport boundary and has no direct database, raw-row output, mutation, or model surface", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain('transport/financeSummary.transport"');
    expect(source).not.toContain('director.finance.bff.client"');
    expect(source).toContain("director.finance.rpc.scope");
    expect(source).not.toMatch(/@supabase|auth\.admin|listUsers|service_role/i);
    expect(source).not.toMatch(/\.(from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/changePayment|change_payment|paymentStatus|statusMutation/i);
    expect(source).not.toMatch(/bank_account|access_token|refresh_token|raw_accounting_rows/i);
    expect(source).not.toMatch(/openai|gpt-|gemini|AiModelGateway|LegacyGeminiModelProvider/i);
  });
});
