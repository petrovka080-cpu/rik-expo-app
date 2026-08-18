const mockLoadCatalogItemsSearchPreviewRows = jest.fn();
const mockRikQuickSearch = jest.fn();

jest.mock("../../src/lib/catalog/catalog.transport", () => ({
  loadCatalogItemsSearchPreviewRows: (...args: unknown[]) =>
    mockLoadCatalogItemsSearchPreviewRows(...args),
}));

jest.mock("../../src/lib/catalog/catalog.search.service", () => ({
  rikQuickSearch: (...args: unknown[]) => mockRikQuickSearch(...args),
}));

import { searchCatalogItemsForPicker } from "../../src/lib/catalog/catalogItemsService";

describe("estimate catalog aggregate search", () => {
  beforeEach(() => {
    mockLoadCatalogItemsSearchPreviewRows.mockReset();
    mockRikQuickSearch.mockReset();
  });

  it("searches materials, works and services and deduplicates the merged result", async () => {
    mockLoadCatalogItemsSearchPreviewRows.mockResolvedValue({
      data: [
        { id: "material-1", rik_code: "RIK-1", kind: "material", name_human: "Щебень", uom_code: "m3" },
        { id: "work-1", rik_code: "RIK-2", kind: "work", name_human: "Укладка щебня", uom_code: "m3" },
      ],
      error: null,
    });
    mockRikQuickSearch.mockResolvedValue([
      { rik_code: "RIK-1", kind: "material", name_human: "Дубликат щебня", name_human_ru: null, uom_code: "m3" },
      { rik_code: "RIK-3", kind: "service", name_human: "Доставка", name_human_ru: null, uom_code: "trip" },
    ]);

    const result = await searchCatalogItemsForPicker("щебень", 40);

    expect(mockLoadCatalogItemsSearchPreviewRows).toHaveBeenCalledWith("щебень", "all", 40);
    expect(mockRikQuickSearch).toHaveBeenCalledWith("щебень", 40);
    expect(result.map((item) => item.kind)).toEqual(["material", "work", "service"]);
    expect(result.map((item) => item.rikCode)).toEqual(["RIK-1", "RIK-2", "RIK-3"]);
    expect(result[0].name).toBe("Щебень");
  });

  it("keeps working when one catalog source is temporarily unavailable", async () => {
    mockLoadCatalogItemsSearchPreviewRows.mockRejectedValue(new Error("catalog_items unavailable"));
    mockRikQuickSearch.mockResolvedValue([
      { rik_code: "RIK-4", kind: "work", name_human: "Асфальтирование", name_human_ru: null, uom_code: "m2" },
    ]);

    await expect(searchCatalogItemsForPicker("асфальт", 10)).resolves.toEqual([
      expect.objectContaining({ rikCode: "RIK-4", kind: "work", sourceId: "rik_items" }),
    ]);
  });
});
