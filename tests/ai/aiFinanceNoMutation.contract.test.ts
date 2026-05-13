import fs from "node:fs";
import path from "node:path";

import {
  AGENT_FINANCE_COPILOT_BFF_CONTRACT,
  draftAgentFinanceSummary,
  getAgentFinanceDebts,
  getAgentFinanceSummary,
  previewAgentFinanceRisk,
} from "../../src/features/ai/agent/agentFinanceCopilotRoutes";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";
import type { GetFinanceSummaryToolOutput } from "../../src/features/ai/tools/getFinanceSummaryTool";

const auth = { userId: "accountant", role: "accountant" as const };

const financeSummary: GetFinanceSummaryToolOutput = {
  totals: { payable: 100000, paid: 30000, debt: 70000, overdue: 25000, currency: "KGS" },
  debt_buckets: { current: 45000, overdue: 25000, critical: 0 },
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

describe("AI finance copilot no-mutation BFF routes", () => {
  it("mounts finance copilot BFF routes as auth-required read-only contracts", () => {
    expect(AGENT_FINANCE_COPILOT_BFF_CONTRACT).toMatchObject({
      backendFirst: true,
      roleScoped: true,
      mutationCount: 0,
      dbWrites: 0,
      directSupabaseFromUi: false,
      paymentCreated: false,
      postingCreated: false,
      invoiceMutated: false,
      fakeFinanceCards: false,
    });

    const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.finance."),
    );
    expect(routes.map((route) => route.endpoint)).toEqual([
      "GET /agent/finance/summary",
      "GET /agent/finance/debts",
      "POST /agent/finance/risk-preview",
      "POST /agent/finance/draft-summary",
    ]);
    expect(routes.every((route) => route.authRequired && route.mutates === false)).toBe(true);
    expect(routes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
    expect(routes.every((route) => route.callsModelProvider === false)).toBe(true);
  });

  it("serves summary, debt, risk preview, and draft summary without final execution", async () => {
    const input = { financeSummary, scope: "company" as const };
    const summary = await getAgentFinanceSummary({ auth, input });
    const debts = await getAgentFinanceDebts({ auth, input });
    const risk = await previewAgentFinanceRisk({ auth, input });
    const draft = await draftAgentFinanceSummary({ auth, input });

    expect(summary.ok).toBe(true);
    expect(debts.ok).toBe(true);
    expect(risk.ok).toBe(true);
    expect(draft.ok).toBe(true);
    if (
      !summary.ok ||
      !debts.ok ||
      !risk.ok ||
      !draft.ok ||
      draft.data.documentType !== "agent_finance_draft_summary"
    ) return;

    expect(summary.data.mutationCount).toBe(0);
    expect(debts.data.paymentCreated).toBe(false);
    expect(risk.data.rawRowsReturned).toBe(false);
    expect(draft.data.finalExecution).toBe(0);
    expect(draft.data.result.status).toBe("draft");
    expect(draft.data.result.evidenceRefs.length).toBeGreaterThan(0);
    expect(draft.data.result.hardcodedAiAnswer).toBe(false);
  });

  it("keeps finance copilot source free of direct database, provider, and payment mutation boundaries", () => {
    const projectRoot = process.cwd();
    const files = [
      "src/features/ai/finance/aiFinanceRiskEngine.ts",
      "src/features/ai/finance/aiFinanceDraftSummary.ts",
      "src/features/ai/agent/agentFinanceCopilotRoutes.ts",
    ];
    const source = files.map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8")).join("\n");

    expect(source).not.toMatch(/@supabase\/supabase-js|\bsupabase\b|\bauth\.admin\b|\blistUsers\b|\bservice_role\b/i);
    expect(source).not.toMatch(/\.(?:from|rpc|insert|update|delete|upsert)\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(|openai|gpt-|gemini|AiModelGateway|assistantClient/i);
    expect(source).not.toMatch(/payment_created:\s*true|posting_created:\s*true|invoice_mutated:\s*true/i);
  });
});
