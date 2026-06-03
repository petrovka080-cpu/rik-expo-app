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

const ARMATURE = "\u0430\u0440\u043c\u0430\u0442\u0443\u0440\u0430";
const ARMATURE_TITLE = "\u0410\u0440\u043c\u0430\u0442\u0443\u0440\u0430";
const BETON = "\u0431\u0435\u0442\u043e\u043d";
const MOJIBAKE_BETON = "\u0420\u00b1\u0420\u00b5\u0421\u201a\u0420\u0455\u0420\u0405";
const SHT = "\u0448\u0442";

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
          name_human: ARMATURE_TITLE,
          uom_code: SHT,
          kind: "material",
        },
      ],
      error: null,
    });

    const result = await rikQuickSearch(ARMATURE, 120, ["app-a", "app-b"]);

    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledTimes(1);
    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledWith("rik_quick_ru", {
      p_q: ARMATURE,
      p_limit: 100,
      p_apps: ["app-a", "app-b"],
    });
    expect(result).toEqual([
      {
        rik_code: "RIK-001",
        name_human: ARMATURE_TITLE,
        name_human_ru: ARMATURE_TITLE,
        uom_code: SHT,
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
          name_human: "\u0410",
          name_human_ru: "\u0410",
          uom_code: SHT,
          kind: "material",
        },
      ],
      error: null,
    });

    const result = await rikQuickSearch("\u0430", 5);

    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledTimes(3);
    expect(mockLoadRikQuickSearchFallbackRows).toHaveBeenCalledWith("\u0430", [], 5);
    expect(result).toEqual([
      {
        rik_code: "A-1",
        name_human: "\u0410",
        name_human_ru: "\u0410",
        uom_code: SHT,
        kind: "material",
        apps: null,
      },
    ]);
  });

  it("repairs legacy mojibake query text before RPC and fallback search", async () => {
    mockRunCatalogSearchRpcRaw
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    mockLoadRikQuickSearchFallbackRows.mockResolvedValue({
      data: [],
      error: null,
    });

    await rikQuickSearch(MOJIBAKE_BETON, 5);

    expect(mockRunCatalogSearchRpcRaw).toHaveBeenCalledWith("rik_quick_ru", {
      p_q: BETON,
      p_limit: 5,
      p_apps: null,
    });
    expect(mockLoadRikQuickSearchFallbackRows).toHaveBeenCalledWith(BETON, [BETON], 5);
  });

  it("returns empty for blank query without hitting transport", async () => {
    const result = await rikQuickSearch("   ", 5);

    expect(result).toEqual([]);
    expect(mockRunCatalogSearchRpcRaw).not.toHaveBeenCalled();
    expect(mockLoadRikQuickSearchFallbackRows).not.toHaveBeenCalled();
    expect(mockRecordCatalogWarning).not.toHaveBeenCalled();
  });
});
