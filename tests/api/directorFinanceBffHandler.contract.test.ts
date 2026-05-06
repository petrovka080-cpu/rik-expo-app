import {
  BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE,
  handleBffStagingServerRequest,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  handleDirectorFinanceBffRpcScope,
  type DirectorFinanceBffRpcPort,
} from "../../src/screens/director/director.finance.bff.handler";
import { callDirectorFinanceBffRpc } from "../../src/screens/director/director.finance.bff.client";

const panelScopeV4Request = {
  operation: "director.finance.panel_scope.v4",
  args: {
    p_object_id: "00000000-0000-0000-0000-000000000001",
    p_date_from: "2026-01-01",
    p_date_to: "2026-01-31",
    p_due_days: 7,
    p_critical_days: 14,
    p_limit: 50,
    p_offset: 0,
  },
} as const;

const payload = {
  document_type: "director_finance_panel_scope",
  version: "v4",
  canonical: {
    summary: {},
    suppliers: [],
    objects: [],
    spend: {},
  },
  rows: [],
  pagination: {
    limit: 50,
    offset: 0,
    total: 0,
  },
};

const createPort = (): jest.Mocked<DirectorFinanceBffRpcPort> => ({
  runDirectorFinanceRpc: jest.fn(async (_input) => payload) as jest.MockedFunction<
    DirectorFinanceBffRpcPort["runDirectorFinanceRpc"]
  >,
});

describe("director finance BFF RPC handler", () => {
  it("routes the permanent read-RPC path through a typed BFF port", async () => {
    const port = createPort();
    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/read/director-finance-rpc-scope",
        body: { input: panelScopeV4Request, metadata: {} },
      },
      { directorFinanceRpcPort: port },
    );

    expect(BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE).toEqual(
      expect.objectContaining({
        operation: "director.finance.rpc.scope",
        kind: "read_rpc",
        method: "POST",
        path: "/api/staging-bff/read/director-finance-rpc-scope",
        enabledByDefault: true,
      }),
    );
    expect(response).toEqual(
      expect.objectContaining({
        status: 200,
        body: {
          ok: true,
          data: expect.objectContaining({
            contractId: "director_finance_rpc_scope_v1",
            documentType: "director_finance_rpc_scope",
            operation: "director.finance.panel_scope.v4",
            rpcName: "director_finance_panel_scope_v4",
            payload,
            source: "bff:director_finance_rpc_scope_v1",
          }),
          serverTiming: { cacheHit: false },
        },
      }),
    );
    expect(port.runDirectorFinanceRpc).toHaveBeenCalledWith(panelScopeV4Request);
    expect(JSON.stringify(response)).not.toContain("00000000-0000-0000-0000-000000000001");
  });

  it("returns redacted error envelopes without raw upstream details", async () => {
    const port: DirectorFinanceBffRpcPort = {
      runDirectorFinanceRpc: jest.fn(async () => {
        throw new Error("failed token=unsafe person@example.test");
      }),
    };

    const response = await handleDirectorFinanceBffRpcScope(port, panelScopeV4Request);

    expect(response).toEqual({
      ok: false,
      error: {
        code: "DIRECTOR_FINANCE_BFF_UPSTREAM_ERROR",
        message: "Director finance RPC upstream failed",
      },
    });
    expect(JSON.stringify(response)).not.toContain("unsafe");
    expect(JSON.stringify(response)).not.toContain("person@example.test");
  });

  it("keeps mobile traffic contract-only unless readonly BFF traffic is explicitly allowed", async () => {
    const fetchImpl = jest.fn();
    const result = await callDirectorFinanceBffRpc(panelScopeV4Request, {
      config: {
        enabled: true,
        baseUrl: "https://gox-build-staging-bff.onrender.com",
        readOnly: true,
        runtimeEnvironment: "staging",
        trafficPercent: 0,
        mutationRoutesEnabled: false,
        productionGuard: true,
      },
      getAccessToken: async () => "redacted-token",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "unavailable",
      reason: "BFF_CONTRACT_ONLY",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the director finance read-RPC route for approved readonly BFF calls", async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        ok: true,
        data: {
          contractId: "director_finance_rpc_scope_v1",
          documentType: "director_finance_rpc_scope",
          operation: "director.finance.panel_scope.v4",
          rpcName: "director_finance_panel_scope_v4",
          payload,
          source: "bff:director_finance_rpc_scope_v1",
        },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      callDirectorFinanceBffRpc(panelScopeV4Request, {
        config: {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com/ignored",
          readOnly: true,
          runtimeEnvironment: "staging",
          trafficPercent: 1,
          mutationRoutesEnabled: false,
          productionGuard: true,
        },
        getAccessToken: async () => "mobile-session-token",
        fetchImpl,
      }),
    ).resolves.toEqual({
      status: "ok",
      payload,
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://gox-build-staging-bff.onrender.com/api/staging-bff/read/director-finance-rpc-scope",
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          input: panelScopeV4Request,
          metadata: {
            mobileAuth: "supabase_user_jwt_present_redacted",
          },
        }),
      }),
    );
  });
});
