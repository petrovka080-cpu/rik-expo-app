import {
  AGENT_BFF_ROUTE_DEFINITIONS,
  AGENT_BFF_ROUTE_SHELL_CONTRACT,
  type AgentBffRouteShellEnvelope,
  getAgentBffActionStatus,
  listAgentBffTools,
  previewAgentBffTool,
  validateAgentBffTool,
} from "../../src/features/ai/agent/agentBffRouteShell";

const directorAuth = { userId: "director-user", role: "director" } as const;
const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const contractorAuth = { userId: "contractor-user", role: "contractor" } as const;

function readToolNames(envelope: AgentBffRouteShellEnvelope): string[] {
  if (!envelope.ok || envelope.data.operation !== "agent.tools.list") {
    throw new Error("expected agent tools list envelope");
  }

  return envelope.data.tools.map((tool) => tool.name);
}

describe("agent BFF route shell", () => {
  it("defines the four agent endpoints as auth-required no-execution routes", () => {
    expect(AGENT_BFF_ROUTE_SHELL_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "agent_bff_route_shell_v1",
        readOnly: true,
        trafficEnabledByDefault: false,
        productionTrafficEnabled: false,
        authRequired: true,
        roleFilteredTools: true,
        previewMutates: false,
        mutationCount: 0,
        directDatabaseAccess: 0,
        modelProviderImports: 0,
        executionEnabled: false,
        forbiddenToolsHidden: true,
      }),
    );
    expect(AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.endpoint)).toEqual([
      "GET /agent/tools",
      "POST /agent/tools/:name/validate",
      "POST /agent/tools/:name/preview",
      "GET /agent/action/:id/status",
    ]);
    expect(
      AGENT_BFF_ROUTE_DEFINITIONS.every(
        (route) =>
          route.authRequired &&
          route.mutates === false &&
          route.executesTool === false &&
          route.callsModelProvider === false &&
          route.callsDatabaseDirectly === false &&
          route.exposesForbiddenTools === false,
      ),
    ).toBe(true);
  });

  it("requires auth for every route", () => {
    expect(listAgentBffTools({ auth: null })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_AUTH_REQUIRED" },
    });
    expect(validateAgentBffTool({ auth: null, toolName: "search_catalog" })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_AUTH_REQUIRED" },
    });
    expect(previewAgentBffTool({ auth: null, toolName: "search_catalog" })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_AUTH_REQUIRED" },
    });
    expect(getAgentBffActionStatus({ auth: null, actionId: "action-1" })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_AUTH_REQUIRED" },
    });
  });

  it("returns role-filtered tools and hides forbidden tool names", () => {
    const directorTools = listAgentBffTools({ auth: directorAuth });
    const contractorTools = listAgentBffTools({ auth: contractorAuth });

    const directorNames = readToolNames(directorTools);
    const contractorNames = readToolNames(contractorTools);

    expect(directorNames).toContain("get_finance_summary");
    expect(directorNames).toContain("submit_for_approval");
    expect(contractorNames).toContain("draft_act");
    expect(contractorNames).toContain("submit_for_approval");
    expect(contractorNames).not.toContain("get_finance_summary");
    expect(contractorNames).not.toContain("compare_suppliers");
    expect(`${directorNames.join(",")},${contractorNames.join(",")}`).not.toContain("direct_supabase_query");
    expect(`${directorNames.join(",")},${contractorNames.join(",")}`).not.toContain("create_order");
    expect(`${directorNames.join(",")},${contractorNames.join(",")}`).not.toContain("change_payment_status");
  });

  it("validates visible tools through policy without executing them", () => {
    expect(validateAgentBffTool({ auth: buyerAuth, toolName: "search_catalog" })).toMatchObject({
      ok: true,
      data: {
        operation: "agent.tools.validate",
        result: {
          toolName: "search_catalog",
          valid: true,
          mutationCount: 0,
          executed: false,
          plan: {
            allowed: true,
            mode: "read_contract_plan",
            directExecutionEnabled: false,
            mutationAllowed: false,
            providerCallAllowed: false,
            dbAccessAllowed: false,
          },
        },
      },
    });

    expect(validateAgentBffTool({ auth: contractorAuth, toolName: "get_finance_summary" })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_TOOL_NOT_VISIBLE" },
    });
    expect(validateAgentBffTool({ auth: directorAuth, toolName: "direct_supabase_query" })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_TOOL_NOT_VISIBLE" },
    });
  });

  it("previews never mutate, persist, call a provider, or touch a database", () => {
    expect(previewAgentBffTool({ auth: buyerAuth, toolName: "draft_request", input: { title: "draft" } })).toMatchObject({
      ok: true,
      data: {
        operation: "agent.tools.preview",
        result: {
          toolName: "draft_request",
          previewAvailable: true,
          mutationCount: 0,
          executed: false,
          persisted: false,
          providerCalled: false,
          dbAccessed: false,
          previewKind: "schema_only",
          plan: {
            mode: "draft_only_plan",
            mutationAllowed: false,
            providerCallAllowed: false,
            dbAccessAllowed: false,
          },
        },
      },
    });
  });

  it("exposes action status as a shell-only route without lookup side effects", () => {
    expect(getAgentBffActionStatus({ auth: directorAuth, actionId: "action-1" })).toMatchObject({
      ok: true,
      data: {
        operation: "agent.action.status",
        result: {
          actionId: "action-1",
          status: "not_found",
          lookupPerformed: false,
          mutationCount: 0,
          executed: false,
          providerCalled: false,
          dbAccessed: false,
        },
      },
    });
    expect(getAgentBffActionStatus({ auth: directorAuth, actionId: " " })).toMatchObject({
      ok: false,
      error: { code: "AGENT_BFF_INVALID_ACTION_ID" },
    });
  });
});
