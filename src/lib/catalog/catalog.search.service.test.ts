import { recordCatalogWarning } from "./catalog.observability";
import { loadRikQuickSearchFallbackRows, runCatalogSearchRpcRaw } from "./catalog.transport";
import { rikQuickSearch } from "./catalog.search.service";

jest.mock("./catalog.transport", () => ({
  RIK_QUICK_SEARCH_RPCS: ["rik_quick_ru", "rik_quick_search_typed", "rik_quick_search"],
  runCatalogSearchRpcRaw: jest.fn(),
  loadRikQuickSearchFallbackRows: jest.fn(),
  loadCatalogSearchFallbackRows: jest.fn(),
  loadCatalogGroupsRows: jest.fn(),
  loadIncomingItemRows: jest.fn(),
  loadUomRows: jest.fn(),
}));

jest.mock("./catalog.observability", () => ({
  recordCatalogWarning: jest.fn(),
}));

const mockRunCatalogSearchRpcRaw = runCatalogSearchRpcRaw as jest.Mock;
const mockLoadRikQuickSearchFallbackRows = loadRikQuickSearchFallbackRows as jest.Mock;
const mockRecordCatalogWarning = recordCatalogWarning as jest.Mock;

describe("catalog.search.service rikQuickSearch", () => {
  beforeEach(() => {
    mockRunCatalogSearchRpcRaw.mockReset();
    mockLoadRikQuickSearchFallbackRows.mockReset();
    mockRecordCatalogWarning.mockReset();
  });

  it("passes apps into the canonical rpc chain and returns the first non-empty rpc payload", async () => {
    mockRunCatalogSearchRpcRaw.mockResolvedValueOnce({
      data: [
        {
          rik_code: "RIK-001",
          name_human: "Арматура",
          uom_code: "шт",
          kind: "material",
        },
      ],
      error: null,
    });

    const result = await rikQuickSearch("арматура", 120, ["app-a", "app-b"]);

    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledTimes(1);
    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledWith("rik_quick_ru", {
      p_q: "арматура",
      p_limit: 100,
      p_apps: ["app-a", "app-b"],
    });
    expect(result).toEqual([
      {
        rik_code: "RIK-001",
        name_human: "Арматура",
        name_human_ru: "Арматура",
        uom_code: "шт",
        kind: "material",
        apps: null,
      },
    ]);
  });

  it("keeps one-character compatibility and falls back when rpc chain is empty", async () => {
    mockRunCatalogSearchRpcRaw
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockLoadRikQuickSearchFallbackRows.mockResolvedValue({
      data: [
        {
          rik_code: "A-1",
          name_human: "А",
          name_human_ru: "А",
          uom_code: "шт",
          kind: "material",
        },
      ],
      error: null,
    });

    const result = await rikQuickSearch("а", 5);

    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledTimes(3);
    expect(mockLoadRikQuickSearchFallbackRows).toHaveBeenCalledWith("а", [], 5);
    expect(result).toEqual([
      {
        rik_code: "A-1",
        name_human: "А",
        name_human_ru: "А",
        uom_code: "шт",
        kind: "material",
        apps: null,
      },
    ]);
  });

  it("returns empty for blank query without hitting transport", async () => {
    const result = await rikQuickSearch("   ", 5);

    expect(result).toEqual([]);
    expect(mockRunCatalogSearchRpcRaw).not.toHaveBeenCalled();
    expect(mockLoadRikQuickSearchFallbackRows).not.toHaveBeenCalled();
    expect(mockRecordCatalogWarning).not.toHaveBeenCalled();
  });
});
