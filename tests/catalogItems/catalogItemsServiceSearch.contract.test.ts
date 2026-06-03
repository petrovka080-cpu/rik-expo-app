import { loadCatalogItemsSearchPreviewRows } from "../../src/lib/catalog/catalog.transport";
import { rikQuickSearch } from "../../src/lib/catalog/catalog.search.service";
import {
  mapCatalogPreviewRowToPickerItem,
  searchCatalogItemsForPicker,
} from "../../src/lib/catalog/catalogItemsService";

jest.mock("../../src/lib/catalog/catalog.transport", () => ({
  loadCatalogItemsSearchPreviewRows: jest.fn(),
}));

jest.mock("../../src/lib/catalog/catalog.search.service", () => ({
  rikQuickSearch: jest.fn(),
}));

const mockLoadCatalogItemsSearchPreviewRows = loadCatalogItemsSearchPreviewRows as jest.Mock;
const mockRikQuickSearch = rikQuickSearch as jest.Mock;
const BETON = "\u0431\u0435\u0442\u043e\u043d";
const MOJIBAKE_BETON = "\u0420\u00b1\u0420\u00b5\u0421\u201a\u0420\u0455\u0420\u0405";
const BETON_M300 = "\u0411\u0435\u0442\u043e\u043d \u041c300";

describe("catalog item search service", () => {
  beforeEach(() => {
    mockLoadCatalogItemsSearchPreviewRows.mockReset();
    mockRikQuickSearch.mockReset();
  });

  it("maps catalog_items rows into picker items with catalog item identity", () => {
    const item = mapCatalogPreviewRowToPickerItem({
      id: "cat-1",
      rik_code: "RIK-1",
      name_human: BETON_M300,
      uom_code: "\u043c3",
      kind: "material",
      app_ids: [],
    } as never);
    expect(item).toMatchObject({
      catalogItemId: "cat-1",
      rikCode: "RIK-1",
      name: BETON_M300,
      unit: "m3",
      sourceId: "catalog_items",
      sourceLabel: "catalog_items",
    });
  });

  it("repairs legacy mojibake picker query before catalog_items preview search", async () => {
    mockLoadCatalogItemsSearchPreviewRows.mockResolvedValue({
      data: [
        {
          id: "cat-beton",
          rik_code: "MAT-BETON-M300",
          name_human: BETON_M300,
          uom_code: "\u043c3",
          kind: "material",
        },
      ],
      error: null,
    });

    const rows = await searchCatalogItemsForPicker(MOJIBAKE_BETON, 7);

    expect(mockLoadCatalogItemsSearchPreviewRows).toHaveBeenCalledWith(BETON, "material", 7);
    expect(mockRikQuickSearch).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({
      catalogItemId: "cat-beton",
      rikCode: "MAT-BETON-M300",
      sourceId: "catalog_items",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
  });

  it("uses the same repaired query for the RIK fallback when preview is empty", async () => {
    mockLoadCatalogItemsSearchPreviewRows.mockResolvedValue({
      data: [],
      error: null,
    });
    mockRikQuickSearch.mockResolvedValue([
      {
        rik_code: "MAT-BETON-M300",
        name_human: BETON_M300,
        name_human_ru: BETON_M300,
        uom_code: "\u043c3",
        kind: "material",
        apps: null,
      },
    ]);

    const rows = await searchCatalogItemsForPicker(MOJIBAKE_BETON, 4);

    expect(mockRikQuickSearch).toHaveBeenCalledWith(BETON, 4);
    expect(rows[0]).toMatchObject({
      catalogItemId: "MAT-BETON-M300",
      sourceId: "rik_items",
      availabilityStatus: "unknown",
      stockStatus: "unknown",
    });
  });
});
