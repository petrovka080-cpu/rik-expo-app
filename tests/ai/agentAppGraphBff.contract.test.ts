import {
  AGENT_APP_GRAPH_BFF_CONTRACT,
  AGENT_BFF_ROUTE_DEFINITIONS,
  compareAgentIntel,
  getAgentAppGraphAction,
  getAgentAppGraphScreen,
  resolveAgentAppGraph,
} from "../../src/features/ai/agent/agentBffRouteShell";

const buyerAuth = { userId: "buyer-user", role: "buyer" } as const;
const accountantAuth = { userId: "accountant-user", role: "accountant" } as const;

describe("agent app graph BFF contracts", () => {
  it("exposes read-only app graph and intel compare routes", () => {
    expect(AGENT_APP_GRAPH_BFF_CONTRACT).toEqual(
      expect.objectContaining({
        contractId: "agent_app_graph_bff_v1",
        readOnly: true,
        roleScoped: true,
        evidenceBacked: true,
        mutationCount: 0,
        directDatabaseAccess: 0,
        modelProviderImports: 0,
        externalLiveFetchEnabled: false,
        executionEnabled: false,
      }),
    );
    expect(AGENT_BFF_ROUTE_DEFINITIONS.map((route) => route.endpoint)).toEqual(
      expect.arrayContaining([
        "GET /agent/app-graph/screen/:screenId",
        "GET /agent/app-graph/action/:buttonId",
        "POST /agent/app-graph/resolve",
        "POST /agent/intel/compare",
      ]),
    );
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.mutates === false)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.callsModelProvider === false)).toBe(true);
    expect(AGENT_BFF_ROUTE_DEFINITIONS.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
  });

  it("returns role-scoped screen and action metadata without executing anything", () => {
    expect(getAgentAppGraphScreen({ auth: buyerAuth, screenId: "buyer.main" })).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/app-graph/screen/:screenId",
        roleScoped: true,
        evidenceBacked: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
    expect(
      getAgentAppGraphAction({
        auth: buyerAuth,
        screenId: "buyer.main",
        buttonId: "buyer.rfq.open",
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "GET /agent/app-graph/action/:buttonId",
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
      },
    });
  });

  it("blocks cross-role actions and direct forbidden execution", () => {
    expect(
      resolveAgentAppGraph({
        auth: accountantAuth,
        screenId: "buyer.main",
        buttonId: "buyer.rfq.open",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_APP_GRAPH_ACTION_BLOCKED" },
    });
    expect(
      resolveAgentAppGraph({
        auth: buyerAuth,
        screenId: "buyer.main",
        buttonId: "buyer.confirm_supplier.direct",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "AGENT_APP_GRAPH_ACTION_BLOCKED" },
    });
  });

  it("compares intel internal-first and never enables external live fetch or final mutation", () => {
    expect(
      compareAgentIntel({
        auth: buyerAuth,
        input: {
          domain: "procurement",
          internalEvidenceRefs: ["internal:request:1"],
          query: "cement supplier options",
          sourcePolicyIds: ["supplier_public_catalog.default"],
        },
      }),
    ).toMatchObject({
      ok: true,
      data: {
        endpoint: "POST /agent/intel/compare",
        roleScoped: true,
        readOnly: true,
        mutationCount: 0,
        providerCalled: false,
        dbAccessedDirectly: false,
        result: {
          evidenceRefs: ["internal:request:1"],
          citations: [],
          nextAction: "draft",
          mutationCount: 0,
          providerCalled: false,
          externalLiveFetchEnabled: false,
        },
      },
    });
  });
});
