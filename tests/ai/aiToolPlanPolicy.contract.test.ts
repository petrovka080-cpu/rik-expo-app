import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";
import { planAiToolUse } from "../../src/features/ai/tools/aiToolPlanPolicy";

describe("AI tool plan policy", () => {
  it("plans every registered safe-read tool without direct execution or mutations", () => {
    for (const toolName of [
      "search_catalog",
      "compare_suppliers",
      "get_warehouse_status",
      "get_finance_summary",
      "get_action_status",
    ] as const) {
      const role =
        toolName === "get_finance_summary"
          ? "accountant"
          : toolName === "get_warehouse_status"
            ? "warehouse"
            : "director";
      const plan = planAiToolUse({ toolName, role });

      expect(plan).toMatchObject({
        allowed: true,
        mode: "read_contract_plan",
        riskLevel: "safe_read",
        directExecutionEnabled: false,
        mutationAllowed: false,
        providerCallAllowed: false,
        dbAccessAllowed: false,
        rawRowsAllowed: false,
        rawPromptStorageAllowed: false,
        evidenceRequired: true,
        blockReason: null,
      });
      expect(plan.readBinding?.toolName).toBe(toolName);
      expect(plan.readBinding?.contracts.length).toBeGreaterThan(0);
    }
  });

  it("plans draft tools as draft-only without persistence or final action execution", () => {
    expect(planAiToolUse({ toolName: "draft_request", role: "buyer" })).toMatchObject({
      allowed: true,
      mode: "draft_only_plan",
      riskLevel: "draft_only",
      capability: "draft",
      approvalRequired: false,
      directExecutionEnabled: false,
      mutationAllowed: false,
      providerCallAllowed: false,
      dbAccessAllowed: false,
      readBinding: null,
    });

    expect(planAiToolUse({ toolName: "draft_act", role: "contractor" })).toMatchObject({
      allowed: true,
      mode: "draft_only_plan",
      riskLevel: "draft_only",
      capability: "draft",
      directExecutionEnabled: false,
      mutationAllowed: false,
    });
  });

  it("plans approval-required tools only as approval-gate requests", () => {
    expect(planAiToolUse({ toolName: "submit_for_approval", role: "foreman" })).toMatchObject({
      allowed: true,
      mode: "approval_gate_plan",
      riskLevel: "approval_required",
      capability: "submit_for_approval",
      approvalRequired: true,
      directExecutionEnabled: false,
      mutationAllowed: false,
      providerCallAllowed: false,
      dbAccessAllowed: false,
      readBinding: null,
    });
  });

  it("blocks unregistered tools and role leakage", () => {
    expect(planAiToolUse({ toolName: "direct_supabase_query", role: "director" })).toMatchObject({
      allowed: false,
      mode: "blocked",
      riskLevel: "forbidden",
      blockReason: "tool_not_registered",
      directExecutionEnabled: false,
      mutationAllowed: false,
    });

    expect(planAiToolUse({ toolName: "get_finance_summary", role: "contractor" })).toMatchObject({
      allowed: false,
      mode: "blocked",
      riskLevel: "safe_read",
      domain: "finance",
      blockReason: "role_not_required_for_tool",
      directExecutionEnabled: false,
      mutationAllowed: false,
    });

    expect(planAiToolUse({ toolName: "search_catalog", role: "unknown" })).toMatchObject({
      allowed: false,
      mode: "blocked",
      blockReason: "role_not_required_for_tool",
    });
  });

  it("keeps every registered tool inside a non-executing planning boundary", () => {
    for (const toolName of AI_TOOL_NAMES) {
      const plan = planAiToolUse({ toolName, role: "director" });
      expect(plan.directExecutionEnabled).toBe(false);
      expect(plan.mutationAllowed).toBe(false);
      expect(plan.providerCallAllowed).toBe(false);
      expect(plan.dbAccessAllowed).toBe(false);
      expect(plan.rawRowsAllowed).toBe(false);
      expect(plan.rawPromptStorageAllowed).toBe(false);
    }
  });
});
