jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

import { callCatalogTransportBffRead } from "../../src/lib/catalog/catalog.bff.client";
import {
  handleCatalogTransportBffReadScope,
  type CatalogTransportBffReadPort,
} from "../../src/lib/catalog/catalog.bff.handler";
import type { CatalogTransportBffReadResultDto } from "../../src/lib/catalog/catalog.bff.contract";

const createPort = (): CatalogTransportBffReadPort => ({
  runCatalogTransportRead: jest.fn(async (input): Promise<CatalogTransportBffReadResultDto> => ({
    data: [{ row: input.operation }],
    error: null,
  })),
});

describe("catalog transport BFF handler contract", () => {
  it("returns typed read envelopes for list, preview, and RPC operations", async () => {
    const port = createPort();

    const list = await handleCatalogTransportBffReadScope(port, {
      operation: "catalog.supplier_counterparty.list",
      args: { searchTerm: "cement" },
    });
    const rpc = await handleCatalogTransportBffReadScope(port, {
      operation: "catalog.search.rpc",
      args: {
        fn: "rik_quick_search_typed",
        args: { p_q: "cement", p_limit: 20, p_apps: ["market"] },
      },
    });
    const preview = await handleCatalogTransportBffReadScope(port, {
      operation: "catalog.rik_quick_search.fallback",
      args: { searchTerm: "cement", tokens: ["cement"], limit: 20 },
    });
    const catalogItemsPreview = await handleCatalogTransportBffReadScope(port, {
      operation: "catalog.items.search.preview",
      args: { searchTerm: "cement", kind: "material", pageSize: 60 },
    });

    expect(list.ok).toBe(true);
    expect(rpc.ok).toBe(true);
    expect(preview.ok).toBe(true);
    expect(catalogItemsPreview.ok).toBe(true);
    if (list.ok) {
      expect(list.data).toEqual(
        expect.objectContaining({
          contractId: "catalog_transport_read_scope_v1",
          operation: "catalog.supplier_counterparty.list",
          result: { data: [{ row: "catalog.supplier_counterparty.list" }], error: null },
        }),
      );
    }
  });

  it("redacts invalid and upstream failures without raw error leakage", async () => {
    const invalid = await handleCatalogTransportBffReadScope(createPort(), {
      operation: "catalog.unknown",
      args: {},
    });
    expect(invalid).toEqual({
      ok: false,
      error: {
        code: "CATALOG_TRANSPORT_BFF_INVALID_OPERATION",
        message: "Invalid catalog transport read operation",
      },
    });

    const failingPort: CatalogTransportBffReadPort = {
      async runCatalogTransportRead() {
        throw new Error("token=secretvalue user@example.test raw-row");
      },
    };
    const failed = await handleCatalogTransportBffReadScope(failingPort, {
      operation: "catalog.groups.list",
      args: {},
    });
    expect(failed).toEqual({
      ok: false,
      error: {
        code: "CATALOG_TRANSPORT_BFF_UPSTREAM_ERROR",
        message: "Catalog transport read upstream failed",
      },
    });
    expect(JSON.stringify(failed)).not.toContain("secretvalue");
    expect(JSON.stringify(failed)).not.toContain("user@example.test");
  });

  it("keeps mobile traffic contract-only when readonly traffic percent is zero", async () => {
    const fetchImpl = jest.fn();
    const getAccessToken = jest.fn(async () => "mobile-session-token");

    await expect(
      callCatalogTransportBffRead(
        {
          operation: "catalog.groups.list",
          args: {},
        },
        {
          config: {
            enabled: true,
            baseUrl: "https://gox-build-staging-bff.onrender.com",
            readOnly: true,
            runtimeEnvironment: "staging",
            trafficPercent: 0,
            mutationRoutesEnabled: false,
            productionGuard: true,
          },
          getAccessToken,
          fetchImpl,
        },
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "BFF_CONTRACT_ONLY",
    });

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the approved readonly route for staging calls", async () => {
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        ok: true,
        data: {
          contractId: "catalog_transport_read_scope_v1",
          documentType: "catalog_transport_read_scope",
          operation: "catalog.groups.list",
          source: "bff:catalog_transport_read_scope_v1",
          result: { data: [{ row: "redacted" }], error: null },
        },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      callCatalogTransportBffRead(
        {
          operation: "catalog.groups.list",
          args: {},
        },
        {
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
        },
      ),
    ).resolves.toEqual({
      status: "ok",
      response: expect.objectContaining({
        operation: "catalog.groups.list",
      }),
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://gox-build-staging-bff.onrender.com/api/staging-bff/read/catalog-transport-read-scope",
    );
  });
});
