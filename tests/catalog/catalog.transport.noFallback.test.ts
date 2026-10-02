const mockCallCatalogTransportBffRead = jest.fn();
const mockLoadCatalogGroupsRowsFromSupabase = jest.fn();
const mockLoadCatalogItemsSearchPreviewRowsFromSupabase = jest.fn();
const mockLoadCatalogSearchFallbackRowsFromSupabase = jest.fn();
const mockLoadIncomingItemRowsFromSupabase = jest.fn();
const mockLoadRikQuickSearchFallbackRowsFromSupabase = jest.fn();
const mockRunCatalogSearchRpcRawFromSupabase = jest.fn();
const mockRunSuppliersListRpcFromSupabase = jest.fn();

jest.mock("../../src/lib/catalog/catalog.bff.client", () => ({
  callCatalogTransportBffRead: (...args: unknown[]) =>
    mockCallCatalogTransportBffRead(...args),
}));

jest.mock("../../src/lib/catalog/catalog.transport.supabase", () => ({
  loadCatalogGroupsRowsFromSupabase: (...args: unknown[]) =>
    mockLoadCatalogGroupsRowsFromSupabase(...args),
  loadCatalogItemsSearchPreviewRowsFromSupabase: (...args: unknown[]) =>
    mockLoadCatalogItemsSearchPreviewRowsFromSupabase(...args),
  loadCatalogSearchFallbackRowsFromSupabase: (...args: unknown[]) =>
    mockLoadCatalogSearchFallbackRowsFromSupabase(...args),
  loadContractorCounterpartyRowsFromSupabase: jest.fn(),
  loadContractorProfileRowsFromSupabase: jest.fn(),
  loadIncomingItemRowsFromSupabase: (...args: unknown[]) =>
    mockLoadIncomingItemRowsFromSupabase(...args),
  loadRikQuickSearchFallbackRowsFromSupabase: (...args: unknown[]) =>
    mockLoadRikQuickSearchFallbackRowsFromSupabase(...args),
  loadSubcontractCounterpartyRowsFromSupabase: jest.fn(),
  loadSupplierCounterpartyRowsFromSupabase: jest.fn(),
  loadSuppliersTableRowsFromSupabase: jest.fn(),
  loadUomRowsFromSupabase: jest.fn(),
  runCatalogSearchRpcRawFromSupabase: (...args: unknown[]) =>
    mockRunCatalogSearchRpcRawFromSupabase(...args),
  runSuppliersListRpcFromSupabase: (...args: unknown[]) =>
    mockRunSuppliersListRpcFromSupabase(...args),
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

describe("canonical catalog transport availability policy", () => {
  beforeEach(() => {
    mockCallCatalogTransportBffRead.mockReset();
    for (const mock of [
      mockLoadCatalogGroupsRowsFromSupabase,
      mockLoadCatalogItemsSearchPreviewRowsFromSupabase,
      mockLoadCatalogSearchFallbackRowsFromSupabase,
      mockLoadIncomingItemRowsFromSupabase,
      mockLoadRikQuickSearchFallbackRowsFromSupabase,
      mockRunCatalogSearchRpcRawFromSupabase,
      mockRunSuppliersListRpcFromSupabase,
    ]) {
      mock.mockReset();
      mock.mockResolvedValue({ data: [], error: null });
    }
  });

  it("uses the bounded Supabase RLS adapter when the not-yet-live BFF is unavailable", async () => {
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
    expect(
      results.every(
        (result) => Array.isArray(result.data) && result.data.length === 0 && result.error === null,
      ),
    ).toBe(true);
    expect(mockCallCatalogTransportBffRead).toHaveBeenCalledTimes(7);
    expect(mockLoadCatalogGroupsRowsFromSupabase).toHaveBeenCalledTimes(1);
    expect(mockLoadCatalogItemsSearchPreviewRowsFromSupabase).toHaveBeenCalledWith(
      "cement",
      "material",
      250,
    );
    expect(mockLoadCatalogSearchFallbackRowsFromSupabase).toHaveBeenCalledWith(
      "cement",
      ["cement"],
      250,
    );
    expect(mockLoadRikQuickSearchFallbackRowsFromSupabase).toHaveBeenCalledWith(
      "cement",
      ["cement"],
      250,
    );
    expect(mockLoadIncomingItemRowsFromSupabase).toHaveBeenCalledWith("incoming-1");
    expect(mockRunCatalogSearchRpcRawFromSupabase).toHaveBeenCalledWith("rik_quick_ru", {
      p_q: "cement",
      p_limit: 20,
      p_apps: null,
    });
    expect(mockRunSuppliersListRpcFromSupabase).toHaveBeenCalledWith("cement");
  });

  it("does not bypass a canonical BFF application error", async () => {
    mockCallCatalogTransportBffRead.mockResolvedValue({
      status: "error",
      error: { code: "CATALOG_READ_DENIED", message: "catalog read denied" },
    });

    await expect(loadCatalogGroupsRows()).resolves.toEqual({
      data: null,
      error: { message: "catalog read denied" },
    });
    expect(mockLoadCatalogGroupsRowsFromSupabase).not.toHaveBeenCalled();
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

  it("keeps direct database calls isolated in one bounded compatibility adapter", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/catalog/catalog.transport.ts"),
      "utf8",
    );
    expect(source).toContain("catalog.transport.supabase");
    expect(source).not.toMatch(/supabase\.(from|rpc)\(/);
    expect(
      fs.existsSync(
        path.join(process.cwd(), "src/lib/catalog/catalog.transport.supabase.ts"),
      ),
    ).toBe(true);
  });
});
