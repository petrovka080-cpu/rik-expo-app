const mockCallCatalogTransportBffRead = jest.fn();

jest.mock("../../src/lib/catalog/catalog.bff.client", () => ({
  callCatalogTransportBffRead: (...args: unknown[]) =>
    mockCallCatalogTransportBffRead(...args),
}));

import fs from "node:fs";
import path from "node:path";

import {
  loadCatalogGroupsRows,
  loadCatalogItemsSearchPreviewRows,
  loadCatalogSearchFallbackRows,
  loadIncomingItemRows,
  loadRikQuickSearchFallbackRows,
  runCatalogSearchRpcRaw,
  runSuppliersListRpc,
} from "../../src/lib/catalog/catalog.transport";

describe("canonical catalog transport no-fallback owner", () => {
  beforeEach(() => {
    mockCallCatalogTransportBffRead.mockReset();
  });

  it("fails closed for list, preview, search, RPC, and child reads when BFF is unavailable", async () => {
    mockCallCatalogTransportBffRead.mockResolvedValue({
      status: "unavailable",
      reason: "BFF_NETWORK_ERROR",
    });

    const results = await Promise.all([
      loadCatalogGroupsRows(),
      loadCatalogItemsSearchPreviewRows("cement", "material", 250),
      loadCatalogSearchFallbackRows("cement", ["cement"], 250),
      loadRikQuickSearchFallbackRows("cement", ["cement"], 250),
      loadIncomingItemRows("incoming-1"),
      runCatalogSearchRpcRaw("rik_quick_ru", {
        p_q: "cement",
        p_limit: 20,
        p_apps: null,
      }),
      runSuppliersListRpc("cement"),
    ]);

    expect(results).toHaveLength(7);
    for (const result of results) {
      expect(result.data).toBeNull();
      expect(result.error?.message).toBe(
        "Canonical catalog backend unavailable: BFF_NETWORK_ERROR",
      );
    }
    expect(mockCallCatalogTransportBffRead).toHaveBeenCalledTimes(7);
  });

  it("preserves canonical BFF rows and normalization without a client database owner", async () => {
    mockCallCatalogTransportBffRead.mockResolvedValue({
      status: "ok",
      response: {
        result: {
          data: [
            { code: "grp-1", name: "Materials", parent_code: null },
            { code: null, name: "Malformed", parent_code: null },
          ],
          error: null,
        },
      },
    });

    await expect(loadCatalogGroupsRows()).resolves.toEqual({
      data: [{ code: "grp-1", name: "Materials", parent_code: null }],
      error: null,
    });
    expect(mockCallCatalogTransportBffRead).toHaveBeenCalledWith({
      operation: "catalog.groups.list",
      args: {},
    });
  });

  it("contains no production import or call to the deleted direct Supabase owner", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/catalog/catalog.transport.ts"),
      "utf8",
    );
    expect(source).not.toContain("catalog.transport.supabase");
    expect(source).not.toContain("FromSupabase");
    expect(source).not.toMatch(/supabase\.(from|rpc)\(/);
    expect(
      fs.existsSync(
        path.join(process.cwd(), "src/lib/catalog/catalog.transport.supabase.ts"),
      ),
    ).toBe(false);
  });
});
